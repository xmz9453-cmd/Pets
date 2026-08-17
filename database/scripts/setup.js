const { closeDatabase } = require('./helpers');
const { migrate } = require('./migrate');
const { seed } = require('./seed');

async function setup() {
  await migrate();
  await seed();
}

if (require.main === module) {
  setup()
    .then(async () => {
      await closeDatabase();
      console.log('Database setup complete');
    })
    .catch(async (error) => {
      await closeDatabase();
      console.error('Database setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  setup,
};
