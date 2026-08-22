const { getPool } = require('../config/database');

const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

function normalizeShop(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    name: row.name,
    phone: row.phone || null,
    address: row.address || null,
    email: row.email || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeBusinessHour(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    weekday: row.weekday,
    is_closed: Boolean(row.is_closed),
    open_time: row.open_time || null,
    close_time: row.close_time || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getShopSettings(connection = getPool()) {
  const [rows] = await connection.query(
    'SELECT * FROM shop_settings ORDER BY id DESC LIMIT 1',
  );
  return normalizeShop(rows[0] || null);
}

async function createShopSettings(shop, connection = getPool()) {
  const [result] = await connection.query(
    'INSERT INTO shop_settings (name, phone, address, email) VALUES (?, ?, ?, ?)',
    [shop.name, shop.phone || null, shop.address || null, shop.email || null],
  );

  const [rows] = await connection.query('SELECT * FROM shop_settings WHERE id = ? LIMIT 1', [result.insertId]);
  return normalizeShop(rows[0] || null);
}

async function updateShopSettings(shopId, shop, connection = getPool()) {
  await connection.query(
    'UPDATE shop_settings SET name = ?, phone = ?, address = ?, email = ? WHERE id = ?',
    [shop.name, shop.phone || null, shop.address || null, shop.email || null, shopId],
  );

  const [rows] = await connection.query('SELECT * FROM shop_settings WHERE id = ? LIMIT 1', [shopId]);
  return normalizeShop(rows[0] || null);
}

async function listBusinessHours(connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT * FROM shop_business_hours
     ORDER BY CASE weekday
       WHEN 'MONDAY' THEN 1
       WHEN 'TUESDAY' THEN 2
       WHEN 'WEDNESDAY' THEN 3
       WHEN 'THURSDAY' THEN 4
       WHEN 'FRIDAY' THEN 5
       WHEN 'SATURDAY' THEN 6
       WHEN 'SUNDAY' THEN 7
       ELSE 8
     END ASC`,
  );

  return rows.map(normalizeBusinessHour);
}

async function createDefaultBusinessHours(connection = getPool()) {
  for (const weekday of WEEKDAYS) {
    await connection.query(
      'INSERT INTO shop_business_hours (weekday, is_closed, open_time, close_time) VALUES (?, TRUE, NULL, NULL)',
      [weekday],
    );
  }

  return listBusinessHours(connection);
}

async function ensureBusinessHoursComplete(connection = getPool()) {
  const hours = await listBusinessHours(connection);
  const existingByWeekday = new Map(hours.map((entry) => [entry.weekday, entry]));

  for (const weekday of WEEKDAYS) {
    if (existingByWeekday.has(weekday)) {
      continue;
    }

    await connection.query(
      'INSERT INTO shop_business_hours (weekday, is_closed, open_time, close_time) VALUES (?, TRUE, NULL, NULL)',
      [weekday],
    );
  }

  return listBusinessHours(connection);
}

async function upsertBusinessHours(hours, connection = getPool()) {
  for (const item of hours) {
    await connection.query(
      `INSERT INTO shop_business_hours (weekday, is_closed, open_time, close_time)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         is_closed = VALUES(is_closed),
         open_time = VALUES(open_time),
         close_time = VALUES(close_time),
         updated_at = CURRENT_TIMESTAMP`,
      [
        item.weekday,
        item.is_closed ? 1 : 0,
        item.is_closed ? null : (item.open_time || null),
        item.is_closed ? null : (item.close_time || null),
      ],
    );
  }

  return listBusinessHours(connection);
}

async function getShopSettingsWithHours(connection = getPool()) {
  let shop = await getShopSettings(connection);

  if (!shop) {
    shop = await createShopSettings({ name: 'My Shop', phone: null, address: null, email: null }, connection);
  }

  const businessHours = await ensureBusinessHoursComplete(connection);
  return { shop, business_hours: businessHours };
}

module.exports = {
  WEEKDAYS,
  createDefaultBusinessHours,
  createShopSettings,
  ensureBusinessHoursComplete,
  getShopSettings,
  getShopSettingsWithHours,
  listBusinessHours,
  updateShopSettings,
  upsertBusinessHours,
};
