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

function getUserFacingErrorMessage(error, statusCode, fallback = '系統發生錯誤，請稍後再試。') {
  const code = error?.code;
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }

  if (statusCode === 400 || code === 'VALIDATION_ERROR') {
    return '請確認輸入資料。';
  }

  if (statusCode === 401 || error?.message === 'Unauthorized') {
    return '請先登入。';
  }

  if (statusCode === 403 || error?.message === 'Forbidden') {
    return '您沒有權限執行此操作。';
  }

  if (statusCode === 404 || error?.message === 'Not found') {
    return '找不到指定的資料。';
  }

  if (error?.message === 'Internal Server Error' || error?.message === 'Internal server error') {
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