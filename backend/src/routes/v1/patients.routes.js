const express = require('express');
const router = express.Router();
const PatientController = require('../../controllers/patients.controller');
const { requireAuth } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { patientCreateSchema } = require('../../validators/schemas');

router.use(requireAuth);

router.post('/', validate(patientCreateSchema), PatientController.createPatient);
router.get('/', PatientController.getAllPatients);
router.get('/mine', PatientController.getMyPatients);
router.get('/search', PatientController.searchPatients);
router.get('/duplicates/check', PatientController.checkDuplicates);
router.get('/export/csv', PatientController.exportToCSV);
router.get('/export/excel', PatientController.exportToExcel);
router.get('/export/pdf/all', PatientController.generateAllPatientsPDF);
router.get('/export/pdf/:id', PatientController.generatePatientPDF);
router.get('/mrn/:mrn', PatientController.getPatientByMRN);
router.get('/:id/clinical-access', PatientController.getClinicalAccess);
router.get('/:id/doctor-history', PatientController.getDoctorVisitHistory);
router.patch('/:id/primary-doctor', PatientController.updatePrimaryDoctor);
router.get('/:id', PatientController.getPatientById);
router.put('/:id', PatientController.updatePatient);
router.delete('/:id', PatientController.deletePatient);

module.exports = router;