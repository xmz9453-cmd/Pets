const boardingService = require('../services/boarding.service');

function sendSuccess(res, payload, statusCode = 200) {
  res.status(statusCode).json({ success: true, data: payload });
}

async function listBoardings(req, res, next) {
  try { sendSuccess(res, await boardingService.listBoardings(req.query || {})); } catch (error) { next(error); }
}
async function getBoarding(req, res, next) {
  try { sendSuccess(res, await boardingService.getBoarding(req.params.id)); } catch (error) { next(error); }
}
async function createBoarding(req, res, next) {
  try { sendSuccess(res, await boardingService.createBoarding(req.body || {}), 201); } catch (error) { next(error); }
}
async function updateBoarding(req, res, next) {
  try { sendSuccess(res, await boardingService.updateBoarding(req.params.id, req.body || {})); } catch (error) { next(error); }
}
async function checkIn(req, res, next) {
  try { sendSuccess(res, await boardingService.checkIn(req.params.id)); } catch (error) { next(error); }
}
async function checkOut(req, res, next) {
  try { sendSuccess(res, await boardingService.checkOut(req.params.id)); } catch (error) { next(error); }
}

module.exports = { checkIn, checkOut, createBoarding, getBoarding, listBoardings, updateBoarding };
