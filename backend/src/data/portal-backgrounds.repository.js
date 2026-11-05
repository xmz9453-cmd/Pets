const { getPool } = require('../config/database');

async function list() {
  const [rows] = await getPool().query(
    `SELECT id, storage_key, original_filename, mime_type, file_size, is_active, created_by, created_at
     FROM portal_backgrounds
     ORDER BY created_at DESC, id DESC`,
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

async function create({ storageKey, originalFilename, mimeType, fileSize, createdBy }) {
  const [result] = await getPool().query(
    `INSERT INTO portal_backgrounds
       (storage_key, original_filename, mime_type, file_size, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [storageKey, originalFilename, mimeType, fileSize, createdBy],
  );
  const [rows] = await getPool().query(
    `SELECT id, storage_key, original_filename, mime_type, file_size, is_active, created_by, created_at
     FROM portal_backgrounds WHERE id = ? LIMIT 1`,
    [result.insertId],
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

async function getById(id, connection = getPool(), lock = false) {
  const [rows] = await connection.query(
    `SELECT id, storage_key, original_filename, mime_type, file_size, is_active
     FROM portal_backgrounds WHERE id = ? LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    [id],
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

async function getActive() {
  const [rows] = await getPool().query(
    `SELECT id, storage_key, mime_type
     FROM portal_backgrounds WHERE is_active = 1 LIMIT 1`,
  );
  return rows[0] ? {
    id: Number(rows[0].id),
    storage_key: rows[0].storage_key,
    mime_type: rows[0].mime_type,
  } : null;
}

async function activate(id) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('SELECT id FROM portal_backgrounds ORDER BY id FOR UPDATE');
    const background = await getById(id, connection, true);
    if (!background) {
      await connection.rollback();
      return null;
    }
    await connection.query('UPDATE portal_backgrounds SET is_active = 0 WHERE is_active = 1');
    await connection.query('UPDATE portal_backgrounds SET is_active = 1 WHERE id = ?', [id]);
    await connection.commit();
    return { ...background, is_active: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function remove(id) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const background = await getById(id, connection, true);
    if (!background) {
      await connection.rollback();
      return null;
    }
    await connection.query('DELETE FROM portal_backgrounds WHERE id = ?', [id]);
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
