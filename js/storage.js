import { STORAGE_KEY, DEFAULT_DOMAINS, DEFAULT_REVIEW_TYPE } from './config.js';
import { uid, getDateKey, getReviewFullText, buildReviewContent } from './utils.js';

function emptyState() {
  return {
    domains: DEFAULT_DOMAINS.map((d, i) => ({
      id: uid('d'),
      name: d.name,
      color: d.color,
      order: d.order ?? i,
    })),
    dailyLogs: [],
    domainReviews: [],
    settings: {
      historyView: 'list',
      historyTab: 'day',
      reportPeriod: 'week',
      reportAnchorDate: getDateKey(),
    },
  };
}

function migrateFromLegacyReviews(parsed) {
  const legacy = parsed.reviews ?? [];
  if (!legacy.length) {
    return {
      domainReviews: parsed.domainReviews ?? [],
      dailyLogs: parsed.dailyLogs ?? [],
    };
  }

  const domainReviews = legacy.map((r) => ({ ...r }));

  const latestByDate = {};
  for (const r of legacy) {
    const key = getDateKey(r.createdAt);
    const prev = latestByDate[key];
    if (!prev || new Date(r.createdAt) > new Date(prev.createdAt)) {
      latestByDate[key] = r;
    }
  }

  const dailyLogs = Object.entries(latestByDate)
    .filter(([, r]) => Number(r.rating) >= 1)
    .map(([dateKey, r]) => ({
      id: uid('dl'),
      dateKey,
      rating: Number(r.rating),
      moodTags: Array.isArray(r.moodTags) ? r.moodTags : [],
      createdAt: r.createdAt,
      updatedAt: r.updatedAt || r.createdAt,
    }));

  return { domainReviews, dailyLogs };
}

function applyHighlightFields(r, base) {
  if (r.highlighted) {
    base.highlighted = true;
    base.highlightedAt = r.highlightedAt || r.createdAt;
  }
  return base;
}

function normalizeDomainReview(r) {
  if (!r || typeof r !== 'object') return r;
  if (r.reviewType && (String(r.title ?? '').trim() || String(r.body ?? '').trim() || r.content)) {
    const title = String(r.title ?? '').trim();
    const body = String(r.body ?? '').trim();
    return applyHighlightFields(r, {
      id: r.id,
      domainId: r.domainId,
      reviewType: r.reviewType,
      title,
      body,
      content: String(r.content ?? '').trim() || buildReviewContent(title, body),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    });
  }
  const body = getReviewFullText(r);
  return applyHighlightFields(r, {
    id: r.id,
    domainId: r.domainId,
    reviewType: r.reviewType || 'key_behavior',
    title: String(r.title ?? '').trim(),
    body: body || String(r.body ?? '').trim(),
    content: body || buildReviewContent(r.title, r.body),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  });
}

function migrateFlashcardHighlights(reviews, flashcards) {
  if (!flashcards?.length) return reviews;
  const ids = new Set(flashcards.map((f) => f.reviewId).filter(Boolean));
  return reviews.map((r) => {
    if (!ids.has(r.id) || r.highlighted) return r;
    return {
      ...r,
      highlighted: true,
      highlightedAt: r.highlightedAt || new Date().toISOString(),
    };
  });
}

export function normalizeState(parsed) {
  const clean = { ...parsed };
  delete clean._meta;

  const migrated =
    clean.reviews?.length && !clean.domainReviews?.length
      ? migrateFromLegacyReviews(clean)
      : {
          domainReviews: clean.domainReviews ?? [],
          dailyLogs: clean.dailyLogs ?? [],
        };

  let domainReviews = (migrated.domainReviews ?? []).map(normalizeDomainReview);
  domainReviews = migrateFlashcardHighlights(domainReviews, clean.flashcards);

  return {
    domains: clean.domains ?? [],
    dailyLogs: migrated.dailyLogs,
    domainReviews,
    settings: {
      historyView: 'list',
      historyTab: 'day',
      historyTypeFilter: 'all',
      historyDomainFilter: 'all',
      reportPeriod: 'week',
      reportAnchorDate: getDateKey(),
      ...clean.settings,
    },
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = emptyState();
      saveState(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    const needsMigrate = parsed.reviews?.length && !parsed.domainReviews?.length;
    const state = normalizeState(parsed);
    if (needsMigrate) saveState(state);
    return state;
  } catch {
    const initial = emptyState();
    saveState(initial);
    return initial;
  }
}

/** 导入备份后写入本地 */
export function replaceState(parsed) {
  const state = normalizeState(parsed);
  saveState(state);
  return state;
}

export function saveState(state) {
  const { reviews, _meta, ...rest } = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
}

export function getDomain(state, id) {
  return state.domains.find((d) => d.id === id);
}

export function getTodayDailyLog(state) {
  const key = getDateKey();
  return state.dailyLogs.find((d) => d.dateKey === key);
}

export function upsertTodayDailyLog(state, { rating, moodTags }) {
  const dateKey = getDateKey();
  const now = new Date().toISOString();
  const idx = state.dailyLogs.findIndex((d) => d.dateKey === dateKey);
  const entry = {
    id: idx >= 0 ? state.dailyLogs[idx].id : uid('dl'),
    dateKey,
    rating,
    moodTags: moodTags ?? [],
    createdAt: idx >= 0 ? state.dailyLogs[idx].createdAt : now,
    updatedAt: now,
  };
  if (idx >= 0) state.dailyLogs[idx] = entry;
  else state.dailyLogs.unshift(entry);
  return entry;
}
