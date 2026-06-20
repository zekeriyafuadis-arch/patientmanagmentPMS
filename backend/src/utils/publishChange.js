const { publish } = require('../lib/eventBus');

function publishChange(entity, action, data = {}, userId = null) {
  const id = data.id ?? data.patientId ?? data.appointmentId ?? data.invoiceId ?? null;
  publish(`${entity}.${action}`, {
    entity,
    action,
    id: id != null ? String(id) : null,
    by: userId != null ? String(userId) : null,
    ...data
  });
}

module.exports = { publishChange };
