const database = require('../config/database');

function getDb() {
  return database.db;
}

function mapPatient(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    mrn: row.mrn,
    registration_date: row.registration_date,
    name: row.name,
    father_name: row.father_name,
    grandfather_name: row.grandfather_name,
    gender: row.gender,
    dob: row.dob,
    age: row.age,
    address: row.address,
    region: row.region,
    wereda_subcity: row.wereda_subcity,
    ketena_gott: row.ketena_gott,
    kebele: row.kebele,
    house_number: row.house_number || '',
    phone_number: row.phone_number,
    emergency_name: row.emergency_name,
    emergency_number: row.emergency_number,
    insurance_plan: row.insurance_plan || '',
    insurance_member_id: row.insurance_member_id || '',
    referred_by: row.referred_by || '',
    last_dental_visit: row.last_dental_visit || '',
    recall_due: row.recall_due || '',
    allergies: row.allergies || '',
    medications: row.medications || '',
    medical_conditions: row.medical_conditions || '',
    chief_complaint: row.chief_complaint || '',
    assigned_doctor_id: row.assigned_doctor_id || '',
    assigned_doctor_name: row.assigned_doctor_name || '',
    assignment_status: row.assignment_status || '',
    assigned_appointment_id: row.assigned_appointment_id || '',
    assigned_at: row.assigned_at || '',
    primary_doctor_id: row.primary_doctor_id || '',
    primary_doctor_name: row.primary_doctor_name || '',
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

class PatientModel {
  static generateMRN() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `MRN${timestamp.slice(-8)}${random}`;
  }

  static create(patientData, callback) {
    const mrn = this.generateMRN();
    const registration_date = new Date().toISOString();
    const query = `
      INSERT INTO patients (
        mrn, registration_date, name, father_name, grandfather_name,
        gender, dob, age, address, region, wereda_subcity,
        ketena_gott, kebele, house_number, phone_number,
        emergency_name, emergency_number,
        insurance_plan, insurance_member_id, referred_by,
        last_dental_visit, recall_due, allergies, medications,
        medical_conditions, chief_complaint,
        primary_doctor_id, primary_doctor_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      mrn, registration_date, patientData.name, patientData.father_name,
      patientData.grandfather_name, patientData.gender, patientData.dob,
      patientData.age, patientData.address, patientData.region,
      patientData.wereda_subcity, patientData.ketena_gott, patientData.kebele,
      patientData.house_number || '', patientData.phone_number,
      patientData.emergency_name, patientData.emergency_number,
      patientData.insurance_plan || '', patientData.insurance_member_id || '',
      patientData.referred_by || '', patientData.last_dental_visit || null,
      patientData.recall_due || null, patientData.allergies || '',
      patientData.medications || '', patientData.medical_conditions || '',
      patientData.chief_complaint || '',
      patientData.primary_doctor_id || '', patientData.primary_doctor_name || ''
    ];
    getDb().run(query, params, function onRun(err) {
      if (err) callback(err, null);
      else callback(null, { id: String(this.lastID), mrn });
    });
  }

  static getAll(callback) {
    getDb().all('SELECT * FROM patients ORDER BY created_at DESC', [], (err, rows) => {
      if (err) callback(err);
      else callback(null, (rows || []).map(mapPatient));
    });
  }

  static getByAssignedDentist(dentistId, callback) {
    getDb().all(
      `SELECT * FROM patients
       WHERE assigned_doctor_id = ? AND assignment_status = 'confirmed'
       ORDER BY created_at DESC`,
      [String(dentistId)],
      (err, rows) => {
        if (err) callback(err);
        else callback(null, (rows || []).map(mapPatient));
      }
    );
  }

  static getById(id, callback) {
    getDb().get('SELECT * FROM patients WHERE id = ?', [id], (err, row) => {
      if (err) callback(err);
      else callback(null, mapPatient(row));
    });
  }

  static getByMRN(mrn, callback) {
    getDb().get('SELECT * FROM patients WHERE mrn = ?', [mrn], (err, row) => {
      if (err) callback(err);
      else callback(null, mapPatient(row));
    });
  }

  static update(id, patientData, callback) {
    const query = `
      UPDATE patients SET
        name=?, father_name=?, grandfather_name=?, gender=?, dob=?, age=?,
        address=?, region=?, wereda_subcity=?, ketena_gott=?, kebele=?,
        house_number=?, phone_number=?, emergency_name=?, emergency_number=?,
        insurance_plan=?, insurance_member_id=?, referred_by=?,
        last_dental_visit=?, recall_due=?, allergies=?, medications=?,
        medical_conditions=?, chief_complaint=?,
        primary_doctor_id=COALESCE(?, primary_doctor_id),
        primary_doctor_name=COALESCE(?, primary_doctor_name),
        updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `;
    const params = [
      patientData.name, patientData.father_name, patientData.grandfather_name,
      patientData.gender, patientData.dob, patientData.age,
      patientData.address, patientData.region, patientData.wereda_subcity,
      patientData.ketena_gott, patientData.kebele, patientData.house_number || '',
      patientData.phone_number, patientData.emergency_name, patientData.emergency_number,
      patientData.insurance_plan || '', patientData.insurance_member_id || '',
      patientData.referred_by || '', patientData.last_dental_visit || null,
      patientData.recall_due || null, patientData.allergies || '',
      patientData.medications || '', patientData.medical_conditions || '',
      patientData.chief_complaint || '',
      patientData.primary_doctor_id ?? null,
      patientData.primary_doctor_name ?? null,
      id
    ];
    getDb().run(query, params, callback);
  }

  static delete(id, callback) {
    getDb().run('DELETE FROM patients WHERE id = ?', [id], callback);
  }

  static search(searchTerm, callback) {
    const searchPattern = `%${searchTerm}%`;
    getDb().all(
      `SELECT * FROM patients WHERE name LIKE ? OR mrn LIKE ? OR phone_number LIKE ? OR father_name LIKE ? OR region LIKE ? ORDER BY created_at DESC`,
      [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern],
      (err, rows) => {
        if (err) callback(err);
        else callback(null, (rows || []).map(mapPatient));
      }
    );
  }

  static searchForDentist(searchTerm, dentistId, callback) {
    const searchPattern = `%${searchTerm}%`;
    const baseWhere = `assigned_doctor_id = ? AND assignment_status = 'confirmed'`;
    const params = [String(dentistId)];
    if (!searchTerm || !searchTerm.trim()) {
      getDb().all(
        `SELECT * FROM patients WHERE ${baseWhere} ORDER BY created_at DESC`,
        params,
        (err, rows) => {
          if (err) callback(err);
          else callback(null, (rows || []).map(mapPatient));
        }
      );
      return;
    }
    getDb().all(
      `SELECT * FROM patients WHERE ${baseWhere}
       AND (name LIKE ? OR mrn LIKE ? OR phone_number LIKE ? OR father_name LIKE ? OR region LIKE ?)
       ORDER BY created_at DESC`,
      [...params, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern],
      (err, rows) => {
        if (err) callback(err);
        else callback(null, (rows || []).map(mapPatient));
      }
    );
  }

  static updateAssignment(id, assignment, callback) {
    getDb().run(
      `UPDATE patients SET
        assigned_doctor_id = ?,
        assigned_doctor_name = ?,
        assignment_status = ?,
        assigned_appointment_id = ?,
        assigned_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        assignment.assigned_doctor_id || '',
        assignment.assigned_doctor_name || '',
        assignment.assignment_status || '',
        assignment.assigned_appointment_id || '',
        assignment.assigned_at || new Date().toISOString(),
        id
      ],
      callback
    );
  }

  static clearAssignment(id, callback) {
    getDb().run(
      `UPDATE patients SET
        assigned_doctor_id = '',
        assigned_doctor_name = '',
        assignment_status = '',
        assigned_appointment_id = '',
        assigned_at = '',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [id],
      callback
    );
  }

  static findDuplicates({ phone, name, fatherName, dob, mrn, excludeId }, callback) {
    const matches = [];
    const seen = new Set();
    const addRows = (rows, reason) => {
      (rows || []).forEach((row) => {
        const key = String(row.id);
        if (excludeId && key === String(excludeId)) return;
        if (seen.has(key)) return;
        seen.add(key);
        matches.push({ ...mapPatient(row), matchReason: reason });
      });
    };

    const tasks = [];
    const digits = (phone || '').replace(/\D/g, '');
    if (digits.length >= 7) {
      tasks.push(new Promise((resolve) => {
        getDb().all(
          `SELECT * FROM patients WHERE REPLACE(REPLACE(REPLACE(phone_number, ' ', ''), '-', ''), '+', '') LIKE ?`,
          [`%${digits.slice(-9)}%`],
          (err, rows) => { addRows(rows, 'phone'); resolve(); }
        );
      }));
    }
    if (name && fatherName) {
      tasks.push(new Promise((resolve) => {
        getDb().all(
          `SELECT * FROM patients WHERE LOWER(name) = LOWER(?) AND LOWER(father_name) = LOWER(?)`,
          [name.trim(), fatherName.trim()],
          (err, rows) => { addRows(rows, 'name_father'); resolve(); }
        );
      }));
    }
    if (dob) {
      tasks.push(new Promise((resolve) => {
        getDb().all(`SELECT * FROM patients WHERE dob = ?`, [dob], (err, rows) => {
          if (name) {
            addRows((rows || []).filter((r) => r.name?.toLowerCase() === name.toLowerCase()), 'name_dob');
          } else {
            addRows(rows, 'dob');
          }
          resolve();
        });
      }));
    }
    if (mrn) {
      tasks.push(new Promise((resolve) => {
        getDb().all(`SELECT * FROM patients WHERE mrn = ?`, [mrn.trim()], (err, rows) => {
          addRows(rows, 'mrn');
          resolve();
        });
      }));
    }

    Promise.all(tasks).then(() => callback(null, matches)).catch((err) => callback(err));
  }

  static updatePrimaryDoctor(id, { doctorId, doctorName }, callback) {
    getDb().run(
      `UPDATE patients SET primary_doctor_id=?, primary_doctor_name=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [doctorId || '', doctorName || '', id],
      callback
    );
  }

  static ensurePrimaryDoctor(id, { doctorId, doctorName }, callback) {
    getDb().get('SELECT primary_doctor_id FROM patients WHERE id = ?', [id], (err, row) => {
      if (err) return callback(err);
      if (row?.primary_doctor_id) return callback(null, false);
      getDb().run(
        `UPDATE patients SET primary_doctor_id=?, primary_doctor_name=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        [doctorId || '', doctorName || '', id],
        (e) => callback(e, true)
      );
    });
  }
}

module.exports = PatientModel;
