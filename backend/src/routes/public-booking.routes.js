const express = require('express');
const publicBookingController = require('../controllers/public-booking.controller');
const { publicShopContext } = require('../middleware/public-shop-context');

const router = express.Router();

router.use(publicShopContext);

router.post('/public/booking/otp', publicBookingController.rejectOtp);
router.post('/public/booking/otp/verify', publicBookingController.rejectOtp);

module.exports = router;
