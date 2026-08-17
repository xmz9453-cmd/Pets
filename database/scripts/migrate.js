const {
  closeDatabase,
  ensureMigrationTable,
  executeSqlFile,
  hasMigrationRun,
  listMigrationFiles,
  recordMigration,
} = require('./helpers');

async function migrate() {
  await ensureMigrationTable();
  const migrations = await listMigrationFiles();

  for (const migration of migrations) {
    const alreadyRun = await hasMigrationRun(migration.filename);
    if (alreadyRun) {
      continue;
    }

    await executeSqlFile(migration.path);
    await recordMigration(migration.filename);
  }
}

if (require.main === module) {
  migrate()
    .then(async () => {
      await closeDatabase();
      console.log('Migration complete');
    })
    .catch(async (error) => {
      await closeDatabase();
      console.error('Migration failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  migrate,
};
