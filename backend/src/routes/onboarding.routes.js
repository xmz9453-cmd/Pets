const express = require('express');
const onboardingController = require('../controllers/onboarding.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorize');
const { publicShopContext } = require('../middleware/public-shop-context');
const { optionalCustomerAuthentication } = require('../middleware/authenticate-customer-member');

const router = express.Router();

router.post('/onboardings', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK']), onboardingController.create);
router.post('/public/onboardings', publicShopContext, onboardingController.createPublic);
router.use('/public/onboardings/:token', optionalCustomerAuthentication);
router.get('/public/onboardings/:token', onboardingController.getPublic);
router.get('/public/onboardings/:token/availability', onboardingController.listAvailability);
router.get('/public/onboardings/:token/contract.pdf', onboardingController.getContractPdf);
router.put('/public/onboardings/:token', onboardingController.autosave);
router.get('/public/onboardings/:token/customers', onboardingController.searchCustomers);
router.get('/public/onboardings/:token/pets', onboardingController.searchPets);
router.post('/public/onboardings/:token/customer-resolution', onboardingController.resolveCustomer);
router.post('/public/onboardings/:token/pet-resolution', onboardingController.resolvePet);
router.post('/public/onboardings/:token/submit', onboardingController.submit);

module.exports = router;
