const express = require('express');
const appointmentController = require('../controllers/appointment.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorize');

const router = express.Router();

router.get('/appointments', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK', 'GROOMER']), appointmentController.listAppointments);
router.get('/booking-change-requests', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK']), appointmentController.listBookingChangeRequests);
router.patch('/booking-change-requests/:id', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK']), appointmentController.reviewBookingChangeRequest);
router.get('/notifications', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK', 'GROOMER']), appointmentController.listNotifications);
router.patch('/notifications/:id/read', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK', 'GROOMER']), appointmentController.markNotificationRead);
router.post('/notifications/read-all', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK', 'GROOMER']), appointmentController.markAllNotificationsRead);
router.get('/appointments/:id', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK', 'GROOMER']), appointmentController.getAppointment);
router.post('/appointments', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK']), appointmentController.createAppointment);
router.post('/appointments/:id/accept', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK']), appointmentController.acceptBookingRequest);
router.patch('/appointments/:id', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK']), appointmentController.updateAppointment);
router.delete('/appointments/:id', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK']), appointmentController.deleteAppointment);

module.exports = router;
