const shopSettingsRepository = require('../data/shop-settings.repository');
const shopsRepository = require('../data/shops.repository');
const { getPool } = require('../config/database');
const { getCurrentShopId } = require('../utils/shop-context');
const { resetOperationalDataForApplication } = require('../../../database/scripts/reset-operational-data');

const WEEKDAYS = shopSettingsRepository.WEEKDAYS;

function createValidationError(fields) {
  const error = new Error('Validation failed');
  error.statusCode = 400;
  error.code = 'VALIDATION_ERROR';
  error.fields = fields;
  return error;
}

function createNotFoundError(code, message) {
  const error = new Error(message);
  error.statusCode = 404;
  error.code = code;
  return error;
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value).trim();
}

function isValidTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''));
}

function validateBusinessHours(hours) {
  const errors = {};
  const normalized = Array.isArray(hours) ? hours : [];

  if (normalized.length !== 7) {
    errors.business_hours = 'Business hours must include all 7 days';
    return errors;
  }

  const map = new Map();
  for (let index = 0; index < normalized.length; index += 1) {
    const item = normalized[index] || {};
    const weekday = String(item.weekday || '').toUpperCase();

    if (!WEEKDAYS.includes(weekday)) {
      errors[`business_hours[${index}].weekday`] = 'Weekday is invalid';
      continue;
    }

    if (map.has(weekday)) {
      errors[`business_hours[${index}].weekday`] = 'Weekday must be unique';
      continue;
    }
    map.set(weekday, true);

    const isClosed = Boolean(item.is_closed);
    const openTime = normalizeText(item.open_time);
    const closeTime = normalizeText(item.close_time);

    if (isClosed) {
      if (openTime !== null && openTime !== '') {
        errors[`business_hours[${index}].open_time`] = 'Open time must be empty when closed';
      }
      if (closeTime !== null && closeTime !== '') {
        errors[`business_hours[${index}].close_time`] = 'Close time must be empty when closed';
      }
      continue;
    }

    if (!openTime || !closeTime) {
      errors[`business_hours[${index}]`] = 'Open and close times are required for open days';
      continue;
    }

    if (!isValidTime(openTime) || !isValidTime(closeTime)) {
      errors[`business_hours[${index}]`] = 'Open and close times must use HH:MM format';
      continue;
    }

    if (openTime >= closeTime) {
      errors[`business_hours[${index}]`] = 'Open time must be earlier than close time';
    }
  }

  return errors;
}

function validateShopPayload(payload = {}) {
  const errors = {};
  const name = normalizeText(payload.name);
  const phone = normalizeText(payload.phone);
  const address = normalizeText(payload.address);
  const email = normalizeText(payload.email);

  if (!name) {
    errors.name = 'Name is required';
  } else if (name.length > 200) {
    errors.name = 'Name must be 200 characters or less';
  }

  if (phone !== null && phone !== '' && phone.length > 30) {
    errors.phone = 'Phone must be 30 characters or less';
  }

  if (address !== null && address !== '' && address.length > 255) {
    errors.address = 'Address must be 255 characters or less';
  }

  if (email !== null && email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Email format is invalid';
  }

  return errors;
}

async function withTransaction(handler) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await handler(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getShopSettings() {
  return shopSettingsRepository.getShopSettingsWithHours();
}

async function getShopIdentity() {
  const shop = await shopSettingsRepository.getShopSettings();
  return { shop: { name: shop?.name || '店家' } };
}

async function updateShopSettings(payload = {}) {
  const shopErrors = validateShopPayload(payload);
  const businessHourErrors = validateBusinessHours(payload.business_hours || []);
  const validationErrors = { ...shopErrors, ...businessHourErrors };

  if (Object.keys(validationErrors).length > 0) {
    throw createValidationError(validationErrors);
  }

  const normalizedShop = {
    name: normalizeText(payload.name),
    phone: normalizeText(payload.phone),
    address: normalizeText(payload.address),
    email: normalizeText(payload.email),
  };

  const normalizedBusinessHours = (payload.business_hours || []).map((entry) => {
    const weekday = String(entry.weekday || '').toUpperCase();
    const isClosed = Boolean(entry.is_closed);
    return {
      weekday,
      is_closed: isClosed,
      open_time: isClosed ? null : normalizeText(entry.open_time),
      close_time: isClosed ? null : normalizeText(entry.close_time),
    };
  });

  return withTransaction(async (connection) => {
    const existing = await shopSettingsRepository.getShopSettings(connection);

    let shop;
    if (!existing) {
      shop = await shopSettingsRepository.createShopSettings(normalizedShop, connection);
    } else {
      shop = await shopSettingsRepository.updateShopSettings(existing.id, normalizedShop, connection);
    }

    await connection.query('UPDATE shops SET name = ? WHERE id = ?', [normalizedShop.name, getCurrentShopId()]);

    await shopSettingsRepository.upsertBusinessHours(normalizedBusinessHours, connection);

    const complete = await shopSettingsRepository.getShopSettingsWithHours(connection);
    return {
      shop: complete.shop,
      business_hours: complete.business_hours,
    };
  });
}

async function resetOperationalData({ confirmation, expectedShopId } = {}) {
  const shopId = getCurrentShopId();
  if (!shopId || Number(expectedShopId) !== shopId) {
    const error = new Error('目前選取的店家已變更，資料未清除。請重新開啟清除流程。');
    error.statusCode = 409;
    error.code = 'RESET_SHOP_CONTEXT_CHANGED';
    throw error;
  }
  const shop = await shopsRepository.getShopById(shopId);
  if (!shop || typeof confirmation !== 'string' || confirmation.trim() !== shop.name) {
    const error = new Error('店家名稱確認不符，資料未清除。');
    error.statusCode = 400;
    error.code = 'RESET_CONFIRMATION_MISMATCH';
    throw error;
  }
  const result = await resetOperationalDataForApplication({
    shopId,
    confirmation,
  });
  return {
    reset: true,
    shop_id: result.shop_id,
    reset_counts: result.resetCounts,
    message: '目前店家的測試／營運資料已清除；店家設定、員工資料與已簽署的合約紀錄均保留。',
  };
}

module.exports = {
  createNotFoundError,
  getShopSettings,
  getShopIdentity,
  resetOperationalData,
  updateShopSettings,
};
