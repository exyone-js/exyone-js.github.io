/*!
 * SiteEnhance · Chinese script converter
 *
 * Toggles the document between the Simplified and Traditional Chinese variants
 * using OpenCC, loaded lazily on first use. Every text node keeps a pristine
 * copy of its content, so switching back restores the original wording instead
 * of re-converting text that already went through the converter.
 */
import { Enhance } from './core';
import type { ZhConvertModule } from './types';

const CONFIG = Enhance.CONFIG.zhConvert;
const storage = Enhance.storage;
const Toast = Enhance.Toast;
const bus = Enhance.bus;

const ZhConvert: ZhConvertModule | null = (function (): ZhConvertModule | null {
  if (!CONFIG.enabled) return null;

  const STORAGE_KEY = 'enhance:zh-convert';

  /* Elements whose content must stay untouched. */
  const SKIP_TAGS: Record<string, number> = {
    SCRIPT: 1, STYLE: 1, CODE: 1, PRE: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1,
    OPTION: 1, KBD: 1, SAMP: 1, IFRAME: 1, SVG: 1, CANVAS: 1, NOSCRIPT: 1
  };
  const SKIP_SELECTOR = '#custom-context-menu, #toast-host, #shortcuts-modal, ' +
    '#tool-cards, .ctx-menu';

  /* Nodes and attributes keep their pristine value here. */
  const originals: WeakMap<Node, string | null> | null =
    window.WeakMap ? new WeakMap<Node, string | null>() : null;
  const attributeOriginals: Array<{ el: Element; attr: string; value: string }> = [];

  /* Very old browsers fall back to a property keyed by node identity. */
  type OriginalHost = Node & { 'enhance:original'?: string | null };

  const pageTitle = document.title;

  const state = {
    ready: false,
    loading: null as Promise<void> | null,
    traditional: false,
    toTraditional: null as ((text: string) => string) | null,
    observer: null as MutationObserver | null
  };

  /* ------------------------------------------------------------ Helpers -- */

  function remember(node: Node, value: string | null): string | null {
    if (originals) {
      if (!originals.has(node)) originals.set(node, value);
      return originals.get(node) ?? value;
    }
    const host = node as OriginalHost;
    if (host['enhance:original'] === undefined) host['enhance:original'] = value;
    return host['enhance:original'] ?? null;
  }

  function rememberAttribute(element: Element, attribute: string, value: string): string {
    for (let i = 0; i < attributeOriginals.length; i++) {
      const entry = attributeOriginals[i];
      if (entry.el === element && entry.attr === attribute) return entry.value;
    }
    attributeOriginals.push({ el: element, attr: attribute, value: value });
    return value;
  }

  function shouldSkip(node: Node): boolean {
    let parent = node.parentElement;
    while (parent && parent !== document.body) {
      if (SKIP_TAGS[parent.tagName]) return true;
      if (parent.matches && parent.matches(SKIP_SELECTOR)) return true;
      parent = parent.parentElement;
    }
    return false;
  }

  function convertText(node: Node): void {
    const raw = remember(node, node.nodeValue);
    const next =
      state.traditional && state.toTraditional && raw !== null
        ? state.toTraditional(raw)
        : raw;
    if (next !== node.nodeValue) node.nodeValue = next;
  }

  function convertTree(root: Node): void {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node: Node): number {
        const value = node.nodeValue;
        if (!value || !value.trim()) return NodeFilter.FILTER_REJECT;
        if (shouldSkip(node)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes: Node[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(convertText);
  }

  /* Title and SEO metadata are plain strings, not part of the tree walk. */
  function convertMetadata(): void {
    if (pageTitle && state.toTraditional) {
      document.title = state.traditional ? state.toTraditional(pageTitle) : pageTitle;
    }
    Enhance.$$('meta[name="description"], meta[property="og:title"], ' +
      'meta[property="og:description"], meta[name="twitter:title"], ' +
      'meta[name="twitter:description"]').forEach(function (meta) {
      const value = meta.getAttribute('content');
      if (!value || !state.toTraditional) return;
      const raw = rememberAttribute(meta, 'content', value);
      meta.setAttribute('content', state.traditional ? state.toTraditional(raw) : raw);
    });
  }

  /* Newly injected content (comments, lazy blocks) inherits the active mode. */
  function watchMutations(): void {
    if (state.observer || !window.MutationObserver) return;
    state.observer = new MutationObserver(Enhance.debounce(function (records: MutationRecord[]) {
      if (!state.traditional) return;
      records.forEach(function (record) {
        Array.prototype.forEach.call(record.addedNodes, function (node: Node) {
          if (node.nodeType === 1) convertTree(node);
          else if (node.nodeType === 3 && !shouldSkip(node)) convertText(node);
        });
      });
    }, 250));
    state.observer.observe(document.body, { childList: true, subtree: true });
  }

  /* -------------------------------------------------------------- Loader */

  function loadLibrary(): Promise<void> {
    if (state.ready) return Promise.resolve();
    if (state.loading) return state.loading;

    state.loading = Enhance.loadScript(Enhance.toArray(CONFIG.cdn), {
      isReady: function () {
        return typeof window.OpenCC === 'object' && !!window.OpenCC.Converter;
      }
    }).then(function () {
      const opencc = window.OpenCC;
      if (!opencc) throw new Error('OpenCC did not initialise');
      state.toTraditional = opencc.Converter({ from: 'cn', to: 'tw' });
      state.ready = true;
      state.loading = null;
    }).catch(function (error) {
      state.loading = null;
      throw error;
    });

    return state.loading;
  }

  function apply(traditional: boolean): void {
    state.traditional = traditional;
    convertTree(document.body);
    convertMetadata();
    storage.set(STORAGE_KEY, traditional ? 'trad' : 'simp');
    watchMutations();
    bus.emit('zh-convert:changed', { traditional: traditional });
  }

  function prefersTraditional(): boolean {
    if (!CONFIG.autoDetect) return false;
    const language = String(navigator.language || '').toLowerCase();
    return /^zh-(tw|hk|mo)/.test(language) || language.indexOf('zh-hant') === 0;
  }

  function init(): Promise<unknown> {
    const saved = storage.get(STORAGE_KEY, '');
    const traditional = saved === 'trad'
      ? true
      : (saved === 'simp' ? false : prefersTraditional());
    if (!traditional) return Promise.resolve();

    /* Restoring a saved preference should stay silent on failure. */
    return loadLibrary()
      .then(function () { apply(true); })
      .catch(function () { /* keep the page as-is */ });
  }

  function toggle(): Promise<unknown> {
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
