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
const { hashPassword } = require('../../backend/src/utils/password');

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

  test('POST /api/customers accepts omitted or blank id card values', async () => {
    const { agent } = await loginAsOwner();

    const createResponse = await createCustomerRecord(agent, {
      name: 'Blank ID Customer',
      phone: '0912-111-222',
      idCardNumber: '',
      emergencyContactName: 'Guardian',
      emergencyContactPhone: '0911-333-444',
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data.customer.id_card_number).toBeNull();
    expect(createResponse.body.data.customer.emergency_contact_name).toBe('Guardian');

    const detailResponse = await agent.get(`/api/customers/${createResponse.body.data.customer.id}`);
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data.customer.id_card_number).toBeNull();
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

  test('GET /api/customers returns pet counts from each customer relationship', async () => {
    const { agent } = await loginAsOwner();
    const customerAResponse = await createCustomerRecord(agent, { name: 'Pet Count A', phone: '0912-555-701' });
    const customerBResponse = await createCustomerRecord(agent, { name: 'Pet Count B', phone: '0912-555-702' });
    const customerAId = customerAResponse.body.data.customer.id;
    const customerBId = customerBResponse.body.data.customer.id;

    await agent.post('/api/pets').send({ name: 'Count Dog 1', species: 'DOG', gender: 'MALE', customer_id: customerAId });
    await agent.post('/api/pets').send({ name: 'Count Dog 2', species: 'DOG', gender: 'FEMALE', customer_id: customerAId });
    await agent.post('/api/pets').send({ name: 'Count Cat', species: 'CAT', gender: 'UNKNOWN', customer_id: customerBId });

    const response = await agent.get('/api/customers').query({ status: 'ALL', search: 'Pet Count' });
    const counts = Object.fromEntries(response.body.data.customers.map((customer) => [customer.id, customer.pet_count]));

    expect(response.status).toBe(200);
    expect(counts[customerAId]).toBe(2);
    expect(counts[customerBId]).toBe(1);
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

  test('OWNER can safely delete a customer and GROOMER cannot call the endpoint', async () => {
    const { agent } = await loginAsOwner();
    const createResponse = await createCustomerRecord(agent, { name: 'Delete Me', phone: '0912-999-001' });
    const customerId = createResponse.body.data.customer.id;

    const username = `delete-groomer-${Date.now()}`;
    const [staffResult] = await getPool().query(
      'INSERT INTO staff (username, password_hash, display_name, status) VALUES (?, ?, ?, \'ACTIVE\')',
      [username, await hashPassword('groomer-pass-123'), username],
    );
    const [roleRows] = await getPool().query('SELECT id FROM roles WHERE code = \'GROOMER\'');
    await getPool().query('INSERT INTO staff_roles (staff_id, role_id) VALUES (?, ?)', [staffResult.insertId, roleRows[0].id]);
    const groomerAgent = request.agent(app);
    await groomerAgent.post('/api/auth/login').send({ username, password: 'groomer-pass-123' });
    expect((await groomerAgent.delete(`/api/customers/${customerId}`)).status).toBe(403);

    const deleteResponse = await agent.delete(`/api/customers/${customerId}`);
    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.data).toEqual({ message: 'Customer deleted successfully' });
    expect((await agent.get(`/api/customers/${customerId}`)).status).toBe(404);
    await getPool().query('DELETE FROM staff_roles WHERE staff_id = ?', [staffResult.insertId]);
    await getPool().query('DELETE FROM staff WHERE id = ?', [staffResult.insertId]);
  });

  test('customer with an order is rejected before any deletion', async () => {
    const { agent } = await loginAsOwner();
    const createResponse = await createCustomerRecord(agent, { name: 'Protected Customer', phone: '0912-999-002' });
    const customerId = createResponse.body.data.customer.id;
    await getPool().query('INSERT INTO orders (customer_id, business_unit, status, total_amount) VALUES (?, \'DOG\', \'UNPAID\', 0)', [customerId]);

    const deleteResponse = await agent.delete(`/api/customers/${customerId}`);
    expect(deleteResponse.status).toBe(409);
    expect(deleteResponse.body.error.code).toBe('CUSTOMER_DELETE_PROTECTED');
    expect((await agent.get(`/api/customers/${customerId}`)).status).toBe(200);
  });

  test('customer with a pet is protected without deleting the pet', async () => {
    const { agent } = await loginAsOwner();
    const customerResponse = await createCustomerRecord(agent, { name: 'Pet Owner', phone: '0912-999-003' });
    const customerId = customerResponse.body.data.customer.id;
    const petResponse = await agent.post('/api/pets').send({
      name: 'Protected Pet',
      species: 'DOG',
      gender: 'MALE',
      customer_id: customerId,
    });
    const petId = petResponse.body.data.pet.id;

    const deleteResponse = await agent.delete(`/api/customers/${customerId}`);

    expect(deleteResponse.status).toBe(409);
    expect(deleteResponse.body.error.code).toBe('CUSTOMER_DELETE_PROTECTED');
    expect((await agent.get(`/api/customers/${customerId}`)).status).toBe(200);
    expect((await agent.get(`/api/pets/${petId}`)).status).toBe(200);
  });

  test('customer with an appointment is protected without deleting the appointment', async () => {
    const { agent } = await loginAsOwner();
    const customerResponse = await createCustomerRecord(agent, { name: 'Appointment Owner', phone: '0912-999-004' });
    const customerId = customerResponse.body.data.customer.id;
    const [appointmentResult] = await getPool().query(
      'INSERT INTO appointments (customer_id, appointment_date, appointment_time) VALUES (?, \'2026-12-20\', \'10:00:00\')',
      [customerId],
    );
    const appointmentId = appointmentResult.insertId;

    const deleteResponse = await agent.delete(`/api/customers/${customerId}`);

    expect(deleteResponse.status).toBe(409);
    expect(deleteResponse.body.error.code).toBe('CUSTOMER_DELETE_PROTECTED');
    expect((await agent.get(`/api/customers/${customerId}`)).status).toBe(200);
    expect((await agent.get(`/api/appointments/${appointmentId}`)).status).toBe(200);
  });
});
