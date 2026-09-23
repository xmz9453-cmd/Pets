const { getPool } = require('../config/database');

const REGISTRATION_LOCK_NAME = 'psop:first-owner-registration';
const REGISTRATION_LOCK_TIMEOUT_SECONDS = 10;

async function acquireRegistrationLock(connection) {
  const [rows] = await connection.query('SELECT GET_LOCK(?, ?) AS acquired', [REGISTRATION_LOCK_NAME, REGISTRATION_LOCK_TIMEOUT_SECONDS]);
  if (Number(rows[0]?.acquired) !== 1) {
    const error = new Error('Registration is busy, please try again');
    error.statusCode = 503;
    error.code = 'REGISTRATION_BUSY';
    throw error;
  }
}

async function releaseRegistrationLock(connection) {
  const [rows] = await connection.query('SELECT RELEASE_LOCK(?) AS released', [REGISTRATION_LOCK_NAME]);
  if (Number(rows[0]?.released) !== 1) {
    const error = new Error('Registration lock release failed');
    error.statusCode = 503;
    error.code = 'REGISTRATION_LOCK_RELEASE_FAILED';
    throw error;
  }
}

async function countStaff(connection = getPool()) {
  const [rows] = await connection.query('SELECT COUNT(*) AS count FROM staff');
  return Number(rows[0].count);
}

async function createStaff({ username, passwordHash, displayName }, connection = getPool()) {
  const [result] = await connection.query(
    'INSERT INTO staff (username, password_hash, display_name, status) VALUES (?, ?, ?, \'ACTIVE\')',
    [username, passwordHash, displayName],
  );
  return result.insertId;
}

async function findStaffByUsername(username) {
  const [rows] = await getPool().query(
    'SELECT id, username, password_hash, display_name, status FROM staff WHERE username = ? LIMIT 1',
    [username],
  );
  return rows[0] || null;
}

async function findStaffById(staffId) {
  const [rows] = await getPool().query(
    'SELECT id, username, display_name, status FROM staff WHERE id = ? LIMIT 1',
    [staffId],
  );
  return rows[0] || null;
}

async function findStaffByIdForUpdate(staffId, connection = getPool()) {
  const [rows] = await connection.query(
    'SELECT id, username, display_name, status FROM staff WHERE id = ? LIMIT 1 FOR UPDATE',
    [staffId],
  );
  return rows[0] || null;
}

async function findStaffWithPasswordById(staffId, connection = getPool()) {
  const [rows] = await connection.query(
    'SELECT id, username, password_hash, display_name, status FROM staff WHERE id = ? LIMIT 1',
    [staffId],
  );
  return rows[0] || null;
}

async function listRolesForStaff(staffId) {
  const [rows] = await getPool().query(
    `SELECT r.code
     FROM roles r
     INNER JOIN staff_roles sr ON sr.role_id = r.id
     WHERE sr.staff_id = ?
     ORDER BY r.code`,
    [staffId],
  );
  return rows.map((row) => row.code);
}

async function listStaffWithRoles(connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT st.id, st.username, st.display_name, st.status, r.code AS role_code
     FROM staff st
     LEFT JOIN staff_roles sr ON sr.staff_id = st.id
     LEFT JOIN roles r ON r.id = sr.role_id
     ORDER BY st.id ASC, r.code ASC`,
  );
  const staffById = new Map();

  rows.forEach((row) => {
    if (!staffById.has(row.id)) {
      staffById.set(row.id, {
        id: row.id,
        username: row.username,
        display_name: row.display_name,
        status: row.status,
        roles: [],
      });
    }
    if (row.role_code) {
      staffById.get(row.id).roles.push(row.role_code);
    }
  });

  return Array.from(staffById.values());
}

async function replaceRolesForStaff(staffId, roleCodes, connection = getPool()) {
  await connection.query('DELETE FROM staff_roles WHERE staff_id = ?', [staffId]);
  if (!roleCodes.length) {
    return;
  }

  const [roles] = await connection.query(
    'SELECT id, code FROM roles WHERE code IN (?)',
    [roleCodes],
  );
  const foundRoleCodes = new Set(roles.map((role) => role.code));
  const missingRoleCodes = [...new Set(roleCodes)].filter((roleCode) => !foundRoleCodes.has(roleCode));
  if (missingRoleCodes.length) {
    const error = new Error(`Missing role definition: ${missingRoleCodes.join(', ')}`);
    error.code = 'ROLE_DEFINITION_MISSING';
    throw error;
  }

  for (const role of roles) {
    await connection.query(
      'INSERT INTO staff_roles (staff_id, role_id) VALUES (?, ?)',
      [staffId, role.id],
    );
  }
}

async function listActiveOwnerIds(connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT st.id
     FROM staff st
     INNER JOIN staff_roles sr ON sr.staff_id = st.id
     INNER JOIN roles r ON r.id = sr.role_id
     WHERE st.status = 'ACTIVE' AND r.code = 'OWNER'
     FOR UPDATE`,
  );
  return rows.map((row) => row.id);
}

async function updateStaffStatus(staffId, status, connection = getPool()) {
  await connection.query(
    'UPDATE staff SET status = ? WHERE id = ?',
    [status, staffId],
  );
  return findStaffByIdForUpdate(staffId, connection);
}

async function updateStaffPassword(staffId, passwordHash, connection = getPool()) {
  await connection.query(
    'UPDATE staff SET password_hash = ? WHERE id = ?',
    [passwordHash, staffId],
  );
}

async function createSession({ staffId, tokenHash, expiresAt }) {
  await getPool().query(
    'INSERT INTO auth_sessions (staff_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [staffId, tokenHash, expiresAt],
  );
}

async function findSessionByTokenHash(tokenHash) {
  const [rows] = await getPool().query(
    `SELECT s.id, s.staff_id, s.expires_at, st.username, st.display_name, st.status
     FROM auth_sessions s
     INNER JOIN staff st ON st.id = s.staff_id
     WHERE s.token_hash = ?
     LIMIT 1`,
    [tokenHash],
  );
  return rows[0] || null;
}

async function deleteSessionByTokenHash(tokenHash) {
  await getPool().query('DELETE FROM auth_sessions WHERE token_hash = ?', [tokenHash]);
}

module.exports = {
  acquireRegistrationLock,
  countStaff,
  createStaff,
  createSession,
  deleteSessionByTokenHash,
  findSessionByTokenHash,
  findStaffById,
  findStaffByIdForUpdate,
  findStaffWithPasswordById,
  findStaffByUsername,
  getPool,
  listActiveOwnerIds,
  listStaffWithRoles,
  listRolesForStaff,
  replaceRolesForStaff,
  releaseRegistrationLock,
  updateStaffStatus,
  updateStaffPassword,
};
