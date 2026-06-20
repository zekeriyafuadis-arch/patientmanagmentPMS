const StaffService = require('../services/staff.service');

class StaffController {
  static async list(req, res) {
    try {
      const data = await StaffService.listAll();
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.status || 500).json({ success: false, error: err.message });
    }
  }

  static async getSchedule(req, res) {
    try {
      const data = await StaffService.getSchedule(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.status || 500).json({ success: false, error: err.message });
    }
  }

  static async updateSchedule(req, res) {
    try {
      const data = await StaffService.updateSchedule(req.params.id, req.body.schedule || {}, req.user?.id);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.status || 400).json({ success: false, error: err.message });
    }
  }

  static async create(req, res) {
    try {
      const data = await StaffService.create(req.body, req.user, req);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(err.status || 400).json({ success: false, error: err.message });
    }
  }

  static async updateRole(req, res) {
    try {
      await StaffService.updateRole(req.params.id, req.body, req.user?.id);
      res.json({ success: true });
    } catch (err) {
      res.status(err.status || 500).json({ success: false, error: err.message });
    }
  }

  static async setActive(req, res) {
    try {
      await StaffService.setActive(req.params.id, req.body.active, req.user, req);
      res.json({ success: true });
    } catch (err) {
      res.status(err.status || 500).json({ success: false, error: err.message });
    }
  }

  static async resetPassword(req, res) {
    try {
      await StaffService.resetPassword(req.params.id, req.body.newPassword, req.user, req);
      res.json({ success: true });
    } catch (err) {
      res.status(err.status || 400).json({ success: false, error: err.message });
    }
  }
}

module.exports = StaffController;
