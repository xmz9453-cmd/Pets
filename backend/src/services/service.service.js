const serviceRepository = require('../data/service.repository');

const VALID_TYPES = new Set(['GROOMING', 'BOARDING']);
const VALID_SPECIES = new Set(['DOG', 'CAT', 'BOTH']);
const VALID_STATUSES = new Set(['ACTIVE', 'INACTIVE']);

function validation(fields) {
  const error = new Error('Validation failed');
  error.statusCode = 400;
  error.code = 'VALIDATION_ERROR';
  error.fields = fields;
  return error;
}

function notFound() {
  const error = new Error('Service not found');
  error.statusCode = 404;
  error.code = 'SERVICE_NOT_FOUND';
  return error;
}

function validatePayload(payload, partial = false) {
  const errors = {};
  if (!partial && !String(payload.name || '').trim()) errors.name = 'Service name is required';
  if (payload.name !== undefined && (!String(payload.name).trim() || String(payload.name).length > 100)) errors.name = 'Service name must be 1-100 characters';
  if (!partial && !VALID_TYPES.has(payload.type)) errors.type = 'Type must be GROOMING or BOARDING';
  if (payload.type !== undefined && !VALID_TYPES.has(payload.type)) errors.type = 'Type must be GROOMING or BOARDING';
  if (!partial && !String(payload.unit || '').trim()) errors.unit = 'Unit is required';
  if (payload.unit !== undefined && (!String(payload.unit).trim() || String(payload.unit).length > 20)) errors.unit = 'Unit must be 1-20 characters';
  if (payload.type === 'GROOMING' && payload.unit !== undefined && String(payload.unit).trim() !== '次') {
    errors.unit = 'GROOMING unit must be 次';
  }
  if (payload.type === 'BOARDING' && payload.unit !== undefined && String(payload.unit).trim() !== '晚') {
    errors.unit = 'BOARDING unit must be 晚';
  }
  if (!partial && !VALID_SPECIES.has(payload.species)) errors.species = 'Species must be DOG, CAT, or BOTH';
  if (payload.species !== undefined && !VALID_SPECIES.has(payload.species)) errors.species = 'Species must be DOG, CAT, or BOTH';
  if (payload.description !== undefined && payload.description !== null && String(payload.description).length > 500) errors.description = 'Description must be 500 characters or less';
  if (!partial || payload.price !== undefined) {
    const price = Number(payload.price);
    if (!Number.isFinite(price) || price <= 0) errors.price = 'Price must be greater than 0';
  }
  const hasDuration = payload.duration_minutes !== undefined && payload.duration_minutes !== null && payload.duration_minutes !== '';
  if (payload.type === 'GROOMING') {
    if (!partial && !hasDuration) {
      errors.duration_minutes = 'Duration must be a positive integer';
    } else if (hasDuration) {
      const duration = Number(payload.duration_minutes);
      if (!Number.isInteger(duration) || duration <= 0) errors.duration_minutes = 'Duration must be a positive integer';
    }
  } else if (payload.type === 'BOARDING' && hasDuration) {
    const duration = Number(payload.duration_minutes);
    if (!Number.isInteger(duration) || duration <= 0) errors.duration_minutes = 'Duration must be a positive integer';
  }
  if (payload.sort_order !== undefined) {
    if (!Number.isInteger(Number(payload.sort_order)) || Number(payload.sort_order) < 0) errors.sort_order = 'Sort order must be a non-negative integer';
  }
  if (payload.status !== undefined && !VALID_STATUSES.has(payload.status)) errors.status = 'Status must be ACTIVE or INACTIVE';
  return errors;
}

async function listServices(filters) { return serviceRepository.listServices(filters); }

async function getService(id) {
  const service = await serviceRepository.getServiceById(id);
  if (!service) throw notFound();
  return { service };
}

async function createService(payload = {}) {
  const errors = validatePayload(payload);
  if (Object.keys(errors).length) throw validation(errors);
  if (await serviceRepository.findByName(String(payload.name).trim())) {
    throw validation({ name: 'Service name already exists' });
  }
  const normalizedPayload = {
    ...payload,
    name: String(payload.name).trim(),
    sort_order: Number(payload.sort_order ?? 0),
  };
  if (normalizedPayload.type === 'BOARDING' && (normalizedPayload.duration_minutes === undefined || normalizedPayload.duration_minutes === null || normalizedPayload.duration_minutes === '')) {
    normalizedPayload.duration_minutes = 60;
  }
  return { service: await serviceRepository.createService(normalizedPayload) };
}

async function updateService(id, payload = {}) {
  const existing = await serviceRepository.getServiceById(id);
  if (!existing) throw notFound();
  const errors = validatePayload(payload, true);
  if (Object.keys(errors).length) throw validation(errors);
  if (payload.name !== undefined && await serviceRepository.findByName(String(payload.name).trim(), id)) throw validation({ name: 'Service name already exists' });
  const nextPayload = { ...payload };
  if (nextPayload.name !== undefined) nextPayload.name = String(nextPayload.name).trim();
  if (nextPayload.price !== undefined) nextPayload.price = Number(nextPayload.price);
  if (nextPayload.duration_minutes !== undefined) nextPayload.duration_minutes = Number(nextPayload.duration_minutes);
  if (nextPayload.sort_order !== undefined) nextPayload.sort_order = Number(nextPayload.sort_order);
  return { service: await serviceRepository.updateService(id, nextPayload) };
}

async function deleteService(id) {
  const existing = await serviceRepository.getServiceById(id);
  if (!existing) throw notFound();
  if (await serviceRepository.countHistoricalUsage(id)) {
    const error = new Error('Service has historical usage and cannot be deleted');
    error.statusCode = 409;
    error.code = 'SERVICE_IN_USE';
    throw error;
  }
  await serviceRepository.deleteService(id);
  return { service: existing };
}

function isSpeciesCompatible(serviceSpecies, petSpecies) {
  return serviceSpecies === 'BOTH' || serviceSpecies === petSpecies;
}

module.exports = { createService, deleteService, getService, isSpeciesCompatible, listServices, updateService };