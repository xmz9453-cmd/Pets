const { getPool } = require('../config/database');
const boardingRepository = require('../data/boarding.repository');

function validationError(fields) {
  const error = new Error('Validation failed');
  error.statusCode = 400;
  error.code = 'VALIDATION_ERROR';
  error.fields = fields;
  return error;
}
function notFound(code, message) {
  const error = new Error(message);
  error.statusCode = 404;
  error.code = code;
  return error;
}
function conflict(code, message) {
  const error = new Error(message);
  error.statusCode = 409;
  error.code = code;
  return error;
}
function normalizeText(value, field, maxLength = 2000) {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  if (text.length > maxLength) throw validationError({ [field]: `Text must be ${maxLength} characters or fewer` });
  return text || null;
}
function normalizeDateTime(value, field) {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(text)) {
    throw validationError({ [field]: `${field} is invalid` });
  }
  return text.length === 16 ? `${text}:00` : text.replace('T', ' ');
}
function mapBoarding(row) {
  if (!row) return null;
  return {
    id: Number(row.id), customer_id: Number(row.customer_id), pet_id: Number(row.pet_id), service_id: Number(row.service_id),
    appointment_id: row.appointment_id == null ? null : Number(row.appointment_id),
    daily_operation_id: row.daily_operation_id == null ? null : Number(row.daily_operation_id),
    customer_name: row.customer_name, customer_phone: row.customer_phone, pet_name: row.pet_name,
    species: row.species, gender: row.gender, service_name: row.service_name, service_type: row.service_type,
    appointment_date: row.appointment_date, appointment_time: row.appointment_time,
    expected_check_in: row.expected_check_in, actual_check_in: row.actual_check_in,
    expected_check_out: row.expected_check_out, actual_check_out: row.actual_check_out,
    status: row.status, daily_operation_status: row.daily_operation_status,
    before_condition: row.before_condition, actual_boarding_content: row.actual_boarding_content,
    boarding_result: row.boarding_result, note: row.note, created_at: row.created_at, updated_at: row.updated_at,
  };
}
async function validateIdentity(payload, connection) {
  const customerId = Number(payload.customer_id);
  const petId = Number(payload.pet_id);
  const serviceId = Number(payload.service_id);
  if (!Number.isInteger(customerId) || customerId <= 0) throw validationError({ customer_id: 'Customer is required' });
  if (!Number.isInteger(petId) || petId <= 0) throw validationError({ pet_id: 'Pet is required' });
  if (!Number.isInteger(serviceId) || serviceId <= 0) throw validationError({ service_id: 'Service is required' });

  const [customers] = await connection.query('SELECT id FROM customers WHERE id = ? LIMIT 1', [customerId]);
  if (!customers.length) throw notFound('CUSTOMER_NOT_FOUND', 'Customer not found');
  const [pets] = await connection.query('SELECT id FROM pets WHERE id = ? LIMIT 1', [petId]);
  if (!pets.length) throw notFound('PET_NOT_FOUND', 'Pet not found');
  const [relationship] = await connection.query('SELECT 1 FROM pet_customer_relationships WHERE pet_id = ? AND customer_id = ? LIMIT 1', [petId, customerId]);
  if (!relationship.length) throw validationError({ pet_id: 'Pet does not belong to this customer' });
  const [services] = await connection.query("SELECT id, type, status FROM services WHERE id = ? LIMIT 1", [serviceId]);
  if (!services.length) throw notFound('SERVICE_NOT_FOUND', 'Service not found');
  if (services[0].status !== 'ACTIVE' || services[0].type !== 'BOARDING') throw validationError({ service_id: 'Active boarding service is required' });
  return { customerId, petId, serviceId };
}
async function validateAppointment(payload, identity, connection) {
  const appointmentId = payload.appointment_id == null || payload.appointment_id === '' ? null : Number(payload.appointment_id);
  const dailyOperationId = payload.daily_operation_id == null || payload.daily_operation_id === '' ? null : Number(payload.daily_operation_id);
  if (appointmentId !== null && (!Number.isInteger(appointmentId) || appointmentId <= 0)) throw validationError({ appointment_id: 'Appointment is invalid' });
  if (dailyOperationId !== null && (!Number.isInteger(dailyOperationId) || dailyOperationId <= 0)) throw validationError({ daily_operation_id: 'Daily operation is invalid' });
  if (dailyOperationId !== null && appointmentId === null) throw validationError({ daily_operation_id: 'Daily operation requires an appointment' });

  if (appointmentId !== null) {
    const [appointments] = await connection.query('SELECT id, customer_id, appointment_date, appointment_time, status FROM appointments WHERE id = ? LIMIT 1', [appointmentId]);
    if (!appointments.length) throw notFound('APPOINTMENT_NOT_FOUND', 'Appointment not found');
    const appointment = appointments[0];
    if (Number(appointment.customer_id) !== identity.customerId) throw validationError({ appointment_id: 'Appointment does not belong to this customer' });
    const [petServices] = await connection.query(
      `SELECT 1 FROM appointment_pets ap INNER JOIN appointment_pet_services aps ON aps.appointment_pet_id = ap.id
       WHERE ap.appointment_id = ? AND ap.pet_id = ? AND aps.service_id = ? LIMIT 1`,
      [appointmentId, identity.petId, identity.serviceId],
    );
    if (!petServices.length) throw validationError({ appointment_id: 'Appointment, pet, and service are not linked' });
    if (dailyOperationId !== null) {
      const [operations] = await connection.query('SELECT id, appointment_id, status FROM daily_operations WHERE id = ? LIMIT 1', [dailyOperationId]);
      if (!operations.length || Number(operations[0].appointment_id) !== appointmentId) throw validationError({ daily_operation_id: 'Daily operation does not match this appointment' });
    }
    return { appointmentId, dailyOperationId, appointment };
  }
  return { appointmentId: null, dailyOperationId: null, appointment: null };
}
async function withTransaction(handler) {
  const connection = await getPool().getConnection();
  try { await connection.beginTransaction(); const result = await handler(connection); await connection.commit(); return result; }
  catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
async function getBoarding(id) {
  const row = await boardingRepository.findByIdWithRelations(id);
  if (!row) throw notFound('BOARDING_NOT_FOUND', 'Boarding record not found');
  return mapBoarding(row);
}
async function listBoardings(query = {}) {
  const dailyOperationId = query.daily_operation_id == null ? null : Number(query.daily_operation_id);
  if (!dailyOperationId || !Number.isInteger(dailyOperationId)) return [];
  return (await boardingRepository.listByDailyOperationId(dailyOperationId)).map(mapBoarding);
}
async function createBoarding(payload = {}) {
  return withTransaction(async (connection) => {
    const identity = await validateIdentity(payload, connection);
    const relation = await validateAppointment(payload, identity, connection);
    const active = await boardingRepository.findActiveByPet(identity.petId, connection);
    if (active) throw conflict('ACTIVE_BOARDING_EXISTS', 'Pet already has an active boarding');
    const appointment = relation.appointment;
    const id = await boardingRepository.createRecord({
      customer_id: identity.customerId, pet_id: identity.petId, service_id: identity.serviceId,
      appointment_id: relation.appointmentId, daily_operation_id: relation.dailyOperationId,
      expected_check_in: normalizeDateTime(payload.expected_check_in, 'expected_check_in') || (appointment ? `${appointment.appointment_date} ${appointment.appointment_time}` : null),
      expected_check_out: normalizeDateTime(payload.expected_check_out, 'expected_check_out'),
      before_condition: normalizeText(payload.before_condition, 'before_condition'),
      actual_boarding_content: normalizeText(payload.actual_boarding_content, 'actual_boarding_content'),
      boarding_result: normalizeText(payload.boarding_result, 'boarding_result'), note: normalizeText(payload.note, 'note'),
    }, connection);
    return mapBoarding(await boardingRepository.findByIdWithRelations(id, connection));
  });
}
async function updateBoarding(id, payload = {}) {
  const existing = await boardingRepository.findById(id);
  if (!existing) throw notFound('BOARDING_NOT_FOUND', 'Boarding record not found');
  if (existing.status === 'COMPLETED') throw validationError({ status: 'Completed boarding cannot be modified' });
  const patch = {};
  for (const field of ['before_condition', 'actual_boarding_content', 'boarding_result', 'note']) {
    if (payload[field] !== undefined) patch[field] = normalizeText(payload[field], field);
  }
  for (const field of ['expected_check_in', 'expected_check_out']) {
    if (payload[field] !== undefined) patch[field] = normalizeDateTime(payload[field], field);
  }
  await boardingRepository.updateRecord(id, patch);
  return getBoarding(id);
}
async function checkIn(id) {
  return withTransaction(async (connection) => {
    const existing = await boardingRepository.findById(id, connection);
    if (!existing) throw notFound('BOARDING_NOT_FOUND', 'Boarding record not found');
    if (existing.status !== 'PENDING') throw validationError({ status: `Cannot check in from status ${existing.status}` });
    if (await boardingRepository.findActiveByPet(existing.pet_id, connection)) throw conflict('ACTIVE_BOARDING_EXISTS', 'Pet already has an active boarding');
    if (existing.daily_operation_id) {
      const [operations] = await connection.query('SELECT id, status FROM daily_operations WHERE id = ? FOR UPDATE', [existing.daily_operation_id]);
      if (!operations.length) throw notFound('DAILY_OPERATION_NOT_FOUND', 'Daily operation not found');
      if (!['SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS'].includes(operations[0].status)) throw validationError({ status: `Cannot check in from daily operation status ${operations[0].status}` });
      if (operations[0].status === 'SCHEDULED') await connection.query("UPDATE daily_operations SET status='CHECKED_IN', check_in_time=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?", [existing.daily_operation_id]);
      if (operations[0].status !== 'IN_PROGRESS') await connection.query("UPDATE daily_operations SET status='IN_PROGRESS', started_time=COALESCE(started_time, CURRENT_TIMESTAMP), updated_at=CURRENT_TIMESTAMP WHERE id=?", [existing.daily_operation_id]);
    }
    await boardingRepository.updateLifecycle(id, 'IN_PROGRESS', new Date(), null, connection);
    return mapBoarding(await boardingRepository.findByIdWithRelations(id, connection));
  });
}
async function checkOut(id) {
  return withTransaction(async (connection) => {
    const existing = await boardingRepository.findById(id, connection);
    if (!existing) throw notFound('BOARDING_NOT_FOUND', 'Boarding record not found');
    if (existing.status !== 'IN_PROGRESS') throw validationError({ status: `Cannot check out from status ${existing.status}` });
    if (existing.daily_operation_id) {
      const [operations] = await connection.query('SELECT id, status FROM daily_operations WHERE id = ? FOR UPDATE', [existing.daily_operation_id]);
      if (!operations.length) throw notFound('DAILY_OPERATION_NOT_FOUND', 'Daily operation not found');
      if (operations[0].status !== 'IN_PROGRESS') throw validationError({ status: `Cannot complete daily operation from status ${operations[0].status}` });
      await connection.query("UPDATE daily_operations SET status='COMPLETED', completed_time=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?", [existing.daily_operation_id]);
    }
    await boardingRepository.updateLifecycle(id, 'COMPLETED', null, new Date(), connection);
    return mapBoarding(await boardingRepository.findByIdWithRelations(id, connection));
  });
}
module.exports = { checkIn, checkOut, createBoarding, getBoarding, listBoardings, updateBoarding };
