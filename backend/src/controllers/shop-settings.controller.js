const shopSettingsService = require('../services/shop-settings.service');
const bookingScheduleService = require('../services/booking-schedule.service');

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

async function resetOperationalData(req, res, next) {
  try {
    const result = await shopSettingsService.resetOperationalData();
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

module.exports = {
  createBookingScheduleOverride,
  createBookingScheduleRule,
  deleteBookingScheduleOverride,
  deleteBookingScheduleRule,
  getBookingSchedule,
  getShopSettings,
  getShopIdentity,
  resetOperationalData,
  updateBookingScheduleOverride,
  updateBookingScheduleRule,
  updateShopSettings,
};
