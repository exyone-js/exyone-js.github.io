/*!
 * SiteEnhance · bootstrap
 *
 * The last script in the chain: hosts the shortcut helper dialog, initialises
 * the modules, wires global keyboard shortcuts and exposes the public API on
 * `window.SiteEnhance`.
 */
(function (window, document) {
  'use strict';

  var Enhance = window.Enhance;
  if (!Enhance) return;

  var guard = Enhance.guard;
  var modules = Enhance.modules;

  /* Keep in sync with the modal transition defined in the stylesheet. */
  var EXIT_DURATION = 220;

  /* ------------------------------------------------------ Shortcut helper -- */

  /* The dialog exists only for the shortcuts declared below, so it lives next
     to the key handler instead of in a module of its own. */
  var Shortcuts = (function () {
    var modal = Enhance.$('#shortcuts-modal');
    if (!modal) return null;

    var exitTimer = null;
    var lastFocused = null;

    function open() {
      clearTimeout(exitTimer);
      lastFocused = document.activeElement;
      modal.hidden = false;
      requestAnimationFrame(function () { modal.classList.add('open'); });

      var closeButton = modal.querySelector('.sc-modal-close');
      if (closeButton) closeButton.focus();
    }

    function close() {
      if (modal.hidden) return;
      modal.classList.remove('open');
      clearTimeout(exitTimer);
      exitTimer = setTimeout(function () { modal.hidden = true; }, EXIT_DURATION);
      if (lastFocused && lastFocused.focus) lastFocused.focus();
      lastFocused = null;
    }

    function toggle() {
      if (isOpen()) close();
      else open();
    }

    function isOpen() {
      return !modal.hidden;
    }

    /* Backdrop and header button share the same `data-close` marker. */
    modal.addEventListener('click', function (event) {
      if (event.target.closest('[data-close]')) close();
    });

    return { open: open, close: close, toggle: toggle, isOpen: isOpen };
  })();

  Enhance.register('Shortcuts', Shortcuts);

  /* ------------------------------------------------------------ Keyboard --- */

  function isEditable(target) {
    var tag = (target.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || !!target.isContentEditable;
  }

  /* Single escape route: overlays close before floating widgets, topmost first. */
  function closeTopLayer() {
    if (Enhance.ContextMenu && Enhance.ContextMenu.isOpen()) {
      Enhance.ContextMenu.close();
      return true;
    }
    if (Shortcuts && Shortcuts.isOpen()) {
      Shortcuts.close();
      return true;
    }
    if (Enhance.Quotes && Enhance.Quotes.isVisible()) {
      Enhance.Quotes.close();
      return true;
    }
    if (Enhance.Music && Enhance.Music.isVisible()) {
      Enhance.Music.hide();
      return true;
    }
    return false;
  }

  function setupShortcuts() {
    document.addEventListener('keydown', guard('shortcuts', function (event) {
      if (isEditable(event.target)) return;

      var key = (event.key || '').toLowerCase();

      if (event.altKey && key === 'z') {
        event.preventDefault();
        if (Enhance.ZhConvert) Enhance.ZhConvert.toggle();
        return;
      }

      if (event.altKey && (event.code === 'Space' || key === ' ')) {
        event.preventDefault();
        if (Enhance.Music) Enhance.Music.playpause();
        return;
      }

      if (key === '?' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        if (Shortcuts) Shortcuts.toggle();
        return;
      }

      if (key === 'escape') closeTopLayer();
    }));
  }

  /* ------------------------------------------------------------- Startup --- */

  /* The theme performs full document loads on navigation, so every module
     restores its persisted state here instead of relying on live references. */
  function boot() {
    Object.keys(modules).forEach(function (name) {
      var module = modules[name];
      if (module && typeof module.init === 'function') guard(name + '.init', module.init)();
    });
    setupShortcuts();
  }

  function start() { guard('boot', boot)(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  /* ---------------------------------------------------------- Public API --- */

  window.SiteEnhance = {
    version: '2.0.0',
    Toast: Enhance.Toast,
    bus: Enhance.bus,
    ZhConvert: Enhance.ZhConvert,
    Music: Enhance.Music,
    Quotes: Enhance.Quotes,
    Reading: Enhance.Reading,
    ClickEffect: Enhance.ClickEffect,
    ContextMenu: Enhance.ContextMenu,
    Shortcuts: Shortcuts
  };
})(window, document);
