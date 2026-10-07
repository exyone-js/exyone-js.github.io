/*!
 * Friends feed page generator.
 *
 * Build-time script (not part of the browser bundle): pulls the latest posts
 * from every friend's feed and renders a standalone page to
 * `_site/friends/index.html`.
 *
 * Runs after `jekyll build`, and never fails the pipeline — a dead feed or a
 * blocked network degrades to an empty state instead of an error.
 *
 *   npm run pages
 *
 * Migrated from the Eleventy template `friends.11ty.js`, which read its feed
 * list from a sibling `friends.json` and published through an 11ty permalink.
 * The feed list is now inlined below and the page is written straight into the
 * Jekyll source tree, so no 11ty runtime is involved any more.
 *
 * Must run BEFORE `jekyll build` (see `npm run build:site`): the generated
 * `friends/index.html` is a Jekyll page source, so the published file is part
 * of the same build output every deploy target consumes.
 */
import { mkdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
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
 * Written into the Jekyll source tree (and gitignored), NOT into `_site`.
 *
 * `_site` is a throwaway deploy hop: anything dropped into it after
 * `jekyll build` only exists for the deploy step that happens to consume that
 * same directory. Generating the page *before* the build makes it an ordinary
 * Jekyll page, so it ships in the one `_site` that every deploy target reads.
 * Runs before `jekyll build` — see the CI steps and `npm run build:site`.
 */
const OUTPUT_DIR = '.';
const OUTPUT_PATH = 'friends/index.html';

/**
 * Front matter for the generated page.
 *
 * `layout: null` keeps it standalone (it carries its own <html>/<style>), and
 * `render_with_liquid: false` stops Jekyll from touching the inline CSS/JS.
 */
const FRONT_MATTER = `---
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

/* ------------------------------------------------------------------- Styles -- */

/* CSS variable-driven neumorphism; light/dark follow `prefers-color-scheme`. */
function buildStyles(): string {
  return `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{font-size:15px;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}

:root{
  /* Base colors — light/dark shades derived from --bg */
  --bg:#dfe6ef;
  --fg:#2b3a4f;
  --muted:#6b7d94;
  --accent:#3b82f6;
  --card:#dfe6ef;
  --neu-light:#f5fbff;      /* Highlight (~8% lighter than bg) */
  --neu-dark:#bccada;       /* Shadow (~12% darker than bg) */
  /* Depth levels */
  --depth-card:8px;
  --depth-card-blur:18px;
  --depth-btn:5px;
  --depth-btn-blur:12px;
  --radius-card:24px;
  --radius-btn:14px;
  --radius-pill:999px;
  --gap:1.35rem;
}
@media(prefers-color-scheme:dark){
  :root{
    --bg:#1a2332;
    --fg:#e6edf6;
    --muted:#8294ac;
    --accent:#60a5fa;
    --card:#1a2332;
    --neu-light:#222c3e;
    --neu-dark:#10181f;
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
.fe-head__left{display:flex;align-items:center;gap:.85rem}
.fe-head__icon{
  width:44px;height:44px;border-radius:var(--radius-btn);
  background:var(--card);color:var(--accent);
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
  box-shadow:var(--depth-btn) var(--depth-btn) var(--depth-btn-blur) var(--neu-dark),
             calc(var(--depth-btn)*-1) calc(var(--depth-btn)*-1) var(--depth-btn-blur) var(--neu-light);
}
.fe-head__icon svg{width:22px;height:22px}
.fe-head__title{font-size:1.15rem;font-weight:700;letter-spacing:-.02em;line-height:1.2}
.fe-head__sub{font-size:.75rem;color:var(--muted);margin-top:2px}
.fe-head__back{
  font-size:.8125rem;color:var(--muted);text-decoration:none;
  padding:.55rem 1.1rem;border-radius:var(--radius-pill);
  background:var(--card);white-space:nowrap;
  box-shadow:var(--depth-btn) var(--depth-btn) var(--depth-btn-blur) var(--neu-dark),
             calc(var(--depth-btn)*-1) calc(var(--depth-btn)*-1) var(--depth-btn-blur) var(--neu-light);
}
.fe-head__back:hover{color:var(--accent)}
.fe-head__back:active{
  box-shadow:inset var(--depth-btn) var(--depth-btn) var(--depth-btn-blur) var(--neu-dark),
             inset calc(var(--depth-btn)*-1) calc(var(--depth-btn)*-1) var(--depth-btn-blur) var(--neu-light);
}

/* ── Stats bar ── */
.fe-stats{
  display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.75rem;
  font-size:.78rem;color:var(--muted);
}
.fe-stat{
  display:inline-flex;align-items:center;gap:.5rem;
  padding:.5rem 1rem;border-radius:var(--radius-pill);background:var(--card);
  box-shadow:inset 3px 3px 7px var(--neu-dark),inset -3px -3px 7px var(--neu-light);
}
.fe-stat strong{color:var(--fg);font-weight:600}

/* ── Article grid ── */
.fe-page{display:none;gap:var(--gap);grid-template-columns:repeat(2,1fr)}
.fe-page--active{display:grid}
@media(max-width:640px){.fe-page{grid-template-columns:1fr}}

.fe-item{
  position:relative;
  padding:1.35rem 1.5rem;
  border-radius:var(--radius-card);
  background:var(--card);
  box-shadow:var(--depth-card) var(--depth-card) var(--depth-card-blur) var(--neu-dark),
             calc(var(--depth-card)*-1) calc(var(--depth-card)*-1) var(--depth-card-blur) var(--neu-light);
  overflow:hidden;
}
.fe-item::after{
  content:"";position:absolute;inset:0;border-radius:inherit;
  box-shadow:0 14px 30px rgba(59,130,246,.18),0 6px 14px var(--neu-dark);
  opacity:0;pointer-events:none;
}
.fe-item:hover::after{opacity:1}

.fe-item__title{font-size:.95rem;font-weight:600;line-height:1.45}
.fe-item__title a{color:var(--fg);text-decoration:none}
.fe-item__title a:hover{color:var(--accent)}
.fe-item__title a::after{content:"";position:absolute;inset:0}

.fe-item__summary{
  margin-top:.55rem;font-size:.78rem;color:var(--muted);line-height:1.55;
  overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;
}

.fe-item__meta{
  display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;
  margin-top:.85rem;padding-top:.75rem;
  font-size:.7rem;color:var(--muted);
  border-top:1px solid color-mix(in srgb,var(--neu-dark) 40%,transparent);
}
.fe-item__src{
  font-weight:600;color:var(--fg);
  max-width:60%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.fe-item__dot{opacity:.5}
.fe-item__time{white-space:nowrap}

/* ── Pagination ── */
.fe-pag{
  display:flex;align-items:center;justify-content:center;gap:1rem;
  margin-top:1.75rem;
}
.fe-pag__btn{
  font-size:.8125rem;padding:.55rem 1.25rem;border:none;border-radius:var(--radius-btn);
  background:var(--card);color:var(--fg);cursor:pointer;
  box-shadow:var(--depth-btn) var(--depth-btn) var(--depth-btn-blur) var(--neu-dark),
             calc(var(--depth-btn)*-1) calc(var(--depth-btn)*-1) var(--depth-btn-blur) var(--neu-light);
}
.fe-pag__btn:hover:not(:disabled){color:var(--accent)}
.fe-pag__btn:active:not(:disabled){
  box-shadow:inset var(--depth-btn) var(--depth-btn) var(--depth-btn-blur) var(--neu-dark),
             inset calc(var(--depth-btn)*-1) calc(var(--depth-btn)*-1) var(--depth-btn-blur) var(--neu-light);
}
.fe-pag__btn:disabled{opacity:.4;cursor:not-allowed}
.fe-pag__info{font-size:.75rem;color:var(--muted);min-width:120px;text-align:center}

/* ── Note / Empty state ── */
.fe-note{
  font-size:.78rem;color:var(--muted);margin-top:1.25rem;
  padding:.85rem 1.1rem;border-radius:var(--radius-btn);background:var(--card);
  box-shadow:inset 4px 4px 9px var(--neu-dark),inset -4px -4px 9px var(--neu-light);
}
.fe-empty{
  text-align:center;padding:3.5rem 1.5rem;color:var(--muted);
  border-radius:var(--radius-card);background:var(--card);margin-top:1rem;
  box-shadow:inset 6px 6px 14px var(--neu-dark),inset -6px -6px 14px var(--neu-light);
}
.fe-empty__icon{
  width:56px;height:56px;margin:0 auto 1rem;border-radius:50%;
  display:flex;align-items:center;justify-content:center;color:var(--accent);
  background:var(--card);
  box-shadow:var(--depth-btn) var(--depth-btn) var(--depth-btn-blur) var(--neu-dark),
             calc(var(--depth-btn)*-1) calc(var(--depth-btn)*-1) var(--depth-btn-blur) var(--neu-light);
}
.fe-empty__icon svg{width:26px;height:26px}
.fe-empty__text{font-size:.9rem}

/* ── Footer ── */
.fe-foot{
  text-align:center;font-size:.72rem;color:var(--muted);
  margin-top:2.5rem;padding-top:1.5rem;
  border-top:1px solid color-mix(in srgb,var(--neu-dark) 30%,transparent);
}

@media(prefers-contrast:high){
  :root{--neu-dark:rgba(0,0,0,.55);--neu-light:rgba(255,255,255,.7)}
  .fe-item,.fe-head__back,.fe-pag__btn,.fe-head__icon{
    border:1px solid currentColor;box-shadow:none;
  }
  .fe-item::after{display:none}
}
`;
}

/* -------------------------------------------------------- HTML fragments ---- */

function buildHead(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>友链动态</title>
<meta name="description" content="聚合朋友站点的最新文章动态">
<meta name="robots" content="index,follow">
<meta name="apple-mobile-web-app-title" content="EXYONE@BLOG:~$">
<meta name="application-name" content="EXYONE@BLOG:~$">
<meta name="theme-color" content="#dfe6ef" media="(prefers-color-scheme:light)">
<meta name="theme-color" content="#1a2332" media="(prefers-color-scheme:dark)">
<link rel="apple-touch-icon" href="${FAVICON_HREF}">
<link rel="apple-touch-icon-precomposed" href="${FAVICON_HREF}">
<link rel="icon" type="image/svg+xml" href="${FAVICON_HREF}">
<link rel="shortcut icon" href="${FAVICON_HREF}">
<style>${buildStyles()}</style>
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
    <span class="fe-item__dot" aria-hidden="true">·</span>
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

function buildPagesHtml(pages: readonly Article[][]): string {
  return pages
    .map((pageItems, idx) => {
      const itemsHtml = pageItems.map(buildCard).join('\n');
      return `<div class="fe-page${idx === 0 ? ' fe-page--active' : ''}">\n${itemsHtml}\n</div>`;
    })
    .join('\n');
}

function buildPaginationHtml(totalPages: number, totalArticles: number): string {
  if (totalPages <= 1) return '';
  return `<nav class="fe-pag" id="fe-pag" aria-label="分页导航">
  <button class="fe-pag__btn" data-page="prev" type="button" disabled aria-label="上一页">&lsaquo; 上一页</button>
  <span class="fe-pag__info" role="status" aria-live="polite">第 <span id="fe-page-num">1</span> / ${totalPages} 页 · 共 ${totalArticles} 篇</span>
  <button class="fe-pag__btn" data-page="next" type="button" aria-label="下一页">下一页 &rsaquo;</button>
</nav>`;
}

function buildEmptyState(hasErrors: boolean): string {
  const text = hasErrors ? '暂无友链动态，请检查订阅源配置' : '暂无友链动态';
  return `<div class="fe-empty">
  <div class="fe-empty__icon" aria-hidden="true">${ICON_CLOUD}</div>
  <p class="fe-empty__text">${text}</p>
</div>`;
}

function buildScript(): string {
  return `<script>
(function(){
  "use strict";
  var pages = Array.prototype.slice.call(document.querySelectorAll(".fe-page"));
  if (pages.length <= 1) return;

  var bar = document.getElementById("fe-pag");
  var numEl = document.getElementById("fe-page-num");
  if (!bar || !numEl) return;

  var prevBtn = bar.querySelector('[data-page="prev"]');
  var nextBtn = bar.querySelector('[data-page="next"]');
  var cur = 0;

  function render() {
    for (var i = 0; i < pages.length; i++) {
      pages[i].classList.toggle("fe-page--active", i === cur);
    }
    numEl.textContent = String(cur + 1);
    if (prevBtn) prevBtn.disabled = cur === 0;
    if (nextBtn) nextBtn.disabled = cur === pages.length - 1;
  }

  function go(delta) {
    var next = cur + delta;
    if (next < 0 || next >= pages.length) return;
    cur = next;
    render();
  }

  bar.addEventListener("click", function(e) {
    var t = e.target && e.target.closest ? e.target.closest(".fe-pag__btn") : null;
    if (!t || t.disabled) return;
    var d = t.getAttribute("data-page");
    if (d === "prev") go(-1);
    else if (d === "next") go(1);
  });

  document.addEventListener("keydown", function(e) {
    var tag = e.target && e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.key === "ArrowLeft") go(-1);
    else if (e.key === "ArrowRight") go(1);
  });

  // Touch swipe: horizontal only, conservative thresholds so vertical scroll wins.
  var sx = 0, sy = 0, tracking = false;
  document.addEventListener("touchstart", function(e) {
    if (e.touches.length !== 1) { tracking = false; return; }
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });

  document.addEventListener("touchend", function(e) {
    if (!tracking) return;
    tracking = false;
    var t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    var dx = t.clientX - sx;
    var dy = t.clientY - sy;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    go(dx < 0 ? 1 : -1);
  }, { passive: true });
})();
</script>`;
}

/* ------------------------------------------------------------------ Render -- */

function buildDocument(result: CollectResult): string {
  const { articles, sourcesOk, failed } = result;
  const pages = paginate(articles, ITEMS_PER_PAGE);
  const totalPages = pages.length;

  const body = articles.length
    ? buildPagesHtml(pages) + buildPaginationHtml(totalPages, articles.length)
    : buildEmptyState(failed.length > 0);

  const errorsHtml =
    failed.length > 0
      ? `<p class="fe-note">${failed.length} 个订阅源暂时无法访问</p>`
      : '';

  const script = totalPages > 1 ? buildScript() : '';

  return `${FRONT_MATTER}${buildHead()}
<body>
<div class="fe-wrap">
  <header class="fe-head">
    <div class="fe-head__left">
      <div class="fe-head__icon" aria-hidden="true">${ICON_CLOUD}</div>
      <div>
        <div class="fe-head__title">友链动态</div>
        <div class="fe-head__sub">聚合朋友站点的最新文章</div>
      </div>
    </div>
    <a href="/" class="fe-head__back">← 返回主页</a>
  </header>

  <div class="fe-stats">
    <span class="fe-stat"><strong>${articles.length}</strong> 篇文章</span>
    <span class="fe-stat"><strong>${sourcesOk}</strong> / ${FEEDS.length} 源在线</span>
    <span class="fe-stat"><strong>${totalPages}</strong> 页</span>
  </div>

  ${body}
  ${errorsHtml}

  <p class="fe-foot">Exyone Blog · 友链动态 · 订阅聚合</p>
</div>
${script}
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
  const html = buildDocument(result);
  const outPath = path.join(OUTPUT_DIR, OUTPUT_PATH);
  writeAtomic(outPath, html);
  console.log('[friends] Written to ' + outPath + '\n');
}

let exitCode = 0;

try {
  await generate();
} catch (error) {
  // Never fail the pipeline: emit a valid empty page instead of a broken build.
  console.error('[friends] Generation failed:', toErrorMessage(error));
  try {
    const fallback = buildDocument({ articles: [], sourcesOk: 0, failed: [] });
    writeAtomic(path.join(OUTPUT_DIR, OUTPUT_PATH), fallback);
    console.log('[friends] Wrote empty fallback page\n');
  } catch (innerError) {
    console.error('[friends] Fallback write failed:', toErrorMessage(innerError));
    exitCode = 1;
  }
}

finish(exitCode);