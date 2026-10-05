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
(function (window, document) {
  'use strict';

  var Enhance = (window.Enhance = window.Enhance || {});

  var SCRIPT_TIMEOUT = 12000;
  var REQUEST_TIMEOUT = 10000;

  /* ------------------------------------------------------- Configuration -- */

  var DEFAULT_CONFIG = {
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
  function mergeConfig(base, custom) {
    var out = {};
    var key;
    for (key in base) { if (Object.prototype.hasOwnProperty.call(base, key)) out[key] = base[key]; }
    for (key in custom) {
      if (!Object.prototype.hasOwnProperty.call(custom, key)) continue;
      var value = custom[key];
      var previous = out[key];
      var nested = previous && value &&
        Object.prototype.toString.call(previous) === '[object Object]' &&
        Object.prototype.toString.call(value) === '[object Object]' &&
        !Array.isArray(previous) && !Array.isArray(value);
      out[key] = nested ? mergeConfig(previous, value) : value;
    }
    return out;
  }

  Enhance.CONFIG = mergeConfig(DEFAULT_CONFIG, window.SITE_ENHANCE || {});

  /* ----------------------------------------------------------------- DOM -- */

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  /* ----------------------------------------------------------- Utilities -- */

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function toArray(value) {
    if (value === undefined || value === null) return [];
    return Array.isArray(value) ? value : [value];
  }

  function escapeHtml(value) {
    var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(value === null || value === undefined ? '' : value)
      .replace(/[&<>"']/g, function (char) { return map[char]; });
  }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var self = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }

  /* Wraps a function so a failure never breaks the rest of the page. */
  function guard(scope, fn) {
    return function () {
      try { return fn.apply(this, arguments); }
      catch (error) { console.warn('[site-enhance] ' + scope + ':', error); }
    };
  }

  var motionQuery = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  function prefersReducedMotion() {
    return !!(motionQuery && motionQuery.matches);
  }

  /* ------------------------------------------------------------- Storage -- */

  /* localStorage throws when disabled or over quota, so every access goes
     through this wrapper and degrades to an in-memory store. */
  var storage = (function () {
    var backend;
    try {
      backend = window.localStorage;
      backend.setItem('enhance:probe', '1');
      backend.removeItem('enhance:probe');
    } catch (error) {
      backend = null;
    }
    var memory = {};

    function read(key) {
      try { return backend ? backend.getItem(key) : memory[key]; }
      catch (error) { return null; }
    }

    function write(key, value) {
      try { backend ? backend.setItem(key, value) : (memory[key] = value); }
      catch (error) { /* storage unavailable - keep running */ }
    }

    return {
      get: function (key, fallback) {
        var value = read(key);
        return value === null || value === undefined ? fallback : value;
      },
      set: write,
      remove: function (key) {
        try { backend ? backend.removeItem(key) : delete memory[key]; }
        catch (error) { /* ignore */ }
      },
      getJSON: function (key, fallback) {
        try { return JSON.parse(read(key)) || fallback; }
        catch (error) { return fallback; }
      },
      setJSON: function (key, value) { write(key, JSON.stringify(value)); },
      /* 'on' / 'off' preference toggle with an enabled-by-default fallback. */
      isEnabled: function (key) { return read(key) !== 'off'; }
    };
  })();

  /* ---------------------------------------------------------------- Bus --- */

  /* Namespaced event channel: modules publish state changes here so other
     scripts can react without reaching into module internals. */
  var bus = {
    emit: function (name, detail) {
      document.dispatchEvent(new CustomEvent('site-enhance:' + name, { detail: detail }));
    },
    on: function (name, handler) {
      var event = 'site-enhance:' + name;
      document.addEventListener(event, handler);
      return function () { document.removeEventListener(event, handler); };
    }
  };

  /* ----------------------------------------------------------- Requests --- */

  /* Runs `task(item)` for every entry of `items` until one succeeds. */
  function resolveFirst(items, task) {
    var index = 0;
    function attempt() {
      if (index >= items.length) return Promise.reject(new Error('all candidates failed'));
      var item = items[index++];
      return Promise.resolve()
        .then(function () { return task(item); })
        .catch(attempt);
    }
    return attempt();
  }

  /* Rejects with a timeout error instead of letting a request hang forever. */
  function withTimeout(promise, timeout, onTimeout) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        if (onTimeout) onTimeout();
        reject(new Error('request timed out'));
      }, timeout);

      function finish(error, value) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) reject(error);
        else resolve(value);
      }

      promise.then(function (value) { finish(null, value); }, function (error) { finish(error); });
    });
  }

  /* JSON GET that always settles: network errors, HTTP errors and stalls are
     all reported as plain rejections. */
  function requestJSON(url, options) {
    var timeout = (options && options.timeout) || REQUEST_TIMEOUT;
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var init = { cache: 'no-store' };
    if (controller) init.signal = controller.signal;

    var request = fetch(url, init).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    });

    return withTimeout(request, timeout, function () {
      if (controller) controller.abort();
    });
  }

  /* ------------------------------------------------------ Asset loading --- */

  function hasStylesheet(url) {
    return $$('link[rel="stylesheet"]').some(function (link) {
      return link.href === url || link.getAttribute('href') === url;
    });
  }

  /* Loads the first stylesheet that resolves; silently ignores a miss since
     enhancements degrade gracefully without cosmetic CSS. */
  function loadStylesheet(urls, options) {
    var timeout = (options && options.timeout) || SCRIPT_TIMEOUT;
    return resolveFirst(toArray(urls), function (url) {
      if (hasStylesheet(url)) return Promise.resolve(url);
      return new Promise(function (resolve, reject) {
        var link = document.createElement('link');
        var timer = setTimeout(function () { cleanup(); reject(new Error('stylesheet timeout')); }, timeout);
        function cleanup() { clearTimeout(timer); link.onload = link.onerror = null; }
        link.rel = 'stylesheet';
        link.href = url;
        link.onload = function () { cleanup(); resolve(url); };
        link.onerror = function () { cleanup(); link.remove(); reject(new Error('stylesheet failed')); };
        document.head.appendChild(link);
      });
    });
  }

  /* Loads the first script that becomes available. Resolves once `isReady()`
     reports the global it provides is usable, which keeps CDN swaps behind
     this helper instead of leaking polling into every module. */
  function loadScript(urls, options) {
    var settings = options || {};
    var timeout = settings.timeout || SCRIPT_TIMEOUT;
    var isReady = settings.isReady || function () { return true; };

    return resolveFirst(toArray(urls), function (url) {
      return new Promise(function (resolve, reject) {
        var script = document.createElement('script');
        var timer = setTimeout(function () { finish(new Error('script timeout')); }, timeout);

        function finish(error) {
          clearTimeout(timer);
          script.onload = script.onerror = null;
          if (error) { script.remove(); reject(error); return; }
          resolve(url);
        }

        script.src = url;
        script.async = true;
        script.onload = function () {
          try {
            if (!isReady()) throw new Error('library did not initialise: ' + url);
            finish(null);
          } catch (error) { finish(error); }
        };
        script.onerror = function () { finish(new Error('script failed: ' + url)); };
        document.head.appendChild(script);
      });
    });
  }

  /* ----------------------------------------------------------- Clipboard -- */

  /* Kept as a fallback for the async clipboard API: it is missing on plain
     HTTP and rejects when the permission is denied. */
  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
      document.body.appendChild(area);
      area.select();
      try {
        var ok = document.execCommand('copy');
        area.remove();
        ok ? resolve() : reject(new Error('clipboard command rejected'));
      } catch (error) {
        area.remove();
        reject(error);
      }
    });
  }

  function copyText(text) {
    var value = String(text);
    if (!(navigator.clipboard && window.isSecureContext)) return legacyCopy(value);
    return navigator.clipboard.writeText(value).catch(function () { return legacyCopy(value); });
  }

  /* --------------------------------------------------------------- Toast -- */

  var Toast = (function () {
    var MAX_VISIBLE = 3;
    var LIFETIME = 2000;
    var EXIT_DURATION = 320;

    function host() {
      var node = $('#toast-host');
      if (!node) return null;
      return node;
    }

    function show(message, type, duration) {
      var box = host();
      if (!box) return;

      /* Keep the stack short: drop the oldest entries first. */
      while (box.children.length >= MAX_VISIBLE) box.removeChild(box.firstChild);

      var item = document.createElement('div');
      item.className = 'toast-item toast-' + (type || 'info');
      item.setAttribute('role', 'status');
      item.textContent = message;
      box.appendChild(item);

      requestAnimationFrame(function () { item.classList.add('show'); });
      setTimeout(function () {
        item.classList.remove('show');
        setTimeout(function () { item.remove(); }, EXIT_DURATION);
      }, duration || LIFETIME);
    }

    return {
      show: show,
      success: function (message, duration) { show(message, 'success', duration); },
      warn: function (message, duration) { show(message, 'warn', duration); },
      error: function (message, duration) { show(message, 'error', duration); }
    };
  })();

  /* ------------------------------------------------------------ Registry -- */

  var modules = {};

  function register(name, module) {
    modules[name] = module;
    Enhance[name] = module;
    return module;
  }

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
})(window, document);
