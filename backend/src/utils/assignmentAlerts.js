const { all, run } = require('../config/database');

async function createClinicAlert({ type, message, patientId, patientName, meta }) {
  const result = await run(
    `INSERT INTO clinic_alerts (type, message, patient_id, patient_name, meta, read_flag)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [
      type,
      message,
      patientId ? String(patientId) : '',
      patientName || '',
      meta ? JSON.stringify(meta) : '{}'
    ]
  );
  return String(result.lastID);
}

async function getUnreadAlerts(limit = 50) {
  const rows = await all(
    `SELECT * FROM clinic_alerts WHERE read_flag = 0 ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );
  return rows.map((r) => ({
    id: String(r.id),
    type: r.type,
    message: r.message,
    patientId: r.patient_id || '',
    patientName: r.patient_name || '',
    meta: JSON.parse(r.meta || '{}'),
    created_at: r.created_at
  }));
}

async function markAlertRead(id) {
  await run('UPDATE clinic_alerts SET read_flag = 1 WHERE id = ?', [id]);
}

async function markAllAlertsRead() {
  await run('UPDATE clinic_alerts SET read_flag = 1 WHERE read_flag = 0');
}

module.exports = {
  createClinicAlert,
  getUnreadAlerts,
  markAlertRead,
  markAllAlertsRead
};
