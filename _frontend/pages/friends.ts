/*!
 * Friends feed page generator.
 *
 * Build-time script (not part of the browser bundle): pulls the latest posts
 * from every friend's feed and renders a **multi-page** static site under
 * `friends/` — a gitignored Jekyll page source tree:
 *
 *   friends/index.html          ← page 1 (the canonical `/friends/` URL)
 *   friends/page/2/index.html   ← page 2
 *   friends/page/N/index.html   ← ...
 *   friends/assets/friends.css  ← shared stylesheet, cached across pages
 *   friends/assets/friends.js   ← shared navigation helper
 *
 * The previous revision rendered ONE document that shipped *every* pagination
 * page at once and swapped between them with an in-memory index. Each page is
 * now an independent HTML file that carries only its own articles, so a browser
 * never downloads another page's markup.
 *
 * Multi-page rules this generator follows:
 *   • Page state lives in the URL (`/friends/`, `/friends/page/2/`, ...) rather
 *     than a JavaScript variable — each page is linkable, cacheable and back-
 *     button friendly.
 *   • Navigation uses ordinary `<a href>` links (no client-side view switching).
 *   • Styles/scripts are shared external files; every page still renders fully
 *     on its own, with or without JavaScript.
 *   • `/friends/` keeps its original URL, so existing inbound links still work.
 *
 * Runs BEFORE `jekyll build` (see `npm run build:site`): the generated tree is
 * Jekyll page source, so every page ships in the one `_site` each deploy target
 * consumes.
 *
 *   npm run pages
 */
import { mkdirSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import Parser from 'rss-parser';

/* ------------------------------------------------------------------ Config -- */

/** Feed endpoints, inlined (this used to live in a sibling `friends.json`). */
const FEEDS: readonly string[] = [
  'https://api.myblog.icu/api/public/rss',
  'https://blog.liushen.fun/atom.xml',
  'https://blog.talen.top/rss.xml',
  'https://erzbir.com/rss.xml',
  'https://suo.ma/rss.xml',
  'https://ttio.cc/feed.xml',
  'https://www.hansjack.com/feed',
  'https://www.mofei.life/zh/rss',
  'https://www.qiezechuan.cn/rss.xml',
  'https://www.qixz.cn/atom.xml'
];

/**
 * Root of the generated page tree (repo-relative, gitignored).
 *
 * `_site` is a throwaway deploy hop: anything dropped into it after
 * `jekyll build` only exists for the deploy step that happens to consume that
 * same directory. Generating the page *before* the build makes it an ordinary
 * Jekyll page, so it ships in the one `_site` every deploy target reads.
 */
const OUTPUT_ROOT = 'friends';
/** Page 1 → `<root>/index.html`; page N>1 → `<root>/page/N/index.html`. */
const PAGE_SEGMENT = 'page';
/** Shared assets, served under `<root>/assets/`. */
const ASSET_SEGMENT = 'assets';
const CSS_FILE = 'friends.css';
const JS_FILE = 'friends.js';
/** Path segment used while embedding `pageUrl()` into the generated markup. */
const INDEX_SEGMENT = 'index.html';

/** Site-absolute URLs (the site is served from the domain root, no baseurl). */
const BASE_URL = '/' + OUTPUT_ROOT;
const ASSET_URL = `${BASE_URL}/${ASSET_SEGMENT}`;

/**
 * Front matter for the generated pages.
 *
 * `layout: null` keeps them standalone (they carry their own <html>), and
 * `render_with_liquid: false` stops Jekyll from touching the inline markup.
 */
const FRONT_MATTER = `---
layout: null
sitemap: false
render_with_liquid: false
---
`;

/** Same treatment for the shared assets: copied verbatim, never liquidated. */
const ASSET_FRONT_MATTER = `---
layout: null
sitemap: false
render_with_liquid: false
---
`;

const FEED_TIMEOUT = 12_000;      // Per HTTP request (rss-parser internal)
const PER_FEED_TIMEOUT = 15_000;  // Outer guard per configured source
const FETCH_CONCURRENCY = 6;      // Max concurrent feed fetches
const MAX_PER_FEED = 20;          // Max items per feed to prevent unbounded fetching
const ITEMS_PER_PAGE = 10;
const SUMMARY_LEN = 160;

const FALLBACK_PATHS: readonly string[] = [
  '/feed.xml', '/feed/', '/rss/', '/rss.xml', '/atom.xml',
  '/index.xml', '/feed', '/rss', '/atom',
  '/blog/feed.xml', '/blog/rss.xml'
];

/* ------------------------------------------------------------------- Icons -- */

/** Shared cloud-drizzle path (used for both the inline icon and the favicon). */
const CLOUD_PATH =
  "M4.158 12.025a.5.5 0 0 1 .316.633l-.5 1.5a.5.5 0 0 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.317m6 0a.5.5 0 0 1 .316.633l-.5 1.5a.5.5 0 0 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.317m-3.5 1.5a.5.5 0 0 1 .316.633l-.5 1.5a.5.5 0 0 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.317m6 0a.5.5 0 0 1 .316.633l-.5 1.5a.5.5 0 1 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.317m.747-8.498a5.001 5.001 0 0 0-9.499-1.004A3.5 3.5 0 1 0 3.5 11H13a3 3 0 0 0 .405-5.973M8.5 2a4 4 0 0 1 3.976 3.555.5.5 0 0 0 .5.445H13a2 2 0 0 1 0 4H3.5a2.5 2.5 0 1 1 .605-4.926.5.5 0 0 0 .596-.329A4 4 0 0 1 8.5 2";

const ICON_CLOUD =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="${CLOUD_PATH}"/></svg>`;

const FAVICON_HREF =
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="${CLOUD_PATH}"/></svg>`
  )}`;

/* ------------------------------------------------------------------ Parser -- */

const parser = new Parser({
  timeout: FEED_TIMEOUT,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (compatible; ExyoneBlog-friend-feed/1.0; +https://exyone.ee)',
    Accept:
      'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8'
  },
  customFields: {
    item: [
      ['updated', 'updated'],
      ['published', 'published']
    ]
  }
});

/* -------------------------------------------------------------------- Types -- */

interface FeedItem {
  title?: string;
  link?: string;
  isoDate?: string;
  pubDate?: string;
  updated?: string;
  published?: string;
  contentSnippet?: string;
  content?: string;
}

interface Feed {
  title?: string;
  link?: string;
  items?: FeedItem[];
}

interface Article {
  title: string;
  url: string;
  date: Date | null;
  siteName: string;
  siteUrl: string;
  content: string;
}

/** Per-source fetch outcome. `ok: false` never throws — it degrades. */
interface SourceResult {
  configuredUrl: string;
  ok: boolean;
  usedUrl?: string;
  siteName?: string;
  siteUrl?: string;
  articles: Article[];
  error?: string;
}

interface CollectResult {
  articles: Article[];
  sourcesOk: number;
  failed: SourceResult[];
}

/** Everything a single generated page needs to render itself. */
interface PageDoc {
  page: number;
  totalPages: number;
  items: readonly Article[];
  totalArticles: number;
  sourcesOk: number;
  failedCount: number;
}

/* ---------------------------------------------------------------- Utilities -- */

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function deriveSiteName(title: string | undefined, siteUrl: string): string {
  const trimmed = (title ?? '').trim();
  if (trimmed) return trimmed;
  try {
    return new URL(siteUrl).hostname;
  } catch {
    return siteUrl;
  }
}

function parseItemDate(item: FeedItem): Date | null {
  const raw = item.isoDate || item.pubDate || item.updated || item.published;
  if (!raw) return null;
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : new Date(t);
}

/* Single-pass escape; lookup table avoids repeated string allocations. */
const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
};

function esc(value: unknown): string {
  if (typeof value !== 'string' || value === '') return '';
  return value.replace(/[&<>"']/g, ch => HTML_ESCAPES[ch] as string);
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '\u2014', ndash: '\u2013', hellip: '\u2026',
  ldquo: '\u201C', rdquo: '\u201D', lsquo: '\u2018', rsquo: '\u2019'
};

function safeFromCodePoint(code: number, fallback: string): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return fallback;
  try {
    return String.fromCodePoint(code);
  } catch {
    return fallback;
  }
}

function decodeEntities(text: string): string {
  return text.replace(
    /&(?:#x([0-9a-f]+)|#(\d+)|([a-z][a-z0-9]*));/gi,
    (match, hex: string | undefined, dec: string | undefined, name: string | undefined) => {
      if (hex) return safeFromCodePoint(parseInt(hex, 16), match);
      if (dec) return safeFromCodePoint(parseInt(dec, 10), match);
      if (name) return NAMED_ENTITIES[name.toLowerCase()] ?? match;
      return match;
    }
  );
}

function cleanText(raw: unknown): string {
  if (typeof raw !== 'string' || raw === '') return '';
  return decodeEntities(raw.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  // Slice by code points so we never cut a surrogate pair in half.
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  return chars.slice(0, max).join('').trimEnd() + '\u2026';
}

function buildSummary(item: FeedItem): string {
  const raw = item.contentSnippet || item.content || '';
  return truncate(cleanText(raw), SUMMARY_LEN);
}

function fmtDate(date: Date | null): string {
  if (!date) return '';
  return `${date.getMonth() + 1}\u6708${date.getDate()}\u65e5`;
}

function fmtTimeAgo(date: Date | null): string {
  if (!date) return '';
  const diff = Date.now() - date.getTime();
  if (diff < 0) return '\u521a\u521a'; // future-dated
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return '\u4eca\u5929';
  if (days < 30) return days + ' \u5929\u524d';
  if (days < 365) return Math.floor(days / 30) + ' \u4e2a\u6708\u524d';
  return Math.floor(days / 365) + ' \u5e74\u524d';
}

/** Normalises a URL for cross-feed dedupe: strip hash + tracking params. */
function normalizeArticleUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|ref$|fbclid$|gclid$|spm$)/i.test(key)) u.searchParams.delete(key);
    }
    return u.toString().replace(/\/+$/, '').toLowerCase();
  } catch {
    return url.replace(/#.*$/, '').replace(/\/+$/, '').toLowerCase();
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const guard = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms);
  });
  return Promise.race([promise, guard]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/** Runs an async mapper with bounded concurrency, preserving order. */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  if (items.length === 0) return results;
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i] as T, i);
    }
  });
  await Promise.all(workers);
  return results;
}

/* ------------------------------------------------------------------ Fetching -- */

async function tryFetch(url: string): Promise<Feed | null> {
  try {
    const raw = (await parser.parseURL(url)) as unknown as Feed | null;
    // Guard against non-feed bodies (login pages, 404 HTML) that parse "cleanly".
    if (!raw || (!raw.items && !raw.title)) return null;
    return raw;
  } catch {
    return null;
  }
}

async function discoverFeed(
  configuredUrl: string
): Promise<{ feed: Feed; usedUrl: string }> {
  let origin: string;
  try {
    origin = new URL(configuredUrl).origin;
  } catch {
    throw new Error('Invalid URL: ' + configuredUrl);
  }

  const direct = await tryFetch(configuredUrl);
  if (direct) return { feed: direct, usedUrl: configuredUrl };

  for (const candidate of FALLBACK_PATHS) {
    const url = origin + candidate;
    if (url === configuredUrl) continue;
    const feed = await tryFetch(url);
    if (feed) return { feed, usedUrl: url };
  }

  throw new Error('No feed found at ' + configuredUrl);
}

function toArticle(
  item: FeedItem,
  source: { name: string; url: string }
): Article | null {
  const url = (item.link ?? '').trim() || source.url;
  if (!url) return null;

  const title = (item.title ?? '').trim() || '(\u65e0\u6807\u9898)';

  return {
    title,
    url,
    date: parseItemDate(item),
    siteName: source.name,
    siteUrl: source.url,
    content: buildSummary(item)
  };
}

async function fetchSource(configuredUrl: string): Promise<SourceResult> {
  try {
    const { feed, usedUrl } = await discoverFeed(configuredUrl);

    const siteUrl = stripTrailingSlash((feed.link || usedUrl || configuredUrl).trim());
    const siteName = deriveSiteName(feed.title, siteUrl);

    const rawItems = Array.isArray(feed.items) ? feed.items : [];

    // Decorate-sort-undecorate: parse each date exactly once.
    const sorted = rawItems
      .map(item => ({ item, date: parseItemDate(item) }))
      .sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.getTime() - a.date.getTime();
      })
      .slice(0, MAX_PER_FEED);

    const source = { name: siteName, url: siteUrl };
    const articles: Article[] = [];
    for (const { item } of sorted) {
      const article = toArticle(item, source);
      if (article) articles.push(article);
    }

    return { configuredUrl, ok: true, usedUrl, siteName, siteUrl, articles };
  } catch (error) {
    return {
      configuredUrl,
      ok: false,
      articles: [],
      error: toErrorMessage(error)
    };
  }
}

/** Wraps `fetchSource` with an outer timeout that never rejects. */
async function fetchSourceSafely(url: string): Promise<SourceResult> {
  try {
    return await withTimeout(fetchSource(url), PER_FEED_TIMEOUT, url);
  } catch (error) {
    return {
      configuredUrl: url,
      ok: false,
      articles: [],
      error: toErrorMessage(error)
    };
  }
}

/* ------------------------------------------------------------------ Collect -- */

async function collect(): Promise<CollectResult> {
  const started = Date.now();
  console.log(`\n[friends] Fetching ${FEEDS.length} friend feed(s) ...`);

  const results = await mapWithConcurrency(FEEDS, FETCH_CONCURRENCY, fetchSourceSafely);

  // Deterministic log order (matches FEEDS order, not completion order).
  for (const r of results) {
    if (r.ok) {
      const tip = r.usedUrl !== r.configuredUrl ? ` (\u2192 ${r.usedUrl})` : '';
      console.log(`  \u2713 ${r.siteName} \u2014 ${r.articles.length} posts${tip}`);
    } else {
      console.log(`  \u2717 ${r.configuredUrl} \u2014 ${r.error}`);
    }
  }

  const articles: Article[] = [];
  const seen = new Set<string>();
  const failed: SourceResult[] = [];
  let sourcesOk = 0;

  for (const r of results) {
    if (!r.ok) {
      failed.push(r);
      continue;
    }
    sourcesOk++;
    for (const article of r.articles) {
      const key = normalizeArticleUrl(article.url);
      if (seen.has(key)) continue;
      seen.add(key);
      articles.push(article);
    }
  }

  // Newest first; undated entries sink to the bottom.
  articles.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.getTime() - a.date.getTime();
  });

  const elapsed = Date.now() - started;
  console.log(
    `[friends] Done in ${elapsed}ms \u2014 ${articles.length} posts, ` +
      `${sourcesOk}/${FEEDS.length} source(s) online\n`
  );

  return { articles, sourcesOk, failed };
}

/* ------------------------------------------------------------------- Routing -- */

/**
 * Public URL of a pagination page.
 *
 * Page 1 keeps the canonical `/friends/` address; later pages get their own
 * crawlable, linkable path. This URL *is* the page state — nothing is carried
 * in memory between documents.
 */
function pageUrl(page: number): string {
  return page <= 1 ? `${BASE_URL}/` : `${BASE_URL}/${PAGE_SEGMENT}/${page}/`;
}

/** Source-tree path the given page is written to (page 1 → `<root>/index.html`). */
function pageFilePath(page: number): string {
  return page <= 1
    ? path.join(OUTPUT_ROOT, INDEX_SEGMENT)
    : path.join(OUTPUT_ROOT, PAGE_SEGMENT, String(page), INDEX_SEGMENT);
}

/* ------------------------------------------------------------------- Styles -- */

/**
 * Neumorphism ("Soft UI") stylesheet — shared by every page via
 * `/friends/assets/friends.css`.
 *
 * Hard rules baked in:
 *   • 背景 / 元素同色系 (#e0e5ec)；暗阴影右下 (#b8bcc2)，亮阴影左上 (#ffffff)。
 *   • 交互元素 hover 时阴影 *缩小* (Hover Shadowing)；active 从凸起转内凹
 *     (Extrude → Intrude)，全程不使用 translate。
 *   • 所有过渡统一 300ms ease-in-out (Smooth Molding)。
 *   • 无纯黑 / 纯白背景、无渐变、无粗边框、无直角。
 *   • 附带 prefers-reduced-motion 与 prefers-contrast 降级分支。
 */
function buildStyles(): string {
  return `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{font-size:15px;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}

:root{
  /* Base surfaces — everything shares the same hue, differentiation is by light */
  --bg:#e0e5ec;
  --surface:#e0e5ec;
  --raised:#f0f0f3;
  --fg:#333333;
  --fg-soft:#4a5568;
  --muted:#6b7280;
  --accent:#6d5dfc;
  --accent-tint:rgba(109,93,252,.10);

  /* Dual-light source — direction is fixed: light at -X/-Y, shadow at +X/+Y */
  --neu-light:#ffffff;
  --neu-dark:#b8bcc2;

  --radius-card:22px;
  --radius-btn:14px;
  --radius-pill:999px;

  --gap:1.35rem;
  --dur:300ms;
  --ease:cubic-bezier(.4,0,.2,1);
}

@media(prefers-color-scheme:dark){
  :root{
    --bg:#232831;
    --surface:#232831;
    --raised:#2a303a;
    --fg:#d4dae5;
    --fg-soft:#aab3c0;
    --muted:#8892a4;
    --accent:#8b7dfc;
    --accent-tint:rgba(139,125,252,.14);
    --neu-light:#2d3440;
    --neu-dark:#171c25;
  }
}

body{
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;
  background:var(--bg);
  color:var(--fg);
  line-height:1.65;
  min-height:100vh;
}

/* ── Container ── */
.fe-wrap{max-width:860px;margin:0 auto;padding:2.5rem 1.25rem 3rem}

/* ── Header ── */
.fe-head{
  display:flex;align-items:center;justify-content:space-between;
  gap:1rem;margin-bottom:1.75rem;flex-wrap:wrap;
}
.fe-head__left{display:flex;align-items:center;gap:.9rem}
.fe-head__icon{
  width:46px;height:46px;border-radius:var(--radius-btn);
  background:var(--surface);color:var(--accent);
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
  box-shadow:6px 6px 12px var(--neu-dark),-6px -6px 12px var(--neu-light);
}
.fe-head__icon svg{width:22px;height:22px}
.fe-head__title{
  font-size:1.15rem;font-weight:700;letter-spacing:-.015em;line-height:1.2;
}
.fe-head__sub{font-size:.75rem;color:var(--muted);margin-top:2px}

.fe-head__back{
  font-size:.8125rem;color:var(--muted);text-decoration:none;
  padding:.55rem 1.15rem;border-radius:var(--radius-pill);
  background:var(--surface);white-space:nowrap;
  box-shadow:6px 6px 12px var(--neu-dark),-6px -6px 12px var(--neu-light);
  transition:box-shadow var(--dur) var(--ease),color var(--dur) var(--ease);
}
.fe-head__back:hover{
  color:var(--accent);
  /* Hover Shadowing — 手指靠近遮光，阴影收缩 */
  box-shadow:3px 3px 6px var(--neu-dark),-3px -3px 6px var(--neu-light);
}
.fe-head__back:active{
  /* Extrude → Intrude，无 translate */
  box-shadow:inset 3px 3px 6px var(--neu-dark),inset -3px -3px 6px var(--neu-light);
}
.fe-head__back:focus-visible{
  outline:2px solid var(--accent);outline-offset:3px;border-radius:var(--radius-pill);
}

/* ── Stats bar ── */
.fe-stats{
  display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:1.75rem;
  font-size:.78rem;color:var(--muted);
}
.fe-stat{
  display:inline-flex;align-items:center;gap:.5rem;
  padding:.5rem 1rem;border-radius:var(--radius-pill);background:var(--surface);
  box-shadow:inset 3px 3px 6px var(--neu-dark),inset -3px -3px 6px var(--neu-light);
}
.fe-stat strong{color:var(--fg);font-weight:600}

/* ── Article grid ──
   Each HTML page owns exactly one grid, so it is always visible — the
   display toggling that used to live in JS is gone with the multi-page split. */
.fe-page{display:grid;gap:var(--gap);grid-template-columns:repeat(2,1fr)}
@media(max-width:640px){.fe-page{grid-template-columns:1fr}}

.fe-item{
  position:relative;
  padding:1.35rem 1.5rem;
  border-radius:var(--radius-card);
  background:var(--surface);
  box-shadow:8px 8px 16px var(--neu-dark),-8px -8px 16px var(--neu-light);
  transition:box-shadow var(--dur) var(--ease);
  overflow:hidden;
}
.fe-item:hover,
.fe-item:focus-within{
  /* Hover Shadowing — 阴影收缩而非扩大，符合光照物理 */
  box-shadow:5px 5px 10px var(--neu-dark),-5px -5px 10px var(--neu-light);
}

.fe-item__title{font-size:.95rem;font-weight:600;line-height:1.45}
.fe-item__title a{
  color:var(--fg);text-decoration:none;
  transition:color var(--dur) var(--ease);
}
.fe-item__title a:hover{color:var(--accent)}
/* 覆盖全卡片，实现整卡可点击 */
.fe-item__title a::after{content:"";position:absolute;inset:0}
.fe-item__title a:focus-visible{outline:none}
.fe-item__title a:focus-visible::after{
  outline:2px solid var(--accent);outline-offset:6px;
  border-radius:var(--radius-card);
}

.fe-item__summary{
  margin-top:.55rem;font-size:.78rem;color:var(--muted);line-height:1.55;
  overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;
}

.fe-item__meta{
  display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;
  margin-top:.85rem;padding-top:.75rem;
  font-size:.7rem;color:var(--muted);
  border-top:1px solid color-mix(in srgb,var(--neu-dark) 55%,transparent);
}
.fe-item__src{
  font-weight:600;color:var(--fg-soft);
  max-width:60%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.fe-item__dot{opacity:.5}
.fe-item__time{white-space:nowrap}

/* ── Pagination ──
   Real links, not buttons: prev/next navigate to sibling documents. */
.fe-pag{
  display:flex;align-items:center;justify-content:center;gap:1rem;
  margin-top:1.75rem;flex-wrap:wrap;
}
.fe-pag__btn{
  font-family:inherit;
  font-size:.8125rem;padding:.6rem 1.35rem;
  border:none;border-radius:var(--radius-btn);
  background:var(--surface);color:var(--fg);cursor:pointer;
  display:inline-block;text-decoration:none;line-height:1.2;white-space:nowrap;
  box-shadow:6px 6px 12px var(--neu-dark),-6px -6px 12px var(--neu-light);
  transition:box-shadow var(--dur) var(--ease),color var(--dur) var(--ease);
}
.fe-pag__btn:not([aria-disabled="true"]):hover{
  color:var(--accent);
  box-shadow:3px 3px 6px var(--neu-dark),-3px -3px 6px var(--neu-light);
}
.fe-pag__btn:not([aria-disabled="true"]):active{
  box-shadow:inset 3px 3px 6px var(--neu-dark),inset -3px -3px 6px var(--neu-light);
}
.fe-pag__btn:focus-visible{
  outline:2px solid var(--accent);outline-offset:3px;
}
/* First/last page: the missing neighbour renders as an inert, sunk-in chip. */
.fe-pag__btn[aria-disabled="true"]{
  opacity:.45;cursor:not-allowed;pointer-events:none;
  box-shadow:inset 2px 2px 4px var(--neu-dark),inset -2px -2px 4px var(--neu-light);
}
.fe-pag__info{
  font-size:.75rem;color:var(--muted);
  min-width:140px;text-align:center;
  padding:.35rem .85rem;border-radius:var(--radius-pill);
  box-shadow:inset 2px 2px 4px var(--neu-dark),inset -2px -2px 4px var(--neu-light);
}

/* ── Note / Empty state ── */
.fe-note{
  font-size:.78rem;color:var(--muted);margin-top:1.25rem;
  padding:.85rem 1.15rem;border-radius:var(--radius-btn);background:var(--surface);
  box-shadow:inset 3px 3px 6px var(--neu-dark),inset -3px -3px 6px var(--neu-light);
}
.fe-empty{
  text-align:center;padding:3.5rem 1.5rem;color:var(--muted);
  border-radius:var(--radius-card);background:var(--surface);margin-top:1rem;
  box-shadow:inset 4px 4px 8px var(--neu-dark),inset -4px -4px 8px var(--neu-light);
}
.fe-empty__icon{
  width:56px;height:56px;margin:0 auto 1rem;border-radius:50%;
  display:flex;align-items:center;justify-content:center;color:var(--accent);
  background:var(--surface);
  box-shadow:6px 6px 12px var(--neu-dark),-6px -6px 12px var(--neu-light);
}
.fe-empty__icon svg{width:26px;height:26px}
.fe-empty__text{font-size:.9rem}

/* ── Footer ── */
.fe-foot{
  text-align:center;font-size:.72rem;color:var(--muted);
  margin-top:2.5rem;padding-top:1.5rem;
  border-top:1px solid color-mix(in srgb,var(--neu-dark) 40%,transparent);
}

/* ── Accessibility fallbacks ── */
@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{
    transition-duration:.01ms!important;
    animation-duration:.01ms!important;
    animation-iteration-count:1!important;
  }
}
@media(prefers-contrast:more){
  :root{--neu-dark:#8a8e94;--neu-light:#ffffff}
  .fe-item,.fe-pag__btn,.fe-head__back,.fe-head__icon,.fe-empty__icon{
    border:1px solid var(--fg);
  }
}
`;
}

/**
 * Shared navigation helper — loaded by every page from
 * `/friends/assets/friends.js`.
 *
 * Links already work without JavaScript (they are plain <a href> elements);
 * this only adds the two gestures the single-page build had: ← / → keys and
 * horizontal touch swipes. Both simply follow the neighbour link, i.e. they
 * trigger a normal document navigation.
 */
function buildScript(): string {
  return `/* Friends feed — keyboard / swipe shortcuts for the pager. */
(function () {
  "use strict";

  var bar = document.getElementById("fe-pag");
  if (!bar) return; // Only one page was generated: nothing to navigate.

  function link(kind) {
    var el = bar.querySelector('[data-nav="' + kind + '"]');
    return el && el.tagName === "A" ? el : null;
  }

  // The destination is the neighbour page's own URL, so navigation is a plain
  // document load: history, caching and the back button stay native.
  function go(kind) {
    var el = link(kind);
    var href = el && el.getAttribute("href");
    if (href) window.location.assign(href);
  }

  document.addEventListener("keydown", function (e) {
    var tag = e.target && e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.key === "ArrowLeft") go("prev");
    else if (e.key === "ArrowRight") go("next");
  });

  // Touch swipe: horizontal only, conservative thresholds so vertical scroll wins.
  var sx = 0, sy = 0, tracking = false;

  document.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) { tracking = false; return; }
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });

  document.addEventListener("touchend", function (e) {
    if (!tracking) return;
    tracking = false;
    var t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    var dx = t.clientX - sx;
    var dy = t.clientY - sy;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    go(dx < 0 ? "next" : "prev");
  }, { passive: true });
})();
`;
}

/* -------------------------------------------------------- HTML fragments ---- */

function buildHead(page: number, totalPages: number): string {
  const title = page > 1 ? `\u53cb\u94fe\u52a8\u6001 \u00b7 \u7b2c ${page} \u9875` : '\u53cb\u94fe\u52a8\u6001';
  const prevLink = page > 1 ? `\n<link rel="prev" href="${pageUrl(page - 1)}">` : '';
  const nextLink = page < totalPages ? `\n<link rel="next" href="${pageUrl(page + 1)}">` : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="\u805a\u5408\u670b\u53cb\u7ad9\u70b9\u7684\u6700\u65b0\u6587\u7ae0\u52a8\u6001">
<meta name="robots" content="index,follow">
<meta name="apple-mobile-web-app-title" content="EXYONE@BLOG:~$">
<meta name="application-name" content="EXYONE@BLOG:~$">
<meta name="theme-color" content="#e0e5ec" media="(prefers-color-scheme:light)">
<meta name="theme-color" content="#232831" media="(prefers-color-scheme:dark)">
<link rel="apple-touch-icon" href="${FAVICON_HREF}">
<link rel="apple-touch-icon-precomposed" href="${FAVICON_HREF}">
<link rel="icon" type="image/svg+xml" href="${FAVICON_HREF}">
<link rel="shortcut icon" href="${FAVICON_HREF}">${prevLink}${nextLink}
<link rel="stylesheet" href="${ASSET_URL}/${CSS_FILE}">
</head>`;
}

function buildCard(item: Article): string {
  const summary = item.content
    ? `<p class="fe-item__summary">${esc(item.content)}</p>`
    : '';

  const dateText = fmtDate(item.date);
  const agoText = fmtTimeAgo(item.date);
  const timeText = dateText ? `${dateText}\u3000${agoText}` : '';
  const dtAttr = item.date ? ` datetime="${item.date.toISOString()}"` : '';

  return `<article class="fe-item">
  <h3 class="fe-item__title"><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${esc(item.title)}</a></h3>
  ${summary}
  <div class="fe-item__meta">
    <span class="fe-item__src" title="${esc(item.siteName)}">${esc(item.siteName)}</span>
    <span class="fe-item__dot" aria-hidden="true">\u00b7</span>
    <time class="fe-item__time"${dtAttr}>${timeText}</time>
  </div>
</article>`;
}

function paginate<T>(items: readonly T[], perPage: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += perPage) {
    pages.push(items.slice(i, i + perPage));
  }
  return pages;
}

/**
 * Prev/next navigation between sibling documents.
 *
 * A neighbour that does not exist is emitted as an inert `<span>` carrying
 * `aria-disabled` (visually identical to the old disabled button) instead of a
 * link, so a multi-page crawl never produces a dead href.
 */
function buildPaginationHtml(page: number, totalPages: number, totalArticles: number): string {
  if (totalPages <= 1) return '';

  const prev = page > 1
    ? `<a class="fe-pag__btn" href="${pageUrl(page - 1)}" rel="prev" data-nav="prev">&lsaquo; \u4e0a\u4e00\u9875</a>`
    : `<span class="fe-pag__btn" aria-disabled="true" data-nav="prev">&lsaquo; \u4e0a\u4e00\u9875</span>`;

  const next = page < totalPages
    ? `<a class="fe-pag__btn" href="${pageUrl(page + 1)}" rel="next" data-nav="next">\u4e0b\u4e00\u9875 &rsaquo;</a>`
    : `<span class="fe-pag__btn" aria-disabled="true" data-nav="next">\u4e0b\u4e00\u9875 &rsaquo;</span>`;

  return `<nav class="fe-pag" id="fe-pag" aria-label="\u5206\u9875\u5bfc\u822a">
  ${prev}
  <span class="fe-pag__info" role="status" aria-live="polite">\u7b2c ${page} / ${totalPages} \u9875 \u00b7 \u5171 ${totalArticles} \u7bc7</span>
  ${next}
</nav>`;
}

function buildEmptyState(hasErrors: boolean): string {
  const text = hasErrors
    ? '\u6682\u65e0\u53cb\u94fe\u52a8\u6001\uff0c\u8bf7\u68c0\u67e5\u8ba2\u9605\u6e90\u914d\u7f6e'
    : '\u6682\u65e0\u53cb\u94fe\u52a8\u6001';
  return `<div class="fe-empty">
  <div class="fe-empty__icon" aria-hidden="true">${ICON_CLOUD}</div>
  <p class="fe-empty__text">${text}</p>
</div>`;
}

/* ------------------------------------------------------------------ Render -- */

/**
 * Renders ONE pagination page as a standalone document.
 *
 * The document contains only its own articles plus links to its neighbours —
 * no other page's markup, and no state handed over from another document.
 */
function buildPageDocument(doc: PageDoc): string {
  const { page, totalPages, items, totalArticles, sourcesOk, failedCount } = doc;

  const body = totalArticles > 0
    ? `<div class="fe-page">
${items.map(buildCard).join('\n')}
</div>
${buildPaginationHtml(page, totalPages, totalArticles)}`
    : buildEmptyState(failedCount > 0);

  const errorsHtml =
    failedCount > 0
      ? `<p class="fe-note">${failedCount} \u4e2a\u8ba2\u9605\u6e90\u6682\u65f6\u65e0\u6cd5\u8bbf\u95ee</p>`
      : '';

  return `${FRONT_MATTER}${buildHead(page, totalPages)}
<body>
<div class="fe-wrap">
  <header class="fe-head">
    <div class="fe-head__left">
      <div class="fe-head__icon" aria-hidden="true">${ICON_CLOUD}</div>
      <div>
        <div class="fe-head__title">\u53cb\u94fe\u52a8\u6001</div>
        <div class="fe-head__sub">\u805a\u5408\u670b\u53cb\u7ad9\u70b9\u7684\u6700\u65b0\u6587\u7ae0</div>
      </div>
    </div>
    <a href="/" class="fe-head__back">\u2190 \u8fd4\u56de\u4e3b\u9875</a>
  </header>

  <div class="fe-stats">
    <span class="fe-stat"><strong>${totalArticles}</strong> \u7bc7\u6587\u7ae0</span>
    <span class="fe-stat"><strong>${sourcesOk}</strong> / ${FEEDS.length} \u6e90\u5728\u7ebf</span>
    <span class="fe-stat"><strong>${totalPages}</strong> \u9875</span>
  </div>

  ${body}
  ${errorsHtml}

  <p class="fe-foot">Exyone's Blog \u00b7 \u53cb\u94fe\u52a8\u6001 \u00b7 \u8ba2\u9605\u805a\u5408</p>
</div>
<script src="${ASSET_URL}/${JS_FILE}" defer></script>
</body>
</html>`;
}

/* ------------------------------------------------------------------ Output -- */

/** Writes via a sibling temp file + rename so readers never see a partial page. */
function writeAtomic(filePath: string, contents: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    writeFileSync(tmp, contents, 'utf8');
    renameSync(tmp, filePath);
  } catch (error) {
    try {
      unlinkSync(tmp);
    } catch {
      /* best-effort cleanup */
    }
    throw error;
  }
}

/**
 * Drops the previous build's `/page/N/` tree.
 *
 * The page count changes with the feed window, so a shrinking result would
 * otherwise leave orphaned, still-crawlable documents behind. `force` swallows
 * ENOENT; a permission error (e.g. a file locked by a browser) is survivable —
 * the fresh pages are still written, only stale ones linger.
 */
function removeStalePages(): void {
  try {
    rmSync(path.join(OUTPUT_ROOT, PAGE_SEGMENT), { recursive: true, force: true });
  } catch (error) {
    console.warn('[friends] Could not clear stale pages:', toErrorMessage(error));
  }
}

/** Writes the shared assets + one HTML document per pagination page. */
function writeSite(result: CollectResult): number {
  const { articles, sourcesOk, failed } = result;
  const pages = paginate(articles, ITEMS_PER_PAGE);
  // An empty result reports `0 页` (as the single-page build did) but still
  // emits page 1, so `/friends/` is never a 404.
  const totalPages = pages.length;
  const documents = Math.max(totalPages, 1);

  writeAtomic(path.join(OUTPUT_ROOT, ASSET_SEGMENT, CSS_FILE), ASSET_FRONT_MATTER + buildStyles());
  writeAtomic(path.join(OUTPUT_ROOT, ASSET_SEGMENT, JS_FILE), ASSET_FRONT_MATTER + buildScript());

  removeStalePages();

  for (let page = 1; page <= documents; page++) {
    const html = buildPageDocument({
      page,
      totalPages,
      items: pages[page - 1] ?? [],
      totalArticles: articles.length,
      sourcesOk,
      failedCount: failed.length
    });
    writeAtomic(pageFilePath(page), html);
  }

  return documents;
}

/* -------------------------------------------------------------------- Main -- */

/**
 * Leaves the process explicitly.
 *
 * `withTimeout()` races a promise but cannot cancel the work behind it: a slow
 * source keeps probing `FALLBACK_PATHS` long after we have given up on it, and
 * its sockets / timers would keep the event loop alive indefinitely. Everything
 * worth keeping is already on disk by now (`writeAtomic` is fully synchronous),
 * so the leftover requests are abandoned work — flush stdout and go.
 */
function finish(code: number): void {
  if (process.stdout.writableEnded) {
    process.exit(code);
    return;
  }
  process.stdout.write('', () => process.exit(code));
}

async function generate(): Promise<void> {
  const result = await collect();
  const totalPages = writeSite(result);
  console.log(`[friends] Written ${totalPages} page(s) to ${OUTPUT_ROOT}/\n`);
}

let exitCode = 0;

try {
  await generate();
} catch (error) {
  // Never fail the pipeline: emit a valid empty site instead of a broken build.
  console.error('[friends] Generation failed:', toErrorMessage(error));
  try {
    writeSite({ articles: [], sourcesOk: 0, failed: [] });
    console.log('[friends] Wrote empty fallback page\n');
  } catch (innerError) {
    console.error('[friends] Fallback write failed:', toErrorMessage(innerError));
    exitCode = 1;
  }
}

finish(exitCode);
