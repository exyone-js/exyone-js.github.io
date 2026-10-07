/*!
 * SiteEnhance · core
 *
 * Foundation shared by every enhancement module:
 *   - namespace + module registry
 *   - tiny event bus used for cross-module / third-party communication
 *   - DOM, storage, timing and clipboard helpers that never throw
 *   - CDN-aware asset loading and resilient JSON requests
 *
 * Configuration is read from the inline `window.SITE_ENHANCE` object emitted by
 * `_includes/metadata-hook.html`; missing entries fall back to DEFAULT_CONFIG.
 */
import type {
  BusApi,
  EnhanceApi,
  EnhanceModule,
  SiteEnhanceConfig,
  StorageApi,
  ToastApi
} from './types';

const SCRIPT_TIMEOUT = 12000;
const REQUEST_TIMEOUT = 10000;

/* ------------------------------------------------------- Configuration -- */

const DEFAULT_CONFIG: SiteEnhanceConfig = {
  /* Simplified <-> Traditional Chinese script conversion. */
  zhConvert: {
    enabled: true,
    autoDetect: true,
    cdn: [
      'https://cdn.jsdelivr.net/npm/opencc-js@1.4.2/dist/umd/full.js',
      'https://unpkg.com/opencc-js@1.4.2/dist/umd/full.js'
    ]
  },

  /* Background music card driven by Howler.js (headless audio engine). */
  player: {
    enabled: true,
    order: 'random',
    volume: 0.7,
    audius: { playlistId: '' },
    cdn: {
      js: ['https://cdn.jsdelivr.net/npm/howler@2.2.4/dist/howler.min.js']
    }
  },

  /* Floating quote card. */
  quotes: {
    enabled: true,
    timeout: REQUEST_TIMEOUT,
    endpoints: ['https://epigram.exyon.ee/api/quotes']
  },

  /* Reading progress bar. */
  reading: { enabled: true, ease: 0.13 },

  /* Custom context menu. Groups accept `true | false` or an object:
     link: { enabled: true, items: { 'copy-html-link': false } } */
  menu: {
    enabled: true,
    submenu: true,
    groups: { selection: true, link: true, image: true, code: true, page: true }
  },

  /* Click decorations. */
  clickEffect: { mode: 'word', throttle: 80, max: 6 }
};

/* Recursively overlay `custom` on top of `base` without mutating either. */
function mergeConfig<T>(base: T, custom: unknown): T {
  const out: Record<string, unknown> = {};
  const source = base as Record<string, unknown>;
  let key: string;

  for (key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) out[key] = source[key];
  }

  const overlay = (custom && typeof custom === 'object' ? custom : {}) as Record<string, unknown>;
  for (key in overlay) {
    if (!Object.prototype.hasOwnProperty.call(overlay, key)) continue;
    const value = overlay[key];
    const previous = out[key];
    const nested =
      previous && value &&
      Object.prototype.toString.call(previous) === '[object Object]' &&
      Object.prototype.toString.call(value) === '[object Object]' &&
      !Array.isArray(previous) && !Array.isArray(value);
    out[key] = nested ? mergeConfig(previous, value) : value;
  }

  return out as T;
}

/* ----------------------------------------------------------------- DOM -- */

function $<T extends Element = HTMLElement>(selector: string, root?: ParentNode): T | null {
  return (root || document).querySelector<T>(selector);
}

function $$<T extends Element = HTMLElement>(selector: string, root?: ParentNode): T[] {
  return Array.from((root || document).querySelectorAll<T>(selector));
}

/* Event targets are `EventTarget | null`; every handler in this codebase wants
   the element underneath, and non-element targets (text nodes, document) are
   simply ignored - exactly what the old `event.target.closest &&` guards did. */
export function asElement(target: EventTarget | null): Element | null {
  return target instanceof Element ? target : null;
}

/* ----------------------------------------------------------- Utilities -- */

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function escapeHtml(value: unknown): string {
  const map: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  };
  return String(value === null || value === undefined ? '' : value).replace(
    /[&<>"']/g,
    (char) => map[char]
  );
}

function debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number): (...args: A) => void {
  let timer: number | undefined;
  return function (this: unknown, ...args: A): void {
    const self = this;
    clearTimeout(timer);
    timer = window.setTimeout(function () { fn.apply(self, args); }, wait);
  };
}

/* Wraps a function so a failure never breaks the rest of the page. */
function guard<A extends unknown[], R>(
  scope: string,
  fn: (...args: A) => R
): (...args: A) => R | undefined {
  return function (this: unknown, ...args: A): R | undefined {
    try {
      return fn.apply(this, args);
    } catch (error) {
      console.warn('[site-enhance] ' + scope + ':', error);
      return undefined;
    }
  };
}

const motionQuery = window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : null;

function prefersReducedMotion(): boolean {
  return !!(motionQuery && motionQuery.matches);
}

/* ------------------------------------------------------------- Storage -- */

/* localStorage throws when disabled or over quota, so every access goes
   through this wrapper and degrades to an in-memory store. */
const storage: StorageApi = (function (): StorageApi {
  let backend: Storage | null = null;
  try {
    backend = window.localStorage;
    if (backend) {
      backend.setItem('enhance:probe', '1');
      backend.removeItem('enhance:probe');
    }
  } catch (error) {
    backend = null;
  }
  const memory: Record<string, string> = {};

  function read(key: string): string | null | undefined {
    try {
      return backend ? backend.getItem(key) : memory[key];
    } catch (error) {
      return null;
    }
  }

  function write(key: string, value: string): void {
    try {
      if (backend) backend.setItem(key, value);
      else memory[key] = value;
    } catch (error) { /* storage unavailable - keep running */ }
  }

  return {
    get: function (key: string, fallback: string): string {
      const value = read(key);
      return value === null || value === undefined ? fallback : value;
    },
    set: write,
    remove: function (key: string): void {
      try {
        if (backend) backend.removeItem(key);
        else delete memory[key];
      } catch (error) { /* ignore */ }
    },
    getJSON: function <T>(key: string, fallback: T): T {
      try {
        return JSON.parse(String(read(key))) || fallback;
      } catch (error) {
        return fallback;
      }
    },
    setJSON: function (key: string, value: unknown): void {
      write(key, JSON.stringify(value));
    },
    /* 'on' / 'off' preference toggle with an enabled-by-default fallback. */
    isEnabled: function (key: string): boolean {
      return read(key) !== 'off';
    }
  };
})();

/* ---------------------------------------------------------------- Bus --- */

/* Namespaced event channel: modules publish state changes here so other
   scripts can react without reaching into module internals. */
const bus: BusApi = {
  emit: function (name: string, detail?: unknown): void {
    document.dispatchEvent(new CustomEvent('site-enhance:' + name, { detail: detail }));
  },
  on: function (name: string, handler: (event: CustomEvent<unknown>) => void): () => void {
    const event = 'site-enhance:' + name;
    const listener = function (raw: Event): void {
      handler(raw as CustomEvent<unknown>);
    };
    document.addEventListener(event, listener);
    return function (): void {
      document.removeEventListener(event, listener);
    };
  }
};

/* ----------------------------------------------------------- Requests --- */

/* Runs `task(item)` for every entry of `items` until one succeeds. */
function resolveFirst<T, R>(items: T[], task: (item: T) => Promise<R>): Promise<R> {
  let index = 0;
  function attempt(): Promise<R> {
    if (index >= items.length) return Promise.reject(new Error('all candidates failed'));
    const item = items[index++];
    return Promise.resolve()
      .then(function () { return task(item); })
      .catch(attempt);
  }
  return attempt();
}

/* Rejects with a timeout error instead of letting a request hang forever. */
function withTimeout<T>(
  promise: Promise<T>,
  timeout: number,
  onTimeout?: () => void
): Promise<T> {
  return new Promise<T>(function (resolve, reject) {
    let settled = false;
    const timer = window.setTimeout(function () {
      if (settled) return;
      settled = true;
      if (onTimeout) onTimeout();
      reject(new Error('request timed out'));
    }, timeout);

    function finish(error: unknown, value?: T): void {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(value as T);
    }

    promise.then(
      function (value) { finish(null, value); },
      function (error) { finish(error); }
    );
  });
}

/* JSON GET that always settles: network errors, HTTP errors and stalls are
   all reported as plain rejections. */
function requestJSON<T = unknown>(url: string, options?: { timeout?: number }): Promise<T> {
  const timeout = (options && options.timeout) || REQUEST_TIMEOUT;
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const init: RequestInit = { cache: 'no-store' };
  if (controller) init.signal = controller.signal;

  const request = fetch(url, init).then(function (response) {
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json() as Promise<T>;
  });

  return withTimeout(request, timeout, function () {
    if (controller) controller.abort();
  });
}

/* ------------------------------------------------------ Asset loading --- */

function hasStylesheet(url: string): boolean {
  return $$<HTMLLinkElement>('link[rel="stylesheet"]').some(function (link) {
    return link.href === url || link.getAttribute('href') === url;
  });
}

/* Loads the first stylesheet that resolves; silently ignores a miss since
   enhancements degrade gracefully without cosmetic CSS. */
function loadStylesheet(
  urls: string | string[] | null | undefined,
  options?: { timeout?: number }
): Promise<string> {
  const timeout = (options && options.timeout) || SCRIPT_TIMEOUT;
  return resolveFirst(toArray(urls), function (url) {
    if (hasStylesheet(url)) return Promise.resolve(url);
    return new Promise<string>(function (resolve, reject) {
      const link = document.createElement('link');
      const timer = window.setTimeout(function () {
        cleanup();
        reject(new Error('stylesheet timeout'));
      }, timeout);
      function cleanup(): void {
        clearTimeout(timer);
        link.onload = link.onerror = null;
      }
      link.rel = 'stylesheet';
      link.href = url;
      link.onload = function () { cleanup(); resolve(url); };
      link.onerror = function () {
        cleanup();
        link.remove();
        reject(new Error('stylesheet failed'));
      };
      document.head.appendChild(link);
    });
  });
}

/* Loads the first script that becomes available. Resolves once `isReady()`
   reports the global it provides is usable, which keeps CDN swaps behind
   this helper instead of leaking polling into every module. */
function loadScript(
  urls: string | string[] | null | undefined,
  options?: { timeout?: number; isReady?: () => boolean }
): Promise<string> {
  const settings = options || {};
  const timeout = settings.timeout || SCRIPT_TIMEOUT;
  const isReady = settings.isReady || function () { return true; };

  return resolveFirst(toArray(urls), function (url) {
    return new Promise<string>(function (resolve, reject) {
      const script = document.createElement('script');
      const timer = window.setTimeout(function () {
        finish(new Error('script timeout'));
      }, timeout);

      function finish(error?: Error): void {
        clearTimeout(timer);
        script.onload = script.onerror = null;
        if (error) {
          script.remove();
          reject(error);
          return;
        }
        resolve(url);
      }

      script.src = url;
      script.async = true;
      script.onload = function () {
        try {
          if (!isReady()) throw new Error('library did not initialise: ' + url);
          finish();
        } catch (error) {
          finish(error as Error);
        }
      };
      script.onerror = function () { finish(new Error('script failed: ' + url)); };
      document.head.appendChild(script);
    });
  });
}

/* ----------------------------------------------------------- Clipboard -- */

/* Kept as a fallback for the async clipboard API: it is missing on plain
   HTTP and rejects when the permission is denied. */
function legacyCopy(text: string): Promise<void> {
  return new Promise<void>(function (resolve, reject) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
    document.body.appendChild(area);
    area.select();
    try {
      const ok = document.execCommand('copy');
      area.remove();
      if (ok) resolve();
      else reject(new Error('clipboard command rejected'));
    } catch (error) {
      area.remove();
      reject(error);
    }
  });
}

function copyText(text: unknown): Promise<void> {
  const value = String(text);
  if (!(navigator.clipboard && window.isSecureContext)) return legacyCopy(value);
  return navigator.clipboard.writeText(value).catch(function () { return legacyCopy(value); });
}

/* --------------------------------------------------------------- Toast -- */

const Toast: ToastApi = (function (): ToastApi {
  const MAX_VISIBLE = 3;
  const LIFETIME = 2000;
  const EXIT_DURATION = 320;

  function host(): HTMLElement | null {
    return $('#toast-host');
  }

  function show(message: string, type?: string, duration?: number): void {
    const box = host();
    if (!box) return;

    /* Keep the stack short: drop the oldest entries first. */
    while (box.children.length >= MAX_VISIBLE) box.removeChild(box.firstChild as ChildNode);

    const item = document.createElement('div');
    item.className = 'toast-item toast-' + (type || 'info');
    item.setAttribute('role', 'status');
    item.textContent = message;
    box.appendChild(item);

    requestAnimationFrame(function () { item.classList.add('show'); });
    window.setTimeout(function () {
      item.classList.remove('show');
      window.setTimeout(function () { item.remove(); }, EXIT_DURATION);
    }, duration || LIFETIME);
  }

  return {
    show: show,
    success: function (message: string, duration?: number) { show(message, 'success', duration); },
    warn: function (message: string, duration?: number) { show(message, 'warn', duration); },
    error: function (message: string, duration?: number) { show(message, 'error', duration); }
  };
})();

/* ------------------------------------------------------------ Registry -- */

const modules: Record<string, EnhanceModule | null> = {};

/* Modules publish wildly different APIs; `init` is the only shared hook. */
function register<T extends object | null>(name: string, module: T): T {
  modules[name] = module as EnhanceModule | null;
  (Enhance as unknown as Record<string, unknown>)[name] = module;
  return module;
}

/* ------------------------------------------------------------ Namespace -- */

/* Also published on `window` so inline page code keeps working. */
const Enhance = (window.Enhance || {}) as EnhanceApi;
window.Enhance = Enhance;

Enhance.CONFIG = mergeConfig(DEFAULT_CONFIG, window.SITE_ENHANCE);

Enhance.modules = modules;
Enhance.$ = $;
Enhance.$$ = $$;
Enhance.storage = storage;
Enhance.clamp = clamp;
Enhance.toArray = toArray;
Enhance.escapeHtml = escapeHtml;
Enhance.debounce = debounce;
Enhance.guard = guard;
Enhance.prefersReducedMotion = prefersReducedMotion;
Enhance.resolveFirst = resolveFirst;
Enhance.requestJSON = requestJSON;
Enhance.loadScript = loadScript;
Enhance.loadStylesheet = loadStylesheet;
Enhance.copyText = copyText;
Enhance.bus = bus;
Enhance.Toast = Toast;
Enhance.register = register;

export { Enhance };
