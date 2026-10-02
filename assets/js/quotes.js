/*!
 * SiteEnhance · quote card
 *
 * Shows a random quote inside a floating card and refreshes it on demand.
 * Payloads are fetched from the configured endpoints (probed in order) and may
 * either be a bare list or the `{ status, message, data }` envelope.
 */
(function (window) {
  'use strict';

  var Enhance = window.Enhance;
  if (!Enhance) return;

  var CONFIG = Enhance.CONFIG.quotes;
  var bus = Enhance.bus;

  var Quotes = (function () {
    if (!CONFIG.enabled) return null;

    var cardEl = Enhance.$('#epigram-card');
    if (!cardEl) return null;

    var contentEl = cardEl.querySelector('.epigram-content');
    var metaEl = cardEl.querySelector('.epigram-meta');
    if (!contentEl || !metaEl) return null;

    var card = Enhance.createCard({ el: cardEl, key: 'enhance:quotes-position' });

    var pending = null;    /* in-flight request */
    var loaded = false;    /* at least one successful render */

    /* ------------------------------------------------------------ Markers -- */

    function markLoading() {
      cardEl.classList.remove('is-error');
      contentEl.classList.remove('epigram-error');
      contentEl.classList.add('epigram-loading');
      contentEl.textContent = '正在加载隽语…';
      metaEl.textContent = '';
    }

    function render(quote) {
      contentEl.textContent = '「 ' + quote.content + ' 」';

      var meta = [quote.author, quote.source].filter(Boolean).join(' · ');
      metaEl.textContent = meta ? '—— ' + meta : '';

      contentEl.classList.remove('epigram-loading', 'epigram-error');
      cardEl.classList.remove('is-error');
      loaded = true;
      bus.emit('quotes:loaded', { quote: quote });
    }

    function markFailed() {
      contentEl.textContent = '隽语加载失败，点击重试';
      contentEl.classList.remove('epigram-loading');
      contentEl.classList.add('epigram-error');
      cardEl.classList.add('is-error');
    }

    /* ------------------------------------------------------------- Fetching */

    /* Accepts a bare item, an array, or the `{ data: [...] }` envelope. */
    function pickQuote(payload) {
      var list = Array.isArray(payload)
        ? payload
        : (payload && Array.isArray(payload.data) ? payload.data : [payload]);

      for (var i = 0; i < list.length; i++) {
        var item = list[i];
        if (item && item.content) return normalize(item);
      }
      return null;
    }

    function normalize(item) {
      return {
        content: String(item.content).trim(),
        author: item.author ? String(item.author).trim() : '',
        source: item.source ? String(item.source).trim() : ''
      };
    }

    function fetchQuote() {
      return Enhance.resolveFirst(Enhance.toArray(CONFIG.endpoints), function (endpoint) {
        var separator = endpoint.indexOf('?') >= 0 ? '&' : '?';
        var url = endpoint + separator + 't=' + Date.now();
        return Enhance.requestJSON(url, { timeout: CONFIG.timeout }).then(function (payload) {
          var quote = pickQuote(payload);
          if (!quote) throw new Error('empty payload');
          return quote;
        });
      });
    }

    /* Guarded against parallel triggers (fast clicks, impatient users). */
    function load() {
      if (pending) return pending;

      markLoading();
      pending = fetchQuote()
        .then(render)
        .catch(function (error) {
          console.warn('[site-enhance] quote unavailable:', error);
          markFailed();
        })
        .then(function () { pending = null; }, function () { pending = null; });

      return pending;
    }

    /* ------------------------------------------------------------ Events --- */

    cardEl.addEventListener('click', function (event) {
      if (event.target.closest && event.target.closest('[data-close], [data-drag-handle]')) return;
      load();
    });

    cardEl.addEventListener('keydown', function (event) {
      if (event.target.closest && event.target.closest('[data-close], [data-drag-handle]')) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        load();
      }
    });

    function open() {
      card.open();
      if (!loaded) load();
    }

    function toggle() {
      if (card.isOpen()) card.close();
      else open();
    }

    /* Reopens the card when it was left open on the previous page. */
    function init() {
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
})(window);
