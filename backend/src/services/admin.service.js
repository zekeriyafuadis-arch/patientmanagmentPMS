const fs = require('fs');
const path = require('path');
const { all, get, dbPath, uploadsDir, closeDatabase, reopenDatabase, dataRoot } = require('../config/database');
const { logAudit } = require('../utils/audit');
const { getLanAddresses } = require('../utils/networkUrls');

const backupDir = path.join(dataRoot, 'backups');
const APP_VERSION = '3.0.0';

function health() {
  return {
    status: 'ok',
    version: APP_VERSION,
    database: 'sqlite',
    timestamp: new Date().toISOString()
  };
}

async function getAuditLog(limit = 100) {
  const rows = await all(
    `SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );
  return rows.map((r) => ({
    id: String(r.id),
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    userId: r.user_id,
    userName: r.user_name,
    details: r.details,
    ipAddress: r.ip_address,
    created_at: r.created_at
  }));
}

async function createBackup(user, req) {
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `clinic_backup_${timestamp}`;
  const targetDir = path.join(backupDir, backupName);
  fs.mkdirSync(targetDir, { recursive: true });

  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, path.join(targetDir, 'patientsdata.db'));
  }
  if (fs.existsSync(uploadsDir)) {
    fs.cpSync(uploadsDir, path.join(targetDir, 'xrays'), { recursive: true });
  }
  fs.writeFileSync(
    path.join(targetDir, 'manifest.json'),
    JSON.stringify({ createdAt: new Date().toISOString(), version: APP_VERSION }, null, 2)
  );

  const backups = fs.readdirSync(backupDir)
    .filter((f) => f.startsWith('clinic_backup_'))
    .sort();
  while (backups.length > 10) {
    const oldest = backups.shift();
    fs.rmSync(path.join(backupDir, oldest), { recursive: true, force: true });
  }

  await logAudit({
    action: 'backup.create',
    entityType: 'system',
    user,
    details: backupName,
    req
  });

  return { name: backupName, path: targetDir };
}

async function listBackups() {
  if (!fs.existsSync(backupDir)) return [];
  return fs.readdirSync(backupDir)
    .filter((f) => f.startsWith('clinic_backup_'))
    .map((name) => {
      const dir = path.join(backupDir, name);
      const manifestPath = path.join(dir, 'manifest.json');
      let createdAt = null;
      if (fs.existsSync(manifestPath)) {
        try {
          createdAt = JSON.parse(fs.readFileSync(manifestPath, 'utf8')).createdAt;
        } catch {
          /* ignore */
        }
      }
      const stat = fs.statSync(dir);
      return {
        name,
        createdAt: createdAt || stat.mtime.toISOString(),
        hasDatabase: fs.existsSync(path.join(dir, 'patientsdata.db'))
      };
    })
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

async function restoreBackup(name, user, req) {
  if (!name || !name.startsWith('clinic_backup_')) {
    const err = new Error('Invalid backup name');
    err.status = 400;
    throw err;
  }
  const targetDir = path.join(backupDir, name);
  if (!fs.existsSync(targetDir)) {
    const err = new Error('Backup not found');
    err.status = 404;
    throw err;
  }
  const backupDb = path.join(targetDir, 'patientsdata.db');
  if (!fs.existsSync(backupDb)) {
    const err = new Error('Backup database file missing');
    err.status = 400;
    throw err;
  }

  await closeDatabase();
  try {
    fs.copyFileSync(backupDb, dbPath);
    const backupXrays = path.join(targetDir, 'xrays');
    if (fs.existsSync(backupXrays)) {
      if (fs.existsSync(uploadsDir)) {
        fs.rmSync(uploadsDir, { recursive: true, force: true });
      }
      fs.cpSync(backupXrays, uploadsDir, { recursive: true });
    }
    await reopenDatabase();
  } catch (err) {
    try {
      await reopenDatabase();
    } catch {
      /* server may need restart */
    }
    throw err;
  }

  await logAudit({
    action: 'backup.restore',
    entityType: 'system',
    user,
    details: name,
    req
  });

  return { name };
}

async function exportFullJson(user, req) {
  const [patients, appointments, invoices, payments, procedures, staff] = await Promise.all([
    all('SELECT * FROM patients ORDER BY id'),
    all('SELECT * FROM appointments ORDER BY datetime'),
    all('SELECT * FROM invoices ORDER BY created_at DESC'),
    all('SELECT * FROM payments ORDER BY created_at DESC'),
    all('SELECT * FROM procedures ORDER BY code'),
    all('SELECT id, email, full_name, role, active, created_at FROM staff')
  ]);
  const [charts, plans, notes, images] = await Promise.all([
    all('SELECT * FROM dental_charts ORDER BY visit_date DESC'),
    all('SELECT * FROM treatment_plans ORDER BY created_at DESC'),
    all('SELECT * FROM visit_notes ORDER BY visit_date DESC'),
    all('SELECT id, patient_id, file_name, image_type, tooth_number, created_at FROM patient_images ORDER BY created_at DESC')
  ]);

  await logAudit({
    action: 'export.full',
    entityType: 'system',
    user,
    details: `patients:${patients.length}`,
    req
  });

  return {
    exportedAt: new Date().toISOString(),
    version: APP_VERSION,
    patients,
    appointments,
    invoices: invoices.map((i) => ({ ...i, items: JSON.parse(i.items || '[]') })),
    payments,
    procedures,
    staff,
    dentalCharts: charts.map((c) => ({ ...c, chart_data: JSON.parse(c.chart_data || '{}') })),
    treatmentPlans: plans.map((p) => ({ ...p, items: JSON.parse(p.items || '[]') })),
    visitNotes: notes,
    patientImages: images
  };
}

async function exportPatientsCsv(user, req) {
  const patients = await all('SELECT * FROM patients ORDER BY name');
  const cols = ['mrn', 'name', 'gender', 'age', 'phone_number', 'region', 'recall_due', 'registration_date'];
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  await logAudit({ action: 'export.patients', entityType: 'patients', user, req });
  return [cols.join(','), ...patients.map((p) => cols.map((c) => escape(p[c])).join(','))].join('\n');
}

async function getSystemInfo() {
  const counts = await Promise.all([
    get('SELECT COUNT(*) as c FROM patients'),
    get('SELECT COUNT(*) as c FROM appointments'),
    get('SELECT COUNT(*) as c FROM invoices'),
    get('SELECT COUNT(*) as c FROM audit_log')
  ]);
  const dbSize = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;
  let backupCount = 0;
  if (fs.existsSync(backupDir)) {
    backupCount = fs.readdirSync(backupDir).filter((f) => f.startsWith('clinic_backup_')).length;
  }
  return {
    version: APP_VERSION,
    databasePath: dbPath,
    databaseSizeBytes: dbSize,
    patients: counts[0].c,
    appointments: counts[1].c,
    invoices: counts[2].c,
    auditEntries: counts[3].c,
    backups: backupCount,
    port: parseInt(process.env.PORT, 10) || 3000,
    localUrl: `http://localhost:${process.env.PORT || 3000}`,
    networkUrls: getLanAddresses()
  };
}

async function seedDemo(user, req) {
  const { seedDemoData } = require('../config/demoData');
  const result = await seedDemoData();
  if (!result.seeded) {
    const err = new Error(result.message || 'Demo data was not loaded');
    err.status = result.reason === 'patients_exist' ? 409 : 400;
    err.code = result.reason;
    throw err;
  }
  await logAudit({
    action: 'admin.seed_demo',
    entityType: 'system',
    entityId: 'demo',
    user,
    details: `${result.patients} patients`,
    req
  });
  return result;
}

module.exports = {
  health,
  getAuditLog,
  createBackup,
  listBackups,
  restoreBackup,
  exportFullJson,
  exportPatientsCsv,
  getSystemInfo,
  seedDemo,
  APP_VERSION
};
