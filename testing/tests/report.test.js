const request = require('supertest');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((line) => { const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/); if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2]; });
process.env.NODE_ENV = 'test'; process.env.DB_NAME = process.env.TEST_DB_NAME || 'psop_test';

const app = require('../../backend/src/app');
const { setup } = require('../../database/scripts/setup');
const { getPool, closePool } = require('../../backend/src/config/database');
const { getFoundationOwner } = require('../../database/seeds/staff-authentication-seed');

const owner = getFoundationOwner();
let sequence = 0;

async function login() {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ username: owner.username, password: owner.password });
  return agent;
}

async function createCustomer(agent) {
  sequence += 1;
  const suffix = `${Date.now()}${sequence}`.slice(-8);
  const response = await agent.post('/api/customers').send({ name: `Report Client ${suffix}`, phone: `09${suffix}` });
  return response.body.data.customer.id;
}

async function createOrder(agent, customerId, item) {
  const response = await agent.post('/api/orders').send({ customer_id: customerId, business_unit: 'DOG', items: [item] });
  expect(response.status).toBe(201);
  return response.body.data.order.id;
}

async function setOrderDate(orderId, date) {
  await getPool().query('UPDATE orders SET created_at = ? WHERE id = ?', [`${date} 12:00:00`, orderId]);
}

async function setPaymentDate(paymentId, date) {
  await getPool().query('UPDATE payments SET paid_at = ? WHERE id = ?', [`${date} 12:00:00`, paymentId]);
}

describe('Report API', () => {
  beforeAll(async () => { await setup(); });
  beforeEach(async () => {
    await getPool().query('DELETE FROM boardings');
    await getPool().query('DELETE FROM payments');
    await getPool().query('DELETE FROM order_items');
    await getPool().query('DELETE FROM orders');
    await getPool().query('DELETE FROM products');
    await getPool().query('DELETE FROM auth_sessions');
  });
  afterAll(async () => {
    await getPool().query('DELETE FROM boardings');
    await getPool().query('DELETE FROM payments');
    await getPool().query('DELETE FROM order_items');
    await getPool().query('DELETE FROM orders');
    await getPool().query('DELETE FROM products');
    await getPool().query('DELETE FROM auth_sessions');
    await closePool();
  });

  test('requires authentication and validates the date range', async () => {
    expect((await request(app).get('/api/reports')).status).toBe(401);
    const agent = await login();
    const invalid = await agent.get('/api/reports?start_date=2026-09-02&end_date=2026-09-01');
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toMatchObject({ code: 'VALIDATION_ERROR', fields: { date_range: '開始日期不得晚於結束日期' } });
  });

  test('aggregates orders, payments, products, services, and boarding without void payments', async () => {
    const agent = await login();
    const customerId = await createCustomer(agent);
    const [serviceRows] = await getPool().query("SELECT id FROM services WHERE type = 'GROOMING' AND status = 'ACTIVE' LIMIT 1");
    const [boardingServiceRows] = await getPool().query("SELECT id FROM services WHERE type = 'BOARDING' AND status = 'ACTIVE' LIMIT 1");
    const [petRows] = await getPool().query('SELECT id FROM pets WHERE status = \'ACTIVE\' LIMIT 1');
    const product = await agent.post('/api/products').send({ name: `Report Product ${sequence}`, price: 150, unit: '件', species: 'DOG' });
    const serviceId = serviceRows[0].id;
    const boardingServiceId = boardingServiceRows[0].id;
    const productId = product.body.data.product.id;
    const serviceOrderId = await createOrder(agent, customerId, { service_id: serviceId, transaction_price: 800, quantity: 1 });
    const productOrderId = await createOrder(agent, customerId, { product_id: productId, transaction_price: 150, quantity: 2 });
    const boardingOrderId = await createOrder(agent, customerId, { service_id: boardingServiceId, transaction_price: 500, quantity: 1 });
    const cancelledOrderId = await createOrder(agent, customerId, { service_id: serviceId, transaction_price: 300, quantity: 1 });
    await setOrderDate(serviceOrderId, '2026-08-23');
    await setOrderDate(productOrderId, '2026-08-23');
    await setOrderDate(boardingOrderId, '2026-08-23');
    await setOrderDate(cancelledOrderId, '2026-08-23');
    await getPool().query("UPDATE orders SET status = 'CANCELLED' WHERE id = ?", [cancelledOrderId]);
    const payment = await agent.post(`/api/orders/${serviceOrderId}/payments`).send({ amount: 400, payment_method: 'CASH' });
    await setPaymentDate(payment.body.data.payment.id, '2026-08-23');
    const voidPayment = await agent.post(`/api/orders/${productOrderId}/payments`).send({ amount: 300, payment_method: 'CREDIT_CARD' });
    await setPaymentDate(voidPayment.body.data.payment.id, '2026-08-23');
    await agent.post(`/api/payments/${voidPayment.body.data.payment.id}/void`).send({ reason: '測試作廢' });
    await getPool().query('INSERT INTO boardings (customer_id, pet_id, service_id, status, created_at) VALUES (?, ?, ?, \'PENDING\', ?)', [customerId, petRows[0].id, boardingServiceId, '2026-08-23 12:00:00']);
    await getPool().query('UPDATE products SET price = 999 WHERE id = ?', [productId]);

    const response = await agent.get('/api/reports?start_date=2026-08-23&end_date=2026-08-23');
    expect(response.status).toBe(200);
    expect(response.body.data.summary).toMatchObject({ total_orders: 4, valid_orders: 3, completed_orders: 0, cancelled_orders: 1, average_order_amount: 533.333333, actual_revenue: 400, outstanding_amount: 1200 });
    expect(response.body.data.payment_methods).toEqual([{ payment_method: 'CASH', payment_count: 1, payment_amount: 400 }]);
    expect(response.body.data.daily_revenue).toEqual([{ date: '2026-08-23', order_count: 1, payment_amount: 400 }]);
    expect(response.body.data.products).toEqual([{ product_id: productId, name: product.body.data.product.name, quantity: 2, amount: 300 }]);
    expect(response.body.data.services).toEqual(expect.arrayContaining([
      { service_id: serviceId, name: expect.any(String), quantity: 1, amount: 800 },
      { service_id: boardingServiceId, name: expect.any(String), quantity: 1, amount: 500 },
    ]));
    expect(response.body.data.boarding).toMatchObject({ usage_count: 1, identifiable_transaction_quantity: 1, identifiable_transaction_amount: 500 });
  });
});