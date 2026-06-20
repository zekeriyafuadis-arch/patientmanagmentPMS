import { API_BASE } from '../config/api.js';
import { apiGet, apiPost, getToken } from './apiClient.js';

async function downloadFile(path, filename) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Download failed');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const adminService = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/admin/health`);
    return res.json();
  },

  async getSystemInfo() {
    const res = await apiGet('/admin/info');
    return res.data;
  },

  async getAuditLog(limit = 100) {
    const res = await apiGet(`/admin/audit?limit=${limit}`);
    return res.data;
  },

  async createBackup() {
    const res = await apiPost('/admin/backup', {});
    return res.data;
  },

  async listBackups() {
    const res = await apiGet('/admin/backups');
    return res.data;
  },

  async restoreBackup(name) {
    const res = await apiPost('/admin/restore', { name });
    return res.data;
  },

  async exportFullJson() {
    const date = new Date().toISOString().slice(0, 10);
    await downloadFile('/admin/export/json', `dramin_clinic_export_${date}.json`);
  },

  async exportPatientsCsv() {
    const date = new Date().toISOString().slice(0, 10);
    await downloadFile('/admin/export/patients.csv', `patients_${date}.csv`);
  },

  async seedDemo() {
    const res = await apiPost('/admin/seed-demo', {});
    return res.data;
  }
};
