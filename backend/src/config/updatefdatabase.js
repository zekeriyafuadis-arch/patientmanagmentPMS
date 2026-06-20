const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.join(__dirname, '..', 'patientsData');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'patientsdata.db');
let db = null;

// Database initialization with retry logic
function initializeDatabase(retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error(`Database connection error (attempt ${i + 1}):`, err.message);
                    if (i === retries - 1) throw err;
                } else {
                    console.log('Connected to SQLite database successfully');
                    createTables();
                }
            });
            break;
        } catch (err) {
            console.error(`Failed to connect to database (attempt ${i + 1}):`, err);
            if (i === retries - 1) throw err;
        }
    }
    return db;
}

// Create tables if they don't exist
function createTables() {
    db.serialize(() => {
        // Main patients table
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
        `, (err) => {
            if (err) {
                console.error('Error creating patients table:', err);
            } else {
                console.log('Patients table ready');
            }
        });

        // Create indexes for better performance
        db.run(`CREATE INDEX IF NOT EXISTS idx_mrn ON patients(mrn)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_name ON patients(name)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_phone ON patients(phone_number)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_region ON patients(region)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_created_at ON patients(created_at)`);
        
        // Check if table is empty and add sample data if needed
        db.get("SELECT COUNT(*) as count FROM patients", (err, row) => {
            if (!err && row && row.count === 0) {
                console.log('Database is empty. Adding sample data...');
                addSampleData();
            }
        });
    });
}

// Add sample data for testing (optional)
function addSampleData() {
    const samplePatients = [
        {
            name: "John Doe",
            father_name: "Robert Doe",
            grandfather_name: "William Doe",
            gender: "Male",
            dob: "1985-05-15",
            age: 39,
            address: "123 Main Street",
            region: "Addis Ababa",
            wereda_subcity: "Bole",
            ketena_gott: "Kifle Ketema 03",
            kebele: "Kebele 11",
            house_number: "123A",
            phone_number: "0912345678",
            emergency_name: "Jane Doe",
            emergency_number: "0923456789"
        },
        {
            name: "Sarah Johnson",
            father_name: "Michael Johnson",
            grandfather_name: "James Johnson",
            gender: "Female",
            dob: "1990-08-22",
            age: 33,
            address: "456 Oak Avenue",
            region: "Oromia",
            wereda_subcity: "Adama",
            ketena_gott: "Kifle Ketema 01",
            kebele: "Kebele 05",
            house_number: "45B",
            phone_number: "0934567890",
            emergency_name: "David Johnson",
            emergency_number: "0945678901"
        },
        {
            name: "Tigist Haile",
            father_name: "Haile Gebre",
            grandfather_name: "Gebre Selassie",
            gender: "Female",
            dob: "1995-03-10",
            age: 28,
            address: "789 Pine Street",
            region: "Tigray",
            wereda_subcity: "Mekelle",
            ketena_gott: "Kifle Ketema 02",
            kebele: "Kebele 08",
            house_number: "789C",
            phone_number: "0956789012",
            emergency_name: "Haile Gebre",
            emergency_number: "0967890123"
        }
    ];

    const stmt = db.prepare(`
        INSERT INTO patients (
            mrn, registration_date, name, father_name, grandfather_name,
            gender, dob, age, address, region, wereda_subcity,
            ketena_gott, kebele, house_number, phone_number,
            emergency_name, emergency_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    samplePatients.forEach(patient => {
        const mrn = generateMRN();
        const registration_date = new Date().toISOString();
        
        stmt.run(
            mrn, registration_date, patient.name, patient.father_name,
            patient.grandfather_name, patient.gender, patient.dob, patient.age,
            patient.address, patient.region, patient.wereda_subcity,
            patient.ketena_gott, patient.kebele, patient.house_number,
            patient.phone_number, patient.emergency_name, patient.emergency_number
        );
    });
    
    stmt.finalize();
    console.log('Sample data added successfully');
}

function generateMRN() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `MRN${timestamp.slice(-8)}${random}`;
}

// Get database instance
function getDatabase() {
    if (!db) {
        db = initializeDatabase();
    }
    return db;
}

// Close database connection gracefully
function closeDatabase() {
    return new Promise((resolve, reject) => {
        if (db) {
            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                    reject(err);
                } else {
                    console.log('Database connection closed');
                    resolve();
                }
            });
        } else {
            resolve();
        }
    });
}

// Backup database
function backupDatabase() {
    const backupDir = path.join(__dirname, '..', 'patientsData', 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `patientsdata_backup_${timestamp}.db`);
    
    fs.copyFile(dbPath, backupPath, (err) => {
        if (err) {
            console.error('Error backing up database:', err);
        } else {
            console.log(`Database backed up to: ${backupPath}`);
            
            // Keep only last 5 backups
            const backups = fs.readdirSync(backupDir).filter(f => f.startsWith('patientsdata_backup_'));
            if (backups.length > 5) {
                const oldest = backups.sort()[0];
                fs.unlinkSync(path.join(backupDir, oldest));
            }
        }
    });
}

// Auto-backup every hour
setInterval(() => {
    if (db) {+
        backupDatabase();
    }
}, 3600000); // 1 hour

// Export module
module.exports = {
    getDatabase,
    closeDatabase,
    backupDatabase,
    db: getDatabase()
};