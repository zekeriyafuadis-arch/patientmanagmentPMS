const WEAK_PASSWORDS = new Set([
  'change-me-in-production',
  'password',
  'password1',
  '12345678',
  '123456789',
  '1234567890',
  'admin123',
  'administrator',
  'qwerty123',
  'letmein1',
  'welcome1',
  'saydoc123'
]);

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function getMinPasswordLength() {
  return isProduction() ? 8 : 6;
}

function getPasswordPolicy() {
  return {
    minLength: getMinPasswordLength(),
    requireLetterAndNumber: isProduction()
  };
}

function validatePassword(password) {
  const pwd = String(password || '');
  const minLength = getMinPasswordLength();

  if (pwd.length < minLength) {
    return {
      ok: false,
      message: `Password must be at least ${minLength} characters`
    };
  }

  if (isProduction()) {
    if (WEAK_PASSWORDS.has(pwd.toLowerCase())) {
      return {
        ok: false,
        message: 'Password is too common. Choose a stronger password.'
      };
    }
    if (!/[a-zA-Z]/.test(pwd) || !/[0-9]/.test(pwd)) {
      return {
        ok: false,
        message: 'Password must include at least one letter and one number'
      };
    }
  }

  return { ok: true };
}

function assertPasswordStrength(password) {
  const result = validatePassword(password);
  if (result.ok) return;
  const err = new Error(result.message);
  err.status = 400;
  err.code = 'WEAK_PASSWORD';
  throw err;
}

module.exports = {
  getMinPasswordLength,
  getPasswordPolicy,
  validatePassword,
  assertPasswordStrength
};
