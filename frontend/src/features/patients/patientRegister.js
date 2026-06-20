/**
 * Patient Registration Page Module
 * Handles new patient registration with form validation and submission
 */

import { patientService } from '../../services/patientService.js';
import { bindAgeDobSync, ensureAgeDobFilled } from '../../utils/patientAgeDob.js';

export class PatientRegister {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 3;
        this.formData = {};
    }
    
    /**
     * Render the registration page HTML
     */
    async render() {
        return `
            <div class="register-container" data-testid="register-page">
                <!-- Header -->
                <div class="register-header">
                    <h1>
                        <i class="fas fa-user-plus"></i>
                        Register New Patient
                    </h1>
                    <p>
                        <i class="fas fa-info-circle"></i>
                        Please fill in all required fields (*) to register a new patient
                    </p>
                </div>
                
                <!-- Form Stepper -->
                <div class="form-stepper">
                    <div class="step ${this.currentStep === 1 ? 'active' : ''} ${this.currentStep > 1 ? 'completed' : ''}" data-step="1">
                        <div class="step-number">1</div>
                        <div class="step-label">Personal Info</div>
                    </div>
                    <div class="step ${this.currentStep === 2 ? 'active' : ''} ${this.currentStep > 2 ? 'completed' : ''}" data-step="2">
                        <div class="step-number">2</div>
                        <div class="step-label">Address Info</div>
                    </div>
                    <div class="step ${this.currentStep === 3 ? 'active' : ''} ${this.currentStep > 3 ? 'completed' : ''}" data-step="3">
                        <div class="step-number">3</div>
                        <div class="step-label">Contact Info</div>
                    </div>
                </div>
                
                <!-- Registration Form -->
                <form id="patientRegistrationForm" class="patient-form">
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
                                    Full Name <span class="required-star">*</span>
                                </label>
                                <input type="text" 
                                       id="name" 
                                       name="name" 
                                       placeholder="Enter full name"
                                       autocomplete="off"
                                       required>
                                <div class="field-hint">Enter patient's complete name</div>
                                <div class="field-error" id="nameError">Full name is required</div>
                            </div>
                            
                            <div class="form-field">
                                <label>
                                    Father's Name <span class="required-star">*</span>
                                </label>
                                <input type="text" 
                                       id="father_name" 
                                       name="father_name" 
                                       placeholder="Enter father's name"
                                       autocomplete="off"
                                       required>
                                <div class="field-error" id="fatherNameError">Father's name is required</div>
                            </div>
                            
                            <div class="form-field">
                                <label>
                                    Grandfather's Name <span class="required-star">*</span>
                                </label>
                                <input type="text" 
                                       id="grandfather_name" 
                                       name="grandfather_name" 
                                       placeholder="Enter grandfather's name"
                                       autocomplete="off"
                                       required>
                                <div class="field-error" id="grandfatherNameError">Grandfather's name is required</div>
                            </div>
                            
                            <div class="form-field">
                                <label>
                                    Gender <span class="required-star">*</span>
                                </label>
                                <select id="gender" name="gender" required>
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                                <div class="field-error" id="genderError">Gender is required</div>
                            </div>
                            
                            <div class="form-field">
                                <label>
                                    Date of Birth <span class="required-star">*</span>
                                </label>
                                <input type="date" 
                                       id="dob" 
                                       name="dob">
                                <div class="field-hint">Will auto-calculate age, or enter age below</div>
                                <div class="field-error" id="dobError">Date of birth or age is required</div>
                            </div>
                            
                            <div class="form-field">
                                <label>
                                    Age <span class="required-star">*</span>
                                </label>
                                <input type="number" 
                                       id="age" 
                                       name="age" 
                                       min="0"
                                       max="150"
                                       placeholder="Enter age or use date of birth">
                                <div class="field-hint">Enter age or date of birth — the other updates automatically</div>
                                <div class="field-error" id="ageError">Date of birth or age is required</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Step 2: Address Information -->
                    <div class="form-section" id="step2" style="display: none;">
                        <div class="section-title">
                            <i class="fas fa-map-marker-alt"></i>
                            <h2>Address Information</h2>
                            <span>Recommended</span>
                        </div>
                        
                        <div class="form-grid">
                            <div class="form-field">
                                <label>Address</label>
                                <textarea id="address" 
                                          name="address" 
                                          rows="2"
                                          placeholder="Enter complete address (recommended)"></textarea>
                                <div class="field-hint">Optional but recommended</div>
                            </div>
                            
                            <div class="form-field">
                                <label>Region</label>
                                <select id="region" name="region">
                                    <option value="">Select Region</option>
                                    <option value="Addis Ababa">Addis Ababa</option>
                                    <option value="Oromia">Oromia</option>
                                    <option value="Amhara">Amhara</option>
                                    <option value="Tigray">Tigray</option>
                                    <option value="SNNPR">SNNPR</option>
                                    <option value="Somali">Somali</option>
                                    <option value="Harari">Harari</option>
                                    <option value="Dire Dawa">Dire Dawa</option>
                                </select>
                                <div class="field-hint">Optional but recommended</div>
                            </div>
                            
                            <div class="form-field">
                                <label>Wereda/Subcity</label>
                                <input type="text" 
                                       id="wereda_subcity" 
                                       name="wereda_subcity" 
                                       placeholder="Enter wereda or subcity">
                                <div class="field-hint">Optional but recommended</div>
                            </div>
                            
                            <div class="form-field">
                                <label>Ketena/Gott</label>
                                <input type="text" 
                                       id="ketena_gott" 
                                       name="ketena_gott" 
                                       placeholder="Enter ketena or gott">
                                <div class="field-hint">Optional but recommended</div>
                            </div>
                            
                            <div class="form-field">
                                <label>Kebele</label>
                                <input type="text" 
                                       id="kebele" 
                                       name="kebele" 
                                       placeholder="Enter kebele number">
                                <div class="field-hint">Optional but recommended</div>
                            </div>
                            
                            <div class="form-field">
                                <label>
                                    House Number
                                </label>
                                <input type="text" 
                                       id="house_number" 
                                       name="house_number" 
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
                                           name="phone_number" 
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
                                       name="emergency_name" 
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
                                       name="emergency_number" 
                                       placeholder="09XXXXXXXX"
                                       pattern="[0-9]{10}"
                                       required>
                                <div class="field-hint">Enter 10-digit emergency number</div>
                                <div class="field-error" id="emergencyNumberError">Emergency number is required</div>
                            </div>
                        </div>

                        <div class="dental-fields-section">
                            <div class="section-title subsection-title">
                                <i class="fas fa-tooth"></i>
                                <h2>Dental Information</h2>
                                <span>Optional</span>
                            </div>
                            <div class="form-grid">
                                <div class="form-field">
                                    <label>Insurance Plan</label>
                                    <input type="text" id="insurance_plan" placeholder="Plan name (optional)">
                                </div>
                                <div class="form-field">
                                    <label>Member ID</label>
                                    <input type="text" id="insurance_member_id" placeholder="Insurance member ID">
                                </div>
                                <div class="form-field">
                                    <label>Referred By</label>
                                    <input type="text" id="referred_by" placeholder="Referring doctor or patient">
                                </div>
                                <div class="form-field">
                                    <label>Last Dental Visit</label>
                                    <input type="date" id="last_dental_visit">
                                </div>
                                <div class="form-field">
                                    <label>Recall Due Date</label>
                                    <input type="date" id="recall_due">
                                </div>
                                <div class="form-field full-width">
                                    <label>Chief Complaint</label>
                                    <textarea id="chief_complaint" rows="2" placeholder="Reason for visit"></textarea>
                                </div>
                                <div class="form-field full-width">
                                    <label>Allergies</label>
                                    <textarea id="allergies" rows="2" placeholder="e.g. latex, penicillin, anesthesia"></textarea>
                                </div>
                                <div class="form-field full-width">
                                    <label>Current Medications</label>
                                    <textarea id="medications" rows="2" placeholder="List current medications"></textarea>
                                </div>
                                <div class="form-field full-width">
                                    <label>Medical Conditions</label>
                                    <textarea id="medical_conditions" rows="2" placeholder="e.g. diabetes, heart condition"></textarea>
                                </div>
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
                        <button type="submit" class="btn-primary" id="submitBtn" style="display: none;">
                            <i class="fas fa-save"></i> Register Patient
                        </button>
                        <button type="button" class="btn-reset" id="resetBtn">
                            <i class="fas fa-undo-alt"></i> Reset
                        </button>
                    </div>
                </form>
            </div>
        `;
    }
    
    /**
     * Initialize the registration form
     */
    initForm() {
        this.setupEventListeners();
        this.setupAgeCalculation();
        this.setupPhoneValidation();
    }
    
    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');
        const submitBtn = document.getElementById('submitBtn');
        const resetBtn = document.getElementById('resetBtn');
        const form = document.getElementById('patientRegistrationForm');
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextStep());
        }
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.prevStep());
        }
        
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetForm());
        }
        
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }
    
    /**
     * Setup age calculation from DOB
     */
    setupAgeCalculation() {
        bindAgeDobSync(
            document.getElementById('dob'),
            document.getElementById('age'),
            {
                onSync: (source) => {
                    if (source === 'dob') this.removeError('ageError');
                    if (source === 'age') this.removeError('dobError');
                }
            }
        );
    }
    
    /**
     * Setup phone number validation
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
                // Save current step data
                this.saveCurrentStepData();
                
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
            // Validate personal information
            const name = document.getElementById('name')?.value.trim();
            const fatherName = document.getElementById('father_name')?.value.trim();
            const grandfatherName = document.getElementById('grandfather_name')?.value.trim();
            const gender = document.getElementById('gender')?.value;
            
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
            
            const dobInput = document.getElementById('dob');
            const ageInput = document.getElementById('age');
            const { dob, age } = ensureAgeDobFilled(dobInput, ageInput);

            if (!dob && !age) {
                this.showError('dobError', 'Enter date of birth or age');
                this.showError('ageError', 'Enter date of birth or age');
                isValid = false;
            } else if (!dob || !age) {
                this.showError('dobError', 'Could not determine date of birth and age');
                isValid = false;
            } else {
                this.removeError('dobError');
                this.removeError('ageError');
            }
        }

        if (this.currentStep === 2) {
            // Address fields are optional (recommended only)
        }
        
        if (this.currentStep === 3) {
            // Validate contact information
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
     * Save current step data
     */
    saveCurrentStepData() {
        // Data is already in form inputs, no need to save separately
        // This method can be extended if needed
    }
    
    /**
     * Show error message for a field
     */
    showError(errorId, message) {
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
            
            // Add error class to the input
            const inputId = errorId.replace('Error', '');
            const inputElement = document.getElementById(inputId);
            if (inputElement) {
                inputElement.classList.add('error');
            }
        }
    }
    
    /**
     * Remove error message from a field
     */
    removeError(errorId) {
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
            errorElement.classList.remove('show');
            
            // Remove error class from the input
            const inputId = errorId.replace('Error', '');
            const inputElement = document.getElementById(inputId);
            if (inputElement) {
                inputElement.classList.remove('error');
            }
        }
    }
    
    /**
     * Reset the entire form
     */
    resetForm() {
        const confirmed = confirm('Are you sure you want to reset the form? All entered data will be lost.');
        
        if (confirmed) {
            // Reset all form fields
            const form = document.getElementById('patientRegistrationForm');
            if (form) {
                form.reset();
            }
            
            // Clear all errors
            const errors = document.querySelectorAll('.field-error');
            errors.forEach(error => error.classList.remove('show'));
            
            const errorInputs = document.querySelectorAll('.error');
            errorInputs.forEach(input => input.classList.remove('error'));
            
            // Reset to first step
            document.getElementById('step1').style.display = 'block';
            document.getElementById('step2').style.display = 'none';
            document.getElementById('step3').style.display = 'none';
            
            this.currentStep = 1;
            this.updateStepper();
            this.updateButtons();
            
            this.showToast('Form has been reset', 'info');
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
            await this.submitForm();
        }
    }
    
    /**
     * Warn if a similar patient already exists
     */
    async checkDuplicatePatient(formData) {
        try {
            const res = await patientService.checkDuplicates({
                phone: formData.phone_number,
                name: formData.name,
                father_name: formData.father_name,
                dob: formData.dob
            });
            const matches = res.data || [];
            if (matches.length === 0) return true;

            const reasons = {
                phone: 'same phone number',
                name_father: 'same name and father\'s name',
                name_dob: 'same name and date of birth',
                mrn: 'same MRN',
                dob: 'same date of birth'
            };
            const list = matches.map((m) => `• ${m.name} (${m.mrn}) — ${reasons[m.matchReason] || m.matchReason}`).join('\n');
            const proceed = confirm(`Possible duplicate patient(s) found:\n\n${list}\n\nRegister anyway?`);
            return proceed;
        } catch {
            return true;
        }
    }

    /**
     * Submit the form to API
     */
    async submitForm() {
        if (this._submitting) return;
        this._submitting = true;

        // Collect all form data
        ensureAgeDobFilled(document.getElementById('dob'), document.getElementById('age'));

        const formData = {
            name: document.getElementById('name').value.trim(),
            father_name: document.getElementById('father_name').value.trim(),
            grandfather_name: document.getElementById('grandfather_name').value.trim(),
            gender: document.getElementById('gender').value,
            dob: document.getElementById('dob').value,
            age: parseInt(document.getElementById('age').value, 10),
            address: document.getElementById('address').value.trim() || '',
            region: document.getElementById('region').value || '',
            wereda_subcity: document.getElementById('wereda_subcity').value.trim() || '',
            ketena_gott: document.getElementById('ketena_gott').value.trim() || '',
            kebele: document.getElementById('kebele').value.trim() || '',
            house_number: document.getElementById('house_number').value.trim() || '',
            phone_number: document.getElementById('phone_number').value.trim(),
            emergency_name: document.getElementById('emergency_name').value.trim(),
            emergency_number: document.getElementById('emergency_number').value.trim(),
            insurance_plan: document.getElementById('insurance_plan')?.value.trim() || '',
            insurance_member_id: document.getElementById('insurance_member_id')?.value.trim() || '',
            referred_by: document.getElementById('referred_by')?.value.trim() || '',
            last_dental_visit: document.getElementById('last_dental_visit')?.value || '',
            recall_due: document.getElementById('recall_due')?.value || '',
            chief_complaint: document.getElementById('chief_complaint')?.value.trim() || '',
            allergies: document.getElementById('allergies')?.value.trim() || '',
            medications: document.getElementById('medications')?.value.trim() || '',
            medical_conditions: document.getElementById('medical_conditions')?.value.trim() || ''
        };
        
        // Show loading state on submit button
        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
        submitBtn.disabled = true;
        
        try {
            const dup = await this.checkDuplicatePatient(formData);
            if (dup === false) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                this._submitting = false;
                return;
            }

            const data = await patientService.createPatient(formData);
            
            if (data.success) {
                this.showSuccessModal(data.data.mrn);
                this.resetForm();
            } else {
                this.showToast(data.error || 'Error registering patient', 'error');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            this.showToast('Error connecting to server. Please try again.', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            this._submitting = false;
        }
    }
    
    /**
     * Show success modal with MRN
     */
    showSuccessModal(mrn) {
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        
        modalOverlay.innerHTML = `
            <div class="success-modal">
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3>Patient Registered Successfully!</h3>
                <p>Patient has been registered in the system.</p>
                <div class="mrn-display">
                    <strong>MRN Number:</strong><br>
                    <span>${mrn}</span>
                </div>
                <p class="info-text">Please save this MRN for future reference.</p>
                <div class="modal-buttons">
                    <button class="modal-btn primary" id="modalOkBtn">OK</button>
                    <button class="modal-btn secondary" id="modalPrintBtn">
                        <i class="fas fa-print"></i> Print Card
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modalOverlay);
        
        // Handle modal buttons
        const okBtn = document.getElementById('modalOkBtn');
        const printBtn = document.getElementById('modalPrintBtn');
        
        if (okBtn) {
            okBtn.addEventListener('click', () => {
                modalOverlay.remove();
                this.showToast('Patient registered successfully!', 'success');
            });
        }
        
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                this.printPatientCard(mrn);
                modalOverlay.remove();
            });
        }
        
        // Close on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.remove();
            }
        });
    }
    
    /**
     * Print patient registration card
     */
    printPatientCard(mrn) {
        const patientData = {
            name: document.getElementById('name').value,
            mrn: mrn,
            phone: document.getElementById('phone_number').value,
            registrationDate: new Date().toLocaleDateString()
        };
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Patient Registration Card</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        background: #f0f0f0;
                        padding: 20px;
                    }
                    .card {
                        width: 400px;
                        background: linear-gradient(135deg, #0891b2 0%, #0d9488 100%);
                        border-radius: 15px;
                        padding: 30px;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                        color: white;
                    }
                    .card-header {
                        text-align: center;
                        margin-bottom: 25px;
                        border-bottom: 2px solid rgba(255,255,255,0.3);
                        padding-bottom: 15px;
                    }
                    .card-header h2 {
                        font-size: 24px;
                        margin-bottom: 5px;
                    }
                    .card-header p {
                        font-size: 12px;
                        opacity: 0.9;
                    }
                    .card-body {
                        margin-bottom: 25px;
                    }
                    .info-row {
                        margin-bottom: 15px;
                        padding: 8px;
                        background: rgba(255,255,255,0.1);
                        border-radius: 8px;
                    }
                    .info-label {
                        font-size: 11px;
                        opacity: 0.8;
                        margin-bottom: 3px;
                    }
                    .info-value {
                        font-size: 16px;
                        font-weight: bold;
                    }
                    .mrn-code {
                        text-align: center;
                        margin: 20px 0;
                        padding: 15px;
                        background: rgba(255,255,255,0.2);
                        border-radius: 10px;
                    }
                    .mrn-code .label {
                        font-size: 10px;
                        letter-spacing: 1px;
                    }
                    .mrn-code .code {
                        font-size: 20px;
                        font-weight: bold;
                        letter-spacing: 2px;
                    }
                    .card-footer {
                        text-align: center;
                        font-size: 10px;
                        opacity: 0.7;
                        margin-top: 20px;
                        padding-top: 15px;
                        border-top: 1px solid rgba(255,255,255,0.3);
                    }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="card-header">
                        <h2>🏥 Patient ID Card</h2>
                        <p>Dr Amin Specialty Dental Clinic</p>
                    </div>
                    <div class="card-body">
                        <div class="mrn-code">
                            <div class="label">MEDICAL RECORD NUMBER</div>
                            <div class="code">${mrn}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Patient Name</div>
                            <div class="info-value">${this.escapeHtml(patientData.name)}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Phone Number</div>
                            <div class="info-value">${patientData.phone}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Registration Date</div>
                            <div class="info-value">${patientData.registrationDate}</div>
                        </div>
                    </div>
                    <div class="card-footer">
                        This card is issued by Dr Amin Specialty Dental Clinic
                    </div>
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