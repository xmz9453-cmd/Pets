const { getPool } = require('../config/database');

async function createOnboarding({ tokenHash, contractVersionId, staffId }, connection = getPool()) {
  const [result] = await connection.query(
    `INSERT INTO onboardings (public_token_hash, contract_version_id, created_by_staff_id)
     VALUES (?, ?, ?)`,
    [tokenHash, contractVersionId, staffId],
  );
  await connection.query('INSERT INTO onboarding_pets (onboarding_id) VALUES (?)', [result.insertId]);
  return result.insertId;
}

async function getByTokenHash(tokenHash, connection = getPool(), forUpdate = false) {
  const [rows] = await connection.query(
    `SELECT o.*, op.id AS onboarding_pet_id, op.pet_data, op.resolution AS pet_resolution,
            op.matched_pet_id, op.candidates AS pet_candidates
     FROM onboardings o
     INNER JOIN onboarding_pets op ON op.onboarding_id = o.id
     WHERE o.public_token_hash = ?
     LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [tokenHash],
  );
  return rows[0] || null;
}

async function getPublicData(tokenHash) {
  const [rows] = await getPool().query(
    `SELECT o.id, o.status, o.customer_data, o.appointment_data, o.customer_resolution,
            o.created_at, o.expires_at, o.contract_version_id, o.matched_customer_id,
            op.pet_data, op.resolution AS pet_resolution, op.matched_pet_id,
            cv.version_label, cv.file_name, cv.mime_type, cv.file_size, cv.storage_path, cv.file_hash
     FROM onboardings o
     INNER JOIN onboarding_pets op ON op.onboarding_id = o.id
     INNER JOIN contract_versions cv ON cv.id = o.contract_version_id
     WHERE o.public_token_hash = ?
     LIMIT 1`,
    [tokenHash],
  );
  return rows[0] || null;
}

async function saveData(onboardingId, { customerData, petData, appointmentData }, connection = getPool()) {
  await connection.query(
    'UPDATE onboardings SET customer_data = ?, appointment_data = ? WHERE id = ?',
    [JSON.stringify(customerData), JSON.stringify(appointmentData), onboardingId],
  );
  await connection.query(
    'UPDATE onboarding_pets SET pet_data = ? WHERE onboarding_id = ?',
    [JSON.stringify(petData), onboardingId],
  );
}

async function saveCandidates(onboardingId, field, candidates, connection = getPool()) {
  const columns = {
    customer: 'customer_candidates',
    pet: 'candidates',
  };
  await connection.query(
    `UPDATE ${field === 'customer' ? 'onboardings' : 'onboarding_pets'} SET ${columns[field]} = ? WHERE ${field === 'customer' ? 'id' : 'onboarding_id'} = ?`,
    [JSON.stringify(candidates), onboardingId],
  );
}

async function setCustomerResolution(onboardingId, resolution, matchedId, connection = getPool()) {
  await connection.query(
    'UPDATE onboardings SET customer_resolution = ?, matched_customer_id = ? WHERE id = ?',
    [resolution, matchedId, onboardingId],
  );
}

async function setPetResolution(onboardingId, resolution, matchedId, connection = getPool()) {
  await connection.query(
    'UPDATE onboarding_pets SET resolution = ?, matched_pet_id = ? WHERE onboarding_id = ?',
    [resolution, matchedId, onboardingId],
  );
}

async function expire(onboardingId, connection = getPool()) {
  await connection.query(
    `UPDATE onboardings SET status = 'EXPIRED'
     WHERE id = ? AND status IN ('NOT_STARTED', 'IN_PROGRESS')`,
    [onboardingId],
  );
}

module.exports = {
  createOnboarding,
  expire,
  getByTokenHash,
  getPublicData,
  saveCandidates,
  saveData,
  setCustomerResolution,
  setPetResolution,
};
