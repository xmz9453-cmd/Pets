const shopSettingsService = require('../services/shop-settings.service');
const bookingScheduleService = require('../services/booking-schedule.service');
const bookingResourceService = require('../services/booking-resource.service');

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

async function getShopIdentity(req, res, next) {
  try {
    const result = await shopSettingsService.getShopIdentity();
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

async function uploadShopLogo(req, res, next) {
  try {
    sendSuccess(res, await shopSettingsService.saveShopLogo(req.file));
  } catch (error) {
    next(error);
  }
}

async function deleteShopLogo(req, res, next) {
  try {
    sendSuccess(res, await shopSettingsService.removeShopLogo());
  } catch (error) {
    next(error);
  }
}

async function getPublicShopLogo(req, res, next) {
  try {
    const logo = await shopSettingsService.getPublicShopLogo(req.params.filename);
    res.status(200)
      .set('Content-Type', logo.mimeType)
      .set('X-Content-Type-Options', 'nosniff')
      .set('Cache-Control', 'public, max-age=31536000, immutable')
      .send(logo.bytes);
  } catch (error) {
    next(error);
  }
}

async function resetOperationalData(req, res, next) {
  try {
    const result = await shopSettingsService.resetOperationalData({
      confirmation: req.body?.confirmation,
      expectedShopId: Number(req.body?.expected_shop_id),
    });
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function getBookingSchedule(req, res, next) {
  try {
    const result = await bookingScheduleService.getBookingSchedule();
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function createBookingScheduleRule(req, res, next) {
  try {
    const result = await bookingScheduleService.createRule(req.body || {});
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

async function updateBookingScheduleRule(req, res, next) {
  try {
    const result = await bookingScheduleService.updateRule(Number(req.params.id), req.body || {});
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function deleteBookingScheduleRule(req, res, next) {
  try {
    const result = await bookingScheduleService.deleteRule(Number(req.params.id));
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function createBookingScheduleOverride(req, res, next) {
  try {
    const result = await bookingScheduleService.createOverride(req.body || {});
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

async function updateBookingScheduleOverride(req, res, next) {
  try {
    const result = await bookingScheduleService.updateOverride(Number(req.params.id), req.body || {});
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function deleteBookingScheduleOverride(req, res, next) {
  try {
    const result = await bookingScheduleService.deleteOverride(Number(req.params.id));
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function getBookingResources(req, res, next) {
  try {
    sendSuccess(res, await bookingResourceService.getBookingResources());
  } catch (error) {
    next(error);
  }
}

async function createBookingResource(req, res, next) {
  try {
    sendSuccess(res, await bookingResourceService.createBookingResource(req.body || {}), 201);
  } catch (error) {
    next(error);
  }
}

async function createBookingResourceBlock(req, res, next) {
  try {
    sendSuccess(
      res,
      await bookingResourceService.createBookingResourceBlock(Number(req.params.id), req.body || {}),
      201,
    );
  } catch (error) {
    next(error);
  }
}

async function updateBookingResource(req, res, next) {
  try {
    sendSuccess(res, await bookingResourceService.updateBookingResource(Number(req.params.id), req.body || {}));
  } catch (error) {
    next(error);
  }
}

async function deleteBookingResource(req, res, next) {
  try {
    sendSuccess(res, await bookingResourceService.deleteBookingResource(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
}

async function deleteBookingResourceBlock(req, res, next) {
  try {
    sendSuccess(
      res,
      await bookingResourceService.deleteBookingResourceBlock(Number(req.params.id), Number(req.params.blockId)),
    );
  } catch (error) {
    next(error);
  }
}

async function saveBookingResourceHours(req, res, next) {
  try {
    sendSuccess(res, await bookingResourceService.saveHours(Number(req.params.id), req.body?.hours));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createBookingResource,
  createBookingResourceBlock,
  createBookingScheduleOverride,
  createBookingScheduleRule,
  deleteBookingResource,
  deleteBookingResourceBlock,
  deleteBookingScheduleOverride,
  deleteBookingScheduleRule,
  getBookingResources,
  getBookingSchedule,
  getPublicShopLogo,
  getShopSettings,
  getShopIdentity,
  resetOperationalData,
  saveBookingResourceHours,
  deleteShopLogo,
  uploadShopLogo,
  updateBookingResource,
  updateBookingScheduleOverride,
  updateBookingScheduleRule,
  updateShopSettings,
};
