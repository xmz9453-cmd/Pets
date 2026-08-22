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

async function ensureCustomer(name, phone) {
  const [rows] = await getPool().query('SELECT id FROM customers WHERE phone = ? LIMIT 1', [phone]);
  if (rows.length) {
    return rows[0].id;
  }

  const [result] = await getPool().query(
    'INSERT INTO customers (name, phone, status) VALUES (?, ?, "ACTIVE")',
    [name, phone],
  );

  return result.insertId;
}

async function ensureInactiveCustomer(name, phone) {
  const customerId = await ensureCustomer(name, phone);
  await getPool().query('UPDATE customers SET status = "INACTIVE" WHERE id = ?', [customerId]);
  return customerId;
}

describe('Pet API', () => {
  beforeAll(async () => {
    await setup();
    await getPool().query('DELETE FROM auth_sessions');
  });

  afterEach(async () => {
    await getPool().query('DELETE FROM auth_sessions');
    await getPool().query('DELETE FROM pet_customer_relationships');
    await getPool().query('DELETE FROM pets');
    await getPool().query('DELETE FROM customers');
  });

  afterAll(async () => {
    await closePool();
  });

  test('POST /api/pets creates a pet with a primary customer relationship', async () => {
    const { agent } = await loginAsOwner();
    const customerId = await ensureCustomer('Alice Pet Owner', '0912000001');

    const response = await agent.post('/api/pets').send({
      name: 'Milo',
      species: 'DOG',
      gender: 'MALE',
      customer_id: customerId,
      weight: 12.5,
      weight_unit: 'KG',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.pet).toMatchObject({
      name: 'Milo',
      species: 'DOG',
      gender: 'MALE',
      status: 'ACTIVE',
    });

    const [petRows] = await getPool().query('SELECT id, status FROM pets WHERE name = ?', ['Milo']);
    expect(petRows).toHaveLength(1);

    const [relationshipRows] = await getPool().query(
      'SELECT pet_id, customer_id, is_primary FROM pet_customer_relationships WHERE pet_id = ?',
      [petRows[0].id],
    );
    expect(relationshipRows).toEqual([
      expect.objectContaining({
        customer_id: customerId,
        is_primary: 1,
      }),
    ]);
  });

  test('PUT /api/pets/:id updates status and validation rejects invalid species', async () => {
    const { agent } = await loginAsOwner();
    const customerId = await ensureCustomer('Valid Customer', '0912000002');

    const createResponse = await agent.post('/api/pets').send({
      name: 'Luna',
      species: 'CAT',
      gender: 'FEMALE',
      customer_id: customerId,
    });

    expect(createResponse.status).toBe(201);

    const deactivateResponse = await agent.put(`/api/pets/${createResponse.body.data.pet.id}`).send({ status: 'INACTIVE' });
    expect(deactivateResponse.status).toBe(200);
    expect(deactivateResponse.body.data.pet.status).toBe('INACTIVE');

    const activateResponse = await agent.put(`/api/pets/${createResponse.body.data.pet.id}`).send({ status: 'ACTIVE' });
    expect(activateResponse.status).toBe(200);
    expect(activateResponse.body.data.pet.status).toBe('ACTIVE');

    const invalidResponse = await agent.post('/api/pets').send({
      name: 'Bad',
      species: 'BIRD',
      gender: 'UNKNOWN',
      customer_id: customerId,
    });

    expect(invalidResponse.status).toBe(400);
    expect(invalidResponse.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('enforces customer status, birthday validation, filtering, and customer transfer', async () => {
    const { agent } = await loginAsOwner();
    const firstCustomerId = await ensureCustomer('First Owner', '0912000003');
    const secondCustomerId = await ensureCustomer('Second Owner', '0912000004');
    const inactiveCustomerId = await ensureInactiveCustomer('Inactive Owner', '0912000005');

    const inactiveCreate = await agent.post('/api/pets').send({
      customer_id: inactiveCustomerId,
      name: 'Blocked',
      species: 'DOG',
    });
    expect(inactiveCreate.status).toBe(400);

    const futureCreate = await agent.post('/api/pets').send({
      customer_id: firstCustomerId,
      name: 'Future',
      species: 'CAT',
      birthday: '2999-01-01',
    });
    expect(futureCreate.status).toBe(400);

    const invalidDate = await agent.post('/api/pets').send({
      customer_id: firstCustomerId,
      name: 'Invalid Date',
      species: 'CAT',
      birthday: '2024-02-30',
    });
    expect(invalidDate.status).toBe(400);

    const created = await agent.post('/api/pets').send({
      customer_id: firstCustomerId,
      name: 'Filter Me',
      species: 'CAT',
      birthday: '2020-02-29',
    });
    expect(created.status).toBe(201);
    const petId = created.body.data.pet.id;

    const filtered = await agent.get(`/api/pets?search=Filter%20Me&customer_id=${firstCustomerId}&status=ACTIVE`);
    expect(filtered.status).toBe(200);
    expect(filtered.body.data.pets.map((pet) => pet.id)).toContain(petId);

    const transferred = await agent.put(`/api/pets/${petId}`).send({ customer_id: secondCustomerId });
    expect(transferred.status).toBe(200);
    const detail = await agent.get(`/api/pets/${petId}`);
    expect(detail.body.data.pet.customer_id).toBe(secondCustomerId);
    expect(detail.body.data.pet.customer_name).toBe('Second Owner');
  });

  test('requires authentication and returns not found for unknown pets', async () => {
    const unauthenticated = await request(app).get('/api/pets');
    expect(unauthenticated.status).toBe(401);

    const { agent } = await loginAsOwner();
    const missing = await agent.get('/api/pets/999999999');
    expect(missing.status).toBe(404);
  });
});
