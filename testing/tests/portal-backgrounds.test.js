const fs = require('fs');
const os = require('os');
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
const portalBackgroundStorageRoot = path.join(os.tmpdir(), `psop-portal-background-test-${process.pid}`);
process.env.PORTAL_BACKGROUND_STORAGE_ROOT = portalBackgroundStorageRoot;

const app = require('../../backend/src/app');
const { setup } = require('../../database/scripts/setup');
const { getPool, closePool } = require('../../backend/src/config/database');
const { getFoundationOwner } = require('../../database/seeds/staff-authentication-seed');
const { hashPassword } = require('../../backend/src/utils/password');

const owner = getFoundationOwner();
const pngBytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]);
const createdStaffIds = [];

async function login(username, password) {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/login').send({ username, password });
  return { agent, response };
}

describe('Portal background library API', () => {
  beforeAll(async () => {
    await setup();
    await getPool().query('DELETE FROM auth_sessions');
    await getPool().query('DELETE FROM portal_backgrounds');
    await getPool().query(
      'UPDATE portal_settings SET footer_text = ? WHERE id = 1',
      ['© 2026 毛孩生活服務｜保留所有權利'],
    );
    await getPool().query('UPDATE staff SET status = "ACTIVE" WHERE username = ?', [owner.username]);
  });

  afterEach(async () => {
    await getPool().query('DELETE FROM auth_sessions');
    await getPool().query('DELETE FROM portal_backgrounds');
    await getPool().query(
      'UPDATE portal_settings SET footer_text = ? WHERE id = 1',
      ['© 2026 毛孩生活服務｜保留所有權利'],
    );
    if (createdStaffIds.length) {
      await getPool().query('DELETE FROM staff WHERE id IN (?)', [createdStaffIds]);
      createdStaffIds.length = 0;
    }
  });

  afterAll(async () => {
    await closePool();
    await fs.promises.rm(portalBackgroundStorageRoot, { recursive: true, force: true });
  });

  test('public entry returns a neutral fallback until a manager selects an image', async () => {
    const selection = await request(app).get('/api/public/portal-background');
    const image = await request(app).get('/api/public/portal-background/image');
    const settings = await request(app).get('/api/public/portal-settings');

    expect(selection.status).toBe(200);
    expect(selection.body.data.background_url).toBeNull();
    expect(settings.status).toBe(200);
    expect(settings.body.data.footer_text).toBe('© 2026 毛孩生活服務｜保留所有權利');
    expect(image.status).toBe(404);
  });

  test('only the platform manager can update the public entry footer text', async () => {
    expect((await request(app).get('/api/portal-settings')).status).toBe(401);
    const { agent, response: loginResponse } = await login(owner.username, owner.password);
    expect(loginResponse.status).toBe(200);

    const settings = await agent.get('/api/portal-settings');
    expect(settings.status).toBe(200);
    expect(settings.body.data.footer_text).toBe('© 2026 毛孩生活服務｜保留所有權利');

    const updated = await agent.put('/api/portal-settings').send({
      footer_text: '© 2027 毛孩生活服務',
    });
    expect(updated.status).toBe(200);
    expect(updated.body.data.footer_text).toBe('© 2027 毛孩生活服務');
    expect((await request(app).get('/api/public/portal-settings')).body.data.footer_text)
      .toBe('© 2027 毛孩生活服務');

    const invalid = await agent.put('/api/portal-settings').send({
      footer_text: '字'.repeat(301),
    });
    expect(invalid.status).toBe(400);
    expect(invalid.body.success).toBe(false);
  });

  test('only the platform manager can upload, select, preview, and delete library images', async () => {
    const { agent, response: loginResponse } = await login(owner.username, owner.password);
    expect(loginResponse.status).toBe(200);
    expect((await request(app).get('/api/portal-backgrounds')).status).toBe(401);

    const uploaded = await agent.post('/api/portal-backgrounds')
      .attach('file', pngBytes, { filename: 'cat-dog.png', contentType: 'image/png' });
    expect(uploaded.status).toBe(201);
    expect(uploaded.body.data.background).toMatchObject({
      original_filename: 'cat-dog.png',
      mime_type: 'image/png',
      is_active: false,
    });
    expect(uploaded.body.data.background.storage_key).toBeUndefined();

    const id = uploaded.body.data.background.id;
    const library = await agent.get('/api/portal-backgrounds');
    expect(library.status).toBe(200);
    expect(library.body.data.backgrounds).toHaveLength(1);
    expect(library.body.data.backgrounds[0].storage_key).toBeUndefined();

    const managedPreview = await agent.get(`/api/portal-backgrounds/${id}/image`);
    expect(managedPreview.status).toBe(200);
    expect(managedPreview.headers['content-type']).toContain('image/png');
    expect(managedPreview.body).toEqual(pngBytes);

    const activated = await agent.put(`/api/portal-backgrounds/${id}/active`);
    expect(activated.status).toBe(200);
    expect(activated.body.data.background.is_active).toBe(true);

    const selection = await request(app).get('/api/public/portal-background');
    expect(selection.body.data.background_url).toBe('/api/public/portal-background/image');
    const publicImage = await request(app).get(selection.body.data.background_url);
    expect(publicImage.status).toBe(200);
    expect(publicImage.body).toEqual(pngBytes);

    const secondUpload = await agent.post('/api/portal-backgrounds')
      .attach('file', pngBytes, { filename: 'new-cat-dog.png', contentType: 'image/png' });
    expect(secondUpload.status).toBe(201);
    expect(secondUpload.body.data.background.is_active).toBe(false);
    const updatedLibrary = await agent.get('/api/portal-backgrounds');
    expect(updatedLibrary.body.data.backgrounds.find((background) => background.is_active).id).toBe(id);
    expect((await request(app).get('/api/public/portal-background')).body.data.background_url)
      .toBe('/api/public/portal-background/image');

    const deleted = await agent.delete(`/api/portal-backgrounds/${id}`);
    expect(deleted.status).toBe(200);
    expect((await request(app).get('/api/public/portal-background')).body.data.background_url).toBeNull();
  });

  test('store staff cannot manage the global background library', async () => {
    const username = `background-staff-${Date.now()}`;
    const [staff] = await getPool().query(
      'INSERT INTO staff (username, password_hash, display_name, status) VALUES (?, ?, ?, "ACTIVE")',
      [username, await hashPassword('background-pass-123'), 'Background Staff'],
    );
    createdStaffIds.push(staff.insertId);
    const [[role]] = await getPool().query('SELECT id FROM roles WHERE code = "FRONT_DESK"');
    await getPool().query('INSERT INTO staff_shop_memberships (staff_id, shop_id) VALUES (?, 1)', [staff.insertId]);
    await getPool().query(
      'INSERT INTO staff_shop_roles (staff_id, shop_id, role_id) VALUES (?, 1, ?)',
      [staff.insertId, role.id],
    );
    const { agent, response: loginResponse } = await login(username, 'background-pass-123');
    expect(loginResponse.status).toBe(200);
    expect((await agent.get('/api/portal-backgrounds')).status).toBe(403);
    expect((await agent.get('/api/portal-settings')).status).toBe(403);
  });
});
