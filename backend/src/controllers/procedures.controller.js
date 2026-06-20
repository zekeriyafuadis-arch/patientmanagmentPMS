const ProceduresService = require('../services/procedures.service');

class ProceduresController {
  static async list(req, res) {
    try {
      const data = await ProceduresService.listAll();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async create(req, res) {
    try {
      const data = await ProceduresService.create(req.body, req.user?.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async update(req, res) {
    try {
      await ProceduresService.update(req.params.id, req.body, req.user?.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async remove(req, res) {
    try {
      await ProceduresService.remove(req.params.id, req.user?.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async seedDefaults(req, res) {
    try {
      const data = await ProceduresService.seedDefaults(req.user?.id);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = ProceduresController;
