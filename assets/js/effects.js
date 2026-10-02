/*!
 * SiteEnhance · click effects
 *
 * Decorative feedback on click: floating word, ripple or confetti burst. The
 * active mode is cycled from the context menu and is skipped automatically for
 * visitors who prefer reduced motion.
 */
(function (window, document) {
  'use strict';

  var Enhance = window.Enhance;
  if (!Enhance) return;

  var CONFIG = Enhance.CONFIG.clickEffect;
  var storage = Enhance.storage;
  var Toast = Enhance.Toast;
  var bus = Enhance.bus;

  var ClickEffect = (function () {
    var MODES = ['word', 'ripple', 'confetti', 'none'];
    var LABELS = { word: '词语', ripple: '波纹', confetti: '彩带', none: '关闭' };

    /* Calm palette kept in sync with the card / menu accent colours. */
    var PALETTE = ['#60a5fa', '#a78bfa', '#f472b6', '#fbbf24', '#34d399', '#fb7185', '#22d3ee'];
    var WORDS = ['富强', '民主', '文明', '和谐', '自由', '平等', '公正', '法治', '爱国', '敬业', '诚信', '友善'];

    /* Never decorate clicks inside controls or floating overlays. */
    var SKIP = '.dropdown-menu, .ctx-menu, #sidebar, ' +
      '#shortcuts-modal, #toast-host, #tool-cards';

    var LIFETIME = { word: 1100, ripple: 1000, confetti: 1250 };

    /* Remembered so the picked decoration survives navigation. */
    var STORAGE_KEY = 'enhance:click-effect';
    var saved = storage.get(STORAGE_KEY, '');
    var mode = MODES.indexOf(saved) >= 0
      ? saved
      : (MODES.indexOf(CONFIG.mode) >= 0 ? CONFIG.mode : 'word');
    var words = Enhance.toArray(CONFIG.words && CONFIG.words.length ? CONFIG.words : WORDS);
    var cursor = 0;
    var live = 0;
    var lastSpawn = 0;

    function pickColor() {
      return PALETTE[Math.floor(Math.random() * PALETTE.length)];
    }

    function buildWord(el) {
      el.classList.add('click-word');
      el.textContent = words[cursor++ % words.length];
      el.style.setProperty('--ce-color', pickColor());
    }

    function buildRipple(el) {
      el.classList.add('click-ripple');
      el.style.setProperty('--ce-color', pickColor());
    }

    function buildConfetti(el) {
      var pieces = 12;
      el.classList.add('click-confetti');
      for (var i = 0; i < pieces; i++) {
        var piece = document.createElement('i');
        piece.style.cssText =
          '--a:' + ((i * 360 / pieces) + Math.random() * 16).toFixed(1) + 'deg;' +
          '--d:' + (30 + Math.random() * 26).toFixed(0) + 'px;' +
          '--c:' + PALETTE[i % PALETTE.length] + ';' +
          '--t:' + (0.72 + Math.random() * 0.36).toFixed(2) + 's;' +
          '--dl:' + (Math.random() * 0.07).toFixed(2) + 's;' +
          '--r:' + (Math.random() * 360).toFixed(0) + 'deg;' +
          (Math.random() > 0.5 ? 'border-radius:50%;' : '');
        el.appendChild(piece);
      }
    }

    function spawn(x, y) {
      var builder = mode === 'ripple' ? buildRipple : (mode === 'confetti' ? buildConfetti : buildWord);
      var life = LIFETIME[mode] || 1200;
      var el = document.createElement('span');

      live++;
      el.className = 'click-effect';
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      builder(el);
      document.body.appendChild(el);

      setTimeout(function () {
        el.remove();
        live--;
      }, life);
    }

    function onClick(event) {
      if (mode === 'none' || Enhance.prefersReducedMotion()) return;

      var now = Date.now();
      if (now - lastSpawn < (CONFIG.throttle || 80)) return;
      if (live >= (CONFIG.max || 6)) return;
      if (event.target.closest && event.target.closest(SKIP)) return;

      lastSpawn = now;
      spawn(event.pageX, event.pageY);
    }

    function setMode(next) {
      mode = MODES.indexOf(next) >= 0 ? next : 'word';
      storage.set(STORAGE_KEY, mode);
      bus.emit('clickEffect:changed', { mode: mode });
      return mode;
    }

    return {
      init: function () {
        document.addEventListener('click', onClick, { passive: true });
      },
      cycle: function () {
        var next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
        setMode(next);
        Toast.show('点击特效：' + (LABELS[next] || next), 'info', 1200);
        return next;
      },
      set: setMode,
      label: function () { return LABELS[mode] || '关闭'; },
      mode: function () { return mode; }
    };
  })();

  Enhance.register('ClickEffect', ClickEffect);
})(window, document);
