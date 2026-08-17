function clearFoundationModules() {
  [
    '../../backend/src/config/env',
    '../../backend/src/config/database',
    '../../database/scripts/helpers',
  ].forEach((modulePath) => {
    delete require.cache[require.resolve(modulePath)];
  });
}

function loadHelpersWithEnv(env) {
  const originalValues = {};
  Object.keys(env).forEach((key) => {
    originalValues[key] = process.env[key];
    process.env[key] = env[key];
  });

  clearFoundationModules();
  let helpers;
  jest.isolateModules(() => {
    helpers = require('../../database/scripts/helpers');
  });

  Object.keys(env).forEach((key) => {
    if (originalValues[key] === undefined) {
      delete process.env[key];
      return;
    }
    process.env[key] = originalValues[key];
  });

  return helpers;
}

describe('Database reset safety guard', () => {
  test('allows development reset only for psop_dev on localhost', () => {
    const helpers = loadHelpersWithEnv({
      DB_HOST: 'localhost',
      DB_NAME: 'psop_dev',
    });

    expect(() => helpers.assertDatabaseName('psop_dev')).not.toThrow();
  });

  test('allows test reset only for psop_test on localhost', () => {
    const helpers = loadHelpersWithEnv({
      DB_HOST: '127.0.0.1',
      DB_NAME: 'psop_test',
    });

    expect(() => helpers.assertDatabaseName('psop_test')).not.toThrow();
  });

  test('refuses production-like database names', () => {
    const helpers = loadHelpersWithEnv({
      DB_HOST: 'localhost',
      DB_NAME: 'psop_production',
    });

    expect(() => helpers.assertDatabaseName('psop_dev')).toThrow(/production-like/);
  });

  test('refuses non-local database hosts', () => {
    const helpers = loadHelpersWithEnv({
      DB_HOST: '192.168.1.20',
      DB_NAME: 'psop_dev',
    });

    expect(() => helpers.assertDatabaseName('psop_dev')).toThrow(/non-local host/);
  });

  test('refuses database name mismatch', () => {
    const helpers = loadHelpersWithEnv({
      DB_HOST: 'localhost',
      DB_NAME: 'unexpected_database',
    });

    expect(() => helpers.assertDatabaseName('psop_dev')).toThrow(/expected psop_dev/);
  });
});
