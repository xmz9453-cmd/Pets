const express = require('express');
const groomingController = require('../controllers/grooming.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorize');
const { uploadGroomingPhoto } = require('../middleware/grooming-photo-upload');

const router = express.Router();
const readRoles = requireRole(['OWNER', 'FRONT_DESK', 'GROOMER']);
const writeRoles = requireRole(['OWNER', 'FRONT_DESK', 'GROOMER']);
const completeRoles = requireRole(['OWNER', 'GROOMER']);

router.get('/groomings', requireAuthentication, readRoles, groomingController.listGroomings);
router.get('/groomings/:id', requireAuthentication, readRoles, groomingController.getGrooming);
router.post('/groomings', requireAuthentication, writeRoles, groomingController.createGrooming);
router.patch('/groomings/:id', requireAuthentication, writeRoles, groomingController.updateGrooming);
router.post('/groomings/:id/photos', requireAuthentication, writeRoles, uploadGroomingPhoto, groomingController.addGroomingPhoto);
router.get('/groomings/:id/photos/:photoId/image', requireAuthentication, readRoles, groomingController.getGroomingPhotoImage);
router.delete('/groomings/:id/photos/:photoId', requireAuthentication, writeRoles, groomingController.removeGroomingPhoto);
router.post('/groomings/:id/complete', requireAuthentication, completeRoles, groomingController.completeGrooming);

module.exports = router;
