const { getPool } = require('../config/database');
const { getCurrentShopId } = require('../utils/shop-context');

async function listByGroomingIds(groomingIds) {
  if (!groomingIds.length) return [];
  const placeholders = groomingIds.map(() => '?').join(', ');
  const [rows] = await getPool().query(
    `SELECT id, grooming_id, category, storage_key, mime_type, file_size, original_filename, created_at
     FROM grooming_photos
     WHERE shop_id = ? AND grooming_id IN (${placeholders})
     ORDER BY id ASC`,
    [getCurrentShopId(), ...groomingIds],
  );
  return rows;
}

async function listByGroomingId(groomingId, connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT id, grooming_id, category, storage_key, mime_type, file_size, original_filename, created_at
     FROM grooming_photos
     WHERE shop_id = ? AND grooming_id = ?
     ORDER BY id ASC`,
    [getCurrentShopId(), groomingId],
  );
  return rows;
}

async function countByGroomingId(groomingId, connection = getPool()) {
  const [rows] = await connection.query(
    'SELECT COUNT(*) AS count FROM grooming_photos WHERE shop_id = ? AND grooming_id = ?',
    [getCurrentShopId(), groomingId],
  );
  return Number(rows[0].count);
}

async function create(payload, connection = getPool()) {
  const [result] = await connection.query(
    `INSERT INTO grooming_photos
       (shop_id, grooming_id, category, storage_key, mime_type, file_size, original_filename)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      getCurrentShopId(),
      payload.grooming_id,
      payload.category,
      payload.storage_key,
      payload.mime_type,
      payload.file_size,
      payload.original_filename,
    ],
  );
  return Number(result.insertId);
}

async function findById(id, connection = getPool()) {
  const [rows] = await connection.query(
    'SELECT * FROM grooming_photos WHERE id = ? AND shop_id = ? LIMIT 1',
    [id, getCurrentShopId()],
  );
  return rows[0] || null;
}

async function deleteById(id, connection = getPool()) {
  const [result] = await connection.query(
    'DELETE FROM grooming_photos WHERE id = ? AND shop_id = ?',
    [id, getCurrentShopId()],
  );
  return result.affectedRows === 1;
}

module.exports = { countByGroomingId, create, deleteById, findById, listByGroomingId, listByGroomingIds };
