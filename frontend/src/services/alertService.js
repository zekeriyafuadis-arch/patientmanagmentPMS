import { apiGet, apiPost, apiPatch } from './apiClient.js';

export const alertService = {
  async getUnread() {
    const res = await apiGet('/alerts');
    return { alerts: res.data || [], count: res.count || 0 };
  },

  async markRead(id) {
    await apiPatch(`/alerts/${id}/read`, {});
  },

  async markAllRead() {
    await apiPost('/alerts/read-all', {});
  }
};
