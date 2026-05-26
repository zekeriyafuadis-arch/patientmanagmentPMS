const db = require('../../config/database');

class PatientModel {
    // Generate unique MRN
    static generateMRN() {
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `MRN${timestamp.slice(-8)}${random}`;
    }

    // Create new patient
    static create(patientData, callback) {
        const mrn = this.generateMRN();
        const registration_date = new Date().toISOString();
        
        const query = `
            INSERT INTO patients (
                mrn, registration_date, name, father_name, grandfather_name,
                gender, dob, age, address, region, wereda_subcity,
                ketena_gott, kebele, house_number, phone_number,
                emergency_name, emergency_number
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            mrn, registration_date, patientData.name, patientData.father_name,
            patientData.grandfather_name, patientData.gender, patientData.dob,
            patientData.age, patientData.address, patientData.region,
            patientData.wereda_subcity, patientData.ketena_gott, patientData.kebele,
            patientData.house_number || '', patientData.phone_number,
            patientData.emergency_name, patientData.emergency_number
        ];
        
        db.run(query, params, function(err) {
            if (err) {
                callback(err, null);
            } else {
                callback(null, { id: this.lastID, mrn });
            }
        });
    }

    // Get all patients
    static getAll(callback) {
        const query = 'SELECT * FROM patients ORDER BY created_at DESC';
        db.all(query, [], callback);
    }

    // Get patient by ID
    static getById(id, callback) {
        const query = 'SELECT * FROM patients WHERE id = ?';
        db.get(query, [id], callback);
    }

    // Get patient by MRN
    static getByMRN(mrn, callback) {
        const query = 'SELECT * FROM patients WHERE mrn = ?';
        db.get(query, [mrn], callback);
    }

    // Update patient
    static update(id, patientData, callback) {
        const query = `
            UPDATE patients SET
                name = ?, father_name = ?, grandfather_name = ?,
                gender = ?, dob = ?, age = ?, address = ?,
                region = ?, wereda_subcity = ?, ketena_gott = ?,
                kebele = ?, house_number = ?, phone_number = ?,
                emergency_name = ?, emergency_number = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        const params = [
            patientData.name, patientData.father_name, patientData.grandfather_name,
            patientData.gender, patientData.dob, patientData.age,
            patientData.address, patientData.region, patientData.wereda_subcity,
            patientData.ketena_gott, patientData.kebele, patientData.house_number || '',
            patientData.phone_number, patientData.emergency_name,
            patientData.emergency_number, id
        ];
        
        db.run(query, params, callback);
    }

    // Delete patient
    static delete(id, callback) {
        const query = 'DELETE FROM patients WHERE id = ?';
        db.run(query, [id], callback);
    }

    // Search patients
    static search(searchTerm, callback) {
        const query = `
            SELECT * FROM patients 
            WHERE name LIKE ? 
               OR mrn LIKE ? 
               OR phone_number LIKE ?
               OR father_name LIKE ?
               OR region LIKE ?
            ORDER BY created_at DESC
        `;
        const searchPattern = `%${searchTerm}%`;
        db.all(query, [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern], callback);
    }
}

module.exports = PatientModel;