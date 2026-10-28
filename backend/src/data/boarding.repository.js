const { getPool } = require('../config/database');
const { getCurrentShopId } = require('../utils/shop-context');

const selectWithRelations = `
  SELECT b.*, c.name AS customer_name, c.phone AS customer_phone,
         p.name AS pet_name, p.species, p.gender,
         s.name AS service_name, s.type AS service_type,
         a.appointment_date, a.appointment_time,
         do.status AS daily_operation_status
  FROM boardings b
  INNER JOIN customers c ON c.id = b.customer_id AND c.shop_id = b.shop_id
  INNER JOIN pets p ON p.id = b.pet_id AND p.shop_id = b.shop_id
  INNER JOIN services s ON s.id = b.service_id AND s.shop_id = b.shop_id
  LEFT JOIN appointments a ON a.id = b.appointment_id AND a.shop_id = b.shop_id
  LEFT JOIN daily_operations do ON do.id = b.daily_operation_id AND do.shop_id = b.shop_id
`;

async function findById(id, connection = getPool()) {
  const [rows] = await connection.query('SELECT * FROM boardings WHERE id = ? AND shop_id = ? LIMIT 1', [id, getCurrentShopId()]);
  return rows[0] || null;
}

async function findByIdWithRelations(id, connection = getPool()) {
  const [rows] = await connection.query(`${selectWithRelations} WHERE b.id = ? AND b.shop_id = ? LIMIT 1`, [id, getCurrentShopId()]);
  return rows[0] || null;
}

async function listByDailyOperationId(dailyOperationId, connection = getPool()) {
  const [rows] = await connection.query(`${selectWithRelations} WHERE b.daily_operation_id = ? AND b.shop_id = ? ORDER BY b.created_at ASC`, [dailyOperationId, getCurrentShopId()]);
  return rows;
}

async function findActiveByPet(petId, connection = getPool()) {
  const [rows] = await connection.query(
    "SELECT * FROM boardings WHERE pet_id = ? AND status = 'IN_PROGRESS' AND shop_id = ? LIMIT 1",
    [petId, getCurrentShopId()],
  );
  return rows[0] || null;
}

async function createRecord(payload, connection = getPool()) {
  const [result] = await connection.query(
    `INSERT INTO boardings
      (shop_id, customer_id, pet_id, service_id, appointment_id, daily_operation_id,
       expected_check_in, expected_check_out, before_condition,
       actual_boarding_content, boarding_result, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [getCurrentShopId(), payload.customer_id, payload.pet_id, payload.service_id, payload.appointment_id,
      payload.daily_operation_id, payload.expected_check_in, payload.expected_check_out,
      payload.before_condition, payload.actual_boarding_content, payload.boarding_result, payload.note],
  );
  return result.insertId;
}

async function updateRecord(id, patch, connection = getPool()) {
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  if (!fields.length) return;
  values.push(id, getCurrentShopId());
  await connection.query(`UPDATE boardings SET ${fields.join(', ')} WHERE id = ? AND shop_id = ?`, values);
}

async function updateLifecycle(id, status, actualCheckIn, actualCheckOut, connection) {
  await connection.query(
    'UPDATE boardings SET status = ?, actual_check_in = COALESCE(?, actual_check_in), actual_check_out = COALESCE(?, actual_check_out), updated_at = CURRENT_TIMESTAMP WHERE id = ? AND shop_id = ?',
    [status, actualCheckIn, actualCheckOut, id, getCurrentShopId()],
  );
}

module.exports = {
  createRecord,
  findActiveByPet,
  findById,
  findByIdWithRelations,
  listByDailyOperationId,
  updateLifecycle,
  updateRecord,
};
