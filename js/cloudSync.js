import {
  STORAGE_KEY,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_STATE_ID,
} from './config.js';

const TABLE_NAME = 'app_states';

let supabaseClient = null;
let syncTimer = null;
let syncing = false;
let pendingStateJson = null;

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

async function getClient() {
  if (supabaseClient || !hasSupabaseConfig()) return supabaseClient;
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  return supabaseClient;
}

async function pushPendingState() {
  if (syncing || !pendingStateJson) return;
  const client = await getClient();
  if (!client) return;

  syncing = true;
  const stateJson = pendingStateJson;
  pendingStateJson = null;

  const { error } = await client.from(TABLE_NAME).upsert(
    {
      id: SUPABASE_STATE_ID,
      state: stateJson,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  syncing = false;
  if (error) {
    console.warn('[cloudSync] push failed:', error.message);
    pendingStateJson = stateJson;
    return;
  }

  if (pendingStateJson) {
    await pushPendingState();
  }
}

export function queueCloudSync(state) {
  if (!hasSupabaseConfig()) return;
  pendingStateJson = JSON.stringify(state);
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void pushPendingState();
  }, 400);
}

export async function hydrateStateFromCloud() {
  if (!hasSupabaseConfig()) return false;
  const client = await getClient();
  if (!client) return false;

  const { data, error } = await client
    .from(TABLE_NAME)
    .select('state')
    .eq('id', SUPABASE_STATE_ID)
    .maybeSingle();

  if (error) {
    console.warn('[cloudSync] hydrate failed:', error.message);
    return false;
  }
  if (!data?.state) return false;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data.state));
  return true;
}
