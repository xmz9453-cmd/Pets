const { getPool } = require('../config/database');
const customerRepository = require('../data/customer.repository');
const productRepository = require('../data/product.repository');
const serviceRepository = require('../data/service.repository');
const orderRepository = require('../data/order.repository');

const VALID_BU = new Set(['DOG', 'CAT']);
const VALID_STATUS = new Set(['UNPAID', 'PAID', 'CANCELLED']);

function validation(fields) { const error = new Error('Validation failed'); error.statusCode = 400; error.code = 'VALIDATION_ERROR'; error.fields = fields; return error; }
function notFound() { const error = new Error('Order not found'); error.statusCode = 404; error.code = 'ORDER_NOT_FOUND'; return error; }
function conflict(code, message) { const error = new Error(message); error.statusCode = 409; error.code = code; return error; }
function id(value) { return Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null; }

async function validateItems(items, businessUnit, connection) {
  if (!Array.isArray(items) || items.length === 0) throw validation({ items: 'Order must contain at least one item' });
  const errors = {}; const normalized = []; let total = 0;
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index] || {}; const serviceId = id(item.service_id); const productId = id(item.product_id);
    if ((serviceId && productId) || (!serviceId && !productId)) { errors[`items[${index}]`] = 'Each item must reference one service or product'; continue; }
    const quantity = Number(item.quantity === undefined ? 1 : item.quantity); const price = Number(item.transaction_price);
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0) { errors[`items[${index}]`] = 'Quantity and transaction price must be valid'; continue; }
    const master = serviceId ? await serviceRepository.getServiceById(serviceId, connection) : await productRepository.getProductById(productId, connection);
    if (!master || master.status !== 'ACTIVE') { errors[`items[${index}]`] = serviceId ? 'Service is invalid' : 'Product is invalid'; continue; }
    if (master.species !== 'BOTH' && master.species !== businessUnit) { errors[`items[${index}]`] = 'Item does not match order business unit'; continue; }
    const transactionPrice = productId ? Number(master.price) : price;
    const amount = Math.round(transactionPrice * quantity * 100) / 100;
    normalized.push({ item_type: serviceId ? 'SERVICE' : 'PRODUCT', service_id: serviceId, product_id: productId, name: master.name, transaction_price: transactionPrice, quantity, item_amount: amount });
    total += amount;
  }
  if (Object.keys(errors).length) throw validation(errors);
  return { items: normalized, total: Math.round(total * 100) / 100 };
}

async function validateCustomer(customerId, connection) {
  const customer = await customerRepository.getCustomerById(customerId, connection);
  if (!customer || customer.status !== 'ACTIVE') throw validation({ customer_id: 'Customer is invalid' });
}

async function saveOrder(payload, existing = null) {
  const customerId = id(payload.customer_id ?? existing?.customer_id); const businessUnit = payload.business_unit || existing?.business_unit;
  if (!customerId) throw validation({ customer_id: 'Customer is required' });
  if (!VALID_BU.has(businessUnit)) throw validation({ business_unit: 'Business unit must be DOG or CAT' });
  const status = payload.status || existing?.status || 'UNPAID';
  if (!VALID_STATUS.has(status)) throw validation({ status: 'Order status is invalid' });
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction(); await validateCustomer(customerId, connection);
    const itemResult = await validateItems(payload.items ?? existing?.items, businessUnit, connection);
    const orderId = existing ? existing.id : await orderRepository.insertOrder({ customer_id: customerId, business_unit: businessUnit, status, total_amount: itemResult.total }, connection);
    if (existing) { await orderRepository.updateOrder(orderId, { customer_id: customerId, business_unit: businessUnit, status, total_amount: itemResult.total }, connection); await orderRepository.deleteItems(orderId, connection); }
    for (const item of itemResult.items) await orderRepository.insertItem(orderId, item, connection);
    await connection.commit(); return orderId;
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

async function listOrders(filters) { return orderRepository.listOrders(filters); }
async function getOrder(orderId) { const order = await orderRepository.getOrderById(orderId); if (!order) throw notFound(); return { order }; }
async function createOrder(payload = {}) { const orderId = await saveOrder(payload); return getOrder(orderId); }
async function updateOrder(orderId, payload = {}) {
  const existing = await orderRepository.getOrderById(orderId); if (!existing) throw notFound();
  if (existing.status !== 'UNPAID') throw conflict('ORDER_READ_ONLY', 'Completed or cancelled orders cannot be edited');
  const orderIdResult = await saveOrder(payload, existing); return getOrder(orderIdResult);
}

module.exports = { createOrder, getOrder, listOrders, updateOrder };