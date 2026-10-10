/*!
 * Sortes Sacrae · 图鉴 controller
 *
 * Progressive enhancement over server-rendered markup: all 78 cards are in the
 * HTML already, so the page is complete (and crawlable) without any script.
 * This file only adds search, the suit filter and the detail dialog.
 */
import { escapeHtml, orientationLabel, renderCard, suitLabel } from './card';
import { debounce, initShell, q, qa, setText, show } from './core';
import { cardById } from './deck';
import type { TarotCard } from './deck';

export function mount(): void {
  initShell();

  const grid = q<HTMLElement>('[data-codex-grid]');
  const search = q<HTMLInputElement>('[data-codex-search]');
  const countLabel = q<HTMLElement>('[data-codex-count]');
  const emptyState = q<HTMLElement>('[data-codex-empty]');
  const modal = q<HTMLElement>('[data-modal]');
  const modalContent = q<HTMLElement>('[data-modal-content]');
  const items = qa<HTMLElement>('.codex-item');
  const filterButtons = qa<HTMLButtonElement>('[data-codex-filter]');

  let activeFilter = 'all';
  let lastFocus: HTMLElement | null = null;

  /* -------------------------------------------------------------- Filter -- */

  /** Searches everything a reader might remember about a card. */
  function matches(card: TarotCard, term: string): boolean {
    const haystack = [
      card.name,
      card.latin,
      card.number,
      card.element,
      card.virtue,
      card.symbolism,
      card.upright,
      card.reversed,
      ...card.keywords,
      ...card.reversedKeywords
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(term);
  }

  function applyFilter(): void {
    const term = (search?.value ?? '').trim().toLowerCase();
    let visible = 0;

    for (const item of items) {
      const id = item.dataset.card ?? '';
      const suit = item.dataset.suit ?? '';
      const card = cardById(id);

      const suitOk = activeFilter === 'all' || suit === activeFilter;
      const termOk = term === '' || (card ? matches(card, term) : false);
      const ok = suitOk && termOk;

      item.hidden = !ok;
      if (ok) visible += 1;
    }

    setText(countLabel, `显示 ${visible} / ${items.length} 张`);
    show(emptyState, visible === 0);
  }

  for (const button of filterButtons) {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.codexFilter ?? 'all';
      for (const other of filterButtons) {
        other.setAttribute('aria-pressed', String(other === button));
      }
      applyFilter();
    });
  }

  search?.addEventListener('input', debounce(applyFilter, 120));

  /* ----------------------------------------------------------------- Modal -- */

  function modalMarkup(card: TarotCard): string {
    const kind = card.arcana === 'major' ? '大阿卡纳' : escapeHtml(suitLabel(card).split(' · ')[0] ?? '');

    return `<div class="modal__head">
      <div class="modal__card">${renderCard(card)}</div>
      <div class="modal__head-body">
        <p class="panel__latin">${kind} · ${escapeHtml(card.number)}</p>
        <h2 class="modal__title"><span class="dropcap">${escapeHtml(card.name)}</span></h2>
        <p class="entry__latin">${escapeHtml(card.latin)}</p>
        <p class="entry__latin" style="margin-top:6px">元素 · ${escapeHtml(card.element)}</p>
      </div>
    </div>

    <div class="cols">
      <div class="col">
        <p class="col__label">正位 · Rectus</p>
        <h4>${card.keywords.map(word => escapeHtml(word)).join(' · ')}</h4>
        <p>${escapeHtml(card.upright)}</p>
      </div>
      <div class="col">
        <p class="col__label">逆位 · Inversus</p>
        <h4>${card.reversedKeywords.map(word => escapeHtml(word)).join(' · ')}</h4>
        <p>${escapeHtml(card.reversed)}</p>
      </div>
      <div class="col">
        <p class="col__label">象征 · Symbolum</p>
        <p>${escapeHtml(card.symbolism)}</p>
      </div>
      <div class="col">
        <p class="col__label">德行 · Virtus</p>
        <p>${escapeHtml(card.virtue)}</p>
      </div>
    </div>

    <p class="note" style="margin-top:18px">
      这张牌若出现在牌阵里，它的读法取决于位置：同一个位置的正位与逆位（${orientationLabel(true)} / ${orientationLabel(false)}）
      说的是两件事。想知道它在具体问题里怎么读，请到<a href="/tarot/draw/">抽牌台</a>实际抽一次。
    </p>`;
  }

  function openModal(card: TarotCard): void {
    if (!modal || !modalContent) return;
    lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modalContent.innerHTML = modalMarkup(card);
    show(modal, true);
    document.body.style.overflow = 'hidden';
    q<HTMLButtonElement>('[data-modal-close]')?.focus();
  }

  function closeModal(): void {
    if (!modal) return;
    show(modal, false);
    document.body.style.overflow = '';
    if (modalContent) modalContent.innerHTML = '';
    lastFocus?.focus();
  }

  grid?.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('.codex-item') : null;
    const id = target instanceof HTMLElement ? target.dataset.card : undefined;
    const card = id ? cardById(id) : undefined;
    if (card) openModal(card);
  });

  q<HTMLButtonElement>('[data-modal-close]')?.addEventListener('click', closeModal);

  modal?.addEventListener('click', event => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal && !modal.hidden) closeModal();
  });

  /* --------------------------------------------------------------- Boot -- */

  applyFilter();
}
