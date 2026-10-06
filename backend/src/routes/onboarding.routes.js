const express = require('express');
const onboardingController = require('../controllers/onboarding.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorize');

const router = express.Router();

router.post('/onboardings', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK']), onboardingController.create);
router.get('/public/onboardings/:token', onboardingController.getPublic);
router.get('/public/onboardings/:token/contract.pdf', onboardingController.getContractPdf);
router.put('/public/onboardings/:token', onboardingController.autosave);
router.get('/public/onboardings/:token/customers', onboardingController.searchCustomers);
router.get('/public/onboardings/:token/pets', onboardingController.searchPets);
router.post('/public/onboardings/:token/customer-resolution', onboardingController.resolveCustomer);
router.post('/public/onboardings/:token/pet-resolution', onboardingController.resolvePet);
router.post('/public/onboardings/:token/submit', onboardingController.submit);

module.exports = router;
