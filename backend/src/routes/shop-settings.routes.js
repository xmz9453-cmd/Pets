const express = require('express');
const shopSettingsController = require('../controllers/shop-settings.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorize');

const router = express.Router();

router.get('/shop-settings', requireAuthentication, requireRole(['OWNER']), shopSettingsController.getShopSettings);
router.get('/shop-identity', requireAuthentication, shopSettingsController.getShopIdentity);
router.put('/shop-settings', requireAuthentication, requireRole(['OWNER']), shopSettingsController.updateShopSettings);
router.post('/shop-settings/reset-operational-data', requireAuthentication, requireRole(['OWNER']), shopSettingsController.resetOperationalData);

module.exports = router;
