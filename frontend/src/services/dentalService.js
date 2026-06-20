import { apiGet, apiPost, apiPut } from './apiClient.js';

export const TOOTH_CONDITIONS = [
  { value: 'healthy', label: 'Healthy', color: '#e2e8f0' },
  { value: 'decay', label: 'Decay', color: '#f56565' },
  { value: 'filled', label: 'Filled', color: '#4299e1' },
  { value: 'crown', label: 'Crown', color: '#9f7aea' },
  { value: 'root_canal', label: 'Root Canal', color: '#ed8936' },
  { value: 'missing', label: 'Missing', color: '#a0aec0' },
  { value: 'implant', label: 'Implant', color: '#48bb78' },
  { value: 'extracted', label: 'Extracted', color: '#718096' }
];

export const FDI_TEETH = {
  upperRight: [18, 17, 16, 15, 14, 13, 12, 11],
  upperLeft: [21, 22, 23, 24, 25, 26, 27, 28],
  lowerRight: [48, 47, 46, 45, 44, 43, 42, 41],
  lowerLeft: [31, 32, 33, 34, 35, 36, 37, 38]
};

export const ALL_FDI_TEETH = [
  ...FDI_TEETH.upperRight, ...FDI_TEETH.upperLeft,
  ...FDI_TEETH.lowerRight, ...FDI_TEETH.lowerLeft
];

export function getConditionMeta(condition) {
  const normalized = condition === 'caries' ? 'decay' : condition;
  return TOOTH_CONDITIONS.find((c) => c.value === normalized) || TOOTH_CONDITIONS[0];
}

export const dentalService = {
  async getChartsByPatient(patientId) {
    const res = await apiGet(`/clinical/charts/${patientId}`);
    return res.data;
  },

  async getLatestChart(patientId) {
    const charts = await this.getChartsByPatient(patientId);
    return charts[0] || null;
  },

  async saveChart(patientId, chartData, visitDate) {
    const res = await apiPost('/clinical/charts', { patientId, chartData, visitDate });
    return res.data;
  },

  async getTreatmentPlans(patientId) {
    const res = await apiGet(`/clinical/plans/${patientId}`);
    return res.data;
  },

  async createTreatmentPlan(patientId, { title, items }) {
    const res = await apiPost('/clinical/plans', { patientId, title, items });
    return res.data;
  },

  async updateTreatmentPlan(planId, data) {
    await apiPut(`/clinical/plans/${planId}`, data);
  },

  async addTreatmentItem(planId, item) {
    const plan = await this.getTreatmentPlanById(planId);
    if (!plan) throw new Error('Plan not found');
    const items = [...(plan.items || []), {
      id: Date.now().toString(),
      procedureId: item.procedureId || '',
      procedureCode: item.procedureCode || '',
      procedureName: item.procedureName || '',
      toothNumber: item.toothNumber || '',
      status: 'planned',
      price: parseFloat(item.price) || 0,
      notes: item.notes || '',
      source: item.source || 'dentist'
    }];
    await this.updateTreatmentPlan(planId, { items });
    return items;
  },

  async getTreatmentPlanById(planId) {
    const res = await apiGet(`/clinical/plans/single/${planId}`);
    return res.data;
  },

  async updateTreatmentItemStatus(planId, itemId, status) {
    const plan = await this.getTreatmentPlanById(planId);
    if (!plan) throw new Error('Plan not found');
    const items = (plan.items || []).map((i) => (i.id === itemId ? { ...i, status } : i));
    await this.updateTreatmentPlan(planId, { items });
  },

  async getVisitNotes(patientId) {
    const res = await apiGet(`/clinical/notes/${patientId}`);
    return res.data;
  },

  async addVisitNote(patientId, noteData) {
    const res = await apiPost('/clinical/notes', { patientId, ...noteData });
    return res.data;
  },

  async getTreatmentSummary() {
    const res = await apiGet('/clinical/treatment-summary');
    return res.data;
  }
};
