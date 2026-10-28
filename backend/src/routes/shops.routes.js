const express = require('express');
const shopsController = require('../controllers/shops.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { requirePlatformShopManager } = require('../middleware/authorize');

const router = express.Router();

router.get('/shops', requireAuthentication, shopsController.list);
router.post('/shops', requireAuthentication, requirePlatformShopManager, shopsController.create);
router.get('/shops/staff', requireAuthentication, requirePlatformShopManager, shopsController.listStaff);
router.patch('/shops/staff/:id/roles', requireAuthentication, requirePlatformShopManager, shopsController.updateStaffRoles);

module.exports = router;
