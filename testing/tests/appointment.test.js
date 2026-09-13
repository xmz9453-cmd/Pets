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
    await getPool().query('DELETE FROM payments');
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

  test('GET /api/appointments returns actual pet counts per appointment without cross-contamination', async () => {
    const { agent } = await loginAsOwner();

    const customerResponse = await createCustomer(agent, {
      name: 'Pet Count Customer',
      phone: '0912-000-111',
    });
    const customerId = customerResponse.body.data.customer.id;

    const petOneResponse = await createPet(agent, {
      name: 'Count Pet One',
      species: 'DOG',
      gender: 'MALE',
      customer_id: customerId,
    });
    const petTwoResponse = await createPet(agent, {
      name: 'Count Pet Two',
      species: 'CAT',
      gender: 'FEMALE',
      customer_id: customerId,
    });
    const petThreeResponse = await createPet(agent, {
      name: 'Count Pet Three',
      species: 'DOG',
      gender: 'FEMALE',
      customer_id: customerId,
    });

    const [serviceId] = await getServiceIds();

    const appointmentOneResponse = await agent.post('/api/appointments').send({
      customer_id: customerId,
      appointment_date: '2026-09-20',
      appointment_time: '08:00:00',
      status: 'SCHEDULED',
      pets: [{ pet_id: petOneResponse.body.data.pet.id, service_ids: [serviceId] }],
    });

    const appointmentTwoResponse = await agent.post('/api/appointments').send({
      customer_id: customerId,
      appointment_date: '2026-09-21',
      appointment_time: '09:00:00',
      status: 'SCHEDULED',
      pets: [
        { pet_id: petOneResponse.body.data.pet.id, service_ids: [serviceId] },
        { pet_id: petTwoResponse.body.data.pet.id, service_ids: [serviceId] },
      ],
    });

    const [noPetInsertResult] = await getPool().query(
      'INSERT INTO appointments (customer_id, appointment_date, appointment_time, status) VALUES (?, ?, ?, ?)',
      [customerId, '2026-09-22', '10:00:00', 'SCHEDULED'],
    );

    const response = await agent.get('/api/appointments').query({ status: 'ALL' });
    const map = new Map(response.body.data.appointments.map((appointment) => [appointment.id, appointment]));

    expect(response.status).toBe(200);
    expect(map.get(appointmentOneResponse.body.data.appointment.id)?.pet_count).toBe(1);
    expect(map.get(appointmentTwoResponse.body.data.appointment.id)?.pet_count).toBe(2);
    expect(map.get(noPetInsertResult.insertId)?.pet_count).toBe(0);
    expect(response.body.data.appointments.filter((appointment) => appointment.pet_count === 1)).toHaveLength(1);
    expect(response.body.data.appointments.filter((appointment) => appointment.pet_count === 2)).toHaveLength(1);
    expect(response.body.data.appointments.filter((appointment) => appointment.pet_count === 0)).toHaveLength(1);

    const totalPetCountForCustomer = [petOneResponse.body.data.pet.id, petTwoResponse.body.data.pet.id, petThreeResponse.body.data.pet.id].length;
    expect(totalPetCountForCustomer).toBe(3);
    expect(response.body.data.appointments.some((appointment) => appointment.pet_count > totalPetCountForCustomer)).toBe(false);
  });

  test('GET /api/appointments filters appointments by selected date', async () => {
    const { agent } = await loginAsOwner();

    const customerResponse = await createCustomer(agent, {
      name: 'Calendar Customer',
      phone: '0912-000-111',
    });
    const customerId = customerResponse.body.data.customer.id;
    const petResponse = await createPet(agent, {
      name: 'Calendar Pet',
      species: 'DOG',
      gender: 'MALE',
      customer_id: customerId,
    });
    const [serviceId] = await getServiceIds();

    await agent.post('/api/appointments').send({
      customer_id: customerId,
      appointment_date: '2026-09-10',
      appointment_time: '10:00:00',
      pets: [{ pet_id: petResponse.body.data.pet.id, service_ids: [serviceId] }],
    });
    await agent.post('/api/appointments').send({
      customer_id: customerId,
      appointment_date: '2026-09-11',
      appointment_time: '11:00:00',
      pets: [{ pet_id: petResponse.body.data.pet.id, service_ids: [serviceId] }],
    });
    await agent.post('/api/appointments').send({
      customer_id: customerId,
      appointment_date: '2026-09-10',
      appointment_time: '10:00:00',
      pets: [{ pet_id: petResponse.body.data.pet.id, service_ids: [serviceId] }],
    });

    const response = await agent.get('/api/appointments').query({
      appointmentDate: '2026-09-10',
      status: 'ALL',
    });

    expect(response.status).toBe(200);
    expect(response.body.data.appointments).toHaveLength(2);
    expect(response.body.data.appointments.every((appointment) => appointment.appointment_date === '2026-09-10')).toBe(true);
    expect(response.body.data.appointments[0].appointment_time).toBe('10:00:00');
    expect(response.body.data.appointments[1].appointment_time).toBe('10:00:00');
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
    expect(cancelledUpdateResponse.status).toBe(200);
    expect(cancelledUpdateResponse.body.data.appointment.status).toBe('CONFIRMED');
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

  test('DELETE /api/appointments/:id removes an untouched appointment and its initial daily operation', async () => {
    const { agent } = await loginAsOwner();
    const customerResponse = await createCustomer(agent, { name: 'Protected Appointment Customer', phone: '0912-777-888' });
    const petResponse = await createPet(agent, { name: 'Appointment Pet', species: 'DOG', gender: 'MALE', customer_id: customerResponse.body.data.customer.id });
    const [serviceId] = await getServiceIds();
    const createResponse = await agent.post('/api/appointments').send({
      customer_id: customerResponse.body.data.customer.id,
      appointment_date: '2026-12-02',
      appointment_time: '11:00:00',
      pets: [{ pet_id: petResponse.body.data.pet.id, service_ids: [serviceId] }],
    });
    const appointmentId = createResponse.body.data.appointment.id;
    const [operationBefore] = await getPool().query('SELECT id, status FROM daily_operations WHERE appointment_id = ?', [appointmentId]);
    expect(operationBefore).toHaveLength(1);
    expect(operationBefore[0].status).toBe('SCHEDULED');

    const deleteResponse = await agent.delete(`/api/appointments/${appointmentId}`);
    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.data).toEqual({ message: 'Appointment deleted successfully' });
    expect((await agent.get(`/api/appointments/${appointmentId}`)).status).toBe(404);
    expect((await getPool().query('SELECT id FROM daily_operations WHERE appointment_id = ?', [appointmentId]))[0]).toHaveLength(0);
    expect((await getPool().query('SELECT id FROM customers WHERE id = ?', [customerResponse.body.data.customer.id]))[0]).toHaveLength(1);
    expect((await getPool().query('SELECT id FROM pets WHERE id = ?', [petResponse.body.data.pet.id]))[0]).toHaveLength(1);
  });

  test('DELETE /api/appointments/:id rejects an appointment after check-in', async () => {
    const { agent } = await loginAsOwner();
    const customerResponse = await createCustomer(agent, { name: 'Active Appointment Customer', phone: '0912-777-889' });
    const petResponse = await createPet(agent, { name: 'Active Appointment Pet', species: 'DOG', gender: 'MALE', customer_id: customerResponse.body.data.customer.id });
    const [serviceId] = await getServiceIds();
    const createResponse = await agent.post('/api/appointments').send({
      customer_id: customerResponse.body.data.customer.id,
      appointment_date: '2026-12-03',
      appointment_time: '11:00:00',
      pets: [{ pet_id: petResponse.body.data.pet.id, service_ids: [serviceId] }],
    });
    const appointmentId = createResponse.body.data.appointment.id;
    const [operationRows] = await getPool().query('SELECT id FROM daily_operations WHERE appointment_id = ?', [appointmentId]);
    await agent.post(`/api/operations/${operationRows[0].id}/check-in`);

    const deleteResponse = await agent.delete(`/api/appointments/${appointmentId}`);
    expect(deleteResponse.status).toBe(409);
    expect(deleteResponse.body.error.code).toBe('APPOINTMENT_DELETE_PROTECTED');
  });

  test('DELETE /api/appointments/:id rejects appointments with grooming or boarding records', async () => {
    const { agent } = await loginAsOwner();
    const customerResponse = await createCustomer(agent, { name: 'Execution Customer', phone: '0912-777-890' });
    const petResponse = await createPet(agent, { name: 'Execution Pet', species: 'DOG', gender: 'MALE', customer_id: customerResponse.body.data.customer.id });
    const [serviceRows] = await getPool().query('SELECT id, type FROM services WHERE type IN (\'GROOMING\', \'BOARDING\') ORDER BY type');
    const groomingService = serviceRows.find((service) => service.type === 'GROOMING');
    const boardingService = serviceRows.find((service) => service.type === 'BOARDING');
    const createResponse = await agent.post('/api/appointments').send({
      customer_id: customerResponse.body.data.customer.id,
      appointment_date: '2026-12-04',
      appointment_time: '12:00:00',
      pets: [{ pet_id: petResponse.body.data.pet.id, service_ids: [groomingService.id, boardingService.id] }],
    });
    const appointmentId = createResponse.body.data.appointment.id;
    const [operationRows] = await getPool().query('SELECT id FROM daily_operations WHERE appointment_id = ?', [appointmentId]);

    await getPool().query('INSERT INTO groomings (daily_operation_id, pet_id) VALUES (?, ?)', [operationRows[0].id, petResponse.body.data.pet.id]);
    await getPool().query(
      'INSERT INTO boardings (customer_id, pet_id, service_id, appointment_id, status) VALUES (?, ?, ?, ?, \'PENDING\')',
      [customerResponse.body.data.customer.id, petResponse.body.data.pet.id, boardingService.id, appointmentId],
    );

    const deleteResponse = await agent.delete(`/api/appointments/${appointmentId}`);
    expect(deleteResponse.status).toBe(409);
    expect(deleteResponse.body.error.code).toBe('APPOINTMENT_DELETE_PROTECTED');
  });

  test('DELETE /api/appointments/:id rejects appointments with orders and payments', async () => {
    const { agent } = await loginAsOwner();
    const customerResponse = await createCustomer(agent, { name: 'Transaction Customer', phone: '0912-777-891' });
    const petResponse = await createPet(agent, { name: 'Transaction Pet', species: 'DOG', gender: 'MALE', customer_id: customerResponse.body.data.customer.id });
    const [serviceId] = await getServiceIds();
    const createResponse = await agent.post('/api/appointments').send({
      customer_id: customerResponse.body.data.customer.id,
      appointment_date: '2026-12-05',
      appointment_time: '13:00:00',
      pets: [{ pet_id: petResponse.body.data.pet.id, service_ids: [serviceId] }],
    });
    const appointmentId = createResponse.body.data.appointment.id;
    const [orderResult] = await getPool().query(
      'INSERT INTO orders (customer_id, source_type, appointment_id, business_unit, status, total_amount) VALUES (?, \'APPOINTMENT\', ?, \'DOG\', \'UNPAID\', 0)',
      [customerResponse.body.data.customer.id, appointmentId],
    );

    const orderDeleteResponse = await agent.delete(`/api/appointments/${appointmentId}`);
    expect(orderDeleteResponse.status).toBe(409);
    expect(orderDeleteResponse.body.error.code).toBe('APPOINTMENT_DELETE_PROTECTED');

    const [ownerRows] = await getPool().query('SELECT id FROM staff WHERE username = ? LIMIT 1', [owner.username]);
    await getPool().query(
      'INSERT INTO payments (order_id, amount, payment_method, operator_id, status) VALUES (?, 1, \'CASH\', ?, \'PAID\')',
      [orderResult.insertId, ownerRows[0].id],
    );
    const paymentDeleteResponse = await agent.delete(`/api/appointments/${appointmentId}`);
    expect(paymentDeleteResponse.status).toBe(409);
    expect(paymentDeleteResponse.body.error.code).toBe('APPOINTMENT_DELETE_PROTECTED');
  });
});
