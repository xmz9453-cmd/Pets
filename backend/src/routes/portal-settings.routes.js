const express = require('express');
const controller = require('../controllers/portal-settings.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { requirePlatformShopManager } = require('../middleware/authorize');

const router = express.Router();

router.get('/public/portal-settings', controller.getPublicSettings);
router.get('/portal-settings', requireAuthentication, requirePlatformShopManager, controller.getSettings);
router.put('/portal-settings', requireAuthentication, requirePlatformShopManager, controller.updateSettings);

module.exports = router;
