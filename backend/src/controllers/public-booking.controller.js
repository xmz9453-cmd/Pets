const publicBookingService = require('../services/public-booking.service');
const { config } = require('../config/env');

const BOOKING_SESSION_FAILURE = {
  success: false,
  error: {
    code: 'BOOKING_SESSION_INVALID',
    message: '預約工作階段無效或已過期，請重新驗證手機。',
  },
};

function rejectOtp(req, res) {
  res.status(410).json({
    success: false,
    error: {
      code: 'BOOKING_OTP_DISABLED',
      message: '預約不使用簡訊驗證，請改以會員登入。若登入方式尚未設定，請聯絡店家。',
    },
  });
}

function getBookingSessionToken(req) {
  const cookie = (req.headers.cookie || '')
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith('booking_session='));
  return cookie ? cookie.slice('booking_session='.length) : '';
}

function setBookingSessionCookie(res, token) {
  res.cookie('booking_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    path: '/api/public/booking',
    maxAge: 2 * 60 * 60 * 1000,
  });
}

async function requestOtp(req, res, next) {
  try {
    const result = await publicBookingService.sendOtp(req.body?.phone);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error.code === 'SMS_PROVIDER_NOT_CONFIGURED' || error.code === 'BOOKING_OTP_NOT_CONFIGURED') {
      res.status(503).json({
        success: false,
        error: {
          code: 'SMS_VERIFICATION_UNAVAILABLE',
          message: '店家的簡訊驗證尚未完成設定，請聯絡店家協助預約。',
        },
      });
      return;
    }
    next(error);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const { token } = await publicBookingService.verifyOtp(req.body?.phone, req.body?.code);
    setBookingSessionCookie(res, token);
    res.status(200).json({
      success: true,
      data: { message: '手機驗證成功。' },
    });
  } catch (error) {
    next(error);
  }
}

async function listPets(req, res, next) {
  try {
    const result = await publicBookingService.listPetsForBookingSession(getBookingSessionToken(req));
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
  try {
    const result = await publicBookingService.listServicesForBookingSession(
      getBookingSessionToken(req),
      req.query.pet_id,
    );
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

async function listAvailability(req, res, next) {
  try {
    const result = await publicBookingService.listAvailability(getBookingSessionToken(req), req.query);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function createBookingRequest(req, res, next) {
  try {
    const result = await publicBookingService.createBookingRequest(getBookingSessionToken(req), req.body || {});
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  rejectOtp,
  createBookingRequest,
  listAvailability,
  listPets,
  listServices,
  requestOtp,
  verifyOtp,
};
