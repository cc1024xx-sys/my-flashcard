export const STORAGE_KEY = 'rigong_flashcards_v1';

/** 备份文件格式版本 */
export const BACKUP_VERSION = 1;

/**
 * Supabase 云同步配置（发布前请替换成你自己的项目配置）
 * - SUPABASE_URL 示例：https://xxxx.supabase.co
 * - SUPABASE_ANON_KEY 示例：eyJ...
 */
export const SUPABASE_URL = 'https://mbcowpiupleddzmvhudb.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_SAo3aFrVZ3AQlkiB8LyJUg_03T4Pqjf';

/** GitHub Pages 站点根地址（魔法链接回调必须指向此 URL，末尾保留 /） */
export const APP_BASE_URL = 'https://cc1024xx-sys.github.io/my-flashcard/';

/** 7 色预设：清新自然、区分清晰 */
export const DOMAIN_COLORS = [
  { hex: '#3B82F6', label: '晴空蓝' },
  { hex: '#14B8A6', label: '青碧' },
  { hex: '#22C55E', label: '翠芽' },
  { hex: '#F59E0B', label: '暖橙' },
  { hex: '#F472B6', label: '樱粉' },
  { hex: '#8B5CF6', label: '薰紫' },
  { hex: '#64748B', label: '雾灰' },
];

export const DEFAULT_DOMAIN_COLOR = DOMAIN_COLORS[0].hex;

export const DOMAIN_COLOR_HEXES = DOMAIN_COLORS.map((c) => c.hex);

export const DEFAULT_DOMAINS = [
  { name: '工作', color: '#3B82F6', order: 0 },
  { name: '副业', color: '#F59E0B', order: 1 },
  { name: '生活', color: '#F472B6', order: 2 },
  { name: '学习', color: '#22C55E', order: 3 },
];

/** 今日状态预设标签（可多选，存储用 tag 字符串） */
export const MOOD_TAG_OPTIONS = [
  { tag: '#进入心流', emoji: '🌊' },
  { tag: '#执行力拉满', emoji: '⚡' },
  { tag: '#又开新坑', emoji: '🕳️' },
  { tag: '#稳扎稳打', emoji: '🧱' },
  { tag: '#进度+1%', emoji: '📈' },
  { tag: '#疯狂卡bug', emoji: '🐛' },
  { tag: '#心态微崩', emoji: '😵‍💫' },
  { tag: '#极限赶due', emoji: '⏰' },
  { tag: '#电量不足', emoji: '🪫' },
  { tag: '#今日挂机', emoji: '💤' },
  { tag: '#彻底回血', emoji: '🔋' },
];

export const DEFAULT_MOOD_TAGS = MOOD_TAG_OPTIONS.map((o) => o.tag);

export const MOOD_TAG_EMOJI = Object.fromEntries(
  MOOD_TAG_OPTIONS.map((o) => [o.tag, o.emoji])
);
