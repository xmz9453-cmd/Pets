const fs = require('fs');
const path = require('path');
const { getPool, closePool } = require('../../backend/src/config/database');
const { config } = require('../../backend/src/config/env');

const localHosts = new Set(['localhost', '127.0.0.1']);
const productionNamePatterns = [/prod/i, /production/i, /live/i, /staging/i];

function getDatabaseName() {
  return config.database.name;
}

function assertLocalDatabaseHost() {
  if (!localHosts.has(config.database.host)) {
    throw new Error(`Refusing database operation on non-local host: ${config.database.host}`);
  }
}

function assertNotProductionLikeDatabase(databaseName) {
  if (!databaseName) {
    throw new Error('Refusing database operation because database name is empty');
  }

  if (productionNamePatterns.some((pattern) => pattern.test(databaseName))) {
    throw new Error(`Refusing database operation on production-like database: ${databaseName}`);
  }
}

function assertDatabaseName(expectedName) {
  const databaseName = getDatabaseName();
  assertLocalDatabaseHost();
  assertNotProductionLikeDatabase(databaseName);

  if (databaseName !== expectedName) {
    throw new Error(`Refusing operation on ${databaseName}; expected ${expectedName}`);
  }
}

function readSqlFile(filePath) {
  return fs.readFileSync(filePath, 'utf8').trim();
}

function splitSqlStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function executeSqlFile(filePath) {
  const pool = getPool();
  const sql = readSqlFile(filePath);
  const statements = splitSqlStatements(sql);

  for (const statement of statements) {
    await pool.query(statement);
  }
}

async function ensureMigrationTable() {
  const migrationFile = path.resolve(__dirname, '..', 'migrations', '001_create_schema_migrations.sql');
  await executeSqlFile(migrationFile);
}

async function listMigrationFiles() {
  const migrationsDir = path.resolve(__dirname, '..', 'migrations');
  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => ({
      filename: file,
      path: path.join(migrationsDir, file),
    }));
}

async function hasMigrationRun(filename) {
  const [rows] = await getPool().query('SELECT filename FROM schema_migrations WHERE filename = ?', [filename]);
  return rows.length > 0;
}

async function recordMigration(filename) {
  await getPool().query('INSERT IGNORE INTO schema_migrations (filename) VALUES (?)', [filename]);
}

function assertMigrationSafetyGuard() {
  const dbHost = config.database.host;
  const dbName = getDatabaseName();
  const envMode = process.env.NODE_ENV || 'development';
  const allowedHosts = new Set(['localhost', '127.0.0.1']);

  const hostWithoutPort = (dbHost || '').split(':')[0];
  if (!dbHost || !allowedHosts.has(hostWithoutPort)) {
    throw new Error(`[Migration Safety Guard FAIL] Refusing migration on non-local DB host: ${dbHost}`);
  }

  if (!dbName || typeof dbName !== 'string' || dbName.trim() === '') {
    throw new Error('[Migration Safety Guard FAIL] Refusing migration because DB name is missing or empty');
  }

  const allowedProductionDatabases = new Set(['psop_one']);
  const allowedNonProductionDatabases = new Set(['psop_dev', 'psop_test', 'psop_one']);

  if (envMode === 'production') {
    if (!allowedProductionDatabases.has(dbName)) {
      throw new Error(`[Migration Safety Guard FAIL] Production environment requires target DB 'psop_one', got '${dbName}'`);
    }
  } else {
    if (!allowedNonProductionDatabases.has(dbName)) {
      throw new Error(`[Migration Safety Guard FAIL] Refusing migration on unrecognized database '${dbName}' in ${envMode} environment`);
    }
  }

  console.log(`[Migration Safety Guard PASS] Host: ${dbHost}, Target DB: ${dbName}, Environment: ${envMode}`);
}

async function closeDatabase() {
  await closePool();
}

module.exports = {
  assertDatabaseName,
  assertMigrationSafetyGuard,
  closeDatabase,
  ensureMigrationTable,
  executeSqlFile,
  getDatabaseName,
  hasMigrationRun,
  listMigrationFiles,
  recordMigration,
};
