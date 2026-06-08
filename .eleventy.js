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
  eleventyConfig.addPassthroughCopy({ "src/assets/js/sw.js": "sw.js" });

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

  /** Estimate reading time based on word count (average 300 WPM) */
  eleventyConfig.addFilter("readingTime", (text) => {
    const words = (text || "").trim().split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(words / 300));
    return minutes;
  });

  /** Count words in text content */
  eleventyConfig.addFilter("wordCount", (text) => {
    return (text || "").trim().split(/\s+/).length;
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
  eleventyConfig.addCollection("searchIndex", (collectionApi) => {
    const posts = getPosts(collectionApi);
    return posts.map((post) => ({
      title: post.data.title,
      url: post.url,
      date: post.date,
      excerpt: post.data.excerpt || "",
      categories: post.data.categories || [],
      tags: post.data.tags || [],
    }));
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
