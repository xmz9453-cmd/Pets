const request = require('supertest');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

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

  if (!['localhost', '127.0.0.1'].includes(process.env.DB_HOST)) {
    throw new Error(`Unsafe test database host "${process.env.DB_HOST}"; expected localhost or 127.0.0.1`);
  }
  if (process.env.DB_NAME !== 'psop_test') {
    throw new Error(`Unsafe test database "${process.env.DB_NAME}"; expected psop_test`);
  }

  process.env.CONTRACT_STORAGE_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'pets-onboarding-test-'));
}

loadLocalEnvForTestDatabase();

const app = require('../../backend/src/app');
const { setup } = require('../../database/scripts/setup');
const { getPool, closePool } = require('../../backend/src/config/database');
const { getFoundationOwner, getFrontDeskStaff } = require('../../database/seeds/staff-authentication-seed');
const contractPdfStorage = require('../../backend/src/utils/contract-pdf-storage');
const dailyOperationsRepository = require('../../backend/src/data/daily-operations.repository');
const { hashPassword } = require('../../backend/src/utils/password');

const owner = getFoundationOwner();
const frontDesk = getFrontDeskStaff();
const pdfBytes = Buffer.from('%PDF-1.7\nOnboarding contract fixture\n%%EOF\n');
const signaturePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pGQAAAAASUVORK5CYII=';
const createdStaffIds = [];

async function loginAs(staff) {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/login').send({
    username: staff.username,
    password: staff.password,
  });
  expect(response.status).toBe(200);
  return agent;
}

async function loginAsOwner() {
  return loginAs(owner);
}

async function createStaffWithRole(roleCode) {
  const username = `onboarding-${roleCode.toLowerCase()}-${Date.now()}`;
  const [staffResult] = await getPool().query(
    `INSERT INTO staff (username, password_hash, display_name, status)
     VALUES (?, ?, ?, 'ACTIVE')`,
    [username, await hashPassword('onboarding-test-password'), username],
  );
  const [roleRows] = await getPool().query('SELECT id FROM roles WHERE code = ? LIMIT 1', [roleCode]);
  await getPool().query('INSERT INTO staff_roles (staff_id, role_id) VALUES (?, ?)', [staffResult.insertId, roleRows[0].id]);
  createdStaffIds.push(staffResult.insertId);
  return { username, password: 'onboarding-test-password' };
}

async function createCurrentContract() {
  const storageKey = contractPdfStorage.createStorageKey();
  const tempPath = await contractPdfStorage.writeTemporaryFile(pdfBytes);
  await contractPdfStorage.moveTemporaryFile(tempPath, storageKey);
  const [result] = await getPool().query(
    `INSERT INTO contract_versions
     (version_label, status, is_current, file_name, mime_type, file_size, storage_path, file_hash)
     VALUES (?, 'PUBLISHED', TRUE, 'onboarding-contract.pdf', 'application/pdf', ?, ?, ?)`,
    [
      `Onboarding-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      pdfBytes.length,
      storageKey,
      crypto.createHash('sha256').update(pdfBytes).digest('hex'),
    ],
  );
  return result.insertId;
}

async function clearData() {
  await getPool().query('DELETE FROM contract_history');
  await getPool().query('DELETE FROM onboardings');
  await getPool().query('DELETE FROM auth_sessions');
  if (createdStaffIds.length) {
    await getPool().query('DELETE FROM staff_roles WHERE staff_id IN (?)', [createdStaffIds]);
    await getPool().query('DELETE FROM staff WHERE id IN (?)', [createdStaffIds]);
    createdStaffIds.length = 0;
  }
  await getPool().query('DELETE FROM payments');
  await getPool().query('DELETE FROM order_items');
  await getPool().query('DELETE FROM orders');
  await getPool().query('DELETE FROM boardings');
  await getPool().query('DELETE FROM groomings');
  await getPool().query('DELETE FROM daily_operations');
  await getPool().query('DELETE FROM appointment_pet_services');
  await getPool().query('DELETE FROM appointment_pets');
  await getPool().query('DELETE FROM appointments');
  await getPool().query('DELETE FROM pet_customer_relationships');
  await getPool().query('DELETE FROM pets');
  await getPool().query('DELETE FROM customers');
  await getPool().query('DELETE FROM contract_versions');
  fs.rmSync(process.env.CONTRACT_STORAGE_ROOT, { recursive: true, force: true });
  fs.mkdirSync(process.env.CONTRACT_STORAGE_ROOT, { recursive: true });
}

async function createOnboarding(agent) {
  const response = await agent.post('/api/onboardings').send({});
  expect(response.status).toBe(201);
  return response.body.data;
}

function onboardingPayload(phone, serviceId) {
  return {
    customer: { name: 'Onboarding Customer', phone },
    pet: {
      name: 'Mochi Onboarding',
      species: 'DOG',
      gender: 'FEMALE',
      weight: '6.2',
      personality: ['親近人'],
      medical_history: ['其他'],
      other_history: '舊傷已痊癒',
    },
    appointment: { appointment_date: '2099-01-01', appointment_time: '10:30', service_id: String(serviceId) },
  };
}

async function resolveNew(agent, token) {
  await agent.post(`/api/public/onboardings/${token}/customer-resolution`).send({ resolution: 'NEW' }).expect(200);
  await agent.post(`/api/public/onboardings/${token}/pet-resolution`).send({ resolution: 'NEW' }).expect(200);
}

async function getServiceId() {
  const [rows] = await getPool().query(
    `SELECT id FROM services
     WHERE status = 'ACTIVE' AND species IN ('DOG', 'BOTH')
     ORDER BY id LIMIT 1`,
  );
  return Number(rows[0].id);
}

describe('Electronic Contract Onboarding API', () => {
  beforeAll(async () => {
    await setup();
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
    await clearData();
    await createCurrentContract();
  });

  afterAll(async () => {
    await clearData();
    await closePool();
  });

  test('creates a URL-safe token and stores only its hash with a pinned contract version', async () => {
    const agent = await loginAsOwner();
    const result = await createOnboarding(agent);
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const tokenHash = crypto.createHash('sha256').update(result.token).digest('hex');
    const [rows] = await getPool().query(
      `SELECT public_token_hash, contract_version_id, status,
              TIMESTAMPDIFF(SECOND, created_at, expires_at) AS lifetime_seconds
       FROM onboardings WHERE id = ?`,
      [result.onboarding_id],
    );
    expect(rows[0]).toMatchObject({
      public_token_hash: tokenHash,
      status: 'NOT_STARTED',
      lifetime_seconds: 604800,
    });
    expect(rows[0].public_token_hash).not.toContain(result.token);
    expect(Number(rows[0].contract_version_id)).toBeGreaterThan(0);
  });

  test('public create ignores client-supplied fields and creates only a token-addressable onboarding', async () => {
    const response = await request(app)
      .post('/api/public/onboardings')
      .send({
        created_by_staff_id: 1,
        contract_version_id: 999999,
        status: 'COMPLETED',
        expires_at: '2000-01-01 00:00:00',
        token: 'client-controlled-token',
      })
      .expect(201);
    const { token } = response.body.data;

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(response.body.data).toEqual({ token });
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const [rows] = await getPool().query(
      `SELECT id, public_token_hash, contract_version_id, created_by_staff_id, status,
              created_at, expires_at,
              TIMESTAMPDIFF(SECOND, created_at, expires_at) AS lifetime_seconds
       FROM onboardings WHERE public_token_hash = ?`,
      [tokenHash],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      public_token_hash: tokenHash,
      created_by_staff_id: null,
      status: 'NOT_STARTED',
      lifetime_seconds: 604800,
    });
    expect(rows[0].created_at).toBeTruthy();
    expect(rows[0].expires_at).toBeTruthy();
    const [[currentContract]] = await getPool().query(
      `SELECT id FROM contract_versions WHERE status = 'PUBLISHED' AND is_current = TRUE`,
    );
    expect(Number(rows[0].contract_version_id)).toBe(currentContract.id);

    const [[petCount]] = await getPool().query(
      'SELECT COUNT(*) AS total FROM onboarding_pets WHERE onboarding_id = ?',
      [rows[0].id],
    );
    expect(Number(petCount.total)).toBe(1);
    const [[counts]] = await getPool().query(
      `SELECT (SELECT COUNT(*) FROM customers) AS customers,
              (SELECT COUNT(*) FROM pets) AS pets,
              (SELECT COUNT(*) FROM appointments) AS appointments,
              (SELECT COUNT(*) FROM contract_history) AS contract_history`,
    );
    expect(counts).toMatchObject({
      customers: 0,
      pets: 0,
      appointments: 0,
      contract_history: 0,
    });

    const publicData = await request(app).get(`/api/public/onboardings/${token}`).expect(200);
    expect(publicData.body.data.onboarding.status).toBe('NOT_STARTED');
  });

  test('public create requires a current published contract version', async () => {
    await getPool().query('UPDATE contract_versions SET is_current = FALSE WHERE is_current = TRUE');
    const response = await request(app).post('/api/public/onboardings').send({}).expect(409);
    expect(response.body.error).toEqual({
      code: 'CONTRACT_VERSION_NOT_AVAILABLE',
      message: 'A current published contract is required',
    });
  });

  test('staff create keeps its authentication and role restrictions', async () => {
    await request(app).post('/api/onboardings').send({}).expect(401);
    await (await loginAs(frontDesk)).post('/api/onboardings').send({}).expect(201);
    const groomer = await createStaffWithRole('GROOMER');
    await (await loginAs(groomer)).post('/api/onboardings').send({}).expect(403);
    await (await loginAsOwner()).post('/api/onboardings').send({}).expect(201);
  });

  test('GET does not change status, first autosave starts the workflow, and data stays temporary before submit', async () => {
    const agent = await loginAsOwner();
    const { token } = await createOnboarding(agent);
    const before = await agent.get(`/api/public/onboardings/${token}`).expect(200);
    expect(before.body.data.onboarding.status).toBe('NOT_STARTED');
    await agent.get(`/api/public/onboardings/${token}/contract.pdf`).expect(200).expect('Content-Type', /application\/pdf/);
    const [beforeRows] = await getPool().query('SELECT status FROM onboardings WHERE public_token_hash = ?', [crypto.createHash('sha256').update(token).digest('hex')]);
    expect(beforeRows[0].status).toBe('NOT_STARTED');

    await agent.put(`/api/public/onboardings/${token}`).send(EMPTY_AUTOSAVE).expect(200);
    const [afterRows] = await getPool().query('SELECT status FROM onboardings WHERE public_token_hash = ?', [crypto.createHash('sha256').update(token).digest('hex')]);
    expect(afterRows[0].status).toBe('IN_PROGRESS');
    const [[counts]] = await getPool().query(
      `SELECT (SELECT COUNT(*) FROM customers) AS customers,
              (SELECT COUNT(*) FROM pets) AS pets,
              (SELECT COUNT(*) FROM appointments) AS appointments`,
    );
    expect(counts).toMatchObject({ customers: 0, pets: 0, appointments: 0 });
  });

  test('pins expiration to creation, keeps GET read-only, and expires on a mutating request', async () => {
    const agent = await loginAsOwner();
    const { token, onboarding_id: id } = await createOnboarding(agent);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await getPool().query('UPDATE onboardings SET created_at = UTC_TIMESTAMP() - INTERVAL 169 HOUR WHERE id = ?', [id]);
    const response = await agent.get(`/api/public/onboardings/${token}`).expect(200);
    expect(response.body.data.onboarding.status).toBe('EXPIRED');
    const [readOnlyRows] = await getPool().query('SELECT status FROM onboardings WHERE id = ?', [id]);
    expect(readOnlyRows[0].status).toBe('NOT_STARTED');
    await agent.put(`/api/public/onboardings/${token}`).send(EMPTY_AUTOSAVE).expect(410);
    const [expiredRows] = await getPool().query('SELECT status FROM onboardings WHERE id = ?', [id]);
    expect(expiredRows[0].status).toBe('EXPIRED');
    expect(tokenHash).toHaveLength(64);
  });

  test.each(['COMPLETED', 'EXPIRED'])('rejects autosave after status becomes %s', async (status) => {
    const agent = await loginAsOwner();
    const { token, onboarding_id: id } = await createOnboarding(agent);
    await getPool().query('UPDATE onboardings SET status = ? WHERE id = ?', [status, id]);
    await agent.put(`/api/public/onboardings/${token}`).send(EMPTY_AUTOSAVE).expect(410);
  });

  test('autosave accepts Pet multi-select arrays and validates their limits without accepting other arrays', async () => {
    const agent = await loginAsOwner();
    const { token } = await createOnboarding(agent);
    await agent.put(`/api/public/onboardings/${token}`).send({
      ...EMPTY_AUTOSAVE,
      pet: { personality: ['親近人'], medical_history: ['其他'], other_history: '補充病史' },
    }).expect(200);
    const [[saved]] = await getPool().query(
      `SELECT op.pet_data FROM onboarding_pets op
       INNER JOIN onboardings o ON o.id = op.onboarding_id
       WHERE o.public_token_hash = ?`,
      [crypto.createHash('sha256').update(token).digest('hex')],
    );
    const savedPet = typeof saved.pet_data === 'string' ? JSON.parse(saved.pet_data) : saved.pet_data;
    expect(savedPet).toMatchObject({
      personality: ['親近人'],
      medical_history: ['其他'],
      other_history: '補充病史',
    });
    await agent.put(`/api/public/onboardings/${token}`).send({
      ...EMPTY_AUTOSAVE,
      pet: { personality: Array(9).fill('親近人') },
    }).expect(400);
    await agent.put(`/api/public/onboardings/${token}`).send({
      ...EMPTY_AUTOSAVE,
      pet: { personality: '親近人' },
    }).expect(400);
    await agent.put(`/api/public/onboardings/${token}`).send({
      ...EMPTY_AUTOSAVE,
      pet: { name: ['not a scalar'] },
    }).expect(400);
    await agent.put(`/api/public/onboardings/${token}`).send({
      ...EMPTY_AUTOSAVE,
      pet: { other_history: 'x'.repeat(1001) },
    }).expect(400);
  });

  test('only resolves server-issued Customer and Pet candidate keys, then reuses the selected records', async () => {
    const agent = await loginAsOwner();
    const { token, onboarding_id: onboardingId } = await createOnboarding(agent);
    const [inserted] = await getPool().query(
      'INSERT INTO customers (name, phone) VALUES (?, ?)',
      ['Candidate Customer', `09${crypto.randomInt(100000000, 999999999)}`],
    );
    const [petInsert] = await getPool().query(
      'INSERT INTO pets (name, species, gender, personality, medical_history, other_history) VALUES (?, \'DOG\', \'FEMALE\', ?, ?, ?)',
      ['Candidate Pet', JSON.stringify(['原有個性']), JSON.stringify(['原有病史']), '原有補充'],
    );
    await getPool().query(
      'INSERT INTO pet_customer_relationships (pet_id, customer_id, is_primary) VALUES (?, ?, TRUE)',
      [petInsert.insertId, inserted.insertId],
    );
    const search = await agent.get(`/api/public/onboardings/${token}/customers?q=Candidate`).expect(200);
    expect(search.body.data.candidates).toHaveLength(1);
    const key = search.body.data.candidates[0].key;
    await agent.post(`/api/public/onboardings/${token}/customer-resolution`).send({
      resolution: 'EXISTING',
      candidate_key: String(inserted.insertId),
    }).expect(400);
    const resolved = await agent.post(`/api/public/onboardings/${token}/customer-resolution`).send({
      resolution: 'EXISTING',
      candidate_key: key,
    }).expect(200);
    expect(resolved.body.data).toEqual({ customer_resolution: 'EXISTING' });
    const petSearch = await agent.get(`/api/public/onboardings/${token}/pets?q=Candidate`).expect(200);
    expect(petSearch.body.data.candidates).toHaveLength(1);
    const petKey = petSearch.body.data.candidates[0].key;
    await agent.post(`/api/public/onboardings/${token}/pet-resolution`).send({
      resolution: 'EXISTING',
      candidate_key: String(petInsert.insertId),
    }).expect(400);
    await agent.post(`/api/public/onboardings/${token}/pet-resolution`).send({
      resolution: 'EXISTING',
      candidate_key: petKey,
    }).expect(200);
    const [[row]] = await getPool().query('SELECT matched_customer_id FROM onboardings WHERE id = ?', [onboardingId]);
    expect(Number(row.matched_customer_id)).toBe(inserted.insertId);
    const [[petRow]] = await getPool().query('SELECT matched_pet_id FROM onboarding_pets WHERE onboarding_id = ?', [onboardingId]);
    expect(Number(petRow.matched_pet_id)).toBe(petInsert.insertId);

    const payload = onboardingPayload(`09${crypto.randomInt(100000000, 999999999)}`, await getServiceId());
    await agent.put(`/api/public/onboardings/${token}`).send(payload).expect(200);
    await agent.post(`/api/public/onboardings/${token}/submit`).send({ signature_png: signaturePng }).expect(200);
    const [[counts]] = await getPool().query('SELECT (SELECT COUNT(*) FROM customers) AS customers, (SELECT COUNT(*) FROM pets) AS pets');
    expect(counts).toMatchObject({ customers: 1, pets: 1 });
    const [[existingPet]] = await getPool().query('SELECT personality, medical_history, other_history FROM pets WHERE id = ?', [petInsert.insertId]);
    expect(existingPet).toMatchObject({
      personality: JSON.stringify(['原有個性']),
      medical_history: JSON.stringify(['原有病史']),
      other_history: '原有補充',
    });
  });

  test('submits the happy path atomically and stores contract and PNG signature evidence', async () => {
    const agent = await loginAsOwner();
    const { token, onboarding_id: id } = await createOnboarding(agent);
    const phone = `09${crypto.randomInt(100000000, 999999999)}`;
    const payload = onboardingPayload(phone, await getServiceId());
    await agent.put(`/api/public/onboardings/${token}`).send(payload).expect(200);
    await resolveNew(agent, token);

    await agent.post(`/api/public/onboardings/${token}/submit`).send({ signature_png: signaturePng }).expect(200);
    const [[durationSnapshot]] = await getPool().query(
      `SELECT aps.duration_minutes, s.duration_minutes AS service_duration_minutes
       FROM contract_history ch
       INNER JOIN appointment_pets ap ON ap.appointment_id = ch.appointment_id
       INNER JOIN appointment_pet_services aps ON aps.appointment_pet_id = ap.id
       INNER JOIN services s ON s.id = aps.service_id
       WHERE ch.onboarding_id = ?`,
      [id],
    );
    expect(Number(durationSnapshot.duration_minutes)).toBe(Number(durationSnapshot.service_duration_minutes));
    const [[status]] = await getPool().query('SELECT status FROM onboardings WHERE id = ?', [id]);
    expect(status.status).toBe('COMPLETED');
    const [[history]] = await getPool().query('SELECT * FROM contract_history WHERE onboarding_id = ?', [id]);
    expect(history).toMatchObject({
      version: expect.any(String),
      pdf_hash: expect.any(String),
      storage_path: expect.stringMatching(/^contract-versions\//),
      signature_hash: crypto.createHash('sha256').update(Buffer.from(signaturePng.split(',')[1], 'base64')).digest('hex'),
    });
    expect(Buffer.from(history.signature_evidence)).toEqual(Buffer.from(signaturePng.split(',')[1], 'base64'));
    const [[pet]] = await getPool().query('SELECT personality, medical_history, other_history FROM pets LIMIT 1');
    expect(pet).toMatchObject({
      personality: JSON.stringify(['親近人']),
      medical_history: JSON.stringify(['其他']),
      other_history: '舊傷已痊癒',
    });
    const [[counts]] = await getPool().query(
      `SELECT (SELECT COUNT(*) FROM customers) AS customers,
              (SELECT COUNT(*) FROM pets) AS pets,
              (SELECT COUNT(*) FROM appointments) AS appointments,
              (SELECT COUNT(*) FROM daily_operations) AS operations`,
    );
    expect(counts).toMatchObject({ customers: 1, pets: 1, appointments: 1, operations: 1 });
    await agent.post(`/api/public/onboardings/${token}/submit`).send({ signature_png: signaturePng }).expect(410);
  });

  test('rolls back all formal domain writes when a submit step fails', async () => {
    const agent = await loginAsOwner();
    const { token, onboarding_id: id } = await createOnboarding(agent);
    const payload = onboardingPayload(`09${crypto.randomInt(100000000, 999999999)}`, await getServiceId());
    await agent.put(`/api/public/onboardings/${token}`).send(payload).expect(200);
    await resolveNew(agent, token);
    jest.spyOn(dailyOperationsRepository, 'create').mockRejectedValueOnce(new Error('injected daily operation failure'));
    await agent.post(`/api/public/onboardings/${token}/submit`).send({ signature_png: signaturePng }).expect(500);

    const [[counts]] = await getPool().query(
      `SELECT (SELECT COUNT(*) FROM customers) AS customers,
              (SELECT COUNT(*) FROM pets) AS pets,
              (SELECT COUNT(*) FROM appointments) AS appointments,
              (SELECT COUNT(*) FROM contract_history WHERE onboarding_id = ?) AS history`,
      [id],
    );
    expect(counts).toMatchObject({ customers: 0, pets: 0, appointments: 0, history: 0 });
    const [[status]] = await getPool().query('SELECT status FROM onboardings WHERE id = ?', [id]);
    expect(status.status).toBe('IN_PROGRESS');
  });

  test('serializes concurrent submissions with the onboarding row lock', async () => {
    const agent = await loginAsOwner();
    const { token } = await createOnboarding(agent);
    const payload = onboardingPayload(`09${crypto.randomInt(100000000, 999999999)}`, await getServiceId());
    await agent.put(`/api/public/onboardings/${token}`).send(payload).expect(200);
    await resolveNew(agent, token);
    const responses = await Promise.all([
      agent.post(`/api/public/onboardings/${token}/submit`).send({ signature_png: signaturePng }),
      agent.post(`/api/public/onboardings/${token}/submit`).send({ signature_png: signaturePng }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 410]);
    const [[history]] = await getPool().query('SELECT COUNT(*) AS total FROM contract_history');
    expect(Number(history.total)).toBe(1);
  });

  test('rejects invalid PNG signature evidence', async () => {
    const agent = await loginAsOwner();
    const { token } = await createOnboarding(agent);
    await agent.put(`/api/public/onboardings/${token}`).send(onboardingPayload(`09${crypto.randomInt(100000000, 999999999)}`, await getServiceId())).expect(200);
    await resolveNew(agent, token);
    await agent.post(`/api/public/onboardings/${token}/submit`).send({ signature_png: 'data:image/png;base64,SGVsbG8=' }).expect(400);
  });
});

const EMPTY_AUTOSAVE = {
  customer: {},
  pet: {},
  appointment: {},
};
