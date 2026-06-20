const bcrypt = require('bcryptjs');
const { run, get, all } = require('./database');
const { normalizeStaffEmail } = require('../utils/emailAddress');
const { DEFAULT_SCHEDULE } = require('../utils/dentistSchedule');

function dayIso(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function dateTimeIso(offsetDays = 0, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function genInvoiceNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${date}-${rand}`;
}

const DEMO_PATIENTS = [
  {
    mrn: 'MRN-DEMO-001',
    name: 'Helina Tadesse',
    father_name: 'Tadesse',
    grandfather_name: 'Bekele',
    gender: 'Female',
    dob: '1992-03-14',
    age: 34,
    address: 'Bole Road, Near Edna Mall',
    region: 'Addis Ababa',
    wereda_subcity: 'Bole',
    ketena_gott: '03',
    kebele: '08',
    phone_number: '0911223344',
    emergency_name: 'Meron Tadesse',
    emergency_number: '0922334455',
    insurance_plan: 'CBHI',
    allergies: 'Penicillin',
    chief_complaint: 'Tooth pain upper right',
    recall_due: dayIso(-14),
    last_dental_visit: dayIso(-180)
  },
  {
    mrn: 'MRN-DEMO-002',
    name: 'Dawit Mekonnen',
    father_name: 'Mekonnen',
    grandfather_name: 'Alemu',
    gender: 'Male',
    dob: '1985-07-22',
    age: 40,
    address: 'Kazanchis, Churchill Ave',
    region: 'Addis Ababa',
    wereda_subcity: 'Kirkos',
    ketena_gott: '05',
    kebele: '12',
    phone_number: '0933445566',
    emergency_name: 'Hanna Mekonnen',
    emergency_number: '0944556677',
    insurance_plan: '',
    medical_conditions: 'Controlled hypertension',
    chief_complaint: 'Crown replacement',
    recall_due: dayIso(90),
    last_dental_visit: dayIso(-30)
  },
  {
    mrn: 'MRN-DEMO-003',
    name: 'Sara Mohammed',
    father_name: 'Mohammed',
    grandfather_name: 'Yusuf',
    gender: 'Female',
    dob: '1998-11-05',
    age: 27,
    address: 'Megenagna, CMC area',
    region: 'Addis Ababa',
    wereda_subcity: 'Yeka',
    ketena_gott: '02',
    kebele: '04',
    phone_number: '0955667788',
    emergency_name: 'Fatuma Mohammed',
    emergency_number: '0966778899',
    chief_complaint: 'Routine cleaning',
    recall_due: dayIso(7),
    last_dental_visit: dayIso(-7)
  },
  {
    mrn: 'MRN-DEMO-004',
    name: 'Abel Getachew',
    father_name: 'Getachew',
    grandfather_name: 'Solomon',
    gender: 'Male',
    dob: '2010-01-18',
    age: 16,
    address: 'Sarbet, Mexico area',
    region: 'Addis Ababa',
    wereda_subcity: 'Nifas Silk',
    ketena_gott: '01',
    kebele: '06',
    phone_number: '0977889900',
    emergency_name: 'Selam Getachew',
    emergency_number: '0988990011',
    referred_by: 'School nurse',
    chief_complaint: 'Orthodontic consult'
  },
  {
    mrn: 'MRN-DEMO-005',
    name: 'Tigist Haile',
    father_name: 'Haile',
    grandfather_name: 'Girma',
    gender: 'Female',
    dob: '1978-09-30',
    age: 47,
    address: 'Piassa, Arat Kilo',
    region: 'Addis Ababa',
    wereda_subcity: 'Arada',
    ketena_gott: '04',
    kebele: '10',
    phone_number: '0911002233',
    emergency_name: 'Daniel Haile',
    emergency_number: '0922003344',
    insurance_plan: 'Private',
    insurance_member_id: 'INS-88421',
    recall_due: dayIso(3),
    medications: 'Metformin'
  },
  {
    mrn: 'MRN-DEMO-006',
    name: 'Michael Assefa',
    father_name: 'Assefa',
    grandfather_name: 'Demissie',
    gender: 'Male',
    dob: '1995-12-08',
    age: 30,
    address: 'Lebu, Summit area',
    region: 'Addis Ababa',
    wereda_subcity: 'Nifas Silk',
    ketena_gott: '07',
    kebele: '15',
    phone_number: '0933001122',
    emergency_name: 'Ruth Assefa',
    emergency_number: '0944112233',
    chief_complaint: 'Whitening consultation',
    recall_due: dayIso(120),
    last_dental_visit: dayIso(-14)
  }
];

async function ensureStaff({ username, fullName, role, password }) {
  const email = normalizeStaffEmail(username);
  const existing = await get('SELECT id FROM staff WHERE email = ?', [email]);
  if (existing) return String(existing.id);

  const hash = bcrypt.hashSync(password, 10);
  const schedule = role === 'dentist' ? JSON.stringify(DEFAULT_SCHEDULE) : null;
  const result = await run(
    `INSERT INTO staff (email, password_hash, full_name, role, schedule) VALUES (?, ?, ?, ?, ?)`,
    [email, hash, fullName, role, schedule]
  );
  return String(result.lastID);
}

async function insertPatient(p) {
  const registration_date = new Date().toISOString();
  const result = await run(
    `INSERT INTO patients (
      mrn, registration_date, name, father_name, grandfather_name,
      gender, dob, age, address, region, wereda_subcity,
      ketena_gott, kebele, phone_number,
      emergency_name, emergency_number,
      insurance_plan, insurance_member_id, referred_by,
      last_dental_visit, recall_due, allergies, medications,
      medical_conditions, chief_complaint
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      p.mrn, registration_date, p.name, p.father_name, p.grandfather_name,
      p.gender, p.dob, p.age, p.address, p.region, p.wereda_subcity,
      p.ketena_gott, p.kebele, p.phone_number,
      p.emergency_name, p.emergency_number,
      p.insurance_plan || '', p.insurance_member_id || '', p.referred_by || '',
      p.last_dental_visit || null, p.recall_due || null,
      p.allergies || '', p.medications || '', p.medical_conditions || '',
      p.chief_complaint || ''
    ]
  );
  return { id: result.lastID, mrn: p.mrn, name: p.name };
}

async function seedDemoData({ force = false } = {}) {
  const patientCount = await get('SELECT COUNT(*) as c FROM patients');
  if (patientCount.c > 0 && !force) {
    return { seeded: false, reason: 'patients_exist', patients: patientCount.c };
  }
  if (force && patientCount.c > 0) {
    return { seeded: false, reason: 'force_not_supported', message: 'Delete the database or patients first.' };
  }

  const staffPassword = process.env.PMS_DEMO_STAFF_PASSWORD || process.env.PMS_ADMIN_PASSWORD;
  if (!staffPassword) {
    return {
      seeded: false,
      reason: 'missing_password',
      message: 'Set PMS_DEMO_STAFF_PASSWORD or PMS_ADMIN_PASSWORD in .env'
    };
  }

  const admin = await get("SELECT id, full_name FROM staff WHERE role = 'admin' ORDER BY id LIMIT 1");
  const dentistId = await ensureStaff({
    username: 'dr.amin',
    fullName: 'Dr. Amin Bekele',
    role: 'dentist',
    password: staffPassword
  });
  const receptionId = await ensureStaff({
    username: 'sara',
    fullName: 'Sara Hailu',
    role: 'receptionist',
    password: staffPassword
  });

  const dentistName = 'Dr. Amin Bekele';
  const adminId = admin ? String(admin.id) : dentistId;
  const adminName = admin?.full_name || dentistName;

  const patients = [];
  for (const p of DEMO_PATIENTS) {
    patients.push(await insertPatient(p));
  }

  const [helina, dawit, sara, abel, tigist, michael] = patients;

  const appts = [
    { patient: helina, offset: 0, hour: 9, type: 'emergency', status: 'scheduled', notes: 'Pain #16' },
    { patient: dawit, offset: 0, hour: 11, type: 'treatment', status: 'scheduled', notes: 'Crown prep' },
    { patient: sara, offset: 1, hour: 10, type: 'cleaning', status: 'scheduled', notes: 'Prophylaxis' },
    { patient: abel, offset: 1, hour: 14, type: 'consultation', status: 'scheduled', notes: 'Ortho eval' },
    { patient: tigist, offset: 2, hour: 9, type: 'checkup', status: 'scheduled', notes: 'Recall exam' },
    { patient: michael, offset: -3, hour: 15, type: 'consultation', status: 'completed', notes: 'Whitening discussed' },
    { patient: helina, offset: -30, hour: 10, type: 'checkup', status: 'completed', notes: 'Previous visit' }
  ];

  for (const a of appts) {
    await run(
      `INSERT INTO appointments (patient_id, patient_name, patient_mrn, staff_id, staff_name, datetime, duration, type, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, 30, ?, ?, ?)`,
      [a.patient.id, a.patient.name, a.patient.mrn, dentistId, dentistName, dateTimeIso(a.offset, a.hour), a.type, a.status, a.notes]
    );
  }

  const chartData = {
    16: { condition: 'decay', surfaces: ['O'], notes: 'Deep caries' },
    26: { condition: 'filled', surfaces: ['O'], notes: 'Composite' },
    36: { condition: 'missing', surfaces: [], notes: '' }
  };
  await run(
    `INSERT INTO dental_charts (patient_id, chart_data, visit_date, created_by, created_by_name) VALUES (?, ?, ?, ?, ?)`,
    [helina.id, JSON.stringify(chartData), dayIso(-30), dentistId, dentistName]
  );

  const planItems = [
    { id: 'tp1', tooth: '16', procedure: 'Root canal therapy', code: 'D3310', fee: 4500, status: 'planned', invoiced: false },
    { id: 'tp2', tooth: '16', procedure: 'Crown — porcelain', code: 'D2740', fee: 6200, status: 'planned', invoiced: false },
    { id: 'tp3', tooth: '36', procedure: 'Extraction', code: 'D7140', fee: 1800, status: 'completed', invoiced: true }
  ];
  const planResult = await run(
    `INSERT INTO treatment_plans (patient_id, title, status, items, created_by, created_by_name) VALUES (?, ?, 'active', ?, ?, ?)`,
    [dawit.id, 'Upper right restoration', JSON.stringify(planItems), dentistId, dentistName]
  );

  await run(
    `INSERT INTO visit_notes (patient_id, visit_date, subjective, objective, assessment, plan, created_by, created_by_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      helina.id,
      dayIso(-30),
      'Patient reports sharp pain upper right when chewing.',
      'Caries on #16 MOD. Percussion positive.',
      'Irreversible pulpitis #16.',
      'RCT and crown. Prescribed ibuprofen PRN.',
      dentistId,
      dentistName
    ]
  );

  const invoiceItems = [
    { procedureName: 'Consultation', quantity: 1, unitPrice: 500 },
    { procedureName: 'Periapical X-ray', quantity: 2, unitPrice: 250 },
    { procedureName: 'Crown prep — tooth #16', quantity: 1, unitPrice: 3500 }
  ];
  const subtotal = 4500;
  const total = 4500;
  const paid = 2000;
  const invNum = genInvoiceNumber();
  const invResult = await run(
    `INSERT INTO invoices (invoice_number, patient_id, patient_name, patient_mrn, items, subtotal, discount, total, amount_paid, balance, status, notes, created_by, created_by_name)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'partial', ?, ?, ?)`,
    [invNum, dawit.id, dawit.name, dawit.mrn, JSON.stringify(invoiceItems), subtotal, total, paid, total - paid, 'Partial payment received', adminId, adminName]
  );

  await run(
    `INSERT INTO payments (invoice_id, patient_id, invoice_number, amount, method, reference, received_by, received_by_name)
     VALUES (?, ?, ?, ?, 'cash', ?, ?, ?)`,
    [invResult.lastID, dawit.id, invNum, paid, 'RCPT-DEMO-001', receptionId, 'Sara Hailu']
  );

  const paidItems = [{ procedureName: 'Teeth whitening kit', quantity: 1, unitPrice: 2800 }];
  const paidTotal = 2800;
  const paidInv = genInvoiceNumber();
  const paidInvResult = await run(
    `INSERT INTO invoices (invoice_number, patient_id, patient_name, patient_mrn, items, subtotal, discount, total, amount_paid, balance, status, created_by, created_by_name)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 0, 'paid', ?, ?)`,
    [paidInv, michael.id, michael.name, michael.mrn, JSON.stringify(paidItems), paidTotal, paidTotal, paidTotal, adminId, adminName]
  );

  await run(
    `INSERT INTO payments (invoice_id, patient_id, invoice_number, amount, method, received_by, received_by_name)
     VALUES (?, ?, ?, ?, 'card', ?, ?)`,
    [paidInvResult.lastID, michael.id, paidInv, paidTotal, receptionId, 'Sara Hailu']
  );

  await run(
    `INSERT INTO clinic_alerts (type, message, patient_id, patient_name, meta, read_flag)
     VALUES (?, ?, ?, ?, ?, 0)`,
    ['recall_due', 'Recall overdue — schedule follow-up', String(helina.id), helina.name, JSON.stringify({ mrn: helina.mrn })]
  );
  await run(
    `INSERT INTO clinic_alerts (type, message, patient_id, patient_name, meta, read_flag)
     VALUES (?, ?, ?, ?, ?, 0)`,
    ['assignment', 'New patient registered — assign dentist', String(abel.id), abel.name, JSON.stringify({ mrn: abel.mrn })]
  );

  await run(
    `UPDATE patients SET assigned_doctor_id = ?, assigned_doctor_name = ?, assignment_status = 'assigned' WHERE id = ?`,
    [dentistId, dentistName, helina.id]
  );

  return {
    seeded: true,
    patients: patients.length,
    staff: { dentistId, receptionId },
    appointments: appts.length,
    invoices: 2,
    treatmentPlans: 1
  };
}

module.exports = { seedDemoData };
