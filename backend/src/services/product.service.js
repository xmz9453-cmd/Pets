const productRepository = require('../data/product.repository');
const productImageStorage = require('../utils/product-image-storage');
const { withMediaStorageLock } = require('../utils/media-storage-lock');
const { logError } = require('../utils/logger');

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
  if (payload.is_sellable !== undefined && typeof payload.is_sellable !== 'boolean') errors.is_sellable = 'Is sellable must be a boolean';
  if (!partial || payload.price !== undefined) {
    const price = Number(payload.price ?? (payload.is_sellable === false ? 0 : NaN));
    if (!Number.isInteger(price) || price < 0 || (payload.is_sellable !== false && price === 0)) errors.price = 'Sellable product price must be a positive whole number';
  }
  if (!partial && payload.unit !== undefined && !String(payload.unit || '').trim()) errors.unit = 'Unit is required';
  if (payload.unit !== undefined && (!String(payload.unit).trim() || String(payload.unit).length > 20)) errors.unit = 'Unit must be 1-20 characters';
  if (!partial && payload.species !== undefined && !VALID_SPECIES.has(payload.species)) errors.species = 'Species must be DOG, CAT, or BOTH';
  if (payload.species !== undefined && !VALID_SPECIES.has(payload.species)) errors.species = 'Species must be DOG, CAT, or BOTH';
  if (payload.status !== undefined && !VALID_STATUSES.has(payload.status)) errors.status = 'Status must be ACTIVE or INACTIVE';
  if (payload.stock_quantity !== undefined
    && (!Number.isInteger(Number(payload.stock_quantity)) || Number(payload.stock_quantity) < 0 || Number(payload.stock_quantity) > 2147483647)) {
    errors.stock_quantity = 'Stock quantity must be a non-negative whole number';
  }
  return errors;
}

async function listProducts(filters) { return productRepository.listProducts(filters); }
async function getProduct(id) { const product = await productRepository.getProductById(id); if (!product) throw notFound(); return { product }; }
async function createProduct(payload = {}) {
  const errors = validate(payload); if (Object.keys(errors).length) throw validation(errors);
  const name = String(payload.name).trim(); if (await productRepository.findByName(name)) throw validation({ name: 'Product name already exists' });
  return { product: await productRepository.createProduct({
    ...payload,
    name,
    stock_quantity: payload.stock_quantity === undefined ? 0 : Number(payload.stock_quantity),
    unit: String(payload.unit || '件').trim(),
    price: payload.price === undefined && payload.is_sellable === false ? 0 : Number(payload.price),
    is_sellable: payload.is_sellable ?? true,
    species: payload.species || 'BOTH',
  }) };
}
async function updateProduct(id, payload = {}) {
  const existing = await productRepository.getProductById(id);
  if (!existing) throw notFound();
  if (payload.status !== undefined) throw validation({ status: 'Use enable or disable action to change status' });
  const errors = validate({ ...existing, ...payload }, true); if (Object.keys(errors).length) throw validation(errors);
  if (payload.name !== undefined && await productRepository.findByName(String(payload.name).trim(), id)) throw validation({ name: 'Product name already exists' });
  const next = { ...payload };
  if (next.name !== undefined) next.name = String(next.name).trim();
  if (next.price !== undefined) next.price = Number(next.price);
  if (next.is_sellable !== undefined) next.is_sellable = Boolean(next.is_sellable);
  if (next.stock_quantity !== undefined) next.stock_quantity = Number(next.stock_quantity);
  return { product: await productRepository.updateProduct(id, next) };
}

async function deleteProduct(id) {
  return withMediaStorageLock(async () => {
    const product = await productRepository.getProductById(id);
    if (!product) throw notFound();
    const imageMetadata = await productRepository.getProductImageMetadata(id);
    try {
      await productRepository.deleteProduct(id);
      if (imageMetadata?.image_storage_key) {
        try {
          await productImageStorage.removeStoredImage(imageMetadata.image_storage_key);
        } catch (error) {
          logError('Failed to remove deleted product image file', { productId: Number(id), code: error.code });
          throw error;
        }
      }
      return { deleted: true };
    } catch (error) {
      if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        const conflict = new Error('此商品已有訂單或預約紀錄，無法刪除；如不再販售，請改為停用。');
        conflict.statusCode = 409;
        conflict.code = 'PRODUCT_IN_USE';
        throw conflict;
      }
      throw error;
    }
  });
}

function validateId(id) {
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId <= 0) throw notFound();
  return numericId;
}

async function uploadProductImage(id, file) {
  const productId = validateId(id);
  try {
    return await withMediaStorageLock(async () => {
      const existing = await productRepository.getProductById(productId);
      if (!existing) throw notFound();
      const existingImage = await productRepository.getProductImageMetadata(productId);
      const inspected = await productImageStorage.inspectUploadedFile(file);
      const storageKey = productImageStorage.createStorageKey(inspected.extension);
      await productImageStorage.moveTemporaryFile(file.path, storageKey);
      let updated = false;
      try {
        const imageUpdated = await productRepository.updateProductImage(productId, {
          storage_key: storageKey,
          mime_type: inspected.mimeType,
          file_size: inspected.bytes.length,
          original_filename: inspected.originalFilename,
        });
        if (!imageUpdated) throw notFound();
        updated = true;
      } catch (error) {
        await productImageStorage.removeStoredImage(storageKey).catch((cleanupError) => {
          logError('Failed to remove orphaned product image after database failure', {
            code: cleanupError.code,
            productId,
          });
        });
        throw error;
      }

      if (updated && existingImage?.image_storage_key) {
        try {
          await productImageStorage.removeStoredImage(existingImage.image_storage_key);
        } catch (error) {
          logError('Failed to remove replaced product image file', { productId, code: error.code });
          throw error;
        }
      }
      return { product: await productRepository.getProductById(productId) };
    });
  } finally {
    if (file?.path) {
      await productImageStorage.removeTemporaryFile(file.path).catch((cleanupError) => {
        logError('Failed to remove product image upload temporary file', { code: cleanupError.code });
      });
    }
  }
}

async function removeProductImage(id) {
  const productId = validateId(id);
  return withMediaStorageLock(async () => {
    const product = await productRepository.getProductById(productId);
    if (!product) throw notFound();
    const imageMetadata = await productRepository.getProductImageMetadata(productId);
    if (!imageMetadata?.image_storage_key) return { product };
    if (!await productRepository.updateProductImage(productId, null)) throw notFound();
    try {
      await productImageStorage.removeStoredImage(imageMetadata.image_storage_key);
    } catch (error) {
      logError('Failed to remove detached product image file', { productId, code: error.code });
      throw error;
    }
    return { product: await productRepository.getProductById(productId) };
  });
}

async function getPublicProductImage(id, version) {
  const product = await productRepository.getProductById(validateId(id));
  const imageMetadata = product
    ? await productRepository.getProductImageMetadata(product.id)
    : null;
  if (!imageMetadata?.image_storage_key
    || (version && version !== imageMetadata.image_storage_key)) throw notFound();
  return productImageStorage.readStoredImage(imageMetadata.image_storage_key, imageMetadata.image_mime_type);
}

async function setStatus(id, status) {
  if (!await productRepository.getProductById(id)) throw notFound();
  return { product: await productRepository.updateProductStatus(id, status) };
}

async function enableProduct(id) { return setStatus(id, 'ACTIVE'); }
async function disableProduct(id) { return setStatus(id, 'INACTIVE'); }

module.exports = {
  createProduct,
  deleteProduct,
  disableProduct,
  enableProduct,
  getProduct,
  getPublicProductImage,
  listProducts,
  removeProductImage,
  updateProduct,
  uploadProductImage,
};