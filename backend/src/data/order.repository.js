const { getPool } = require('../config/database');

function normalizeItem(row) {
  return { ...row, id: Number(row.id), order_id: Number(row.order_id), service_id: row.service_id ? Number(row.service_id) : null, product_id: row.product_id ? Number(row.product_id) : null, transaction_price: Number(row.transaction_price), quantity: Number(row.quantity), item_amount: Number(row.item_amount) };
}

function normalizeOrder(row, items = []) {
  if (!row) return null;
  return { ...row, id: Number(row.id), customer_id: Number(row.customer_id), appointment_id: row.appointment_id == null ? null : Number(row.appointment_id), total_amount: Number(row.total_amount), items };
}

async function getOrderById(id, connection = getPool()) {
  const [orders] = await connection.query(`SELECT o.*, c.name AS customer_name, c.phone AS customer_phone
    FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = ? LIMIT 1`, [id]);
  if (!orders[0]) return null;
  const [items] = await connection.query(`SELECT oi.*, s.name AS service_name, p.name AS product_name
    FROM order_items oi LEFT JOIN services s ON s.id = oi.service_id LEFT JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ? ORDER BY oi.id ASC`, [id]);
  return normalizeOrder(orders[0], items.map(normalizeItem));
}

async function listOrders(filters = {}) {
  const conditions = []; const params = [];
  if (filters.status && filters.status !== 'ALL') { conditions.push('o.status = ?'); params.push(filters.status); }
  if (filters.business_unit && filters.business_unit !== 'ALL') { conditions.push('o.business_unit = ?'); params.push(filters.business_unit); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await getPool().query(`SELECT o.*, c.name AS customer_name, c.phone AS customer_phone FROM orders o JOIN customers c ON c.id = o.customer_id ${where} ORDER BY o.created_at DESC`, params);
  const orders = await Promise.all(rows.map((row) => getOrderById(row.id)));
  return { orders, total: orders.length };
}

async function insertOrder(payload, connection) {
  const [result] = await connection.query('INSERT INTO orders (customer_id, source_type, appointment_id, business_unit, status, total_amount) VALUES (?, ?, ?, ?, ?, ?)', [payload.customer_id, payload.source_type, payload.appointment_id, payload.business_unit, payload.status, payload.total_amount]);
  return result.insertId;
}

async function insertItem(orderId, item, connection) {
  await connection.query(`INSERT INTO order_items (order_id, item_type, service_id, product_id, name, transaction_price, quantity, item_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [orderId, item.item_type, item.service_id, item.product_id, item.name, item.transaction_price, item.quantity, item.item_amount]);
}

async function updateOrder(id, payload, connection) {
  const fields = []; const values = [];
  for (const key of ['customer_id', 'business_unit', 'status', 'total_amount']) { if (payload[key] !== undefined) { fields.push(`${key} = ?`); values.push(payload[key]); } }
  if (fields.length) { values.push(id); await connection.query(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`, values); }
}

async function deleteItems(orderId, connection) { await connection.query('DELETE FROM order_items WHERE order_id = ?', [orderId]); }

async function deleteOrder(orderId) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const [orderRows] = await connection.query(
      'SELECT id, status, appointment_id FROM orders WHERE id = ? LIMIT 1 FOR UPDATE',
      [orderId],
    );
    const order = orderRows[0];
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      error.code = 'ORDER_NOT_FOUND';
      throw error;
    }

    const [paymentRows] = await connection.query(
      'SELECT id FROM payments WHERE order_id = ? LIMIT 1',
      [orderId],
    );
    if (order.status !== 'UNPAID' || order.appointment_id !== null || paymentRows.length) {
      const error = new Error('Order has related business records and cannot be deleted');
      error.statusCode = 409;
      error.code = 'ORDER_DELETE_PROTECTED';
      throw error;
    }

    await deleteItems(orderId, connection);
    await connection.query('DELETE FROM orders WHERE id = ?', [orderId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { deleteItems, deleteOrder, getOrderById, insertItem, insertOrder, listOrders, updateOrder };