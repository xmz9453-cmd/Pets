function createProviderNotConfiguredError() {
  const error = new Error('SMS delivery provider has not been configured');
  error.statusCode = 503;
  error.code = 'SMS_PROVIDER_NOT_CONFIGURED';
  return error;
}

async function sendBookingOtp() {
  throw createProviderNotConfiguredError();
}

module.exports = { sendBookingOtp };
