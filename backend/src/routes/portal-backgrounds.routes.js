const express = require('express');
const controller = require('../controllers/portal-backgrounds.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { requirePlatformShopManager } = require('../middleware/authorize');
const { uploadPortalBackground } = require('../middleware/portal-background-upload');

const router = express.Router();

router.get('/public/portal-background', controller.getPublicSelection);
router.get('/public/portal-background/image', controller.getActiveImage);
router.get('/portal-backgrounds', requireAuthentication, requirePlatformShopManager, controller.list);
router.post(
  '/portal-backgrounds',
  requireAuthentication,
  requirePlatformShopManager,
  uploadPortalBackground,
  controller.upload,
);
router.get('/portal-backgrounds/:id/image', requireAuthentication, requirePlatformShopManager, controller.getManagedImage);
router.put('/portal-backgrounds/:id/active', requireAuthentication, requirePlatformShopManager, controller.activate);
router.delete('/portal-backgrounds/:id', requireAuthentication, requirePlatformShopManager, controller.remove);

module.exports = router;
