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

async function deleteCustomer(customerId) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    const [customerRows] = await connection.query(
      'SELECT id FROM customers WHERE id = ? LIMIT 1 FOR UPDATE',
      [customerId],
    );
    if (!customerRows[0]) {
      const error = new Error('Customer not found');
      error.statusCode = 404;
      error.code = 'CUSTOMER_NOT_FOUND';
      throw error;
    }

    const [orderRows] = await connection.query(
      'SELECT id FROM orders WHERE customer_id = ? LIMIT 1',
      [customerId],
    );
    const [appointmentRows] = await connection.query(
      'SELECT id FROM appointments WHERE customer_id = ? LIMIT 1',
      [customerId],
    );
    const [petRows] = await connection.query(
      'SELECT pet_id FROM pet_customer_relationships WHERE customer_id = ? LIMIT 1',
      [customerId],
    );
    const [paymentRows] = await connection.query(
      `SELECT p.id
       FROM payments p
       INNER JOIN orders o ON o.id = p.order_id
       WHERE o.customer_id = ?
       LIMIT 1`,
      [customerId],
    );
    const [boardingRows] = await connection.query(
      `SELECT id FROM boardings WHERE customer_id = ?
       UNION
       SELECT b.id
       FROM boardings b
       INNER JOIN appointments a ON a.id = b.appointment_id
       WHERE a.customer_id = ?
       LIMIT 1`,
      [customerId, customerId],
    );
    const [groomingRows] = await connection.query(
      `SELECT g.id
       FROM groomings g
       INNER JOIN daily_operations d ON d.id = g.daily_operation_id
       INNER JOIN appointments a ON a.id = d.appointment_id
       WHERE a.customer_id = ?
       UNION
       SELECT g.id
       FROM groomings g
       INNER JOIN pet_customer_relationships pcr ON pcr.pet_id = g.pet_id
       WHERE pcr.customer_id = ?
       LIMIT 1`,
      [customerId, customerId],
    );
    const [completedRows] = await connection.query(
      `SELECT d.id
       FROM daily_operations d
       INNER JOIN appointments a ON a.id = d.appointment_id
       WHERE a.customer_id = ? AND d.status = 'COMPLETED'
       LIMIT 1`,
      [customerId],
    );

    if (petRows.length || appointmentRows.length || orderRows.length || paymentRows.length || boardingRows.length || groomingRows.length || completedRows.length) {
      const error = new Error('Customer has protected business history and cannot be deleted');
      error.statusCode = 409;
      error.code = 'CUSTOMER_DELETE_PROTECTED';
      throw error;
    }

    await connection.query('DELETE FROM customers WHERE id = ?', [customerId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  createCustomer,
  deleteCustomer,
  getCustomerById,
  listCustomers,
  updateCustomer,
  updateStatus,
};
