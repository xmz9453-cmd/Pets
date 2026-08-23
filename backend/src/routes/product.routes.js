const express = require('express');
const productController = require('../controllers/product.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorize');

const router = express.Router();
const readRoles = requireRole(['OWNER', 'FRONT_DESK', 'GROOMER']);
const writeRoles = requireRole(['OWNER', 'FRONT_DESK']);
router.get('/products', requireAuthentication, readRoles, productController.listProducts);
router.get('/products/:id', requireAuthentication, readRoles, productController.getProduct);
router.post('/products', requireAuthentication, writeRoles, productController.createProduct);
router.patch('/products/:id', requireAuthentication, writeRoles, productController.updateProduct);
module.exports = router;