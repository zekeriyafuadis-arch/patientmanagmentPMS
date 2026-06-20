import { API_BASE } from '../config/api.js';

export { API_BASE };

export const endpoints = {
  auth: {
    login: '/auth/login',
    me: '/auth/me',
    config: '/auth/config',
    changePassword: '/auth/change-password'
  },
  patients: '/patients',
  appointments: '/appointments',
  billing: '/billing',
  clinical: '/clinical',
  staff: '/staff',
  procedures: '/procedures',
  alerts: '/alerts',
  admin: {
    health: '/admin/health',
    backup: '/admin/backup',
    backups: '/admin/backups',
    restore: '/admin/restore',
    audit: '/admin/audit',
    info: '/admin/info'
  },
  events: {
    stream: '/events/stream'
  }
};
