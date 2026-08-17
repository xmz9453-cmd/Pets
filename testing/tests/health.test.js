const request = require('supertest');

jest.mock('../../backend/src/data/health.repository', () => ({
  verifyDatabaseConnection: jest.fn().mockResolvedValue(true),
}));

const app = require('../../backend/src/app');

describe('Foundation health API', () => {
  test('GET /api/health returns application health', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        status: 'ok',
        service: 'psop-mvp-backend',
      },
    });
  });

  test('GET /api/health/database returns database health response shape', async () => {
    const response = await request(app).get('/api/health/database');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        status: 'ok',
        database: 'connected',
      },
    });
  });

  test('unknown API route returns consistent error response', async () => {
    const response = await request(app).get('/api/unknown-foundation-route');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: {
        message: 'Not found',
      },
    });
  });
});
