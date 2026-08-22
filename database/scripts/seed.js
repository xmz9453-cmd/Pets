const path = require('path');
const { closeDatabase, executeSqlFile } = require('./helpers');
const { seedStaffAuthentication } = require('../seeds/staff-authentication-seed');

async function seed() {
  const foundationSeedFile = path.resolve(__dirname, '..', 'seeds', '001_foundation_seed.sql');
  const roleSeedFile = path.resolve(__dirname, '..', 'seeds', '002_staff_authentication_roles.sql');
  const appointmentServiceSeedFile = path.resolve(__dirname, '..', 'seeds', '003_appointment_service_seed.sql');
  await executeSqlFile(foundationSeedFile);
  await executeSqlFile(roleSeedFile);
  await executeSqlFile(appointmentServiceSeedFile);
  await seedStaffAuthentication();
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
