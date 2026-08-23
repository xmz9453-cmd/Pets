const express = require('express');
const reportController = require('../controllers/report.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorize');

const router = express.Router();
const readRoles = requireRole(['OWNER', 'FRONT_DESK', 'GROOMER']);

router.get('/reports', requireAuthentication, readRoles, reportController.getReport);

module.exports = router;