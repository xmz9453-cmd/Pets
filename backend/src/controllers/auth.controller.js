const authService = require('../services/auth.service');
const { readCookie } = require('../middleware/authenticate');

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
};

async function login(req, res, next) {
  try {
    const { username, password } = req.body || {};
    const result = await authService.login(username, password);

    res.cookie(authService.SESSION_COOKIE_NAME, result.token, {
      ...cookieOptions,
      maxAge: authService.SESSION_TTL_MS,
    });

    res.json({
      success: true,
      data: {
        staff: result.staff,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    const token = readCookie(req, authService.SESSION_COOKIE_NAME);
    await authService.logout(token);
    res.clearCookie(authService.SESSION_COOKIE_NAME, cookieOptions);
    res.json({
      success: true,
      data: {
        logged_out: true,
      },
    });
  } catch (error) {
    next(error);
  }
}

function getCurrentStaff(req, res) {
  res.json({
    success: true,
    data: {
      staff: req.auth.staff,
    },
  });
}

module.exports = {
  getCurrentStaff,
  login,
  logout,
};
