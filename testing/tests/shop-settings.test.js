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
const { hashPassword } = require('../../backend/src/utils/password');
const shopSettingsService = require('../../backend/src/services/shop-settings.service');

const owner = getFoundationOwner();

async function loginAsOwner() {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/login').send({
    username: owner.username,
    password: owner.password,
  });

  return { agent, response };
}

async function createStaffUser({ username, password, displayName, roleCode }) {
  const passwordHash = await hashPassword(password);
  const [staffRow] = await getPool().query(
    'INSERT INTO staff (username, password_hash, display_name, status) VALUES (?, ?, ?, "ACTIVE")',
    [username, passwordHash, displayName],
  );

  const [roleRow] = await getPool().query('SELECT id FROM roles WHERE code = ?', [roleCode]);
  if (roleRow.length) {
    await getPool().query('INSERT INTO staff_roles (staff_id, role_id) VALUES (?, ?)', [staffRow.insertId, roleRow[0].id]);
  }

  return staffRow.insertId;
}

async function getShopSettingsRow() {
  const [rows] = await getPool().query('SELECT * FROM shop_settings LIMIT 1');
  return rows[0] || null;
}

describe('Shop Settings API', () => {
  beforeAll(async () => {
    await setup();
    await getPool().query('DELETE FROM auth_sessions');
    await getPool().query('DELETE FROM shop_business_hours');
    await getPool().query('DELETE FROM shop_settings');
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await getPool().query('DELETE FROM auth_sessions');
    await getPool().query('DELETE FROM shop_business_hours');
    await getPool().query('DELETE FROM shop_settings');
  });

  afterAll(async () => {
    await closePool();
  });

  test('GET /api/shop-settings initializes default settings and seven business-hours rows', async () => {
    const { agent } = await loginAsOwner();

    const response = await agent.get('/api/shop-settings');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.shop).toMatchObject({
      name: 'My Shop',
    });
    expect(response.body.data.business_hours).toHaveLength(7);
    expect(response.body.data.business_hours.map((entry) => entry.weekday)).toEqual([
      'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
    ]);

    const persisted = await getShopSettingsRow();
    expect(persisted).not.toBeNull();
  });

  test('PUT /api/shop-settings updates shop data and business hours atomically', async () => {
    const { agent } = await loginAsOwner();

    const putResponse = await agent.put('/api/shop-settings').send({
      name: 'Sunset Pet Grooming',
      phone: '02-1234-5678',
      address: '123 Main Street',
      email: 'hello@sunsetpet.com',
      business_hours: [
        { weekday: 'MONDAY', is_closed: false, open_time: '09:00', close_time: '18:00' },
        { weekday: 'TUESDAY', is_closed: false, open_time: '09:00', close_time: '18:00' },
        { weekday: 'WEDNESDAY', is_closed: false, open_time: '09:00', close_time: '18:00' },
        { weekday: 'THURSDAY', is_closed: false, open_time: '09:00', close_time: '18:00' },
        { weekday: 'FRIDAY', is_closed: false, open_time: '09:00', close_time: '18:00' },
        { weekday: 'SATURDAY', is_closed: true, open_time: null, close_time: null },
        { weekday: 'SUNDAY', is_closed: true, open_time: null, close_time: null },
      ],
    });

    expect(putResponse.status).toBe(200);
    expect(putResponse.body.success).toBe(true);
    expect(putResponse.body.data.shop.name).toBe('Sunset Pet Grooming');
    expect(putResponse.body.data.business_hours).toHaveLength(7);

    await agent.get('/api/shop-settings');
    const persisted = await getShopSettingsRow();
    expect(persisted.name).toBe('Sunset Pet Grooming');
  });

  test('PUT /api/shop-settings rejects invalid input and keeps prior values unchanged', async () => {
    const { agent } = await loginAsOwner();
    await agent.put('/api/shop-settings').send({
      name: 'Original Shop',
      phone: '',
      address: '',
      email: '',
      business_hours: [
        { weekday: 'MONDAY', is_closed: false, open_time: '09:00', close_time: '17:00' },
        { weekday: 'TUESDAY', is_closed: false, open_time: '09:00', close_time: '17:00' },
        { weekday: 'WEDNESDAY', is_closed: false, open_time: '09:00', close_time: '17:00' },
        { weekday: 'THURSDAY', is_closed: false, open_time: '09:00', close_time: '17:00' },
        { weekday: 'FRIDAY', is_closed: false, open_time: '09:00', close_time: '17:00' },
        { weekday: 'SATURDAY', is_closed: false, open_time: '10:00', close_time: '15:00' },
        { weekday: 'SUNDAY', is_closed: true, open_time: null, close_time: null },
      ],
    });

    const invalidResponse = await agent.put('/api/shop-settings').send({
      name: '   ',
      phone: '',
      address: '',
      email: 'invalid-email',
      business_hours: [
        { weekday: 'MONDAY', is_closed: false, open_time: '18:00', close_time: '09:00' },
        { weekday: 'TUESDAY', is_closed: false, open_time: '09:00', close_time: '17:00' },
        { weekday: 'WEDNESDAY', is_closed: false, open_time: '09:00', close_time: '17:00' },
        { weekday: 'THURSDAY', is_closed: false, open_time: '09:00', close_time: '17:00' },
        { weekday: 'FRIDAY', is_closed: false, open_time: '09:00', close_time: '17:00' },
        { weekday: 'SATURDAY', is_closed: false, open_time: '10:00', close_time: '15:00' },
        { weekday: 'SUNDAY', is_closed: true, open_time: null, close_time: null },
      ],
    });

    expect(invalidResponse.status).toBe(400);
    expect(invalidResponse.body.error.code).toBe('VALIDATION_ERROR');

    const persisted = await getShopSettingsRow();
    expect(persisted.name).toBe('Original Shop');
  });

  test('shop settings requires authentication and OWNER authorization', async () => {
    const anonymousResponse = await request(app).get('/api/shop-settings');
    expect(anonymousResponse.status).toBe(401);

    const { agent } = await loginAsOwner();
    const uniqueUsername = `frontdesk-${Date.now()}`;
    const frontDeskId = await createStaffUser({
      username: uniqueUsername,
      password: 'frontdesk-pass',
      displayName: 'Front Desk',
      roleCode: 'FRONT_DESK',
    });

    await getPool().query('INSERT INTO auth_sessions (staff_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))', [frontDeskId, `frontdesk-${Date.now()}`]);

    const frontDeskAgent = request.agent(app);
    const loginResponse = await frontDeskAgent.post('/api/auth/login').send({ username: uniqueUsername, password: 'frontdesk-pass' });
    expect(loginResponse.status).toBe(200);

    const getForbiddenResponse = await frontDeskAgent.get('/api/shop-settings');
    expect(getForbiddenResponse.status).toBe(403);

    const forbiddenResponse = await frontDeskAgent.put('/api/shop-settings').send({
      name: 'Nope',
      business_hours: [
        { weekday: 'MONDAY', is_closed: false, open_time: '09:00', close_time: '17:00' },
        { weekday: 'TUESDAY', is_closed: false, open_time: '09:00', close_time: '17:00' },
        { weekday: 'WEDNESDAY', is_closed: false, open_time: '09:00', close_time: '17:00' },
        { weekday: 'THURSDAY', is_closed: false, open_time: '09:00', close_time: '17:00' },
        { weekday: 'FRIDAY', is_closed: false, open_time: '09:00', close_time: '17:00' },
        { weekday: 'SATURDAY', is_closed: true, open_time: null, close_time: null },
        { weekday: 'SUNDAY', is_closed: true, open_time: null, close_time: null },
      ],
    });

    expect(forbiddenResponse.status).toBe(403);
  });

  test('reset operational data is OWNER-only and returns success from the reset service', async () => {
    const groomerUsername = `groomer-reset-${Date.now()}`;
    const groomerId = await createStaffUser({
      username: groomerUsername,
      password: 'groomer-pass',
      displayName: 'Groomer',
      roleCode: 'GROOMER',
    });
    const frontDeskUsername = `frontdesk-reset-${Date.now()}`;
    const frontDeskId = await createStaffUser({
      username: frontDeskUsername,
      password: 'frontdesk-pass',
      displayName: 'Front Desk',
      roleCode: 'FRONT_DESK',
    });
    const resetSpy = jest.spyOn(shopSettingsService, 'resetOperationalData').mockResolvedValue({
      reset: true,
      message: '測試／營運資料已清除。',
    });

    const { agent: ownerAgent } = await loginAsOwner();
    const ownerResponse = await ownerAgent.post('/api/shop-settings/reset-operational-data').send({
      table: 'staff',
      database: 'other_database',
      environment: 'production',
      reset_scope: 'everything',
    });
    expect(ownerResponse.status).toBe(200);
    expect(ownerResponse.body).toEqual({
      success: true,
      data: { reset: true, message: '測試／營運資料已清除。' },
    });
    expect(resetSpy).toHaveBeenCalledTimes(1);

    const frontDeskAgent = request.agent(app);
    await frontDeskAgent.post('/api/auth/login').send({ username: frontDeskUsername, password: 'frontdesk-pass' });
    expect((await frontDeskAgent.post('/api/shop-settings/reset-operational-data')).status).toBe(403);

    const groomerAgent = request.agent(app);
    await groomerAgent.post('/api/auth/login').send({ username: groomerUsername, password: 'groomer-pass' });
    expect((await groomerAgent.post('/api/shop-settings/reset-operational-data')).status).toBe(403);

    expect(frontDeskId).toBeTruthy();
    expect(groomerId).toBeTruthy();
  });

  test('reset operational data failure returns no success response', async () => {
    jest.spyOn(shopSettingsService, 'resetOperationalData').mockRejectedValue(new Error('database failure'));
    const { agent } = await loginAsOwner();

    const response = await agent.post('/api/shop-settings/reset-operational-data');

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toBe('Internal server error');
  });

  test('shop identity is readable by authenticated non-owner staff without exposing settings management access', async () => {
    const uniqueUsername = `identity-frontdesk-${Date.now()}`;
    await createStaffUser({
      username: uniqueUsername,
      password: 'frontdesk-pass',
      displayName: 'Front Desk',
      roleCode: 'FRONT_DESK',
    });
    const frontDeskAgent = request.agent(app);
    expect((await frontDeskAgent.post('/api/auth/login').send({ username: uniqueUsername, password: 'frontdesk-pass' })).status).toBe(200);

    const identityResponse = await frontDeskAgent.get('/api/shop-identity');
    expect(identityResponse.status).toBe(200);
    expect(identityResponse.body.data.shop.name).toBeTruthy();
    expect(identityResponse.body.data.shop.phone).toBeUndefined();
    expect((await frontDeskAgent.get('/api/shop-settings')).status).toBe(403);
  });
});
