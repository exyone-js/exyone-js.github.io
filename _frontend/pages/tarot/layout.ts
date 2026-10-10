/*!
 * Sortes Sacrae · HTML document shell
 *
 * The page frame shared by all six generated pages: favicon, nav, footer,
 * theme pre-paint snippet and the module script tag. Card markup itself lives
 * in `src/tarot/card.ts`, because the browser needs the very same functions.
 */
import { FAVICON_HREF, escapeHtml, renderCard, renderCardBack } from '../../src/tarot/card';

export { FAVICON_HREF, escapeHtml, renderCard, renderCardBack };

/* ------------------------------------------------------------------- Nav -- */

export interface NavItem {
  slug: string;
  href: string;
  label: string;
  latin: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { slug: 'index', href: '/tarot/', label: '圣所', latin: 'Sanctum' },
  { slug: 'draw', href: '/tarot/draw/', label: '抽牌', latin: 'Sortes' },
  { slug: 'codex', href: '/tarot/deck/', label: '图鉴', latin: 'Codex' },
  { slug: 'history', href: '/tarot/history/', label: '记录', latin: 'Memoria' },
  { slug: 'about', href: '/tarot/about/', label: '说明', latin: 'Ratio' }
];

const ASSET_BASE = '/tarot/assets';

function buildNav(slug: string): string {
  const links = NAV_ITEMS.map(item => {
    const current = item.slug === slug ? ' aria-current="page"' : '';
    return `<a class="nav__link" href="${item.href}" title="${escapeHtml(item.latin)}"${current}>${escapeHtml(item.label)}</a>`;
  }).join('');

  return `<div class="vault-head__inner">
    <a class="brand" href="/tarot/">
      <span class="brand__mark" aria-hidden="true">✠</span>
      <span class="brand__text">
        <span class="brand__title">圣言牌阵</span>
        <span class="brand__latin">Sortes Sacrae</span>
      </span>
    </a>
    <nav class="nav" aria-label="站内导航">${links}</nav>
  </div>`;
}

/* ------------------------------------------------------------------ Page -- */

export interface PageOptions {
  /** Nav slug highlighted as current; non-nav pages pass their own id. */
  slug: string;
  title: string;
  description: string;
  /** Entry bundle under `/tarot/assets/`, without the extension. */
  script: string;
  body: string;
}

/**
 * Full standalone document, including Jekyll front matter.
 *
 * The inline snippet resolves the palette before first paint: without it, a
 * returned light-theme visitor sees one frame of the night colours. It lives
 * in `pages/tarot/layout.ts` rather than `core.ts` because it must be inline,
 * and inlining is a build-time concern.
 */
export function buildPage(options: PageOptions): string {
  return `---
layout: null
sitemap: false
render_with_liquid: false
---
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${escapeHtml(options.title)}</title>
<meta name="description" content="${escapeHtml(options.description)}">
<meta name="robots" content="index,follow">
<meta name="theme-color" content="#f0e6d0">
<link rel="apple-touch-icon" href="${FAVICON_HREF}">
<link rel="icon" type="image/svg+xml" href="${FAVICON_HREF}">
<link rel="shortcut icon" href="${FAVICON_HREF}">
<link rel="stylesheet" href="${ASSET_BASE}/tarot.css">
</head>
<body data-page="${escapeHtml(options.slug)}">
<header class="vault-head">
${buildNav(options.slug)}
</header>

<main class="wrap shell">
${options.body}
</main>

<footer class="vault-foot">
  <p>圣言牌阵 · Sortes Sacrae — 以默观之心抽一张牌，向自己提问。</p>
  <p style="margin-top:16px"><a href="/tarot/about/">玩法说明</a> · <a href="/">返回 Exyone's Blog</a></p>
</footer>

<script defer src="${ASSET_BASE}/tarot.bundle.js"></script>
</body>
</html>`;
}

/** `<noscript>` notice for the pages that genuinely require scripting. */
export function noscriptNote(text: string): string {
  return `<noscript><p class="note" style="margin-top:20px">${escapeHtml(text)}</p></noscript>`;
}
