const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const contractPdfStorage = require('../utils/contract-pdf-storage');
const { logError } = require('../utils/logger');

const storage = multer.diskStorage({
  destination(req, file, callback) {
    contractPdfStorage.getUploadTempDirectory().then(
      (directory) => callback(null, directory),
      callback,
    );
  },
  filename(req, file, callback) {
    callback(null, `${crypto.randomBytes(16).toString('hex')}.upload`);
  },
});

const parsePdfUpload = multer({
  storage,
  defParamCharset: 'utf8',
  limits: {
    fileSize: contractPdfStorage.MAX_PDF_SIZE,
    files: 1,
    fields: 0,
    parts: 1,
  },
}).single('file');

function uploadContractPdf(req, res, next) {
  parsePdfUpload(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (req.file && req.file.path) {
      fs.promises.rm(req.file.path, { force: true }).catch((cleanupError) => {
        logError('Failed to remove rejected contract PDF upload temporary file', {
          code: cleanupError.code,
        });
      });
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      error.statusCode = 413;
      error.code = 'PDF_TOO_LARGE';
      error.message = 'The uploaded PDF exceeds the 10 MiB limit';
    } else {
      error.statusCode = 400;
      error.code = 'INVALID_PDF_UPLOAD';
      error.message = 'A single PDF file is required';
    }
    next(error);
  });
}

module.exports = {
  uploadContractPdf,
};
