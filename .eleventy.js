/**
 * Eleventy Configuration (Logic Layer)
 *
 * Central configuration for the 11ty build process.
 * Defines plugins, filters, collections, passthrough copies, and build options.
 */
const path = require("path");
const { DateTime } = require("luxon");
const { rssPlugin: pluginRss } = require("@11ty/eleventy-plugin-rss");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");

// Load taxonomy mapping for URL-safe slugs
const taxonomy = require("./src/_data/taxonomy.js")();

module.exports = function (eleventyConfig) {
  /* ------------------------------------------------------------------ */
  /*  Plugins                                                            */
  /* ------------------------------------------------------------------ */
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(syntaxHighlight);

  /* ------------------------------------------------------------------ */
  /*  Passthrough Copy: Static Assets                                    */
  /* ------------------------------------------------------------------ */
  eleventyConfig.addPassthroughCopy("src/assets");

  /* ------------------------------------------------------------------ */
  /*  Filters                                                            */
  /* ------------------------------------------------------------------ */

  /** Current year for copyright footer */
  eleventyConfig.addFilter("year", () => new Date().getFullYear());

  /** Ensure date is a Date object (handle string dates in frontmatter) */
  function ensureDate(d) {
    if (!d) return new Date();
    if (typeof d === "string") {
      // YYYY-MM-DD or other ISO-like string
      const parsed = DateTime.fromISO(d, { zone: "utc" });
      if (parsed.isValid) return parsed.toJSDate();
      return new Date(d);
    }
    if (d instanceof Date) return d;
    if (typeof d === "number") return new Date(d);
    return new Date();
  }

  /** Format date to readable string (e.g., "2026-06-07") */
  eleventyConfig.addFilter("readableDate", (dateObj) => {
    return DateTime.fromJSDate(ensureDate(dateObj), { zone: "utc" }).toFormat("yyyy-MM-dd");
  });

  /** Format date to RFC 3339 for JSON-LD */
  eleventyConfig.addFilter("dateToRfc3339", (dateObj) => {
    return DateTime.fromJSDate(ensureDate(dateObj), { zone: "utc" }).toISO();
  });

  /** Format date for archive display */
  eleventyConfig.addFilter("archiveDate", (dateObj) => {
    return DateTime.fromJSDate(ensureDate(dateObj), { zone: "utc" }).toFormat("LLL dd, yyyy");
  });

  /** URL-safe slug using taxonomy mapping, falling back to ASCII-safe slug */
  eleventyConfig.addFilter("slugify", (str) => {
    const key = String(str);
    if (taxonomy.categories[key]) return taxonomy.categories[key];
    if (taxonomy.tags[key]) return taxonomy.tags[key];
    return key
      .toLowerCase()
      .replace(/[\s]+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/^-+|-+$/g, "")
    || "untitled";
  });

  /** Group posts by publication year for archive view */
  eleventyConfig.addFilter("groupByYear", (posts) => {
    const groups = {};
    posts.forEach((post) => {
      const year = ensureDate(post.date).getFullYear();
      if (!groups[year]) groups[year] = [];
      groups[year].push(post);
    });
    return Object.entries(groups)
      .sort((a, b) => b[0] - a[0])
      .map(([year, posts]) => [year, posts.sort((a, b) => ensureDate(a.date) - ensureDate(b.date))]);
  });

  /**
   * Count words in text content (supports Chinese + English)
   * Chinese: count characters (each Hanzi = 1 word)
   * English: count words (space-separated)
   */
  eleventyConfig.addFilter("wordCount", (text) => {
    if (!text) return 0;
    const str = String(text).trim();
    // Count Chinese characters (CJK Unified Ideographs range)
    const chineseChars = (str.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
    // Count English words (sequences of letters/numbers)
    const englishWords = (str.match(/[a-zA-Z0-9]+/g) || []).length;
    return chineseChars + englishWords;
  });

  /**
   * Estimate reading time (supports Chinese + English)
   * Chinese: ~350 chars/min, English: ~220 words/min
   */
  eleventyConfig.addFilter("readingTime", (text) => {
    if (!text) return 1;
    const str = String(text).trim();
    // Count Chinese characters
    const chineseChars = (str.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
    // Count English words
    const englishWords = (str.match(/[a-zA-Z0-9]+/g) || []).length;
    // Calculate reading time (weighted average)
    const chineseMinutes = chineseChars / 350;
    const englishMinutes = englishWords / 220;
    const totalMinutes = Math.max(1, Math.ceil(chineseMinutes + englishMinutes));
    return totalMinutes;
  });

  /** Strip HTML and Markdown markup, collapse whitespace — used by search index */
  eleventyConfig.addFilter("stripHtml", (text) => {
    if (!text) return "";
    return String(text)
      .replace(/<[^>]+>/g, " ")              // strip HTML tags
      .replace(/```[\s\S]*?```/g, " ")       // strip fenced code blocks
      .replace(/`[^`]*`/g, " ")              // strip inline code
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // strip images
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // keep link text, drop URL
      .replace(/[#>*_~]/g, " ")              // strip common markdown markers
      .replace(/\s+/g, " ")
      .trim();
  });

  /** Limit array to first N items */
  eleventyConfig.addFilter("limit", (arr, count) => {
    return arr ? arr.slice(0, count) : [];
  });

  /** Get related posts excluding current post */
  eleventyConfig.addFilter("relatedPosts", (posts, currentUrl, maxCount) => {
    return posts
      .filter((p) => p.url !== currentUrl)
      .slice(0, maxCount || 3);
  });

  /** Get previous post (older) from a collection sorted newest-first */
  eleventyConfig.addFilter("prevPost", (posts, currentUrl) => {
    const idx = posts.findIndex((p) => p.url === currentUrl);
    if (idx >= 0 && idx + 1 < posts.length) return posts[idx + 1];
    return null;
  });

  /** Get next post (newer) from a collection sorted newest-first */
  eleventyConfig.addFilter("nextPost", (posts, currentUrl) => {
    const idx = posts.findIndex((p) => p.url === currentUrl);
    if (idx > 0) return posts[idx - 1];
    return null;
  });

  /* ------------------------------------------------------------------ */
  /*  Collections                                                        */
  /* ------------------------------------------------------------------ */

  /** Get all published posts (exclude drafts) */
  function getPosts(collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/_posts/**/*.md")
      .filter((post) => process.env.ELEVENTY_RUN_MODE !== "serve" ? !post.data.draft : true)
      .sort((a, b) => b.date - a.date);
  }

  /** All posts sorted by date (newest first) */
  eleventyConfig.addCollection("posts", (collectionApi) => {
    return getPosts(collectionApi);
  });

  /** Categories aggregated from all posts (excluding drafts) */
  eleventyConfig.addCollection("categories", (collectionApi) => {
    const posts = getPosts(collectionApi);
    const map = {};
    posts.forEach((post) => {
      const cats = post.data.categories || [];
      cats.forEach((cat) => {
        const slug = taxonomy.categories[cat] || cat.toLowerCase().replace(/\s+/g, "-");
        if (!map[slug]) {
          map[slug] = { name: cat, posts: [] };
        }
        map[slug].posts.push(post);
      });
    });
    return Object.entries(map)
      .map(([slug, { name, posts }]) => ({
        name,
        slug,
        posts: [...new Map(posts.map((p) => [p.url, p])).values()]
          .sort((a, b) => b.date - a.date),
      }))
      .sort((a, b) => b.posts.length - a.posts.length);
  });

  /** Tag list aggregated from all posts (excluding drafts) */
  eleventyConfig.addCollection("tagList", (collectionApi) => {
    const posts = getPosts(collectionApi);
    const map = {};
    posts.forEach((post) => {
      const tags = post.data.tags || [];
      tags.forEach((tag) => {
        const slug = taxonomy.tags[tag] || tag.toLowerCase().replace(/\s+/g, "-");
        // Deduplicate by slug — merge posts if same slug
        if (!map[slug]) {
          map[slug] = { name: tag, posts: [] };
        }
        map[slug].posts.push(post);
      });
    });
    return Object.entries(map)
      .map(([slug, { name, posts }]) => ({
        name,
        slug,
        // Deduplicate posts (same post may appear in merged tags)
        posts: [...new Map(posts.map((p) => [p.url, p])).values()]
          .sort((a, b) => b.date - a.date),
      }))
      .sort((a, b) => b.posts.length - a.posts.length);
  });

  /* ------------------------------------------------------------------ */
  /*  Search Index (JSON for client-side search)                         */
  /* ------------------------------------------------------------------ */
  // NOTE: `templateContent` is NOT available inside a collection callback
  // (templates haven't rendered yet — throws TemplateContentPrematureUseError).
  // So we read the raw markdown body from disk here. Front-matter is already
  // stripped by Eleventy; we then strip markdown/HTML inline.
  const fs = require("fs");
  const MAX_CONTENT = 1500; // cap body text to keep the index lean
  function stripMarkdown(text) {
    return String(text || "")
      .replace(/<[^>]+>/g, " ")              // strip HTML tags
      .replace(/```[\s\S]*?```/g, " ")       // strip fenced code blocks
      .replace(/`[^`]*`/g, " ")              // strip inline code
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // strip images
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // keep link text, drop URL
      .replace(/[#>*_~]/g, " ")              // strip common markdown markers
      .replace(/\s+/g, " ")
      .trim();
  }
  eleventyConfig.addCollection("searchIndex", (collectionApi) => {
    const posts = getPosts(collectionApi);
    return posts.map((post) => {
      let content = "";
      try {
        const raw = fs.readFileSync(post.inputPath, "utf8");
        // Drop YAML front-matter (---\n...\n---) if present
        const body = raw.replace(/^---[\s\S]*?---/, "");
        content = stripMarkdown(body).slice(0, MAX_CONTENT);
      } catch (e) {
        content = "";
      }
      return {
        title: post.data.title,
        url: post.url,
        date: post.date,
        excerpt: post.data.excerpt || "",
        content: content,
        categories: post.data.categories || [],
        tags: post.data.tags || [],
      };
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Build Configuration                                                */
  /* ------------------------------------------------------------------ */
  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data",
    },
    templateFormats: ["njk", "md"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
