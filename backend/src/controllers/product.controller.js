const productService = require('../services/product.service');

function send(res, data, status = 200) { res.status(status).json({ success: true, data }); }
async function listProducts(req, res, next) { try { send(res, await productService.listProducts(req.query || {})); } catch (error) { next(error); } }
async function getProduct(req, res, next) { try { send(res, await productService.getProduct(req.params.id)); } catch (error) { next(error); } }
async function createProduct(req, res, next) { try { send(res, await productService.createProduct(req.body || {}), 201); } catch (error) { next(error); } }
async function updateProduct(req, res, next) { try { send(res, await productService.updateProduct(req.params.id, req.body || {})); } catch (error) { next(error); } }
async function deleteProduct(req, res, next) { try { send(res, await productService.deleteProduct(req.params.id)); } catch (error) { next(error); } }
async function enableProduct(req, res, next) { try { send(res, await productService.enableProduct(req.params.id)); } catch (error) { next(error); } }
async function disableProduct(req, res, next) { try { send(res, await productService.disableProduct(req.params.id)); } catch (error) { next(error); } }
async function uploadImage(req, res, next) { try { send(res, await productService.uploadProductImage(req.params.id, req.file), 201); } catch (error) { next(error); } }
async function removeImage(req, res, next) { try { send(res, await productService.removeProductImage(req.params.id)); } catch (error) { next(error); } }
async function getPublicImage(req, res, next) {
  try {
    const image = await productService.getPublicProductImage(req.params.id, req.query.v);
    res.status(200).set('Content-Type', image.mimeType).set('X-Content-Type-Options', 'nosniff')
      .set('Cache-Control', 'public, max-age=31536000, immutable').send(image.bytes);
  } catch (error) {
    next(error);
  }
}
module.exports = {
  createProduct,
  deleteProduct,
  disableProduct,
  enableProduct,
  getProduct,
  getPublicImage,
  listProducts,
  removeImage,
  updateProduct,
  uploadImage,
};