const request = require('supertest');

jest.mock('../../backend/src/data/shops.repository', () => ({
  getShopById: jest.fn(async (id) => ({ id: Number(id), status: 'ACTIVE' })),
}));

const app = require('../../backend/src/app');

describe('Public booking compatibility', () => {
  test.each([
    ['/api/public/booking/otp', { phone: '0912345678' }],
    ['/api/public/booking/otp/verify', { phone: '0912345678', code: '123456' }],
  ])('keeps the retired OTP endpoint explicitly disabled: %s', async (path, body) => {
    const response = await request(app)
      .post(path)
      .send(body)
      .expect(410);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'BOOKING_OTP_DISABLED',
        message: '預約不使用簡訊驗證，請改以會員登入。若登入方式尚未設定，請聯絡店家。',
      },
    });
  });

  test('keeps member-authenticated booking routes available', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = await request(app)
        .get('/api/public/member/pets')
        .set('X-Shop-Id', '1')
        .expect(401);
      expect(response.body.error.code).toBe('CUSTOMER_SESSION_INVALID');
    } finally {
      consoleError.mockRestore();
    }
  });
});
