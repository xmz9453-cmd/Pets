function normalizeLoginInput(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateLoginForm({ username, password }) {
  const normalizedUsername = normalizeLoginInput(username);
  const normalizedPassword = normalizeLoginInput(password);
  const errors = {};

  if (!normalizedUsername) {
    errors.username = '使用者名稱為必填';
  }

  if (!normalizedPassword) {
    errors.password = '密碼為必填';
  }

  return {
    ok: Object.keys(errors).length === 0,
    values: {
      username: normalizedUsername,
      password: normalizedPassword,
    },
    errors,
  };
}

function formatLoginError(message) {
  const normalizedMessage = typeof message === 'string' ? message : '';

  if (normalizedMessage === 'Invalid username or password') {
    return '帳號或密碼錯誤';
  }

  if (normalizedMessage === 'Unauthorized') {
    return '尚未登入或登入狀態已失效';
  }

  if (normalizedMessage === 'Internal Server Error') {
    return '發生錯誤';
  }

  if (!normalizedMessage) {
    return '發生錯誤';
  }

  return normalizedMessage;
}

module.exports = {
  normalizeLoginInput,
  validateLoginForm,
  formatLoginError,
};
