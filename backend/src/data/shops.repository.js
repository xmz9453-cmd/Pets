const crypto = require('crypto');
const { getPool } = require('../config/database');

const SHOP_LOGO_SELECT = `(SELECT ss.logo_storage_key
                          FROM shop_settings ss
                          WHERE ss.shop_id = s.id
                          ORDER BY ss.id DESC
                          LIMIT 1) AS logo_storage_key`;

function normalizeShop(row) {
  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    ...(row.public_entry_code ? { public_entry_code: row.public_entry_code } : {}),
    status: row.status,
    logo_url: row.logo_storage_key ? `/api/public/shop-logos/${row.logo_storage_key}` : null,
  };
}

async function ensurePublicEntryCode(shopId) {
  const pool = getPool();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const [rows] = await pool.query(
      'SELECT public_entry_code FROM shops WHERE id = ? LIMIT 1',
      [shopId],
    );
    if (!rows[0]) return null;
    if (rows[0].public_entry_code) return rows[0].public_entry_code;

    try {
      const code = crypto.randomBytes(16).toString('hex');
      const [result] = await pool.query(
        'UPDATE shops SET public_entry_code = ? WHERE id = ? AND public_entry_code IS NULL',
        [code, shopId],
      );
      if (result.affectedRows) return code;
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY') throw error;
    }
  }

  const error = new Error('Unable to allocate a unique public shop entry code');
  error.code = 'SHOP_ENTRY_CODE_ALLOCATION_FAILED';
  throw error;
}

async function listAllShops() {
  const [rows] = await getPool().query(
    `SELECT s.id, s.name, s.slug, s.public_entry_code, s.status, ${SHOP_LOGO_SELECT}
     FROM shops s
     WHERE s.status = 'ACTIVE'
     ORDER BY s.id ASC`,
  );
  return Promise.all(rows.map(async (row) => {
    const publicEntryCode = row.public_entry_code || await ensurePublicEntryCode(row.id);
    return normalizeShop({ ...row, public_entry_code: publicEntryCode });
  }));
}

async function listPublicShops() {
  const [rows] = await getPool().query(
    `SELECT s.id, s.name,
            (SELECT ss.logo_storage_key
             FROM shop_settings ss
             WHERE ss.shop_id = s.id
             ORDER BY ss.id DESC
             LIMIT 1) AS logo_storage_key,
            (SELECT ss.portal_announcement
             FROM shop_settings ss
             WHERE ss.shop_id = s.id
             ORDER BY ss.id DESC
             LIMIT 1) AS announcement
     FROM shops s
     WHERE s.status = 'ACTIVE'
     ORDER BY s.id ASC`,
  );
  return rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    logo_url: row.logo_storage_key ? `/api/public/shop-logos/${row.logo_storage_key}` : null,
    announcement: row.announcement || '',
  }));
}

async function getPublicShopByEntryCode(code) {
  if (typeof code !== 'string' || !/^[a-f0-9]{32}$/.test(code)) return null;
  const [rows] = await getPool().query(
    `SELECT s.name,
            (SELECT ss.logo_storage_key
             FROM shop_settings ss
             WHERE ss.shop_id = s.id
             ORDER BY ss.id DESC
             LIMIT 1) AS logo_storage_key,
            (SELECT ss.portal_announcement
             FROM shop_settings ss
             WHERE ss.shop_id = s.id
             ORDER BY ss.id DESC
             LIMIT 1) AS announcement
     FROM shops s
     WHERE s.public_entry_code = ? AND s.status = 'ACTIVE'
     LIMIT 1`,
    [code],
  );
  if (!rows[0]) return null;
  return {
    name: rows[0].name,
    logo_url: rows[0].logo_storage_key ? `/api/public/shop-logos/${rows[0].logo_storage_key}` : null,
    announcement: rows[0].announcement || '',
  };
}

async function listShopsForStaff(staffId) {
  const [rows] = await getPool().query(
    `SELECT s.id, s.name, s.slug, s.public_entry_code, s.status, ${SHOP_LOGO_SELECT}
     FROM shops s
     INNER JOIN staff_shop_memberships m ON m.shop_id = s.id
     WHERE m.staff_id = ? AND s.status = 'ACTIVE'
     ORDER BY s.id ASC`,
    [staffId],
  );
  return Promise.all(rows.map(async (row) => {
    const publicEntryCode = row.public_entry_code || await ensurePublicEntryCode(row.id);
    return normalizeShop({ ...row, public_entry_code: publicEntryCode });
  }));
}

async function isPlatformShopManager(staffId) {
  const [rows] = await getPool().query(
    'SELECT staff_id FROM platform_shop_managers WHERE staff_id = ? LIMIT 1',
    [staffId],
  );
  return rows.length > 0;
}

async function listRolesForStaffAtShop(staffId, shopId) {
  const [rows] = await getPool().query(
    `SELECT r.code
     FROM staff_shop_roles sr
     INNER JOIN roles r ON r.id = sr.role_id
     WHERE sr.staff_id = ? AND sr.shop_id = ?
     ORDER BY r.code`,
    [staffId, shopId],
  );
  return rows.map((row) => row.code);
}

async function getShopById(shopId) {
  const [rows] = await getPool().query(
    'SELECT id, name, slug, status FROM shops WHERE id = ? LIMIT 1',
    [shopId],
  );
  return rows[0] ? normalizeShop(rows[0]) : null;
}

async function getActiveShopIdByPublicEntryCode(code) {
  if (typeof code !== 'string' || !/^[a-f0-9]{32}$/.test(code)) return null;
  const [rows] = await getPool().query(
    "SELECT id FROM shops WHERE public_entry_code = ? AND status = 'ACTIVE' LIMIT 1",
    [code],
  );
  return rows[0] ? Number(rows[0].id) : null;
}

async function getPublicEntryCodeByShopId(shopId) {
  return ensurePublicEntryCode(shopId);
}

async function createShop({ name, slug, publicEntryCode }, connection = getPool()) {
  const [result] = await connection.query(
    "INSERT INTO shops (name, slug, public_entry_code, status) VALUES (?, ?, ?, 'ACTIVE')",
    [name, slug, publicEntryCode],
  );
  const [rows] = await connection.query(
    'SELECT id, name, slug, public_entry_code, status FROM shops WHERE id = ? LIMIT 1',
    [result.insertId],
  );
  return rows[0] ? normalizeShop(rows[0]) : null;
}

async function listStaffWithRolesAtShop(shopId, connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT st.id, st.username, st.display_name, st.status, r.code AS role_code
     FROM staff_shop_memberships m
     INNER JOIN staff st ON st.id = m.staff_id
     LEFT JOIN staff_shop_roles sr ON sr.staff_id = m.staff_id AND sr.shop_id = m.shop_id
     LEFT JOIN roles r ON r.id = sr.role_id
     WHERE m.shop_id = ?
     ORDER BY st.id ASC, r.code ASC`,
    [shopId],
  );
  const staffById = new Map();
  rows.forEach((row) => {
    if (!staffById.has(row.id)) {
      staffById.set(row.id, {
        id: row.id,
        username: row.username,
        display_name: row.display_name,
        status: row.status,
        roles: [],
      });
    }
    if (row.role_code) staffById.get(row.id).roles.push(row.role_code);
  });
  return Array.from(staffById.values());
}

async function listAllStaffWithRolesAtShop(shopId, connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT st.id, st.username, st.display_name, st.status,
            m.staff_id IS NOT NULL AS is_member,
            pm.staff_id IS NOT NULL AS is_platform_shop_manager,
            r.code AS role_code
     FROM staff st
     LEFT JOIN staff_shop_memberships m ON m.staff_id = st.id AND m.shop_id = ?
     LEFT JOIN staff_shop_roles sr ON sr.staff_id = m.staff_id AND sr.shop_id = m.shop_id
     LEFT JOIN roles r ON r.id = sr.role_id
     LEFT JOIN platform_shop_managers pm ON pm.staff_id = st.id
     ORDER BY st.id ASC, r.code ASC`,
    [shopId],
  );
  const byId = new Map();
  rows.forEach((row) => {
    if (!byId.has(row.id)) byId.set(row.id, {
      id: row.id,
      username: row.username,
      display_name: row.display_name,
      status: row.status,
      is_member: Boolean(row.is_member),
      is_platform_shop_manager: Boolean(row.is_platform_shop_manager),
      roles: [],
    });
    if (row.role_code) byId.get(row.id).roles.push(row.role_code);
  });
  return Array.from(byId.values());
}

async function addMembership(staffId, shopId, roleCodes, connection = getPool()) {
  await connection.query(
    'INSERT IGNORE INTO staff_shop_memberships (staff_id, shop_id) VALUES (?, ?)',
    [staffId, shopId],
  );
  await connection.query(
    'DELETE FROM staff_shop_roles WHERE staff_id = ? AND shop_id = ?',
    [staffId, shopId],
  );
  if (!roleCodes.length) return;
  const [roles] = await connection.query('SELECT id, code FROM roles WHERE code IN (?)', [roleCodes]);
  const roleIdsByCode = new Map(roles.map((row) => [row.code, row.id]));
  for (const roleCode of roleCodes) {
    const roleId = roleIdsByCode.get(roleCode);
    if (!roleId) throw new Error(`Role definition is missing: ${roleCode}`);
    await connection.query(
      'INSERT INTO staff_shop_roles (staff_id, shop_id, role_id) VALUES (?, ?, ?)',
      [staffId, shopId, roleId],
    );
  }
}

async function lockShop(shopId, connection = getPool()) {
  const [rows] = await connection.query('SELECT id FROM shops WHERE id = ? FOR UPDATE', [shopId]);
  return rows.length > 0;
}

async function hasMembership(staffId, shopId, connection = getPool()) {
  const [rows] = await connection.query(
    'SELECT staff_id FROM staff_shop_memberships WHERE staff_id = ? AND shop_id = ? LIMIT 1',
    [staffId, shopId],
  );
  return rows.length > 0;
}

async function countMembershipsForStaff(staffId, connection = getPool()) {
  const [rows] = await connection.query(
    'SELECT COUNT(*) AS count FROM staff_shop_memberships WHERE staff_id = ?',
    [staffId],
  );
  return Number(rows[0].count);
}

async function removeMembership(staffId, shopId, connection = getPool()) {
  await connection.query(
    'DELETE FROM staff_shop_memberships WHERE staff_id = ? AND shop_id = ?',
    [staffId, shopId],
  );
}

async function countActiveOwnersAtShop(shopId, connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT COUNT(DISTINCT m.staff_id) AS count
     FROM staff_shop_memberships m
     INNER JOIN staff_shop_roles sr ON sr.staff_id = m.staff_id AND sr.shop_id = m.shop_id
     INNER JOIN roles r ON r.id = sr.role_id
     INNER JOIN staff st ON st.id = m.staff_id
     WHERE m.shop_id = ? AND st.status = 'ACTIVE' AND r.code = 'OWNER'`,
    [shopId],
  );
  return Number(rows[0].count);
}

module.exports = {
  addMembership,
  countActiveOwnersAtShop,
  countMembershipsForStaff,
  createShop,
  ensurePublicEntryCode,
  getActiveShopIdByPublicEntryCode,
  getPublicShopByEntryCode,
  getPublicEntryCodeByShopId,
  getShopById,
  hasMembership,
  isPlatformShopManager,
  listAllShops,
  listPublicShops,
  listAllStaffWithRolesAtShop,
  listRolesForStaffAtShop,
  listStaffWithRolesAtShop,
  listShopsForStaff,
  lockShop,
  removeMembership,
};
