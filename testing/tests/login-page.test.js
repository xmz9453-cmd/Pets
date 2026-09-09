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
const { validateLoginForm, formatLoginError } = require('../../frontend/utils/login-form');
const { getRoleLabel } = require('../../frontend/utils/staff-display');

const owner = getFoundationOwner();

async function loginAgent(password = owner.password) {
  const agent = request.agent(app);
  const response = await agent
    .post('/api/auth/login')
    .send({ username: owner.username, password });

  return { agent, response };
}

describe('Login page validation and authentication flow', () => {
  beforeAll(async () => {
    await setup();
    await getPool().query('DELETE FROM auth_sessions');
  });

  afterEach(async () => {
    await getPool().query('DELETE FROM auth_sessions');
  });

  afterAll(async () => {
    await closePool();
  });

  test('validateLoginForm enforces required username and password messages in Traditional Chinese', () => {
    const result = validateLoginForm({ username: '', password: '' });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual({
      username: '使用者名稱為必填',
      password: '密碼為必填',
    });
  });

  test('formatLoginError converts backend auth failures into the required UI message', () => {
    expect(formatLoginError('Invalid username or password')).toBe('帳號或密碼錯誤');
    expect(formatLoginError('Unauthorized')).toBe('尚未登入或登入狀態已失效');
    expect(formatLoginError('此帳號已停用，無法登入，請聯絡管理者。')).toBe('此帳號已停用，無法登入，請聯絡管理者。');
  });

  test('account management displays the frozen role labels and preserves unknown roles', () => {
    expect(getRoleLabel('OWNER')).toBe('管理者');
    expect(getRoleLabel('FRONT_DESK')).toBe('櫃台');
    expect(getRoleLabel('GROOMER')).toBe('美容師');
    expect(getRoleLabel('CUSTOM_ROLE')).toBe('CUSTOM_ROLE');
  });

  test('POST /api/auth/login fails for invalid credentials and succeeds for valid credentials', async () => {
    const invalidResponse = await request(app)
      .post('/api/auth/login')
      .send({ username: owner.username, password: 'wrong-password' });

    expect(invalidResponse.status).toBe(401);
    expect(invalidResponse.body.error.message).toBe('Invalid username or password');

    const validResponse = await loginAgent();
    expect(validResponse.response.status).toBe(200);
    expect(validResponse.response.headers['set-cookie']).toBeDefined();
    expect(validResponse.response.body.success).toBe(true);
  });
});
