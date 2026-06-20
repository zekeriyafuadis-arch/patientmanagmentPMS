const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');
const StaffController = require('../../controllers/staff.controller');

const router = express.Router();
router.use(requireAuth);

router.get('/', StaffController.list);
router.get('/:id/schedule', StaffController.getSchedule);
router.put('/:id/schedule', requireRole('admin'), StaffController.updateSchedule);
router.post('/', requireRole('admin'), StaffController.create);
router.patch('/:id/role', requireRole('admin'), StaffController.updateRole);
router.patch('/:id/active', requireRole('admin'), StaffController.setActive);
router.patch('/:id/reset-password', requireRole('admin'), StaffController.resetPassword);

module.exports = router;
