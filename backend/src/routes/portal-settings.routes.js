const express = require('express');
const controller = require('../controllers/portal-settings.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorize');

const router = express.Router();

router.get('/public/portal-settings/:code', controller.getPublicSettings);
router.get('/portal-settings', requireAuthentication, requireRole(['OWNER']), controller.getSettings);
router.put('/portal-settings', requireAuthentication, requireRole(['OWNER']), controller.updateSettings);

module.exports = router;
