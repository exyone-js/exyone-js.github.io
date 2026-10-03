/*!
 * SiteEnhance · reading progress
 *
 * A slim bar pinned to the top of the viewport that tracks how far the reader
 * has scrolled. Movement is eased with requestAnimationFrame so the bar feels
 * attached to the page instead of flickering on every scroll event.
 */
(function (window, document) {
  'use strict';

  var Enhance = window.Enhance;
  if (!Enhance) return;

  var CONFIG = Enhance.CONFIG.reading;
  var storage = Enhance.storage;
  var bus = Enhance.bus;

  var Reading = (function () {
    if (!CONFIG.enabled) return null;

    var bar = Enhance.$('#reading-progress');
    if (!bar) return null;

    var STORAGE_KEY = 'enhance:reading';
    var EASE = typeof CONFIG.ease === 'number' ? CONFIG.ease : 0.13;

    var enabled = storage.isEnabled(STORAGE_KEY);
    var target = 0;
    var current = 0;
    var frame = 0;
    var bound = false;

    function paint() {
      bar.style.transform = 'scaleX(' + current.toFixed(5) + ')';
    }

    function step() {
      var delta = target - current;
      if (Math.abs(delta) < 0.0004) {
        current = target;
        paint();
        frame = 0;
        return;
      }
      current += delta * EASE;
      paint();
      frame = requestAnimationFrame(step);
    }

    function measure() {
      var root = document.documentElement;
      var scrollable = root.scrollHeight - root.clientHeight;
      target = scrollable > 0 ? Enhance.clamp(root.scrollTop / scrollable, 0, 1) : 0;
      if (!frame) frame = requestAnimationFrame(step);
    }

    function apply() {
      bar.style.display = enabled ? '' : 'none';
      if (enabled) measure();
    }

    function toggle() {
      enabled = !enabled;
      storage.set(STORAGE_KEY, enabled ? 'on' : 'off');
      apply();
      bus.emit('reading:changed', { enabled: enabled });
      return enabled;
    }

    return {
      /* Safe to call repeatedly (e.g. after PJAX navigation). */
      init: function () {
        if (!bound) {
          window.addEventListener('scroll', measure, { passive: true });
          window.addEventListener('resize', measure, { passive: true });
          bound = true;
        }
        apply();
      },
      toggle: toggle,
      isEnabled: function () { return enabled; }
    };
  })();

  Enhance.register('Reading', Reading);
})(window, document);
