const { getPool } = require('../config/database');
const { getCurrentShopId } = require('../utils/shop-context');

const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

function createValidationError(fields) {
  const error = new Error('Validation failed');
  error.statusCode = 400;
  error.code = 'VALIDATION_ERROR';
  error.fields = fields;
  return error;
}

function normalizeDate(value, field) {
  const date = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createValidationError({ [field]: '日期格式必須為 YYYY-MM-DD。' });
  }
  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw createValidationError({ [field]: '日期無效。' });
  }
  return date;
}

function normalizeTime(value) {
  const time = String(value ?? '').trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time)) {
    throw createValidationError({ appointment_time: '請選擇有效的預約時間。' });
  }
  return time.length === 5 ? `${time}:00` : time;
}

function normalizeCheckOut(dateValue, timeValue) {
  const date = normalizeDate(dateValue, 'check_out_date');
  const time = normalizeTime(timeValue);
  return { date, time, dateTime: `${date} ${time}` };
}

function sqlWeekday(date) {
  return WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

async function isResourceAvailable({
  date,
  endDate = date,
  startTime,
  endTime,
  serviceType,
  resourceType,
  connection = getPool(),
}) {
  const [resources] = await connection.query(
    `SELECT id, capacity FROM booking_resources
     WHERE shop_id = ? AND status = 'ACTIVE' AND resource_type = ?
       AND (service_type = ? OR service_type = 'BOTH')`,
    [getCurrentShopId(), resourceType, serviceType],
  );
  if (resources.length === 0) return true;

  const weekday = sqlWeekday(date);
  let totalCapacity = 0;
  const availableIds = [];
  for (const resource of resources) {
    const [hours] = await connection.query(
      `SELECT start_time, end_time FROM booking_resource_hours
       WHERE shop_id = ? AND resource_id = ? AND weekday = ?`,
      [getCurrentShopId(), resource.id, weekday],
    );
    if (resourceType !== 'BOARDING_ROOM' && hours.length
      && !hours.some((window) => String(window.start_time) <= startTime && String(window.end_time) >= endTime)) {
      continue;
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
      [getCurrentShopId(), resource.id, `${endDate} ${endTime}`, `${date} ${startTime}`],
    );
    if (blocks.length) continue;
    availableIds.push(Number(resource.id));
    totalCapacity += Number(resource.capacity);
  }
  if (!availableIds.length) return false;

  const placeholders = availableIds.map(() => '?').join(', ');
  const [allocations] = await connection.query(
    `SELECT COALESCE(SUM(units), 0) AS total
     FROM appointment_resource_assignments
     WHERE shop_id = ? AND resource_id IN (${placeholders})
       AND start_at < ? AND end_at > ?`,
    [getCurrentShopId(), ...availableIds, `${endDate} ${endTime}`, `${date} ${startTime}`],
  );
  return totalCapacity - Number(allocations[0]?.total || 0) > 0;
}

async function listAvailabilityForService(pet, service, query = {}) {
  const date = normalizeDate(query.date, 'date');
  const checkOut = service.type === 'BOARDING'
    ? normalizeCheckOut(query.check_out_date, query.check_out_time)
    : null;

  const weekday = sqlWeekday(date);
  const [businessHours] = await getPool().query(
    `SELECT is_closed, open_time, close_time
     FROM shop_business_hours
     WHERE shop_id = ? AND weekday = ?
     LIMIT 1`,
    [getCurrentShopId(), weekday],
  );
  if (!businessHours[0] || businessHours[0].is_closed) return { slots: [] };

  const [rules] = await getPool().query(
    `SELECT start_time, capacity FROM booking_schedule_rules
     WHERE shop_id = ? AND species = ? AND status = 'ACTIVE' AND is_closed = FALSE
     ORDER BY start_time ASC`,
    [getCurrentShopId(), pet.species],
  );
  const [overrides] = await getPool().query(
    `SELECT start_time, is_closed, capacity FROM booking_schedule_overrides
     WHERE shop_id = ? AND override_date = ? AND species = ?`,
    [getCurrentShopId(), date, pet.species],
  );
  if (overrides.some((override) => override.start_time === null && override.is_closed)) {
    return { slots: [] };
  }
  const overrideByTime = new Map(overrides.map((override) => [String(override.start_time).slice(0, 8), override]));
  const serviceType = service.type;
  const slots = [];

  for (const rule of rules) {
    const startTime = String(rule.start_time).slice(0, 8);
    if (checkOut && checkOut.dateTime <= `${date} ${startTime}`) continue;
    const override = overrideByTime.get(startTime);
    if (override?.is_closed) continue;
    const capacity = override?.capacity === null || override?.capacity === undefined
      ? Number(rule.capacity)
      : Number(override.capacity);
    const startMinute = Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3, 5));
    const duration = service.type === 'BOARDING' ? 0 : Number(service.duration_minutes || 0);
    const endMinute = startMinute + Math.max(duration, 1);
    const endTime = `${String(Math.floor(endMinute / 60) % 24).padStart(2, '0')}:${String(endMinute % 60).padStart(2, '0')}:00`;
    if (startTime < String(businessHours[0].open_time).slice(0, 8)
      || endMinute > (Number(String(businessHours[0].close_time).slice(0, 2)) * 60
        + Number(String(businessHours[0].close_time).slice(3, 5)))) {
      continue;
    }

    const [booked] = await getPool().query(
      `SELECT COUNT(DISTINCT ap.id) AS total
       FROM appointments a
       INNER JOIN appointment_pets ap ON ap.appointment_id = a.id AND ap.shop_id = a.shop_id
       INNER JOIN pets p ON p.id = ap.pet_id AND p.shop_id = ap.shop_id
       WHERE a.shop_id = ? AND a.appointment_date = ? AND a.appointment_time = ?
         AND a.status IN ('AWAITING_CUSTOMER', 'SCHEDULED', 'CONFIRMED') AND p.species = ?`,
      [getCurrentShopId(), date, startTime, pet.species],
    );
    if (Number(booked[0]?.total || 0) >= capacity) continue;

    const requiredResources = serviceType === 'BOARDING'
      ? [['BOARDING_ROOM']]
      : [['STAFF'], ['GROOMING_STATION']];
    let resourcesAvailable = true;
    for (const [resourceType] of requiredResources) {
      if (!await isResourceAvailable({
        date,
        endDate: checkOut?.date || date,
        startTime,
        endTime: serviceType === 'BOARDING' && checkOut ? checkOut.time : endTime,
        serviceType,
        resourceType,
      })) {
        resourcesAvailable = false;
        break;
      }
    }
    if (!resourcesAvailable) continue;

    if (serviceType === 'BOARDING' && checkOut) {
      const [overlappingBoardings] = await getPool().query(
        `SELECT COUNT(*) AS total
         FROM booking_request_details brd
         INNER JOIN appointments a ON a.id = brd.appointment_id AND a.shop_id = brd.shop_id
         WHERE brd.shop_id = ? AND brd.service_type = 'BOARDING'
           AND a.status IN ('AWAITING_CUSTOMER', 'SCHEDULED', 'CONFIRMED')
           AND TIMESTAMP(a.appointment_date, a.appointment_time) < ?
           AND brd.requested_check_out > TIMESTAMP(?, ?)`,
        [getCurrentShopId(), checkOut.dateTime, date, startTime],
      );
      if (Number(overlappingBoardings[0]?.total || 0) >= capacity) continue;
      const [existingBoardings] = await getPool().query(
        `SELECT COUNT(*) AS total
         FROM boardings
         WHERE shop_id = ? AND status IN ('PENDING', 'IN_PROGRESS')
           AND expected_check_in < ? AND expected_check_out > TIMESTAMP(?, ?)`,
        [getCurrentShopId(), checkOut.dateTime, date, startTime],
      );
      if (Number(existingBoardings[0]?.total || 0) >= capacity) continue;
    }

    slots.push({ time: startTime.slice(0, 5), capacity_remaining: Math.max(0, capacity - Number(booked[0]?.total || 0)) });
  }

  return { slots };
}

module.exports = {
  listAvailabilityForService,
};
