const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'patientsData', 'patientsdata.db');
const backupPath = path.join(__dirname, '..', 'patientsData', 'patientsdata_backup.db');

async function repairDatabase() {
    console.log('Database Repair Tool');
    console.log('====================');
    
    // Check if database exists
    if (!fs.existsSync(dbPath)) {
        console.log('Database file not found. Creating new database...');
        const db = new sqlite3.Database(dbPath);
        db.close();
        console.log('New database created successfully');
        return;
    }
    
    // Create backup before repair
    console.log('Creating backup...');
    fs.copyFileSync(dbPath, backupPath);
    console.log(`Backup created at: ${backupPath}`);
    
    // Try to connect and repair
    const db = new sqlite3.Database(dbPath);
    
    db.get("PRAGMA integrity_check", (err, row) => {
        if (err) {
            console.error('Error checking integrity:', err);
            console.log('Attempting to recover...');
            recoverDatabase();
        } else if (row.integrity_check !== 'ok') {
            console.log('Database integrity check failed:', row.integrity_check);
            console.log('Attempting to recover...');
            recoverDatabase();
        } else {
            console.log('Database integrity check passed');
            console.log('Running optimization...');
            db.run("ANALYZE");
            db.run("VACUUM");
            console.log('Database repair completed successfully');
        }
        db.close();
    });
}

function recoverDatabase() {
    const db = new sqlite3.Database(dbPath);
    
    // Try to dump and restore
    db.run(".output dump.sql");
    db.run(".dump");
    db.run(".quit");
    
    console.log('Database recovery attempted');
    console.log('Please restart the application');
}

repairDatabase();