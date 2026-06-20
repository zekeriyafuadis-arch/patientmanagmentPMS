import { API_BASE } from '../config/api.js';
import { eventBus } from '../core/eventBus.js';
import { ApiError, parseErrorCode, parseErrorMessage } from './errors.js';

const TOKEN_KEY = 'saydoc_auth_token';

export { ApiError };

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

function handleUnauthorized() {
  setToken(null);
  window.dispatchEvent(new CustomEvent('pms:auth:logout', {
    detail: { reason: 'session_expired' }
  }));
}

function emitDataChanged(method, path) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return;
  const entity = path.split('/').filter(Boolean)[0] || 'unknown';
  eventBus.emit('data:changed', { entity, method, path, source: 'client' });
}

export async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  if (!(options.body instanceof FormData) && options.body && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const isLoginAttempt = path === '/auth/login';
    if (res.status === 401 && !isLoginAttempt) handleUnauthorized();
    const message = parseErrorMessage(data, res.status);
    const code = parseErrorCode(data) || (res.status === 429 ? 'RATE_LIMITED' : 'REQUEST_FAILED');
    throw new ApiError(message, { status: res.status, code });
  }

  if (data.success === false) {
    const message = parseErrorMessage(data, res.status);
    throw new ApiError(message, { status: res.status, code: parseErrorCode(data) || 'REQUEST_FAILED' });
  }

  emitDataChanged(options.method || 'GET', path);
  return data;
}

export async function apiGet(path) {
  return apiFetch(path);
}

export async function apiPost(path, body) {
  return apiFetch(path, { method: 'POST', body });
}

export async function apiPut(path, body) {
  return apiFetch(path, { method: 'PUT', body });
}

export async function apiPatch(path, body) {
  return apiFetch(path, { method: 'PATCH', body });
}

export async function apiDelete(path) {
  return apiFetch(path, { method: 'DELETE' });
}

export async function apiUpload(path, formData) {
  return apiFetch(path, { method: 'POST', body: formData });
}
