const path = require('path');
const repository = require('../data/portal-backgrounds.repository');
const storage = require('../utils/portal-background-storage');
const { withMediaStorageLock } = require('../utils/media-storage-lock');
const { logError } = require('../utils/logger');

function notFoundError() {
  const error = new Error('找不到指定的入口背景圖片。');
  error.statusCode = 404;
  error.code = 'PORTAL_BACKGROUND_NOT_FOUND';
  return error;
}

function validateId(id) {
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId <= 0) {
    const error = new Error('背景圖片編號無效。');
    error.statusCode = 400;
    error.code = 'INVALID_PORTAL_BACKGROUND_ID';
    throw error;
  }
  return numericId;
}

function normalizeFilename(filename) {
  const basename = path.win32.basename(String(filename || '')).replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return (basename || 'background').slice(0, 255);
}

function present(background) {
  return {
    id: background.id,
    original_filename: background.original_filename,
    mime_type: background.mime_type,
    file_size: background.file_size,
    is_active: background.is_active,
    created_by: background.created_by,
    created_at: background.created_at,
  };
}

async function list(shopId) {
  return (await repository.list(shopId)).map(present);
}

async function upload(file, createdBy, shopId) {
  try {
    return await withMediaStorageLock(async () => {
      let storedKey;
      let stored = false;
      try {
        const inspected = await storage.inspectUploadedFile(file);
        storedKey = storage.createStorageKey(inspected.extension);
        await storage.moveTemporaryFile(file.path, storedKey);
        stored = true;
        const background = await repository.create({
          shopId,
          storageKey: storedKey,
          originalFilename: normalizeFilename(file.originalname),
          mimeType: inspected.mimeType,
          fileSize: inspected.bytes.length,
          createdBy,
        });
        if (!background) throw new Error('Failed to create portal background record');
        return present(background);
      } catch (error) {
        if (storedKey && stored) {
          try {
            await storage.removeStoredBackground(storedKey);
          } catch (cleanupError) {
            logError('Failed to remove orphaned portal background after upload failure', cleanupError);
          }
        }
        throw error;
      }
    });
  } finally {
    if (file?.path) {
      await storage.removeTemporaryFile(file.path).catch((cleanupError) => {
        logError('Failed to remove portal background upload temporary file', { code: cleanupError.code });
      });
    }
  }
}

async function activate(id, shopId) {
  const background = await repository.activate(validateId(id), shopId);
  if (!background) throw notFoundError();
  return present(background);
}

async function remove(id, shopId) {
  return withMediaStorageLock(async () => {
    const background = await repository.remove(validateId(id), shopId);
    if (!background) throw notFoundError();
    try {
      await storage.removeStoredBackground(background.storage_key);
    } catch (error) {
      logError('Failed to remove deleted portal background image file', {
        backgroundId: background.id,
        code: error.code,
      });
      throw error;
    }
    return { id: background.id };
  });
}

async function getActiveImage(shopId) {
  const active = await repository.getActive(shopId);
  if (!active) throw notFoundError();
  return storage.readStoredBackground(active.storage_key);
}

async function getManagedImage(id, shopId) {
  const background = await repository.getById(validateId(id), shopId);
  if (!background) throw notFoundError();
  return storage.readStoredBackground(background.storage_key);
}

async function getPublicSelection(shopId, entryCode) {
  const active = await repository.getActive(shopId);
  return { background_url: active ? `/api/public/portal-background/${encodeURIComponent(entryCode)}/image` : null };
}

module.exports = {
  activate,
  getActiveImage,
  getManagedImage,
  getPublicSelection,
  list,
  remove,
  upload,
};
