const { getPool } = require('../config/database');

function normalizeCustomer(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    id: Number(row.id),
    status: row.status || 'ACTIVE',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function listCustomers(filters = {}) {
  const {
    status = 'ACTIVE',
    search = '',
    page = 1,
    limit = 20,
  } = filters;

  const conditions = [];
  const params = [];

  if (status && status !== 'ALL') {
    conditions.push('c.status = ?');
    params.push(status);
  }

  if (search) {
    conditions.push('(c.name LIKE ? OR c.phone LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const offset = (Number(page) - 1) * Number(limit);
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await getPool().query(
    `SELECT c.*
     FROM customers c
     ${whereClause}
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)],
  );

  const [totalRows] = await getPool().query(
    `SELECT COUNT(*) AS total FROM customers c ${whereClause}`,
    params,
  );

  return {
    customers: rows.map(normalizeCustomer),
    total: Number(totalRows[0]?.total || 0),
    page: Number(page),
    limit: Number(limit),
  };
}

async function getCustomerById(customerId) {
  const [rows] = await getPool().query(
    `SELECT c.*, (
      SELECT COUNT(*)
      FROM pet_customer_relationships pcr
      WHERE pcr.customer_id = c.id
    ) AS pet_count
     FROM customers c
     WHERE c.id = ?
     LIMIT 1`,
    [customerId],
  );

  if (!rows[0]) {
    return null;
  }

  const customer = normalizeCustomer(rows[0]);
  const [petRows] = await getPool().query(
    `SELECT p.id, p.name, p.species, p.status, pcr.is_primary
     FROM pet_customer_relationships pcr
     INNER JOIN pets p ON p.id = pcr.pet_id
     WHERE pcr.customer_id = ?
     ORDER BY p.name ASC`,
    [customerId],
  );

  return {
    ...customer,
    pet_count: Number(rows[0].pet_count || 0),
    pets: petRows.map((pet) => ({
      id: Number(pet.id),
      name: pet.name,
      species: pet.species,
      status: pet.status,
      is_primary: Boolean(pet.is_primary),
    })),
  };
}

async function createCustomer(payload) {
  const [result] = await getPool().query(
    `INSERT INTO customers (name, phone, address, line_id, note, status)
     VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
    [
      payload.name,
      payload.phone,
      payload.address || null,
      payload.line_id || payload.lineId || null,
      payload.note || null,
    ],
  );

  return result.insertId;
}

async function updateCustomer(customerId, patch) {
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      continue;
    }

    if (key === 'lineId') {
      fields.push('line_id = ?');
      values.push(value || null);
      continue;
    }

    if (key === 'created_at' || key === 'id') {
      continue;
    }

    fields.push(`${key} = ?`);
    values.push(value === null ? null : value);
  }

  if (!fields.length) {
    return getCustomerById(customerId);
  }

  values.push(customerId);
  await getPool().query(
    `UPDATE customers SET ${fields.join(', ')} WHERE id = ?`,
    values,
  );

  return getCustomerById(customerId);
}

async function updateStatus(customerId, status) {
  const [result] = await getPool().query(
    'UPDATE customers SET status = ? WHERE id = ?',
    [status, customerId],
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getCustomerById(customerId);
}

module.exports = {
  createCustomer,
  getCustomerById,
  listCustomers,
  updateCustomer,
  updateStatus,
};
