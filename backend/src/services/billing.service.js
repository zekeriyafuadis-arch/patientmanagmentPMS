const { get } = require('../config/database');
const { logAudit } = require('../utils/audit');
const { publishChange } = require('../utils/publishChange');
const { canApplyDiscountDirectly } = require('../utils/permissions');
const BillingRepository = require('../repositories/billing.repository');

function calcLineTotal(item) {
  const qty = parseInt(item.quantity, 10) || 1;
  const price = parseFloat(item.unitPrice) || 0;
  const discount = parseFloat(item.discount) || 0;
  return Math.max(0, qty * price - discount);
}

function calcTotals(items, discount = 0) {
  const subtotal = (items || []).reduce((s, i) => s + calcLineTotal(i), 0);
  const disc = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - disc);
  return { subtotal, discount: disc, total };
}

function deriveStatus(total, paid) {
  if (paid <= 0) return 'sent';
  if (paid >= total) return 'paid';
  return 'partial';
}

async function markTreatmentItemsInvoiced(planId, itemIds) {
  if (!planId || !itemIds?.length) return;
  const row = await BillingRepository.findTreatmentPlanById(planId);
  if (!row) return;
  const items = JSON.parse(row.items || '[]');
  const idSet = new Set(itemIds.map(String));
  const updated = items.map((item) => {
    if (idSet.has(String(item.id))) {
      return { ...item, invoiced: true, status: 'billed' };
    }
    return item;
  });
  await BillingRepository.updateTreatmentPlanItems(planId, JSON.stringify(updated));
}

async function unmarkTreatmentItemsInvoiced(planId, itemIds) {
  if (!planId || !itemIds?.length) return;
  const row = await BillingRepository.findTreatmentPlanById(planId);
  if (!row) return;
  const items = JSON.parse(row.items || '[]');
  const idSet = new Set(itemIds.map(String));
  const updated = items.map((item) => {
    if (idSet.has(String(item.id))) {
      return { ...item, invoiced: false, status: 'completed' };
    }
    return item;
  });
  await BillingRepository.updateTreatmentPlanItems(planId, JSON.stringify(updated));
}

function resolveDiscountFields(user, discount) {
  const disc = parseFloat(discount) || 0;
  if (disc <= 0) {
    return { discount: 0, discountStatus: 'none', invoiceStatus: 'sent' };
  }
  if (canApplyDiscountDirectly(user)) {
    return {
      discount: disc,
      discountStatus: 'approved',
      invoiceStatus: 'sent',
      discountApprovedBy: user.id
    };
  }
  if (user.role === 'receptionist') {
    return {
      discount: disc,
      discountStatus: 'pending',
      invoiceStatus: 'pending_discount',
      discountRequestedBy: user.id
    };
  }
  const err = new Error('Only admin can apply discounts');
  err.statusCode = 403;
  throw err;
}

class BillingService {
  static async listInvoices(patientId) {
    const rows = await BillingRepository.findInvoices(patientId);
    return rows.map(BillingRepository.mapInvoice);
  }

  static async getInvoice(id) {
    const row = await BillingRepository.findInvoiceById(id);
    if (!row) {
      const err = new Error('Not found');
      err.statusCode = 404;
      throw err;
    }
    return BillingRepository.mapInvoice(row);
  }

  static async getPendingTreatmentItems() {
    const rows = await BillingRepository.findActiveTreatmentPlans();
    const pending = [];
    rows.forEach((plan) => {
      const items = JSON.parse(plan.items || '[]');
      items.forEach((item) => {
        if (item.status === 'completed' && !item.invoiced) {
          pending.push({
            planId: String(plan.id),
            itemId: item.id,
            patientId: String(plan.patient_id),
            patientName: plan.patient_name || '',
            patientMrn: plan.patient_mrn || '',
            planTitle: plan.title || 'Treatment Plan',
            procedureCode: item.procedureCode || '',
            procedureName: item.procedureName || '',
            toothNumber: item.toothNumber || '',
            price: parseFloat(item.price) || 0
          });
        }
      });
    });
    return pending;
  }

  static async createInvoiceFromTreatmentPlan(user, { planId, patientId }) {
    const plan = await BillingRepository.findTreatmentPlanById(planId);
    if (!plan) {
      const err = new Error('Treatment plan not found');
      err.statusCode = 404;
      throw err;
    }

    const patient = await get('SELECT * FROM patients WHERE id = ?', [patientId || plan.patient_id]);
    if (!patient) {
      const err = new Error('Patient not found');
      err.statusCode = 404;
      throw err;
    }

    const billable = JSON.parse(plan.items || '[]').filter(
      (item) => item.status === 'completed' && !item.invoiced
    );
    if (billable.length === 0) {
      const err = new Error('No completed procedures awaiting invoice');
      err.statusCode = 400;
      throw err;
    }

    const lineItems = billable.map((item) => ({
      id: `item-${Date.now()}-${item.id}`,
      treatmentItemId: String(item.id),
      procedureCode: item.procedureCode || '',
      procedureName: item.procedureName || 'Procedure',
      toothNumber: item.toothNumber || '',
      quantity: 1,
      unitPrice: parseFloat(item.price) || 0,
      discount: 0,
      lineTotal: parseFloat(item.price) || 0
    }));
    const totals = calcTotals(lineItems, 0);
    const result = await BillingRepository.insertInvoiceFromPlan([
      BillingRepository.genInvoiceNumber(),
      patient.id,
      patient.name,
      patient.mrn,
      JSON.stringify(lineItems),
      totals.subtotal,
      totals.discount,
      totals.total,
      totals.total,
      'sent',
      `From treatment plan: ${plan.title || 'Treatment Plan'}`,
      String(plan.id),
      user.id,
      user.fullName,
      user.id
    ]);

    await markTreatmentItemsInvoiced(String(plan.id), billable.map((i) => i.id));

    publishChange('billing', 'created', { id: result.lastID, patientId: patient.id }, user?.id);
    return { id: String(result.lastID) };
  }

  static async createInvoice(user, body) {
    const d = body;
    const lineItems = (d.items || []).map((item, idx) => ({
      id: item.id || `item-${Date.now()}-${idx}`,
      procedureCode: item.procedureCode || '',
      procedureName: item.procedureName || item.description || 'Service',
      toothNumber: item.toothNumber || '',
      quantity: parseInt(item.quantity, 10) || 1,
      unitPrice: parseFloat(item.unitPrice) || 0,
      discount: parseFloat(item.discount) || 0,
      lineTotal: calcLineTotal(item)
    }));
    const totals = calcTotals(lineItems, d.discount);
    const discountMeta = resolveDiscountFields(user, d.discount);
    const result = await BillingRepository.insertInvoice([
      BillingRepository.genInvoiceNumber(), d.patientId, d.patientName, d.patientMrn,
      JSON.stringify(lineItems), totals.subtotal, discountMeta.discount, totals.total,
      totals.total, discountMeta.invoiceStatus, d.notes || '', d.treatmentPlanId || '',
      user.id, user.fullName,
      discountMeta.discountStatus,
      discountMeta.discountRequestedBy || '',
      discountMeta.discountApprovedBy || ''
    ]);

    if (d.treatmentPlanId && d.treatmentItemIds?.length) {
      await markTreatmentItemsInvoiced(d.treatmentPlanId, d.treatmentItemIds);
    }

    publishChange('billing', 'created', { id: result.lastID, patientId: d.patientId }, user?.id);
    return { id: String(result.lastID) };
  }

  static async updateInvoice(user, id, body) {
    const existing = await BillingRepository.findInvoiceById(id);
    if (!existing) {
      const err = new Error('Not found');
      err.statusCode = 404;
      throw err;
    }

    const d = { ...body };
    let payload = { ...d };
    if (payload.items) {
      payload.items = payload.items.map((item) => ({ ...item, lineTotal: calcLineTotal(item) }));
      const discountVal = payload.discount ?? existing.discount ?? 0;
      const totals = calcTotals(payload.items, discountVal);
      payload.subtotal = totals.subtotal;
      payload.total = totals.total;
      const paid = payload.amountPaid ?? existing.amount_paid ?? 0;
      payload.balance = Math.max(0, totals.total - paid);
      payload.status = deriveStatus(totals.total, paid);

      if (parseFloat(discountVal) > 0 && !canApplyDiscountDirectly(user)) {
        const err = new Error('Only admin can apply discounts');
        err.statusCode = 403;
        throw err;
      }
      if (parseFloat(discountVal) > 0 && canApplyDiscountDirectly(user)) {
        payload.discount_status = 'approved';
        payload.discount_approved_by = user.id;
      }
    }

    await BillingRepository.updateInvoice(id, payload);
  }

  static async approveDiscount(user, id, req) {
    const invoice = await BillingRepository.findInvoiceById(id);
    if (!invoice) {
      const err = new Error('Not found');
      err.statusCode = 404;
      throw err;
    }
    if (invoice.discount_status !== 'pending') {
      const err = new Error('No pending discount to approve');
      err.statusCode = 400;
      throw err;
    }
    const paid = invoice.amount_paid || 0;
    const status = deriveStatus(invoice.total, paid);
    await BillingRepository.approveDiscount(id, user.id, status);
    await logAudit({
      action: 'invoice.discount_approved',
      entityType: 'invoice',
      entityId: id,
      user,
      details: `Discount ${invoice.discount}`,
      req
    });
  }

  static async cancelInvoice(id) {
    const invoice = await BillingRepository.findInvoiceById(id);
    if (!invoice) {
      const err = new Error('Not found');
      err.statusCode = 404;
      throw err;
    }

    if (invoice.treatment_plan_id) {
      const lineItems = JSON.parse(invoice.items || '[]');
      let itemIds = lineItems.map((i) => i.treatmentItemId).filter(Boolean);
      if (!itemIds.length) {
        const plan = await BillingRepository.findTreatmentPlanById(invoice.treatment_plan_id);
        if (plan) {
          itemIds = JSON.parse(plan.items || '[]')
            .filter((i) => i.invoiced)
            .map((i) => i.id);
        }
      }
      if (itemIds.length) {
        await unmarkTreatmentItemsInvoiced(invoice.treatment_plan_id, itemIds);
      }
    }

    await BillingRepository.cancelInvoice(id);
  }

  static async listPayments(invoiceId) {
    const rows = await BillingRepository.findPayments(invoiceId);
    return rows.map((p) => ({
      id: String(p.id),
      invoiceId: String(p.invoice_id),
      patientId: String(p.patient_id),
      invoiceNumber: p.invoice_number,
      amount: p.amount,
      method: p.method,
      reference: p.reference,
      notes: p.notes,
      receivedBy: p.received_by,
      receivedByName: p.received_by_name,
      created_at: p.created_at
    }));
  }

  static async createPayment(user, body, req) {
    const { invoiceId, amount, method, reference, notes } = body;
    const invoice = await BillingRepository.findInvoiceById(invoiceId);
    if (!invoice) {
      const err = new Error('Invoice not found');
      err.statusCode = 404;
      throw err;
    }
    if (invoice.status === 'cancelled') {
      const err = new Error('Cannot pay cancelled invoice');
      err.statusCode = 400;
      throw err;
    }
    if (invoice.discount_status === 'pending' || invoice.status === 'pending_discount') {
      const err = new Error('Invoice discount pending admin approval');
      err.statusCode = 400;
      throw err;
    }

    const payAmount = parseFloat(amount);
    if (!payAmount || payAmount <= 0) {
      const err = new Error('Invalid amount');
      err.statusCode = 400;
      throw err;
    }

    const currentBalance = parseFloat(invoice.balance) || 0;
    if (payAmount > currentBalance + 0.001) {
      const err = new Error(`Payment cannot exceed balance of ${currentBalance.toFixed(2)}`);
      err.statusCode = 400;
      throw err;
    }

    const payResult = await BillingRepository.insertPayment([
      invoiceId, invoice.patient_id, invoice.invoice_number, payAmount, method || 'cash',
      reference || '', notes || '', user.id, user.fullName
    ]);

    const newPaid = (invoice.amount_paid || 0) + payAmount;
    const balance = Math.max(0, invoice.total - newPaid);
    const status = deriveStatus(invoice.total, newPaid);
    await BillingRepository.updateInvoicePayment(invoiceId, newPaid, balance, status);
    await logAudit({
      action: 'payment.record',
      entityType: 'invoice',
      entityId: invoiceId,
      user,
      details: `${payAmount} ${method || 'cash'}`,
      req
    });
    publishChange('billing', 'payment', { invoiceId, patientId: invoice.patient_id }, user?.id);
    return { id: String(payResult.lastID), amountPaid: newPaid, balance, status };
  }

  static async getOutstanding() {
    const invoices = await BillingRepository.findInvoices();
    const outstanding = invoices
      .filter((i) => !['paid', 'cancelled'].includes(i.status))
      .reduce((s, i) => s + (parseFloat(i.balance) || 0), 0);
    return { outstanding };
  }

  static async getPendingDiscounts() {
    const rows = await BillingRepository.findPendingDiscounts();
    return rows.map(BillingRepository.mapInvoice);
  }

  static async getRevenueStats() {
    const payments = await BillingRepository.findPayments();
    const invoices = await BillingRepository.findInvoices();
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let today = 0; let month = 0; let allTime = 0;
    payments.forEach((p) => {
      const amt = parseFloat(p.amount) || 0;
      allTime += amt;
      const date = p.created_at ? new Date(p.created_at) : null;
      if (date && date >= startOfToday) today += amt;
      if (date && date >= startOfMonth) month += amt;
    });

    const outstanding = invoices
      .filter((i) => !['paid', 'cancelled'].includes(i.status))
      .reduce((s, i) => s + (parseFloat(i.balance) || 0), 0);

    return { today, month, allTime, outstanding, paymentCount: payments.length };
  }

  static async getEodCashReport(dateStr) {
    const date = (dateStr || new Date().toISOString()).slice(0, 10);
    const start = `${date}T00:00:00.000Z`;
    const end = `${date}T23:59:59.999Z`;
    const payments = await BillingRepository.findPaymentsInRange(start, end);
    const byMethod = {};
    let grandTotal = 0;
    payments.forEach((p) => {
      const method = (p.method || 'cash').toLowerCase();
      if (!byMethod[method]) byMethod[method] = { count: 0, total: 0 };
      byMethod[method].count += 1;
      byMethod[method].total += parseFloat(p.amount) || 0;
      grandTotal += parseFloat(p.amount) || 0;
    });
    return {
      date,
      totalCount: payments.length,
      grandTotal,
      byMethod,
      payments: payments.map((p) => ({
        id: String(p.id),
        amount: p.amount,
        method: p.method,
        created_at: p.created_at,
        patient_name: p.patient_name,
        invoice_number: p.invoice_number
      }))
    };
  }

  static async getPaymentWithInvoice(paymentId) {
    const payment = await BillingRepository.findPaymentById(paymentId);
    if (!payment) {
      const err = new Error('Payment not found');
      err.statusCode = 404;
      throw err;
    }
    const invoice = await BillingRepository.findInvoiceById(payment.invoice_id);
    return { payment: BillingRepository.mapPayment(payment), invoice: invoice ? BillingRepository.mapInvoice(invoice) : null };
  }
}

module.exports = BillingService;
