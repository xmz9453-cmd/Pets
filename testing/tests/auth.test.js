const fs = require('fs');
const path = require('path');
const request = require('supertest');

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
const { getPool, closePool } = require('../../backend/src/config/database');
const { setup } = require('../../database/scripts/setup');
const { getFoundationOwner } = require('../../database/seeds/staff-authentication-seed');
const { hashSessionToken, createSessionToken } = require('../../backend/src/utils/session-token');

const owner = getFoundationOwner();

async function setOwnerStatus(status) {
  await getPool().query('UPDATE staff SET status = ? WHERE username = ?', [status, owner.username]);
}

async function loginAgent(password = owner.password) {
  const agent = request.agent(app);
  const response = await agent
    .post('/api/auth/login')
    .send({ username: owner.username, password });

  return { agent, response };
}

describe('Staff authentication API', () => {
  beforeAll(async () => {
    await setup();
    await getPool().query('DELETE FROM auth_sessions');
    await setOwnerStatus('ACTIVE');
  });

  afterEach(async () => {
    await getPool().query('DELETE FROM auth_sessions');
    await setOwnerStatus('ACTIVE');
  });

  afterAll(async () => {
    await closePool();
  });

  test('POST /api/auth/login returns staff context and creates a session cookie', async () => {
    const { response } = await loginAgent();

    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']).toBeDefined();
    expect(response.body.success).toBe(true);
    expect(response.body.data.staff).toMatchObject({
      username: owner.username,
      display_name: owner.displayName,
      status: 'ACTIVE',
      roles: ['OWNER'],
    });
    expect(response.body.data.staff.password).toBeUndefined();
    expect(response.body.data.staff.password_hash).toBeUndefined();

    const [rows] = await getPool().query('SELECT id FROM auth_sessions');
    expect(rows).toHaveLength(1);
  });

  test('POST /api/auth/login rejects wrong password with a uniform message', async () => {
    const { response } = await loginAgent('wrong-password');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      error: {
        message: 'Invalid username or password',
      },
    });
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  test('POST /api/auth/login rejects unknown username with the same message', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'unknown-staff', password: owner.password });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('Invalid username or password');
  });

  test('POST /api/auth/login rejects inactive staff', async () => {
    await setOwnerStatus('INACTIVE');

    const { response } = await loginAgent();

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('Invalid username or password');
    const [rows] = await getPool().query('SELECT id FROM auth_sessions');
    expect(rows).toHaveLength(0);
  });

  test('GET /api/auth/me returns the authenticated staff without sensitive fields', async () => {
    const { agent } = await loginAgent();

    const response = await agent.get('/api/auth/me');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.staff).toMatchObject({
      username: owner.username,
      status: 'ACTIVE',
      roles: ['OWNER'],
    });
    expect(response.body.data.staff.password).toBeUndefined();
    expect(response.body.data.staff.password_hash).toBeUndefined();
  });

  test('GET /api/auth/me rejects missing and invalid sessions', async () => {
    const missingResponse = await request(app).get('/api/auth/me');
    expect(missingResponse.status).toBe(401);
    expect(missingResponse.body.error.message).toBe('Unauthorized');

    const invalidResponse = await request(app)
      .get('/api/auth/me')
      .set('Cookie', ['psop_session=invalid-token']);
    expect(invalidResponse.status).toBe(401);
  });

  test('GET /api/auth/me rejects expired sessions', async () => {
    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    const [staffRows] = await getPool().query('SELECT id FROM staff WHERE username = ? LIMIT 1', [owner.username]);
    await getPool().query(
      'INSERT INTO auth_sessions (staff_id, token_hash, expires_at) VALUES (?, ?, DATE_SUB(NOW(), INTERVAL 1 DAY))',
      [staffRows[0].id, tokenHash],
    );

    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`psop_session=${token}`]);

    expect(response.status).toBe(401);
  });

  test('GET /api/auth/me rejects sessions for inactive staff', async () => {
    const { agent } = await loginAgent();
    await setOwnerStatus('INACTIVE');

    const response = await agent.get('/api/auth/me');

    expect(response.status).toBe(401);
  });

  test('POST /api/auth/logout invalidates the current session', async () => {
    const { agent } = await loginAgent();

    const logoutResponse = await agent.post('/api/auth/logout');
    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body).toEqual({
      success: true,
      data: {
        logged_out: true,
      },
    });

    const meResponse = await agent.get('/api/auth/me');
    expect(meResponse.status).toBe(401);
  });
});
