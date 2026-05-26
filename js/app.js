import { renderDomains, bindDomainForm, bindEditDomainForm } from './domains.js';
import { bindDomainReviewForm, bindEditDomainReviewForm, setOnDomainReviewsChanged } from './reviews.js';
import { bindDailyLogForm, bindEditDailyLogForm, loadTodayDailyLogIntoForm } from './dailyLog.js';
import { renderAllHistory, bindHistoryUI } from './history.js';
import { bindExtractForm, bindEditFlashcardForm, renderFlashcards } from './flashcards.js';
import { bindBackupUI } from './backup.js';
import {
  initAuth,
  bindAuthUI,
  showAuthGateIfNeeded,
  hideAuthGate,
  setOnLoginSuccess,
  isSupabaseConfigured,
} from './auth.js';
import { getActiveUserId } from './session.js';

const VIEWS = ['daily', 'domain-review', 'history', 'flashcards', 'domains'];

let appBooted = false;

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

function refreshAllViews() {
  loadTodayDailyLogIntoForm();
  renderDomains();
  renderAllHistory();
  renderFlashcards();
}

function bootApp() {
  if (appBooted) {
    refreshAllViews();
    return;
  }
  appBooted = true;

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

async function init() {
  bindAuthUI();
  setOnLoginSuccess(() => bootApp());

  await initAuth();

  if (isSupabaseConfigured()) {
    if (showAuthGateIfNeeded()) return;
    hideAuthGate();
  }

  if (isSupabaseConfigured() && !getActiveUserId()) return;

  bootApp();
}

document.addEventListener('DOMContentLoaded', () => {
  void init();
});
