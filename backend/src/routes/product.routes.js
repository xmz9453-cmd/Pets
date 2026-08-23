const express = require('express');
const productController = require('../controllers/product.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorize');

const router = express.Router();
const readRoles = requireRole(['OWNER', 'FRONT_DESK', 'GROOMER']);
const writeRoles = requireRole(['OWNER']);
router.get('/products', requireAuthentication, readRoles, productController.listProducts);
router.get('/products/:id', requireAuthentication, readRoles, productController.getProduct);
router.post('/products', requireAuthentication, writeRoles, productController.createProduct);
router.patch('/products/:id', requireAuthentication, writeRoles, productController.updateProduct);
router.post('/products/:id/enable', requireAuthentication, writeRoles, productController.enableProduct);
router.post('/products/:id/disable', requireAuthentication, writeRoles, productController.disableProduct);
module.exports = router;