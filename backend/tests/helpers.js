const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');

function clearBackendCache() {
  const backendRoot = path.join(__dirname, '..');
  Object.keys(require.cache).forEach((key) => {
    if (key.startsWith(backendRoot)) {
      delete require.cache[key];
    }
  });
}

async function startTestServer({ rateLimitMax } = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pms-test-'));
  process.env.PMS_DATA_DIR = tmpDir;
  process.env.PMS_DB_PATH = path.join(tmpDir, 'test.db');
  process.env.JWT_SECRET = 'test-jwt-secret-phase5';
  process.env.NODE_ENV = 'test';
  process.env.PMS_EMAIL_DOMAIN = '@pws.com';
  process.env.PMS_ADMIN_USERNAME = 'admin';
  process.env.PMS_ADMIN_PASSWORD = 'admin123';
  process.env.PMS_ADMIN_FULL_NAME = 'Administrator';

  if (rateLimitMax != null) {
    delete process.env.PMS_DISABLE_RATE_LIMIT;
    process.env.RATE_LIMIT_AUTH_MAX = String(rateLimitMax);
  } else {
    process.env.PMS_DISABLE_RATE_LIMIT = '1';
  }

  clearBackendCache();

  const { createApp, initDatabase } = require('../app');
  await initDatabase();
  const app = createApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const port = server.address().port;

  return {
    server,
    baseUrl: `http://127.0.0.1:${port}/api/v1`,
    tmpDir,
    async close() {
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      try {
        const { closeDatabase } = require('../src/config/database');
        await closeDatabase();
      } catch {
        /* ignore if already closed */
      }
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        /* Windows may keep sqlite handle briefly */
      }
      clearBackendCache();
    }
  };
}

async function jsonRequest(baseUrl, route, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${route}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function binaryRequest(baseUrl, route, { method = 'GET', token } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${route}`, { method, headers });
  const buffer = Buffer.from(await res.arrayBuffer());
  return {
    status: res.status,
    contentType: res.headers.get('content-type') || '',
    buffer
  };
}

async function sseConnect(baseUrl, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}/events/stream`);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`SSE failed with status ${res.statusCode}`));
        return;
      }
      let buffer = '';
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        if (buffer.includes('"type":"connected"') || buffer.includes('"type": "connected"')) {
          req.destroy();
          resolve({ status: res.statusCode, buffer });
        }
      });
      setTimeout(() => {
        req.destroy();
        reject(new Error('SSE connection timeout'));
      }, 5000);
    });
    req.on('error', reject);
    req.end();
  });
}

async function loginAs(baseUrl, email, password = 'admin123') {
  const login = await jsonRequest(baseUrl, '/auth/login', {
    method: 'POST',
    body: { email, password }
  });
  return login.data.token;
}

async function createStaff(baseUrl, adminToken, { email, password, fullName, role }) {
  const created = await jsonRequest(baseUrl, '/staff', {
    method: 'POST',
    token: adminToken,
    body: { email, password, fullName, role }
  });
  return created.data.data.id;
}

async function setupConfirmedPatient(baseUrl, adminToken, dentistToken, patientBody = samplePatient) {
  const patient = await jsonRequest(baseUrl, '/patients', {
    method: 'POST',
    token: adminToken,
    body: patientBody
  });
  const patientId = patient.data.data.id;
  const me = await jsonRequest(baseUrl, '/auth/me', { token: dentistToken });
  const staffId = me.data.user.id;
  const datetime = new Date(Date.now() + 86400000 * 2).toISOString();
  const assign = await jsonRequest(baseUrl, '/appointments/assign', {
    method: 'POST',
    token: adminToken,
    body: { patientId, staffId, datetime, duration: 30 }
  });
  const appointmentId = assign.data.data.appointmentId;
  await jsonRequest(baseUrl, `/appointments/${appointmentId}/confirm`, {
    method: 'POST',
    token: dentistToken
  });
  return { patientId, appointmentId };
}

const samplePatient = {
  name: 'Test Patient',
  father_name: 'Father Name',
  grandfather_name: 'Grandfather Name',
  gender: 'Male',
  dob: '1990-05-15',
  age: '34',
  address: '123 Test Street',
  region: 'Addis Ababa',
  wereda_subcity: 'Bole',
  ketena_gott: '06',
  kebele: '12',
  phone_number: '0911000000',
  emergency_name: 'Emergency Contact',
  emergency_number: '0922000000'
};

module.exports = {
  startTestServer,
  jsonRequest,
  binaryRequest,
  sseConnect,
  loginAs,
  createStaff,
  setupConfirmedPatient,
  samplePatient,
  clearBackendCache
};
