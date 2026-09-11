const { getPool } = require('../config/database');

function toIsoDateString(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  if (value instanceof Date) {
    const localDate = new Date(value.getTime() - (value.getTimezoneOffset() * 60000));
    return localDate.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function normalizeAppointment(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    customer_id: Number(row.customer_id),
    staff_id: row.staff_id === null || row.staff_id === undefined ? null : Number(row.staff_id),
    appointment_date: toIsoDateString(row.appointment_date),
    appointment_time: row.appointment_time ? String(row.appointment_time).slice(0, 8) : null,
    status: row.status,
    note: row.note,
    created_at: row.created_at,
    updated_at: row.updated_at,
    customer_name: row.customer_name || null,
    customer_phone: row.customer_phone || null,
    staff_name: row.staff_name || null,
    pet_count: Number(row.pet_count || 0),
  };
}

async function listAppointments(filters = {}) {
  const {
    status = '',
    customerId = '',
    appointmentDate = '',
    page = 1,
    limit = 20,
  } = filters;

  const conditions = [];
  const params = [];

  if (status && status !== 'ALL') {
    conditions.push('a.status = ?');
    params.push(status);
  }

  if (customerId) {
    conditions.push('a.customer_id = ?');
    params.push(customerId);
  }

  if (appointmentDate) {
    conditions.push('a.appointment_date = ?');
    params.push(appointmentDate);
  }

  const offset = (Number(page) - 1) * Number(limit);
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await getPool().query(
    `SELECT a.*, c.name AS customer_name, c.phone AS customer_phone, s.display_name AS staff_name,
            COUNT(ap.id) AS pet_count
     FROM appointments a
     LEFT JOIN customers c ON c.id = a.customer_id
     LEFT JOIN staff s ON s.id = a.staff_id
     LEFT JOIN appointment_pets ap ON ap.appointment_id = a.id
     ${whereClause}
     GROUP BY a.id, c.name, c.phone, s.display_name
     ORDER BY a.appointment_date DESC, a.appointment_time DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)],
  );

  const [totalRows] = await getPool().query(
    `SELECT COUNT(*) AS total
     FROM appointments a
     ${whereClause}`,
    params,
  );

  return {
    appointments: rows.map(normalizeAppointment),
    total: Number(totalRows[0]?.total || 0),
    page: Number(page),
    limit: Number(limit),
  };
}

async function getAppointmentById(appointmentId, connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT a.*, c.name AS customer_name, c.phone AS customer_phone, s.display_name AS staff_name
     FROM appointments a
     LEFT JOIN customers c ON c.id = a.customer_id
     LEFT JOIN staff s ON s.id = a.staff_id
     WHERE a.id = ?
     LIMIT 1`,
    [appointmentId],
  );

  if (!rows[0]) {
    return null;
  }

  const appointment = normalizeAppointment(rows[0]);
  const [petRows] = await connection.query(
    `SELECT ap.id AS appointment_pet_id, ap.pet_id, p.name AS pet_name, p.species, p.gender, p.status AS pet_status
     FROM appointment_pets ap
     INNER JOIN pets p ON p.id = ap.pet_id
     WHERE ap.appointment_id = ?
     ORDER BY ap.id ASC`,
    [appointmentId],
  );

  const appointmentPetIds = petRows.map((row) => Number(row.appointment_pet_id));

  let serviceRows = [];
  if (appointmentPetIds.length) {
    const placeholders = appointmentPetIds.map(() => '?').join(', ');
    [serviceRows] = await connection.query(
      `SELECT aps.appointment_pet_id, aps.service_id, s.name AS service_name, s.status AS service_status, s.price
       FROM appointment_pet_services aps
       INNER JOIN services s ON s.id = aps.service_id
       WHERE aps.appointment_pet_id IN (${placeholders})
       ORDER BY s.name ASC`,
      appointmentPetIds,
    );
  }

  const serviceMap = new Map();
  for (const row of serviceRows) {
    const appointmentPetId = Number(row.appointment_pet_id);
    if (!serviceMap.has(appointmentPetId)) {
      serviceMap.set(appointmentPetId, []);
    }
    serviceMap.get(appointmentPetId).push({
      id: Number(row.service_id),
      name: row.service_name,
      status: row.service_status,
      price: row.price === null || row.price === undefined ? null : Number(row.price),
    });
  }

  const pets = petRows.map((petRow) => ({
    appointment_pet_id: Number(petRow.appointment_pet_id),
    pet_id: Number(petRow.pet_id),
    name: petRow.pet_name,
    species: petRow.species,
    gender: petRow.gender,
    pet_status: petRow.pet_status,
    services: serviceMap.get(Number(petRow.appointment_pet_id)) || [],
  }));

  return {
    ...appointment,
    pets,
    customer: {
      id: appointment.customer_id,
      name: appointment.customer_name,
      phone: appointment.customer_phone,
    },
  };
}

async function createAppointment(payload, connection = getPool()) {
  const [result] = await connection.query(
    `INSERT INTO appointments (customer_id, staff_id, appointment_date, appointment_time, status, note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      payload.customer_id,
      payload.staff_id ?? null,
      payload.appointment_date,
      payload.appointment_time,
      payload.status || 'SCHEDULED',
      payload.note || null,
    ],
  );

  return result.insertId;
}

async function updateAppointment(appointmentId, patch, connection = getPool()) {
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      continue;
    }

    if (key === 'status' || key === 'appointment_date' || key === 'appointment_time' || key === 'note' || key === 'staff_id' || key === 'customer_id') {
      fields.push(`${key} = ?`);
      values.push(value === null ? null : value);
    }
  }

  if (fields.length) {
    values.push(appointmentId);
    await connection.query(
      `UPDATE appointments SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
  }

  return getAppointmentById(appointmentId, connection);
}

async function createAppointmentPet({ appointmentId, petId }, connection = getPool()) {
  const [result] = await connection.query(
    'INSERT INTO appointment_pets (appointment_id, pet_id) VALUES (?, ?)',
    [appointmentId, petId],
  );

  return result.insertId;
}

async function createAppointmentPetService({ appointmentPetId, serviceId }, connection = getPool()) {
  await connection.query(
    'INSERT INTO appointment_pet_services (appointment_pet_id, service_id) VALUES (?, ?)',
    [appointmentPetId, serviceId],
  );
}

async function replaceAppointmentPetRelations(appointmentId, petEntries, connection = getPool()) {
  const existingPetRows = await connection.query(
    'SELECT id FROM appointment_pets WHERE appointment_id = ?',
    [appointmentId],
  );

  const existingPetIds = existingPetRows[0].map((row) => row.id);
  if (existingPetIds.length) {
    const placeholders = existingPetIds.map(() => '?').join(', ');
    await connection.query(
      `DELETE FROM appointment_pet_services WHERE appointment_pet_id IN (${placeholders})`,
      existingPetIds,
    );
    await connection.query(
      'DELETE FROM appointment_pets WHERE appointment_id = ?',
      [appointmentId],
    );
  }

  for (const petEntry of petEntries) {
    const appointmentPetId = await createAppointmentPet({ appointmentId, petId: petEntry.pet_id }, connection);
    for (const serviceId of petEntry.service_ids || []) {
      await createAppointmentPetService({ appointmentPetId, serviceId }, connection);
    }
  }
}

async function findCustomerById(customerId, connection = getPool()) {
  const [rows] = await connection.query('SELECT * FROM customers WHERE id = ? LIMIT 1', [customerId]);
  return rows[0] || null;
}

async function findPetById(petId, connection = getPool()) {
  const [rows] = await connection.query('SELECT * FROM pets WHERE id = ? LIMIT 1', [petId]);
  return rows[0] || null;
}

async function findServiceById(serviceId, connection = getPool()) {
  const [rows] = await connection.query('SELECT * FROM services WHERE id = ? LIMIT 1', [serviceId]);
  return rows[0] || null;
}

async function findAppointmentById(appointmentId, connection = getPool()) {
  const [rows] = await connection.query('SELECT * FROM appointments WHERE id = ? LIMIT 1', [appointmentId]);
  return rows[0] || null;
}

async function deleteAppointment(appointmentId) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const appointment = await findAppointmentById(appointmentId, connection);
    if (!appointment) {
      const error = new Error('Appointment not found');
      error.statusCode = 404;
      error.code = 'APPOINTMENT_NOT_FOUND';
      throw error;
    }

    const [dailyOperationRows] = await connection.query(
      `SELECT id, status, check_in_time, started_time, completed_time, responsible_staff_id, work_note
       FROM daily_operations
       WHERE appointment_id = ?
       LIMIT 1
       FOR UPDATE`,
      [appointmentId],
    );
    const [groomingRows] = await connection.query(
      `SELECT g.id
       FROM groomings g
       INNER JOIN daily_operations d ON d.id = g.daily_operation_id
       WHERE d.appointment_id = ?
       LIMIT 1`,
      [appointmentId],
    );
    const [boardingRows] = await connection.query('SELECT id FROM boardings WHERE appointment_id = ? LIMIT 1', [appointmentId]);
    const [orderRows] = await connection.query('SELECT id FROM orders WHERE appointment_id = ? LIMIT 1', [appointmentId]);
    const [paymentRows] = await connection.query(
      `SELECT p.id
       FROM payments p
       INNER JOIN orders o ON o.id = p.order_id
       WHERE o.appointment_id = ?
       LIMIT 1`,
      [appointmentId],
    );

    const dailyOperation = dailyOperationRows[0];
    const hasOperationalData = dailyOperation && (
      dailyOperation.status !== 'SCHEDULED'
      || dailyOperation.check_in_time
      || dailyOperation.started_time
      || dailyOperation.completed_time
      || dailyOperation.responsible_staff_id
      || dailyOperation.work_note
    );
    if (hasOperationalData || groomingRows.length || boardingRows.length || orderRows.length || paymentRows.length) {
      const error = new Error('Appointment has related business records and cannot be deleted');
      error.statusCode = 409;
      error.code = 'APPOINTMENT_DELETE_PROTECTED';
      throw error;
    }

    if (dailyOperation) {
      await connection.query('DELETE FROM daily_operations WHERE id = ?', [dailyOperation.id]);
    }
    await connection.query('DELETE FROM appointments WHERE id = ?', [appointmentId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  createAppointment,
  deleteAppointment,
  createAppointmentPet,
  createAppointmentPetService,
  findAppointmentById,
  findCustomerById,
  findPetById,
  findServiceById,
  getAppointmentById,
  listAppointments,
  replaceAppointmentPetRelations,
  updateAppointment,
};
