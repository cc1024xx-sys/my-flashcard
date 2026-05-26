import { renderDomains, bindDomainForm, bindEditDomainForm } from './domains.js';
import { bindDomainReviewForm, bindEditDomainReviewForm, setOnDomainReviewsChanged } from './reviews.js';
import {
  bindDailyLogForm,
  bindEditDailyLogForm,
  loadTodayDailyLogIntoForm,
  setOnDailyLogChanged,
} from './dailyLog.js';
import { renderAllHistory, bindHistoryUI } from './history.js';
import { bindReportUI, renderReport } from './reports.js';
import { bindBackupUI } from './backup.js';

const VIEWS = ['daily', 'domain-review', 'history', 'report', 'domains'];

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
  if (name === 'report') renderReport();
  if (name === 'domains') renderDomains();
}

function refreshAllViews() {
  loadTodayDailyLogIntoForm();
  renderDomains();
  renderAllHistory();
  renderReport();
}

function init() {
  document.querySelectorAll('#main-nav [data-view]').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  bindDomainForm();
  bindEditDomainForm(() => {
    renderAllHistory();
    renderReport();
  });
  bindDailyLogForm();
  bindEditDailyLogForm();
  setOnDailyLogChanged(() => renderReport());
  bindDomainReviewForm();
  bindEditDomainReviewForm();
  bindHistoryUI();
  bindReportUI();
  setOnDomainReviewsChanged(() => renderReport());
  bindBackupUI(refreshAllViews);

  renderDomains();
  switchView('daily');
}

document.addEventListener('DOMContentLoaded', init);
