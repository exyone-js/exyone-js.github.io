/*!
 * Sortes Sacrae · 解读 controller
 *
 * Rebuilds a drawing from the URL alone — there is no session, no in-memory
 * hand-off and no server. Everything below is a pure function of
 * `?spread=&c=&q=`, which is what makes a reading linkable and re-openable.
 */
import { escapeHtml, orientationLabel, renderCard, suitLabel } from './card';
import {
  copyText,
  decodePicks,
  formatDateTimeLong,
  initShell,
  loadHistory,
  q,
  readingId,
  saveReading,
  toast
} from './core';
import { SUITS, cardByIndex, suitInfo } from './deck';
import { spreadById } from './spreads';
import type { Pick } from './core';
import type { SuitId, TarotCard } from './deck';
import type { Spread, SpreadPosition } from './spreads';

interface Row {
  pick: Pick;
  card: TarotCard;
  position: SpreadPosition;
}

const ORNAMENT = '<div class="ornament" aria-hidden="true">✠ ❦ ✠</div>';

export function mount(): void {
  initShell();

  const params = new URLSearchParams(window.location.search);
  const spread = spreadById(params.get('spread'));
  const rawCards = params.get('c');
  const picks = decodePicks(rawCards);
  const question = (params.get('q') ?? '').trim();

  const root = q<HTMLElement>('[data-reading-root]');

  if (root) {
    const rows = spread && picks ? toRows(spread, picks) : null;
    if (!spread || !picks || !rows) {
      renderError(root);
    } else {
      renderReading(root, spread, picks, rows);
    }
  }

  /* ----------------------------------------------------------- Assembling -- */

  /** Returns `null` when any index is out of range or the count does not match. */
  function toRows(active: Spread, drawn: readonly Pick[]): Row[] | null {
    if (drawn.length !== active.positions.length) return null;
    const rows: Row[] = [];
    for (let i = 0; i < drawn.length; i++) {
      const pick = drawn[i] as Pick;
      const card = cardByIndex(pick.index);
      const position = active.positions[i];
      if (!card || !position) return null;
      rows.push({ pick, card, position });
    }
    return rows;
  }

  /* ------------------------------------------------------------- Render -- */

  function renderError(container: HTMLElement): void {
    container.innerHTML = `<div class="empty">
      <p class="empty__mark" aria-hidden="true">✠</p>
      <p>这个链接里的牌阵不完整，或者已经失效了。</p>
      <div class="btn-row" style="justify-content:center;margin-top:20px">
        <a class="btn btn--gold" href="/tarot/draw/">去抽牌台重新抽一次</a>
        <a class="btn" href="/tarot/about/">看玩法说明</a>
      </div>
    </div>`;
  }

  function renderReading(
    container: HTMLElement,
    active: Spread,
    drawn: readonly Pick[],
    rows: readonly Row[]
  ): void {
    document.title = `${active.name} · 解读 · Sortes Sacrae`;

    const entries = rows.map(row => entryMarkup(row)).join('\n');
    const shareQuestion = question ? escapeHtml(question) : '（未填写）';

    container.innerHTML = `<section class="panel panel--illum">
      <h2 class="panel__title"><span class="dropcap">${escapeHtml(active.name)}</span> <span class="panel__latin">${escapeHtml(active.latin)}</span></h2>
      <p class="panel__lead">${escapeHtml(active.motto)}</p>
      <div class="stats">
        <div class="stat">
          <p class="stat__label">求问 · Quaestio</p>
          <p class="stat__value" style="font-size:1.02rem">${shareQuestion}</p>
        </div>
        <div class="stat">
          <p class="stat__label">时间 · Tempus</p>
          <p class="stat__value" style="font-size:1.02rem">${escapeHtml(formatDateTimeLong(new Date()))}</p>
        </div>
        <div class="stat">
          <p class="stat__label">牌数 · Numerus</p>
          <p class="stat__value">${drawn.length}</p>
          <p class="stat__note">${escapeHtml(active.latin)}</p>
        </div>
      </div>
    </section>

    ${ORNAMENT}

    <div class="reading-grid">
      ${entries}
    </div>

    ${ORNAMENT}

    ${synthesisMarkup(active, rows)}

    ${ORNAMENT}

    <div class="panel panel--tight">
      <div class="btn-row">
        <button class="btn btn--gold" type="button" data-copy-link>复制分享链接</button>
        <a class="btn" href="/tarot/draw/?spread=${encodeURIComponent(active.id)}">重新抽一次</a>
        <a class="btn" href="/tarot/deck/">查牌义图鉴</a>
        <a class="btn" href="/tarot/history/">看记录</a>
        <button class="btn btn--quiet" type="button" data-print>打印</button>
      </div>
      <p class="note" style="margin-top:18px">
        这副牌已经完全保存在网址里：把链接发给别人，对方看到的就是同一副牌、同一组位置。
        本次结果也已记入本机记录。
      </p>
    </div>`;

    remember(active, rawCards ?? '');

    q<HTMLButtonElement>('[data-copy-link]')?.addEventListener('click', async () => {
      const ok = await copyText(window.location.href);
      toast(ok ? '链接已复制' : '复制失败，请手动复制地址栏');
    });

    q<HTMLButtonElement>('[data-print]')?.addEventListener('click', () => window.print());
  }

  function entryMarkup(row: Row): string {
    const { card, position, pick } = row;
    const keywords = pick.reversed ? card.reversedKeywords : card.keywords;
    const text = pick.reversed ? card.reversed : card.upright;
    const badgeClass = pick.reversed ? ' badge--reversed' : '';

    return `<article class="entry">
      <div class="entry__card">${renderCard(card, pick.reversed)}</div>
      <div class="entry__body">
        <p class="entry__pos">${escapeHtml(position.label)} · ${escapeHtml(position.latin)}</p>
        <h3 class="entry__name"><span class="dropcap">${escapeHtml(card.name)}</span><span class="badge${badgeClass}">${orientationLabel(pick.reversed)}</span></h3>
        <p class="entry__latin">${escapeHtml(card.latin)} · ${escapeHtml(suitLabel(card))}</p>
        <div class="entry__keywords">${keywords.map(word => `<span>${escapeHtml(word)}</span>`).join('')}</div>
        <p class="entry__hint">${escapeHtml(position.hint)}</p>
        <p class="entry__text">${escapeHtml(text)}</p>
        <div class="entry__meta">
          <div><b>象征：</b>${escapeHtml(card.symbolism)}</div>
          <div><b>德行：</b>${escapeHtml(card.virtue)}</div>
        </div>
      </div>
    </article>`;
  }

  /* ------------------------------------------------------------ Synthesis -- */

  interface Stats {
    total: number;
    major: number;
    reversed: number;
    suits: { id: SuitId; name: string; latin: string; count: number }[];
    dominantSuite: { name: string; count: number; domain: string } | null;
    distinctSuits: number;
  }

  function computeStats(rows: readonly Row[]): Stats {
    const counts: Record<SuitId, number> = { wands: 0, cups: 0, swords: 0, pentacles: 0 };
    let major = 0;
    let reversed = 0;

    for (const row of rows) {
      if (row.card.arcana === 'major') major += 1;
      else if (row.card.suit) counts[row.card.suit] += 1;
      if (row.pick.reversed) reversed += 1;
    }

    const suits = SUITS.map(suit => ({
      id: suit.id,
      name: suit.name,
      latin: suit.latin,
      count: counts[suit.id]
    }));

    const distinctSuits = suits.filter(suit => suit.count > 0).length;
    const leader = suits.reduce<{ id: SuitId; name: string; count: number } | null>(
      (best, suit) => (suit.count > 0 && (!best || suit.count > best.count) ? suit : best),
      null
    );
    const info = leader ? suitInfo(leader.id) : undefined;

    return {
      total: rows.length,
      major,
      reversed,
      suits,
      distinctSuits,
      dominantSuite:
        leader && info ? { name: leader.name, count: leader.count, domain: info.domain } : null
    };
  }

  function meterRow(label: string, count: number, total: number, modifier: string): string {
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
    return `<div class="meter__row">
        <span class="meter__name">${escapeHtml(label)}</span>
        <span class="meter__track"><span class="meter__fill meter__fill--${modifier}" style="width:${percent}%"></span></span>
        <span class="meter__num">${count}</span>
      </div>`;
  }

  function synthesisMarkup(active: Spread, rows: readonly Row[]): string {
    const stats = computeStats(rows);
    const total = stats.total;

    const majorNote = stats.major === 0
      ? '全为小阿卡纳，事情仍在日常可处理的范围内'
      : stats.major * 2 >= total
        ? '大阿卡纳偏多，这是方向性的关口'
        : '少量大阿卡纳，方向大致清楚';

    const reversedNote = stats.reversed === 0
      ? '全部正位，能量顺畅'
      : stats.reversed * 2 >= total
        ? '逆位偏多，许多力量还在内里没有发动'
        : '少量逆位，局部有阻力';

    const verdict = composeVerdict(active, rows, stats);

    return `<section class="panel panel--illum">
      <h2 class="panel__title"><span class="dropcap">整体整理</span> <span class="panel__latin">Interpretatio</span></h2>
      <p class="panel__lead">把 ${total} 张牌放在一起看，得到的是这一副牌的「性格」，而不是又一轮预言。</p>

      <div class="stats">
        <div class="stat">
          <p class="stat__label">大阿卡纳</p>
          <p class="stat__value">${stats.major}<span style="font-size:.95rem;color:var(--ink-faint)"> / ${total}</span></p>
          <p class="stat__note">${escapeHtml(majorNote)}</p>
        </div>
        <div class="stat">
          <p class="stat__label">逆位</p>
          <p class="stat__value">${stats.reversed}<span style="font-size:.95rem;color:var(--ink-faint)"> / ${total}</span></p>
          <p class="stat__note">${escapeHtml(reversedNote)}</p>
        </div>
        <div class="stat">
          <p class="stat__label">主导花色</p>
          <p class="stat__value" style="font-size:1.22rem">${stats.dominantSuite ? escapeHtml(stats.dominantSuite.name) : '大阿卡纳'}</p>
          <p class="stat__note">${escapeHtml(stats.dominantSuite ? stats.dominantSuite.domain : '方向 · 整全')}</p>
        </div>
      </div>

      <div class="meter" style="margin-top:22px">
        ${meterRow('大阿卡纳', stats.major, total, 'major')}
        ${stats.suits.map(suit => meterRow(`${suit.name} · ${suit.latin}`, suit.count, total, suit.id)).join('\n        ')}
      </div>

      <div class="verdict">
        ${verdict.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('\n        ')}
      </div>
    </section>`;
  }

  /**
   * Turns the statistics plus a few relational checks into readable prose.
   * Deliberately conservative: every sentence describes what is *on the table*,
   * never a prediction.
   */
  function composeVerdict(active: Spread, rows: readonly Row[], stats: Stats): string[] {
    const out: string[] = [];
    const first = rows[0];
    const last = rows[rows.length - 1];

    if (active.positions.length > 1 && first && last) {
      const firstSuit = first.card.arcana === 'major' ? 'major' : first.card.suit;
      const lastSuit = last.card.arcana === 'major' ? 'major' : last.card.suit;
      if (firstSuit && firstSuit === lastSuit && first.card.arcana === 'minor') {
        out.push(
          `首位「${first.position.label}」与末位「${last.position.label}」同属${first.card.name.replace(/[一二三四五六七八九十].*$/, '')}` +
          `，起点的处境与终点的去向其实是同一件事的两端。`
        );
      }
      if (last.card.arcana === 'major') {
        out.push(
          `末位「${last.position.label}」落在「${last.card.name}」这张大阿卡纳上：最后的决定，仍要回到一个更大的方向上来做，` +
          `而不是靠细节上的取巧。`
        );
      }
    }

    if (stats.dominantSuite) {
      out.push(
        `花色以${stats.dominantSuite.name}（${stats.dominantSuite.count} 张）为主，` +
        `说明这件事的重心落在「${stats.dominantSuite.domain}」这一层。`
      );
    } else if (stats.major > 0) {
      out.push('小阿卡纳没有形成明显的主导，牌面几乎都由大阿卡纳承担，这更像是一次关于方向的提问。');
    }

    if (stats.distinctSuits >= 3) {
      out.push('花色分散在三个以上，牵连的层面较广，最好拆开来分别处理，不要指望一次解决。');
    } else if (stats.distinctSuits === 1 && stats.major === 0) {
      out.push('四种花色只出现了一种，能量高度集中，此时把力气用在同一件事上，会比分散尝试更有效。');
    }

    if (stats.reversed > 0 && stats.reversed < stats.total) {
      out.push(
        `有 ${stats.reversed} 张逆位。逆位不必然是坏事：它通常表示这股力量还在内里酝酿，或需要先放下一部分执念。`
      );
    }

    out.push(
      `回到你自己的处境去核对：哪一句让你停顿、让你想反驳，那一句就值得多想一会儿。` +
      `牌面只映照你自己的想法，它没有替你决定任何事。`
    );

    return out;
  }

  /* -------------------------------------------------------------- History -- */

  /**
   * Records the reading locally.
   *
   * The id is `spread|cards`, so re-opening the same link keeps its original
   * timestamp instead of pretending to be a new draw.
   */
  function remember(active: Spread, cards: string): void {
    if (!cards) return;
    const id = readingId(active.id, cards);
    const existing = loadHistory().find(record => record.id === id);
    saveReading({
      id,
      ts: existing ? existing.ts : Date.now(),
      spread: active.id,
      question,
      cards
    });
  }
}
