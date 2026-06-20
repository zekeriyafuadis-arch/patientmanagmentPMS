const { canAccessClinical } = require('../utils/clinicalAccess');

function requireClinicalAccess(getPatientId) {
  return async (req, res, next) => {
    try {
      const patientId = getPatientId(req);
      if (!patientId) {
        return res.status(400).json({ success: false, error: 'Patient ID required' });
      }
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

module.exports = { requireClinicalAccess };
