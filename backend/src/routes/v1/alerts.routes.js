const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');
const {
  getUnreadAlerts,
  markAlertRead,
  markAllAlertsRead
} = require('../../utils/assignmentAlerts');

const router = express.Router();
router.use(requireAuth);

router.get('/', requireRole('admin', 'receptionist'), async (req, res) => {
  try {
    const alerts = await getUnreadAlerts(parseInt(req.query.limit, 10) || 50);
    res.json({ success: true, data: alerts, count: alerts.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/:id/read', requireRole('admin', 'receptionist'), async (req, res) => {
  try {
    await markAlertRead(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/read-all', requireRole('admin', 'receptionist'), async (req, res) => {
  try {
    await markAllAlertsRead();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
