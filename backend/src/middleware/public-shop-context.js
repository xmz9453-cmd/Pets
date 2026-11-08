const shopsRepository = require('../data/shops.repository');
const { setCurrentShopId } = require('../utils/shop-context');

async function publicShopContext(req, res, next) {
  try {
    const requestedEntryCode = req.get('x-shop-entry-code') || req.query.entry_code;
    let requestedShopId;
    if (requestedEntryCode) {
      requestedShopId = await shopsRepository.getActiveShopIdByPublicEntryCode(requestedEntryCode);
      if (!requestedShopId) {
        const error = new Error('Shop is unavailable');
        error.statusCode = 404;
        return next(error);
      }
    } else {
      requestedShopId = req.get('x-shop-id') || req.query.shop_id || '1';
    }
    if (!/^\d+$/.test(String(requestedShopId))) {
      const error = new Error('Shop is unavailable');
      error.statusCode = 404;
      return next(error);
    }
    const shop = await shopsRepository.getShopById(Number(requestedShopId));
    if (!shop || shop.status !== 'ACTIVE') {
      const error = new Error('Shop is unavailable');
      error.statusCode = 404;
      return next(error);
    }
    setCurrentShopId(shop.id);
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { publicShopContext };
