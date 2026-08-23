const { getPool } = require('../config/database');

function normalize(row) {
  if (!row) return null;
  return { ...row, id: Number(row.id), price: Number(row.price) };
}

async function listProducts(filters = {}) {
  const conditions = [];
  const params = [];
  if (filters.status && filters.status !== 'ALL') { conditions.push('status = ?'); params.push(filters.status); }
  if (filters.search) { conditions.push('name LIKE ?'); params.push(`%${filters.search}%`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await getPool().query(`SELECT * FROM products ${where} ORDER BY name ASC`, params);
  return { products: rows.map(normalize), total: rows.length };
}

async function getProductById(id, connection = getPool()) {
  const [rows] = await connection.query('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
  return normalize(rows[0]);
}

async function findByName(name, excludeId = null) {
  const params = [name];
  let sql = 'SELECT * FROM products WHERE name = ?';
  if (excludeId !== null) { sql += ' AND id <> ?'; params.push(excludeId); }
  const [rows] = await getPool().query(`${sql} LIMIT 1`, params);
  return normalize(rows[0]);
}

async function createProduct(payload) {
  const [result] = await getPool().query(
    'INSERT INTO products (name, description, price, unit, species, status) VALUES (?, ?, ?, ?, ?, ?)',
    [payload.name, payload.description || null, payload.price, payload.unit, payload.species, payload.status || 'ACTIVE'],
  );
  return getProductById(result.insertId);
}

async function updateProduct(id, payload) {
  const fields = [];
  const values = [];
  for (const key of ['name', 'description', 'price', 'unit', 'species', 'status']) {
    if (payload[key] !== undefined) { fields.push(`${key} = ?`); values.push(payload[key] === '' ? null : payload[key]); }
  }
  if (fields.length) { values.push(id); await getPool().query(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values); }
  return getProductById(id);
}

module.exports = { createProduct, findByName, getProductById, listProducts, updateProduct };