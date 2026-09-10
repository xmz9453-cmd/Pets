const appointmentRepository = require('../data/appointment.repository');
const dailyOperationsRepository = require('../data/daily-operations.repository');
const { isSpeciesCompatible } = require('./service.service');
const { getPool } = require('../config/database');

const VALID_STATUSES = new Set(['PENDING', 'SCHEDULED', 'CONFIRMED', 'CANCELLED']);

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

function normalizeTime(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return String(value).trim();
}

function isValidDateString(value) {
  if (value === undefined || value === null || value === '') {
    return false;
  }

  const trimmed = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return false;
  }

  const [year, month, day] = trimmed.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  return utcDate.getUTCFullYear() === year
    && utcDate.getUTCMonth() === month - 1
    && utcDate.getUTCDate() === day;
}

function isValidTimeString(value) {
  if (value === undefined || value === null || value === '') {
    return false;
  }

  const trimmed = String(value).trim();
  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(trimmed);
}

function normalizeDateString(value) {
  const normalized = normalizeTime(value);
  if (!normalized) {
    return null;
  }

  if (!isValidDateString(normalized)) {
    throw createValidationError({ appointment_date: 'Appointment date is invalid' });
  }

  return normalized;
}

function normalizeTimeString(value) {
  const normalized = normalizeTime(value);
  if (!normalized) {
    return null;
  }

  if (!isValidTimeString(normalized)) {
    throw createValidationError({ appointment_time: 'Appointment time is invalid' });
  }

  const [hours, minutes, seconds = '00'] = normalized.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
}

async function withTransaction(handler) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await handler(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function validatePetEntries(customerId, petEntries = []) {
  const errors = {};

  if (!Array.isArray(petEntries) || petEntries.length === 0) {
    throw createValidationError({ pets: 'At least one pet is required' });
  }

  const seenPetIds = new Set();

  for (let index = 0; index < petEntries.length; index += 1) {
    const item = petEntries[index] || {};
    const petId = Number(item.pet_id);
    const serviceIds = Array.isArray(item.service_ids) ? item.service_ids : [];

    if (!petId || !Number.isInteger(petId) || petId <= 0) {
      errors[`pets[${index}].pet_id`] = 'Pet is required';
      continue;
    }

    if (seenPetIds.has(petId)) {
      errors[`pets[${index}].pet_id`] = 'Duplicate pet selected';
      continue;
    }
    seenPetIds.add(petId);

    const pet = await appointmentRepository.findPetById(petId);
    if (!pet) {
      errors[`pets[${index}].pet_id`] = 'Pet not found';
      continue;
    }

    const relationship = await getPool().query(
      'SELECT 1 FROM pet_customer_relationships WHERE pet_id = ? AND customer_id = ? LIMIT 1',
      [petId, customerId],
    );

    if (!relationship[0] || relationship[0].length === 0) {
      errors[`pets[${index}].pet_id`] = 'Pet does not belong to this customer';
    }

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      errors[`pets[${index}].service_ids`] = 'At least one service is required for each pet';
      continue;
    }

    const validServices = [];
    const seenServiceIds = new Set();
    for (let serviceIndex = 0; serviceIndex < serviceIds.length; serviceIndex += 1) {
      const serviceId = Number(serviceIds[serviceIndex]);
      if (!serviceId || !Number.isInteger(serviceId) || serviceId <= 0) {
        errors[`pets[${index}].service_ids[${serviceIndex}]`] = 'Service is invalid';
        continue;
      }

      if (seenServiceIds.has(serviceId)) {
        errors[`pets[${index}].service_ids[${serviceIndex}]`] = 'Duplicate service selected';
        continue;
      }
      seenServiceIds.add(serviceId);

      const service = await appointmentRepository.findServiceById(serviceId);
      if (!service) {
        errors[`pets[${index}].service_ids[${serviceIndex}]`] = 'Service not found';
        continue;
      }

      if (service.status !== 'ACTIVE') {
        errors[`pets[${index}].service_ids[${serviceIndex}]`] = 'Service is not available';
        continue;
      }

      if (!isSpeciesCompatible(service.species, pet.species)) {
        errors[`pets[${index}].service_ids[${serviceIndex}]`] = 'Service is not compatible with pet species';
        continue;
      }

      validServices.push(serviceId);
    }

    if (validServices.length === 0) {
      errors[`pets[${index}].service_ids`] = 'At least one active service is required';
    }
  }

  if (Object.keys(errors).length) {
    throw createValidationError(errors);
  }
}

async function listAppointments(filters = {}) {
  return appointmentRepository.listAppointments(filters);
}

async function getAppointmentById(appointmentId) {
  const appointment = await appointmentRepository.getAppointmentById(appointmentId);
  if (!appointment) {
    throw createNotFoundError('APPOINTMENT_NOT_FOUND', 'Appointment not found');
  }

  return { appointment };
}

async function createAppointment(payload = {}) {
  const customerId = Number(payload.customer_id);
  const appointmentDate = normalizeDateString(payload.appointment_date);
  const appointmentTime = normalizeTimeString(payload.appointment_time);
  const status = payload.status || 'SCHEDULED';
  const petEntries = Array.isArray(payload.pets) ? payload.pets : [];

  if (!customerId || !Number.isInteger(customerId)) {
    throw createValidationError({ customer_id: 'Customer is required' });
  }

  const customer = await appointmentRepository.findCustomerById(customerId);
  if (!customer) {
    throw createNotFoundError('CUSTOMER_NOT_FOUND', 'Customer not found');
  }

  if (!appointmentDate) {
    throw createValidationError({ appointment_date: 'Appointment date is required' });
  }

  if (!appointmentTime) {
    throw createValidationError({ appointment_time: 'Appointment time is required' });
  }

  if (!VALID_STATUSES.has(status)) {
    throw createValidationError({ status: 'Status must be PENDING, SCHEDULED, CONFIRMED, or CANCELLED' });
  }

  await validatePetEntries(customerId, petEntries);

  return withTransaction(async (connection) => {
    const appointmentId = await appointmentRepository.createAppointment({
      customer_id: customerId,
      staff_id: payload.staff_id !== undefined && payload.staff_id !== null && payload.staff_id !== '' ? Number(payload.staff_id) : null,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      status,
      note: payload.note || null,
    }, connection);

    await appointmentRepository.replaceAppointmentPetRelations(appointmentId, petEntries, connection);
  await dailyOperationsRepository.create(appointmentId, connection);
    const appointment = await appointmentRepository.getAppointmentById(appointmentId, connection);
    return { appointment };
  });
}

async function updateAppointment(appointmentId, payload = {}) {
  const existing = await appointmentRepository.findAppointmentById(appointmentId);
  if (!existing) {
    throw createNotFoundError('APPOINTMENT_NOT_FOUND', 'Appointment not found');
  }

  if (existing.status === 'CANCELLED') {
    if (payload.status && payload.status !== 'CANCELLED') {
      throw createValidationError({ status: 'Cancelled appointments cannot be reactivated' });
    }
  }

  const nextStatus = payload.status !== undefined ? payload.status : existing.status;
  if (!VALID_STATUSES.has(nextStatus)) {
    throw createValidationError({ status: 'Status must be PENDING, SCHEDULED, CONFIRMED, or CANCELLED' });
  }

  if (payload.customer_id !== undefined && payload.customer_id !== null && payload.customer_id !== '') {
    const customerId = Number(payload.customer_id);
    const customer = await appointmentRepository.findCustomerById(customerId);
    if (!customer) {
      throw createNotFoundError('CUSTOMER_NOT_FOUND', 'Customer not found');
    }
  }

  const pets = Array.isArray(payload.pets) ? payload.pets : null;
  if (pets) {
    await validatePetEntries(Number(payload.customer_id || existing.customer_id), pets);
  }

  const updatePayload = {};

  if (payload.customer_id !== undefined) {
    updatePayload.customer_id = payload.customer_id === null || payload.customer_id === '' ? null : Number(payload.customer_id);
  }
  if (payload.appointment_date !== undefined) {
    updatePayload.appointment_date = normalizeDateString(payload.appointment_date);
  }
  if (payload.appointment_time !== undefined) {
    updatePayload.appointment_time = normalizeTimeString(payload.appointment_time);
  }
  if (payload.status !== undefined) {
    updatePayload.status = payload.status;
  }
  if (payload.note !== undefined) {
    updatePayload.note = payload.note === null ? null : String(payload.note).trim();
  }
  if (payload.staff_id !== undefined) {
    updatePayload.staff_id = payload.staff_id === null || payload.staff_id === '' ? null : Number(payload.staff_id);
  }

  if (updatePayload.appointment_date !== undefined && !updatePayload.appointment_date) {
    throw createValidationError({ appointment_date: 'Appointment date is required' });
  }
  if (updatePayload.appointment_time !== undefined && !updatePayload.appointment_time) {
    throw createValidationError({ appointment_time: 'Appointment time is required' });
  }

  return withTransaction(async (connection) => {
    const finalStatus = updatePayload.status || existing.status;
    const appointmentData = await appointmentRepository.findAppointmentById(appointmentId, connection);
    if (!appointmentData) {
      throw createNotFoundError('APPOINTMENT_NOT_FOUND', 'Appointment not found');
    }

    const customerId = Number(updatePayload.customer_id ?? appointmentData.customer_id);
    const appointmentDate = updatePayload.appointment_date ?? appointmentData.appointment_date;
    const appointmentTime = updatePayload.appointment_time ?? appointmentData.appointment_time;

    if (!customerId || !appointmentDate || !appointmentTime) {
      throw createValidationError({
        customer_id: customerId ? undefined : 'Customer is required',
        appointment_date: appointmentDate ? undefined : 'Appointment date is required',
        appointment_time: appointmentTime ? undefined : 'Appointment time is required',
      });
    }

    const patchValues = {
      ...updatePayload,
      customer_id: customerId,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      status: finalStatus,
    };

    const updated = await appointmentRepository.updateAppointment(appointmentId, patchValues, connection);
    if (pets) {
      await appointmentRepository.replaceAppointmentPetRelations(appointmentId, pets, connection);
    }

    return { appointment: await appointmentRepository.getAppointmentById(appointmentId, connection) };
  });
}

async function deleteAppointment(appointmentId) {
  const normalizedAppointmentId = Number(appointmentId);
  if (!Number.isInteger(normalizedAppointmentId) || normalizedAppointmentId <= 0) {
    throw createNotFoundError('APPOINTMENT_NOT_FOUND', 'Appointment not found');
  }

  await appointmentRepository.deleteAppointment(normalizedAppointmentId);
  return { message: 'Appointment deleted successfully' };
}

module.exports = {
  createAppointment,
  deleteAppointment,
  getAppointmentById,
  listAppointments,
  updateAppointment,
};
