/*!
 * Sortes Sacrae · card markup
 *
 * DOM-free string builders, deliberately so: the same functions render the
 * codex server-side (build time, Node) and paint a drawn card in the browser.
 * One definition of what a card looks like, no drift between the two.
 */
import { suitInfo } from './deck';
import type { TarotCard } from './deck';

/* -------------------------------------------------------------- Escaping -- */

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
};

export function escapeHtml(value: unknown): string {
  if (typeof value !== 'string' || value === '') return '';
  return value.replace(/[&<>"']/g, ch => HTML_ESCAPES[ch] as string);
}

/* --------------------------------------------------------------- Sigils -- */

/** Line-art sigils: one per suit, plus the rose for the majors. */
const SIGILS: Record<string, string> = {
  major:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round">' +
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.4"/>' +
    '<path d="M12 6.4v11.2M7.2 10.6h9.6"/></svg>',
  wands:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M12 3.2c1.7 2.1 2.7 3.6 2.7 5a2.7 2.7 0 1 1-5.4 0c0-1.4 1-2.9 2.7-5z"/>' +
    '<path d="M12 11.2V20.6M8.7 20.8h6.6"/></svg>',
  cups:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M6.4 4.4h11.2l-.9 4.5a4.9 4.9 0 0 1-9.4 0z"/>' +
    '<path d="M12 13.6v5.2M8.4 20.6h7.2"/></svg>',
  swords:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M12 2.8l1.7 3.6v8.2h-3.4V6.4z"/><path d="M8 14.6h8M12 14.6v5M9.6 20.8h4.8"/></svg>',
  pentacles:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round">' +
    '<circle cx="12" cy="12" r="8.8"/><path d="M12 6.6v10.8M8.2 10.8h7.6"/></svg>'
};

/* ---------------------------------------------------------------- Labels -- */

export function orientationLabel(reversed: boolean): string {
  return reversed ? '逆位' : '正位';
}

/** `权杖 · Virgae`, or `大阿卡纳 · Arcana Maiora`. */
export function suitLabel(card: TarotCard): string {
  if (card.arcana === 'major') return '大阿卡纳 · Arcana Maiora';
  const info = card.suit ? suitInfo(card.suit) : undefined;
  return info ? `${info.name} · ${info.latin}` : '';
}

/* ----------------------------------------------------------------- Cards -- */

function cardClass(card: TarotCard, reversed: boolean, extraClass: string): string {
  const kind = card.arcana === 'major' ? 'major' : (card.suit ?? 'major');
  return `card card--${kind}${reversed ? ' is-reversed' : ''}${extraClass ? ` ${extraClass}` : ''}`;
}

/**
 * A face-up card. Purely decorative: the accessible name belongs to the
 * surrounding element, so the card itself is hidden from the a11y tree.
 *
 * `extraClass` is kept for callers that need an extra hook, though the draw
 * table now reveals cards with a plain fade rather than a 3-D flip.
 */
export function renderCard(card: TarotCard, reversed = false, extraClass = ''): string {
  const sigil = SIGILS[card.arcana === 'major' ? 'major' : (card.suit ?? 'major')] ?? SIGILS.major;

  return `<div class="${cardClass(card, reversed, extraClass)}" aria-hidden="true">
  <div class="card__numeral">${escapeHtml(card.number)}</div>
  <div class="card__art">
    <div class="card__sigil">${sigil}</div>
    <div class="card__name">${escapeHtml(card.name)}</div>
    <div class="card__suit">${escapeHtml(suitLabel(card))}</div>
  </div>
</div>`;
}

/** Face-down card: a parchment medallion with a cross, used for the deck pile. */
export function renderCardBack(): string {
  return `<div class="card card--back" aria-hidden="true">
  <div class="card__back"><span class="card__back-mark">✠</span></div>
</div>`;
}

/** The cross-medallion favicon, shared by every generated page. */
export const FAVICON_HREF = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#c9a74e" stroke-width="2">' +
    '<circle cx="16" cy="16" r="13"/>' +
    '<path d="M16 6v20M6 16h20"/></svg>'
)}`;
