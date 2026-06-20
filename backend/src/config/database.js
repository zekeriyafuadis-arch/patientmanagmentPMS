const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dataRoot = process.env.PMS_DATA_DIR || path.join(__dirname, '../../../patientsData');
const dbPath = process.env.PMS_DB_PATH || path.join(dataRoot, 'patientsdata.db');
const uploadsDir = process.env.PMS_UPLOADS_DIR || path.join(dataRoot, 'xrays');

if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

let db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

async function columnExists(table, column) {
  const cols = await all(`PRAGMA table_info(${table})`);
  return cols.some((c) => c.name === column);
}

async function addColumnIfMissing(table, column, definition) {
  if (!(await columnExists(table, column))) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function initDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'receptionist',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await addColumnIfMissing('staff', 'schedule', 'TEXT');

  await run(`
    CREATE TABLE IF NOT EXISTS clinic_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      patient_id TEXT,
      patient_name TEXT,
      meta TEXT DEFAULT '{}',
      read_flag INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
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
      insurance_plan TEXT,
      insurance_member_id TEXT,
      referred_by TEXT,
      last_dental_visit TEXT,
      recall_due TEXT,
      allergies TEXT,
      medications TEXT,
      medical_conditions TEXT,
      chief_complaint TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const patientDentalCols = [
    ['insurance_plan', 'TEXT'],
    ['insurance_member_id', 'TEXT'],
    ['referred_by', 'TEXT'],
    ['last_dental_visit', 'TEXT'],
    ['recall_due', 'TEXT'],
    ['allergies', 'TEXT'],
    ['medications', 'TEXT'],
    ['medical_conditions', 'TEXT'],
    ['chief_complaint', 'TEXT']
  ];
  for (const [col, def] of patientDentalCols) {
    await addColumnIfMissing('patients', col, def);
  }

  const patientAssignmentCols = [
    ['assigned_doctor_id', 'TEXT'],
    ['assigned_doctor_name', 'TEXT'],
    ['assignment_status', 'TEXT'],
    ['assigned_appointment_id', 'TEXT'],
    ['assigned_at', 'TEXT']
  ];
  for (const [col, def] of patientAssignmentCols) {
    await addColumnIfMissing('patients', col, def);
  }

  const patientDoctorCols = [
    ['primary_doctor_id', 'TEXT'],
    ['primary_doctor_name', 'TEXT']
  ];
  for (const [col, def] of patientDoctorCols) {
    await addColumnIfMissing('patients', col, def);
  }

  await run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      patient_name TEXT,
      patient_mrn TEXT,
      staff_id TEXT,
      staff_name TEXT,
      datetime TEXT NOT NULL,
      duration INTEGER DEFAULT 30,
      type TEXT DEFAULT 'checkup',
      status TEXT DEFAULT 'scheduled',
      chair TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  await addColumnIfMissing('appointments', 'treatment_plan_id', 'TEXT');
  await addColumnIfMissing('appointments', 'treatment_item_id', 'TEXT');
  await addColumnIfMissing('appointments', 'check_in_at', 'TEXT');

  await run(`
    CREATE TABLE IF NOT EXISTS dental_charts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      chart_data TEXT NOT NULL,
      visit_date TEXT NOT NULL,
      created_by TEXT,
      created_by_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS perio_charts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      chart_data TEXT NOT NULL,
      visit_date TEXT NOT NULL,
      created_by TEXT,
      created_by_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS clinical_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doc_type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      created_by TEXT,
      created_by_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS treatment_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      items TEXT DEFAULT '[]',
      created_by TEXT,
      created_by_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS visit_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      appointment_id TEXT,
      visit_date TEXT NOT NULL,
      notes TEXT,
      subjective TEXT,
      objective TEXT,
      assessment TEXT,
      plan TEXT,
      created_by TEXT,
      created_by_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS procedures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      default_price REAL DEFAULT 0,
      category TEXT DEFAULT 'general',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      patient_id INTEGER NOT NULL,
      patient_name TEXT,
      patient_mrn TEXT,
      items TEXT NOT NULL,
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total REAL DEFAULT 0,
      amount_paid REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      status TEXT DEFAULT 'sent',
      notes TEXT,
      treatment_plan_id TEXT,
      created_by TEXT,
      created_by_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      patient_id INTEGER,
      invoice_number TEXT,
      amount REAL NOT NULL,
      method TEXT DEFAULT 'cash',
      reference TEXT,
      notes TEXT,
      received_by TEXT,
      received_by_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS patient_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      image_type TEXT DEFAULT 'xray',
      tooth_number TEXT,
      notes TEXT,
      uploaded_by TEXT,
      uploaded_by_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      user_id TEXT,
      user_name TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients(mrn)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_patients_recall ON patients(recall_due)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_appointments_datetime ON appointments(datetime)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON invoices(patient_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_perio_patient ON perio_charts(patient_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_clinical_docs_patient ON clinical_documents(patient_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone_number)`);

  await addColumnIfMissing('invoices', 'discount_status', "TEXT DEFAULT 'none'");
  await addColumnIfMissing('invoices', 'discount_requested_by', 'TEXT');
  await addColumnIfMissing('invoices', 'discount_approved_by', 'TEXT');

  const staffCount = await get('SELECT COUNT(*) as c FROM staff');
  if (staffCount.c === 0) {
    const { adminSeed } = require('./env');
    const { normalizeStaffEmail } = require('../utils/emailAddress');
    if (!adminSeed.password) {
      console.warn(
        'No staff accounts found. Set PMS_ADMIN_USERNAME and PMS_ADMIN_PASSWORD in .env to create the initial admin.'
      );
    } else {
      const email = normalizeStaffEmail(adminSeed.username);
      const hash = bcrypt.hashSync(adminSeed.password, 10);
      await run(
        `INSERT INTO staff (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)`,
        [email, hash, adminSeed.fullName, 'admin']
      );
      console.log(`Default admin account created (${email}).`);
    }
  }

  const procCount = await get('SELECT COUNT(*) as c FROM procedures');
  if (procCount.c === 0) {
    const defaults = require('./defaultProcedures');
    for (const p of defaults) {
      await run(
        `INSERT INTO procedures (code, name, default_price, category, active) VALUES (?, ?, ?, ?, 1)`,
        [p.code, p.name, p.defaultPrice, p.category]
      );
    }
    console.log(`Seeded ${defaults.length} default procedures`);
  }

  const { DEFAULT_SCHEDULE } = require('../utils/dentistSchedule');
  const dentistsNoSchedule = await all(
    "SELECT id FROM staff WHERE role = 'dentist' AND (schedule IS NULL OR schedule = '')"
  );
  for (const d of dentistsNoSchedule) {
    await run('UPDATE staff SET schedule = ? WHERE id = ?', [JSON.stringify(DEFAULT_SCHEDULE), d.id]);
  }

  if (process.env.PMS_SEED_DEMO === '1') {
    const { seedDemoData } = require('./demoData');
    const result = await seedDemoData();
    if (result.seeded) {
      console.log(`Demo data loaded: ${result.patients} patients, ${result.appointments} appointments.`);
    } else if (result.reason === 'patients_exist') {
      console.log('Demo seed skipped — patients already in database.');
    } else if (result.reason === 'missing_password') {
      console.warn(`Demo seed skipped — ${result.message}`);
    }
  }
}

function closeDatabase() {
  return new Promise((resolve, reject) => {
    db.close((err) => (err ? reject(err) : resolve()));
  });
}

function reopenDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => (err ? reject(err) : resolve()));
  });
}

module.exports = {
  get db() {
    return db;
  },
  run,
  get,
  all,
  initDatabase,
  closeDatabase,
  reopenDatabase,
  uploadsDir,
  dbPath,
  dataRoot
};
