const PatientModel = require('../repositories/patients.repository');
const { normalizePatientDemographics } = require('../utils/patientDemographics');

class PatientService {
    static createPatient(patientData, callback) {
        const normalized = normalizePatientDemographics(patientData);
        if (normalized.error) {
            callback({ error: normalized.error }, null);
            return;
        }

        const requiredFields = [
            'name', 'father_name', 'grandfather_name', 'gender',
            'dob', 'age', 'phone_number', 'emergency_name', 'emergency_number'
        ];

        const data = {
            ...normalized,
            address: normalized.address || '',
            region: normalized.region || '',
            wereda_subcity: normalized.wereda_subcity || '',
            ketena_gott: normalized.ketena_gott || '',
            kebele: normalized.kebele || '',
            house_number: normalized.house_number || ''
        };

        for (const field of requiredFields) {
            if (!data[field]) {
                callback({ error: `${field} is required` }, null);
                return;
            }
        }

        PatientModel.create(data, callback);
    }

  static getAllPatients(callback) {
    PatientModel.getAll(callback);
  }

  static getPatientsForUser(user, callback) {
    if (user?.role === 'dentist') {
      PatientModel.getByAssignedDentist(user.id, callback);
      return;
    }
    PatientModel.getAll(callback);
  }

  static getPatientById(id, callback) {
    PatientModel.getById(id, callback);
  }

  static async getPatientByIdForUser(id, user) {
    const patient = await new Promise((resolve, reject) => {
      PatientModel.getById(id, (err, row) => (err ? reject(err) : resolve(row)));
    });
    if (!patient) return null;
    if (user?.role === 'dentist') {
      const assigned = String(patient.assigned_doctor_id) === String(user.id)
        && patient.assignment_status === 'confirmed';
      if (!assigned) return null;
    }
    return patient;
  }

  static getPatientByMRN(mrn, callback) {
        PatientModel.getByMRN(mrn, callback);
    }

    static updatePatient(id, patientData, callback) {
        PatientModel.update(id, patientData, callback);
    }

    static deletePatient(id, callback) {
        PatientModel.delete(id, callback);
    }

    static searchPatients(searchTerm, callback) {
        if (!searchTerm || searchTerm.trim() === '') {
            PatientModel.getAll(callback);
        } else {
            PatientModel.search(searchTerm, callback);
        }
    }

    static searchPatientsForUser(searchTerm, user, callback) {
        if (user?.role === 'dentist') {
            PatientModel.searchForDentist(searchTerm, user.id, callback);
            return;
        }
        PatientService.searchPatients(searchTerm, callback);
    }

  static findDuplicates(criteria, callback) {
    PatientModel.findDuplicates(criteria, callback);
  }

  static getDoctorVisitHistory(patientId, callback) {
    const { all } = require('../config/database');
    all(
      `SELECT id, datetime, staff_id, staff_name, type, status, notes, created_at
       FROM appointments
       WHERE patient_id = ? AND status IN ('completed', 'checkout', 'with_doctor', 'in_chair', 'arrived', 'confirmed')
       ORDER BY datetime DESC
       LIMIT 50`,
      [patientId],
      (err, rows) => {
        if (err) return callback(err);
        callback(null, (rows || []).map((r) => ({
          id: String(r.id),
          datetime: r.datetime,
          doctorId: r.staff_id || '',
          doctorName: r.staff_name || '',
          type: r.type,
          status: r.status,
          notes: r.notes || ''
        })));
      }
    );
  }

  static updatePrimaryDoctor(id, body, callback) {
    PatientModel.updatePrimaryDoctor(id, {
      doctorId: body.primary_doctor_id || body.doctorId,
      doctorName: body.primary_doctor_name || body.doctorName
    }, callback);
  }
}

module.exports = PatientService;