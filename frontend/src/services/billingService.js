import { apiGet, apiPost, apiPut } from './apiClient.js';

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' }
];

export const INVOICE_STATUSES = [
  { value: 'draft', label: 'Draft', className: 'inv-status-draft' },
  { value: 'sent', label: 'Sent', className: 'inv-status-sent' },
  { value: 'partial', label: 'Partial', className: 'inv-status-partial' },
  { value: 'paid', label: 'Paid', className: 'inv-status-paid' },
  { value: 'cancelled', label: 'Cancelled', className: 'inv-status-cancelled' },
  { value: 'pending_discount', label: 'Discount Pending', className: 'inv-status-pending' }
];

function calcLineTotal(item) {
  const qty = parseInt(item.quantity, 10) || 1;
  const price = parseFloat(item.unitPrice) || 0;
  const discount = parseFloat(item.discount) || 0;
  return Math.max(0, qty * price - discount);
}

export function normalizeInvoice(data) {
  return { ...data, id: String(data.id) };
}

export function getInvoiceStatusMeta(status) {
  return INVOICE_STATUSES.find((s) => s.value === status) || INVOICE_STATUSES[1];
}

export const billingService = {
  async getAllInvoices() {
    const res = await apiGet('/billing/invoices');
    return res.data;
  },

  async getInvoiceById(id) {
    const res = await apiGet(`/billing/invoices/${id}`);
    return res.data;
  },

  async getInvoicesByPatient(patientId) {
    const res = await apiGet(`/billing/invoices?patientId=${encodeURIComponent(patientId)}`);
    return res.data;
  },

  async createInvoice(payload) {
    const res = await apiPost('/billing/invoices', payload);
    return res.data;
  },

  async createFromTreatmentPlan(patient, plan) {
    const res = await apiPost('/billing/invoices/from-treatment-plan', {
      planId: plan.id,
      patientId: patient.id || plan.patientId
    });
    return res.data;
  },

  async getPendingTreatmentItems() {
    const res = await apiGet('/billing/pending-treatment-items');
    return res.data;
  },

  async updateInvoice(id, data) {
    await apiPut(`/billing/invoices/${id}`, data);
  },

  async cancelInvoice(id) {
    await apiPost(`/billing/invoices/${id}/cancel`, {});
  },

  async getPaymentsByInvoice(invoiceId) {
    const res = await apiGet(`/billing/payments?invoiceId=${invoiceId}`);
    return res.data;
  },

  async getAllPayments() {
    const res = await apiGet('/billing/payments');
    return res.data;
  },

  async addPayment(invoiceId, { amount, method, reference, notes }) {
    const res = await apiPost('/billing/payments', { invoiceId, amount, method, reference, notes });
    return res.data;
  },

  async getRevenueStats() {
    const res = await apiGet('/billing/revenue-stats');
    return res.data;
  },

  async getOutstanding() {
    const res = await apiGet('/billing/outstanding');
    return res.data;
  },

  async getPendingDiscounts() {
    const res = await apiGet('/billing/pending-discounts');
    return res.data;
  },

  async approveDiscount(invoiceId) {
    await apiPost(`/billing/invoices/${invoiceId}/approve-discount`, {});
  }
};
