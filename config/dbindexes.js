const db = require('./database');

// Additional indexes for optimized searching
const createIndexes = () => {
    db.serialize(() => {
        // Compound indexes for common search patterns
        db.run(`CREATE INDEX IF NOT EXISTS idx_name_phone ON patients(name, phone_number)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_region_wereda ON patients(region, wereda_subcity)`);
        
        console.log('Database indexes created successfully');
    });
};

// Search optimization views
const createSearchViews = () => {
    db.run(`
        CREATE VIEW IF NOT EXISTS patient_search_view AS
        SELECT 
            id, mrn, name, father_name, grandfather_name,
            phone_number, region, wereda_subcity, kebele,
            registration_date, gender, age
        FROM patients
    `);
};

createIndexes();
createSearchViews();

module.exports = { createIndexes, createSearchViews };