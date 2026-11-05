const customerMemberService = require('../services/customer-member.service');
const { getCurrentShopId, setCurrentCustomerMemberId } = require('../utils/shop-context');

function getCustomerSessionToken(req) {
  const cookies = String(req.headers.cookie || '').split(';');
  const value = cookies.map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith('customer_member_session='));
  if (!value) return '';
  try {
    return decodeURIComponent(value.slice('customer_member_session='.length));
  } catch {
    return '';
  }
}

async function requireCustomerAuthentication(req, res, next) {
  try {
    const session = await customerMemberService.findActiveSession(getCustomerSessionToken(req), getCurrentShopId());
    setCurrentCustomerMemberId(session.customer_member_id, session.shop_id);
    req.customerMember = {
      id: Number(session.customer_member_id),
      shop_id: Number(session.shop_id),
      session_id: Number(session.id),
      display_name: session.display_name,
    };
    next();
  } catch (error) {
    next(error);
  }
}

async function optionalCustomerAuthentication(req, res, next) {
  if (!getCustomerSessionToken(req)) {
    next();
    return;
  }
  return requireCustomerAuthentication(req, res, next);
}

module.exports = {
  getCustomerSessionToken,
  optionalCustomerAuthentication,
  requireCustomerAuthentication,
};
