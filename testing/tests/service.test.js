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
    await getPool().query('DELETE FROM boardings');
    await getPool().query('DELETE FROM daily_operations');
    await getPool().query('DELETE FROM appointment_pet_services');
    await getPool().query('DELETE FROM appointment_pets');
    await getPool().query('DELETE FROM payments');
    await getPool().query('DELETE FROM order_items');
    await getPool().query('DELETE FROM orders');
    await getPool().query('DELETE FROM appointments');
    await getPool().query('DELETE FROM pet_customer_relationships');
    await getPool().query('DELETE FROM pets');
    await getPool().query('DELETE FROM services');
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
    const createResponse = await agent.post('/api/services').send({ name: 'Test Boarding', type: 'BOARDING', description: 'Overnight stay', price: 1200, unit: '晚', species: 'DOG', sort_order: 10 });
    expect(createResponse.status).toBe(201);
    const serviceId = createResponse.body.data.service.id;
    expect((await agent.get(`/api/services/${serviceId}`)).body.data.service.type).toBe('BOARDING');
    expect((await agent.get(`/api/services/${serviceId}`)).body.data.service.unit).toBe('晚');
    const updateResponse = await agent.put(`/api/services/${serviceId}`).send({ status: 'INACTIVE', unit: '晚' });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.service.status).toBe('INACTIVE');
    expect(updateResponse.body.data.service.unit).toBe('晚');
    expect((await agent.get('/api/services?status=INACTIVE')).body.data.services.some((service) => service.id === serviceId)).toBe(true);
    expect((await agent.delete(`/api/services/${serviceId}`)).status).toBe(200);
    expect((await agent.get(`/api/services/${serviceId}`)).status).toBe(404);
  });

  test('validates fields and prevents duplicate names by name plus species', async () => {
    const agent = await login();
    const invalid = await agent.post('/api/services').send({ name: '', type: 'INVALID', price: 0, unit: '', species: 'DOG', duration_minutes: 0, sort_order: -1 });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');

    const boardingWithoutDuration = await agent.post('/api/services').send({ name: 'Boarding Stay', type: 'BOARDING', price: 800, unit: '晚', species: 'DOG' });
    expect(boardingWithoutDuration.status).toBe(201);
    expect(boardingWithoutDuration.body.data.service.unit).toBe('晚');

    const createDog = await agent.post('/api/services').send({ name: 'Unique Name Dog', type: 'GROOMING', price: 1, unit: '次', species: 'DOG', duration_minutes: 30, sort_order: 1 });
    expect(createDog.status).toBe(201);

    const createCat = await agent.post('/api/services').send({ name: 'Unique Name Dog', type: 'GROOMING', price: 2, unit: '次', species: 'CAT', duration_minutes: 40, sort_order: 2 });
    expect(createCat.status).toBe(201);

    const duplicateDog = await agent.post('/api/services').send({ name: 'Unique Name Dog', type: 'GROOMING', price: 3, unit: '次', species: 'DOG', duration_minutes: 50, sort_order: 3 });
    expect(duplicateDog.status).toBe(400);
    expect(duplicateDog.body.error.fields.name).toBeDefined();

    const duplicateCat = await agent.post('/api/services').send({ name: 'Unique Name Dog', type: 'GROOMING', price: 4, unit: '次', species: 'CAT', duration_minutes: 60, sort_order: 4 });
    expect(duplicateCat.status).toBe(400);
    expect(duplicateCat.body.error.fields.name).toBeDefined();
  });

  test('allows same name across species and rejects duplicate target pairs on update', async () => {
    const agent = await login();
    const dogService = await agent.post('/api/services').send({ name: 'Shared Name', type: 'GROOMING', price: 1, unit: '次', species: 'DOG', duration_minutes: 30, sort_order: 1 });
    expect(dogService.status).toBe(201);

    const selfUpdate = await agent.put(`/api/services/${dogService.body.data.service.id}`).send({ name: 'Shared Name', species: 'DOG', price: 5, unit: '次' });
    expect(selfUpdate.status).toBe(200);

    const crossSpeciesAllowed = await agent.put(`/api/services/${dogService.body.data.service.id}`).send({ name: 'Shared Name', species: 'CAT', price: 7, unit: '次' });
    expect(crossSpeciesAllowed.status).toBe(200);

    const catService = await agent.post('/api/services').send({ name: 'Shared Name', type: 'GROOMING', price: 9, unit: '次', species: 'CAT', duration_minutes: 40, sort_order: 2 });
    expect(catService.status).toBe(400);

    const secondDog = await agent.post('/api/services').send({ name: 'Duplicate Target', type: 'GROOMING', price: 2, unit: '次', species: 'DOG', duration_minutes: 35, sort_order: 3 });
    expect(secondDog.status).toBe(201);

    const secondCat = await agent.post('/api/services').send({ name: 'Duplicate Target', type: 'GROOMING', price: 3, unit: '次', species: 'CAT', duration_minutes: 45, sort_order: 4 });
    expect(secondCat.status).toBe(201);

    const duplicateTarget = await agent.put(`/api/services/${secondCat.body.data.service.id}`).send({ name: 'Duplicate Target', species: 'DOG', price: 99, unit: '次' });
    expect(duplicateTarget.status).toBe(400);
    expect(duplicateTarget.body.error.fields.name).toBeDefined();
  });

  test('protects a service used by historical appointment data', async () => {
    const agent = await login();
    const serviceResponse = await agent.post('/api/services').send({ name: 'Historical Service', type: 'GROOMING', description: 'Historical usage check', price: 500, unit: '次', species: 'DOG', duration_minutes: 30, sort_order: 1 });
    expect(serviceResponse.status).toBe(201);
    const serviceId = serviceResponse.body.data.service.id;

    const customerResponse = await agent.post('/api/customers').send({ name: 'Service History Customer', phone: '0912-555-666' });
    const customerId = customerResponse.body.data.customer.id;
    const petResponse = await agent.post('/api/pets').send({ name: 'Service History Pet', species: 'DOG', gender: 'UNKNOWN', customer_id: customerId });
    const petId = petResponse.body.data.pet.id;

    await getPool().query('INSERT INTO appointments (customer_id, appointment_date, appointment_time) VALUES (?, ?, ?)', [customerId, '2026-12-01', '10:00:00']);
    const [appointments] = await getPool().query('SELECT id FROM appointments ORDER BY id DESC LIMIT 1');
    await getPool().query('INSERT INTO appointment_pets (appointment_id, pet_id) VALUES (?, ?)', [appointments[0].id, petId]);
    const [appointmentPets] = await getPool().query('SELECT id FROM appointment_pets ORDER BY id DESC LIMIT 1');
    await getPool().query('INSERT INTO appointment_pet_services (appointment_pet_id, service_id) VALUES (?, ?)', [appointmentPets[0].id, serviceId]);

    const response = await agent.delete(`/api/services/${serviceId}`);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('SERVICE_IN_USE');
  });
});