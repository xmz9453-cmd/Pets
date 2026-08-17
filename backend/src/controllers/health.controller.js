const healthService = require('../services/health.service');

function getHealth(req, res) {
  res.json({
    success: true,
    data: healthService.getApplicationHealth(),
  });
}

async function getDatabaseHealth(req, res, next) {
  try {
    const data = await healthService.getDatabaseHealth();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getHealth,
  getDatabaseHealth,
};
