const { run } = require('../config/database');

/** Mark past-day scheduled/confirmed appointments as no_show if the day has passed. */
async function markPastAppointmentsNoShow() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const cutoff = startOfToday.toISOString();

  const result = await run(
    `UPDATE appointments SET status = 'no_show', updated_at = CURRENT_TIMESTAMP
     WHERE datetime < ? AND status IN ('scheduled', 'confirmed', 'pending_doctor', 'in_chair')`,
    [cutoff]
  );
  return result?.changes || 0;
}

module.exports = { markPastAppointmentsNoShow };
