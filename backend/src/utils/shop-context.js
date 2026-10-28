const { AsyncLocalStorage } = require('async_hooks');

const requestStorage = new AsyncLocalStorage();

function requestContext(req, res, next) {
  requestStorage.run({ shopId: null }, next);
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

module.exports = { getCurrentShopId, requestContext, setCurrentShopId };
