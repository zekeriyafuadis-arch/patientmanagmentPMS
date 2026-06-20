const ClinicalService = require('../services/clinical.service');

class ClinicalController {
  static async listCharts(req, res) {
    try {
      const data = await ClinicalService.listCharts(req.params.patientId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createChart(req, res) {
    try {
      const data = await ClinicalService.createChart(req.body, req.user, req.user?.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async listPlans(req, res) {
    try {
      const data = await ClinicalService.listPlans(req.params.patientId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createPlan(req, res) {
    try {
      const data = await ClinicalService.createPlan(req.body, req.user, req.user?.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async getPlan(req, res) {
    try {
      const data = await ClinicalService.getPlan(req.params.id, req.user);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.status || 500).json({ success: false, error: err.message });
    }
  }

  static async updatePlan(req, res) {
    try {
      await ClinicalService.updatePlan(req.params.id, req.body, req.user, req.user?.id);
      res.json({ success: true });
    } catch (err) {
      res.status(err.status || 500).json({ success: false, error: err.message });
    }
  }

  static async listNotes(req, res) {
    try {
      const data = await ClinicalService.listNotes(req.params.patientId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createNote(req, res) {
    try {
      const data = await ClinicalService.createNote(req.body, req.user, req.user?.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async treatmentSummary(req, res) {
    try {
      const data = await ClinicalService.treatmentSummary();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = ClinicalController;
