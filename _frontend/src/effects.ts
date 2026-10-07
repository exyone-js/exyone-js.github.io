/*!
 * SiteEnhance · click effects
 *
 * Decorative feedback on click: floating word, ripple or confetti burst. The
 * active mode is cycled from the context menu and is skipped automatically for
 * visitors who prefer reduced motion.
 */
import { Enhance, asElement } from './core';
import type { ClickEffectModule, ClickMode } from './types';

const CONFIG = Enhance.CONFIG.clickEffect;
const storage = Enhance.storage;
const Toast = Enhance.Toast;
const bus = Enhance.bus;

const ClickEffect: ClickEffectModule | null = (function (): ClickEffectModule | null {
  const MODES: ClickMode[] = ['word', 'ripple', 'confetti', 'none'];
  const LABELS: Record<ClickMode, string> = {
    word: '词语', ripple: '波纹', confetti: '彩带', none: '关闭'
  };

  /* Calm palette kept in sync with the card / menu accent colours. */
  const PALETTE = ['#60a5fa', '#a78bfa', '#f472b6', '#fbbf24', '#34d399', '#fb7185', '#22d3ee'];
  const WORDS = ['富强', '民主', '文明', '和谐', '自由', '平等', '公正', '法治', '爱国', '敬业', '诚信', '友善'];

  /* Never decorate clicks inside controls or floating overlays. */
  const SKIP = '.dropdown-menu, .ctx-menu, #sidebar, ' +
    '#shortcuts-modal, #toast-host, #tool-cards';

  const LIFETIME: Record<ClickMode, number> = { word: 1100, ripple: 1000, confetti: 1250, none: 1200 };

  /* Remembered so the picked decoration survives navigation. */
  const STORAGE_KEY = 'enhance:click-effect';
  const saved = storage.get(STORAGE_KEY, '');
  let mode: ClickMode = MODES.includes(saved as ClickMode)
    ? (saved as ClickMode)
    : (MODES.includes(CONFIG.mode as ClickMode) ? (CONFIG.mode as ClickMode) : 'word');

  const words = Enhance.toArray(CONFIG.words && CONFIG.words.length ? CONFIG.words : WORDS);
  let cursor = 0;
  let live = 0;
  let lastSpawn = 0;

  function pickColor(): string {
    return PALETTE[Math.floor(Math.random() * PALETTE.length)];
  }

  function buildWord(el: HTMLElement): void {
    el.classList.add('click-word');
    el.textContent = words[cursor++ % words.length];
    el.style.setProperty('--ce-color', pickColor());
  }

  function buildRipple(el: HTMLElement): void {
    el.classList.add('click-ripple');
    el.style.setProperty('--ce-color', pickColor());
  }

  function buildConfetti(el: HTMLElement): void {
    const pieces = 12;
    el.classList.add('click-confetti');
    for (let i = 0; i < pieces; i++) {
      const piece = document.createElement('i');
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

  function spawn(x: number, y: number): void {
    const builder = mode === 'ripple' ? buildRipple : (mode === 'confetti' ? buildConfetti : buildWord);
    const life = LIFETIME[mode] || 1200;
    const el = document.createElement('span');

    live++;
    el.className = 'click-effect';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    builder(el);
    document.body.appendChild(el);

    window.setTimeout(function () {
      el.remove();
      live--;
    }, life);
  }

  function onClick(event: MouseEvent): void {
    if (mode === 'none' || Enhance.prefersReducedMotion()) return;

    const now = Date.now();
    if (now - lastSpawn < (CONFIG.throttle || 80)) return;
    if (live >= (CONFIG.max || 6)) return;
    const target = asElement(event.target);
    if (target && target.closest(SKIP)) return;

    lastSpawn = now;
    spawn(event.pageX, event.pageY);
  }

  function setMode(next: ClickMode): ClickMode {
    mode = MODES.includes(next) ? next : 'word';
    storage.set(STORAGE_KEY, mode);
    bus.emit('clickEffect:changed', { mode: mode });
    return mode;
  }

  return {
    init: function (): void {
      document.addEventListener('click', onClick, { passive: true });
    },
    cycle: function (): ClickMode {
      const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
      setMode(next);
      Toast.show('点击特效：' + (LABELS[next] || next), 'info', 1200);
      return next;
    },
    set: setMode,
    label: function (): string { return LABELS[mode] || '关闭'; },
    mode: function (): ClickMode { return mode; }
  };
})();

Enhance.register('ClickEffect', ClickEffect);
