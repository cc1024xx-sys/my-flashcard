import { loadState, saveState, getDomain } from './storage.js';
import { formatDate, formatDateKey, escapeHtml, getDateKey } from './utils.js';
import { openExtractDialog } from './flashcards.js';
import { openEditDailyLogDialog, deleteDailyLog, renderMoodTagsHtml } from './dailyLog.js';
import {
  openEditDomainReviewDialog,
  deleteDomainReview,
  renderReviewBodyHtml,
  renderRatingStarsHtml,
} from './reviews.js';

let historyTab = 'day';
let historyDomainFilter = 'all';

function collectDateKeys(state) {
  const keys = new Set();
  state.dailyLogs.forEach((d) => keys.add(d.dateKey));
  state.domainReviews.forEach((r) => keys.add(getDateKey(r.createdAt)));
  return [...keys].sort((a, b) => b.localeCompare(a));
}

function getReviewsForDate(state, dateKey) {
  return state.domainReviews
    .filter((r) => getDateKey(r.createdAt) === dateKey)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function renderDomainReviewItemHtml(state, r, { showDate = false } = {}) {
  const domain = getDomain(state, r.domainId);
  const dateLine = showDate
    ? `<span class="text-slate-400 text-xs">${escapeHtml(formatDateKey(getDateKey(r.createdAt)))}</span>`
    : '';

  return `
    <article class="history-domain-item bg-slate-50 rounded-lg p-3 border border-slate-100">
      <div class="flex items-center gap-2 text-sm mb-2 flex-wrap">
        <span class="w-2 h-2 rounded-full shrink-0" style="background:${domain?.color || '#94a3b8'}"></span>
        <span class="font-medium text-slate-800">${escapeHtml(domain?.name || '未知领域')}</span>
        ${renderRatingStarsHtml(r.rating)}
        ${dateLine}
        ${!showDate ? `<span class="text-slate-400 text-xs ml-auto">${formatDate(r.createdAt)}</span>` : ''}
      </div>
      <div class="text-sm">${renderReviewBodyHtml(r)}</div>
      <div class="flex flex-wrap gap-2 mt-3">
        <button type="button" data-extract="${r.id}" class="btn-ghost text-xs">提炼归纳</button>
        <button type="button" data-edit-domain-review="${r.id}" class="btn-ghost text-xs">编辑</button>
        <button type="button" data-delete-domain-review="${r.id}" class="btn-ghost btn-danger text-xs">删除</button>
      </div>
    </article>`;
}

function bindDomainReviewActions(container, state) {
  container.querySelectorAll('[data-extract]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const review = state.domainReviews.find((r) => r.id === btn.dataset.extract);
      if (review) openExtractDialog(review);
    });
  });
  container.querySelectorAll('[data-edit-domain-review]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const review = state.domainReviews.find((r) => r.id === btn.dataset.editDomainReview);
      if (review) openEditDomainReviewDialog(review);
    });
  });
  container.querySelectorAll('[data-delete-domain-review]').forEach((btn) => {
    btn.addEventListener('click', () => deleteDomainReview(btn.dataset.deleteDomainReview));
  });
}

export function renderHistoryByDay() {
  const container = document.getElementById('history-by-day-list');
  if (!container) return;

  const state = loadState();
  const dateKeys = collectDateKeys(state);

  if (!dateKeys.length) {
    container.innerHTML =
      '<p class="text-slate-500 text-center py-8 text-sm">还没有复盘记录，先去写今日复盘或领域复盘吧</p>';
    return;
  }

  const todayKey = getDateKey();

  container.innerHTML = dateKeys
    .map((dateKey) => {
      const dailyLog = state.dailyLogs.find((d) => d.dateKey === dateKey);
      const dayReviews = getReviewsForDate(state, dateKey);
      const isToday = dateKey === todayKey;

      const dailySection = dailyLog
        ? `
        <div class="history-daily-block rounded-lg bg-indigo-50/50 border border-indigo-100 p-3 mb-3">
          <p class="text-xs font-semibold text-indigo-800 mb-2">今日整体</p>
          <div class="flex items-center gap-2 flex-wrap mb-2">
            <span class="text-amber-500 text-sm">${'★'.repeat(dailyLog.rating)}${'☆'.repeat(5 - dailyLog.rating)}</span>
          </div>
          <div class="flex flex-wrap gap-1 mb-2">${renderMoodTagsHtml(dailyLog.moodTags)}</div>
          <div class="flex gap-2">
            <button type="button" data-edit-daily="${dailyLog.id}" class="btn-ghost text-xs">编辑今日复盘</button>
            <button type="button" data-delete-daily="${dailyLog.id}" class="btn-ghost btn-danger text-xs">删除</button>
          </div>
        </div>`
        : `
        <div class="history-daily-block rounded-lg bg-slate-50 border border-dashed border-slate-200 p-3 mb-3">
          <p class="text-xs text-slate-500">当天未记录今日复盘（整体评分与状态）</p>
        </div>`;

      const domainSection =
        dayReviews.length > 0
          ? `
        <div>
          <p class="text-xs font-semibold text-slate-600 mb-2">领域复盘 · ${dayReviews.length} 条</p>
          <div class="space-y-2">
            ${dayReviews.map((r) => renderDomainReviewItemHtml(state, r)).join('')}
          </div>
        </div>`
          : `<p class="text-xs text-slate-400">当天无领域复盘</p>`;

      return `
        <article class="bg-white rounded-xl shadow p-4">
          <header class="flex items-center gap-2 flex-wrap mb-3 pb-3 border-b border-slate-100">
            <h3 class="font-semibold text-slate-800">${escapeHtml(formatDateKey(dateKey))}</h3>
            ${isToday ? '<span class="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">今天</span>' : ''}
          </header>
          ${dailySection}
          ${domainSection}
        </article>`;
    })
    .join('');

  container.querySelectorAll('[data-edit-daily]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const log = state.dailyLogs.find((d) => d.id === btn.dataset.editDaily);
      if (log) openEditDailyLogDialog(log);
    });
  });
  container.querySelectorAll('[data-delete-daily]').forEach((btn) => {
    btn.addEventListener('click', () => deleteDailyLog(btn.dataset.deleteDaily));
  });

  bindDomainReviewActions(container, state);
}

function renderDomainFilterChips(state) {
  const container = document.getElementById('history-domain-filters');
  if (!container) return;

  const sorted = [...state.domains].sort((a, b) => a.order - b.order);
  const allActive = historyDomainFilter === 'all' ? ' selected' : '';

  container.innerHTML = `
    <button type="button" class="domain-filter-chip${allActive}" data-domain-filter="all">全部</button>
    ${sorted
      .map((d) => {
        const active = historyDomainFilter === d.id ? ' selected' : '';
        return `<button type="button" class="domain-filter-chip${active}" data-domain-filter="${d.id}">
          <span class="w-2 h-2 rounded-full inline-block shrink-0" style="background:${d.color}"></span>
          ${escapeHtml(d.name)}
        </button>`;
      })
      .join('')}`;
}

export function renderHistoryByDomain() {
  const container = document.getElementById('history-by-domain-list');
  if (!container) return;

  const state = loadState();
  renderDomainFilterChips(state);

  let reviews = [...state.domainReviews].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  if (historyDomainFilter !== 'all') {
    reviews = reviews.filter((r) => r.domainId === historyDomainFilter);
  }

  const viewMode = state.settings.historyView;
  const domain =
    historyDomainFilter !== 'all' ? getDomain(state, historyDomainFilter) : null;
  const titleEl = document.getElementById('history-by-domain-title');
  if (titleEl) {
    titleEl.textContent =
      historyDomainFilter === 'all'
        ? `全部领域 · 共 ${reviews.length} 条`
        : `${domain?.name || '领域'} · 共 ${reviews.length} 条`;
  }

  if (!reviews.length) {
    container.className = 'space-y-3';
    container.innerHTML =
      '<p class="text-slate-500 text-center py-8 text-sm">该筛选下暂无领域复盘</p>';
    return;
  }

  container.className = viewMode === 'card' ? 'grid gap-3 sm:grid-cols-2' : 'space-y-3';

  container.innerHTML = reviews
    .map((r) => {
      const showDomainName = historyDomainFilter === 'all';
      const domainItem = getDomain(state, r.domainId);
      if (viewMode === 'card') {
        return `
        <article class="bg-white rounded-xl shadow p-4 flex flex-col gap-3">
          <div class="flex items-center gap-2 text-sm flex-wrap">
            ${showDomainName ? `<span class="w-2 h-2 rounded-full shrink-0" style="background:${domainItem?.color || '#94a3b8'}"></span><span class="font-medium">${escapeHtml(domainItem?.name || '')}</span>` : ''}
            <span class="text-slate-600 text-xs">${escapeHtml(formatDateKey(getDateKey(r.createdAt)))}</span>
            ${renderRatingStarsHtml(r.rating)}
          </div>
          ${renderReviewBodyHtml(r)}
          <div class="flex flex-wrap gap-2">
            <button type="button" data-extract="${r.id}" class="btn-ghost text-xs">提炼归纳</button>
            <button type="button" data-edit-domain-review="${r.id}" class="btn-ghost text-xs">编辑</button>
            <button type="button" data-delete-domain-review="${r.id}" class="btn-ghost btn-danger text-xs">删除</button>
          </div>
        </article>`;
      }
      return `
        <article class="bg-white rounded-xl shadow p-4 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 text-sm mb-2 flex-wrap">
              ${showDomainName ? `<span class="w-2 h-2 rounded-full shrink-0" style="background:${domainItem?.color || '#94a3b8'}"></span><span class="font-medium">${escapeHtml(domainItem?.name || '')}</span>` : ''}
              <span class="text-slate-600">${escapeHtml(formatDateKey(getDateKey(r.createdAt)))}</span>
              ${renderRatingStarsHtml(r.rating)}
              <span class="text-slate-400 text-xs ml-auto">${formatDate(r.createdAt)}</span>
            </div>
            ${renderReviewBodyHtml(r)}
          </div>
          <div class="flex flex-wrap gap-2 shrink-0 self-start">
            <button type="button" data-extract="${r.id}" class="btn-ghost text-sm">提炼归纳</button>
            <button type="button" data-edit-domain-review="${r.id}" class="btn-ghost text-sm">编辑</button>
            <button type="button" data-delete-domain-review="${r.id}" class="btn-ghost btn-danger text-sm">删除</button>
          </div>
        </article>`;
    })
    .join('');

  bindDomainReviewActions(container, state);
}

function updateHistoryTabUI() {
  document.getElementById('history-panel-day')?.classList.toggle('hidden', historyTab !== 'day');
  document.getElementById('history-panel-domain')?.classList.toggle('hidden', historyTab !== 'domain');
  document.querySelectorAll('[data-history-tab]').forEach((btn) => {
    btn.classList.toggle('history-tab-active', btn.dataset.historyTab === historyTab);
  });
}

export function renderAllHistory() {
  updateHistoryTabUI();
  if (historyTab === 'day') renderHistoryByDay();
  else renderHistoryByDomain();
}

export function bindHistoryUI() {
  document.querySelectorAll('[data-history-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      historyTab = btn.dataset.historyTab;
      const state = loadState();
      state.settings.historyTab = historyTab;
      saveState(state);
      renderAllHistory();
    });
  });

  document.getElementById('history-domain-filters')?.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-domain-filter]');
    if (!chip) return;
    historyDomainFilter = chip.dataset.domainFilter;
    renderHistoryByDomain();
  });

  document.getElementById('history-view-list')?.addEventListener('click', () => {
    const state = loadState();
    state.settings.historyView = 'list';
    saveState(state);
    renderHistoryByDomain();
  });

  document.getElementById('history-view-card')?.addEventListener('click', () => {
    const state = loadState();
    state.settings.historyView = 'card';
    saveState(state);
    renderHistoryByDomain();
  });

  const state = loadState();
  historyTab = state.settings.historyTab || 'day';
  historyDomainFilter = 'all';
}
