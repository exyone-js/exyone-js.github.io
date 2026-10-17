/*!
 * SiteEnhance · reading progress
 *
 * A slim bar pinned to the top of the viewport that tracks how far the reader
 * has scrolled. Movement is eased with requestAnimationFrame so the bar feels
 * attached to the page instead of flickering on every scroll event.
 */
import { Enhance } from './core';
import type { ReadingModule } from './types';

const CONFIG = Enhance.CONFIG.reading;
const storage = Enhance.storage;
const bus = Enhance.bus;

const Reading: ReadingModule | null = (function (): ReadingModule | null {
  if (!CONFIG.enabled) return null;

  const host = Enhance.$('#reading-progress');
  if (!host) return null;
  /* Aliased so the nested functions below keep a non-nullable reference. */
  const bar = host;

  const STORAGE_KEY = 'enhance:reading';
  const EASE = typeof CONFIG.ease === 'number' ? CONFIG.ease : 0.13;

  let enabled = storage.isEnabled(STORAGE_KEY);
  let target = 0;
  let current = 0;
  let frame = 0;
  let bound = false;

  function paint(): void {
    bar.style.transform = 'scaleX(' + current.toFixed(5) + ')';
  }

  function step(): void {
    const delta = target - current;
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

  function measure(): void {
    const root = document.documentElement;
    const scrollable = root.scrollHeight - root.clientHeight;
    target = scrollable > 0 ? Enhance.clamp(root.scrollTop / scrollable, 0, 1) : 0;
    if (!frame) frame = requestAnimationFrame(step);
  }

  function apply(): void {
    bar.style.display = enabled ? '' : 'none';
    if (enabled) measure();
  }

  function toggle(): boolean {
    enabled = !enabled;
    storage.set(STORAGE_KEY, enabled ? 'on' : 'off');
    apply();
    bus.emit('reading:changed', { enabled: enabled });
    return enabled;
  }

  return {
    /* Safe to call repeatedly (e.g. after PJAX navigation). */
    init: function (): void {
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
