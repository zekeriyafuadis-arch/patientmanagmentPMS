const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'patientsData', 'patientsdata.db');
const db = new sqlite3.Database(dbPath);

// Create tables if they don't exist
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mrn TEXT UNIQUE NOT NULL,
            registration_date TEXT NOT NULL,
            name TEXT NOT NULL,
            father_name TEXT NOT NULL,
            grandfather_name TEXT NOT NULL,
            gender TEXT NOT NULL,
            dob TEXT NOT NULL,
            age INTEGER NOT NULL,
            address TEXT NOT NULL,
            region TEXT NOT NULL,
            wereda_subcity TEXT NOT NULL,
            ketena_gott TEXT NOT NULL,
            kebele TEXT NOT NULL,
            house_number TEXT,
            phone_number TEXT NOT NULL,
            emergency_name TEXT NOT NULL,
            emergency_number TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create indexes for better search performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_mrn ON patients(mrn)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_name ON patients(name)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_phone ON patients(phone_number)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_region ON patients(region)`);
});

module.exports = db;