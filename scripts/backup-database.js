const fs = require('fs');
const path = require('path');
const { dbPath, uploadsDir } = require('../backend/src/config/database');

const backupRoot = path.join(__dirname, '..', 'patientsData', 'backups');

function backupDatabase() {
  if (!fs.existsSync(backupRoot)) {
    fs.mkdirSync(backupRoot, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const targetDir = path.join(backupRoot, `clinic_backup_${timestamp}`);
  fs.mkdirSync(targetDir, { recursive: true });

  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, path.join(targetDir, 'patientsdata.db'));
    console.log('Database copied.');
  } else {
    console.log('Database file not found.');
  }

  if (fs.existsSync(uploadsDir)) {
    fs.cpSync(uploadsDir, path.join(targetDir, 'xrays'), { recursive: true });
    console.log('X-ray files copied.');
  }

  fs.writeFileSync(
    path.join(targetDir, 'manifest.json'),
    JSON.stringify({ createdAt: new Date().toISOString(), type: 'cli-backup' }, null, 2)
  );

  console.log(`Backup saved to: ${targetDir}`);

  const backups = fs.readdirSync(backupRoot)
    .filter((f) => f.startsWith('clinic_backup_'))
    .sort();

  while (backups.length > 10) {
    const oldest = backups.shift();
    fs.rmSync(path.join(backupRoot, oldest), { recursive: true, force: true });
    console.log(`Removed old backup: ${oldest}`);
  }
}

backupDatabase();
