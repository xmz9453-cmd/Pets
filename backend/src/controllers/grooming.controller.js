const groomingService = require('../services/grooming.service');

function sendSuccess(res, payload, statusCode = 200) {
  res.status(statusCode).json({
    success: true,
    data: payload,
  });
}

async function listGroomings(req, res, next) {
  try {
    const result = await groomingService.listGroomings(req.query || {});
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function getGrooming(req, res, next) {
  try {
    const result = await groomingService.getGrooming(req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function createGrooming(req, res, next) {
  try {
    const result = await groomingService.createGrooming(req.body || {});
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

async function updateGrooming(req, res, next) {
  try {
    const result = await groomingService.updateGrooming(req.params.id, req.body || {});
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function completeGrooming(req, res, next) {
  try {
    const result = await groomingService.completeGrooming(req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function addGroomingPhoto(req, res, next) {
  try {
    const result = await groomingService.addGroomingPhoto(req.params.id, req.file, req.body?.category);
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

async function removeGroomingPhoto(req, res, next) {
  try {
    sendSuccess(res, await groomingService.removeGroomingPhoto(req.params.id, req.params.photoId));
  } catch (error) {
    next(error);
  }
}

async function getGroomingPhotoImage(req, res, next) {
  try {
    const image = await groomingService.getGroomingPhotoImage(req.params.id, req.params.photoId);
    res.status(200).set('Content-Type', image.mimeType).set('X-Content-Type-Options', 'nosniff')
      .set('Cache-Control', 'private, no-store').send(image.bytes);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  addGroomingPhoto,
  completeGrooming,
  createGrooming,
  getGrooming,
  getGroomingPhotoImage,
  listGroomings,
  removeGroomingPhoto,
  updateGrooming,
};
