const app = require('./app');
const { config } = require('./config/env');
const { logInfo, logError } = require('./utils/logger');
const healthRepository = require('./data/health.repository');

async function startServer() {
  try {
    await healthRepository.verifyDatabaseConnection();
    app.listen(config.backendPort, () => {
      logInfo(`Backend listening on port ${config.backendPort}`);
    });
  } catch (error) {
    logError('Backend startup failed because database connection is unavailable', error.message);
    process.exit(1);
  }
}

startServer();
