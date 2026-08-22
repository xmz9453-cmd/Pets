const express = require('express');
const customerController = require('../controllers/customer.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorize');

const router = express.Router();

router.get('/customers', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK', 'GROOMER']), customerController.listCustomers);
router.get('/customers/:id', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK', 'GROOMER']), customerController.getCustomer);
router.post('/customers', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK']), customerController.createCustomer);
router.patch('/customers/:id', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK']), customerController.updateCustomer);
router.patch('/customers/:id/deactivate', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK']), customerController.deactivateCustomer);
router.patch('/customers/:id/reactivate', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK']), customerController.reactivateCustomer);

module.exports = router;
