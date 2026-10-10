/*!
 * Sortes Sacrae · deck shapes
 *
 * Pure data: this module is imported by the browser bundle (draw / reading /
 * codex pages) *and* by the build-time page generator, so it must never touch
 * `document`, `window` or `node:*`.
 */

export type SuitId = 'wands' | 'cups' | 'swords' | 'pentacles';
export type ArcanaId = 'major' | 'minor';

export interface TarotCard {
  /** `major-13`, `wands-07` — stable across builds; used as a DOM key. */
  id: string;
  /** Position inside `DECK`; the share URL stores this, not the id. */
  index: number;
  number: string;
  name: string;
  latin: string;
  arcana: ArcanaId;
  suit?: SuitId;
  rank?: string;
  element: string;
  keywords: readonly string[];
  reversedKeywords: readonly string[];
  upright: string;
  reversed: string;
  symbolism: string;
  virtue: string;
}

/**
 * Authoring shape.
 *
 * `id` / `index` / `arcana` / `suit` / `rank` are derived by the assembly in
 * `deck/index.ts` from the position in each array, so a card is written once
 * and can never drift out of sync with its own id.
 */
export type CardSeed = Omit<
  TarotCard,
  'id' | 'index' | 'arcana' | 'suit' | 'rank' | 'element'
> & {
  /** Defaults to 灵 (the majors); the minor suits set 火 / 水 / 风 / 土. */
  element?: string;
};

export interface SuitInfo {
  id: SuitId;
  name: string;
  latin: string;
  element: string;
  virtue: string;
  /** What this suit's questions are about, shown in the codex filter row. */
  domain: string;
}
