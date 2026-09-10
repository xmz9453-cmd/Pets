const { getPool } = require('../config/database');

function normalizePet(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    id: Number(row.id),
    weight: row.weight === null || row.weight === undefined ? null : Number(row.weight),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function listPets(filters = {}) {
  const {
    search = '',
    species = '',
    status = '',
    customerId = '',
    chipNumber = '',
  } = filters;

  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('(p.name LIKE ? OR p.chip_number LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (species) {
    conditions.push('p.species = ?');
    params.push(species);
  }

  if (status && status !== 'ALL') {
    conditions.push('p.status = ?');
    params.push(status);
  }

  if (customerId) {
    conditions.push('EXISTS (SELECT 1 FROM pet_customer_relationships pcr2 WHERE pcr2.pet_id = p.id AND pcr2.customer_id = ?)');
    params.push(customerId);
  }

  if (chipNumber) {
    conditions.push('p.chip_number = ?');
    params.push(chipNumber);
  }

  const sql = `
    SELECT p.*, c.id AS customer_id, c.id AS primary_customer_id,
      c.name AS customer_name, c.name AS primary_customer_name, c.phone AS primary_customer_phone
    FROM pets p
    LEFT JOIN pet_customer_relationships pcr
      ON pcr.pet_id = p.id AND pcr.is_primary = 1
    LEFT JOIN customers c
      ON c.id = pcr.customer_id
    ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
    ORDER BY p.created_at DESC
  `;

  const [rows] = await getPool().query(sql, params);
  const [totalRows] = await getPool().query(
    `SELECT COUNT(*) AS total
     FROM pets p
     ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}`,
    params,
  );

  return {
    pets: rows.map(normalizePet),
    total: Number(totalRows[0]?.total || 0),
  };
}

async function getPetById(petId, connection = getPool()) {
  const [rows] = await connection.query('SELECT * FROM pets WHERE id = ? LIMIT 1', [petId]);
  return normalizePet(rows[0] || null);
}

async function findRelationshipByPetAndCustomer(petId, customerId, connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT r.*, c.name AS customer_name, c.phone AS customer_phone, c.status AS customer_status
     FROM pet_customer_relationships r
     INNER JOIN customers c ON c.id = r.customer_id
     WHERE r.pet_id = ? AND r.customer_id = ?
     LIMIT 1`,
    [petId, customerId],
  );
  return rows[0] || null;
}

async function listRelationshipsByPetId(petId, connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT r.*, c.name AS customer_name, c.phone AS customer_phone, c.status AS customer_status
     FROM pet_customer_relationships r
     INNER JOIN customers c ON c.id = r.customer_id
     WHERE r.pet_id = ?
     ORDER BY r.is_primary DESC, c.name ASC`,
    [petId],
  );
  return rows;
}

async function findPrimaryRelationship(petId, connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT * FROM pet_customer_relationships WHERE pet_id = ? AND is_primary = 1 LIMIT 1`,
    [petId],
  );
  return rows[0] || null;
}

async function getPetDetail(petId, connection = getPool()) {
  const pet = await getPetById(petId, connection);
  if (!pet) {
    return null;
  }

  const relationships = await listRelationshipsByPetId(petId, connection);
  const primary = relationships.find((relationship) => relationship.is_primary === 1 || relationship.is_primary === true) || null;

  return {
    pet: {
      ...pet,
      customer_id: primary ? primary.customer_id : null,
      customer_name: primary ? primary.customer_name : null,
    },
    primary_customer: primary ? {
      id: primary.customer_id,
      name: primary.customer_name,
      phone: primary.customer_phone,
      status: primary.customer_status,
    } : null,
    customers: relationships.map((relationship) => ({
      id: relationship.customer_id,
      name: relationship.customer_name,
      phone: relationship.customer_phone,
      status: relationship.customer_status,
      is_primary: relationship.is_primary === 1 || relationship.is_primary === true,
    })),
  };
}

async function createPet(petPayload, connection = getPool()) {
  const [result] = await connection.query(
    `INSERT INTO pets (
      name, species, breed, gender, birth_date, weight, weight_unit, chip_number,
      photo_url, notes, special_notes, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      petPayload.name,
      petPayload.species,
      petPayload.breed || null,
      petPayload.gender,
      petPayload.birth_date || null,
      petPayload.weight ?? null,
      petPayload.weight_unit || null,
      petPayload.chip_number || null,
      petPayload.photo_url || null,
      petPayload.notes || null,
      petPayload.special_notes || null,
      petPayload.status || 'ACTIVE',
    ],
  );

  return result.insertId;
}

async function createPetRelationship({ petId, customerId, isPrimary }, connection = getPool()) {
  await connection.query(
    `INSERT INTO pet_customer_relationships (pet_id, customer_id, is_primary) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE is_primary = VALUES(is_primary)`,
    [petId, customerId, isPrimary ? 1 : 0],
  );
}

async function setPrimaryRelationship(petId, customerId, connection = getPool()) {
  await connection.query(
    'UPDATE pet_customer_relationships SET is_primary = 0 WHERE pet_id = ? AND is_primary = 1',
    [petId],
  );
  await connection.query(
    'UPDATE pet_customer_relationships SET is_primary = 1 WHERE pet_id = ? AND customer_id = ?',
    [petId, customerId],
  );
}

async function removeRelationship(petId, customerId, connection = getPool()) {
  await connection.query(
    'DELETE FROM pet_customer_relationships WHERE pet_id = ? AND customer_id = ?',
    [petId, customerId],
  );
}

async function updatePet(petId, patch, connection = getPool()) {
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      continue;
    }
    if (key === 'customer_id') {
      continue;
    }
    fields.push(`${key} = ?`);
    values.push(value === '' ? null : value);
  }

  if (!fields.length) {
    return getPetById(petId);
  }

  values.push(petId);
  await connection.query(
    `UPDATE pets SET ${fields.join(', ')} WHERE id = ?`,
    values,
  );

  return getPetById(petId);
}

async function findCustomerById(customerId) {
  const [rows] = await getPool().query('SELECT * FROM customers WHERE id = ? LIMIT 1', [customerId]);
  return rows[0] || null;
}

async function deletePet(petId) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const pet = await getPetById(petId, connection);
    if (!pet) {
      const error = new Error('Pet not found');
      error.statusCode = 404;
      error.code = 'PET_NOT_FOUND';
      throw error;
    }

    const [appointmentRows] = await connection.query('SELECT id FROM appointment_pets WHERE pet_id = ? LIMIT 1', [petId]);
    const [groomingRows] = await connection.query('SELECT id FROM groomings WHERE pet_id = ? LIMIT 1', [petId]);
    const [boardingRows] = await connection.query('SELECT id FROM boardings WHERE pet_id = ? LIMIT 1', [petId]);
    if (appointmentRows.length || groomingRows.length || boardingRows.length) {
      const error = new Error('Pet has related business records and cannot be deleted');
      error.statusCode = 409;
      error.code = 'PET_DELETE_PROTECTED';
      throw error;
    }

    await connection.query('DELETE FROM pets WHERE id = ?', [petId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  createPet,
  createPetRelationship,
  deletePet,
  findCustomerById,
  findPrimaryRelationship,
  findRelationshipByPetAndCustomer,
  getPetById,
  getPetDetail,
  listPets,
  listRelationshipsByPetId,
  removeRelationship,
  setPrimaryRelationship,
  updatePet,
};
