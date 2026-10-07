const crypto = require('crypto');
const customerRepository = require('../data/customer.repository');
const bookingSessionRepository = require('../data/booking-session.repository');
const petRepository = require('../data/pet.repository');

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

module.exports = { confirmExistingCustomer, listPetsForBookingSession };
