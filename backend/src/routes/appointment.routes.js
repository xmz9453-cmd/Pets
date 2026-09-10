const express = require('express');
const appointmentController = require('../controllers/appointment.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorize');

const router = express.Router();

router.get('/appointments', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK', 'GROOMER']), appointmentController.listAppointments);
router.get('/appointments/:id', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK', 'GROOMER']), appointmentController.getAppointment);
router.post('/appointments', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK']), appointmentController.createAppointment);
router.patch('/appointments/:id', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK']), appointmentController.updateAppointment);
router.delete('/appointments/:id', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK']), appointmentController.deleteAppointment);

module.exports = router;
