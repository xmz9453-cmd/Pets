const express = require('express');
const boardingController = require('../controllers/boarding.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorize');

const router = express.Router();
const readRoles = requireRole(['OWNER', 'FRONT_DESK', 'GROOMER']);
const writeRoles = requireRole(['OWNER', 'FRONT_DESK', 'GROOMER']);

router.get('/boardings', requireAuthentication, readRoles, boardingController.listBoardings);
router.get('/boardings/:id', requireAuthentication, readRoles, boardingController.getBoarding);
router.post('/boardings', requireAuthentication, writeRoles, boardingController.createBoarding);
router.patch('/boardings/:id', requireAuthentication, writeRoles, boardingController.updateBoarding);
router.post('/boardings/:id/check-in', requireAuthentication, writeRoles, boardingController.checkIn);
router.post('/boardings/:id/check-out', requireAuthentication, writeRoles, boardingController.checkOut);

module.exports = router;
