const fs = require('fs');
const path = require('path');
const logger = require('../lib/logger');
const { createBackup } = require('../services/admin.service');

const markerFile = path.join(__dirname, '../../../patientsData/backups/.last-auto-backup');

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readLastBackupDate() {
  try {
    if (fs.existsSync(markerFile)) {
      return fs.readFileSync(markerFile, 'utf8').trim();
    }
  } catch {
    /* ignore */
  }
  return '';
}

function writeLastBackupDate(date) {
  const dir = path.dirname(markerFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(markerFile, date, 'utf8');
}

async function runScheduledBackup() {
  const today = todayKey();
  if (readLastBackupDate() === today) return;
  try {
    await createBackup({ id: 'system', fullName: 'Auto Backup' }, null);
    writeLastBackupDate(today);
    logger.info({ date: today }, 'Scheduled daily backup completed');
  } catch (err) {
    logger.error({ err }, 'Scheduled daily backup failed');
  }
}

function startAutoBackupScheduler() {
  const enabled = process.env.PMS_AUTO_BACKUP !== '0';
  if (!enabled) return;

  const hour = parseInt(process.env.PMS_BACKUP_HOUR, 10);
  const targetHour = Number.isFinite(hour) ? hour : 20;

  const tick = () => {
    const now = new Date();
    if (now.getHours() === targetHour) {
      runScheduledBackup();
    }
  };

  setInterval(tick, 60 * 1000);
  tick();
  logger.info({ hour: targetHour }, 'Auto backup scheduler enabled');
}

module.exports = { startAutoBackupScheduler, runScheduledBackup };
