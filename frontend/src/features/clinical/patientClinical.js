import { Odontogram } from '../../components/odontogram.js';
import { dentalService, getConditionMeta } from '../../services/dentalService.js';
import { procedureService } from '../../services/procedureService.js';
import { imageService } from '../../services/imageService.js';
import { getCurrentRole } from '../../services/authService.js';
import { canEditClinicalRecords, canAddAdditionalTreatment } from '../../auth/guards.js';

export class PatientClinical {
  constructor(patientId, patient = null) {
    this.patientId = patientId;
    this.patient = patient;
    this.activeTab = 'chart';
    this.odontogram = null;
    this.chartData = {};
    this.charts = [];
    this.plans = [];
    this.notes = [];
    this.procedures = [];
    this.images = [];
    const role = getCurrentRole();
    this.canView = !!(patient?.canViewClinical);
    this.canEdit = this.canView && canEditClinicalRecords(role);
    this.canAddTreatment = this.canEdit;
    this.canAddAdditionalTreatment = this.canView && canAddAdditionalTreatment(role);
  }

  renderShell() {
    if (!this.canView) return '';
    return `
      <div class="clinical-section" id="clinicalSection">
        <div class="clinical-header">
          <h3><i class="fas fa-tooth"></i> Clinical Records</h3>
        </div>
        <div class="clinical-tabs">
          <button class="clinical-tab active" data-tab="chart"><i class="fas fa-teeth"></i> Odontogram</button>
          <button class="clinical-tab" data-tab="treatment"><i class="fas fa-clipboard-list"></i> Treatment Plan</button>
          <button class="clinical-tab" data-tab="notes"><i class="fas fa-notes-medical"></i> Visit Notes</button>
          <button class="clinical-tab" data-tab="imaging"><i class="fas fa-x-ray"></i> X-Rays</button>
          <button class="clinical-tab" data-tab="history"><i class="fas fa-history"></i> Chart History</button>
        </div>
        <div id="clinicalTabContent" class="clinical-tab-content">
          <div class="loading-state"><div class="loading-spinner"></div><p>Loading clinical data...</p></div>
        </div>
      </div>
    `;
  }

  async init() {
    if (!this.canView) return;
    await this.loadData();
    this.bindTabs();
    this.renderTab();
  }

  async loadData() {
    const [charts, plans, notes, procedures, images] = await Promise.all([
      dentalService.getChartsByPatient(this.patientId),
      dentalService.getTreatmentPlans(this.patientId),
      dentalService.getVisitNotes(this.patientId),
      procedureService.getActive(),
      imageService.getByPatient(this.patientId).catch(() => [])
    ]);
    this.charts = charts;
    this.plans = plans;
    this.notes = notes;
    this.procedures = procedures;
    this.images = images;
    const latest = charts[0];
    this.chartData = latest?.chartData || {};
  }

  bindTabs() {
    document.querySelectorAll('.clinical-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.clinical-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeTab = tab.dataset.tab;
        this.renderTab();
      });
    });
  }

  renderTab() {
    const container = document.getElementById('clinicalTabContent');
    if (!container) return;
    switch (this.activeTab) {
      case 'chart': this.renderChartTab(container); break;
      case 'treatment': this.renderTreatmentTab(container); break;
      case 'notes': this.renderNotesTab(container); break;
      case 'imaging': this.renderImagingTab(container); break;
      case 'history': this.renderHistoryTab(container); break;
    }
  }

  renderChartTab(container) {
    container.innerHTML = `
      <div class="chart-tab">
        <div class="chart-toolbar">
          <span class="chart-hint">${this.canEdit ? 'Click a tooth to record condition' : 'View only'}</span>
          ${this.canEdit ? `
            <button class="btn-primary btn-sm" id="saveChartBtn"><i class="fas fa-save"></i> Save Chart Snapshot</button>
          ` : ''}
        </div>
        <div id="odontogramContainer"></div>
      </div>
    `;
    const odContainer = document.getElementById('odontogramContainer');
    this.odontogram?.destroy?.();
    this.odontogram = new Odontogram(odContainer, {
      chartData: this.chartData,
      readOnly: !this.canEdit,
      onChange: (data) => { this.chartData = data; }
    });
    this.odontogram.render();
    document.getElementById('saveChartBtn')?.addEventListener('click', () => this.saveChart());
  }

  async saveChart() {
    try {
      await dentalService.saveChart(this.patientId, this.chartData);
      await this.loadData();
      if (window.Toast) window.Toast.success('Dental chart saved');
      this.renderTab();
    } catch (err) {
      if (window.Toast) window.Toast.error(err.message || 'Failed to save chart');
    }
  }

  renderTreatmentTab(container) {
    const activePlan = this.plans.find((p) => p.status === 'active') || this.plans[0];
    container.innerHTML = `
      <div class="treatment-tab">
        ${this.canAddTreatment || this.canAddAdditionalTreatment ? `
          <div class="treatment-toolbar">
            ${!activePlan && this.canAddTreatment ? `<button class="btn-primary btn-sm" id="createPlanBtn"><i class="fas fa-plus"></i> New Treatment Plan</button>` : ''}
            ${activePlan && this.canAddTreatment ? `<button class="btn-primary btn-sm" id="addTreatmentItemBtn"><i class="fas fa-plus"></i> Add Procedure</button>` : ''}
            ${activePlan && this.canAddAdditionalTreatment ? `<button class="btn-secondary btn-sm" id="addAdditionalTreatmentBtn"><i class="fas fa-plus-circle"></i> Add Additional Procedure (Admin)</button>` : ''}
          </div>
          ${this.canAddTreatment ? `<p class="clinical-billing-hint"><i class="fas fa-link"></i> Completed procedures appear in <strong>Billing</strong> for reception to invoice.</p>` : ''}
          ${this.canAddAdditionalTreatment && !this.canAddTreatment ? `<p class="clinical-billing-hint"><i class="fas fa-user-shield"></i> Admin can add supplementary procedures only — dentists complete clinical work.</p>` : ''}
        ` : ''}
        <div id="treatmentPlanContent">
          ${activePlan ? this.renderPlanItems(activePlan) : `
            <div class="empty-state-small"><i class="fas fa-clipboard-list"></i><p>No treatment plan yet</p></div>
          `}
        </div>
      </div>
      <div id="treatmentItemModal" class="modal-overlay" style="display:none;">
        <div class="appointment-modal">
          <div class="modal-header">
            <h3><i class="fas fa-plus"></i> Add Procedure</h3>
            <button class="modal-close" id="closeTreatmentModal">&times;</button>
          </div>
          <form id="treatmentItemForm" class="appointment-form">
            <div class="form-grid-2">
              <div class="form-field full-width">
                <label>Procedure *</label>
                <select id="treatmentProcedure" required>
                  <option value="">Select procedure...</option>
                  ${this.procedures.map((p) => `<option value="${p.id}" data-code="${p.code}" data-price="${p.defaultPrice}" data-name="${this.esc(p.name)}">${p.code} - ${this.esc(p.name)} (${p.defaultPrice})</option>`).join('')}
                </select>
              </div>
              <div class="form-field">
                <label>Tooth # (FDI)</label>
                <input type="number" id="treatmentTooth" placeholder="e.g. 36" min="11" max="48">
              </div>
              <div class="form-field">
                <label>Price</label>
                <input type="number" id="treatmentPrice" min="0" step="0.01">
              </div>
              <div class="form-field full-width">
                <label>Notes</label>
                <textarea id="treatmentItemNotes" rows="2"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" id="cancelTreatmentItem">Cancel</button>
              <button type="submit" class="btn-primary">Add</button>
            </div>
          </form>
        </div>
      </div>
    `;
    this.bindTreatmentEvents(activePlan);
  }

  renderPlanItems(plan) {
    const items = plan.items || [];
    const total = items.reduce((s, i) => s + (parseFloat(i.price) || 0), 0);
    const completed = items.filter((i) => i.status === 'completed' || i.status === 'billed').length;
    const statusLabel = (item) => {
      if (item.status === 'billed' || item.invoiced) return 'billed';
      return item.status || 'planned';
    };
    return `
      <div class="plan-header">
        <h4>${this.esc(plan.title)}</h4>
        <span class="plan-meta">${completed}/${items.length} done · Total: ${total.toFixed(2)}</span>
      </div>
      ${items.length === 0 ? '<p class="text-muted">No procedures added yet.</p>' : `
        <table class="treatment-table">
          <thead><tr><th>Procedure</th><th>Tooth</th><th>Price</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${items.map((item) => {
              const status = statusLabel(item);
              return `
              <tr>
                <td>${this.esc(item.procedureName)}<br><small>${item.procedureCode}</small></td>
                <td>${item.toothNumber || '—'}</td>
                <td>${parseFloat(item.price || 0).toFixed(2)}</td>
                <td><span class="status-badge item-status-${status}">${status}</span></td>
                <td>
                  ${this.canAddTreatment && status === 'planned' ? `
                    <button class="btn-status-sm complete-item-btn" data-plan="${plan.id}" data-item="${item.id}">Complete</button>
                  ` : ''}
                  ${item.source === 'admin_additional' ? '<span class="text-muted-sm">Admin additional</span>' : ''}
                  ${status === 'completed' ? '<span class="text-muted-sm">Awaiting invoice</span>' : ''}
                </td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>
      `}
    `;
  }

  bindTreatmentEvents(activePlan) {
    document.getElementById('createPlanBtn')?.addEventListener('click', async () => {
      await dentalService.createTreatmentPlan(this.patientId, { title: 'Treatment Plan', items: [] });
      await this.loadData();
      this.renderTab();
      if (window.Toast) window.Toast.success('Treatment plan created');
    });

    const modal = document.getElementById('treatmentItemModal');
    let addingAdditional = false;

    const openTreatmentModal = (isAdditional) => {
      addingAdditional = isAdditional;
      const title = modal.querySelector('.modal-header h3');
      if (title) {
        title.innerHTML = isAdditional
          ? '<i class="fas fa-plus-circle"></i> Add Additional Procedure (Admin)'
          : '<i class="fas fa-plus"></i> Add Procedure';
      }
      modal.style.display = 'flex';
    };

    document.getElementById('addTreatmentItemBtn')?.addEventListener('click', () => openTreatmentModal(false));
    document.getElementById('addAdditionalTreatmentBtn')?.addEventListener('click', () => openTreatmentModal(true));
    document.getElementById('closeTreatmentModal')?.addEventListener('click', () => { modal.style.display = 'none'; });
    document.getElementById('cancelTreatmentItem')?.addEventListener('click', () => { modal.style.display = 'none'; });

    document.getElementById('treatmentProcedure')?.addEventListener('change', (e) => {
      const opt = e.target.selectedOptions[0];
      if (opt?.dataset.price) {
        document.getElementById('treatmentPrice').value = opt.dataset.price;
      }
    });

    document.getElementById('treatmentItemForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!activePlan) return;
      const sel = document.getElementById('treatmentProcedure');
      const opt = sel.selectedOptions[0];
      await dentalService.addTreatmentItem(activePlan.id, {
        procedureId: sel.value,
        procedureCode: opt?.dataset.code || '',
        procedureName: opt?.dataset.name || '',
        toothNumber: document.getElementById('treatmentTooth').value,
        price: document.getElementById('treatmentPrice').value,
        notes: document.getElementById('treatmentItemNotes').value,
        source: addingAdditional ? 'admin_additional' : 'dentist'
      });
      modal.style.display = 'none';
      await this.loadData();
      this.renderTab();
      if (window.Toast) window.Toast.success('Procedure added');
    });

    document.querySelectorAll('.complete-item-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await dentalService.updateTreatmentItemStatus(btn.dataset.plan, btn.dataset.item, 'completed');
        await this.loadData();
        this.renderTab();
        if (window.Toast) window.Toast.success('Procedure completed — ready for billing');
      });
    });
  }

  renderNotesTab(container) {
    container.innerHTML = `
      <div class="notes-tab">
        ${this.canEdit ? `
          <form id="visitNoteForm" class="visit-note-form">
            <h4><i class="fas fa-pen"></i> New Visit Note</h4>
            <div class="form-grid-2">
              <div class="form-field full-width">
                <label>Subjective</label>
                <textarea id="noteSubjective" rows="2" placeholder="Patient complaints, symptoms"></textarea>
              </div>
              <div class="form-field full-width">
                <label>Objective</label>
                <textarea id="noteObjective" rows="2" placeholder="Clinical findings, exam results"></textarea>
              </div>
              <div class="form-field full-width">
                <label>Assessment</label>
                <textarea id="noteAssessment" rows="2" placeholder="Diagnosis, evaluation"></textarea>
              </div>
              <div class="form-field full-width">
                <label>Plan</label>
                <textarea id="notePlan" rows="2" placeholder="Treatment plan, next steps"></textarea>
              </div>
              <div class="form-field full-width">
                <label>Additional Notes</label>
                <textarea id="noteGeneral" rows="2" placeholder="Any other notes"></textarea>
              </div>
            </div>
            <button type="submit" class="btn-primary btn-sm"><i class="fas fa-save"></i> Save Visit Note</button>
          </form>
          <hr class="clinical-divider">
        ` : ''}
        <div class="visit-notes-list">
          ${this.notes.length === 0
            ? '<div class="empty-state-small"><p>No visit notes yet</p></div>'
            : this.notes.map((n) => this.renderNoteCard(n)).join('')}
        </div>
      </div>
    `;
    document.getElementById('visitNoteForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await dentalService.addVisitNote(this.patientId, {
        subjective: document.getElementById('noteSubjective').value,
        objective: document.getElementById('noteObjective').value,
        assessment: document.getElementById('noteAssessment').value,
        plan: document.getElementById('notePlan').value,
        notes: document.getElementById('noteGeneral').value
      });
      await this.loadData();
      this.renderTab();
      if (window.Toast) window.Toast.success('Visit note saved');
    });
  }

  renderNoteCard(note) {
    const date = note.visitDate ? new Date(note.visitDate).toLocaleString() : '';
    const soap = [
      note.subjective && `<div><strong>S:</strong> ${this.esc(note.subjective)}</div>`,
      note.objective && `<div><strong>O:</strong> ${this.esc(note.objective)}</div>`,
      note.assessment && `<div><strong>A:</strong> ${this.esc(note.assessment)}</div>`,
      note.plan && `<div><strong>P:</strong> ${this.esc(note.plan)}</div>`,
      note.notes && `<div>${this.esc(note.notes)}</div>`
    ].filter(Boolean).join('');
    return `
      <div class="visit-note-card">
        <div class="note-header">
          <span><i class="fas fa-calendar"></i> ${date}</span>
          <span>${this.esc(note.createdByName || '')}</span>
        </div>
        <div class="note-body">${soap || '<em>No content</em>'}</div>
      </div>
    `;
  }

  renderImagingTab(container) {
    container.innerHTML = `
      <div class="imaging-tab">
        ${this.canEdit ? `
          <form id="xrayUploadForm" class="xray-upload-form">
            <h4><i class="fas fa-upload"></i> Upload X-Ray</h4>
            <div class="form-grid-2">
              <div class="form-field">
                <label>Image File *</label>
                <input type="file" id="xrayFile" accept="image/*" required>
              </div>
              <div class="form-field">
                <label>Tooth # (FDI)</label>
                <input type="number" id="xrayTooth" placeholder="e.g. 36" min="11" max="48">
              </div>
              <div class="form-field full-width">
                <label>Notes</label>
                <input type="text" id="xrayNotes" placeholder="Bitewing, periapical, etc.">
              </div>
            </div>
            <div id="xrayUploadProgress" class="xray-progress" style="display:none;"></div>
            <button type="submit" class="btn-primary btn-sm"><i class="fas fa-cloud-upload-alt"></i> Upload</button>
          </form>
        ` : ''}
        <div class="xray-gallery" id="xrayGallery">
          ${this.images.length === 0 ? `
            <div class="empty-state-small"><i class="fas fa-x-ray"></i><p>No X-rays uploaded yet</p></div>
          ` : this.images.map((img) => `
            <div class="xray-card" data-id="${img.id}">
              <img src="${img.downloadUrl}" alt="${this.esc(img.fileName)}" class="xray-thumb" loading="lazy">
              <div class="xray-meta">
                <strong>${img.toothNumber ? `Tooth ${img.toothNumber}` : 'General'}</strong>
                <span>${img.created_at ? new Date(img.created_at).toLocaleDateString() : ''}</span>
                ${img.notes ? `<small>${this.esc(img.notes)}</small>` : ''}
                <span class="xray-uploader">${this.esc(img.uploadedByName || '')}</span>
              </div>
              <div class="xray-card-actions">
                <button type="button" class="btn-secondary btn-sm view-xray-btn" data-url="${img.downloadUrl}">View</button>
                ${this.canEdit ? `<button type="button" class="btn-danger btn-sm delete-xray-btn" data-id="${img.id}">Delete</button>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div id="xrayLightbox" class="xray-lightbox" style="display:none;">
        <button class="xray-lightbox-close" id="closeXrayLightbox">&times;</button>
        <img id="xrayLightboxImg" src="" alt="X-ray">
      </div>
    `;
    this.bindImagingEvents();
  }

  bindImagingEvents() {
    document.getElementById('xrayUploadForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById('xrayFile');
      const progress = document.getElementById('xrayUploadProgress');
      const file = fileInput?.files?.[0];
      if (!file) return;
      progress.style.display = 'block';
      progress.textContent = 'Uploading...';
      try {
        await imageService.uploadXray(this.patientId, file, {
          toothNumber: document.getElementById('xrayTooth')?.value || '',
          notes: document.getElementById('xrayNotes')?.value || ''
        });
        await this.loadData();
        this.renderTab();
        if (window.Toast) window.Toast.success('X-ray uploaded');
      } catch (err) {
        progress.textContent = err.message;
        if (window.Toast) window.Toast.error(err.message);
      }
    });

    document.querySelectorAll('.view-xray-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lb = document.getElementById('xrayLightbox');
        const img = document.getElementById('xrayLightboxImg');
        img.src = btn.dataset.url;
        lb.style.display = 'flex';
      });
    });

    document.getElementById('closeXrayLightbox')?.addEventListener('click', () => {
      document.getElementById('xrayLightbox').style.display = 'none';
    });

    document.querySelectorAll('.delete-xray-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this X-ray?')) return;
        try {
          await imageService.deleteImage(btn.dataset.id);
          await this.loadData();
          this.renderTab();
          if (window.Toast) window.Toast.success('X-ray deleted');
        } catch (err) {
          if (window.Toast) window.Toast.error(err.message);
        }
      });
    });
  }

  renderHistoryTab(container) {
    if (this.charts.length === 0) {
      container.innerHTML = '<div class="empty-state-small"><i class="fas fa-history"></i><p>No chart history yet. Save an odontogram to create the first snapshot.</p></div>';
      return;
    }
    container.innerHTML = `
      <div class="chart-history-list">
        ${this.charts.map((chart, idx) => {
          const date = chart.visitDate ? new Date(chart.visitDate).toLocaleString() : 'Unknown';
          const toothCount = Object.keys(chart.chartData || {}).length;
          return `
            <div class="chart-history-card" data-idx="${idx}">
              <div class="history-date"><i class="fas fa-calendar"></i> ${date}</div>
              <div class="history-meta">${toothCount} teeth recorded · ${this.esc(chart.createdByName || '')}</div>
              <button class="btn-secondary btn-sm view-chart-btn" data-idx="${idx}">View Chart</button>
            </div>
          `;
        }).join('')}
      </div>
      <div id="historyChartView" style="display:none;margin-top:1rem;"></div>
    `;
    document.querySelectorAll('.view-chart-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const chart = this.charts[parseInt(btn.dataset.idx, 10)];
        const view = document.getElementById('historyChartView');
        view.style.display = 'block';
        view.innerHTML = '<div id="historyOdontogram"></div>';
        const o = new Odontogram(document.getElementById('historyOdontogram'), {
          chartData: chart.chartData,
          readOnly: true
        });
        o.render();
      });
    });
  }

  esc(text) {
    if (!text) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }
}
