const { assertDatabaseName, closeDatabase } = require('./helpers');
const { getPool } = require('../../backend/src/config/database');
const { setup } = require('./setup');

async function resetDevelopmentDatabase() {
  assertDatabaseName('psop_dev');
  await setup();
  await getPool().query('DELETE FROM foundation_verification');
  await getPool().query('DELETE FROM schema_migrations WHERE filename <> ?', ['001_create_schema_migrations.sql']);
  await setup();
}

if (require.main === module) {
  resetDevelopmentDatabase()
    .then(async () => {
      await closeDatabase();
      console.log('Development database reset complete');
    })
    .catch(async (error) => {
      await closeDatabase();
      console.error('Development database reset refused or failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  resetDevelopmentDatabase,
};
