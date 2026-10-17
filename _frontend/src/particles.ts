/*
 * Particle Network — simplified, still theme-aware.
 *
 * Colors are read from --pn-* CSS custom properties on the canvas.
 * A MutationObserver refreshes the palette when Chirpy flips
 * data-bs-theme on <html>.
 */
(function initParticles(): void {
  const isMobile = matchMedia('(max-width: 768px), (pointer: coarse)').matches;
  if (isMobile) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'particles-bg';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  const ctxOrNull = canvas.getContext('2d');
  if (!ctxOrNull) return;
  const ctx: CanvasRenderingContext2D = ctxOrNull;

  /* ---------------- Tunables ---------------- */
  const CFG = {
    density: 20000,
    maxParticles: 44,
    minParticles: 18,
    speed: 0.12,
    linkDist: 120,
    mouseLinkDist: 145,
    mouseRadius: 110,
    mouseForce: 0.7,
    dotRadius: 1.6,
    accentEvery: 8
  };

  const BREATH_SPEED = 0.0006;
  const BREATH_DEPTH = 0.18;

  /* ---------------- Palette (theme-aware) ---------------- */
  const palette = {
    dot: '',
    accent: '',
    line: '',
    mouse: '',
    lineAlpha: 0.16,
    dotAlpha: 0.45,
    mouseAlpha: 0.30
  };

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
  let mouseX: number | null = null;
  let mouseY: number | null = null;

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function resize(): void {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;

    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

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

  function update(): void {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx); }
      else if (p.x > W) { p.x = W; p.vx = -Math.abs(p.vx); }
      if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy); }
      else if (p.y > H) { p.y = H; p.vy = -Math.abs(p.vy); }

      if (mouseX !== null && mouseY !== null) {
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const d = Math.sqrt(dx * dx + dy * dy);

        if (d < CFG.mouseRadius && d > 0.001) {
          const f = (1 - d / CFG.mouseRadius) * CFG.mouseForce;
          p.x += (dx / d) * f;
          p.y += (dy / d) * f;
        }
      }
    }
  }

  function draw(now = 0): void {
    ctx.clearRect(0, 0, W, H);

    const breath = 1 + BREATH_DEPTH * Math.sin(now * BREATH_SPEED);
    ctx.lineWidth = 1;

    const linkDist = CFG.linkDist;
    const link2 = linkDist * linkDist;

    /* 1) Particle-to-particle links */
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];

      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;

        if (d2 < link2) {
          const t = 1 - Math.sqrt(d2) / linkDist;
          const alpha = palette.lineAlpha * (0.25 + 0.75 * t) * breath;

          ctx.strokeStyle = `rgba(${palette.line},${alpha.toFixed(3)})`;
          ctx.lineWidth = 0.6 + 0.7 * t;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    /* 2) Mouse links */
    if (mouseX !== null && mouseY !== null) {
      const md = CFG.mouseLinkDist;
      const md2 = md * md;

      ctx.lineWidth = 1;

      for (let k = 0; k < particles.length; k++) {
        const p = particles[k];
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const d2 = dx * dx + dy * dy;

        if (d2 < md2) {
          const t = 1 - Math.sqrt(d2) / md;
          const alpha = palette.mouseAlpha * (0.2 + 0.8 * t);

          ctx.strokeStyle = `rgba(${palette.mouse},${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouseX, mouseY);
          ctx.stroke();
        }
      }
    }

    /* 3) Dots */
    for (let n = 0; n < particles.length; n++) {
      const p = particles[n];

      let alpha = palette.dotAlpha * (p.accent ? 1.15 : 1);
      if (alpha > 1) alpha = 1;

      const r = p.r * (p.accent ? 1.15 : 1);
      ctx.fillStyle = `rgba(${p.accent ? palette.accent : palette.dot},${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
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
  new MutationObserver(function () {
    readPalette();
    if (rafId === null && particles.length) draw(0);
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-bs-theme']
  });

  /* ---------------- Events ---------------- */
  window.addEventListener('resize', resize);

  window.addEventListener('pointermove', function (e: PointerEvent) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }, { passive: true });

  window.addEventListener('pointerleave', function () {
    mouseX = null;
    mouseY = null;
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else start();
  });

  reduceMotion.addEventListener('change', function () {
    if (reduceMotion.matches) {
      stop();
      draw(0);
    } else {
      start();
    }
  });

  /* ---------------- Boot ---------------- */
  readPalette();
  resize();

  if (reduceMotion.matches) {
    draw(0);
  } else {
    start();
  }
})();