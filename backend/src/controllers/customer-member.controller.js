const customerMemberService = require('../services/customer-member.service');
const { config } = require('../config/env');
const { getCustomerSessionToken } = require('../middleware/authenticate-customer-member');
const { getCurrentShopId } = require('../utils/shop-context');
const shopsRepository = require('../data/shops.repository');

function stateCookieName(provider) {
  return `customer_oauth_state_${String(provider).toUpperCase()}`;
}

function setSessionCookie(res, token) {
  res.cookie('customer_member_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    path: '/api',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function redirectWithResult(res, key, value, entryCode = null) {
  const returnUrl = process.env.CUSTOMER_AUTH_RETURN_URL || 'http://localhost:3000/booking';
  const destination = entryCode ? new URL(`/s/${encodeURIComponent(entryCode)}`, returnUrl) : new URL(returnUrl);
  destination.searchParams.set(key, value);
  res.redirect(303, destination.toString());
}

function getProviders(req, res) {
  res.status(200).json({
    success: true,
    data: { providers: customerMemberService.getAvailableProviders() },
  });
}

async function startLogin(req, res, next) {
  try {
    const shopId = req.query.entry_code
      ? await shopsRepository.getActiveShopIdByPublicEntryCode(String(req.query.entry_code))
      : req.query.shop_id || req.get('x-shop-id');
    const result = await customerMemberService.startOAuth(
      req.params.provider,
      shopId,
    );
    res.cookie(stateCookieName(result.provider), result.state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.nodeEnv === 'production',
      path: '/api/public/member',
      maxAge: 10 * 60 * 1000,
    });
    res.redirect(302, result.authorizationUrl);
  } catch (error) {
    next(error);
  }
}

async function startLink(req, res, next) {
  try {
    const shopId = req.query.entry_code
      ? await shopsRepository.getActiveShopIdByPublicEntryCode(String(req.query.entry_code))
      : req.query.shop_id || req.get('x-shop-id');
    const result = await customerMemberService.startOAuth(
      req.params.provider,
      shopId,
      getCustomerSessionToken(req),
      'LINK',
    );
    res.cookie(stateCookieName(result.provider), result.state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.nodeEnv === 'production',
      path: '/api/public/member',
      maxAge: 10 * 60 * 1000,
    });
    res.redirect(302, result.authorizationUrl);
  } catch (error) {
    next(error);
  }
}

async function callback(req, res, next) {
  const provider = String(req.params.provider || '').toUpperCase();
  const cookieName = stateCookieName(provider);
  const cookie = (req.headers.cookie || '')
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${cookieName}=`));
  const cookieState = cookie ? decodeURIComponent(cookie.slice(cookieName.length + 1)) : '';
  res.clearCookie(cookieName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    path: '/api/public/member',
  });
  let entryCode;
  try {
    entryCode = await customerMemberService.getOAuthEntryCode(req.query.state, provider);
  } catch (error) {
    next(error);
    return;
  }
  if (req.query.error) {
    redirectWithResult(res, 'member_error', 'login_cancelled', entryCode);
    return;
  }
  try {
    const result = await customerMemberService.finishOAuth(
      provider,
      req.query.state,
      cookieState,
      req.query.code,
    );
    if (result.intent === 'LINK') {
      redirectWithResult(res, 'member_linked', '1', result.entry_code || entryCode);
      return;
    }
    setSessionCookie(res, result.token);
    redirectWithResult(res, 'member_login', '1', result.entry_code || entryCode);
  } catch (error) {
    if (error.code) {
      redirectWithResult(res, 'member_error', error.code, entryCode);
      return;
    }
    next(error);
  }
}

async function getMe(req, res, next) {
  try {
    const result = await customerMemberService.getMember(
      getCustomerSessionToken(req),
      req.customerMember.shop_id,
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    const result = await customerMemberService.logout(getCustomerSessionToken(req), getCurrentShopId());
    res.clearCookie('customer_member_session', {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.nodeEnv === 'production',
      path: '/api',
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function linkCustomerRecord(req, res, next) {
  try {
    const result = await customerMemberService.linkCustomerRecord(req.params.id, req.body?.customer_member_id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  callback,
  getMe,
  getProviders,
  linkCustomerRecord,
  logout,
  startLink,
  startLogin,
};
