const publicBookingService = require('../services/public-booking.service');
const { config } = require('../config/env');
const { logError } = require('../utils/logger');

const CUSTOMER_CONFIRMATION_FAILURE = {
  success: false,
  error: {
    code: 'CUSTOMER_CONFIRMATION_FAILED',
    message: '手機號碼或姓名不正確，請確認後再試。',
  },
};

async function confirmExistingCustomer(req, res) {
  try {
    const { token } = await publicBookingService.confirmExistingCustomer(
      req.body?.phone,
      req.body?.name,
    );
    res.cookie('booking_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.nodeEnv === 'production',
      path: '/api/public/booking',
      maxAge: 2 * 60 * 60 * 1000,
    });
    res.status(200).json({
      success: true,
      data: { message: '身分確認成功。' },
    });
  } catch (error) {
    if (error.code !== 'CUSTOMER_CONFIRMATION_FAILED') {
      logError('Public booking customer confirmation failed', {
        path: req.path,
        method: req.method,
        message: error.message,
      });
    }
    res.status(error.code === 'CUSTOMER_CONFIRMATION_FAILED' ? 400 : 500)
      .json(CUSTOMER_CONFIRMATION_FAILURE);
  }
}

module.exports = { confirmExistingCustomer };
