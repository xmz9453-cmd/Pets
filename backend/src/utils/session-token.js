const crypto = require('crypto');

function createSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  createSessionToken,
  hashSessionToken,
};
