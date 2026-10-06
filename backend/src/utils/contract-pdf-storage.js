const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { config } = require('../config/env');

const MAX_PDF_SIZE = 10 * 1024 * 1024;
const BACKUP_LOCK_NAME = 'pets_contract_pdf_storage';
const PDF_SIGNATURE = Buffer.from('%PDF-');
const STORAGE_KEY_PATTERN = /^contract-versions\/[a-f0-9]{32}\.pdf$/;

function createStorageError(message, statusCode = 500, code = 'CONTRACT_STORAGE_ERROR') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function getConfiguredRoot() {
  if (!config.contractStorageRoot) {
    throw createStorageError('Contract PDF storage is not configured', 500, 'CONTRACT_STORAGE_NOT_CONFIGURED');
  }
  return path.resolve(config.contractStorageRoot);
}

async function ensureRoot() {
  const configuredRoot = getConfiguredRoot();
  await fs.promises.mkdir(configuredRoot, { recursive: true, mode: 0o700 });
  const root = await fs.promises.realpath(configuredRoot);
  await fs.promises.chmod(root, 0o700);
  return root;
}

async function ensureNoSymlinkPath(root, target, includeLeaf = true) {
  const relativePath = path.relative(root, target);
  if (!relativePath || relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    if (relativePath) {
      throw createStorageError('Invalid contract PDF storage key', 400, 'INVALID_STORAGE_KEY');
    }
  }

  const segments = relativePath.split(path.sep);
  let current = root;
  for (let index = 0; index < segments.length; index += 1) {
    current = path.join(current, segments[index]);
    if (!includeLeaf && index === segments.length - 1) {
      break;
    }
    try {
      const stats = await fs.promises.lstat(current);
      if (stats.isSymbolicLink()) {
        throw createStorageError('Symbolic links are not allowed in contract PDF storage', 400, 'INVALID_STORAGE_PATH');
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        continue;
      }
      throw error;
    }
  }
}

function validateStorageKey(storageKey) {
  if (typeof storageKey !== 'string' || !STORAGE_KEY_PATTERN.test(storageKey)) {
    throw createStorageError('Invalid contract PDF storage key', 400, 'INVALID_STORAGE_KEY');
  }
  return storageKey;
}

async function resolveStoragePath(storageKey, { createParent = false, includeLeaf = true } = {}) {
  const validKey = validateStorageKey(storageKey);
  const root = await ensureRoot();
  const target = path.resolve(root, ...validKey.split('/'));
  await ensureNoSymlinkPath(root, target, includeLeaf);
  if (createParent) {
    const parent = path.dirname(target);
    await fs.promises.mkdir(parent, { recursive: true, mode: 0o700 });
    await ensureNoSymlinkPath(root, target, false);
    await fs.promises.chmod(parent, 0o700);
  }
  return target;
}

async function getUploadTempDirectory() {
  const root = await ensureRoot();
  const directory = path.join(root, '.tmp');
  await fs.promises.mkdir(directory, { recursive: true, mode: 0o700 });
  await ensureNoSymlinkPath(root, directory);
  await fs.promises.chmod(directory, 0o700);
  return directory;
}

function createStorageKey() {
  return `contract-versions/${crypto.randomBytes(16).toString('hex')}.pdf`;
}

function normalizeOriginalFilename(originalName) {
  if (typeof originalName !== 'string' || !originalName.trim()) {
    throw createStorageError('A PDF filename is required', 400, 'INVALID_PDF');
  }
  const basename = path.posix.basename(path.win32.basename(originalName.trim()));
  const filename = basename.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (!filename || !/\.pdf$/i.test(filename)) {
    throw createStorageError('The uploaded filename must have a .pdf extension', 400, 'INVALID_PDF');
  }
  return Array.from(filename).slice(0, 255).join('');
}

async function inspectUploadedFile(file) {
  if (!file || typeof file.path !== 'string') {
    throw createStorageError('A PDF file is required', 400, 'PDF_REQUIRED');
  }
  const fileName = normalizeOriginalFilename(file.originalname);
  if (file.mimetype !== 'application/pdf') {
    throw createStorageError('The uploaded file must use application/pdf', 400, 'INVALID_PDF_MIME_TYPE');
  }

  const stats = await fs.promises.stat(file.path);
  if (!stats.isFile() || stats.size <= 0) {
    throw createStorageError('The uploaded PDF must not be empty', 400, 'INVALID_PDF');
  }
  if (stats.size > MAX_PDF_SIZE) {
    throw createStorageError('The uploaded PDF exceeds the 10 MiB limit', 413, 'PDF_TOO_LARGE');
  }

  const bytes = await fs.promises.readFile(file.path);
  if (bytes.length < PDF_SIGNATURE.length || !bytes.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)) {
    throw createStorageError('The uploaded file does not have a PDF signature', 400, 'INVALID_PDF');
  }

  return {
    file_name: fileName,
    mime_type: 'application/pdf',
    file_size: bytes.length,
    file_hash: crypto.createHash('sha256').update(bytes).digest('hex'),
  };
}

async function moveTemporaryFile(tempPath, storageKey) {
  const targetPath = await resolveStoragePath(storageKey, { createParent: true, includeLeaf: false });
  try {
    await fs.promises.chmod(tempPath, 0o600);
    await fs.promises.link(tempPath, targetPath);
    return targetPath;
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw createStorageError('Contract PDF storage key collision', 409, 'STORAGE_KEY_CONFLICT');
    }
    throw error;
  }
}

async function writeTemporaryFile(bytes) {
  const directory = await getUploadTempDirectory();
  const tempPath = path.join(directory, `${crypto.randomBytes(16).toString('hex')}.upload`);
  await fs.promises.writeFile(tempPath, bytes, { flag: 'wx', mode: 0o600 });
  return tempPath;
}

async function removeTemporaryFile(tempPath) {
  if (!tempPath) return;
  await fs.promises.rm(tempPath, { force: true });
}

async function removeStoredFile(storageKey) {
  const targetPath = await resolveStoragePath(storageKey);
  await fs.promises.rm(targetPath, { force: true });
}

async function verifyStoredFile(version) {
  const targetPath = await resolveStoragePath(version.storage_path);
  let bytes;
  try {
    const stats = await fs.promises.stat(targetPath);
    if (!stats.isFile()) {
      throw createStorageError('The stored contract PDF is invalid', 409, 'CONTRACT_PDF_INVALID');
    }
    if (stats.size !== Number(version.file_size)) {
      throw createStorageError('Stored contract PDF size does not match its metadata', 409, 'CONTRACT_PDF_SIZE_MISMATCH');
    }
    if (stats.size <= 0 || stats.size > MAX_PDF_SIZE) {
      throw createStorageError('The stored contract PDF is invalid', 409, 'CONTRACT_PDF_INVALID');
    }
    bytes = await fs.promises.readFile(targetPath);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      throw createStorageError('The stored contract PDF is missing', 409, 'CONTRACT_PDF_MISSING');
    }
    throw error;
  }
  if (!bytes.length || bytes.length > MAX_PDF_SIZE
      || !bytes.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)) {
    throw createStorageError('The stored contract PDF is invalid', 409, 'CONTRACT_PDF_INVALID');
  }
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  if (bytes.length !== Number(version.file_size)) {
    throw createStorageError('Stored contract PDF size does not match its metadata', 409, 'CONTRACT_PDF_SIZE_MISMATCH');
  }
  if (hash !== String(version.file_hash).toLowerCase()) {
    throw createStorageError('Stored contract PDF hash does not match its metadata', 409, 'CONTRACT_PDF_HASH_MISMATCH');
  }
  if (version.mime_type !== 'application/pdf') {
    throw createStorageError('Stored contract PDF MIME metadata is invalid', 409, 'CONTRACT_PDF_INVALID');
  }
  return { bytes, file_name: version.file_name };
}

module.exports = {
  MAX_PDF_SIZE,
  BACKUP_LOCK_NAME,
  createStorageKey,
  getUploadTempDirectory,
  inspectUploadedFile,
  moveTemporaryFile,
  normalizeOriginalFilename,
  removeStoredFile,
  removeTemporaryFile,
  resolveStoragePath,
  validateStorageKey,
  verifyStoredFile,
  writeTemporaryFile,
};
