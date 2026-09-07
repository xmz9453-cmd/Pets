const { getPool } = require('../config/database');

async function findByAppointmentId(appointmentId) {
  const [rows] = await getPool().query(
    'SELECT * FROM daily_operations WHERE appointment_id = ? LIMIT 1',
    [appointmentId]
  );
  return rows && rows.length > 0 ? rows[0] : null;
}

async function findById(id) {
  const [rows] = await getPool().query(
    'SELECT * FROM daily_operations WHERE id = ? LIMIT 1',
    [id]
  );
  return rows && rows.length > 0 ? rows[0] : null;
}

async function findByIdWithRelations(id, connection = null) {
  const pool = connection || getPool();
  const [rows] = await pool.query(`
    SELECT 
      do.id,
      do.appointment_id,
      do.status,
      do.check_in_time,
      do.started_time,
      do.completed_time,
      do.responsible_staff_id,
      do.work_note,
      do.created_at,
      do.updated_at,
      a.customer_id,
      a.appointment_date,
      a.appointment_time,
      a.note as appointment_note,
      c.name as customer_name,
      c.phone as customer_phone,
      s.display_name as responsible_staff_name
    FROM daily_operations do
    LEFT JOIN appointments a ON do.appointment_id = a.id
    LEFT JOIN customers c ON a.customer_id = c.id
    LEFT JOIN staff s ON do.responsible_staff_id = s.id
    WHERE do.id = ?
    LIMIT 1
  `, [id]);
  return rows && rows.length > 0 ? rows[0] : null;
}

async function listTodayOperations(filters = {}, connection = null) {
  const pool = connection || getPool();
  
  // Build query
  let query = `
    SELECT 
      do.id,
      do.appointment_id,
      do.status,
      do.check_in_time,
      do.started_time,
      do.completed_time,
      do.responsible_staff_id,
      do.work_note,
      do.created_at,
      do.updated_at,
      a.customer_id,
      a.appointment_date,
      a.appointment_time,
      a.appointment_time as start_time,
      c.name as customer_name,
      c.phone as customer_phone,
      CASE WHEN EXISTS (
        SELECT 1
        FROM appointment_pets eligible_ap
        INNER JOIN appointment_pet_services eligible_aps ON eligible_aps.appointment_pet_id = eligible_ap.id
        INNER JOIN services eligible_srv ON eligible_srv.id = eligible_aps.service_id
        LEFT JOIN groomings eligible_g ON eligible_g.daily_operation_id = do.id AND eligible_g.pet_id = eligible_ap.pet_id
        LEFT JOIN boardings eligible_b ON eligible_b.appointment_id = a.id
          AND eligible_b.pet_id = eligible_ap.pet_id
          AND eligible_b.service_id = eligible_aps.service_id
        WHERE eligible_ap.appointment_id = a.id
          AND ((eligible_srv.type = 'GROOMING' AND do.status = 'COMPLETED'
                AND eligible_g.id IS NOT NULL
                AND eligible_g.before_condition IS NOT NULL
                AND eligible_g.actual_grooming_content IS NOT NULL
                AND eligible_g.grooming_result IS NOT NULL)
            OR (eligible_srv.type = 'BOARDING' AND eligible_b.status = 'COMPLETED'))
      ) THEN 1 ELSE 0 END as can_create_appointment_order,
      p.name as pet_name,
      p.species,
      GROUP_CONCAT(DISTINCT srv.id ORDER BY srv.id SEPARATOR ',') as service_ids,
      GROUP_CONCAT(srv.name ORDER BY srv.id SEPARATOR ', ') as service_names,
      GROUP_CONCAT(srv.type ORDER BY srv.id SEPARATOR ',') as service_types,
      s.display_name as responsible_staff_name
    FROM daily_operations do
    JOIN appointments a ON do.appointment_id = a.id
    JOIN customers c ON a.customer_id = c.id
    LEFT JOIN appointment_pets ap ON a.id = ap.appointment_id
    LEFT JOIN pets p ON ap.pet_id = p.id
    LEFT JOIN appointment_pet_services aps ON aps.appointment_pet_id = ap.id
    LEFT JOIN services srv ON srv.id = aps.service_id
    LEFT JOIN staff s ON do.responsible_staff_id = s.id
    WHERE DATE(a.appointment_date) = ?
      AND a.status != 'CANCELLED'
  `;

  const params = [filters.date || new Date().toISOString().split('T')[0]];

  // Status filter
  if (filters.status && filters.status !== 'ALL') {
    if (filters.status === 'PENDING') {
      query += ` AND do.status IN ('SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS')`;
    } else if (filters.status === 'COMPLETED') {
      query += ` AND do.status = 'COMPLETED'`;
    } else {
      query += ` AND do.status = ?`;
      params.push(filters.status);
    }
  }

  // Service type filter
  if (filters.serviceType) {
    query += `
      AND EXISTS (
        SELECT 1 FROM appointment_pet_services aps
        JOIN services srv ON aps.service_id = srv.id
        WHERE aps.appointment_pet_id IN (
          SELECT id FROM appointment_pets WHERE appointment_id = a.id
        )
        AND srv.type = ?
      )
    `;
    params.push(filters.serviceType);
  }

  // Species filter
  if (filters.species && filters.species !== 'ALL') {
    query += ` AND p.species = ?`;
    params.push(filters.species);
  }

  // Search: Customer name
  if (filters.searchCustomer) {
    query += ` AND c.name LIKE ?`;
    params.push(`%${filters.searchCustomer}%`);
  }

  // Search: Pet name
  if (filters.searchPet) {
    query += ` AND p.name LIKE ?`;
    params.push(`%${filters.searchPet}%`);
  }

  // Search: Phone
  if (filters.searchPhone) {
    query += ` AND c.phone LIKE ?`;
    params.push(`%${filters.searchPhone}%`);
  }

  // Sorting
  query += ` GROUP BY do.id, a.id, c.id, p.id, s.id ORDER BY a.appointment_time ASC`;

  const [rows] = await pool.query(query, params);
  
  // Group by appointment to handle multiple pets, maintaining sort order
  const grouped = {};
  const order = []; // Track insertion order
  
  rows.forEach(row => {
    if (!grouped[row.appointment_id]) {
      grouped[row.appointment_id] = {
        ...row,
        can_create_appointment_order: Boolean(row.can_create_appointment_order),
        pets: [],
        services: [],
      };
      order.push(row.appointment_id); // Track order
    }
    if (row.pet_name && !grouped[row.appointment_id].pets.find(p => p.name === row.pet_name)) {
      grouped[row.appointment_id].pets.push({
        name: row.pet_name,
        species: row.species,
        services: row.service_ids ? row.service_ids.split(',').map((id, index) => ({
          id: Number(id),
          name: row.service_names ? row.service_names.split(', ')[index] : '',
          type: row.service_types ? row.service_types.split(',')[index] : '',
        })) : [],
        service_types: row.service_types ? row.service_types.split(',') : [],
      });
    }
  });

  // Return in the correct order
  return order.map(appointmentId => grouped[appointmentId]);
}

async function create(appointmentId, connection = null) {
  const pool = connection || getPool();
  const [result] = await pool.query(
    'INSERT INTO daily_operations (appointment_id, status) VALUES (?, ?)',
    [appointmentId, 'SCHEDULED']
  );
  return result.insertId;
}

async function updateStatus(id, newStatus, connection = null) {
  const pool = connection || getPool();
  const [result] = await pool.query(
    'UPDATE daily_operations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [newStatus, id]
  );
  return result.affectedRows > 0;
}

async function updateCheckInTime(id, connection = null) {
  const pool = connection || getPool();
  const [result] = await pool.query(
    'UPDATE daily_operations SET check_in_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
}

async function updateStartedTime(id, connection = null) {
  const pool = connection || getPool();
  const [result] = await pool.query(
    'UPDATE daily_operations SET started_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
}

async function updateCompletedTime(id, connection = null) {
  const pool = connection || getPool();
  const [result] = await pool.query(
    'UPDATE daily_operations SET completed_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
}

async function updateResponsibleStaff(id, staffId, connection = null) {
  const pool = connection || getPool();
  const [result] = await pool.query(
    'UPDATE daily_operations SET responsible_staff_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [staffId, id]
  );
  return result.affectedRows > 0;
}

async function updateWorkNote(id, note, connection = null) {
  const pool = connection || getPool();
  const [result] = await pool.query(
    'UPDATE daily_operations SET work_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [note, id]
  );
  return result.affectedRows > 0;
}

module.exports = {
  findByAppointmentId,
  findById,
  findByIdWithRelations,
  listTodayOperations,
  create,
  updateStatus,
  updateCheckInTime,
  updateStartedTime,
  updateCompletedTime,
  updateResponsibleStaff,
  updateWorkNote,
};
