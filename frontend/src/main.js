/**
 * Dr Amin PMS — Main Application
 */

import { Dashboard } from './features/dashboard/dashboard.js';
import { Patients } from './features/patients/patients.js';
import { PatientRegister } from './features/patients/patientRegister.js';
import { PatientSearch } from './features/patients/patientSearch.js';
import { PatientDetail } from './features/patients/patientDetail.js';
import { PatientEdit } from './features/patients/patientEdit.js';
import { Appointments } from './features/appointments/appointments.js';
import { Billing } from './features/billing/billing.js';
import { Recalls } from './features/recalls/recalls.js';
import { themeManager } from './utils/themeManager.js';
import { initAuth, signOut, formatRole, canAssignDoctors, canAccessBilling, getCurrentRole, refreshSession } from './services/authService.js';
import { LoginPage } from './pages/login.js';
import { Settings } from './pages/settings.js';
import { initGlobalSearch } from './utils/globalSearch.js';
import { BRANDING } from './config/branding.js';
import { recallService } from './services/recallService.js';
import { adminService } from './services/adminService.js';
import { alertService } from './services/alertService.js';
import { startLiveSync, stopLiveSync } from './core/liveSync.js';
import { eventBus } from './core/eventBus.js';
import { initPillNav, refreshPillNavIndicator } from './utils/navPill.js';

function syncViewportHeight() {
  document.documentElement.style.setProperty('--app-vh', `${window.innerHeight}px`);
}
syncViewportHeight();
window.addEventListener('resize', syncViewportHeight);

class Toast {
  static show(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    toast.innerHTML = `<i class="fas ${icons[type] || icons.success}"></i><span>${message}</span><button class="toast-close">&times;</button>`;
    container.appendChild(toast);
    toast.querySelector('.toast-close')?.addEventListener('click', () => Toast.removeToast(toast));
    setTimeout(() => Toast.removeToast(toast), duration);
  }
  static removeToast(toast) {
    if (!toast?.parentElement) return;
    toast.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }
  static success(m, d) { this.show(m, 'success', d); }
  static error(m, d) { this.show(m, 'error', d); }
  static warning(m, d) { this.show(m, 'warning', d); }
  static info(m, d) { this.show(m, 'info', d); }
}

class LoadingIndicator {
  static show() {
    const contentArea = document.getElementById('content-area');
    if (!contentArea || contentArea.querySelector('.loading-overlay')) return;
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = '<div class="loading-spinner-container"><div class="loading-spinner"></div><p>Loading...</p></div>';
    contentArea.style.position = 'relative';
    contentArea.appendChild(overlay);
  }
  static hide() {
    document.querySelector('.loading-overlay')?.remove();
  }
}

class App {
  constructor() {
    this.currentPage = 'dashboard';
    this.currentPatientId = null;
    this.init();
  }

  init() {
    this.checkRoute();
    this.setupNavigation();
    initPillNav();
    window.addEventListener('hashchange', () => this.checkRoute());
    this.setupOfflineDetection();
    this.applySavedSettings();
    initGlobalSearch();
    this.setupQuickActions();
    this.updateRecallBadge();
    this.setupClinicAlerts();
    this.runAutoBackupIfNeeded();
    setTimeout(() => {
      Toast.success(BRANDING.welcome, 3000);
      this.showShortcutHint();
    }, 500);
  }

  setupQuickActions() {
    document.getElementById('quickNewPatientBtn')?.addEventListener('click', () => {
      window.location.hash = 'register';
      this.loadPage('register');
    });
    document.getElementById('quickNewApptBtn')?.addEventListener('click', () => {
      window.location.hash = 'appointments';
      this.loadPage('appointments');
    });
  }

  async updateRecallBadge() {
    try {
      const patients = await recallService.getPatientsWithRecall();
      const stats = recallService.computeStats(patients);
      const badge = document.getElementById('recallsNavBadge');
      if (!badge) return;
      if (stats.overdue > 0) {
        badge.textContent = stats.overdue > 99 ? '99+' : stats.overdue;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    } catch { /* ignore */ }
  }

  setupClinicAlerts() {
    if (!canAssignDoctors()) return;
    const btn = document.getElementById('clinicAlertsBtn');
    const panel = document.getElementById('clinicAlertsPanel');
    if (btn) btn.style.display = '';
    btn?.addEventListener('click', async (e) => {
      e.stopPropagation();
      panel?.classList.toggle('hidden');
      if (panel && !panel.classList.contains('hidden')) await this.renderClinicAlerts();
    });
    document.getElementById('closeClinicAlerts')?.addEventListener('click', () => panel?.classList.add('hidden'));
    document.getElementById('markAllAlertsRead')?.addEventListener('click', async () => {
      await alertService.markAllRead();
      await this.updateClinicAlertsBadge();
      await this.renderClinicAlerts();
    });
    document.addEventListener('click', (e) => {
      if (!panel || panel.classList.contains('hidden')) return;
      if (!panel.contains(e.target) && e.target !== btn && !btn?.contains(e.target)) panel.classList.add('hidden');
    });
    this.updateClinicAlertsBadge();
    setInterval(() => this.updateClinicAlertsBadge(), 60000);
  }

  async updateClinicAlertsBadge() {
    if (!canAssignDoctors()) return;
    try {
      const { count } = await alertService.getUnread();
      const badge = document.getElementById('clinicAlertsBadge');
      if (!badge) return;
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    } catch { /* ignore */ }
  }

  async renderClinicAlerts() {
    const list = document.getElementById('clinicAlertsList');
    if (!list) return;
    try {
      const { alerts } = await alertService.getUnread();
      if (!alerts.length) {
        list.innerHTML = '<p class="text-muted" style="padding:1rem;text-align:center;">No new alerts</p>';
        return;
      }
      list.innerHTML = alerts.map((a) => `
        <div class="clinic-alert-item type-${a.type}" data-id="${a.id}" data-patient="${a.patientId}">
          <p>${this.escapeHtml(a.message)}</p>
          <small>${a.created_at ? new Date(a.created_at).toLocaleString() : ''}</small>
        </div>`).join('');
      list.querySelectorAll('.clinic-alert-item').forEach((item) => {
        item.addEventListener('click', async () => {
          await alertService.markRead(item.dataset.id);
          if (item.dataset.patient) window.location.hash = `patient/${item.dataset.patient}`;
          await this.updateClinicAlertsBadge();
          await this.renderClinicAlerts();
        });
      });
    } catch {
      list.innerHTML = '<p class="text-muted" style="padding:1rem;">Could not load alerts</p>';
    }
  }

  escapeHtml(text) {
    if (!text) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  async runAutoBackupIfNeeded() {
    if (!themeManager.settings.autoBackup) return;
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem('pms_last_backup_date') === today) return;
    try {
      await adminService.createBackup();
      localStorage.setItem('pms_last_backup_date', today);
      Toast.info('Daily database backup completed', 4000);
    } catch { /* silent */ }
  }

  applySavedSettings() {
    const { defaultView, compactMode, showAnimations } = themeManager.settings;
    if (defaultView && defaultView !== 'dashboard') {
      setTimeout(() => { window.location.hash = defaultView; this.loadPage(defaultView); }, 100);
    }
    if (compactMode) document.body.classList.add('compact-mode');
    if (!showAnimations) document.body.classList.add('reduce-motion');
  }

  showShortcutHint() {
    if (localStorage.getItem('shortcut_hint_shown')) return;
    const hint = document.createElement('div');
    hint.className = 'shortcut-hint';
    hint.innerHTML = `<i class="fas fa-keyboard"></i><div><strong>Keyboard Shortcuts:</strong><span>F11 - Fullscreen</span><span>Ctrl+K - Search</span><span>Ctrl+N - New Patient</span></div><button class="close-hint">&times;</button>`;
    document.body.appendChild(hint);
    hint.querySelector('.close-hint')?.addEventListener('click', () => { hint.remove(); localStorage.setItem('shortcut_hint_shown', 'true'); });
    setTimeout(() => hint.remove(), 10000);
  }

  setupNavigation() {
    setTimeout(() => {
      document.querySelectorAll('.pill-nav .nav-menu li').forEach((item) => {
        item.addEventListener('click', () => {
          const page = item.dataset.page;
          if (!page) return;
          window.location.hash = page;
          this.loadPage(page);
        });
      });
    }, 100);
  }

  updateActiveNav(pageName) {
    document.querySelectorAll('.pill-nav .nav-menu li').forEach((item) => {
      item.classList.toggle('active', item.dataset.page === pageName);
    });
    refreshPillNavIndicator();
    document.querySelector('.pill-nav .nav-menu li.active')?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: 'smooth'
    });
  }

  checkRoute() {
    if (window.location.hash.startsWith('#/patient/')) {
      this.loadPatientDetail(window.location.hash.split('/')[2]);
    } else if (window.location.hash.startsWith('#/edit/')) {
      this.loadPatientEdit(window.location.hash.split('/')[2]);
    } else {
      this.loadPage(window.location.hash.substring(1) || 'dashboard');
    }
  }

  async loadPage(pageName) {
    const validPages = ['dashboard', 'patients', 'register', 'search', 'appointments', 'billing', 'recalls', 'settings'];
    if (pageName === 'billing' && !canAccessBilling(getCurrentRole())) {
      Toast.warning('You do not have access to billing');
      pageName = 'dashboard';
      window.location.hash = 'dashboard';
    }
    if (pageName === 'register' && getCurrentRole() === 'dentist') {
      Toast.warning('Dentists cannot register new patients');
      pageName = 'dashboard';
      window.location.hash = 'dashboard';
    }
    if (!validPages.includes(pageName)) {
      pageName = 'dashboard';
      window.location.hash = 'dashboard';
    }
    this.currentPage = pageName;
    const contentArea = document.getElementById('content-area');
    if (!contentArea) return;
    LoadingIndicator.show();
    this.updateActiveNav(pageName);
    try {
      let pageInstance;
      switch (pageName) {
        case 'dashboard':
          pageInstance = new Dashboard();
          contentArea.innerHTML = await pageInstance.render();
          await pageInstance.loadStats();
          break;
        case 'patients':
          pageInstance = new Patients();
          contentArea.innerHTML = await pageInstance.render();
          await pageInstance.loadPatients();
          break;
        case 'register':
          pageInstance = new PatientRegister();
          contentArea.innerHTML = await pageInstance.render();
          pageInstance.initForm();
          break;
        case 'search':
          pageInstance = new PatientSearch();
          contentArea.innerHTML = await pageInstance.render();
          pageInstance.initSearch();
          break;
        case 'appointments':
          pageInstance = new Appointments();
          contentArea.innerHTML = await pageInstance.render();
          await pageInstance.init();
          break;
        case 'billing':
          pageInstance = new Billing();
          contentArea.innerHTML = await pageInstance.render();
          await pageInstance.init();
          break;
        case 'recalls':
          pageInstance = new Recalls();
          contentArea.innerHTML = await pageInstance.render();
          await pageInstance.init();
          break;
        case 'settings':
          pageInstance = new Settings();
          contentArea.innerHTML = await pageInstance.render();
          await pageInstance.loadStaff();
          break;
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error loading page:', error);
      contentArea.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Error Loading Page</h3><p>Please try again.</p></div>';
      Toast.error('Error loading page. Please refresh and try again.');
    } finally {
      LoadingIndicator.hide();
    }
  }

  async loadPatientDetail(patientId) {
    if (!patientId) { window.location.hash = 'patients'; return; }
    this.currentPage = 'detail';
    this.currentPatientId = patientId;
    const contentArea = document.getElementById('content-area');
    if (!contentArea) return;
    this.updateActiveNav(null);
    LoadingIndicator.show();
    try {
      const detailPage = new PatientDetail(patientId);
      contentArea.innerHTML = await detailPage.render();
      await detailPage.loadPatientDetails();
    } catch {
      contentArea.innerHTML = '<div class="empty-state"><h3>Patient Not Found</h3></div>';
      Toast.error('Patient not found');
    } finally {
      LoadingIndicator.hide();
    }
  }

  async loadPatientEdit(patientId) {
    if (!patientId) { window.location.hash = 'patients'; return; }
    this.currentPage = 'edit';
    this.currentPatientId = patientId;
    const contentArea = document.getElementById('content-area');
    if (!contentArea) return;
    this.updateActiveNav(null);
    LoadingIndicator.show();
    try {
      const editPage = new PatientEdit(patientId);
      contentArea.innerHTML = await editPage.render();
      await editPage.loadPatientData();
    } catch {
      Toast.error('Error loading patient data');
    } finally {
      LoadingIndicator.hide();
    }
  }

  setupOfflineDetection() {
    window.addEventListener('online', () => Toast.success('Back online! Connection restored.', 3000));
    window.addEventListener('offline', () => Toast.warning('You are offline. Some features may be unavailable.', 5000));
  }
}

function applyNavVisibility(role) {
  document.querySelectorAll('.nav-menu li[data-page]').forEach((item) => {
    const page = item.dataset.page;
    let visible = true;
    if (page === 'billing' && !canAccessBilling(role)) visible = false;
    if (page === 'register' && role === 'dentist') visible = false;
    item.style.display = visible ? '' : 'none';
  });
  const quickPatient = document.getElementById('quickNewPatientBtn');
  if (quickPatient) quickPatient.style.display = role === 'dentist' ? 'none' : '';
  refreshPillNavIndicator();
}

function updateUserDisplay(profile, role) {
  const nameEl = document.getElementById('userDisplayName');
  const roleEl = document.getElementById('userDisplayRole');
  if (nameEl) nameEl.textContent = profile?.fullName || profile?.email || 'Staff';
  if (roleEl) roleEl.textContent = role ? formatRole(role) : 'No role assigned';
}

function setupLogout() {
  const handleLogout = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    try {
      await signOut();
      Toast.info('Signed out successfully');
    } catch {
      Toast.error('Could not sign out. Please try again.');
    }
  };
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
  document.getElementById('userInfo')?.addEventListener('click', (e) => {
    if (!e.target.closest('#logoutBtn')) handleLogout(e);
  });
}

function showLoginScreen() {
  stopLiveSync();
  document.getElementById('auth-screen')?.classList.remove('hidden');
  document.getElementById('app-shell')?.classList.add('hidden');
  void new LoginPage().render(document.getElementById('auth-screen'));
}

function showAppShell(profile, role) {
  document.getElementById('auth-screen')?.classList.add('hidden');
  document.getElementById('app-shell')?.classList.remove('hidden');
  updateUserDisplay(profile, role);
  applyNavVisibility(role);
  setupLogout();
  startLiveSync();
  syncViewportHeight();
  if (!window.app) window.app = new App();
}

const PAGE_ENTITY_MAP = {
  dashboard: ['patient', 'patients', 'appointment', 'billing'],
  patients: ['patient', 'patients'],
  register: ['patient', 'patients'],
  search: ['patient', 'patients'],
  appointments: ['appointment', 'patient', 'patients'],
  billing: ['billing', 'patient', 'patients'],
  recalls: ['patient', 'patients'],
  detail: ['patient', 'patients', 'appointment', 'billing', 'clinical'],
  edit: ['patient', 'patients'],
  settings: ['staff', 'procedure', 'clinical', 'patient', 'patients']
};

async function refreshCurrentPage(app, entity, detail) {
  const page = app.currentPage;
  const relevant = PAGE_ENTITY_MAP[page];
  if (!relevant?.includes(entity) || detail?.source === 'client') return;
  try {
    if (page === 'detail' && app.currentPatientId) await app.loadPatientDetail(app.currentPatientId);
    else if (page === 'edit' && app.currentPatientId) await app.loadPatientEdit(app.currentPatientId);
    else if (['dashboard', 'patients', 'register', 'search', 'appointments', 'billing', 'recalls', 'settings'].includes(page)) await app.loadPage(page);
  } catch { /* silent */ }
}

function setupAuthListeners() {
  window.addEventListener('pms:auth:logout', () => {
    stopLiveSync();
    window.app = null;
    showLoginScreen();
    Toast.info('Your session has ended. Please sign in again.');
  });
  window.addEventListener('pms:auth:role-changed', (e) => {
    const { role, profile } = e.detail || {};
    if (role) {
      updateUserDisplay(profile, role);
      applyNavVisibility(role);
    }
  });
  window.addEventListener('focus', () => {
    refreshSession().catch(() => {});
  });
  const handleDataChange = (detail = {}) => {
    const app = window.app;
    if (!app) return;
    if ((detail.entity === 'alerts' || detail.entity === 'appointment') && app.updateClinicAlertsBadge) app.updateClinicAlertsBadge();
    if (detail.entity === 'patient' || detail.entity === 'patients') app.updateRecallBadge?.();
    refreshCurrentPage(app, detail.entity, detail);
  };
  window.addEventListener('pms:data:changed', (e) => handleDataChange(e.detail));
  eventBus.on('data:changed', handleDataChange);
  eventBus.on('alerts:changed', () => window.app?.updateClinicAlertsBadge?.());
}

function initElectron() {
  const electron = window.electron;
  if (!electron) return;

  electron.onNavigate((page) => {
    window.location.hash = page;
    window.app?.loadPage?.(page);
  });

  electron.onExportData((type) => {
    const map = { csv: 'exportCSVBtn', excel: 'exportExcelBtn', pdf: 'exportPDFBtn' };
    document.getElementById(map[type])?.click();
  });

  electron.onServerDown(() => {
    Toast.error('Server connection lost. Please restart the application.', 0);
  });

  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const routes = { n: 'register', f: 'search', d: 'dashboard', p: 'patients' };
    if (routes[e.key]) {
      e.preventDefault();
      window.location.hash = routes[e.key];
      window.app?.loadPage?.(routes[e.key]);
    }
  });
}

async function bootstrap() {
  initElectron();
  const authScreen = document.getElementById('auth-screen');
  setupAuthListeners();
  if (authScreen) {
    authScreen.innerHTML = '<div class="auth-loading"><div class="loading-spinner"></div><p>Checking authentication...</p></div>';
    authScreen.classList.remove('hidden');
  }
  await initAuth(({ user, profile, role }) => {
    if (!user) showLoginScreen();
    else showAppShell(profile, role);
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrap);
else bootstrap();

export { App, Toast, LoadingIndicator };
window.Toast = Toast;
window.app = window.app || null;
