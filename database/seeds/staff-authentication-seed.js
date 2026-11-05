const { getPool } = require('../../backend/src/config/database');
const { hashPassword } = require('../../backend/src/utils/password');

function getFoundationOwner() {
  return {
    username: process.env.AUTH_FOUNDATION_OWNER_USERNAME || 'owner',
    password: process.env.AUTH_FOUNDATION_OWNER_PASSWORD || 'foundation-password',
    displayName: process.env.AUTH_FOUNDATION_OWNER_DISPLAY_NAME || '老闆',
  };
}

function getFrontDeskStaff() {
  return {
    username: process.env.AUTH_FRONTDESK_USERNAME || 'frontdesk',
    password: process.env.AUTH_FRONTDESK_PASSWORD || 'frontdesk-password',
    displayName: process.env.AUTH_FRONTDESK_DISPLAY_NAME || '櫃台',
  };
}

async function seedStaffAuthentication() {
  const staffAccounts = [{ ...getFoundationOwner(), roleCode: 'OWNER' }];
  if (process.env.NODE_ENV !== 'production') {
    staffAccounts.push({ ...getFrontDeskStaff(), roleCode: 'FRONT_DESK' });
  }
  const pool = getPool();

  for (const staff of staffAccounts) {
    const passwordHash = await hashPassword(staff.password);

    await pool.query(
      `INSERT INTO staff (username, password_hash, display_name, status)
       VALUES (?, ?, ?, 'ACTIVE')
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash),
         display_name = VALUES(display_name),
         status = 'ACTIVE'`,
      [staff.username, passwordHash, staff.displayName],
    );

    const [staffRows] = await pool.query('SELECT id FROM staff WHERE username = ? LIMIT 1', [staff.username]);
    const [roleRows] = await pool.query('SELECT id FROM roles WHERE code = ? LIMIT 1', [staff.roleCode]);

    if (staffRows.length && roleRows.length) {
      await pool.query(
        'INSERT IGNORE INTO staff_roles (staff_id, role_id) VALUES (?, ?)',
        [staffRows[0].id, roleRows[0].id],
      );
      await pool.query(
        'INSERT IGNORE INTO staff_shop_memberships (staff_id, shop_id) VALUES (?, 1)',
        [staffRows[0].id],
      );
      await pool.query(
        'INSERT IGNORE INTO staff_shop_roles (staff_id, shop_id, role_id) VALUES (?, 1, ?)',
        [staffRows[0].id, roleRows[0].id],
      );
      if (staff.roleCode === 'OWNER') {
        await pool.query(
          'INSERT IGNORE INTO platform_shop_managers (staff_id) VALUES (?)',
          [staffRows[0].id],
        );
        await pool.query(
          'DELETE FROM platform_shop_managers WHERE staff_id <> ?',
          [staffRows[0].id],
        );
      }
    }
  }
}

module.exports = {
  getFoundationOwner,
  getFrontDeskStaff,
  seedStaffAuthentication,
};
