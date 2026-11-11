const express = require('express');
const servicePackageController = require('../controllers/service-package.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorize');

const router = express.Router();
const readRoles = requireRole(['OWNER', 'FRONT_DESK', 'GROOMER']);
const writeRoles = requireRole(['OWNER', 'FRONT_DESK']);

router.get('/service-package-plans', requireAuthentication, readRoles, servicePackageController.listPlans);
router.post('/service-package-plans', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK']), servicePackageController.createPlan);
router.patch('/service-package-plans/:id', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK']), servicePackageController.updatePlan);
router.get('/customers/:customerId/service-packages', requireAuthentication, readRoles, servicePackageController.listCustomerPackages);
router.post('/service-packages/purchase', requireAuthentication, writeRoles, servicePackageController.purchasePackage);

module.exports = router;
