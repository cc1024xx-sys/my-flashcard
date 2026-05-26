import { loadState, saveState, getDomain } from './storage.js';
import { REVIEW_TYPE_OPTIONS } from './config.js';
import { formatDateKey, escapeHtml, getDateKey } from './utils.js';
import { renderReviewBodyHtml, renderReviewTypeBadgeHtml } from './reviews.js';

const PERIODS = ['week', 'month', 'year'];

function parseAnchorDate(iso) {
  const [y, m, d] = String(iso || getDateKey()).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 周一 00:00 */
function startOfWeekMonday(d) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfWeekSunday(weekStart) {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function startOfYear(d) {
  return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
}

function endOfYear(d) {
  return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
}

export function getPeriodRange(period, anchorDate) {
  const anchor = parseAnchorDate(anchorDate);
  if (period === 'week') {
    const start = startOfWeekMonday(anchor);
    return { start, end: endOfWeekSunday(start) };
  }
  if (period === 'month') {
    const start = startOfMonth(anchor);
    return { start, end: endOfMonth(anchor) };
  }
  const start = startOfYear(anchor);
  return { start, end: endOfYear(anchor) };
}

function dateKeyToTime(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

function isDateKeyInRange(dateKey, start, end) {
  const t = dateKeyToTime(dateKey);
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return t >= s && t <= e;
}

function isIsoInRange(iso, start, end) {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function formatShortDate(d) {
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

export function getPeriodLabel(period, range) {
  const { start, end } = range;
  if (period === 'week') {
    return `${formatShortDate(start)} – ${formatShortDate(end)}`;
  }
  if (period === 'month') {
    return start.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
  }
  return `${start.getFullYear()} 年`;
}

function shiftAnchor(period, anchorDate, delta) {
  const d = parseAnchorDate(anchorDate);
  if (period === 'week') {
    d.setDate(d.getDate() + delta * 7);
  } else if (period === 'month') {
    d.setMonth(d.getMonth() + delta);
  } else {
    d.setFullYear(d.getFullYear() + delta);
  }
  return getDateKey(d);
}

export function buildReportData(state, range) {
  const dailyInRange = state.dailyLogs.filter((log) =>
    isDateKeyInRange(log.dateKey, range.start, range.end)
  );
  const reviewsInRange = state.domainReviews.filter((r) =>
    isIsoInRange(r.createdAt, range.start, range.end)
  );

  const sortedDomains = [...state.domains].sort((a, b) => a.order - b.order);
  const domainStats = sortedDomains
    .map((domain) => {
      const list = reviewsInRange.filter((r) => r.domainId === domain.id);
      const byType = Object.fromEntries(
        REVIEW_TYPE_OPTIONS.map(({ id }) => [
          id,
          list.filter((r) => (r.reviewType || 'pitfall') === id).length,
        ])
      );
      return { domain, total: list.length, byType };
    })
    .filter((x) => x.total > 0);

  const highlights = reviewsInRange
    .filter((r) => r.highlighted)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const avgRating =
    dailyInRange.length > 0
      ? (
          dailyInRange.reduce((s, d) => s + Number(d.rating || 0), 0) / dailyInRange.length
        ).toFixed(1)
      : null;

  return {
    dailyCount: dailyInRange.length,
    reviewCount: reviewsInRange.length,
    domainStats,
    highlights,
    dailyInRange,
    avgRating,
  };
}

function renderTypeBreakdown(byType) {
  return REVIEW_TYPE_OPTIONS.map(({ id, label }) => {
    const n = byType[id] || 0;
    return `<span class="report-type-stat">${escapeHtml(label)} ${n} 次</span>`;
  }).join('');
}

function renderHighlightCard(state, r) {
  const domain = getDomain(state, r.domainId);
  return `
    <article class="report-highlight-item bg-amber-50/60 border border-amber-100 rounded-lg p-4">
      <div class="flex items-center gap-2 text-sm mb-2 flex-wrap">
        <span class="w-2 h-2 rounded-full shrink-0" style="background:${domain?.color || '#94a3b8'}"></span>
        <span class="font-medium text-slate-800">${escapeHtml(domain?.name || '未知领域')}</span>
        ${renderReviewTypeBadgeHtml(r.reviewType)}
        <span class="text-slate-400 text-xs ml-auto">${escapeHtml(formatDateKey(getDateKey(r.createdAt)))}</span>
      </div>
      <div class="text-sm">${renderReviewBodyHtml(r)}</div>
    </article>`;
}

function renderReportHtml(state, period, range, data) {
  const title = getPeriodLabel(period, range);
  const periodWord = period === 'week' ? '周' : period === 'month' ? '月' : '年';

  const summaryParts = [
    `本${periodWord}度共记录 <strong>${data.dailyCount}</strong> 天今日复盘`,
    `完成领域复盘 <strong>${data.reviewCount}</strong> 次`,
  ];
  if (data.avgRating) {
    summaryParts.push(`今日复盘平均评分 <strong>${data.avgRating}</strong> 星`);
  }

  const domainHtml =
    data.domainStats.length > 0
      ? data.domainStats
          .map(({ domain, total, byType }) => `
        <section class="report-domain-block bg-white rounded-xl shadow p-4">
          <h4 class="font-semibold text-slate-800 flex items-center gap-2 mb-2">
            <span class="w-2.5 h-2.5 rounded-full" style="background:${domain.color}"></span>
            ${escapeHtml(domain.name)}
          </h4>
          <p class="text-sm text-slate-700 mb-2">完成复盘 <strong>${total}</strong> 次</p>
          <div class="report-type-breakdown flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
            ${renderTypeBreakdown(byType)}
          </div>
        </section>`)
          .join('')
      : `<p class="text-sm text-slate-500 bg-white rounded-xl shadow p-4">本周期暂无领域复盘记录。</p>`;

  const highlightsHtml =
    data.highlights.length > 0
      ? `
      <section class="space-y-3">
        <h3 class="text-base font-semibold text-slate-800">最有价值的复盘</h3>
        <p class="text-xs text-slate-500">在历史记录中可将复盘标为「有价值」，此处展示本周期内的标亮条目。</p>
        ${data.highlights.map((r) => renderHighlightCard(state, r)).join('')}
      </section>`
      : `
      <section class="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4">
        <h3 class="text-sm font-medium text-slate-700 mb-1">最有价值的复盘</h3>
        <p class="text-xs text-slate-500">本周期暂无标亮复盘。可在「历史记录」中将重要复盘标为有价值。</p>
      </section>`;

  if (data.dailyCount === 0 && data.reviewCount === 0) {
    return `
      <div class="report-document space-y-4">
        <header class="bg-white rounded-xl shadow p-5">
          <h3 class="text-lg font-semibold text-indigo-800">${escapeHtml(title)} 自我报告</h3>
        </header>
        <p class="text-slate-500 text-center py-10 text-sm bg-white rounded-xl shadow">
          本周期还没有今日复盘或领域复盘，先去记录几条再来生成报告吧。
        </p>
      </div>`;
  }

  return `
    <div class="report-document space-y-4">
      <header class="bg-white rounded-xl shadow p-5">
        <h3 class="text-lg font-semibold text-indigo-800">${escapeHtml(title)} 自我报告</h3>
        <p class="text-sm text-slate-600 mt-2">${summaryParts.join('，')}。</p>
      </header>
      <section class="space-y-3">
        <h3 class="text-base font-semibold text-slate-800">领域复盘统计</h3>
        ${domainHtml}
      </section>
      ${highlightsHtml}
    </div>`;
}

export function renderReport() {
  const state = loadState();
  const period = PERIODS.includes(state.settings.reportPeriod)
    ? state.settings.reportPeriod
    : 'week';
  const anchor = state.settings.reportAnchorDate || getDateKey();
  const range = getPeriodRange(period, anchor);
  const data = buildReportData(state, range);

  const labelEl = document.getElementById('report-period-label');
  if (labelEl) labelEl.textContent = getPeriodLabel(period, range);

  document.querySelectorAll('[data-report-period]').forEach((btn) => {
    btn.classList.toggle('history-tab-active', btn.dataset.reportPeriod === period);
  });

  const output = document.getElementById('report-output');
  if (output) {
    output.innerHTML = renderReportHtml(state, period, range, data);
  }
}

export function bindReportUI() {
  document.querySelectorAll('[data-report-period]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const period = btn.dataset.reportPeriod;
      if (!PERIODS.includes(period)) return;
      const state = loadState();
      state.settings.reportPeriod = period;
      saveState(state);
      renderReport();
    });
  });

  document.getElementById('report-prev')?.addEventListener('click', () => {
    const state = loadState();
    const period = state.settings.reportPeriod || 'week';
    const anchor = state.settings.reportAnchorDate || getDateKey();
    state.settings.reportAnchorDate = shiftAnchor(period, anchor, -1);
    saveState(state);
    renderReport();
  });

  document.getElementById('report-next')?.addEventListener('click', () => {
    const state = loadState();
    const period = state.settings.reportPeriod || 'week';
    const anchor = state.settings.reportAnchorDate || getDateKey();
    state.settings.reportAnchorDate = shiftAnchor(period, anchor, 1);
    saveState(state);
    renderReport();
  });

  document.getElementById('report-today')?.addEventListener('click', () => {
    const state = loadState();
    state.settings.reportAnchorDate = getDateKey();
    saveState(state);
    renderReport();
  });
}
