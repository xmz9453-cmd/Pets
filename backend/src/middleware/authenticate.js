const authService = require('../services/auth.service');

function readCookie(req, name) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return '';
  }

  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [rawName, ...rawValue] = cookie.trim().split('=');
    if (rawName === name) {
      return decodeURIComponent(rawValue.join('='));
    }
  }

  return '';
}

async function requireAuthentication(req, res, next) {
  try {
    const token = readCookie(req, authService.SESSION_COOKIE_NAME);
    const staff = await authService.authenticateToken(token);
    req.auth = { staff };
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  readCookie,
  requireAuthentication,
};
