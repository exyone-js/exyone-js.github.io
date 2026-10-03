/*
 * Particle Network — a restrained, breathing particle backdrop.
 *
 * Renders a fixed, pointer-transparent <canvas> behind the page. Colors are
 * read from the --pn-* CSS custom properties (defined in
 * jekyll-theme-chirpy.scss) so the palette follows the site's light/dark
 * theme (`data-bs-theme` on <html>).
 */
(function () {
  'use strict';

  var isMobile = matchMedia('(max-width: 768px), (pointer: coarse)').matches;
  if (isMobile) return;

  var canvas = document.createElement('canvas');
  canvas.id = 'particles-bg';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  var ctx = canvas.getContext('2d');

  /* ---------------- Tunables ---------------- */
  var CFG = {
    density:       18000,  // px² per particle; higher = sparser
    maxParticles:  56,
    minParticles:  24,
    speed:         0.12,   // drift speed (px per frame)
    linkDist:      120,    // particle-to-particle link distance
    mouseLinkDist: 145,    // mouse link distance
    mouseRadius:   110,    // mouse repulsion radius
    mouseForce:    0.7,
    dotRadius:     1.6,
    accentEvery:   8       // every Nth particle uses the accent color
  };

  var LINE_STEPS    = 8;  // pre-generated alpha ramps (avoid per-frame strings)
  var MOUSE_STEPS   = 8;
  var BREATH_SPEED  = 0.0006; // radiance oscillation (time-based)
  var BREATH_DEPTH  = 0.18;   // alpha swing around the base

  /* ---------------- Palette cache ---------------- */
  var palette = {
    dot: '', accent: '', line: '', mouse: '',
    lineAlpha: .16, dotAlpha: .45, mouseAlpha: .30
  };

  var lineColors  = [];
  var mouseColors = [];
  var dotFill     = '';
  var accentFill  = '';

  function buildRamps() {
    // Links: opacity steps up as particles get closer, modulated by breathing.
    lineColors = [];
    var i, lineA;
    for (i = 0; i < LINE_STEPS; i++) {
      lineA = palette.lineAlpha * (0.25 + 0.75 * i / (LINE_STEPS - 1));
      lineColors.push(lineA);
    }

    mouseColors = [];
    var j, mouseA;
    for (j = 0; j < MOUSE_STEPS; j++) {
      mouseA = palette.mouseAlpha * (0.2 + 0.8 * j / (MOUSE_STEPS - 1));
      mouseColors.push(mouseA);
    }
  }

  function readPalette() {
    var cs  = getComputedStyle(canvas);
    var val = function (name, fallback) { return cs.getPropertyValue(name).trim() || fallback; };

    palette.dot        = val('--pn-dot', '150,152,158');
    palette.accent     = val('--pn-accent', palette.dot);
    palette.line       = val('--pn-line', palette.dot);
    palette.mouse      = val('--pn-mouse', palette.line);
    palette.lineAlpha  = parseFloat(val('--pn-line-alpha',  '0.16')) || 0.16;
    palette.dotAlpha   = parseFloat(val('--pn-dot-alpha',   '0.45')) || 0.45;
    palette.mouseAlpha = parseFloat(val('--pn-mouse-alpha', '0.30')) || 0.30;

    buildRamps();

    dotFill    = 'rgba(' + palette.dot    + ',' + palette.dotAlpha + ')';
    accentFill = 'rgba(' + palette.accent + ',' + palette.dotAlpha + ')';
  }

  /* ---------------- Canvas & particles ---------------- */
  var W = 0, H = 0, dpr = 1;
  var particles = [];
  var mouse = { x: null, y: null };

  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;

    canvas.width  = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';

    // All coordinates below are in CSS pixels.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    buildParticles();
  }

  function buildParticles() {
    var count = Math.min(
      CFG.maxParticles,
      Math.max(CFG.minParticles, Math.round(W * H / CFG.density))
    );

    particles = [];
    var i;
    for (i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - .5) * CFG.speed * 2,
        vy: (Math.random() - .5) * CFG.speed * 2,
        r:  CFG.dotRadius * (0.7 + Math.random() * 0.6),
        accent: i % CFG.accentEvery === 0
      });
    }
  }

  /* ---------------- Update ---------------- */
  function update() {
    var i, p;
    for (i = 0; i < particles.length; i++) {
      p = particles[i];

      p.x += p.vx;
      p.y += p.vy;

      // Clamp to edges and reverse.
      if (p.x < 0)      { p.x = 0; p.vx =  Math.abs(p.vx); }
      else if (p.x > W) { p.x = W; p.vx = -Math.abs(p.vx); }
      if (p.y < 0)      { p.y = 0; p.vy =  Math.abs(p.vy); }
      else if (p.y > H) { p.y = H; p.vy = -Math.abs(p.vy); }

      // Gentle mouse repulsion.
      if (mouse.x !== null) {
        var dx = p.x - mouse.x;
        var dy = p.y - mouse.y;
        var d  = Math.sqrt(dx * dx + dy * dy);
        if (d < CFG.mouseRadius && d > 0.001) {
          var f = (1 - d / CFG.mouseRadius) * CFG.mouseForce;
          p.x += dx / d * f;
          p.y += dy / d * f;
        }
      }
    }
  }

  /* ---------------- Draw ---------------- */
  function draw(now) {
    ctx.clearRect(0, 0, W, H);

    // Collective breathing: link alpha oscillates slowly around its base.
    var breath = 1 + BREATH_DEPTH * Math.sin((now || 0) * BREATH_SPEED);

    ctx.lineWidth = 1;

    var linkDist = CFG.linkDist;
    var link2    = linkDist * linkDist;
    var i, j, a, b, dx, dy, d2, t, idx, alpha;

    // 1) Links between particles (opacity + width ramp with distance).
    for (i = 0; i < particles.length; i++) {
      a = particles[i];
      for (j = i + 1; j < particles.length; j++) {
        b  = particles[j];
        dx = a.x - b.x;
        dy = a.y - b.y;
        d2 = dx * dx + dy * dy;

        if (d2 < link2) {
          t   = 1 - Math.sqrt(d2) / linkDist;            // far 0 → near 1
          idx = Math.min(LINE_STEPS - 1, (t * LINE_STEPS) | 0);
          alpha = lineColors[idx] * breath;

          ctx.strokeStyle = 'rgba(' + palette.line + ',' + alpha.toFixed(3) + ')';
          ctx.lineWidth = 0.6 + 0.7 * t;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // 2) Mouse attraction lines.
    if (mouse.x !== null) {
      var md  = CFG.mouseLinkDist;
      var md2 = md * md;
      var k, mp, mdx, mdy, mdSq, mt, midx, malpha;

      ctx.lineWidth = 1;
      for (k = 0; k < particles.length; k++) {
        mp   = particles[k];
        mdx  = mp.x - mouse.x;
        mdy  = mp.y - mouse.y;
        mdSq = mdx * mdx + mdy * mdy;

        if (mdSq < md2) {
          mt   = 1 - Math.sqrt(mdSq) / md;
          midx = Math.min(MOUSE_STEPS - 1, (mt * MOUSE_STEPS) | 0);
          malpha = mouseColors[midx];

          ctx.strokeStyle = 'rgba(' + palette.mouse + ',' + malpha.toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(mp.x, mp.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }
    }

    // 3) Dots — accent emphasis.
    var n, dot, r;
    for (n = 0; n < particles.length; n++) {
      dot = particles[n];

      alpha = palette.dotAlpha * (dot.accent ? 1.15 : 1);
      if (alpha > 1) alpha = 1;
      r = dot.r * (dot.accent ? 1.15 : 1);

      ctx.fillStyle = 'rgba(' +
        (dot.accent ? palette.accent : palette.dot) +
        ',' + alpha.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ---------------- Main loop ---------------- */
  var rafId = null;

  function loop(now) {
    update();
    draw(now);
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (rafId === null && !reduceMotion.matches) {
      rafId = requestAnimationFrame(loop);
    }
  }

  function stop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  /* ---------------- Theme ---------------- */
  // Chirpy flips `data-bs-theme` on <html> at runtime; refresh the palette.
  var themeObserver = new MutationObserver(function () {
    readPalette();
    if (rafId === null && particles.length) draw(0);
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });

  /* ---------------- Events ---------------- */
  window.addEventListener('resize', resize);

  window.addEventListener('pointermove', function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }, { passive: true });

  window.addEventListener('pointerleave', function () {
    mouse.x = null;
    mouse.y = null;
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else start();
  });

  reduceMotion.addEventListener('change', function () {
    if (reduceMotion.matches) { stop(); draw(0); }
    else start();
  });

  /* ---------------- Boot ---------------- */
  readPalette();   // palette first
  resize();        // then build particles

  if (reduceMotion.matches) {
    draw(0);       // honor "reduce motion": one static frame only
  } else {
    start();
  }
})();
