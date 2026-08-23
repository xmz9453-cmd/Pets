const request = require('supertest');
const fs = require('fs');
const path = require('path');

function loadLocalEnvForTestDatabase() {
  const envPath = path.resolve(__dirname, '..', '..', '.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((line) => {
      const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
      if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
    });
  }
  process.env.NODE_ENV = 'test';
  process.env.DB_NAME = process.env.TEST_DB_NAME || 'psop_test';
}
loadLocalEnvForTestDatabase();

const app = require('../../backend/src/app');
const { getPool, closePool } = require('../../backend/src/config/database');
const { setup } = require('../../database/scripts/setup');
const { getFoundationOwner } = require('../../database/seeds/staff-authentication-seed');

const owner = getFoundationOwner();
let identityCounter = 0;

async function login() {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ username: owner.username, password: owner.password });
  return agent;
}

async function createIdentity(agent, name) {
  identityCounter += 1;
  const customer = await agent.post('/api/customers').send({ name: `${name} Customer`, phone: `0912-888-${String(identityCounter).padStart(4, '0')}` });
  const customerId = customer.body.data.customer.id;
  const pet = await agent.post('/api/pets').send({ name: `${name} Pet`, species: 'DOG', gender: 'MALE', customer_id: customerId });
  return { customerId, petId: pet.body.data.pet.id };
}

async function getBoardingService(agent) {
  const [[existing]] = await getPool().query("SELECT id FROM services WHERE type = 'BOARDING' AND status = 'ACTIVE' LIMIT 1");
  if (existing) return existing.id;
  const response = await agent.post('/api/services').send({
    name: `Test Boarding ${Date.now()}`,
    type: 'BOARDING',
    description: 'Overnight stay',
    price: 1200,
    unit: '天',
    species: 'DOG',
    duration_minutes: 1440,
    sort_order: 50,
  });
  return response.body.data.service.id;
}

async function createAppointmentBoarding(agent, name = 'Boarding') {
  const identity = await createIdentity(agent, name);
  const serviceId = await getBoardingService(agent);
  const today = new Date().toISOString().split('T')[0];
  const appointment = await agent.post('/api/appointments').send({
    customer_id: identity.customerId,
    appointment_date: today,
    appointment_time: '11:00:00',
    pets: [{ pet_id: identity.petId, service_ids: [serviceId] }],
  });
  const appointmentId = appointment.body.data.appointment.id;
  const [operationResult] = await getPool().query(
    'INSERT INTO daily_operations (appointment_id, status) VALUES (?, ?)',
    [appointmentId, 'SCHEDULED'],
  );
  return { ...identity, serviceId, appointmentId, dailyOperationId: operationResult.insertId };
}

describe('Boarding API', () => {
  beforeAll(async () => { await setup(); });
  beforeEach(async () => {
    const pool = getPool();
    await pool.query('DELETE FROM boardings');
    await pool.query('DELETE FROM daily_operations');
    await pool.query('DELETE FROM appointment_pet_services');
    await pool.query('DELETE FROM appointment_pets');
    await pool.query('DELETE FROM appointments');
    await pool.query('DELETE FROM pet_customer_relationships');
    await pool.query('DELETE FROM pets');
    await pool.query('DELETE FROM order_items');
    await pool.query('DELETE FROM orders');
    await pool.query('DELETE FROM customers');
    await pool.query('DELETE FROM auth_sessions');
  });
  afterEach(async () => {
    const pool = getPool();
    await pool.query('DELETE FROM boardings');
    await pool.query('DELETE FROM daily_operations');
    await pool.query('DELETE FROM appointment_pet_services');
    await pool.query('DELETE FROM appointment_pets');
    await pool.query('DELETE FROM appointments');
    await pool.query('DELETE FROM pet_customer_relationships');
    await pool.query('DELETE FROM pets');
    await pool.query('DELETE FROM order_items');
    await pool.query('DELETE FROM orders');
    await pool.query('DELETE FROM customers');
  });
  afterAll(async () => { await closePool(); });

  test('creates appointment Boarding, persists execution fields, and completes lifecycle with Daily Operations', async () => {
    const agent = await login();
    const data = await createAppointmentBoarding(agent);
    const created = await agent.post('/api/boardings').send({
      customer_id: data.customerId,
      pet_id: data.petId,
      service_id: data.serviceId,
      appointment_id: data.appointmentId,
      daily_operation_id: data.dailyOperationId,
      expected_check_out: '2026-08-24 12:00:00',
      before_condition: '精神狀況良好',
      actual_boarding_content: '完成入住檢查與日常照護',
      boarding_result: '狀況穩定',
      note: '已確認飲食需求',
    });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('PENDING');
    expect(created.body.data.appointment_id).toBe(data.appointmentId);

    const checkIn = await agent.post(`/api/boardings/${created.body.data.id}/check-in`);
    expect(checkIn.status).toBe(200);
    expect(checkIn.body.data.status).toBe('IN_PROGRESS');
    expect(checkIn.body.data.actual_check_in).toBeTruthy();

    const dailyInProgress = await agent.get(`/api/operations/${data.dailyOperationId}`);
    expect(dailyInProgress.body.data.status).toBe('IN_PROGRESS');

    const updated = await agent.patch(`/api/boardings/${created.body.data.id}`).send({ boarding_result: '住宿期間狀況穩定' });
    expect(updated.body.data.boarding_result).toContain('穩定');

    const checkOut = await agent.post(`/api/boardings/${created.body.data.id}/check-out`);
    expect(checkOut.status).toBe(200);
    expect(checkOut.body.data.status).toBe('COMPLETED');
    expect(checkOut.body.data.actual_check_out).toBeTruthy();

    const dailyCompleted = await agent.get(`/api/operations/${data.dailyOperationId}`);
    expect(dailyCompleted.body.data.status).toBe('COMPLETED');
  });

  test('supports walk-in Boarding without an appointment and rejects invalid identity or active conflicts', async () => {
    const agent = await login();
    const first = await createIdentity(agent, 'Walk-in');
    const serviceId = await getBoardingService(agent);
    const created = await agent.post('/api/boardings').send({ customer_id: first.customerId, pet_id: first.petId, service_id: serviceId });
    expect(created.status).toBe(201);
    expect(created.body.data.appointment_id).toBeNull();
    expect(created.body.data.daily_operation_id).toBeNull();

    await agent.post(`/api/boardings/${created.body.data.id}/check-in`);
    const conflictResponse = await agent.post('/api/boardings').send({ customer_id: first.customerId, pet_id: first.petId, service_id: serviceId });
    expect(conflictResponse.status).toBe(409);

    const invalidCustomer = await agent.post('/api/boardings').send({ customer_id: 999999, pet_id: first.petId, service_id: serviceId });
    expect(invalidCustomer.status).toBe(404);

    const second = await createIdentity(agent, 'Mismatch');
    const mismatch = await agent.post('/api/boardings').send({ customer_id: first.customerId, pet_id: second.petId, service_id: serviceId });
    expect(mismatch.status).toBe(400);
  });

  test('blocks invalid transitions and unauthenticated access', async () => {
    const unauthenticated = await request(app).get('/api/boardings?daily_operation_id=1');
    expect(unauthenticated.status).toBe(401);

    const agent = await login();
    const data = await createAppointmentBoarding(agent, 'Transition');
    const created = await agent.post('/api/boardings').send({ customer_id: data.customerId, pet_id: data.petId, service_id: data.serviceId, appointment_id: data.appointmentId, daily_operation_id: data.dailyOperationId });
    const invalidCheckout = await agent.post(`/api/boardings/${created.body.data.id}/check-out`);
    expect(invalidCheckout.status).toBe(400);
    const checkIn = await agent.post(`/api/boardings/${created.body.data.id}/check-in`);
    expect(checkIn.status).toBe(200);
    const secondCheckIn = await agent.post(`/api/boardings/${created.body.data.id}/check-in`);
    expect(secondCheckIn.status).toBe(400);
    const checkOut = await agent.post(`/api/boardings/${created.body.data.id}/check-out`);
    expect(checkOut.status).toBe(200);
    const secondCheckOut = await agent.post(`/api/boardings/${created.body.data.id}/check-out`);
    expect(secondCheckOut.status).toBe(400);
  });
});
