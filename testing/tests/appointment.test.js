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

async function createCustomer(agent, payload) {
  return agent.post('/api/customers').send(payload);
}

async function createPet(agent, payload) {
  return agent.post('/api/pets').send(payload);
}

async function getServiceIds() {
  const [rows] = await getPool().query('SELECT id FROM services ORDER BY id LIMIT 10');
  return rows.map((row) => row.id);
}

describe('Appointment API', () => {
  beforeAll(async () => {
    await setup();
    await getPool().query('DELETE FROM auth_sessions');
  });

  beforeEach(async () => {
    await getPool().query('DELETE FROM auth_sessions');
    await getPool().query('DELETE FROM daily_operations');
    await getPool().query('DELETE FROM appointment_pet_services');
    await getPool().query('DELETE FROM appointment_pets');
    await getPool().query('DELETE FROM appointments');
    await getPool().query('DELETE FROM pet_customer_relationships');
    await getPool().query('DELETE FROM pets');
    await getPool().query('DELETE FROM order_items');
    await getPool().query('DELETE FROM payments');
    await getPool().query('DELETE FROM orders');
    await getPool().query('DELETE FROM customers');
  });

  afterAll(async () => {
    await closePool();
  });

  test('POST /api/appointments creates a multi-pet appointment and GET detail returns joined data', async () => {
    const { agent } = await loginAsOwner();

    const customerResponse = await createCustomer(agent, {
      name: 'Alice Appointment',
      phone: '0912-111-222',
    });
    const customerId = customerResponse.body.data.customer.id;

    const petOneResponse = await createPet(agent, {
      name: 'Mochi',
      species: 'DOG',
      gender: 'MALE',
      customer_id: customerId,
    });
    const petTwoResponse = await createPet(agent, {
      name: 'Luna',
      species: 'CAT',
      gender: 'FEMALE',
      customer_id: customerId,
    });

    const [serviceIdOne, serviceIdTwo] = await getServiceIds();

    const createResponse = await agent.post('/api/appointments').send({
      customer_id: customerId,
      appointment_date: '2026-09-15',
      appointment_time: '10:30:00',
      status: 'SCHEDULED',
      pets: [
        { pet_id: petOneResponse.body.data.pet.id, service_ids: [serviceIdOne, serviceIdTwo] },
        { pet_id: petTwoResponse.body.data.pet.id, service_ids: [serviceIdOne] },
      ],
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data.appointment.customer_id).toBe(customerId);
    expect(createResponse.body.data.appointment.status).toBe('SCHEDULED');

    const appointmentId = createResponse.body.data.appointment.id;
    const detailResponse = await agent.get(`/api/appointments/${appointmentId}`);

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.success).toBe(true);
    expect(detailResponse.body.data.appointment.id).toBe(appointmentId);
    expect(detailResponse.body.data.appointment.pets).toHaveLength(2);
    expect(detailResponse.body.data.appointment.pets[0].services).toHaveLength(2);
  });

  test('PATCH /api/appointments/:id updates data and supports cancellation protection', async () => {
    const { agent } = await loginAsOwner();

    const customerResponse = await createCustomer(agent, {
      name: 'Bob Visitor',
      phone: '0912-987-654',
    });
    const customerId = customerResponse.body.data.customer.id;

    const petResponse = await createPet(agent, {
      name: 'Puffy',
      species: 'DOG',
      gender: 'FEMALE',
      customer_id: customerId,
    });

    const [serviceIdOne, serviceIdTwo] = await getServiceIds();

    const createResponse = await agent.post('/api/appointments').send({
      customer_id: customerId,
      appointment_date: '2026-10-01',
      appointment_time: '09:00:00',
      pets: [{ pet_id: petResponse.body.data.pet.id, service_ids: [serviceIdOne] }],
    });

    const appointmentId = createResponse.body.data.appointment.id;

    const updateResponse = await agent.patch(`/api/appointments/${appointmentId}`).send({
      appointment_date: '2026-10-02',
      status: 'CONFIRMED',
      pets: [{ pet_id: petResponse.body.data.pet.id, service_ids: [serviceIdTwo] }],
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.appointment.status).toBe('CONFIRMED');
    expect(updateResponse.body.data.appointment.appointment_date).toBe('2026-10-02');

    const cancelResponse = await agent.patch(`/api/appointments/${appointmentId}`).send({
      status: 'CANCELLED',
    });
    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.data.appointment.status).toBe('CANCELLED');

    const cancelledUpdateResponse = await agent.patch(`/api/appointments/${appointmentId}`).send({
      status: 'CONFIRMED',
    });
    expect(cancelledUpdateResponse.status).toBe(400);
    expect(cancelledUpdateResponse.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('Appointment creation rejects pet ownership mismatch and inactive services', async () => {
    const { agent } = await loginAsOwner();

    const customerAResponse = await createCustomer(agent, {
      name: 'Customer A',
      phone: '0912-333-444',
    });
    const customerBResponse = await createCustomer(agent, {
      name: 'Customer B',
      phone: '0912-555-666',
    });

    const petResponse = await createPet(agent, {
      name: 'Milo',
      species: 'DOG',
      gender: 'MALE',
      customer_id: customerAResponse.body.data.customer.id,
    });

    const [serviceId] = await getServiceIds();

    const mismatchResponse = await agent.post('/api/appointments').send({
      customer_id: customerBResponse.body.data.customer.id,
      appointment_date: '2026-11-10',
      appointment_time: '14:00:00',
      pets: [{ pet_id: petResponse.body.data.pet.id, service_ids: [serviceId] }],
    });

    expect(mismatchResponse.status).toBe(400);
    expect(mismatchResponse.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('Appointment validation rejects duplicate pet entries, duplicate services, and invalid date/time formats', async () => {
    const { agent } = await loginAsOwner();

    const customerResponse = await createCustomer(agent, {
      name: 'Validation Guard',
      phone: '0912-444-555',
    });
    const customerId = customerResponse.body.data.customer.id;

    const petResponse = await createPet(agent, {
      name: 'Patch',
      species: 'DOG',
      gender: 'MALE',
      customer_id: customerId,
    });

    const [serviceId] = await getServiceIds();

    const duplicatePetResponse = await agent.post('/api/appointments').send({
      customer_id: customerId,
      appointment_date: '2026-11-11',
      appointment_time: '09:00:00',
      status: 'SCHEDULED',
      pets: [
        { pet_id: petResponse.body.data.pet.id, service_ids: [serviceId] },
        { pet_id: petResponse.body.data.pet.id, service_ids: [serviceId] },
      ],
    });

    expect(duplicatePetResponse.status).toBe(400);
    expect(duplicatePetResponse.body.error.code).toBe('VALIDATION_ERROR');

    const duplicateServiceResponse = await agent.post('/api/appointments').send({
      customer_id: customerId,
      appointment_date: '2026-11-11',
      appointment_time: '09:00:00',
      status: 'SCHEDULED',
      pets: [{ pet_id: petResponse.body.data.pet.id, service_ids: [serviceId, serviceId] }],
    });

    expect(duplicateServiceResponse.status).toBe(400);
    expect(duplicateServiceResponse.body.error.code).toBe('VALIDATION_ERROR');

    const invalidDateResponse = await agent.post('/api/appointments').send({
      customer_id: customerId,
      appointment_date: 'bad-date',
      appointment_time: '09:00:00',
      status: 'SCHEDULED',
      pets: [{ pet_id: petResponse.body.data.pet.id, service_ids: [serviceId] }],
    });

    expect(invalidDateResponse.status).toBe(400);
    expect(invalidDateResponse.body.error.code).toBe('VALIDATION_ERROR');

    const invalidTimeResponse = await agent.post('/api/appointments').send({
      customer_id: customerId,
      appointment_date: '2026-11-11',
      appointment_time: 'not-time',
      status: 'SCHEDULED',
      pets: [{ pet_id: petResponse.body.data.pet.id, service_ids: [serviceId] }],
    });

    expect(invalidTimeResponse.status).toBe(400);
    expect(invalidTimeResponse.body.error.code).toBe('VALIDATION_ERROR');
  });
});
