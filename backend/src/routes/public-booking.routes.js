const express = require('express');
const publicBookingController = require('../controllers/public-booking.controller');
const { publicShopContext } = require('../middleware/public-shop-context');

const router = express.Router();

router.post('/public/booking/otp', publicShopContext, publicBookingController.rejectOtp);
router.post('/public/booking/otp/verify', publicShopContext, publicBookingController.rejectOtp);

module.exports = router;
