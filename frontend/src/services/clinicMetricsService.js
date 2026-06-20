import { patientService } from './patientService.js';
import { appointmentService } from './appointmentService.js';
import { billingService } from './billingService.js';
import { dentalService } from './dentalService.js';
import { recallService } from './recallService.js';

export const clinicMetricsService = {
  async getDashboardMetrics(role = 'admin') {
    const patientsPromise = role === 'dentist'
      ? patientService.fetchMine()
      : patientService.fetchAll();

    const appointmentsPromise = appointmentService.getAll().catch(() => []);
    const treatmentPromise = dentalService.getTreatmentSummary().catch(() => ({
      activePlans: 0, pendingProcedures: 0, completedProcedures: 0
    }));

    let revenue = { today: 0, month: 0, outstanding: 0 };
    if (role === 'admin') {
      revenue = await billingService.getRevenueStats().catch(() => revenue);
    } else if (role === 'receptionist') {
      const out = await billingService.getOutstanding().catch(() => ({ outstanding: 0 }));
      revenue.outstanding = out.outstanding || 0;
    }

    const [patientsRes, appointments, treatmentStats] = await Promise.all([
      patientsPromise,
      appointmentsPromise,
      treatmentPromise
    ]);

    const patients = patientsRes.data || [];
    const recallStats = recallService.computeStats(patients);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthAppts = appointments.filter((a) => new Date(a.datetime) >= startOfMonth);
    const noShowsMonth = monthAppts.filter((a) => a.status === 'no_show').length;
    const completedMonth = monthAppts.filter((a) => a.status === 'completed').length;

    return {
      recalls: recallStats,
      outstanding: revenue.outstanding || 0,
      revenueToday: revenue.today || 0,
      revenueMonth: revenue.month || 0,
      pendingProcedures: treatmentStats.pendingProcedures || 0,
      activeTreatmentPlans: treatmentStats.activePlans || 0,
      noShowsMonth,
      completedMonth,
      appointmentsMonth: monthAppts.filter((a) => a.status !== 'cancelled').length,
      patientCount: patients.length
    };
  }
};
