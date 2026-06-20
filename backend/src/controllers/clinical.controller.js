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

  static async getChartDiff(req, res) {
    try {
      const data = await ClinicalService.getChartDiff(req.params.patientId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async listPerioCharts(req, res) {
    try {
      const data = await ClinicalService.listPerioCharts(req.params.patientId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createPerioChart(req, res) {
    try {
      const data = await ClinicalService.createPerioChart(req.body, req.user, req.user?.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async listDocuments(req, res) {
    try {
      const data = await ClinicalService.listDocuments(req.params.patientId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createDocument(req, res) {
    try {
      const data = await ClinicalService.createDocument(req.body, req.user, req.user?.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(err.status || 400).json({ success: false, error: err.message });
    }
  }

  static async listLetterTemplates(req, res) {
    try {
      const data = ClinicalService.getLetterTemplates();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async downloadDocumentPdf(req, res) {
    try {
      const { get } = require('../config/database');
      const { logAudit } = require('../utils/audit');
      const { streamPdf, generateLetterPdf } = require('../services/pdfDocuments.service');
      const row = await get('SELECT * FROM clinical_documents WHERE id = ?', [req.params.id]);
      if (!row) return res.status(404).json({ success: false, error: 'Not found' });
      const patient = row.patient_id
        ? await get('SELECT name FROM patients WHERE id = ?', [row.patient_id])
        : null;
      await logAudit({
        action: 'export.clinical_letter_pdf',
        entityType: 'clinical_document',
        entityId: req.params.id,
        user: req.user,
        details: row.title,
        req
      });
      streamPdf(res, `letter-${row.id}.pdf`, generateLetterPdf({
        title: row.title,
        body: row.body,
        patientName: patient?.name || ''
      }));
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = ClinicalController;
