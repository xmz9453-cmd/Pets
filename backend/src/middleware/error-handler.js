const { logError } = require('../utils/logger');

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  const statusCode = error.statusCode || 500;
  const message = statusCode >= 500 ? 'Internal server error' : error.message;

  logError('API error', {
    path: req.path,
    method: req.method,
    message: error.message,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message,
    },
  });
}

module.exports = {
  errorHandler,
};
