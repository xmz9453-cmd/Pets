const appointmentService = require('../services/appointment.service');
const bookingChangeService = require('../services/booking-change.service');

function sendSuccess(res, payload, statusCode = 200) {
  res.status(statusCode).json({
    success: true,
    data: payload,
  });
}

async function listAppointments(req, res, next) {
  try {
    const result = await appointmentService.listAppointments(req.query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function getAppointment(req, res, next) {
  try {
    const result = await appointmentService.getAppointmentById(req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function createAppointment(req, res, next) {
  try {
    const result = await appointmentService.createAppointment(req.body || {});
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

async function updateAppointment(req, res, next) {
  try {
    const result = await appointmentService.updateAppointment(req.params.id, req.body || {});
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function acceptBookingRequest(req, res, next) {
  try {
    const result = await appointmentService.updateAppointment(req.params.id, { status: 'AWAITING_CUSTOMER' });
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function listBookingChangeRequests(req, res, next) {
  try {
    const result = await bookingChangeService.listStaffChangeRequests();
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function reviewBookingChangeRequest(req, res, next) {
  try {
    const result = await appointmentService.reviewBookingChangeRequest(
      req.params.id,
      req.body || {},
      req.auth.staff.id,
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function listNotifications(req, res, next) {
  try {
    const result = await bookingChangeService.listNotifications();
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const result = await bookingChangeService.markNotificationRead(req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function markAllNotificationsRead(req, res, next) {
  try {
    const result = await bookingChangeService.markAllNotificationsRead();
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function deleteAppointment(req, res, next) {
  try {
    const result = await appointmentService.deleteAppointment(req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createAppointment,
  acceptBookingRequest,
  deleteAppointment,
  getAppointment,
  listBookingChangeRequests,
  listAppointments,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  reviewBookingChangeRequest,
  updateAppointment,
};
