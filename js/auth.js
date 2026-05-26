import { STORAGE_KEY, APP_BASE_URL } from './config.js';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient.js';
import { setActiveUserId, getActiveUserId } from './session.js';
import { fetchCloudState, pushStateToCloud } from './cloudSync.js';
import { loadState, replaceState, normalizeState } from './storage.js';
import { showToast } from './utils.js';

let onLoginSuccess = null;

export { isSupabaseConfigured };

export async function getCurrentUserFromSession() {
  const client = await getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session?.user ?? null;
}

export function setOnLoginSuccess(callback) {
  onLoginSuccess = callback;
}

function readAnonymousLocalRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function localHasUserContent(parsed) {
  if (!parsed || typeof parsed !== 'object') return false;
  const reviews = (parsed.domainReviews ?? []).length;
  const daily = (parsed.dailyLogs ?? []).length;
  const cards = (parsed.flashcards ?? []).length;
  return reviews + daily + cards > 0;
}

async function resolveDataAfterLogin(userId, { isFreshLogin = false } = {}) {
  setActiveUserId(userId);
  const userKey = `${STORAGE_KEY}::${userId}`;

  if (!isFreshLogin && localStorage.getItem(userKey)) {
    loadState();
    return;
  }

  const cloud = await fetchCloudState(userId);
  const anonymous = readAnonymousLocalRaw();
  const anonHasData = localHasUserContent(anonymous);
  if (!cloud?.state && anonHasData) {
    const upload = confirm(
      '检测到本机有未登录时保存的数据。\n\n是否上传到当前账号云端？\n（取消则使用空数据开始，未登录数据仍保留在浏览器中）'
    );
    if (upload) {
      const state = normalizeState(anonymous);
      localStorage.setItem(userKey, JSON.stringify(state));
      await pushStateToCloud(state, userId);
      loadState();
      showToast('本地数据已同步到云端');
      return;
    }
    loadState();
    return;
  }

  if (cloud?.state) {
    if (anonHasData) {
      const useCloud = confirm(
        '云端已有数据。确定使用云端数据吗？\n\n确定 = 使用云端（推荐，手机电脑一致）\n取消 = 保留本机未登录数据并覆盖云端'
      );
      if (useCloud) {
        localStorage.setItem(userKey, JSON.stringify(cloud.state));
        loadState();
        showToast('已加载云端数据');
        return;
      }
      const local = normalizeState(anonymous);
      localStorage.setItem(userKey, JSON.stringify(local));
      replaceState(local);
      await pushStateToCloud(local, userId);
      showToast('已用本机数据覆盖云端');
      return;
    }
    localStorage.setItem(userKey, JSON.stringify(cloud.state));
    loadState();
    showToast('已加载云端数据');
    return;
  }

  loadState();
}

function getAuthRedirectUrl() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    const path = window.location.pathname.endsWith('/')
      ? window.location.pathname
      : `${window.location.pathname}/`;
    return `${window.location.origin}${path}`;
  }
  return APP_BASE_URL;
}

function clearAuthParamsFromUrl() {
  if (typeof window === 'undefined') return;
  const clean = getAuthRedirectUrl();
  window.history.replaceState({}, document.title, clean);
}

/** 处理邮件魔法链接 / OAuth 回跳 */
export async function completeAuthFromUrl() {
  const client = await getSupabaseClient();
  if (!client) return null;

  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (code) {
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (error) {
      console.warn('[auth] exchangeCodeForSession failed:', error.message);
      showToast('登录链接无效或已过期，请重新发送验证码');
      clearAuthParamsFromUrl();
      return null;
    }
    clearAuthParamsFromUrl();
    return data.session?.user ?? null;
  }

  const hash = window.location.hash || '';
  if (hash.includes('access_token') || hash.includes('error=')) {
    const { data, error } = await client.auth.getSession();
    if (error) {
      console.warn('[auth] getSession from hash failed:', error.message);
      showToast('登录链接无效或已过期');
    }
    clearAuthParamsFromUrl();
    return data.session?.user ?? null;
  }

  return null;
}

export async function initAuth() {
  if (!isSupabaseConfigured()) return null;

  const client = await getSupabaseClient();
  const callbackUser = await completeAuthFromUrl();
  const { data } = await client.auth.getSession();
  const user = callbackUser ?? data.session?.user;

  if (user) {
    setActiveUserId(user.id);
    const userKey = `${STORAGE_KEY}::${user.id}`;
    if (localStorage.getItem(userKey)) {
      loadState();
    } else {
      await resolveDataAfterLogin(user.id, { isFreshLogin: true });
    }
    hideAuthGate();
    onLoginSuccess?.();
  }

  client.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      if (getActiveUserId() !== session.user.id) {
        await resolveDataAfterLogin(session.user.id, { isFreshLogin: true });
        hideAuthGate();
        onLoginSuccess?.();
      }
      updateAuthBar();
    }
    if (event === 'SIGNED_OUT') {
      setActiveUserId(null);
      updateAuthBar();
      showAuthGate();
    }
  });

  updateAuthBar();
  return user ?? null;
}

export async function sendEmailOtp(email) {
  const client = await getSupabaseClient();
  if (!client) throw new Error('未配置 Supabase');

  const redirectTo = getAuthRedirectUrl();
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: redirectTo,
    },
  });
  if (error) throw error;
}

export async function verifyEmailOtp(email, token) {
  const client = await getSupabaseClient();
  if (!client) throw new Error('未配置 Supabase');

  const { data, error } = await client.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  if (error) throw error;

  if (data.user) {
    await resolveDataAfterLogin(data.user.id, { isFreshLogin: true });
    hideAuthGate();
    onLoginSuccess?.();
    updateAuthBar();
  }
  return data;
}

export async function signOut() {
  const client = await getSupabaseClient();
  if (client) await client.auth.signOut();
  setActiveUserId(null);
  showAuthGate();
  updateAuthBar();
  showToast('已退出登录');
}

function showAuthGate() {
  document.getElementById('auth-gate')?.classList.remove('hidden');
  document.getElementById('app-shell')?.classList.add('hidden');
}

export function hideAuthGate() {
  document.getElementById('auth-gate')?.classList.add('hidden');
  document.getElementById('app-shell')?.classList.remove('hidden');
}

export function showAuthGateIfNeeded() {
  if (!isSupabaseConfigured()) {
    hideAuthGate();
    return false;
  }
  if (!getActiveUserId()) {
    showAuthGate();
    return true;
  }
  hideAuthGate();
  return false;
}

function updateAuthBar() {
  const bar = document.getElementById('auth-bar');
  const loggedInEl = document.getElementById('auth-logged-in');
  const loggedOutEl = document.getElementById('auth-logged-out');
  const emailEl = document.getElementById('auth-user-email');

  if (!isSupabaseConfigured()) {
    bar?.classList.add('hidden');
    return;
  }

  bar?.classList.remove('hidden');

  void getCurrentUserFromSession().then((user) => {
    if (user) {
      loggedInEl?.classList.remove('hidden');
      loggedOutEl?.classList.add('hidden');
      if (emailEl) emailEl.textContent = user.email ?? '已登录';
    } else {
      loggedInEl?.classList.add('hidden');
      loggedOutEl?.classList.remove('hidden');
    }
  });
}

export function bindAuthUI() {
  const sendBtn = document.getElementById('auth-send-otp');
  const verifyBtn = document.getElementById('auth-verify-otp');
  const logoutBtn = document.getElementById('auth-logout');
  const emailInput = document.getElementById('auth-email');
  const otpInput = document.getElementById('auth-otp');

  sendBtn?.addEventListener('click', async () => {
    const email = emailInput?.value?.trim();
    if (!email) {
      showToast('请输入邮箱');
      return;
    }
    sendBtn.disabled = true;
    try {
      await sendEmailOtp(email);
      showToast('邮件已发送：请查收验证码，或点击邮件中的登录链接');
    } catch (e) {
      showToast(e.message || '发送失败');
    } finally {
      sendBtn.disabled = false;
    }
  });

  verifyBtn?.addEventListener('click', async () => {
    const email = emailInput?.value?.trim();
    const token = otpInput?.value?.trim();
    if (!email || !token) {
      showToast('请输入邮箱和验证码');
      return;
    }
    verifyBtn.disabled = true;
    try {
      await verifyEmailOtp(email, token);
      showToast('登录成功');
    } catch (e) {
      showToast(e.message || '验证失败');
    } finally {
      verifyBtn.disabled = false;
    }
  });

  logoutBtn?.addEventListener('click', () => {
    void signOut();
  });
}
