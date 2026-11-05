const request = require('supertest');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

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
  process.env.CONTRACT_STORAGE_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'pets-contract-version-test-'));
}

loadLocalEnvForTestDatabase();

const app = require('../../backend/src/app');
const { setup } = require('../../database/scripts/setup');
const { getPool, closePool } = require('../../backend/src/config/database');
const { getFoundationOwner, getFrontDeskStaff } = require('../../database/seeds/staff-authentication-seed');
const contractVersionRepository = require('../../backend/src/data/contract-version.repository');
const contractPdfStorage = require('../../backend/src/utils/contract-pdf-storage');
const { hashPassword } = require('../../backend/src/utils/password');

const owner = getFoundationOwner();
const testPdf = Buffer.from('%PDF-1.7\nContract PDF fixture\n%%EOF\n');
const groomerCredentials = { username: 'pdf_groomer_test', password: 'groomer-test-password' };

async function loginAsOwner() {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/login').send({
    username: owner.username,
    password: owner.password,
  });
  expect(response.status).toBe(200);
  return agent;
}

function contractPayload(versionLabel, serviceType = 'GENERAL') {
  return { version_label: versionLabel, service_type: serviceType };
}

async function createDraft(agent, versionLabel = `V-${Date.now()}`, serviceType = 'GENERAL') {
  const response = await agent.post('/api/contract-versions').send(contractPayload(versionLabel, serviceType));
  expect(response.status).toBe(201);
  return response.body.data.contract_version;
}

async function uploadPdf(agent, versionId, fileBytes = testPdf, filename = 'contract.pdf', mimetype = 'application/pdf') {
  return agent
    .post(`/api/contract-versions/${versionId}/pdf`)
    .attach('file', fileBytes, { filename, contentType: mimetype });
}

async function createPublished(agent, versionLabel, serviceType = 'GENERAL') {
  const draft = await createDraft(agent, versionLabel, serviceType);
  const uploadResponse = await uploadPdf(agent, draft.id);
  expect(uploadResponse.status).toBe(200);
  const response = await agent.post(`/api/contract-versions/${draft.id}/publish`);
  expect(response.status).toBe(200);
  return response.body.data.contract_version;
}

async function queryContractVersion(versionId) {
  const [rows] = await getPool().query(
    `SELECT id, version_label, status, is_current, file_name, mime_type,
            file_size, storage_path, file_hash
     FROM contract_versions
     WHERE id = ?`,
    [versionId],
  );
  return rows[0] || null;
}

async function cleanContractVersions() {
  await getPool().query('DELETE FROM contract_versions');
  await getPool().query('DELETE FROM auth_sessions');
  fs.rmSync(process.env.CONTRACT_STORAGE_ROOT, { recursive: true, force: true });
  fs.mkdirSync(process.env.CONTRACT_STORAGE_ROOT, { recursive: true });
}

async function loginAsStaff(credentials) {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/login').send({
    username: credentials.username,
    password: credentials.password,
  });
  expect(response.status).toBe(200);
  return agent;
}

describe('Contract Version API', () => {
  beforeAll(async () => {
    await setup();
    const passwordHash = await hashPassword(groomerCredentials.password);
    const [staffResult] = await getPool().query(
      `INSERT INTO staff (username, password_hash, display_name, status)
       VALUES (?, ?, 'PDF Test Groomer', 'ACTIVE')`,
      [groomerCredentials.username, passwordHash],
    );
    const [[role]] = await getPool().query('SELECT id FROM roles WHERE code = ?', ['GROOMER']);
    await getPool().query(
      'INSERT INTO staff_roles (staff_id, role_id) VALUES (?, ?)',
      [staffResult.insertId, role.id],
    );
    await getPool().query(
      'INSERT INTO staff_shop_memberships (staff_id, shop_id) VALUES (?, 1)',
      [staffResult.insertId],
    );
    await getPool().query(
      'INSERT INTO staff_shop_roles (staff_id, shop_id, role_id) VALUES (?, 1, ?)',
      [staffResult.insertId, role.id],
    );
    await cleanContractVersions();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await cleanContractVersions();
  });

  afterAll(async () => {
    await getPool().query('DELETE FROM staff_roles WHERE staff_id = (SELECT id FROM staff WHERE username = ?)', [groomerCredentials.username]);
    await getPool().query('DELETE FROM staff WHERE username = ?', [groomerCredentials.username]);
    await closePool();
    fs.rmSync(process.env.CONTRACT_STORAGE_ROOT, { recursive: true, force: true });
  });

  test('creates a DRAFT and returns it from list and detail endpoints', async () => {
    const agent = await loginAsOwner();
    const created = await createDraft(agent, 'V1');

    expect(created).toMatchObject({ version_label: 'V1', status: 'DRAFT', is_current: false });
    const listResponse = await agent.get('/api/contract-versions');
    const detailResponse = await agent.get(`/api/contract-versions/${created.id}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.contract_versions).toHaveLength(1);
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data.contract_version.id).toBe(created.id);
  });

  test('keeps the current grooming and boarding contracts independent', async () => {
    const agent = await loginAsOwner();
    const groomingV1 = await createPublished(agent, 'grooming-v1', 'GROOMING');
    const boardingV1 = await createPublished(agent, 'boarding-v1', 'BOARDING');
    const invalid = await agent.post('/api/contract-versions').send({
      version_label: 'invalid-type',
      service_type: 'DAYCARE',
    });

    expect(invalid.status).toBe(400);
    expect(invalid.body.error.fields.service_type).toBeDefined();

    const groomingCurrent = await agent.post(`/api/contract-versions/${groomingV1.id}/current`);
    const boardingCurrent = await agent.post(`/api/contract-versions/${boardingV1.id}/current`);
    const groomingV2 = await createPublished(agent, 'grooming-v2', 'GROOMING');
    const replaceGroomingCurrent = await agent.post(`/api/contract-versions/${groomingV2.id}/current`);
    const listResponse = await agent.get('/api/contract-versions');
    const currentTypes = listResponse.body.data.contract_versions
      .filter((version) => version.is_current)
      .map((version) => version.service_type)
      .sort();

    expect(groomingCurrent.status).toBe(200);
    expect(boardingCurrent.status).toBe(200);
    expect(replaceGroomingCurrent.status).toBe(200);
    expect(currentTypes).toEqual(['BOARDING', 'GROOMING']);
    expect(listResponse.body.data.contract_versions.find((version) => version.id === groomingV1.id).is_current).toBe(false);
  });

  test('updates Draft labels, rejects client PDF metadata, and rejects duplicate labels', async () => {
    const agent = await loginAsOwner();
    const draft = await createDraft(agent, 'V1');
    const secondDraft = await createDraft(agent, 'V2');

    const updateResponse = await agent.patch(`/api/contract-versions/${draft.id}`).send({ version_label: 'V1-revised' });
    const metadataResponse = await agent.patch(`/api/contract-versions/${draft.id}`).send({ file_hash: 'a'.repeat(64) });
    const duplicateResponse = await agent.patch(`/api/contract-versions/${secondDraft.id}`).send({
      version_label: 'V1-revised',
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.contract_version).toMatchObject({
      version_label: 'V1-revised',
    });
    expect(metadataResponse.status).toBe(400);
    expect(metadataResponse.body.error.fields.file_hash).toBeDefined();
    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body.error.code).toBe('CONTRACT_VERSION_LABEL_EXISTS');
  });

  test('publishes a complete PDF metadata record and makes published content immutable', async () => {
    const agent = await loginAsOwner();
    const draft = await createDraft(agent, 'V1');
    const uploadResponse = await uploadPdf(agent, draft.id, testPdf, 'original-contract.pdf');
    expect(uploadResponse.status).toBe(200);
    expect(uploadResponse.body.data.contract_version).toMatchObject({
      file_name: 'original-contract.pdf',
      mime_type: 'application/pdf',
      file_size: testPdf.length,
      file_hash: crypto.createHash('sha256').update(testPdf).digest('hex'),
    });

    const publishResponse = await agent.post(`/api/contract-versions/${draft.id}/publish`);
    const replacementResponse = await uploadPdf(agent, draft.id, Buffer.from('%PDF-2.0\nReplacement\n'));
    const updateResponse = await agent.patch(`/api/contract-versions/${draft.id}`).send({ version_label: 'V1-edited' });
    const republishResponse = await agent.post(`/api/contract-versions/${draft.id}/publish`);

    expect(publishResponse.status).toBe(200);
    expect(publishResponse.body.data.contract_version.status).toBe('PUBLISHED');
    expect(replacementResponse.status).toBe(400);
    expect(updateResponse.status).toBe(400);
    expect(republishResponse.status).toBe(400);
  });

  test('deletes Draft and unused Published versions and removes their PDFs', async () => {
    const agent = await loginAsOwner();
    const draft = await createDraft(agent, 'delete-draft');
    const uploadResponse = await uploadPdf(agent, draft.id);
    const draftPdfPath = await contractPdfStorage.resolveStoragePath(
      uploadResponse.body.data.contract_version.storage_path,
    );

    const draftDelete = await agent.delete(`/api/contract-versions/${draft.id}`);
    expect(draftDelete.status).toBe(200);
    expect(draftDelete.body.data).toMatchObject({ deleted: true, pdf_cleanup_warning: false });
    expect(fs.existsSync(draftPdfPath)).toBe(false);
    await expect(queryContractVersion(draft.id)).resolves.toBeNull();

    const published = await createPublished(agent, 'delete-published');
    const publishedPdfPath = await contractPdfStorage.resolveStoragePath(published.storage_path);
    const publishedDelete = await agent.delete(`/api/contract-versions/${published.id}`);

    expect(publishedDelete.status).toBe(200);
    expect(publishedDelete.body.data).toMatchObject({ deleted: true, pdf_cleanup_warning: false });
    expect(fs.existsSync(publishedPdfPath)).toBe(false);
    await expect(queryContractVersion(published.id)).resolves.toBeNull();
  });

  test('rejects deleting Current and versions referenced by onboarding or signed history', async () => {
    const agent = await loginAsOwner();
    const current = await createPublished(agent, 'delete-current');
    await agent.post(`/api/contract-versions/${current.id}/current`);
    const currentDelete = await agent.delete(`/api/contract-versions/${current.id}`);

    expect(currentDelete.status).toBe(409);
    expect(currentDelete.body.error.code).toBe('CURRENT_CONTRACT_VERSION_CANNOT_BE_DELETED');

    const onboardingVersion = await createPublished(agent, 'delete-onboarding-reference');
    const [staffRows] = await getPool().query('SELECT id FROM staff WHERE username = ?', [owner.username]);
    const onboardingToken = crypto.randomBytes(32).toString('hex');
    let onboardingId;
    let historyOnboardingId;
    let customerId;
    let petId;
    let appointmentId;

    try {
      const [onboardingResult] = await getPool().query(
        `INSERT INTO onboardings (shop_id, public_token_hash, contract_version_id, created_by_staff_id)
         VALUES (1, ?, ?, ?)`,
        [onboardingToken, onboardingVersion.id, staffRows[0].id],
      );
      onboardingId = onboardingResult.insertId;
      const onboardingDelete = await agent.delete(`/api/contract-versions/${onboardingVersion.id}`);

      expect(onboardingDelete.status).toBe(409);
      expect(onboardingDelete.body.error.code).toBe('CONTRACT_VERSION_IN_USE');

      const historyVersion = await createPublished(agent, 'delete-history-reference');
      const historyOnboardingVersion = await createDraft(agent, 'history-onboarding-holder');
      const phone = `09${crypto.randomInt(100000000, 999999999)}`;
      const [customerResult] = await getPool().query(
        'INSERT INTO customers (shop_id, name, phone) VALUES (1, ?, ?)',
        ['Contract deletion fixture', phone],
      );
      customerId = customerResult.insertId;
      const [petResult] = await getPool().query(
        `INSERT INTO pets (shop_id, name, species, gender)
         VALUES (1, 'Contract deletion fixture', 'DOG', 'UNKNOWN')`,
      );
      petId = petResult.insertId;
      const [appointmentResult] = await getPool().query(
        `INSERT INTO appointments (shop_id, customer_id, appointment_date, appointment_time)
         VALUES (1, ?, '2030-01-01', '10:00:00')`,
        [customerId],
      );
      appointmentId = appointmentResult.insertId;
      const historyOnboardingToken = crypto.randomBytes(32).toString('hex');
      const [historyOnboardingResult] = await getPool().query(
        `INSERT INTO onboardings (shop_id, public_token_hash, contract_version_id, created_by_staff_id)
         VALUES (1, ?, ?, ?)`,
        [historyOnboardingToken, historyOnboardingVersion.id, staffRows[0].id],
      );
      historyOnboardingId = historyOnboardingResult.insertId;
      await getPool().query(
        `INSERT INTO contract_history
         (shop_id, onboarding_id, customer_id, pet_id, appointment_id, contract_version_id, version,
          pdf_hash, storage_path, agreed_at, signature_evidence, signature_hash)
         VALUES (1, ?, ?, ?, ?, ?, 'history-reference', ?, 'contract-versions/history.pdf',
                 '2030-01-01 10:00:00', ?, ?)`,
        [
          historyOnboardingId,
          customerId,
          petId,
          appointmentId,
          historyVersion.id,
          'a'.repeat(64),
          Buffer.from('signature evidence'),
          'b'.repeat(64),
        ],
      );

      const historyDelete = await agent.delete(`/api/contract-versions/${historyVersion.id}`);
      expect(historyDelete.status).toBe(409);
      expect(historyDelete.body.error.code).toBe('CONTRACT_VERSION_IN_USE');
    } finally {
      if (historyOnboardingId) {
        await getPool().query('DELETE FROM contract_history WHERE onboarding_id = ?', [historyOnboardingId]);
        await getPool().query('DELETE FROM onboardings WHERE id = ?', [historyOnboardingId]);
      }
      if (onboardingId) {
        await getPool().query('DELETE FROM onboardings WHERE id = ?', [onboardingId]);
      }
      if (appointmentId) {
        await getPool().query('DELETE FROM appointments WHERE id = ?', [appointmentId]);
      }
      if (petId) {
        await getPool().query('DELETE FROM pets WHERE id = ?', [petId]);
      }
      if (customerId) {
        await getPool().query('DELETE FROM customers WHERE id = ?', [customerId]);
      }
    }
  });

  test('uploads valid PDFs, replaces Draft files without overwrite, and rejects invalid uploads', async () => {
    const agent = await loginAsOwner();
    const draft = await createDraft(agent, 'V1');
    const firstUpload = await uploadPdf(agent, draft.id, testPdf, 'first.pdf');
    const firstKey = firstUpload.body.data.contract_version.storage_path;
    const firstPath = await contractPdfStorage.resolveStoragePath(firstKey);
    const secondPdf = Buffer.from('%PDF-1.5\nSecond contract\n%%EOF\n');
    const secondUpload = await uploadPdf(agent, draft.id, secondPdf, 'second.pdf');
    const secondKey = secondUpload.body.data.contract_version.storage_path;
    const secondPath = await contractPdfStorage.resolveStoragePath(secondKey);

    expect(firstUpload.status).toBe(200);
    expect(secondUpload.status).toBe(200);
    expect(secondKey).not.toBe(firstKey);
    expect(fs.existsSync(firstPath)).toBe(false);
    expect(fs.existsSync(secondPath)).toBe(true);

    const fakePdfResponse = await uploadPdf(agent, draft.id, Buffer.from('not a PDF'), 'fake.pdf');
    const emptyPdfResponse = await uploadPdf(agent, draft.id, Buffer.alloc(0), 'empty.pdf');
    const wrongMimeResponse = await uploadPdf(agent, draft.id, testPdf, 'wrong.pdf', 'application/octet-stream');
    const wrongExtensionResponse = await uploadPdf(agent, draft.id, testPdf, 'wrong.txt');
    const oversizedResponse = await uploadPdf(
      agent,
      draft.id,
      Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(10 * 1024 * 1024)]),
      'large.pdf',
    );

    expect(fakePdfResponse.status).toBe(400);
    expect(emptyPdfResponse.status).toBe(400);
    expect(wrongMimeResponse.status).toBe(400);
    expect(wrongExtensionResponse.status).toBe(400);
    expect(oversizedResponse.status).toBe(413);
  });

  test('cleans up a newly stored file when the Draft metadata update fails', async () => {
    const agent = await loginAsOwner();
    const draft = await createDraft(agent, 'db-update-failure');
    const updateSpy = jest.spyOn(contractVersionRepository, 'updateDraftPdf')
      .mockRejectedValue(new Error('simulated database update failure'));
    const response = await uploadPdf(agent, draft.id);
    const [rows] = await getPool().query('SELECT storage_path FROM contract_versions WHERE id = ?', [draft.id]);
    const pdfFiles = fs.existsSync(path.join(process.env.CONTRACT_STORAGE_ROOT, 'contract-versions'))
      ? fs.readdirSync(path.join(process.env.CONTRACT_STORAGE_ROOT, 'contract-versions'))
      : [];

    expect(response.status).toBe(500);
    expect(rows[0].storage_path).toBeNull();
    expect(pdfFiles).toHaveLength(0);
    updateSpy.mockRestore();
  });

  test('serializes concurrent Draft uploads and leaves only the winning file referenced', async () => {
    const agent = await loginAsOwner();
    const draft = await createDraft(agent, 'concurrent-upload');
    const firstBytes = Buffer.from('%PDF-1.4\nFirst\n%%EOF\n');
    const secondBytes = Buffer.from('%PDF-1.5\nSecond\n%%EOF\n');
    const [firstResponse, secondResponse] = await Promise.all([
      uploadPdf(agent, draft.id, firstBytes, 'first.pdf'),
      uploadPdf(agent, draft.id, secondBytes, 'second.pdf'),
    ]);
    const current = await queryContractVersion(draft.id);
    const stored = await contractPdfStorage.verifyStoredFile(current);
    const pdfFiles = fs.readdirSync(path.join(process.env.CONTRACT_STORAGE_ROOT, 'contract-versions'));

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(stored.bytes.equals(firstBytes) || stored.bytes.equals(secondBytes)).toBe(true);
    expect(pdfFiles).toEqual([path.basename(current.storage_path)]);
  });

  test('does not publish a draft without all PDF metadata', async () => {
    const agent = await loginAsOwner();
    const response = await agent.post('/api/contract-versions').send({ version_label: 'V1' });
    const draftId = response.body.data.contract_version.id;

    const publishResponse = await agent.post(`/api/contract-versions/${draftId}/publish`);

    expect(publishResponse.status).toBe(400);
    expect(publishResponse.body.error.code).toBe('VALIDATION_ERROR');
    expect(publishResponse.body.error.fields.file_hash).toBeDefined();
  });

  test('requires the stored file and matching size/hash before publishing', async () => {
    const agent = await loginAsOwner();
    const missingDraft = await createDraft(agent, 'missing-file');
    await uploadPdf(agent, missingDraft.id);
    const missingVersion = await queryContractVersion(missingDraft.id);
    await contractPdfStorage.removeStoredFile(missingVersion.storage_path);
    const missingPublish = await agent.post(`/api/contract-versions/${missingDraft.id}/publish`);

    const sizeDraft = await createDraft(agent, 'size-mismatch');
    await uploadPdf(agent, sizeDraft.id);
    await getPool().query('UPDATE contract_versions SET file_size = file_size + 1 WHERE id = ?', [sizeDraft.id]);
    const sizePublish = await agent.post(`/api/contract-versions/${sizeDraft.id}/publish`);

    const hashDraft = await createDraft(agent, 'hash-mismatch');
    await uploadPdf(agent, hashDraft.id);
    await getPool().query('UPDATE contract_versions SET file_hash = ? WHERE id = ?', ['b'.repeat(64), hashDraft.id]);
    const hashPublish = await agent.post(`/api/contract-versions/${hashDraft.id}/publish`);

    expect(missingPublish.status).toBe(409);
    expect(missingPublish.body.error.code).toBe('CONTRACT_PDF_MISSING');
    expect(sizePublish.status).toBe(409);
    expect(sizePublish.body.error.code).toBe('CONTRACT_PDF_SIZE_MISMATCH');
    expect(hashPublish.status).toBe(409);
    expect(hashPublish.body.error.code).toBe('CONTRACT_PDF_HASH_MISMATCH');
  });

  test('switches Current and leaves exactly one current version', async () => {
    const agent = await loginAsOwner();
    const first = await createPublished(agent, 'V1');
    const second = await createPublished(agent, 'V2');

    const firstCurrent = await agent.post(`/api/contract-versions/${first.id}/current`);
    const secondCurrent = await agent.post(`/api/contract-versions/${second.id}/current`);
    const listResponse = await agent.get('/api/contract-versions');

    expect(firstCurrent.status).toBe(200);
    expect(firstCurrent.body.data.contract_version.is_current).toBe(true);
    expect(secondCurrent.status).toBe(200);
    expect(secondCurrent.body.data.contract_version.is_current).toBe(true);
    expect(listResponse.body.data.contract_versions.filter((version) => version.is_current)).toHaveLength(1);
    expect(listResponse.body.data.contract_versions.find((version) => version.id === first.id).is_current).toBe(false);
  });

  test('database unique constraint rejects a second Current version', async () => {
    const agent = await loginAsOwner();
    const first = await createPublished(agent, 'V1');
    const second = await createPublished(agent, 'V2');
    await agent.post(`/api/contract-versions/${first.id}/current`);

    await expect(
      getPool().query('UPDATE contract_versions SET is_current = TRUE WHERE id = ?', [second.id]),
    ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
    const [rows] = await getPool().query('SELECT id FROM contract_versions WHERE is_current = TRUE');
    expect(rows.map((row) => Number(row.id))).toEqual([first.id]);
  });

  test('rejects DRAFT as Current and rejects invalid state fields', async () => {
    const agent = await loginAsOwner();
    const draft = await createDraft(agent, 'V1');

    const currentResponse = await agent.post(`/api/contract-versions/${draft.id}/current`);
    const statusResponse = await agent.patch(`/api/contract-versions/${draft.id}`).send({ status: 'PUBLISHED' });
    const createResponse = await agent.post('/api/contract-versions').send({ version_label: 'V2', status: 'CURRENT' });

    expect(currentResponse.status).toBe(400);
    expect(statusResponse.status).toBe(400);
    expect(createResponse.status).toBe(400);
  });

  test('returns 404 for a missing contract version', async () => {
    const agent = await loginAsOwner();

    const detailResponse = await agent.get('/api/contract-versions/999999');
    const publishResponse = await agent.post('/api/contract-versions/999999/publish');
    const deleteResponse = await agent.delete('/api/contract-versions/999999');

    expect(detailResponse.status).toBe(404);
    expect(detailResponse.body.error.code).toBe('CONTRACT_VERSION_NOT_FOUND');
    expect(publishResponse.status).toBe(404);
    expect(deleteResponse.status).toBe(404);
  });

  test('rolls back the previous Current when promotion fails', async () => {
    const agent = await loginAsOwner();
    const first = await createPublished(agent, 'V1');
    const second = await createPublished(agent, 'V2');
    await agent.post(`/api/contract-versions/${first.id}/current`);

    const markCurrent = contractVersionRepository.markCurrent;
    jest.spyOn(contractVersionRepository, 'markCurrent').mockImplementation(async (...args) => {
      await markCurrent(...args);
      throw new Error('Simulated Current promotion failure');
    });

    const response = await agent.post(`/api/contract-versions/${second.id}/current`);
    const [rows] = await getPool().query('SELECT id FROM contract_versions WHERE is_current = TRUE');

    expect(response.status).toBe(500);
    expect(rows.map((row) => Number(row.id))).toEqual([first.id]);
  });

  test('requires authentication and OWNER authorization', async () => {
    const anonymousResponse = await request(app).get('/api/contract-versions');
    const ownerAgent = await loginAsOwner();
    const draft = await createDraft(ownerAgent, 'owner-only-delete');
    const frontDesk = request.agent(app);
    const frontDeskCredentials = getFrontDeskStaff();
    const loginResponse = await frontDesk.post('/api/auth/login').send({
      username: frontDeskCredentials.username,
      password: frontDeskCredentials.password,
    });
    const forbiddenResponse = await frontDesk.get('/api/contract-versions');
    const forbiddenDelete = await frontDesk.delete(`/api/contract-versions/${draft.id}`);

    expect(anonymousResponse.status).toBe(401);
    expect(loginResponse.status).toBe(200);
    expect(forbiddenResponse.status).toBe(403);
    expect(forbiddenDelete.status).toBe(403);
  });

  test('allows active FRONT_DESK and GROOMER staff to read Published PDFs but not upload', async () => {
    const ownerAgent = await loginAsOwner();
    const published = await createPublished(ownerAgent, 'staff-read');
    const frontDesk = await loginAsStaff(getFrontDeskStaff());
    const groomer = await loginAsStaff(groomerCredentials);
    const frontDeskRead = await frontDesk.get(`/api/contract-versions/${published.id}/pdf`);
    const groomerRead = await groomer.get(`/api/contract-versions/${published.id}/pdf`);
    const frontDeskUpload = await uploadPdf(frontDesk, published.id);
    const groomerUpload = await uploadPdf(groomer, published.id);

    expect(frontDeskRead.status).toBe(200);
    expect(Buffer.from(frontDeskRead.body)).toEqual(testPdf);
    expect(groomerRead.status).toBe(200);
    expect(Buffer.from(groomerRead.body)).toEqual(testPdf);
    expect(frontDeskUpload.status).toBe(403);
    expect(groomerUpload.status).toBe(403);
  });

  test('rejects PDF reads from unauthenticated users and for Draft versions', async () => {
    const agent = await loginAsOwner();
    const draft = await createDraft(agent, 'draft-read');
    await uploadPdf(agent, draft.id);

    const anonymousResponse = await request(app).get(`/api/contract-versions/${draft.id}/pdf`);
    const draftResponse = await agent.get(`/api/contract-versions/${draft.id}/pdf`);
    expect(anonymousResponse.status).toBe(401);
    expect(draftResponse.status).toBe(400);
  });
});