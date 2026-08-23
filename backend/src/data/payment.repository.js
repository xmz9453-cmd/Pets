function normalizePayment(row) {
  return {
    ...row,
    id: Number(row.id),
    order_id: Number(row.order_id),
    amount: Number(row.amount),
    operator_id: Number(row.operator_id),
    voided_by: row.voided_by ? Number(row.voided_by) : null,
  };
}

async function getOrderForUpdate(orderId, connection) {
  const [rows] = await connection.query('SELECT * FROM orders WHERE id = ? LIMIT 1 FOR UPDATE', [orderId]);
  return rows[0] || null;
}

async function getPaymentForUpdate(paymentId, connection) {
  const [rows] = await connection.query(`SELECT p.*, o.total_amount AS order_total, o.status AS order_status
    FROM payments p JOIN orders o ON o.id = p.order_id WHERE p.id = ? LIMIT 1 FOR UPDATE`, [paymentId]);
  return rows[0] || null;
}

async function getPaidAmount(orderId, connection) {
  const [rows] = await connection.query("SELECT COALESCE(SUM(amount), 0) AS paid_amount FROM payments WHERE order_id = ? AND status = 'PAID'", [orderId]);
  return Number(rows[0].paid_amount);
}

async function listPayments(orderId, connection) {
  const [rows] = await connection.query(`SELECT p.*, s.display_name AS operator_name, v.display_name AS voided_by_name
    FROM payments p JOIN staff s ON s.id = p.operator_id LEFT JOIN staff v ON v.id = p.voided_by
    WHERE p.order_id = ? ORDER BY p.id DESC`, [orderId]);
  return rows.map(normalizePayment);
}

async function insertPayment(payload, connection) {
  const [result] = await connection.query(`INSERT INTO payments (order_id, amount, payment_method, status, operator_id)
    VALUES (?, ?, ?, 'PAID', ?)`, [payload.order_id, payload.amount, payload.payment_method, payload.operator_id]);
  return result.insertId;
}

async function voidPayment(paymentId, operatorId, reason, connection) {
  await connection.query(`UPDATE payments SET status = 'VOID', voided_at = CURRENT_TIMESTAMP, voided_by = ?, void_reason = ? WHERE id = ?`, [operatorId, reason || null, paymentId]);
}

module.exports = { getOrderForUpdate, getPaidAmount, getPaymentForUpdate, insertPayment, listPayments, voidPayment };