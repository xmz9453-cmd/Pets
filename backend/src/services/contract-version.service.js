const { getPool } = require('../config/database');
const contractVersionRepository = require('../data/contract-version.repository');

const FILE_FIELDS = ['file_name', 'mime_type', 'file_size', 'storage_path', 'file_hash'];
const STRING_LIMITS = {
  version_label: 50,
  file_name: 255,
  mime_type: 100,
  storage_path: 1000,
};
const MAX_FILE_SIZE = 4294967295;

function createValidationError(fields) {
  const error = new Error('Validation failed');
  error.statusCode = 400;
  error.code = 'VALIDATION_ERROR';
  error.fields = fields;
  return error;
}

function createNotFoundError() {
  const error = new Error('Contract version not found');
  error.statusCode = 404;
  error.code = 'CONTRACT_VERSION_NOT_FOUND';
  return error;
}

function createConflictError(code, message) {
  const error = new Error(message);
  error.statusCode = 409;
  error.code = code;
  return error;
}

function normalizeVersionId(value) {
  const versionId = Number(value);
  if (!Number.isInteger(versionId) || versionId <= 0) {
    throw createNotFoundError();
  }
  return versionId;
}

function normalizeEditablePayload(payload = {}) {
  const normalized = {};
  const errors = {};

  if (payload.version_label !== undefined) {
    const label = payload.version_label === null ? '' : String(payload.version_label).trim();
    if (!label) {
      errors.version_label = 'Version label is required';
    } else if (label.length > STRING_LIMITS.version_label) {
      errors.version_label = `Version label must be ${STRING_LIMITS.version_label} characters or less`;
    } else {
      normalized.version_label = label;
    }
  }

  for (const [field, maximumLength] of Object.entries(STRING_LIMITS)) {
    if (field === 'version_label' || payload[field] === undefined) {
      continue;
    }

    const value = payload[field] === null ? null : String(payload[field]).trim();
    if (value !== null && value.length > maximumLength) {
      errors[field] = `${field} must be ${maximumLength} characters or less`;
      continue;
    }
    normalized[field] = value || null;
  }

  if (payload.file_size !== undefined) {
    if (payload.file_size === null || payload.file_size === '') {
      normalized.file_size = null;
    } else {
      const fileSize = Number(payload.file_size);
      if (!Number.isInteger(fileSize) || fileSize < 0 || fileSize > MAX_FILE_SIZE) {
        errors.file_size = 'File size must be a non-negative integer within the supported range';
      } else {
        normalized.file_size = fileSize;
      }
    }
  }

  if (payload.file_hash !== undefined) {
    const fileHash = payload.file_hash === null ? null : String(payload.file_hash).trim();
    if (fileHash !== null && !/^[a-f0-9]{64}$/i.test(fileHash)) {
      errors.file_hash = 'File hash must be a 64-character SHA-256 hex value';
    } else {
      normalized.file_hash = fileHash ? fileHash.toLowerCase() : null;
    }
  }

  if (payload.mime_type !== undefined && normalized.mime_type && normalized.mime_type !== 'application/pdf') {
    errors.mime_type = 'Contract file must use application/pdf';
  }

  return { normalized, errors };
}

function validateStatusFields(payload, { creating = false } = {}) {
  const errors = {};
  if (payload.status !== undefined && !(creating && payload.status === 'DRAFT')) {
    errors.status = creating
      ? 'New contract versions must be created as DRAFT'
      : 'Status can only be changed through the publish action';
  }
  if (payload.is_current !== undefined) {
    errors.is_current = 'Current status can only be changed through the current action';
  }
  return errors;
}

function validatePublishMetadata(version) {
  const errors = {};
  for (const field of FILE_FIELDS) {
    if (version[field] === null || version[field] === undefined || version[field] === '') {
      errors[field] = 'Contract PDF metadata is required before publishing';
    }
  }
  if (version.file_size !== null && Number(version.file_size) <= 0) {
    errors.file_size = 'Contract PDF file size must be greater than zero';
  }
  return errors;
}

async function withTransaction(handler) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await handler(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function mapDuplicateLabelError(error) {
  if (error.code === 'ER_DUP_ENTRY' && String(error.message).includes('uq_contract_versions_version_label')) {
    return createConflictError('CONTRACT_VERSION_LABEL_EXISTS', 'Version label already exists');
  }
  return error;
}

async function listContractVersions() {
  return { contract_versions: await contractVersionRepository.listContractVersions() };
}

async function getContractVersion(versionId) {
  const normalizedId = normalizeVersionId(versionId);
  const contractVersion = await contractVersionRepository.getContractVersionById(normalizedId);
  if (!contractVersion) {
    throw createNotFoundError();
  }
  return { contract_version: contractVersion };
}

async function createDraft(payload = {}) {
  const { normalized, errors } = normalizeEditablePayload(payload);
  Object.assign(errors, validateStatusFields(payload, { creating: true }));
  if (!normalized.version_label) {
    errors.version_label = 'Version label is required';
  }
  if (Object.keys(errors).length) {
    throw createValidationError(errors);
  }

  try {
    const versionId = await contractVersionRepository.createDraft(normalized);
    return getContractVersion(versionId);
  } catch (error) {
    throw mapDuplicateLabelError(error);
  }
}

async function updateDraft(versionId, payload = {}) {
  const normalizedId = normalizeVersionId(versionId);
  const { normalized, errors } = normalizeEditablePayload(payload);
  Object.assign(errors, validateStatusFields(payload));
  if (!Object.keys(normalized).length && !Object.keys(errors).length) {
    errors.version_label = 'At least one editable field is required';
  }
  if (Object.keys(errors).length) {
    throw createValidationError(errors);
  }

  try {
    return await withTransaction(async (connection) => {
      const existing = await contractVersionRepository.getContractVersionById(normalizedId, connection, true);
      if (!existing) {
        throw createNotFoundError();
      }
      if (existing.status !== 'DRAFT' || existing.is_current) {
        throw createValidationError({ status: 'Published contract versions cannot be edited' });
      }

      const updated = await contractVersionRepository.updateDraft(normalizedId, normalized, connection);
      if (!updated) {
        throw createNotFoundError();
      }
      return { contract_version: updated };
    });
  } catch (error) {
    throw mapDuplicateLabelError(error);
  }
}

async function publishDraft(versionId) {
  const normalizedId = normalizeVersionId(versionId);
  return withTransaction(async (connection) => {
    const existing = await contractVersionRepository.getContractVersionById(normalizedId, connection, true);
    if (!existing) {
      throw createNotFoundError();
    }
    if (existing.status !== 'DRAFT' || existing.is_current) {
      throw createValidationError({ status: 'Only a DRAFT contract version can be published' });
    }

    const metadataErrors = validatePublishMetadata(existing);
    if (Object.keys(metadataErrors).length) {
      throw createValidationError(metadataErrors);
    }

    const published = await contractVersionRepository.publishDraft(normalizedId, connection);
    if (!published) {
      throw createValidationError({ status: 'Only a DRAFT contract version can be published' });
    }
    return { contract_version: await contractVersionRepository.getContractVersionById(normalizedId, connection) };
  });
}

async function setCurrent(versionId) {
  const normalizedId = normalizeVersionId(versionId);
  try {
    return await withTransaction(async (connection) => {
      const target = await contractVersionRepository.getContractVersionById(normalizedId, connection, true);
      if (!target) {
        throw createNotFoundError();
      }
      if (target.status !== 'PUBLISHED') {
        throw createValidationError({ status: 'Only a PUBLISHED contract version can be current' });
      }

      await contractVersionRepository.clearCurrent(connection);
      const marked = await contractVersionRepository.markCurrent(normalizedId, connection);
      if (!marked) {
        throw createValidationError({ status: 'Only a PUBLISHED contract version can be current' });
      }
      return { contract_version: await contractVersionRepository.getContractVersionById(normalizedId, connection) };
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' && String(error.message).includes('uq_contract_versions_current_slot')) {
      throw createConflictError('CURRENT_VERSION_CONFLICT', 'Another contract version is already current');
    }
    throw error;
  }
}

module.exports = {
  createDraft,
  getContractVersion,
  listContractVersions,
  publishDraft,
  setCurrent,
  updateDraft,
};