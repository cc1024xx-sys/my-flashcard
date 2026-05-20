import { loadState, saveState } from './storage.js';
import {
  uid,
  showToast,
  escapeHtml,
  buildStructuredReviewContent,
  hasStructuredReviewFields,
  renderStars,
} from './utils.js';

let onDomainReviewsChanged = null;

let domainReviewRating = 0;
let domainReviewStarsContainer = null;
let editDomainReviewRating = 0;
let editDomainReviewStarsContainer = null;

export function setOnDomainReviewsChanged(callback) {
  onDomainReviewsChanged = callback;
}

/** @deprecated 兼容 app.js 旧名 */
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

function readReviewPartsFromForm(prefix) {
  const keep = document.getElementById(`${prefix}keep`)?.value ?? '';
  const problem = document.getElementById(`${prefix}problem`)?.value ?? '';
  const next = document.getElementById(`${prefix}next`)?.value ?? '';
  return {
    keep: keep.trim(),
    problem: problem.trim(),
    nextStep: next.trim(),
  };
}

function updateDomainReviewRatingStars() {
  if (!domainReviewStarsContainer) return;
  renderStars(domainReviewStarsContainer, domainReviewRating, {
    interactive: true,
    onChange: (n) => {
      domainReviewRating = n;
      document.getElementById('domain-review-rating').value = String(n);
      updateDomainReviewRatingStars();
    },
  });
}

function updateEditDomainReviewRatingStars() {
  if (!editDomainReviewStarsContainer) return;
  renderStars(editDomainReviewStarsContainer, editDomainReviewRating, {
    interactive: true,
    onChange: (n) => {
      editDomainReviewRating = n;
      document.getElementById('edit-domain-review-rating').value = String(n);
      updateEditDomainReviewRatingStars();
    },
  });
}

function resetDomainReviewRating() {
  domainReviewRating = 0;
  const input = document.getElementById('domain-review-rating');
  if (input) input.value = '0';
  updateDomainReviewRatingStars();
}

function refreshHistory() {
  import('./history.js').then((m) => m.renderAllHistory());
}

export function renderRatingStarsHtml(rating) {
  const r = Number(rating);
  if (r < 1) return '';
  return `<span class="text-amber-500 text-sm shrink-0" aria-label="${r} 星">${'★'.repeat(r)}${'☆'.repeat(5 - r)}</span>`;
}

export function renderReviewBodyHtml(r) {
  if (hasStructuredReviewFields(r)) {
    const blocks = [];
    if (String(r.keep ?? '').trim()) {
      blocks.push(
        `<div class="mb-2 last:mb-0"><p class="text-xs font-semibold text-emerald-700">继续保持</p><p class="text-slate-700 whitespace-pre-wrap mt-0.5">${escapeHtml(String(r.keep).trim())}</p></div>`
      );
    }
    if (String(r.problem ?? '').trim()) {
      blocks.push(
        `<div class="mb-2 last:mb-0"><p class="text-xs font-semibold text-amber-700">问题 / 卡点</p><p class="text-slate-700 whitespace-pre-wrap mt-0.5">${escapeHtml(String(r.problem).trim())}</p></div>`
      );
    }
    if (String(r.nextStep ?? '').trim()) {
      blocks.push(
        `<div class="mb-2 last:mb-0"><p class="text-xs font-semibold text-indigo-700">下一步</p><p class="text-slate-700 whitespace-pre-wrap mt-0.5">${escapeHtml(String(r.nextStep).trim())}</p></div>`
      );
    }
    return blocks.join('') || `<p class="text-slate-500 text-sm">（无正文）</p>`;
  }
  return `<p class="text-slate-700 whitespace-pre-wrap">${escapeHtml(r.content || '')}</p>`;
}

export function initDomainReviewRating() {
  domainReviewStarsContainer = document.getElementById('domain-review-rating-stars');
  resetDomainReviewRating();
}

export function bindDomainReviewForm() {
  initDomainReviewRating();

  const form = document.getElementById('domain-review-form');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const domainId = document.getElementById('domain-review-domain')?.value;
    const { keep, problem, nextStep } = readReviewPartsFromForm('domain-review-');
    const rating = Number(document.getElementById('domain-review-rating')?.value);

    if (!keep && !problem && !nextStep) {
      showToast('请至少填写一项：继续保持、问题卡点或下一步');
      return;
    }
    if (rating < 1) {
      showToast('请选择 1-5 星整体评分');
      return;
    }

    const content = buildStructuredReviewContent(keep, problem, nextStep);
    const state = loadState();
    state.domainReviews.unshift({
      id: uid('r'),
      domainId,
      keep,
      problem,
      nextStep,
      content,
      rating,
      createdAt: new Date().toISOString(),
    });
    saveState(state);

    form.reset();
    resetDomainReviewRating();
    showToast('领域复盘已保存');
    refreshHistory();
  });
}

/** @deprecated */
export const bindReviewForm = bindDomainReviewForm;

export function openEditDomainReviewDialog(review) {
  const dialog = document.getElementById('edit-domain-review-dialog');
  const domainSelect = document.getElementById('edit-domain-review-domain');
  const idInput = document.getElementById('edit-domain-review-id');

  if (!dialog || !review) return;

  populateDomainSelect(domainSelect, review.domainId);
  idInput.value = review.id;

  if (hasStructuredReviewFields(review)) {
    document.getElementById('edit-domain-review-keep').value = String(review.keep ?? '').trim();
    document.getElementById('edit-domain-review-problem').value = String(review.problem ?? '').trim();
    document.getElementById('edit-domain-review-next').value = String(review.nextStep ?? '').trim();
  } else {
    document.getElementById('edit-domain-review-keep').value = String(review.content ?? '').trim();
    document.getElementById('edit-domain-review-problem').value = '';
    document.getElementById('edit-domain-review-next').value = '';
  }

  editDomainReviewStarsContainer = document.getElementById('edit-domain-review-rating-stars');
  editDomainReviewRating = Number(review.rating) >= 1 ? Number(review.rating) : 0;
  document.getElementById('edit-domain-review-rating').value = String(editDomainReviewRating);
  updateEditDomainReviewRatingStars();

  dialog.showModal();
}

export function deleteDomainReview(reviewId) {
  const state = loadState();
  const review = state.domainReviews.find((r) => r.id === reviewId);
  if (!review) return;

  const linkedFlashcards = state.flashcards.filter((f) => f.reviewId === reviewId);
  const msg =
    linkedFlashcards.length > 0
      ? `确定删除这条领域复盘吗？关联的 ${linkedFlashcards.length} 张闪卡也会一并删除。`
      : '确定删除这条领域复盘吗？';

  if (!confirm(msg)) return;

  state.domainReviews = state.domainReviews.filter((r) => r.id !== reviewId);
  state.flashcards = state.flashcards.filter((f) => f.reviewId !== reviewId);
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
    const { keep, problem, nextStep } = readReviewPartsFromForm('edit-domain-review-');
    const rating = Number(document.getElementById('edit-domain-review-rating')?.value);

    if (!keep && !problem && !nextStep) {
      showToast('请至少填写一项：继续保持、问题卡点或下一步');
      return;
    }
    if (rating < 1) {
      showToast('请选择 1-5 星整体评分');
      return;
    }

    const state = loadState();
    const review = state.domainReviews.find((r) => r.id === id);
    if (!review) return;

    const content = buildStructuredReviewContent(keep, problem, nextStep);

    review.domainId = domainId;
    review.keep = keep;
    review.problem = problem;
    review.nextStep = nextStep;
    review.content = content;
    review.rating = rating;
    review.updatedAt = new Date().toISOString();

    state.flashcards
      .filter((f) => f.reviewId === id)
      .forEach((f) => {
        f.domainId = domainId;
      });

    saveState(state);
    dialog?.close();
    showToast('领域复盘已更新');
    refreshHistory();
    onDomainReviewsChanged?.();
  });
}

export const bindEditReviewForm = bindEditDomainReviewForm;
