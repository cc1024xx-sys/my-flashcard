import { loadState, saveState } from './storage.js';
import { DOMAIN_COLORS, DEFAULT_DOMAIN_COLOR, DOMAIN_COLOR_HEXES } from './config.js';
import { uid, showToast } from './utils.js';

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 将颜色规范到预设色板；旧数据不在色板内则用默认色 */
export function normalizeDomainColor(color) {
  const upper = String(color || '').toUpperCase();
  const match = DOMAIN_COLOR_HEXES.find((hex) => hex.toUpperCase() === upper);
  return match ?? DEFAULT_DOMAIN_COLOR;
}

export function renderColorPicker(containerId, hiddenInputId, selectedHex) {
  const container = document.getElementById(containerId);
  const hidden = document.getElementById(hiddenInputId);
  if (!container || !hidden) return;

  const hex = normalizeDomainColor(selectedHex || hidden.value);
  hidden.value = hex;

  container.innerHTML = DOMAIN_COLORS.map(
    ({ hex: c, label }) => `
    <button
      type="button"
      class="color-swatch${c === hex ? ' selected' : ''}"
      style="background-color:${c}"
      data-color="${c}"
      aria-label="${escapeAttr(label)}"
      aria-pressed="${c === hex}"
      title="${escapeAttr(label)}"
    ></button>`
  ).join('');

  container.querySelectorAll('.color-swatch').forEach((btn) => {
    btn.addEventListener('click', () => {
      hidden.value = btn.dataset.color;
      container.querySelectorAll('.color-swatch').forEach((b) => {
        const on = b.dataset.color === hidden.value;
        b.classList.toggle('selected', on);
        b.setAttribute('aria-pressed', String(on));
      });
    });
  });
}

function buildDomainOptions(sorted, selectedId) {
  return sorted
    .map(
      (d) =>
        `<option value="${d.id}"${d.id === selectedId ? ' selected' : ''}>${escapeAttr(d.name)}</option>`
    )
    .join('');
}

function syncDomainSelects(sorted) {
  const ids = ['domain-review-domain', 'edit-domain-review-domain', 'edit-flashcard-domain'];

  ids.forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;
    const current = select.value;
    select.innerHTML = buildDomainOptions(sorted, current);
    if (current && sorted.some((d) => d.id === current)) {
      select.value = current;
    }
  });
}

function openEditDomainDialog(domain) {
  const dialog = document.getElementById('edit-domain-dialog');
  if (!dialog || !domain) return;

  const color = normalizeDomainColor(domain.color);
  document.getElementById('edit-domain-id').value = domain.id;
  document.getElementById('edit-domain-name').value = domain.name;
  document.getElementById('edit-domain-color').value = color;
  renderColorPicker('edit-domain-color-picker', 'edit-domain-color', color);
  dialog.showModal();
}

export function initDomainColorPickers() {
  renderColorPicker('domain-color-picker', 'domain-color', DEFAULT_DOMAIN_COLOR);
}

export function renderDomains() {
  const state = loadState();
  const list = document.getElementById('domain-list');

  if (!list) return;

  const sorted = [...state.domains].sort((a, b) => a.order - b.order);

  list.innerHTML = sorted
    .map(
      (d) => `
      <li class="flex items-center justify-between bg-white rounded-lg px-4 py-3 shadow-sm gap-2">
        <span class="flex items-center gap-2 min-w-0">
          <span class="w-3 h-3 rounded-full shrink-0" style="background:${normalizeDomainColor(d.color)}"></span>
          <span class="font-medium truncate">${escapeAttr(d.name)}</span>
        </span>
        <span class="flex gap-2 shrink-0">
          <button type="button" data-edit-domain="${d.id}" class="btn-ghost text-sm">编辑</button>
          <button type="button" data-delete-domain="${d.id}" class="btn-ghost btn-danger text-sm">删除</button>
        </span>
      </li>`
    )
    .join('');

  syncDomainSelects(sorted);

  list.querySelectorAll('[data-edit-domain]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const domain = state.domains.find((d) => d.id === btn.dataset.editDomain);
      if (domain) openEditDomainDialog(domain);
    });
  });

  list.querySelectorAll('[data-delete-domain]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.deleteDomain;
      const next = loadState();
      const hasReviews = next.domainReviews.some((r) => r.domainId === id);
      const hasFlashcards = next.flashcards.some((f) => f.domainId === id);
      if (hasReviews || hasFlashcards) {
        showToast('该领域下还有复盘或闪卡，无法删除');
        return;
      }
      next.domains = next.domains.filter((d) => d.id !== id);
      saveState(next);
      renderDomains();
      showToast('已删除领域');
    });
  });
}

export function bindDomainForm() {
  const form = document.getElementById('domain-form');
  if (!form) return;

  initDomainColorPickers();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('domain-name');
    const colorInput = document.getElementById('domain-color');
    const name = nameInput?.value.trim();
    const color = normalizeDomainColor(colorInput?.value);

    if (!name) return;

    const state = loadState();
    if (state.domains.some((d) => d.name === name)) {
      showToast('该领域名称已存在');
      return;
    }

    state.domains.push({
      id: uid('d'),
      name,
      color,
      order: state.domains.length,
    });
    saveState(state);
    form.reset();
    renderColorPicker('domain-color-picker', 'domain-color', DEFAULT_DOMAIN_COLOR);
    renderDomains();
    showToast('领域已添加');
  });
}

export function bindEditDomainForm(onDomainsChanged) {
  const dialog = document.getElementById('edit-domain-dialog');
  document.getElementById('edit-domain-cancel')?.addEventListener('click', () => dialog?.close());

  document.getElementById('edit-domain-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-domain-id')?.value;
    const name = document.getElementById('edit-domain-name')?.value.trim();
    const color = normalizeDomainColor(document.getElementById('edit-domain-color')?.value);

    if (!name) {
      showToast('请填写领域名称');
      return;
    }

    const state = loadState();
    const domain = state.domains.find((d) => d.id === id);
    if (!domain) return;

    if (state.domains.some((d) => d.name === name && d.id !== id)) {
      showToast('该领域名称已存在');
      return;
    }

    domain.name = name;
    domain.color = color;
    saveState(state);
    dialog?.close();
    renderDomains();
    showToast('领域已更新');
    onDomainsChanged?.();
  });
}
