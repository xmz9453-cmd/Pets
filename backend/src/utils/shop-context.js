const { AsyncLocalStorage } = require('async_hooks');

const requestStorage = new AsyncLocalStorage();

function requestContext(req, res, next) {
  requestStorage.run({ shopId: null, customerMemberId: null, customerMemberShopId: null }, next);
}

function setCurrentShopId(shopId) {
  const context = requestStorage.getStore();
  if (!context) {
    throw new Error('Shop context is not available for this request');
  }
  context.shopId = Number(shopId);
}

function getCurrentShopId() {
  const context = requestStorage.getStore();
  return Number.isInteger(context?.shopId) && context.shopId > 0 ? context.shopId : null;
}

function setCurrentCustomerMemberId(memberId, shopId) {
  const context = requestStorage.getStore();
  if (!context) {
    throw new Error('Request context is not available');
  }
  context.customerMemberId = Number(memberId);
  context.customerMemberShopId = Number(shopId);
}

function getCurrentCustomerMemberId() {
  const context = requestStorage.getStore();
  return Number.isInteger(context?.customerMemberId) && context.customerMemberId > 0
    ? context.customerMemberId
    : null;
}

function getCurrentCustomerShopId() {
  const context = requestStorage.getStore();
  return Number.isInteger(context?.customerMemberShopId) && context.customerMemberShopId > 0
    ? context.customerMemberShopId
    : null;
}

module.exports = {
  getCurrentCustomerMemberId,
  getCurrentCustomerShopId,
  getCurrentShopId,
  requestContext,
  setCurrentCustomerMemberId,
  setCurrentShopId,
};
