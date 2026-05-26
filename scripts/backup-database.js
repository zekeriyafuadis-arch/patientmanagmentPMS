const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'patientsData', 'patientsdata.db');
const backupDir = path.join(__dirname, '..', 'patientsData', 'backups');

function backupDatabase() {
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `patientsdata_backup_${timestamp}.db`);
    
    if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, backupPath);
        console.log(`Database backed up to: ${backupPath}`);
        
        // Keep only last 10 backups
        const backups = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('patientsdata_backup_'))
            .sort();
        
        while (backups.length > 10) {
            const oldest = backups.shift();
            fs.unlinkSync(path.join(backupDir, oldest));
            console.log(`Removed old backup: ${oldest}`);
        }
    } else {
        console.log('Database file not found');
    }
}

backupDatabase();