import { STORAGE_KEY, BACKUP_VERSION } from './config.js';
import { loadState, replaceState } from './storage.js';
import { showToast } from './utils.js';

function buildExportPayload() {
  const state = loadState();
  const { reviews, ...data } = state;
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: '定格今日 · 复盘闪卡',
    storageKey: STORAGE_KEY,
    data,
  };
}

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportBackup() {
  const payload = buildExportPayload();
  const date = new Date().toISOString().slice(0, 10);
  downloadJson(`flashcard-backup-${date}.json`, payload);
  showToast('备份已导出');
}

function extractStateFromPayload(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  if (parsed.data && typeof parsed.data === 'object') return parsed.data;
  if (Array.isArray(parsed.domains)) return parsed;
  return null;
}

function validateImportShape(data) {
  if (!data || typeof data !== 'object') return false;
  if (!Array.isArray(data.domains)) return false;
  if (data.dailyLogs != null && !Array.isArray(data.dailyLogs)) return false;
  if (data.domainReviews != null && !Array.isArray(data.domainReviews)) return false;
  if (data.flashcards != null && !Array.isArray(data.flashcards)) return false; // 兼容旧备份
  return true;
}

export function bindBackupUI(onImported) {
  document.getElementById('backup-export')?.addEventListener('click', exportBackup);

  const fileInput = document.getElementById('backup-import-file');
  document.getElementById('backup-import')?.addEventListener('click', () => fileInput?.click());

  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const raw = extractStateFromPayload(parsed);
      if (!validateImportShape(raw)) {
        showToast('备份文件格式无效');
        return;
      }

      const domains = raw.domains.length;
      const reviews = (raw.domainReviews ?? []).length;
      const daily = (raw.dailyLogs ?? []).length;
      const legacyCards = (raw.flashcards ?? []).length;
      const legacyNote = legacyCards ? `（含 ${legacyCards} 条旧版闪卡，导入后将合并为「有价值」标记）\n\n` : '\n';
      const msg = `将覆盖当前全部数据。\n\n备份内容：领域 ${domains}、今日复盘 ${daily}、领域复盘 ${reviews}${legacyNote}确定导入吗？`;
      if (!confirm(msg)) return;

      replaceState(raw);
      showToast('备份已导入');
      onImported?.();
    } catch {
      showToast('无法读取备份文件，请确认是有效的 JSON');
    }
  });
}
