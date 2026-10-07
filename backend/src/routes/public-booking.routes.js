const express = require('express');
const publicBookingController = require('../controllers/public-booking.controller');

const router = express.Router();

router.post('/public/booking/customer-confirmation', publicBookingController.confirmExistingCustomer);

module.exports = router;
