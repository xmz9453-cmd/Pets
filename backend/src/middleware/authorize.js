function hasAnyRole(staff, allowedRoles) {
  if (!staff || !Array.isArray(staff.roles)) {
    return false;
  }

  return staff.roles.some((role) => allowedRoles.includes(role));
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    const staff = req.auth && req.auth.staff;

    if (!hasAnyRole(staff, allowedRoles)) {
      const error = new Error('Forbidden');
      error.statusCode = 403;
      return next(error);
    }

    return next();
  };
}

function requirePlatformShopManager(req, res, next) {
  if (req.auth?.staff?.is_platform_shop_manager) return next();
  const error = new Error('Forbidden');
  error.statusCode = 403;
  return next(error);
}

module.exports = { requirePlatformShopManager, requireRole };
