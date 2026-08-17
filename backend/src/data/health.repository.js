const { getPool } = require('../config/database');

async function verifyDatabaseConnection() {
  const [rows] = await getPool().query('SELECT 1 AS ok');
  return rows[0] && rows[0].ok === 1;
}

module.exports = {
  verifyDatabaseConnection,
};
