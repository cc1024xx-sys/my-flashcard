import { STORAGE_KEY, DEFAULT_DOMAINS } from './config.js';
import { uid, getDateKey } from './utils.js';

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
    flashcards: [],
    settings: { historyView: 'list', historyTab: 'day' },
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

function normalizeState(parsed) {
  const migrated =
    parsed.reviews?.length && !parsed.domainReviews?.length
      ? migrateFromLegacyReviews(parsed)
      : {
          domainReviews: parsed.domainReviews ?? [],
          dailyLogs: parsed.dailyLogs ?? [],
        };

  return {
    domains: parsed.domains ?? [],
    dailyLogs: migrated.dailyLogs,
    domainReviews: migrated.domainReviews,
    flashcards: parsed.flashcards ?? [],
      settings: { historyView: 'list', historyTab: 'day', ...parsed.settings },
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

export function saveState(state) {
  const { reviews, ...rest } = state;
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
