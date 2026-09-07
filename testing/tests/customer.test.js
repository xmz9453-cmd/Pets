const request = require('supertest');
const fs = require('fs');
const path = require('path');

function loadLocalEnvForTestDatabase() {
  const envPath = path.resolve(__dirname, '..', '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    lines.forEach((line) => {
      const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
      if (match && process.env[match[1]] === undefined) {
        process.env[match[1]] = match[2];
      }
    });
  }

  process.env.NODE_ENV = 'test';
  process.env.DB_NAME = process.env.TEST_DB_NAME || 'psop_test';
}

loadLocalEnvForTestDatabase();

const app = require('../../backend/src/app');
const { setup } = require('../../database/scripts/setup');
const { getPool, closePool } = require('../../backend/src/config/database');
const { getFoundationOwner } = require('../../database/seeds/staff-authentication-seed');

const owner = getFoundationOwner();

async function loginAsOwner() {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/login').send({
    username: owner.username,
    password: owner.password,
  });

  return { agent, response };
}

async function createCustomerRecord(agent, customer) {
  return agent.post('/api/customers').send(customer);
}

async function cleanCustomerData() {
  await getPool().query('DELETE FROM auth_sessions');
  await getPool().query('DELETE FROM boardings');
  await getPool().query('DELETE FROM groomings');
  await getPool().query('DELETE FROM daily_operations');
  await getPool().query('DELETE FROM appointment_pet_services');
  await getPool().query('DELETE FROM appointment_pets');
  await getPool().query('DELETE FROM payments');
  await getPool().query('DELETE FROM order_items');
  await getPool().query('DELETE FROM orders');
  await getPool().query('DELETE FROM appointments');
  await getPool().query('DELETE FROM pet_customer_relationships');
  await getPool().query('DELETE FROM pets');
  await getPool().query('DELETE FROM customers');
}

describe('Customer API', () => {
  beforeAll(async () => {
    await setup();
    await cleanCustomerData();
  });

  afterEach(async () => {
    await cleanCustomerData();
  });

  afterAll(async () => {
    await closePool();
  });

  test('POST /api/customers creates a customer and GET /api/customers supports search and status', async () => {
    const { agent } = await loginAsOwner();

    const createResponse = await createCustomerRecord(agent, {
      name: 'Alice Smith',
      phone: '0912-345-678',
      note: 'VIP customer',
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data.customer).toMatchObject({
      name: 'Alice Smith',
      phone: '0912-345-678',
      status: 'ACTIVE',
    });

    const listResponse = await agent.get('/api/customers?status=ALL&search=Alice');
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.success).toBe(true);
    expect(listResponse.body.data.customers).toHaveLength(1);

    const phoneSearchResponse = await agent.get('/api/customers?status=ALL&search=0912');
    expect(phoneSearchResponse.status).toBe(200);
    expect(phoneSearchResponse.body.data.customers[0].phone).toBe('0912-345-678');
  });

  test('GET /api/customers/:id and lifecycle operations work with validation', async () => {
    const { agent } = await loginAsOwner();

    const createResponse = await createCustomerRecord(agent, {
      name: 'Bob Example',
      phone: '0911-111-111',
      note: 'Needs grooming',
    });

    const customerId = createResponse.body.data.customer.id;

    const detailResponse = await agent.get(`/api/customers/${customerId}`);
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data.customer.id).toBe(customerId);

    const deactivateResponse = await agent.patch(`/api/customers/${customerId}/deactivate`);
    expect(deactivateResponse.status).toBe(200);
    expect(deactivateResponse.body.data.customer.status).toBe('INACTIVE');

    const reactivateResponse = await agent.patch(`/api/customers/${customerId}/reactivate`);
    expect(reactivateResponse.status).toBe(200);
    expect(reactivateResponse.body.data.customer.status).toBe('ACTIVE');

    const invalidNameResponse = await agent.post('/api/customers').send({
      name: '   ',
      phone: '0911-222-222',
    });
    expect(invalidNameResponse.status).toBe(400);
    expect(invalidNameResponse.body.error.code).toBe('VALIDATION_ERROR');

    const invalidPhoneResponse = await agent.post('/api/customers').send({
      name: 'Invalid Phone',
      phone: 'invalid-phone',
    });
    expect(invalidPhoneResponse.status).toBe(400);
    expect(invalidPhoneResponse.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('Customer API requires authentication and rejects invalid lifecycle transitions', async () => {
    const anonymousResponse = await request(app).get('/api/customers');
    expect(anonymousResponse.status).toBe(401);

    const { agent } = await loginAsOwner();
    const createResponse = await createCustomerRecord(agent, {
      name: 'Charlie Pet',
      phone: '0912-555-333',
    });
    const customerId = createResponse.body.data.customer.id;

    const reActivateResponse = await agent.patch(`/api/customers/${customerId}/reactivate`);
    expect(reActivateResponse.status).toBe(400);
    expect(reActivateResponse.body.error.code).toBe('VALIDATION_ERROR');

    const deactivateResponse = await agent.patch(`/api/customers/${customerId}/deactivate`);
    expect(deactivateResponse.status).toBe(200);
    const deactivateAgainResponse = await agent.patch(`/api/customers/${customerId}/deactivate`);
    expect(deactivateAgainResponse.status).toBe(400);
  });
});
