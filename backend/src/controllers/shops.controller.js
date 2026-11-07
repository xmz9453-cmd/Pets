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

async function listPublic(req, res, next) {
  try {
    res.json({
      success: true,
      data: { shops: await shopsService.listPublicShops() },
    });
  } catch (error) {
    next(error);
  }
}

async function getPublicByEntryCode(req, res, next) {
  try {
    const shop = await shopsService.getPublicShopByEntryCode(req.params.code);
    if (!shop) {
      res.status(404).json({
        success: false,
        error: { message: 'Shop is unavailable' },
      });
      return;
    }
    res.json({ success: true, data: { shop } });
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
    const staff = await authService.updateStaffRoles(req.auth.staff, req.params.id, req.body?.roles, req.auth.staff.shop_id);
    res.json({ success: true, data: { staff } });
  } catch (error) {
    next(error);
  }
}

module.exports = { create, getPublicByEntryCode, list, listPublic, listStaff, updateStaffRoles };
