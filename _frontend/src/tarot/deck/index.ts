/*!
 * Sortes Sacrae · deck assembly
 *
 * Concatenates the four suits after the majors and stamps every card with its
 * stable `id`, its `index` inside `DECK` and its derived suit/rank/element.
 * `DECK[index]` is the wire format used by share URLs, so the order of this
 * array is part of the public contract: append-only, never reorder.
 */
import { CUPS } from './cups';
import { MAJORS, MAJOR_ELEMENT } from './major';
import { PENTACLES } from './pentacles';
import { SWORDS } from './swords';
import { WANDS } from './wands';
import type { CardSeed, SuitId, SuitInfo, TarotCard } from './types';

export type { ArcanaId, CardSeed, SuitId, SuitInfo, TarotCard } from './types';

/** English rank names, positionally aligned with each suit array below. */
const MINOR_RANKS = [
  'Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
  'Eight', 'Nine', 'Ten', 'Page', 'Knight', 'Queen', 'King'
];

export const SUITS: readonly SuitInfo[] = [
  {
    id: 'wands',
    name: '权杖',
    latin: 'Virgae',
    element: '火',
    virtue: '热忱与勇毅',
    domain: '行动 · 志业 · 创造'
  },
  {
    id: 'cups',
    name: '圣杯',
    latin: 'Calices',
    element: '水',
    virtue: '慈悲与爱德',
    domain: '情感 · 关系 · 灵修'
  },
  {
    id: 'swords',
    name: '宝剑',
    latin: 'Gladii',
    element: '风',
    virtue: '真理与明辨',
    domain: '思辨 · 言语 · 试炼'
  },
  {
    id: 'pentacles',
    name: '星币',
    latin: 'Nummi',
    element: '土',
    virtue: '忠信与勤勉',
    domain: '劳作 · 身体 · 受造界'
  }
];

const SUIT_BY_ID: ReadonlyMap<SuitId, SuitInfo> = new Map(SUITS.map(s => [s.id, s]));

/** Suit arrays, in the order they are appended to `DECK`. */
const SUIT_SEEDS: readonly (readonly [SuitId, readonly CardSeed[]])[] = [
  ['wands', WANDS],
  ['cups', CUPS],
  ['swords', SWORDS],
  ['pentacles', PENTACLES]
];

const pad2 = (n: number): string => String(n).padStart(2, '0');

function buildMajors(): Omit<TarotCard, 'index'>[] {
  return MAJORS.map((seed, i) => ({
    ...seed,
    id: `major-${pad2(i)}`,
    arcana: 'major' as const,
    element: seed.element ?? MAJOR_ELEMENT
  }));
}

function buildMinors(): Omit<TarotCard, 'index'>[] {
  const cards: Omit<TarotCard, 'index'>[] = [];
  for (const [suit, seeds] of SUIT_SEEDS) {
    const info = SUIT_BY_ID.get(suit);
    seeds.forEach((seed, i) => {
      cards.push({
        ...seed,
        id: `${suit}-${pad2(i)}`,
        arcana: 'minor' as const,
        suit,
        rank: MINOR_RANKS[i],
        element: seed.element ?? info?.element ?? ''
      });
    });
  }
  return cards;
}

/** All 78 cards, majors first. `index` is the card's position in this array. */
export const DECK: readonly TarotCard[] = [...buildMajors(), ...buildMinors()].map(
  (card, index) => ({ ...card, index })
);

export const MAJOR_COUNT = MAJORS.length;
export const MINOR_COUNT = DECK.length - MAJOR_COUNT;

const BY_ID: ReadonlyMap<string, TarotCard> = new Map(DECK.map(card => [card.id, card]));

export function cardById(id: string): TarotCard | undefined {
  return BY_ID.get(id);
}

/** Tolerates anything a hand-edited URL can throw at it. */
export function cardByIndex(index: number): TarotCard | undefined {
  if (!Number.isInteger(index) || index < 0 || index >= DECK.length) return undefined;
  return DECK[index];
}

export function suitInfo(id: SuitId): SuitInfo | undefined {
  return SUIT_BY_ID.get(id);
}

export function isSuitId(value: unknown): value is SuitId {
  return typeof value === 'string' && SUIT_BY_ID.has(value as SuitId);
}
