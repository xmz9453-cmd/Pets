const { getPool } = require('../config/database');
const { getCurrentShopId } = require('../utils/shop-context');

function normalize(row) {
  if (!row) return null;
  const shopId = getCurrentShopId();
  const {
    image_storage_key: imageStorageKey,
    image_mime_type: _imageMimeType,
    image_file_size: _imageFileSize,
    image_original_filename: _imageOriginalFilename,
    ...product
  } = row;
  return {
    ...product,
    id: Number(product.id),
    price: Number(product.price),
    is_sellable: Boolean(product.is_sellable),
    image_url: imageStorageKey
      ? `/api/public/products/${Number(product.id)}/image?shop_id=${shopId}&v=${encodeURIComponent(imageStorageKey)}`
      : null,
  };
}

async function listProducts(filters = {}) {
  const conditions = ['shop_id = ?'];
  const params = [getCurrentShopId()];
  if (filters.status && filters.status !== 'ALL') { conditions.push('status = ?'); params.push(filters.status); }
  if (filters.sellable === true || filters.sellable === 'true') { conditions.push('is_sellable = TRUE'); }
  if (filters.search) { conditions.push('name LIKE ?'); params.push(`%${filters.search}%`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await getPool().query(`SELECT * FROM products ${where} ORDER BY name ASC`, params);
  return { products: rows.map(normalize), total: rows.length };
}

async function getProductById(id, connection = getPool()) {
  const [rows] = await connection.query('SELECT * FROM products WHERE id = ? AND shop_id = ? LIMIT 1', [id, getCurrentShopId()]);
  return normalize(rows[0]);
}

async function getProductImageMetadata(id, connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT image_storage_key, image_mime_type, image_file_size, image_original_filename
     FROM products WHERE id = ? AND shop_id = ? LIMIT 1`,
    [id, getCurrentShopId()],
  );
  return rows[0] || null;
}

async function findByName(name, excludeId = null) {
  const params = [name, getCurrentShopId()];
  let sql = 'SELECT * FROM products WHERE name = ? AND shop_id = ?';
  if (excludeId !== null) { sql += ' AND id <> ?'; params.push(excludeId); }
  const [rows] = await getPool().query(`${sql} LIMIT 1`, params);
  return normalize(rows[0]);
}

async function createProduct(payload) {
  const [result] = await getPool().query(
    'INSERT INTO products (shop_id, name, description, price, stock_quantity, is_sellable, unit, species, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [getCurrentShopId(), payload.name, payload.description || null, payload.price, payload.stock_quantity ?? 0, payload.is_sellable ?? true, payload.unit, payload.species, payload.status || 'ACTIVE'],
  );
  return getProductById(result.insertId);
}

async function updateProduct(id, payload) {
  const fields = [];
  const values = [];
  for (const key of ['name', 'description', 'price', 'stock_quantity', 'is_sellable', 'unit', 'species', 'status']) {
    if (payload[key] !== undefined) { fields.push(`${key} = ?`); values.push(payload[key] === '' ? null : payload[key]); }
  }
  if (fields.length) { values.push(id, getCurrentShopId()); await getPool().query(`UPDATE products SET ${fields.join(', ')} WHERE id = ? AND shop_id = ?`, values); }
  return getProductById(id);
}

async function updateProductStatus(id, status) {
  await getPool().query('UPDATE products SET status = ? WHERE id = ? AND shop_id = ?', [status, id, getCurrentShopId()]);
  return getProductById(id);
}

async function updateProductImage(id, image, connection = getPool()) {
  const [result] = await connection.query(
    `UPDATE products
     SET image_storage_key = ?, image_mime_type = ?, image_file_size = ?, image_original_filename = ?
     WHERE id = ? AND shop_id = ?`,
    [
      image?.storage_key ?? null,
      image?.mime_type ?? null,
      image?.file_size ?? null,
      image?.original_filename ?? null,
      id,
      getCurrentShopId(),
    ],
  );
  return result.affectedRows === 1;
}

async function deleteProduct(id) {
  const [result] = await getPool().query(
    'DELETE FROM products WHERE id = ? AND shop_id = ?',
    [id, getCurrentShopId()],
  );
  return result.affectedRows === 1;
}

module.exports = {
  createProduct,
  deleteProduct,
  findByName,
  getProductById,
  getProductImageMetadata,
  listProducts,
  updateProduct,
  updateProductImage,
  updateProductStatus,
};
