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

const BOOKING_SESSION_FAILURE = {
  success: false,
  error: {
    code: 'BOOKING_SESSION_INVALID',
    message: '預約工作階段無效或已過期，請重新確認身分。',
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

async function listPets(req, res, next) {
  const cookie = (req.headers.cookie || '')
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith('booking_session='));
  const token = cookie ? cookie.slice('booking_session='.length) : '';

  try {
    const result = await publicBookingService.listPetsForBookingSession(token);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error.code === 'BOOKING_SESSION_INVALID') {
      res.clearCookie('booking_session', {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.nodeEnv === 'production',
        path: '/api/public/booking',
      });
      res.status(401).json(BOOKING_SESSION_FAILURE);
      return;
    }

    next(error);
  }
}

async function listServices(req, res, next) {
  const cookie = (req.headers.cookie || '')
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith('booking_session='));
  const token = cookie ? cookie.slice('booking_session='.length) : '';

  try {
    const result = await publicBookingService.listServicesForBookingSession(token, req.query.pet_id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error.code === 'BOOKING_SESSION_INVALID') {
      res.clearCookie('booking_session', {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.nodeEnv === 'production',
        path: '/api/public/booking',
      });
      res.status(401).json(BOOKING_SESSION_FAILURE);
      return;
    }

    next(error);
  }
}

module.exports = { confirmExistingCustomer, listPets, listServices };
