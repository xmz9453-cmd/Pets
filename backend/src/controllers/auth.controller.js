const authService = require('../services/auth.service');
const { readCookie } = require('../middleware/authenticate');

const cookieOptions = {
  httpOnly: true,
  sameSite: false, // Allow cross-port cookies for development
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

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body || {});
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function listStaff(req, res, next) {
  try {
    res.json({ success: true, data: { staff: await authService.listStaff() } });
  } catch (error) {
    next(error);
  }
}

async function updateStaffRoles(req, res, next) {
  try {
    const staff = await authService.updateStaffRoles(req.params.id, req.body?.roles);
    res.json({ success: true, data: { staff } });
  } catch (error) {
    next(error);
  }
}

async function updateStaffStatus(req, res, next) {
  try {
    const staff = await authService.updateStaffStatus(req.auth.staff, req.params.id, req.body?.status);
    res.json({ success: true, data: { staff } });
  } catch (error) {
    next(error);
  }
}

async function changeOwnPassword(req, res, next) {
  try {
    const result = await authService.changeOwnPassword(req.auth.staff, req.body || {});
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function resetOtherPassword(req, res, next) {
  try {
    const result = await authService.resetOtherPassword(req.auth.staff, req.params.id, req.body || {});
    res.json({ success: true, data: result });
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
  changeOwnPassword,
  login,
  listStaff,
  logout,
  register,
  resetOtherPassword,
  updateStaffRoles,
  updateStaffStatus,
};
