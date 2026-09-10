const { closeDatabase } = require('./helpers');
const { getPool } = require('../../backend/src/config/database');
const { config } = require('../../backend/src/config/env');

const RESET_TABLES = [
  'payments',
  'order_items',
  'orders',
  'groomings',
  'boardings',
  'appointment_pet_services',
  'appointment_pets',
  'daily_operations',
  'appointments',
  'pet_customer_relationships',
  'pets',
  'customers',
  'products',
  'services',
];

const PRESERVE_TABLES = [
  'schema_migrations',
  'foundation_verification',
  'staff',
  'roles',
  'staff_roles',
  'auth_sessions',
  'shop_settings',
  'shop_business_hours',
];

const ENVIRONMENT_DATABASES = new Map([
  ['development', 'psop_dev'],
  ['test', 'psop_test'],
]);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

function assertResetEnvironment() {
  if (!ENVIRONMENT_DATABASES.has(config.nodeEnv)
    || !LOCAL_HOSTS.has(config.database.host)
    || ENVIRONMENT_DATABASES.get(config.nodeEnv) !== config.database.name) {
    throw new Error('此腳本僅允許在 Development / Test 環境執行。');
  }
}

function assertConfirmation(args) {
  if (!args.includes('--confirm')) {
    throw new Error('需要明確確認才能執行資料重置，請使用 --confirm。');
  }
}

async function getRowCounts(connection, tables) {
  const counts = {};
  for (const table of tables) {
    const [rows] = await connection.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
    counts[table] = Number(rows[0].count);
  }
  return counts;
}

function assertResetTablesEmpty(counts) {
  const remaining = Object.entries(counts).filter(([, count]) => count !== 0);
  if (remaining.length) {
    throw new Error(`資料重置驗證失敗：${remaining.map(([table, count]) => `${table}=${count}`).join(', ')}`);
  }
}

async function assertTablesExist(connection, tables) {
  for (const table of tables) {
    const [rows] = await connection.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
      [table],
    );
    if (!rows.length) {
      throw new Error(`資料重置驗證失敗：找不到資料表 ${table}`);
    }
  }
}

async function resetOperationalData({ args = process.argv.slice(2) } = {}) {
  assertResetEnvironment();
  assertConfirmation(args);

  return executeResetOperationalData();
}

async function executeResetOperationalData() {
  const connection = await getPool().getConnection();
  try {
    await assertTablesExist(connection, [...RESET_TABLES, ...PRESERVE_TABLES]);
    const preserveCountsBefore = await getRowCounts(connection, PRESERVE_TABLES);

    await connection.beginTransaction();
    for (const table of RESET_TABLES) {
      await connection.query(`DELETE FROM \`${table}\``);
    }

    const resetCounts = await getRowCounts(connection, RESET_TABLES);
    assertResetTablesEmpty(resetCounts);

    const preserveCountsAfter = await getRowCounts(connection, PRESERVE_TABLES);
    for (const table of PRESERVE_TABLES) {
      if (preserveCountsAfter[table] !== preserveCountsBefore[table]) {
        throw new Error(`資料重置驗證失敗：保留資料表 ${table} 的資料筆數被改變`);
      }
    }

    await connection.commit();
    return { resetCounts, preserveCounts: preserveCountsAfter };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function resetOperationalDataForApplication() {
  assertResetEnvironment();
  return executeResetOperationalData();
}

if (require.main === module) {
  resetOperationalData()
    .then(async () => {
      await closeDatabase();
      console.log('Operational data reset complete');
    })
    .catch(async (error) => {
      await closeDatabase();
      console.error('Operational data reset refused or failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  ENVIRONMENT_DATABASES,
  PRESERVE_TABLES,
  RESET_TABLES,
  assertConfirmation,
  assertResetEnvironment,
  resetOperationalDataForApplication,
  resetOperationalData,
};