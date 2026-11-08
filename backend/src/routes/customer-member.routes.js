const express = require('express');
const customerMemberController = require('../controllers/customer-member.controller');
const customerBookingController = require('../controllers/customer-booking.controller');
const { publicShopContext } = require('../middleware/public-shop-context');
const { requireCustomerAuthentication } = require('../middleware/authenticate-customer-member');

const router = express.Router();

router.get('/public/member/auth/:provider', customerMemberController.startLogin);
router.get('/public/member/auth/:provider/link', customerMemberController.startLink);
router.get('/public/member/auth/:provider/callback', customerMemberController.callback);
router.get('/public/member/providers', customerMemberController.getProviders);
router.get('/public/member/me', publicShopContext, requireCustomerAuthentication, customerMemberController.getMe);
router.post('/public/member/logout', publicShopContext, customerMemberController.logout);
router.get('/public/member/pets', publicShopContext, requireCustomerAuthentication, customerBookingController.listPets);
router.get('/public/member/services', publicShopContext, requireCustomerAuthentication, customerBookingController.listServices);
router.get('/public/member/products', publicShopContext, requireCustomerAuthentication, customerBookingController.listProducts);
router.get('/public/member/availability', publicShopContext, requireCustomerAuthentication, customerBookingController.listAvailability);
router.get('/public/member/requests', publicShopContext, requireCustomerAuthentication, customerBookingController.listRequests);
router.get('/public/member/grooming-records', publicShopContext, requireCustomerAuthentication, customerBookingController.listCompletedGroomingRecords);
router.get('/public/member/grooming-photos/:photoId', publicShopContext, requireCustomerAuthentication, customerBookingController.getCompletedGroomingPhoto);
router.get('/public/member/requests/:id/onboarding', publicShopContext, requireCustomerAuthentication, customerBookingController.getOnboardingToken);
router.post('/public/member/requests/:id/changes', publicShopContext, requireCustomerAuthentication, customerBookingController.createBookingChangeRequest);
router.post('/public/member/requests', publicShopContext, requireCustomerAuthentication, customerBookingController.createBookingRequest);

module.exports = router;
