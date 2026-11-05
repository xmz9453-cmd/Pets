const ERROR_MESSAGES = {
  RESET_BLOCKED_BY_SIGNED_CONTRACTS: '此店仍有已簽署的電子合約與簽名證據。為保留法律紀錄，資料未清除；請先另行確認合約保存與移轉方式。',
  RESET_CONFIRMATION_MISMATCH: '店家名稱確認不符，資料未清除。',
  RESET_ENVIRONMENT_NOT_ALLOWED: '此功能僅允許在本機 Development／Test 環境執行，資料未清除。',
  RESET_SHOP_CONTEXT_CHANGED: '目前選取的店家已變更，資料未清除。請重新開啟清除流程。',
  APPOINTMENT_DELETE_PROTECTED: '此預約已有相關營運資料，無法刪除。',
  APPOINTMENT_NOT_FOUND: '找不到指定的預約資料。',
  BOOKING_CAPACITY_UNAVAILABLE: '此預約時段已額滿，請選擇其他時段。',
  BOOKING_OTP_DISABLED: '預約不使用簡訊驗證，請改以會員登入。若登入方式尚未設定，請聯絡店家。',
  BOOKING_PRODUCT_UNAVAILABLE: '部分加購商品目前庫存不足，請重新確認。',
  BOOKING_RESOURCE_DUPLICATE: '資源名稱或員工已存在，請檢查後再試。',
  BOOKING_RESOURCE_IN_USE: '此資源已有預約指派或時段衝突，無法停用或刪除。',
  BOOKING_RESOURCE_NOT_FOUND: '找不到指定的排程資源。',
  BOOKING_RESOURCE_UNAVAILABLE: '資源時段已被安排，請調整排程資源或預約時間。',
  BOOKING_SLOT_UNAVAILABLE: '所選時段已不可申請，請重新選擇。',
  BOOKING_STATUS_TRANSITION_INVALID: '線上預約申請僅能由店家接受或取消；會員補齊資料與簽署契約後才會正式確認。',
  CUSTOMER_AUTH_CODE_EXCHANGE_FAILED: '登入驗證未成功，請重新嘗試。',
  CUSTOMER_AUTH_IDENTITY_IN_USE: '此登入方式已連結至其他會員，無法自動合併。',
  CUSTOMER_AUTH_INVALID_CALLBACK: '登入資料不完整，請重新嘗試。',
  CUSTOMER_AUTH_INVALID_ID_TOKEN: '登入驗證未成功，請重新嘗試。',
  CUSTOMER_AUTH_PROVIDER_ALREADY_LINKED: '此會員已連結相同的登入方式。',
  CUSTOMER_AUTH_PROVIDER_INVALID: '不支援此登入方式。',
  CUSTOMER_AUTH_PROVIDER_NOT_CONFIGURED: '此登入方式尚未完成設定，請改用其他已開放的登入方式。',
  CUSTOMER_AUTH_PROVIDER_UNAVAILABLE: '目前無法驗證登入資料，請稍後再試。',
  CUSTOMER_AUTH_REAUTH_REQUIRED: '請重新登入後，再連結其他登入方式。',
  CUSTOMER_AUTH_STATE_INVALID: '登入要求已失效，請重新開始。',
  CUSTOMER_MEMBER_INACTIVE: '此會員目前無法登入，請聯絡店家。',
  CUSTOMER_MEMBER_LINK_REQUIRED: '此客戶資料尚未連結會員，請先由店家核對並完成連結。',
  CUSTOMER_ONBOARDING_FORBIDDEN: '此補件資料僅限已登入且具備權限的會員查看。',
  CUSTOMER_ONBOARDING_LINK_DISABLED: '此補件流程不會搜尋或自動連結既有客戶或寵物資料。',
  CUSTOMER_ONBOARDING_NOT_FOUND: '找不到待補資料的預約。',
  CUSTOMER_SESSION_INVALID: '登入工作階段已失效，請重新登入。',
  OTP_ATTEMPTS_EXCEEDED: '驗證次數已達上限，請重新取得驗證碼。',
  OTP_INVALID: '驗證碼錯誤或已過期，請重新確認。',
  OTP_RATE_LIMITED: '驗證碼取得次數已達上限，請稍後再試。',
  OTP_RESEND_TOO_SOON: '請稍候再重新取得驗證碼。',
  SMS_VERIFICATION_UNAVAILABLE: '店家的簡訊驗證尚未完成設定，請聯絡店家協助預約。',
  BOARDING_NOT_FOUND: '找不到住宿資料。',
  CUSTOMER_DELETE_PROTECTED: '此客戶已有相關營運資料，無法刪除。',
  CUSTOMER_NOT_FOUND: '找不到指定的客戶資料。',
  DAILY_OPERATION_NOT_FOUND: '找不到指定的日常營運資料。',
  GROOMING_NOT_FOUND: '找不到美容資料。',
  ORDER_NOT_FOUND: '找不到指定的訂單資料。',
  ORDER_DELETE_PROTECTED: '此訂單已有相關營運資料，無法刪除。',
  PET_DELETE_PROTECTED: '此寵物已有相關營運資料，無法刪除。',
  PET_NOT_FOUND: '找不到指定的寵物資料。',
  PRODUCT_IN_USE: '此商品已有訂單或預約紀錄，無法刪除；如不再販售，請改為停用。',
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
