const request = require('supertest');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  });
}
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'psop_test';

const app = require('../../backend/src/app');
const { setup } = require('../../database/scripts/setup');
const { getPool, closePool } = require('../../backend/src/config/database');
const { getFoundationOwner } = require('../../database/seeds/staff-authentication-seed');

const owner = getFoundationOwner();

async function login() {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ username: owner.username, password: owner.password });
  return agent;
}

describe('Service API', () => {
  beforeAll(async () => { await setup(); await getPool().query('DELETE FROM auth_sessions'); });
  beforeEach(async () => { await getPool().query('DELETE FROM auth_sessions'); });
  afterEach(async () => {
    await getPool().query('DELETE FROM appointment_pet_services');
    await getPool().query('DELETE FROM appointment_pets');
    await getPool().query('DELETE FROM appointments');
    await getPool().query('DELETE FROM pet_customer_relationships');
    await getPool().query('DELETE FROM pets');
    await getPool().query('DELETE FROM customers');
  });
  afterAll(async () => { await closePool(); });

  test('requires authentication and lists existing services', async () => {
    expect((await request(app).get('/api/services')).status).toBe(401);
    const agent = await login();
    const response = await agent.get('/api/services?type=GROOMING&status=ACTIVE&search=Bath');
    expect(response.status).toBe(200);
    expect(response.body.data.services[0].name).toBe('Bath & Dry');
  });

  test('creates, reads, updates, filters, and deletes an unused service', async () => {
    const agent = await login();
    const createResponse = await agent.post('/api/services').send({ name: 'Test Boarding', type: 'BOARDING', description: 'Overnight stay', price: 1200, unit: '天', species: 'DOG', duration_minutes: 1440, sort_order: 10 });
    expect(createResponse.status).toBe(201);
    const serviceId = createResponse.body.data.service.id;
    expect((await agent.get(`/api/services/${serviceId}`)).body.data.service.type).toBe('BOARDING');
    const updateResponse = await agent.put(`/api/services/${serviceId}`).send({ status: 'INACTIVE', duration_minutes: 1500 });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.service.status).toBe('INACTIVE');
    expect(updateResponse.body.data.service.duration_minutes).toBe(1500);
    expect((await agent.get('/api/services?status=INACTIVE')).body.data.services.some((service) => service.id === serviceId)).toBe(true);
    expect((await agent.delete(`/api/services/${serviceId}`)).status).toBe(200);
    expect((await agent.get(`/api/services/${serviceId}`)).status).toBe(404);
  });

  test('validates fields and prevents duplicate names', async () => {
    const agent = await login();
    const invalid = await agent.post('/api/services').send({ name: '', type: 'INVALID', price: 0, unit: '', species: 'DOG', duration_minutes: 0, sort_order: -1 });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
    const duplicate = await agent.post('/api/services').send({ name: 'Basic Grooming', type: 'GROOMING', price: 1, unit: '次', species: 'BOTH', duration_minutes: 1, sort_order: 1 });
    expect(duplicate.status).toBe(400);
    expect(duplicate.body.error.fields.name).toBeDefined();
  });

  test('protects a service used by historical appointment data', async () => {
    const agent = await login();
    const customerResponse = await agent.post('/api/customers').send({ name: 'Service History Customer', phone: '0912-555-666' });
    const customerId = customerResponse.body.data.customer.id;
    const petResponse = await agent.post('/api/pets').send({ name: 'Service History Pet', species: 'DOG', gender: 'UNKNOWN', customer_id: customerId });
    const petId = petResponse.body.data.pet.id;
    const [services] = await getPool().query('SELECT id FROM services ORDER BY id LIMIT 1');
    await getPool().query('INSERT INTO appointments (customer_id, appointment_date, appointment_time) VALUES (?, ?, ?)', [customerId, '2026-12-01', '10:00:00']);
    const [appointments] = await getPool().query('SELECT id FROM appointments ORDER BY id DESC LIMIT 1');
    await getPool().query('INSERT INTO appointment_pets (appointment_id, pet_id) VALUES (?, ?)', [appointments[0].id, petId]);
    const [appointmentPets] = await getPool().query('SELECT id FROM appointment_pets ORDER BY id DESC LIMIT 1');
    await getPool().query('INSERT INTO appointment_pet_services (appointment_pet_id, service_id) VALUES (?, ?)', [appointmentPets[0].id, services[0].id]);
    const response = await agent.delete(`/api/services/${services[0].id}`);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('SERVICE_IN_USE');
  });
});