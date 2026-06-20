const { get } = require('../config/database');

async function canAccessClinical(user, patientId) {
  if (!user || !patientId) return false;
  if (user.role === 'admin') return true;
  if (user.role !== 'dentist') return false;
  const patient = await get(
    'SELECT assigned_doctor_id, assignment_status FROM patients WHERE id = ?',
    [patientId]
  );
  if (!patient) return false;
  return (
    String(patient.assigned_doctor_id) === String(user.id) &&
    patient.assignment_status === 'confirmed'
  );
}

module.exports = { canAccessClinical };
