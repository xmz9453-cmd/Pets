const { getPool } = require('../config/database');

async function list(shopId) {
  const [rows] = await getPool().query(
    `SELECT id, storage_key, original_filename, mime_type, file_size, is_active, created_by, created_at
     FROM portal_backgrounds WHERE shop_id = ?
     ORDER BY created_at DESC, id DESC`,
    [shopId],
  );
  return rows.map((row) => ({
    id: Number(row.id),
    storage_key: row.storage_key,
    original_filename: row.original_filename,
    mime_type: row.mime_type,
    file_size: Number(row.file_size),
    is_active: Boolean(row.is_active),
    created_by: row.created_by === null ? null : Number(row.created_by),
    created_at: row.created_at,
  }));
}

async function create({ shopId, storageKey, originalFilename, mimeType, fileSize, createdBy }) {
  const [result] = await getPool().query(
    `INSERT INTO portal_backgrounds
       (shop_id, storage_key, original_filename, mime_type, file_size, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [shopId, storageKey, originalFilename, mimeType, fileSize, createdBy],
  );
  const [rows] = await getPool().query(
    `SELECT id, storage_key, original_filename, mime_type, file_size, is_active, created_by, created_at
     FROM portal_backgrounds WHERE id = ? AND shop_id = ? LIMIT 1`,
    [result.insertId, shopId],
  );
  return rows[0] ? {
    id: Number(rows[0].id),
    storage_key: rows[0].storage_key,
    original_filename: rows[0].original_filename,
    mime_type: rows[0].mime_type,
    file_size: Number(rows[0].file_size),
    is_active: Boolean(rows[0].is_active),
    created_by: rows[0].created_by === null ? null : Number(rows[0].created_by),
    created_at: rows[0].created_at,
  } : null;
}

async function getById(id, shopId, connection = getPool(), lock = false) {
  const [rows] = await connection.query(
    `SELECT id, storage_key, original_filename, mime_type, file_size, is_active
     FROM portal_backgrounds WHERE id = ? AND shop_id = ? LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    [id, shopId],
  );
  return rows[0] ? {
    id: Number(rows[0].id),
    storage_key: rows[0].storage_key,
    original_filename: rows[0].original_filename,
    mime_type: rows[0].mime_type,
    file_size: Number(rows[0].file_size),
    is_active: Boolean(rows[0].is_active),
  } : null;
}

async function getActive(shopId) {
  const [rows] = await getPool().query(
    `SELECT id, storage_key, mime_type
     FROM portal_backgrounds WHERE shop_id = ? AND is_active = 1 LIMIT 1`,
    [shopId],
  );
  return rows[0] ? {
    id: Number(rows[0].id),
    storage_key: rows[0].storage_key,
    mime_type: rows[0].mime_type,
  } : null;
}

async function activate(id, shopId) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('SELECT id FROM portal_backgrounds WHERE shop_id = ? ORDER BY id FOR UPDATE', [shopId]);
    const background = await getById(id, shopId, connection, true);
    if (!background) {
      await connection.rollback();
      return null;
    }
    await connection.query('UPDATE portal_backgrounds SET is_active = 0 WHERE shop_id = ? AND is_active = 1', [shopId]);
    await connection.query('UPDATE portal_backgrounds SET is_active = 1 WHERE id = ? AND shop_id = ?', [id, shopId]);
    await connection.commit();
    return { ...background, is_active: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function remove(id, shopId) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const background = await getById(id, shopId, connection, true);
    if (!background) {
      await connection.rollback();
      return null;
    }
    await connection.query('DELETE FROM portal_backgrounds WHERE id = ? AND shop_id = ?', [id, shopId]);
    await connection.commit();
    return background;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { activate, create, getActive, getById, list, remove };
