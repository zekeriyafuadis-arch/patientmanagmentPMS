const { validatePassword } = require('../utils/passwordPolicy');

const WEAK_JWT_SECRETS = new Set([
  '',
  'change-me-in-production-use-long-random-string',
  'saydoc-local-sqlite-secret-change-me'
]);

function fatal(message) {
  console.error(`FATAL: ${message}`);
  process.exit(1);
}

function validateProductionEnvironment() {
  if (process.env.NODE_ENV !== 'production') return;

  const jwtSecret = process.env.JWT_SECRET || '';
  if (WEAK_JWT_SECRETS.has(jwtSecret)) {
    fatal('Set JWT_SECRET to a strong random value (32+ characters) before running in production.');
  }

  if (process.env.PMS_DISABLE_RATE_LIMIT === '1') {
    fatal('PMS_DISABLE_RATE_LIMIT must not be enabled in production.');
  }

  if (process.env.PMS_SEED_DEMO === '1') {
    console.warn('WARNING: PMS_SEED_DEMO=1 is not recommended in production.');
  }

  const adminPassword = process.env.PMS_ADMIN_PASSWORD || '';
  if (adminPassword) {
    const check = validatePassword(adminPassword);
    if (!check.ok) {
      fatal(`PMS_ADMIN_PASSWORD is too weak: ${check.message}`);
    }
  }

  const demoPassword = process.env.PMS_DEMO_STAFF_PASSWORD || '';
  if (demoPassword && process.env.PMS_SEED_DEMO === '1') {
    const check = validatePassword(demoPassword);
    if (!check.ok) {
      fatal(`PMS_DEMO_STAFF_PASSWORD is too weak: ${check.message}`);
    }
  }
}

module.exports = {
  WEAK_JWT_SECRETS,
  validateProductionEnvironment
};
