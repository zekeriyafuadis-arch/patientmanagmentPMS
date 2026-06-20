/**
 * E2E test server — isolated DB on port 3099
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pms-e2e-'));
process.env.PMS_DATA_DIR = tmpDir;
process.env.PMS_DB_PATH = path.join(tmpDir, 'e2e.db');
process.env.JWT_SECRET = 'e2e-jwt-secret';
process.env.NODE_ENV = 'test';
process.env.PMS_DISABLE_RATE_LIMIT = '1';
process.env.PMS_EMAIL_DOMAIN = '@pws.com';
process.env.PMS_ADMIN_USERNAME = 'admin';
process.env.PMS_ADMIN_PASSWORD = 'admin123';
process.env.PMS_ADMIN_FULL_NAME = 'E2E Admin';
process.env.PORT = '3099';

const { createApp, initDatabase } = require('../backend/app');

initDatabase()
  .then(() => {
    const app = createApp();
    app.listen(3099, '127.0.0.1', () => {
      console.log('E2E server ready on http://127.0.0.1:3099');
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
