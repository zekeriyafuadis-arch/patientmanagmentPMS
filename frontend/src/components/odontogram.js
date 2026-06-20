import { FDI_TEETH, ALL_FDI_TEETH, TOOTH_CONDITIONS, getConditionMeta } from '../services/dentalService.js';

export class Odontogram {
  constructor(container, options = {}) {
    this.container = container;
    this.chartData = options.chartData || {};
    this.readOnly = options.readOnly || false;
    this.onChange = options.onChange || (() => {});
    this.selectedTooth = null;
    this._modalEl = null;
  }

  setChartData(data) {
    this.chartData = data || {};
    this.render();
  }

  getChartData() {
    return { ...this.chartData };
  }

  destroy() {
    if (this._onEsc) document.removeEventListener('keydown', this._onEsc);
    this._modalEl?.remove();
    this._modalEl = null;
    this._onEsc = null;
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="odontogram-wrapper">
        <div class="odontogram-legend">
          ${TOOTH_CONDITIONS.map((c) => `
            <span class="legend-item"><span class="legend-dot" style="background:${c.color}"></span>${c.label}</span>
          `).join('')}
        </div>
        <div class="odontogram-arch">
          <div class="arch-label">Upper (maxilla)</div>
          <div class="tooth-row upper">
            ${this.renderRow(FDI_TEETH.upperRight)}
            <div class="midline" aria-hidden="true"></div>
            ${this.renderRow(FDI_TEETH.upperLeft)}
          </div>
          <div class="tooth-row lower">
            ${this.renderRow(FDI_TEETH.lowerRight)}
            <div class="midline" aria-hidden="true"></div>
            ${this.renderRow(FDI_TEETH.lowerLeft)}
          </div>
          <div class="arch-label">Lower (mandible)</div>
        </div>
        <p class="odontogram-patient-view">Patient view — right quadrants on the left, left quadrants on the right</p>
      </div>
    `;
    if (!this.readOnly) this.bindChartEvents();
  }

  ensureModal() {
    if (this._modalEl) return;

    this._modalEl = document.createElement('div');
    this._modalEl.id = 'toothEditModal';
    this._modalEl.className = 'modal-overlay tooth-edit-overlay';
    this._modalEl.style.display = 'none';
    this._modalEl.innerHTML = `
      <div class="tooth-edit-modal" role="dialog" aria-modal="true" aria-labelledby="toothEditTitle">
        <div class="modal-header">
          <h3 id="toothEditTitle"><i class="fas fa-tooth"></i> Tooth <span id="toothEditNumber"></span></h3>
          <button type="button" class="modal-close" id="closeToothModal" aria-label="Close">&times;</button>
        </div>
        <div class="tooth-edit-body">
          <div class="form-field">
            <label for="toothCondition">Condition</label>
            <select id="toothCondition">
              ${TOOTH_CONDITIONS.map((c) => `<option value="${c.value}">${c.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-field">
            <label>Surfaces</label>
            <div class="surface-checks">
              ${['M', 'O', 'D', 'B', 'L'].map((s) => `
                <label><input type="checkbox" class="surface-cb" value="${s}"> ${s}</label>
              `).join('')}
            </div>
          </div>
          <div class="form-field">
            <label for="toothNotes">Notes</label>
            <textarea id="toothNotes" rows="2" placeholder="Tooth-specific notes"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" id="clearToothBtn">Clear</button>
          <button type="button" class="btn-primary" id="saveToothBtn"><i class="fas fa-save"></i> Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(this._modalEl);

    this._modalEl.querySelector('#closeToothModal')?.addEventListener('click', () => this.closeToothModal());
    this._modalEl.querySelector('#saveToothBtn')?.addEventListener('click', () => this.saveTooth());
    this._modalEl.querySelector('#clearToothBtn')?.addEventListener('click', () => this.clearTooth());
    this._modalEl.addEventListener('click', (e) => {
      if (e.target === this._modalEl) this.closeToothModal();
    });
    this._onEsc = (e) => {
      if (e.key === 'Escape' && this._modalEl?.style.display === 'flex') this.closeToothModal();
    };
    document.addEventListener('keydown', this._onEsc);
  }

  renderRow(teeth) {
    return teeth.map((num) => this.renderTooth(num)).join('');
  }

  renderTooth(num) {
    const data = this.chartData[String(num)] || { condition: 'healthy' };
    const meta = getConditionMeta(data.condition);
    const missing = ['missing', 'extracted'].includes(meta.value);
    const surfaces = (data.surfaces || []).join('');
    return `
      <button type="button" class="tooth-btn ${missing ? 'tooth-missing' : ''}" data-tooth="${num}"
              style="--tooth-color:${meta.color}" title="Tooth ${num}: ${meta.label}"
              ${this.readOnly ? 'disabled' : ''} aria-label="Tooth ${num}, ${meta.label}">
        <span class="tooth-num">${num}</span>
        ${surfaces ? `<span class="tooth-surf">${surfaces}</span>` : ''}
      </button>
    `;
  }

  bindChartEvents() {
    this.container.querySelectorAll('.tooth-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.openToothModal(btn.dataset.tooth));
    });
  }

  openToothModal(toothNum) {
    this.ensureModal();
    this.selectedTooth = toothNum;
    const data = this.chartData[String(toothNum)] || { condition: 'healthy', surfaces: [], notes: '' };
    const meta = getConditionMeta(data.condition);

    this._modalEl.querySelector('#toothEditNumber').textContent = toothNum;
    this._modalEl.querySelector('#toothCondition').value = meta.value;
    this._modalEl.querySelector('#toothNotes').value = data.notes || '';
    this._modalEl.querySelectorAll('.surface-cb').forEach((cb) => {
      cb.checked = (data.surfaces || []).includes(cb.value);
    });
    this._modalEl.style.display = 'flex';
    this._modalEl.querySelector('#toothCondition')?.focus();
  }

  closeToothModal() {
    if (this._modalEl) this._modalEl.style.display = 'none';
    this.selectedTooth = null;
  }

  saveTooth() {
    if (!this.selectedTooth || !this._modalEl) return;
    const surfaces = [...this._modalEl.querySelectorAll('.surface-cb:checked')].map((cb) => cb.value);
    const condition = this._modalEl.querySelector('#toothCondition').value;
    const notes = this._modalEl.querySelector('#toothNotes').value.trim();

    if (condition === 'healthy' && !notes && surfaces.length === 0) {
      delete this.chartData[String(this.selectedTooth)];
    } else {
      this.chartData[String(this.selectedTooth)] = { condition, surfaces, notes };
    }
    this.onChange(this.getChartData());
    this.closeToothModal();
    this.render();
  }

  clearTooth() {
    if (!this.selectedTooth) return;
    delete this.chartData[String(this.selectedTooth)];
    this.onChange(this.getChartData());
    this.closeToothModal();
    this.render();
  }
}

export { ALL_FDI_TEETH };
