const { all, get, run } = require('../config/database');

function mapAppt(r) {
  return {
    id: String(r.id),
    patientId: String(r.patient_id),
    patientName: r.patient_name || '',
    patientMrn: r.patient_mrn || '',
    staffId: r.staff_id || '',
    staffName: r.staff_name || '',
    datetime: r.datetime,
    duration: r.duration,
    type: r.type,
    status: r.status,
    chair: r.chair || '',
    notes: r.notes || '',
    created_at: r.created_at,
    updated_at: r.updated_at
  };
}

async function findById(id) {
  return get('SELECT * FROM appointments WHERE id = ?', [id]);
}

async function findAll({ date, start, end, dentistId } = {}) {
  if (date) {
    const d = date.slice(0, 10);
    if (dentistId) {
      return all(
        `SELECT * FROM appointments WHERE staff_id = ? AND datetime >= ? AND datetime < ? ORDER BY datetime`,
        [dentistId, `${d}T00:00:00.000Z`, `${d}T23:59:59.999Z`]
      );
    }
    return all(
      `SELECT * FROM appointments WHERE datetime >= ? AND datetime < ? ORDER BY datetime`,
      [`${d}T00:00:00.000Z`, `${d}T23:59:59.999Z`]
    );
  }
  if (start && end) {
    if (dentistId) {
      return all(
        `SELECT * FROM appointments WHERE staff_id = ? AND datetime >= ? AND datetime <= ? ORDER BY datetime`,
        [dentistId, start, end]
      );
    }
    return all(
      `SELECT * FROM appointments WHERE datetime >= ? AND datetime <= ? ORDER BY datetime`,
      [start, end]
    );
  }
  if (dentistId) {
    return all('SELECT * FROM appointments WHERE staff_id = ? ORDER BY datetime', [dentistId]);
  }
  return all('SELECT * FROM appointments ORDER BY datetime');
}

async function findPendingConfirmations(staffId) {
  return all(
    `SELECT * FROM appointments WHERE staff_id = ? AND status = 'pending_doctor' ORDER BY datetime ASC`,
    [String(staffId)]
  );
}

async function insert(values) {
  return run(
    `INSERT INTO appointments (patient_id, patient_name, patient_mrn, staff_id, staff_name, datetime, duration, type, status, chair, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values
  );
}

async function update(id, fields) {
  await run(
    `UPDATE appointments SET patient_id=?, patient_name=?, patient_mrn=?, staff_id=?, staff_name=?,
     datetime=?, duration=?, type=?, status=?, chair=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [
      fields.patientId, fields.patientName, fields.patientMrn, fields.staffId, fields.staffName,
      fields.datetime, fields.duration, fields.type, fields.status, fields.chair, fields.notes, id
    ]
  );
}

async function updateStatus(id, status) {
  await run(`UPDATE appointments SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [status, id]);
}

async function markDeclined(id) {
  await run(
    `UPDATE appointments SET status='cancelled', notes=COALESCE(notes,'') || ' [Declined by doctor]', updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [id]
  );
}

async function remove(id) {
  await run('DELETE FROM appointments WHERE id = ?', [id]);
}

async function setPatientAssignment(patientId, { staffId, staffName, appointmentId, status }) {
  await run(
    `UPDATE patients SET
      assigned_doctor_id = ?,
      assigned_doctor_name = ?,
      assignment_status = ?,
      assigned_appointment_id = ?,
      assigned_at = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [staffId || '', staffName || '', status || 'pending', String(appointmentId || ''), new Date().toISOString(), patientId]
  );
}

async function clearPatientAssignment(patientId) {
  await run(
    `UPDATE patients SET assigned_doctor_id='', assigned_doctor_name='', assignment_status='',
     assigned_appointment_id='', assigned_at='', updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [patientId]
  );
}

async function clearPatientAssignmentIfMatch(patientId, appointmentId) {
  const patient = await get('SELECT assigned_appointment_id FROM patients WHERE id = ?', [patientId]);
  if (patient && String(patient.assigned_appointment_id) === String(appointmentId)) {
    await clearPatientAssignment(patientId);
  }
}

async function updatePatientLastVisit(patientId, visitDate) {
  await run(
    `UPDATE patients SET last_dental_visit=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [visitDate, patientId]
  );
}

module.exports = {
  mapAppt,
  findById,
  findAll,
  findPendingConfirmations,
  insert,
  update,
  updateStatus,
  markDeclined,
  remove,
  setPatientAssignment,
  clearPatientAssignment,
  clearPatientAssignmentIfMatch,
  updatePatientLastVisit
};
