const { getPool } = require('../config/database');
const { getCurrentShopId } = require('../utils/shop-context');

function normalizeItem(row) {
  return { ...row, id: Number(row.id), order_id: Number(row.order_id), service_id: row.service_id ? Number(row.service_id) : null, product_id: row.product_id ? Number(row.product_id) : null, pet_id: row.pet_id ? Number(row.pet_id) : null, customer_service_package_id: row.customer_service_package_id ? Number(row.customer_service_package_id) : null, transaction_price: Number(row.transaction_price), quantity: Number(row.quantity), item_amount: Number(row.item_amount) };
}

function normalizeOrder(row, items = []) {
  if (!row) return null;
  return { ...row, id: Number(row.id), customer_id: Number(row.customer_id), appointment_id: row.appointment_id == null ? null : Number(row.appointment_id), total_amount: Number(row.total_amount), items };
}

async function getOrderById(id, connection = getPool(), forUpdate = false) {
  const [orders] = await connection.query(`SELECT o.*, c.name AS customer_name, c.phone AS customer_phone
    FROM orders o JOIN customers c ON c.id = o.customer_id AND c.shop_id = o.shop_id WHERE o.id = ? AND o.shop_id = ? LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`, [id, getCurrentShopId()]);
  if (!orders[0]) return null;
  const [items] = await connection.query(`SELECT oi.*, s.name AS service_name, p.name AS product_name,
      cp.plan_id AS service_package_plan_id, plan.name AS service_package_name
    FROM order_items oi
    LEFT JOIN services s ON s.id = oi.service_id AND s.shop_id = oi.shop_id
    LEFT JOIN products p ON p.id = oi.product_id AND p.shop_id = oi.shop_id
    LEFT JOIN customer_service_packages cp ON cp.id = oi.customer_service_package_id AND cp.shop_id = oi.shop_id
    LEFT JOIN service_package_plans plan ON plan.id = cp.plan_id AND plan.shop_id = cp.shop_id
    WHERE oi.order_id = ? AND oi.shop_id = ? ORDER BY oi.id ASC`, [id, getCurrentShopId()]);
  const [packagePurchases] = await connection.query(
    `SELECT cp.id AS customer_service_package_id, cp.plan_id, cp.purchased_uses, cp.remaining_uses,
            cp.starts_on, cp.expires_on, cp.status AS package_status, plan.name AS package_name,
            COALESCE(cp.purchase_price, o.total_amount, plan.price) AS price
     FROM customer_service_packages cp
     INNER JOIN service_package_plans plan ON plan.id = cp.plan_id AND plan.shop_id = cp.shop_id
     INNER JOIN orders o ON o.id = cp.purchase_order_id AND o.shop_id = cp.shop_id
     WHERE cp.purchase_order_id = ? AND cp.shop_id = ? LIMIT 1`,
    [id, getCurrentShopId()],
  );
  const orderItems = items.map(normalizeItem);
  if (packagePurchases[0]) {
    const purchasedPackage = packagePurchases[0];
    orderItems.push({
      id: -Number(purchasedPackage.customer_service_package_id),
      order_id: Number(id),
      item_type: 'PACKAGE',
      package_plan_id: Number(purchasedPackage.plan_id),
      customer_service_package_id: Number(purchasedPackage.customer_service_package_id),
      name: purchasedPackage.package_name,
      unit: '份',
      transaction_price: Number(purchasedPackage.price),
      quantity: 1,
      item_amount: Number(purchasedPackage.price),
      package_status: purchasedPackage.package_status,
      remaining_uses: Number(purchasedPackage.remaining_uses),
      purchased_uses: Number(purchasedPackage.purchased_uses),
      starts_on: purchasedPackage.starts_on,
      expires_on: purchasedPackage.expires_on,
    });
  }
  return normalizeOrder(orders[0], orderItems);
}

async function listOrders(filters = {}) {
  const conditions = ['o.shop_id = ?']; const params = [getCurrentShopId()];
  if (filters.status && filters.status !== 'ALL') { conditions.push('o.status = ?'); params.push(filters.status); }
  if (filters.business_unit && filters.business_unit !== 'ALL') { conditions.push('o.business_unit = ?'); params.push(filters.business_unit); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await getPool().query(`SELECT o.*, c.name AS customer_name, c.phone AS customer_phone FROM orders o JOIN customers c ON c.id = o.customer_id AND c.shop_id = o.shop_id ${where} ORDER BY o.created_at DESC`, params);
  const orders = await Promise.all(rows.map((row) => getOrderById(row.id)));
  return { orders, total: orders.length };
}

async function insertOrder(payload, connection) {
  const [result] = await connection.query('INSERT INTO orders (shop_id, customer_id, source_type, appointment_id, business_unit, status, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?)', [getCurrentShopId(), payload.customer_id, payload.source_type, payload.appointment_id, payload.business_unit, payload.status, payload.total_amount]);
  return result.insertId;
}

async function insertItem(orderId, item, connection) {
  const [result] = await connection.query(`INSERT INTO order_items (shop_id, order_id, item_type, service_id, product_id, pet_id, customer_service_package_id, name, unit, transaction_price, quantity, item_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [getCurrentShopId(), orderId, item.item_type, item.service_id, item.product_id, item.pet_id, item.customer_service_package_id || null, item.name, item.unit, item.transaction_price, item.quantity, item.item_amount]);
  return result.insertId;
}

async function updateOrder(id, payload, connection) {
  const fields = []; const values = [];
  for (const key of ['customer_id', 'source_type', 'appointment_id', 'business_unit', 'status', 'total_amount']) { if (payload[key] !== undefined) { fields.push(`${key} = ?`); values.push(payload[key]); } }
  if (fields.length) { values.push(id, getCurrentShopId()); await connection.query(`UPDATE orders SET ${fields.join(', ')} WHERE id = ? AND shop_id = ?`, values); }
}

async function deleteItems(orderId, connection) { await connection.query('DELETE FROM order_items WHERE order_id = ? AND shop_id = ?', [orderId, getCurrentShopId()]); }

async function deleteOrder(orderId) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const [orderRows] = await connection.query(
      'SELECT id, status, appointment_id FROM orders WHERE id = ? AND shop_id = ? LIMIT 1 FOR UPDATE',
      [orderId, getCurrentShopId()],
    );
    const order = orderRows[0];
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      error.code = 'ORDER_NOT_FOUND';
      throw error;
    }

    const [paymentRows] = await connection.query(
      'SELECT id FROM payments WHERE order_id = ? AND shop_id = ? LIMIT 1',
      [orderId, getCurrentShopId()],
    );
    if (order.status !== 'UNPAID' || order.appointment_id !== null || paymentRows.length) {
      const error = new Error('Order has related business records and cannot be deleted');
      error.statusCode = 409;
      error.code = 'ORDER_DELETE_PROTECTED';
      throw error;
    }

    await deleteItems(orderId, connection);
    await connection.query('DELETE FROM orders WHERE id = ? AND shop_id = ?', [orderId, getCurrentShopId()]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { deleteItems, deleteOrder, getOrderById, insertItem, insertOrder, listOrders, updateOrder };
