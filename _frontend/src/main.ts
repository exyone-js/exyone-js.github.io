/*!
 * SiteEnhance · bootstrap
 *
 * The entry point of the bundle: hosts the shortcut helper dialog, initialises
 * the modules, wires global keyboard shortcuts and exposes the public API on
 * `window.SiteEnhance`.
 *
 * The import order below is the load order: `core` builds the namespace, every
 * module then registers itself, and this file runs last.
 */
import { Enhance, asElement } from './core';
import './card';
import './zh-convert';
import './player';
import './quotes';
import './reading';
import './effects';
import './particles';
import './menu';
import type { ShortcutsModule } from './types';

const guard = Enhance.guard;
const modules = Enhance.modules;

/* Keep in sync with the modal transition defined in the stylesheet. */
const EXIT_DURATION = 220;

/* ------------------------------------------------------ Shortcut helper -- */

/* The dialog exists only for the shortcuts declared below, so it lives next
   to the key handler instead of in a module of its own. */
const Shortcuts: ShortcutsModule | null = (function (): ShortcutsModule | null {
  const dialog = Enhance.$('#shortcuts-modal');
  if (!dialog) return null;
  /* Aliased so the nested handlers keep a non-nullable reference. */
  const modal = dialog;

  let exitTimer: number | undefined;
  let lastFocused: HTMLElement | null = null;

  function open(): void {
    clearTimeout(exitTimer);
    lastFocused = document.activeElement as HTMLElement | null;
    modal.hidden = false;
    requestAnimationFrame(function () { modal.classList.add('open'); });

    const closeButton = modal.querySelector<HTMLElement>('.sc-modal-close');
    if (closeButton) closeButton.focus();
  }

  function close(): void {
    if (modal.hidden) return;
    modal.classList.remove('open');
    clearTimeout(exitTimer);
    exitTimer = window.setTimeout(function () { modal.hidden = true; }, EXIT_DURATION);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
    lastFocused = null;
  }

  function toggle(): void {
    if (isOpen()) close();
    else open();
  }

  function isOpen(): boolean {
    return !modal.hidden;
  }

  /* Backdrop and header button share the same `data-close` marker. */
  modal.addEventListener('click', function (event: MouseEvent) {
    const target = asElement(event.target);
    if (target && target.closest('[data-close]')) close();
  });

  return { open: open, close: close, toggle: toggle, isOpen: isOpen };
})();

Enhance.register('Shortcuts', Shortcuts);

/* ------------------------------------------------------------ Keyboard --- */

function isEditable(target: EventTarget | null): boolean {
  const element = asElement(target);
  const tag = element ? element.tagName.toLowerCase() : '';
  const host = element as HTMLElement | null;
  return tag === 'input' || tag === 'textarea' || tag === 'select' ||
    !!(host && host.isContentEditable);
}

/* Single escape route: overlays close before floating widgets, topmost first. */
function closeTopLayer(): boolean {
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

function setupShortcuts(): void {
  document.addEventListener('keydown', guard('shortcuts', function (event: KeyboardEvent) {
    if (isEditable(event.target)) return;

    const key = (event.key || '').toLowerCase();

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
function boot(): void {
  Object.keys(modules).forEach(function (name) {
    const module = modules[name];
    if (module && typeof module.init === 'function') guard(name + '.init', module.init)();
  });
  setupShortcuts();
}

function start(): void {
  guard('boot', boot)();
}

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
