const crypto = require('crypto');
const appointmentRepository = require('../data/appointment.repository');
const dailyOperationsRepository = require('../data/daily-operations.repository');
const petRepository = require('../data/pet.repository');
const { isSpeciesCompatible } = require('./service.service');
const { getPool } = require('../config/database');
const { getCurrentShopId } = require('../utils/shop-context');

const VALID_STATUSES = new Set(['PENDING', 'AWAITING_CUSTOMER', 'SCHEDULED', 'CONFIRMED', 'CANCELLED']);

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

function addMinutesToDateTime(date, time, minutes) {
  const timestamp = new Date(`${date}T${String(time).slice(0, 8)}Z`);
  timestamp.setUTCMinutes(timestamp.getUTCMinutes() + minutes);
  return timestamp.toISOString().slice(0, 19).replace('T', ' ');
}

function toSqlDateTime(value) {
  if (!(value instanceof Date)) return String(value).replace('T', ' ').slice(0, 19);
  const parts = [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ];
  const time = [
    String(value.getHours()).padStart(2, '0'),
    String(value.getMinutes()).padStart(2, '0'),
    String(value.getSeconds()).padStart(2, '0'),
  ];
  return `${parts.join('-')} ${time.join(':')}`;
}

function createBookingResourceUnavailableError() {
  const error = new Error('No configured booking resource is available for this request');
  error.statusCode = 409;
  error.code = 'BOOKING_RESOURCE_UNAVAILABLE';
  return error;
}

function createBookingCapacityUnavailableError() {
  const error = new Error('The requested booking time has reached its capacity');
  error.statusCode = 409;
  error.code = 'BOOKING_CAPACITY_UNAVAILABLE';
  return error;
}

function createBookingProductUnavailableError() {
  const error = new Error('Requested booking products are no longer available');
  error.statusCode = 409;
  error.code = 'BOOKING_PRODUCT_UNAVAILABLE';
  return error;
}

function createContractUnavailableError(serviceType) {
  const serviceLabel = serviceType === 'BOARDING' ? '住宿' : '美容';
  const error = new Error(`請先設定並發布${serviceLabel}電子契約，才能接受這筆預約。`);
  error.statusCode = 409;
  error.code = 'CONTRACT_VERSION_NOT_AVAILABLE';
  return error;
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
      'SELECT 1 FROM pet_customer_relationships WHERE pet_id = ? AND customer_id = ? AND shop_id = ? LIMIT 1',
      [petId, customerId, getCurrentShopId()],
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

function validateCustomServiceDurations(petEntries) {
  const errors = {};

  petEntries.forEach((petEntry, petIndex) => {
    if (petEntry.service_durations === undefined) {
      return;
    }
    if (!petEntry.service_durations || typeof petEntry.service_durations !== 'object' || Array.isArray(petEntry.service_durations)) {
      errors[`pets[${petIndex}].service_durations`] = 'Service durations must be an object';
      return;
    }

    const selectedServiceIds = new Set((petEntry.service_ids || []).map((serviceId) => String(Number(serviceId))));
    for (const [serviceId, value] of Object.entries(petEntry.service_durations)) {
      const normalizedServiceId = Number(serviceId);
      const field = `pets[${petIndex}].service_durations.${serviceId}`;
      if (!Number.isInteger(normalizedServiceId)
        || normalizedServiceId <= 0
        || String(normalizedServiceId) !== serviceId
        || !selectedServiceIds.has(String(normalizedServiceId))) {
        errors[field] = 'Duration can only be set for a selected service';
        continue;
      }

      if ((typeof value !== 'number' && typeof value !== 'string')
        || (typeof value === 'string' && value.trim() === '')
        || !Number.isInteger(Number(value))
        || Number(value) <= 0) {
        errors[field] = 'Duration must be a positive integer';
      }
    }
  });

  if (Object.keys(errors).length) {
    throw createValidationError(errors);
  }
}

async function addServiceDurationSnapshots(customerId, petEntries, connection, previousPetEntries = []) {
  const entries = [];

  for (const petEntry of petEntries) {
    const previousPetEntry = previousPetEntries.find(
      (entry) => Number(entry.pet_id) === Number(petEntry.pet_id),
    );
    const pet = await petRepository.getPetById(Number(petEntry.pet_id), connection);
    if (!pet) {
      throw createValidationError({ pet_id: 'Pet not found' });
    }
    if (pet.status !== 'ACTIVE') {
      throw createValidationError({ pet_id: 'Pet is not active' });
    }

    const relationship = await petRepository.findRelationshipByPetAndCustomer(
      Number(petEntry.pet_id),
      customerId,
      connection,
    );
    if (!relationship) {
      throw createValidationError({ pet_id: 'Pet does not belong to this customer' });
    }

    const services = [];
    for (const serviceId of petEntry.service_ids) {
      const service = await appointmentRepository.findServiceById(Number(serviceId), connection);
      if (!service || service.status !== 'ACTIVE') {
        throw createValidationError({ service_ids: 'Service is not available' });
      }

      if (!isSpeciesCompatible(service.species, pet.species)) {
        throw createValidationError({ service_ids: 'Service is not compatible with pet species' });
      }

      const previousService = previousPetEntry?.services.find(
        (entry) => Number(entry.id) === Number(service.id),
      );
      const hasCustomDuration = petEntry.service_durations
        && Object.prototype.hasOwnProperty.call(petEntry.service_durations, String(service.id));
      const durationMinutes = hasCustomDuration
        ? Number(petEntry.service_durations[String(service.id)])
        : previousService?.duration_minutes ?? Number(service.duration_minutes);
      if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
        throw createValidationError({ service_ids: 'Service duration is invalid' });
      }
      services.push({ serviceId: Number(service.id), durationMinutes });
    }
    entries.push({ ...petEntry, services });
  }

  return entries;
}

async function listAppointments(filters = {}) {
  const normalizedFilters = { ...filters };
  if (filters.appointmentDate) {
    normalizedFilters.appointmentDate = normalizeDateString(filters.appointmentDate);
  }

  return appointmentRepository.listAppointments(normalizedFilters);
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

  if (!VALID_STATUSES.has(status) || status === 'AWAITING_CUSTOMER') {
    throw createValidationError({ status: '預約狀態無效。' });
  }

  await validatePetEntries(customerId, petEntries);

  return withTransaction(async (connection) => {
    const appointmentId = await appointmentRepository.createAppointment({
      customer_id: customerId,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      status,
      note: payload.note || null,
    }, connection);

    const petEntriesWithSnapshots = await addServiceDurationSnapshots(customerId, petEntries, connection);
    await appointmentRepository.replaceAppointmentPetRelations(appointmentId, petEntriesWithSnapshots, connection);
    await dailyOperationsRepository.create(appointmentId, connection);
    const appointment = await appointmentRepository.getAppointmentById(appointmentId, connection);
    return { appointment };
  });
}

async function prepareAcceptedBookingRequest(appointmentId, connection) {
  const [requests] = await connection.query(
    `SELECT brd.service_type, brd.requested_check_out, a.customer_id,
            a.appointment_date, a.appointment_time
     FROM booking_request_details brd
     INNER JOIN appointments a ON a.id = brd.appointment_id AND a.shop_id = brd.shop_id
     WHERE brd.appointment_id = ? AND brd.shop_id = ?
     LIMIT 1`,
    [appointmentId, getCurrentShopId()],
  );
  if (!requests.length) return;

  await connection.query(
    'SELECT id FROM shops WHERE id = ? LIMIT 1 FOR UPDATE',
    [getCurrentShopId()],
  );
  const appointmentTime = String(requests[0].appointment_time).slice(0, 8);
  const [petRows] = await connection.query(
    `SELECT DISTINCT p.species
     FROM appointment_pets ap
     INNER JOIN pets p ON p.id = ap.pet_id AND p.shop_id = ap.shop_id
     WHERE ap.appointment_id = ? AND ap.shop_id = ?`,
    [appointmentId, getCurrentShopId()],
  );
  if (!petRows.length) throw createBookingCapacityUnavailableError();
  const species = petRows[0].species;
  const [rules] = await connection.query(
    `SELECT id, capacity FROM booking_schedule_rules
     WHERE shop_id = ? AND species = ? AND start_time = ?
       AND status = 'ACTIVE' AND is_closed = FALSE
     LIMIT 1 FOR UPDATE`,
    [getCurrentShopId(), species, appointmentTime],
  );
  if (!rules.length) throw createBookingCapacityUnavailableError();
  const [overrides] = await connection.query(
    `SELECT start_time, is_closed, capacity FROM booking_schedule_overrides
     WHERE shop_id = ? AND override_date = ? AND species = ?
     FOR UPDATE`,
    [getCurrentShopId(), requests[0].appointment_date, species],
  );
  const dateOverride = overrides.find((override) => override.start_time === null);
  const timeOverride = overrides.find((override) => (
    override.start_time !== null && String(override.start_time).slice(0, 8) === appointmentTime
  ));
  if (dateOverride?.is_closed || timeOverride?.is_closed) {
    throw createBookingCapacityUnavailableError();
  }
  const capacity = Number(timeOverride?.capacity ?? rules[0].capacity);
  const [confirmedAppointments] = await connection.query(
    `SELECT a.id
     FROM appointments a
     WHERE a.shop_id = ? AND a.appointment_date = ? AND a.appointment_time = ?
       AND a.status IN ('AWAITING_CUSTOMER', 'SCHEDULED', 'CONFIRMED') AND a.id <> ?
       AND EXISTS (
         SELECT 1 FROM appointment_pets ap
         INNER JOIN pets p ON p.id = ap.pet_id AND p.shop_id = ap.shop_id
         WHERE ap.appointment_id = a.id AND ap.shop_id = a.shop_id AND p.species = ?
       )
     FOR UPDATE`,
    [
      getCurrentShopId(),
      requests[0].appointment_date,
      appointmentTime,
      appointmentId,
      species,
    ],
  );
  if (confirmedAppointments.length >= capacity) throw createBookingCapacityUnavailableError();

  if (requests[0].service_type === 'BOARDING') {
    const checkOut = toSqlDateTime(requests[0].requested_check_out);
    const appointmentDate = requests[0].appointment_date instanceof Date
      ? requests[0].appointment_date.toISOString().slice(0, 10)
      : String(requests[0].appointment_date).slice(0, 10);
    const [overlappingBookings] = await connection.query(
      `SELECT COUNT(*) AS total
       FROM (
         SELECT a.id AS booking_id
         FROM booking_request_details brd
         INNER JOIN appointments a ON a.id = brd.appointment_id AND a.shop_id = brd.shop_id
         WHERE brd.shop_id = ? AND brd.service_type = 'BOARDING'
           AND a.status IN ('AWAITING_CUSTOMER', 'SCHEDULED', 'CONFIRMED')
           AND a.id <> ?
           AND TIMESTAMP(a.appointment_date, a.appointment_time) < ?
           AND brd.requested_check_out > TIMESTAMP(?, ?)
         UNION
         SELECT -b.id AS booking_id
         FROM boardings b
         LEFT JOIN booking_request_details brd
           ON brd.appointment_id = b.appointment_id AND brd.shop_id = b.shop_id
         WHERE b.shop_id = ? AND b.status IN ('PENDING', 'IN_PROGRESS')
           AND b.expected_check_in < ? AND b.expected_check_out > TIMESTAMP(?, ?)
           AND brd.appointment_id IS NULL
       ) AS overlapping`,
      [
        getCurrentShopId(),
        appointmentId,
        checkOut,
        appointmentDate,
        appointmentTime,
        getCurrentShopId(),
        checkOut,
        appointmentDate,
        appointmentTime,
      ],
    );
    if (Number(overlappingBookings[0]?.total || 0) >= capacity) {
      throw createBookingCapacityUnavailableError();
    }
  }

  const [operations] = await connection.query(
    'SELECT id FROM daily_operations WHERE appointment_id = ? AND shop_id = ? LIMIT 1',
    [appointmentId, getCurrentShopId()],
  );
  const dailyOperationId = operations[0]
    ? Number(operations[0].id)
    : await dailyOperationsRepository.create(appointmentId, connection);

  const [serviceRows] = await connection.query(
    `SELECT aps.service_id, aps.duration_minutes, s.type
     FROM appointment_pets ap
     INNER JOIN appointment_pet_services aps
       ON aps.appointment_pet_id = ap.id AND aps.shop_id = ap.shop_id
     INNER JOIN services s ON s.id = aps.service_id AND s.shop_id = aps.shop_id
     WHERE ap.appointment_id = ? AND ap.shop_id = ?`,
    [appointmentId, getCurrentShopId()],
  );
  const serviceDuration = serviceRows.reduce(
    (total, service) => total + Number(service.duration_minutes || 0),
    0,
  );
  const startAt = `${requests[0].appointment_date instanceof Date
    ? requests[0].appointment_date.toISOString().slice(0, 10)
    : String(requests[0].appointment_date).slice(0, 10)} ${appointmentTime}`;
  const endAt = requests[0].service_type === 'BOARDING'
    ? toSqlDateTime(requests[0].requested_check_out)
    : addMinutesToDateTime(startAt.slice(0, 10), startAt.slice(11), serviceDuration || 30);
  const resourceTypes = requests[0].service_type === 'BOARDING'
    ? ['BOARDING_ROOM']
    : ['STAFF', 'GROOMING_STATION'];

  for (const resourceType of resourceTypes) {
    const [resources] = await connection.query(
      `SELECT id, staff_id, capacity
       FROM booking_resources
       WHERE shop_id = ? AND status = 'ACTIVE' AND resource_type = ?
         AND (service_type = ? OR service_type = 'BOTH')
       ORDER BY id ASC`,
      [getCurrentShopId(), resourceType, requests[0].service_type],
    );
    if (!resources.length) continue;

    let assignedResource = null;
    for (const resource of resources) {
      await connection.query(
        'SELECT id FROM booking_resources WHERE id = ? AND shop_id = ? FOR UPDATE',
        [resource.id, getCurrentShopId()],
      );
      if (resourceType !== 'BOARDING_ROOM') {
        const [hours] = await connection.query(
          `SELECT start_time, end_time FROM booking_resource_hours
           WHERE shop_id = ? AND resource_id = ? AND weekday = DAYNAME(?)`,
          [getCurrentShopId(), resource.id, requests[0].appointment_date],
        );
        if (hours.length && !hours.some((window) => (
          String(window.start_time) <= startAt.slice(11)
          && String(window.end_time) >= endAt.slice(11)
        ))) {
          continue;
        }
      }

      const [blocks] = await connection.query(
        `SELECT id FROM booking_resource_blocks
         WHERE shop_id = ? AND resource_id = ?
           AND TIMESTAMP(block_date, COALESCE(start_time, '00:00:00')) < ?
           AND CASE
             WHEN end_time IS NULL THEN TIMESTAMP(DATE_ADD(block_date, INTERVAL 1 DAY), '00:00:00')
             ELSE TIMESTAMP(block_date, end_time)
           END > ?
         LIMIT 1`,
        [getCurrentShopId(), resource.id, endAt, startAt],
      );
      if (blocks.length) continue;

      const [allocations] = await connection.query(
        `SELECT COALESCE(SUM(units), 0) AS total
         FROM appointment_resource_assignments
         WHERE shop_id = ? AND resource_id = ? AND start_at < ? AND end_at > ?`,
        [getCurrentShopId(), resource.id, endAt, startAt],
      );
      if (Number(resource.capacity) - Number(allocations[0]?.total || 0) < 1) continue;
      assignedResource = resource;
      break;
    }
    if (!assignedResource) throw createBookingResourceUnavailableError();

    await connection.query(
      `INSERT INTO appointment_resource_assignments
         (shop_id, appointment_id, resource_id, start_at, end_at, units)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [getCurrentShopId(), appointmentId, assignedResource.id, startAt, endAt],
    );
    if (resourceType === 'STAFF' && assignedResource.staff_id) {
      await connection.query(
        `UPDATE daily_operations SET responsible_staff_id = ?
         WHERE id = ? AND shop_id = ? AND responsible_staff_id IS NULL`,
        [assignedResource.staff_id, dailyOperationId, getCurrentShopId()],
      );
    }
  }

  if (requests[0].service_type !== 'BOARDING') return;
  const [boardingEntries] = await connection.query(
    `SELECT ap.pet_id, aps.service_id
     FROM appointment_pets ap
     INNER JOIN appointment_pet_services aps
       ON aps.appointment_pet_id = ap.id AND aps.shop_id = ap.shop_id
     INNER JOIN services s ON s.id = aps.service_id AND s.shop_id = aps.shop_id
     WHERE ap.appointment_id = ? AND ap.shop_id = ? AND s.type = 'BOARDING'`,
    [appointmentId, getCurrentShopId()],
  );
  for (const entry of boardingEntries) {
    const [existingBoardings] = await connection.query(
      'SELECT id FROM boardings WHERE appointment_id = ? AND pet_id = ? AND service_id = ? AND shop_id = ? LIMIT 1',
      [appointmentId, entry.pet_id, entry.service_id, getCurrentShopId()],
    );
    if (existingBoardings.length) continue;
    await connection.query(
      `INSERT INTO boardings
         (shop_id, customer_id, pet_id, service_id, appointment_id, daily_operation_id,
          expected_check_in, expected_check_out, status)
       VALUES (?, ?, ?, ?, ?, ?, TIMESTAMP(?, ?), ?, 'PENDING')`,
      [
        getCurrentShopId(),
        requests[0].customer_id,
        entry.pet_id,
        entry.service_id,
        appointmentId,
        dailyOperationId,
        requests[0].appointment_date,
        requests[0].appointment_time,
        requests[0].requested_check_out,
      ],
    );
  }
}

async function reserveBookingProducts(appointmentId, connection) {
  const [requestedProducts] = await connection.query(
    `SELECT id, product_id, quantity, status
     FROM booking_request_products
     WHERE appointment_id = ? AND shop_id = ?
     ORDER BY product_id ASC
     FOR UPDATE`,
    [appointmentId, getCurrentShopId()],
  );
  for (const item of requestedProducts) {
    if (item.status !== 'PENDING') continue;
    const [products] = await connection.query(
      `SELECT stock_quantity, status
       FROM products
       WHERE id = ? AND shop_id = ?
       LIMIT 1 FOR UPDATE`,
      [item.product_id, getCurrentShopId()],
    );
    if (!products.length || products[0].status !== 'ACTIVE'
      || Number(products[0].stock_quantity) < Number(item.quantity)) {
      throw createBookingProductUnavailableError();
    }
    await connection.query(
      `UPDATE products SET stock_quantity = stock_quantity - ?
       WHERE id = ? AND shop_id = ? AND stock_quantity >= ?`,
      [item.quantity, item.product_id, getCurrentShopId(), item.quantity],
    );
    const [reserved] = await connection.query(
      `UPDATE booking_request_products SET status = 'RESERVED'
       WHERE id = ? AND shop_id = ? AND status = 'PENDING'`,
      [item.id, getCurrentShopId()],
    );
    if (!reserved.affectedRows) throw createBookingProductUnavailableError();
  }
}

async function releaseBookingProducts(appointmentId, connection) {
  const [reservedProducts] = await connection.query(
    `SELECT id, product_id, quantity, status
     FROM booking_request_products
     WHERE appointment_id = ? AND shop_id = ? AND status IN ('PENDING', 'RESERVED')
     ORDER BY product_id ASC
     FOR UPDATE`,
    [appointmentId, getCurrentShopId()],
  );
  for (const item of reservedProducts) {
    if (item.status === 'RESERVED') {
      await connection.query(
        'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ? AND shop_id = ?',
        [item.quantity, item.product_id, getCurrentShopId()],
      );
    }
    await connection.query(
      `UPDATE booking_request_products SET status = 'RELEASED'
       WHERE id = ? AND shop_id = ? AND status IN ('PENDING', 'RESERVED')`,
      [item.id, getCurrentShopId()],
    );
  }
}

async function createMemberOnboarding(appointmentId, connection) {
  const [rows] = await connection.query(
    `SELECT a.customer_id, a.appointment_date, a.appointment_time,
            brd.service_type, brd.requested_check_out, brd.customer_member_id,
            c.name AS customer_name, c.phone AS customer_phone,
            p.id AS pet_id, p.name AS pet_name, p.species, p.gender, p.breed, p.weight,
            aps.service_id
     FROM appointments a
     INNER JOIN booking_request_details brd
       ON brd.appointment_id = a.id AND brd.shop_id = a.shop_id
     INNER JOIN customers c ON c.id = a.customer_id AND c.shop_id = a.shop_id
     INNER JOIN appointment_pets ap ON ap.appointment_id = a.id AND ap.shop_id = a.shop_id
     INNER JOIN pets p ON p.id = ap.pet_id AND p.shop_id = ap.shop_id
     INNER JOIN appointment_pet_services aps
       ON aps.appointment_pet_id = ap.id AND aps.shop_id = ap.shop_id
     WHERE a.id = ? AND a.shop_id = ?
     LIMIT 1`,
    [appointmentId, getCurrentShopId()],
  );
  const request = rows[0];
  if (!request || !request.customer_member_id) {
    const error = new Error('會員資料尚未建立，請先由店家核對並連結客戶資料。');
    error.statusCode = 409;
    error.code = 'CUSTOMER_MEMBER_LINK_REQUIRED';
    throw error;
  }

  const [contracts] = await connection.query(
    `SELECT id FROM contract_versions
     WHERE shop_id = ? AND service_type = ? AND status = 'PUBLISHED' AND is_current = TRUE
     LIMIT 1 FOR UPDATE`,
    [getCurrentShopId(), request.service_type],
  );
  if (!contracts.length) throw createContractUnavailableError(request.service_type);

  const checkOut = request.requested_check_out ? toSqlDateTime(request.requested_check_out) : null;
  const appointmentDate = request.appointment_date instanceof Date
    ? request.appointment_date.toISOString().slice(0, 10)
    : String(request.appointment_date).slice(0, 10);
  const appointmentTime = String(request.appointment_time).slice(0, 8);
  const customerData = { name: request.customer_name, phone: request.customer_phone };
  const petData = {
    name: request.pet_name,
    species: request.species,
    gender: request.gender || 'UNKNOWN',
    breed: request.breed || '',
    weight: request.weight === null ? '' : String(request.weight),
    personality: [],
    medical_history: [],
    other_history: '',
    note: '',
  };
  const appointmentData = {
    appointment_date: appointmentDate,
    appointment_time: appointmentTime,
    service_id: Number(request.service_id),
    ...(checkOut ? { check_out_date: checkOut.slice(0, 10), check_out_time: checkOut.slice(11, 19) } : {}),
  };
  const tokenHash = crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex');
  const [onboarding] = await connection.query(
    `INSERT INTO onboardings
       (shop_id, public_token_hash, contract_version_id, appointment_id, customer_member_id,
        status, customer_data, appointment_data, customer_resolution, matched_customer_id)
     VALUES (?, ?, ?, ?, ?, 'NOT_STARTED', ?, ?, 'EXISTING', ?)`,
    [
      getCurrentShopId(),
      tokenHash,
      contracts[0].id,
      appointmentId,
      request.customer_member_id,
      JSON.stringify(customerData),
      JSON.stringify(appointmentData),
      request.customer_id,
    ],
  );
  await connection.query(
    `INSERT INTO onboarding_pets
       (shop_id, onboarding_id, pet_data, resolution, matched_pet_id)
     VALUES (?, ?, ?, 'EXISTING', ?)`,
    [getCurrentShopId(), onboarding.insertId, JSON.stringify(petData), request.pet_id],
  );
}

async function updateAppointment(appointmentId, payload = {}) {
  const existing = await appointmentRepository.findAppointmentById(appointmentId);
  if (!existing) {
    throw createNotFoundError('APPOINTMENT_NOT_FOUND', 'Appointment not found');
  }

  const hasFullAppointmentUpdate = (
    payload.customer_id !== undefined
    || payload.appointment_date !== undefined
    || payload.appointment_time !== undefined
    || payload.note !== undefined
    || payload.pets !== undefined
  );

  const nextStatus = payload.status !== undefined ? payload.status : existing.status;
  if (!VALID_STATUSES.has(nextStatus)) {
    throw createValidationError({ status: '預約狀態無效。' });
  }

  if (!hasFullAppointmentUpdate && Object.prototype.hasOwnProperty.call(payload, 'status')) {
    return withTransaction(async (connection) => {
      const [lockedAppointments] = await connection.query(
        `SELECT status FROM appointments
         WHERE id = ? AND shop_id = ?
         LIMIT 1 FOR UPDATE`,
        [appointmentId, getCurrentShopId()],
      );
      if (!lockedAppointments.length) {
        throw createNotFoundError('APPOINTMENT_NOT_FOUND', 'Appointment not found');
      }
      const currentStatus = lockedAppointments[0].status;
      const [bookingRequests] = await connection.query(
        `SELECT id FROM booking_request_details
         WHERE appointment_id = ? AND shop_id = ?
         LIMIT 1 FOR UPDATE`,
        [appointmentId, getCurrentShopId()],
      );
      if (bookingRequests.length) {
        if (nextStatus === currentStatus) {
          return { appointment: await appointmentRepository.getAppointmentById(appointmentId, connection) };
        }
        if (currentStatus === 'PENDING' && nextStatus === 'AWAITING_CUSTOMER') {
          await appointmentRepository.updateAppointment(appointmentId, { status: nextStatus }, connection);
          await prepareAcceptedBookingRequest(appointmentId, connection);
          await reserveBookingProducts(appointmentId, connection);
          await createMemberOnboarding(appointmentId, connection);
          return { appointment: await appointmentRepository.getAppointmentById(appointmentId, connection) };
        }
        if (nextStatus === 'CANCELLED' && currentStatus !== 'CANCELLED') {
          await appointmentRepository.updateAppointment(appointmentId, { status: nextStatus }, connection);
          await connection.query(
            'DELETE FROM appointment_resource_assignments WHERE shop_id = ? AND appointment_id = ?',
            [getCurrentShopId(), appointmentId],
          );
          await releaseBookingProducts(appointmentId, connection);
          await connection.query(
            `UPDATE onboardings SET status = 'EXPIRED'
             WHERE appointment_id = ? AND shop_id = ? AND status IN ('NOT_STARTED', 'IN_PROGRESS')`,
            [appointmentId, getCurrentShopId()],
          );
          return { appointment: await appointmentRepository.getAppointmentById(appointmentId, connection) };
        }
        const transitionError = new Error('線上預約申請僅能由店家接受或取消；補件完成後才會正式確認。');
        transitionError.statusCode = 409;
        transitionError.code = 'BOOKING_STATUS_TRANSITION_INVALID';
        throw transitionError;
      }

      if (nextStatus === 'AWAITING_CUSTOMER') {
        const transitionError = new Error('僅能透過接受線上申請進入待補資料狀態。');
        transitionError.statusCode = 409;
        transitionError.code = 'BOOKING_STATUS_TRANSITION_INVALID';
        throw transitionError;
      }

      await appointmentRepository.updateAppointment(appointmentId, { status: nextStatus }, connection);
      if (!['SCHEDULED', 'CONFIRMED'].includes(currentStatus)
        && ['SCHEDULED', 'CONFIRMED'].includes(nextStatus)) {
        await prepareAcceptedBookingRequest(appointmentId, connection);
      }
      if (nextStatus === 'CANCELLED') {
        await connection.query(
          'DELETE FROM appointment_resource_assignments WHERE shop_id = ? AND appointment_id = ?',
          [getCurrentShopId(), appointmentId],
        );
      }
      return { appointment: await appointmentRepository.getAppointmentById(appointmentId, connection) };
    });
  }

  const targetCustomerId = payload.customer_id !== undefined && payload.customer_id !== null && payload.customer_id !== ''
    ? Number(payload.customer_id)
    : Number(existing.customer_id);

  if (payload.customer_id !== undefined && payload.customer_id !== null && payload.customer_id !== '') {
    const customer = await appointmentRepository.findCustomerById(targetCustomerId);
    if (!customer) {
      throw createNotFoundError('CUSTOMER_NOT_FOUND', 'Customer not found');
    }
  }

  const pets = Array.isArray(payload.pets) ? payload.pets : null;
  const existingPetEntries = pets ?? (await appointmentRepository.getAppointmentById(appointmentId))?.pets ?? [];
  if (existingPetEntries.length) {
    for (let index = 0; index < existingPetEntries.length; index += 1) {
      const petId = Number(existingPetEntries[index].pet_id ?? existingPetEntries[index].id);
      const [relationship] = await getPool().query(
        'SELECT 1 FROM pet_customer_relationships WHERE pet_id = ? AND customer_id = ? AND shop_id = ? LIMIT 1',
        [petId, targetCustomerId, getCurrentShopId()],
      );
      if (!relationship.length) {
        throw createValidationError({ pets: 'Appointment pets must belong to the selected customer' });
      }
    }
  }

  if (pets) {
    await validatePetEntries(targetCustomerId, pets);
    validateCustomServiceDurations(pets);
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
  if (updatePayload.appointment_date !== undefined && !updatePayload.appointment_date) {
    throw createValidationError({ appointment_date: 'Appointment date is required' });
  }
  if (updatePayload.appointment_time !== undefined && !updatePayload.appointment_time) {
    throw createValidationError({ appointment_time: 'Appointment time is required' });
  }

  return withTransaction(async (connection) => {
    const [bookingRequests] = await connection.query(
      `SELECT id FROM booking_request_details
       WHERE appointment_id = ? AND shop_id = ?
       LIMIT 1 FOR UPDATE`,
      [appointmentId, getCurrentShopId()],
    );
    if (bookingRequests.length) {
      const transitionError = new Error('線上預約申請的日期、時間與寵物資料不可直接修改，請聯絡客戶處理。');
      transitionError.statusCode = 409;
      transitionError.code = 'BOOKING_STATUS_TRANSITION_INVALID';
      throw transitionError;
    }

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

    await appointmentRepository.updateAppointment(appointmentId, patchValues, connection);
    if (!['SCHEDULED', 'CONFIRMED'].includes(appointmentData.status)
      && ['SCHEDULED', 'CONFIRMED'].includes(finalStatus)) {
      await prepareAcceptedBookingRequest(appointmentId, connection);
    }
    if (finalStatus === 'CANCELLED') {
      await connection.query(
        'DELETE FROM appointment_resource_assignments WHERE shop_id = ? AND appointment_id = ?',
        [getCurrentShopId(), appointmentId],
      );
    }
    if (pets) {
      const previousAppointment = await appointmentRepository.getAppointmentById(appointmentId, connection);
      const petEntriesWithSnapshots = await addServiceDurationSnapshots(
        customerId,
        pets,
        connection,
        previousAppointment?.pets,
      );
      await appointmentRepository.replaceAppointmentPetRelations(appointmentId, petEntriesWithSnapshots, connection);
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
