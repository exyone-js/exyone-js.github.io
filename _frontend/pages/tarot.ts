/*!
 * Sortes Sacrae · 圣言牌阵 page generator.
 *
 * Build-time script (not part of the browser bundle): renders a self-contained
 * multi-page static app into the gitignored `tarot/` tree, which `jekyll build`
 * then publishes as ordinary pages:
 *
 *   tarot/index.html           圣所    /tarot/            牌阵选择 + 今日一牌
 *   tarot/draw/index.html      抽牌台  /tarot/draw/       洗牌 · 切牌 · 抽牌
 *   tarot/reading/index.html   解读    /tarot/reading/    结果 + 综合整理
 *   tarot/deck/index.html      图鉴    /tarot/deck/       78 张完整牌义
 *   tarot/history/index.html   记录    /tarot/history/    本机占卜历史
 *   tarot/about/index.html     说明    /tarot/about/      玩法 + 免责声明
 *   tarot/assets/tarot.css     共用样式（本文件生成）
 *   tarot/assets/*.js          共用脚本（由 `npm run build:tarot` 打包）
 *
 * Multi-page rules this generator follows, mirroring `friends.ts`:
 *   • Every screen is its own HTML document; no page embeds another's markup.
 *   • No shared in-memory state: the drawn cards travel in the URL
 *     (`/tarot/reading/?spread=tria&c=12.1,45.0,7.1`), the theme and the
 *     reading history live in localStorage.
 *   • Styles/scripts are external and shared, and every page renders without
 *     JavaScript (the two pages that genuinely need it say so in <noscript>).
 *
 * Runs BEFORE `jekyll build` (see `npm run pages`); nothing is ever written
 * into `_site`, which is shared mutable state between deploy steps.
 */
import { mkdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { DECK, MAJOR_COUNT, MINOR_COUNT, SUITS } from '../src/tarot/deck';
import { SPREADS } from '../src/tarot/spreads';
import { buildPage, escapeHtml, noscriptNote, renderCard } from './tarot/layout';
import { buildStyles } from './tarot/styles';

/* ------------------------------------------------------------------ Config -- */

/** Root of the generated page tree (repo-relative, gitignored as `/tarot/`). */
const OUTPUT_ROOT = 'tarot';
const ASSET_SEGMENT = 'assets';
const CSS_FILE = 'tarot.css';

/* ------------------------------------------------------------- Fragments ---- */

const ORNAMENT = '<div class="ornament" aria-hidden="true">✠ ❦ ✠</div>';

/** The six-spread picker, used verbatim on the home page and as the draw
 *  page's no-parameter fallback (so it still works with JavaScript off). */
function renderSpreadCards(): string {
  const cards = SPREADS.map(spread => {
    const count = spread.positions.length;
    return `<a class="spread-card" href="/tarot/draw/?spread=${spread.id}">
    <span class="spread-card__seal" aria-hidden="true">${count}</span>
    <h3 class="spread-card__name">${escapeHtml(spread.name)}</h3>
    <p class="spread-card__latin">${escapeHtml(spread.latin)}</p>
    <p class="spread-card__summary">${escapeHtml(spread.summary)}</p>
    <p class="spread-card__foot"><span>共 ${count} 张</span><span>进入 ›</span></p>
  </a>`;
  }).join('\n  ');

  return `<div class="grid grid--3">
  ${cards}
</div>`;
}

function renderStep(number: string, name: string, latin: string, text: string): string {
  return `<div class="panel panel--tight">
    <span class="spread-card__seal" aria-hidden="true">${number}</span>
    <h3 class="spread-card__name" style="margin-top:12px">${escapeHtml(name)}</h3>
    <p class="spread-card__latin">${escapeHtml(latin)}</p>
    <p class="spread-card__summary">${escapeHtml(text)}</p>
  </div>`;
}

/* ------------------------------------------------------------------ Pages ---- */

function buildHome(): string {
  const body = `<section class="hero">
  <p class="hero__latin">Sortes Sacrae</p>
  <h1 class="hero__title"><span class="dropcap">圣言牌阵</span></h1>
  <p class="hero__motto">「你们应站在路上察看，探问旧路——那是善道，便行在其间。」</p>
</section>

${ORNAMENT}

<section class="panel" id="daily">
  <h2 class="panel__title">今日一牌 <span class="panel__latin">Signum Diei</span></h2>
  <p class="panel__lead">同一天之内只会抽出同一张牌，它不会因为你再点一次而改变。想换一个提问，请改用其他牌阵。</p>
  <div class="btn-row">
    <button class="btn btn--gold" type="button" data-daily-draw>抽出今日之牌</button>
    <a class="btn" href="/tarot/draw/?spread=tria">直接进入三德阵</a>
  </div>
  <div data-daily-result style="margin-top:24px"></div>
</section>

${ORNAMENT}

<section class="section" id="spreads">
  <div class="section__head">
    <h2>选择牌阵</h2>
    <p>Six spreads · 一张到十张</p>
  </div>
  ${renderSpreadCards()}
</section>

${ORNAMENT}

<section class="section">
  <div class="section__head">
    <h2>三步入门</h2>
    <p>Rule of three</p>
  </div>
  <div class="grid grid--3">
    ${renderStep('壹', '静心', 'Quiescere', '先安静一分钟，把想问的事写成一句话。写不出来，就先不抽。')}
    ${renderStep('贰', '洗牌与切牌', 'Miscere · Secare', '点「洗牌」打乱牌堆，再点「切牌」把它分成两叠，象征把自己也放进去。')}
    ${renderStep('叁', '逐张翻开', 'Revelare', '按牌阵的顺序一张张点开，不要跳位。全部翻开后进入解读页。')}
  </div>
</section>

${ORNAMENT}

<section class="section">
  <div class="section__head">
    <h2>其他入口</h2>
    <p>Codex · Memoria · Ratio</p>
  </div>
  <div class="grid grid--3">
    <a class="spread-card" href="/tarot/deck/">
      <h3 class="spread-card__name">牌义图鉴</h3>
      <p class="spread-card__latin">Codex</p>
      <p class="spread-card__summary">78 张牌的正位、逆位、象征与德行对照，可检索筛选。</p>
      <p class="spread-card__foot"><span>78 张</span><span>翻阅 ›</span></p>
    </a>
    <a class="spread-card" href="/tarot/history/">
      <h3 class="spread-card__name">占卜记录</h3>
      <p class="spread-card__latin">Memoria</p>
      <p class="spread-card__summary">你抽过的牌阵都存在这台设备上，可回看、可导出。</p>
      <p class="spread-card__foot"><span>本机存储</span><span>查看 ›</span></p>
    </a>
    <a class="spread-card" href="/tarot/about/">
      <h3 class="spread-card__name">玩法说明</h3>
      <p class="spread-card__latin">Ratio</p>
      <p class="spread-card__summary">六种牌阵的用法、牌的结构，以及必须说明的免责声明。</p>
      <p class="spread-card__foot"><span>必读</span><span>阅读 ›</span></p>
    </a>
  </div>
</section>

${ORNAMENT}

<p class="note">这不是一个预测工具。牌面只是一组固定的意象，用来帮你把说不出口的问题说清楚——真正的答案，通常在你写问题的时候就已经露出来了。</p>`;

  return buildPage({
    slug: 'index',
    title: '圣言牌阵 · Sortes Sacrae',
    description: '天主教风格的塔罗牌阵工具：六种牌阵、78 张完整牌义、可检索图鉴与本机占卜记录。',
    script: 'home',
    body
  });
}

function buildDraw(): string {
  const body = `<section class="section" style="margin-top:40px">
  <div class="section__head">
    <h1>抽牌台</h1>
    <p>Sortes · 洗牌、切牌、逐张翻开</p>
  </div>
</section>

<section class="section" style="margin-top:24px" data-draw-picker>
  <div class="section__head">
    <h2>选择牌阵</h2>
    <p>Elige Ordinem</p>
  </div>
  ${renderSpreadCards()}
</section>

<section class="section" style="margin-top:24px" data-draw-table hidden>
  <div class="panel">
    <h2 class="panel__title"><span data-spread-name>抽牌台</span> <span class="panel__latin" data-spread-latin>Sortes</span></h2>
    <p class="panel__lead" data-spread-guide></p>
    <div class="table-head">
      <label class="field" style="flex:1 1 320px">
        <span class="field__label">求问 · Quaestio（可留空）</span>
        <input class="input" type="text" maxlength="140" autocomplete="off"
               placeholder="例如：我该如何面对这段关系？" data-question>
      </label>
      <div class="btn-row">
        <label class="switch"><input type="checkbox" data-allow-reversed checked> 启用逆位</label>
      </div>
    </div>
    <div class="btn-row" style="margin-top:22px">
      <button class="btn btn--gold" type="button" data-action="shuffle">洗牌 · Miscere</button>
      <button class="btn" type="button" data-action="cut">切牌 · Secare</button>
      <button class="btn" type="button" data-action="reveal-all">一次展开剩余</button>
      <a class="btn btn--quiet" href="/tarot/draw/">换牌阵</a>
      <button class="btn btn--quiet" type="button" data-action="reset">重新开始</button>
    </div>
  </div>

  ${ORNAMENT}

  <div class="spread" data-spread-root></div>
  <p class="progress" data-progress></p>

  ${ORNAMENT}

  <div class="section__head">
    <h2>牌堆</h2>
    <p>点击任意一张即可抽牌；顺序由洗牌决定</p>
  </div>
  <div class="deck-pile" data-deck-pile></div>

  <div class="btn-row" style="justify-content:center;margin-top:28px">
    <a class="btn btn--gold" href="/tarot/reading/" data-goto-reading aria-disabled="true">查看解读 · Interpretatio</a>
    <button class="btn" type="button" data-action="reset">重新开始</button>
  </div>
</section>

${noscriptNote('抽牌台需要 JavaScript 才能洗牌与翻牌。请开启脚本，或改用 /tarot/deck/ 查阅牌义。')}`;

  return buildPage({
    slug: 'draw',
    title: '抽牌台 · Sortes',
    description: '洗牌、切牌、逐张翻开——六种牌阵的抽牌台。',
    script: 'draw',
    body
  });
}

function buildReading(): string {
  const body = `<section class="section" style="margin-top:40px">
  <div class="section__head">
    <h1>解读</h1>
    <p>Interpretatio · 由网址参数还原</p>
  </div>
</section>

<section class="section" style="margin-top:24px" data-reading-root>
  <p class="note">正在读取牌阵…如果这段文字一直停在这里，说明链接不完整，请回到<a href="/tarot/draw/">抽牌台</a>重新抽一次。</p>
</section>

${noscriptNote('解读页需要 JavaScript 才能从网址参数还原牌阵。')}`;

  return buildPage({
    slug: 'reading',
    title: '解读 · Interpretatio',
    description: '牌阵解读：逐位牌义与整体整理。',
    script: 'reading',
    body
  });
}

function buildCodex(): string {
  const filters = [
    { id: 'all', label: '全部 78' },
    { id: 'major', label: `大阿卡纳 ${MAJOR_COUNT}` },
    ...SUITS.map(suit => ({ id: suit.id, label: `${suit.name} · ${suit.latin}` }))
  ];

  const chips = filters.map((filter, i) =>
    `<button class="chip" type="button" data-codex-filter="${filter.id}" aria-pressed="${i === 0}">${escapeHtml(filter.label)}</button>`
  ).join('');

  const items = DECK.map(card => {
    const suit = card.arcana === 'major' ? 'major' : (card.suit ?? '');
    return `<button class="codex-item" type="button" data-card="${card.id}" data-suit="${suit}">
    ${renderCard(card)}
    <span class="codex-item__name">${escapeHtml(card.name)}</span>
  </button>`;
  }).join('\n  ');

  const body = `<section class="section" style="margin-top:40px">
  <div class="section__head">
    <h1>牌义图鉴</h1>
    <p>Codex · ${DECK.length} 张</p>
  </div>

  <div class="panel panel--tight">
    <div class="table-head" style="margin-bottom:14px">
      <label class="field" style="flex:1 1 280px">
        <span class="field__label">检索 · Quaerere</span>
        <input class="input" type="search" autocomplete="off"
               placeholder="牌名、拉丁名或关键词，例如「希望」" data-codex-search>
      </label>
      <div class="chips" data-codex-filters>${chips}</div>
    </div>
    <p class="progress" style="margin:0" data-codex-count></p>
  </div>

  <div class="codex-grid" data-codex-grid style="margin-top:24px">
  ${items}
  </div>

  <div class="empty" data-codex-empty hidden>
    <p class="empty__mark" aria-hidden="true">✠</p>
    <p>没有符合条件的牌。换一个关键词，或点「全部 78」。</p>
  </div>
</section>

${ORNAMENT}

<p class="note">四花色分别对映火、水、风、土；每张牌的正位与逆位释义都只是一种读法，不是定义。</p>

<div class="modal" data-modal hidden>
  <div class="modal__box" role="dialog" aria-modal="true" aria-label="牌义详情">
    <button class="modal__close" type="button" data-modal-close aria-label="关闭">✕</button>
    <div data-modal-content></div>
  </div>
</div>`;

  return buildPage({
    slug: 'codex',
    title: '牌义图鉴 · Codex',
    description: '78 张塔罗牌的正位、逆位、象征与德行对照，支持检索与筛选。',
    script: 'codex',
    body
  });
}

function buildHistory(): string {
  const body = `<section class="section" style="margin-top:40px">
  <div class="section__head">
    <h1>占卜记录</h1>
    <p>Memoria · 只存在本机浏览器</p>
  </div>

  <div class="btn-row">
    <button class="btn" type="button" data-history-export>导出 JSON</button>
    <button class="btn btn--danger" type="button" data-history-clear>清空全部</button>
  </div>

  <p class="note" style="margin-top:18px">
    记录保存在这台设备的 <code>localStorage</code> 中，不会上传到任何服务器。清除浏览器数据会一并删除；
    想长期保留，请用「导出 JSON」。
  </p>

  <ul class="history-list" data-history-root style="margin-top:26px"></ul>

  <div class="empty" data-history-empty hidden>
    <p class="empty__mark" aria-hidden="true">✠</p>
    <p>还没有记录。去<a href="/tarot/draw/">抽牌台</a>抽一次牌阵，解读完就会自动记在这里。</p>
  </div>
</section>`;

  return buildPage({
    slug: 'history',
    title: '占卜记录 · Memoria',
    description: '本机保存的塔罗牌阵记录，可回看与导出。',
    script: 'history',
    body
  });
}

function buildAbout(): string {
  const spreadBlocks = SPREADS.map(spread => {
    const positions = spread.positions.map(position =>
      `<li><b>${escapeHtml(position.label)}</b> <span class="panel__latin">${escapeHtml(position.latin)}</span> — ${escapeHtml(position.hint)}</li>`
    ).join('\n      ');

    return `<div class="panel">
    <h3 class="panel__title">${escapeHtml(spread.name)} <span class="panel__latin">${escapeHtml(spread.latin)}</span></h3>
    <p class="panel__lead">${escapeHtml(spread.motto)}</p>
    <p style="margin:0 0 12px;color:var(--text-dim);font-size:.92rem">${escapeHtml(spread.summary)}</p>
    <ol>
      ${positions}
    </ol>
    <p class="note" style="margin-top:16px">${escapeHtml(spread.guide)}</p>
  </div>`;
  }).join('\n  ');

  const suitRows = SUITS.map(suit =>
    `<li><b>${escapeHtml(suit.name)} · ${escapeHtml(suit.latin)}</b> — ${escapeHtml(suit.element)}；${escapeHtml(suit.domain)}；相应德行：${escapeHtml(suit.virtue)}</li>`
  ).join('\n      ');

  const body = `<section class="section" style="margin-top:40px">
  <div class="section__head">
    <h1>说明</h1>
    <p>Ratio Operis</p>
  </div>

  <div class="panel">
    <h2 class="panel__title">这是什么 <span class="panel__latin">Quid Est</span></h2>
    <p class="panel__lead">一个用彩窗与金饰写成的塔罗牌阵工具，六种玩法，从一张到十张。</p>
    <p>牌义沿用通行的塔罗系统（22 张大阿卡纳与四个花色），每一张另附一段与天主教德行传统的对照，
    作为默想的引子。抽牌是随机的，读牌的是你自己。</p>
    <p class="note" style="margin-top:16px">
      使用方式：从牌阵页进入抽牌台 → 洗牌、切牌 → 逐张翻开 → 解读页会给出逐位牌义与整体整理。
      结果会以网址参数的形式保存在链接里，可以直接分享或收藏。
    </p>
  </div>

  ${ORNAMENT}

  <div class="section__head">
    <h2>六种牌阵</h2>
    <p>Sex Ordines</p>
  </div>
  <div class="grid grid--2">
  ${spreadBlocks}
  </div>

  ${ORNAMENT}

  <div class="section__head">
    <h2>牌的构成</h2>
    <p>De Structura</p>
  </div>
  <div class="grid grid--2">
    <div class="panel">
      <h3 class="panel__title">大阿卡纳 <span class="panel__latin">Arcana Maiora</span></h3>
      <p class="panel__lead">${MAJOR_COUNT} 张 · 0 – XXI</p>
      <p>从「愚者」到「世界」，描述一段完整的历程。牌阵里出现得越多，通常意味着这件事越关乎整体方向，而非细节。</p>
    </div>
    <div class="panel">
      <h3 class="panel__title">小阿卡纳 <span class="panel__latin">Arcana Minora</span></h3>
      <p class="panel__lead">${MINOR_COUNT} 张 · 四花色 × 14</p>
      <ul>
      ${suitRows}
      </ul>
    </div>
  </div>

  ${ORNAMENT}

  <div class="section__head">
    <h2>数据与隐私</h2>
    <p>De Notitia</p>
  </div>
  <ul class="note" style="padding-left:2.2rem">
    <li>抽牌结果写在网址参数中（例如 <code>?spread=tria&amp;c=12.1,45.0,7.1</code>），刷新或分享都不会变。</li>
    <li>主题（昼 / 夜）与占卜记录存在本机 <code>localStorage</code>，不上传、有数量上限。</li>
    <li>「今日一牌」由当天日期推算，同一天永远是同一张。</li>
    <li>整站是构建期生成的静态页面，没有任何后端与追踪脚本。</li>
  </ul>

  ${ORNAMENT}

  <div class="section__head">
    <h2>免责声明</h2>
    <p>Monitum</p>
  </div>
  <div class="note disclaimer" style="padding:22px 24px">
    <p><strong>这是一个娱乐性的个人创作，不是宗教工具。</strong></p>
    <p>本页的「天主教风格」仅指视觉与文字气质——泥金手抄本、羊皮纸、金饰、拉丁文与德行名词。
    牌义与德行之间的对照是编辑性的附会，<strong>不代表教会教导，也不具备任何教义或灵性权威</strong>；
    天主教会并不认可以塔罗占卜未来，本页也无意鼓励这种做法。</p>
    <p>请勿用它取代祈祷、圣事（尤其是告解）、医疗、心理或法律专业意见。若有实际的困难，
    请寻求可信的人或专业人士当面协助。牌面只映照你自己的想法，命运不在牌里。</p>
  </div>
</section>`;

  return buildPage({
    slug: 'about',
    title: '说明 · Ratio',
    description: '圣言牌阵的玩法说明、牌阵一览、数据隐私与免责声明。',
    script: 'about',
    body
  });
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
 * The page set is fixed (no pagination), so nothing has to be pruned — but the
 * shared assets live *inside* the same tree and are produced by a separate
 * esbuild step, so this generator must never wipe `tarot/` wholesale.
 */
const PAGES: readonly (readonly [string, () => string])[] = [
  [path.join(OUTPUT_ROOT, 'index.html'), buildHome],
  [path.join(OUTPUT_ROOT, 'draw', 'index.html'), buildDraw],
  [path.join(OUTPUT_ROOT, 'reading', 'index.html'), buildReading],
  [path.join(OUTPUT_ROOT, 'deck', 'index.html'), buildCodex],
  [path.join(OUTPUT_ROOT, 'history', 'index.html'), buildHistory],
  [path.join(OUTPUT_ROOT, 'about', 'index.html'), buildAbout]
];

function generate(): void {
  writeAtomic(path.join(OUTPUT_ROOT, ASSET_SEGMENT, CSS_FILE), buildStyles());

  for (const [filePath, build] of PAGES) {
    writeAtomic(filePath, build());
  }

  console.log(`[tarot] Wrote ${PAGES.length} page(s) + ${CSS_FILE} to ${OUTPUT_ROOT}/\n`);
}

try {
  generate();
} catch (error) {
  console.error('[tarot] Generation failed:', error instanceof Error ? error.message : error);
  process.exit(1);
}
