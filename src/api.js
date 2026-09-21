import { router } from './router.js';

const TOKEN_KEY = 'kl_token';
const ROLE_KEY = 'kl_role';
const LABEL_KEY = 'kl_label';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function getRole() {
  return localStorage.getItem(ROLE_KEY) || '';
}

export function getLabel() {
  return localStorage.getItem(LABEL_KEY) || '';
}

export function isParent() {
  return getRole() === 'parent';
}

export function setAuth(token, role, label) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(LABEL_KEY, label);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(LABEL_KEY);
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { Authorization: `Bearer ${getToken()}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  // 登录接口自身的 401（口令错误）走正常错误信息，不触发全局登出
  if (res.status === 401 && path !== '/login') {
    clearAuth();
    router.push('/login');
    throw new Error('请重新登录');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `请求失败（${res.status}）`);
  }
  return data;
}
