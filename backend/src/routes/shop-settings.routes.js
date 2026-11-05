const express = require('express');
const shopSettingsController = require('../controllers/shop-settings.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { requirePlatformShopManager, requireRole } = require('../middleware/authorize');
const { uploadShopLogo } = require('../middleware/shop-logo-upload');

const router = express.Router();

router.get('/public/shop-logos/:filename', shopSettingsController.getPublicShopLogo);
router.get('/shop-settings', requireAuthentication, requireRole(['OWNER']), shopSettingsController.getShopSettings);
router.get('/shop-identity', requireAuthentication, shopSettingsController.getShopIdentity);
router.put('/shop-settings', requireAuthentication, requireRole(['OWNER']), shopSettingsController.updateShopSettings);
router.post('/shop-settings/logo', requireAuthentication, requireRole(['OWNER']), uploadShopLogo, shopSettingsController.uploadShopLogo);
router.delete('/shop-settings/logo', requireAuthentication, requireRole(['OWNER']), shopSettingsController.deleteShopLogo);
router.post('/shop-settings/reset-operational-data', requireAuthentication, requirePlatformShopManager, shopSettingsController.resetOperationalData);
router.get('/shop-settings/booking-schedule', requireAuthentication, requireRole(['OWNER']), shopSettingsController.getBookingSchedule);
router.post('/shop-settings/booking-schedule/rules', requireAuthentication, requireRole(['OWNER']), shopSettingsController.createBookingScheduleRule);
router.put('/shop-settings/booking-schedule/rules/:id', requireAuthentication, requireRole(['OWNER']), shopSettingsController.updateBookingScheduleRule);
router.delete('/shop-settings/booking-schedule/rules/:id', requireAuthentication, requireRole(['OWNER']), shopSettingsController.deleteBookingScheduleRule);
router.post('/shop-settings/booking-schedule/overrides', requireAuthentication, requireRole(['OWNER']), shopSettingsController.createBookingScheduleOverride);
router.put('/shop-settings/booking-schedule/overrides/:id', requireAuthentication, requireRole(['OWNER']), shopSettingsController.updateBookingScheduleOverride);
router.delete('/shop-settings/booking-schedule/overrides/:id', requireAuthentication, requireRole(['OWNER']), shopSettingsController.deleteBookingScheduleOverride);
router.get('/shop-settings/booking-resources', requireAuthentication, requireRole(['OWNER']), shopSettingsController.getBookingResources);
router.post('/shop-settings/booking-resources', requireAuthentication, requireRole(['OWNER']), shopSettingsController.createBookingResource);
router.post('/shop-settings/booking-resources/:id/blocks', requireAuthentication, requireRole(['OWNER']), shopSettingsController.createBookingResourceBlock);
router.delete('/shop-settings/booking-resources/:id/blocks/:blockId', requireAuthentication, requireRole(['OWNER']), shopSettingsController.deleteBookingResourceBlock);
router.put('/shop-settings/booking-resources/:id', requireAuthentication, requireRole(['OWNER']), shopSettingsController.updateBookingResource);
router.delete('/shop-settings/booking-resources/:id', requireAuthentication, requireRole(['OWNER']), shopSettingsController.deleteBookingResource);
router.put('/shop-settings/booking-resources/:id/hours', requireAuthentication, requireRole(['OWNER']), shopSettingsController.saveBookingResourceHours);

module.exports = router;
