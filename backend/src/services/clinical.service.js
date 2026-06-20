const { all, get, run } = require('../config/database');
const { canAccessClinical } = require('../utils/clinicalAccess');
const { publishChange } = require('../utils/publishChange');
const { canViewClinicalRecords } = require('../utils/permissions');

function itemSource(item) {
  return item?.source || 'dentist';
}

function validateAdminPlanUpdate(existingItems, newItems) {
  const existingMap = new Map(existingItems.map((i) => [String(i.id), i]));
  if (newItems.length < existingItems.length) {
    const err = new Error('Admin cannot remove treatment items');
    err.status = 403;
    throw err;
  }

  return newItems.map((item) => {
    const old = existingMap.get(String(item.id));
    if (old) {
      if (itemSource(old) !== 'admin_additional') {
        const unchanged =
          old.status === item.status
          && old.procedureName === item.procedureName
          && String(old.price) === String(item.price)
          && old.procedureCode === item.procedureCode
          && String(old.toothNumber || '') === String(item.toothNumber || '')
          && Boolean(old.invoiced) === Boolean(item.invoiced);
        if (!unchanged) {
          const err = new Error('Admin cannot modify dentist treatment items');
          err.status = 403;
          throw err;
        }
        return { ...item, source: itemSource(old) };
      }
      if (item.status === 'completed' && old.status !== 'completed') {
        const err = new Error('Admin cannot mark procedures as completed');
        err.status = 403;
        throw err;
      }
      return { ...item, source: 'admin_additional' };
    }

    if (item.status === 'completed') {
      const err = new Error('Admin cannot add completed procedures');
      err.status = 403;
      throw err;
    }
    return { ...item, source: 'admin_additional' };
  });
}

async function assertCanViewPlan(user, patientId) {
  if (!canViewClinicalRecords(user)) {
    const err = new Error('Insufficient permissions');
    err.status = 403;
    throw err;
  }
  if (user.role === 'admin') return;
  const allowed = await canAccessClinical(user, patientId);
  if (!allowed) {
    const err = new Error('Only the assigned doctor can access this plan');
    err.status = 403;
    throw err;
  }
}

async function assertCanUpdatePlan(user, patientId) {
  if (user.role === 'admin') return;
  if (user.role === 'dentist') {
    const allowed = await canAccessClinical(user, patientId);
    if (!allowed) {
      const err = new Error('Only the assigned doctor can update this plan');
      err.status = 403;
      throw err;
    }
    return;
  }
  const err = new Error('Insufficient permissions');
  err.status = 403;
  throw err;
}

async function listCharts(patientId) {
  const rows = await all(
    'SELECT * FROM dental_charts WHERE patient_id = ? ORDER BY visit_date DESC',
    [patientId]
  );
  return rows.map((r) => ({
    id: String(r.id),
    patientId: String(r.patient_id),
    chartData: JSON.parse(r.chart_data || '{}'),
    visitDate: r.visit_date,
    createdBy: r.created_by,
    createdByName: r.created_by_name,
    created_at: r.created_at
  }));
}

async function createChart({ patientId, chartData, visitDate }, user, userId) {
  const result = await run(
    `INSERT INTO dental_charts (patient_id, chart_data, visit_date, created_by, created_by_name) VALUES (?, ?, ?, ?, ?)`,
    [patientId, JSON.stringify(chartData || {}), visitDate || new Date().toISOString(), user.id, user.fullName]
  );
  publishChange('clinical', 'created', { id: result.lastID, patientId }, userId);
  return { id: String(result.lastID) };
}

async function listPlans(patientId) {
  const rows = await all(
    'SELECT * FROM treatment_plans WHERE patient_id = ? ORDER BY created_at DESC',
    [patientId]
  );
  return rows.map((r) => ({
    id: String(r.id),
    patientId: String(r.patient_id),
    title: r.title,
    status: r.status,
    items: JSON.parse(r.items || '[]'),
    createdBy: r.created_by,
    createdByName: r.created_by_name,
    created_at: r.created_at
  }));
}

async function createPlan({ patientId, title, items }, user, userId) {
  const normalizedItems = (items || []).map((item) => ({
    ...item,
    source: 'dentist'
  }));
  const result = await run(
    `INSERT INTO treatment_plans (patient_id, title, status, items, created_by, created_by_name) VALUES (?, ?, 'active', ?, ?, ?)`,
    [patientId, title || 'Treatment Plan', JSON.stringify(normalizedItems), user.id, user.fullName]
  );
  publishChange('clinical', 'created', { id: result.lastID, patientId }, userId);
  return { id: String(result.lastID) };
}

async function getPlan(id, user) {
  const r = await get('SELECT * FROM treatment_plans WHERE id = ?', [id]);
  if (!r) {
    const err = new Error('Not found');
    err.status = 404;
    throw err;
  }
  await assertCanViewPlan(user, String(r.patient_id));
  return {
    id: String(r.id),
    patientId: String(r.patient_id),
    title: r.title,
    status: r.status,
    items: JSON.parse(r.items || '[]')
  };
}

async function updatePlan(id, { title, status, items }, user, userId) {
  const plan = await get('SELECT * FROM treatment_plans WHERE id = ?', [id]);
  if (!plan) {
    const err = new Error('Not found');
    err.status = 404;
    throw err;
  }
  await assertCanUpdatePlan(user, String(plan.patient_id));

  let itemsJson = null;
  if (items) {
    const existingItems = JSON.parse(plan.items || '[]');
    let normalizedItems = items;
    if (user.role === 'admin') {
      normalizedItems = validateAdminPlanUpdate(existingItems, items);
    } else if (user.role === 'dentist') {
      normalizedItems = items.map((item) => ({
        ...item,
        source: item.source || 'dentist'
      }));
    }
    itemsJson = JSON.stringify(normalizedItems);
  }

  await run(
    `UPDATE treatment_plans SET title=COALESCE(?, title), status=COALESCE(?, status), items=COALESCE(?, items), updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [title, status, itemsJson, id]
  );
  publishChange('clinical', 'updated', { id, patientId: plan.patient_id }, userId);
}

async function listNotes(patientId) {
  const rows = await all(
    'SELECT * FROM visit_notes WHERE patient_id = ? ORDER BY visit_date DESC',
    [patientId]
  );
  return rows.map((r) => ({
    id: String(r.id),
    patientId: String(r.patient_id),
    appointmentId: r.appointment_id,
    visitDate: r.visit_date,
    notes: r.notes,
    subjective: r.subjective,
    objective: r.objective,
    assessment: r.assessment,
    plan: r.plan,
    createdBy: r.created_by,
    createdByName: r.created_by_name,
    created_at: r.created_at
  }));
}

async function createNote(body, user, userId) {
  const result = await run(
    `INSERT INTO visit_notes (patient_id, appointment_id, visit_date, notes, subjective, objective, assessment, plan, created_by, created_by_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      body.patientId,
      body.appointmentId || '',
      new Date().toISOString(),
      body.notes || '',
      body.subjective || '',
      body.objective || '',
      body.assessment || '',
      body.plan || '',
      user.id,
      user.fullName
    ]
  );
  publishChange('clinical', 'created', { id: result.lastID, patientId: body.patientId }, userId);
  return { id: String(result.lastID) };
}

async function treatmentSummary() {
  const rows = await all(`SELECT items FROM treatment_plans WHERE status = 'active'`);
  let pendingProcedures = 0;
  let completedProcedures = 0;
  rows.forEach((r) => {
    JSON.parse(r.items || '[]').forEach((item) => {
      if (item.status === 'completed') completedProcedures += 1;
      else pendingProcedures += 1;
    });
  });
  return { activePlans: rows.length, pendingProcedures, completedProcedures };
}

module.exports = {
  listCharts,
  createChart,
  listPlans,
  createPlan,
  getPlan,
  updatePlan,
  listNotes,
  createNote,
  treatmentSummary,
  assertCanViewPlan
};
