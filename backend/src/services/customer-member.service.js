const crypto = require('crypto');
const { getPool } = require('../config/database');
const shopsRepository = require('../data/shops.repository');
const { createSessionToken, hashSessionToken } = require('../utils/session-token');
const { getCurrentShopId } = require('../utils/shop-context');

const SESSION_LIFETIME_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;
const OAUTH_STATE_LIFETIME_MILLISECONDS = 10 * 60 * 1000;
const MAX_CLOCK_SKEW_SECONDS = 60;
const LINE_ID_TOKEN_VERIFICATION_URL = 'https://api.line.me/oauth2/v2.1/verify';
const JWKS_CACHE = new Map();

const PROVIDERS = {
  LINE: {
    authorizationUrl: 'https://access.line.me/oauth2/v2.1/authorize',
    tokenUrl: 'https://api.line.me/oauth2/v2.1/token',
    jwksUrl: 'https://api.line.me/oauth2/v2.1/certs',
    issuer: 'https://access.line.me',
    clientIdEnv: 'LINE_LOGIN_CHANNEL_ID',
    clientSecretEnv: 'LINE_LOGIN_CHANNEL_SECRET',
    callbackUrlEnv: 'LINE_LOGIN_CALLBACK_URL',
  },
  GOOGLE: {
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
    issuer: 'https://accounts.google.com',
    clientIdEnv: 'GOOGLE_OAUTH_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_OAUTH_CLIENT_SECRET',
    callbackUrlEnv: 'GOOGLE_OAUTH_CALLBACK_URL',
  },
};

function createError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function getProvider(provider) {
  const normalized = String(provider || '').toUpperCase();
  const config = PROVIDERS[normalized];
  if (!config) throw createError('不支援此登入方式。', 400, 'CUSTOMER_AUTH_PROVIDER_INVALID');
  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];
  const redirectUri = process.env[config.callbackUrlEnv];
  if (!clientId || !clientSecret || !redirectUri) {
    throw createError('此登入方式尚未完成設定，請改用其他已開放的登入方式。', 503, 'CUSTOMER_AUTH_PROVIDER_NOT_CONFIGURED');
  }
  return { ...config, name: normalized, clientId, clientSecret, redirectUri };
}

function getAvailableProviders() {
  return Object.fromEntries(Object.entries(PROVIDERS).map(([name, provider]) => [
    name,
    Boolean(
      process.env[provider.clientIdEnv]
      && process.env[provider.clientSecretEnv]
      && process.env[provider.callbackUrlEnv],
    ),
  ]));
}

function parseJwtPart(value) {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch {
    throw createError('登入驗證未成功，請重新嘗試。', 401, 'CUSTOMER_AUTH_INVALID_ID_TOKEN');
  }
}

async function getJwks(provider) {
  const now = Date.now();
  const cached = JWKS_CACHE.get(provider.jwksUrl);
  if (cached && cached.expiresAt > now) return cached.keys;

  const response = await fetch(provider.jwksUrl, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw createError('目前無法驗證登入資料，請稍後再試。', 503, 'CUSTOMER_AUTH_PROVIDER_UNAVAILABLE');
  const body = await response.json();
  if (!Array.isArray(body.keys)) throw createError('目前無法驗證登入資料，請稍後再試。', 503, 'CUSTOMER_AUTH_PROVIDER_UNAVAILABLE');
  const cacheControl = response.headers.get('cache-control') || '';
  const maxAge = Number(cacheControl.match(/max-age=(\d+)/i)?.[1] || 300);
  JWKS_CACHE.set(provider.jwksUrl, {
    keys: body.keys,
    expiresAt: now + Math.min(Math.max(maxAge, 60), 3600) * 1000,
  });
  return body.keys;
}

async function verifyIdToken(idToken, provider, nonce) {
  if (typeof idToken !== 'string') {
    throw createError('登入驗證未成功，請重新嘗試。', 401, 'CUSTOMER_AUTH_INVALID_ID_TOKEN');
  }
  if (provider.name === 'LINE') {
    let response;
    try {
      response = await fetch(LINE_ID_TOKEN_VERIFICATION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          id_token: idToken,
          client_id: provider.clientId,
          nonce,
        }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw createError('目前無法驗證登入資料，請稍後再試。', 503, 'CUSTOMER_AUTH_PROVIDER_UNAVAILABLE');
    }

    if (!response.ok) {
      if (response.status >= 500 || response.status === 429) {
        throw createError('目前無法驗證登入資料，請稍後再試。', 503, 'CUSTOMER_AUTH_PROVIDER_UNAVAILABLE');
      }
      throw createError('登入驗證未成功，請重新嘗試。', 401, 'CUSTOMER_AUTH_INVALID_ID_TOKEN');
    }

    let claims;
    try {
      claims = await response.json();
    } catch {
      throw createError('目前無法驗證登入資料，請稍後再試。', 503, 'CUSTOMER_AUTH_PROVIDER_UNAVAILABLE');
    }
    if (!claims || typeof claims !== 'object' || Array.isArray(claims)) {
      throw createError('目前無法驗證登入資料，請稍後再試。', 503, 'CUSTOMER_AUTH_PROVIDER_UNAVAILABLE');
    }
    const now = Math.floor(Date.now() / 1000);
    if (claims.iss !== provider.issuer
      || claims.aud !== provider.clientId
      || typeof claims.sub !== 'string'
      || claims.sub.length < 1
      || claims.sub.length > 255
      || !Number.isFinite(claims.exp)
      || claims.exp <= now
      || !Number.isFinite(claims.iat)
      || claims.iat > now + MAX_CLOCK_SKEW_SECONDS
      || claims.nonce !== nonce) {
      throw createError('登入驗證未成功，請重新嘗試。', 401, 'CUSTOMER_AUTH_INVALID_ID_TOKEN');
    }
    return claims;
  }

  const parts = idToken.split('.');
  if (parts.length !== 3) throw createError('登入驗證未成功，請重新嘗試。', 401, 'CUSTOMER_AUTH_INVALID_ID_TOKEN');
  const header = parseJwtPart(parts[0]);
  const claims = parseJwtPart(parts[1]);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') {
    throw createError('登入驗證未成功，請重新嘗試。', 401, 'CUSTOMER_AUTH_INVALID_ID_TOKEN');
  }

  const keys = await getJwks(provider);
  const jwk = keys.find((candidate) => candidate.kid === header.kid && candidate.kty === 'RSA' && candidate.use !== 'enc');
  if (!jwk) {
    JWKS_CACHE.delete(provider.jwksUrl);
    throw createError('登入驗證未成功，請重新嘗試。', 401, 'CUSTOMER_AUTH_INVALID_ID_TOKEN');
  }
  let validSignature = false;
  try {
    const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    validSignature = crypto.verify(
      'RSA-SHA256',
      Buffer.from(`${parts[0]}.${parts[1]}`),
      publicKey,
      Buffer.from(parts[2], 'base64url'),
    );
  } catch {
    validSignature = false;
  }

  const now = Math.floor(Date.now() / 1000);
  const audienceMatches = claims.aud === provider.clientId
    || (Array.isArray(claims.aud) && claims.aud.includes(provider.clientId));
  const authorizedPartyMatches = !Array.isArray(claims.aud)
    || claims.aud.length === 1
    || claims.azp === provider.clientId;
  if (!validSignature
    || claims.iss !== provider.issuer
    || !audienceMatches
    || !authorizedPartyMatches
    || typeof claims.sub !== 'string'
    || claims.sub.length < 1
    || claims.sub.length > 255
    || !Number.isFinite(claims.exp)
    || claims.exp <= now
    || !Number.isFinite(claims.iat)
    || claims.iat > now + MAX_CLOCK_SKEW_SECONDS
    || (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > now + MAX_CLOCK_SKEW_SECONDS))
    || claims.nonce !== nonce) {
    throw createError('登入驗證未成功，請重新嘗試。', 401, 'CUSTOMER_AUTH_INVALID_ID_TOKEN');
  }
  return claims;
}

async function exchangeCode(code, provider) {
  if (typeof code !== 'string' || !code) {
    throw createError('登入資料不完整，請重新嘗試。', 400, 'CUSTOMER_AUTH_INVALID_CALLBACK');
  }
  const response = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: provider.redirectUri,
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw createError('登入驗證未成功，請重新嘗試。', 401, 'CUSTOMER_AUTH_CODE_EXCHANGE_FAILED');
  const body = await response.json();
  return body.id_token;
}

async function startOAuth(providerName, shopIdValue, cookieToken = '', intent = 'LOGIN') {
  const provider = getProvider(providerName);
  const shopId = Number(shopIdValue);
  if (!Number.isInteger(shopId) || shopId <= 0) throw createError('找不到指定的店家。', 404, 'SHOP_NOT_FOUND');
  const shop = await shopsRepository.getShopById(shopId);
  if (!shop || shop.status !== 'ACTIVE') throw createError('找不到指定的店家。', 404, 'SHOP_NOT_FOUND');

  let memberId = null;
  let sessionId = null;
  if (intent === 'LINK') {
    const session = await findActiveSession(cookieToken, shopId);
    const authenticatedAt = new Date(session.authenticated_at).getTime();
    if (Date.now() - authenticatedAt > 5 * 60 * 1000) {
      throw createError('請重新登入後，再連結其他登入方式。', 401, 'CUSTOMER_AUTH_REAUTH_REQUIRED');
    }
    memberId = Number(session.customer_member_id);
    sessionId = Number(session.id);
  } else if (intent !== 'LOGIN') {
    throw createError('登入要求無效，請重新嘗試。', 400, 'CUSTOMER_AUTH_INVALID_CALLBACK');
  }

  const state = crypto.randomBytes(32).toString('base64url');
  const nonce = crypto.randomBytes(32).toString('base64url');
  await getPool().query(
    `INSERT INTO customer_member_oauth_states
      (shop_id, provider, state_hash, nonce, intent, customer_member_id, session_id, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 MINUTE))`,
    [
      shopId,
      provider.name,
      hashSessionToken(state),
      nonce,
      intent,
      memberId,
      sessionId,
    ],
  );

  const authorizationUrl = new URL(provider.authorizationUrl);
  authorizationUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: provider.clientId,
    redirect_uri: provider.redirectUri,
    scope: provider.name === 'LINE' ? 'openid profile' : 'openid profile',
    state,
    nonce,
    prompt: provider.name === 'LINE' ? 'consent' : 'select_account',
  }).toString();
  return { authorizationUrl: authorizationUrl.toString(), state, provider: provider.name };
}

async function consumeOAuthState(state, cookieState, providerName) {
  if (typeof state !== 'string' || !state || state !== cookieState) {
    throw createError('登入要求已失效，請重新開始。', 400, 'CUSTOMER_AUTH_STATE_INVALID');
  }
  const stateHash = hashSessionToken(state);
  const [rows] = await getPool().query(
    `SELECT id, shop_id, provider, nonce, intent, customer_member_id, session_id
     FROM customer_member_oauth_states
     WHERE state_hash = ? AND provider = ? AND expires_at > UTC_TIMESTAMP()
     LIMIT 1`,
    [stateHash, providerName],
  );
  if (!rows[0]) throw createError('登入要求已失效，請重新開始。', 400, 'CUSTOMER_AUTH_STATE_INVALID');
  const [deleted] = await getPool().query(
    'DELETE FROM customer_member_oauth_states WHERE id = ?',
    [rows[0].id],
  );
  if (!deleted.affectedRows) throw createError('登入要求已使用，請重新開始。', 400, 'CUSTOMER_AUTH_STATE_INVALID');
  return rows[0];
}

async function getOAuthEntryCode(state, providerName) {
  if (typeof state !== 'string' || !state) return null;
  const [rows] = await getPool().query(
    `SELECT shop_id FROM customer_member_oauth_states
     WHERE state_hash = ? AND provider = ? AND expires_at > UTC_TIMESTAMP()
     LIMIT 1`,
    [hashSessionToken(state), providerName],
  );
  if (!rows[0]) return null;
  return shopsRepository.getPublicEntryCodeByShopId(rows[0].shop_id);
}

async function createMemberSession(connection, shopId, memberId) {
  const token = createSessionToken();
  const [result] = await connection.query(
    `INSERT INTO customer_member_sessions
       (shop_id, customer_member_id, token_hash, authenticated_at, expires_at)
     VALUES (?, ?, ?, UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 DAY))`,
    [shopId, memberId, hashSessionToken(token)],
  );
  return { token, id: Number(result.insertId) };
}

async function finishOAuth(providerName, state, cookieState, code) {
  const provider = getProvider(providerName);
  const pending = await consumeOAuthState(state, cookieState, provider.name);
  const claims = await verifyIdToken(await exchangeCode(code, provider), provider, pending.nonce);
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    if (pending.intent === 'LINK') {
      const [sessions] = await connection.query(
        `SELECT id, customer_member_id
         FROM customer_member_sessions
         WHERE id = ? AND shop_id = ? AND customer_member_id = ?
           AND status = 'ACTIVE' AND expires_at > UTC_TIMESTAMP()
         LIMIT 1 FOR UPDATE`,
        [pending.session_id, pending.shop_id, pending.customer_member_id],
      );
      if (!sessions.length) {
        throw createError('登入工作階段已失效，請重新登入後再連結。', 401, 'CUSTOMER_SESSION_INVALID');
      }
      const [existingIdentity] = await connection.query(
        `SELECT customer_member_id FROM customer_member_identities
         WHERE provider = ? AND provider_subject = ? LIMIT 1 FOR UPDATE`,
        [provider.name, claims.sub],
      );
      if (existingIdentity.length) {
        if (Number(existingIdentity[0].customer_member_id) !== Number(pending.customer_member_id)) {
          throw createError('此登入方式已連結至其他會員，無法自動合併。', 409, 'CUSTOMER_AUTH_IDENTITY_IN_USE');
        }
        await connection.commit();
        return {
          intent: 'LINK',
          shop_id: Number(pending.shop_id),
          entry_code: await shopsRepository.getPublicEntryCodeByShopId(pending.shop_id),
          token: null,
        };
      }
      const [memberIdentity] = await connection.query(
        `SELECT id FROM customer_member_identities
         WHERE customer_member_id = ? AND provider = ? LIMIT 1 FOR UPDATE`,
        [pending.customer_member_id, provider.name],
      );
      if (memberIdentity.length) {
        throw createError('此會員已連結相同的登入方式。', 409, 'CUSTOMER_AUTH_PROVIDER_ALREADY_LINKED');
      }
      await connection.query(
        `INSERT INTO customer_member_identities (customer_member_id, provider, provider_subject)
         VALUES (?, ?, ?)`,
        [pending.customer_member_id, provider.name, claims.sub],
      );
      await connection.commit();
      return {
        intent: 'LINK',
        shop_id: Number(pending.shop_id),
        entry_code: await shopsRepository.getPublicEntryCodeByShopId(pending.shop_id),
        token: null,
      };
    }

    const [identities] = await connection.query(
      `SELECT cm.id, cm.display_name, cm.status
       FROM customer_member_identities cmi
       INNER JOIN customer_members cm ON cm.id = cmi.customer_member_id
       WHERE cmi.provider = ? AND cmi.provider_subject = ?
       LIMIT 1 FOR UPDATE`,
      [provider.name, claims.sub],
    );
    let member = identities[0];
    if (!member) {
      const displayName = typeof claims.name === 'string' && claims.name.trim()
        ? claims.name.trim().slice(0, 100)
        : null;
      const [memberResult] = await connection.query(
        'INSERT INTO customer_members (display_name) VALUES (?)',
        [displayName],
      );
      const memberId = Number(memberResult.insertId);
      await connection.query(
        `INSERT INTO customer_member_identities (customer_member_id, provider, provider_subject)
         VALUES (?, ?, ?)`,
        [memberId, provider.name, claims.sub],
      );
      member = { id: memberId, display_name: displayName, status: 'ACTIVE' };
    }
    if (member.status !== 'ACTIVE') {
      throw createError('此會員目前無法登入，請聯絡店家。', 403, 'CUSTOMER_MEMBER_INACTIVE');
    }
    const session = await createMemberSession(connection, Number(pending.shop_id), Number(member.id));
    await connection.commit();
    return {
      intent: 'LOGIN',
      shop_id: Number(pending.shop_id),
      entry_code: await shopsRepository.getPublicEntryCodeByShopId(pending.shop_id),
      token: session.token,
      member: { id: Number(member.id), display_name: member.display_name },
    };
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      throw createError('此登入方式已連結至其他會員，無法自動合併。', 409, 'CUSTOMER_AUTH_IDENTITY_IN_USE');
    }
    throw error;
  } finally {
    connection.release();
  }
}

async function findActiveSession(token, shopId = null) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    throw createError('請先登入會員。', 401, 'CUSTOMER_SESSION_INVALID');
  }
  const params = [hashSessionToken(token)];
  let shopCondition = '';
  if (shopId !== null) {
    shopCondition = ' AND cms.shop_id = ?';
    params.push(Number(shopId));
  }
  const [rows] = await getPool().query(
    `SELECT cms.id, cms.shop_id, cms.customer_member_id, cms.authenticated_at,
            cm.display_name
     FROM customer_member_sessions cms
     INNER JOIN customer_members cm ON cm.id = cms.customer_member_id
     WHERE cms.token_hash = ? AND cms.status = 'ACTIVE'
       AND cms.expires_at > UTC_TIMESTAMP() AND cm.status = 'ACTIVE'${shopCondition}
     LIMIT 1`,
    params,
  );
  if (!rows[0]) throw createError('登入工作階段已失效，請重新登入。', 401, 'CUSTOMER_SESSION_INVALID');
  return rows[0];
}

async function getMember(token, shopId) {
  const session = await findActiveSession(token, shopId);
  const [customers] = await getPool().query(
    `SELECT c.id, c.name, c.phone
     FROM customer_member_profiles cmp
     INNER JOIN customers c ON c.id = cmp.customer_id AND c.shop_id = cmp.shop_id
     WHERE cmp.shop_id = ? AND cmp.customer_member_id = ? AND c.status = 'ACTIVE'
     LIMIT 1`,
    [shopId, session.customer_member_id],
  );
  const [identities] = await getPool().query(
    `SELECT provider FROM customer_member_identities
     WHERE customer_member_id = ? ORDER BY provider`,
    [session.customer_member_id],
  );
  return {
    member: {
      id: Number(session.customer_member_id),
      display_name: session.display_name,
      linked_providers: identities.map((identity) => identity.provider),
      can_link_provider: Date.now() - new Date(session.authenticated_at).getTime() <= 5 * 60 * 1000,
    },
    customer: customers[0] || null,
  };
}

async function logout(token, shopId) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return { logged_out: true };
  await getPool().query(
    `UPDATE customer_member_sessions SET status = 'REVOKED'
     WHERE token_hash = ? AND shop_id = ? AND status = 'ACTIVE'`,
    [hashSessionToken(token), shopId],
  );
  return { logged_out: true };
}

async function linkCustomerRecord(customerIdValue, memberIdValue) {
  const shopId = getCurrentShopId();
  const customerId = Number(customerIdValue);
  const memberId = Number(memberIdValue);
  if (!Number.isInteger(customerId) || customerId <= 0
    || !Number.isInteger(memberId) || memberId <= 0) {
    throw createError('請確認客戶與會員編號。', 400, 'VALIDATION_ERROR');
  }
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const [customers] = await connection.query(
      `SELECT id FROM customers
       WHERE id = ? AND shop_id = ? AND status = 'ACTIVE'
       LIMIT 1 FOR UPDATE`,
      [customerId, shopId],
    );
    const [members] = await connection.query(
      `SELECT id FROM customer_members
       WHERE id = ? AND status = 'ACTIVE'
       LIMIT 1 FOR UPDATE`,
      [memberId],
    );
    if (!customers.length) throw createError('找不到指定的客戶資料。', 404, 'CUSTOMER_NOT_FOUND');
    if (!members.length) throw createError('找不到指定的會員資料。', 404, 'CUSTOMER_MEMBER_NOT_FOUND');

    const [existing] = await connection.query(
      `SELECT customer_member_id FROM customer_member_customers
       WHERE shop_id = ? AND customer_id = ?
       LIMIT 1 FOR UPDATE`,
      [shopId, customerId],
    );
    if (existing.length && Number(existing[0].customer_member_id) !== memberId) {
      throw createError('此客戶資料已連結至其他會員，請先完成店內核對。', 409, 'CUSTOMER_MEMBER_LINK_CONFLICT');
    }
    if (!existing.length) {
      await connection.query(
        `INSERT INTO customer_member_customers (shop_id, customer_member_id, customer_id)
         VALUES (?, ?, ?)`,
        [shopId, memberId, customerId],
      );
    }
    const [profile] = await connection.query(
      `SELECT customer_id FROM customer_member_profiles
       WHERE shop_id = ? AND customer_member_id = ?
       LIMIT 1 FOR UPDATE`,
      [shopId, memberId],
    );
    if (!profile.length) {
      await connection.query(
        `INSERT INTO customer_member_profiles (shop_id, customer_member_id, customer_id)
         VALUES (?, ?, ?)`,
        [shopId, memberId, customerId],
      );
    }
    await connection.commit();
    return { linked: true, customer_id: customerId, customer_member_id: memberId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  finishOAuth,
  findActiveSession,
  getAvailableProviders,
  getOAuthEntryCode,
  getMember,
  linkCustomerRecord,
  logout,
  startOAuth,
  verifyIdToken,
};
