const express = require('express');
const groomingController = require('../controllers/grooming.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorize');

const router = express.Router();
const readRoles = requireRole(['OWNER', 'FRONT_DESK', 'GROOMER']);
const writeRoles = requireRole(['OWNER', 'GROOMER']);

router.get('/groomings', requireAuthentication, readRoles, groomingController.listGroomings);
router.get('/groomings/:id', requireAuthentication, readRoles, groomingController.getGrooming);
router.post('/groomings', requireAuthentication, writeRoles, groomingController.createGrooming);
router.patch('/groomings/:id', requireAuthentication, writeRoles, groomingController.updateGrooming);
router.post('/groomings/:id/complete', requireAuthentication, writeRoles, groomingController.completeGrooming);

module.exports = router;
