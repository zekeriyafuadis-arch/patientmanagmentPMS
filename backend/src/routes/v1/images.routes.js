const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { all, get, run, uploadsDir } = require('../../config/database');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { requireClinicalAccess } = require('../../middleware/clinicalAccess');

const router = express.Router();
router.use(requireAuth);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(uploadsDir, String(req.params.patientId));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

router.get('/file/:id', requireRole('admin', 'dentist'), async (req, res) => {
  try {
    const row = await get('SELECT * FROM patient_images WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, error: 'Not found' });
    const { canAccessClinical } = require('../../utils/clinicalAccess');
    const allowed = await canAccessClinical(req.user, String(row.patient_id));
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    if (!row.storage_path || !fs.existsSync(row.storage_path)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    res.sendFile(path.resolve(row.storage_path));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:patientId', requireRole('admin', 'dentist'), requireClinicalAccess((req) => req.params.patientId), async (req, res) => {
  try {
    const rows = await all(
      'SELECT * FROM patient_images WHERE patient_id = ? ORDER BY created_at DESC',
      [req.params.patientId]
    );
    res.json({
      success: true,
      data: rows.map((r) => ({
        id: String(r.id),
        patientId: String(r.patient_id),
        fileName: r.file_name,
        storagePath: r.storage_path,
        downloadUrl: `/api/v1/images/file/${r.id}`,
        imageType: r.image_type,
        toothNumber: r.tooth_number,
        notes: r.notes,
        uploadedBy: r.uploaded_by,
        uploadedByName: r.uploaded_by_name,
        created_at: r.created_at
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:patientId', requireRole('dentist'), requireClinicalAccess((req) => req.params.patientId), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    const { toothNumber, notes, imageType } = req.body;
    const storagePath = req.file.path;
    const result = await run(
      `INSERT INTO patient_images (patient_id, file_name, storage_path, image_type, tooth_number, notes, uploaded_by, uploaded_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.params.patientId, req.file.originalname, storagePath, imageType || 'xray', toothNumber || '', notes || '', req.user.id, req.user.fullName]
    );
    res.status(201).json({
      success: true,
      data: {
        id: String(result.lastID),
        downloadUrl: `/api/v1/images/file/${result.lastID}`
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/:id', requireRole('dentist'), async (req, res) => {
  try {
    const row = await get('SELECT * FROM patient_images WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, error: 'Not found' });
    const { canAccessClinical } = require('../../utils/clinicalAccess');
    const allowed = await canAccessClinical(req.user, String(row.patient_id));
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Only the assigned doctor can delete this image' });
    }
    if (row.storage_path && fs.existsSync(row.storage_path)) {
      fs.unlinkSync(row.storage_path);
    }
    await run('DELETE FROM patient_images WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
