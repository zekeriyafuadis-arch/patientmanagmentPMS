const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { requireClinicalAccess } = require('../../middleware/clinicalAccess');
const ClinicalController = require('../../controllers/clinical.controller');
const { canViewClinicalRecords } = require('../../utils/permissions');
const { canAccessClinical } = require('../../utils/clinicalAccess');
const { logAudit } = require('../../utils/audit');

const router = express.Router();
router.use(requireAuth);

function requireClinicalViewer(getPatientId) {
  return async (req, res, next) => {
    try {
      const patientId = getPatientId(req);
      if (!patientId) {
        return res.status(400).json({ success: false, error: 'Patient ID required' });
      }
      if (!canViewClinicalRecords(req.user)) {
        return res.status(403).json({ success: false, error: 'Insufficient permissions' });
      }
      if (req.user.role === 'admin') {
        await logAudit({
          action: 'clinical.admin_view',
          entityType: 'patient',
          entityId: String(patientId),
          user: req.user,
          details: req.path,
          req
        });
        return next();
      }
      await logAudit({
        action: 'clinical.view',
        entityType: 'patient',
        entityId: String(patientId),
        user: req.user,
        details: req.path,
        req
      });
      const allowed = await canAccessClinical(req.user, patientId);
      if (!allowed) {
        return res.status(403).json({
          success: false,
          error: 'Only the assigned doctor (after confirmation) can access clinical records for this patient'
        });
      }
      next();
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
}

router.get('/charts/:patientId', requireRole('admin', 'dentist'), requireClinicalViewer((req) => req.params.patientId), ClinicalController.listCharts);
router.post('/charts', requireRole('dentist'), requireClinicalAccess((req) => req.body.patientId), ClinicalController.createChart);
router.get('/plans/:patientId', requireRole('admin', 'dentist'), requireClinicalViewer((req) => req.params.patientId), ClinicalController.listPlans);
router.post('/plans', requireRole('dentist'), requireClinicalAccess((req) => req.body.patientId), ClinicalController.createPlan);
router.get('/plans/single/:id', requireRole('admin', 'dentist'), ClinicalController.getPlan);
router.put('/plans/:id', requireRole('admin', 'dentist'), ClinicalController.updatePlan);
router.get('/notes/:patientId', requireRole('admin', 'dentist'), requireClinicalViewer((req) => req.params.patientId), ClinicalController.listNotes);
router.post('/notes', requireRole('dentist'), requireClinicalAccess((req) => req.body.patientId), ClinicalController.createNote);
router.get('/chart-diff/:patientId', requireRole('admin', 'dentist'), requireClinicalViewer((req) => req.params.patientId), ClinicalController.getChartDiff);
router.get('/perio/:patientId', requireRole('admin', 'dentist'), requireClinicalViewer((req) => req.params.patientId), ClinicalController.listPerioCharts);
router.post('/perio', requireRole('dentist'), requireClinicalAccess((req) => req.body.patientId), ClinicalController.createPerioChart);
router.get('/documents/:patientId', requireRole('admin', 'dentist'), requireClinicalViewer((req) => req.params.patientId), ClinicalController.listDocuments);
router.post('/documents', requireRole('dentist'), requireClinicalAccess((req) => req.body.patientId), ClinicalController.createDocument);
router.get('/letter-templates', requireRole('admin', 'dentist', 'receptionist'), ClinicalController.listLetterTemplates);
router.get('/documents/pdf/:id', requireRole('admin', 'dentist', 'receptionist'), ClinicalController.downloadDocumentPdf);
router.get('/treatment-summary', requireRole('admin', 'receptionist'), ClinicalController.treatmentSummary);

module.exports = router;
