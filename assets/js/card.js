/*!
 * SiteEnhance · floating card
 *
 * Shell shared by the music and quote cards: draggable by its header, keeps its
 * position across visits, and handles open / close transitions in one place.
 *
 * Theming note: the theme performs full document loads on navigation, so both
 * the position and the open/closed state are persisted and restored here.
 *
 * Usage:
 *   var card = Enhance.createCard({ el: element, key: 'storage-key' });
 *   card.restore(); card.open(); card.close(); card.toggle();
 */
(function (window) {
  'use strict';

  var Enhance = window.Enhance;
  if (!Enhance) return;

  /* Keep in sync with the card transition defined in the stylesheet. */
  var EXIT_DURATION = 260;

  function createCard(options) {
    var settings = options || {};
    var el = settings.el;
    if (!el) return null;

    var storageKey = settings.key;
    var visibilityKey = settings.visibilityKey || (storageKey ? storageKey + ':visible' : null);
    var storage = Enhance.storage;
    var clamp = Enhance.clamp;
    var bus = Enhance.bus;

    var handle = el.querySelector('[data-drag-handle]');
    var exitTimer = null;
    var isOpen = false;

    /* -------------------------------------------------------- Positioning -- */

    function clampToViewport(x, y) {
      var width = el.offsetWidth || 0;
      var height = el.offsetHeight || 0;
      return {
        x: clamp(x, 0, Math.max(0, window.innerWidth - width)),
        y: clamp(y, 0, Math.max(0, window.innerHeight - height))
      };
    }

    function place(x, y) {
      var position = clampToViewport(x, y);
      el.style.right = 'auto';
      el.style.left = position.x + 'px';
      el.style.top = position.y + 'px';
    }

    /* Restores the stored position; the element keeps flowing while hidden so
       we can measure it right away. Returns true when a saved spot was used. */
    function restorePosition() {
      if (!storageKey) return false;
      var saved = storage.getJSON(storageKey, null);
      if (!saved || typeof saved.x !== 'number' || typeof saved.y !== 'number') return false;
      place(saved.x, saved.y);
      return true;
    }

    /* Pins the card to explicit pixel coordinates. Cards default to a `right`
       anchor in CSS, and switching to an inline `left` without a value would
       resolve it to the viewport origin - exactly the jump to the top-left
       corner that used to happen on the first interaction. */
    function anchorPosition() {
      var rect = el.getBoundingClientRect();
      place(rect.left, rect.top);
    }

    /* Saved spot when there is one, otherwise freeze the current one. */
    function applyPosition() {
      if (!restorePosition()) anchorPosition();
    }

    function savePosition() {
      if (!storageKey) return;
      var rect = el.getBoundingClientRect();
      storage.setJSON(storageKey, { x: Math.round(rect.left), y: Math.round(rect.top) });
    }

    function resetPosition() {
      if (storageKey) storage.remove(storageKey);
      el.style.left = '';
      el.style.right = '';
      el.style.top = '';
      applyPosition();
    }

    applyPosition();

    /* ------------------------------------------------------------ Dragging -- */

    if (handle) {
      var origin = { dx: 0, dy: 0 };
      var dragging = false;
      var moved = false;

      handle.addEventListener('pointerdown', function (event) {
        /* Never start a drag from the close button or another control. */
        if (event.target.closest && event.target.closest('[data-close]')) return;
        var rect = el.getBoundingClientRect();
        dragging = true;
        moved = false;
        origin.dx = event.clientX - rect.left;
        origin.dy = event.clientY - rect.top;
        /* Freeze the current spot before releasing the `right` anchor. */
        anchorPosition();
        el.classList.add('dragging');
        if (handle.setPointerCapture) {
          try { handle.setPointerCapture(event.pointerId); } catch (error) { /* unsupported pointer */ }
        }
        event.preventDefault();
      });

      handle.addEventListener('pointermove', function (event) {
        if (!dragging) return;
        moved = true;
        place(event.clientX - origin.dx, event.clientY - origin.dy);
      });

      function endDrag(event) {
        if (!dragging) return;
        dragging = false;
        el.classList.remove('dragging');
        if (handle.releasePointerCapture) {
          try { handle.releasePointerCapture(event.pointerId); } catch (error) { /* not captured */ }
        }
        if (moved) savePosition();
      }

      handle.addEventListener('pointerup', endDrag);
      handle.addEventListener('pointercancel', endDrag);

      /* Double click the header to snap back to the default corner. */
      handle.addEventListener('dblclick', function (event) {
        if (event.target.closest && event.target.closest('[data-close]')) return;
        resetPosition();
      });
    }

    /* Keep the card reachable after the viewport shrinks. */
    window.addEventListener('resize', Enhance.debounce(function () {
      var rect = el.getBoundingClientRect();
      place(rect.left, rect.top);
    }, 150));

    /* --------------------------------------------------------- Visibility -- */

    function open() {
      clearTimeout(exitTimer);
      /* The element is never removed from the layout, so its position can be
         applied before it becomes visible. */
      applyPosition();
      el.hidden = false;
      requestAnimationFrame(function () { el.classList.add('open'); });
      isOpen = true;
      if (visibilityKey) storage.set(visibilityKey, 'on');
      if (settings.onOpen) settings.onOpen();
      bus.emit('card:open', { id: el.id });
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      el.classList.remove('open');
      clearTimeout(exitTimer);
      exitTimer = setTimeout(function () { el.hidden = true; }, EXIT_DURATION);
      if (visibilityKey) storage.set(visibilityKey, 'off');
      if (settings.onClose) settings.onClose();
      bus.emit('card:close', { id: el.id });
    }

    function toggle() {
      return isOpen ? close() : open();
    }

    /* Reopens the card when it was left open on the previous page. */
    function restore() {
      if (visibilityKey && storage.get(visibilityKey, 'off') === 'on') open();
    }

    /* Cards own their close button, no global delegation required. */
    el.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('[data-close]') : null;
      if (!button || !el.contains(button)) return;
      event.stopPropagation();
      close();
    });

    return {
      el: el,
      restore: restore,
      open: open,
      close: close,
      toggle: toggle,
      isOpen: function () { return isOpen; },
      resetPosition: resetPosition
    };
  }

  Enhance.createCard = createCard;
})(window);
