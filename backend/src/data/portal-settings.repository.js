const { getPool } = require('../config/database');

async function get() {
  const [rows] = await getPool().query(
    'SELECT footer_text FROM portal_settings WHERE id = 1 LIMIT 1',
  );
  if (!rows.length) {
    throw new Error('Portal settings record is missing');
  }
  return { footer_text: rows[0].footer_text };
}

async function updateFooterText(footerText) {
  await getPool().query(
    `INSERT INTO portal_settings (id, footer_text) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE footer_text = VALUES(footer_text)`,
    [footerText],
  );
  return get();
}

module.exports = { get, updateFooterText };
