/**
 * Patient Detail Page Module
 * Displays comprehensive patient information with actions
 */

import { renderMedicalAlertBanner } from '../../utils/patientAlerts.js';
import { patientService } from '../../services/patientService.js';
import { printPatientRecord, printReceipt } from '../../services/exportService.js';
import { appointmentService } from '../../services/appointmentService.js';
import { PatientClinical } from '../clinical/patientClinical.js';
import { canViewClinicalRecords, canAssignDoctors, getCurrentRole, canAccessBilling } from '../../services/authService.js';
import { billingService, getInvoiceStatusMeta } from '../../services/billingService.js';

export class PatientDetail {
    constructor(patientId) {
        this.patientId = patientId;
        this.patient = null;
        this.patientInvoices = [];
        this.billingSearch = '';
    }
    
    /**
     * Render the patient detail page HTML
     */
    async render() {
        return `
            <div class="detail-container">
                <!-- Header with Actions -->
                <div class="detail-header">
                    <div class="header-left">
                        <button class="btn-back" onclick="window.history.back()">
                            <i class="fas fa-arrow-left"></i> Back
                        </button>
                        <h1>
                            <i class="fas fa-user-circle"></i>
                            Patient Details
                        </h1>
                    </div>
                    <div class="action-buttons">
                        
                        <button class="btn-print" id="printBtn">
                            <i class="fas fa-print"></i> Print
                        </button>
                        <button class="btn-pdf" id="pdfBtn">
                            <i class="fas fa-file-pdf"></i> PDF
                        </button>
                        <button class="btn-share" id="shareBtn">
                            <i class="fas fa-share-alt"></i> Share
                        </button>
                    </div>
                </div>
                
                <!-- Loading State -->
                <div id="patientDetailContent" class="patient-detail-content">
                    <div class="loading-container">
                        <div class="loading-spinner"></div>
                        <p>Loading patient details...</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Load patient details from API
     */
    async loadPatientDetails() {
        try {
            const data = await patientService.fetchById(this.patientId);
            
            if (data.success && data.data) {
                this.patient = data.data;
                this.displayPatientDetails();
                this.setupEventListeners();
                if (this.patient.canViewClinical) {
                    this.clinical = new PatientClinical(this.patientId, this.patient);
                    await this.clinical.init();
                }
                if (canAccessBilling(getCurrentRole())) {
                    await this.loadPatientBilling();
                }
            } else {
                this.showError('Patient not found');
            }
        } catch (error) {
            console.error('Error loading patient details:', error);
            this.showError('Error loading patient details. Please try again.');
        }
    }
    
    /**
     * Display patient details in the UI
     */
    displayPatientDetails() {
        const container = document.getElementById('patientDetailContent');
        if (!container) return;
        
        const patient = this.patient;
        
        container.innerHTML = `
            ${renderMedicalAlertBanner(this.patient)}
            <!-- Patient Profile Header -->
            <div class="profile-header">
                <div class="profile-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div class="profile-info">
                    <h2>${this.escapeHtml(patient.name)}</h2>
                    <div class="profile-badges">
                        <span class="badge badge-primary">
                            <i class="fas fa-id-card"></i> MRN: ${patient.mrn}
                        </span>
                        <span class="badge ${patient.gender === 'Male' ? 'badge-info' : 'badge-danger'}">
                            <i class="fas ${patient.gender === 'Male' ? 'fa-mars' : 'fa-venus'}"></i> 
                            ${patient.gender}
                        </span>
                        <span class="badge badge-success">
                            <i class="fas fa-calendar-alt"></i> Age: ${patient.age} years
                        </span>
                    </div>
                </div>
                <div class="profile-reg-date">
                    <i class="fas fa-calendar-plus"></i>
                    <div>
                        <small>Registered on</small>
                        <strong>${new Date(patient.registration_date).toLocaleDateString()}</strong>
                    </div>
                </div>
            </div>
            
            <!-- Quick Actions Bar -->
            <div class="quick-actions-bar">
                <button class="quick-action" onclick="window.location.href='tel:${patient.phone_number}'">
                    <i class="fas fa-phone-alt"></i>
                    <span>Call</span>
                </button>
                <button class="quick-action" onclick="window.location.href='sms:${patient.phone_number}'">
                    <i class="fas fa-envelope"></i>
                    <span>Message</span>
                </button>
                <button class="quick-action" id="viewOnMapBtn">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>Location</span>
                </button>
                <button class="quick-action" id="exportVCardBtn">
                    <i class="fas fa-address-card"></i>
                    <span>vCard</span>
                </button>
            </div>
            
            <!-- Main Content Grid -->
            <div class="detail-grid-container">
                <!-- Personal Information Card -->
                <div class="detail-card">
                    <div class="card-header">
                        <i class="fas fa-user"></i>
                        <h3>Personal Information</h3>
                        <i class="fas fa-chevron-down toggle-icon"></i>
                    </div>
                    <div class="card-content">
                        <div class="info-group">
                            <div class="info-row">
                                <div class="info-label">
                                    <i class="fas fa-id-card"></i> MRN Number:
                                </div>
                                <div class="info-value">
                                    <strong>${patient.mrn}</strong>
                                    <button class="copy-btn" data-copy="${patient.mrn}" title="Copy MRN">
                                        <i class="fas fa-copy"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="info-row">
                                <div class="info-label">
                                    <i class="fas fa-user"></i> Full Name:
                                </div>
                                <div class="info-value">${this.escapeHtml(patient.name)}</div>
                            </div>
                            <div class="info-row">
                                <div class="info-label">
                                    <i class="fas fa-user-tie"></i> Father's Name:
                                </div>
                                <div class="info-value">${this.escapeHtml(patient.father_name || 'N/A')}</div>
                            </div>
                            <div class="info-row">
                                <div class="info-label">
                                    <i class="fas fa-user-graduate"></i> Grandfather's Name:
                                </div>
                                <div class="info-value">${this.escapeHtml(patient.grandfather_name || 'N/A')}</div>
                            </div>
                            <div class="info-row">
                                <div class="info-label">
                                    <i class="fas ${patient.gender === 'Male' ? 'fa-mars' : 'fa-venus'}"></i> Gender:
                                </div>
                                <div class="info-value">${patient.gender}</div>
                            </div>
                            <div class="info-row">
                                <div class="info-label">
                                    <i class="fas fa-birthday-cake"></i> Date of Birth:
                                </div>
                                <div class="info-value">${patient.dob || 'N/A'}</div>
                            </div>
                            <div class="info-row">
                                <div class="info-label">
                                    <i class="fas fa-chart-line"></i> Age:
                                </div>
                                <div class="info-value">${patient.age} years</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Address Information Card -->
                <div class="detail-card">
                    <div class="card-header">
                        <i class="fas fa-map-marker-alt"></i>
                        <h3>Address Information</h3>
                        <i class="fas fa-chevron-down toggle-icon"></i>
                    </div>
                    <div class="card-content">
                        <div class="info-group">
                            <div class="info-row">
                                <div class="info-label">
                                    <i class="fas fa-location-dot"></i> Address:
                                </div>
                                <div class="info-value">${this.escapeHtml(patient.address || 'N/A')}</div>
                            </div>
                            <div class="info-row">
                                <div class="info-label">
                                    <i class="fas fa-globe-africa"></i> Region:
                                </div>
                                <div class="info-value">${this.escapeHtml(patient.region || 'N/A')}</div>
                            </div>
                            <div class="info-row">
                                <div class="info-label">
                                    <i class="fas fa-city"></i> Wereda/Subcity:
                                </div>
                                <div class="info-value">${this.escapeHtml(patient.wereda_subcity || 'N/A')}</div>
                            </div>
                            <div class="info-row">
                                <div class="info-label">
                                    <i class="fas fa-building"></i> Ketena/Gott:
                                </div>
                                <div class="info-value">${this.escapeHtml(patient.ketena_gott || 'N/A')}</div>
                            </div>
                            <div class="info-row">
                                <div class="info-label">
                                    <i class="fas fa-home"></i> Kebele:
                                </div>
                                <div class="info-value">${this.escapeHtml(patient.kebele || 'N/A')}</div>
                            </div>
                            <div class="info-row">
                                <div class="info-label">
                                    <i class="fas fa-door-open"></i> House Number:
                                </div>
                                <div class="info-value">${this.escapeHtml(patient.house_number || 'N/A')}</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Contact Information Card -->
                <div class="detail-card">
                    <div class="card-header">
                        <i class="fas fa-phone-alt"></i>
                        <h3>Contact Information</h3>
                        <i class="fas fa-chevron-down toggle-icon"></i>
                    </div>
                    <div class="card-content">
                        <div class="info-group">
                            <div class="info-row">
                                <div class="info-label">
                                    <i class="fas fa-phone"></i> Phone Number:
                                </div>
                                <div class="info-value">
                                    <a href="tel:${patient.phone_number}" class="contact-link">
                                        ${patient.phone_number}
                                    </a>
                                    <button class="copy-btn" data-copy="${patient.phone_number}" title="Copy Phone">
                                        <i class="fas fa-copy"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="info-row">
                                <div class="info-label">
                                    <i class="fas fa-user-md"></i> Emergency Contact:
                                </div>
                                <div class="info-value">${this.escapeHtml(patient.emergency_name || 'N/A')}</div>
                            </div>
                            <div class="info-row">
                                <div class="info-label">
                                    <i class="fas fa-phone-alt"></i> Emergency Number:
                                </div>
                                <div class="info-value">
                                    <a href="tel:${patient.emergency_number}" class="contact-link">
                                        ${patient.emergency_number || 'N/A'}
                                    </a>
                                    <button class="copy-btn" data-copy="${patient.emergency_number}" title="Copy Emergency">
                                        <i class="fas fa-copy"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Dental Information Card -->
                <div class="detail-card">
                    <div class="card-header">
                        <i class="fas fa-tooth"></i>
                        <h3>Dental Information</h3>
                        <i class="fas fa-chevron-down toggle-icon"></i>
                    </div>
                    <div class="card-content">
                        <div class="info-group">
                            <div class="info-row">
                                <div class="info-label"><i class="fas fa-shield-alt"></i> Insurance:</div>
                                <div class="info-value">${this.escapeHtml(patient.insurance_plan || 'None')}${patient.insurance_member_id ? ` (${this.escapeHtml(patient.insurance_member_id)})` : ''}</div>
                            </div>
                            <div class="info-row">
                                <div class="info-label"><i class="fas fa-user-friends"></i> Referred By:</div>
                                <div class="info-value">${this.escapeHtml(patient.referred_by || 'N/A')}</div>
                            </div>
                            <div class="info-row">
                                <div class="info-label"><i class="fas fa-calendar"></i> Last Visit:</div>
                                <div class="info-value">${patient.last_dental_visit ? new Date(patient.last_dental_visit).toLocaleDateString() : 'N/A'}</div>
                            </div>
                            <div class="info-row">
                                <div class="info-label"><i class="fas fa-bell"></i> Recall Due:</div>
                                <div class="info-value">${patient.recall_due ? new Date(patient.recall_due).toLocaleDateString() : 'Not set'}</div>
                            </div>
                            <div class="info-row">
                                <div class="info-label"><i class="fas fa-comment-medical"></i> Chief Complaint:</div>
                                <div class="info-value">${this.escapeHtml(patient.chief_complaint || 'N/A')}</div>
                            </div>
                            <div class="info-row">
                                <div class="info-label"><i class="fas fa-allergies"></i> Allergies:</div>
                                <div class="info-value">${this.escapeHtml(patient.allergies || 'None reported')}</div>
                            </div>
                            <div class="info-row">
                                <div class="info-label"><i class="fas fa-pills"></i> Medications:</div>
                                <div class="info-value">${this.escapeHtml(patient.medications || 'None reported')}</div>
                            </div>
                            <div class="info-row">
                                <div class="info-label"><i class="fas fa-heartbeat"></i> Medical Conditions:</div>
                                <div class="info-value">${this.escapeHtml(patient.medical_conditions || 'None reported')}</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Additional Information Card -->
                <div class="detail-card">
                    <div class="card-header">
                        <i class="fas fa-info-circle"></i>
                        <h3>Additional Information</h3>
                        <i class="fas fa-chevron-down toggle-icon"></i>
                    </div>
                    <div class="card-content">
                        <div class="info-group">
                            <div class="info-row">
                                <div class="info-label">
                                    <i class="fas fa-calendar-check"></i> Registration Date:
                                </div>
                                <div class="info-value">
                                    ${new Date(patient.registration_date).toLocaleString()}
                                </div>
                            </div>
                            <div class="info-row">
                                <div class="info-label">
                                    <i class="fas fa-clock"></i> Last Updated:
                                </div>
                                <div class="info-value">
                                    ${patient.updated_at ? new Date(patient.updated_at).toLocaleString() : 'N/A'}
                                </div>
                            </div>
                            <div class="info-row">
                                <div class="info-label">
                                    <i class="fas fa-qrcode"></i> QR Code:
                                </div>
                                <div class="info-value">
                                    <div id="qrCode" class="qr-container"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            ${this.renderAssignmentBanner(patient)}

            ${this.renderBillingSection()}
            
            <!-- Clinical Records (assigned confirmed doctor only) -->
            ${patient.canViewClinical ? new PatientClinical(this.patientId, patient).renderShell() : this.renderClinicalLockedMessage(patient)}
            
            <!-- Action Buttons Bottom -->
            <div class="detail-footer">
                <button class="footer-btn delete" id="deletePatientBtn">
                    <i class="fas fa-trash-alt"></i> Delete Patient
                </button>
                <button class="footer-btn history" id="viewHistoryBtn">
                    <i class="fas fa-history"></i> View History
                </button>
                <button class="footer-btn appointment" id="newAppointmentBtn">
                    <i class="fas fa-calendar-plus"></i> New Appointment
                </button>
            </div>
        `;
        
        this.initializeQRCode();
        this.setupCollapsibleCards();
    }
    
    renderAssignmentBanner(patient) {
        if (!patient.assigned_doctor_id && !canAssignDoctors()) return '';
        if (!patient.assigned_doctor_id) {
            return `
                <div class="assignment-banner assignment-none">
                    <div><i class="fas fa-user-md"></i> <strong>No doctor assigned</strong> — assign a dentist with the next available slot.</div>
                    <button type="button" class="btn-primary btn-sm" id="assignDoctorBtn"><i class="fas fa-magic"></i> Auto-Assign Doctor</button>
                </div>`;
        }
        const statusLabels = {
            pending: 'Awaiting doctor confirmation',
            confirmed: 'Doctor confirmed — clinical access granted'
        };
        const cls = patient.assignment_status === 'confirmed' ? 'confirmed' : 'pending';
        return `
            <div class="assignment-banner assignment-${cls}">
                <i class="fas fa-user-md"></i>
                <strong>${this.escapeHtml(patient.assigned_doctor_name)}</strong>
                <span>— ${statusLabels[patient.assignment_status] || patient.assignment_status}</span>
            </div>`;
    }

    renderClinicalLockedMessage(patient) {
        if (!canViewClinicalRecords()) return '';
        if (getCurrentRole() === 'admin') {
            return `<div class="clinical-locked-notice"><i class="fas fa-lock"></i> Clinical records could not be loaded for this patient.</div>`;
        }
        if (patient.assignment_status === 'pending') {
            return `<div class="clinical-locked-notice"><i class="fas fa-lock"></i> Confirm this patient assignment on your dashboard to unlock clinical records.</div>`;
        }
        return `<div class="clinical-locked-notice"><i class="fas fa-lock"></i> Clinical records are only available for patients assigned and confirmed to you.</div>`;
    }

    renderBillingSection() {
        if (!canAccessBilling(getCurrentRole())) return '';
        return `
            <div class="detail-card patient-billing-card" id="patientBillingSection">
                <div class="card-header">
                    <i class="fas fa-file-invoice-dollar"></i>
                    <h3>Billing & Invoices</h3>
                    <i class="fas fa-chevron-down toggle-icon"></i>
                </div>
                <div class="card-content" id="patientBillingContent">
                    <div class="loading-container compact">
                        <div class="loading-spinner"></div>
                        <p>Loading invoices...</p>
                    </div>
                </div>
            </div>
        `;
    }

    async loadPatientBilling() {
        const container = document.getElementById('patientBillingContent');
        if (!container) return;
        try {
            this.patientInvoices = await billingService.getInvoicesByPatient(this.patientId);
            this.renderPatientBilling();
        } catch (err) {
            container.innerHTML = `
                <div class="empty-state-small">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${this.escapeHtml(err.message || 'Could not load invoices')}</p>
                </div>
            `;
        }
    }

    getFilteredPatientInvoices() {
        const q = (this.billingSearch || '').toLowerCase();
        if (!q) return this.patientInvoices;
        return this.patientInvoices.filter((inv) =>
            inv.invoiceNumber.toLowerCase().includes(q)
            || (inv.status || '').toLowerCase().includes(q)
        );
    }

    renderPatientBilling() {
        const container = document.getElementById('patientBillingContent');
        if (!container) return;

        const invoices = this.getFilteredPatientInvoices();
        const active = this.patientInvoices.filter((i) => i.status !== 'cancelled');
        const totalBilled = active.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
        const totalPaid = active.reduce((s, i) => s + (parseFloat(i.amountPaid) || 0), 0);
        const outstanding = active.reduce((s, i) => s + (parseFloat(i.balance) || 0), 0);

        container.innerHTML = `
            <div class="patient-billing-summary">
                <div class="billing-summary-stat">
                    <span class="label">Total billed</span>
                    <strong>${totalBilled.toFixed(2)}</strong>
                </div>
                <div class="billing-summary-stat">
                    <span class="label">Paid</span>
                    <strong class="text-success">${totalPaid.toFixed(2)}</strong>
                </div>
                <div class="billing-summary-stat">
                    <span class="label">Outstanding</span>
                    <strong class="${outstanding > 0 ? 'text-warning' : 'text-success'}">${outstanding.toFixed(2)}</strong>
                </div>
            </div>
            <div class="patient-billing-toolbar">
                <input type="search" id="patientInvoiceSearch" class="billing-search" placeholder="Search invoice # or status..." value="${this.escapeHtml(this.billingSearch)}">
                <button type="button" class="btn-primary btn-sm" id="createPatientInvoiceBtn">
                    <i class="fas fa-plus"></i> Create Invoice
                </button>
            </div>
            ${invoices.length === 0 ? `
                <div class="empty-state-small">
                    <i class="fas fa-file-invoice"></i>
                    <p>${this.billingSearch ? 'No invoices match your search' : 'No invoices for this patient yet'}</p>
                </div>
            ` : `
                <div class="patient-invoice-list">
                    ${invoices.map((inv) => {
                        const st = getInvoiceStatusMeta(inv.status);
                        return `
                            <div class="patient-invoice-row" data-invoice-id="${inv.id}">
                                <div class="patient-invoice-main">
                                    <strong>${this.escapeHtml(inv.invoiceNumber)}</strong>
                                    <span class="status-badge ${st.className}">${st.label}</span>
                                </div>
                                <div class="patient-invoice-meta">
                                    <span>Total: ${parseFloat(inv.total).toFixed(2)}</span>
                                    <span class="${inv.balance > 0 ? 'text-warning' : 'text-success'}">
                                        ${inv.balance > 0 ? `Due: ${parseFloat(inv.balance).toFixed(2)}` : 'Paid'}
                                    </span>
                                    <span>${inv.created_at ? new Date(inv.created_at).toLocaleDateString() : ''}</span>
                                </div>
                                <div class="patient-invoice-actions">
                                    <button type="button" class="btn-secondary btn-sm view-invoice-btn" data-id="${inv.id}">
                                        <i class="fas fa-external-link-alt"></i> Open in Billing
                                    </button>
                                    <button type="button" class="btn-secondary btn-sm print-invoice-btn" data-id="${inv.id}">
                                        <i class="fas fa-print"></i> Receipt
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `}
        `;

        this.bindPatientBillingEvents();
    }

    bindPatientBillingEvents() {
        document.getElementById('patientInvoiceSearch')?.addEventListener('input', (e) => {
            this.billingSearch = e.target.value;
            this.renderPatientBilling();
        });

        document.getElementById('createPatientInvoiceBtn')?.addEventListener('click', () => {
            sessionStorage.setItem('billingPatientId', this.patientId);
            window.location.hash = 'billing';
        });

        document.querySelectorAll('.view-invoice-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                sessionStorage.setItem('billingPatientId', this.patientId);
                sessionStorage.setItem('billingOpenInvoiceId', btn.dataset.id);
                window.location.hash = 'billing';
            });
        });

        document.querySelectorAll('.print-invoice-btn').forEach((btn) => {
            btn.addEventListener('click', async () => {
                try {
                    const invoice = await billingService.getInvoiceById(btn.dataset.id);
                    const payments = await billingService.getPaymentsByInvoice(btn.dataset.id);
                    printReceipt(invoice, payments);
                } catch (err) {
                    this.showToast(err.message || 'Could not print receipt', 'error');
                }
            });
        });
    }
    
    /**
     * Initialize QR code with patient MRN
     */
    initializeQRCode() {
        const qrContainer = document.getElementById('qrCode');
        if (qrContainer && this.patient) {
            // Create simple QR code representation
            const qrData = `MRN: ${this.patient.mrn}\nName: ${this.patient.name}\nPhone: ${this.patient.phone_number}`;
            qrContainer.innerHTML = `
                <div class="qr-simple">
                    <i class="fas fa-qrcode"></i>
                    <div class="qr-text">${this.escapeHtml(this.patient.mrn)}</div>
                </div>
            `;
        }
    }
    
    /**
     * Setup collapsible cards
     */
    setupCollapsibleCards() {
        const cards = document.querySelectorAll('.detail-card .card-header');
        cards.forEach(header => {
            header.addEventListener('click', () => {
                const card = header.closest('.detail-card');
                const content = card.querySelector('.card-content');
                const icon = header.querySelector('.toggle-icon');
                
                content.classList.toggle('collapsed');
                icon.classList.toggle('fa-chevron-down');
                icon.classList.toggle('fa-chevron-up');
            });
        });
    }
    
    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        const actions = document.querySelector('.detail-header .action-buttons');
        if (actions && this.canEditPatient()) {
            const editBtn = document.createElement('button');
            editBtn.id = 'editPatientBtn';
            editBtn.className = 'btn-edit';
            editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
            actions.insertBefore(editBtn, actions.firstChild);
            editBtn.addEventListener('click', () => this.editPatient());
        }

        // Print button
        const printBtn = document.getElementById('printBtn');
        if (printBtn) {
            printBtn.addEventListener('click', () => this.printPatientDetails());
        }
        
        // PDF button
        const pdfBtn = document.getElementById('pdfBtn');
        if (pdfBtn) {
            pdfBtn.addEventListener('click', () => this.downloadPDF());
        }
        
        // Share button
        const shareBtn = document.getElementById('shareBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.sharePatient());
        }
        
        // Delete button
        const deleteBtn = document.getElementById('deletePatientBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deletePatient());
        }
        
        // View on map
        const mapBtn = document.getElementById('viewOnMapBtn');
        if (mapBtn) {
            mapBtn.addEventListener('click', () => this.viewOnMap());
        }
        
        // Export vCard
        const vcardBtn = document.getElementById('exportVCardBtn');
        if (vcardBtn) {
            vcardBtn.addEventListener('click', () => this.exportVCard());
        }
        
        // Copy buttons
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const text = btn.dataset.copy;
                if (text) {
                    navigator.clipboard.writeText(text);
                    this.showToast('Copied to clipboard!', 'success');
                }
            });
        });
        
        // Add medical record
        const addRecordBtn = document.getElementById('addMedicalRecordBtn');
        if (addRecordBtn) {
            addRecordBtn.addEventListener('click', () => this.addMedicalRecord());
        }
        
        // View history
        const historyBtn = document.getElementById('viewHistoryBtn');
        if (historyBtn) {
            historyBtn.addEventListener('click', () => this.viewHistory());
        }
        
        // New appointment
        const appointmentBtn = document.getElementById('newAppointmentBtn');
        if (appointmentBtn) {
            appointmentBtn.addEventListener('click', () => this.newAppointment());
        }

        document.getElementById('assignDoctorBtn')?.addEventListener('click', () => this.assignDoctor());
    }

    async assignDoctor() {
        if (!canAssignDoctors() || !this.patientId) return;
        try {
            const result = await appointmentService.assignDoctor({ patientId: this.patientId, auto: true });
            if (window.Toast) {
                window.Toast.success(`Assigned to ${result.staffName} — awaiting doctor confirmation`);
            }
            await this.loadPatientDetails();
        } catch (err) {
            if (window.Toast) window.Toast.error(err.message || 'Could not assign doctor');
        }
    }
    
    /**
     * Edit patient - navigate to edit page
     */
    canEditPatient() {
        const role = getCurrentRole();
        if (role !== 'dentist') return true;
        return this.patient?.assignment_status === 'confirmed';
    }

    editPatient() {
        window.location.hash = `edit/${this.patientId}`;
    }
     

    /**
     * Print patient details
     */
    printPatientDetails() {
        const printWindow = window.open('', '_blank');
        const patient = this.patient;
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Patient Details - ${patient.name}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        padding: 40px;
                        background: white;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        padding-bottom: 20px;
                        border-bottom: 2px solid #0891b2;
                    }
                    .header h1 {
                        color: #0891b2;
                        margin-bottom: 10px;
                    }
                    .header p {
                        color: #666;
                        margin: 5px 0;
                    }
                    .profile-section {
                        background: #f8f9fa;
                        padding: 20px;
                        border-radius: 10px;
                        margin-bottom: 30px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .profile-info h2 {
                        color: #333;
                        margin-bottom: 10px;
                    }
                    .badge {
                        display: inline-block;
                        padding: 5px 10px;
                        border-radius: 5px;
                        font-size: 12px;
                        margin-right: 10px;
                    }
                    .badge-primary {
                        background: #0891b2;
                        color: white;
                    }
                    .badge-info {
                        background: #4299e1;
                        color: white;
                    }
                    .badge-success {
                        background: #48bb78;
                        color: white;
                    }
                    .section {
                        margin-bottom: 25px;
                        page-break-inside: avoid;
                    }
                    .section h2 {
                        background: #0891b2;
                        color: white;
                        padding: 10px;
                        margin: 0 0 15px 0;
                        font-size: 16px;
                        border-radius: 5px;
                    }
                    .info-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 15px;
                    }
                    .info-item {
                        padding: 10px;
                        border-bottom: 1px solid #eee;
                    }
                    .info-label {
                        font-weight: bold;
                        color: #666;
                        font-size: 12px;
                        margin-bottom: 5px;
                    }
                    .info-value {
                        color: #333;
                        font-size: 14px;
                    }
                    .footer {
                        margin-top: 40px;
                        text-align: center;
                        font-size: 12px;
                        color: #999;
                        padding-top: 20px;
                        border-top: 1px solid #eee;
                    }
                    @media print {
                        body {
                            padding: 20px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🦷 Dr Amin Specialty Dental Clinic</h1>
                    <p>Patient Detailed Report</p>
                    <p>Generated: ${new Date().toLocaleString()}</p>
                </div>
                
                <div class="profile-section">
                    <div class="profile-info">
                        <h2>${this.escapeHtml(patient.name)}</h2>
                        <div>
                            <span class="badge badge-primary">MRN: ${patient.mrn}</span>
                            <span class="badge badge-info">${patient.gender}</span>
                            <span class="badge badge-success">Age: ${patient.age}</span>
                        </div>
                    </div>
                    <div>
                        <small>Registered: ${new Date(patient.registration_date).toLocaleDateString()}</small>
                    </div>
                </div>
                
                <div class="section">
                    <h2>📋 Personal Information</h2>
                    <div class="info-grid">
                        <div class="info-item"><div class="info-label">Full Name</div><div class="info-value">${this.escapeHtml(patient.name)}</div></div>
                        <div class="info-item"><div class="info-label">Father's Name</div><div class="info-value">${this.escapeHtml(patient.father_name || 'N/A')}</div></div>
                        <div class="info-item"><div class="info-label">Grandfather's Name</div><div class="info-value">${this.escapeHtml(patient.grandfather_name || 'N/A')}</div></div>
                        <div class="info-item"><div class="info-label">Gender</div><div class="info-value">${patient.gender}</div></div>
                        <div class="info-item"><div class="info-label">Date of Birth</div><div class="info-value">${patient.dob || 'N/A'}</div></div>
                        <div class="info-item"><div class="info-label">Age</div><div class="info-value">${patient.age} years</div></div>
                    </div>
                </div>
                
                <div class="section">
                    <h2>📍 Address Information</h2>
                    <div class="info-grid">
                        <div class="info-item"><div class="info-label">Address</div><div class="info-value">${this.escapeHtml(patient.address || 'N/A')}</div></div>
                        <div class="info-item"><div class="info-label">Region</div><div class="info-value">${this.escapeHtml(patient.region || 'N/A')}</div></div>
                        <div class="info-item"><div class="info-label">Wereda/Subcity</div><div class="info-value">${this.escapeHtml(patient.wereda_subcity || 'N/A')}</div></div>
                        <div class="info-item"><div class="info-label">Ketena/Gott</div><div class="info-value">${this.escapeHtml(patient.ketena_gott || 'N/A')}</div></div>
                        <div class="info-item"><div class="info-label">Kebele</div><div class="info-value">${this.escapeHtml(patient.kebele || 'N/A')}</div></div>
                        <div class="info-item"><div class="info-label">House Number</div><div class="info-value">${this.escapeHtml(patient.house_number || 'N/A')}</div></div>
                    </div>
                </div>
                
                <div class="section">
                    <h2>📞 Contact Information</h2>
                    <div class="info-grid">
                        <div class="info-item"><div class="info-label">Phone Number</div><div class="info-value">${patient.phone_number}</div></div>
                        <div class="info-item"><div class="info-label">Emergency Contact</div><div class="info-value">${this.escapeHtml(patient.emergency_name || 'N/A')}</div></div>
                        <div class="info-item"><div class="info-label">Emergency Number</div><div class="info-value">${patient.emergency_number || 'N/A'}</div></div>
                    </div>
                </div>
                
                <div class="footer">
                    <p>Official document — Dr Amin Specialty Dental Clinic</p>
                    <p>Dr Amin Specialty Dental Clinic — Official Medical Record</p>
                </div>
                
                <script>
                    window.print();
                </script>
            </body>
            </html>
        `);
        
        printWindow.document.close();
    }
    
    /**
     * Download patient PDF
     */
    downloadPDF() {
        if (this.patient) {
            printPatientRecord(this.patient);
        }
        this.showToast('Opening print view...', 'info');
    }
    
    /**
     * Share patient information
     */
    sharePatient() {
        const patient = this.patient;
        const shareData = {
            title: `Patient: ${patient.name}`,
            text: `MRN: ${patient.mrn}\nName: ${patient.name}\nPhone: ${patient.phone_number}`,
            url: window.location.href
        };
        
        if (navigator.share) {
            navigator.share(shareData).catch(() => {
                this.showToast('Share cancelled', 'info');
            });
        } else {
            // Fallback - copy to clipboard
            const shareText = `${shareData.title}\n\n${shareData.text}`;
            navigator.clipboard.writeText(shareText);
            this.showToast('Patient info copied to clipboard!', 'success');
        }
    }
    
    /**
     * Delete patient with confirmation
     */
    async deletePatient() {
        const confirmed = confirm(
            '⚠️ WARNING: This action cannot be undone!\n\n' +
            'Are you sure you want to delete this patient?\n' +
            `Patient: ${this.patient.name}\n` +
            `MRN: ${this.patient.mrn}`
        );
        
        if (confirmed) {
            try {
                const data = await patientService.deletePatient(this.patientId);
                
                if (data.success) {
                    this.showToast('Patient deleted successfully', 'success');
                    setTimeout(() => {
                        window.location.hash = 'patients';
                    }, 1500);
                } else {
                    this.showToast('Error deleting patient', 'error');
                }
            } catch (error) {
                console.error('Error deleting patient:', error);
                this.showToast('Error connecting to server', 'error');
            }
        }
    }
    
    /**
     * View patient location on map
     */
    viewOnMap() {
        const address = `${this.patient.address}, ${this.patient.region}, Ethiopia`;
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
        window.open(mapsUrl, '_blank');
    }
    
    /**
     * Export patient as vCard
     */
    exportVCard() {
        const patient = this.patient;
        const vCardData = [
            'BEGIN:VCARD',
            'VERSION:3.0',
            `FN:${patient.name}`,
            `N:${patient.name};;;`,
            `TEL:${patient.phone_number}`,
            `TEL;TYPE=CELL:${patient.phone_number}`,
            `ADR:;;${patient.address};${patient.region};;;Ethiopia`,
            `NOTE:MRN: ${patient.mrn}`,
            `REV:${new Date().toISOString()}`,
            'END:VCARD'
        ].join('\n');
        
        const blob = new Blob([vCardData], { type: 'text/vcard' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${patient.name.replace(/\s/g, '_')}.vcf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('vCard exported successfully', 'success');
    }
    
    /**
     * Open clinical notes tab for new visit note
     */
    addMedicalRecord() {
        if (!this.patient?.canViewClinical) {
            this.showToast('Clinical records require a confirmed doctor assignment', 'info');
            return;
        }
        const section = document.getElementById('clinicalSection');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
            if (this.clinical) {
                document.querySelectorAll('.clinical-tab').forEach((t) => {
                    t.classList.toggle('active', t.dataset.tab === 'notes');
                });
                this.clinical.activeTab = 'notes';
                this.clinical.renderTab();
            }
        }
    }
    
    /**
     * Scroll to clinical history tab
     */
    viewHistory() {
        if (!this.patient?.canViewClinical) {
            this.showToast('Clinical records require a confirmed doctor assignment', 'info');
            return;
        }
        const section = document.getElementById('clinicalSection');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
            if (this.clinical) {
                document.querySelectorAll('.clinical-tab').forEach((t) => {
                    t.classList.toggle('active', t.dataset.tab === 'history');
                });
                this.clinical.activeTab = 'history';
                this.clinical.renderTab();
            }
        }
    }
    
    /**
     * Navigate to appointments to book for this patient
     */
    newAppointment() {
        sessionStorage.setItem('bookAppointmentPatientId', this.patientId);
        window.location.hash = 'appointments';
    }
    
    /**
     * Show error message
     */
    showError(message) {
        const container = document.getElementById('patientDetailContent');
        if (container) {
            container.innerHTML = `
                <div class="error-container">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button class="btn-primary" onclick="window.history.back()">
                        <i class="fas fa-arrow-left"></i> Go Back
                    </button>
                </div>
            `;
        }
    }
    
    /**
     * Show toast notification
     */
    showToast(message, type = 'success') {
        if (window.Toast) {
            window.Toast.show(message, type);
        } else {
            alert(message);
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}