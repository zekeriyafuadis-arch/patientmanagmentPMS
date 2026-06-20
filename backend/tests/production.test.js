const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { validatePassword, getMinPasswordLength } = require('../src/utils/passwordPolicy');

describe('password policy', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('requires 8 characters in production', () => {
    process.env.NODE_ENV = 'production';
    assert.equal(getMinPasswordLength(), 8);
    assert.equal(validatePassword('Abcd1234').ok, true);
    assert.equal(validatePassword('short1').ok, false);
  });

  it('allows 6 characters outside production', () => {
    process.env.NODE_ENV = 'test';
    assert.equal(getMinPasswordLength(), 6);
    assert.equal(validatePassword('temp12').ok, true);
  });

  it('rejects common passwords in production', () => {
    process.env.NODE_ENV = 'production';
    assert.equal(validatePassword('admin123').ok, false);
  });
});

describe('production environment validation', () => {
  let originalEnv;
  let exitCode;

  beforeEach(() => {
    originalEnv = {
      NODE_ENV: process.env.NODE_ENV,
      JWT_SECRET: process.env.JWT_SECRET,
      PMS_DISABLE_RATE_LIMIT: process.env.PMS_DISABLE_RATE_LIMIT,
      PMS_ADMIN_PASSWORD: process.env.PMS_ADMIN_PASSWORD,
      PMS_DEMO_STAFF_PASSWORD: process.env.PMS_DEMO_STAFF_PASSWORD,
      PMS_SEED_DEMO: process.env.PMS_SEED_DEMO
    };
    exitCode = null;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv.NODE_ENV;
    process.env.JWT_SECRET = originalEnv.JWT_SECRET;
    process.env.PMS_DISABLE_RATE_LIMIT = originalEnv.PMS_DISABLE_RATE_LIMIT;
    process.env.PMS_ADMIN_PASSWORD = originalEnv.PMS_ADMIN_PASSWORD;
    process.env.PMS_DEMO_STAFF_PASSWORD = originalEnv.PMS_DEMO_STAFF_PASSWORD;
    process.env.PMS_SEED_DEMO = originalEnv.PMS_SEED_DEMO;
    delete require.cache[require.resolve('../src/config/production')];
  });

  it('exits when JWT secret is weak in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'change-me-in-production-use-long-random-string';
    process.env.PMS_DISABLE_RATE_LIMIT = undefined;
    process.env.PMS_ADMIN_PASSWORD = 'ClinicPass9';

    const originalExit = process.exit;
    process.exit = (code) => { exitCode = code; };

    const { validateProductionEnvironment } = require('../src/config/production');
    validateProductionEnvironment();

    process.exit = originalExit;
    assert.equal(exitCode, 1);
  });

  it('passes with strong production settings', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a-very-long-random-production-secret-value';
    process.env.PMS_DISABLE_RATE_LIMIT = undefined;
    process.env.PMS_ADMIN_PASSWORD = 'ClinicPass9';

    const originalExit = process.exit;
    process.exit = (code) => { exitCode = code; };

    const { validateProductionEnvironment } = require('../src/config/production');
    validateProductionEnvironment();

    process.exit = originalExit;
    assert.equal(exitCode, null);
  });
});
