const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const AuditController = require('../../controllers/audit.controller');

const router = express.Router();
router.use(requireAuth);
router.post('/client-action', AuditController.logClientAction);

module.exports = router;
