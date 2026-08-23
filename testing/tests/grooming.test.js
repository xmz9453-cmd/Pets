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

async function createAppointment(agent, payload) {
  return agent.post('/api/appointments').send(payload);
}

async function ensureDailyOperationExists(appointmentId) {
  const [existing] = await getPool().query(
    'SELECT id FROM daily_operations WHERE appointment_id = ? LIMIT 1',
    [appointmentId]
  );
  if (!existing || existing.length === 0) {
    await getPool().query(
      'INSERT INTO daily_operations (appointment_id, status) VALUES (?, ?)',
      [appointmentId, 'SCHEDULED']
    );
  }
  const [rows] = await getPool().query(
    'SELECT id FROM daily_operations WHERE appointment_id = ? LIMIT 1',
    [appointmentId]
  );
  return rows[0].id;
}

describe('Grooming API', () => {
  beforeAll(async () => {
    await setup();
    await getPool().query('DELETE FROM auth_sessions');
  });

  beforeEach(async () => {
    await getPool().query('DELETE FROM auth_sessions');
    await getPool().query('DELETE FROM groomings');
    await getPool().query('DELETE FROM daily_operations');
    await getPool().query('DELETE FROM appointment_pet_services');
    await getPool().query('DELETE FROM appointment_pets');
    await getPool().query('DELETE FROM appointments');
    await getPool().query('DELETE FROM pet_customer_relationships');
    await getPool().query('DELETE FROM pets');
    await getPool().query('DELETE FROM order_items');
    await getPool().query('DELETE FROM orders');
    await getPool().query('DELETE FROM customers');
  });

  afterAll(async () => {
    await closePool();
  });

  test('POST and PATCH /api/groomings save grooming execution data and prevent duplicates for the same pet', async () => {
    const { agent } = await loginAsOwner();

    const customer = await createCustomer(agent, {
      name: 'Grooming Client',
      phone: '0912-555-777',
    });
    const customerId = customer.body.data.customer.id;

    const pet = await createPet(agent, {
      name: 'Spark',
      species: 'DOG',
      gender: 'MALE',
      customer_id: customerId,
    });
    const petId = pet.body.data.pet.id;

    const [serviceIdRow] = await getPool().query('SELECT id FROM services WHERE type = ? LIMIT 1', ['GROOMING']);
    const serviceId = serviceIdRow[0].id;

    const today = new Date().toISOString().split('T')[0];
    const appointment = await createAppointment(agent, {
      customer_id: customerId,
      appointment_date: today,
      appointment_time: '10:00:00',
      pets: [{ pet_id: petId, service_ids: [serviceId] }],
    });

    const dailyOperationId = await ensureDailyOperationExists(appointment.body.data.appointment.id);

    const createResponse = await agent.post('/api/groomings').send({
      daily_operation_id: dailyOperationId,
      pet_id: petId,
      before_condition: '耳朵有少量污垢，毛量適中',
      actual_grooming_content: '洗澡、吹乾、修剪腳掌與面部輪廓',
      grooming_result: '毛髮乾淨且整體輪廓清晰',
      note: '客人關注耳部清潔，已提醒後續再檢查。',
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data.before_condition).toContain('耳朵');
    expect(createResponse.body.data.grooming_result).toContain('毛髮乾淨');

    const duplicateResponse = await agent.post('/api/groomings').send({
      daily_operation_id: dailyOperationId,
      pet_id: petId,
      before_condition: '重複建立',
    });
    expect(duplicateResponse.status).toBe(409);

    const updateResponse = await agent.patch(`/api/groomings/${createResponse.body.data.id}`).send({
      before_condition: '耳朵已清潔，毛量適中',
      note: '已完成耳部清潔與修剪。',
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.success).toBe(true);
    expect(updateResponse.body.data.note).toContain('已完成耳部清潔');
  });
});
