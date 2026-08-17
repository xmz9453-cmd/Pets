const healthRepository = require('../data/health.repository');

function getApplicationHealth() {
  return {
    status: 'ok',
    service: 'psop-mvp-backend',
  };
}

async function getDatabaseHealth() {
  const connected = await healthRepository.verifyDatabaseConnection();

  return {
    status: connected ? 'ok' : 'error',
    database: connected ? 'connected' : 'unavailable',
  };
}

module.exports = {
  getApplicationHealth,
  getDatabaseHealth,
};
