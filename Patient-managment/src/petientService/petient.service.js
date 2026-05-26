const API_BASE_URL = 'http://localhost:3000/api';

export class PatientService {
    static async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
            ...options,
        };
        
        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }
        
        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
    
    // Patient operations
    static async registerPatient(patientData) {
        return this.request('/patients', { method: 'POST', body: patientData });
    }
    
    static async getAllPatients() {
        return this.request('/patients');
    }
    
    static async getPatientById(id) {
        return this.request(`/patients/${id}`);
    }
    
    static async updatePatient(id, patientData) {
        return this.request(`/patients/${id}`, { method: 'PUT', body: patientData });
    }
    
    static async deletePatient(id) {
        return this.request(`/patients/${id}`, { method: 'DELETE' });
    }
    
    static async searchPatients(searchTerm) {
        return this.request(`/patients/search?q=${encodeURIComponent(searchTerm)}`);
    }
    
    // Appointment operations
    static async createAppointment(appointmentData) {
        return this.request('/appointments', { method: 'POST', body: appointmentData });
    }
    
    static async getAllAppointments() {
        return this.request('/appointments');
    }
    
    static async getTodayAppointments() {
        return this.request('/appointments/today');
    }
    
    static async updateAppointmentStatus(id, status) {
        return this.request('/appointments/status', { method: 'PUT', body: { id, status } });
    }
    
    static async deleteAppointment(id) {
        return this.request(`/appointments/${id}`, { method: 'DELETE' });
    }
    
    // Prescription operations
    static async createPrescription(data) {
        return this.request('/prescriptions', { method: 'POST', body: data });
    }
    
    static async getPatientPrescriptions(patientId) {
        return this.request(`/prescriptions/patient/${patientId}`);
    }
    
    static async getAllPrescriptions() {
        return this.request('/prescriptions');
    }
    
    // Invoice operations
    static async createInvoice(data) {
        return this.request('/invoices', { method: 'POST', body: data });
    }
    
    static async getAllInvoices() {
        return this.request('/invoices');
    }
    
    static async makePayment(invoiceId, amount) {
        return this.request('/invoices/payment', { method: 'POST', body: { id: invoiceId, amount } });
    }
    
    // Vital signs operations
    static async addVitalSigns(vitalsData) {
        return this.request('/vitals', { method: 'POST', body: vitalsData });
    }
    
    static async getPatientVitals(patientId) {
        return this.request(`/vitals/patient/${patientId}`);
    }
    
    // Dashboard
    static async getDashboardStats() {
        return this.request('/dashboard/stats');
    }
}