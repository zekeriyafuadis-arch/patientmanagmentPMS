const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, jsonRequest, sseConnect, loginAs, createStaff, setupConfirmedPatient, samplePatient } = require('./helpers');

const TEST_ADMIN_EMAIL = 'admin@pws.com';
const TEST_ADMIN_PASSWORD = 'admin123';

describe('API integration', () => {
  let ctx;

  before(async () => {
    ctx = await startTestServer();
  });

  after(async () => {
    await ctx.close();
  });

  describe('auth', () => {
    it('returns health without authentication', async () => {
      const { status, data } = await jsonRequest(ctx.baseUrl, '/admin/health');
      assert.equal(status, 200);
      assert.equal(data.status, 'ok');
      assert.equal(data.database, 'sqlite');
    });

    it('returns public auth config', async () => {
      const { status, data } = await jsonRequest(ctx.baseUrl, '/auth/config');
      assert.equal(status, 200);
      assert.equal(data.success, true);
      assert.equal(data.emailDomain, '@pws.com');
    });

    it('rejects login with invalid body', async () => {
      const { status, data } = await jsonRequest(ctx.baseUrl, '/auth/login', {
        method: 'POST',
        body: { email: '', password: '' }
      });
      assert.equal(status, 400);
      assert.equal(data.success, false);
      assert.equal(data.error.code, 'VALIDATION_ERROR');
    });

    it('rejects invalid credentials', async () => {
      const { status, data } = await jsonRequest(ctx.baseUrl, '/auth/login', {
        method: 'POST',
        body: { email: 'admin', password: 'wrong-password' }
      });
      assert.equal(status, 401);
      assert.equal(data.success, false);
    });

    it('logs in with default admin and returns /me', async () => {
      const login = await jsonRequest(ctx.baseUrl, '/auth/login', {
        method: 'POST',
        body: { email: 'admin', password: TEST_ADMIN_PASSWORD }
      });
      assert.equal(login.status, 200);
      assert.equal(login.data.success, true);
      assert.ok(login.data.token);

      const me = await jsonRequest(ctx.baseUrl, '/auth/me', { token: login.data.token });
      assert.equal(me.status, 200);
      assert.equal(me.data.user.email, TEST_ADMIN_EMAIL);
      assert.equal(me.data.user.role, 'admin');
    });
  });

  describe('patients', () => {
    let token;

    before(async () => {
      const login = await jsonRequest(ctx.baseUrl, '/auth/login', {
        method: 'POST',
        body: { email: 'admin', password: TEST_ADMIN_PASSWORD }
      });
      token = login.data.token;
    });

    it('rejects patient create when required fields are missing', async () => {
      const { status, data } = await jsonRequest(ctx.baseUrl, '/patients', {
        method: 'POST',
        token,
        body: { name: 'Only Name' }
      });
      assert.equal(status, 400);
      assert.equal(data.error.code, 'VALIDATION_ERROR');
    });

    it('creates a patient with valid payload', async () => {
      const { status, data } = await jsonRequest(ctx.baseUrl, '/patients', {
        method: 'POST',
        token,
        body: samplePatient
      });
      assert.equal(status, 201);
      assert.equal(data.success, true);
      assert.ok(data.data?.id);
      assert.ok(data.data?.mrn);
    });

    it('lists patients after create', async () => {
      const { status, data } = await jsonRequest(ctx.baseUrl, '/patients', { token });
      assert.equal(status, 200);
      assert.equal(data.success, true);
      assert.ok(Array.isArray(data.data));
      assert.ok(data.data.length >= 1);
    });
  });

  describe('auth password', () => {
    let token;

    before(async () => {
      const login = await jsonRequest(ctx.baseUrl, '/auth/login', {
        method: 'POST',
        body: { email: 'admin', password: TEST_ADMIN_PASSWORD }
      });
      token = login.data.token;
    });

    it('rejects password change with wrong current password', async () => {
      const { status } = await jsonRequest(ctx.baseUrl, '/auth/change-password', {
        method: 'POST',
        token,
        body: { currentPassword: 'wrong', newPassword: 'newpass123' }
      });
      assert.equal(status, 401);
    });

    it('changes password and logs in with new password', async () => {
      const change = await jsonRequest(ctx.baseUrl, '/auth/change-password', {
        method: 'POST',
        token,
        body: { currentPassword: TEST_ADMIN_PASSWORD, newPassword: 'admin456' }
      });
      assert.equal(change.status, 200);

      const oldLogin = await jsonRequest(ctx.baseUrl, '/auth/login', {
        method: 'POST',
        body: { email: 'admin', password: TEST_ADMIN_PASSWORD }
      });
      assert.equal(oldLogin.status, 401);

      const newLogin = await jsonRequest(ctx.baseUrl, '/auth/login', {
        method: 'POST',
        body: { email: 'admin', password: 'admin456' }
      });
      assert.equal(newLogin.status, 200);

      await jsonRequest(ctx.baseUrl, '/auth/change-password', {
        method: 'POST',
        token: newLogin.data.token,
        body: { currentPassword: 'admin456', newPassword: TEST_ADMIN_PASSWORD }
      });
    });
  });

  describe('appointments', () => {
    let token;
    let patientId;

    before(async () => {
      const login = await jsonRequest(ctx.baseUrl, '/auth/login', {
        method: 'POST',
        body: { email: 'admin', password: TEST_ADMIN_PASSWORD }
      });
      token = login.data.token;
      const created = await jsonRequest(ctx.baseUrl, '/patients', {
        method: 'POST',
        token,
        body: samplePatient
      });
      patientId = created.data.data.id;
    });

    it('rejects appointment create without patientId', async () => {
      const { status, data } = await jsonRequest(ctx.baseUrl, '/appointments', {
        method: 'POST',
        token,
        body: { type: 'checkup' }
      });
      assert.equal(status, 400);
      assert.equal(data.error.code, 'VALIDATION_ERROR');
    });

    it('creates an appointment', async () => {
      const { status, data } = await jsonRequest(ctx.baseUrl, '/appointments', {
        method: 'POST',
        token,
        body: {
          patientId,
          patientName: samplePatient.name,
          datetime: new Date(Date.now() + 86400000).toISOString(),
          type: 'checkup',
          skipAssignmentFlow: true
        }
      });
      assert.equal(status, 201);
      assert.equal(data.success, true);
      assert.ok(data.data?.id);
    });
  });

  describe('billing', () => {
    let token;
    let patientId;

    before(async () => {
      const login = await jsonRequest(ctx.baseUrl, '/auth/login', {
        method: 'POST',
        body: { email: 'admin', password: TEST_ADMIN_PASSWORD }
      });
      token = login.data.token;
      const created = await jsonRequest(ctx.baseUrl, '/patients', {
        method: 'POST',
        token,
        body: { ...samplePatient, name: 'Billing Test Patient', phone_number: '0911000001' }
      });
      patientId = created.data.data.id;
    });

    it('rejects invoice without line items', async () => {
      const { status, data } = await jsonRequest(ctx.baseUrl, '/billing/invoices', {
        method: 'POST',
        token,
        body: { patientId, patientName: 'Billing Test Patient', items: [] }
      });
      assert.equal(status, 400);
      assert.equal(data.error.code, 'VALIDATION_ERROR');
    });

    it('creates an invoice', async () => {
      const { status, data } = await jsonRequest(ctx.baseUrl, '/billing/invoices', {
        method: 'POST',
        token,
        body: {
          patientId,
          patientName: 'Billing Test Patient',
          items: [{ description: 'Consultation', quantity: 1, unitPrice: 500 }]
        }
      });
      assert.equal(status, 201);
      assert.equal(data.success, true);
      assert.ok(data.data?.id);
    });
  });

  describe('admin backup', () => {
    let token;

    before(async () => {
      const login = await jsonRequest(ctx.baseUrl, '/auth/login', {
        method: 'POST',
        body: { email: 'admin', password: TEST_ADMIN_PASSWORD }
      });
      token = login.data.token;
    });

    it('creates and lists backups', async () => {
      const backup = await jsonRequest(ctx.baseUrl, '/admin/backup', {
        method: 'POST',
        token,
        body: {}
      });
      assert.equal(backup.status, 200);
      assert.ok(backup.data.data?.name);

      const list = await jsonRequest(ctx.baseUrl, '/admin/backups', { token });
      assert.equal(list.status, 200);
      assert.ok(Array.isArray(list.data.data));
      assert.ok(list.data.data.length >= 1);
    });
  });

  describe('staff', () => {
    let token;

    before(async () => {
      const login = await jsonRequest(ctx.baseUrl, '/auth/login', {
        method: 'POST',
        body: { email: 'admin', password: TEST_ADMIN_PASSWORD }
      });
      token = login.data.token;
    });

    it('creates and deactivates staff', async () => {
      const created = await jsonRequest(ctx.baseUrl, '/staff', {
        method: 'POST',
        token,
        body: {
          email: 'temp',
          password: 'temp123',
          fullName: 'Temp Staff',
          role: 'receptionist'
        }
      });
      assert.equal(created.status, 201);
      const staffId = created.data.data.id;

      const deactivate = await jsonRequest(ctx.baseUrl, `/staff/${staffId}/active`, {
        method: 'PATCH',
        token,
        body: { active: false }
      });
      assert.equal(deactivate.status, 200);

      const loginBlocked = await jsonRequest(ctx.baseUrl, '/auth/login', {
        method: 'POST',
        body: { email: 'temp', password: 'temp123' }
      });
      assert.equal(loginBlocked.status, 401);
    });
  });

  describe('RBAC', () => {
    let adminToken;
    let receptionistToken;
    let dentistToken;
    let patientId;

    before(async () => {
      const adminLogin = await jsonRequest(ctx.baseUrl, '/auth/login', {
        method: 'POST',
        body: { email: 'admin', password: TEST_ADMIN_PASSWORD }
      });
      adminToken = adminLogin.data.token;

      const rec = await jsonRequest(ctx.baseUrl, '/staff', {
        method: 'POST',
        token: adminToken,
        body: {
          email: 'reception',
          password: 'rec12345',
          fullName: 'Reception Test',
          role: 'receptionist'
        }
      });
      assert.equal(rec.status, 201);

      const dent = await jsonRequest(ctx.baseUrl, '/staff', {
        method: 'POST',
        token: adminToken,
        body: {
          email: 'dentist1',
          password: 'den12345',
          fullName: 'Dentist Test',
          role: 'dentist'
        }
      });
      assert.equal(dent.status, 201);

      const recLogin = await jsonRequest(ctx.baseUrl, '/auth/login', {
        method: 'POST',
        body: { email: 'reception', password: 'rec12345' }
      });
      receptionistToken = recLogin.data.token;

      const dentLogin = await jsonRequest(ctx.baseUrl, '/auth/login', {
        method: 'POST',
        body: { email: 'dentist1', password: 'den12345' }
      });
      dentistToken = dentLogin.data.token;

      const created = await jsonRequest(ctx.baseUrl, '/patients', {
        method: 'POST',
        token: adminToken,
        body: { ...samplePatient, name: 'RBAC Patient', phone_number: '0911000099' }
      });
      patientId = created.data.data.id;
    });

    it('blocks receptionist from revenue stats', async () => {
      const { status } = await jsonRequest(ctx.baseUrl, '/billing/revenue-stats', {
        token: receptionistToken
      });
      assert.equal(status, 403);
    });

    it('allows admin revenue stats', async () => {
      const { status, data } = await jsonRequest(ctx.baseUrl, '/billing/revenue-stats', {
        token: adminToken
      });
      assert.equal(status, 200);
      assert.equal(data.success, true);
      assert.ok(typeof data.data.today === 'number');
    });

    it('blocks dentist from billing invoices', async () => {
      const { status } = await jsonRequest(ctx.baseUrl, '/billing/invoices', {
        token: dentistToken
      });
      assert.equal(status, 403);
    });

    it('allows receptionist to list invoices', async () => {
      const { status, data } = await jsonRequest(ctx.baseUrl, '/billing/invoices', {
        token: receptionistToken
      });
      assert.equal(status, 200);
      assert.equal(data.success, true);
    });

    it('receptionist discount creates pending_discount invoice', async () => {
      const { status, data } = await jsonRequest(ctx.baseUrl, '/billing/invoices', {
        method: 'POST',
        token: receptionistToken,
        body: {
          patientId,
          patientName: 'RBAC Patient',
          discount: 50,
          items: [{ procedureName: 'Consultation', quantity: 1, unitPrice: 200 }]
        }
      });
      assert.equal(status, 201);
      assert.ok(data.data?.id);

      const invoice = await jsonRequest(ctx.baseUrl, `/billing/invoices/${data.data.id}`, {
        token: adminToken
      });
      assert.equal(invoice.status, 200);
      assert.equal(invoice.data.data.status, 'pending_discount');
      assert.equal(invoice.data.data.discountStatus, 'pending');
    });

    it('blocks payment when discount is pending', async () => {
      const created = await jsonRequest(ctx.baseUrl, '/billing/invoices', {
        method: 'POST',
        token: receptionistToken,
        body: {
          patientId,
          patientName: 'RBAC Patient',
          discount: 25,
          items: [{ procedureName: 'Cleaning', quantity: 1, unitPrice: 300 }]
        }
      });
      const invoiceId = created.data.data.id;

      const pay = await jsonRequest(ctx.baseUrl, '/billing/payments', {
        method: 'POST',
        token: receptionistToken,
        body: { invoiceId, amount: 100, method: 'cash' }
      });
      assert.equal(pay.status, 400);
      assert.match(pay.data.error, /discount pending/i);
    });

    it('admin can approve pending discount', async () => {
      const created = await jsonRequest(ctx.baseUrl, '/billing/invoices', {
        method: 'POST',
        token: receptionistToken,
        body: {
          patientId,
          patientName: 'RBAC Patient',
          discount: 10,
          items: [{ procedureName: 'X-Ray', quantity: 1, unitPrice: 150 }]
        }
      });
      const invoiceId = created.data.data.id;

      const approve = await jsonRequest(ctx.baseUrl, `/billing/invoices/${invoiceId}/approve-discount`, {
        method: 'POST',
        token: adminToken,
        body: {}
      });
      assert.equal(approve.status, 200);

      const invoice = await jsonRequest(ctx.baseUrl, `/billing/invoices/${invoiceId}`, {
        token: adminToken
      });
      assert.equal(invoice.data.data.discountStatus, 'approved');
      assert.notEqual(invoice.data.data.status, 'pending_discount');
    });

    it('rejects payment exceeding invoice balance', async () => {
      const created = await jsonRequest(ctx.baseUrl, '/billing/invoices', {
        method: 'POST',
        token: adminToken,
        body: {
          patientId,
          patientName: 'RBAC Patient',
          items: [{ procedureName: 'Checkup', quantity: 1, unitPrice: 100 }]
        }
      });
      const invoiceId = created.data.data.id;

      const pay = await jsonRequest(ctx.baseUrl, '/billing/payments', {
        method: 'POST',
        token: adminToken,
        body: { invoiceId, amount: 500, method: 'cash' }
      });
      assert.equal(pay.status, 400);
      assert.match(pay.data.error, /cannot exceed balance/i);
    });

    it('refreshes role from database on authenticated request', async () => {
      const dentStaff = await jsonRequest(ctx.baseUrl, '/staff', {
        method: 'POST',
        token: adminToken,
        body: {
          email: 'rolechange',
          password: 'role12345',
          fullName: 'Role Change Test',
          role: 'receptionist'
        }
      });
      const staffId = dentStaff.data.data.id;
      const login = await jsonRequest(ctx.baseUrl, '/auth/login', {
        method: 'POST',
        body: { email: 'rolechange', password: 'role12345' }
      });
      const userToken = login.data.token;

      let me = await jsonRequest(ctx.baseUrl, '/auth/me', { token: userToken });
      assert.equal(me.data.user.role, 'receptionist');

      await jsonRequest(ctx.baseUrl, `/staff/${staffId}/role`, {
        method: 'PATCH',
        token: adminToken,
        body: { role: 'dentist', fullName: 'Role Change Test' }
      });

      me = await jsonRequest(ctx.baseUrl, '/auth/me', { token: userToken });
      assert.equal(me.data.user.role, 'dentist');

      const billing = await jsonRequest(ctx.baseUrl, '/billing/invoices', { token: userToken });
      assert.equal(billing.status, 403);
    });
  });

  describe('procedures', () => {
    let adminToken;

    before(async () => {
      adminToken = await loginAs(ctx.baseUrl, 'admin', TEST_ADMIN_PASSWORD);
    });

    it('creates and lists procedures', async () => {
      const created = await jsonRequest(ctx.baseUrl, '/procedures', {
        method: 'POST',
        token: adminToken,
        body: { code: 'T-D1110', name: 'Test Prophylaxis', defaultPrice: 150, category: 'Preventive' }
      });
      assert.equal(created.status, 201);
      assert.ok(created.data.data?.id);

      const list = await jsonRequest(ctx.baseUrl, '/procedures', { token: adminToken });
      assert.equal(list.status, 200);
      assert.ok(list.data.data.some((p) => p.code === 'T-D1110'));
    });
  });

  describe('clinical', () => {
    let adminToken;
    let dentistToken;
    let patientId;

    before(async () => {
      adminToken = await loginAs(ctx.baseUrl, 'admin', TEST_ADMIN_PASSWORD);
      await createStaff(ctx.baseUrl, adminToken, {
        email: 'clinicaldent',
        password: 'den12345',
        fullName: 'Clinical Dentist',
        role: 'dentist'
      });
      dentistToken = await loginAs(ctx.baseUrl, 'clinicaldent', 'den12345');
      ({ patientId } = await setupConfirmedPatient(ctx.baseUrl, adminToken, dentistToken, {
        ...samplePatient,
        name: 'Clinical Test Patient',
        phone_number: '0911000088'
      }));
    });

    it('creates and lists SOAP notes for assigned dentist', async () => {
      const created = await jsonRequest(ctx.baseUrl, '/clinical/notes', {
        method: 'POST',
        token: dentistToken,
        body: {
          patientId,
          subjective: 'Tooth pain',
          objective: 'Caries on 36',
          assessment: 'Moderate decay',
          plan: 'Composite filling'
        }
      });
      assert.equal(created.status, 201);
      assert.ok(created.data.data?.id);

      const list = await jsonRequest(ctx.baseUrl, `/clinical/notes/${patientId}`, { token: dentistToken });
      assert.equal(list.status, 200);
      assert.ok(list.data.data.length >= 1);
    });

    it('creates dental chart for assigned dentist', async () => {
      const created = await jsonRequest(ctx.baseUrl, '/clinical/charts', {
        method: 'POST',
        token: dentistToken,
        body: {
          patientId,
          chartData: { teeth: { '36': { status: 'caries' } } },
          visitDate: new Date().toISOString()
        }
      });
      assert.equal(created.status, 201);
      assert.ok(created.data.data?.id);
    });
  });

  describe('alerts', () => {
    let adminToken;
    let receptionistToken;

    before(async () => {
      adminToken = await loginAs(ctx.baseUrl, 'admin', TEST_ADMIN_PASSWORD);
      await createStaff(ctx.baseUrl, adminToken, {
        email: 'alertrec',
        password: 'rec12345',
        fullName: 'Alert Reception',
        role: 'receptionist'
      });
      receptionistToken = await loginAs(ctx.baseUrl, 'alertrec', 'rec12345');
    });

    it('lists clinic alerts for receptionist', async () => {
      const { status, data } = await jsonRequest(ctx.baseUrl, '/alerts', { token: receptionistToken });
      assert.equal(status, 200);
      assert.equal(data.success, true);
      assert.ok(Array.isArray(data.data));
    });

    it('marks all alerts read', async () => {
      const { status } = await jsonRequest(ctx.baseUrl, '/alerts/read-all', {
        method: 'POST',
        token: receptionistToken
      });
      assert.equal(status, 200);
    });
  });

  describe('images', () => {
    let adminToken;
    let dentistToken;
    let patientId;

    before(async () => {
      adminToken = await loginAs(ctx.baseUrl, 'admin', TEST_ADMIN_PASSWORD);
      await createStaff(ctx.baseUrl, adminToken, {
        email: 'imgdent',
        password: 'den12345',
        fullName: 'Image Dentist',
        role: 'dentist'
      });
      dentistToken = await loginAs(ctx.baseUrl, 'imgdent', 'den12345');
      ({ patientId } = await setupConfirmedPatient(ctx.baseUrl, adminToken, dentistToken, {
        ...samplePatient,
        name: 'Image Test Patient',
        phone_number: '0911000077'
      }));
    });

    it('lists patient images for assigned dentist', async () => {
      const { status, data } = await jsonRequest(ctx.baseUrl, `/images/${patientId}`, { token: dentistToken });
      assert.equal(status, 200);
      assert.equal(data.success, true);
      assert.ok(Array.isArray(data.data));
    });
  });

  describe('events SSE', () => {
    it('connects to event stream with valid token', async () => {
      const token = await loginAs(ctx.baseUrl, 'admin', TEST_ADMIN_PASSWORD);
      const result = await sseConnect(ctx.baseUrl, token);
      assert.equal(result.status, 200);
      assert.match(result.buffer, /connected/);
    });

    it('rejects event stream without token', async () => {
      const { status } = await jsonRequest(ctx.baseUrl, '/events/stream');
      assert.equal(status, 401);
    });
  });
});

describe('rate limiting', () => {
  let ctx;

  before(async () => {
    ctx = await startTestServer({ rateLimitMax: 3 });
  });

  after(async () => {
    await ctx.close();
  });

  it('returns 429 after too many login attempts', async () => {
    const payload = { email: 'admin', password: 'wrong' };
    let lastStatus = 0;

    for (let i = 0; i < 4; i += 1) {
      const { status } = await jsonRequest(ctx.baseUrl, '/auth/login', {
        method: 'POST',
        body: payload
      });
      lastStatus = status;
    }

    assert.equal(lastStatus, 429);
  });
});
