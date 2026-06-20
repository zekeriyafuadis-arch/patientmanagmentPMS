const { run } = require('../config/database');

async function logAudit({ action, entityType = '', entityId = '', user = {}, details = '', req = null }) {
  try {
    const ip = req?.ip || req?.headers?.['x-forwarded-for'] || '';
    await run(
      `INSERT INTO audit_log (action, entity_type, entity_id, user_id, user_name, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        action,
        entityType,
        String(entityId || ''),
        String(user.id || user.uid || ''),
        user.fullName || user.full_name || user.email || 'System',
        typeof details === 'string' ? details : JSON.stringify(details),
        ip
      ]
    );
  } catch (err) {
    console.warn('Audit log failed:', err.message);
  }
}

module.exports = { logAudit };
