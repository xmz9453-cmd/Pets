const customerMemberService = require('../services/customer-member.service');
const { config } = require('../config/env');
const { getCustomerSessionToken } = require('../middleware/authenticate-customer-member');
const { getCurrentShopId } = require('../utils/shop-context');

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

function redirectWithResult(res, key, value) {
  const destination = new URL(process.env.CUSTOMER_AUTH_RETURN_URL || 'http://localhost:3000/booking');
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
    const result = await customerMemberService.startOAuth(
      req.params.provider,
      req.query.shop_id || req.get('x-shop-id'),
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
    const result = await customerMemberService.startOAuth(
      req.params.provider,
      req.query.shop_id || req.get('x-shop-id'),
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
  if (req.query.error) {
    redirectWithResult(res, 'member_error', 'login_cancelled');
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
      redirectWithResult(res, 'member_linked', '1');
      return;
    }
    setSessionCookie(res, result.token);
    redirectWithResult(res, 'member_login', '1');
  } catch (error) {
    if (error.code) {
      redirectWithResult(res, 'member_error', error.code);
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
