import { STORAGE_KEY } from './config.js';

let activeUserId = null;

export function setActiveUserId(userId) {
  activeUserId = userId || null;
}

export function getActiveUserId() {
  return activeUserId;
}

/** 登录后按用户隔离本地缓存，未登录用默认 key */
export function getActiveStorageKey() {
  return activeUserId ? `${STORAGE_KEY}::${activeUserId}` : STORAGE_KEY;
}

export function isLoggedIn() {
  return Boolean(activeUserId);
}
