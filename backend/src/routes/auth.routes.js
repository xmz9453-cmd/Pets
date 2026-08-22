const express = require('express');
const authController = require('../controllers/auth.controller');
const { requireAuthentication } = require('../middleware/authenticate');

const router = express.Router();

router.post('/auth/login', authController.login);
router.post('/auth/logout', authController.logout);
router.get('/auth/me', requireAuthentication, authController.getCurrentStaff);

module.exports = router;
