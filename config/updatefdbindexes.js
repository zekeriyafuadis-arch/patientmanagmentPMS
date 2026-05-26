const { getDatabase } = require('./database');

const db = getDatabase();

// Create all necessary indexes
function createIndexes() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            const indexes = [
                `CREATE INDEX IF NOT EXISTS idx_mrn ON patients(mrn)`,
                `CREATE INDEX IF NOT EXISTS idx_name ON patients(name)`,
                `CREATE INDEX IF NOT EXISTS idx_phone ON patients(phone_number)`,
                `CREATE INDEX IF NOT EXISTS idx_region ON patients(region)`,
                `CREATE INDEX IF NOT EXISTS idx_gender ON patients(gender)`,
                `CREATE INDEX IF NOT EXISTS idx_age ON patients(age)`,
                `CREATE INDEX IF NOT EXISTS idx_created_at ON patients(created_at)`,
                `CREATE INDEX IF NOT EXISTS idx_registration_date ON patients(registration_date)`,
                `CREATE INDEX IF NOT EXISTS idx_name_phone ON patients(name, phone_number)`,
                `CREATE INDEX IF NOT EXISTS idx_region_wereda ON patients(region, wereda_subcity)`
            ];
            
            let completed = 0;
            
            indexes.forEach(sql => {
                db.run(sql, (err) => {
                    if (err) {
                        console.error(`Error creating index: ${sql}`, err);
                    } else {
                        completed++;
                        if (completed === indexes.length) {
                            console.log('All database indexes created successfully');
                            resolve();
                        }
                    }
                });
            });
        });
    });
}

// Optimize database (vacuum and analyze)
function optimizeDatabase() {
    return new Promise((resolve, reject) => {
        db.run("ANALYZE", (err) => {
            if (err) {
                console.error("Error analyzing database:", err);
                reject(err);
            } else {
                db.run("VACUUM", (err) => {
                    if (err) {
                        console.error("Error vacuuming database:", err);
                        reject(err);
                    } else {
                        console.log("Database optimized successfully");
                        resolve();
                    }
                });
            }
        });
    });
}

// Check database integrity
function checkIntegrity() {
    return new Promise((resolve, reject) => {
        db.get("PRAGMA integrity_check", (err, row) => {
            if (err) {
                console.error("Error checking integrity:", err);
                reject(err);
            } else {
                const isOk = row && row.integrity_check === 'ok';
                console.log(`Database integrity check: ${isOk ? 'OK' : 'FAILED'}`);
                resolve(isOk);
            });
        });
    });
}

// Get database statistics
function getDatabaseStats() {
    return new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as total_patients FROM patients", (err, count) => {
            if (err) {
                reject(err);
            } else {
                db.get("SELECT COUNT(*) as male_count FROM patients WHERE gender = 'Male'", (err, male) => {
                    if (err) {
                        reject(err);
                    } else {
                        db.get("SELECT COUNT(*) as female_count FROM patients WHERE gender = 'Female'", (err, female) => {
                            if (err) {
                                reject(err);
                            } else {
                                db.get("SELECT MIN(created_at) as oldest, MAX(created_at) as newest FROM patients", (err, dates) => {
                                    if (err) {
                                        reject(err);
                                    } else {
                                        resolve({
                                            totalPatients: count.total_patients,
                                            malePatients: male.male_count,
                                            femalePatients: female.female_count,
                                            oldestRecord: dates.oldest,
                                            newestRecord: dates.newest,
                                            databaseSize: getDatabaseSize()
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    });
}

function getDatabaseSize() {
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.join(__dirname, '..', 'patientsData', 'patientsdata.db');
    
    try {
        const stats = fs.statSync(dbPath);
        return (stats.size / (1024 * 1024)).toFixed(2) + ' MB';
    } catch (err) {
        return 'Unknown';
    }
}

// Weekly maintenance
if (process.env.NODE_ENV !== 'test') {
    setInterval(async () => {
        console.log('Running weekly database maintenance...');
        await optimizeDatabase();
        await checkIntegrity();
    }, 7 * 24 * 3600000); // Weekly
}

module.exports = {
    createIndexes,
    optimizeDatabase,
    checkIntegrity,
    getDatabaseStats
};