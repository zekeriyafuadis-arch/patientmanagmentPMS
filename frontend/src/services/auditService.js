import { apiPost } from './apiClient.js';

export const auditService = {
  async log(action, { entityType = '', entityId = '', details = '' } = {}) {
    try {
      await apiPost('/audit/client-action', { action, entityType, entityId, details });
    } catch {
      /* audit must not block UX */
    }
  },

  logPrint(type, entityId, details = '') {
    return this.log(`print.${type}`, { entityType: type, entityId, details });
  },

  logExport(type, entityId, details = '') {
    return this.log(`export.${type}`, { entityType: type, entityId, details });
  }
};
