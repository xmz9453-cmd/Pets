const shopsService = require('../services/shops.service');
const authService = require('../services/auth.service');

async function list(req, res, next) {
  try {
    res.json({
      success: true,
      data: {
        shops: await shopsService.listAccessibleShops(req.auth.staff),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    res.status(201).json({
      success: true,
      data: { shop: await shopsService.createShop(req.body || {}) },
    });
  } catch (error) {
    next(error);
  }
}

async function listStaff(req, res, next) {
  try {
    res.json({ success: true, data: { staff: await shopsService.listStaffForPlatformManager(req.auth.staff.shop_id) } });
  } catch (error) {
    next(error);
  }
}

async function updateStaffRoles(req, res, next) {
  try {
    const staff = await authService.updateStaffRoles(req.params.id, req.body?.roles, req.auth.staff.shop_id);
    res.json({ success: true, data: { staff } });
  } catch (error) {
    next(error);
  }
}

module.exports = { create, list, listStaff, updateStaffRoles };
