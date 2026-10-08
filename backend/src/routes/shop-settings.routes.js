const express = require('express');
const shopSettingsController = require('../controllers/shop-settings.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorize');

const router = express.Router();

router.get('/shop-settings', requireAuthentication, requireRole(['OWNER']), shopSettingsController.getShopSettings);
router.get('/shop-identity', requireAuthentication, shopSettingsController.getShopIdentity);
router.put('/shop-settings', requireAuthentication, requireRole(['OWNER']), shopSettingsController.updateShopSettings);
router.post('/shop-settings/reset-operational-data', requireAuthentication, requireRole(['OWNER']), shopSettingsController.resetOperationalData);
router.get('/shop-settings/booking-schedule', requireAuthentication, requireRole(['OWNER']), shopSettingsController.getBookingSchedule);
router.post('/shop-settings/booking-schedule/rules', requireAuthentication, requireRole(['OWNER']), shopSettingsController.createBookingScheduleRule);
router.put('/shop-settings/booking-schedule/rules/:id', requireAuthentication, requireRole(['OWNER']), shopSettingsController.updateBookingScheduleRule);
router.delete('/shop-settings/booking-schedule/rules/:id', requireAuthentication, requireRole(['OWNER']), shopSettingsController.deleteBookingScheduleRule);
router.post('/shop-settings/booking-schedule/overrides', requireAuthentication, requireRole(['OWNER']), shopSettingsController.createBookingScheduleOverride);
router.put('/shop-settings/booking-schedule/overrides/:id', requireAuthentication, requireRole(['OWNER']), shopSettingsController.updateBookingScheduleOverride);
router.delete('/shop-settings/booking-schedule/overrides/:id', requireAuthentication, requireRole(['OWNER']), shopSettingsController.deleteBookingScheduleOverride);

module.exports = router;
