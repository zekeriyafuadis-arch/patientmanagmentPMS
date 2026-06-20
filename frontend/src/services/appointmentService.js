import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from './apiClient.js';

export const APPOINTMENT_TYPES = [
  { value: 'checkup', label: 'Checkup' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'filling', label: 'Filling' },
  { value: 'extraction', label: 'Extraction' },
  { value: 'root_canal', label: 'Root Canal' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'other', label: 'Other' }
];

export const APPOINTMENT_STATUSES = [
  { value: 'pending_doctor', label: 'Awaiting Doctor', color: '#ed8936' },
  { value: 'scheduled', label: 'Scheduled', color: '#4299e1' },
  { value: 'confirmed', label: 'Confirmed', color: '#48bb78' },
  { value: 'in_chair', label: 'In Chair', color: '#ed8936' },
  { value: 'completed', label: 'Completed', color: '#718096' },
  { value: 'no_show', label: 'No Show', color: '#f56565' },
  { value: 'cancelled', label: 'Cancelled', color: '#a0aec0' }
];

export function getStatusMeta(status) {
  return APPOINTMENT_STATUSES.find((s) => s.value === status) || APPOINTMENT_STATUSES[0];
}

export function getTypeLabel(type) {
  return APPOINTMENT_TYPES.find((t) => t.value === type)?.label || type;
}

export const appointmentService = {
  async getAll() {
    const res = await apiGet('/appointments');
    return res.data;
  },

  async getByDate(date) {
    const d = date instanceof Date ? date.toISOString().slice(0, 10) : date;
    const res = await apiGet(`/appointments?date=${d}`);
    return res.data;
  },

  async getByDateRange(startDate, endDate) {
    const res = await apiGet(`/appointments?start=${startDate.toISOString()}&end=${endDate.toISOString()}`);
    return res.data;
  },

  async getToday() {
    return this.getByDate(new Date());
  },

  async getByPatient(patientId) {
    const all = await this.getAll();
    return all.filter((a) => a.patientId === String(patientId));
  },

  async getById(id) {
    const res = await apiGet(`/appointments/${id}`);
    return res.data;
  },

  async create(data) {
    const res = await apiPost('/appointments', {
      ...data,
      datetime: data.datetime instanceof Date ? data.datetime.toISOString() : data.datetime
    });
    return res.data;
  },

  async update(id, data) {
    const payload = { ...data };
    if (payload.datetime instanceof Date) payload.datetime = payload.datetime.toISOString();
    await apiPut(`/appointments/${id}`, payload);
    return { id: String(id) };
  },

  async updateStatus(id, status) {
    await apiPatch(`/appointments/${id}/status`, { status });
  },

  async delete(id) {
    await apiDelete(`/appointments/${id}`);
    return { success: true };
  },

  async getAvailableSlots(date, duration = 30) {
    const res = await apiGet(`/appointments/available-slots?date=${date}&duration=${duration}`);
    return res.data;
  },

  async assignDoctor({ patientId, staffId, datetime, duration, type, notes, auto = true }) {
    const res = await apiPost('/appointments/assign', { patientId, staffId, datetime, duration, type, notes, auto });
    return res.data;
  },

  async bulkAssignDoctors() {
    const res = await apiPost('/appointments/bulk-assign', {});
    return res.data;
  },

  async getPendingConfirmations() {
    const res = await apiGet('/appointments/pending-confirmations');
    return res.data;
  },

  async confirmAssignment(appointmentId) {
    const res = await apiPost(`/appointments/${appointmentId}/confirm`, {});
    return res;
  },

  async declineAssignment(appointmentId) {
    const res = await apiPost(`/appointments/${appointmentId}/decline`, {});
    return res;
  }
};
