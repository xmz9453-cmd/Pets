const { getPool } = require('../config/database');

async function findById(id, connection = getPool()) {
  const [rows] = await connection.query(
    'SELECT * FROM groomings WHERE id = ? LIMIT 1',
    [id],
  );
  return rows && rows.length > 0 ? rows[0] : null;
}

async function findByDailyOperationAndPet(dailyOperationId, petId, connection = getPool()) {
  const [rows] = await connection.query(
    'SELECT * FROM groomings WHERE daily_operation_id = ? AND pet_id = ? LIMIT 1',
    [dailyOperationId, petId],
  );
  return rows && rows.length > 0 ? rows[0] : null;
}

async function listByDailyOperationId(dailyOperationId, connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT g.*, do.appointment_id, p.name AS pet_name, p.species,
            c.name AS customer_name, c.phone AS customer_phone,
            GROUP_CONCAT(DISTINCT s.name ORDER BY s.name SEPARATOR ', ') AS service_names
     FROM groomings g
     INNER JOIN daily_operations do ON do.id = g.daily_operation_id
     INNER JOIN appointments a ON a.id = do.appointment_id
     INNER JOIN customers c ON c.id = a.customer_id
     INNER JOIN pets p ON p.id = g.pet_id
     LEFT JOIN appointment_pets ap ON ap.appointment_id = a.id AND ap.pet_id = g.pet_id
     LEFT JOIN appointment_pet_services aps ON aps.appointment_pet_id = ap.id
     LEFT JOIN services s ON s.id = aps.service_id
     WHERE g.daily_operation_id = ?
     GROUP BY g.id, do.appointment_id, p.name, p.species, c.name, c.phone
     ORDER BY g.created_at ASC`,
    [dailyOperationId],
  );
  return rows || [];
}

async function createRecord(payload, connection = getPool()) {
  const [result] = await connection.query(
    `INSERT INTO groomings (daily_operation_id, pet_id, before_condition, actual_grooming_content, grooming_result, note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      payload.daily_operation_id,
      payload.pet_id,
      payload.before_condition ?? null,
      payload.actual_grooming_content ?? null,
      payload.grooming_result ?? null,
      payload.note ?? null,
    ],
  );
  return result.insertId;
}

async function updateRecord(id, patch, connection = getPool()) {
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      continue;
    }

    fields.push(`${key} = ?`);
    values.push(value === null ? null : value);
  }

  if (!fields.length) {
    return true;
  }

  values.push(id);
  await connection.query(
    `UPDATE groomings SET ${fields.join(', ')} WHERE id = ?`,
    values,
  );
  return true;
}

async function findByIdWithRelations(id, connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT g.*, do.appointment_id, p.name AS pet_name, p.species, p.gender,
            c.name AS customer_name, c.phone AS customer_phone,
            GROUP_CONCAT(DISTINCT s.name ORDER BY s.name SEPARATOR ', ') AS service_names
     FROM groomings g
     INNER JOIN daily_operations do ON do.id = g.daily_operation_id
     INNER JOIN appointments a ON a.id = do.appointment_id
     INNER JOIN customers c ON c.id = a.customer_id
     INNER JOIN pets p ON p.id = g.pet_id
     LEFT JOIN appointment_pets ap ON ap.appointment_id = a.id AND ap.pet_id = g.pet_id
     LEFT JOIN appointment_pet_services aps ON aps.appointment_pet_id = ap.id
     LEFT JOIN services s ON s.id = aps.service_id
     WHERE g.id = ?
     GROUP BY g.id, do.appointment_id, p.name, p.species, p.gender, c.name, c.phone
     LIMIT 1`,
    [id],
  );
  return rows && rows.length > 0 ? rows[0] : null;
}

module.exports = {
  createRecord,
  findByDailyOperationAndPet,
  findById,
  findByIdWithRelations,
  listByDailyOperationId,
  updateRecord,
};
