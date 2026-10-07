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
  let phone;
  let name;

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
  });

  afterEach(async () => {
    await getPool().query('DELETE FROM booking_sessions WHERE customer_id = ?', [customerId]);
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
});
