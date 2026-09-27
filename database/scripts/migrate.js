const {
  assertMigrationSafetyGuard,
  closeDatabase,
  ensureMigrationTable,
  executeSqlFile,
  hasMigrationRun,
  listMigrationFiles,
  recordMigration,
} = require('./helpers');

async function migrate() {
  assertMigrationSafetyGuard();
  await ensureMigrationTable();
  const migrations = await listMigrationFiles();
  let executedCount = 0;

  for (const migration of migrations) {
    const alreadyRun = await hasMigrationRun(migration.filename);
    if (alreadyRun) {
      continue;
    }

    console.log(`Executing migration: ${migration.filename}`);
    await executeSqlFile(migration.path);
    await recordMigration(migration.filename);
    executedCount++;
  }

  console.log(`Migration complete. Executed ${executedCount} new migration(s).`);
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
