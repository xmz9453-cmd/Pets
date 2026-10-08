const request = require('supertest');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  });
}
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'psop_test';

const app = require('../../backend/src/app');
const { setup } = require('../../database/scripts/setup');
const { getPool, closePool } = require('../../backend/src/config/database');
const { getFoundationOwner } = require('../../database/seeds/staff-authentication-seed');
const { hashPassword } = require('../../backend/src/utils/password');

const owner = getFoundationOwner();
let sequence = 0;

async function login(username = owner.username, password = owner.password) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ username, password });
  return agent;
}

async function createRoleAgent(roleCode) {
  sequence += 1;
  const username = `booking-schedule-${roleCode.toLowerCase()}-${Date.now()}-${sequence}`;
  const password = 'booking-schedule-test-password';
  const [staffResult] = await getPool().query(
    'INSERT INTO staff (username, password_hash, display_name, status) VALUES (?, ?, ?, \'ACTIVE\')',
    [username, await hashPassword(password), username],
  );
  const [roles] = await getPool().query('SELECT id FROM roles WHERE code = ?', [roleCode]);
  await getPool().query('INSERT INTO staff_roles (staff_id, role_id) VALUES (?, ?)', [staffResult.insertId, roles[0].id]);
  return login(username, password);
}

describe('Booking schedule settings API', () => {
  beforeAll(async () => {
    await setup();
  });

  beforeEach(async () => {
    await getPool().query('DELETE FROM booking_schedule_overrides');
    await getPool().query('DELETE FROM booking_schedule_rules');
    await getPool().query('DELETE FROM auth_sessions');
  });

  afterEach(async () => {
    await getPool().query('DELETE FROM booking_schedule_overrides');
    await getPool().query('DELETE FROM booking_schedule_rules');
    await getPool().query('DELETE FROM auth_sessions');
  });

  afterAll(async () => {
    await closePool();
  });

  test('OWNER can read rules and overrides', async () => {
    const response = await (await login()).get('/api/shop-settings/booking-schedule');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ rules: [], overrides: [] });
  });

  test('OWNER can create CAT and DOG rules at the same time and CLOSED rules without capacity', async () => {
    const agent = await login();
    const cat = await agent.post('/api/shop-settings/booking-schedule/rules').send({
      species: 'CAT', start_time: '10:30', is_closed: false, capacity: 2,
    });
    const dog = await agent.post('/api/shop-settings/booking-schedule/rules').send({
      species: 'DOG', start_time: '10:30:00', is_closed: false, capacity: 3,
    });
    const closed = await agent.post('/api/shop-settings/booking-schedule/rules').send({
      species: 'CAT', start_time: '12:00', is_closed: true, capacity: null,
    });

    expect(cat.status).toBe(201);
    expect(cat.body.data.rule).toMatchObject({ species: 'CAT', start_time: '10:30:00', capacity: 2, is_closed: false });
    expect(dog.status).toBe(201);
    expect(dog.body.data.rule).toMatchObject({ species: 'DOG', start_time: '10:30:00', capacity: 3 });
    expect(closed.status).toBe(201);
    expect(closed.body.data.rule).toMatchObject({ species: 'CAT', start_time: '12:00:00', capacity: null, is_closed: true });
  });

  test('rejects duplicate species start times and invalid rule values', async () => {
    const agent = await login();
    await agent.post('/api/shop-settings/booking-schedule/rules').send({
      species: 'CAT', start_time: '10:30', is_closed: false, capacity: 1,
    });

    const duplicate = await agent.post('/api/shop-settings/booking-schedule/rules').send({
      species: 'CAT', start_time: '10:30:00', is_closed: false, capacity: 2,
    });
    const missingCapacity = await agent.post('/api/shop-settings/booking-schedule/rules').send({
      species: 'DOG', start_time: '11:00', is_closed: false,
    });
    const closedWithCapacity = await agent.post('/api/shop-settings/booking-schedule/rules').send({
      species: 'DOG', start_time: '12:00', is_closed: true, capacity: 2,
    });
    const invalidSpecies = await agent.post('/api/shop-settings/booking-schedule/rules').send({
      species: 'BOTH', start_time: '12:00', is_closed: false, capacity: 2,
    });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('BOOKING_SCHEDULE_DUPLICATE');
    expect(missingCapacity.status).toBe(400);
    expect(missingCapacity.body.error.fields.capacity).toBeDefined();
    expect(closedWithCapacity.status).toBe(400);
    expect(invalidSpecies.status).toBe(400);
  });

  test('OWNER can create all-day and specific-time overrides and duplicate overrides are rejected', async () => {
    const agent = await login();
    const allDay = await agent.post('/api/shop-settings/booking-schedule/overrides').send({
      override_date: '2026-10-10', species: 'CAT', start_time: null, is_closed: true, capacity: null,
    });
    const specific = await agent.post('/api/shop-settings/booking-schedule/overrides').send({
      override_date: '2026-10-10', species: 'DOG', start_time: '14:00', is_closed: false, capacity: 2,
    });
    const midnight = await agent.post('/api/shop-settings/booking-schedule/overrides').send({
      override_date: '2026-10-10', species: 'CAT', start_time: '00:00', is_closed: true, capacity: null,
    });
    const duplicate = await agent.post('/api/shop-settings/booking-schedule/overrides').send({
      override_date: '2026-10-10', species: 'CAT', start_time: null, is_closed: true, capacity: null,
    });
    const duplicateSpecific = await agent.post('/api/shop-settings/booking-schedule/overrides').send({
      override_date: '2026-10-10', species: 'DOG', start_time: '14:00:00', is_closed: false, capacity: 3,
    });

    expect(allDay.status).toBe(201);
    expect(allDay.body.data.override).toMatchObject({ override_date: '2026-10-10', species: 'CAT', start_time: null, is_closed: true, capacity: null });
    expect(specific.status).toBe(201);
    expect(specific.body.data.override).toMatchObject({ species: 'DOG', start_time: '14:00:00', is_closed: false, capacity: 2 });
    expect(midnight.status).toBe(201);
    expect(duplicate.status).toBe(409);
    expect(duplicateSpecific.status).toBe(409);
  });

  test('rejects invalid dates and contradictory overrides', async () => {
    const agent = await login();
    const invalidDate = await agent.post('/api/shop-settings/booking-schedule/overrides').send({
      override_date: '2026-02-30', species: 'CAT', start_time: null, is_closed: true, capacity: null,
    });
    const allDayCapacity = await agent.post('/api/shop-settings/booking-schedule/overrides').send({
      override_date: '2026-10-10', species: 'CAT', start_time: null, is_closed: true, capacity: 2,
    });
    const openAllDay = await agent.post('/api/shop-settings/booking-schedule/overrides').send({
      override_date: '2026-10-10', species: 'CAT', start_time: null, is_closed: false, capacity: 2,
    });

    expect(invalidDate.status).toBe(400);
    expect(invalidDate.body.error.fields.override_date).toBeDefined();
    expect(allDayCapacity.status).toBe(400);
    expect(openAllDay.status).toBe(400);
  });

  test('OWNER can update and delete weekly rules and date overrides', async () => {
    const agent = await login();
    const ruleResponse = await agent.post('/api/shop-settings/booking-schedule/rules').send({
      species: 'CAT', start_time: '10:30', is_closed: false, capacity: 1,
    });
    const ruleId = ruleResponse.body.data.rule.id;
    const ruleUpdate = await agent.put(`/api/shop-settings/booking-schedule/rules/${ruleId}`).send({
      capacity: 4,
    });
    expect(ruleUpdate.status).toBe(200);
    expect(ruleUpdate.body.data.rule).toMatchObject({ start_time: '10:30:00', capacity: 4 });
    expect((await agent.delete(`/api/shop-settings/booking-schedule/rules/${ruleId}`)).status).toBe(200);

    const overrideResponse = await agent.post('/api/shop-settings/booking-schedule/overrides').send({
      override_date: '2026-10-10', species: 'DOG', start_time: '14:00', is_closed: true, capacity: null,
    });
    const overrideId = overrideResponse.body.data.override.id;
    const overrideUpdate = await agent.put(`/api/shop-settings/booking-schedule/overrides/${overrideId}`).send({
      capacity: 2, is_closed: false,
    });
    expect(overrideUpdate.status).toBe(200);
    expect(overrideUpdate.body.data.override).toMatchObject({ start_time: '14:00:00', capacity: 2, is_closed: false });
    expect((await agent.delete(`/api/shop-settings/booking-schedule/overrides/${overrideId}`)).status).toBe(200);
  });

  test.each(['FRONT_DESK', 'GROOMER'])('%s cannot write booking rules or overrides', async (roleCode) => {
    const ownerAgent = await login();
    const rule = await ownerAgent.post('/api/shop-settings/booking-schedule/rules').send({
      species: 'CAT', start_time: '10:30', is_closed: false, capacity: 1,
    });
    const override = await ownerAgent.post('/api/shop-settings/booking-schedule/overrides').send({
      override_date: '2026-10-10', species: 'CAT', start_time: null, is_closed: true, capacity: null,
    });
    const agent = await createRoleAgent(roleCode);

    expect((await agent.get('/api/shop-settings/booking-schedule')).status).toBe(403);
    expect((await agent.post('/api/shop-settings/booking-schedule/rules').send({
      species: 'DOG', start_time: '10:30', is_closed: false, capacity: 1,
    })).status).toBe(403);
    expect((await agent.put(`/api/shop-settings/booking-schedule/rules/${rule.body.data.rule.id}`).send({ capacity: 2 })).status).toBe(403);
    expect((await agent.delete(`/api/shop-settings/booking-schedule/rules/${rule.body.data.rule.id}`)).status).toBe(403);
    expect((await agent.post('/api/shop-settings/booking-schedule/overrides').send({
      override_date: '2026-10-11', species: 'DOG', start_time: null, is_closed: true, capacity: null,
    })).status).toBe(403);
    expect((await agent.put(`/api/shop-settings/booking-schedule/overrides/${override.body.data.override.id}`).send({ override_date: '2026-10-11' })).status).toBe(403);
    expect((await agent.delete(`/api/shop-settings/booking-schedule/overrides/${override.body.data.override.id}`)).status).toBe(403);
  });
});
