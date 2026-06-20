function normalizeDomain(raw) {
  const value = (raw || '@pws.com').trim().toLowerCase();
  if (!value) return '@pws.com';
  return value.startsWith('@') ? value : `@${value}`;
}

const emailDomain = normalizeDomain(process.env.PMS_EMAIL_DOMAIN);

function normalizeStaffEmail(input) {
  if (input == null || String(input).trim() === '') {
    const err = new Error('Username is required');
    err.status = 400;
    throw err;
  }
  const trimmed = String(input).trim().toLowerCase();
  const full = trimmed.includes('@') ? trimmed : `${trimmed}${emailDomain}`;
  if (!full.endsWith(emailDomain)) {
    const err = new Error(`Staff accounts must use ${emailDomain}`);
    err.status = 400;
    throw err;
  }
  const username = full.slice(0, -emailDomain.length);
  if (!username || !/^[a-z0-9._-]+$/.test(username)) {
    const err = new Error('Invalid username');
    err.status = 400;
    throw err;
  }
  return full;
}

function staffUsernameFromEmail(email) {
  if (!email) return '';
  const lower = String(email).toLowerCase();
  if (lower.endsWith(emailDomain)) return lower.slice(0, -emailDomain.length);
  return lower.split('@')[0] || lower;
}

module.exports = {
  emailDomain,
  normalizeStaffEmail,
  staffUsernameFromEmail,
  adminSeed: {
    username: (process.env.PMS_ADMIN_USERNAME || 'admin').trim().toLowerCase(),
    password: process.env.PMS_ADMIN_PASSWORD || '',
    fullName: (process.env.PMS_ADMIN_FULL_NAME || 'Administrator').trim()
  }
};
