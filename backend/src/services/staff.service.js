const bcrypt = require('bcryptjs');
const { all, get, run } = require('../config/database');
const { normalizeStaffEmail } = require('../utils/emailAddress');
const { logAudit } = require('../utils/audit');
const { publishChange } = require('../utils/publishChange');
const { parseSchedule, DAYS, DEFAULT_SCHEDULE, formatScheduleSummary } = require('../utils/dentistSchedule');
const { assertPasswordStrength } = require('../utils/passwordPolicy');

function mapStaff(r) {
  const schedule = parseSchedule(r.schedule);
  return {
    id: String(r.id),
    email: r.email,
    fullName: r.full_name,
    role: r.role,
    active: !!r.active,
    createdAt: r.created_at,
    schedule: r.role === 'dentist' ? schedule : null,
    scheduleSummary: r.role === 'dentist' ? formatScheduleSummary(schedule) : null
  };
}

async function listAll() {
  const rows = await all('SELECT id, email, full_name, role, active, created_at, schedule FROM staff ORDER BY full_name');
  return rows.map(mapStaff);
}

async function getSchedule(staffId) {
  const row = await get('SELECT id, full_name, role, schedule FROM staff WHERE id = ?', [staffId]);
  if (!row) {
    const err = new Error('Staff not found');
    err.status = 404;
    throw err;
  }
  if (row.role !== 'dentist') {
    const err = new Error('Schedule applies to dentists only');
    err.status = 400;
    throw err;
  }
  return { id: String(row.id), fullName: row.full_name, schedule: parseSchedule(row.schedule) };
}

async function updateSchedule(staffId, incoming, userId) {
  const row = await get('SELECT id, role FROM staff WHERE id = ?', [staffId]);
  if (!row) {
    const err = new Error('Staff not found');
    err.status = 404;
    throw err;
  }
  if (row.role !== 'dentist') {
    const err = new Error('Schedule applies to dentists only');
    err.status = 400;
    throw err;
  }
  const schedule = {};
  DAYS.forEach((day) => {
    const src = incoming[day] || DEFAULT_SCHEDULE[day];
    schedule[day] = {
      active: !!src.active,
      start: src.start || DEFAULT_SCHEDULE[day].start,
      end: src.end || DEFAULT_SCHEDULE[day].end
    };
  });
  await run(
    'UPDATE staff SET schedule = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [JSON.stringify(schedule), staffId]
  );
  publishChange('staff', 'updated', { id: staffId }, userId);
  return { schedule };
}

async function create({ email, password, fullName, role }, user, req) {
  if (!email || !password || !fullName || !role) {
    const err = new Error('All fields required');
    err.status = 400;
    throw err;
  }
  const trimmedEmail = normalizeStaffEmail(email);
  const existing = await get('SELECT id FROM staff WHERE email = ?', [trimmedEmail]);
  if (existing) {
    const err = new Error('A staff member with this email already exists');
    err.status = 409;
    throw err;
  }
  assertPasswordStrength(password);
  const hash = bcrypt.hashSync(password, 10);
  const defaultSchedule = role === 'dentist' ? JSON.stringify(DEFAULT_SCHEDULE) : null;
  const result = await run(
    `INSERT INTO staff (email, password_hash, full_name, role, schedule) VALUES (?, ?, ?, ?, ?)`,
    [trimmedEmail, hash, fullName.trim(), role, defaultSchedule]
  );
  await logAudit({
    action: 'staff.create',
    entityType: 'staff',
    entityId: result.lastID,
    user,
    details: email,
    req
  });
  publishChange('staff', 'created', { id: result.lastID }, user?.id);
  return { id: String(result.lastID) };
}

async function updateRole(staffId, { role, fullName }, userId) {
  const row = await get('SELECT schedule FROM staff WHERE id = ?', [staffId]);
  let scheduleSql = '';
  const params = [role, fullName];
  if (role === 'dentist' && !row?.schedule) {
    scheduleSql = ', schedule = ?';
    params.push(JSON.stringify(DEFAULT_SCHEDULE));
  }
  params.push(staffId);
  await run(
    `UPDATE staff SET role = ?, full_name = COALESCE(?, full_name)${scheduleSql}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    params
  );
  publishChange('staff', 'updated', { id: staffId }, userId);
}

async function setActive(staffId, active, user, req) {
  if (typeof active !== 'boolean') {
    const err = new Error('active must be true or false');
    err.status = 400;
    throw err;
  }
  if (String(staffId) === String(user.id)) {
    const err = new Error('Cannot change your own account status');
    err.status = 400;
    throw err;
  }
  const row = await get('SELECT id FROM staff WHERE id = ?', [staffId]);
  if (!row) {
    const err = new Error('Staff not found');
    err.status = 404;
    throw err;
  }
  await run(
    'UPDATE staff SET active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [active ? 1 : 0, staffId]
  );
  await logAudit({
    action: active ? 'staff.activate' : 'staff.deactivate',
    entityType: 'staff',
    entityId: staffId,
    user,
    req
  });
  publishChange('staff', active ? 'activated' : 'deactivated', { id: staffId }, user?.id);
}

async function resetPassword(staffId, newPassword, user, req) {
  assertPasswordStrength(newPassword);
  const row = await get('SELECT id, email FROM staff WHERE id = ?', [staffId]);
  if (!row) {
    const err = new Error('Staff not found');
    err.status = 404;
    throw err;
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  await run(
    'UPDATE staff SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [hash, staffId]
  );
  await logAudit({
    action: 'staff.password_reset',
    entityType: 'staff',
    entityId: staffId,
    user,
    details: row.email,
    req
  });
  publishChange('staff', 'password_reset', { id: staffId }, user?.id);
}

module.exports = {
  listAll,
  getSchedule,
  updateSchedule,
  create,
  updateRole,
  setActive,
  resetPassword
};
