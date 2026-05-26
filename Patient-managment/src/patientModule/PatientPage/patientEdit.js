/**
 * Patient Edit Page Module
 * Handles editing existing patient information with validation
 */

export class PatientEdit {
    constructor(apiUrl, patientId) {
        this.apiUrl = apiUrl;
        this.patientId = patientId;
        this.patient = null;
        this.currentStep = 1;
        this.totalSteps = 3;
    }
    
    /**
     * Render the edit page HTML
     */
    async render() {
        return `
            <div class="edit-container">
                <!-- Header -->
                <div class="edit-header">
                    <div class="header-left">
                        <button class="btn-back" onclick="window.history.back()">
                            <i class="fas fa-arrow-left"></i> Back
                        </button>
                        <h1>
                            <i class="fas fa-edit"></i>
                            Edit Patient Information
                        </h1>
                    </div>
                    <div class="header-right">
                        <span class="patient-mrn" id="patientMrn"></span>
                    </div>
                </div>
                
                <!-- Form Stepper -->
                <div class="form-stepper">
                    <div class="step ${this.currentStep === 1 ? 'active' : ''}" data-step="1">
                        <div class="step-number">1</div>
                        <div class="step-label">Personal Info</div>
                    </div>
                    <div class="step ${this.currentStep === 2 ? 'active' : ''}" data-step="2">
                        <div class="step-number">2</div>
                        <div class="step-label">Address Info</div>
                    </div>
                    <div class="step ${this.currentStep === 3 ? 'active' : ''}" data-step="3">
                        <div class="step-number">3</div>
                        <div class="step-label">Contact Info</div>
                    </div>
                </div>
                
                <!-- Edit Form -->
                <div id="editFormContainer">
                    <div class="loading-container">
                        <div class="loading-spinner"></div>
                        <p>Loading patient data...</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Load patient data from API
     */
    async loadPatientData() {
        try {
            const response = await fetch(`${this.apiUrl}/${this.patientId}`);
            const data = await response.json();
            
            if (data.success && data.data) {
                this.patient = data.data;
                this.displayEditForm();
                this.displayPatientMRN();
            } else {
                this.showError('Patient not found');
            }
        } catch (error) {
            console.error('Error loading patient:', error);
            this.showError('Error loading patient data');
        }
    }
    
    /**
     * Display patient MRN in header
     */
    displayPatientMRN() {
        const mrnSpan = document.getElementById('patientMrn');
        if (mrnSpan && this.patient) {
            mrnSpan.innerHTML = `
                <i class="fas fa-id-card"></i>
                MRN: ${this.patient.mrn}
            `;
        }
    }
    
    /**
     * Display the edit form with patient data
     */
    displayEditForm() {
        const container = document.getElementById('editFormContainer');
        if (!container) return;
        
        const patient = this.patient;
        
        container.innerHTML = `
            <form id="editPatientForm" class="patient-form">
                <!-- Step 1: Personal Information -->
                <div class="form-section" id="step1">
                    <div class="section-title">
                        <i class="fas fa-user-circle"></i>
                        <h2>Personal Information</h2>
                        <span>Step 1 of 3</span>
                    </div>
                    
                    <div class="form-grid">
                        <div class="form-field">
                            <label>
                                MRN Number
                            </label>
                            <input type="text" 
                                   value="${patient.mrn}" 
                                   disabled
                                   class="readonly-field">
                            <div class="field-hint">MRN cannot be changed</div>
                        </div>
                        
                        <div class="form-field">
                            <label>
                                Registration Date
                            </label>
                            <input type="text" 
                                   value="${new Date(patient.registration_date).toLocaleDateString()}" 
                                   disabled
                                   class="readonly-field">
                            <div class="field-hint">Registration date cannot be changed</div>
                        </div>
                        
                        <div class="form-field">
                            <label>
                                Full Name <span class="required-star">*</span>
                            </label>
                            <input type="text" 
                                   id="name" 
                                   value="${this.escapeHtml(patient.name)}"
                                   placeholder="Enter full name"
                                   required>
                            <div class="field-error" id="nameError">Full name is required</div>
                        </div>
                        
                        <div class="form-field">
                            <label>
                                Father's Name <span class="required-star">*</span>
                            </label>
                            <input type="text" 
                                   id="father_name" 
                                   value="${this.escapeHtml(patient.father_name || '')}"
                                   placeholder="Enter father's name"
                                   required>
                            <div class="field-error" id="fatherNameError">Father's name is required</div>
                        </div>
                        
                        <div class="form-field">
                            <label>
                                Grandfather's Name <span class="required-star">*</span>
                            </label>
                            <input type="text" 
                                   id="grandfather_name" 
                                   value="${this.escapeHtml(patient.grandfather_name || '')}"
                                   placeholder="Enter grandfather's name"
                                   required>
                            <div class="field-error" id="grandfatherNameError">Grandfather's name is required</div>
                        </div>
                        
                        <div class="form-field">
                            <label>
                                Gender <span class="required-star">*</span>
                            </label>
                            <select id="gender" required>
                                <option value="">Select Gender</option>
                                <option value="Male" ${patient.gender === 'Male' ? 'selected' : ''}>Male</option>
                                <option value="Female" ${patient.gender === 'Female' ? 'selected' : ''}>Female</option>
                                <option value="Other" ${patient.gender === 'Other' ? 'selected' : ''}>Other</option>
                            </select>
                            <div class="field-error" id="genderError">Gender is required</div>
                        </div>
                        
                        <div class="form-field">
                            <label>
                                Date of Birth <span class="required-star">*</span>
                            </label>
                            <input type="date" 
                                   id="dob" 
                                   value="${patient.dob || ''}"
                                   required>
                            <div class="field-hint">Will auto-calculate age</div>
                            <div class="field-error" id="dobError">Date of birth is required</div>
                        </div>
                        
                        <div class="form-field">
                            <label>
                                Age <span class="required-star">*</span>
                            </label>
                            <input type="number" 
                                   id="age" 
                                   value="${patient.age}"
                                   readonly
                                   class="readonly-field"
                                   required>
                            <div class="field-error" id="ageError">Age is required</div>
                        </div>
                    </div>
                </div>
                
                <!-- Step 2: Address Information -->
                <div class="form-section" id="step2" style="display: none;">
                    <div class="section-title">
                        <i class="fas fa-map-marker-alt"></i>
                        <h2>Address Information</h2>
                        <span>Step 2 of 3</span>
                    </div>
                    
                    <div class="form-grid">
                        <div class="form-field">
                            <label>
                                Address <span class="required-star">*</span>
                            </label>
                            <textarea id="address" 
                                      rows="2"
                                      placeholder="Enter complete address"
                                      required>${this.escapeHtml(patient.address || '')}</textarea>
                            <div class="field-error" id="addressError">Address is required</div>
                        </div>
                        
                        <div class="form-field">
                            <label>
                                Region <span class="required-star">*</span>
                            </label>
                            <select id="region" required>
                                <option value="">Select Region</option>
                                <option value="Addis Ababa" ${patient.region === 'Addis Ababa' ? 'selected' : ''}>Addis Ababa</option>
                                <option value="Oromia" ${patient.region === 'Oromia' ? 'selected' : ''}>Oromia</option>
                                <option value="Amhara" ${patient.region === 'Amhara' ? 'selected' : ''}>Amhara</option>
                                <option value="Tigray" ${patient.region === 'Tigray' ? 'selected' : ''}>Tigray</option>
                                <option value="SNNPR" ${patient.region === 'SNNPR' ? 'selected' : ''}>SNNPR</option>
                                <option value="Somali" ${patient.region === 'Somali' ? 'selected' : ''}>Somali</option>
                                <option value="Harari" ${patient.region === 'Harari' ? 'selected' : ''}>Harari</option>
                                <option value="Dire Dawa" ${patient.region === 'Dire Dawa' ? 'selected' : ''}>Dire Dawa</option>
                            </select>
                            <div class="field-error" id="regionError">Region is required</div>
                        </div>
                        
                        <div class="form-field">
                            <label>
                                Wereda/Subcity <span class="required-star">*</span>
                            </label>
                            <input type="text" 
                                   id="wereda_subcity" 
                                   value="${this.escapeHtml(patient.wereda_subcity || '')}"
                                   placeholder="Enter wereda or subcity"
                                   required>
                            <div class="field-error" id="weredaError">Wereda/Subcity is required</div>
                        </div>
                        
                        <div class="form-field">
                            <label>
                                Ketena/Gott <span class="required-star">*</span>
                            </label>
                            <input type="text" 
                                   id="ketena_gott" 
                                   value="${this.escapeHtml(patient.ketena_gott || '')}"
                                   placeholder="Enter ketena or gott"
                                   required>
                            <div class="field-error" id="ketenaError">Ketena/Gott is required</div>
                        </div>
                        
                        <div class="form-field">
                            <label>
                                Kebele <span class="required-star">*</span>
                            </label>
                            <input type="text" 
                                   id="kebele" 
                                   value="${this.escapeHtml(patient.kebele || '')}"
                                   placeholder="Enter kebele number"
                                   required>
                            <div class="field-error" id="kebeleError">Kebele is required</div>
                        </div>
                        
                        <div class="form-field">
                            <label>
                                House Number
                            </label>
                            <input type="text" 
                                   id="house_number" 
                                   value="${this.escapeHtml(patient.house_number || '')}"
                                   placeholder="Enter house number (optional)">
                            <div class="field-hint">Optional field</div>
                        </div>
                    </div>
                </div>
                
                <!-- Step 3: Contact Information -->
                <div class="form-section" id="step3" style="display: none;">
                    <div class="section-title">
                        <i class="fas fa-phone-alt"></i>
                        <h2>Contact Information</h2>
                        <span>Step 3 of 3</span>
                    </div>
                    
                    <div class="form-grid">
                        <div class="form-field">
                            <label>
                                Phone Number <span class="required-star">*</span>
                            </label>
                            <div class="input-group">
                                <input type="tel" 
                                       id="phone_number" 
                                       value="${patient.phone_number}"
                                       placeholder="09XXXXXXXX"
                                       pattern="[0-9]{10}"
                                       required>
                            </div>
                            <div class="field-hint">Enter 10-digit phone number</div>
                            <div class="field-error" id="phoneError">Valid phone number is required</div>
                        </div>
                        
                        <div class="form-field">
                            <label>
                                Emergency Contact Name <span class="required-star">*</span>
                            </label>
                            <input type="text" 
                                   id="emergency_name" 
                                   value="${this.escapeHtml(patient.emergency_name || '')}"
                                   placeholder="Enter emergency contact name"
                                   required>
                            <div class="field-error" id="emergencyNameError">Emergency contact name is required</div>
                        </div>
                        
                        <div class="form-field">
                            <label>
                                Emergency Contact Number <span class="required-star">*</span>
                            </label>
                            <input type="tel" 
                                   id="emergency_number" 
                                   value="${patient.emergency_number || ''}"
                                   placeholder="09XXXXXXXX"
                                   pattern="[0-9]{10}"
                                   required>
                            <div class="field-hint">Enter 10-digit emergency number</div>
                            <div class="field-error" id="emergencyNumberError">Emergency number is required</div>
                        </div>
                    </div>
                </div>
                
                <!-- Form Actions -->
                <div class="form-actions">
                    <button type="button" class="btn-secondary" id="prevBtn" style="display: none;">
                        <i class="fas fa-arrow-left"></i> Previous
                    </button>
                    <button type="button" class="btn-primary" id="nextBtn">
                        Next <i class="fas fa-arrow-right"></i>
                    </button>
                    <button type="submit" class="btn-success" id="submitBtn" style="display: none;">
                        <i class="fas fa-save"></i> Update Patient
                    </button>
                    <button type="button" class="btn-danger" id="cancelBtn">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </form>
        `;
        
        this.setupFormEvents();
        this.setupAgeCalculation();
        this.setupPhoneValidation();
        this.updateStepper();
        this.updateButtons();
    }
    
    /**
     * Setup form events
     */
    setupFormEvents() {
        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');
        const submitBtn = document.getElementById('submitBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const form = document.getElementById('editPatientForm');
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextStep());
        }
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.prevStep());
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cancelEdit());
        }
        
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }
    
    /**
     * Setup age calculation from DOB
     */
    setupAgeCalculation() {
        const dobInput = document.getElementById('dob');
        const ageInput = document.getElementById('age');
        
        if (dobInput && ageInput) {
            dobInput.addEventListener('change', () => {
                const dob = new Date(dobInput.value);
                const today = new Date();
                
                if (dobInput.value && !isNaN(dob.getTime())) {
                    let age = today.getFullYear() - dob.getFullYear();
                    const monthDiff = today.getMonth() - dob.getMonth();
                    
                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                        age--;
                    }
                    
                    if (age >= 0 && age <= 150) {
                        ageInput.value = age;
                        this.removeError('ageError');
                    } else {
                        ageInput.value = '';
                        this.showError('ageError', 'Invalid age');
                    }
                }
            });
        }
    }
    
    /**
     * Setup phone validation
     */
    setupPhoneValidation() {
        const phoneInput = document.getElementById('phone_number');
        const emergencyPhoneInput = document.getElementById('emergency_number');
        
        const validatePhone = (input, errorId) => {
            const value = input.value;
            const phoneRegex = /^[0-9]{10}$/;
            
            if (value && !phoneRegex.test(value)) {
                this.showError(errorId, 'Phone number must be 10 digits');
                return false;
            } else {
                this.removeError(errorId);
                return true;
            }
        };
        
        if (phoneInput) {
            phoneInput.addEventListener('input', () => validatePhone(phoneInput, 'phoneError'));
            phoneInput.addEventListener('blur', () => validatePhone(phoneInput, 'phoneError'));
        }
        
        if (emergencyPhoneInput) {
            emergencyPhoneInput.addEventListener('input', () => validatePhone(emergencyPhoneInput, 'emergencyNumberError'));
            emergencyPhoneInput.addEventListener('blur', () => validatePhone(emergencyPhoneInput, 'emergencyNumberError'));
        }
    }
    
    /**
     * Go to next step
     */
    nextStep() {
        if (this.validateCurrentStep()) {
            if (this.currentStep < this.totalSteps) {
                // Hide current step
                document.getElementById(`step${this.currentStep}`).style.display = 'none';
                
                // Move to next step
                this.currentStep++;
                
                // Show next step
                document.getElementById(`step${this.currentStep}`).style.display = 'block';
                
                // Update stepper
                this.updateStepper();
                
                // Update buttons
                this.updateButtons();
                
                // Scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    }
    
    /**
     * Go to previous step
     */
    prevStep() {
        if (this.currentStep > 1) {
            // Hide current step
            document.getElementById(`step${this.currentStep}`).style.display = 'none';
            
            // Move to previous step
            this.currentStep--;
            
            // Show previous step
            document.getElementById(`step${this.currentStep}`).style.display = 'block';
            
            // Update stepper
            this.updateStepper();
            
            // Update buttons
            this.updateButtons();
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
    
    /**
     * Update stepper UI
     */
    updateStepper() {
        const steps = document.querySelectorAll('.step');
        steps.forEach((step, index) => {
            const stepNum = index + 1;
            step.classList.remove('active', 'completed');
            
            if (stepNum === this.currentStep) {
                step.classList.add('active');
            } else if (stepNum < this.currentStep) {
                step.classList.add('completed');
            }
        });
    }
    
    /**
     * Update navigation buttons
     */
    updateButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const submitBtn = document.getElementById('submitBtn');
        
        if (prevBtn) {
            prevBtn.style.display = this.currentStep === 1 ? 'none' : 'inline-flex';
        }
        
        if (nextBtn && submitBtn) {
            if (this.currentStep === this.totalSteps) {
                nextBtn.style.display = 'none';
                submitBtn.style.display = 'inline-flex';
            } else {
                nextBtn.style.display = 'inline-flex';
                submitBtn.style.display = 'none';
            }
        }
    }
    
    /**
     * Validate current step inputs
     */
    validateCurrentStep() {
        let isValid = true;
        
        if (this.currentStep === 1) {
            const name = document.getElementById('name')?.value.trim();
            const fatherName = document.getElementById('father_name')?.value.trim();
            const grandfatherName = document.getElementById('grandfather_name')?.value.trim();
            const gender = document.getElementById('gender')?.value;
            const dob = document.getElementById('dob')?.value;
            const age = document.getElementById('age')?.value;
            
            if (!name) {
                this.showError('nameError', 'Full name is required');
                isValid = false;
            } else {
                this.removeError('nameError');
            }
            
            if (!fatherName) {
                this.showError('fatherNameError', "Father's name is required");
                isValid = false;
            } else {
                this.removeError('fatherNameError');
            }
            
            if (!grandfatherName) {
                this.showError('grandfatherNameError', "Grandfather's name is required");
                isValid = false;
            } else {
                this.removeError('grandfatherNameError');
            }
            
            if (!gender) {
                this.showError('genderError', 'Gender is required');
                isValid = false;
            } else {
                this.removeError('genderError');
            }
            
            if (!dob) {
                this.showError('dobError', 'Date of birth is required');
                isValid = false;
            } else {
                this.removeError('dobError');
            }
            
            if (!age || age <= 0) {
                this.showError('ageError', 'Valid age is required');
                isValid = false;
            } else {
                this.removeError('ageError');
            }
        }
        
        if (this.currentStep === 2) {
            const address = document.getElementById('address')?.value.trim();
            const region = document.getElementById('region')?.value;
            const wereda = document.getElementById('wereda_subcity')?.value.trim();
            const ketena = document.getElementById('ketena_gott')?.value.trim();
            const kebele = document.getElementById('kebele')?.value.trim();
            
            if (!address) {
                this.showError('addressError', 'Address is required');
                isValid = false;
            } else {
                this.removeError('addressError');
            }
            
            if (!region) {
                this.showError('regionError', 'Region is required');
                isValid = false;
            } else {
                this.removeError('regionError');
            }
            
            if (!wereda) {
                this.showError('weredaError', 'Wereda/Subcity is required');
                isValid = false;
            } else {
                this.removeError('weredaError');
            }
            
            if (!ketena) {
                this.showError('ketenaError', 'Ketena/Gott is required');
                isValid = false;
            } else {
                this.removeError('ketenaError');
            }
            
            if (!kebele) {
                this.showError('kebeleError', 'Kebele is required');
                isValid = false;
            } else {
                this.removeError('kebeleError');
            }
        }
        
        if (this.currentStep === 3) {
            const phone = document.getElementById('phone_number')?.value.trim();
            const emergencyName = document.getElementById('emergency_name')?.value.trim();
            const emergencyNumber = document.getElementById('emergency_number')?.value.trim();
            const phoneRegex = /^[0-9]{10}$/;
            
            if (!phone) {
                this.showError('phoneError', 'Phone number is required');
                isValid = false;
            } else if (!phoneRegex.test(phone)) {
                this.showError('phoneError', 'Phone number must be 10 digits');
                isValid = false;
            } else {
                this.removeError('phoneError');
            }
            
            if (!emergencyName) {
                this.showError('emergencyNameError', 'Emergency contact name is required');
                isValid = false;
            } else {
                this.removeError('emergencyNameError');
            }
            
            if (!emergencyNumber) {
                this.showError('emergencyNumberError', 'Emergency number is required');
                isValid = false;
            } else if (!phoneRegex.test(emergencyNumber)) {
                this.showError('emergencyNumberError', 'Emergency number must be 10 digits');
                isValid = false;
            } else {
                this.removeError('emergencyNumberError');
            }
        }
        
        return isValid;
    }
    
    /**
     * Show error message
     */
    showError(errorId, message) {
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
            
            const inputId = errorId.replace('Error', '');
            const inputElement = document.getElementById(inputId);
            if (inputElement) {
                inputElement.classList.add('error');
            }
        }
    }
    
    /**
     * Remove error message
     */
    removeError(errorId) {
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
            errorElement.classList.remove('show');
            
            const inputId = errorId.replace('Error', '');
            const inputElement = document.getElementById(inputId);
            if (inputElement) {
                inputElement.classList.remove('error');
            }
        }
    }
    
    /**
     * Handle form submission
     */
    async handleSubmit(e) {
        e.preventDefault();
        
        // Validate all steps
        let isValid = true;
        for (let step = 1; step <= 3; step++) {
            this.currentStep = step;
            if (!this.validateCurrentStep()) {
                isValid = false;
                this.currentStep = step;
                this.updateStepper();
                this.updateButtons();
                
                // Show the step with error
                for (let i = 1; i <= 3; i++) {
                    document.getElementById(`step${i}`).style.display = i === step ? 'block' : 'none';
                }
                
                this.showToast(`Please complete Step ${step} correctly`, 'warning');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                break;
            }
        }
        
        if (isValid) {
            await this.updatePatient();
        }
    }
    
    /**
     * Update patient data
     */
    async updatePatient() {
        const formData = {
            name: document.getElementById('name').value.trim(),
            father_name: document.getElementById('father_name').value.trim(),
            grandfather_name: document.getElementById('grandfather_name').value.trim(),
            gender: document.getElementById('gender').value,
            dob: document.getElementById('dob').value,
            age: parseInt(document.getElementById('age').value),
            address: document.getElementById('address').value.trim(),
            region: document.getElementById('region').value,
            wereda_subcity: document.getElementById('wereda_subcity').value.trim(),
            ketena_gott: document.getElementById('ketena_gott').value.trim(),
            kebele: document.getElementById('kebele').value.trim(),
            house_number: document.getElementById('house_number').value.trim(),
            phone_number: document.getElementById('phone_number').value.trim(),
            emergency_name: document.getElementById('emergency_name').value.trim(),
            emergency_number: document.getElementById('emergency_number').value.trim()
        };
        
        // Show loading state
        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch(`${this.apiUrl}/${this.patientId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccessModal();
            } else {
                this.showToast(data.error || 'Error updating patient', 'error');
            }
        } catch (error) {
            console.error('Error updating patient:', error);
            this.showToast('Error connecting to server', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
    
    /**
     * Show success modal after update
     */
    showSuccessModal() {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        
        modalOverlay.innerHTML = `
            <div class="success-modal">
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3>Patient Updated Successfully!</h3>
                <p>The patient information has been updated.</p>
                <div class="patient-summary">
                    <div class="summary-item">
                        <i class="fas fa-user"></i>
                        <strong>${this.escapeHtml(document.getElementById('name').value)}</strong>
                    </div>
                    <div class="summary-item">
                        <i class="fas fa-id-card"></i>
                        <span>${this.patient.mrn}</span>
                    </div>
                </div>
                <div class="modal-buttons">
                    <button class="modal-btn primary" id="viewPatientBtn">
                        <i class="fas fa-eye"></i> View Patient
                    </button>
                    <button class="modal-btn secondary" id="stayHereBtn">
                        <i class="fas fa-edit"></i> Continue Editing
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modalOverlay);
        
        const viewBtn = document.getElementById('viewPatientBtn');
        const stayBtn = document.getElementById('stayHereBtn');
        
        if (viewBtn) {
            viewBtn.addEventListener('click', () => {
                modalOverlay.remove();
                window.location.hash = `patient/${this.patientId}`;
            });
        }
        
        if (stayBtn) {
            stayBtn.addEventListener('click', () => {
                modalOverlay.remove();
                this.showToast('Changes saved successfully', 'success');
            });
        }
        
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.remove();
            }
        });
    }
    
    /**
     * Cancel edit and go back
     */
    cancelEdit() {
        if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
            window.location.hash = `patient/${this.patientId}`;
        }
    }
    
    /**
     * Show error message
     */
    showError(message) {
        const container = document.getElementById('editFormContainer');
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