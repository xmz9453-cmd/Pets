const { getPool } = require('../config/database');
const { getCurrentShopId } = require('../utils/shop-context');

function normalizeRule(row) {
  return {
    id: Number(row.id),
    species: row.species,
    start_time: String(row.start_time).slice(0, 8),
    capacity: row.capacity === null ? null : Number(row.capacity),
    is_closed: Boolean(row.is_closed),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeOverride(row) {
  return {
    id: Number(row.id),
    override_date: typeof row.override_date === 'string'
      ? row.override_date.slice(0, 10)
      : row.override_date.toISOString().slice(0, 10),
    species: row.species,
    start_time: row.start_time === null ? null : String(row.start_time).slice(0, 8),
    is_closed: Boolean(row.is_closed),
    capacity: row.capacity === null ? null : Number(row.capacity),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function listRules() {
  const [rows] = await getPool().query(
    `SELECT * FROM booking_schedule_rules
     WHERE shop_id = ?
     ORDER BY species ASC, start_time ASC`,
    [getCurrentShopId()],
  );
  return rows.map(normalizeRule);
}

async function listOverrides() {
  const [rows] = await getPool().query(
    `SELECT * FROM booking_schedule_overrides
     WHERE shop_id = ?
     ORDER BY override_date ASC, species ASC, start_time ASC`,
    [getCurrentShopId()],
  );
  return rows.map(normalizeOverride);
}

async function getRuleById(id) {
  const [rows] = await getPool().query(
    'SELECT * FROM booking_schedule_rules WHERE id = ? AND shop_id = ? LIMIT 1',
    [id, getCurrentShopId()],
  );
  return rows[0] ? normalizeRule(rows[0]) : null;
}

async function createRule(rule) {
  const [result] = await getPool().query(
    `INSERT INTO booking_schedule_rules (shop_id, species, start_time, capacity, is_closed, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [getCurrentShopId(), rule.species, rule.start_time, rule.capacity, rule.is_closed, rule.status],
  );
  return getRuleById(result.insertId);
}

async function updateRule(id, rule) {
  await getPool().query(
    `UPDATE booking_schedule_rules
     SET species = ?, start_time = ?, capacity = ?, is_closed = ?, status = ?
     WHERE id = ? AND shop_id = ?`,
    [rule.species, rule.start_time, rule.capacity, rule.is_closed, rule.status, id, getCurrentShopId()],
  );
  return getRuleById(id);
}

async function deleteRule(id) {
  const [result] = await getPool().query(
    'DELETE FROM booking_schedule_rules WHERE id = ? AND shop_id = ?',
    [id, getCurrentShopId()],
  );
  return result.affectedRows > 0;
}

async function getOverrideById(id) {
  const [rows] = await getPool().query(
    'SELECT * FROM booking_schedule_overrides WHERE id = ? AND shop_id = ? LIMIT 1',
    [id, getCurrentShopId()],
  );
  return rows[0] ? normalizeOverride(rows[0]) : null;
}

async function createOverride(override) {
  const [result] = await getPool().query(
    `INSERT INTO booking_schedule_overrides
       (shop_id, override_date, species, start_time, is_closed, capacity)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [getCurrentShopId(), override.override_date, override.species, override.start_time, override.is_closed, override.capacity],
  );
  return getOverrideById(result.insertId);
}

async function updateOverride(id, override) {
  await getPool().query(
    `UPDATE booking_schedule_overrides
     SET override_date = ?, species = ?, start_time = ?, is_closed = ?, capacity = ?
     WHERE id = ? AND shop_id = ?`,
    [override.override_date, override.species, override.start_time, override.is_closed, override.capacity, id, getCurrentShopId()],
  );
  return getOverrideById(id);
}

async function deleteOverride(id) {
  const [result] = await getPool().query(
    'DELETE FROM booking_schedule_overrides WHERE id = ? AND shop_id = ?',
    [id, getCurrentShopId()],
  );
  return result.affectedRows > 0;
}

module.exports = {
  createOverride,
  createRule,
  deleteOverride,
  deleteRule,
  getOverrideById,
  getRuleById,
  listOverrides,
  listRules,
  updateOverride,
  updateRule,
};
