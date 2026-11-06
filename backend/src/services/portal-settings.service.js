const repository = require('../data/portal-settings.repository');

const MAX_FOOTER_TEXT_LENGTH = 300;

async function getPublicSettings() {
  return repository.get();
}

async function getSettings() {
  return repository.get();
}

async function updateSettings(payload = {}) {
  const footerText = payload.footer_text;
  if (typeof footerText !== 'string' || Array.from(footerText).length > MAX_FOOTER_TEXT_LENGTH) {
    const error = new Error('入口版權文字不可超過 300 個字元。');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  return repository.updateFooterText(footerText.trim());
}

module.exports = { getPublicSettings, getSettings, updateSettings };
