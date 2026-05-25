import { renderDomains, bindDomainForm, bindEditDomainForm } from './domains.js';
import { bindDomainReviewForm, bindEditDomainReviewForm, setOnDomainReviewsChanged } from './reviews.js';
import { bindDailyLogForm, bindEditDailyLogForm, loadTodayDailyLogIntoForm } from './dailyLog.js';
import { renderAllHistory, bindHistoryUI } from './history.js';
import { bindExtractForm, bindEditFlashcardForm, renderFlashcards } from './flashcards.js';
import { loadState, saveState } from './storage.js';
import { hydrateStateFromCloud } from './cloudSync.js';
import { bindBackupUI } from './backup.js';

const VIEWS = ['daily', 'domain-review', 'history', 'flashcards', 'domains'];

function switchView(name) {
  VIEWS.forEach((v) => {
    const panel = document.getElementById(`view-${v}`);
    panel?.classList.toggle('hidden', v !== name);
  });

  document.querySelectorAll('#main-nav .nav-btn').forEach((btn) => {
    btn.classList.toggle('nav-btn-active', btn.dataset.view === name);
  });

  if (name === 'daily') loadTodayDailyLogIntoForm();
  if (name === 'history') renderAllHistory();
  if (name === 'flashcards') renderFlashcards();
  if (name === 'domains') renderDomains();
}

async function init() {
  const hydrated = await hydrateStateFromCloud();
  if (hydrated) {
    // 走一遍 normalize 逻辑并写回，确保兼容旧字段结构。
    const normalized = loadState();
    saveState(normalized, { skipCloudSync: true });
  }

  document.querySelectorAll('#main-nav [data-view]').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  bindDomainForm();
  bindEditDomainForm(() => {
    renderAllHistory();
    renderFlashcards();
  });
  bindDailyLogForm();
  bindEditDailyLogForm();
  bindDomainReviewForm();
  bindEditDomainReviewForm();
  bindHistoryUI();
  bindExtractForm();
  bindEditFlashcardForm();
  setOnDomainReviewsChanged(() => renderFlashcards());

  bindBackupUI(refreshAllViews);

  renderDomains();
  switchView('daily');
}

function refreshAllViews() {
  loadTodayDailyLogIntoForm();
  renderDomains();
  renderAllHistory();
  renderFlashcards();
}

document.addEventListener('DOMContentLoaded', () => {
  void init();
});
