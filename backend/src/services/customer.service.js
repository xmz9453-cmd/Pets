const customerRepository = require('../data/customer.repository');

const VALID_STATUSES = new Set(['ACTIVE', 'INACTIVE']);

function createValidationError(fields) {
  const error = new Error('Validation failed');
  error.statusCode = 400;
  error.code = 'VALIDATION_ERROR';
  error.fields = fields;
  return error;
}

function createNotFoundError(code, message) {
  const error = new Error(message);
  error.statusCode = 404;
  error.code = code;
  return error;
}

function normalizeCustomerInput(payload = {}) {
  return {
    name: payload.name,
    phone: payload.phone,
    address: payload.address,
    lineId: payload.lineId,
    note: payload.note,
  };
}

function validateCustomerPayload(payload, { allowPartial = false } = {}) {
  const errors = {};
  const normalized = normalizeCustomerInput(payload);

  if (!allowPartial && !normalized.name) {
    errors.name = 'Name is required';
  }

  if (normalized.name !== undefined && normalized.name !== null) {
    const name = String(normalized.name).trim();
    if (!name) {
      errors.name = 'Name is required';
    } else if (name.length > 100) {
      errors.name = 'Name must be 100 characters or less';
    }
  }

  if (!allowPartial && !normalized.phone) {
    errors.phone = 'Phone is required';
  }

  if (normalized.phone !== undefined && normalized.phone !== null) {
    const phone = String(normalized.phone).trim();
    if (!phone) {
      errors.phone = 'Phone is required';
    } else if (!/^[0-9][0-9\s\-()\+\.]{5,29}$/.test(phone)) {
      errors.phone = 'Phone format is invalid';
    }
  }

  if (normalized.address !== undefined && normalized.address !== null && String(normalized.address).length > 255) {
    errors.address = 'Address must be 255 characters or less';
  }

  if (normalized.lineId !== undefined && normalized.lineId !== null && String(normalized.lineId).length > 100) {
    errors.lineId = 'Line ID must be 100 characters or less';
  }

  if (normalized.note !== undefined && normalized.note !== null && String(normalized.note).length > 1000) {
    errors.note = 'Note must be 1000 characters or less';
  }

  if (payload.status !== undefined && payload.status !== null && !VALID_STATUSES.has(payload.status)) {
    errors.status = 'Status must be ACTIVE or INACTIVE';
  }

  return errors;
}

async function listCustomers(filters = {}) {
  const safeFilters = {
    ...filters,
    status: filters.status || 'ACTIVE',
    search: filters.search || '',
    page: Number(filters.page || 1),
    limit: Number(filters.limit || 20),
  };

  return customerRepository.listCustomers(safeFilters);
}

async function getCustomerById(customerId) {
  const customer = await customerRepository.getCustomerById(customerId);
  if (!customer) {
    throw createNotFoundError('CUSTOMER_NOT_FOUND', 'Customer not found');
  }
  return { customer };
}

async function createCustomer(payload) {
  const errors = validateCustomerPayload(payload);
  if (Object.keys(errors).length) {
    throw createValidationError(errors);
  }

  const cleaned = {
    name: String(payload.name).trim(),
    phone: String(payload.phone).trim(),
    address: payload.address ? String(payload.address).trim() : null,
    lineId: payload.lineId !== undefined ? String(payload.lineId).trim() : (payload.line_id ? String(payload.line_id).trim() : null),
    note: payload.note ? String(payload.note).trim() : null,
  };

  const customerId = await customerRepository.createCustomer(cleaned);
  const customer = await customerRepository.getCustomerById(customerId);
  return { customer };
}

async function updateCustomer(customerId, payload) {
  const existing = await customerRepository.getCustomerById(customerId);
  if (!existing) {
    throw createNotFoundError('CUSTOMER_NOT_FOUND', 'Customer not found');
  }

  const errors = validateCustomerPayload(payload, { allowPartial: true });
  if (Object.keys(errors).length) {
    throw createValidationError(errors);
  }

  const patch = {};
  if (payload.name !== undefined) {
    patch.name = String(payload.name).trim();
  }
  if (payload.phone !== undefined) {
    patch.phone = String(payload.phone).trim();
  }
  if (payload.address !== undefined) {
    patch.address = payload.address === null ? null : String(payload.address).trim();
  }
  if (payload.lineId !== undefined || payload.line_id !== undefined) {
    patch.lineId = payload.lineId !== undefined ? String(payload.lineId).trim() : (payload.line_id === null ? null : String(payload.line_id).trim());
  }
  if (payload.note !== undefined) {
    patch.note = payload.note === null ? null : String(payload.note).trim();
  }

  const customer = await customerRepository.updateCustomer(customerId, patch);
  return { customer };
}

async function changeStatus(customerId, nextStatus, currentStatus) {
  const customer = await customerRepository.getCustomerById(customerId);
  if (!customer) {
    throw createNotFoundError('CUSTOMER_NOT_FOUND', 'Customer not found');
  }

  if (customer.status === currentStatus) {
    throw createValidationError({ status: `Customer is already ${currentStatus.toLowerCase()}` });
  }

  if (customer.status !== currentStatus) {
    throw createValidationError({ status: `Invalid customer status transition from ${customer.status} to ${nextStatus}` });
  }

  const updated = await customerRepository.updateStatus(customerId, nextStatus);
  return { customer: updated };
}

async function deactivateCustomer(customerId) {
  const customer = await customerRepository.getCustomerById(customerId);
  if (!customer) {
    throw createNotFoundError('CUSTOMER_NOT_FOUND', 'Customer not found');
  }

  if (customer.status === 'INACTIVE') {
    throw createValidationError({ status: 'Customer is already inactive' });
  }

  const updated = await customerRepository.updateStatus(customerId, 'INACTIVE');
  return { customer: updated };
}

async function reactivateCustomer(customerId) {
  const customer = await customerRepository.getCustomerById(customerId);
  if (!customer) {
    throw createNotFoundError('CUSTOMER_NOT_FOUND', 'Customer not found');
  }

  if (customer.status === 'ACTIVE') {
    throw createValidationError({ status: 'Customer is already active' });
  }

  const updated = await customerRepository.updateStatus(customerId, 'ACTIVE');
  return { customer: updated };
}

module.exports = {
  createCustomer,
  deactivateCustomer,
  getCustomerById,
  listCustomers,
  reactivateCustomer,
  updateCustomer,
};
