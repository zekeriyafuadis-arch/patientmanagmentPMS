const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');
const ProceduresController = require('../../controllers/procedures.controller');

const router = express.Router();
router.use(requireAuth);

router.get('/', ProceduresController.list);
router.post('/', requireRole('admin'), ProceduresController.create);
router.put('/:id', requireRole('admin'), ProceduresController.update);
router.delete('/:id', requireRole('admin'), ProceduresController.remove);
router.post('/seed-defaults', requireRole('admin'), ProceduresController.seedDefaults);

module.exports = router;
