const { all, get, run } = require('../config/database');

function mapInvoice(r) {
  const items = JSON.parse(r.items || '[]');
  return {
    id: String(r.id),
    invoiceNumber: r.invoice_number,
    patientId: String(r.patient_id),
    patientName: r.patient_name || '',
    patientMrn: r.patient_mrn || '',
    items,
    subtotal: r.subtotal,
    discount: r.discount,
    discountStatus: r.discount_status || 'none',
    discountRequestedBy: r.discount_requested_by || '',
    discountApprovedBy: r.discount_approved_by || '',
    total: r.total,
    amountPaid: r.amount_paid,
    balance: r.balance,
    status: r.status,
    notes: r.notes || '',
    treatmentPlanId: r.treatment_plan_id || '',
    createdByName: r.created_by_name || '',
    created_at: r.created_at,
    updated_at: r.updated_at
  };
}

function genInvoiceNumber() {
  const d = new Date();
  const date = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${date}-${rand}`;
}

async function findInvoices(patientId) {
  if (patientId) {
    return all('SELECT * FROM invoices WHERE patient_id = ? ORDER BY created_at DESC', [patientId]);
  }
  return all('SELECT * FROM invoices ORDER BY created_at DESC');
}

async function findInvoiceById(id) {
  return get('SELECT * FROM invoices WHERE id = ?', [id]);
}

async function findPendingDiscounts() {
  return all(
    `SELECT * FROM invoices WHERE discount_status = 'pending' OR status = 'pending_discount' ORDER BY created_at DESC`
  );
}

async function insertInvoice(values) {
  return run(
    `INSERT INTO invoices (invoice_number, patient_id, patient_name, patient_mrn, items, subtotal, discount, total, amount_paid, balance, status, notes, treatment_plan_id, created_by, created_by_name, discount_status, discount_requested_by, discount_approved_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values
  );
}

async function insertInvoiceFromPlan(values) {
  return run(
    `INSERT INTO invoices (invoice_number, patient_id, patient_name, patient_mrn, items, subtotal, discount, total, amount_paid, balance, status, notes, treatment_plan_id, created_by, created_by_name, discount_status, discount_approved_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 'none', ?)`,
    values
  );
}

async function updateInvoice(id, fields) {
  await run(
    `UPDATE invoices SET items=?, subtotal=?, discount=?, total=?, amount_paid=?, balance=?, status=?, notes=?, discount_status=COALESCE(?, discount_status), discount_approved_by=COALESCE(?, discount_approved_by), updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [
      JSON.stringify(fields.items), fields.subtotal, fields.discount, fields.total,
      fields.amountPaid, fields.balance, fields.status, fields.notes || '',
      fields.discount_status || null, fields.discount_approved_by || null,
      id
    ]
  );
}

async function approveDiscount(id, approvedBy, status) {
  await run(
    `UPDATE invoices SET discount_status='approved', discount_approved_by=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [approvedBy, status, id]
  );
}

async function cancelInvoice(id) {
  await run(`UPDATE invoices SET status='cancelled', balance=0, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [id]);
}

async function updateInvoicePayment(id, amountPaid, balance, status) {
  await run(
    `UPDATE invoices SET amount_paid=?, balance=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [amountPaid, balance, status, id]
  );
}

async function findPayments(invoiceId) {
  if (invoiceId) {
    return all('SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at', [invoiceId]);
  }
  return all('SELECT * FROM payments ORDER BY created_at DESC');
}

function mapPayment(r) {
  return {
    id: String(r.id),
    invoiceId: String(r.invoice_id),
    patientId: r.patient_id ? String(r.patient_id) : '',
    invoiceNumber: r.invoice_number || '',
    amount: r.amount,
    method: r.method,
    reference: r.reference || '',
    notes: r.notes || '',
    receivedBy: r.received_by || '',
    receivedByName: r.received_by_name || '',
    createdAt: r.created_at,
    created_at: r.created_at
  };
}

async function findPaymentById(id) {
  return get('SELECT * FROM payments WHERE id = ?', [id]);
}

async function findPaymentsInRange(start, end) {
  return all(
    `SELECT p.*, i.patient_name, i.invoice_number
     FROM payments p
     LEFT JOIN invoices i ON i.id = p.invoice_id
     WHERE p.created_at >= ? AND p.created_at <= ?
     ORDER BY p.created_at ASC`,
    [start, end]
  );
}

async function insertPayment(values) {
  return run(
    `INSERT INTO payments (invoice_id, patient_id, invoice_number, amount, method, reference, notes, received_by, received_by_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values
  );
}

async function findActiveTreatmentPlans() {
  return all(`
    SELECT tp.*, p.name AS patient_name, p.mrn AS patient_mrn
    FROM treatment_plans tp
    JOIN patients p ON p.id = tp.patient_id
    WHERE tp.status = 'active'
    ORDER BY tp.updated_at DESC
  `);
}

async function findTreatmentPlanById(id) {
  return get('SELECT * FROM treatment_plans WHERE id = ?', [id]);
}

async function updateTreatmentPlanItems(planId, itemsJson) {
  await run(
    'UPDATE treatment_plans SET items = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [itemsJson, planId]
  );
}

module.exports = {
  mapInvoice,
  genInvoiceNumber,
  findInvoices,
  findInvoiceById,
  findPendingDiscounts,
  insertInvoice,
  insertInvoiceFromPlan,
  updateInvoice,
  approveDiscount,
  cancelInvoice,
  updateInvoicePayment,
  findPayments,
  mapPayment,
  findPaymentById,
  findPaymentsInRange,
  insertPayment,
  findActiveTreatmentPlans,
  findTreatmentPlanById,
  updateTreatmentPlanItems
};
