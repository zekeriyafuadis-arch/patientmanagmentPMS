const bcrypt = require('bcryptjs');
const { get, run } = require('../config/database');
const { signToken } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const { normalizeStaffEmail } = require('../utils/emailAddress');
const { emailDomain } = require('../config/env');

function mapUser(staff) {
  return {
    id: String(staff.id),
    email: staff.email,
    fullName: staff.full_name,
    role: staff.role
  };
}

const { getLanAddresses } = require('../utils/networkUrls');
const { getPasswordPolicy } = require('../utils/passwordPolicy');

function getPublicConfig() {
  const port = parseInt(process.env.PORT, 10) || 3000;
  return {
    emailDomain,
    port,
    localUrl: `http://localhost:${port}`,
    networkUrls: getLanAddresses(port),
    passwordPolicy: getPasswordPolicy()
  };
}

async function login(email, password, req) {
  const normalizedEmail = normalizeStaffEmail(email);
  const staffAny = await get('SELECT * FROM staff WHERE email = ?', [normalizedEmail]);
  if (!staffAny) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }
  if (!staffAny.active) {
    const err = new Error('This account has been deactivated. Contact your administrator.');
    err.status = 401;
    err.code = 'ACCOUNT_INACTIVE';
    throw err;
  }
  if (!bcrypt.compareSync(password, staffAny.password_hash)) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }
  const staff = staffAny;
  const token = signToken(staff);
  await logAudit({
    action: 'auth.login',
    entityType: 'staff',
    entityId: staff.id,
    user: { id: staff.id, fullName: staff.full_name, email: staff.email },
    req
  });
  return { token, user: mapUser(staff) };
}

async function getMe(userId) {
  const staff = await get('SELECT id, email, full_name, role, active FROM staff WHERE id = ?', [userId]);
  if (!staff || !staff.active) {
    const err = new Error('Not authenticated');
    err.status = 401;
    throw err;
  }
  return mapUser(staff);
}

async function changePassword(userId, currentPassword, newPassword, req) {
  const staff = await get('SELECT * FROM staff WHERE id = ? AND active = 1', [userId]);
  if (!staff || !bcrypt.compareSync(currentPassword, staff.password_hash)) {
    const err = new Error('Current password is incorrect');
    err.status = 401;
    throw err;
  }
  const { assertPasswordStrength } = require('../utils/passwordPolicy');
  assertPasswordStrength(newPassword);
  const hash = bcrypt.hashSync(newPassword, 10);
  await run(
    'UPDATE staff SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [hash, userId]
  );
  await logAudit({
    action: 'auth.password_change',
    entityType: 'staff',
    entityId: staff.id,
    user: req.user,
    req
  });
}

module.exports = { login, getMe, changePassword, getPublicConfig };
