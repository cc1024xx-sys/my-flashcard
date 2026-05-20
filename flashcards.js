import { loadState, saveState, getDomain } from './storage.js';
import { uid, formatDate, showToast, escapeHtml, getReviewFullText } from './utils.js';

const expandedFlashcardIds = new Set();

/** 旧数据仅有 insight 时视为概念 */
function getFlashcardConcept(card) {
  const c = String(card?.concept ?? '').trim();
  if (c) return c;
  return String(card?.insight ?? '').trim();
}

function getFlashcardCognition(card) {
  return String(card?.cognition ?? '').trim();
}

function parseTags(raw) {
  return String(raw ?? '')
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function fillFlashcardDomainSelect(selectEl, selectedId) {
  if (!selectEl) return;
  const state = loadState();
  const sorted = [...state.domains].sort((a, b) => a.order - b.order);
  selectEl.innerHTML = sorted
    .map(
      (d) =>
        `<option value="${d.id}"${d.id === selectedId ? ' selected' : ''}>${escapeHtml(d.name)}</option>`
    )
    .join('');
}

export function openExtractDialog(review) {
  const dialog = document.getElementById('extract-dialog');
  const reviewIdInput = document.getElementById('extract-review-id');
  const preview = document.getElementById('extract-review-preview');

  if (!dialog || !review) return;

  reviewIdInput.value = review.id;
  const full = getReviewFullText(review).trim() || '（无正文）';
  const previewText = full.length > 120 ? `${full.slice(0, 120)}…` : full;
  preview.textContent = previewText;

  document.getElementById('extract-concept').value = '';
  document.getElementById('extract-cognition').value = '';
  document.getElementById('extract-tags').value = '';
  dialog.showModal();
}

function openEditFlashcardDialog(card) {
  const dialog = document.getElementById('edit-flashcard-dialog');
  if (!dialog || !card) return;

  document.getElementById('edit-flashcard-id').value = card.id;
  document.getElementById('edit-flashcard-concept').value = getFlashcardConcept(card);
  document.getElementById('edit-flashcard-cognition').value = getFlashcardCognition(card);
  document.getElementById('edit-flashcard-tags').value = (card.tags || []).join(', ');
  fillFlashcardDomainSelect(document.getElementById('edit-flashcard-domain'), card.domainId);
  dialog.showModal();
}

export function bindExtractForm() {
  const dialog = document.getElementById('extract-dialog');
  const cancelBtn = document.getElementById('extract-cancel');
  const form = document.getElementById('extract-form');
  const filterInput = document.getElementById('flashcard-filter');

  cancelBtn?.addEventListener('click', () => dialog?.close());

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const reviewId = document.getElementById('extract-review-id')?.value;
    const concept = document.getElementById('extract-concept')?.value.trim();
    const cognition = document.getElementById('extract-cognition')?.value.trim();
    const tags = parseTags(document.getElementById('extract-tags')?.value);

    if (!reviewId) return;
    if (!concept) {
      showToast('请填写卡片概念');
      return;
    }
    if (!cognition) {
      showToast('请填写具体认知');
      return;
    }

    const state = loadState();
    const review = state.domainReviews.find((r) => r.id === reviewId);
    if (!review) return;

    state.flashcards.unshift({
      id: uid('f'),
      reviewId,
      domainId: review.domainId,
      concept,
      cognition,
      tags,
      createdAt: new Date().toISOString(),
    });
    saveState(state);
    dialog?.close();
    showToast('闪卡已保存');
    renderFlashcards();
  });

  filterInput?.addEventListener('input', renderFlashcards);
}

export function bindEditFlashcardForm() {
  const dialog = document.getElementById('edit-flashcard-dialog');
  document.getElementById('edit-flashcard-cancel')?.addEventListener('click', () => dialog?.close());

  document.getElementById('edit-flashcard-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-flashcard-id')?.value;
    const domainId = document.getElementById('edit-flashcard-domain')?.value;
    const concept = document.getElementById('edit-flashcard-concept')?.value.trim();
    const cognition = document.getElementById('edit-flashcard-cognition')?.value.trim();
    const tags = parseTags(document.getElementById('edit-flashcard-tags')?.value);

    if (!concept) {
      showToast('请填写卡片概念');
      return;
    }
    if (!cognition) {
      showToast('请填写具体认知');
      return;
    }

    const state = loadState();
    const card = state.flashcards.find((f) => f.id === id);
    if (!card) return;

    card.domainId = domainId;
    card.concept = concept;
    card.cognition = cognition;
    card.tags = tags;
    delete card.insight;
    card.updatedAt = new Date().toISOString();
    saveState(state);
    dialog?.close();
    showToast('闪卡已更新');
    renderFlashcards();
  });
}

function deleteFlashcard(id) {
  if (!confirm('确定删除这张闪卡吗？')) return;
  const state = loadState();
  state.flashcards = state.flashcards.filter((f) => f.id !== id);
  saveState(state);
  showToast('闪卡已删除');
  renderFlashcards();
}

export function renderFlashcards() {
  const state = loadState();
  const filter = (document.getElementById('flashcard-filter')?.value || '').trim().toLowerCase();
  const grid = document.getElementById('flashcard-grid');
  if (!grid) return;

  let cards = [...state.flashcards].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  if (filter) {
    cards = cards.filter((c) => {
      const concept = getFlashcardConcept(c).toLowerCase();
      const cognition = getFlashcardCognition(c).toLowerCase();
      return (
        (c.tags || []).some((t) => t.toLowerCase().includes(filter)) ||
        concept.includes(filter) ||
        cognition.includes(filter)
      );
    });
  }

  if (!cards.length) {
    grid.innerHTML =
      '<p class="text-slate-500 col-span-2 text-center py-8">暂无闪卡，可从历史复盘中点击「提炼归纳」</p>';
    return;
  }

  grid.innerHTML = cards
    .map((c) => {
      const domain = getDomain(state, c.domainId);
      const tags = c.tags || [];
      const concept = getFlashcardConcept(c);
      const cognition = getFlashcardCognition(c);
      const isExpanded = expandedFlashcardIds.has(c.id);
      const tagHtml =
        tags.length > 0
          ? tags
              .map(
                (t) =>
                  `<span class="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">${escapeHtml(t)}</span>`
              )
              .join(' ')
          : '<span class="text-xs text-slate-400">无标签</span>';

      const detailHtml = cognition
        ? `<p class="text-slate-700 text-sm whitespace-pre-wrap mt-0.5">${escapeHtml(cognition)}</p>`
        : `<p class="text-slate-400 text-sm italic mt-0.5">未填写具体认知，可点击编辑补充</p>`;

      return `
        <article class="flashcard-item bg-white rounded-xl shadow p-4 border-l-4 flex flex-col gap-3" style="border-color:${domain?.color || '#cbd5e1'}">
          <button type="button" data-toggle-flashcard="${c.id}" class="flashcard-cover min-w-0 flex-1 space-y-2 text-left">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold text-slate-500">概念</p>
                <p class="font-medium text-slate-800 mt-0.5">「${escapeHtml(concept)}」</p>
              </div>
              <span class="text-slate-400 text-sm shrink-0">${isExpanded ? '收起' : '详情'}</span>
            </div>
            <div class="flex flex-wrap gap-1 pt-1">
              ${tagHtml}
            </div>
            <p class="text-xs text-slate-400">${escapeHtml(domain?.name || '未知')} · ${formatDate(c.createdAt)}</p>
          </button>
          ${
            isExpanded
              ? `<div class="flashcard-detail border-t border-slate-100 pt-3">
            <div>
              <p class="text-xs font-semibold text-slate-500">具体认知</p>
              ${detailHtml}
            </div>
            <div class="flex flex-wrap gap-2 mt-3">
              <button type="button" data-edit-flashcard="${c.id}" class="btn-ghost text-sm">编辑</button>
              <button type="button" data-delete-flashcard="${c.id}" class="btn-ghost btn-danger text-sm">删除</button>
            </div>
          </div>`
              : ''
          }
        </article>`;
    })
    .join('');

  grid.querySelectorAll('[data-toggle-flashcard]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.toggleFlashcard;
      if (!id) return;
      if (expandedFlashcardIds.has(id)) expandedFlashcardIds.delete(id);
      else expandedFlashcardIds.add(id);
      renderFlashcards();
    });
  });

  grid.querySelectorAll('[data-edit-flashcard]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = state.flashcards.find((f) => f.id === btn.dataset.editFlashcard);
      if (card) openEditFlashcardDialog(card);
    });
  });

  grid.querySelectorAll('[data-delete-flashcard]').forEach((btn) => {
    btn.addEventListener('click', () => deleteFlashcard(btn.dataset.deleteFlashcard));
  });
}
