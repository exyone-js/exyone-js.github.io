/*!
 * Sortes Sacrae · 圣所 controller
 *
 * Owns exactly one interactive toy: 今日一牌. The card is derived from the
 * calendar date (FNV-1a over `YYYY-MM-DD`), so every visitor gets the same
 * card on the same day, and re-opening the page — or reloading it — can never
 * "reroll" it. Once drawn, the result is kept in localStorage for the day.
 */
import { escapeHtml, orientationLabel, renderCard } from './card';
import { DAILY_KEY_PREFIX, hashSeed, initShell, q, toast, todayKey } from './core';
import { DECK } from './deck';

interface DailyState {
  /** Index into `DECK`. */
  index: number;
  reversed: boolean;
}

export function mount(): void {
  initShell();

  const button = q<HTMLButtonElement>('[data-daily-draw]');
  const result = q<HTMLElement>('[data-daily-result]');
  const dateKey = todayKey();

  /* -------------------------------------------------------------- Storage -- */

  function readDaily(key: string): DailyState | null {
    try {
      const raw = localStorage.getItem(DAILY_KEY_PREFIX + key);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      const candidate = parsed as Record<string, unknown>;
      const index = candidate.index;
      if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= DECK.length) {
        return null;
      }
      return { index, reversed: candidate.reversed === true };
    } catch {
      return null;
    }
  }

  function writeDaily(key: string, state: DailyState): void {
    try {
      localStorage.setItem(DAILY_KEY_PREFIX + key, JSON.stringify(state));
    } catch {
      /* private mode — the draw still works, it just is not remembered */
    }
  }

  /** Deterministic: the same date always maps to the same card and orientation. */
  function deriveDaily(key: string): DailyState {
    return {
      index: hashSeed(`signum:${key}`) % DECK.length,
      reversed: hashSeed(`versus:${key}`) % 2 === 1
    };
  }

  function ensureDaily(key: string): DailyState {
    const existing = readDaily(key);
    if (existing) return existing;
    const derived = deriveDaily(key);
    writeDaily(key, derived);
    return derived;
  }

  /* --------------------------------------------------------------- Render -- */

  function renderDaily(state: DailyState): void {
    if (!result) return;
    const card = DECK[state.index];
    if (!card) return;

    const params = new URLSearchParams();
    params.set('spread', 'signum');
    params.set('c', `${state.index}.${state.reversed ? 1 : 0}`);
    params.set('q', '今日一牌');
    const href = `/tarot/reading/?${params.toString()}`.replace(/&/g, '&amp;');

    const keywords = state.reversed ? card.reversedKeywords : card.keywords;
    const text = state.reversed ? card.reversed : card.upright;
    const badge = state.reversed ? ' badge--reversed' : '';

    result.innerHTML = `<div class="entry anim-in">
      <div class="entry__card">${renderCard(card, state.reversed)}</div>
      <div class="entry__body">
        <p class="entry__pos">今日圣言 · Verbum Hodiernum</p>
        <h3 class="entry__name">${escapeHtml(card.name)}<span class="badge${badge}">${orientationLabel(state.reversed)}</span></h3>
        <p class="entry__latin">${escapeHtml(card.latin)}</p>
        <div class="entry__keywords">${keywords.map(word => `<span>${escapeHtml(word)}</span>`).join('')}</div>
        <p class="entry__text">${escapeHtml(text)}</p>
        <p class="entry__hint">${escapeHtml(card.symbolism)}</p>
        <div class="entry__meta"><div><b>德行：</b>${escapeHtml(card.virtue)}</div></div>
        <div class="btn-row" style="margin-top:18px">
          <a class="btn btn--gold" href="${href}">查看完整解读</a>
          <a class="btn btn--quiet" href="/tarot/draw/?spread=tria">换个问题，抽三德阵</a>
        </div>
      </div>
    </div>`;

    if (button) {
      button.textContent = '今日已抽出';
      button.setAttribute('aria-live', 'polite');
    }
  }

  /* ------------------------------------------------------------- Wiring -- */

  // A card drawn earlier today is shown straight away — the same one, every time.
  const stored = readDaily(dateKey);
  if (stored) renderDaily(stored);

  button?.addEventListener('click', () => {
    const already = readDaily(dateKey);
    if (already) {
      toast('今天已经抽过了，明天再来');
      renderDaily(already);
      return;
    }
    const state = ensureDaily(dateKey);
    renderDaily(state);
    toast('已抽出今日之牌');
  });
}
