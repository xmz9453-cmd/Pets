const express = require('express');
const publicBookingController = require('../controllers/public-booking.controller');
const { publicShopContext } = require('../middleware/public-shop-context');

const router = express.Router();

router.use(publicShopContext);

router.post('/public/booking/customer-confirmation', publicBookingController.confirmExistingCustomer);
router.get('/public/booking/pets', publicBookingController.listPets);
router.get('/public/booking/services', publicBookingController.listServices);

module.exports = router;
