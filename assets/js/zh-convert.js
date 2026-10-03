/*!
 * SiteEnhance · Chinese script converter
 *
 * Toggles the document between the Simplified and Traditional Chinese variants
 * using OpenCC, loaded lazily on first use. Every text node keeps a pristine
 * copy of its content, so switching back restores the original wording instead
 * of re-converting text that already went through the converter.
 */
(function (window, document) {
  'use strict';

  var Enhance = window.Enhance;
  if (!Enhance) return;

  var CONFIG = Enhance.CONFIG.zhConvert;
  var storage = Enhance.storage;
  var Toast = Enhance.Toast;
  var bus = Enhance.bus;

  var ZhConvert = (function () {
    if (!CONFIG.enabled) return null;

    var STORAGE_KEY = 'enhance:zh-convert';

    /* Elements whose content must stay untouched. */
    var SKIP_TAGS = {
      SCRIPT: 1, STYLE: 1, CODE: 1, PRE: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1,
      OPTION: 1, KBD: 1, SAMP: 1, IFRAME: 1, SVG: 1, CANVAS: 1, NOSCRIPT: 1
    };
    var SKIP_SELECTOR = '#custom-context-menu, #toast-host, #shortcuts-modal, ' +
      '#tool-cards, .ctx-menu';

    /* Nodes and attributes keep their pristine value here. */
    var originals = window.WeakMap ? new WeakMap() : null;
    var attributeOriginals = [];

    var pageTitle = document.title;

    var state = {
      ready: false,
      loading: null,
      traditional: false,
      toTraditional: null,
      observer: null
    };

    /* ------------------------------------------------------------ Helpers -- */

    function remember(node, value) {
      if (originals) {
        if (!originals.has(node)) originals.set(node, value);
        return originals.get(node);
      }
      /* Very old browsers fall back to a property keyed by node identity. */
      if (node['enhance:original'] === undefined) node['enhance:original'] = value;
      return node['enhance:original'];
    }

    function rememberAttribute(element, attribute, value) {
      for (var i = 0; i < attributeOriginals.length; i++) {
        if (attributeOriginals[i].el === element && attributeOriginals[i].attr === attribute) {
          return attributeOriginals[i].value;
        }
      }
      attributeOriginals.push({ el: element, attr: attribute, value: value });
      return value;
    }

    function shouldSkip(node) {
      var parent = node.parentElement;
      while (parent && parent !== document.body) {
        if (SKIP_TAGS[parent.tagName]) return true;
        if (parent.matches && parent.matches(SKIP_SELECTOR)) return true;
        parent = parent.parentElement;
      }
      return false;
    }

    function convertText(node) {
      var raw = remember(node, node.nodeValue);
      var next = state.traditional ? state.toTraditional(raw) : raw;
      if (next !== node.nodeValue) node.nodeValue = next;
    }

    function convertTree(root) {
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: function (node) {
          var value = node.nodeValue;
          if (!value || !value.trim()) return NodeFilter.FILTER_REJECT;
          if (shouldSkip(node)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      var nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(convertText);
    }

    /* Title and SEO metadata are plain strings, not part of the tree walk. */
    function convertMetadata() {
      if (pageTitle) {
        document.title = state.traditional ? state.toTraditional(pageTitle) : pageTitle;
      }
      Enhance.$$('meta[name="description"], meta[property="og:title"], ' +
        'meta[property="og:description"], meta[name="twitter:title"], ' +
        'meta[name="twitter:description"]').forEach(function (meta) {
        var value = meta.getAttribute('content');
        if (!value) return;
        var raw = rememberAttribute(meta, 'content', value);
        meta.setAttribute('content', state.traditional ? state.toTraditional(raw) : raw);
      });
    }

    /* Newly injected content (comments, lazy blocks) inherits the active mode. */
    function watchMutations() {
      if (state.observer || !window.MutationObserver) return;
      state.observer = new MutationObserver(Enhance.debounce(function (records) {
        if (!state.traditional) return;
        records.forEach(function (record) {
          Array.prototype.forEach.call(record.addedNodes, function (node) {
            if (node.nodeType === 1) convertTree(node);
            else if (node.nodeType === 3 && !shouldSkip(node)) convertText(node);
          });
        });
      }, 250));
      state.observer.observe(document.body, { childList: true, subtree: true });
    }

    /* -------------------------------------------------------------- Loader */

    function loadLibrary() {
      if (state.ready) return Promise.resolve();
      if (state.loading) return state.loading;

      state.loading = Enhance.loadScript(Enhance.toArray(CONFIG.cdn), {
        isReady: function () { return typeof window.OpenCC === 'object' && window.OpenCC.Converter; }
      }).then(function () {
        state.toTraditional = window.OpenCC.Converter({ from: 'cn', to: 'tw' });
        state.ready = true;
        state.loading = null;
      }).catch(function (error) {
        state.loading = null;
        throw error;
      });

      return state.loading;
    }

    function apply(traditional) {
      state.traditional = traditional;
      convertTree(document.body);
      convertMetadata();
      storage.set(STORAGE_KEY, traditional ? 'trad' : 'simp');
      watchMutations();
      bus.emit('zh-convert:changed', { traditional: traditional });
    }

    function prefersTraditional() {
      if (!CONFIG.autoDetect) return false;
      var language = String(navigator.language || '').toLowerCase();
      return /^zh-(tw|hk|mo)/.test(language) || language.indexOf('zh-hant') === 0;
    }

    function init() {
      var saved = storage.get(STORAGE_KEY, '');
      var traditional = saved === 'trad'
        ? true
        : (saved === 'simp' ? false : prefersTraditional());
      if (!traditional) return Promise.resolve();

      /* Restoring a saved preference should stay silent on failure. */
      return loadLibrary().then(function () { apply(true); }).catch(function () {});
    }

    function toggle() {
      if (!state.ready) {
        Toast.show('正在加载简繁转换库…', 'info', 1200);
        return loadLibrary()
          .then(function () { apply(!state.traditional); })
          .catch(function () { Toast.error('简繁转换库加载失败，请检查网络'); });
      }
      apply(!state.traditional);
      return Promise.resolve();
    }

    return {
      init: init,
      toggle: toggle,
      isTraditional: function () { return state.traditional; },
      isReady: function () { return state.ready; }
    };
  })();

  Enhance.register('ZhConvert', ZhConvert);
})(window, document);
