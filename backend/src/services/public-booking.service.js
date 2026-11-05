const crypto = require('crypto');
const bookingSessionRepository = require('../data/booking-session.repository');
const petRepository = require('../data/pet.repository');
const serviceRepository = require('../data/service.repository');
const smsProvider = require('./sms-provider');
const { getPool } = require('../config/database');
const { getCurrentShopId, setCurrentShopId } = require('../utils/shop-context');

const SESSION_LIFETIME_MILLISECONDS = 2 * 60 * 60 * 1000;
const OTP_LIFETIME_MINUTES = 5;
const OTP_RESEND_DELAY_SECONDS = 60;
const OTP_HOURLY_LIMIT = 3;
const OTP_MAX_ATTEMPTS = 5;
const BOOKING_SESSION_TOKEN_PATTERN = /^[a-f0-9]{64}$/;
const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

function createError(message, statusCode, code, fields) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  if (fields) error.fields = fields;
  return error;
}

function createInvalidSessionError() {
  return createError('Booking session is invalid', 401, 'BOOKING_SESSION_INVALID');
}

function createValidationError(fields) {
  return createError('Validation failed', 400, 'VALIDATION_ERROR', fields);
}

function normalizePhone(value) {
  const phone = String(value ?? '').replace(/[()\s-]/g, '');
  if (!/^\+?\d{8,15}$/.test(phone)) {
    throw createValidationError({ phone: '請輸入有效的手機號碼。' });
  }
  return phone;
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

function otpHash(challengeId, code) {
  const secret = process.env.BOOKING_OTP_SECRET;
  if (!secret) {
    throw createError('Booking OTP secret has not been configured', 503, 'BOOKING_OTP_NOT_CONFIGURED');
  }
  return crypto.createHmac('sha256', secret).update(`${challengeId}:${code}`).digest('hex');
}

async function sendOtp(phoneValue) {
  const phone = normalizePhone(phoneValue);
  const shopId = getCurrentShopId();
  const pool = getPool();
  const [recent] = await pool.query(
    `SELECT created_at
     FROM booking_otp_challenges
     WHERE shop_id = ? AND phone = ? AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR)
     ORDER BY created_at DESC
     LIMIT 3`,
    [shopId, phone],
  );
  if (recent.length >= OTP_HOURLY_LIMIT) {
    throw createError('OTP request limit reached', 429, 'OTP_RATE_LIMITED');
  }
  if (recent[0] && (Date.now() - new Date(recent[0].created_at).getTime()) < OTP_RESEND_DELAY_SECONDS * 1000) {
    throw createError('OTP resend is temporarily unavailable', 429, 'OTP_RESEND_TOO_SOON');
  }

  const [shops] = await pool.query('SELECT name FROM shops WHERE id = ? LIMIT 1', [shopId]);
  if (!shops[0]) throw createError('Shop is unavailable', 404, 'SHOP_NOT_FOUND');
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const [result] = await pool.query(
    `INSERT INTO booking_otp_challenges (shop_id, phone, code_hash, expires_at)
     VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE))`,
    [shopId, phone, 'PENDING', OTP_LIFETIME_MINUTES],
  );
  const challengeId = result.insertId;

  try {
    const codeHash = otpHash(challengeId, code);
    await pool.query('UPDATE booking_otp_challenges SET code_hash = ? WHERE id = ? AND shop_id = ?', [
      codeHash,
      challengeId,
      shopId,
    ]);
    const shopName = String(shops[0].name).replace(/[\r\n【】]/g, '').slice(0, 40);
    await smsProvider.sendBookingOtp({
      phone,
      code,
      message: `【${shopName}】您正在進行預約手機驗證，驗證碼 ${code}，5 分鐘內有效。若非本人操作請忽略。`,
    });
  } catch (error) {
    await pool.query('DELETE FROM booking_otp_challenges WHERE id = ? AND shop_id = ?', [challengeId, shopId]);
    throw error;
  }

  return { message: '驗證碼已發送，請留意店家名稱開頭的簡訊。' };
}

async function verifyOtp(phoneValue, codeValue) {
  const phone = normalizePhone(phoneValue);
  const code = String(codeValue ?? '').trim();
  if (!/^\d{6}$/.test(code)) throw createValidationError({ code: '請輸入 6 位數驗證碼。' });

  const connection = await getPool().getConnection();
  let token;
  let customerId;
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT id, shop_id, code_hash, status, attempts
       FROM booking_otp_challenges
       WHERE shop_id = ? AND phone = ? AND status = 'PENDING' AND expires_at > UTC_TIMESTAMP()
       ORDER BY created_at DESC
       LIMIT 1 FOR UPDATE`,
      [getCurrentShopId(), phone],
    );
    const challenge = rows[0];
    if (!challenge) {
      throw createError('驗證碼無效或已過期，請重新取得。', 400, 'OTP_INVALID');
    }

    const attempts = Number(challenge.attempts) + 1;
    const matches = crypto.timingSafeEqual(
      Buffer.from(challenge.code_hash, 'hex'),
      Buffer.from(otpHash(challenge.id, code), 'hex'),
    );
    if (!matches) {
      const status = attempts >= OTP_MAX_ATTEMPTS ? 'LOCKED' : 'PENDING';
      await connection.query('UPDATE booking_otp_challenges SET attempts = ?, status = ? WHERE id = ?', [
        attempts,
        status,
        challenge.id,
      ]);
      await connection.commit();
      throw createError(
        status === 'LOCKED' ? '驗證次數已達上限，請重新取得驗證碼。' : '驗證碼錯誤，請再試一次。',
        400,
        status === 'LOCKED' ? 'OTP_ATTEMPTS_EXCEEDED' : 'OTP_INVALID',
      );
    }

    await connection.query(
      `UPDATE booking_otp_challenges
       SET attempts = ?, status = 'VERIFIED', verified_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [attempts, challenge.id],
    );
    const [customers] = await connection.query(
      `SELECT id FROM customers
       WHERE shop_id = ? AND phone = ? AND status = 'ACTIVE'
       LIMIT 1`,
      [getCurrentShopId(), phone],
    );
    if (!customers[0]) {
      await connection.commit();
      throw createError('此手機尚未建立店家客戶資料，請先使用新客流程完成資料建檔。', 404, 'CUSTOMER_NOT_FOUND');
    }

    customerId = Number(customers[0].id);
    token = crypto.randomBytes(32).toString('hex');
    const createdAt = new Date();
    await bookingSessionRepository.createSession({
      tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
      customerId,
      createdAt,
      expiresAt: new Date(createdAt.getTime() + SESSION_LIFETIME_MILLISECONDS),
    }, connection);
    await connection.commit();
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return { token, customerId };
}

async function getBookingSession(token) {
  if (typeof token !== 'string' || !BOOKING_SESSION_TOKEN_PATTERN.test(token)) {
    throw createInvalidSessionError();
  }
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const session = await bookingSessionRepository.findActiveSessionByTokenHash(tokenHash);
  if (!session) throw createInvalidSessionError();
  setCurrentShopId(session.shop_id);
  return session;
}

async function validatePetAndService(session, petIdValue, serviceIdValue) {
  const petId = Number(petIdValue);
  const serviceId = Number(serviceIdValue);
  if (!Number.isInteger(petId) || petId <= 0) throw createValidationError({ pet_id: '請選擇寵物。' });
  if (!Number.isInteger(serviceId) || serviceId <= 0) throw createValidationError({ service_id: '請選擇服務。' });

  const pet = await petRepository.getPetById(petId);
  if (!pet || pet.status !== 'ACTIVE') throw createError('寵物資料不可用。', 404, 'PET_NOT_FOUND');
  if (!await petRepository.findRelationshipByPetAndCustomer(petId, session.customer_id)) {
    throw createValidationError({ pet_id: '所選寵物不屬於此客戶。' });
  }
  const service = await serviceRepository.getServiceById(serviceId);
  if (!service || service.status !== 'ACTIVE') throw createError('此服務目前無法預約。', 404, 'SERVICE_NOT_FOUND');
  if (service.species !== 'BOTH' && service.species !== pet.species) {
    throw createValidationError({ service_id: '此服務不適用於所選寵物。' });
  }
  return { pet, service };
}

async function validatePetForSession(session, petIdValue) {
  const petId = Number(petIdValue);
  if (!Number.isInteger(petId) || petId <= 0) throw createValidationError({ pet_id: '請選擇寵物。' });
  const pet = await petRepository.getPetById(petId);
  if (!pet) throw createError('Pet not found', 404, 'PET_NOT_FOUND');
  if (pet.status !== 'ACTIVE') throw createValidationError({ pet_id: 'Pet is not active' });
  if (!await petRepository.findRelationshipByPetAndCustomer(petId, session.customer_id)) {
    throw createValidationError({ pet_id: 'Pet does not belong to this customer' });
  }
  return pet;
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

async function listAvailability(token, query = {}) {
  const session = await getBookingSession(token);
  const { pet, service } = await validatePetAndService(session, query.pet_id, query.service_id);
  return listAvailabilityForService(pet, service, query);
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

async function createBookingRequest(token, payload = {}) {
  const session = await getBookingSession(token);
  const { pet, service } = await validatePetAndService(session, payload.pet_id, payload.service_id);
  const appointmentDate = normalizeDate(payload.appointment_date, 'appointment_date');
  const appointmentTime = normalizeTime(payload.appointment_time);
  const checkOut = service.type === 'BOARDING'
    ? normalizeCheckOut(payload.check_out_date, payload.check_out_time)
    : null;
  if (checkOut && checkOut.dateTime <= `${appointmentDate} ${appointmentTime}`) {
    throw createValidationError({ check_out_date: '退房時間必須晚於入住時間。' });
  }
  const availability = await listAvailability(token, {
    pet_id: pet.id,
    service_id: service.id,
    date: appointmentDate,
    ...(checkOut ? { check_out_date: checkOut.date, check_out_time: checkOut.time.slice(0, 5), time: appointmentTime.slice(0, 5) } : {}),
  });
  if (!availability.slots.some((slot) => slot.time === appointmentTime.slice(0, 5))) {
    throw createError('所選時段已不可申請，請重新選擇。', 409, 'BOOKING_SLOT_UNAVAILABLE');
  }

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const [appointmentResult] = await connection.query(
      `INSERT INTO appointments
         (shop_id, customer_id, appointment_date, appointment_time, status, note)
       VALUES (?, ?, ?, ?, 'PENDING', ?)`,
      [getCurrentShopId(), session.customer_id, appointmentDate, appointmentTime, '客戶線上預約申請，請店家確認。'],
    );
    const appointmentId = Number(appointmentResult.insertId);
    const [appointmentPetResult] = await connection.query(
      'INSERT INTO appointment_pets (shop_id, appointment_id, pet_id) VALUES (?, ?, ?)',
      [getCurrentShopId(), appointmentId, pet.id],
    );
    await connection.query(
      `INSERT INTO appointment_pet_services
         (shop_id, appointment_pet_id, service_id, duration_minutes)
       VALUES (?, ?, ?, ?)`,
      [getCurrentShopId(), appointmentPetResult.insertId, service.id, service.duration_minutes],
    );
    await connection.query(
      `INSERT INTO booking_request_details
         (shop_id, appointment_id, service_type, requested_check_out)
       VALUES (?, ?, ?, ?)`,
      [getCurrentShopId(), appointmentId, service.type, checkOut?.dateTime || null],
    );
    await connection.commit();
    return {
      request: {
        appointment_id: appointmentId,
        status: 'PENDING',
        service_type: service.type,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime.slice(0, 5),
        requested_check_out: checkOut?.dateTime || null,
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function listPetsForBookingSession(token) {
  const session = await getBookingSession(token);
  return { pets: await petRepository.listActivePetsByCustomerId(session.customer_id) };
}

async function listServicesForBookingSession(token, petId) {
  const session = await getBookingSession(token);
  const pet = await validatePetForSession(session, petId);
  return { services: await serviceRepository.listActiveServicesBySpecies(pet.species) };
}

module.exports = {
  createBookingRequest,
  listAvailability,
  listAvailabilityForService,
  listPetsForBookingSession,
  listServicesForBookingSession,
  sendOtp,
  verifyOtp,
};
