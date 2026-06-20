const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const staffRoutes = require('./staff.routes');
const procedureRoutes = require('./procedures.routes');
const appointmentRoutes = require('./appointments.routes');
const billingRoutes = require('./billing.routes');
const clinicalRoutes = require('./clinical.routes');
const imageRoutes = require('./images.routes');
const adminRoutes = require('./admin.routes');
const patientRoutes = require('./patients.routes');
const eventsRoutes = require('./events.routes');

router.use('/auth', authRoutes);
router.use('/staff', staffRoutes);
router.use('/procedures', procedureRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/alerts', require('./alerts.routes'));
router.use('/billing', billingRoutes);
router.use('/clinical', clinicalRoutes);
router.use('/images', imageRoutes);
router.use('/admin', adminRoutes);
router.use('/events', eventsRoutes);
router.use('/patients', patientRoutes);
router.use('/audit', require('./audit.routes'));

module.exports = router;
