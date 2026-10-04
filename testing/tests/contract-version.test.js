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
const { getFoundationOwner, getFrontDeskStaff } = require('../../database/seeds/staff-authentication-seed');
const contractVersionRepository = require('../../backend/src/data/contract-version.repository');

const owner = getFoundationOwner();

async function loginAsOwner() {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/login').send({
    username: owner.username,
    password: owner.password,
  });
  expect(response.status).toBe(200);
  return agent;
}

function contractPayload(versionLabel) {
  return {
    version_label: versionLabel,
    file_name: `${versionLabel}.pdf`,
    mime_type: 'application/pdf',
    file_size: 2048,
    storage_path: `contracts/${versionLabel}.pdf`,
    file_hash: 'a'.repeat(64),
  };
}

async function createDraft(agent, versionLabel = `V-${Date.now()}`) {
  const response = await agent.post('/api/contract-versions').send(contractPayload(versionLabel));
  expect(response.status).toBe(201);
  return response.body.data.contract_version;
}

async function createPublished(agent, versionLabel) {
  const draft = await createDraft(agent, versionLabel);
  const response = await agent.post(`/api/contract-versions/${draft.id}/publish`);
  expect(response.status).toBe(200);
  return response.body.data.contract_version;
}

async function cleanContractVersions() {
  await getPool().query('DELETE FROM contract_versions');
  await getPool().query('DELETE FROM auth_sessions');
}

describe('Contract Version API', () => {
  beforeAll(async () => {
    await setup();
    await cleanContractVersions();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await cleanContractVersions();
  });

  afterAll(async () => {
    await closePool();
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

  test('updates DRAFT metadata and rejects duplicate version labels', async () => {
    const agent = await loginAsOwner();
    const draft = await createDraft(agent, 'V1');
    const secondDraft = await createDraft(agent, 'V2');

    const updateResponse = await agent.patch(`/api/contract-versions/${draft.id}`).send({
      version_label: 'V1-revised',
      file_name: 'updated.pdf',
    });
    const duplicateResponse = await agent.patch(`/api/contract-versions/${secondDraft.id}`).send({
      version_label: 'V1-revised',
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.contract_version).toMatchObject({
      version_label: 'V1-revised',
      file_name: 'updated.pdf',
    });
    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body.error.code).toBe('CONTRACT_VERSION_LABEL_EXISTS');
  });

  test('publishes a complete PDF metadata record and makes published content immutable', async () => {
    const agent = await loginAsOwner();
    const draft = await createDraft(agent, 'V1');

    const publishResponse = await agent.post(`/api/contract-versions/${draft.id}/publish`);
    const updateResponse = await agent.patch(`/api/contract-versions/${draft.id}`).send({ version_label: 'V1-edited' });
    const republishResponse = await agent.post(`/api/contract-versions/${draft.id}/publish`);

    expect(publishResponse.status).toBe(200);
    expect(publishResponse.body.data.contract_version.status).toBe('PUBLISHED');
    expect(updateResponse.status).toBe(400);
    expect(republishResponse.status).toBe(400);
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

    expect(detailResponse.status).toBe(404);
    expect(detailResponse.body.error.code).toBe('CONTRACT_VERSION_NOT_FOUND');
    expect(publishResponse.status).toBe(404);
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
    const frontDesk = request.agent(app);
    const frontDeskCredentials = getFrontDeskStaff();
    const loginResponse = await frontDesk.post('/api/auth/login').send({
      username: frontDeskCredentials.username,
      password: frontDeskCredentials.password,
    });
    const forbiddenResponse = await frontDesk.get('/api/contract-versions');

    expect(anonymousResponse.status).toBe(401);
    expect(loginResponse.status).toBe(200);
    expect(forbiddenResponse.status).toBe(403);
  });
});