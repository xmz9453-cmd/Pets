const request = require('supertest');
const fs = require('fs');
const os = require('os');
const path = require('path');
const groomingPhotoStorageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pets-grooming-photo-test-'));
process.env.GROOMING_PHOTO_STORAGE_ROOT = groomingPhotoStorageRoot;

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

async function createAppointment(agent, payload) {
  return agent.post('/api/appointments').send(payload);
}

async function ensureDailyOperationExists(appointmentId) {
  const [existing] = await getPool().query(
    'SELECT id FROM daily_operations WHERE appointment_id = ? LIMIT 1',
    [appointmentId]
  );
  if (!existing || existing.length === 0) {
    await getPool().query(
      'INSERT INTO daily_operations (appointment_id, status) VALUES (?, ?)',
      [appointmentId, 'SCHEDULED']
    );
  }
  const [rows] = await getPool().query(
    'SELECT id FROM daily_operations WHERE appointment_id = ? LIMIT 1',
    [appointmentId]
  );
  return rows[0].id;
}

describe('Grooming API', () => {
  beforeAll(async () => {
    await setup();
    await getPool().query('DELETE FROM auth_sessions');
  });

  beforeEach(async () => {
    await getPool().query('DELETE FROM auth_sessions');
    await getPool().query('DELETE FROM customer_member_sessions');
    await getPool().query('DELETE FROM customer_member_customers');
    await getPool().query('DELETE FROM customer_members');
    await getPool().query('DELETE FROM grooming_photos');
    await getPool().query('DELETE FROM groomings');
    await getPool().query('DELETE FROM boardings');
    await getPool().query('DELETE FROM daily_operations');
    await getPool().query('DELETE FROM appointment_pet_services');
    await getPool().query('DELETE FROM appointment_pets');
    await getPool().query('DELETE FROM payments');
    await getPool().query('DELETE FROM order_items');
    await getPool().query('DELETE FROM orders');
    await getPool().query('DELETE FROM appointments');
    await getPool().query('DELETE FROM pet_customer_relationships');
    await getPool().query('DELETE FROM pets');
    await getPool().query('DELETE FROM customers');
  });

  afterAll(async () => {
    await closePool();
    fs.rmSync(groomingPhotoStorageRoot, { recursive: true, force: true });
  });

  test('POST and PATCH /api/groomings save grooming execution data and prevent duplicates for the same pet', async () => {
    const { agent } = await loginAsOwner();

    const customer = await createCustomer(agent, {
      name: 'Grooming Client',
      phone: '0912-555-777',
    });
    const customerId = customer.body.data.customer.id;

    const pet = await createPet(agent, {
      name: 'Spark',
      species: 'DOG',
      gender: 'MALE',
      customer_id: customerId,
    });
    const petId = pet.body.data.pet.id;

    const [serviceIdRow] = await getPool().query('SELECT id FROM services WHERE type = ? LIMIT 1', ['GROOMING']);
    const serviceId = serviceIdRow[0].id;

    const today = new Date().toISOString().split('T')[0];
    const appointment = await createAppointment(agent, {
      customer_id: customerId,
      appointment_date: today,
      appointment_time: '10:00:00',
      pets: [{ pet_id: petId, service_ids: [serviceId] }],
    });

    const dailyOperationId = await ensureDailyOperationExists(appointment.body.data.appointment.id);

    expect((await agent.post(`/api/operations/${dailyOperationId}/check-in`)).status).toBe(200);

    const createResponse = await agent.post('/api/groomings').send({
      daily_operation_id: dailyOperationId,
      pet_id: petId,
      before_condition: '耳朵有少量污垢，毛量適中',
      actual_grooming_content: '洗澡、吹乾、修剪腳掌與面部輪廓',
      grooming_result: '毛髮乾淨且整體輪廓清晰',
      note: '客人關注耳部清潔，已提醒後續再檢查。',
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data.before_condition).toContain('耳朵');
    expect(createResponse.body.data.grooming_result).toContain('毛髮乾淨');

    const duplicateResponse = await agent.post('/api/groomings').send({
      daily_operation_id: dailyOperationId,
      pet_id: petId,
      before_condition: '重複建立',
    });
    expect(duplicateResponse.status).toBe(409);

    const updateResponse = await agent.patch(`/api/groomings/${createResponse.body.data.id}`).send({
      daily_operation_id: dailyOperationId,
      pet_id: petId,
      before_condition: '耳朵已清潔，毛量適中',
      note: '已完成耳部清潔與修剪。',
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.success).toBe(true);
    expect(updateResponse.body.data.note).toContain('已完成耳部清潔');

    const photoBytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
    const upload = await agent.post(`/api/groomings/${createResponse.body.data.id}/photos`)
      .field('category', 'AFTER')
      .attach('file', photoBytes, { filename: 'after.png', contentType: 'image/png' });
    expect(upload.status).toBe(201);
    expect(upload.body.data.photo).toMatchObject({ category: 'AFTER', file_size: photoBytes.length });

    const photoResponse = await agent.get(upload.body.data.photo.image_url);
    expect(photoResponse.status).toBe(200);
    expect(photoResponse.headers['content-type']).toContain('image/png');
    expect(photoResponse.headers['x-content-type-options']).toBe('nosniff');
    expect(photoResponse.body).toEqual(photoBytes);

    const invalidCategory = await agent.post(`/api/groomings/${createResponse.body.data.id}/photos`)
      .field('category', 'OTHER')
      .attach('file', photoBytes, { filename: 'invalid.png', contentType: 'image/png' });
    expect(invalidCategory.status).toBe(400);

    const unauthorized = await request(app)
      .get(`/api/groomings/${createResponse.body.data.id}/photos/${upload.body.data.photo.id}/image`);
    expect(unauthorized.status).toBe(401);

    const removal = await agent.delete(`/api/groomings/${createResponse.body.data.id}/photos/${upload.body.data.photo.id}`);
    expect(removal.status).toBe(200);
    expect((await agent.get(upload.body.data.photo.image_url)).status).toBe(404);
  });

  test('limits each pet grooming record to five image uploads', async () => {
    const { agent } = await loginAsOwner();
    const customer = await createCustomer(agent, { name: 'Photo Limit Client', phone: '0912-555-779' });
    const pet = await createPet(agent, { name: 'Photo Limit Pet', species: 'DOG', gender: 'MALE', customer_id: customer.body.data.customer.id });
    const [serviceRows] = await getPool().query('SELECT id FROM services WHERE type = ? LIMIT 1', ['GROOMING']);
    const appointment = await createAppointment(agent, {
      customer_id: customer.body.data.customer.id,
      appointment_date: new Date().toISOString().slice(0, 10),
      appointment_time: '12:00:00',
      pets: [{ pet_id: pet.body.data.pet.id, service_ids: [serviceRows[0].id] }],
    });
    const dailyOperationId = await ensureDailyOperationExists(appointment.body.data.appointment.id);
    await agent.post(`/api/operations/${dailyOperationId}/check-in`);
    const grooming = await agent.post('/api/groomings').send({
      daily_operation_id: dailyOperationId,
      pet_id: pet.body.data.pet.id,
    });
    const photoBytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]);
    for (let index = 0; index < 5; index += 1) {
      const upload = await agent.post(`/api/groomings/${grooming.body.data.id}/photos`)
        .field('category', index % 2 ? 'AFTER' : 'BEFORE')
        .attach('file', photoBytes, { filename: `photo-${index}.png`, contentType: 'image/png' });
      expect(upload.status).toBe(201);
    }
    const rejected = await agent.post(`/api/groomings/${grooming.body.data.id}/photos`)
      .field('category', 'CONCERN')
      .attach('file', photoBytes, { filename: 'sixth.png', contentType: 'image/png' });
    expect(rejected.status).toBe(409);
    expect(rejected.body.error.code).toBe('GROOMING_PHOTO_LIMIT_REACHED');
  });

  test('members can view only their completed grooming history and photos', async () => {
    const { agent } = await loginAsOwner();
    const customer = await createCustomer(agent, { name: 'Completed History Client', phone: '0912-555-780' });
    const pet = await createPet(agent, { name: 'History Pet', species: 'DOG', gender: 'FEMALE', customer_id: customer.body.data.customer.id });
    const [serviceRows] = await getPool().query('SELECT id FROM services WHERE type = ? LIMIT 1', ['GROOMING']);
    const appointment = await createAppointment(agent, {
      customer_id: customer.body.data.customer.id,
      appointment_date: new Date().toISOString().slice(0, 10),
      appointment_time: '13:00:00',
      pets: [{ pet_id: pet.body.data.pet.id, service_ids: [serviceRows[0].id] }],
    });
    const dailyOperationId = await ensureDailyOperationExists(appointment.body.data.appointment.id);
    await agent.post(`/api/operations/${dailyOperationId}/check-in`);
    const grooming = await agent.post('/api/groomings').send({
      daily_operation_id: dailyOperationId,
      pet_id: pet.body.data.pet.id,
      grooming_result: '完成美容',
    });
    const imageBytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 2]);
    const photo = await agent.post(`/api/groomings/${grooming.body.data.id}/photos`)
      .field('category', 'AFTER')
      .attach('file', imageBytes, { filename: 'completed.png', contentType: 'image/png' });

    const memberRows = await getPool().query(
      'INSERT INTO customer_members (display_name) VALUES (?)',
      ['History Member'],
    );
    const memberId = memberRows[0].insertId;
    await getPool().query(
      'INSERT INTO customer_member_customers (shop_id, customer_member_id, customer_id) VALUES (?, ?, ?)',
      [1, memberId, customer.body.data.customer.id],
    );
    const { createSessionToken, hashSessionToken } = require('../../backend/src/utils/session-token');
    const memberToken = createSessionToken();
    await getPool().query(
      `INSERT INTO customer_member_sessions
         (shop_id, customer_member_id, token_hash, authenticated_at, expires_at)
       VALUES (?, ?, ?, UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 DAY))`,
      [1, memberId, hashSessionToken(memberToken)],
    );

    const member = request(app);
    const memberOptions = (pathValue) => member.get(pathValue)
      .set('X-Shop-Id', '1')
      .set('Cookie', `customer_member_session=${memberToken}`);
    const beforeComplete = await memberOptions('/api/public/member/grooming-records');
    expect(beforeComplete.status).toBe(200);
    expect(beforeComplete.body.data.records).toHaveLength(0);

    await agent.post(`/api/operations/${dailyOperationId}/complete-work`);
    const history = await memberOptions('/api/public/member/grooming-records');
    expect(history.status).toBe(200);
    expect(history.body.data.records).toHaveLength(1);
    expect(history.body.data.records[0]).toMatchObject({
      appointment_id: appointment.body.data.appointment.id,
      pet_name: 'History Pet',
      grooming_result: '完成美容',
    });
    expect(history.body.data.records[0].photos[0].category).toBe('AFTER');

    const photoResponse = await memberOptions(history.body.data.records[0].photos[0].image_url);
    expect(photoResponse.status).toBe(200);
    expect(photoResponse.body).toEqual(imageBytes);

    const anotherMember = await getPool().query('INSERT INTO customer_members (display_name) VALUES (?)', ['Other Member']);
    const otherToken = createSessionToken();
    await getPool().query(
      `INSERT INTO customer_member_sessions
         (shop_id, customer_member_id, token_hash, authenticated_at, expires_at)
       VALUES (?, ?, ?, UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 DAY))`,
      [1, anotherMember[0].insertId, hashSessionToken(otherToken)],
    );
    const deniedPhoto = await request(app)
      .get(history.body.data.records[0].photos[0].image_url)
      .set('X-Shop-Id', '1')
      .set('Cookie', `customer_member_session=${otherToken}`);
    expect(deniedPhoto.status).toBe(404);
  });

  test('allows grooming execution during active work and notes to be added after completion', async () => {
    const { agent } = await loginAsOwner();
    const customer = await createCustomer(agent, { name: 'Grooming Lifecycle Client', phone: '0912-555-778' });
    const customerId = customer.body.data.customer.id;
    const pets = [];
    for (const name of ['Checked In Pet', 'In Progress Pet', 'Completed Operation Pet']) {
      const pet = await createPet(agent, { name, species: 'DOG', gender: 'MALE', customer_id: customerId });
      pets.push(pet.body.data.pet.id);
    }

    const [serviceRows] = await getPool().query('SELECT id FROM services WHERE type = ? LIMIT 1', ['GROOMING']);
    const appointment = await createAppointment(agent, {
      customer_id: customerId,
      appointment_date: new Date().toISOString().split('T')[0],
      appointment_time: '11:00:00',
      pets: pets.map((petId) => ({ pet_id: petId, service_ids: [serviceRows[0].id] })),
    });
    const dailyOperationId = await ensureDailyOperationExists(appointment.body.data.appointment.id);

    expect((await agent.post(`/api/operations/${dailyOperationId}/check-in`)).status).toBe(200);
    const checkedInGrooming = await agent.post('/api/groomings').send({ daily_operation_id: dailyOperationId, pet_id: pets[0] });
    expect(checkedInGrooming.status).toBe(201);

    expect((await agent.post(`/api/operations/${dailyOperationId}/start-work`)).status).toBe(200);
    const inProgressGrooming = await agent.post('/api/groomings').send({ daily_operation_id: dailyOperationId, pet_id: pets[1] });
    expect(inProgressGrooming.status).toBe(201);

    expect((await agent.post(`/api/groomings/${checkedInGrooming.body.data.id}/complete`)).status).toBe(200);

    const blocked = await agent.post('/api/groomings').send({ daily_operation_id: dailyOperationId, pet_id: pets[2] });
    expect(blocked.status).toBe(201);
    expect(blocked.body.data.before_condition).toBeNull();
    const lateNotes = await agent.patch(`/api/groomings/${blocked.body.data.id}`).send({
      before_condition: '美容前狀況',
      actual_grooming_content: '實際美容內容',
      grooming_result: '美容後結果',
      note: '客人離店後補登',
    });
    expect(lateNotes.status).toBe(200);
    expect(lateNotes.body.data.note).toBe('客人離店後補登');
  });
});
