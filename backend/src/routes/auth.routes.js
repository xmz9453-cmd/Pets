const express = require('express');
const authController = require('../controllers/auth.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { requirePlatformShopManager, requireRole } = require('../middleware/authorize');

const router = express.Router();

router.post('/auth/login', authController.login);
router.post('/auth/logout', authController.logout);
router.get('/auth/me', requireAuthentication, authController.getCurrentStaff);
router.post('/auth/password', requireAuthentication, authController.changeOwnPassword);
router.get('/auth/staff', requireAuthentication, requireRole(['OWNER']), authController.listStaff);
router.post('/auth/staff', requireAuthentication, requirePlatformShopManager, authController.createStaff);
router.post('/auth/staff/:id/password', requireAuthentication, requirePlatformShopManager, authController.resetOtherPassword);
router.patch('/auth/staff/:id/roles', requireAuthentication, requireRole(['OWNER']), authController.updateStaffRoles);
router.delete('/auth/staff/:id/membership', requireAuthentication, requireRole(['OWNER']), authController.removeStaffMembership);
router.patch('/auth/staff/:id/status', requireAuthentication, requirePlatformShopManager, authController.updateStaffStatus);

module.exports = router;
