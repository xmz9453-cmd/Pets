const { getPool } = require('../config/database');

async function get(shopId) {
  const [rows] = await getPool().query(
    'SELECT footer_text FROM portal_settings WHERE shop_id = ? LIMIT 1',
    [shopId],
  );
  if (!rows.length) {
    throw new Error('Portal settings record is missing');
  }
  return { footer_text: rows[0].footer_text };
}

async function updateFooterText(shopId, footerText) {
  await getPool().query(
    `INSERT INTO portal_settings (shop_id, footer_text) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE footer_text = VALUES(footer_text)`,
    [shopId, footerText],
  );
  return get(shopId);
}

module.exports = { get, updateFooterText };
