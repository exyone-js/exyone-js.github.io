/*!
 * SiteEnhance · quote card
 *
 * Shows a random quote inside a floating card and refreshes it on demand.
 * Payloads are fetched from the configured endpoints (probed in order) and may
 * either be a bare list or the `{ status, message, data }` envelope.
 */
import { Enhance, asElement } from './core';
import { createCard } from './card';
import type { QuotesModule } from './types';

const CONFIG = Enhance.CONFIG.quotes;
const bus = Enhance.bus;

interface Quote {
  content: string;
  author: string;
  source: string;
}

const Quotes: QuotesModule | null = (function (): QuotesModule | null {
  if (!CONFIG.enabled) return null;

  const host = Enhance.$('#epigram-card');
  if (!host) return null;
  /* Aliased so the nested functions below keep non-nullable references. */
  const cardEl = host;

  const content = cardEl.querySelector('.epigram-content');
  const meta = cardEl.querySelector('.epigram-meta');
  if (!content || !meta) return null;
  const contentEl = content;
  const metaEl = meta;

  const quoteCard = createCard({ el: cardEl, key: 'enhance:quotes-position' });
  if (!quoteCard) return null;
  const card = quoteCard;

  let pending: Promise<void> | null = null;  /* in-flight request */
  let loaded = false;                        /* at least one successful render */

  /* ------------------------------------------------------------ Markers -- */

  function markLoading(): void {
    cardEl.classList.remove('is-error');
    contentEl.classList.remove('epigram-error');
    contentEl.classList.add('epigram-loading');
    contentEl.textContent = '正在加载隽语…';
    metaEl.textContent = '';
  }

  function render(quote: Quote): void {
    contentEl.textContent = '「 ' + quote.content + ' 」';

    const meta = [quote.author, quote.source].filter(Boolean).join(' · ');
    metaEl.textContent = meta ? '—— ' + meta : '';

    contentEl.classList.remove('epigram-loading', 'epigram-error');
    cardEl.classList.remove('is-error');
    loaded = true;
    bus.emit('quotes:loaded', { quote: quote });
  }

  function markFailed(): void {
    contentEl.textContent = '隽语加载失败，点击重试';
    contentEl.classList.remove('epigram-loading');
    contentEl.classList.add('epigram-error');
    cardEl.classList.add('is-error');
  }

  /* ------------------------------------------------------------- Fetching */

  /* Accepts a bare item, an array, or the `{ data: [...] }` envelope. */
  function normalize(item: Quote): Quote {
    return {
      content: String(item.content).trim(),
      author: item.author ? String(item.author).trim() : '',
      source: item.source ? String(item.source).trim() : ''
    };
  }

  function pickQuote(payload: unknown): Quote | null {
    const envelope = payload as { data?: unknown } | null;
    const list: unknown[] = Array.isArray(payload)
      ? payload
      : (envelope && Array.isArray(envelope.data) ? (envelope.data as unknown[]) : [payload]);

    for (let i = 0; i < list.length; i++) {
      const item = list[i] as Partial<Quote> | null;
      if (item && item.content) return normalize(item as Quote);
    }
    return null;
  }

  function fetchQuote(): Promise<Quote> {
    return Enhance.resolveFirst(Enhance.toArray(CONFIG.endpoints), function (endpoint) {
      const separator = endpoint.indexOf('?') >= 0 ? '&' : '?';
      const url = endpoint + separator + 't=' + Date.now();
      return Enhance.requestJSON(url, { timeout: CONFIG.timeout }).then(function (payload) {
        const quote = pickQuote(payload);
        if (!quote) throw new Error('empty payload');
        return quote;
      });
    });
  }

  /* Guarded against parallel triggers (fast clicks, impatient users). */
  function load(): Promise<void> {
    if (pending) return pending;

    markLoading();
    pending = fetchQuote()
      .then(render)
      .catch(function (error) {
        console.warn('[site-enhance] quote unavailable:', error);
        markFailed();
      })
      .then(
        function () { pending = null; },
        function () { pending = null; }
      );

    return pending;
  }

  /* ------------------------------------------------------------ Events --- */

  cardEl.addEventListener('click', function (event: MouseEvent) {
    const target = asElement(event.target);
    if (target && target.closest('[data-close], [data-drag-handle]')) return;
    load();
  });

  cardEl.addEventListener('keydown', function (event: KeyboardEvent) {
    const target = asElement(event.target);
    if (target && target.closest('[data-close], [data-drag-handle]')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      load();
    }
  });

  function open(): void {
    card.open();
    if (!loaded) load();
  }

  function toggle(): void {
    if (card.isOpen()) card.close();
    else open();
  }

  /* Reopens the card when it was left open on the previous page. */
  function init(): void {
    card.restore();
  }

  return {
    init: init,
    load: load,
    open: open,
    close: function () { card.close(); },
    toggle: toggle,
    isVisible: function () { return card.isOpen(); }
  };
})();

Enhance.register('Quotes', Quotes);
