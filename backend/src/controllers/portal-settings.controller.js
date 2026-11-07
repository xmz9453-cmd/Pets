const service = require('../services/portal-settings.service');
const shopsRepository = require('../data/shops.repository');

function sendSuccess(res, data) {
  res.status(200).json({ success: true, data });
}

async function getPublicSettings(req, res, next) {
  try {
    const shopId = await shopsRepository.getActiveShopIdByPublicEntryCode(req.params.code);
    if (!shopId) {
      const error = new Error('Shop is unavailable');
      error.statusCode = 404;
      throw error;
    }
    sendSuccess(res, await service.getPublicSettings(shopId));
  } catch (error) {
    next(error);
  }
}

async function getSettings(req, res, next) {
  try {
    sendSuccess(res, await service.getSettings(req.auth.staff.shop_id));
  } catch (error) {
    next(error);
  }
}

async function updateSettings(req, res, next) {
  try {
    sendSuccess(res, await service.updateSettings(req.auth.staff.shop_id, req.body));
  } catch (error) {
    next(error);
  }
}

module.exports = { getPublicSettings, getSettings, updateSettings };
