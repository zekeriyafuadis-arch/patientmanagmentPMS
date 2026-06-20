const { all, get } = require('../config/database');
const {
  findAvailableSlots,
  findBestSlot,
  assertNoConflict
} = require('../utils/scheduleSlots');
const { createClinicAlert } = require('../utils/assignmentAlerts');
const { publishChange } = require('../utils/publishChange');
const { canBookAnyAppointment } = require('../utils/permissions');
const { markPastAppointmentsNoShow } = require('../utils/appointmentNoShow');
const AppointmentsRepository = require('../repositories/appointments.repository');

function dentistStaffFilter(user) {
  return user?.role === 'dentist' ? String(user.id) : null;
}

async function assertDentistOwnsPatient(user, patientId) {
  const patient = await get(
    'SELECT assigned_doctor_id, assignment_status FROM patients WHERE id = ?',
    [patientId]
  );
  if (!patient) {
    const err = new Error('Patient not found');
    err.statusCode = 404;
    throw err;
  }
  if (
    String(patient.assigned_doctor_id) !== String(user.id)
    || patient.assignment_status !== 'confirmed'
  ) {
    const err = new Error('You can only book appointments for your confirmed patients');
    err.statusCode = 403;
    throw err;
  }
}

async function assertDentistOwnsAppointment(user, appointmentId) {
  const appt = await AppointmentsRepository.findById(appointmentId);
  if (!appt) {
    const err = new Error('Appointment not found');
    err.statusCode = 404;
    throw err;
  }
  if (String(appt.staff_id) !== String(user.id)) {
    const err = new Error('You can only modify your own appointments');
    err.statusCode = 403;
    throw err;
  }
}

async function autoReassignPatient(patient, declinedStaffId, durationMin = 30) {
  const best = await findBestSlot(durationMin, new Date(), 14, {
    excludeStaffIds: [String(declinedStaffId)]
  });
  if (!best) return null;

  await assertNoConflict(best.staffId, best.datetime, durationMin);

  const result = await AppointmentsRepository.insert([
    patient.id, patient.name, patient.mrn, best.staffId, best.staffName,
    best.datetime, durationMin, 'consultation', 'pending_doctor', '',
    'Reassigned after decline — awaiting confirmation'
  ]);

  await AppointmentsRepository.setPatientAssignment(patient.id, {
    staffId: best.staffId,
    staffName: best.staffName,
    appointmentId: result.lastID,
    status: 'pending'
  });

  return {
    appointmentId: String(result.lastID),
    staffId: best.staffId,
    staffName: best.staffName,
    datetime: best.datetime
  };
}

class AppointmentsService {
  static async getAvailableSlots(query) {
    const date = query.date || new Date().toISOString().slice(0, 10);
    const duration = parseInt(query.duration, 10) || 30;
    const staffId = query.staffId || null;
    const excludeStaffIds = query.excludeStaffId ? [query.excludeStaffId] : [];
    return findAvailableSlots(date, duration, { staffId, excludeStaffIds });
  }

  static async getPendingConfirmations(user) {
    const rows = await AppointmentsRepository.findPendingConfirmations(user.id);
    return rows.map(AppointmentsRepository.mapAppt);
  }

  static async assign(user, body) {
    const { patientId, staffId, datetime, duration, type, notes, auto } = body;
    const patient = await get('SELECT * FROM patients WHERE id = ?', [patientId]);
    if (!patient) {
      const err = new Error('Patient not found');
      err.statusCode = 404;
      throw err;
    }

    const durationMin = parseInt(duration, 10) || 30;
    let slotStaffId = staffId || '';
    let slotStaffName = '';
    let slotDatetime = datetime;

    if (auto || !staffId || !datetime) {
      const best = await findBestSlot(durationMin);
      if (!best) {
        const err = new Error('No available dentist slots in the next 14 days');
        err.statusCode = 400;
        throw err;
      }
      slotStaffId = best.staffId;
      slotStaffName = best.staffName;
      slotDatetime = best.datetime;
    } else {
      const dentist = await get(
        "SELECT id, full_name FROM staff WHERE id = ? AND role = 'dentist' AND active = 1",
        [staffId]
      );
      if (!dentist) {
        const err = new Error('Please select a valid dentist');
        err.statusCode = 400;
        throw err;
      }
      slotStaffId = String(dentist.id);
      slotStaffName = dentist.full_name;
    }

    await assertNoConflict(slotStaffId, slotDatetime, durationMin);

    const result = await AppointmentsRepository.insert([
      patientId, patient.name, patient.mrn, slotStaffId, slotStaffName,
      slotDatetime, durationMin, type || 'consultation', 'pending_doctor', '',
      notes || 'Assigned by reception — awaiting doctor confirmation'
    ]);

    await AppointmentsRepository.setPatientAssignment(patientId, {
      staffId: slotStaffId,
      staffName: slotStaffName,
      appointmentId: result.lastID,
      status: 'pending'
    });

    publishChange('appointment', 'assigned', { id: result.lastID, patientId }, user?.id);
    return {
      appointmentId: String(result.lastID),
      patientId: String(patientId),
      staffId: slotStaffId,
      staffName: slotStaffName,
      datetime: slotDatetime,
      status: 'pending_doctor'
    };
  }

  static async bulkAssign() {
    const patients = await all('SELECT * FROM patients ORDER BY created_at DESC');
    const unassigned = patients.filter(
      (p) => !p.assignment_status || !['pending', 'confirmed'].includes(p.assignment_status)
    );

    const results = [];
    const errors = [];

    for (const patient of unassigned.slice(0, 30)) {
      const best = await findBestSlot(30);
      if (!best) {
        errors.push({ patientId: String(patient.id), error: 'No slots available' });
        continue;
      }

      try {
        await assertNoConflict(best.staffId, best.datetime, 30);
        const result = await AppointmentsRepository.insert([
          patient.id, patient.name, patient.mrn, best.staffId, best.staffName,
          best.datetime, 30, 'consultation', 'pending_doctor', '',
          'Auto-assigned — awaiting doctor confirmation'
        ]);
        await AppointmentsRepository.setPatientAssignment(patient.id, {
          staffId: best.staffId,
          staffName: best.staffName,
          appointmentId: result.lastID,
          status: 'pending'
        });
        results.push({
          patientId: String(patient.id),
          patientName: patient.name,
          appointmentId: String(result.lastID),
          staffName: best.staffName,
          datetime: best.datetime
        });
      } catch (err) {
        errors.push({ patientId: String(patient.id), error: err.message });
      }
    }

    return { assigned: results, errors, skipped: patients.length - unassigned.length };
  }

  static async list(user, query) {
    await markPastAppointmentsNoShow();
    const dentistId = dentistStaffFilter(user);
    const rows = await AppointmentsRepository.findAll({
      date: query.date,
      start: query.start,
      end: query.end,
      dentistId
    });
    return rows.map(AppointmentsRepository.mapAppt);
  }

  static async getById(user, id) {
    const row = await AppointmentsRepository.findById(id);
    if (!row) {
      const err = new Error('Not found');
      err.statusCode = 404;
      throw err;
    }
    if (user.role === 'dentist' && String(row.staff_id) !== String(user.id)) {
      const err = new Error('Insufficient permissions');
      err.statusCode = 403;
      throw err;
    }
    return AppointmentsRepository.mapAppt(row);
  }

  static async create(user, body) {
    const d = { ...body };
    const isReception = canBookAnyAppointment(user) && !d.skipAssignmentFlow;
    let status = d.status || 'scheduled';
    let staffId = d.staffId || '';
    let staffName = d.staffName || '';
    const durationMin = parseInt(d.duration, 10) || 30;

    if (user.role === 'dentist') {
      await assertDentistOwnsPatient(user, d.patientId);
      staffId = String(user.id);
      staffName = user.fullName || '';
      status = 'scheduled';
    } else if (isReception) {
      if (!staffId) {
        const best = await findBestSlot(durationMin);
        if (!best) {
          const err = new Error('No available dentist — use auto-assign or pick a slot');
          err.statusCode = 400;
          throw err;
        }
        staffId = best.staffId;
        staffName = best.staffName;
        if (!d.datetime) d.datetime = best.datetime;
      } else {
        const dentist = await get(
          "SELECT id, full_name FROM staff WHERE id = ? AND role = 'dentist' AND active = 1",
          [staffId]
        );
        if (!dentist) {
          const err = new Error('Reception must assign a dentist');
          err.statusCode = 400;
          throw err;
        }
        staffId = String(dentist.id);
        staffName = dentist.full_name;
      }
      status = 'pending_doctor';
    }

    if (staffId && d.datetime) {
      await assertNoConflict(staffId, d.datetime, durationMin);
    }

    const result = await AppointmentsRepository.insert([
      d.patientId, d.patientName || '', d.patientMrn || '', staffId, staffName,
      d.datetime, durationMin, d.type || 'checkup', status,
      d.chair || '', d.notes || ''
    ]);

    if (isReception && status === 'pending_doctor') {
      await AppointmentsRepository.setPatientAssignment(d.patientId, {
        staffId,
        staffName,
        appointmentId: result.lastID,
        status: 'pending'
      });
    }

    publishChange('appointment', 'created', { id: result.lastID, patientId: d.patientId }, user?.id);
    return { id: String(result.lastID) };
  }

  static async update(user, id, body) {
    const existing = await AppointmentsRepository.findById(id);
    if (!existing) {
      const err = new Error('Not found');
      err.statusCode = 404;
      throw err;
    }

    if (user.role === 'dentist') {
      await assertDentistOwnsAppointment(user, id);
    } else if (!canBookAnyAppointment(user)) {
      const err = new Error('Insufficient permissions');
      err.statusCode = 403;
      throw err;
    }

    const d = { ...body };
    const isReception = canBookAnyAppointment(user);
    const durationMin = parseInt(d.duration, 10) || 30;

    if (isReception && d.staffId) {
      const dentist = await get(
        "SELECT id, full_name FROM staff WHERE id = ? AND role = 'dentist' AND active = 1",
        [d.staffId]
      );
      if (!dentist) {
        const err = new Error('Must assign a dentist');
        err.statusCode = 400;
        throw err;
      }
      d.staffId = String(dentist.id);
      d.staffName = dentist.full_name;
    }

    if (d.staffId && d.datetime) {
      await assertNoConflict(d.staffId, d.datetime, durationMin, id);
    }

    await AppointmentsRepository.update(id, d);
    publishChange('appointment', 'updated', { id }, user?.id);
    return { id };
  }

  static async confirm(user, id) {
    const appt = await AppointmentsRepository.findById(id);
    if (!appt) {
      const err = new Error('Appointment not found');
      err.statusCode = 404;
      throw err;
    }
    if (String(appt.staff_id) !== String(user.id)) {
      const err = new Error('You can only confirm appointments assigned to you');
      err.statusCode = 403;
      throw err;
    }
    if (appt.status !== 'pending_doctor') {
      const err = new Error('This appointment is not awaiting confirmation');
      err.statusCode = 400;
      throw err;
    }

    await AppointmentsRepository.updateStatus(id, 'confirmed');
    await AppointmentsRepository.setPatientAssignment(appt.patient_id, {
      staffId: appt.staff_id,
      staffName: appt.staff_name,
      appointmentId: appt.id,
      status: 'confirmed'
    });

    publishChange('appointment', 'confirmed', { id, patientId: appt.patient_id }, user?.id);
    return { message: 'Assignment confirmed — you can now access clinical records' };
  }

  static async decline(user, id) {
    const appt = await AppointmentsRepository.findById(id);
    if (!appt) {
      const err = new Error('Appointment not found');
      err.statusCode = 404;
      throw err;
    }
    if (String(appt.staff_id) !== String(user.id)) {
      const err = new Error('Not your assignment');
      err.statusCode = 403;
      throw err;
    }

    const patient = await get('SELECT * FROM patients WHERE id = ?', [appt.patient_id]);
    const declinedName = user.fullName || appt.staff_name;

    await AppointmentsRepository.markDeclined(id);
    await AppointmentsRepository.clearPatientAssignmentIfMatch(appt.patient_id, appt.id);

    let reassign = null;
    try {
      reassign = await autoReassignPatient(patient, appt.staff_id, appt.duration || 30);
    } catch (reErr) {
      reassign = { error: reErr.message };
    }

    const when = new Date(appt.datetime).toLocaleString();
    let alertMessage;
    if (reassign && !reassign.error) {
      alertMessage = `${declinedName} declined ${patient.name} (${when}). Auto-reassigned to ${reassign.staffName} at ${new Date(reassign.datetime).toLocaleString()}.`;
    } else if (reassign?.error) {
      alertMessage = `${declinedName} declined ${patient.name}. Reassign failed: ${reassign.error}`;
    } else {
      alertMessage = `${declinedName} declined ${patient.name}. No other dentist slots available — please assign manually.`;
    }

    await createClinicAlert({
      type: reassign && !reassign.error ? 'assignment_reassigned' : 'assignment_declined',
      message: alertMessage,
      patientId: patient.id,
      patientName: patient.name,
      meta: { declinedAppointmentId: String(appt.id), reassign }
    });

    publishChange('appointment', 'declined', { id: appt.id, patientId: patient.id }, user?.id);
    publishChange('alerts', 'created', { patientId: patient.id }, user?.id);

    return {
      message: alertMessage,
      reassign: reassign && !reassign.error ? reassign : null
    };
  }

  static async patchStatus(user, id, status) {
    const appt = await AppointmentsRepository.findById(id);
    if (!appt) {
      const err = new Error('Not found');
      err.statusCode = 404;
      throw err;
    }

    if (user.role === 'dentist') {
      await assertDentistOwnsAppointment(user, id);
    } else if (!canBookAnyAppointment(user)) {
      const err = new Error('Insufficient permissions');
      err.statusCode = 403;
      throw err;
    }

    if (status === 'confirmed' && appt?.status === 'pending_doctor' && user.role === 'dentist') {
      if (String(appt.staff_id) !== String(user.id)) {
        const err = new Error('Not your assignment');
        err.statusCode = 403;
        throw err;
      }
      await AppointmentsRepository.updateStatus(id, 'confirmed');
      await AppointmentsRepository.setPatientAssignment(appt.patient_id, {
        staffId: appt.staff_id,
        staffName: appt.staff_name,
        appointmentId: appt.id,
        status: 'confirmed'
      });
      publishChange('appointment', 'confirmed', { id, patientId: appt.patient_id }, user?.id);
      return;
    }

    await AppointmentsRepository.updateStatus(id, status);

    if (status === 'cancelled' && appt) {
      await AppointmentsRepository.clearPatientAssignmentIfMatch(appt.patient_id, appt.id);
    }

    if (status === 'completed' && appt) {
      await AppointmentsRepository.updatePatientLastVisit(appt.patient_id, new Date().toISOString());
      await AppointmentsRepository.clearPatientAssignment(appt.patient_id);

      await createClinicAlert({
        type: 'assignment_expired',
        message: `Visit completed for ${appt.patient_name}. Doctor assignment cleared — reassign before the next visit.`,
        patientId: appt.patient_id,
        patientName: appt.patient_name,
        meta: { completedAppointmentId: String(appt.id) }
      });
    }

    publishChange('appointment', 'updated', { id, status }, user?.id);
    if (status === 'completed' && appt) {
      publishChange('patient', 'updated', { id: appt.patient_id }, user?.id);
      publishChange('alerts', 'created', { patientId: appt.patient_id }, user?.id);
    }
  }

  static async remove(user, id) {
    const appt = await AppointmentsRepository.findById(id);
    if (!appt) {
      const err = new Error('Not found');
      err.statusCode = 404;
      throw err;
    }

    if (user.role === 'dentist') {
      await assertDentistOwnsAppointment(user, id);
    } else if (!canBookAnyAppointment(user)) {
      const err = new Error('Insufficient permissions');
      err.statusCode = 403;
      throw err;
    }

    await AppointmentsRepository.remove(id);
    await AppointmentsRepository.clearPatientAssignmentIfMatch(appt.patient_id, appt.id);
    publishChange('appointment', 'deleted', { id }, user?.id);
  }
}

module.exports = AppointmentsService;
