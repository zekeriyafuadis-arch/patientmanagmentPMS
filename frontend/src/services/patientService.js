import { apiGet, apiPost, apiPut, apiDelete } from './apiClient.js';

export function normalizePatient(data) {
  return { ...data, id: String(data.id) };
}

export const patientService = {
  isAvailable() {
    return true;
  },

  async getAll() {
    const res = await apiGet('/patients');
    return res.data;
  },

  async getById(id) {
    const res = await apiGet(`/patients/${id}`);
    return res.data;
  },

  async getByMRN(mrn) {
    const res = await apiGet(`/patients/mrn/${encodeURIComponent(mrn)}`);
    return res.data;
  },

  async create(patientData) {
    const res = await apiPost('/patients', patientData);
    return res.data;
  },

  async update(id, patientData) {
    await apiPut(`/patients/${id}`, patientData);
    return { id: String(id) };
  },

  async delete(id) {
    await apiDelete(`/patients/${id}`);
    return { success: true };
  },

  async search(searchTerm) {
    const res = await apiGet(`/patients/search?q=${encodeURIComponent(searchTerm || '')}`);
    return res.data;
  },

  async fetchAll() {
    try {
      const data = await this.getAll();
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async fetchMine() {
    try {
      const res = await apiGet('/patients/mine');
      return { success: true, data: res.data || [] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async fetchById(id) {
    try {
      const patient = await this.getById(id);
      if (!patient) return { success: false, error: 'Patient not found' };
      return { success: true, data: patient };
    } catch {
      return { success: false, error: 'Patient not found' };
    }
  },

  async createPatient(patientData) {
    try {
      const result = await this.create(patientData);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async updatePatient(id, patientData) {
    try {
      await this.update(id, patientData);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async deletePatient(id) {
    try {
      await this.delete(id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};
