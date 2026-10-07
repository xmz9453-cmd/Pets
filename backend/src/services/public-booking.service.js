const crypto = require('crypto');
const customerRepository = require('../data/customer.repository');
const bookingSessionRepository = require('../data/booking-session.repository');
const petRepository = require('../data/pet.repository');
const serviceRepository = require('../data/service.repository');

const SESSION_LIFETIME_MILLISECONDS = 2 * 60 * 60 * 1000;
const BOOKING_SESSION_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

function createInvalidSessionError() {
  const error = new Error('Booking session is invalid');
  error.statusCode = 401;
  error.code = 'BOOKING_SESSION_INVALID';
  return error;
}

function createConfirmationFailure() {
  const error = new Error('Customer confirmation failed');
  error.statusCode = 400;
  error.code = 'CUSTOMER_CONFIRMATION_FAILED';
  return error;
}

function createValidationError(fields) {
  const error = new Error('Validation failed');
  error.statusCode = 400;
  error.code = 'VALIDATION_ERROR';
  error.fields = fields;
  return error;
}

async function confirmExistingCustomer(phone, name) {
  const normalizedPhone = String(phone ?? '').trim();
  const normalizedName = String(name ?? '').trim();
  if (!normalizedPhone || !normalizedName) {
    throw createConfirmationFailure();
  }

  const customer = await customerRepository.findActiveCustomerIdByPhoneAndName(
    normalizedPhone,
    normalizedName,
  );
  if (!customer) {
    throw createConfirmationFailure();
  }

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + SESSION_LIFETIME_MILLISECONDS);

  await bookingSessionRepository.createSession({
    tokenHash,
    customerId: customer.id,
    createdAt,
    expiresAt,
  });

  return { token };
}

async function listPetsForBookingSession(token) {
  if (typeof token !== 'string' || !BOOKING_SESSION_TOKEN_PATTERN.test(token)) {
    throw createInvalidSessionError();
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const session = await bookingSessionRepository.findActiveSessionByTokenHash(tokenHash);
  if (!session) {
    throw createInvalidSessionError();
  }

  return { pets: await petRepository.listActivePetsByCustomerId(session.customer_id) };
}

async function listServicesForBookingSession(token, petId) {
  if (typeof token !== 'string' || !BOOKING_SESSION_TOKEN_PATTERN.test(token)) {
    throw createInvalidSessionError();
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const session = await bookingSessionRepository.findActiveSessionByTokenHash(tokenHash);
  if (!session) {
    throw createInvalidSessionError();
  }

  const parsedPetId = Number(petId);
  if (!Number.isInteger(parsedPetId) || parsedPetId <= 0) {
    throw createValidationError({ pet_id: 'Pet is required' });
  }

  const pet = await petRepository.getPetById(parsedPetId);
  if (!pet) {
    const error = new Error('Pet not found');
    error.statusCode = 404;
    error.code = 'PET_NOT_FOUND';
    throw error;
  }

  if (pet.status !== 'ACTIVE') {
    throw createValidationError({ pet_id: 'Pet is not active' });
  }

  const relationship = await petRepository.findRelationshipByPetAndCustomer(parsedPetId, session.customer_id);
  if (!relationship) {
    throw createValidationError({ pet_id: 'Pet does not belong to this customer' });
  }

  const services = await serviceRepository.listActiveServicesBySpecies(pet.species);
  return { services };
}

module.exports = { confirmExistingCustomer, listPetsForBookingSession, listServicesForBookingSession };
