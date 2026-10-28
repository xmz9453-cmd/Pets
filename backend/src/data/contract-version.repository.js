const { getPool } = require('../config/database');
const { getCurrentShopId } = require('../utils/shop-context');

const EDITABLE_FIELDS = {
  version_label: 'version_label',
};

function normalizeContractVersion(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    id: Number(row.id),
    is_current: Boolean(row.is_current),
    file_size: row.file_size === null ? null : Number(row.file_size),
  };
}

async function listContractVersions(connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT id, version_label, status, is_current, file_name, mime_type,
            file_size, storage_path, file_hash, created_at, updated_at
     FROM contract_versions
     WHERE shop_id = ?
     ORDER BY created_at DESC, id DESC`,
    [getCurrentShopId()],
  );

  return rows.map(normalizeContractVersion);
}

async function getContractVersionById(versionId, connection = getPool(), forUpdate = false) {
  const [rows] = await connection.query(
    `SELECT id, version_label, status, is_current, file_name, mime_type,
            file_size, storage_path, file_hash, created_at, updated_at
     FROM contract_versions
     WHERE id = ? AND shop_id = ?
     LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [versionId, getCurrentShopId()],
  );

  return normalizeContractVersion(rows[0] || null);
}

async function createDraft(payload, connection = getPool()) {
  const [result] = await connection.query(
    `INSERT INTO contract_versions
       (shop_id, version_label, status, is_current, file_name, mime_type, file_size, storage_path, file_hash)
     VALUES (?, ?, 'DRAFT', FALSE, ?, ?, ?, ?, ?)`,
    [
      getCurrentShopId(),
      payload.version_label,
      payload.file_name ?? null,
      payload.mime_type ?? null,
      payload.file_size ?? null,
      payload.storage_path ?? null,
      payload.file_hash ?? null,
    ],
  );

  return result.insertId;
}

async function updateDraft(versionId, patch, connection = getPool()) {
  const fields = [];
  const values = [];

  for (const [key, column] of Object.entries(EDITABLE_FIELDS)) {
    if (patch[key] === undefined) {
      continue;
    }
    fields.push(`${column} = ?`);
    values.push(patch[key]);
  }

  if (fields.length) {
    values.push(versionId, getCurrentShopId());
    await connection.query(
      `UPDATE contract_versions
       SET ${fields.join(', ')}
       WHERE id = ? AND shop_id = ? AND status = 'DRAFT' AND is_current = FALSE`,
      values,
    );
  }

  return getContractVersionById(versionId, connection);
}

async function updateDraftPdf(versionId, metadata, connection) {
  const [result] = await connection.query(
    `UPDATE contract_versions
     SET file_name = ?, mime_type = ?, file_size = ?, storage_path = ?, file_hash = ?
     WHERE id = ? AND shop_id = ? AND status = 'DRAFT' AND is_current = FALSE`,
    [
      metadata.file_name,
      metadata.mime_type,
      metadata.file_size,
      metadata.storage_path,
      metadata.file_hash,
      versionId,
      getCurrentShopId(),
    ],
  );

  return result.affectedRows === 1;
}

async function publishDraft(versionId, connection) {
  const [result] = await connection.query(
    `UPDATE contract_versions
     SET status = 'PUBLISHED'
     WHERE id = ? AND shop_id = ? AND status = 'DRAFT' AND is_current = FALSE`,
    [versionId, getCurrentShopId()],
  );

  return result.affectedRows === 1;
}

async function clearCurrent(connection) {
  await connection.query(
    'UPDATE contract_versions SET is_current = FALSE WHERE is_current = TRUE AND shop_id = ?',
    [getCurrentShopId()],
  );
}

async function markCurrent(versionId, connection) {
  const [result] = await connection.query(
    `UPDATE contract_versions
     SET is_current = TRUE
     WHERE id = ? AND shop_id = ? AND status = 'PUBLISHED'`,
    [versionId, getCurrentShopId()],
  );

  return result.affectedRows === 1;
}

module.exports = {
  clearCurrent,
  createDraft,
  getContractVersionById,
  listContractVersions,
  markCurrent,
  publishDraft,
  updateDraftPdf,
  updateDraft,
};
