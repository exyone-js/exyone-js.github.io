/*!
 * Sortes Sacrae · 抽牌台 controller
 *
 * The only page that holds transient state, and it holds it for one screen
 * only: the moment the last card is revealed the whole drawing is encoded into
 * the link to the reading page. Nothing is handed over in memory, so a reload
 * or a shared link behaves identically to the session that produced it.
 */
import { escapeHtml, renderCard } from './card';
import {
  encodePicks,
  initShell,
  prefersReducedMotion,
  q,
  qa,
  randomInt,
  setText,
  shuffle,
  show,
  toast
} from './core';
import { DECK } from './deck';
import { spreadById } from './spreads';
import type { Pick } from './core';
import type { Spread, SpreadPosition } from './spreads';

/** Decorative pile size — enough cards to read as a deck without 78 nodes. */
const PILE_SIZE = 21;

interface DrawState {
  spread: Spread;
  /** Card indices in the order the shuffled deck will give them out. */
  deck: number[];
  /** Reversed flag per deck slot, decided at shuffle time so it stays stable. */
  flips: boolean[];
  cursor: number;
  picks: Pick[];
  allowReversed: boolean;
  shuffled: boolean;
}

export function mount(): void {
  initShell();

  const picker = q<HTMLElement>('[data-draw-picker]');
  const table = q<HTMLElement>('[data-draw-table]');

  const requested = new URLSearchParams(window.location.search).get('spread');
  const spread = spreadById(requested);

  if (!spread) {
    // No `?spread=` — fall back to the server-rendered picker, which works
    // without JavaScript at all because it is nothing but links.
    show(picker, true);
    show(table, false);
  } else {
    boot(spread);
  }

  function boot(active: Spread): void {
    show(picker, false);
    show(table, true);

    const state: DrawState = {
      spread: active,
      deck: DECK.map(card => card.index),
      flips: DECK.map(() => false),
      cursor: 0,
      picks: [],
      allowReversed: true,
      shuffled: false
    };

    setText(q('[data-spread-name]'), active.name);
    setText(q('[data-spread-latin]'), active.latin);
    setText(q('[data-spread-guide]'), `${active.motto} —— ${active.guide}`);
    document.title = `${active.name} · 抽牌台 · Sortes Sacrae`;

    const question = q<HTMLInputElement>('[data-question]');
    const prefill = new URLSearchParams(window.location.search).get('q');
    if (question && prefill) question.value = prefill;

    renderSlots();
    renderPile();
    sync();

    /* ---------------------------------------------------------- Rendering -- */

    function renderSlots(): void {
      const root = q<HTMLElement>('[data-spread-root]');
      if (!root) return;
      root.className = `spread spread--${active.layout}`;
      root.innerHTML = active.positions
        .map((position, index) => slotMarkup(position, index))
        .join('\n');
    }

    function slotMarkup(position: SpreadPosition, index: number): string {
      return `<div class="slot slot--empty" data-slot="${index}">
      <p class="slot__label">${escapeHtml(position.label)}</p>
      <div class="slot__stage" data-ordinal="${index + 1}"></div>
      <p class="slot__hint">${escapeHtml(position.hint)}</p>
    </div>`;
    }

    function renderPile(): void {
      const pile = q<HTMLElement>('[data-deck-pile]');
      if (!pile) return;
      let markup = '';
      for (let i = 0; i < PILE_SIZE; i++) {
        markup += `<button class="pile-btn" type="button" style="--i:${i}" aria-label="抽出一张牌"></button>`;
      }
      pile.innerHTML = markup;
    }

    /** The drawn card, revealed as a calm fade (no float, no 3-D flourish). */
    function faceMarkup(cardIndex: number, reversed: boolean): string {
      const card = DECK[cardIndex];
      if (!card) return '';
      return `<div class="card-reveal">${renderCard(card, reversed)}</div>`;
    }

    function revealSlot(slotIndex: number, cardIndex: number, reversed: boolean, delay: number): void {
      const slot = q<HTMLElement>(`[data-slot="${slotIndex}"]`);
      const stage = slot?.querySelector<HTMLElement>('.slot__stage');
      if (!slot || !stage) return;

      stage.innerHTML = faceMarkup(cardIndex, reversed);
      slot.classList.remove('slot--empty', 'slot--pickable', 'is-next');
      slot.classList.add('slot--drawn');
      window.setTimeout(
        () => slot.classList.add('is-revealed'),
        delay + (prefersReducedMotion() ? 0 : 60)
      );
    }

    /* ------------------------------------------------------------- State -- */

    function sync(): void {
      const total = active.positions.length;
      const done = state.picks.length;

      setText(
        q('[data-progress]'),
        !state.shuffled
          ? '请先按「洗牌」，再按「切牌」，然后逐张翻开。'
          : done === 0
            ? `牌已备好。点击牌堆，抽出第 1 / ${total} 张。`
            : done < total
              ? `已翻 ${done} / ${total} 张，请继续。`
              : `已翻满 ${total} / ${total} 张，可以查看解读了。`
      );

      qa<HTMLElement>('[data-slot]').forEach((slot, index) => {
        const isNext = index === done && done < total && state.shuffled;
        slot.classList.toggle('is-next', isNext);
        slot.classList.toggle('slot--pickable', isNext);
      });

      const link = q<HTMLAnchorElement>('[data-goto-reading]');
      if (link) {
        if (done >= total && total > 0) {
          link.href = readingHref();
          link.removeAttribute('aria-disabled');
        } else {
          link.removeAttribute('href');
          link.setAttribute('aria-disabled', 'true');
        }
      }

      qa<HTMLButtonElement>('[data-deck-pile] .pile-btn').forEach(button => {
        button.disabled = done >= total;
      });
    }

    function readingHref(): string {
      const params = new URLSearchParams();
      params.set('spread', active.id);
      params.set('c', encodePicks(state.picks));
      const question = q<HTMLInputElement>('[data-question]')?.value.trim();
      if (question) params.set('q', question);
      return `/tarot/reading/?${params.toString()}`;
    }

    /* ----------------------------------------------------------- Actions -- */

    function reshuffle(): void {
      state.deck = shuffle(DECK.map(card => card.index));
      state.flips = state.deck.map(() => state.allowReversed && randomInt(2) === 1);
      state.cursor = 0;
      state.picks = [];
      state.shuffled = true;

      renderSlots();

      const pile = q<HTMLElement>('[data-deck-pile]');
      if (pile) {
        pile.classList.remove('is-shuffling');
        void pile.offsetWidth; // let the keyframes restart
        pile.classList.add('is-shuffling');
        window.setTimeout(() => pile.classList.remove('is-shuffling'), 1000);
      }

      sync();
      toast('已洗牌。可以切牌，或直接点牌堆抽牌');
    }

    function cut(): void {
      if (!state.shuffled) {
        toast('请先洗牌');
        return;
      }
      if (state.picks.length > 0) {
        toast('已经抽过牌了，要切牌请先按「重新开始」');
        return;
      }
      const at = randomInt(state.deck.length);
      state.deck = state.deck.slice(at).concat(state.deck.slice(0, at));
      state.flips = state.flips.slice(at).concat(state.flips.slice(0, at));

      const pile = q<HTMLElement>('[data-deck-pile]');
      if (pile) {
        pile.classList.remove('is-shuffling');
        void pile.offsetWidth;
        pile.classList.add('is-shuffling');
        window.setTimeout(() => pile.classList.remove('is-shuffling'), 700);
      }
      toast('已切牌');
    }

    function drawNext(delay = 0): void {
      const total = active.positions.length;
      if (!state.shuffled) {
        toast('请先洗牌');
        return;
      }
      if (state.picks.length >= total) return;

      const cardIndex = state.deck[state.cursor];
      const reversed = state.flips[state.cursor];
      if (cardIndex === undefined || reversed === undefined) return;

      state.cursor += 1;
      const slotIndex = state.picks.length;
      state.picks.push({ index: cardIndex, reversed });

      revealSlot(slotIndex, cardIndex, reversed, delay);
      sync();
    }

    function revealAll(): void {
      if (!state.shuffled) {
        toast('请先洗牌');
        return;
      }
      const step = prefersReducedMotion() ? 0 : 150;
      const total = active.positions.length;
      const pump = (): void => {
        if (state.picks.length >= total) return;
        drawNext(step / 2);
        window.setTimeout(pump, step);
      };
      pump();
    }

    function reset(): void {
      state.deck = DECK.map(card => card.index);
      state.flips = DECK.map(() => false);
      state.cursor = 0;
      state.picks = [];
      state.shuffled = false;
      const question = q<HTMLInputElement>('[data-question]');
      if (question) question.value = '';
      renderSlots();
      sync();
      toast('已重置');
    }

    /* ------------------------------------------------------------- Wiring -- */

    q<HTMLButtonElement>('[data-action="shuffle"]')?.addEventListener('click', reshuffle);
    q<HTMLButtonElement>('[data-action="cut"]')?.addEventListener('click', cut);
    q<HTMLButtonElement>('[data-action="reveal-all"]')?.addEventListener('click', revealAll);
    qa<HTMLButtonElement>('[data-action="reset"]').forEach(button => {
      button.addEventListener('click', reset);
    });

    q<HTMLElement>('[data-deck-pile]')?.addEventListener('click', event => {
      const target = event.target instanceof Element ? event.target.closest('.pile-btn') : null;
      if (target) drawNext();
    });

    // Clicking the highlighted next slot draws the same card the pile would.
    q<HTMLElement>('[data-spread-root]')?.addEventListener('click', event => {
      const target = event.target instanceof Element ? event.target.closest('.slot--pickable') : null;
      if (target) drawNext();
    });

    q<HTMLInputElement>('[data-allow-reversed]')?.addEventListener('change', event => {
      const input = event.target as HTMLInputElement;
      state.allowReversed = input.checked;
      // Only undrawn cards are affected: already-drawn picks keep their own flag.
      state.flips = state.deck.map((_, i) =>
        i < state.cursor ? (state.flips[i] ?? false) : input.checked && randomInt(2) === 1
      );
      toast(input.checked ? '已启用逆位' : '已关闭逆位');
    });

    // Keep the reading link fresh if the question is edited after the last card.
    q<HTMLInputElement>('[data-question]')?.addEventListener('input', sync);
  }
}
