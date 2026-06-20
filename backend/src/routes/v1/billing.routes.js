const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { invoiceCreateSchema, paymentCreateSchema } = require('../../validators/schemas');
const { canAccessBilling } = require('../../utils/permissions');
const BillingController = require('../../controllers/billing.controller');

const router = express.Router();
router.use(requireAuth);

function requireBillingAccess(req, res, next) {
  if (!canAccessBilling(req.user)) {
    return res.status(403).json({ success: false, error: 'Insufficient permissions' });
  }
  next();
}

router.get('/invoices', requireBillingAccess, BillingController.listInvoices);
router.get('/invoices/:id/pdf', requireBillingAccess, BillingController.downloadInvoicePdf);
router.get('/invoices/:id', requireBillingAccess, BillingController.getInvoice);
router.get('/pending-treatment-items', requireBillingAccess, BillingController.getPendingTreatmentItems);
router.post('/invoices/from-treatment-plan', requireRole('admin', 'receptionist'), BillingController.createInvoiceFromTreatmentPlan);
router.post('/invoices', requireRole('admin', 'receptionist'), validate(invoiceCreateSchema), BillingController.createInvoice);
router.put('/invoices/:id', requireRole('admin', 'receptionist'), BillingController.updateInvoice);
router.post('/invoices/:id/approve-discount', requireRole('admin'), BillingController.approveDiscount);
router.post('/invoices/:id/cancel', requireRole('admin', 'receptionist'), BillingController.cancelInvoice);
router.get('/payments', requireBillingAccess, BillingController.listPayments);
router.post('/payments', requireRole('admin', 'receptionist'), validate(paymentCreateSchema), BillingController.createPayment);
router.get('/outstanding', requireBillingAccess, BillingController.getOutstanding);
router.get('/pending-discounts', requireRole('admin'), BillingController.getPendingDiscounts);
router.get('/revenue-stats', requireRole('admin'), BillingController.getRevenueStats);
router.get('/eod-report', requireBillingAccess, BillingController.getEodCashReport);
router.get('/eod-report/pdf', requireBillingAccess, BillingController.downloadEodReportPdf);
router.get('/payments/:id/receipt.pdf', requireBillingAccess, BillingController.downloadReceiptPdf);

module.exports = router;
