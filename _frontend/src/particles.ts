/*
 * Particle Network — a restrained, breathing particle backdrop.
 *
 * Renders a fixed, pointer-transparent <canvas> behind the page. Colors are
 * read from the --pn-* CSS custom properties (defined in
 * jekyll-theme-chirpy.scss) so the palette follows the site's light/dark
 * theme (`data-bs-theme` on <html>).
 *
 * Self-contained: runs as soon as the module is evaluated (the bundle is
 * loaded with `defer`, so `document.body` already exists).
 */
(function initParticles(): void {
  const isMobile = matchMedia('(max-width: 768px), (pointer: coarse)').matches;
  if (isMobile) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'particles-bg';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  const context = canvas.getContext('2d');
  if (!context) return;
  /* Aliased so the nested functions below keep a non-nullable reference. */
  const ctx = context;

  /* ---------------- Tunables ---------------- */
  const CFG = {
    density: 20000,      // px² per particle; higher = sparser
    maxParticles: 44,
    minParticles: 18,
    speed: 0.12,         // drift speed (px per frame)
    linkDist: 120,       // particle-to-particle link distance
    mouseLinkDist: 145,  // mouse link distance
    mouseRadius: 110,    // mouse repulsion radius
    mouseForce: 0.7,
    dotRadius: 1.6,
    accentEvery: 8       // every Nth particle uses the accent color
  };

  const LINE_STEPS = 8;        // pre-generated alpha ramps (avoid per-frame strings)
  const MOUSE_STEPS = 8;
  const BREATH_SPEED = 0.0006; // radiance oscillation (time-based)
  const BREATH_DEPTH = 0.18;   // alpha swing around the base

  /* ---------------- Palette cache ---------------- */
  const palette = {
    dot: '', accent: '', line: '', mouse: '',
    lineAlpha: 0.16, dotAlpha: 0.45, mouseAlpha: 0.30
  };

  let lineColors: number[] = [];
  let mouseColors: number[] = [];

  function buildRamps(): void {
    // Links: opacity steps up as particles get closer, modulated by breathing.
    lineColors = [];
    for (let i = 0; i < LINE_STEPS; i++) {
      lineColors.push(palette.lineAlpha * (0.25 + (0.75 * i) / (LINE_STEPS - 1)));
    }

    mouseColors = [];
    for (let j = 0; j < MOUSE_STEPS; j++) {
      mouseColors.push(palette.mouseAlpha * (0.2 + (0.8 * j) / (MOUSE_STEPS - 1)));
    }
  }

  function readPalette(): void {
    const cs = getComputedStyle(canvas);
    const val = function (name: string, fallback: string): string {
      return cs.getPropertyValue(name).trim() || fallback;
    };

    palette.dot = val('--pn-dot', '150,152,158');
    palette.accent = val('--pn-accent', palette.dot);
    palette.line = val('--pn-line', palette.dot);
    palette.mouse = val('--pn-mouse', palette.line);
    palette.lineAlpha = parseFloat(val('--pn-line-alpha', '0.16')) || 0.16;
    palette.dotAlpha = parseFloat(val('--pn-dot-alpha', '0.45')) || 0.45;
    palette.mouseAlpha = parseFloat(val('--pn-mouse-alpha', '0.30')) || 0.30;

    buildRamps();
  }

  /* ---------------- Canvas & particles ---------------- */
  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    accent: boolean;
  }

  let W = 0;
  let H = 0;
  let dpr = 1;
  let particles: Particle[] = [];
  const mouse: { x: number | null; y: number | null } = { x: null, y: null };

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function resize(): void {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;

    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';

    // All coordinates below are in CSS pixels.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    buildParticles();
  }

  function buildParticles(): void {
    const count = Math.min(
      CFG.maxParticles,
      Math.max(CFG.minParticles, Math.round((W * H) / CFG.density))
    );

    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * CFG.speed * 2,
        vy: (Math.random() - 0.5) * CFG.speed * 2,
        r: CFG.dotRadius * (0.7 + Math.random() * 0.6),
        accent: i % CFG.accentEvery === 0
      });
    }
  }

  /* ---------------- Update ---------------- */
  function update(): void {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      p.x += p.vx;
      p.y += p.vy;

      // Clamp to edges and reverse.
      if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx); }
      else if (p.x > W) { p.x = W; p.vx = -Math.abs(p.vx); }
      if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy); }
      else if (p.y > H) { p.y = H; p.vy = -Math.abs(p.vy); }

      // Gentle mouse repulsion.
      if (mouse.x !== null && mouse.y !== null) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < CFG.mouseRadius && d > 0.001) {
          const f = (1 - d / CFG.mouseRadius) * CFG.mouseForce;
          p.x += (dx / d) * f;
          p.y += (dy / d) * f;
        }
      }
    }
  }

  /* ---------------- Draw ---------------- */
  function draw(now: number): void {
    ctx.clearRect(0, 0, W, H);

    // Collective breathing: link alpha oscillates slowly around its base.
    const breath = 1 + BREATH_DEPTH * Math.sin((now || 0) * BREATH_SPEED);

    ctx.lineWidth = 1;

    const linkDist = CFG.linkDist;
    const link2 = linkDist * linkDist;
    let alpha: number;

    // 1) Links between particles (opacity + width ramp with distance).
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;

        if (d2 < link2) {
          const t = 1 - Math.sqrt(d2) / linkDist;           // far 0 → near 1
          const idx = Math.min(LINE_STEPS - 1, (t * LINE_STEPS) | 0);
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
    if (mouse.x !== null && mouse.y !== null) {
      const md = CFG.mouseLinkDist;
      const md2 = md * md;
      const mx = mouse.x;
      const my = mouse.y;

      ctx.lineWidth = 1;
      for (let k = 0; k < particles.length; k++) {
        const mp = particles[k];
        const mdx = mp.x - mx;
        const mdy = mp.y - my;
        const mdSq = mdx * mdx + mdy * mdy;

        if (mdSq < md2) {
          const mt = 1 - Math.sqrt(mdSq) / md;
          const midx = Math.min(MOUSE_STEPS - 1, (mt * MOUSE_STEPS) | 0);

          ctx.strokeStyle = 'rgba(' + palette.mouse + ',' + mouseColors[midx].toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(mp.x, mp.y);
          ctx.lineTo(mx, my);
          ctx.stroke();
        }
      }
    }

    // 3) Dots — accent emphasis.
    for (let n = 0; n < particles.length; n++) {
      const dot = particles[n];

      alpha = palette.dotAlpha * (dot.accent ? 1.15 : 1);
      if (alpha > 1) alpha = 1;
      const r = dot.r * (dot.accent ? 1.15 : 1);

      ctx.fillStyle = 'rgba(' +
        (dot.accent ? palette.accent : palette.dot) +
        ',' + alpha.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ---------------- Main loop ---------------- */
  let rafId: number | null = null;

  function loop(now: number): void {
    update();
    draw(now);
    rafId = requestAnimationFrame(loop);
  }

  function start(): void {
    if (rafId === null && !reduceMotion.matches) {
      rafId = requestAnimationFrame(loop);
    }
  }

  function stop(): void {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  /* ---------------- Theme ---------------- */
  // Chirpy flips `data-bs-theme` on <html> at runtime; refresh the palette.
  const themeObserver = new MutationObserver(function () {
    readPalette();
    if (rafId === null && particles.length) draw(0);
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });

  /* ---------------- Events ---------------- */
  window.addEventListener('resize', resize);

  window.addEventListener('pointermove', function (e: PointerEvent) {
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
