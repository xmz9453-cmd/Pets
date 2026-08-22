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

  const response = {
    success: false,
    error: {
      message,
    },
  };

  if (error.code === 'VALIDATION_ERROR' && error.fields) {
    response.error = {
      code: 'VALIDATION_ERROR',
      fields: error.fields,
    };
  } else if (error.code) {
    response.error = {
      code: error.code,
      message,
    };
  }

  res.status(statusCode).json(response);
}

module.exports = {
  errorHandler,
};
