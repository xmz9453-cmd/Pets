const appointmentService = require('../services/appointment.service');

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

module.exports = {
  createAppointment,
  getAppointment,
  listAppointments,
  updateAppointment,
};
