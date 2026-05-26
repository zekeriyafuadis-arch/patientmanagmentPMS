const PatientModel = require('../PatientModel/patient.model');

class PatientService {
    static createPatient(patientData, callback) {
        // Validate required fields
        const requiredFields = ['name', 'father_name', 'grandfather_name', 'gender', 
                                'dob', 'age', 'address', 'region', 'wereda_subcity',
                                'ketena_gott', 'kebele', 'phone_number', 
                                'emergency_name', 'emergency_number'];
        
        for (let field of requiredFields) {
            if (!patientData[field]) {
                callback({ error: `${field} is required` }, null);
                return;
            }
        }
        
        PatientModel.create(patientData, callback);
    }

    static getAllPatients(callback) {
        PatientModel.getAll(callback);
    }

    static getPatientById(id, callback) {
        PatientModel.getById(id, callback);
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
}

module.exports = PatientService;