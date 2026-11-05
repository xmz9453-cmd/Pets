const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const storage = require('../utils/portal-background-storage');
const { logError } = require('../utils/logger');

const multerStorage = multer.diskStorage({
  destination(req, file, callback) {
    storage.getUploadTempDirectory().then(
      (directory) => callback(null, directory),
      callback,
    );
  },
  filename(req, file, callback) {
    callback(null, `${crypto.randomBytes(16).toString('hex')}.upload`);
  },
});

const parseUpload = multer({
  storage: multerStorage,
  defParamCharset: 'utf8',
  limits: {
    fileSize: storage.MAX_BACKGROUND_SIZE,
    files: 1,
    fields: 0,
    parts: 1,
  },
}).single('file');

function uploadPortalBackground(req, res, next) {
  parseUpload(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (req.file?.path) {
      fs.promises.rm(req.file.path, { force: true }).catch((cleanupError) => {
        logError('Failed to remove rejected portal background upload temporary file', {
          code: cleanupError.code,
        });
      });
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      error.statusCode = 413;
      error.code = 'PORTAL_BACKGROUND_TOO_LARGE';
      error.message = '入口背景圖片不可超過 10 MiB。';
    } else {
      error.statusCode = 400;
      error.code = 'INVALID_PORTAL_BACKGROUND_UPLOAD';
      error.message = '請上傳單一 PNG、JPG 或 WebP 背景圖片。';
    }
    next(error);
  });
}

module.exports = { uploadPortalBackground };
