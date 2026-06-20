import { apiGet } from '../api/client.js';

let cached = null;
const FALLBACK = { emailDomain: '@pws.com', passwordPolicy: { minLength: 6, requireLetterAndNumber: false } };
const STORAGE_KEY = 'pms_clinic_email_config';

export function getCachedClinicEmailConfig() {
  if (cached) return cached;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      cached = JSON.parse(stored);
      return cached;
    }
  } catch { /* ignore */ }
  return null;
}

export async function loadClinicEmailConfig() {
  if (cached) return cached;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      cached = JSON.parse(stored);
      return cached;
    }
  } catch { /* ignore */ }
  try {
    const res = await apiGet('/auth/config');
    cached = {
      emailDomain: res.emailDomain || FALLBACK.emailDomain,
      passwordPolicy: res.passwordPolicy || FALLBACK.passwordPolicy
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    cached = { ...FALLBACK };
  }
  return cached;
}

export function buildStaffEmail(username, emailDomain = '@pws.com') {
  const domain = emailDomain.startsWith('@') ? emailDomain : `@${emailDomain}`;
  const trimmed = String(username || '').trim().toLowerCase();
  if (!trimmed) {
    throw new Error('Username is required');
  }
  if (trimmed.includes('@')) {
    if (!trimmed.endsWith(domain)) {
      throw new Error(`Staff accounts must use ${domain}`);
    }
    return trimmed;
  }
  return `${trimmed}${domain}`;
}

export function staffUsernameFromEmail(email, emailDomain = '@pws.com') {
  const domain = emailDomain.startsWith('@') ? emailDomain : `@${emailDomain}`;
  const lower = String(email || '').toLowerCase();
  if (lower.endsWith(domain)) return lower.slice(0, -domain.length);
  return lower.split('@')[0] || lower;
}
