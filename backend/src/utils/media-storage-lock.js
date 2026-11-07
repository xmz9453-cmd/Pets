const { getPool } = require('../config/database');

const MEDIA_STORAGE_LOCK_NAME = 'pets_media_backup';

async function withMediaStorageLock(operation) {
  const connection = await getPool().getConnection();
  let acquired = false;
  try {
    const [[result]] = await connection.query('SELECT GET_LOCK(?, 30) AS acquired', [MEDIA_STORAGE_LOCK_NAME]);
    acquired = Number(result.acquired) === 1;
    if (!acquired) {
      const error = new Error('Media storage is busy; try again');
      error.statusCode = 503;
      error.code = 'MEDIA_STORAGE_BUSY';
      throw error;
    }
    return await operation();
  } finally {
    try {
      if (acquired) await connection.query('SELECT RELEASE_LOCK(?)', [MEDIA_STORAGE_LOCK_NAME]);
    } finally {
      connection.release();
    }
  }
}

module.exports = { MEDIA_STORAGE_LOCK_NAME, withMediaStorageLock };
