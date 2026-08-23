const { getPool } = require('../config/database');

function toNumber(value) {
  return Number(value || 0);
}

async function getReport(filters) {
  const orderRange = [filters.startDate, filters.endDate];
  const paymentRange = [filters.startDate, filters.endDate];
  const pool = getPool();

  const [summaryRows] = await pool.query(
    `SELECT COUNT(*) AS total_orders,
            SUM(o.status <> 'CANCELLED') AS valid_orders,
            SUM(o.status = 'PAID') AS completed_orders,
            SUM(o.status = 'CANCELLED') AS cancelled_orders,
            COALESCE(AVG(CASE WHEN o.status <> 'CANCELLED' THEN o.total_amount END), 0) AS average_order_amount
     FROM orders o
     WHERE o.created_at >= ? AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)`,
    orderRange,
  );

  const [revenueRows] = await pool.query(
    `SELECT COALESCE(SUM(p.amount), 0) AS actual_revenue
     FROM payments p
     WHERE p.status = 'PAID'
       AND p.paid_at >= ? AND p.paid_at < DATE_ADD(?, INTERVAL 1 DAY)`,
    paymentRange,
  );

  const [outstandingRows] = await pool.query(
    `SELECT COALESCE(SUM(GREATEST(o.total_amount - COALESCE(p.paid_amount, 0), 0)), 0) AS outstanding_amount
     FROM orders o
     LEFT JOIN (
       SELECT order_id, SUM(amount) AS paid_amount
       FROM payments
       WHERE status = 'PAID'
       GROUP BY order_id
     ) p ON p.order_id = o.id
     WHERE o.status <> 'CANCELLED'
       AND o.created_at >= ? AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)`,
    orderRange,
  );

  const [paymentMethodRows] = await pool.query(
    `SELECT p.payment_method, SUM(p.amount) AS payment_amount, COUNT(*) AS payment_count
     FROM payments p
     WHERE p.status = 'PAID'
       AND p.paid_at >= ? AND p.paid_at < DATE_ADD(?, INTERVAL 1 DAY)
     GROUP BY p.payment_method
     ORDER BY p.payment_method ASC`,
    paymentRange,
  );

  const [dailyRevenueRows] = await pool.query(
    `SELECT DATE(p.paid_at) AS date, COUNT(DISTINCT p.order_id) AS order_count, SUM(p.amount) AS payment_amount
     FROM payments p
     WHERE p.status = 'PAID'
       AND p.paid_at >= ? AND p.paid_at < DATE_ADD(?, INTERVAL 1 DAY)
     GROUP BY DATE(p.paid_at)
     ORDER BY date ASC`,
    paymentRange,
  );

  const [productRows] = await pool.query(
    `SELECT oi.product_id, oi.name, SUM(oi.quantity) AS quantity, SUM(oi.item_amount) AS amount
     FROM order_items oi
     INNER JOIN orders o ON o.id = oi.order_id
     WHERE oi.item_type = 'PRODUCT' AND o.status <> 'CANCELLED'
       AND o.created_at >= ? AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)
     GROUP BY oi.product_id, oi.name
     ORDER BY oi.name ASC`,
    orderRange,
  );

  const [serviceRows] = await pool.query(
    `SELECT oi.service_id, oi.name, SUM(oi.quantity) AS quantity, SUM(oi.item_amount) AS amount
     FROM order_items oi
     INNER JOIN orders o ON o.id = oi.order_id
     WHERE oi.item_type = 'SERVICE' AND o.status <> 'CANCELLED'
       AND o.created_at >= ? AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)
     GROUP BY oi.service_id, oi.name
     ORDER BY oi.name ASC`,
    orderRange,
  );

  const [boardingUsageRows] = await pool.query(
    `SELECT COUNT(*) AS usage_count
     FROM boardings b
     WHERE b.created_at >= ? AND b.created_at < DATE_ADD(?, INTERVAL 1 DAY)`,
    orderRange,
  );

  const [boardingAmountRows] = await pool.query(
    `SELECT COALESCE(SUM(oi.quantity), 0) AS quantity, COALESCE(SUM(oi.item_amount), 0) AS amount
     FROM order_items oi
     INNER JOIN orders o ON o.id = oi.order_id
     INNER JOIN services s ON s.id = oi.service_id
     WHERE oi.item_type = 'SERVICE' AND s.type = 'BOARDING' AND o.status <> 'CANCELLED'
       AND o.created_at >= ? AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)`,
    orderRange,
  );

  const summary = summaryRows[0] || {};
  const outstanding = outstandingRows[0] || {};
  const boardingAmount = boardingAmountRows[0] || {};

  return {
    period: { start_date: filters.startDate, end_date: filters.endDate },
    summary: {
      total_orders: toNumber(summary.total_orders),
      valid_orders: toNumber(summary.valid_orders),
      completed_orders: toNumber(summary.completed_orders),
      cancelled_orders: toNumber(summary.cancelled_orders),
      average_order_amount: toNumber(summary.average_order_amount),
      actual_revenue: toNumber(revenueRows[0]?.actual_revenue),
      outstanding_amount: toNumber(outstanding.outstanding_amount),
    },
    payment_methods: paymentMethodRows.map((row) => ({ payment_method: row.payment_method, payment_count: toNumber(row.payment_count), payment_amount: toNumber(row.payment_amount) })),
    daily_revenue: dailyRevenueRows.map((row) => ({ date: row.date, order_count: toNumber(row.order_count), payment_amount: toNumber(row.payment_amount) })),
    products: productRows.map((row) => ({ product_id: Number(row.product_id), name: row.name, quantity: toNumber(row.quantity), amount: toNumber(row.amount) })),
    services: serviceRows.map((row) => ({ service_id: Number(row.service_id), name: row.name, quantity: toNumber(row.quantity), amount: toNumber(row.amount) })),
    boarding: {
      usage_count: toNumber(boardingUsageRows[0]?.usage_count),
      identifiable_transaction_quantity: toNumber(boardingAmount.quantity),
      identifiable_transaction_amount: toNumber(boardingAmount.amount),
    },
  };
}

module.exports = { getReport };