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
let customerSequence = 0;

async function login() { const agent = request.agent(app); await agent.post('/api/auth/login').send({ username: owner.username, password: owner.password }); return agent; }
async function createCustomer(agent) { customerSequence += 1; const suffix = `${Date.now()}${customerSequence}`.slice(-8); const response = await agent.post('/api/customers').send({ name: `Order Client ${suffix}`, phone: `09${suffix}` }); return response.body.data.customer.id; }

describe('Order API', () => {
  beforeAll(async () => { await setup(); await getPool().query('DELETE FROM auth_sessions'); });
    beforeEach(async () => { await getPool().query('DELETE FROM payments'); await getPool().query('DELETE FROM order_items'); await getPool().query('DELETE FROM orders'); await getPool().query('DELETE FROM products'); await getPool().query('DELETE FROM auth_sessions'); });
    afterAll(async () => { await getPool().query("DELETE FROM payments WHERE order_id IN (SELECT o.id FROM orders o INNER JOIN customers c ON c.id = o.customer_id WHERE c.name LIKE 'Order Client %')"); await getPool().query("DELETE FROM order_items WHERE order_id IN (SELECT o.id FROM orders o INNER JOIN customers c ON c.id = o.customer_id WHERE c.name LIKE 'Order Client %')"); await getPool().query("DELETE FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE name LIKE 'Order Client %')"); await getPool().query("DELETE FROM appointments WHERE customer_id IN (SELECT id FROM customers WHERE name LIKE 'Order Client %')"); await closePool(); });

  test('requires authentication and rejects empty orders', async () => {
    expect((await request(app).get('/api/orders')).status).toBe(401);
    const agent = await login(); const customerId = await createCustomer(agent);
    const response = await agent.post('/api/orders').send({ customer_id: customerId, business_unit: 'DOG', items: [] });
    expect(response.status).toBe(400); expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('creates walk-in mixed order with transaction prices and persists total', async () => {
    const agent = await login(); const customerId = await createCustomer(agent);
    const [serviceRows] = await getPool().query("SELECT id FROM services WHERE type = 'GROOMING' AND status = 'ACTIVE' LIMIT 1");
    const productResponse = await agent.post('/api/products').send({ name: `Order Snack ${customerSequence}`, price: 200, unit: '件', species: 'DOG' });
    const serviceId = serviceRows[0].id; const productId = productResponse.body.data.product.id;
    const response = await agent.post('/api/orders').send({ customer_id: customerId, business_unit: 'DOG', items: [{ service_id: serviceId, transaction_price: 800, quantity: 1 }, { product_id: productId, transaction_price: 200, quantity: 2 }] });
    expect(response.status).toBe(201); expect(response.body.data.order.total_amount).toBe(1200); expect(response.body.data.order.items).toHaveLength(2);
    const orderId = response.body.data.order.id; const detail = await agent.get(`/api/orders/${orderId}`);
    expect(detail.status).toBe(200); expect(detail.body.data.order.items[0].transaction_price).toBe(800); expect(detail.body.data.order.status).toBe('UNPAID');
    await getPool().query('UPDATE products SET price = 999 WHERE id = ?', [productId]);
    const historical = await agent.get(`/api/orders/${orderId}`);
    expect(historical.body.data.order.items[1].transaction_price).toBe(200); expect(historical.body.data.order.total_amount).toBe(1200);
    const future = await agent.post('/api/orders').send({ customer_id: customerId, business_unit: 'DOG', items: [{ product_id: productId, transaction_price: 1, quantity: 1 }] });
    expect(future.body.data.order.items[0].transaction_price).toBe(999);
  });

  test('rejects inactive and invalid products for new orders', async () => {
    const agent = await login(); const customerId = await createCustomer(agent);
    const productResponse = await agent.post('/api/products').send({ name: `Inactive Product ${customerSequence}`, price: 300, species: 'DOG' });
    const productId = productResponse.body.data.product.id;
    expect((await agent.post(`/api/products/${productId}/disable`)).status).toBe(200);
    const inactive = await agent.post('/api/orders').send({ customer_id: customerId, business_unit: 'DOG', items: [{ product_id: productId, quantity: 1 }] });
    expect(inactive.status).toBe(400);
    const invalid = await agent.post('/api/orders').send({ customer_id: customerId, business_unit: 'DOG', items: [{ product_id: 999999, quantity: 1 }] });
    expect(invalid.status).toBe(400);
  });

  test('rejects invalid references and cross business unit items', async () => {
    const agent = await login(); const customerId = await createCustomer(agent);
    const productResponse = await agent.post('/api/products').send({ name: `Cat Product ${customerSequence}`, price: 300, unit: '件', species: 'CAT' });
    const catProductId = productResponse.body.data.product.id;
    const invalidCustomer = await agent.post('/api/orders').send({ customer_id: 999999, business_unit: 'DOG', items: [{ product_id: catProductId, transaction_price: 300, quantity: 1 }] });
    expect(invalidCustomer.status).toBe(400);
    const crossUnit = await agent.post('/api/orders').send({ customer_id: customerId, business_unit: 'DOG', items: [{ product_id: catProductId, transaction_price: 300, quantity: 1 }] });
    expect(crossUnit.status).toBe(400);
  });

  test('updates unpaid order and protects completed order', async () => {
    const agent = await login(); const customerId = await createCustomer(agent); const [serviceRows] = await getPool().query("SELECT id FROM services WHERE status = 'ACTIVE' LIMIT 1");
    const created = await agent.post('/api/orders').send({ customer_id: customerId, business_unit: 'DOG', items: [{ service_id: serviceRows[0].id, transaction_price: 100, quantity: 1 }] });
    const orderId = created.body.data.order.id; const updated = await agent.patch(`/api/orders/${orderId}`).send({ status: 'PAID', customer_id: customerId, business_unit: 'DOG', items: [{ service_id: serviceRows[0].id, transaction_price: 100, quantity: 1 }] });
    expect(updated.status).toBe(200); expect(updated.body.data.order.status).toBe('PAID');
    const blocked = await agent.patch(`/api/orders/${orderId}`).send({ status: 'UNPAID', customer_id: customerId, business_unit: 'DOG', items: [{ service_id: serviceRows[0].id, transaction_price: 1, quantity: 1 }] });
    expect(blocked.status).toBe(409); expect(blocked.body.error.code).toBe('ORDER_READ_ONLY');
  });

  test('deletes a pure unpaid walk-in order without deleting its customer', async () => {
    const agent = await login(); const customerId = await createCustomer(agent); const [serviceRows] = await getPool().query("SELECT id FROM services WHERE status = 'ACTIVE' LIMIT 1");
    const created = await agent.post('/api/orders').send({ customer_id: customerId, business_unit: 'DOG', items: [{ service_id: serviceRows[0].id, transaction_price: 100, quantity: 1 }] });
    const orderId = created.body.data.order.id;

    const response = await agent.delete(`/api/orders/${orderId}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ message: 'Order deleted successfully' });
    expect((await agent.get(`/api/orders/${orderId}`)).status).toBe(404);
    expect((await agent.get(`/api/customers/${customerId}`)).status).toBe(200);
  });

  test('does not delete an order or payment when payment exists', async () => {
    const agent = await login(); const customerId = await createCustomer(agent); const [serviceRows] = await getPool().query("SELECT id FROM services WHERE status = 'ACTIVE' LIMIT 1");
    const created = await agent.post('/api/orders').send({ customer_id: customerId, business_unit: 'DOG', items: [{ service_id: serviceRows[0].id, transaction_price: 100, quantity: 1 }] });
    const orderId = created.body.data.order.id;
    const [staffRows] = await getPool().query('SELECT id FROM staff WHERE username = ? LIMIT 1', [owner.username]);
    await getPool().query('INSERT INTO payments (order_id, amount, payment_method, operator_id, status) VALUES (?, 1, \'CASH\', ?, \'PAID\')', [orderId, staffRows[0].id]);

    const response = await agent.delete(`/api/orders/${orderId}`);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('ORDER_DELETE_PROTECTED');
    expect((await agent.get(`/api/orders/${orderId}`)).status).toBe(200);
    const [paymentRows] = await getPool().query('SELECT id FROM payments WHERE order_id = ?', [orderId]);
    expect(paymentRows).toHaveLength(1);
  });

  test('does not delete an order linked to an appointment', async () => {
    const agent = await login(); const customerId = await createCustomer(agent);
    const [appointmentResult] = await getPool().query(
      'INSERT INTO appointments (customer_id, appointment_date, appointment_time) VALUES (?, \'2026-12-21\', \'11:00:00\')',
      [customerId],
    );
    const [orderResult] = await getPool().query(
      'INSERT INTO orders (customer_id, source_type, appointment_id, business_unit, status, total_amount) VALUES (?, \'APPOINTMENT\', ?, \'DOG\', \'UNPAID\', 0)',
      [customerId, appointmentResult.insertId],
    );

    const response = await agent.delete(`/api/orders/${orderResult.insertId}`);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('ORDER_DELETE_PROTECTED');
    expect((await agent.get(`/api/orders/${orderResult.insertId}`)).status).toBe(200);
    expect((await agent.get(`/api/appointments/${appointmentResult.insertId}`)).status).toBe(200);
  });
});