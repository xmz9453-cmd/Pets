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

const crypto = require('crypto');
const app = require('../../backend/src/app');
const { setup } = require('../../database/scripts/setup');
const { getPool, closePool } = require('../../backend/src/config/database');

const CUSTOMER_CONFIRMATION_FAILURE = {
  success: false,
  error: {
    code: 'CUSTOMER_CONFIRMATION_FAILED',
    message: '手機號碼或姓名不正確，請確認後再試。',
  },
};

describe('Public booking customer confirmation', () => {
  let customerId;
  let otherCustomerId;
  let phone;
  let name;
  let petIds;

  beforeAll(async () => {
    await setup();
  });

  beforeEach(async () => {
    phone = `09${crypto.randomInt(100000000, 999999999)}`;
    name = `Booking Customer ${Date.now()}`;
    const [result] = await getPool().query(
      `INSERT INTO customers (name, phone, status)
       VALUES (?, ?, 'ACTIVE')`,
      [name, phone],
    );
    customerId = result.insertId;
    petIds = [];
  });

  afterEach(async () => {
    if (petIds.length) {
      await getPool().query('DELETE FROM pet_customer_relationships WHERE pet_id IN (?)', [petIds]);
      await getPool().query('DELETE FROM pets WHERE id IN (?)', [petIds]);
    }
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

  test('exact active customer match creates a hashed session and scoped HttpOnly cookie', async () => {
    const response = await request(app)
      .post('/api/public/booking/customer-confirmation')
      .send({ phone: ` ${phone} `, name: ` ${name} `, customer_id: 999999 })
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      data: { message: '身分確認成功。' },
    });
    expect(JSON.stringify(response.body)).not.toContain(String(customerId));
    expect(response.body.data).not.toHaveProperty('token');
    expect(response.body.data).not.toHaveProperty('customer_id');
    expect(response.body.data).not.toHaveProperty('customer');

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

  test.each([
    ['phone mismatch', { phone: '0900000000' }],
    ['name mismatch', { name: 'Different Name' }],
    ['unknown customer', { phone: '0999999999', name: 'No Such Customer' }],
    ['inactive customer', { status: 'INACTIVE' }],
    ['missing phone', { phone: '' }],
    ['missing name', { name: '' }],
  ])('returns the same failure for %s', async (_scenario, override) => {
    if (override.status) {
      await getPool().query('UPDATE customers SET status = ? WHERE id = ?', [override.status, customerId]);
    }
    const response = await request(app)
      .post('/api/public/booking/customer-confirmation')
      .send({
        phone: override.phone === undefined ? phone : override.phone,
        name: override.name === undefined ? name : override.name,
      })
      .expect(400);

    expect(response.body).toEqual(CUSTOMER_CONFIRMATION_FAILURE);
    const [sessions] = await getPool().query(
      'SELECT id FROM booking_sessions WHERE customer_id = ?',
      [customerId],
    );
    expect(sessions).toHaveLength(0);
  });

  test('booking session token hash has a unique database constraint', async () => {
    const response = await request(app)
      .post('/api/public/booking/customer-confirmation')
      .send({ phone, name })
      .expect(200);
    const token = response.headers['set-cookie'][0].match(/^booking_session=([a-f0-9]{64});/)[1];
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await expect(getPool().query(
      `INSERT INTO booking_sessions (token_hash, customer_id, status, expires_at)
       VALUES (?, ?, 'ACTIVE', DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 2 HOUR))`,
      [tokenHash, customerId],
    )).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  });

  async function createPetForCustomer(ownerId, petName, status = 'ACTIVE', species = 'CAT') {
    const [pet] = await getPool().query(
      'INSERT INTO pets (name, species, breed, gender, status) VALUES (?, ?, ?, ?, ?)',
      [petName, species, '米克斯', 'UNKNOWN', status],
    );
    petIds.push(pet.insertId);
    await getPool().query(
      'INSERT INTO pet_customer_relationships (pet_id, customer_id, is_primary) VALUES (?, ?, TRUE)',
      [pet.insertId, ownerId],
    );
    return pet.insertId;
  }

  async function createServiceFixture({ name, type = 'GROOMING', species = 'DOG', price = 500, unit = '次', status = 'ACTIVE' } = {}) {
    const uniqueName = `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const [result] = await getPool().query(
      'INSERT INTO services (name, type, description, price, unit, species, duration_minutes, sort_order, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uniqueName, type, null, price, unit, species, 30, 0, status],
    );
    return { id: result.insertId, name: uniqueName };
  }

  async function createBookingSession() {
    const response = await request(app)
      .post('/api/public/booking/customer-confirmation')
      .send({ phone, name })
      .expect(200);
    return response.headers['set-cookie'][0].split(';')[0];
  }

  test('lists only this session customer active pets with public fields', async () => {
    const ownPetId = await createPetForCustomer(customerId, '阿貓');
    await createPetForCustomer(customerId, '停用寵物', 'INACTIVE');
    const [otherCustomer] = await getPool().query(
      `INSERT INTO customers (name, phone, status) VALUES (?, ?, 'ACTIVE')`,
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
    expect(response.body.data.services.every((service) => ['id', 'name', 'type', 'price', 'unit'].every((key) => Object.prototype.hasOwnProperty.call(service, key)))).toBe(true);
    expect(response.body.data.services[0]).not.toHaveProperty('description');
    expect(response.body.data.services[0]).not.toHaveProperty('duration_minutes');
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
    const otherCustomerId = (await getPool().query('INSERT INTO customers (name, phone, status) VALUES (?, ?, ?)', ['Other Service Customer', `09${crypto.randomInt(100000000, 999999999)}`, 'ACTIVE']))[0].insertId;
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
});
