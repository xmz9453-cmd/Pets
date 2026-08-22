const mysql = require('mysql2/promise');
const { config } = require('./env');

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      dateStrings: true,
      timezone: '+00:00',
      typeCast: function cast(field, next) {
        if (field.type === 'DATE' || field.type === 'DATETIME' || field.type === 'TIMESTAMP' || field.type === 'TIME') {
          return field.string();
        }
        return next();
      },
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  return pool;
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

module.exports = {
  getPool,
  closePool,
};
