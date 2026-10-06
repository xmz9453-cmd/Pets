const express = require('express');
const contractVersionController = require('../controllers/contract-version.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorize');
const { uploadContractPdf } = require('../middleware/contract-pdf-upload');

const router = express.Router();
const requireOwner = [requireAuthentication, requireRole(['OWNER'])];
const readContractPdfRoles = [requireAuthentication, requireRole(['OWNER', 'FRONT_DESK', 'GROOMER'])];

router.get('/contract-versions', ...requireOwner, contractVersionController.listContractVersions);
router.get('/contract-versions/:id', ...requireOwner, contractVersionController.getContractVersion);
router.post('/contract-versions', ...requireOwner, contractVersionController.createDraft);
router.patch('/contract-versions/:id', ...requireOwner, contractVersionController.updateDraft);
router.post('/contract-versions/:id/pdf', ...requireOwner, uploadContractPdf, contractVersionController.uploadDraftPdf);
router.post('/contract-versions/:id/publish', ...requireOwner, contractVersionController.publishDraft);
router.post('/contract-versions/:id/current', ...requireOwner, contractVersionController.setCurrent);
router.get('/contract-versions/:id/pdf', ...readContractPdfRoles, contractVersionController.getContractVersionPdf);

module.exports = router;