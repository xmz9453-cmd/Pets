const reportService = require('../services/report.service');

async function getReport(req, res, next) {
  try {
    res.status(200).json({ success: true, data: await reportService.getReport(req.query || {}) });
  } catch (error) {
    next(error);
  }
}

module.exports = { getReport };