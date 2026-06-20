const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');
const AdminController = require('../../controllers/admin.controller');

const router = express.Router();

router.get('/health', AdminController.health);
router.use(requireAuth);
router.get('/audit', requireRole('admin'), AdminController.audit);
router.post('/backup', requireRole('admin'), AdminController.backup);
router.get('/backups', requireRole('admin'), AdminController.listBackups);
router.post('/restore', requireRole('admin'), AdminController.restore);
router.get('/export/json', requireRole('admin'), AdminController.exportJson);
router.get('/export/patients.csv', requireRole('admin'), AdminController.exportPatientsCsv);
router.get('/info', requireRole('admin'), AdminController.info);
router.post('/seed-demo', requireRole('admin'), AdminController.seedDemo);

module.exports = router;
