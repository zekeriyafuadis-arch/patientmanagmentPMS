import { staffService } from '../services/staffService.js';
import { procedureService } from '../services/procedureService.js';
import { adminService } from '../services/adminService.js';
import { getCurrentRole, getCurrentUser, changePassword } from '../services/authService.js';
import { loadClinicEmailConfig, buildStaffEmail } from '../config/clinicEmail.js';
import { API_BASE } from '../config/api.js';

export class Settings {
  constructor() {
    this.staff = [];
    this.procedures = [];
    this.emailDomain = '@pws.com';
  }

  async render() {
    const isAdmin = getCurrentRole() === 'admin';
    const config = await loadClinicEmailConfig();
    this.emailDomain = config.emailDomain;
    this.passwordMinLength = config.passwordPolicy?.minLength || 6;
    const passwordHint = config.passwordPolicy?.requireLetterAndNumber
      ? `Min ${this.passwordMinLength} characters, with letters and numbers`
      : `Min ${this.passwordMinLength} characters`;
    return `
      <div class="settings-page-container">
        <div class="settings-page-header">
          <h1><i class="fas fa-cog"></i> Clinic Settings</h1>
          <p>Manage staff accounts, procedures, and clinic configuration</p>
        </div>

        <div class="settings-cards">
          <div class="settings-card">
            <div class="settings-card-header">
              <h2><i class="fas fa-mobile-alt"></i> Mobile & Install</h2>
            </div>
            <p class="settings-hint">On the same Wi‑Fi as this computer, open the clinic app in a phone or tablet browser. You can also install it to your home screen. Keep access limited to your clinic network only.</p>
            <div id="mobileAccessPanel" class="mobile-access-panel">
              <div class="loading-state"><div class="loading-spinner"></div><p>Loading access URLs…</p></div>
            </div>
            <div class="settings-install-actions">
              <button type="button" class="btn-primary btn-sm hidden" id="pwaInstallBtn">
                <i class="fas fa-download"></i> Install App
              </button>
            </div>
          </div>

          <div class="settings-card">
            <div class="settings-card-header">
              <h2><i class="fas fa-key"></i> Change Password</h2>
            </div>
            <form id="changePasswordForm" class="staff-form">
              <div class="form-grid-2">
                <div class="form-field">
                  <label for="currentPassword">Current Password *</label>
                  <input type="password" id="currentPassword" required autocomplete="current-password">
                </div>
                <div class="form-field">
                  <label for="newPassword">New Password *</label>
                  <input type="password" id="newPassword" required minlength="${this.passwordMinLength}" autocomplete="new-password" placeholder="${this.escapeHtml(passwordHint)}">
                </div>
              </div>
              <div id="passwordFormError" class="login-error" style="display:none;"></div>
              <button type="submit" class="btn-primary btn-sm" id="changePasswordBtn">
                <i class="fas fa-lock"></i> Update Password
              </button>
            </form>
          </div>

          ${isAdmin ? `
          <div class="settings-card">
            <div class="settings-card-header">
              <h2><i class="fas fa-list-alt"></i> Procedure Catalog</h2>
              <button class="btn-secondary btn-sm" id="seedProceduresBtn" title="Load default dental procedures">
                <i class="fas fa-database"></i> Load Defaults
              </button>
            </div>
            <form id="addProcedureForm" class="staff-form" style="margin-bottom:1.5rem;">
              <div class="form-grid-2">
                <div class="form-field">
                  <label>Code *</label>
                  <input type="text" id="procCode" required placeholder="D1110">
                </div>
                <div class="form-field">
                  <label>Name *</label>
                  <input type="text" id="procName" required placeholder="Prophylaxis">
                </div>
                <div class="form-field">
                  <label>Default Price</label>
                  <input type="number" id="procPrice" min="0" step="0.01" value="0">
                </div>
                <div class="form-field">
                  <label>Category</label>
                  <select id="procCategory">
                    <option value="diagnostic">Diagnostic</option>
                    <option value="preventive">Preventive</option>
                    <option value="restorative">Restorative</option>
                    <option value="endodontic">Endodontic</option>
                    <option value="surgical">Surgical</option>
                    <option value="periodontic">Periodontic</option>
                    <option value="implant">Implant</option>
                    <option value="general">General</option>
                  </select>
                </div>
              </div>
              <div id="procFormError" class="login-error" style="display:none;"></div>
              <button type="submit" class="btn-primary btn-sm"><i class="fas fa-plus"></i> Add Procedure</button>
            </form>
            <div id="procedureListContainer">
              <div class="loading-state"><div class="loading-spinner"></div><p>Loading procedures...</p></div>
            </div>
          </div>
          ` : ''}

          ${isAdmin ? `
          <div class="settings-card">
            <div class="settings-card-header">
              <h2><i class="fas fa-users-cog"></i> Staff Members</h2>
              <span class="badge badge-primary">Admin</span>
            </div>
            <div id="staffListContainer">
              <div class="loading-state"><div class="loading-spinner"></div><p>Loading staff...</p></div>
            </div>
          </div>
          ` : ''}

          ${isAdmin ? `
          <div class="settings-card">
            <div class="settings-card-header">
              <h2><i class="fas fa-calendar-week"></i> Dentist Working Hours</h2>
            </div>
            <p class="text-muted" style="margin-bottom:1rem;font-size:0.875rem;">
              Set which days each dentist works and their hours. Auto-assign uses these schedules.
            </p>
            <div id="dentistScheduleContainer">
              <div class="loading-state"><div class="loading-spinner"></div><p>Loading schedules...</p></div>
            </div>
          </div>
          ` : ''}

          ${isAdmin ? `
          <div class="settings-card">
            <div class="settings-card-header">
              <h2><i class="fas fa-user-plus"></i> Add Staff Member</h2>
            </div>
            <form id="addStaffForm" class="staff-form">
              <div class="form-grid-2">
                <div class="form-field">
                  <label>Full Name *</label>
                  <input type="text" id="staffFullName" required placeholder="Dr. Jane Smith">
                </div>
                <div class="form-field">
                  <label>Username *</label>
                  <div class="username-field">
                    <input type="text" id="staffUsername" required placeholder="jane.smith" autocomplete="off" autocapitalize="none" spellcheck="false">
                    <span class="username-domain" id="staffEmailDomain">${this.escapeHtml(this.emailDomain)}</span>
                  </div>
                </div>
                <div class="form-field">
                  <label>Password *</label>
                  <input type="password" id="staffPassword" required minlength="${this.passwordMinLength}" placeholder="${this.escapeHtml(passwordHint)}">
                </div>
                <div class="form-field">
                  <label>Role *</label>
                  <select id="staffRole" required>
                    <option value="receptionist">Receptionist</option>
                    <option value="dentist">Dentist</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>
              <div id="staffFormError" class="login-error" style="display:none;"></div>
              <button type="submit" class="btn-primary" id="addStaffBtn">
                <i class="fas fa-user-plus"></i> Create Staff Account
              </button>
            </form>
          </div>
          ` : ''}

          ${isAdmin ? `
          <div class="settings-card">
            <div class="settings-card-header">
              <h2><i class="fas fa-database"></i> Data & Backup</h2>
            </div>
            <div id="systemInfoPanel" class="system-info-panel">
              <div class="loading-state"><div class="loading-spinner"></div><p>Loading system info...</p></div>
            </div>
            <div class="admin-actions-grid">
              <button type="button" class="btn-primary btn-sm" id="backupNowBtn">
                <i class="fas fa-save"></i> Create Backup
              </button>
              <button type="button" class="btn-secondary btn-sm" id="seedDemoBtn">
                <i class="fas fa-flask"></i> Load Demo Data
              </button>
              <button type="button" class="btn-secondary btn-sm" id="exportJsonBtn">
                <i class="fas fa-file-export"></i> Export All (JSON)
              </button>
              <button type="button" class="btn-secondary btn-sm" id="exportCsvBtn">
                <i class="fas fa-file-csv"></i> Export Patients (CSV)
              </button>
            </div>
            <p class="settings-hint">Backups saved to <code>patientsData/backups/</code> (last 10 kept). Demo data adds sample patients, appointments, billing, and staff — only works on an empty database.</p>
            <div id="backupListContainer" class="backup-list-container" style="margin-top:1rem;">
              <div class="loading-state"><div class="loading-spinner"></div><p>Loading backups...</p></div>
            </div>
          </div>

          <div class="settings-card">
            <div class="settings-card-header">
              <h2><i class="fas fa-clipboard-list"></i> Audit Log</h2>
              <button type="button" class="btn-secondary btn-sm" id="refreshAuditBtn">
                <i class="fas fa-sync-alt"></i> Refresh
              </button>
            </div>
            <div id="auditLogContainer">
              <div class="loading-state"><div class="loading-spinner"></div><p>Loading audit log...</p></div>
            </div>
          </div>
          ` : ''}
        </div>
      </div>

      <div id="scheduleModal" class="modal-overlay" style="display:none;">
        <div class="appointment-modal">
          <div class="modal-header">
            <h3 id="scheduleModalTitle"><i class="fas fa-calendar-week"></i> Edit Schedule</h3>
            <button class="modal-close" id="closeScheduleModal">&times;</button>
          </div>
          <form id="scheduleForm">
            <div id="scheduleEditor" class="schedule-editor-grid"></div>
            <div id="scheduleFormError" class="login-error" style="display:none;"></div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" id="cancelScheduleBtn">Cancel</button>
              <button type="submit" class="btn-primary">Save Schedule</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  async loadStaff() {
    try {
      this.bindPasswordForm();
      await this.loadMobileAccessPanel();
      const isAdmin = getCurrentRole() === 'admin';
      if (!isAdmin) return;

      const [staff, procedures] = await Promise.all([
        staffService.getAll(),
        procedureService.getAll()
      ]);
      this.staff = staff;
      this.procedures = procedures || [];
      this.renderProcedureList();
      this.bindProcedureForm();
      this.renderStaffList();
      this.renderDentistSchedules();
      this.bindScheduleModal();
      this.bindStaffForm();
      await this.loadAdminPanel();
    } catch (err) {
      console.error('Error loading staff:', err);
      const container = document.getElementById('staffListContainer');
      if (container) {
        container.innerHTML = `<div class="empty-state-small"><p>Could not load staff: ${err.message}</p></div>`;
      }
    }
  }

  renderStaffList() {
    const container = document.getElementById('staffListContainer');
    if (!container) return;

    if (this.staff.length === 0) {
      container.innerHTML = '<div class="empty-state-small"><i class="fas fa-users"></i><p>No staff profiles yet</p></div>';
      return;
    }

    const isAdmin = getCurrentRole() === 'admin';
    const currentId = getCurrentUser()?.uid;

    const roleBadge = (role) => {
      const colors = { admin: 'badge-danger', dentist: 'badge-info', receptionist: 'badge-success' };
      return `<span class="badge ${colors[role] || 'badge-primary'}">${role}</span>`;
    };

    container.innerHTML = `
      <table class="staff-table">
        <thead>
          <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          ${this.staff.map((s) => `
            <tr>
              <td>${this.escapeHtml(s.fullName || '-')}</td>
              <td>${this.escapeHtml(s.email || '-')}</td>
              <td>${roleBadge(s.role)}</td>
              <td>${s.active !== false ? '<span class="text-success">Active</span>' : '<span class="text-muted">Inactive</span>'}</td>
              <td class="staff-actions-cell">
                ${String(s.id) !== String(currentId) ? `
                  <button type="button" class="btn-secondary btn-sm staff-reset-btn" data-id="${s.id}" title="Reset password">
                    <i class="fas fa-key"></i>
                  </button>
                  <button type="button" class="btn-secondary btn-sm staff-toggle-btn" data-id="${s.id}" data-active="${s.active !== false}">
                    ${s.active !== false ? '<i class="fas fa-user-slash"></i>' : '<i class="fas fa-user-check"></i>'}
                  </button>
                ` : '<span class="text-muted">You</span>'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    if (isAdmin) {
      container.querySelectorAll('.staff-toggle-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const active = btn.dataset.active !== 'true';
          const action = active ? 'activate' : 'deactivate';
          if (!confirm(`${active ? 'Activate' : 'Deactivate'} this staff account?`)) return;
          try {
            await staffService.setActive(btn.dataset.id, active);
            if (window.Toast) window.Toast.success(`Staff ${action}d`);
            await this.loadStaff();
          } catch (err) {
            if (window.Toast) window.Toast.error(err.message);
          }
        });
      });
      container.querySelectorAll('.staff-reset-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const minLen = this.passwordMinLength || 6;
          const newPassword = prompt(`Enter a new temporary password (min ${minLen} characters):`);
          if (!newPassword) return;
          if (newPassword.length < minLen) {
            if (window.Toast) window.Toast.warning(`Password must be at least ${minLen} characters`);
            return;
          }
          try {
            await staffService.resetPassword(btn.dataset.id, newPassword);
            if (window.Toast) window.Toast.success('Password reset successfully');
          } catch (err) {
            if (window.Toast) window.Toast.error(err.message || 'Reset failed');
          }
        });
      });
    }
  }

  bindPasswordForm() {
    const form = document.getElementById('changePasswordForm');
    if (!form || form.dataset.bound) return;
    form.dataset.bound = '1';
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById('passwordFormError');
      const btn = document.getElementById('changePasswordBtn');
      errorEl.style.display = 'none';
      btn.disabled = true;
      try {
        await changePassword(
          document.getElementById('currentPassword').value,
          document.getElementById('newPassword').value
        );
        form.reset();
        if (window.Toast) window.Toast.success('Password updated successfully');
      } catch (err) {
        errorEl.textContent = err.message || 'Failed to update password';
        errorEl.style.display = 'block';
      } finally {
        btn.disabled = false;
      }
    });
  }

  renderDentistSchedules() {
    const container = document.getElementById('dentistScheduleContainer');
    if (!container) return;
    const dentists = this.staff.filter((s) => s.role === 'dentist');
    if (dentists.length === 0) {
      container.innerHTML = '<p class="text-muted">No dentists on staff yet. Add a dentist to configure schedules.</p>';
      return;
    }
    container.innerHTML = `
      <table class="staff-table dentist-schedule-table">
        <thead><tr><th>Dentist</th><th>Working Days</th><th></th></tr></thead>
        <tbody>
          ${dentists.map((d) => `
            <tr>
              <td>${this.escapeHtml(d.fullName)}</td>
              <td class="schedule-summary">${this.escapeHtml(d.scheduleSummary || 'Mon–Fri')}</td>
              <td>
                <button type="button" class="btn-secondary btn-sm edit-schedule-btn" data-id="${d.id}" data-name="${this.escapeHtml(d.fullName)}">
                  <i class="fas fa-edit"></i> Edit
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    container.querySelectorAll('.edit-schedule-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.openScheduleModal(btn.dataset.id, btn.dataset.name));
    });
  }

  bindScheduleModal() {
    const modal = document.getElementById('scheduleModal');
    document.getElementById('closeScheduleModal')?.addEventListener('click', () => { modal.style.display = 'none'; });
    document.getElementById('cancelScheduleBtn')?.addEventListener('click', () => { modal.style.display = 'none'; });
    document.getElementById('scheduleForm')?.addEventListener('submit', (e) => this.saveSchedule(e));
  }

  async openScheduleModal(staffId, name) {
    this.editingScheduleId = staffId;
    document.getElementById('scheduleModalTitle').innerHTML = `<i class="fas fa-calendar-week"></i> ${this.escapeHtml(name)}`;
    const data = await staffService.getSchedule(staffId);
    const days = [
      ['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'],
      ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun']
    ];
    const editor = document.getElementById('scheduleEditor');
    editor.innerHTML = days.map(([key, label]) => {
      const day = data.schedule[key] || { active: false, start: '08:00', end: '18:00' };
      return `
        <div class="schedule-day-row">
          <label>${label}</label>
          <input type="time" class="sched-start" data-day="${key}" value="${day.start}">
          <input type="time" class="sched-end" data-day="${key}" value="${day.end}">
          <label><input type="checkbox" class="sched-active" data-day="${key}" ${day.active ? 'checked' : ''}> On</label>
        </div>`;
    }).join('');
    document.getElementById('scheduleModal').style.display = 'flex';
  }

  async saveSchedule(e) {
    e.preventDefault();
    const errorEl = document.getElementById('scheduleFormError');
    errorEl.style.display = 'none';
    const schedule = {};
    document.querySelectorAll('.sched-active').forEach((cb) => {
      const day = cb.dataset.day;
      schedule[day] = {
        active: cb.checked,
        start: document.querySelector(`.sched-start[data-day="${day}"]`)?.value || '08:00',
        end: document.querySelector(`.sched-end[data-day="${day}"]`)?.value || '18:00'
      };
    });
    try {
      await staffService.updateSchedule(this.editingScheduleId, schedule);
      document.getElementById('scheduleModal').style.display = 'none';
      await this.loadStaff();
      if (window.Toast) window.Toast.success('Schedule saved');
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
    }
  }

  bindStaffForm() {
    const form = document.getElementById('addStaffForm');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById('staffFormError');
      const btn = document.getElementById('addStaffBtn');
      errorEl.style.display = 'none';
      btn.disabled = true;

      try {
        await staffService.createStaff({
          fullName: document.getElementById('staffFullName').value.trim(),
          email: buildStaffEmail(document.getElementById('staffUsername').value.trim(), this.emailDomain),
          password: document.getElementById('staffPassword').value,
          role: document.getElementById('staffRole').value
        });
        form.reset();
        if (window.Toast) window.Toast.success('Staff account created successfully');
        await this.loadStaff();
      } catch (err) {
        errorEl.textContent = err.message || 'Failed to create staff account';
        errorEl.style.display = 'block';
      } finally {
        btn.disabled = false;
      }
    });
  }

  renderProcedureList() {
    const container = document.getElementById('procedureListContainer');
    if (!container) return;

    if (this.procedures.length === 0) {
      container.innerHTML = `
        <div class="empty-state-small">
          <p>No procedures yet. Click <strong>Load Defaults</strong> to add standard dental procedures.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <table class="procedure-table">
        <thead>
          <tr><th>Code</th><th>Name</th><th>Category</th><th>Price</th><th></th></tr>
        </thead>
        <tbody>
          ${this.procedures.map((p) => `
            <tr>
              <td><strong>${this.escapeHtml(p.code)}</strong></td>
              <td>${this.escapeHtml(p.name)}</td>
              <td>${this.escapeHtml(p.category)}</td>
              <td>${parseFloat(p.defaultPrice || 0).toFixed(2)}</td>
              <td class="procedure-actions">
                <button class="btn-icon-sm delete-proc-btn" data-id="${p.id}" title="Delete"><i class="fas fa-trash"></i></button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    container.querySelectorAll('.delete-proc-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this procedure?')) return;
        await procedureService.delete(btn.dataset.id);
        if (window.Toast) window.Toast.success('Procedure deleted');
        this.procedures = await procedureService.getAll();
        this.renderProcedureList();
      });
    });
  }

  bindProcedureForm() {
    document.getElementById('addProcedureForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById('procFormError');
      errorEl.style.display = 'none';
      try {
        await procedureService.create({
          code: document.getElementById('procCode').value.trim(),
          name: document.getElementById('procName').value.trim(),
          defaultPrice: document.getElementById('procPrice').value,
          category: document.getElementById('procCategory').value
        });
        e.target.reset();
        this.procedures = await procedureService.getAll();
        this.renderProcedureList();
        if (window.Toast) window.Toast.success('Procedure added');
      } catch (err) {
        errorEl.textContent = err.message || 'Failed to add procedure';
        errorEl.style.display = 'block';
      }
    });

    document.getElementById('seedProceduresBtn')?.addEventListener('click', async () => {
      const result = await procedureService.seedDefaultsIfEmpty();
      this.procedures = await procedureService.getAll();
      this.renderProcedureList();
      if (window.Toast) {
        window.Toast.success(result.seeded > 0 ? `Loaded ${result.seeded} default procedures` : 'Procedures already exist');
      }
    });
  }

  async loadMobileAccessPanel() {
    const panel = document.getElementById('mobileAccessPanel');
    if (!panel) return;

    let networkUrls = [];
    try {
      const res = await fetch(`${API_BASE}/auth/config`);
      const data = await res.json();
      networkUrls = data.networkUrls || [];
    } catch {
      /* ignore */
    }

    const current = `${window.location.protocol}//${window.location.host}`;
    const urls = [...new Set([current, ...networkUrls])];

    panel.innerHTML = `
      <div class="network-url-list">
        ${urls.map((url, idx) => `
          <div class="network-url-item">
            <code>${this.escapeHtml(url)}</code>
            <span class="text-muted-sm">${idx === 0 ? 'This session' : 'Same Wi‑Fi'}</span>
          </div>
        `).join('')}
      </div>
      <p class="settings-hint" style="margin-top:0.75rem">Tip: bookmark the LAN URL on staff phones. For a desktop installer, run <code>npm run build:win</code> and use the file in <code>dist/</code>.</p>
    `;
  }

  async loadAdminPanel() {
    try {
      const info = await adminService.getSystemInfo();
      const panel = document.getElementById('systemInfoPanel');
      if (panel) {
        const sizeMb = (info.databaseSizeBytes / (1024 * 1024)).toFixed(2);
        panel.innerHTML = `
          <div class="system-info-grid">
            <div><span>Version</span><strong>${info.version}</strong></div>
            <div><span>Patients</span><strong>${info.patients}</strong></div>
            <div><span>Appointments</span><strong>${info.appointments}</strong></div>
            <div><span>Invoices</span><strong>${info.invoices}</strong></div>
            <div><span>Backups</span><strong>${info.backups}</strong></div>
            <div><span>DB Size</span><strong>${sizeMb} MB</strong></div>
          </div>
          ${info.networkUrls?.length ? `
            <div class="network-url-list" style="margin-top:1rem">
              <strong style="display:block;margin-bottom:0.5rem;font-size:0.8125rem">Network access</strong>
              ${info.networkUrls.map((url) => `<div class="network-url-item"><code>${this.escapeHtml(url)}</code></div>`).join('')}
            </div>
          ` : ''}
        `;
      }
      await this.renderAuditLog();
      await this.renderBackupList();
      this.bindAdminActions();
    } catch (err) {
      console.error('Admin panel error:', err);
    }
  }

  async renderBackupList() {
    const container = document.getElementById('backupListContainer');
    if (!container) return;
    try {
      const backups = await adminService.listBackups();
      if (backups.length === 0) {
        container.innerHTML = '<p class="text-muted">No backups yet. Create one above.</p>';
        return;
      }
      container.innerHTML = `
        <table class="procedure-table backup-table">
          <thead><tr><th>Backup</th><th>Created</th><th></th></tr></thead>
          <tbody>
            ${backups.map((b) => `
              <tr>
                <td><code>${this.escapeHtml(b.name)}</code></td>
                <td>${b.createdAt ? new Date(b.createdAt).toLocaleString() : '—'}</td>
                <td>
                  <button type="button" class="btn-secondary btn-sm restore-backup-btn" data-name="${this.escapeHtml(b.name)}">
                    <i class="fas fa-undo"></i> Restore
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      container.querySelectorAll('.restore-backup-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const name = btn.dataset.name;
          if (!confirm(`Restore from "${name}"? Current data will be overwritten.`)) return;
          btn.disabled = true;
          try {
            await adminService.restoreBackup(name);
            if (window.Toast) window.Toast.success('Backup restored. Reloading...');
            setTimeout(() => window.location.reload(), 1500);
          } catch (err) {
            if (window.Toast) window.Toast.error(err.message);
            btn.disabled = false;
          }
        });
      });
    } catch (err) {
      container.innerHTML = `<p class="text-muted">Could not load backups: ${this.escapeHtml(err.message)}</p>`;
    }
  }

  async renderAuditLog() {
    const container = document.getElementById('auditLogContainer');
    if (!container) return;
    try {
      const entries = await adminService.getAuditLog(80);
      if (entries.length === 0) {
        container.innerHTML = '<div class="empty-state-small"><p>No audit entries yet</p></div>';
        return;
      }
      container.innerHTML = `
        <div class="audit-log-wrap">
          <table class="procedure-table audit-table">
            <thead>
              <tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr>
            </thead>
            <tbody>
              ${entries.map((e) => `
                <tr>
                  <td>${e.created_at ? new Date(e.created_at).toLocaleString() : ''}</td>
                  <td>${this.escapeHtml(e.userName || '—')}</td>
                  <td><code>${this.escapeHtml(e.action)}</code></td>
                  <td>${this.escapeHtml(e.details || e.entityId || '')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="empty-state-small"><p>Could not load audit log: ${err.message}</p></div>`;
    }
  }

  bindAdminActions() {
    if (this._adminActionsBound) return;
    this._adminActionsBound = true;

    document.getElementById('backupNowBtn')?.addEventListener('click', async () => {
      const btn = document.getElementById('backupNowBtn');
      btn.disabled = true;
      try {
        const result = await adminService.createBackup();
        if (window.Toast) window.Toast.success(`Backup created: ${result.name}`);
        await this.loadAdminPanel();
        await this.renderBackupList();
      } catch (err) {
        if (window.Toast) window.Toast.error(err.message);
      } finally {
        btn.disabled = false;
      }
    });

    document.getElementById('seedDemoBtn')?.addEventListener('click', async () => {
      if (!confirm('Load demo patients, appointments, and billing? This only works if no patients exist yet.')) return;
      const btn = document.getElementById('seedDemoBtn');
      btn.disabled = true;
      try {
        const result = await adminService.seedDemo();
        if (window.Toast) {
          window.Toast.success(`Demo loaded: ${result.patients} patients, ${result.appointments} appointments`);
        }
        await this.loadAdminPanel();
        await this.loadStaff();
      } catch (err) {
        const msg = err.message || 'Could not load demo data';
        if (window.Toast) window.Toast.error(msg.includes('patients') ? 'Patients already exist — delete the database first or use a fresh install.' : msg);
      } finally {
        btn.disabled = false;
      }
    });

    document.getElementById('exportJsonBtn')?.addEventListener('click', async () => {
      try {
        await adminService.exportFullJson();
        if (window.Toast) window.Toast.success('Full export downloaded');
        await this.renderAuditLog();
      } catch (err) {
        if (window.Toast) window.Toast.error(err.message);
      }
    });

    document.getElementById('exportCsvBtn')?.addEventListener('click', async () => {
      try {
        await adminService.exportPatientsCsv();
        if (window.Toast) window.Toast.success('Patient CSV downloaded');
        await this.renderAuditLog();
      } catch (err) {
        if (window.Toast) window.Toast.error(err.message);
      }
    });

    document.getElementById('refreshAuditBtn')?.addEventListener('click', () => this.renderAuditLog());
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
