const { getPool } = require('../config/database');

async function createSession({ tokenHash, customerId, createdAt, expiresAt }, connection = getPool()) {
  const [result] = await connection.query(
    `INSERT INTO booking_sessions (token_hash, customer_id, status, created_at, expires_at)
     VALUES (?, ?, 'ACTIVE', ?, ?)`,
    [tokenHash, customerId, createdAt, expiresAt],
  );
  return result.insertId;
}

async function findActiveSessionByTokenHash(tokenHash, connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT id, customer_id, status, created_at, expires_at
     FROM booking_sessions
     WHERE token_hash = ? AND status = 'ACTIVE' AND expires_at > CURRENT_TIMESTAMP
     LIMIT 1`,
    [tokenHash],
  );
  return rows[0] || null;
}

async function consumeSession(sessionId, connection = getPool()) {
  const [result] = await connection.query(
    `UPDATE booking_sessions SET status = 'CONSUMED'
     WHERE id = ? AND status = 'ACTIVE'`,
    [sessionId],
  );
  return result.affectedRows > 0;
}

async function expireSession(sessionId, connection = getPool()) {
  const [result] = await connection.query(
    `UPDATE booking_sessions SET status = 'EXPIRED'
     WHERE id = ? AND status = 'ACTIVE'`,
    [sessionId],
  );
  return result.affectedRows > 0;
}

module.exports = {
  createSession,
  consumeSession,
  expireSession,
  findActiveSessionByTokenHash,
};
