import { loadState, saveState, getTodayDailyLog, upsertTodayDailyLog } from './storage.js';
import { MOOD_TAG_OPTIONS, MOOD_TAG_EMOJI } from './config.js';
import {
  formatDate,
  formatDateKey,
  showToast,
  escapeHtml,
  renderStars,
  getDateKey,
} from './utils.js';

let dailyRating = 0;
let dailyStarsContainer = null;
let editDailyRating = 0;
let editDailyStarsContainer = null;

function renderMoodTagPicker(containerId, selectedTags = []) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const selected = new Set(selectedTags);

  container.innerHTML = MOOD_TAG_OPTIONS.map(
    ({ tag, emoji }) => `
    <button
      type="button"
      class="mood-chip${selected.has(tag) ? ' selected' : ''}"
      data-tag="${escapeHtml(tag)}"
      aria-pressed="${selected.has(tag)}"
      aria-label="${escapeHtml(tag)}"
    ><span class="mood-chip-emoji" aria-hidden="true">${emoji}</span>${escapeHtml(tag)}</button>`
  ).join('');

  container.querySelectorAll('.mood-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('selected');
      btn.setAttribute('aria-pressed', btn.classList.contains('selected'));
    });
  });
}

function getSelectedMoodTags(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return [...container.querySelectorAll('.mood-chip.selected')].map((b) => b.dataset.tag);
}

function setMoodTagsSelection(containerId, tags) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const set = new Set(tags || []);
  container.querySelectorAll('.mood-chip').forEach((btn) => {
    const on = set.has(btn.dataset.tag);
    btn.classList.toggle('selected', on);
    btn.setAttribute('aria-pressed', String(on));
  });
}

function updateDailyRatingStars() {
  if (!dailyStarsContainer) return;
  renderStars(dailyStarsContainer, dailyRating, {
    interactive: true,
    onChange: (n) => {
      dailyRating = n;
      document.getElementById('daily-rating').value = String(n);
      updateDailyRatingStars();
    },
  });
}

function updateEditDailyRatingStars() {
  if (!editDailyStarsContainer) return;
  renderStars(editDailyStarsContainer, editDailyRating, {
    interactive: true,
    onChange: (n) => {
      editDailyRating = n;
      document.getElementById('edit-daily-rating').value = String(n);
      updateEditDailyRatingStars();
    },
  });
}

function formatMoodTagLabel(tag) {
  const emoji = MOOD_TAG_EMOJI[tag] ?? '';
  return emoji ? `${emoji} ${tag}` : tag;
}

export function loadTodayDailyLogIntoForm() {
  dailyStarsContainer = document.getElementById('daily-rating-stars');
  const dateEl = document.getElementById('daily-date-label');
  if (dateEl) dateEl.textContent = formatDateKey(getDateKey());

  const state = loadState();
  const today = getTodayDailyLog(state);

  dailyRating = today?.rating ?? 0;
  document.getElementById('daily-rating').value = String(dailyRating);
  updateDailyRatingStars();
  renderMoodTagPicker('daily-mood-tags', today?.moodTags ?? []);
}

export function renderMoodTagsHtml(tags) {
  if (!tags?.length) {
    return '<span class="text-xs text-slate-400">未选择状态标签</span>';
  }
  return tags
    .map(
      (t) =>
        `<span class="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded inline-flex items-center gap-0.5">${escapeHtml(formatMoodTagLabel(t))}</span>`
    )
    .join(' ');
}

export function bindDailyLogForm() {
  loadTodayDailyLogIntoForm();

  document.getElementById('daily-log-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const rating = Number(document.getElementById('daily-rating')?.value);
    const moodTags = getSelectedMoodTags('daily-mood-tags');

    if (rating < 1) {
      showToast('请选择今日 1-5 星评分');
      return;
    }

    const state = loadState();
    upsertTodayDailyLog(state, { rating, moodTags });
    saveState(state);
    showToast('今日复盘已保存（同天再次保存将覆盖）');
    refreshHistory();
  });
}

function refreshHistory() {
  import('./history.js').then((m) => m.renderAllHistory());
}

export function openEditDailyLogDialog(log) {
  const dialog = document.getElementById('edit-daily-dialog');
  if (!dialog || !log) return;

  document.getElementById('edit-daily-id').value = log.id;
  document.getElementById('edit-daily-date-label').textContent = formatDateKey(log.dateKey);

  editDailyStarsContainer = document.getElementById('edit-daily-rating-stars');
  editDailyRating = log.rating;
  document.getElementById('edit-daily-rating').value = String(log.rating);
  updateEditDailyRatingStars();
  renderMoodTagPicker('edit-daily-mood-tags');
  setMoodTagsSelection('edit-daily-mood-tags', log.moodTags ?? []);
  dialog.showModal();
}

export function bindEditDailyLogForm() {
  const dialog = document.getElementById('edit-daily-dialog');
  document.getElementById('edit-daily-cancel')?.addEventListener('click', () => dialog?.close());

  document.getElementById('edit-daily-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-daily-id')?.value;
    const rating = Number(document.getElementById('edit-daily-rating')?.value);
    const moodTags = getSelectedMoodTags('edit-daily-mood-tags');

    if (rating < 1) {
      showToast('请选择 1-5 星评分');
      return;
    }

    const state = loadState();
    const log = state.dailyLogs.find((d) => d.id === id);
    if (!log) return;

    log.rating = rating;
    log.moodTags = moodTags;
    log.updatedAt = new Date().toISOString();
    saveState(state);
    dialog?.close();
    showToast('今日复盘已更新');

    if (log.dateKey === getDateKey()) loadTodayDailyLogIntoForm();
    refreshHistory();
  });
}

export function deleteDailyLog(id) {
  if (!confirm('确定删除这条今日复盘记录吗？')) return;
  const state = loadState();
  const log = state.dailyLogs.find((d) => d.id === id);
  state.dailyLogs = state.dailyLogs.filter((d) => d.id !== id);
  saveState(state);
  if (log?.dateKey === getDateKey()) loadTodayDailyLogIntoForm();
  showToast('已删除');
  refreshHistory();
}

