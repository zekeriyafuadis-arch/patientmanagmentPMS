const BillingService = require('../services/billing.service');
const { logAudit } = require('../utils/audit');

function handleError(res, err, fallbackStatus = 500) {
  res.status(err.statusCode || fallbackStatus).json({ success: false, error: err.message });
}

class BillingController {
  static async listInvoices(req, res) {
    try {
      const data = await BillingService.listInvoices(req.query.patientId);
      res.json({ success: true, data });
    } catch (err) {
      handleError(res, err);
    }
  }

  static async getInvoice(req, res) {
    try {
      const data = await BillingService.getInvoice(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      handleError(res, err);
    }
  }

  static async getPendingTreatmentItems(req, res) {
    try {
      const data = await BillingService.getPendingTreatmentItems();
      res.json({ success: true, data });
    } catch (err) {
      handleError(res, err);
    }
  }

  static async createInvoiceFromTreatmentPlan(req, res) {
    try {
      const data = await BillingService.createInvoiceFromTreatmentPlan(req.user, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      handleError(res, err, 400);
    }
  }

  static async createInvoice(req, res) {
    try {
      const data = await BillingService.createInvoice(req.user, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      handleError(res, err, 400);
    }
  }

  static async updateInvoice(req, res) {
    try {
      await BillingService.updateInvoice(req.user, req.params.id, req.body);
      res.json({ success: true });
    } catch (err) {
      handleError(res, err);
    }
  }

  static async approveDiscount(req, res) {
    try {
      await BillingService.approveDiscount(req.user, req.params.id, req);
      res.json({ success: true });
    } catch (err) {
      handleError(res, err);
    }
  }

  static async cancelInvoice(req, res) {
    try {
      await BillingService.cancelInvoice(req.params.id);
      res.json({ success: true });
    } catch (err) {
      handleError(res, err);
    }
  }

  static async listPayments(req, res) {
    try {
      const data = await BillingService.listPayments(req.query.invoiceId);
      res.json({ success: true, data });
    } catch (err) {
      handleError(res, err);
    }
  }

  static async createPayment(req, res) {
    try {
      const data = await BillingService.createPayment(req.user, req.body, req);
      res.json({ success: true, data });
    } catch (err) {
      handleError(res, err);
    }
  }

  static async getOutstanding(req, res) {
    try {
      const data = await BillingService.getOutstanding();
      res.json({ success: true, data });
    } catch (err) {
      handleError(res, err);
    }
  }

  static async getPendingDiscounts(req, res) {
    try {
      const data = await BillingService.getPendingDiscounts();
      res.json({ success: true, data });
    } catch (err) {
      handleError(res, err);
    }
  }

  static async getRevenueStats(req, res) {
    try {
      const data = await BillingService.getRevenueStats();
      res.json({ success: true, data });
    } catch (err) {
      handleError(res, err);
    }
  }

  static async getEodCashReport(req, res) {
    try {
      const data = await BillingService.getEodCashReport(req.query.date);
      res.json({ success: true, data });
    } catch (err) {
      handleError(res, err);
    }
  }

  static async downloadEodReportPdf(req, res) {
    try {
      const { streamPdf, generateEodReportPdf } = require('../services/pdfDocuments.service');
      const report = await BillingService.getEodCashReport(req.query.date);
      await logAudit({
        action: 'export.eod_report_pdf',
        entityType: 'billing',
        entityId: report.date,
        user: req.user,
        details: `${report.totalCount} payments`,
        req
      });
      streamPdf(res, `eod-report-${report.date}.pdf`, generateEodReportPdf(report));
    } catch (err) {
      handleError(res, err);
    }
  }

  static async downloadInvoicePdf(req, res) {
    try {
      const { streamPdf, generateInvoicePdf } = require('../services/pdfDocuments.service');
      const invoice = await BillingService.getInvoice(req.params.id);
      const payments = await BillingService.listPayments(req.params.id);
      const filename = `${invoice.invoiceNumber || 'invoice'}.pdf`;
      await logAudit({
        action: 'export.invoice_pdf',
        entityType: 'invoice',
        entityId: req.params.id,
        user: req.user,
        details: invoice.invoiceNumber || filename,
        req
      });
      streamPdf(res, filename, generateInvoicePdf(invoice, payments));
    } catch (err) {
      handleError(res, err);
    }
  }

  static async downloadReceiptPdf(req, res) {
    try {
      const { streamPdf, generateReceiptPdf } = require('../services/pdfDocuments.service');
      const { payment, invoice } = await BillingService.getPaymentWithInvoice(req.params.id);
      await logAudit({
        action: 'export.receipt_pdf',
        entityType: 'payment',
        entityId: req.params.id,
        user: req.user,
        details: invoice?.invoiceNumber || payment.amount,
        req
      });
      streamPdf(res, `receipt-${payment.id}.pdf`, generateReceiptPdf(payment, invoice));
    } catch (err) {
      handleError(res, err);
    }
  }
}

module.exports = BillingController;
