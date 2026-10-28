const { getPool } = require('../config/database');
const { getCurrentShopId } = require('../utils/shop-context');

async function listCompletedByCustomerId(customerId) {
  const [rows] = await getPool().query(
    `SELECT ch.id, ch.contract_version_id, ch.version, ch.agreed_at
     FROM contract_history ch
     INNER JOIN onboardings o ON o.id = ch.onboarding_id AND o.shop_id = ch.shop_id
     WHERE ch.customer_id = ? AND ch.shop_id = ? AND o.status = 'COMPLETED'
     ORDER BY ch.agreed_at DESC, ch.id DESC`,
    [customerId, getCurrentShopId()],
  );

  return rows.map((row) => ({
    ...row,
    id: Number(row.id),
    contract_version_id: Number(row.contract_version_id),
  }));
}

async function getCompletedByCustomerAndId(customerId, historyId) {
  const [rows] = await getPool().query(
    `SELECT ch.id, ch.customer_id, ch.contract_version_id, ch.version,
            ch.storage_path, ch.pdf_hash, ch.signature_hash, ch.agreed_at,
            cv.file_name, cv.mime_type, cv.file_size
     FROM contract_history ch
     INNER JOIN onboardings o ON o.id = ch.onboarding_id AND o.shop_id = ch.shop_id
     INNER JOIN contract_versions cv ON cv.id = ch.contract_version_id AND cv.shop_id = ch.shop_id
     WHERE ch.customer_id = ? AND ch.id = ? AND ch.shop_id = ? AND o.status = 'COMPLETED'
     LIMIT 1`,
    [customerId, historyId, getCurrentShopId()],
  );

  return rows[0] || null;
}

async function getCompletedSignatureByCustomerAndId(customerId, historyId) {
  const [rows] = await getPool().query(
    `SELECT ch.signature_evidence, ch.signature_hash
     FROM contract_history ch
     INNER JOIN onboardings o ON o.id = ch.onboarding_id AND o.shop_id = ch.shop_id
     WHERE ch.customer_id = ? AND ch.id = ? AND ch.shop_id = ? AND o.status = 'COMPLETED'
     LIMIT 1`,
    [customerId, historyId, getCurrentShopId()],
  );

  return rows[0] || null;
}

module.exports = {
  getCompletedByCustomerAndId,
  getCompletedSignatureByCustomerAndId,
  listCompletedByCustomerId,
};
