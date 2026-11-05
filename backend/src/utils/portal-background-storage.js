const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { config } = require('../config/env');

const MAX_BACKGROUND_SIZE = 10 * 1024 * 1024;
const FORMATS = [
  {
    mimeType: 'image/png',
    extension: '.png',
    signature: (bytes) => bytes.length >= 8
      && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  },
  {
    mimeType: 'image/jpeg',
    extension: '.jpg',
    signature: (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  {
    mimeType: 'image/webp',
    extension: '.webp',
    signature: (bytes) => bytes.length >= 12
      && bytes.toString('ascii', 0, 4) === 'RIFF'
      && bytes.toString('ascii', 8, 12) === 'WEBP',
  },
];
const STORAGE_KEY_PATTERN = /^[a-f0-9]{32}\.(?:png|jpg|webp)$/;

function createStorageError(message, statusCode = 500, code = 'PORTAL_BACKGROUND_STORAGE_ERROR') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function getConfiguredRoot() {
  return path.resolve(config.portalBackgroundStorageRoot);
}

async function ensureRoot() {
  const configuredRoot = getConfiguredRoot();
  await fs.promises.mkdir(configuredRoot, { recursive: true, mode: 0o700 });
  const root = await fs.promises.realpath(configuredRoot);
  await fs.promises.chmod(root, 0o700);
  return root;
}

function validateStorageKey(storageKey) {
  if (typeof storageKey !== 'string' || !STORAGE_KEY_PATTERN.test(storageKey)) {
    throw createStorageError('Invalid portal background storage key', 400, 'INVALID_PORTAL_BACKGROUND_KEY');
  }
  return storageKey;
}

async function resolveStoragePath(storageKey) {
  const validKey = validateStorageKey(storageKey);
  const root = await ensureRoot();
  const target = path.resolve(root, validKey);
  if (path.dirname(target) !== root) {
    throw createStorageError('Invalid portal background storage key', 400, 'INVALID_PORTAL_BACKGROUND_KEY');
  }
  try {
    const stats = await fs.promises.lstat(target);
    if (stats.isSymbolicLink()) {
      throw createStorageError('Symbolic links are not allowed in portal background storage', 400, 'INVALID_PORTAL_BACKGROUND_PATH');
    }
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
    throw createStorageError('Invalid portal background temporary directory');
  }
  await fs.promises.chmod(directory, 0o700);
  return directory;
}

async function inspectUploadedFile(file) {
  if (!file || typeof file.path !== 'string') {
    throw createStorageError('請選擇入口背景圖片。', 400, 'PORTAL_BACKGROUND_REQUIRED');
  }

  const stats = await fs.promises.stat(file.path);
  if (!stats.isFile() || stats.size <= 0) {
    throw createStorageError('背景圖片不可為空。', 400, 'INVALID_PORTAL_BACKGROUND');
  }
  if (stats.size > MAX_BACKGROUND_SIZE) {
    throw createStorageError('入口背景圖片不可超過 10 MiB。', 413, 'PORTAL_BACKGROUND_TOO_LARGE');
  }

  const bytes = await fs.promises.readFile(file.path);
  const format = FORMATS.find((candidate) => candidate.signature(bytes));
  if (!format || format.mimeType !== file.mimetype) {
    throw createStorageError(
      '入口背景僅接受內容正確的 PNG、JPG 或 WebP 圖片，不接受 SVG。',
      400,
      'INVALID_PORTAL_BACKGROUND',
    );
  }

  const extension = path.extname(path.win32.basename(file.originalname || '')).toLowerCase();
  if (extension !== format.extension && !(format.extension === '.jpg' && extension === '.jpeg')) {
    throw createStorageError('背景圖片副檔名必須與圖片格式相符。', 400, 'INVALID_PORTAL_BACKGROUND');
  }

  return { bytes, mimeType: format.mimeType, extension: format.extension };
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
      throw createStorageError('Portal background storage key collision', 409, 'PORTAL_BACKGROUND_STORAGE_CONFLICT');
    }
    throw error;
  }
  return targetPath;
}

async function removeTemporaryFile(tempPath) {
  if (tempPath) await fs.promises.rm(tempPath, { force: true });
}

async function removeStoredBackground(storageKey) {
  const targetPath = await resolveStoragePath(storageKey);
  await fs.promises.rm(targetPath, { force: true });
}

async function readStoredBackground(storageKey) {
  const targetPath = await resolveStoragePath(storageKey);
  let bytes;
  try {
    const stats = await fs.promises.stat(targetPath);
    if (!stats.isFile() || stats.size <= 0 || stats.size > MAX_BACKGROUND_SIZE) {
      throw createStorageError('Stored portal background is invalid', 404, 'PORTAL_BACKGROUND_NOT_FOUND');
    }
    bytes = await fs.promises.readFile(targetPath);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      throw createStorageError('Portal background was not found', 404, 'PORTAL_BACKGROUND_NOT_FOUND');
    }
    throw error;
  }

  const format = FORMATS.find((candidate) => candidate.signature(bytes));
  if (!format) {
    throw createStorageError('Stored portal background is invalid', 404, 'PORTAL_BACKGROUND_NOT_FOUND');
  }
  return { bytes, mimeType: format.mimeType };
}

module.exports = {
  MAX_BACKGROUND_SIZE,
  createStorageKey,
  getUploadTempDirectory,
  inspectUploadedFile,
  moveTemporaryFile,
  readStoredBackground,
  removeStoredBackground,
  removeTemporaryFile,
};
