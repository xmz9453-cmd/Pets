const { getPool } = require('../config/database');

function normalizeShop(row) {
  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    status: row.status,
  };
}

async function listAllShops() {
  const [rows] = await getPool().query(
    "SELECT id, name, slug, status FROM shops WHERE status = 'ACTIVE' ORDER BY id ASC",
  );
  return rows.map(normalizeShop);
}

async function listShopsForStaff(staffId) {
  const [rows] = await getPool().query(
    `SELECT s.id, s.name, s.slug, s.status
     FROM shops s
     INNER JOIN staff_shop_memberships m ON m.shop_id = s.id
     WHERE m.staff_id = ? AND s.status = 'ACTIVE'
     ORDER BY s.id ASC`,
    [staffId],
  );
  return rows.map(normalizeShop);
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

async function createShop({ name, slug }, connection = getPool()) {
  const [result] = await connection.query(
    "INSERT INTO shops (name, slug, status) VALUES (?, ?, 'ACTIVE')",
    [name, slug],
  );
  const [rows] = await connection.query(
    'SELECT id, name, slug, status FROM shops WHERE id = ? LIMIT 1',
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

async function listAllStaffWithRolesAtShop(shopId) {
  const [rows] = await getPool().query(
    `SELECT st.id, st.username, st.display_name, st.status, m.staff_id IS NOT NULL AS is_member, r.code AS role_code
     FROM staff st
     LEFT JOIN staff_shop_memberships m ON m.staff_id = st.id AND m.shop_id = ?
     LEFT JOIN staff_shop_roles sr ON sr.staff_id = m.staff_id AND sr.shop_id = m.shop_id
     LEFT JOIN roles r ON r.id = sr.role_id
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

module.exports = {
  addMembership,
  createShop,
  getShopById,
  isPlatformShopManager,
  listAllShops,
  listAllStaffWithRolesAtShop,
  listRolesForStaffAtShop,
  listStaffWithRolesAtShop,
  listShopsForStaff,
};
