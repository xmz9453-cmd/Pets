const path = require('path');
const { closeDatabase, executeSqlFile } = require('./helpers');

async function seed() {
  const seedFile = path.resolve(__dirname, '..', 'seeds', '001_foundation_seed.sql');
  await executeSqlFile(seedFile);
}

if (require.main === module) {
  seed()
    .then(async () => {
      await closeDatabase();
      console.log('Foundation seed complete');
    })
    .catch(async (error) => {
      await closeDatabase();
      console.error('Foundation seed failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  seed,
};
