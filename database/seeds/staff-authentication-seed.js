const { getPool } = require('../../backend/src/config/database');
const { hashPassword } = require('../../backend/src/utils/password');

function getFoundationOwner() {
  return {
    username: process.env.AUTH_FOUNDATION_OWNER_USERNAME || 'owner',
    password: process.env.AUTH_FOUNDATION_OWNER_PASSWORD || 'foundation-password',
    displayName: process.env.AUTH_FOUNDATION_OWNER_DISPLAY_NAME || 'Foundation Owner',
  };
}

async function seedStaffAuthentication() {
  const owner = getFoundationOwner();
  const passwordHash = await hashPassword(owner.password);
  const pool = getPool();

  await pool.query(
    `INSERT INTO staff (username, password_hash, display_name, status)
     VALUES (?, ?, ?, 'ACTIVE')
     ON DUPLICATE KEY UPDATE
       password_hash = VALUES(password_hash),
       display_name = VALUES(display_name),
       status = 'ACTIVE'`,
    [owner.username, passwordHash, owner.displayName],
  );

  const [staffRows] = await pool.query('SELECT id FROM staff WHERE username = ? LIMIT 1', [owner.username]);
  const [roleRows] = await pool.query('SELECT id FROM roles WHERE code = ? LIMIT 1', ['OWNER']);

  if (staffRows.length && roleRows.length) {
    await pool.query(
      'INSERT IGNORE INTO staff_roles (staff_id, role_id) VALUES (?, ?)',
      [staffRows[0].id, roleRows[0].id],
    );
  }
}

module.exports = {
  getFoundationOwner,
  seedStaffAuthentication,
};
