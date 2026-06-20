const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { appointmentAssignSchema, appointmentCreateSchema } = require('../../validators/schemas');
const AppointmentsController = require('../../controllers/appointments.controller');

const router = express.Router();
router.use(requireAuth);

router.get('/available-slots', AppointmentsController.getAvailableSlots);
router.get('/pending-confirmations', requireRole('dentist'), AppointmentsController.getPendingConfirmations);
router.post('/assign', requireRole('admin', 'receptionist'), validate(appointmentAssignSchema), AppointmentsController.assign);
router.post('/bulk-assign', requireRole('admin', 'receptionist'), AppointmentsController.bulkAssign);
router.get('/', AppointmentsController.list);
router.get('/:id', AppointmentsController.getById);
router.post('/', validate(appointmentCreateSchema), AppointmentsController.create);
router.put('/:id', AppointmentsController.update);
router.post('/:id/confirm', requireRole('dentist'), AppointmentsController.confirm);
router.post('/:id/decline', requireRole('dentist'), AppointmentsController.decline);
router.patch('/:id/status', AppointmentsController.patchStatus);
router.delete('/:id', AppointmentsController.remove);

module.exports = router;
