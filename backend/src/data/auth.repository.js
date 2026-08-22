const { getPool } = require('../config/database');

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
  createSession,
  deleteSessionByTokenHash,
  findSessionByTokenHash,
  findStaffById,
  findStaffByUsername,
  listRolesForStaff,
};
