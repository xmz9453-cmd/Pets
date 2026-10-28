const { closeDatabase } = require('./helpers');
const { getPool } = require('../../backend/src/config/database');
const { config } = require('../../backend/src/config/env');

const RESET_TABLES = [
  'payments',
  'order_items',
  'orders',
  'groomings',
  'boardings',
  'onboarding_pets',
  'onboardings',
  'booking_sessions',
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
  'shops',
  'staff_shop_memberships',
  'staff_shop_roles',
  'platform_shop_managers',
  'staff',
  'roles',
  'staff_roles',
  'auth_sessions',
  'shop_settings',
  'shop_business_hours',
  'booking_schedule_rules',
  'booking_schedule_overrides',
  'contract_versions',
  'contract_history',
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
    const error = new Error('此功能僅允許在本機 Development／Test 環境執行，資料未清除。');
    error.statusCode = 403;
    error.code = 'RESET_ENVIRONMENT_NOT_ALLOWED';
    throw error;
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

async function getShopRowCounts(connection, tables, shopId) {
  const counts = {};
  for (const table of tables) {
    const [rows] = await connection.query(`SELECT COUNT(*) AS count FROM \`${table}\` WHERE shop_id = ?`, [shopId]);
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
  const shopIdArgument = args.find((argument) => argument.startsWith('--shop-id='));
  const shopIdIndex = args.indexOf('--shop-id');
  const shopId = Number(shopIdArgument
    ? shopIdArgument.slice('--shop-id='.length)
    : shopIdIndex >= 0 ? args[shopIdIndex + 1] : NaN);
  if (!Number.isInteger(shopId) || shopId <= 0) {
    throw new Error('請指定有效的店家 ID，例如 --shop-id=1。');
  }
  return executeResetOperationalData(shopId);
}

async function executeResetOperationalData(shopId) {
  const connection = await getPool().getConnection();
  try {
    await assertTablesExist(connection, [...RESET_TABLES, ...PRESERVE_TABLES]);
    const [shopRows] = await connection.query('SELECT id FROM shops WHERE id = ?', [shopId]);
    if (!shopRows.length) throw new Error('找不到指定店家，資料未清除。');
    const preserveCountsBefore = await getRowCounts(connection, PRESERVE_TABLES);

    const [contractRows] = await connection.query(
      'SELECT COUNT(*) AS count FROM contract_history WHERE shop_id = ?',
      [shopId],
    );
    if (Number(contractRows[0].count) > 0) {
      const error = new Error('此店仍有已簽署的電子合約與簽名證據。為保留法律紀錄，資料未清除；請先另行確認合約保存與移轉方式。');
      error.statusCode = 409;
      error.code = 'RESET_BLOCKED_BY_SIGNED_CONTRACTS';
      throw error;
    }

    await connection.beginTransaction();
    for (const table of RESET_TABLES) {
      await connection.query(`DELETE FROM \`${table}\` WHERE shop_id = ?`, [shopId]);
    }

    const resetCounts = await getShopRowCounts(connection, RESET_TABLES, shopId);
    assertResetTablesEmpty(resetCounts);

    const preserveCountsAfter = await getRowCounts(connection, PRESERVE_TABLES);
    for (const table of PRESERVE_TABLES) {
      if (preserveCountsAfter[table] !== preserveCountsBefore[table]) {
        throw new Error(`資料重置驗證失敗：保留資料表 ${table} 的資料筆數被改變`);
      }
    }

    await connection.commit();
    return { shop_id: shopId, resetCounts, preserveCounts: preserveCountsAfter };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function resetOperationalDataForApplication({ shopId, confirmation } = {}) {
  assertResetEnvironment();
  if (!Number.isInteger(Number(shopId)) || Number(shopId) <= 0) {
    throw new Error('無法確認目前店家，資料未清除。');
  }
  const [shops] = await getPool().query('SELECT name FROM shops WHERE id = ?', [Number(shopId)]);
  if (!shops.length || typeof confirmation !== 'string' || confirmation.trim() !== shops[0].name) {
    const error = new Error('店家名稱確認不符，資料未清除。');
    error.statusCode = 400;
    error.code = 'RESET_CONFIRMATION_MISMATCH';
    throw error;
  }
  return executeResetOperationalData(Number(shopId));
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
