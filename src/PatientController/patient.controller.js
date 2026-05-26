const PatientService = require('../PatientService/patient.service');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

class PatientController {
    static createPatient(req, res) {
        PatientService.createPatient(req.body, (err, result) => {
            if (err) {
                return res.status(400).json({ success: false, error: err.error || err });
            }
            res.status(201).json({ success: true, message: 'Patient created successfully', data: result });
        });
    }

    static getAllPatients(req, res) {
        PatientService.getAllPatients((err, patients) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            res.json({ success: true, data: patients });
        });
    }

    static getPatientById(req, res) {
        const id = req.params.id;
        PatientService.getPatientById(id, (err, patient) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            if (!patient) {
                return res.status(404).json({ success: false, error: 'Patient not found' });
            }
            res.json({ success: true, data: patient });
        });
    }

    static getPatientByMRN(req, res) {
        const mrn = req.params.mrn;
        PatientService.getPatientByMRN(mrn, (err, patient) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            if (!patient) {
                return res.status(404).json({ success: false, error: 'Patient not found' });
            }
            res.json({ success: true, data: patient });
        });
    }

    static updatePatient(req, res) {
    const id = req.params.id;
    
    // Validate required fields
    const requiredFields = ['name', 'father_name', 'grandfather_name', 'gender', 
                            'dob', 'age', 'address', 'region', 'wereda_subcity',
                            'ketena_gott', 'kebele', 'phone_number', 
                            'emergency_name', 'emergency_number'];
    
    for (let field of requiredFields) {
        if (!req.body[field]) {
            return res.status(400).json({ success: false, error: `${field} is required` });
        }
    }
    
    PatientService.updatePatient(id, req.body, (err) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true, message: 'Patient updated successfully' });
    });
}

    static deletePatient(req, res) {
        const id = req.params.id;
        PatientService.deletePatient(id, (err) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            res.json({ success: true, message: 'Patient deleted successfully' });
        });
    }

    static searchPatients(req, res) {
        const searchTerm = req.query.q;
        PatientService.searchPatients(searchTerm, (err, patients) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            res.json({ success: true, data: patients });
        });
    }

    // Generate PDF for single patient
    static generatePatientPDF(req, res) {
        const id = req.params.id;
        PatientService.getPatientById(id, (err, patient) => {
            if (err || !patient) {
                return res.status(404).json({ success: false, error: 'Patient not found' });
            }
            
            const doc = new PDFDocument({ margin: 50 });
            const filename = `patient_${patient.mrn}_${Date.now()}.pdf`;
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            
            doc.pipe(res);
            
            // Header
            doc.fontSize(20).text('Patient Management System', { align: 'center' });
            doc.fontSize(16).text('Patient Detailed Report', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
            doc.moveDown();
            
            // Patient Information
            doc.fontSize(14).text('PATIENT INFORMATION', { underline: true });
            doc.moveDown(0.5);
            
            const info = [
                { label: 'MRN Number:', value: patient.mrn },
                { label: 'Full Name:', value: patient.name },
                { label: "Father's Name:", value: patient.father_name },
                { label: "Grandfather's Name:", value: patient.grandfather_name },
                { label: 'Gender:', value: patient.gender },
                { label: 'Date of Birth:', value: patient.dob },
                { label: 'Age:', value: `${patient.age} years` },
                { label: 'Registration Date:', value: new Date(patient.registration_date).toLocaleDateString() }
            ];
            
            let y = doc.y;
            info.forEach(item => {
                doc.fontSize(12).text(`${item.label}`, 50, y, { continued: true, width: 150 });
                doc.text(`${item.value}`, 200, y);
                y += 25;
            });
            
            doc.moveDown();
            
            // Address Information
            doc.fontSize(14).text('ADDRESS INFORMATION', { underline: true });
            doc.moveDown(0.5);
            
            const addressInfo = [
                { label: 'Address:', value: patient.address },
                { label: 'Region:', value: patient.region },
                { label: 'Wereda/Subcity:', value: patient.wereda_subcity },
                { label: 'Ketena/Gott:', value: patient.ketena_gott },
                { label: 'Kebele:', value: patient.kebele },
                { label: 'House Number:', value: patient.house_number || 'N/A' }
            ];
            
            y = doc.y;
            addressInfo.forEach(item => {
                doc.fontSize(12).text(`${item.label}`, 50, y, { continued: true, width: 150 });
                doc.text(`${item.value}`, 200, y);
                y += 25;
            });
            
            doc.moveDown();
            
            // Contact Information
            doc.fontSize(14).text('CONTACT INFORMATION', { underline: true });
            doc.moveDown(0.5);
            
            const contactInfo = [
                { label: 'Phone Number:', value: patient.phone_number },
                { label: 'Emergency Contact:', value: patient.emergency_name },
                { label: 'Emergency Number:', value: patient.emergency_number }
            ];
            
            y = doc.y;
            contactInfo.forEach(item => {
                doc.fontSize(12).text(`${item.label}`, 50, y, { continued: true, width: 150 });
                doc.text(`${item.value}`, 200, y);
                y += 25;
            });
            
            // Footer
            doc.moveDown(2);
            doc.fontSize(10).text('This is a computer generated document. No signature required.', { align: 'center' });
            
            doc.end();
        });
    }

    // Generate PDF for all patients
    static generateAllPatientsPDF(req, res) {
        PatientService.getAllPatients((err, patients) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            
            const doc = new PDFDocument({ margin: 50, autoFirstPage: true });
            const filename = `all_patients_${Date.now()}.pdf`;
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            
            doc.pipe(res);
            
            // Header
            doc.fontSize(20).text('Patient Management System', { align: 'center' });
            doc.fontSize(16).text('All Patients Report', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
            doc.fontSize(12).text(`Total Patients: ${patients.length}`, { align: 'center' });
            doc.moveDown();
            
            // Table Header
            const tableTop = doc.y + 20;
            const columns = ['MRN', 'Name', 'Father Name', 'Gender', 'Age', 'Phone', 'Region'];
            const columnWidths = [80, 80, 80, 60, 40, 90, 80];
            let currentY = tableTop;
            
            // Draw header background
            doc.rect(50, currentY - 5, 500, 25).fill('#667eea');
            doc.fillColor('white');
            
            let currentX = 50;
            columns.forEach((col, i) => {
                doc.fontSize(10).text(col, currentX, currentY, { width: columnWidths[i], align: 'left' });
                currentX += columnWidths[i];
            });
            
            doc.fillColor('black');
            currentY += 25;
            
            // Draw rows
            patients.forEach((patient, index) => {
                if (currentY > 700) {
                    doc.addPage();
                    currentY = 50;
                    
                    // Redraw header on new page
                    doc.rect(50, currentY - 5, 500, 25).fill('#667eea');
                    doc.fillColor('white');
                    currentX = 50;
                    columns.forEach((col, i) => {
                        doc.fontSize(10).text(col, currentX, currentY, { width: columnWidths[i], align: 'left' });
                        currentX += columnWidths[i];
                    });
                    doc.fillColor('black');
                    currentY += 25;
                }
                
                // Alternate row colors
                if (index % 2 === 0) {
                    doc.rect(50, currentY - 5, 500, 20).fill('#f5f5f5');
                }
                
                currentX = 50;
                const rowData = [
                    patient.mrn,
                    patient.name.substring(0, 15),
                    patient.father_name.substring(0, 15),
                    patient.gender,
                    patient.age.toString(),
                    patient.phone_number,
                    patient.region.substring(0, 10)
                ];
                
                rowData.forEach((data, i) => {
                    doc.fontSize(9).text(data, currentX, currentY, { width: columnWidths[i], align: 'left' });
                    currentX += columnWidths[i];
                });
                
                currentY += 20;
            });
            
            doc.end();
        });
    }

    // Export to CSV
    static exportToCSV(req, res) {
        PatientService.getAllPatients((err, patients) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            
            const headers = [
                'MRN', 'Registration Date', 'Full Name', 'Father\'s Name', 'Grandfather\'s Name',
                'Gender', 'Date of Birth', 'Age', 'Address', 'Region', 'Wereda/Subcity',
                'Ketena/Gott', 'Kebele', 'House Number', 'Phone Number', 'Emergency Contact',
                'Emergency Number', 'Registration Date'
            ];
            
            const csvRows = [];
            csvRows.push(headers.join(','));
            
            patients.forEach(patient => {
                const row = [
                    `"${patient.mrn}"`,
                    `"${new Date(patient.registration_date).toLocaleDateString()}"`,
                    `"${patient.name}"`,
                    `"${patient.father_name}"`,
                    `"${patient.grandfather_name}"`,
                    `"${patient.gender}"`,
                    `"${patient.dob}"`,
                    patient.age,
                    `"${patient.address}"`,
                    `"${patient.region}"`,
                    `"${patient.wereda_subcity}"`,
                    `"${patient.ketena_gott}"`,
                    `"${patient.kebele}"`,
                    `"${patient.house_number || ''}"`,
                    `"${patient.phone_number}"`,
                    `"${patient.emergency_name}"`,
                    `"${patient.emergency_number}"`,
                    `"${new Date(patient.created_at).toLocaleString()}"`
                ];
                csvRows.push(row.join(','));
            });
            
            const csvContent = csvRows.join('\n');
            const filename = `patients_export_${Date.now()}.csv`;
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.send(csvContent);
        });
    }

    // Export to Excel
    static exportToExcel(req, res) {
        PatientService.getAllPatients(async (err, patients) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Patients');
            
            // Define columns
            worksheet.columns = [
                { header: 'MRN', key: 'mrn', width: 20 },
                { header: 'Registration Date', key: 'reg_date', width: 20 },
                { header: 'Full Name', key: 'name', width: 25 },
                { header: "Father's Name", key: 'father_name', width: 25 },
                { header: "Grandfather's Name", key: 'grandfather_name', width: 25 },
                { header: 'Gender', key: 'gender', width: 10 },
                { header: 'Date of Birth', key: 'dob', width: 15 },
                { header: 'Age', key: 'age', width: 8 },
                { header: 'Address', key: 'address', width: 30 },
                { header: 'Region', key: 'region', width: 20 },
                { header: 'Wereda/Subcity', key: 'wereda', width: 20 },
                { header: 'Ketena/Gott', key: 'ketena', width: 20 },
                { header: 'Kebele', key: 'kebele', width: 15 },
                { header: 'House Number', key: 'house', width: 12 },
                { header: 'Phone Number', key: 'phone', width: 15 },
                { header: 'Emergency Contact', key: 'emergency_name', width: 25 },
                { header: 'Emergency Number', key: 'emergency_number', width: 15 }
            ];
            
            // Style header row
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF667EEA' }
            };
            worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' } };
            
            // Add data
            patients.forEach(patient => {
                worksheet.addRow({
                    mrn: patient.mrn,
                    reg_date: new Date(patient.registration_date).toLocaleDateString(),
                    name: patient.name,
                    father_name: patient.father_name,
                    grandfather_name: patient.grandfather_name,
                    gender: patient.gender,
                    dob: patient.dob,
                    age: patient.age,
                    address: patient.address,
                    region: patient.region,
                    wereda: patient.wereda_subcity,
                    ketena: patient.ketena_gott,
                    kebele: patient.kebele,
                    house: patient.house_number || '',
                    phone: patient.phone_number,
                    emergency_name: patient.emergency_name,
                    emergency_number: patient.emergency_number
                });
            });
            
            const filename = `patients_export_${Date.now()}.xlsx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            
            await workbook.xlsx.write(res);
            res.end();
        });
    }
}

module.exports = PatientController;