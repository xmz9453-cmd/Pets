const shopsRepository = require('../data/shops.repository');
const shopSettingsRepository = require('../data/shop-settings.repository');
const { getPool } = require('../config/database');

const WEEKDAYS = shopSettingsRepository.WEEKDAYS;

function validationError(fields) {
  const error = new Error('Validation failed');
  error.statusCode = 400;
  error.code = 'VALIDATION_ERROR';
  error.fields = fields;
  return error;
}

async function listAccessibleShops(staff) {
  if (staff.is_platform_shop_manager) return shopsRepository.listAllShops();
  return shopsRepository.listShopsForStaff(staff.id);
}

async function listStaffForPlatformManager(shopId) {
  return shopsRepository.listAllStaffWithRolesAtShop(shopId);
}

async function createShop(payload = {}) {
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const slug = typeof payload.slug === 'string' ? payload.slug.trim().toLowerCase() : '';
  const errors = {};
  if (!name || name.length > 200) errors.name = '店家名稱必填且不可超過 200 個字元';
  if (!/^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/.test(slug)) {
    errors.slug = '店家代碼僅能使用小寫英文字母、數字與連字號';
  }
  if (Object.keys(errors).length) throw validationError(errors);

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const shop = await shopsRepository.createShop({ name, slug }, connection);
    await connection.query(
      'INSERT INTO shop_settings (shop_id, name) VALUES (?, ?)',
      [shop.id, name],
    );
    for (const weekday of WEEKDAYS) {
      await connection.query(
        'INSERT INTO shop_business_hours (shop_id, weekday, is_closed) VALUES (?, ?, TRUE)',
        [shop.id, weekday],
      );
    }
    await connection.commit();
    return shop;
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      throw validationError({ slug: '這個店家代碼已經使用' });
    }
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { createShop, listAccessibleShops, listStaffForPlatformManager };
