import {
  billingService,
  PAYMENT_METHODS,
  getInvoiceStatusMeta
} from '../../services/billingService.js';
import { patientService } from '../../services/patientService.js';
import { procedureService } from '../../services/procedureService.js';
import { printReceipt } from '../../services/exportService.js';
import { getCurrentRole, canAccessBilling, canApplyDiscountDirectly, canRequestDiscount, canViewRevenue } from '../../services/authService.js';

export class Billing {
  constructor() {
    this.invoices = [];
    this.patients = [];
    this.procedures = [];
    this.pendingTreatment = [];
    this.filterStatus = 'all';
    this.selectedInvoice = null;
    this.canEdit = canAccessBilling(getCurrentRole());
    this.canApproveDiscount = canApplyDiscountDirectly(getCurrentRole());
    this.canRequestDiscount = canRequestDiscount(getCurrentRole());
    this.lineItems = [];
  }

  async render() {
    return `
      <div class="billing-container" data-testid="billing-page">
        <div class="billing-header">
          <div>
            <h1><i class="fas fa-file-invoice-dollar"></i> Billing</h1>
            <p>Invoices, payments, and receipts</p>
          </div>
          ${this.canEdit ? `
            <button class="btn-primary" id="newInvoiceBtn" data-testid="new-invoice-btn">
              <i class="fas fa-plus"></i> New Invoice
            </button>
          ` : ''}
        </div>

        <div class="billing-stats" id="billingStatsRow"></div>

        <div class="pending-treatment-panel" id="pendingTreatmentPanel" style="display:none;">
          <div class="pending-treatment-header">
            <h3><i class="fas fa-link"></i> Procedures from Treatment Plans</h3>
            <span class="pending-count" id="pendingTreatmentCount">0 awaiting invoice</span>
          </div>
          <div id="pendingTreatmentList"></div>
        </div>

        <div class="billing-toolbar">
          <select id="invoiceFilterStatus" class="filter-select">
            <option value="all">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="pending_discount">Discount Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input type="text" id="invoiceSearch" placeholder="Search patient, MRN, invoice #..." class="billing-search">
        </div>

        <div class="billing-layout">
          <div class="invoice-list-panel" id="invoiceListPanel">
            <div class="loading-state"><div class="loading-spinner"></div><p>Loading invoices...</p></div>
          </div>
          <div class="invoice-detail-panel" id="invoiceDetailPanel">
            <div class="empty-state-small">
              <i class="fas fa-file-invoice"></i>
              <p>Select an invoice to view details</p>
            </div>
          </div>
        </div>
      </div>

      <div id="invoiceModal" class="modal-overlay" style="display:none;">
        <div class="appointment-modal invoice-modal-wide">
          <div class="modal-header">
            <h3><i class="fas fa-file-invoice"></i> New Invoice</h3>
            <button class="modal-close" id="closeInvoiceModal">&times;</button>
          </div>
          <form id="invoiceForm" class="appointment-form">
            <div class="form-grid-2">
              <div class="form-field full-width">
                <label>Patient *</label>
                <select id="invPatientId" required><option value="">Select patient...</option></select>
              </div>
              <div class="form-field">
                <label>Invoice Discount</label>
                <input type="number" id="invDiscount" min="0" step="0.01" value="0">
                ${this.canRequestDiscount ? `
                  <p class="field-hint">Discounts you enter require admin approval before payments can be recorded.</p>
                ` : ''}
                ${this.canApproveDiscount ? `
                  <p class="field-hint">Discounts you enter are applied immediately.</p>
                ` : ''}
              </div>
              <div class="form-field full-width">
                <label>Notes</label>
                <textarea id="invNotes" rows="2"></textarea>
              </div>
            </div>
            <h4 class="line-items-title">Line Items</h4>
            <div id="lineItemsContainer"></div>
            <button type="button" class="btn-secondary btn-sm" id="addLineItemBtn"><i class="fas fa-plus"></i> Add Line</button>
            <div class="invoice-preview-total" id="invoicePreviewTotal">Total: 0.00</div>
            <div id="invoiceFormError" class="login-error" style="display:none;"></div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" id="cancelInvoiceModalBtn">Cancel</button>
              <button type="submit" class="btn-primary"><i class="fas fa-save"></i> Create Invoice</button>
            </div>
          </form>
        </div>
      </div>

      <div id="paymentModal" class="modal-overlay" style="display:none;">
        <div class="appointment-modal">
          <div class="modal-header">
            <h3><i class="fas fa-money-bill-wave"></i> Record Payment</h3>
            <button class="modal-close" id="closePaymentModal">&times;</button>
          </div>
          <form id="paymentForm" class="appointment-form">
            <input type="hidden" id="paymentInvoiceId">
            <div class="form-grid-2">
              <div class="form-field">
                <label>Amount *</label>
                <input type="number" id="paymentAmount" required min="0.01" step="0.01">
              </div>
              <div class="form-field">
                <label>Method *</label>
                <select id="paymentMethod" required>
                  ${PAYMENT_METHODS.map((m) => `<option value="${m.value}">${m.label}</option>`).join('')}
                </select>
              </div>
              <div class="form-field full-width">
                <label>Reference #</label>
                <input type="text" id="paymentReference" placeholder="Transaction ref (optional)">
              </div>
              <div class="form-field full-width">
                <label>Notes</label>
                <textarea id="paymentNotes" rows="2"></textarea>
              </div>
            </div>
            <div id="paymentFormError" class="login-error" style="display:none;"></div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" id="cancelPaymentBtn">Cancel</button>
              <button type="submit" class="btn-primary"><i class="fas fa-check"></i> Record Payment</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  async init() {
    await this.loadData();
    this.bindToolbar();
    this.checkPrefillPatient();
    this.checkDeepLinkInvoice();
  }

  async loadData() {
    const [invoices, patientsRes, procedures, pendingTreatment] = await Promise.all([
      billingService.getAllInvoices(),
      patientService.fetchAll(),
      procedureService.getActive(),
      billingService.getPendingTreatmentItems().catch(() => [])
    ]);
    this.invoices = invoices;
    this.patients = patientsRes.data || [];
    this.procedures = procedures;
    this.pendingTreatment = pendingTreatment;
    await this.renderStats();
    this.renderPendingTreatment();
    this.renderInvoiceList();
  }

  async renderStats() {
    const el = document.getElementById('billingStatsRow');
    if (!el) return;

    if (canViewRevenue(getCurrentRole())) {
      const stats = await billingService.getRevenueStats();
      const eod = await billingService.getEodReport().catch(() => null);
      el.innerHTML = `
        <div class="billing-stat-card"><span>Today</span><strong>${stats.today.toFixed(2)}</strong></div>
        <div class="billing-stat-card"><span>This Month</span><strong>${stats.month.toFixed(2)}</strong></div>
        <div class="billing-stat-card"><span>Outstanding</span><strong>${stats.outstanding.toFixed(2)}</strong></div>
        <div class="billing-stat-card"><span>All Time</span><strong>${stats.allTime.toFixed(2)}</strong></div>
        ${eod ? `
          <div class="billing-stat-card billing-eod-card">
            <span>End-of-Day (${eod.totalCount} payments)</span>
            <strong>${eod.grandTotal.toFixed(2)}</strong>
            <button type="button" class="btn-secondary btn-sm" id="downloadEodPdfBtn">PDF</button>
          </div>
        ` : ''}
      `;
      document.getElementById('downloadEodPdfBtn')?.addEventListener('click', () => billingService.downloadEodReportPdf());
      return;
    }

    if (this.canEdit) {
      const eod = await billingService.getEodReport().catch(() => null);
      const out = await billingService.getOutstanding().catch(() => ({ outstanding: 0 }));
      const open = this.invoices.filter((i) => !['paid', 'cancelled'].includes(i.status)).length;
      const pendingDiscount = this.invoices.filter((i) => i.status === 'pending_discount').length;
      el.innerHTML = `
        <div class="billing-stat-card"><span>Outstanding</span><strong>${(out.outstanding || 0).toFixed(2)}</strong></div>
        <div class="billing-stat-card"><span>Open Invoices</span><strong>${open}</strong></div>
        <div class="billing-stat-card"><span>Pending Discounts</span><strong>${pendingDiscount}</strong></div>
        <div class="billing-stat-card"><span>Total Invoices</span><strong>${this.invoices.length}</strong></div>
        ${eod ? `
          <div class="billing-stat-card billing-eod-card">
            <span>Today EOD (${eod.totalCount})</span>
            <strong>${eod.grandTotal.toFixed(2)}</strong>
            <button type="button" class="btn-secondary btn-sm" id="downloadEodPdfBtn">PDF</button>
          </div>
        ` : ''}
      `;
      document.getElementById('downloadEodPdfBtn')?.addEventListener('click', () => billingService.downloadEodReportPdf());
      return;
    }

    const out = await billingService.getOutstanding().catch(() => ({ outstanding: 0 }));
    const open = this.invoices.filter((i) => !['paid', 'cancelled'].includes(i.status)).length;
    const pendingDiscount = this.invoices.filter((i) => i.status === 'pending_discount').length;
    el.innerHTML = `
      <div class="billing-stat-card"><span>Outstanding</span><strong>${(out.outstanding || 0).toFixed(2)}</strong></div>
      <div class="billing-stat-card"><span>Open Invoices</span><strong>${open}</strong></div>
      <div class="billing-stat-card"><span>Pending Discounts</span><strong>${pendingDiscount}</strong></div>
      <div class="billing-stat-card"><span>Total Invoices</span><strong>${this.invoices.length}</strong></div>
    `;
  }

  checkDeepLinkInvoice() {
    const id = sessionStorage.getItem('billingInvoiceId');
    if (!id) return;
    sessionStorage.removeItem('billingInvoiceId');
    this.selectInvoice(id);
  }

  renderPendingTreatment() {
    const panel = document.getElementById('pendingTreatmentPanel');
    const list = document.getElementById('pendingTreatmentList');
    const countEl = document.getElementById('pendingTreatmentCount');
    if (!panel || !list) return;

    if (this.pendingTreatment.length === 0) {
      panel.style.display = 'none';
      return;
    }

    panel.style.display = 'block';
    if (countEl) countEl.textContent = `${this.pendingTreatment.length} awaiting invoice`;

    const grouped = {};
    this.pendingTreatment.forEach((item) => {
      const key = `${item.patientId}:${item.planId}`;
      if (!grouped[key]) {
        grouped[key] = {
          patientId: item.patientId,
          patientName: item.patientName,
          patientMrn: item.patientMrn,
          planId: item.planId,
          planTitle: item.planTitle,
          items: []
        };
      }
      grouped[key].items.push(item);
    });

    list.innerHTML = Object.values(grouped).map((group) => {
      const total = group.items.reduce((s, i) => s + (i.price || 0), 0);
      return `
        <div class="pending-treatment-card">
          <div class="pending-treatment-info">
            <strong>${this.esc(group.patientName)}</strong>
            <span>${group.patientMrn} · ${this.esc(group.planTitle)}</span>
            <ul class="pending-procedure-list">
              ${group.items.map((i) => `
                <li>${this.esc(i.procedureName)}${i.toothNumber ? ` (Tooth ${i.toothNumber})` : ''} — ${i.price.toFixed(2)}</li>
              `).join('')}
            </ul>
            <span class="pending-total">Total: ${total.toFixed(2)}</span>
          </div>
          ${this.canEdit ? `
            <button type="button" class="btn-primary btn-sm create-plan-invoice-btn"
              data-plan-id="${group.planId}" data-patient-id="${group.patientId}">
              <i class="fas fa-file-invoice-dollar"></i> Create Invoice
            </button>
          ` : ''}
        </div>
      `;
    }).join('');

    list.querySelectorAll('.create-plan-invoice-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.invoiceFromTreatmentPlan(
        btn.dataset.patientId,
        btn.dataset.planId,
        btn
      ));
    });
  }

  async invoiceFromTreatmentPlan(patientId, planId, btn) {
    const patient = this.patients.find((p) => String(p.id) === String(patientId));
    if (!patient) {
      if (window.Toast) window.Toast.error('Patient not found');
      return;
    }
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating…';
    }
    try {
      const result = await billingService.createFromTreatmentPlan(patient, { id: planId, patientId });
      await this.loadData();
      await this.selectInvoice(result.id);
      if (window.Toast) window.Toast.success('Invoice created from treatment plan');
    } catch (err) {
      if (window.Toast) window.Toast.error(err.message || 'Failed to create invoice');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-file-invoice-dollar"></i> Create Invoice';
      }
    }
  }

  getFilteredInvoices() {
    const search = (document.getElementById('invoiceSearch')?.value || '').toLowerCase();
    return this.invoices.filter((inv) => {
      if (this.filterStatus !== 'all' && inv.status !== this.filterStatus) return false;
      if (!search) return true;
      return (
        inv.patientName.toLowerCase().includes(search) ||
        inv.patientMrn.toLowerCase().includes(search) ||
        inv.invoiceNumber.toLowerCase().includes(search)
      );
    });
  }

  renderInvoiceList() {
    const panel = document.getElementById('invoiceListPanel');
    if (!panel) return;
    const list = this.getFilteredInvoices();

    if (list.length === 0) {
      panel.innerHTML = '<div class="empty-state-small"><p>No invoices found</p></div>';
      return;
    }

    panel.innerHTML = list.map((inv) => {
      const st = getInvoiceStatusMeta(inv.status);
      const active = this.selectedInvoice?.id === inv.id ? 'active' : '';
      return `
        <div class="invoice-list-item ${active}" data-id="${inv.id}">
          <div class="inv-item-top">
            <strong>${this.esc(inv.invoiceNumber)}</strong>
            <span class="status-badge ${st.className}">${st.label}</span>
          </div>
          <div class="inv-item-patient">${this.esc(inv.patientName)}</div>
          <div class="inv-item-bottom">
            <span>${parseFloat(inv.total).toFixed(2)}</span>
            <span class="${inv.balance > 0 ? 'text-warning' : 'text-success'}">
              ${inv.balance > 0 ? `Due: ${parseFloat(inv.balance).toFixed(2)}` : 'Paid'}
            </span>
          </div>
        </div>
      `;
    }).join('');

    panel.querySelectorAll('.invoice-list-item').forEach((item) => {
      item.addEventListener('click', () => this.selectInvoice(item.dataset.id));
    });
  }

  async selectInvoice(id) {
    this.selectedInvoice = await billingService.getInvoiceById(id);
    this.renderInvoiceList();
    await this.renderInvoiceDetail();
  }

  async renderInvoiceDetail() {
    const panel = document.getElementById('invoiceDetailPanel');
    if (!panel || !this.selectedInvoice) return;

    const inv = this.selectedInvoice;
    const payments = await billingService.getPaymentsByInvoice(inv.id);
    const st = getInvoiceStatusMeta(inv.status);
    const discountPending = inv.discountStatus === 'pending' || inv.status === 'pending_discount';

    panel.innerHTML = `
      <div class="invoice-detail">
        <div class="inv-detail-header">
          <div>
            <h2>${this.esc(inv.invoiceNumber)}</h2>
            <p>${this.esc(inv.patientName)} · ${inv.patientMrn}</p>
          </div>
          <span class="status-badge large ${st.className}">${st.label}</span>
        </div>
        ${discountPending ? `
          <div class="inv-discount-pending-banner">
            <i class="fas fa-hourglass-half"></i>
            <span>Discount of <strong>${parseFloat(inv.discount).toFixed(2)}</strong> awaiting admin approval before payments can be recorded.</span>
            ${this.canApproveDiscount ? `
              <button class="btn-primary btn-sm" id="approveDiscountBtn"><i class="fas fa-check"></i> Approve Discount</button>
            ` : ''}
          </div>
        ` : ''}
        ${inv.treatmentPlanId ? `<p class="inv-plan-link"><i class="fas fa-link"></i> Created from treatment plan</p>` : ''}
        <table class="treatment-table">
          <thead><tr><th>Description</th><th>Tooth</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
          <tbody>
            ${(inv.items || []).map((i) => `
              <tr>
                <td>${this.esc(i.procedureName)}<br><small>${i.procedureCode || ''}</small></td>
                <td>${i.toothNumber || '—'}</td>
                <td>${i.quantity || 1}</td>
                <td>${parseFloat(i.unitPrice).toFixed(2)}</td>
                <td>${parseFloat(i.lineTotal).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="inv-totals">
          <div>Subtotal: <strong>${parseFloat(inv.subtotal).toFixed(2)}</strong></div>
          ${inv.discount > 0 ? `<div>Discount: <strong>-${parseFloat(inv.discount).toFixed(2)}</strong></div>` : ''}
          <div class="inv-total-line">Total: <strong>${parseFloat(inv.total).toFixed(2)}</strong></div>
          <div>Paid: <strong>${parseFloat(inv.amountPaid).toFixed(2)}</strong></div>
          <div>Balance: <strong class="${inv.balance > 0 ? 'text-warning' : 'text-success'}">${parseFloat(inv.balance).toFixed(2)}</strong></div>
        </div>
        ${payments.length > 0 ? `
          <h4>Payments</h4>
          <table class="treatment-table">
            <thead><tr><th>Date</th><th>Method</th><th>Amount</th><th>By</th><th></th></tr></thead>
            <tbody>
              ${payments.map((p) => `
                <tr>
                  <td>${p.created_at ? new Date(p.created_at).toLocaleString() : ''}</td>
                  <td>${p.method}</td>
                  <td>${parseFloat(p.amount).toFixed(2)}</td>
                  <td>${this.esc(p.receivedByName || '')}</td>
                  <td><button type="button" class="btn-secondary btn-sm receipt-pdf-btn" data-id="${p.id}">PDF</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
        <div class="inv-detail-actions">
          <button class="btn-secondary" id="printReceiptBtn"><i class="fas fa-print"></i> Print Receipt</button>
          <button class="btn-secondary" id="downloadInvoicePdfBtn"><i class="fas fa-file-pdf"></i> Invoice PDF</button>
          ${this.canEdit && inv.balance > 0 && inv.status !== 'cancelled' && !discountPending ? `
            <button class="btn-primary" id="recordPaymentBtn"><i class="fas fa-money-bill"></i> Record Payment</button>
          ` : ''}
          ${this.canEdit && inv.status !== 'cancelled' && inv.amountPaid === 0 ? `
            <button class="btn-danger btn-sm" id="cancelInvoiceBtn"><i class="fas fa-ban"></i> Cancel</button>
          ` : ''}
        </div>
      </div>
    `;

    document.getElementById('printReceiptBtn')?.addEventListener('click', () => {
      printReceipt(inv, payments);
    });
    document.getElementById('downloadInvoicePdfBtn')?.addEventListener('click', async () => {
      try {
        await billingService.downloadInvoicePdf(inv.id, `${inv.invoiceNumber || inv.id}.pdf`);
      } catch (err) {
        if (window.Toast) window.Toast.error(err.message || 'PDF download failed');
      }
    });
    document.querySelectorAll('.receipt-pdf-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await billingService.downloadReceiptPdf(btn.dataset.id);
        } catch (err) {
          if (window.Toast) window.Toast.error(err.message || 'Receipt PDF failed');
        }
      });
    });
    document.getElementById('approveDiscountBtn')?.addEventListener('click', async () => {
      const btn = document.getElementById('approveDiscountBtn');
      if (btn) btn.disabled = true;
      try {
        await billingService.approveDiscount(inv.id);
        if (window.Toast) window.Toast.success('Discount approved');
        await this.loadData();
        await this.selectInvoice(inv.id);
      } catch (err) {
        if (window.Toast) window.Toast.error(err.message || 'Approval failed');
        if (btn) btn.disabled = false;
      }
    });
    document.getElementById('recordPaymentBtn')?.addEventListener('click', () => this.openPaymentModal(inv));
    document.getElementById('cancelInvoiceBtn')?.addEventListener('click', async () => {
      if (confirm('Cancel this invoice?')) {
        await billingService.cancelInvoice(inv.id);
        await this.loadData();
        this.selectedInvoice = null;
        document.getElementById('invoiceDetailPanel').innerHTML = '<div class="empty-state-small"><p>Invoice cancelled</p></div>';
      }
    });
  }

  bindToolbar() {
    document.getElementById('newInvoiceBtn')?.addEventListener('click', () => this.openInvoiceModal());
    document.getElementById('invoiceFilterStatus')?.addEventListener('change', (e) => {
      this.filterStatus = e.target.value;
      this.renderInvoiceList();
    });
    document.getElementById('invoiceSearch')?.addEventListener('input', () => this.renderInvoiceList());
    document.getElementById('closeInvoiceModal')?.addEventListener('click', () => this.closeInvoiceModal());
    document.getElementById('cancelInvoiceModalBtn')?.addEventListener('click', () => this.closeInvoiceModal());
    document.getElementById('invoiceForm')?.addEventListener('submit', (e) => this.saveInvoice(e));
    document.getElementById('invDiscount')?.addEventListener('input', () => this.updatePreviewTotal());
    document.getElementById('addLineItemBtn')?.addEventListener('click', () => this.addLineItemRow());
    document.getElementById('closePaymentModal')?.addEventListener('click', () => this.closePaymentModal());
    document.getElementById('cancelPaymentBtn')?.addEventListener('click', () => this.closePaymentModal());
    document.getElementById('paymentForm')?.addEventListener('submit', (e) => this.savePayment(e));
  }

  openInvoiceModal() {
    this.lineItems = [{ procedureId: '', description: '', toothNumber: '', quantity: 1, unitPrice: 0 }];
    const patientSelect = document.getElementById('invPatientId');
    patientSelect.innerHTML = '<option value="">Select patient...</option>' +
      this.patients.map((p) => `<option value="${p.id}">${this.esc(p.name)} (${p.mrn})</option>`).join('');
    document.getElementById('invoiceForm').reset();
    document.getElementById('invDiscount').value = '0';
    this.renderLineItems();
    document.getElementById('invoiceModal').style.display = 'flex';
  }

  closeInvoiceModal() {
    document.getElementById('invoiceModal').style.display = 'none';
  }

  renderLineItems() {
    const container = document.getElementById('lineItemsContainer');
    if (!container) return;
    container.innerHTML = this.lineItems.map((item, idx) => `
      <div class="line-item-row" data-idx="${idx}">
        <select class="line-procedure" data-idx="${idx}">
          <option value="">Custom / select...</option>
          ${this.procedures.map((p) => `
            <option value="${p.id}" data-name="${this.esc(p.name)}" data-code="${p.code}" data-price="${p.defaultPrice}"
              ${item.procedureId === p.id ? 'selected' : ''}>${p.code} - ${this.esc(p.name)}</option>
          `).join('')}
        </select>
        <input type="text" class="line-desc" data-idx="${idx}" placeholder="Description" value="${this.esc(item.description)}">
        <input type="number" class="line-tooth" data-idx="${idx}" placeholder="Tooth" value="${item.toothNumber || ''}">
        <input type="number" class="line-qty" data-idx="${idx}" min="1" value="${item.quantity || 1}">
        <input type="number" class="line-price" data-idx="${idx}" min="0" step="0.01" value="${item.unitPrice || 0}">
        <button type="button" class="btn-icon-sm remove-line" data-idx="${idx}"><i class="fas fa-times"></i></button>
      </div>
    `).join('');

    container.querySelectorAll('.line-procedure').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const opt = e.target.selectedOptions[0];
        if (opt?.dataset.price) {
          this.lineItems[idx].procedureId = opt.value;
          this.lineItems[idx].description = opt.dataset.name || '';
          this.lineItems[idx].procedureCode = opt.dataset.code || '';
          this.lineItems[idx].unitPrice = parseFloat(opt.dataset.price) || 0;
          this.renderLineItems();
          this.updatePreviewTotal();
        }
      });
    });
    container.querySelectorAll('.line-desc, .line-tooth, .line-qty, .line-price').forEach((input) => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const field = e.target.classList.contains('line-desc') ? 'description'
          : e.target.classList.contains('line-tooth') ? 'toothNumber'
          : e.target.classList.contains('line-qty') ? 'quantity' : 'unitPrice';
        this.lineItems[idx][field] = field === 'quantity' || field === 'unitPrice'
          ? parseFloat(e.target.value) || 0 : e.target.value;
        this.updatePreviewTotal();
      });
    });
    container.querySelectorAll('.remove-line').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        this.lineItems.splice(idx, 1);
        if (this.lineItems.length === 0) this.lineItems.push({ description: '', quantity: 1, unitPrice: 0 });
        this.renderLineItems();
        this.updatePreviewTotal();
      });
    });
    this.updatePreviewTotal();
  }

  addLineItemRow() {
    this.lineItems.push({ description: '', quantity: 1, unitPrice: 0 });
    this.renderLineItems();
  }

  updatePreviewTotal() {
    const discount = parseFloat(document.getElementById('invDiscount')?.value) || 0;
    const subtotal = this.lineItems.reduce((s, i) => s + (i.quantity || 1) * (i.unitPrice || 0), 0);
    const total = Math.max(0, subtotal - discount);
    const el = document.getElementById('invoicePreviewTotal');
    if (el) el.textContent = `Total: ${total.toFixed(2)}`;
  }

  async saveInvoice(e) {
    e.preventDefault();
    if (this._savingInvoice) return;

    const errorEl = document.getElementById('invoiceFormError');
    const submitBtn = document.querySelector('#invoiceForm button[type="submit"]');
    errorEl.style.display = 'none';

    const patientId = document.getElementById('invPatientId').value;
    const patient = this.patients.find((p) => String(p.id) === String(patientId));
    if (!patient) {
      errorEl.textContent = 'Select a patient';
      errorEl.style.display = 'block';
      return;
    }

    const items = this.lineItems.filter((i) => i.description || i.procedureId).map((i) => ({
      procedureCode: i.procedureCode || '',
      procedureName: i.description || 'Service',
      toothNumber: i.toothNumber || '',
      quantity: i.quantity || 1,
      unitPrice: i.unitPrice || 0,
      discount: 0
    }));

    if (items.length === 0) {
      errorEl.textContent = 'Add at least one line item';
      errorEl.style.display = 'block';
      return;
    }

    try {
      this._savingInvoice = true;
      if (submitBtn) submitBtn.disabled = true;
      const result = await billingService.createInvoice({
        patientId,
        patientName: patient.name,
        patientMrn: patient.mrn,
        items,
        discount: document.getElementById('invDiscount').value,
        notes: document.getElementById('invNotes').value
      });
      this.closeInvoiceModal();
      await this.loadData();
      await this.selectInvoice(result.id);
      if (window.Toast) window.Toast.success('Invoice created');
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
    } finally {
      this._savingInvoice = false;
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  openPaymentModal(inv) {
    document.getElementById('paymentInvoiceId').value = inv.id;
    document.getElementById('paymentAmount').value = inv.balance.toFixed(2);
    document.getElementById('paymentForm').reset();
    document.getElementById('paymentInvoiceId').value = inv.id;
    document.getElementById('paymentAmount').value = inv.balance.toFixed(2);
    document.getElementById('paymentModal').style.display = 'flex';
  }

  closePaymentModal() {
    document.getElementById('paymentModal').style.display = 'none';
  }

  async savePayment(e) {
    e.preventDefault();
    if (this._savingPayment) return;

    const errorEl = document.getElementById('paymentFormError');
    const submitBtn = document.querySelector('#paymentForm button[type="submit"]');
    errorEl.style.display = 'none';

    try {
      this._savingPayment = true;
      if (submitBtn) submitBtn.disabled = true;
      const invoiceId = document.getElementById('paymentInvoiceId').value;
      await billingService.addPayment(invoiceId, {
        amount: document.getElementById('paymentAmount').value,
        method: document.getElementById('paymentMethod').value,
        reference: document.getElementById('paymentReference').value,
        notes: document.getElementById('paymentNotes').value
      }).then(async (result) => {
        if (result?.id && confirm('Download payment receipt PDF?')) {
          await billingService.downloadReceiptPdf(result.id);
        }
      });
      this.closePaymentModal();
      await this.loadData();
      await this.selectInvoice(invoiceId);
      if (window.Toast) window.Toast.success('Payment recorded');
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
    } finally {
      this._savingPayment = false;
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  checkPrefillPatient() {
    const patientId = sessionStorage.getItem('billingPatientId');
    const openInvoiceId = sessionStorage.getItem('billingOpenInvoiceId');
    const billingPlanId = sessionStorage.getItem('billingPlanId');
    if (openInvoiceId) {
      sessionStorage.removeItem('billingOpenInvoiceId');
      this.selectInvoice(openInvoiceId);
      return;
    }
    if (billingPlanId && patientId && this.canEdit) {
      sessionStorage.removeItem('billingPlanId');
      sessionStorage.removeItem('billingPatientId');
      this.invoiceFromTreatmentPlan(patientId, billingPlanId);
      return;
    }
    if (patientId && this.canEdit) {
      sessionStorage.removeItem('billingPatientId');
      this.openInvoiceModal();
      document.getElementById('invPatientId').value = patientId;
    }
  }

  esc(text) {
    if (!text) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }
}
