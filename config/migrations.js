const { getDatabase } = require('./database');

const db = getDatabase();

// Migration versions
const migrations = [
    {
        version: 1,
        name: 'Initial schema',
        up: () => {
            return new Promise((resolve, reject) => {
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
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
    },
    {
        version: 2,
        name: 'Add email and blood_type',
        up: () => {
            return new Promise((resolve, reject) => {
                db.run(`ALTER TABLE patients ADD COLUMN email TEXT`, (err) => {
                    if (err && !err.message.includes('duplicate column')) reject(err);
                    db.run(`ALTER TABLE patients ADD COLUMN blood_type TEXT`, (err) => {
                        if (err && !err.message.includes('duplicate column')) reject(err);
                        else resolve();
                    });
                });
            });
        }
    }
];

// Get current database version
function getCurrentVersion() {
    return new Promise((resolve, reject) => {
        db.get(`SELECT value FROM metadata WHERE key = 'db_version'`, (err, row) => {
            if (err && err.message.includes('no such table')) {
                // Create metadata table
                db.run(`CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT)`, (err) => {
                    if (err) reject(err);
                    else resolve(0);
                });
            } else if (err) {
                reject(err);
            } else {
                resolve(row ? parseInt(row.value) : 0);
            }
        });
    });
}

// Set database version
function setCurrentVersion(version) {
    return new Promise((resolve, reject) => {
        db.run(`INSERT OR REPLACE INTO metadata (key, value) VALUES ('db_version', ?)`, [version], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// Run migrations
async function runMigrations() {
    const currentVersion = await getCurrentVersion();
    console.log(`Current database version: ${currentVersion}`);
    
    for (const migration of migrations) {
        if (migration.version > currentVersion) {
            console.log(`Running migration ${migration.version}: ${migration.name}`);
            try {
                await migration.up();
                await setCurrentVersion(migration.version);
                console.log(`Migration ${migration.version} completed`);
            } catch (err) {
                console.error(`Migration ${migration.version} failed:`, err);
                throw err;
            }
        }
    }
    
    console.log('All migrations completed');
}

// Run migrations on startup
if (process.env.NODE_ENV !== 'test') {
    runMigrations().catch(err => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
}

module.exports = { runMigrations, getCurrentVersion };