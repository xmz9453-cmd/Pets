const productRepository = require('../data/product.repository');

const VALID_SPECIES = new Set(['DOG', 'CAT', 'BOTH']);
const VALID_STATUSES = new Set(['ACTIVE', 'INACTIVE']);

function validation(fields) {
  const error = new Error('Validation failed'); error.statusCode = 400; error.code = 'VALIDATION_ERROR'; error.fields = fields; return error;
}

function notFound() { const error = new Error('Product not found'); error.statusCode = 404; error.code = 'PRODUCT_NOT_FOUND'; return error; }

function validate(payload, partial = false) {
  const errors = {};
  if (!partial && !String(payload.name || '').trim()) errors.name = 'Product name is required';
  if (payload.name !== undefined && (!String(payload.name).trim() || String(payload.name).length > 100)) errors.name = 'Product name must be 1-100 characters';
  if (!partial || payload.price !== undefined) { const price = Number(payload.price); if (!Number.isFinite(price) || price <= 0) errors.price = 'Price must be greater than zero'; }
  if (!partial && payload.unit !== undefined && !String(payload.unit || '').trim()) errors.unit = 'Unit is required';
  if (payload.unit !== undefined && (!String(payload.unit).trim() || String(payload.unit).length > 20)) errors.unit = 'Unit must be 1-20 characters';
  if (!partial && payload.species !== undefined && !VALID_SPECIES.has(payload.species)) errors.species = 'Species must be DOG, CAT, or BOTH';
  if (payload.species !== undefined && !VALID_SPECIES.has(payload.species)) errors.species = 'Species must be DOG, CAT, or BOTH';
  if (payload.status !== undefined && !VALID_STATUSES.has(payload.status)) errors.status = 'Status must be ACTIVE or INACTIVE';
  return errors;
}

async function listProducts(filters) { return productRepository.listProducts(filters); }
async function getProduct(id) { const product = await productRepository.getProductById(id); if (!product) throw notFound(); return { product }; }
async function createProduct(payload = {}) {
  const errors = validate(payload); if (Object.keys(errors).length) throw validation(errors);
  const name = String(payload.name).trim(); if (await productRepository.findByName(name)) throw validation({ name: 'Product name already exists' });
  return { product: await productRepository.createProduct({ ...payload, name, price: Number(payload.price), unit: String(payload.unit || '件').trim(), species: payload.species || 'BOTH' }) };
}
async function updateProduct(id, payload = {}) {
  if (!await productRepository.getProductById(id)) throw notFound();
  if (payload.status !== undefined) throw validation({ status: 'Use enable or disable action to change status' });
  const errors = validate(payload, true); if (Object.keys(errors).length) throw validation(errors);
  if (payload.name !== undefined && await productRepository.findByName(String(payload.name).trim(), id)) throw validation({ name: 'Product name already exists' });
  const next = { ...payload }; if (next.name !== undefined) next.name = String(next.name).trim(); if (next.price !== undefined) next.price = Number(next.price);
  return { product: await productRepository.updateProduct(id, next) };
}

async function setStatus(id, status) {
  if (!await productRepository.getProductById(id)) throw notFound();
  return { product: await productRepository.updateProductStatus(id, status) };
}

async function enableProduct(id) { return setStatus(id, 'ACTIVE'); }
async function disableProduct(id) { return setStatus(id, 'INACTIVE'); }

module.exports = { createProduct, disableProduct, enableProduct, getProduct, listProducts, updateProduct };