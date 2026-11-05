const service = require('../services/portal-backgrounds.service');

function sendSuccess(res, data, statusCode = 200) {
  res.status(statusCode).json({ success: true, data });
}

async function list(req, res, next) {
  try {
    sendSuccess(res, { backgrounds: await service.list() });
  } catch (error) {
    next(error);
  }
}

async function upload(req, res, next) {
  try {
    sendSuccess(res, { background: await service.upload(req.file, req.auth.staff.id) }, 201);
  } catch (error) {
    next(error);
  }
}

async function activate(req, res, next) {
  try {
    sendSuccess(res, { background: await service.activate(req.params.id) });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    sendSuccess(res, await service.remove(req.params.id));
  } catch (error) {
    next(error);
  }
}

async function getPublicSelection(req, res, next) {
  try {
    sendSuccess(res, await service.getPublicSelection());
  } catch (error) {
    next(error);
  }
}

async function getActiveImage(req, res, next) {
  try {
    const image = await service.getActiveImage();
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
    const image = await service.getManagedImage(req.params.id);
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
