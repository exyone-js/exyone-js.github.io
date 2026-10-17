/* Friends feed — keyboard / swipe shortcuts for the pager. */
(function () {
  "use strict";

  var bar = document.getElementById("fe-pag");
  if (!bar) return; // Only one page was generated: nothing to navigate.

  function link(kind) {
    var el = bar.querySelector('[data-nav="' + kind + '"]');
    return el && el.tagName === "A" ? el : null;
  }

  // The destination is the neighbour page's own URL, so navigation is a plain
  // document load: history, caching and the back button stay native.
  function go(kind) {
    var el = link(kind);
    var href = el && el.getAttribute("href");
    if (href) window.location.assign(href);
  }

  document.addEventListener("keydown", function (e) {
    var tag = e.target && e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.key === "ArrowLeft") go("prev");
    else if (e.key === "ArrowRight") go("next");
  });

  // Touch swipe: horizontal only, conservative thresholds so vertical scroll wins.
  var sx = 0, sy = 0, tracking = false;

  document.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) { tracking = false; return; }
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });

  document.addEventListener("touchend", function (e) {
    if (!tracking) return;
    tracking = false;
    var t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    var dx = t.clientX - sx;
    var dy = t.clientY - sy;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    go(dx < 0 ? "next" : "prev");
  }, { passive: true });
})();
