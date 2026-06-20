const AdminService = require('../services/admin.service');

class AdminController {
  static health(req, res) {
    res.json(AdminService.health());
  }

  static async audit(req, res) {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
      const data = await AdminService.getAuditLog(limit);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async backup(req, res) {
    try {
      const data = await AdminService.createBackup(req.user, req);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async listBackups(req, res) {
    try {
      const data = await AdminService.listBackups();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async restore(req, res) {
    try {
      const data = await AdminService.restoreBackup(req.body.name, req.user, req);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.status || 500).json({ success: false, error: err.message });
    }
  }

  static async exportJson(req, res) {
    try {
      const payload = await AdminService.exportFullJson(req.user, req);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="dramin_clinic_export_${new Date().toISOString().slice(0, 10)}.json"`);
      res.send(JSON.stringify(payload, null, 2));
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async exportPatientsCsv(req, res) {
    try {
      const csv = await AdminService.exportPatientsCsv(req.user, req);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="patients_${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(csv);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async info(req, res) {
    try {
      const data = await AdminService.getSystemInfo();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async seedDemo(req, res) {
    try {
      const data = await AdminService.seedDemo(req.user, req);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        error: err.message,
        code: err.code
      });
    }
  }
}

module.exports = AdminController;
