const { getPool } = require('../config/database');

function normalizeService(row) {
  if (!row) return null;
  return {
    ...row,
    id: Number(row.id),
    price: Number(row.price),
    duration_minutes: Number(row.duration_minutes),
    sort_order: Number(row.sort_order),
  };
}

async function listServices(filters = {}) {
  const conditions = [];
  const params = [];
  if (filters.search) {
    conditions.push('name LIKE ?');
    params.push(`%${filters.search}%`);
  }
  if (filters.type && filters.type !== 'ALL') {
    conditions.push('type = ?');
    params.push(filters.type);
  }
  if (filters.status && filters.status !== 'ALL') {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await getPool().query(`SELECT * FROM services ${where} ORDER BY sort_order ASC, name ASC`, params);
  return { services: rows.map(normalizeService), total: rows.length };
}

async function getServiceById(id, connection = getPool()) {
  const [rows] = await connection.query('SELECT * FROM services WHERE id = ? LIMIT 1', [id]);
  return normalizeService(rows[0]);
}

async function findByName(name, excludeId = null) {
  const params = [name];
  let sql = 'SELECT * FROM services WHERE name = ?';
  if (excludeId !== null) {
    sql += ' AND id <> ?';
    params.push(excludeId);
  }
  const [rows] = await getPool().query(`${sql} LIMIT 1`, params);
  return normalizeService(rows[0]);
}

async function createService(payload) {
  const [result] = await getPool().query(
    `INSERT INTO services (name, type, description, price, unit, species, duration_minutes, sort_order, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
    [payload.name, payload.type, payload.description || null, payload.price, payload.unit, payload.species, payload.duration_minutes, payload.sort_order],
  );
  return getServiceById(result.insertId);
}

async function updateService(id, payload) {
  const fields = [];
  const values = [];
  for (const key of ['name', 'type', 'description', 'price', 'unit', 'species', 'duration_minutes', 'sort_order', 'status']) {
    if (payload[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(payload[key] === '' ? null : payload[key]);
    }
  }
  if (fields.length) {
    values.push(id);
    await getPool().query(`UPDATE services SET ${fields.join(', ')} WHERE id = ?`, values);
  }
  return getServiceById(id);
}

async function countHistoricalUsage(id) {
  const [rows] = await getPool().query('SELECT COUNT(*) AS total FROM appointment_pet_services WHERE service_id = ?', [id]);
  return Number(rows[0].total);
}

async function deleteService(id) {
  await getPool().query('DELETE FROM services WHERE id = ?', [id]);
}

module.exports = { countHistoricalUsage, createService, deleteService, findByName, getServiceById, listServices, updateService };