const path = require('path');
const dotenv = require('dotenv');

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', envFile), quiet: true });

function readEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    return fallback;
  }
  return value;
}

function readNumberEnv(name, fallback) {
  const value = readEnv(name, fallback);
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue)) {
    throw new Error(`${name} must be an integer`);
  }
  return numberValue;
}

const config = {
  nodeEnv: readEnv('NODE_ENV', 'development'),
  backendPort: readNumberEnv('BACKEND_PORT', 3001),
  frontendApiBaseUrl: readEnv('FRONTEND_API_BASE_URL', 'http://localhost:3001'),
  database: {
    host: readEnv('DB_HOST', 'localhost'),
    port: readNumberEnv('DB_PORT', 3306),
    name: readEnv('DB_NAME', process.env.NODE_ENV === 'test' ? 'psop_test' : 'psop_dev'),
    user: readEnv('DB_USER', ''),
    password: readEnv('DB_PASSWORD', ''),
  },
  testDatabaseName: readEnv('TEST_DB_NAME', 'psop_test'),
};

module.exports = {
  config,
};
