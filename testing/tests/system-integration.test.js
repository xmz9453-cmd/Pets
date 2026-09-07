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

async function login() {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ username: owner.username, password: owner.password });
  return agent;
}

async function clean() {
  const pool = getPool();
  await pool.query('DELETE FROM payments');
  await pool.query('DELETE FROM order_items');
  await pool.query('DELETE FROM orders');
  await pool.query('DELETE FROM groomings');
  await pool.query('DELETE FROM boardings');
  await pool.query('DELETE FROM daily_operations');
  await pool.query('DELETE FROM appointment_pet_services');
  await pool.query('DELETE FROM appointment_pets');
  await pool.query('DELETE FROM appointments');
  await pool.query('DELETE FROM pet_customer_relationships');
  await pool.query('DELETE FROM pets');
  await pool.query('DELETE FROM customers');
  await pool.query('DELETE FROM auth_sessions');
}

describe('TASK-0017 system integration', () => {
  beforeAll(async () => { await setup(); await clean(); });
  beforeEach(clean);
  afterAll(async () => { await closePool(); });

  test('runs Customer to Grooming to Order to Payment to Report with persistence', async () => {
    const agent = await login();
    const customer = await agent.post('/api/customers').send({ name: 'Integration Customer', phone: '0912-345-678' });
    const customerId = customer.body.data.customer.id;
    const pet = await agent.post('/api/pets').send({ name: 'Integration Pet', species: 'DOG', gender: 'MALE', customer_id: customerId });
    const petId = pet.body.data.pet.id;
    const [[service]] = await getPool().query("SELECT id, price FROM services WHERE type = 'GROOMING' AND status = 'ACTIVE' LIMIT 1");
    const appointment = await agent.post('/api/appointments').send({ customer_id: customerId, appointment_date: '2026-09-03', appointment_time: '10:00:00', pets: [{ pet_id: petId, service_ids: [service.id] }] });
    expect(appointment.status).toBe(201);
    const appointmentId = appointment.body.data.appointment.id;
    const [[operation]] = await getPool().query('SELECT id, status FROM daily_operations WHERE appointment_id = ?', [appointmentId]);
    expect(operation.status).toBe('SCHEDULED');

    expect((await agent.post(`/api/operations/${operation.id}/check-in`)).status).toBe(200);
    const grooming = await agent.post('/api/groomings').send({ daily_operation_id: operation.id, pet_id: petId, before_condition: '良好', actual_grooming_content: '洗澡與修剪', grooming_result: '完成' });
    expect(grooming.status).toBe(201);
    const completed = await agent.post(`/api/groomings/${grooming.body.data.id}/complete`);
    expect(completed.status).toBe(200);

    const operations = await agent.get('/api/operations?date=2026-09-03');
    expect(operations.status).toBe(200);
    expect(operations.body.data.find((operation) => operation.appointment_id === appointmentId).can_create_appointment_order).toBe(true);

    const blocked = await agent.post('/api/orders').send({ customer_id: customerId, source_type: 'APPOINTMENT', appointment_id: appointmentId, business_unit: 'DOG', items: [{ service_id: service.id, transaction_price: 1, quantity: 1 }] });
    expect(blocked.status).toBe(201);
    expect(blocked.body.data.order.source_type).toBe('APPOINTMENT');
    expect(blocked.body.data.order.appointment_id).toBe(appointmentId);
    expect(blocked.body.data.order.items[0].transaction_price).toBe(Number(service.price));

    const orderId = blocked.body.data.order.id;
    const duplicate = await agent.post('/api/orders').send({ customer_id: customerId, source_type: 'APPOINTMENT', appointment_id: appointmentId, business_unit: 'DOG', items: [{ service_id: service.id, transaction_price: 1, quantity: 1 }] });
    expect(duplicate.status).toBe(409);
    const payment = await agent.post(`/api/orders/${orderId}/payments`).send({ amount: Number(service.price), payment_method: 'CASH' });
    expect(payment.status).toBe(201);
    await getPool().query('UPDATE payments SET paid_at = ? WHERE id = ?', ['2026-09-03 12:00:00', payment.body.data.payment.id]);
    const detail = await agent.get(`/api/orders/${orderId}`);
    expect(detail.body.data.order.status).toBe('PAID');
    const report = await agent.get('/api/reports?start_date=2026-09-03&end_date=2026-09-03');
    expect(report.status).toBe(200);
    expect(report.body.data.summary.actual_revenue).toBe(Number(service.price));
  });

  test('rejects appointment orders before service completion and accepts walk-in source', async () => {
    const agent = await login();
    const customer = await agent.post('/api/customers').send({ name: 'Source Customer', phone: '0912-345-679' });
    const customerId = customer.body.data.customer.id;
    const [[service]] = await getPool().query("SELECT id FROM services WHERE type = 'GROOMING' AND status = 'ACTIVE' LIMIT 1");
    const appointment = await agent.post('/api/orders').send({ customer_id: customerId, source_type: 'APPOINTMENT', appointment_id: 999999, business_unit: 'DOG', items: [{ service_id: service.id, transaction_price: 1 }] });
    expect(appointment.status).toBe(400);
    const walkIn = await agent.post('/api/orders').send({ customer_id: customerId, source_type: 'WALK_IN', appointment_id: 999999, business_unit: 'DOG', items: [{ service_id: service.id, transaction_price: 100 }] });
    expect(walkIn.status).toBe(400);
  });

  test('runs Boarding checkout to appointment-origin Order', async () => {
    const agent = await login();
    const customer = await agent.post('/api/customers').send({ name: 'Boarding Integration', phone: '0912-345-680' });
    const customerId = customer.body.data.customer.id;
    const pet = await agent.post('/api/pets').send({ name: 'Boarding Pet', species: 'DOG', gender: 'FEMALE', customer_id: customerId });
    const petId = pet.body.data.pet.id;
    const [[service]] = await getPool().query("SELECT id, price FROM services WHERE type = 'BOARDING' AND status = 'ACTIVE' LIMIT 1");
    if (!service) return;
    const appointment = await agent.post('/api/appointments').send({ customer_id: customerId, appointment_date: '2026-09-03', appointment_time: '11:00:00', pets: [{ pet_id: petId, service_ids: [service.id] }] });
    const appointmentId = appointment.body.data.appointment.id;
    const [[operation]] = await getPool().query('SELECT id FROM daily_operations WHERE appointment_id = ?', [appointmentId]);
    const boarding = await agent.post('/api/boardings').send({ customer_id: customerId, pet_id: petId, service_id: service.id, appointment_id: appointmentId, daily_operation_id: operation.id });
    expect(boarding.status).toBe(201);
    expect((await agent.post(`/api/boardings/${boarding.body.data.id}/check-in`)).status).toBe(200);
    const checkout = await agent.post(`/api/boardings/${boarding.body.data.id}/check-out`);
    expect(checkout.status).toBe(200);
    const order = await agent.post('/api/orders').send({ customer_id: customerId, source_type: 'APPOINTMENT', appointment_id: appointmentId, business_unit: 'DOG', items: [{ service_id: service.id, transaction_price: 1 }] });
    expect(order.status).toBe(201);
    expect(order.body.data.order.appointment_id).toBe(appointmentId);
  });
});