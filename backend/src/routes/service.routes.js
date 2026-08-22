const express = require('express');
const serviceController = require('../controllers/service.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorize');

const router = express.Router();
const readRoles = requireRole(['OWNER', 'FRONT_DESK', 'GROOMER']);
const writeRoles = requireRole(['OWNER', 'FRONT_DESK']);
router.get('/services', requireAuthentication, readRoles, serviceController.listServices);
router.get('/services/:id', requireAuthentication, readRoles, serviceController.getService);
router.post('/services', requireAuthentication, writeRoles, serviceController.createService);
router.put('/services/:id', requireAuthentication, writeRoles, serviceController.updateService);
router.delete('/services/:id', requireAuthentication, writeRoles, serviceController.deleteService);
module.exports = router;