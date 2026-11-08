const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const storage = require('../utils/product-image-storage');
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
  limits: { fileSize: storage.maxSize, files: 1, fields: 0, parts: 1 },
}).single('file');

function uploadProductImage(req, res, next) {
  parser(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (req.file?.path) {
      fs.promises.rm(req.file.path, { force: true }).catch((cleanupError) => {
        logError('Failed to remove rejected product image upload temporary file', { code: cleanupError.code });
      });
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
      error.statusCode = 413;
      error.code = 'PRODUCT_IMAGE_TOO_LARGE';
      error.message = '商品圖片不可超過 2 MiB。';
    } else {
      error.statusCode = 400;
      error.code = 'INVALID_PRODUCT_IMAGE_UPLOAD';
      error.message = '請上傳單一 PNG、JPG 或 WebP 商品圖片。';
    }
    next(error);
  });
}

module.exports = { uploadProductImage };
