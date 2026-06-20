const { all, get, run } = require('../config/database');
const { publishChange } = require('../utils/publishChange');

function mapProcedure(r) {
  return {
    id: String(r.id),
    code: r.code,
    name: r.name,
    defaultPrice: r.default_price,
    category: r.category,
    active: !!r.active
  };
}

async function listAll() {
  const rows = await all('SELECT * FROM procedures ORDER BY code');
  return rows.map(mapProcedure);
}

async function create({ code, name, defaultPrice, category }, userId) {
  const result = await run(
    `INSERT INTO procedures (code, name, default_price, category, active) VALUES (?, ?, ?, ?, 1)`,
    [code, name, parseFloat(defaultPrice) || 0, category || 'general']
  );
  publishChange('procedure', 'created', { id: result.lastID }, userId);
  return { id: String(result.lastID) };
}

async function update(id, { code, name, defaultPrice, category, active }, userId) {
  await run(
    `UPDATE procedures SET code=?, name=?, default_price=?, category=?, active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [code, name, parseFloat(defaultPrice) || 0, category, active ? 1 : 0, id]
  );
  publishChange('procedure', 'updated', { id }, userId);
}

async function remove(id, userId) {
  await run('DELETE FROM procedures WHERE id = ?', [id]);
  publishChange('procedure', 'deleted', { id }, userId);
}

async function seedDefaults(userId) {
  const count = await get('SELECT COUNT(*) as c FROM procedures');
  if (count.c > 0) return { seeded: 0 };
  const defaults = require('../config/defaultProcedures');
  for (const p of defaults) {
    await run(
      `INSERT INTO procedures (code, name, default_price, category, active) VALUES (?, ?, ?, ?, 1)`,
      [p.code, p.name, p.defaultPrice, p.category]
    );
  }
  publishChange('procedure', 'seeded', { count: defaults.length }, userId);
  return { seeded: defaults.length };
}

module.exports = { listAll, create, update, remove, seedDefaults };
