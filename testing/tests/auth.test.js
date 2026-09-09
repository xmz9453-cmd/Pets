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
const { hashPassword } = require('../../backend/src/utils/password');

const owner = getFoundationOwner();
const createdStaffIds = [];

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

async function createRoleStaff(roleCode) {
  const username = `status-${roleCode.toLowerCase()}-${Date.now()}-${createdStaffIds.length}`;
  const [staffResult] = await getPool().query(
    'INSERT INTO staff (username, password_hash, display_name, status) VALUES (?, ?, ?, \'ACTIVE\')',
    [username, await hashPassword('status-pass-123'), username],
  );
  const [roleRows] = await getPool().query('SELECT id FROM roles WHERE code = ?', [roleCode]);
  await getPool().query('INSERT INTO staff_roles (staff_id, role_id) VALUES (?, ?)', [staffResult.insertId, roleRows[0].id]);
  createdStaffIds.push(staffResult.insertId);
  return { id: staffResult.insertId, username, password: 'status-pass-123' };
}

describe('Staff authentication API', () => {
  beforeAll(async () => {
    await setup();
    await getPool().query('DELETE FROM auth_sessions');
    await setOwnerStatus('ACTIVE');
  });

  afterEach(async () => {
    await getPool().query('DELETE FROM auth_sessions');
    if (createdStaffIds.length) {
      await getPool().query('DELETE FROM staff_roles WHERE staff_id IN (?)', [createdStaffIds]);
      await getPool().query('DELETE FROM staff WHERE id IN (?)', [createdStaffIds]);
      createdStaffIds.length = 0;
    }
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
    expect(response.body.error.message).toBe('此帳號已停用，無法登入，請聯絡管理者。');
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

  test('OWNER can deactivate and reactivate another staff account', async () => {
    const target = await createRoleStaff('GROOMER');
    const { agent } = await loginAgent();

    const deactivate = await agent.patch(`/api/auth/staff/${target.id}/status`).send({ status: 'inactive' });
    expect(deactivate.status).toBe(200);
    expect(deactivate.body.data.staff).toMatchObject({ id: target.id, status: 'inactive', roles: ['GROOMER'] });

    const targetAgent = request.agent(app);
    expect((await targetAgent.post('/api/auth/login').send({ username: target.username, password: target.password })).status).toBe(401);

    const reactivate = await agent.patch(`/api/auth/staff/${target.id}/status`).send({ status: 'active' });
    expect(reactivate.status).toBe(200);
    expect(reactivate.body.data.staff.status).toBe('active');
    expect((await targetAgent.post('/api/auth/login').send({ username: target.username, password: target.password })).status).toBe(200);
  });

  test('status endpoint rejects non-OWNER, self-deactivation, last OWNER, invalid and missing targets', async () => {
    const frontDesk = await createRoleStaff('FRONT_DESK');
    const frontDeskAgent = request.agent(app);
    await frontDeskAgent.post('/api/auth/login').send({ username: frontDesk.username, password: frontDesk.password });
    expect((await frontDeskAgent.patch('/api/auth/staff/1/status').send({ status: 'inactive' })).status).toBe(403);

    const { agent } = await loginAgent();
    const [ownerRows] = await getPool().query('SELECT id FROM staff WHERE username = ?', [owner.username]);
    expect((await agent.patch(`/api/auth/staff/${ownerRows[0].id}/status`).send({ status: 'inactive' })).status).toBe(403);
    expect((await agent.patch(`/api/auth/staff/${frontDesk.id}/status`).send({ status: 'paused' })).status).toBe(400);
    expect((await agent.patch('/api/auth/staff/999999/status').send({ status: 'inactive' })).status).toBe(404);
    expect((await agent.patch(`/api/auth/staff/${ownerRows[0].id}/status`).send({ status: 'active' })).status).toBe(200);
  });

  test('duplicate status operations are safe and inactive staff cannot use authenticated APIs', async () => {
    const target = await createRoleStaff('GROOMER');
    const { agent } = await loginAgent();
    expect((await agent.patch(`/api/auth/staff/${target.id}/status`).send({ status: 'inactive' })).status).toBe(200);
    const duplicate = await agent.patch(`/api/auth/staff/${target.id}/status`).send({ status: 'inactive' });
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.data.staff.status).toBe('inactive');

    const targetAgent = request.agent(app);
    const loginResponse = await targetAgent.post('/api/auth/login').send({ username: target.username, password: target.password });
    expect(loginResponse.status).toBe(401);
    expect((await targetAgent.get('/api/auth/me')).status).toBe(401);
  });

  test('active FRONT_DESK and GROOMER accounts can still login', async () => {
    const frontDesk = await createRoleStaff('FRONT_DESK');
    const groomer = await createRoleStaff('GROOMER');
    const frontDeskLogin = await request(app).post('/api/auth/login').send({ username: frontDesk.username, password: frontDesk.password });
    const groomerLogin = await request(app).post('/api/auth/login').send({ username: groomer.username, password: groomer.password });
    expect(frontDeskLogin.status).toBe(200);
    expect(groomerLogin.status).toBe(200);
  });

  test('staff can change their own password with current-password validation', async () => {
    const target = await createRoleStaff('GROOMER');
    const targetAgent = request.agent(app);
    await targetAgent.post('/api/auth/login').send({ username: target.username, password: target.password });

    const invalid = await targetAgent.post('/api/auth/password').send({
      current_password: 'wrong-password',
      new_password: 'new-pass-123',
      confirm_password: 'new-pass-123',
    });
    expect(invalid.status).toBe(401);
    expect(invalid.body.error.message).toBe('目前密碼錯誤');

    const changed = await targetAgent.post('/api/auth/password').send({
      current_password: target.password,
      new_password: 'new-pass-123',
      confirm_password: 'new-pass-123',
    });
    expect(changed.status).toBe(200);
    expect(changed.body.data).toEqual({ message: '密碼已更新' });
    expect(JSON.stringify(changed.body)).not.toContain('password_hash');
    expect((await request(app).post('/api/auth/login').send({ username: target.username, password: 'new-pass-123' })).status).toBe(200);
  });

  test('OWNER can reset another inactive account, but other roles cannot', async () => {
    const target = await createRoleStaff('GROOMER');
    const frontDesk = await createRoleStaff('FRONT_DESK');
    const { agent: ownerAgent } = await loginAgent();
    await ownerAgent.patch(`/api/auth/staff/${target.id}/status`).send({ status: 'inactive' });

    const reset = await ownerAgent.post(`/api/auth/staff/${target.id}/password`).send({
      new_password: 'reset-pass-123',
      confirm_password: 'reset-pass-123',
    });
    expect(reset.status).toBe(200);
    expect(reset.body.data).toEqual({ message: '密碼已重設' });
    expect((await request(app).post('/api/auth/login').send({ username: target.username, password: 'reset-pass-123' })).status).toBe(401);

    const frontDeskAgent = request.agent(app);
    await frontDeskAgent.post('/api/auth/login').send({ username: frontDesk.username, password: frontDesk.password });
    expect((await frontDeskAgent.post(`/api/auth/staff/${target.id}/password`).send({ new_password: 'blocked-123', confirm_password: 'blocked-123' })).status).toBe(403);
  });
});
