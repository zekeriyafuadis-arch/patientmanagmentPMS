const { logAudit } = require('../utils/audit');

class AuditController {
  static async logClientAction(req, res) {
    try {
      const { action, entityType, entityId, details } = req.body || {};
      if (!action || typeof action !== 'string') {
        return res.status(400).json({ success: false, error: 'action is required' });
      }
      const allowed = action.startsWith('print.') || action.startsWith('export.') || action.startsWith('clinical.');
      if (!allowed) {
        return res.status(400).json({ success: false, error: 'Invalid audit action' });
      }
      await logAudit({
        action,
        entityType: entityType || '',
        entityId: entityId ? String(entityId) : '',
        user: req.user,
        details: typeof details === 'string' ? details : JSON.stringify(details || {}),
        req
      });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = AuditController;
