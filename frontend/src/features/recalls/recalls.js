import {
  recallService,
  getRecallCategory,
  getDaysUntilRecall
} from '../../services/recallService.js';
import { getCurrentRole } from '../../services/authService.js';

export class Recalls {
  constructor() {
    this.patients = [];
    this.filter = 'overdue';
    this.canEdit = ['admin', 'receptionist', 'dentist'].includes(getCurrentRole());
  }

  async render() {
    return `
      <div class="recalls-container">
        <div class="recalls-header">
          <div>
            <h1><i class="fas fa-bell"></i> Recall Management</h1>
            <p>Patients due for hygiene checkups and follow-up visits</p>
          </div>
        </div>

        <div class="recalls-stats-row" id="recallsStatsRow">
          <div class="loading">Loading stats...</div>
        </div>

        <div class="recalls-toolbar">
          <div class="recalls-filters">
            <button class="recall-filter-btn active" data-filter="overdue">Overdue</button>
            <button class="recall-filter-btn" data-filter="week">This Week</button>
            <button class="recall-filter-btn" data-filter="month">This Month</button>
            <button class="recall-filter-btn" data-filter="all">All Scheduled</button>
          </div>
          <input type="search" id="recallSearch" placeholder="Search name, MRN, phone..." class="recall-search">
          <button type="button" class="btn-secondary btn-sm" id="exportRecallsCsvBtn">
            <i class="fas fa-file-csv"></i> Export Call List
          </button>
        </div>

        <div class="recalls-table-wrap">
          <table class="recalls-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Phone</th>
                <th>Recall Due</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="recallsTableBody">
              <tr><td colspan="5" class="loading">Loading recalls...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div id="recallModal" class="modal-overlay" style="display:none;">
        <div class="appointment-modal">
          <div class="modal-header">
            <h3><i class="fas fa-calendar-plus"></i> Update Recall Date</h3>
            <button class="modal-close" id="closeRecallModal">&times;</button>
          </div>
          <form id="recallForm" class="appointment-form">
            <input type="hidden" id="recallPatientId">
            <p id="recallPatientLabel" class="recall-patient-label"></p>
            <div class="form-field">
              <label>New Recall Due Date *</label>
              <input type="date" id="recallDueDate" required>
            </div>
            <div class="form-field">
              <label>Quick Schedule</label>
              <div class="recall-quick-btns">
                <button type="button" class="btn-secondary btn-sm" data-months="3">+3 months</button>
                <button type="button" class="btn-secondary btn-sm" data-months="6">+6 months</button>
                <button type="button" class="btn-secondary btn-sm" data-months="12">+12 months</button>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" id="cancelRecallModal">Cancel</button>
              <button type="submit" class="btn-primary">Save Recall</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  async init() {
    await this.loadData();
    this.bindEvents();
  }

  async loadData() {
    this.patients = await recallService.getPatientsWithRecall();
    this.renderStats();
    this.renderTable();
  }

  renderStats() {
    const stats = recallService.computeStats(this.patients);
    const el = document.getElementById('recallsStatsRow');
    if (!el) return;
    el.innerHTML = `
      <div class="recall-stat-card overdue"><span>Overdue</span><strong>${stats.overdue}</strong></div>
      <div class="recall-stat-card"><span>Due This Week</span><strong>${stats.dueThisWeek}</strong></div>
      <div class="recall-stat-card"><span>Due This Month</span><strong>${stats.dueThisMonth}</strong></div>
      <div class="recall-stat-card"><span>Total Scheduled</span><strong>${stats.total}</strong></div>
    `;
  }

  getFilteredList() {
    const search = (document.getElementById('recallSearch')?.value || '').toLowerCase();
    let list = this.patients;

    if (this.filter === 'overdue') {
      list = list.filter((p) => getRecallCategory(p) === 'overdue');
    } else if (this.filter === 'week') {
      list = list.filter((p) => {
        const cat = getRecallCategory(p);
        return cat === 'overdue' || cat === 'week';
      });
    } else if (this.filter === 'month') {
      list = list.filter((p) => {
        const cat = getRecallCategory(p);
        return cat === 'overdue' || cat === 'week' || cat === 'month';
      });
    }

    if (search) {
      list = list.filter((p) =>
        p.name.toLowerCase().includes(search) ||
        p.mrn.toLowerCase().includes(search) ||
        (p.phone_number && p.phone_number.includes(search))
      );
    }
    return list;
  }

  renderTable() {
    const tbody = document.getElementById('recallsTableBody');
    if (!tbody) return;

    const list = this.getFilteredList();
    if (list.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="5" class="empty-cell">
          <i class="fas fa-check-circle"></i> No patients in this recall list
        </td></tr>
      `;
      return;
    }

    tbody.innerHTML = list.map((p) => {
      const cat = getRecallCategory(p);
      const days = getDaysUntilRecall(p);
      const statusClass = cat === 'overdue' ? 'overdue' : cat === 'week' ? 'due-soon' : 'scheduled';
      const statusLabel = cat === 'overdue'
        ? `${Math.abs(days)} days overdue`
        : days === 0 ? 'Due today' : `In ${days} days`;

      return `
        <tr>
          <td>
            <strong>${this.esc(p.name)}</strong><br>
            <small>${p.mrn}</small>
          </td>
          <td>
            ${p.phone_number
              ? `<a href="tel:${p.phone_number}" class="phone-link"><i class="fas fa-phone"></i> ${this.esc(p.phone_number)}</a>`
              : '—'}
          </td>
          <td>${p.recall_due ? new Date(`${p.recall_due}T00:00:00`).toLocaleDateString() : '—'}</td>
          <td><span class="recall-status ${statusClass}">${statusLabel}</span></td>
          <td class="recall-actions">
            <button class="btn-secondary btn-sm view-patient-btn" data-id="${p.id}">View</button>
            <button class="btn-primary btn-sm book-appt-btn" data-id="${p.id}">Book</button>
            ${this.canEdit ? `<button class="btn-secondary btn-sm set-recall-btn" data-id="${p.id}">Set Recall</button>` : ''}
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.view-patient-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        window.location.hash = `#/patient/${btn.dataset.id}`;
      });
    });
    tbody.querySelectorAll('.book-appt-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        sessionStorage.setItem('bookAppointmentPatientId', btn.dataset.id);
        window.location.hash = 'appointments';
      });
    });
    tbody.querySelectorAll('.set-recall-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.openRecallModal(btn.dataset.id));
    });
  }

  bindEvents() {
    document.querySelectorAll('.recall-filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.recall-filter-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.filter = btn.dataset.filter;
        this.renderTable();
      });
    });

    document.getElementById('recallSearch')?.addEventListener('input', () => this.renderTable());

    document.getElementById('exportRecallsCsvBtn')?.addEventListener('click', () => this.exportCallList());

    document.getElementById('closeRecallModal')?.addEventListener('click', () => this.closeRecallModal());
    document.getElementById('cancelRecallModal')?.addEventListener('click', () => this.closeRecallModal());

    document.querySelectorAll('.recall-quick-btns button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const months = parseInt(btn.dataset.months, 10);
        const d = new Date();
        d.setMonth(d.getMonth() + months);
        document.getElementById('recallDueDate').value = d.toISOString().split('T')[0];
      });
    });

    document.getElementById('recallForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const patientId = document.getElementById('recallPatientId').value;
      const recallDue = document.getElementById('recallDueDate').value;
      try {
        await recallService.updateRecallDate(patientId, recallDue);
        this.closeRecallModal();
        await this.loadData();
        window.app?.updateRecallBadge?.();
        if (window.Toast) window.Toast.success('Recall date updated');
      } catch (err) {
        if (window.Toast) window.Toast.error(err.message);
      }
    });
  }

  openRecallModal(patientId) {
    const patient = this.patients.find((p) => p.id === patientId);
    if (!patient) return;
    document.getElementById('recallPatientId').value = patientId;
    document.getElementById('recallPatientLabel').textContent = `${patient.name} (${patient.mrn})`;
    document.getElementById('recallDueDate').value = patient.recall_due || '';
    document.getElementById('recallModal').style.display = 'flex';
  }

  closeRecallModal() {
    document.getElementById('recallModal').style.display = 'none';
  }

  exportCallList() {
    const list = this.getFilteredList();
    if (!list.length) {
      if (window.Toast) window.Toast.warning('No recalls to export');
      return;
    }
    const header = ['Name', 'MRN', 'Phone', 'Recall Due', 'Status'];
    const rows = list.map((p) => {
      const cat = getRecallCategory(p);
      const days = getDaysUntilRecall(p);
      const status = cat === 'overdue' ? `Overdue ${Math.abs(days)}d` : cat;
      return [
        p.name,
        p.mrn,
        p.phone_number || '',
        p.recall_due || '',
        status
      ];
    });
    const csv = [header, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recall_call_list_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    if (window.Toast) window.Toast.success(`Exported ${list.length} patients`);
  }

  esc(text) {
    if (!text) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }
}
