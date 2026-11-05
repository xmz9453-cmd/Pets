const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const shopLogoStorage = require('../utils/shop-logo-storage');
const { logError } = require('../utils/logger');

const storage = multer.diskStorage({
  destination(req, file, callback) {
    shopLogoStorage.getUploadTempDirectory().then(
      (directory) => callback(null, directory),
      callback,
    );
  },
  filename(req, file, callback) {
    callback(null, `${crypto.randomBytes(16).toString('hex')}.upload`);
  },
});

const parseShopLogo = multer({
  storage,
  defParamCharset: 'utf8',
  limits: {
    fileSize: shopLogoStorage.MAX_LOGO_SIZE,
    files: 1,
    fields: 0,
    parts: 1,
  },
}).single('file');

function uploadShopLogo(req, res, next) {
  parseShopLogo(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (req.file?.path) {
      fs.promises.rm(req.file.path, { force: true }).catch((cleanupError) => {
        logError('Failed to remove rejected shop logo upload temporary file', {
          code: cleanupError.code,
        });
      });
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      error.statusCode = 413;
      error.code = 'SHOP_LOGO_TOO_LARGE';
      error.message = 'Logo 圖片不可超過 2 MiB。';
    } else {
      error.statusCode = 400;
      error.code = 'INVALID_SHOP_LOGO_UPLOAD';
      error.message = '請上傳單一 PNG、JPG 或 WebP Logo 圖片。';
    }
    next(error);
  });
}

module.exports = { uploadShopLogo };
