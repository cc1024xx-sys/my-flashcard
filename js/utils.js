export function uid(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 本地自然日 YYYY-MM-DD */
export function getDateKey(isoOrDate = new Date()) {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

export function showToast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => el.classList.add('hidden'), 2200);
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Keep / Problem / Next 三块拼成一段正文，供存储与提炼预览 */
export function buildStructuredReviewContent(keep, problem, nextStep) {
  const k = String(keep ?? '').trim();
  const p = String(problem ?? '').trim();
  const n = String(nextStep ?? '').trim();
  const parts = [];
  if (k) parts.push(`【继续保持】\n${k}`);
  if (p) parts.push(`【问题 / 卡点】\n${p}`);
  if (n) parts.push(`【下一步】\n${n}`);
  return parts.join('\n\n');
}

export function hasStructuredReviewFields(review) {
  if (!review) return false;
  return !!(
    String(review.keep ?? '').trim() ||
    String(review.problem ?? '').trim() ||
    String(review.nextStep ?? '').trim()
  );
}

/** 标题 + 正文拼成存储/预览用正文 */
export function buildReviewContent(title, body) {
  const t = String(title ?? '').trim();
  const b = String(body ?? '').trim();
  if (t && b) return `${t}\n\n${b}`;
  return t || b;
}

/** 提炼预览等：优先 content，否则 title+body，兼容旧 KPT */
export function getReviewFullText(review) {
  if (!review) return '';
  const c = String(review.content ?? '').trim();
  if (c) return c;
  const title = String(review.title ?? '').trim();
  const body = String(review.body ?? '').trim();
  if (title || body) return buildReviewContent(title, body);
  return buildStructuredReviewContent(review.keep, review.problem, review.nextStep);
}

export function renderStars(container, rating, { interactive = false, onChange } = {}) {
  container.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const span = document.createElement('span');
    span.textContent = '★';
    span.className = `star ${i <= rating ? 'active' : ''}`;
    span.setAttribute('role', interactive ? 'button' : 'presentation');
    span.setAttribute('aria-label', `${i} 星`);
    if (interactive) {
      span.addEventListener('click', () => onChange?.(i));
    }
    container.appendChild(span);
  }
}
