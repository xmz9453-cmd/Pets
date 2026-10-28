const { getPool } = require('../config/database');
const { getCurrentShopId } = require('../utils/shop-context');

async function createSession({ tokenHash, customerId, createdAt, expiresAt }, connection = getPool()) {
  const [result] = await connection.query(
    `INSERT INTO booking_sessions (shop_id, token_hash, customer_id, status, created_at, expires_at)
     VALUES (?, ?, ?, 'ACTIVE', ?, ?)`,
    [getCurrentShopId(), tokenHash, customerId, createdAt, expiresAt],
  );
  return result.insertId;
}

async function findActiveSessionByTokenHash(tokenHash, connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT id, shop_id, customer_id, status, created_at, expires_at
     FROM booking_sessions
     WHERE token_hash = ? AND status = 'ACTIVE' AND expires_at > UTC_TIMESTAMP()
     LIMIT 1`,
    [tokenHash],
  );
  return rows[0] || null;
}

async function consumeSession(sessionId, connection = getPool()) {
  const [result] = await connection.query(
    `UPDATE booking_sessions SET status = 'CONSUMED'
     WHERE id = ? AND shop_id = ? AND status = 'ACTIVE'`,
    [sessionId, getCurrentShopId()],
  );
  return result.affectedRows > 0;
}

async function expireSession(sessionId, connection = getPool()) {
  const [result] = await connection.query(
    `UPDATE booking_sessions SET status = 'EXPIRED'
     WHERE id = ? AND shop_id = ? AND status = 'ACTIVE'`,
    [sessionId, getCurrentShopId()],
  );
  return result.affectedRows > 0;
}

module.exports = {
  createSession,
  consumeSession,
  expireSession,
  findActiveSessionByTokenHash,
};
