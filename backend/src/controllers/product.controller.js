const productService = require('../services/product.service');

function send(res, data, status = 200) { res.status(status).json({ success: true, data }); }
async function listProducts(req, res, next) { try { send(res, await productService.listProducts(req.query || {})); } catch (error) { next(error); } }
async function getProduct(req, res, next) { try { send(res, await productService.getProduct(req.params.id)); } catch (error) { next(error); } }
async function createProduct(req, res, next) { try { send(res, await productService.createProduct(req.body || {}), 201); } catch (error) { next(error); } }
async function updateProduct(req, res, next) { try { send(res, await productService.updateProduct(req.params.id, req.body || {})); } catch (error) { next(error); } }
module.exports = { createProduct, getProduct, listProducts, updateProduct };