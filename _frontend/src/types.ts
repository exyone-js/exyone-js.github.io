/*!
 * SiteEnhance · shared types
 *
 * One place for the shapes that cross module boundaries: the merged config,
 * the module registry contract and the public API of every registered module.
 */

/* ------------------------------------------------------------ Configuration -- */

/* `groups` entries accept the legacy boolean form or an object:
   link: { enabled: true, items: { 'copy-html-link': false } } */
export type MenuGroupSetting =
  | boolean
  | { enabled?: boolean; items?: Record<string, boolean> }
  | undefined;

export interface SiteEnhanceConfig {
  zhConvert: {
    enabled: boolean;
    autoDetect: boolean;
    cdn: string[];
  };
  player: {
    enabled: boolean;
    order: string;
    volume: number;
    audius: { playlistId: string };
    cdn: { js: string[] };
  };
  quotes: {
    enabled: boolean;
    timeout: number;
    endpoints: string[];
  };
  reading: {
    enabled: boolean;
    ease: number;
  };
  menu: {
    enabled: boolean;
    submenu: boolean;
    groups?: Record<string, MenuGroupSetting>;
  };
  clickEffect: {
    mode: string;
    throttle: number;
    max: number;
    words?: string[];
  };
}

/* ------------------------------------------------------------------ Common -- */

export interface EnhanceModule {
  init?: () => void | Promise<unknown>;
}

export interface ToastApi {
  show(message: string, type?: string, duration?: number): void;
  success(message: string, duration?: number): void;
  warn(message: string, duration?: number): void;
  error(message: string, duration?: number): void;
}

export interface StorageApi {
  get(key: string, fallback: string): string;
  set(key: string, value: string): void;
  remove(key: string): void;
  getJSON<T>(key: string, fallback: T): T;
  setJSON(key: string, value: unknown): void;
  /* 'on' / 'off' preference toggle with an enabled-by-default fallback. */
  isEnabled(key: string): boolean;
}

export interface BusApi {
  emit(name: string, detail?: unknown): void;
  on(name: string, handler: (event: CustomEvent<unknown>) => void): () => void;
}

/* -------------------------------------------------------------------- Card -- */

export interface CardOptions {
  el: HTMLElement;
  key?: string;
  visibilityKey?: string;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface CardApi {
  el: HTMLElement;
  restore(): void;
  open(): void;
  close(): void;
  toggle(): void;
  isOpen(): boolean;
  resetPosition(): void;
}

/* ------------------------------------------------------------------ Modules -- */

export interface ZhConvertModule {
  init(): Promise<unknown>;
  toggle(): Promise<unknown>;
  isTraditional(): boolean;
  isReady(): boolean;
}

export type PlayerOrder = 'list' | 'random' | 'single' | 'circulation';

export interface Track {
  name: string;
  artist: string;
  url: string;
  cover: string;
  album: string;
}

export interface MusicModule {
  init(): void;
  ensure(): Promise<boolean | null>;
  reload(): Promise<boolean | null>;
  show(): void;
  hide(): void;
  toggle(): void;
  isVisible(): boolean;
  isReady(): boolean;
  isPlaying(): boolean;
  play(): void;
  pause(): void;
  playpause(): void;
  next(): void;
  prev(): void;
  setVolume(value: number, options?: { silent?: boolean }): void;
  getVolume(): number;
  toggleMute(): void;
  setOrder(order: PlayerOrder): void;
  cycleOrder(): void;
  getOrder(): PlayerOrder;
  seek(time: number): void;
  tracks(): Track[];
  currentTrack(): Track | null;
}

export interface QuotesModule {
  init(): void;
  load(): Promise<void>;
  open(): void;
  close(): void;
  toggle(): void;
  isVisible(): boolean;
}

export interface ReadingModule {
  init(): void;
  toggle(): boolean;
  isEnabled(): boolean;
}

export type ClickMode = 'word' | 'ripple' | 'confetti' | 'none';

export interface ClickEffectModule {
  init(): void;
  cycle(): ClickMode;
  set(mode: ClickMode): ClickMode;
  label(): string;
  mode(): ClickMode;
}

export interface MenuContext {
  link: { href: string; text: string } | null;
  image: { src: string; alt: string; type: string } | null;
  selection: string;
  code: string;
  codeLang: string;
}

export interface ContextMenuModule {
  open(x: number, y: number, ctx: MenuContext): void;
  close(): void;
  isOpen(): boolean;
  run(action: string | undefined, ctx: MenuContext): void;
}

export interface ShortcutsModule {
  open(): void;
  close(): void;
  toggle(): void;
  isOpen(): boolean;
}

/* ---------------------------------------------------------------- Namespace -- */

export interface EnhanceApi {
  CONFIG: SiteEnhanceConfig;

  /* Registry: every module lands here (and under its own name on `Enhance`).
     Deliberately unconstrained: a module exposes its own API, `init` is the
     only optional hook the bootstrap looks for. */
  modules: Record<string, EnhanceModule | null>;
  register<T extends object | null>(name: string, module: T): T;

  /* DOM & utility helpers. */
  $<T extends Element = HTMLElement>(selector: string, root?: ParentNode): T | null;
  $$<T extends Element = HTMLElement>(selector: string, root?: ParentNode): T[];
  clamp(value: number, min: number, max: number): number;
  toArray<T>(value: T | T[] | null | undefined): T[];
  escapeHtml(value: unknown): string;
  debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number): (...args: A) => void;
  guard<A extends unknown[], R>(scope: string, fn: (...args: A) => R): (...args: A) => R | undefined;
  prefersReducedMotion(): boolean;

  /* Networking. */
  resolveFirst<T, R>(items: T[], task: (item: T) => Promise<R>): Promise<R>;
  requestJSON<T = unknown>(url: string, options?: { timeout?: number }): Promise<T>;
  loadScript(
    urls: string | string[] | null | undefined,
    options?: { timeout?: number; isReady?: () => boolean }
  ): Promise<string>;
  loadStylesheet(
    urls: string | string[] | null | undefined,
    options?: { timeout?: number }
  ): Promise<string>;
  copyText(text: unknown): Promise<void>;

  /* Services. */
  storage: StorageApi;
  bus: BusApi;
  Toast: ToastApi;
  createCard(options: CardOptions): CardApi | null;

  /* Registered modules. Absent until `register()` runs, or when the module was
     switched off / its markup is missing. */
  ZhConvert?: ZhConvertModule | null;
  Music?: MusicModule | null;
  Quotes?: QuotesModule | null;
  Reading?: ReadingModule | null;
  ClickEffect?: ClickEffectModule | null;
  ContextMenu?: ContextMenuModule | null;
  Shortcuts?: ShortcutsModule | null;
}

export interface SiteEnhanceApi {
  version: string;
  Toast: ToastApi;
  bus: BusApi;
  ZhConvert?: ZhConvertModule | null;
  Music?: MusicModule | null;
  Quotes?: QuotesModule | null;
  Reading?: ReadingModule | null;
  ClickEffect?: ClickEffectModule | null;
  ContextMenu?: ContextMenuModule | null;
  Shortcuts?: ShortcutsModule | null;
}

declare global {
  interface Window {
    /* Inline configuration emitted by `_includes/metadata-hook.html`. */
    SITE_ENHANCE?: unknown;
    Enhance?: EnhanceApi;
    SiteEnhance?: SiteEnhanceApi;
  }
}
