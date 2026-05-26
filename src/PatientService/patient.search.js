const PatientModel = require('../PatientModel/patient.model');

class PatientSearch {
    static advancedSearch(filters, callback) {
        let query = 'SELECT * FROM patients WHERE 1=1';
        const params = [];
        
        if (filters.name) {
            query += ' AND name LIKE ?';
            params.push(`%${filters.name}%`);
        }
        
        if (filters.mrn) {
            query += ' AND mrn LIKE ?';
            params.push(`%${filters.mrn}%`);
        }
        
        if (filters.phone) {
            query += ' AND phone_number LIKE ?';
            params.push(`%${filters.phone}%`);
        }
        
        if (filters.region) {
            query += ' AND region = ?';
            params.push(filters.region);
        }
        
        if (filters.gender) {
            query += ' AND gender = ?';
            params.push(filters.gender);
        }
        
        if (filters.ageRange) {
            if (filters.ageRange.min) {
                query += ' AND age >= ?';
                params.push(filters.ageRange.min);
            }
            if (filters.ageRange.max) {
                query += ' AND age <= ?';
                params.push(filters.ageRange.max);
            }
        }
        
        query += ' ORDER BY created_at DESC';
        
        db.all(query, params, callback);
    }
}

module.exports = PatientSearch;