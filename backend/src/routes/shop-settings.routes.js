const express = require('express');
const shopSettingsController = require('../controllers/shop-settings.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorize');

const router = express.Router();

router.get('/shop-settings', requireAuthentication, shopSettingsController.getShopSettings);
router.put('/shop-settings', requireAuthentication, requireRole(['OWNER']), shopSettingsController.updateShopSettings);

module.exports = router;
