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

async function login() { const agent = request.agent(app); await agent.post('/api/auth/login').send({ username: owner.username, password: owner.password }); return agent; }
async function createOrder(agent, total = 1000) {
  sequence += 1; const suffix = `${Date.now()}${sequence}`.slice(-8);
  const customer = await agent.post('/api/customers').send({ name: `Payment Client ${suffix}`, phone: `09${suffix}` });
  const [services] = await getPool().query("SELECT id FROM services WHERE status = 'ACTIVE' LIMIT 1");
  const response = await agent.post('/api/orders').send({ customer_id: customer.body.data.customer.id, business_unit: 'DOG', items: [{ service_id: services[0].id, transaction_price: total, quantity: 1 }] });
  return response.body.data.order.id;
}

describe('Payment API', () => {
  beforeAll(async () => { await setup(); });
  beforeEach(async () => { await getPool().query('DELETE FROM payments'); await getPool().query('DELETE FROM order_items'); await getPool().query('DELETE FROM orders'); await getPool().query('DELETE FROM auth_sessions'); });
  afterAll(async () => { await closePool(); });

  test('creates multiple mixed payments and recalculates order totals', async () => {
    const agent = await login(); const orderId = await createOrder(agent);
    const first = await agent.post(`/api/orders/${orderId}/payments`).send({ amount: 400, payment_method: 'CASH' });
    const second = await agent.post(`/api/orders/${orderId}/payments`).send({ amount: 600, payment_method: 'CREDIT_CARD' });
    expect(first.status).toBe(201); expect(second.status).toBe(201); expect(second.body.data.summary).toMatchObject({ paid_amount: 1000, remaining_amount: 0, payment_status: 'PAID' });
    const history = await agent.get(`/api/orders/${orderId}/payments`);
    expect(history.body.data.payments).toHaveLength(2); expect(history.body.data.payments.map((payment) => payment.payment_method)).toEqual(expect.arrayContaining(['CASH', 'CREDIT_CARD']));
  });

  test('rejects invalid, overpayment, and cancelled order payments', async () => {
    const agent = await login(); const orderId = await createOrder(agent);
    expect((await agent.post(`/api/orders/${orderId}/payments`).send({ amount: 0, payment_method: 'CASH' })).status).toBe(400);
    expect((await agent.post(`/api/orders/${orderId}/payments`).send({ amount: 1001, payment_method: 'CASH' })).status).toBe(400);
    expect((await agent.post(`/api/orders/${orderId}/payments`).send({ amount: 10, payment_method: 'UNKNOWN' })).status).toBe(400);
  });

  test('voids without deleting, recalculates, and prevents repeated void', async () => {
    const agent = await login(); const orderId = await createOrder(agent); const created = await agent.post(`/api/orders/${orderId}/payments`).send({ amount: 300, payment_method: 'BANK_TRANSFER' }); const paymentId = created.body.data.payment.id;
    const voided = await agent.post(`/api/payments/${paymentId}/void`).send({ reason: '輸入錯誤' });
    expect(voided.status).toBe(200); expect(voided.body.data.summary).toMatchObject({ paid_amount: 0, remaining_amount: 1000, payment_status: 'UNPAID' });
    const history = await agent.get(`/api/orders/${orderId}/payments`); expect(history.body.data.payments).toHaveLength(1); expect(history.body.data.payments[0].status).toBe('VOID');
    const repeated = await agent.post(`/api/payments/${paymentId}/void`).send({}); expect(repeated.status).toBe(409); expect(repeated.body.error.code).toBe('PAYMENT_ALREADY_VOID');
  });
});