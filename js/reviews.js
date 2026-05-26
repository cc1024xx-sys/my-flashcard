import { loadState, saveState } from './storage.js';
import { REVIEW_TYPE_OPTIONS, DEFAULT_REVIEW_TYPE, REVIEW_TYPE_MAP } from './config.js';
import { uid, showToast, escapeHtml, buildReviewContent, getReviewFullText } from './utils.js';

let onDomainReviewsChanged = null;

export function setOnDomainReviewsChanged(callback) {
  onDomainReviewsChanged = callback;
}

export const setOnReviewsChanged = setOnDomainReviewsChanged;

function populateDomainSelect(selectEl, selectedId) {
  const state = loadState();
  const sorted = [...state.domains].sort((a, b) => a.order - b.order);
  selectEl.innerHTML = sorted
    .map(
      (d) =>
        `<option value="${d.id}"${d.id === selectedId ? ' selected' : ''}>${escapeHtml(d.name)}</option>`
    )
    .join('');
}

function renderReviewTypePicker(containerId, selectedType = DEFAULT_REVIEW_TYPE) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = REVIEW_TYPE_OPTIONS.map(
    ({ id, label, color }) => `
    <button
      type="button"
      class="review-type-chip${id === selectedType ? ' selected' : ''}"
      data-review-type="${id}"
      style="--chip-color:${color}"
    >${escapeHtml(label)}</button>`
  ).join('');

  container.querySelectorAll('.review-type-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.review-type-chip').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      const hidden = document.getElementById(`${containerId}-value`);
      if (hidden) hidden.value = btn.dataset.reviewType;
    });
  });

  const hidden = document.getElementById(`${containerId}-value`);
  if (hidden) hidden.value = selectedType;
}

function getSelectedReviewType(containerId) {
  const hidden = document.getElementById(`${containerId}-value`);
  if (hidden?.value) return hidden.value;
  const selected = document.querySelector(`#${containerId} .review-type-chip.selected`);
  return selected?.dataset.reviewType || DEFAULT_REVIEW_TYPE;
}

function readReviewFromForm(prefix) {
  const title = document.getElementById(`${prefix}title`)?.value?.trim() ?? '';
  const body = document.getElementById(`${prefix}body`)?.value?.trim() ?? '';
  const typeContainerId = prefix === 'domain-review-' ? 'domain-review-types' : 'edit-domain-review-types';
  const reviewType = getSelectedReviewType(typeContainerId);
  return { title, body, reviewType };
}

function refreshHistory() {
  import('./history.js').then((m) => m.renderAllHistory());
}

export function getReviewTypeLabel(reviewType) {
  return REVIEW_TYPE_MAP[reviewType]?.label || '复盘';
}

export function renderReviewTypeBadgeHtml(reviewType) {
  const meta = REVIEW_TYPE_MAP[reviewType];
  if (!meta) return '';
  return `<span class="review-type-badge" style="background:${meta.color}20;color:${meta.color};border-color:${meta.color}40">${escapeHtml(meta.label)}</span>`;
}

export function renderReviewBodyHtml(r) {
  const title = String(r.title ?? '').trim();
  const body = String(r.body ?? '').trim();
  const legacyBody = !title && !body ? getReviewFullText(r) : '';

  if (title) {
    return `
      <p class="font-medium text-slate-800">${escapeHtml(title)}</p>
      ${body ? `<p class="text-slate-700 whitespace-pre-wrap mt-1.5 text-sm">${escapeHtml(body)}</p>` : ''}`;
  }
  if (body) {
    return `<p class="text-slate-700 whitespace-pre-wrap text-sm">${escapeHtml(body)}</p>`;
  }
  if (legacyBody) {
    return `<p class="text-slate-700 whitespace-pre-wrap text-sm">${escapeHtml(legacyBody)}</p>`;
  }
  return `<p class="text-slate-500 text-sm">（无正文）</p>`;
}

export function initDomainReviewForm() {
  const state = loadState();
  populateDomainSelect(document.getElementById('domain-review-domain'), state.domains[0]?.id);
  const lastType = sessionStorage.getItem('last_review_type') || DEFAULT_REVIEW_TYPE;
  renderReviewTypePicker('domain-review-types', lastType);
}

export function bindDomainReviewForm() {
  initDomainReviewForm();

  const form = document.getElementById('domain-review-form');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const domainId = document.getElementById('domain-review-domain')?.value;
    const { title, body, reviewType } = readReviewFromForm('domain-review-');

    if (!title && !body) {
      showToast('请填写标题或正文');
      return;
    }

    const content = buildReviewContent(title, body);
    const state = loadState();
    state.domainReviews.unshift({
      id: uid('r'),
      domainId,
      reviewType,
      title,
      body,
      content,
      createdAt: new Date().toISOString(),
    });
    saveState(state);
    sessionStorage.setItem('last_review_type', reviewType);

    form.reset();
    initDomainReviewForm();
    showToast('领域复盘已保存');
    refreshHistory();
  });
}

export const bindReviewForm = bindDomainReviewForm;

export function openEditDomainReviewDialog(review) {
  const dialog = document.getElementById('edit-domain-review-dialog');
  const domainSelect = document.getElementById('edit-domain-review-domain');
  const idInput = document.getElementById('edit-domain-review-id');

  if (!dialog || !review) return;

  populateDomainSelect(domainSelect, review.domainId);
  idInput.value = review.id;

  const reviewType = review.reviewType || DEFAULT_REVIEW_TYPE;
  renderReviewTypePicker('edit-domain-review-types', reviewType);

  document.getElementById('edit-domain-review-title').value = String(review.title ?? '').trim();
  const bodyVal =
    String(review.body ?? '').trim() ||
    (!review.title && !review.body ? getReviewFullText(review) : '');
  document.getElementById('edit-domain-review-body').value = bodyVal;

  dialog.showModal();
}

export function toggleReviewHighlight(reviewId) {
  const state = loadState();
  const review = state.domainReviews.find((r) => r.id === reviewId);
  if (!review) return;

  review.highlighted = !review.highlighted;
  if (review.highlighted) {
    review.highlightedAt = new Date().toISOString();
  } else {
    delete review.highlightedAt;
  }
  saveState(state);
  showToast(review.highlighted ? '已标为有价值' : '已取消标亮');
  refreshHistory();
  onDomainReviewsChanged?.();
}

export function deleteDomainReview(reviewId) {
  const state = loadState();
  const review = state.domainReviews.find((r) => r.id === reviewId);
  if (!review) return;

  if (!confirm('确定删除这条领域复盘吗？')) return;

  state.domainReviews = state.domainReviews.filter((r) => r.id !== reviewId);
  saveState(state);
  showToast('领域复盘已删除');
  refreshHistory();
  onDomainReviewsChanged?.();
}

export function bindEditDomainReviewForm() {
  const dialog = document.getElementById('edit-domain-review-dialog');
  document.getElementById('edit-domain-review-cancel')?.addEventListener('click', () => dialog?.close());

  document.getElementById('edit-domain-review-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-domain-review-id')?.value;
    const domainId = document.getElementById('edit-domain-review-domain')?.value;
    const { title, body, reviewType } = readReviewFromForm('edit-domain-review-');

    if (!title && !body) {
      showToast('请填写标题或正文');
      return;
    }

    const state = loadState();
    const review = state.domainReviews.find((r) => r.id === id);
    if (!review) return;

    const content = buildReviewContent(title, body);

    review.domainId = domainId;
    review.reviewType = reviewType;
    review.title = title;
    review.body = body;
    review.content = content;
    review.updatedAt = new Date().toISOString();
    delete review.keep;
    delete review.problem;
    delete review.nextStep;
    delete review.rating;

    saveState(state);
    dialog?.close();
    showToast('领域复盘已更新');
    refreshHistory();
    onDomainReviewsChanged?.();
  });
}

export const bindEditReviewForm = bindEditDomainReviewForm;
