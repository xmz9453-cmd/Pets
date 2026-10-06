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
  process.env.CONTRACT_STORAGE_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'pets-customer-contract-test-'));
}

loadLocalEnvForTestDatabase();

const app = require('../../backend/src/app');
const { setup } = require('../../database/scripts/setup');
const { getPool, closePool } = require('../../backend/src/config/database');
const { getFoundationOwner } = require('../../database/seeds/staff-authentication-seed');
const contractPdfStorage = require('../../backend/src/utils/contract-pdf-storage');

const owner = getFoundationOwner();
const signatureBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pGQAAAAASUVORK5CYII=', 'base64');

async function loginAsOwner() {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({
    username: owner.username,
    password: owner.password,
  }).expect(200);
  return agent;
}

async function clearData() {
  await getPool().query('DELETE FROM contract_history');
  await getPool().query('DELETE FROM onboardings');
  await getPool().query('DELETE FROM auth_sessions');
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

async function createContractFixture({ customerId, staffId, version, agreedAt, pdfBytes }) {
  const storageKey = contractPdfStorage.createStorageKey();
  const tempPath = await contractPdfStorage.writeTemporaryFile(pdfBytes);
  await contractPdfStorage.moveTemporaryFile(tempPath, storageKey);

  const [versionResult] = await getPool().query(
    `INSERT INTO contract_versions
     (version_label, status, is_current, file_name, mime_type, file_size, storage_path, file_hash)
     VALUES (?, 'PUBLISHED', FALSE, ?, 'application/pdf', ?, ?, ?)`,
    [
      `Customer-${version}-${crypto.randomBytes(3).toString('hex')}`,
      `${version}.pdf`,
      pdfBytes.length,
      storageKey,
      crypto.createHash('sha256').update(pdfBytes).digest('hex'),
    ],
  );
  const [petResult] = await getPool().query(
    `INSERT INTO pets (name, species, gender)
     VALUES (?, 'DOG', 'UNKNOWN')`,
    [`Contract pet ${version}`],
  );
  const [appointmentResult] = await getPool().query(
    `INSERT INTO appointments (customer_id, appointment_date, appointment_time)
     VALUES (?, '2026-10-06', '10:00:00')`,
    [customerId],
  );
  const [onboardingResult] = await getPool().query(
    `INSERT INTO onboardings
     (public_token_hash, contract_version_id, status, matched_customer_id, created_by_staff_id, completed_at)
     VALUES (?, ?, 'COMPLETED', ?, ?, ?)`,
    [
      crypto.randomBytes(32).toString('hex'),
      versionResult.insertId,
      customerId,
      staffId,
      agreedAt,
    ],
  );
  const [historyResult] = await getPool().query(
    `INSERT INTO contract_history
     (onboarding_id, customer_id, pet_id, appointment_id, contract_version_id, version,
      pdf_hash, storage_path, agreed_at, signature_evidence, signature_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      onboardingResult.insertId,
      customerId,
      petResult.insertId,
      appointmentResult.insertId,
      versionResult.insertId,
      version,
      crypto.createHash('sha256').update(pdfBytes).digest('hex'),
      storageKey,
      agreedAt,
      signatureBytes,
      crypto.createHash('sha256').update(signatureBytes).digest('hex'),
    ],
  );

  return { id: historyResult.insertId, pdfBytes };
}

describe('Customer completed contract history API', () => {
  let customerAId;
  let customerBId;
  let olderContract;
  let latestContract;
  let otherCustomerContract;

  beforeAll(async () => {
    await setup();
    await clearData();
    const [[staff]] = await getPool().query('SELECT id FROM staff WHERE username = ?', [owner.username]);
    const [customerA] = await getPool().query(
      'INSERT INTO customers (name, phone) VALUES (?, ?)',
      ['Contract Customer A', '09120000001'],
    );
    const [customerB] = await getPool().query(
      'INSERT INTO customers (name, phone) VALUES (?, ?)',
      ['Contract Customer B', '09120000002'],
    );
    customerAId = customerA.insertId;
    customerBId = customerB.insertId;
    olderContract = await createContractFixture({
      customerId: customerAId,
      staffId: staff.id,
      version: 'v1',
      agreedAt: '2026-10-06 10:00:00',
      pdfBytes: Buffer.from('%PDF-1.7\nHistorical version one\n%%EOF\n'),
    });
    latestContract = await createContractFixture({
      customerId: customerAId,
      staffId: staff.id,
      version: 'v2',
      agreedAt: '2026-10-06 11:00:00',
      pdfBytes: Buffer.from('%PDF-1.7\nHistorical version two\n%%EOF\n'),
    });
    otherCustomerContract = await createContractFixture({
      customerId: customerBId,
      staffId: staff.id,
      version: 'other-customer',
      agreedAt: '2026-10-06 12:00:00',
      pdfBytes: Buffer.from('%PDF-1.7\nOther customer contract\n%%EOF\n'),
    });
  });

  afterAll(async () => {
    await clearData();
    await closePool();
  });

  test('customer detail includes every completed contract newest first without binary evidence', async () => {
    const agent = await loginAsOwner();
    const response = await agent.get(`/api/customers/${customerAId}`).expect(200);
    const { contracts } = response.body.data.customer;

    expect(contracts).toHaveLength(2);
    expect(contracts.map((contract) => contract.id)).toEqual([latestContract.id, olderContract.id]);
    expect(contracts[0]).toMatchObject({
      id: latestContract.id,
      version: 'v2',
      agreed_at: '2026-10-06 11:00:00',
    });
    expect(contracts[0]).toHaveProperty('contract_version_id');
    expect(JSON.stringify(contracts)).not.toContain('signature_evidence');
    expect(JSON.stringify(contracts)).not.toContain('pdf_hash');

    const emptyCustomer = await agent.post('/api/customers').send({
      name: 'No Contract Customer',
      phone: '09120000003',
    }).expect(201);
    const emptyDetail = await agent.get(`/api/customers/${emptyCustomer.body.data.customer.id}`).expect(200);
    expect(emptyDetail.body.data.customer.contracts).toEqual([]);
  });

  test('historical PDF is read from its history storage path and checked against its saved hash', async () => {
    const agent = await loginAsOwner();
    const response = await agent
      .get(`/api/customers/${customerAId}/contracts/${latestContract.id}/pdf`)
      .expect(200)
      .expect('Content-Type', /application\/pdf/);

    expect(response.body).toEqual(latestContract.pdfBytes);
  });

  test('signature is returned as verified PNG bytes', async () => {
    const agent = await loginAsOwner();
    const response = await agent
      .get(`/api/customers/${customerAId}/contracts/${latestContract.id}/signature`)
      .expect(200)
      .expect('Content-Type', /image\/png/);

    expect(response.body.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(response.body).toEqual(signatureBytes);
  });

  test('rejects a historical PDF or signature when its saved hash does not match', async () => {
    const agent = await loginAsOwner();
    const [[history]] = await getPool().query(
      'SELECT pdf_hash, signature_hash FROM contract_history WHERE id = ?',
      [latestContract.id],
    );

    try {
      await getPool().query(
        'UPDATE contract_history SET pdf_hash = ?, signature_hash = ? WHERE id = ?',
        ['0'.repeat(64), '0'.repeat(64), latestContract.id],
      );
      await agent
        .get(`/api/customers/${customerAId}/contracts/${latestContract.id}/pdf`)
        .expect(409);
      await agent
        .get(`/api/customers/${customerAId}/contracts/${latestContract.id}/signature`)
        .expect(409);
    } finally {
      await getPool().query(
        'UPDATE contract_history SET pdf_hash = ?, signature_hash = ? WHERE id = ?',
        [history.pdf_hash, history.signature_hash, latestContract.id],
      );
    }
  });

  test('does not allow an anonymous request or cross-customer contract access', async () => {
    await request(app)
      .get(`/api/customers/${customerAId}/contracts/${latestContract.id}/pdf`)
      .expect(401);
    const agent = await loginAsOwner();

    await agent
      .get(`/api/customers/${customerAId}/contracts/${otherCustomerContract.id}/pdf`)
      .expect(404);
    await agent
      .get(`/api/customers/${customerAId}/contracts/${otherCustomerContract.id}/signature`)
      .expect(404);
  });
});
