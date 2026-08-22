const shopSettingsService = require('../services/shop-settings.service');

function sendSuccess(res, payload, statusCode = 200) {
  res.status(statusCode).json({
    success: true,
    data: payload,
  });
}

async function getShopSettings(req, res, next) {
  try {
    const result = await shopSettingsService.getShopSettings();
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function updateShopSettings(req, res, next) {
  try {
    const result = await shopSettingsService.updateShopSettings(req.body || {});
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getShopSettings,
  updateShopSettings,
};
