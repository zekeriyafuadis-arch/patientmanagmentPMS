const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_LABELS = { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' };

const DEFAULT_SCHEDULE = {
  mon: { active: true, start: '08:00', end: '18:00' },
  tue: { active: true, start: '08:00', end: '18:00' },
  wed: { active: true, start: '08:00', end: '18:00' },
  thu: { active: true, start: '08:00', end: '18:00' },
  fri: { active: true, start: '08:00', end: '18:00' },
  sat: { active: false, start: '08:00', end: '14:00' },
  sun: { active: false, start: '08:00', end: '18:00' }
};

function parseSchedule(raw) {
  if (!raw) return { ...DEFAULT_SCHEDULE };
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const schedule = {};
    DAYS.forEach((day) => {
      schedule[day] = {
        active: parsed[day]?.active ?? DEFAULT_SCHEDULE[day].active,
        start: parsed[day]?.start || DEFAULT_SCHEDULE[day].start,
        end: parsed[day]?.end || DEFAULT_SCHEDULE[day].end
      };
    });
    return schedule;
  } catch {
    return { ...DEFAULT_SCHEDULE };
  }
}

function getDayKey(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return DAYS[d.getDay()];
}

function getDayBoundsFromSchedule(schedule, dateStr) {
  const day = getDayKey(`${dateStr}T12:00:00`);
  const daySchedule = schedule[day] || DEFAULT_SCHEDULE[day];
  if (!daySchedule.active) return null;
  return {
    day,
    start: new Date(`${dateStr}T${daySchedule.start}:00`),
    end: new Date(`${dateStr}T${daySchedule.end}:00`)
  };
}

function isDentistWorkingOnDate(schedule, dateStr) {
  const bounds = getDayBoundsFromSchedule(schedule, dateStr);
  return !!bounds;
}

function formatScheduleSummary(schedule) {
  const active = DAYS.filter((d) => schedule[d]?.active).map((d) => DAY_LABELS[d]);
  if (active.length === 0) return 'No working days';
  if (active.length === 7) return 'Every day';
  return active.join(', ');
}

module.exports = {
  DAYS,
  DAY_LABELS,
  DEFAULT_SCHEDULE,
  parseSchedule,
  getDayKey,
  getDayBoundsFromSchedule,
  isDentistWorkingOnDate,
  formatScheduleSummary
};
