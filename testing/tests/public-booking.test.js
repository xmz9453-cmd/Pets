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
process.env.BOOKING_OTP_SECRET = 'test-only-booking-otp-secret';

jest.mock('../../backend/src/services/sms-provider', () => ({
  sendBookingOtp: jest.fn(async () => {}),
}));

const crypto = require('crypto');
const app = require('../../backend/src/app');
const { setup } = require('../../database/scripts/setup');
const { getPool, closePool } = require('../../backend/src/config/database');
const { sendBookingOtp } = require('../../backend/src/services/sms-provider');
const { getFoundationOwner } = require('../../database/seeds/staff-authentication-seed');

describe('Public booking phone verification', () => {
  let customerId;
  let otherCustomerId;
  let phone;
  let name;
  let petIds;
  let appointmentIds;
  let resourceIds;

  beforeAll(async () => {
    await setup();
  });

  beforeEach(async () => {
    sendBookingOtp.mockClear();
    phone = `09${crypto.randomInt(100000000, 999999999)}`;
    name = `Booking Customer ${Date.now()}`;
    appointmentIds = [];
    resourceIds = [];
    const [result] = await getPool().query(
      `INSERT INTO customers (shop_id, name, phone, status)
       VALUES (1, ?, ?, 'ACTIVE')`,
      [name, phone],
    );
    customerId = result.insertId;
    petIds = [];
  });

  afterEach(async () => {
    if (appointmentIds.length) {
      await getPool().query('DELETE FROM appointment_resource_assignments WHERE appointment_id IN (?)', [appointmentIds]);
      await getPool().query('DELETE FROM booking_request_details WHERE appointment_id IN (?)', [appointmentIds]);
      await getPool().query('DELETE FROM daily_operations WHERE appointment_id IN (?)', [appointmentIds]);
      await getPool().query('DELETE FROM appointments WHERE id IN (?)', [appointmentIds]);
    }
    if (resourceIds.length) {
      await getPool().query('DELETE FROM booking_resources WHERE id IN (?)', [resourceIds]);
    }
    if (petIds.length) {
      await getPool().query('DELETE FROM pet_customer_relationships WHERE pet_id IN (?)', [petIds]);
      await getPool().query('DELETE FROM pets WHERE id IN (?)', [petIds]);
    }
    await getPool().query('DELETE FROM booking_otp_challenges WHERE shop_id = 1 AND phone = ?', [phone]);
    await getPool().query('DELETE FROM booking_sessions WHERE customer_id = ?', [customerId]);
    if (otherCustomerId) {
      await getPool().query('DELETE FROM booking_sessions WHERE customer_id = ?', [otherCustomerId]);
      await getPool().query('DELETE FROM customers WHERE id = ?', [otherCustomerId]);
      otherCustomerId = null;
    }
    await getPool().query('DELETE FROM customers WHERE id = ?', [customerId]);
  });

  afterAll(async () => {
    await closePool();
  });

  test('sends a branded OTP and creates a hashed session after successful verification', async () => {
    const sent = await request(app)
      .post('/api/public/booking/otp')
      .send({ phone: ` ${phone} ` })
      .expect(200);
    expect(sent.body.data.message).toContain('店家名稱開頭');
    expect(sendBookingOtp).toHaveBeenCalledTimes(1);
    expect(sendBookingOtp.mock.calls[0][0].message).toContain('預約手機驗證');
    expect(sendBookingOtp.mock.calls[0][0].message).toContain('驗證碼');

    const response = await request(app)
      .post('/api/public/booking/otp/verify')
      .send({ phone, code: sendBookingOtp.mock.calls[0][0].code })
      .expect(200);
    expect(response.body.data).toEqual({ message: '手機驗證成功。' });
    expect(JSON.stringify(response.body)).not.toContain(String(customerId));

    const [cookie] = response.headers['set-cookie'];
    expect(cookie).toMatch(/^booking_session=[a-f0-9]{64};/);
    expect(cookie).toContain('Path=/api/public/booking');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).not.toContain('Secure');
    const [, token] = cookie.match(/^booking_session=([a-f0-9]{64});/);

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const [rows] = await getPool().query(
      `SELECT id, token_hash, customer_id, status,
              TIMESTAMPDIFF(SECOND, created_at, expires_at) AS lifetime_seconds
       FROM booking_sessions WHERE token_hash = ?`,
      [tokenHash],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      token_hash: tokenHash,
      customer_id: customerId,
      status: 'ACTIVE',
      lifetime_seconds: 7200,
    });
    expect(rows[0].token_hash).not.toBe(token);
    const [plaintextRows] = await getPool().query(
      'SELECT id FROM booking_sessions WHERE token_hash = ?',
      [token],
    );
    expect(plaintextRows).toHaveLength(0);
  });

  test('rejects invalid OTPs and locks a challenge after the maximum attempts', async () => {
    await request(app).post('/api/public/booking/otp').send({ phone }).expect(200);
    const wrongCode = String((Number(sendBookingOtp.mock.calls[0][0].code) + 1) % 1000000).padStart(6, '0');
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request(app)
        .post('/api/public/booking/otp/verify')
        .send({ phone, code: wrongCode })
        .expect(400);
      expect(response.body.error.code).toBe(attempt === 4 ? 'OTP_ATTEMPTS_EXCEEDED' : 'OTP_INVALID');
    }
    const [sessions] = await getPool().query(
      'SELECT id FROM booking_sessions WHERE customer_id = ?',
      [customerId],
    );
    expect(sessions).toHaveLength(0);
  });

  test('booking session token hash has a unique database constraint', async () => {
    const cookie = await createBookingSession();
    const token = cookie.slice('booking_session='.length);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await expect(getPool().query(
      `INSERT INTO booking_sessions (shop_id, token_hash, customer_id, status, expires_at)
       VALUES (1, ?, ?, 'ACTIVE', DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 2 HOUR))`,
      [tokenHash, customerId],
    )).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  });

  async function createPetForCustomer(ownerId, petName, status = 'ACTIVE', species = 'CAT') {
    const [pet] = await getPool().query(
      'INSERT INTO pets (shop_id, name, species, breed, gender, status) VALUES (1, ?, ?, ?, ?, ?)',
      [petName, species, '米克斯', 'UNKNOWN', status],
    );
    petIds.push(pet.insertId);
    await getPool().query(
      'INSERT INTO pet_customer_relationships (shop_id, pet_id, customer_id, is_primary) VALUES (1, ?, ?, TRUE)',
      [pet.insertId, ownerId],
    );
    return pet.insertId;
  }

  async function createServiceFixture({ name, type = 'GROOMING', species = 'DOG', price = 500, unit = '次', status = 'ACTIVE' } = {}) {
    const uniqueName = `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const [result] = await getPool().query(
      'INSERT INTO services (shop_id, name, type, description, price, unit, species, duration_minutes, sort_order, status) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uniqueName, type, null, price, unit, species, 30, 0, status],
    );
    return { id: result.insertId, name: uniqueName };
  }

  async function configureAvailableSlot(capacity = 1) {
    await getPool().query(
      `INSERT INTO shop_business_hours (shop_id, weekday, is_closed, open_time, close_time)
       VALUES (1, 'THURSDAY', FALSE, '09:00:00', '18:00:00')
       ON DUPLICATE KEY UPDATE is_closed = FALSE, open_time = '09:00:00', close_time = '18:00:00'`,
    );
    await getPool().query(
      `INSERT INTO booking_schedule_rules (shop_id, species, start_time, capacity, is_closed, status)
       VALUES (1, 'DOG', '10:30:00', ?, FALSE, 'ACTIVE')
       ON DUPLICATE KEY UPDATE capacity = VALUES(capacity), is_closed = FALSE, status = 'ACTIVE'`,
      [capacity],
    );
  }

  async function createBookingSession() {
    await getPool().query('DELETE FROM booking_otp_challenges WHERE shop_id = 1 AND phone = ?', [phone]);
    await request(app)
      .post('/api/public/booking/otp')
      .send({ phone })
      .expect(200);
    const response = await request(app)
      .post('/api/public/booking/otp/verify')
      .send({ phone, code: sendBookingOtp.mock.calls[sendBookingOtp.mock.calls.length - 1][0].code })
      .expect(200);
    return response.headers['set-cookie'][0].split(';')[0];
  }

  test('lists only this session customer active pets with public fields', async () => {
    const ownPetId = await createPetForCustomer(customerId, '阿貓');
    await createPetForCustomer(customerId, '停用寵物', 'INACTIVE');
    const [otherCustomer] = await getPool().query(
      `INSERT INTO customers (shop_id, name, phone, status) VALUES (1, ?, ?, 'ACTIVE')`,
      ['Other Booking Customer', `09${crypto.randomInt(100000000, 999999999)}`],
    );
    otherCustomerId = otherCustomer.insertId;
    await createPetForCustomer(otherCustomerId, '別人的寵物');

    const cookie = await createBookingSession();
    const response = await request(app)
      .get('/api/public/booking/pets?customer_id=999999')
      .set('Cookie', cookie)
      .send({ customer_id: 999999 })
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      data: {
        pets: [{ id: ownPetId, name: '阿貓', species: 'CAT', breed: '米克斯' }],
      },
    });
    expect(JSON.stringify(response.body)).not.toContain(String(customerId));
    expect(JSON.stringify(response.body)).not.toContain(phone);
    expect(JSON.stringify(response.body)).not.toContain(name);
    expect(JSON.stringify(response.body)).not.toContain(cookie.split('=')[1]);
    expect(response.body.data.pets[0]).not.toHaveProperty('customer_id');
    expect(response.body.data.pets[0]).not.toHaveProperty('status');
    expect(response.body.data.pets[0]).not.toHaveProperty('gender');
  });

  test('requires a valid booking session cookie', async () => {
    await request(app).get('/api/public/booking/pets').expect(401);
    await request(app)
      .get('/api/public/booking/pets')
      .set('Cookie', 'booking_session=not-a-valid-token')
      .expect(401);
  });

  test('rejects expired and non-active booking sessions', async () => {
    for (const status of ['EXPIRED', 'CONSUMED']) {
      const cookie = await createBookingSession();
      const token = cookie.slice('booking_session='.length);
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await getPool().query('UPDATE booking_sessions SET status = ? WHERE token_hash = ?', [status, tokenHash]);
      await request(app)
        .get('/api/public/booking/pets')
        .set('Cookie', cookie)
        .expect(401);
      await getPool().query('DELETE FROM booking_sessions WHERE token_hash = ?', [tokenHash]);
    }

    const cookie = await createBookingSession();
    const token = cookie.slice('booking_session='.length);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await getPool().query(
      'UPDATE booking_sessions SET expires_at = UTC_TIMESTAMP() - INTERVAL 1 SECOND WHERE token_hash = ?',
      [tokenHash],
    );
    await request(app)
      .get('/api/public/booking/pets')
      .set('Cookie', cookie)
      .expect(401);
  });

  test('returns active, species-compatible services for the selected pet using the session customer identity', async () => {
    const petId = await createPetForCustomer(customerId, '服務狗', 'ACTIVE', 'DOG');
    const dogService = await createServiceFixture({ name: 'Dog Groom', type: 'GROOMING', species: 'DOG', price: 500, unit: '次' });
    const bothService = await createServiceFixture({ name: 'All Pets Groom', type: 'GROOMING', species: 'BOTH', price: 600, unit: '次' });
    const catService = await createServiceFixture({ name: 'Cat Groom', type: 'GROOMING', species: 'CAT', price: 550, unit: '次' });
    const inactiveService = await createServiceFixture({ name: 'Inactive Dog Groom', type: 'GROOMING', species: 'DOG', price: 700, unit: '次', status: 'INACTIVE' });

    const cookie = await createBookingSession();
    const response = await request(app)
      .get(`/api/public/booking/services?pet_id=${petId}`)
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.services.map((service) => service.id)).toEqual(expect.arrayContaining([dogService.id, bothService.id]));
    expect(response.body.data.services.every((service) => ['id', 'name', 'type', 'price', 'unit', 'duration_minutes'].every((key) => Object.prototype.hasOwnProperty.call(service, key)))).toBe(true);
    expect(response.body.data.services[0]).not.toHaveProperty('description');
    expect(response.body.data.services[0]).not.toHaveProperty('customer_id');
    expect(response.body.data.services.every((service) => service.id !== inactiveService.id)).toBe(true);
    expect(response.body.data.services.every((service) => service.id !== catService.id)).toBe(true);
  });

  test('rejects invalid, expired, missing, and non-active booking sessions for service lookup', async () => {
    const petId = await createPetForCustomer(customerId, '會話寵物', 'ACTIVE', 'DOG');
    await request(app).get(`/api/public/booking/services?pet_id=${petId}`).expect(401);
    await request(app).get(`/api/public/booking/services?pet_id=${petId}`).set('Cookie', 'booking_session=not-a-valid-token').expect(401);

    const cookie = await createBookingSession();
    const token = cookie.slice('booking_session='.length);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await getPool().query('UPDATE booking_sessions SET status = ? WHERE token_hash = ?', ['CONSUMED', tokenHash]);
    await request(app).get(`/api/public/booking/services?pet_id=${petId}`).set('Cookie', cookie).expect(401);

    await getPool().query('UPDATE booking_sessions SET status = ?, expires_at = UTC_TIMESTAMP() - INTERVAL 1 SECOND WHERE token_hash = ?', ['ACTIVE', tokenHash]);
    await request(app).get(`/api/public/booking/services?pet_id=${petId}`).set('Cookie', cookie).expect(401);
  });

  test('rejects unowned, missing, and inactive pets for service lookup and ignores customer_id in the request', async () => {
    const ownPetId = await createPetForCustomer(customerId, '自己的狗', 'ACTIVE', 'DOG');
    const otherCustomerId = (await getPool().query('INSERT INTO customers (shop_id, name, phone, status) VALUES (1, ?, ?, ?)', ['Other Service Customer', `09${crypto.randomInt(100000000, 999999999)}`, 'ACTIVE']))[0].insertId;
    const otherCustomerPetId = await createPetForCustomer(otherCustomerId, '別人的狗', 'ACTIVE', 'DOG');
    const inactivePetId = await createPetForCustomer(customerId, '停用狗', 'INACTIVE', 'DOG');

    const cookie = await createBookingSession();
    const validResponse = await request(app).get(`/api/public/booking/services?pet_id=${ownPetId}&customer_id=999999`).set('Cookie', cookie).expect(200);
    expect(validResponse.body.data.services.length).toBeGreaterThan(0);

    const otherResponse = await request(app).get(`/api/public/booking/services?pet_id=${otherCustomerPetId}`).set('Cookie', cookie).expect(400);
    expect(otherResponse.body.error.code).toBe('VALIDATION_ERROR');
    expect(otherResponse.body.error.fields.pet_id).toBe('Pet does not belong to this customer');

    const missingResponse = await request(app).get('/api/public/booking/services?pet_id=999999').set('Cookie', cookie).expect(404);
    expect(missingResponse.body.error.code).toBe('PET_NOT_FOUND');

    const inactiveResponse = await request(app).get(`/api/public/booking/services?pet_id=${inactivePetId}`).set('Cookie', cookie).expect(400);
    expect(inactiveResponse.body.error.fields.pet_id).toBe('Pet is not active');
  });

  test('filters services by species compatibility for dog and cat pets', async () => {
    const dogPetId = await createPetForCustomer(customerId, '狗', 'ACTIVE', 'DOG');
    const catPetId = await createPetForCustomer(customerId, '貓', 'ACTIVE', 'CAT');
    const dogOnly = await createServiceFixture({ name: 'Dog Only', species: 'DOG', type: 'GROOMING', price: 500, unit: '次' });
    const bothPets = await createServiceFixture({ name: 'Both Pets', species: 'BOTH', type: 'GROOMING', price: 600, unit: '次' });
    const catOnly = await createServiceFixture({ name: 'Cat Only', species: 'CAT', type: 'GROOMING', price: 550, unit: '次' });
    const cookie = await createBookingSession();

    const dogResponse = await request(app).get(`/api/public/booking/services?pet_id=${dogPetId}`).set('Cookie', cookie).expect(200);
    expect(dogResponse.body.data.services.map((service) => service.id)).toEqual(expect.arrayContaining([dogOnly.id, bothPets.id]));
    expect(dogResponse.body.data.services.map((service) => service.id)).not.toContain(catOnly.id);

    const catResponse = await request(app).get(`/api/public/booking/services?pet_id=${catPetId}`).set('Cookie', cookie).expect(200);
    expect(catResponse.body.data.services.map((service) => service.id)).toEqual(expect.arrayContaining([catOnly.id, bothPets.id]));
    expect(catResponse.body.data.services.map((service) => service.id)).not.toContain(dogOnly.id);
  });

  test('lets customers request a slot and enforces capacity when the shop confirms it', async () => {
    await configureAvailableSlot(1);
    const petId = await createPetForCustomer(customerId, '預約狗', 'ACTIVE', 'DOG');
    const service = await createServiceFixture({ name: 'Capacity Groom', type: 'GROOMING', species: 'DOG' });
    const cookie = await createBookingSession();
    const availability = await request(app)
      .get(`/api/public/booking/availability?pet_id=${petId}&service_id=${service.id}&date=2099-01-01`)
      .set('Cookie', cookie)
      .expect(200);
    expect(availability.body.data.slots.map((slot) => slot.time)).toContain('10:30');

    const requestIds = [];
    for (let index = 0; index < 2; index += 1) {
      const response = await request(app)
        .post('/api/public/booking/requests')
        .set('Cookie', cookie)
        .send({
          pet_id: petId,
          service_id: service.id,
          appointment_date: '2099-01-01',
          appointment_time: '10:30',
        })
        .expect(201);
      expect(response.body.data.request.status).toBe('PENDING');
      requestIds.push(response.body.data.request.appointment_id);
      appointmentIds.push(response.body.data.request.appointment_id);
    }

    const owner = getFoundationOwner();
    const staffAgent = request.agent(app);
    await staffAgent.post('/api/auth/login')
      .send({ username: owner.username, password: owner.password })
      .expect(200);
    await staffAgent.patch(`/api/appointments/${requestIds[0]}`)
      .send({ status: 'CONFIRMED' })
      .expect(200);
    const rejected = await staffAgent.patch(`/api/appointments/${requestIds[1]}`)
      .send({ status: 'CONFIRMED' })
      .expect(409);
    expect(rejected.body.error.code).toBe('BOOKING_CAPACITY_UNAVAILABLE');
  });

  test('lets the shop block resource dates and refuses blocks over confirmed appointments', async () => {
    await configureAvailableSlot(1);
    const owner = getFoundationOwner();
    const staffAgent = request.agent(app);
    await staffAgent.post('/api/auth/login')
      .send({ username: owner.username, password: owner.password })
      .expect(200);
    const resourceResponse = await staffAgent.post('/api/shop-settings/booking-resources')
      .send({
        resource_type: 'GROOMING_STATION',
        service_type: 'GROOMING',
        name: `Station ${Date.now()}`,
        capacity: 1,
        hours: [{ weekday: 'THURSDAY', start_time: '10:00', end_time: '12:00' }],
      })
      .expect(201);
    const resourceId = resourceResponse.body.data.resource.id;
    resourceIds.push(resourceId);

    const petId = await createPetForCustomer(customerId, '資源預約狗', 'ACTIVE', 'DOG');
    const service = await createServiceFixture({ name: 'Resource Groom', type: 'GROOMING', species: 'DOG' });
    const cookie = await createBookingSession();
    const query = `/api/public/booking/availability?pet_id=${petId}&service_id=${service.id}&date=2099-01-01`;
    const available = await request(app).get(query).set('Cookie', cookie).expect(200);
    expect(available.body.data.slots.map((slot) => slot.time)).toContain('10:30');

    const blocked = await staffAgent.post(`/api/shop-settings/booking-resources/${resourceId}/blocks`)
      .send({ block_date: '2099-01-01', note: '設備保養' })
      .expect(201);
    const blocks = await staffAgent.get('/api/shop-settings/booking-resources').expect(200);
    expect(blocks.body.data.resources.find((resource) => resource.id === resourceId).blocks).toContainEqual(
      expect.objectContaining({ id: blocked.body.data.block.id, block_date: '2099-01-01', note: '設備保養' }),
    );
    const unavailable = await request(app).get(query).set('Cookie', cookie).expect(200);
    expect(unavailable.body.data.slots.map((slot) => slot.time)).not.toContain('10:30');
    await staffAgent.delete(`/api/shop-settings/booking-resources/${resourceId}/blocks/${blocked.body.data.block.id}`).expect(200);

    const booking = await request(app).post('/api/public/booking/requests')
      .set('Cookie', cookie)
      .send({
        pet_id: petId,
        service_id: service.id,
        appointment_date: '2099-01-01',
        appointment_time: '10:30',
      })
      .expect(201);
    const appointmentId = booking.body.data.request.appointment_id;
    appointmentIds.push(appointmentId);
    await staffAgent.patch(`/api/appointments/${appointmentId}`).send({ status: 'CONFIRMED' }).expect(200);
    const conflictingBlock = await staffAgent.post(`/api/shop-settings/booking-resources/${resourceId}/blocks`)
      .send({ block_date: '2099-01-01', start_time: '10:45', end_time: '11:00' })
      .expect(409);
    expect(conflictingBlock.body.error.code).toBe('BOOKING_RESOURCE_IN_USE');
    await staffAgent.patch(`/api/appointments/${appointmentId}`).send({ status: 'CANCELLED' }).expect(200);
    await staffAgent.post(`/api/shop-settings/booking-resources/${resourceId}/blocks`)
      .send({ block_date: '2099-01-01', start_time: '10:45', end_time: '11:00' })
      .expect(201);
  });
});
