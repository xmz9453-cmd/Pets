const { getPool } = require('../config/database');
const paymentRepository = require('../data/payment.repository');

const VALID_METHODS = new Set(['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'MOBILE_PAYMENT']);

function validation(fields) { const error = new Error('Validation failed'); error.statusCode = 400; error.code = 'VALIDATION_ERROR'; error.fields = fields; return error; }
function notFound(code, message) { const error = new Error(message); error.statusCode = 404; error.code = code; return error; }
function conflict(code, message) { const error = new Error(message); error.statusCode = 409; error.code = code; return error; }
function parseId(value) { return Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null; }
function roundAmount(value) { return Math.round(Number(value) * 100) / 100; }

async function refreshOrderPaymentStatus(order, connection) {
  const paidAmount = roundAmount(await paymentRepository.getPaidAmount(order.id, connection));
  const remainingAmount = roundAmount(Math.max(0, Number(order.total_amount) - paidAmount));
  const status = paidAmount >= Number(order.total_amount) ? 'PAID' : 'UNPAID';
  await connection.query('UPDATE orders SET status = ? WHERE id = ?', [status, order.id]);
  return { paid_amount: paidAmount, remaining_amount: remainingAmount, payment_status: status };
}

async function getPayments(orderId) {
  const parsedId = parseId(orderId);
  if (!parsedId) throw notFound('ORDER_NOT_FOUND', 'Order not found');
  const connection = getPool();
  const [orders] = await connection.query('SELECT id, total_amount, status FROM orders WHERE id = ? LIMIT 1', [parsedId]);
  if (!orders[0]) throw notFound('ORDER_NOT_FOUND', 'Order not found');
  const paidAmount = roundAmount(await paymentRepository.getPaidAmount(parsedId, connection));
  return { payments: await paymentRepository.listPayments(parsedId, connection), summary: { order_total: Number(orders[0].total_amount), paid_amount: paidAmount, remaining_amount: roundAmount(Math.max(0, Number(orders[0].total_amount) - paidAmount)), payment_status: orders[0].status } };
}

async function createPayment(orderId, payload = {}, operatorId) {
  const parsedOrderId = parseId(orderId); const amount = roundAmount(payload.amount); const method = payload.payment_method;
  const errors = {};
  if (!parsedOrderId) errors.order_id = 'Order is invalid';
  if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Payment amount must be greater than zero';
  if (!VALID_METHODS.has(method)) errors.payment_method = 'Payment method is invalid';
  if (Object.keys(errors).length) throw validation(errors);
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const order = await paymentRepository.getOrderForUpdate(parsedOrderId, connection);
    if (!order) throw notFound('ORDER_NOT_FOUND', 'Order not found');
    if (order.status === 'CANCELLED') throw conflict('ORDER_CANCELLED', 'Cancelled orders cannot receive payment');
    const paidAmount = roundAmount(await paymentRepository.getPaidAmount(parsedOrderId, connection));
    const remainingAmount = roundAmount(Number(order.total_amount) - paidAmount);
    if (amount > remainingAmount) throw validation({ amount: 'Payment amount cannot exceed remaining amount' });
    const paymentId = await paymentRepository.insertPayment({ order_id: parsedOrderId, amount, payment_method: method, operator_id: operatorId }, connection);
    const summary = await refreshOrderPaymentStatus(order, connection);
    await connection.commit();
    return { payment: { id: paymentId, order_id: parsedOrderId, amount, payment_method: method, status: 'PAID' }, summary };
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

async function voidPayment(paymentId, payload = {}, operatorId) {
  const parsedPaymentId = parseId(paymentId); if (!parsedPaymentId) throw notFound('PAYMENT_NOT_FOUND', 'Payment not found');
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const payment = await paymentRepository.getPaymentForUpdate(parsedPaymentId, connection);
    if (!payment) throw notFound('PAYMENT_NOT_FOUND', 'Payment not found');
    const order = await paymentRepository.getOrderForUpdate(payment.order_id, connection);
    if (payment.status === 'VOID') throw conflict('PAYMENT_ALREADY_VOID', 'Payment is already void');
    if (payment.order_status === 'CANCELLED') throw conflict('ORDER_CANCELLED', 'Cancelled orders cannot be changed');
    await paymentRepository.voidPayment(parsedPaymentId, operatorId, payload.reason, connection);
    const summary = await refreshOrderPaymentStatus(order, connection);
    await connection.commit();
    return { payment: { ...payment, status: 'VOID', voided_by: operatorId, void_reason: payload.reason || null }, summary };
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

module.exports = { createPayment, getPayments, voidPayment };