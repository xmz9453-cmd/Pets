const request = require('supertest');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function loadLocalEnvForTestDatabase() {
  const envPath = path.resolve(__dirname, '..', '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    lines.forEach((line) => {
      const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
      if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
    });
  }

  process.env.NODE_ENV = 'test';
  process.env.DB_NAME = process.env.TEST_DB_NAME || 'psop_test';
  if (!['localhost', '127.0.0.1'].includes(process.env.DB_HOST)) {
    throw new Error(`Unsafe test database host "${process.env.DB_HOST}"; expected localhost or 127.0.0.1`);
  }
  if (process.env.DB_NAME !== 'psop_test') {
    throw new Error(`Unsafe test database "${process.env.DB_NAME}"; expected psop_test`);
  }
}

loadLocalEnvForTestDatabase();

const app = require('../../backend/src/app');
const { setup } = require('../../database/scripts/setup');
const { getPool, closePool } = require('../../backend/src/config/database');
const { getFoundationOwner } = require('../../database/seeds/staff-authentication-seed');

const owner = getFoundationOwner();
const fixtureMemberIds = [];
const fixtureCustomerIds = [];
const fixtureAppointmentIds = [];
const fixturePetIds = [];
const fixtureServiceIds = [];

async function loginAsOwner() {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/login').send({
    username: owner.username,
    password: owner.password,
  });
  if (response.status !== 200) throw new Error(`Unable to authenticate test owner: ${response.status}`);
  return agent;
}

async function createBookingFixture(ownerAgent) {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const customerResponse = await ownerAgent.post('/api/customers').send({
    name: `Change Request ${suffix}`,
    phone: `09${suffix.slice(-8)}`,
  });
  if (customerResponse.status !== 201) throw new Error(`Unable to create test customer: ${customerResponse.status}`);
  const customerId = Number(customerResponse.body.data.customer.id);
  fixtureCustomerIds.push(customerId);

  const [memberResult] = await getPool().query(
    'INSERT INTO customer_members (display_name) VALUES (?)',
    [`Change Member ${suffix}`],
  );
  const memberId = Number(memberResult.insertId);
  fixtureMemberIds.push(memberId);
  await getPool().query(
    `INSERT INTO customer_member_customers (shop_id, customer_member_id, customer_id)
     VALUES (1, ?, ?)`,
    [memberId, customerId],
  );
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await getPool().query(
    `INSERT INTO customer_member_sessions
       (shop_id, customer_member_id, token_hash, authenticated_at, expires_at)
     VALUES (1, ?, ?, UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 DAY))`,
    [memberId, tokenHash],
  );
  const [appointmentResult] = await getPool().query(
    `INSERT INTO appointments
       (shop_id, customer_id, appointment_date, appointment_time, status, note)
     VALUES (1, ?, DATE_ADD(CURDATE(), INTERVAL 7 DAY), '11:00:00', 'CONFIRMED', NULL)`,
    [customerId],
  );
  const appointmentId = Number(appointmentResult.insertId);
  fixtureAppointmentIds.push(appointmentId);
  await getPool().query(
    `INSERT INTO booking_request_details
       (shop_id, appointment_id, service_type, customer_member_id)
     VALUES (1, ?, 'GROOMING', ?)`,
    [appointmentId, memberId],
  );

  return {
    appointmentId,
    memberToken: token,
  };
}

async function cleanFixtures() {
  if (fixtureMemberIds.length) {
    await getPool().query(
      `DELETE FROM shop_notifications
       WHERE booking_change_request_id IN (
         SELECT id FROM booking_change_requests WHERE customer_member_id IN (?)
       )`,
      [fixtureMemberIds],
    );
    await getPool().query('DELETE FROM booking_change_requests WHERE customer_member_id IN (?)', [fixtureMemberIds]);
  }
  if (fixtureAppointmentIds.length) {
    await getPool().query('DELETE FROM appointment_resource_assignments WHERE appointment_id IN (?)', [fixtureAppointmentIds]);
    await getPool().query('DELETE FROM booking_request_products WHERE appointment_id IN (?)', [fixtureAppointmentIds]);
    await getPool().query('DELETE FROM booking_request_add_on_services WHERE appointment_id IN (?)', [fixtureAppointmentIds]);
    await getPool().query('DELETE FROM orders WHERE appointment_id IN (?)', [fixtureAppointmentIds]);
    await getPool().query('DELETE FROM booking_request_details WHERE appointment_id IN (?)', [fixtureAppointmentIds]);
    await getPool().query('DELETE FROM appointments WHERE id IN (?)', [fixtureAppointmentIds]);
    fixtureAppointmentIds.length = 0;
  }
  if (fixtureServiceIds.length) {
    await getPool().query('DELETE FROM services WHERE id IN (?)', [fixtureServiceIds]);
    fixtureServiceIds.length = 0;
  }
  if (fixturePetIds.length) {
    await getPool().query('DELETE FROM pet_customer_relationships WHERE pet_id IN (?)', [fixturePetIds]);
    await getPool().query('DELETE FROM pets WHERE id IN (?)', [fixturePetIds]);
    fixturePetIds.length = 0;
  }
  if (fixtureMemberIds.length) {
    await getPool().query('DELETE FROM customer_member_sessions WHERE customer_member_id IN (?)', [fixtureMemberIds]);
    await getPool().query('DELETE FROM customer_member_profiles WHERE customer_member_id IN (?)', [fixtureMemberIds]);
    await getPool().query('DELETE FROM customer_member_customers WHERE customer_member_id IN (?)', [fixtureMemberIds]);
    await getPool().query('DELETE FROM customer_members WHERE id IN (?)', [fixtureMemberIds]);
    fixtureMemberIds.length = 0;
  }
  if (fixtureCustomerIds.length) {
    await getPool().query('DELETE FROM customers WHERE id IN (?)', [fixtureCustomerIds]);
    fixtureCustomerIds.length = 0;
  }
}

async function withoutExpectedErrorLog(callback) {
  const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    return await callback();
  } finally {
    errorLog.mockRestore();
  }
}

describe('Booking change requests', () => {
  beforeAll(async () => {
    await setup();
  });

  beforeEach(async () => {
    await cleanFixtures();
  });

  afterEach(async () => {
    await cleanFixtures();
  });

  afterAll(async () => {
    await closePool();
  });

  test('keeps the original booking when a change request is rejected and clears its notification', async () => {
    const ownerAgent = await loginAsOwner();
    const { appointmentId, memberToken } = await createBookingFixture(ownerAgent);
    const headers = { 'X-Shop-Id': '1' };

    const submitResponse = await request(app)
      .post(`/api/public/member/requests/${appointmentId}/changes`)
      .set(headers)
      .set('Cookie', `customer_member_session=${memberToken}`)
      .send({ request_type: 'RESCHEDULE', proposed_appointment_date: '2035-05-10', proposed_appointment_time: '15:00' })
      .expect(201);
    const requestId = submitResponse.body.data.request_id;
    expect(submitResponse.body.data.status).toBe('PENDING');

    const duplicateResponse = await withoutExpectedErrorLog(() => request(app)
      .post(`/api/public/member/requests/${appointmentId}/changes`)
      .set(headers)
      .set('Cookie', `customer_member_session=${memberToken}`)
      .send({ request_type: 'CANCEL' })
      .expect(409));
    expect(duplicateResponse.body.error.code).toBe('BOOKING_CHANGE_ALREADY_PENDING');

    const notifications = await ownerAgent.get('/api/notifications').set(headers).expect(200);
    expect(notifications.body.data.unread_count).toBe(1);

    await ownerAgent.patch(`/api/booking-change-requests/${requestId}`)
      .set(headers)
      .send({ decision: 'REJECT', staff_note: '該時段已額滿。' })
      .expect(200);

    const [appointments] = await getPool().query(
      'SELECT appointment_date, appointment_time, status FROM appointments WHERE id = ?',
      [appointmentId],
    );
    expect(String(appointments[0].appointment_date).slice(0, 10)).not.toBe('2035-05-10');
    expect(String(appointments[0].appointment_time).slice(0, 5)).toBe('11:00');
    expect(appointments[0].status).toBe('CONFIRMED');

    const memberRequests = await request(app).get('/api/public/member/requests')
      .set(headers)
      .set('Cookie', `customer_member_session=${memberToken}`)
      .expect(200);
    expect(memberRequests.body.data.requests[0].latest_change_request).toMatchObject({
      status: 'REJECTED',
      staff_note: '該時段已額滿。',
    });
    const readNotifications = await ownerAgent.get('/api/notifications').set(headers).expect(200);
    expect(readNotifications.body.data.unread_count).toBe(0);
  });

  test('shows a member-selected add-on service in their request and staff appointment details', async () => {
    const ownerAgent = await loginAsOwner();
    const { appointmentId, memberToken } = await createBookingFixture(ownerAgent);
    const headers = { 'X-Shop-Id': '1' };
    const petResponse = await ownerAgent.post('/api/pets').send({
      name: `Add-on Pet ${Date.now()}`,
      species: 'DOG',
      gender: 'UNKNOWN',
      customer_id: fixtureCustomerIds.at(-1),
    }).expect(201);
    const petId = Number(petResponse.body.data.pet.id);
    fixturePetIds.push(petId);
    const [appointmentPetResult] = await getPool().query(
      'INSERT INTO appointment_pets (shop_id, appointment_id, pet_id) VALUES (1, ?, ?)',
      [appointmentId, petId],
    );
    const appointmentPetId = Number(appointmentPetResult.insertId);
    const serviceResponse = await ownerAgent.post('/api/services').send({
      name: `預選藥浴 ${Date.now()}`,
      type: 'ADD_ON',
      price: 180,
      unit: '次',
      species: 'DOG',
      allow_fractional_quantity: false,
    }).expect(201);
    const serviceId = Number(serviceResponse.body.data.service.id);
    fixtureServiceIds.push(serviceId);
    await getPool().query(
      `INSERT INTO booking_request_add_on_services
         (shop_id, appointment_id, appointment_pet_id, service_id, service_name, unit, unit_price, quantity, allow_fractional_quantity)
       VALUES (1, ?, ?, ?, ?, '次', 180, 1, FALSE)`,
      [appointmentId, appointmentPetId, serviceId, serviceResponse.body.data.service.name],
    );

    const memberServices = await request(app).get(`/api/public/member/services?pet_id=${petId}`)
      .set(headers)
      .set('Cookie', `customer_member_session=${memberToken}`)
      .expect(200);
    expect(memberServices.body.data.add_on_services).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: serviceId, type: 'ADD_ON', name: serviceResponse.body.data.service.name }),
    ]));
    expect(memberServices.body.data.services.every((service) => service.type !== 'ADD_ON')).toBe(true);

    const memberRequests = await request(app).get('/api/public/member/requests')
      .set(headers)
      .set('Cookie', `customer_member_session=${memberToken}`)
      .expect(200);
    expect(memberRequests.body.data.requests[0].add_on_services).toEqual([
      expect.objectContaining({ service_id: serviceId, name: serviceResponse.body.data.service.name, quantity: 1, unit: '次' }),
    ]);

    const staffAppointment = await ownerAgent.get(`/api/appointments/${appointmentId}`).set(headers).expect(200);
    expect(staffAppointment.body.data.appointment.pets[0].add_on_services).toEqual([
      expect.objectContaining({ service_id: serviceId, name: serviceResponse.body.data.service.name, quantity: 1 }),
    ]);
  });

  test('cancels the booking only after the shop approves the customer request', async () => {
    const ownerAgent = await loginAsOwner();
    const { appointmentId, memberToken } = await createBookingFixture(ownerAgent);
    const headers = { 'X-Shop-Id': '1' };

    const submitResponse = await request(app)
      .post(`/api/public/member/requests/${appointmentId}/changes`)
      .set(headers)
      .set('Cookie', `customer_member_session=${memberToken}`)
      .send({ request_type: 'CANCEL', customer_note: '臨時有事。' })
      .expect(201);
    await ownerAgent.patch(`/api/booking-change-requests/${submitResponse.body.data.request_id}`)
      .set(headers)
      .send({ decision: 'APPROVE' })
      .expect(200);

    const [appointments] = await getPool().query(
      'SELECT status FROM appointments WHERE id = ?',
      [appointmentId],
    );
    expect(appointments[0].status).toBe('CANCELLED');
  });

  test('hides and rejects booking changes for paid appointments, including requests awaiting review', async () => {
    const ownerAgent = await loginAsOwner();
    const { appointmentId, memberToken } = await createBookingFixture(ownerAgent);
    const headers = { 'X-Shop-Id': '1' };
    const [orderResult] = await getPool().query(
      `INSERT INTO orders
         (shop_id, customer_id, source_type, appointment_id, business_unit, status, total_amount)
       SELECT 1, customer_id, 'APPOINTMENT', id, 'DOG', 'PAID', 0
       FROM appointments WHERE id = ?`,
      [appointmentId],
    );

    const memberRequests = await request(app).get('/api/public/member/requests')
      .set(headers)
      .set('Cookie', `customer_member_session=${memberToken}`)
      .expect(200);
    expect(memberRequests.body.data.requests[0].has_completed_order).toBe(true);

    const paidSubmitResponse = await withoutExpectedErrorLog(() => request(app)
      .post(`/api/public/member/requests/${appointmentId}/changes`)
      .set(headers)
      .set('Cookie', `customer_member_session=${memberToken}`)
      .send({ request_type: 'CANCEL' })
      .expect(409));
    expect(paidSubmitResponse.body.error.code).toBe('BOOKING_CHANGE_NOT_ALLOWED');

    await getPool().query("UPDATE orders SET status = 'UNPAID' WHERE id = ?", [orderResult.insertId]);
    const pendingResponse = await request(app)
      .post(`/api/public/member/requests/${appointmentId}/changes`)
      .set(headers)
      .set('Cookie', `customer_member_session=${memberToken}`)
      .send({ request_type: 'CANCEL' })
      .expect(201);
    await getPool().query("UPDATE orders SET status = 'PAID' WHERE id = ?", [orderResult.insertId]);

    const approveResponse = await withoutExpectedErrorLog(() => ownerAgent
      .patch(`/api/booking-change-requests/${pendingResponse.body.data.request_id}`)
      .set(headers)
      .send({ decision: 'APPROVE' }));
    expect(approveResponse.status).toBe(409);
    expect(approveResponse.body.error.code).toBe('BOOKING_CHANGE_NOT_ALLOWED');
    const [appointments] = await getPool().query('SELECT status FROM appointments WHERE id = ?', [appointmentId]);
    expect(appointments[0].status).toBe('CONFIRMED');
  });

  test('rolls back a reschedule when the proposed time cannot be allocated', async () => {
    const ownerAgent = await loginAsOwner();
    const { appointmentId, memberToken } = await createBookingFixture(ownerAgent);
    const headers = { 'X-Shop-Id': '1' };
    const submitResponse = await request(app)
      .post(`/api/public/member/requests/${appointmentId}/changes`)
      .set(headers)
      .set('Cookie', `customer_member_session=${memberToken}`)
      .send({ request_type: 'RESCHEDULE', proposed_appointment_date: '2035-05-10', proposed_appointment_time: '15:00' })
      .expect(201);

    await withoutExpectedErrorLog(() => ownerAgent.patch(`/api/booking-change-requests/${submitResponse.body.data.request_id}`)
      .set(headers)
      .send({ decision: 'APPROVE' })
      .expect(409));

    const [appointments] = await getPool().query(
      'SELECT appointment_date, appointment_time, status FROM appointments WHERE id = ?',
      [appointmentId],
    );
    expect(String(appointments[0].appointment_date).slice(0, 10)).not.toBe('2035-05-10');
    expect(String(appointments[0].appointment_time).slice(0, 5)).toBe('11:00');
    expect(appointments[0].status).toBe('CONFIRMED');
    const [changeRequests] = await getPool().query(
      'SELECT status FROM booking_change_requests WHERE id = ?',
      [submitResponse.body.data.request_id],
    );
    expect(changeRequests[0].status).toBe('PENDING');
  });
});
