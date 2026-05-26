const express = require('express');
const router = express.Router();
const PatientController = require('../PatientController/patient.controller');

// Routes
router.post('/', PatientController.createPatient);
router.get('/', PatientController.getAllPatients);
router.get('/search', PatientController.searchPatients);
router.get('/export/csv', PatientController.exportToCSV);
router.get('/export/excel', PatientController.exportToExcel);
router.get('/export/pdf/all', PatientController.generateAllPatientsPDF);
router.get('/export/pdf/:id', PatientController.generatePatientPDF);
router.get('/mrn/:mrn', PatientController.getPatientByMRN);
router.get('/:id', PatientController.getPatientById);
router.put('/:id', PatientController.updatePatient);
router.delete('/:id', PatientController.deletePatient);

module.exports = router;