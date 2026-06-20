import { apiGet, apiPost, apiPatch, apiPut } from './apiClient.js';
import { getCurrentRole } from './authService.js';

export const staffService = {
  async getAll() {
    const res = await apiGet('/staff');
    return res.data;
  },

  async createStaff({ email, password, fullName, role }) {
    if (getCurrentRole() !== 'admin') {
      throw new Error('Only administrators can create staff accounts.');
    }
    const res = await apiPost('/staff', { email, password, fullName, role });
    return res.data;
  },

  async setRole({ uid, role, fullName, email }) {
    if (getCurrentRole() !== 'admin') {
      throw new Error('Only administrators can change roles.');
    }
    await apiPatch(`/staff/${uid}/role`, { role, fullName, email });
    return { success: true };
  },

  async setActive(staffId, active) {
    if (getCurrentRole() !== 'admin') {
      throw new Error('Only administrators can change staff status.');
    }
    await apiPatch(`/staff/${staffId}/active`, { active });
    return { success: true };
  },

  async getSchedule(staffId) {
    const res = await apiGet(`/staff/${staffId}/schedule`);
    return res.data;
  },

  async updateSchedule(staffId, schedule) {
    const res = await apiPut(`/staff/${staffId}/schedule`, { schedule });
    return res.data;
  },

  async resetPassword(staffId, newPassword) {
    if (getCurrentRole() !== 'admin') {
      throw new Error('Only administrators can reset passwords.');
    }
    await apiPatch(`/staff/${staffId}/reset-password`, { newPassword });
    return { success: true };
  }
};
