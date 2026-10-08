const bookingScheduleRepository = require('../data/booking-schedule.repository');

const VALID_SPECIES = new Set(['DOG', 'CAT']);
const VALID_RULE_STATUSES = new Set(['ACTIVE', 'INACTIVE']);

function createValidationError(fields) {
  const error = new Error('Validation failed');
  error.statusCode = 400;
  error.code = 'VALIDATION_ERROR';
  error.fields = fields;
  return error;
}

function createNotFoundError(entity) {
  const error = new Error(`${entity} not found`);
  error.statusCode = 404;
  error.code = `${entity.toUpperCase()}_NOT_FOUND`;
  return error;
}

function normalizeTime(value, field, errors, allowNull = false) {
  if (allowNull && (value === null || value === undefined || value === '')) {
    return null;
  }

  const match = String(value ?? '').trim().match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!match) {
    errors[field] = 'Time must use HH:mm or HH:mm:ss format';
    return null;
  }
  return `${match[1]}:${match[2]}:${match[3] || '00'}`;
}

function normalizeDate(value, errors) {
  const date = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.override_date = 'Date must use YYYY-MM-DD format';
    return null;
  }

  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year
      || parsed.getUTCMonth() !== month - 1
      || parsed.getUTCDate() !== day) {
    errors.override_date = 'Date is invalid';
    return null;
  }
  return date;
}

function normalizeCapacity(value, isClosed, field, errors) {
  if (isClosed) {
    if (value !== undefined && value !== null && value !== '') {
      errors[field] = 'Closed rules must not have capacity';
    }
    return null;
  }

  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value.trim()))) {
    errors[field] = 'Capacity must be a positive integer';
    return null;
  }
  const capacity = Number(value);
  if (!Number.isInteger(capacity) || capacity <= 0) {
    errors[field] = 'Capacity must be a positive integer';
    return null;
  }
  return capacity;
}

function normalizeId(value, entity) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw createNotFoundError(entity);
  return id;
}

function normalizeRule(payload, existing = null) {
  const errors = {};
  const source = { ...existing, ...payload };
  const species = source.species;
  const isClosed = source.is_closed;
  const startTime = normalizeTime(source.start_time, 'start_time', errors);
  const capacity = normalizeCapacity(source.capacity, isClosed, 'capacity', errors);
  const status = source.status ?? 'ACTIVE';

  if (!VALID_SPECIES.has(species)) errors.species = 'Species must be DOG or CAT';
  if (typeof isClosed !== 'boolean') errors.is_closed = 'is_closed must be a boolean';
  if (!VALID_RULE_STATUSES.has(status)) errors.status = 'Status must be ACTIVE or INACTIVE';
  if (Object.keys(errors).length) throw createValidationError(errors);

  return { species, start_time: startTime, capacity, is_closed: isClosed, status };
}

function normalizeOverride(payload, existing = null) {
  const errors = {};
  const source = { ...existing, ...payload };
  const species = source.species;
  const isClosed = source.is_closed;
  const startTime = normalizeTime(source.start_time, 'start_time', errors, true);
  const overrideDate = normalizeDate(source.override_date, errors);

  if (!VALID_SPECIES.has(species)) errors.species = 'Species must be DOG or CAT';
  if (typeof isClosed !== 'boolean') errors.is_closed = 'is_closed must be a boolean';
  if (startTime === null && isClosed !== true) {
    errors.is_closed = 'Species-wide overrides must be closed';
  }
  const capacity = normalizeCapacity(source.capacity, isClosed, 'capacity', errors);
  if (startTime === null && source.capacity !== undefined && source.capacity !== null && source.capacity !== '') {
    errors.capacity = 'Species-wide overrides must not have capacity';
  }
  if (Object.keys(errors).length) throw createValidationError(errors);

  return {
    override_date: overrideDate,
    species,
    start_time: startTime,
    is_closed: isClosed,
    capacity,
  };
}

function throwIfDuplicate(error) {
  if (error.code === 'ER_DUP_ENTRY') {
    const duplicate = new Error('A rule or override already exists for this selection');
    duplicate.statusCode = 409;
    duplicate.code = 'BOOKING_SCHEDULE_DUPLICATE';
    throw duplicate;
  }
  throw error;
}

async function getBookingSchedule() {
  const [rules, overrides] = await Promise.all([
    bookingScheduleRepository.listRules(),
    bookingScheduleRepository.listOverrides(),
  ]);
  return { rules, overrides };
}

async function createRule(payload = {}) {
  const rule = normalizeRule(payload);
  try {
    return { rule: await bookingScheduleRepository.createRule(rule) };
  } catch (error) {
    throwIfDuplicate(error);
  }
}

async function updateRule(id, payload = {}) {
  const ruleId = normalizeId(id, 'BOOKING_SCHEDULE_RULE');
  const current = await bookingScheduleRepository.getRuleById(ruleId);
  if (!current) throw createNotFoundError('BOOKING_SCHEDULE_RULE');
  const rule = normalizeRule(payload, current);
  try {
    return { rule: await bookingScheduleRepository.updateRule(ruleId, rule) };
  } catch (error) {
    throwIfDuplicate(error);
  }
}

async function deleteRule(id) {
  const ruleId = normalizeId(id, 'BOOKING_SCHEDULE_RULE');
  if (!await bookingScheduleRepository.deleteRule(ruleId)) {
    throw createNotFoundError('BOOKING_SCHEDULE_RULE');
  }
  return { deleted: true };
}

async function createOverride(payload = {}) {
  const override = normalizeOverride(payload);
  try {
    return { override: await bookingScheduleRepository.createOverride(override) };
  } catch (error) {
    throwIfDuplicate(error);
  }
}

async function updateOverride(id, payload = {}) {
  const overrideId = normalizeId(id, 'BOOKING_SCHEDULE_OVERRIDE');
  const current = await bookingScheduleRepository.getOverrideById(overrideId);
  if (!current) throw createNotFoundError('BOOKING_SCHEDULE_OVERRIDE');
  const override = normalizeOverride(payload, current);
  try {
    return { override: await bookingScheduleRepository.updateOverride(overrideId, override) };
  } catch (error) {
    throwIfDuplicate(error);
  }
}

async function deleteOverride(id) {
  const overrideId = normalizeId(id, 'BOOKING_SCHEDULE_OVERRIDE');
  if (!await bookingScheduleRepository.deleteOverride(overrideId)) {
    throw createNotFoundError('BOOKING_SCHEDULE_OVERRIDE');
  }
  return { deleted: true };
}

module.exports = {
  createOverride,
  createRule,
  deleteOverride,
  deleteRule,
  getBookingSchedule,
  updateOverride,
  updateRule,
};
