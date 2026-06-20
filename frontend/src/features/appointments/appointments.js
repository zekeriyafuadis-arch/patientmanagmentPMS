import {
  appointmentService,
  APPOINTMENT_TYPES,
  APPOINTMENT_STATUSES,
  getStatusMeta,
  getTypeLabel
} from '../../services/appointmentService.js';
import { patientService } from '../../services/patientService.js';
import { staffService } from '../../services/staffService.js';
import { recallService } from '../../services/recallService.js';
import { getCurrentRole, canAssignDoctors, getCurrentUser } from '../../services/authService.js';

export class Appointments {
  constructor() {
    this.viewMode = 'day';
    this.selectedDate = new Date();
    this.appointments = [];
    this.patients = [];
    this.staff = [];
    this.editingId = null;
    this.isReception = canAssignDoctors();
    this.isDentist = getCurrentRole() === 'dentist';
    this.currentUserId = getCurrentUser()?.uid || '';
  }

  async render() {
    const dateStr = this.formatDateInput(this.selectedDate);
    return `
      <div class="appointments-container">
        <div class="appointments-header">
          <div>
            <h1><i class="fas fa-calendar-alt"></i> Appointments</h1>
            <p>Schedule and manage clinic appointments</p>
          </div>
          <button class="btn-primary" id="newAppointmentBtn">
            <i class="fas fa-plus"></i> New Appointment
          </button>
        </div>

        <div class="appointments-toolbar">
          <div class="view-toggle">
            <button class="view-toggle-btn ${this.viewMode === 'day' ? 'active' : ''}" data-view="day">
              <i class="fas fa-calendar-day"></i> Day
            </button>
            <button class="view-toggle-btn ${this.viewMode === 'week' ? 'active' : ''}" data-view="week">
              <i class="fas fa-calendar-week"></i> Week
            </button>
          </div>
          <div class="date-nav">
            <button class="btn-icon" id="prevDateBtn" title="Previous"><i class="fas fa-chevron-left"></i></button>
            <input type="date" id="appointmentDatePicker" value="${dateStr}">
            <button class="btn-icon" id="nextDateBtn" title="Next"><i class="fas fa-chevron-right"></i></button>
            <button class="btn-secondary btn-sm" id="todayBtn">Today</button>
          </div>
          <div class="appointments-summary" id="appointmentsSummary"></div>
        </div>

        <div id="appointmentsCalendar" class="appointments-calendar">
          <div class="loading-state"><div class="loading-spinner"></div><p>Loading appointments...</p></div>
        </div>
      </div>

      <div id="appointmentModal" class="modal-overlay" style="display:none;">
        <div class="appointment-modal">
          <div class="modal-header">
            <h3 id="appointmentModalTitle"><i class="fas fa-calendar-plus"></i> New Appointment</h3>
            <button class="modal-close" id="closeAppointmentModal">&times;</button>
          </div>
          <form id="appointmentForm" class="appointment-form">
            <input type="hidden" id="appointmentId">
            <div class="form-grid-2">
              <div class="form-field full-width">
                <label>Patient *</label>
                <select id="apptPatientId" required>
                  <option value="">Select patient...</option>
                </select>
              </div>
              <div class="form-field">
                <label>Date *</label>
                <input type="date" id="apptDate" required>
              </div>
              <div class="form-field">
                <label>Time *</label>
                <input type="time" id="apptTime" required value="09:00">
              </div>
              <div class="form-field">
                <label>Duration (min)</label>
                <select id="apptDuration">
                  <option value="15">15 min</option>
                  <option value="30" selected>30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">60 min</option>
                  <option value="90">90 min</option>
                </select>
              </div>
              <div class="form-field">
                <label>Type *</label>
                <select id="apptType" required>
                  ${APPOINTMENT_TYPES.map((t) => `<option value="${t.value}">${t.label}</option>`).join('')}
                </select>
              </div>
              <div class="form-field">
                <label>Dentist *</label>
                <select id="apptStaffId" ${this.isReception ? 'required' : ''}>
                  <option value="">${this.isReception ? 'Auto — next available' : 'Any available'}</option>
                </select>
                ${this.isReception ? `
                  <button type="button" class="btn-secondary btn-sm" id="suggestSlotBtn" style="margin-top:6px;">
                    <i class="fas fa-magic"></i> Find Best Slot
                  </button>
                  <p class="form-hint" id="slotSuggestion"></p>
                ` : ''}
              </div>
              <div class="form-field">
                <label>Chair</label>
                <input type="text" id="apptChair" placeholder="e.g. Chair 1">
              </div>
              ${this.isReception ? '' : `
              <div class="form-field">
                <label>Status</label>
                <select id="apptStatus">
                  ${APPOINTMENT_STATUSES.map((s) => `<option value="${s.value}">${s.label}</option>`).join('')}
                </select>
              </div>
              `}
              <div class="form-field full-width">
                <label>Notes</label>
                <textarea id="apptNotes" rows="2" placeholder="Optional notes"></textarea>
              </div>
            </div>
            <div id="appointmentFormError" class="login-error" style="display:none;"></div>
            <div class="modal-footer">
              <button type="button" class="btn-danger" id="deleteAppointmentBtn" style="display:none;">
                <i class="fas fa-trash"></i> Delete
              </button>
              <div class="modal-footer-right">
                <button type="button" class="btn-secondary" id="cancelAppointmentBtn">Cancel</button>
                <button type="submit" class="btn-primary" id="saveAppointmentBtn">
                  <i class="fas fa-save"></i> Save
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  async init() {
    await this.loadReferenceData();
    await this.loadAppointments();
    this.bindToolbar();
    this.checkPrefillPatient();
  }

  async loadReferenceData() {
    try {
      const [patientsRes, staff] = await Promise.all([
        patientService.fetchAll(),
        staffService.getAll()
      ]);
      this.patients = patientsRes.data || [];
      this.staff = staff.filter((s) => s.role === 'dentist');
    } catch (err) {
      console.error('Error loading reference data:', err);
    }
  }

  async loadAppointments() {
    const container = document.getElementById('appointmentsCalendar');
    if (!container) return;

    try {
      if (this.viewMode === 'day') {
        this.appointments = await appointmentService.getByDate(this.selectedDate);
      } else {
        const weekStart = this.getWeekStart(this.selectedDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        this.appointments = await appointmentService.getByDateRange(weekStart, weekEnd);
      }
      this.renderCalendar();
      this.updateSummary();
    } catch (err) {
      console.error('Error loading appointments:', err);
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Could not load appointments</h3>
          <p>${err.message}</p>
        </div>
      `;
    }
  }

  renderCalendar() {
    const container = document.getElementById('appointmentsCalendar');
    if (!container) return;

    if (this.viewMode === 'day') {
      container.innerHTML = this.renderDayView();
    } else {
      container.innerHTML = this.renderWeekView();
    }
    this.bindAppointmentActions();
  }

  renderDayView() {
    const active = this.appointments.filter((a) => a.status !== 'cancelled');
    if (active.length === 0) {
      return `
        <div class="empty-state">
          <i class="fas fa-calendar-check"></i>
          <h3>No appointments</h3>
          <p>No appointments scheduled for ${this.selectedDate.toLocaleDateString()}</p>
          <button class="btn-primary" id="emptyNewApptBtn"><i class="fas fa-plus"></i> Book Appointment</button>
        </div>
      `;
    }

    return `
      <div class="day-schedule">
        ${active.map((appt) => this.renderAppointmentCard(appt)).join('')}
      </div>
    `;
  }

  renderWeekView() {
    const weekStart = this.getWeekStart(this.selectedDate);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });

    return `
      <div class="week-grid">
        ${days.map((day) => {
          const dayAppts = this.appointments.filter((a) => {
            if (a.status === 'cancelled') return false;
            const apptDate = new Date(a.datetime);
            return apptDate.toDateString() === day.toDateString();
          });
          const isToday = day.toDateString() === new Date().toDateString();
          return `
            <div class="week-day-column ${isToday ? 'today' : ''}">
              <div class="week-day-header">
                <span class="week-day-name">${day.toLocaleDateString('en', { weekday: 'short' })}</span>
                <span class="week-day-date">${day.getDate()}</span>
              </div>
              <div class="week-day-appointments">
                ${dayAppts.length === 0
                  ? '<div class="week-empty">—</div>'
                  : dayAppts.map((a) => this.renderWeekAppointment(a)).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  renderAppointmentCard(appt) {
    const time = new Date(appt.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const status = getStatusMeta(appt.status);
    return `
      <div class="appointment-card status-${appt.status}" data-id="${appt.id}">
        <div class="appt-time"><i class="fas fa-clock"></i> ${time} <span class="appt-duration">${appt.duration}min</span></div>
        <div class="appt-patient">
          <strong>${this.escapeHtml(appt.patientName)}</strong>
          <span class="appt-mrn">${appt.patientMrn}</span>
        </div>
        <div class="appt-meta">
          <span class="appt-type-badge">${getTypeLabel(appt.type)}</span>
          ${appt.staffName ? `<span><i class="fas fa-user-md"></i> ${this.escapeHtml(appt.staffName)}</span>` : ''}
          ${appt.chair ? `<span><i class="fas fa-door-open"></i> ${this.escapeHtml(appt.chair)}</span>` : ''}
        </div>
        <div class="appt-status-row">
          <span class="status-badge" style="background:${status.color}">${status.label}</span>
          <div class="appt-actions">
            ${this.renderStatusButtons(appt)}
            <button class="btn-icon-sm edit-appt-btn" data-id="${appt.id}" title="Edit"><i class="fas fa-edit"></i></button>
          </div>
        </div>
      </div>
    `;
  }

  renderWeekAppointment(appt) {
    const time = new Date(appt.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const status = getStatusMeta(appt.status);
    return `
      <div class="week-appt-card status-${appt.status}" data-id="${appt.id}">
        <div class="week-appt-time">${time}</div>
        <div class="week-appt-name">${this.escapeHtml(appt.patientName)}</div>
        <div class="week-appt-type">${getTypeLabel(appt.type)}</div>
        <span class="status-dot" style="background:${status.color}" title="${status.label}"></span>
      </div>
    `;
  }

  renderStatusButtons(appt) {
    if (appt.status === 'pending_doctor' && this.isDentist && String(appt.staffId) === String(this.currentUserId)) {
      return `
        <button class="btn-status-sm confirm-assign-btn" data-id="${appt.id}" data-action="confirm">
          <i class="fas fa-check"></i> Confirm
        </button>
        <button class="btn-status-sm btn-no-show decline-assign-btn" data-id="${appt.id}" data-action="decline">
          <i class="fas fa-times"></i> Decline
        </button>`;
    }
    if (appt.status === 'pending_doctor') {
      return '<span class="text-muted-sm">Awaiting doctor</span>';
    }

    const flow = {
      scheduled: [{ status: 'confirmed', label: 'Confirm', icon: 'check' }],
      confirmed: [{ status: 'in_chair', label: 'Check In', icon: 'user-check' }],
      in_chair: [{ status: 'completed', label: 'Complete', icon: 'check-double' }],
      completed: [],
      no_show: [],
      cancelled: []
    };
    const actions = flow[appt.status] || [];
    const primary = actions.map((a) => `
      <button class="btn-status-sm" data-id="${appt.id}" data-status="${a.status}">
        <i class="fas fa-${a.icon}"></i> ${a.label}
      </button>
    `).join('');
    const noShow = ['scheduled', 'confirmed'].includes(appt.status)
      ? `<button class="btn-status-sm btn-no-show" data-id="${appt.id}" data-status="no_show" title="Mark no-show">
          <i class="fas fa-user-slash"></i>
        </button>`
      : '';
    return primary + noShow;
  }

  updateSummary() {
    const el = document.getElementById('appointmentsSummary');
    if (!el) return;
    const active = this.appointments.filter((a) => !['cancelled', 'completed'].includes(a.status));
    const inChair = this.appointments.filter((a) => a.status === 'in_chair').length;
    el.innerHTML = `
      <span><strong>${active.length}</strong> active</span>
      <span><strong>${inChair}</strong> in chair</span>
      <span><strong>${this.appointments.length}</strong> total</span>
    `;
  }

  bindToolbar() {
    document.getElementById('newAppointmentBtn')?.addEventListener('click', () => this.openModal());
    document.getElementById('prevDateBtn')?.addEventListener('click', () => this.shiftDate(-1));
    document.getElementById('nextDateBtn')?.addEventListener('click', () => this.shiftDate(1));
    document.getElementById('todayBtn')?.addEventListener('click', () => {
      this.selectedDate = new Date();
      document.getElementById('appointmentDatePicker').value = this.formatDateInput(this.selectedDate);
      this.loadAppointments();
    });
    document.getElementById('appointmentDatePicker')?.addEventListener('change', (e) => {
      this.selectedDate = new Date(e.target.value + 'T12:00:00');
      this.loadAppointments();
    });
    document.querySelectorAll('.view-toggle-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.viewMode = btn.dataset.view;
        document.querySelectorAll('.view-toggle-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.loadAppointments();
      });
    });
    document.getElementById('closeAppointmentModal')?.addEventListener('click', () => this.closeModal());
    document.getElementById('cancelAppointmentBtn')?.addEventListener('click', () => this.closeModal());
    document.getElementById('appointmentForm')?.addEventListener('submit', (e) => this.saveAppointment(e));
    document.getElementById('deleteAppointmentBtn')?.addEventListener('click', () => this.deleteAppointment());
    document.getElementById('suggestSlotBtn')?.addEventListener('click', () => this.suggestBestSlot());
  }

  bindAppointmentActions() {
    document.getElementById('emptyNewApptBtn')?.addEventListener('click', () => this.openModal());
    document.querySelectorAll('.edit-appt-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openModal(btn.dataset.id);
      });
    });
    document.querySelectorAll('.appointment-card, .week-appt-card').forEach((card) => {
      card.addEventListener('click', () => this.openModal(card.dataset.id));
    });
    document.querySelectorAll('.btn-status-sm').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const { id } = btn.dataset;
        if (btn.dataset.action === 'confirm') {
          await appointmentService.confirmAssignment(id);
          if (window.Toast) window.Toast.success('Assignment confirmed — clinical records unlocked');
          await this.loadAppointments();
          return;
        }
        if (btn.dataset.action === 'decline') {
          if (!confirm('Decline this assignment? Reception will be notified and another dentist suggested.')) return;
          const res = await appointmentService.declineAssignment(id);
          if (window.Toast) window.Toast.info(res.message || 'Assignment declined');
          window.app?.updateClinicAlertsBadge?.();
          await this.loadAppointments();
          return;
        }
        const { status } = btn.dataset;
        await appointmentService.updateStatus(id, status);
        if (status === 'completed') {
          const appt = this.appointments.find((a) => String(a.id) === String(id));
          if (appt?.patientId) {
            await recallService.scheduleRecallMonths(appt.patientId, 6);
            if (window.Toast) window.Toast.info('Visit complete — recall set for 6 months. Doctor assignment cleared.');
          } else if (window.Toast) {
            window.Toast.success('Appointment completed');
          }
          window.app?.updateClinicAlertsBadge?.();
        } else if (status === 'no_show') {
          if (window.Toast) window.Toast.warning('Marked as no-show');
        } else if (window.Toast) {
          window.Toast.success('Status updated');
        }
        await this.loadAppointments();
        window.app?.updateRecallBadge?.();
      });
    });
  }

  shiftDate(days) {
    const d = new Date(this.selectedDate);
    d.setDate(d.getDate() + (this.viewMode === 'week' ? days * 7 : days));
    this.selectedDate = d;
    document.getElementById('appointmentDatePicker').value = this.formatDateInput(d);
    this.loadAppointments();
  }

  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  formatDateInput(date) {
    return date.toISOString().split('T')[0];
  }

  populateFormSelects() {
    const patientSelect = document.getElementById('apptPatientId');
    const staffSelect = document.getElementById('apptStaffId');
    if (patientSelect) {
      patientSelect.innerHTML = '<option value="">Select patient...</option>' +
        this.patients.map((p) => `<option value="${p.id}">${this.escapeHtml(p.name)} (${p.mrn})</option>`).join('');
    }
    if (staffSelect) {
      staffSelect.innerHTML = `<option value="">${this.isReception ? 'Auto — next available' : 'Any available'}</option>` +
        this.staff.map((s) => `<option value="${s.id}">${this.escapeHtml(s.fullName)}</option>`).join('');
    }
  }

  async suggestBestSlot() {
    const dateStr = document.getElementById('apptDate')?.value || this.formatDateInput(this.selectedDate);
    const duration = parseInt(document.getElementById('apptDuration')?.value, 10) || 30;
    const hint = document.getElementById('slotSuggestion');
    try {
      const slots = await appointmentService.getAvailableSlots(dateStr, duration);
      if (slots.length === 0) {
        if (hint) hint.textContent = 'No free slots this day — try another date.';
        return;
      }
      const best = slots[0];
      document.getElementById('apptStaffId').value = best.staffId;
      document.getElementById('apptTime').value = best.time;
      if (hint) {
        hint.textContent = `Suggested: ${best.staffName} at ${best.time}`;
      }
    } catch (err) {
      if (hint) hint.textContent = err.message;
    }
  }

  async openModal(appointmentId = null) {
    this.editingId = appointmentId;
    this.populateFormSelects();
    const modal = document.getElementById('appointmentModal');
    const title = document.getElementById('appointmentModalTitle');
    const deleteBtn = document.getElementById('deleteAppointmentBtn');
    const errorEl = document.getElementById('appointmentFormError');
    errorEl.style.display = 'none';

    if (appointmentId) {
      const appt = await appointmentService.getById(appointmentId);
      if (!appt) return;
      title.innerHTML = '<i class="fas fa-edit"></i> Edit Appointment';
      deleteBtn.style.display = 'inline-flex';
      document.getElementById('appointmentId').value = appt.id;
      document.getElementById('apptPatientId').value = appt.patientId;
      const dt = new Date(appt.datetime);
      document.getElementById('apptDate').value = this.formatDateInput(dt);
      document.getElementById('apptTime').value = dt.toTimeString().slice(0, 5);
      document.getElementById('apptDuration').value = appt.duration;
      document.getElementById('apptType').value = appt.type;
      document.getElementById('apptStaffId').value = appt.staffId || '';
      document.getElementById('apptChair').value = appt.chair || '';
      const statusEl = document.getElementById('apptStatus');
      if (statusEl) statusEl.value = appt.status;
      document.getElementById('apptNotes').value = appt.notes || '';
    } else {
      title.innerHTML = '<i class="fas fa-calendar-plus"></i> New Appointment';
      deleteBtn.style.display = 'none';
      document.getElementById('appointmentForm').reset();
      document.getElementById('appointmentId').value = '';
      document.getElementById('apptDate').value = this.formatDateInput(this.selectedDate);
      document.getElementById('apptTime').value = '09:00';
      document.getElementById('apptDuration').value = '30';
      const statusEl = document.getElementById('apptStatus');
      if (statusEl) statusEl.value = this.isReception ? 'pending_doctor' : 'scheduled';
      const hint = document.getElementById('slotSuggestion');
      if (hint) hint.textContent = '';
      if (this.isReception) this.suggestBestSlot();
    }

    modal.style.display = 'flex';
  }

  closeModal() {
    document.getElementById('appointmentModal').style.display = 'none';
    this.editingId = null;
  }

  checkPrefillPatient() {
    const patientId = sessionStorage.getItem('bookAppointmentPatientId');
    if (patientId) {
      sessionStorage.removeItem('bookAppointmentPatientId');
      this.openModal().then(() => {
        document.getElementById('apptPatientId').value = patientId;
      });
    }
  }

  async saveAppointment(e) {
    e.preventDefault();
    const errorEl = document.getElementById('appointmentFormError');
    const btn = document.getElementById('saveAppointmentBtn');
    errorEl.style.display = 'none';
    btn.disabled = true;

    try {
      const patientId = document.getElementById('apptPatientId').value;
      const patient = this.patients.find((p) => p.id === patientId);
      if (!patient) throw new Error('Please select a patient');

      const staffId = document.getElementById('apptStaffId').value;
      const staffMember = this.staff.find((s) => s.id === staffId);
      const dateStr = document.getElementById('apptDate').value;
      const timeStr = document.getElementById('apptTime').value;
      const datetime = new Date(`${dateStr}T${timeStr}:00`);

      const payload = {
        patientId,
        patientName: patient.name,
        patientMrn: patient.mrn,
        staffId: staffId || '',
        staffName: staffMember?.fullName || '',
        datetime,
        duration: document.getElementById('apptDuration').value,
        type: document.getElementById('apptType').value,
        status: this.isReception ? 'pending_doctor' : (document.getElementById('apptStatus')?.value || 'scheduled'),
        chair: document.getElementById('apptChair').value.trim(),
        notes: document.getElementById('apptNotes').value.trim()
      };

      const existingId = document.getElementById('appointmentId').value;
      if (existingId) {
        await appointmentService.update(existingId, payload);
        if (window.Toast) window.Toast.success('Appointment updated');
      } else if (this.isReception && !staffId) {
        await appointmentService.assignDoctor({
          patientId,
          datetime: datetime.toISOString(),
          duration: payload.duration,
          type: payload.type,
          notes: payload.notes,
          auto: true
        });
        if (window.Toast) window.Toast.success('Doctor assigned — awaiting confirmation');
      } else {
        await appointmentService.create(payload);
        if (window.Toast) {
          window.Toast.success(this.isReception ? 'Sent to doctor for confirmation' : 'Appointment booked');
        }
      }

      this.closeModal();
      await this.loadAppointments();
    } catch (err) {
      errorEl.textContent = err.message || 'Failed to save appointment';
      errorEl.style.display = 'block';
    } finally {
      btn.disabled = false;
    }
  }

  async deleteAppointment() {
    const id = document.getElementById('appointmentId').value;
    if (!id || !confirm('Cancel/delete this appointment?')) return;
    try {
      await appointmentService.updateStatus(id, 'cancelled');
      if (window.Toast) window.Toast.success('Appointment cancelled');
      this.closeModal();
      await this.loadAppointments();
    } catch (err) {
      if (window.Toast) window.Toast.error(err.message);
    }
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
