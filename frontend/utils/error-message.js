const ERROR_MESSAGES = {
  APPOINTMENT_DELETE_PROTECTED: '此預約已有相關營運資料，無法刪除。',
  APPOINTMENT_NOT_FOUND: '找不到指定的預約資料。',
  BOARDING_NOT_FOUND: '找不到住宿資料。',
  CUSTOMER_DELETE_PROTECTED: '此客戶已有相關營運資料，無法刪除。',
  CUSTOMER_NOT_FOUND: '找不到指定的客戶資料。',
  DAILY_OPERATION_NOT_FOUND: '找不到指定的日常營運資料。',
  GROOMING_NOT_FOUND: '找不到美容資料。',
  ORDER_NOT_FOUND: '找不到指定的訂單資料。',
  ORDER_DELETE_PROTECTED: '此訂單已有相關營運資料，無法刪除。',
  PET_DELETE_PROTECTED: '此寵物已有相關營運資料，無法刪除。',
  PET_NOT_FOUND: '找不到指定的寵物資料。',
  PRODUCT_NOT_FOUND: '找不到指定的商品資料。',
  SERVICE_IN_USE: '此服務已有使用紀錄，無法刪除。',
  SERVICE_NOT_FOUND: '找不到指定的服務資料。',
};

const KNOWN_MESSAGE_TRANSLATIONS = {
  'Service name already exists': '服務名稱已存在',
  'Product name already exists': '商品名稱已存在',
  'Invalid username or password': '帳號或密碼錯誤。',
  'Unauthorized': '請先登入。',
  'Forbidden': '您沒有權限執行此操作。',
  'Not found': '找不到指定的資料。',
  'Internal Server Error': '系統發生錯誤，請稍後再試。',
  'Internal server error': '系統發生錯誤，請稍後再試。',
};

function getValidationDetailMessage(error) {
  if (!error || typeof error !== 'object') {
    return '';
  }

  if (error.fields && typeof error.fields === 'object') {
    const fieldValues = Object.values(error.fields).filter((value) => typeof value === 'string' && value.trim());
    if (fieldValues.length > 0) {
      return fieldValues[0].trim();
    }
  }

  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message.trim();
  }

  return '';
}

function translateKnownMessage(message) {
  if (typeof message !== 'string') {
    return '';
  }

  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    return '';
  }

  if (KNOWN_MESSAGE_TRANSLATIONS[trimmedMessage]) {
    return KNOWN_MESSAGE_TRANSLATIONS[trimmedMessage];
  }

  if (/already exists/i.test(trimmedMessage)) {
    if (/service/i.test(trimmedMessage)) {
      return '服務名稱已存在';
    }
    if (/product/i.test(trimmedMessage)) {
      return '商品名稱已存在';
    }
  }

  return '';
}

function getUserFacingErrorMessage(error, statusCode, fallback = '系統發生錯誤，請稍後再試。') {
  const code = error?.code;
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }

  const validationDetail = getValidationDetailMessage(error);
  const translatedValidationDetail = translateKnownMessage(validationDetail);
  if (translatedValidationDetail) {
    return translatedValidationDetail;
  }

  const translatedMessage = translateKnownMessage(error?.message);
  if (translatedMessage) {
    return translatedMessage;
  }

  if (statusCode === 400 || code === 'VALIDATION_ERROR') {
    return '請確認輸入資料。';
  }

  if (statusCode === 401 && error?.message === 'Invalid username or password') {
    return '帳號或密碼錯誤。';
  }

  if (statusCode === 401) {
    return '請先登入。';
  }

  if (statusCode === 403) {
    return '您沒有權限執行此操作。';
  }

  if (statusCode === 404) {
    return '找不到指定的資料。';
  }

  if (statusCode === 500) {
    return fallback;
  }

  if (typeof error?.message === 'string' && /[\u4e00-\u9fff]/.test(error.message)) {
    return error.message;
  }

  return fallback;
}

module.exports = {
  ERROR_MESSAGES,
  getUserFacingErrorMessage,
};