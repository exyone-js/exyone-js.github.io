/*!
 * Sortes Sacrae · 说明 page
 *
 * The about page is entirely server-rendered prose, so the only script it needs
 * is the shared shell. It deliberately keeps its own tiny entry point: even
 * though the whole tarot app ships as one bundle, `mount()` only runs the
 * controller for the current `data-page`, so this page never touches the deck.
 */
import { initShell } from './core';

export function mount(): void {
  initShell();
}
