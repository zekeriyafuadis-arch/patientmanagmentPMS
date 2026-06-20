import { patientService } from './patientService.js';

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseRecallDate(patient) {
  if (!patient?.recall_due) return null;
  return startOfDay(new Date(`${patient.recall_due}T00:00:00`));
}

export function getRecallCategory(patient, today = new Date()) {
  const due = parseRecallDate(patient);
  if (!due) return 'none';
  const t = startOfDay(today);
  if (due < t) return 'overdue';
  const weekEnd = new Date(t);
  weekEnd.setDate(weekEnd.getDate() + 7);
  if (due <= weekEnd) return 'week';
  const monthEnd = new Date(t.getFullYear(), t.getMonth() + 1, 0);
  if (due <= monthEnd) return 'month';
  return 'future';
}

export function getDaysUntilRecall(patient, today = new Date()) {
  const due = parseRecallDate(patient);
  if (!due) return null;
  const t = startOfDay(today);
  return Math.round((due - t) / (1000 * 60 * 60 * 24));
}

export const recallService = {
  async getPatientsWithRecall() {
    const { data } = await patientService.fetchAll();
    return (data || [])
      .filter((p) => p.recall_due)
      .sort((a, b) => (a.recall_due || '').localeCompare(b.recall_due || ''));
  },

  async getFiltered(filter = 'all') {
    const patients = await this.getPatientsWithRecall();
    if (filter === 'all') return patients;
    return patients.filter((p) => getRecallCategory(p) === filter);
  },

  computeStats(patients) {
    const withRecall = patients.filter((p) => p.recall_due);
    return {
      overdue: withRecall.filter((p) => getRecallCategory(p) === 'overdue').length,
      dueThisWeek: withRecall.filter((p) => {
        const cat = getRecallCategory(p);
        return cat === 'overdue' || cat === 'week';
      }).length,
      dueThisMonth: withRecall.filter((p) => {
        const cat = getRecallCategory(p);
        return cat === 'overdue' || cat === 'week' || cat === 'month';
      }).length,
      total: withRecall.length
    };
  },

  async updateRecallDate(patientId, recallDue) {
    return patientService.updatePatient(patientId, { recall_due: recallDue || null });
  },

  /** Set recall to N months from today after a visit */
  async scheduleRecallMonths(patientId, months = 6) {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    const recallDue = d.toISOString().split('T')[0];
    return this.updateRecallDate(patientId, recallDue);
  }
};
