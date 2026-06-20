const { all, get } = require('../config/database');
const {
  parseSchedule,
  getDayBoundsFromSchedule,
  isDentistWorkingOnDate
} = require('./dentistSchedule');

const SLOT_STEP_MIN = 30;

function parseApptEnd(appt) {
  const start = new Date(appt.datetime);
  const duration = parseInt(appt.duration, 10) || 30;
  return new Date(start.getTime() + duration * 60000);
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

function getDayBounds(dateStr) {
  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(`${dateStr}T23:59:59.999`);
  return { start, end };
}

function buildFreeSlots(busyRanges, dateStr, durationMin, schedule, now = new Date()) {
  const bounds = getDayBoundsFromSchedule(schedule, dateStr);
  if (!bounds) return [];

  const slots = [];
  let cursor = new Date(bounds.start);

  while (cursor.getTime() + durationMin * 60000 <= bounds.end.getTime()) {
    const slotEnd = new Date(cursor.getTime() + durationMin * 60000);
    if (cursor > now) {
      const busy = busyRanges.some((b) => overlaps(cursor, slotEnd, b.start, b.end));
      if (!busy) slots.push(new Date(cursor));
    }
    cursor = new Date(cursor.getTime() + SLOT_STEP_MIN * 60000);
  }
  return slots;
}

async function getDentists() {
  const rows = await all(
    "SELECT id, full_name, email, schedule FROM staff WHERE role = 'dentist' AND active = 1 ORDER BY full_name"
  );
  return rows.map((r) => ({
    id: String(r.id),
    fullName: r.full_name,
    email: r.email,
    schedule: parseSchedule(r.schedule)
  }));
}

async function getAppointmentsForDate(dateStr) {
  const { start, end } = getDayBounds(dateStr);
  const rows = await all(
    `SELECT * FROM appointments
     WHERE datetime >= ? AND datetime <= ?
     AND status NOT IN ('cancelled', 'no_show')`,
    [start.toISOString(), end.toISOString()]
  );
  return rows;
}

async function checkDentistConflict(staffId, datetime, durationMin = 30, excludeApptId = null) {
  if (!staffId || !datetime) return null;

  const start = new Date(datetime);
  const end = new Date(start.getTime() + durationMin * 60000);
  const dateStr = start.toISOString().slice(0, 10);

  const dentist = await get(
    "SELECT full_name, schedule FROM staff WHERE id = ? AND role = 'dentist' AND active = 1",
    [staffId]
  );
  if (!dentist) {
    return { error: 'Invalid or inactive dentist' };
  }

  const schedule = parseSchedule(dentist.schedule);
  if (!isDentistWorkingOnDate(schedule, dateStr)) {
    return {
      error: `${dentist.full_name} does not work on this day. Check dentist schedule in Settings.`
    };
  }

  const bounds = getDayBoundsFromSchedule(schedule, dateStr);
  if (start < bounds.start || end > bounds.end) {
    return {
      error: `${dentist.full_name} is only available ${bounds.start.toTimeString().slice(0, 5)}–${bounds.end.toTimeString().slice(0, 5)} on this day.`
    };
  }

  const appointments = await getAppointmentsForDate(dateStr);
  const conflict = appointments.find((a) => {
    if (excludeApptId && String(a.id) === String(excludeApptId)) return false;
    if (String(a.staff_id) !== String(staffId)) return false;
    const aStart = new Date(a.datetime);
    const aEnd = parseApptEnd(a);
    return overlaps(start, end, aStart, aEnd);
  });

  if (conflict) {
    const conflictTime = new Date(conflict.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      error: `Double booking: ${dentist.full_name} already has an appointment at ${conflictTime} with ${conflict.patient_name || 'a patient'}.`
    };
  }

  return null;
}

async function assertNoConflict(staffId, datetime, durationMin, excludeApptId = null) {
  const result = await checkDentistConflict(staffId, datetime, durationMin, excludeApptId);
  if (result?.error) {
    const err = new Error(result.error);
    err.statusCode = 409;
    throw err;
  }
}

async function findAvailableSlots(dateStr, durationMin = 30, options = {}) {
  const { excludeStaffIds = [], staffId = null } = options;
  const exclude = new Set(excludeStaffIds.map(String));
  let dentists = await getDentists();
  if (staffId) dentists = dentists.filter((d) => d.id === String(staffId));
  dentists = dentists.filter((d) => !exclude.has(d.id));
  if (dentists.length === 0) return [];

  const appointments = await getAppointmentsForDate(dateStr);
  const now = new Date();
  const results = [];

  dentists.forEach((dentist) => {
    if (!isDentistWorkingOnDate(dentist.schedule, dateStr)) return;

    const busyRanges = appointments
      .filter((a) => String(a.staff_id) === dentist.id)
      .map((a) => ({ start: new Date(a.datetime), end: parseApptEnd(a) }));

    const free = buildFreeSlots(busyRanges, dateStr, durationMin, dentist.schedule, now);
    free.forEach((slot) => {
      results.push({
        staffId: dentist.id,
        staffName: dentist.fullName,
        datetime: slot.toISOString(),
        date: dateStr,
        time: slot.toTimeString().slice(0, 5)
      });
    });
  });

  results.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  return results;
}

async function findBestSlot(durationMin = 30, startDate = new Date(), maxDays = 14, options = {}) {
  for (let i = 0; i < maxDays; i += 1) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const slots = await findAvailableSlots(dateStr, durationMin, options);
    if (slots.length > 0) return slots[0];
  }
  return null;
}

module.exports = {
  findAvailableSlots,
  findBestSlot,
  getDentists,
  getAppointmentsForDate,
  checkDentistConflict,
  assertNoConflict,
  parseApptEnd,
  overlaps
};
