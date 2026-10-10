/*!
 * Sortes Sacrae · 记录 controller
 *
 * Renders whatever `localStorage` holds. Records never leave the device, so
 * there is no sync, no account and nothing to delete on a server.
 */
import { escapeHtml } from './card';
import { decodePicks, clearHistory, formatDateTime, initShell, loadHistory, q, removeReading, show, toast } from './core';
import { cardByIndex } from './deck';
import { spreadById } from './spreads';
import type { ReadingRecord } from './core';

export function mount(): void {
  initShell();

  const root = q<HTMLElement>('[data-history-root]');
  const emptyState = q<HTMLElement>('[data-history-empty]');

  /* -------------------------------------------------------------- Render -- */

  function readingHref(record: ReadingRecord): string {
    const params = new URLSearchParams();
    params.set('spread', record.spread);
    params.set('c', record.cards);
    if (record.question) params.set('q', record.question);
    return `/tarot/reading/?${params.toString()}`;
  }

  function cardNames(record: ReadingRecord): string {
    const picks = decodePicks(record.cards) ?? [];
    return picks
      .map(pick => {
        const card = cardByIndex(pick.index);
        if (!card) return '？';
        return `${card.name}${pick.reversed ? '（逆）' : ''}`;
      })
      .join(' · ');
  }

  function itemMarkup(record: ReadingRecord): string {
    const spread = spreadById(record.spread);
    const spreadName = spread ? spread.name : record.spread;
    const spreadLatin = spread ? spread.latin : '—';
    const question = record.question ? record.question : '（未填写求问）';

    return `<li class="history-item">
      <div class="history-item__main">
        <p class="history-item__time">${escapeHtml(formatDateTime(record.ts))}</p>
        <p class="history-item__spread">${escapeHtml(spreadName)} <span class="panel__latin">${escapeHtml(spreadLatin)}</span></p>
        <p class="history-item__q">${escapeHtml(question)}</p>
        <p class="history-item__cards"><b>${escapeHtml(cardNames(record))}</b></p>
      </div>
      <div class="history-item__actions">
        <a class="btn btn--gold" href="${escapeHtml(readingHref(record))}">重新解读</a>
        <button class="btn btn--quiet btn--danger" type="button" data-remove="${escapeHtml(record.id)}">删除</button>
      </div>
    </li>`;
  }

  function render(): void {
    const records = loadHistory();
    show(emptyState, records.length === 0);
    if (root) {
      root.innerHTML = records.map(itemMarkup).join('\n');
    }
  }

  /* ------------------------------------------------------------- Actions -- */

  root?.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('[data-remove]') : null;
    const id = target instanceof HTMLElement ? target.dataset.remove : undefined;
    if (!id) return;
    removeReading(id);
    toast('已删除这条记录');
    render();
  });

  q<HTMLButtonElement>('[data-history-clear]')?.addEventListener('click', () => {
    if (loadHistory().length === 0) {
      toast('本来就没有记录');
      return;
    }
    if (!window.confirm('要清空全部占卜记录吗？这个操作无法撤销。')) return;
    clearHistory();
    toast('已清空');
    render();
  });

  q<HTMLButtonElement>('[data-history-export]')?.addEventListener('click', () => {
    const records = loadHistory();
    if (records.length === 0) {
      toast('没有可以导出的记录');
      return;
    }

    const payload = {
      app: 'Sortes Sacrae',
      exportedAt: new Date().toISOString(),
      records: records.map(record => ({
        ...record,
        spreadName: spreadById(record.spread)?.name ?? record.spread,
        drawn: cardNames(record)
      }))
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sortes-sacrae-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast('已导出 JSON');
  });

  /* --------------------------------------------------------------- Boot -- */

  render();
}
