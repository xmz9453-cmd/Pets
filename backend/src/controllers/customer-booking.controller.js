const customerBookingService = require('../services/customer-booking.service');
const bookingChangeService = require('../services/booking-change.service');

async function send(res, handler) {
  try {
    const result = await handler();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    throw error;
  }
}

function listPets(req, res, next) {
  send(res, () => customerBookingService.listPets()).catch(next);
}

function listServices(req, res, next) {
  send(res, () => customerBookingService.listServices(req.query.pet_id, req.query.species)).catch(next);
}

function listProducts(req, res, next) {
  send(res, () => customerBookingService.listProducts(req.query.species)).catch(next);
}

function listAvailability(req, res, next) {
  send(res, () => customerBookingService.listAvailability(req.query)).catch(next);
}

function listRequests(req, res, next) {
  send(res, () => bookingChangeService.listCustomerRequests()).catch(next);
}

function listCompletedGroomingRecords(req, res, next) {
  send(res, () => customerBookingService.listCompletedGroomingRecords()).catch(next);
}

async function getCompletedGroomingPhoto(req, res, next) {
  try {
    const image = await customerBookingService.getCompletedGroomingPhotoImage(req.params.photoId);
    res.status(200).set('Content-Type', image.mimeType).set('X-Content-Type-Options', 'nosniff')
      .set('Cache-Control', 'private, no-store').send(image.bytes);
  } catch (error) {
    next(error);
  }
}

async function createBookingChangeRequest(req, res, next) {
  try {
    const result = await bookingChangeService.createCustomerChangeRequest(req.params.id, req.body || {});
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

function getOnboardingToken(req, res, next) {
  send(res, () => customerBookingService.getOnboardingToken(req.params.id)).catch(next);
}

async function createBookingRequest(req, res, next) {
  try {
    const result = await customerBookingService.createBookingRequest(req.body || {});
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createBookingRequest,
  getCompletedGroomingPhoto,
  createBookingChangeRequest,
  getOnboardingToken,
  listAvailability,
  listCompletedGroomingRecords,
  listPets,
  listProducts,
  listRequests,
  listServices,
};
