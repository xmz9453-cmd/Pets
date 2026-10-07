const crypto = require('crypto');
const customerRepository = require('../data/customer.repository');
const bookingSessionRepository = require('../data/booking-session.repository');

const SESSION_LIFETIME_MILLISECONDS = 2 * 60 * 60 * 1000;

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

module.exports = { confirmExistingCustomer };
