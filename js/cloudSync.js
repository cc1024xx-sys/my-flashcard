import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient.js';
import { getActiveUserId, getActiveStorageKey, isLoggedIn } from './session.js';

const TABLE_NAME = 'app_states';

let syncTimer = null;
let syncing = false;
let pendingPayload = null;

export function isCloudSyncAvailable() {
  return isSupabaseConfigured();
}

export { isLoggedIn };

export async function fetchCloudState(userId) {
  const client = await getSupabaseClient();
  if (!client || !userId) return null;

  const { data, error } = await client
    .from(TABLE_NAME)
    .select('state, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[cloudSync] fetch failed:', error.message);
    return null;
  }
  return data;
}

export async function pushStateToCloud(state, userId) {
  const client = await getSupabaseClient();
  if (!client || !userId) return false;

  const payload = { ...state };
  delete payload._meta;

  const { error } = await client.from(TABLE_NAME).upsert(
    {
      user_id: userId,
      state: payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.warn('[cloudSync] push failed:', error.message);
    return false;
  }
  return true;
}

async function pushPendingState() {
  if (syncing || !pendingPayload) return;

  const { state, userId } = pendingPayload;
  pendingPayload = null;
  syncing = true;

  const cloud = await fetchCloudState(userId);
  if (cloud?.updated_at && state._meta?.updatedAt) {
    const cloudTime = new Date(cloud.updated_at).getTime();
    const localTime = new Date(state._meta.updatedAt).getTime();
    if (cloudTime > localTime + 2000) {
      const useCloud = confirm(
        '云端数据比本机更新。\n\n确定 = 先使用云端数据\n取消 = 仍用本机覆盖云端'
      );
      if (useCloud) {
        localStorage.setItem(getActiveStorageKey(), JSON.stringify(cloud.state));
        syncing = false;
        window.location.reload();
        return;
      }
    }
  }

  const ok = await pushStateToCloud(state, userId);
  syncing = false;

  if (!ok) {
    pendingPayload = { state, userId };
    return;
  }

  if (pendingPayload) {
    await pushPendingState();
  }
}

export function queueCloudSync(state) {
  if (!isCloudSyncAvailable() || !isLoggedIn()) return;

  const userId = getActiveUserId();
  if (!userId) return;

  const payload = { ...state };
  payload._meta = { ...(payload._meta || {}), updatedAt: new Date().toISOString() };

  pendingPayload = { state: payload, userId };
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void pushPendingState();
  }, 400);
}

/** @deprecated 登录后由 auth 模块拉取云端；未配置 Supabase 时无效 */
export async function hydrateStateFromCloud() {
  return false;
}
