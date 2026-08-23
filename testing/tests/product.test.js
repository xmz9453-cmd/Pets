const request = require('supertest');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((line) => { const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/); if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2]; });
process.env.NODE_ENV = 'test'; process.env.DB_NAME = process.env.TEST_DB_NAME || 'psop_test';

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

async function createRoleStaff(roleCode) {
  sequence += 1;
  const username = `product-${roleCode.toLowerCase()}-${Date.now()}-${sequence}`;
  const password = 'product-test-password';
  const [staffResult] = await getPool().query(
    'INSERT INTO staff (username, password_hash, display_name, status) VALUES (?, ?, ?, \'ACTIVE\')',
    [username, await hashPassword(password), username],
  );
  const [roleRows] = await getPool().query('SELECT id FROM roles WHERE code = ?', [roleCode]);
  await getPool().query('INSERT INTO staff_roles (staff_id, role_id) VALUES (?, ?)', [staffResult.insertId, roleRows[0].id]);
  return login(username, password);
}

describe('Product API', () => {
  beforeAll(async () => { await setup(); });
  beforeEach(async () => { await getPool().query('DELETE FROM order_items'); await getPool().query('DELETE FROM products'); await getPool().query('DELETE FROM auth_sessions'); });
  afterAll(async () => { await closePool(); });

  test('owner can create, read, list, update, disable, and enable a product', async () => {
    const agent = await login();
    const created = await agent.post('/api/products').send({ name: '洗毛精', price: 300 });
    expect(created.status).toBe(201);
    const productId = created.body.data.product.id;
    expect(created.body.data.product).toMatchObject({ name: '洗毛精', price: 300, status: 'ACTIVE' });
    expect((await agent.get(`/api/products/${productId}`)).status).toBe(200);
    expect((await agent.get('/api/products')).body.data.products).toHaveLength(1);
    expect((await agent.patch(`/api/products/${productId}`)).status).toBe(200);
    expect((await agent.patch(`/api/products/${productId}`)).body.data.product.name).toBe('洗毛精');
    const updated = await agent.patch(`/api/products/${productId}`).send({ name: '護毛精', price: 350 });
    expect(updated.body.data.product).toMatchObject({ name: '護毛精', price: 350 });
    expect((await agent.post(`/api/products/${productId}/disable`)).body.data.product.status).toBe('INACTIVE');
    expect((await agent.post(`/api/products/${productId}/enable`)).body.data.product.status).toBe('ACTIVE');
  });

  test.each([
    [{ name: '   ', price: 100 }, 'name'],
    [{ name: '無效價格', price: 'abc' }, 'price'],
    [{ name: '零價格', price: 0 }, 'price'],
    [{ name: '負價格', price: -1 }, 'price'],
  ])('rejects invalid product payload %#', async (payload, field) => {
    const response = await (await login()).post('/api/products').send(payload);
    expect(response.status).toBe(400);
    expect(response.body.error.fields[field]).toBeDefined();
  });

  test.each(['FRONT_DESK', 'GROOMER'])('allows %s to read but not manage products', async (roleCode) => {
    const agent = await createRoleStaff(roleCode);
    expect((await agent.get('/api/products')).status).toBe(200);
    expect((await agent.post('/api/products').send({ name: `禁止商品${roleCode}`, price: 100 })).status).toBe(403);
  });
});
