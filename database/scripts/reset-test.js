const { assertDatabaseName, closeDatabase } = require('./helpers');
const { getPool } = require('../../backend/src/config/database');
const { setup } = require('./setup');

async function resetTestDatabase() {
  assertDatabaseName('psop_test');
  await setup();
  await getPool().query('DELETE FROM foundation_verification');
  await getPool().query('DELETE FROM schema_migrations WHERE filename <> ?', ['001_create_schema_migrations.sql']);
  await setup();
}

if (require.main === module) {
  resetTestDatabase()
    .then(async () => {
      await closeDatabase();
      console.log('Test database reset complete');
    })
    .catch(async (error) => {
      await closeDatabase();
      console.error('Test database reset refused or failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  resetTestDatabase,
};
