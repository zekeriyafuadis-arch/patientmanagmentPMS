import { apiGet, apiPost, apiPut, apiDelete } from './apiClient.js';

const DEFAULT_PROCEDURES = [
  { code: 'D0120', name: 'Periodic Oral Evaluation', defaultPrice: 300, category: 'diagnostic' },
  { code: 'D0150', name: 'Comprehensive Oral Evaluation', defaultPrice: 500, category: 'diagnostic' },
  { code: 'D0210', name: 'Intraoral - Complete Series X-ray', defaultPrice: 800, category: 'diagnostic' },
  { code: 'D1110', name: 'Prophylaxis - Adult Cleaning', defaultPrice: 600, category: 'preventive' },
  { code: 'D1120', name: 'Prophylaxis - Child Cleaning', defaultPrice: 450, category: 'preventive' },
  { code: 'D2140', name: 'Amalgam Filling - One Surface', defaultPrice: 700, category: 'restorative' },
  { code: 'D2391', name: 'Composite Filling - One Surface', defaultPrice: 900, category: 'restorative' },
  { code: 'D2740', name: 'Crown - Porcelain/Ceramic', defaultPrice: 3500, category: 'restorative' },
  { code: 'D3310', name: 'Root Canal - Anterior', defaultPrice: 2500, category: 'endodontic' },
  { code: 'D3320', name: 'Root Canal - Premolar', defaultPrice: 3000, category: 'endodontic' },
  { code: 'D3330', name: 'Root Canal - Molar', defaultPrice: 4000, category: 'endodontic' },
  { code: 'D7140', name: 'Extraction - Erupted Tooth', defaultPrice: 800, category: 'surgical' },
  { code: 'D7210', name: 'Extraction - Surgical', defaultPrice: 1500, category: 'surgical' },
  { code: 'D4341', name: 'Scaling & Root Planing - Per Quadrant', defaultPrice: 1200, category: 'periodontic' },
  { code: 'D6010', name: 'Implant - Surgical Placement', defaultPrice: 8000, category: 'implant' }
];

function normalizeProcedure(data) {
  return {
    id: String(data.id),
    code: data.code || '',
    name: data.name || '',
    defaultPrice: data.defaultPrice ?? 0,
    category: data.category || 'general',
    active: data.active !== false
  };
}

export const procedureService = {
  async getAll() {
    const res = await apiGet('/procedures');
    return res.data.map(normalizeProcedure);
  },

  async getActive() {
    const all = await this.getAll();
    return all.filter((p) => p.active);
  },

  async create(data) {
    const res = await apiPost('/procedures', data);
    return res.data;
  },

  async update(id, data) {
    await apiPut(`/procedures/${id}`, data);
  },

  async delete(id) {
    await apiDelete(`/procedures/${id}`);
  },

  async seedDefaultsIfEmpty() {
    const res = await apiPost('/procedures/seed-defaults', {});
    return res.data;
  }
};

export { DEFAULT_PROCEDURES };
