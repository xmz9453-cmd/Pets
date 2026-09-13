const { getPool } = require('../config/database');
const customerRepository = require('../data/customer.repository');
const productRepository = require('../data/product.repository');
const serviceRepository = require('../data/service.repository');
const orderRepository = require('../data/order.repository');

const VALID_BU = new Set(['DOG', 'CAT']);
const VALID_STATUS = new Set(['UNPAID', 'PAID', 'CANCELLED']);
const VALID_SOURCE_TYPES = new Set(['WALK_IN', 'APPOINTMENT']);

function validation(fields) { const error = new Error('Validation failed'); error.statusCode = 400; error.code = 'VALIDATION_ERROR'; error.fields = fields; return error; }
function notFound() { const error = new Error('Order not found'); error.statusCode = 404; error.code = 'ORDER_NOT_FOUND'; return error; }
function conflict(code, message) { const error = new Error(message); error.statusCode = 409; error.code = code; return error; }
function id(value) { return Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null; }

async function validateItems(items, businessUnit, connection, sourceType = 'WALK_IN') {
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
    const transactionPrice = productId || sourceType === 'APPOINTMENT' ? Number(master.price) : price;
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

async function validateOrderSource(payload, customerId, connection) {
  const sourceType = payload.source_type || 'WALK_IN';
  const appointmentId = id(payload.appointment_id);
  if (!VALID_SOURCE_TYPES.has(sourceType)) throw validation({ source_type: 'Order source must be WALK_IN or APPOINTMENT' });
  if (sourceType === 'WALK_IN') {
    if (payload.appointment_id !== undefined && payload.appointment_id !== null && payload.appointment_id !== '') {
      throw validation({ appointment_id: 'Walk-in orders cannot reference an appointment' });
    }
    return { sourceType, appointmentId: null };
  }
  if (!appointmentId) throw validation({ appointment_id: 'Appointment is required for appointment orders' });
  const [appointments] = await connection.query('SELECT id, customer_id, status FROM appointments WHERE id = ? LIMIT 1', [appointmentId]);
  const appointment = appointments[0];
  if (!appointment) throw validation({ appointment_id: 'Appointment is invalid' });
  if (Number(appointment.customer_id) !== customerId) throw validation({ appointment_id: 'Appointment does not belong to customer' });
  return { sourceType, appointmentId, appointment };
}

async function validateAppointmentServiceItems(appointmentId, items, connection) {
  const serviceItems = (items || []).filter((item) => id(item?.service_id));
  if (serviceItems.length === 0) return;

  for (const item of serviceItems) {
    const serviceId = id(item.service_id);
    const [serviceRows] = await connection.query(
      'SELECT id, type, status FROM services WHERE id = ? LIMIT 1',
      [serviceId],
    );
    const service = serviceRows[0];
    if (!service || service.status !== 'ACTIVE') {
      throw validation({ items: 'Service is invalid' });
    }

    let completedRows = [];
    if (service.type === 'GROOMING') {
      [completedRows] = await connection.query(
        `SELECT 1
         FROM daily_operations d
         INNER JOIN groomings g ON g.daily_operation_id = d.id
         WHERE d.appointment_id = ?
           AND d.status = 'COMPLETED'
           AND g.pet_id IN (SELECT pet_id FROM appointment_pets WHERE appointment_id = ?)
           AND g.before_condition IS NOT NULL
           AND g.actual_grooming_content IS NOT NULL
           AND g.grooming_result IS NOT NULL
         LIMIT 1`,
        [appointmentId, appointmentId],
      );
    } else if (service.type === 'BOARDING') {
      [completedRows] = await connection.query(
        `SELECT 1
         FROM boardings b
         WHERE b.appointment_id = ? AND b.service_id = ? AND b.status = 'COMPLETED'
         LIMIT 1`,
        [appointmentId, serviceId],
      );
    } else {
      throw validation({ items: 'Appointment source orders only support grooming or boarding services' });
    }

    if (!completedRows.length) {
      throw validation({ items: 'Appointment service must be completed before billing' });
    }

    const [billedRows] = await connection.query(
      `SELECT 1
       FROM order_items oi
       INNER JOIN orders o ON o.id = oi.order_id
       WHERE o.appointment_id = ? AND o.source_type = 'APPOINTMENT'
         AND oi.service_id = ? AND oi.item_type = 'SERVICE'
       LIMIT 1`,
      [appointmentId, serviceId],
    );
    if (billedRows.length) {
      throw conflict('SERVICE_ALREADY_BILLED', 'Completed appointment service has already been billed');
    }
  }
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
    const source = existing
      ? { sourceType: existing.source_type || 'WALK_IN', appointmentId: existing.appointment_id }
      : await validateOrderSource(payload, customerId, connection);
    const itemResult = await validateItems(payload.items ?? existing?.items, businessUnit, connection, source.sourceType);
    if (!existing && source.sourceType === 'APPOINTMENT') {
      await validateAppointmentServiceItems(source.appointmentId, itemResult.items, connection);
    }
    const orderId = existing ? existing.id : await orderRepository.insertOrder({ customer_id: customerId, source_type: source.sourceType, appointment_id: source.appointmentId, business_unit: businessUnit, status, total_amount: itemResult.total }, connection);
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

async function deleteOrder(orderId) {
  const normalizedOrderId = id(orderId);
  if (!normalizedOrderId) throw notFound();
  await orderRepository.deleteOrder(normalizedOrderId);
  return { message: 'Order deleted successfully' };
}

module.exports = { createOrder, deleteOrder, getOrder, listOrders, updateOrder };