const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const IMAGE_FORMATS = [
  {
    mimeType: 'image/png',
    extension: '.png',
    matches: (bytes) => bytes.length >= 8
      && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  },
  {
    mimeType: 'image/jpeg',
    extension: '.jpg',
    matches: (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  {
    mimeType: 'image/webp',
    extension: '.webp',
    matches: (bytes) => bytes.length >= 12
      && bytes.toString('ascii', 0, 4) === 'RIFF'
      && bytes.toString('ascii', 8, 12) === 'WEBP',
  },
];
const STORAGE_KEY_PATTERN = /^[a-f0-9]{32}\.(?:png|jpg|webp)$/;

function createManagedImageStorage({ getRoot, maxSize, label }) {
  function createError(message, statusCode = 500, code = 'IMAGE_STORAGE_ERROR') {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    return error;
  }

  async function ensureRoot() {
    const configuredRoot = path.resolve(getRoot());
    await fs.promises.mkdir(configuredRoot, { recursive: true, mode: 0o700 });
    const root = await fs.promises.realpath(configuredRoot);
    await fs.promises.chmod(root, 0o700);
    return root;
  }

  function validateStorageKey(storageKey) {
    if (typeof storageKey !== 'string' || !STORAGE_KEY_PATTERN.test(storageKey)) {
      throw createError('Invalid image storage key', 400, 'INVALID_IMAGE_STORAGE_KEY');
    }
    return storageKey;
  }

  async function resolveStoragePath(storageKey) {
    const root = await ensureRoot();
    const target = path.resolve(root, validateStorageKey(storageKey));
    if (path.dirname(target) !== root) {
      throw createError('Invalid image storage key', 400, 'INVALID_IMAGE_STORAGE_KEY');
    }
    try {
      const stats = await fs.promises.lstat(target);
      if (stats.isSymbolicLink()) throw createError('Image storage does not allow symbolic links');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    return target;
  }

  async function getUploadTempDirectory() {
    const root = await ensureRoot();
    const directory = path.join(root, '.tmp');
    await fs.promises.mkdir(directory, { recursive: true, mode: 0o700 });
    const stats = await fs.promises.lstat(directory);
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
      throw createError('Invalid image temporary directory');
    }
    await fs.promises.chmod(directory, 0o700);
    return directory;
  }

  async function inspectUploadedFile(file) {
    if (!file || typeof file.path !== 'string') {
      throw createError(`請選擇${label}圖片。`, 400, 'IMAGE_REQUIRED');
    }

    const stats = await fs.promises.stat(file.path);
    if (!stats.isFile() || stats.size <= 0) {
      throw createError(`${label}圖片不可為空。`, 400, 'INVALID_IMAGE');
    }
    if (stats.size > maxSize) {
      throw createError(`${label}圖片不可超過 2 MiB。`, 413, 'IMAGE_TOO_LARGE');
    }

    const bytes = await fs.promises.readFile(file.path);
    const format = IMAGE_FORMATS.find((candidate) => candidate.matches(bytes));
    if (!format || format.mimeType !== file.mimetype) {
      throw createError(`${label}僅接受內容正確的 PNG、JPG 或 WebP 圖片，不接受 SVG。`, 400, 'INVALID_IMAGE');
    }

    const extension = path.extname(path.win32.basename(file.originalname || '')).toLowerCase();
    if (extension !== format.extension && !(format.extension === '.jpg' && extension === '.jpeg')) {
      throw createError(`${label}副檔名必須與圖片格式相符。`, 400, 'INVALID_IMAGE');
    }
    return {
      bytes,
      mimeType: format.mimeType,
      extension: format.extension,
      originalFilename: path.win32.basename(file.originalname || '').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 255) || 'image',
    };
  }

  function createStorageKey(extension) {
    return `${crypto.randomBytes(16).toString('hex')}${extension}`;
  }

  async function moveTemporaryFile(tempPath, storageKey) {
    const targetPath = await resolveStoragePath(storageKey);
    await fs.promises.chmod(tempPath, 0o600);
    try {
      await fs.promises.link(tempPath, targetPath);
    } catch (error) {
      if (error.code === 'EEXIST') {
        throw createError('Image storage key collision', 409, 'IMAGE_STORAGE_CONFLICT');
      }
      throw error;
    }
    return targetPath;
  }

  async function removeTemporaryFile(tempPath) {
    if (tempPath) await fs.promises.rm(tempPath, { force: true });
  }

  async function removeStoredImage(storageKey) {
    await fs.promises.rm(await resolveStoragePath(storageKey), { force: true });
  }

  async function readStoredImage(storageKey, expectedMimeType) {
    const targetPath = await resolveStoragePath(storageKey);
    let bytes;
    try {
      const stats = await fs.promises.stat(targetPath);
      if (!stats.isFile() || stats.size <= 0 || stats.size > maxSize) {
        throw createError('Stored image is invalid', 404, 'IMAGE_NOT_FOUND');
      }
      bytes = await fs.promises.readFile(targetPath);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
        throw createError('Image was not found', 404, 'IMAGE_NOT_FOUND');
      }
      throw error;
    }

    const format = IMAGE_FORMATS.find((candidate) => candidate.matches(bytes));
    if (!format || (expectedMimeType && format.mimeType !== expectedMimeType)) {
      throw createError('Stored image is invalid', 404, 'IMAGE_NOT_FOUND');
    }
    return { bytes, mimeType: format.mimeType };
  }

  return {
    maxSize,
    createStorageKey,
    getUploadTempDirectory,
    inspectUploadedFile,
    moveTemporaryFile,
    readStoredImage,
    removeStoredImage,
    removeTemporaryFile,
  };
}

module.exports = { createManagedImageStorage };
