/*!
 * Sortes Sacrae · browser runtime
 *
 * The pieces every page needs and nothing page-specific: theme persistence,
 * a toast, localStorage-backed reading history, unbiased shuffling, the URL
 * codec that carries a drawing between documents, and small DOM helpers.
 *
 * Deck data is deliberately *not* imported here — pages that need the cards
 * import them directly, which lets esbuild keep the card text out of the
 * bundle for the pages that never show one.
 */

/* ------------------------------------------------------------------ Keys -- */

export const THEME_KEY = 'tarot:theme';
export const HISTORY_KEY = 'tarot:history';
export const DAILY_KEY_PREFIX = 'tarot:daily:';

/** Newest-first cap; older readings fall off the end. */
const HISTORY_LIMIT = 80;

export type ThemeName = 'dark' | 'light';

/* ----------------------------------------------------------------- Theme -- */

function readStoredTheme(): ThemeName | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

/**
 * Wires the header toggle. The *initial* attribute is applied by an inline
 * script in `<head>` (see `pages/tarot/layout.ts`) so the first paint is never
 * the wrong palette; this only handles subsequent switches.
 */
export function initTheme(): void {
  const root = document.documentElement;
  const button = document.querySelector<HTMLElement>('[data-theme-toggle]');

  const current = (): ThemeName =>
    root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';

  const paint = (theme: ThemeName): void => {
    root.setAttribute('data-theme', theme);
    if (button) {
      button.textContent = theme === 'light' ? '☀' : '☾';
      button.setAttribute('aria-label', theme === 'light' ? '切换到夜间主题' : '切换到昼间主题');
    }
  };

  paint(readStoredTheme() ?? current());

  button?.addEventListener('click', () => {
    const next: ThemeName = current() === 'light' ? 'dark' : 'light';
    paint(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* private mode / quota — the switch still works for this page view */
    }
  });
}

/* ----------------------------------------------------------------- Misc -- */

let toastTimer: number | undefined;

/** Ephemeral status line pinned to the bottom of the viewport. */
export function toast(message: string, ms = 2400): void {
  let node = document.querySelector<HTMLElement>('.toast');
  if (!node) {
    node = document.createElement('div');
    node.className = 'toast';
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    document.body.appendChild(node);
  }
  node.textContent = message;
  node.hidden = false;
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    if (node) node.hidden = true;
  }, ms);
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ------------------------------------------------------- DOM shortcuts -- */

export function q<T extends Element>(selector: string, root: ParentNode = document): T | null {
  return root.querySelector<T>(selector);
}

export function qa<T extends Element>(selector: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

export function show(node: HTMLElement | null, visible: boolean): void {
  if (node) node.hidden = !visible;
}

export function setText(node: Element | null, text: string): void {
  if (node) node.textContent = text;
}

/** Debounce for the codex search box. */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number
): (...args: A) => void {
  let timer: number | undefined;
  return (...args: A) => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  };
}

/* ------------------------------------------------------------- Randomness -- */

/**
 * Uniform integer in `[0, max)`, using the platform CSPRNG when available.
 *
 * Rejection sampling, not `%`: a bare modulo would bias the first
 * `2^32 % max` outcomes, which for a 78-card deck is small but free to avoid.
 */
export function randomInt(max: number): number {
  if (max <= 1) return 0;
  const csp = globalThis.crypto;
  if (csp && typeof csp.getRandomValues === 'function') {
    const limit = Math.floor(0x1_0000_0000 / max) * max;
    const buffer = new Uint32Array(1);
    let value = 0;
    do {
      csp.getRandomValues(buffer);
      value = buffer[0];
    } while (value >= limit);
    return value % max;
  }
  return Math.floor(Math.random() * max);
}

/** Fisher–Yates; returns a new array and leaves the input untouched. */
export function shuffle<T>(items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return out;
}

/** FNV-1a — a tiny deterministic hash for the daily draw's date seed. */
export function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/* -------------------------------------------------------------- URL codec -- */

export interface Pick {
  /** Index into `DECK`. */
  index: number;
  reversed: boolean;
}

/**
 * `[{index:12,reversed:true},…]` → `"12.1,45.0"`.
 *
 * This is the only channel between the draw page and the reading page: the URL
 * *is* the state, which keeps every reading linkable, shareable and printable.
 */
export function encodePicks(picks: readonly Pick[]): string {
  return picks.map(pick => `${pick.index}.${pick.reversed ? 1 : 0}`).join(',');
}

/**
 * Returns `null` for anything that is not a well-formed pick list.
 *
 * Strict on purpose: a hand-edited URL may say anything, and silently
 * accepting `1.5.0` as "card 1, not reversed" would produce a reading that no
 * longer matches the link the visitor is looking at.
 */
export function decodePicks(raw: string | null | undefined): Pick[] | null {
  if (typeof raw !== 'string' || raw === '') return null;
  const picks: Pick[] = [];

  for (const part of raw.split(',')) {
    const segments = part.split('.');
    if (segments.length > 2) return null;

    const index = Number(segments[0]);
    if (!Number.isInteger(index) || index < 0) return null;

    const flip = segments[1];
    if (flip !== undefined && flip !== '0' && flip !== '1') return null;

    picks.push({ index, reversed: flip === '1' });
  }

  return picks.length > 0 ? picks : null;
}

/* --------------------------------------------------------------- History -- */

export interface ReadingRecord {
  /** `spread|cards` — stable, so re-opening the same URL never duplicates. */
  id: string;
  ts: number;
  spread: string;
  question: string;
  /** Encoded picks, byte-identical to the `c` search parameter. */
  cards: string;
}

export function readingId(spread: string, cards: string): string {
  return `${spread}|${cards}`;
}

function isRecord(value: unknown): value is ReadingRecord {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.ts === 'number' &&
    typeof candidate.spread === 'string' &&
    typeof candidate.question === 'string' &&
    typeof candidate.cards === 'string'
  );
}

export function loadHistory(): ReadingRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecord).sort((a, b) => b.ts - a.ts);
  } catch {
    return [];
  }
}

function persist(records: readonly ReadingRecord[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, HISTORY_LIMIT)));
  } catch {
    /* quota exceeded or storage disabled — the app keeps working without it */
  }
}

/** Upserts: an existing record with the same id is replaced and moved on top. */
export function saveReading(record: ReadingRecord): void {
  const rest = loadHistory().filter(item => item.id !== record.id);
  persist([record, ...rest]);
}

export function removeReading(id: string): void {
  persist(loadHistory().filter(item => item.id !== id));
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    /* nothing to do */
  }
}

/* ------------------------------------------------------------ Clipboard -- */

/**
 * Copies text, degrading through `document.execCommand` for browsers or
 * contexts (non-secure origin) where the async clipboard API is unavailable.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext !== false) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }

  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

/* ----------------------------------------------------------------- Dates -- */

const pad2 = (value: number): string => String(value).padStart(2, '0');

export function todayKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

export function formatDateTime(ts: number): string {
  const date = new Date(ts);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ` +
    `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function formatDateTimeLong(date: Date): string {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日（周${weekdays[date.getDay()]}）`;
}

/* ----------------------------------------------------------------- Shell -- */

/**
 * Runs on every page. The tarot app is a single parchment theme, so the only
 * global side-effect is flagging that scripts are live (used by `prefers
 * reduced-motion` and progressive-enhancement CSS). Theme toggling was removed
 * in favour of one consistent illuminated-manuscript palette.
 */
export function initShell(): void {
  document.documentElement.classList.add('js');
}
