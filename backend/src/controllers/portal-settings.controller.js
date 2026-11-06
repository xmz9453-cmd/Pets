const service = require('../services/portal-settings.service');

function sendSuccess(res, data) {
  res.status(200).json({ success: true, data });
}

async function getPublicSettings(req, res, next) {
  try {
    sendSuccess(res, await service.getPublicSettings());
  } catch (error) {
    next(error);
  }
}

async function getSettings(req, res, next) {
  try {
    sendSuccess(res, await service.getSettings());
  } catch (error) {
    next(error);
  }
}

async function updateSettings(req, res, next) {
  try {
    sendSuccess(res, await service.updateSettings(req.body));
  } catch (error) {
    next(error);
  }
}

module.exports = { getPublicSettings, getSettings, updateSettings };
