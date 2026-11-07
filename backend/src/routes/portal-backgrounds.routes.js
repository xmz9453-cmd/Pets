const express = require('express');
const controller = require('../controllers/portal-backgrounds.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorize');
const { uploadPortalBackground } = require('../middleware/portal-background-upload');

const router = express.Router();

router.get('/public/portal-background/:code', controller.getPublicSelection);
router.get('/public/portal-background/:code/image', controller.getActiveImage);
router.get('/portal-backgrounds', requireAuthentication, requireRole(['OWNER']), controller.list);
router.post(
  '/portal-backgrounds',
  requireAuthentication,
  requireRole(['OWNER']),
  uploadPortalBackground,
  controller.upload,
);
router.get('/portal-backgrounds/:id/image', requireAuthentication, requireRole(['OWNER']), controller.getManagedImage);
router.put('/portal-backgrounds/:id/active', requireAuthentication, requireRole(['OWNER']), controller.activate);
router.delete('/portal-backgrounds/:id', requireAuthentication, requireRole(['OWNER']), controller.remove);

module.exports = router;
