const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const storage = require('../utils/grooming-photo-storage');
const { logError } = require('../utils/logger');

const parser = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      storage.getUploadTempDirectory().then((directory) => callback(null, directory), callback);
    },
    filename(req, file, callback) {
      callback(null, `${crypto.randomBytes(16).toString('hex')}.upload`);
    },
  }),
  defParamCharset: 'utf8',
  limits: { fileSize: storage.maxSize, files: 1, fields: 1, parts: 2, fieldSize: 20 },
}).single('file');

function uploadGroomingPhoto(req, res, next) {
  parser(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (req.file?.path) {
      fs.promises.rm(req.file.path, { force: true }).catch((cleanupError) => {
        logError('Failed to remove rejected grooming photo upload temporary file', { code: cleanupError.code });
      });
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
      error.statusCode = 413;
      error.code = 'GROOMING_PHOTO_TOO_LARGE';
      error.message = '美容照片不可超過 2 MiB。';
    } else {
      error.statusCode = 400;
      error.code = 'INVALID_GROOMING_PHOTO_UPLOAD';
      error.message = '請上傳單一 PNG、JPG 或 WebP 美容照片及分類。';
    }
    next(error);
  });
}

module.exports = { uploadGroomingPhoto };
