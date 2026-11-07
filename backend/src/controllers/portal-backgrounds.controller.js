const service = require('../services/portal-backgrounds.service');
const shopsRepository = require('../data/shops.repository');

function sendSuccess(res, data, statusCode = 200) {
  res.status(statusCode).json({ success: true, data });
}

async function getActiveShopId(code) {
  const shopId = await shopsRepository.getActiveShopIdByPublicEntryCode(code);
  if (!shopId) {
    const error = new Error('Shop is unavailable');
    error.statusCode = 404;
    throw error;
  }
  return shopId;
}

async function list(req, res, next) {
  try {
    sendSuccess(res, { backgrounds: await service.list(req.auth.staff.shop_id) });
  } catch (error) {
    next(error);
  }
}

async function upload(req, res, next) {
  try {
    sendSuccess(res, {
      background: await service.upload(req.file, req.auth.staff.id, req.auth.staff.shop_id),
    }, 201);
  } catch (error) {
    next(error);
  }
}

async function activate(req, res, next) {
  try {
    sendSuccess(res, { background: await service.activate(req.params.id, req.auth.staff.shop_id) });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    sendSuccess(res, await service.remove(req.params.id, req.auth.staff.shop_id));
  } catch (error) {
    next(error);
  }
}

async function getPublicSelection(req, res, next) {
  try {
    const shopId = await getActiveShopId(req.params.code);
    sendSuccess(res, await service.getPublicSelection(shopId, req.params.code));
  } catch (error) {
    next(error);
  }
}

async function getActiveImage(req, res, next) {
  try {
    const shopId = await getActiveShopId(req.params.code);
    const image = await service.getActiveImage(shopId);
    res.status(200)
      .set('Content-Type', image.mimeType)
      .set('X-Content-Type-Options', 'nosniff')
      .set('Cache-Control', 'no-store')
      .send(image.bytes);
  } catch (error) {
    next(error);
  }
}

async function getManagedImage(req, res, next) {
  try {
    const image = await service.getManagedImage(req.params.id, req.auth.staff.shop_id);
    res.status(200)
      .set('Content-Type', image.mimeType)
      .set('X-Content-Type-Options', 'nosniff')
      .set('Cache-Control', 'private, no-store')
      .send(image.bytes);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  activate,
  getActiveImage,
  getManagedImage,
  getPublicSelection,
  list,
  remove,
  upload,
};
