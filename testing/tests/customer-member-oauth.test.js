process.env.NODE_ENV = 'test';

const crypto = require('crypto');
const customerMemberService = require('../../backend/src/services/customer-member.service');

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const jwk = publicKey.export({ format: 'jwk' });
const originalFetch = global.fetch;
const provider = {
  clientId: 'test-client-id',
  issuer: 'https://accounts.example.test',
  jwksUrl: 'https://identity.example.test/jwks',
};
const lineProvider = {
  name: 'LINE',
  clientId: 'line-channel-id',
  issuer: 'https://access.line.me',
};

function createToken(claimOverrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test-key' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({
    iss: provider.issuer,
    aud: provider.clientId,
    sub: 'provider-subject',
    exp: now + 300,
    iat: now,
    nonce: 'expected-nonce',
    ...claimOverrides,
  })).toString('base64url');
  const signedContent = `${header}.${claims}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signedContent), privateKey).toString('base64url');
  return `${signedContent}.${signature}`;
}

beforeAll(() => {
  global.fetch = jest.fn(async () => ({
    ok: true,
    headers: { get: () => 'max-age=300' },
    json: async () => ({ keys: [{ ...jwk, kid: 'test-key', use: 'sig' }] }),
  }));
});

afterAll(() => {
  if (originalFetch) global.fetch = originalFetch;
  else delete global.fetch;
});

describe('customer member OAuth ID token verification', () => {
  test('accepts a signed token with the expected issuer, audience, expiry, and nonce', async () => {
    await expect(customerMemberService.verifyIdToken(
      createToken(),
      provider,
      'expected-nonce',
    )).resolves.toMatchObject({ sub: 'provider-subject' });
  });

  test.each([
    ['issuer', { iss: 'https://unexpected.example.test' }],
    ['audience', { aud: 'another-client-id' }],
    ['expiry', { exp: Math.floor(Date.now() / 1000) - 1 }],
    ['nonce', { nonce: 'unexpected-nonce' }],
  ])('rejects a token with an invalid %s', async (_claim, claims) => {
    await expect(customerMemberService.verifyIdToken(
      createToken(claims),
      provider,
      'expected-nonce',
    )).rejects.toMatchObject({ code: 'CUSTOMER_AUTH_INVALID_ID_TOKEN' });
  });

  test('rejects a token with an invalid signature', async () => {
    const token = createToken();
    const parts = token.split('.');
    parts[2] = Buffer.alloc(256).toString('base64url');
    await expect(customerMemberService.verifyIdToken(
      parts.join('.'),
      provider,
      'expected-nonce',
    )).rejects.toMatchObject({ code: 'CUSTOMER_AUTH_INVALID_ID_TOKEN' });
  });

  test('verifies LINE ID tokens through the official endpoint with channel ID and nonce', async () => {
    const now = Math.floor(Date.now() / 1000);
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        iss: lineProvider.issuer,
        aud: lineProvider.clientId,
        sub: 'line-provider-subject',
        exp: now + 300,
        iat: now,
        nonce: 'expected-line-nonce',
      }),
    });

    await expect(customerMemberService.verifyIdToken(
      'LINE-issued-token',
      lineProvider,
      'expected-line-nonce',
    )).resolves.toMatchObject({ sub: 'line-provider-subject' });

    const [url, options] = global.fetch.mock.calls.at(-1);
    expect(url).toBe('https://api.line.me/oauth2/v2.1/verify');
    expect(options.method).toBe('POST');
    expect(options.body.get('client_id')).toBe(lineProvider.clientId);
    expect(options.body.get('id_token')).toBe('LINE-issued-token');
    expect(options.body.get('nonce')).toBe('expected-line-nonce');
  });

  test.each([
    ['issuer', { iss: 'https://unexpected.example.test' }],
    ['audience', { aud: 'another-client-id' }],
    ['expiry', { exp: Math.floor(Date.now() / 1000) - 1 }],
    ['nonce', { nonce: 'unexpected-nonce' }],
  ])('rejects LINE verification results with an invalid %s', async (_claim, claims) => {
    const now = Math.floor(Date.now() / 1000);
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        iss: lineProvider.issuer,
        aud: lineProvider.clientId,
        sub: 'line-provider-subject',
        exp: now + 300,
        iat: now,
        nonce: 'expected-line-nonce',
        ...claims,
      }),
    });

    await expect(customerMemberService.verifyIdToken(
      'LINE-issued-token',
      lineProvider,
      'expected-line-nonce',
    )).rejects.toMatchObject({ code: 'CUSTOMER_AUTH_INVALID_ID_TOKEN' });
  });

  test('rejects LINE tokens when the official verification endpoint rejects them', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 400 });
    await expect(customerMemberService.verifyIdToken(
      'LINE-issued-token',
      lineProvider,
      'expected-line-nonce',
    )).rejects.toMatchObject({ code: 'CUSTOMER_AUTH_INVALID_ID_TOKEN' });
  });

  test('reports LINE verification service failures without accepting the token', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 503 });
    await expect(customerMemberService.verifyIdToken(
      'LINE-issued-token',
      lineProvider,
      'expected-line-nonce',
    )).rejects.toMatchObject({ code: 'CUSTOMER_AUTH_PROVIDER_UNAVAILABLE' });
  });
});
