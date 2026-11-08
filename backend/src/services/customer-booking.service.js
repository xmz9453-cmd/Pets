const crypto = require('crypto');
const { getPool } = require('../config/database');
const customerRepository = require('../data/customer.repository');
const petRepository = require('../data/pet.repository');
const serviceRepository = require('../data/service.repository');
const productRepository = require('../data/product.repository');
const groomingPhotoRepository = require('../data/grooming-photo.repository');
const groomingPhotoStorage = require('../utils/grooming-photo-storage');
const publicBookingService = require('./public-booking.service');
const {
  getCurrentCustomerMemberId,
  getCurrentShopId,
} = require('../utils/shop-context');

function createError(message, statusCode, code, fields) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  if (fields) error.fields = fields;
  return error;
}

function validation(fields) {
  return createError('資料格式不正確。', 400, 'VALIDATION_ERROR', fields);
}

function normalizePhone(value) {
  const phone = String(value ?? '').trim();
  if (!/^(?:09\d{2}-?\d{6}|02-?\d{8}|0[3-8]-?\d{7}|(?:037|049|082|089)-?\d{6}|(?:0826|0836)-?\d{5})$/.test(phone)) {
    throw validation({ phone: '請輸入台灣市話或手機，例如 04-7123456 或 0911-223344。' });
  }
  return phone.replace(/-/g, '');
}

function normalizeDate(value, field) {
  const date = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw validation({ [field]: '請選擇有效日期。' });
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw validation({ [field]: '請選擇有效日期。' });
  }
  return date;
}

function normalizeTime(value, field) {
  const time = String(value ?? '').trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(time)) {
    throw validation({ [field]: '請選擇有效時間。' });
  }
  return time.length === 5 ? `${time}:00` : time;
}

async function getMemberCustomer(memberId, connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT c.id, c.name, c.phone
     FROM customer_member_profiles cmp
     INNER JOIN customers c ON c.id = cmp.customer_id AND c.shop_id = cmp.shop_id
     WHERE cmp.shop_id = ? AND cmp.customer_member_id = ? AND c.status = 'ACTIVE'
     LIMIT 1`,
    [getCurrentShopId(), memberId],
  );
  return rows[0] || null;
}

async function memberCanAccessPet(memberId, petId, connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT 1
     FROM pet_customer_relationships pcr
     INNER JOIN customer_member_customers cmc
       ON cmc.shop_id = pcr.shop_id AND cmc.customer_id = pcr.customer_id
     WHERE pcr.shop_id = ? AND pcr.pet_id = ? AND cmc.customer_member_id = ?
     LIMIT 1`,
    [getCurrentShopId(), petId, memberId],
  );
  return rows.length > 0;
}

async function listPets() {
  const memberId = getCurrentCustomerMemberId();
  const [rows] = await getPool().query(
    `SELECT DISTINCT p.id, p.name, p.species, p.breed, p.weight
     FROM customer_member_customers cmc
     INNER JOIN pet_customer_relationships pcr
       ON pcr.customer_id = cmc.customer_id AND pcr.shop_id = cmc.shop_id
     INNER JOIN pets p ON p.id = pcr.pet_id AND p.shop_id = pcr.shop_id
     WHERE cmc.shop_id = ? AND cmc.customer_member_id = ? AND p.status = 'ACTIVE'
     ORDER BY p.name ASC, p.id ASC`,
    [getCurrentShopId(), memberId],
  );
  return {
    pets: rows.map((row) => ({
      ...row,
      id: Number(row.id),
      weight: row.weight === null ? null : Number(row.weight),
    })),
  };
}

async function listCompletedGroomingRecords() {
  const memberId = getCurrentCustomerMemberId();
  const shopId = getCurrentShopId();
  const [rows] = await getPool().query(
    `SELECT g.id AS grooming_id, g.daily_operation_id, g.pet_id,
            g.before_condition, g.actual_grooming_content, g.grooming_result, g.note,
            a.id AS appointment_id, a.appointment_date, a.appointment_time,
            p.name AS pet_name, p.species,
            GROUP_CONCAT(DISTINCT s.name ORDER BY s.name SEPARATOR ', ') AS service_names
     FROM groomings g
     INNER JOIN daily_operations d ON d.id = g.daily_operation_id AND d.shop_id = g.shop_id
     INNER JOIN appointments a ON a.id = d.appointment_id AND a.shop_id = g.shop_id
     INNER JOIN pets p ON p.id = g.pet_id AND p.shop_id = g.shop_id
     INNER JOIN pet_customer_relationships pcr
       ON pcr.shop_id = g.shop_id AND pcr.pet_id = g.pet_id AND pcr.customer_id = a.customer_id
     INNER JOIN customer_member_customers cmc
       ON cmc.shop_id = a.shop_id AND cmc.customer_id = a.customer_id
     LEFT JOIN appointment_pets ap
       ON ap.shop_id = g.shop_id AND ap.appointment_id = a.id AND ap.pet_id = g.pet_id
     LEFT JOIN appointment_pet_services aps
       ON aps.shop_id = g.shop_id AND aps.appointment_pet_id = ap.id
     LEFT JOIN services s ON s.id = aps.service_id AND s.shop_id = g.shop_id
     WHERE g.shop_id = ? AND cmc.customer_member_id = ?
       AND d.status = 'COMPLETED' AND a.status <> 'CANCELLED'
       AND EXISTS (
         SELECT 1
         FROM appointment_pets eligible_ap
         INNER JOIN appointment_pet_services eligible_aps
           ON eligible_aps.shop_id = eligible_ap.shop_id AND eligible_aps.appointment_pet_id = eligible_ap.id
         INNER JOIN services eligible_s
           ON eligible_s.id = eligible_aps.service_id AND eligible_s.shop_id = eligible_aps.shop_id
         WHERE eligible_ap.shop_id = g.shop_id AND eligible_ap.appointment_id = a.id
           AND eligible_ap.pet_id = g.pet_id AND eligible_s.type = 'GROOMING'
       )
     GROUP BY g.id, g.daily_operation_id, g.pet_id, g.before_condition,
              g.actual_grooming_content, g.grooming_result, g.note,
              a.id, a.appointment_date, a.appointment_time, p.name, p.species
     ORDER BY a.appointment_date DESC, a.appointment_time DESC, g.id DESC`,
    [shopId, memberId],
  );
  const photos = await groomingPhotoRepository.listByGroomingIds(rows.map((row) => Number(row.grooming_id)));
  const photosByGrooming = new Map();
  for (const photo of photos) {
    const groomingId = Number(photo.grooming_id);
    if (!photosByGrooming.has(groomingId)) photosByGrooming.set(groomingId, []);
    photosByGrooming.get(groomingId).push({
      id: Number(photo.id),
      category: photo.category,
      image_url: `/api/public/member/grooming-photos/${Number(photo.id)}?shop_id=${shopId}`,
    });
  }
  return {
    records: rows.map((row) => ({
      grooming_id: Number(row.grooming_id),
      appointment_id: Number(row.appointment_id),
      appointment_date: String(row.appointment_date).slice(0, 10),
      appointment_time: String(row.appointment_time).slice(0, 8),
      pet_id: Number(row.pet_id),
      pet_name: row.pet_name,
      species: row.species,
      service_names: row.service_names || '',
      before_condition: row.before_condition,
      actual_grooming_content: row.actual_grooming_content,
      grooming_result: row.grooming_result,
      note: row.note,
      photos: photosByGrooming.get(Number(row.grooming_id)) || [],
    })),
  };
}

async function getCompletedGroomingPhotoImage(photoIdValue) {
  const photoId = Number(photoIdValue);
  if (!Number.isSafeInteger(photoId) || photoId <= 0) {
    throw createError('找不到美容照片。', 404, 'GROOMING_PHOTO_NOT_FOUND');
  }
  const [rows] = await getPool().query(
    `SELECT gp.storage_key, gp.mime_type
     FROM grooming_photos gp
     INNER JOIN groomings g ON g.id = gp.grooming_id AND g.shop_id = gp.shop_id
     INNER JOIN daily_operations d ON d.id = g.daily_operation_id AND d.shop_id = g.shop_id
     INNER JOIN appointments a ON a.id = d.appointment_id AND a.shop_id = g.shop_id
     INNER JOIN pet_customer_relationships pcr
       ON pcr.shop_id = g.shop_id AND pcr.pet_id = g.pet_id AND pcr.customer_id = a.customer_id
     INNER JOIN customer_member_customers cmc
       ON cmc.shop_id = a.shop_id AND cmc.customer_id = a.customer_id
     WHERE gp.id = ? AND gp.shop_id = ? AND cmc.customer_member_id = ?
       AND d.status = 'COMPLETED' AND a.status <> 'CANCELLED'
       AND EXISTS (
         SELECT 1
         FROM appointment_pets eligible_ap
         INNER JOIN appointment_pet_services eligible_aps
           ON eligible_aps.shop_id = eligible_ap.shop_id AND eligible_aps.appointment_pet_id = eligible_ap.id
         INNER JOIN services eligible_s
           ON eligible_s.id = eligible_aps.service_id AND eligible_s.shop_id = eligible_aps.shop_id
         WHERE eligible_ap.shop_id = g.shop_id AND eligible_ap.appointment_id = a.id
           AND eligible_ap.pet_id = g.pet_id AND eligible_s.type = 'GROOMING'
       )
     LIMIT 1`,
    [photoId, getCurrentShopId(), getCurrentCustomerMemberId()],
  );
  if (!rows[0]) throw createError('找不到已完成的美容照片。', 404, 'GROOMING_PHOTO_NOT_FOUND');
  return groomingPhotoStorage.readStoredImage(rows[0].storage_key, rows[0].mime_type);
}

async function listForSpecies(species) {
  const [services, addOnServices] = await Promise.all([
    serviceRepository.listActiveServicesBySpecies(species),
    serviceRepository.listActiveAddOnServicesBySpecies(species),
  ]);
  return { services, add_on_services: addOnServices };
}

async function listServices(petIdValue, speciesValue) {
  const species = String(speciesValue || '');
  if (species) {
    if (!['DOG', 'CAT'].includes(species)) throw validation({ species: '請選擇寵物種類。' });
    return listForSpecies(species);
  }
  const memberId = getCurrentCustomerMemberId();
  const petId = Number(petIdValue);
  if (!Number.isInteger(petId) || petId <= 0) throw validation({ pet_id: '請選擇寵物。' });
  const pet = await petRepository.getPetById(petId);
  if (!pet || !await memberCanAccessPet(memberId, petId)) {
    throw createError('找不到可使用的寵物資料。', 404, 'PET_NOT_FOUND');
  }
  return listForSpecies(pet.species);
}

function validateAddOns(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 20) throw validation({ add_ons: '加購商品資料不正確。' });
  const seen = new Set();
  return value.map((item, index) => {
    const productId = Number(item?.product_id);
    const quantity = Number(item?.quantity);
    if (!Number.isInteger(productId) || productId <= 0
      || !Number.isInteger(quantity) || quantity <= 0 || quantity > 99
      || seen.has(productId)) {
      throw validation({ [`add_ons[${index}]`]: '請確認商品與數量。' });
    }
    seen.add(productId);
    return { product_id: productId, quantity };
  });
}

async function validateAddOnServices(value, species, connection) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 20) throw validation({ add_on_services: '加購服務資料不正確。' });
  const seen = new Set();
  const services = [];
  for (const [index, item] of value.entries()) {
    const serviceId = Number(item?.service_id);
    const quantity = Number(item?.quantity);
    if (!Number.isInteger(serviceId) || serviceId <= 0 || !Number.isFinite(quantity) || quantity <= 0 || seen.has(serviceId)) {
      throw validation({ [`add_on_services[${index}]`]: '請確認加購服務與數量。' });
    }
    seen.add(serviceId);
    const service = await serviceRepository.getServiceById(serviceId, connection);
    if (!service || service.type !== 'ADD_ON' || service.status !== 'ACTIVE'
      || (service.species !== 'BOTH' && service.species !== species)) {
      throw validation({ [`add_on_services[${index}].service_id`]: '此加購服務目前無法預約。' });
    }
    if (service.allow_fractional_quantity
      ? Math.round(quantity * 100) / 100 !== quantity
      : !Number.isInteger(quantity)) {
      throw validation({ [`add_on_services[${index}].quantity`]: '請依加購服務設定輸入整數或最多兩位小數。' });
    }
    services.push({ ...service, quantity });
  }
  return services;
}

async function listProducts(speciesValue) {
  const species = String(speciesValue || '');
  if (!['DOG', 'CAT'].includes(species)) throw validation({ species: '請選擇寵物種類。' });
  const [rows] = await getPool().query(
    `SELECT id, name, description, price, unit, species, stock_quantity, image_storage_key, updated_at
     FROM products
    WHERE shop_id = ? AND status = 'ACTIVE' AND is_sellable = TRUE AND stock_quantity > 0
       AND (species = 'BOTH' OR species = ?)
     ORDER BY name ASC`,
    [getCurrentShopId(), species],
  );
  return {
    products: rows.map((row) => {
      const { image_storage_key: imageStorageKey, ...product } = row;
      return {
        ...product,
        id: Number(product.id),
        price: Number(product.price),
        stock_quantity: Number(product.stock_quantity),
        image_url: imageStorageKey
          ? `/api/public/products/${Number(product.id)}/image?shop_id=${getCurrentShopId()}&v=${encodeURIComponent(imageStorageKey)}`
          : null,
      };
    }),
  };
}

async function listAvailability(query = {}) {
  const serviceId = Number(query.service_id);
  let pet;
  if (query.pet_id) {
    const petId = Number(query.pet_id);
    const memberId = getCurrentCustomerMemberId();
    pet = Number.isInteger(petId) ? await petRepository.getPetById(petId) : null;
    if (!pet || !await memberCanAccessPet(memberId, petId)) {
      throw createError('找不到可使用的寵物資料。', 404, 'PET_NOT_FOUND');
    }
  } else {
    const species = String(query.species || '');
    if (!['DOG', 'CAT'].includes(species)) throw validation({ species: '請選擇寵物種類。' });
    pet = { species };
  }
  const service = await serviceRepository.getServiceById(serviceId);
  if (!service || service.status !== 'ACTIVE' || !['GROOMING', 'BOARDING'].includes(service.type)) throw createError('此服務目前無法預約。', 404, 'SERVICE_NOT_FOUND');
  if (service.species !== 'BOTH' && service.species !== pet.species) {
    throw validation({ service_id: '此服務不適用於所選寵物。' });
  }
  return publicBookingService.listAvailabilityForService(pet, service, query);
}

async function resolveCustomer(memberId, profile, connection) {
  const name = String(profile?.name ?? '').trim();
  if (!name || name.length > 100) throw validation({ name: '請填寫姓名。' });
  const phone = normalizePhone(profile.phone);
  const existing = await getMemberCustomer(memberId, connection);
  if (existing) {
    await connection.query(
      'UPDATE customers SET name = ?, phone = ? WHERE id = ? AND shop_id = ?',
      [name, phone, existing.id, getCurrentShopId()],
    );
    return Number(existing.id);
  }

  const customerId = Number(await customerRepository.createCustomer({ name, phone }, connection));
  await connection.query(
    `INSERT INTO customer_member_customers (shop_id, customer_member_id, customer_id)
     VALUES (?, ?, ?)`,
    [getCurrentShopId(), memberId, customerId],
  );
  await connection.query(
    `INSERT INTO customer_member_profiles (shop_id, customer_member_id, customer_id)
     VALUES (?, ?, ?)`,
    [getCurrentShopId(), memberId, customerId],
  );
  return customerId;
}

async function resolvePet(memberId, customerId, petInput, service, connection) {
  const petId = Number(petInput?.pet_id);
  if (petId) {
    if (!Number.isInteger(petId) || petId <= 0) throw validation({ pet_id: '請重新選擇寵物。' });
    const pet = await petRepository.getPetById(petId, connection);
    const [linkedRows] = await connection.query(
      `SELECT pcr.customer_id
       FROM pet_customer_relationships pcr
       INNER JOIN customer_member_customers cmc
         ON cmc.shop_id = pcr.shop_id AND cmc.customer_id = pcr.customer_id
       WHERE pcr.shop_id = ? AND pcr.pet_id = ? AND cmc.customer_member_id = ?
       LIMIT 1`,
      [getCurrentShopId(), petId, memberId],
    );
    if (!pet || pet.status !== 'ACTIVE' || !linkedRows.length) {
      throw createError('找不到可使用的寵物資料。', 404, 'PET_NOT_FOUND');
    }
    if (service.species !== 'BOTH' && service.species !== pet.species) {
      throw validation({ pet_id: '所選寵物不適用於此服務。' });
    }
    if (service.type === 'GROOMING' && !pet.weight) {
      throw validation({ weight: '此美容服務需要先填寫寵物體重。' });
    }
    if (!await petRepository.findRelationshipByPetAndCustomer(petId, customerId, connection)) {
      await petRepository.createPetRelationship({ petId, customerId, isPrimary: false }, connection);
    }
    return pet;
  }

  const name = String(petInput?.name ?? '').trim();
  const species = String(petInput?.species ?? '');
  const weight = petInput?.weight === '' || petInput?.weight === undefined || petInput?.weight === null
    ? null
    : Number(petInput.weight);
  if (!name || name.length > 100) throw validation({ pet_name: '請填寫寵物名字。' });
  if (!['DOG', 'CAT'].includes(species)) throw validation({ species: '請選擇寵物種類。' });
  if (service.species !== 'BOTH' && service.species !== species) {
    throw validation({ species: '此服務不適用於所選寵物。' });
  }
  if (service.type === 'GROOMING' && (!Number.isFinite(weight) || weight <= 0 || weight > 300)) {
    throw validation({ weight: '美容服務需要有效的寵物體重。' });
  }
  if (weight !== null && (!Number.isFinite(weight) || weight <= 0 || weight > 300)) {
    throw validation({ weight: '體重需大於 0 且不超過 300 公斤。' });
  }

  const id = Number(await petRepository.createPet({
    name,
    species,
    gender: 'UNKNOWN',
    weight,
    weight_unit: weight === null ? null : 'KG',
  }, connection));
  await petRepository.createPetRelationship({ petId: id, customerId, isPrimary: true }, connection);
  return { id, name, species, weight };
}

async function createBookingRequest(payload = {}) {
  const memberId = getCurrentCustomerMemberId();
  const serviceId = Number(payload.service_id);
  if (!Number.isInteger(serviceId) || serviceId <= 0) throw validation({ service_id: '請選擇服務。' });
  const service = await serviceRepository.getServiceById(serviceId);
  if (!service || service.status !== 'ACTIVE' || !['GROOMING', 'BOARDING'].includes(service.type)) throw createError('此服務目前無法預約。', 404, 'SERVICE_NOT_FOUND');
  const date = normalizeDate(payload.appointment_date, 'appointment_date');
  const time = normalizeTime(payload.appointment_time, 'appointment_time');
  const checkOut = service.type === 'BOARDING'
    ? {
      date: normalizeDate(payload.check_out_date, 'check_out_date'),
      time: normalizeTime(payload.check_out_time, 'check_out_time'),
    }
    : null;
  if (checkOut && `${checkOut.date} ${checkOut.time}` <= `${date} ${time}`) {
    throw validation({ check_out_date: '退房時間必須晚於入住時間。' });
  }

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const customerId = await resolveCustomer(memberId, payload.customer, connection);
    const pet = await resolvePet(memberId, customerId, payload.pet, service, connection);
    const availability = await publicBookingService.listAvailabilityForService(pet, service, {
      date,
      ...(checkOut ? { check_out_date: checkOut.date, check_out_time: checkOut.time.slice(0, 5) } : {}),
    });
    if (!availability.slots.some((slot) => slot.time === time.slice(0, 5))) {
      throw createError('所選時段已不可申請，請重新查詢。', 409, 'BOOKING_SLOT_UNAVAILABLE');
    }

    const addOnServices = await validateAddOnServices(payload.add_on_services, pet.species, connection);
    const addOns = validateAddOns(payload.add_ons);
    const productRows = [];
    for (const addOn of addOns) {
      const product = await productRepository.getProductById(addOn.product_id, connection);
      if (!product || product.status !== 'ACTIVE' || !product.is_sellable
        || (product.species !== 'BOTH' && product.species !== pet.species)
        || product.stock_quantity < addOn.quantity) {
        throw createError('部分加購商品目前庫存不足，請重新確認。', 409, 'BOOKING_PRODUCT_UNAVAILABLE');
      }
      productRows.push({ ...product, ...addOn });
    }

    const [appointmentResult] = await connection.query(
      `INSERT INTO appointments
         (shop_id, customer_id, appointment_date, appointment_time, status, note)
       VALUES (?, ?, ?, ?, 'PENDING', ?)`,
      [getCurrentShopId(), customerId, date, time, '客戶線上預約申請，請店家確認。'],
    );
    const appointmentId = Number(appointmentResult.insertId);
    const [appointmentPet] = await connection.query(
      'INSERT INTO appointment_pets (shop_id, appointment_id, pet_id) VALUES (?, ?, ?)',
      [getCurrentShopId(), appointmentId, pet.id],
    );
    await connection.query(
      `INSERT INTO appointment_pet_services
         (shop_id, appointment_pet_id, service_id, duration_minutes)
       VALUES (?, ?, ?, ?)`,
      [getCurrentShopId(), appointmentPet.insertId, service.id, service.duration_minutes],
    );
    for (const addOnService of addOnServices) {
      await connection.query(
        `INSERT INTO booking_request_add_on_services
           (shop_id, appointment_id, appointment_pet_id, service_id, service_name, unit, unit_price, quantity, allow_fractional_quantity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [getCurrentShopId(), appointmentId, appointmentPet.insertId, addOnService.id, addOnService.name, addOnService.unit, addOnService.price, addOnService.quantity, addOnService.allow_fractional_quantity],
      );
    }
    await connection.query(
      `INSERT INTO booking_request_details
         (shop_id, appointment_id, service_type, customer_member_id, requested_check_out)
       VALUES (?, ?, ?, ?, ?)`,
      [getCurrentShopId(), appointmentId, service.type, memberId, checkOut ? `${checkOut.date} ${checkOut.time}` : null],
    );
    for (const product of productRows) {
      await connection.query(
        `INSERT INTO booking_request_products
           (shop_id, appointment_id, product_id, product_name, unit_price, quantity)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          getCurrentShopId(),
          appointmentId,
          product.id,
          product.name,
          product.price,
          product.quantity,
        ],
      );
    }
    await connection.commit();
    return {
      request: {
        appointment_id: appointmentId,
        status: 'PENDING',
        service_type: service.type,
        appointment_date: date,
        appointment_time: time.slice(0, 5),
        requested_check_out: checkOut ? `${checkOut.date} ${checkOut.time}` : null,
        add_on_services: addOnServices.map((item) => ({
          service_id: item.id,
          name: item.name,
          unit: item.unit,
          unit_price: Number(item.price),
          quantity: item.quantity,
        })),
        add_ons: productRows.map((product) => ({
          name: product.name,
          quantity: product.quantity,
          unit_price: Number(product.price),
        })),
        message: '預約申請已送出，時段尚未保留，需店家確認。',
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getOnboardingToken(appointmentIdValue) {
  const appointmentId = Number(appointmentIdValue);
  if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
    throw createError('找不到指定的預約申請。', 404, 'APPOINTMENT_NOT_FOUND');
  }
  const memberId = getCurrentCustomerMemberId();
  const [rows] = await getPool().query(
    `SELECT o.id
     FROM appointments a
     INNER JOIN booking_request_details brd
       ON brd.appointment_id = a.id AND brd.shop_id = a.shop_id
     INNER JOIN onboardings o
       ON o.appointment_id = a.id AND o.shop_id = a.shop_id
     WHERE a.id = ? AND a.shop_id = ? AND brd.customer_member_id = ?
       AND a.status = 'AWAITING_CUSTOMER'
       AND o.customer_member_id = ?
       AND o.status IN ('NOT_STARTED', 'IN_PROGRESS')
       AND o.expires_at > UTC_TIMESTAMP()
     LIMIT 1`,
    [appointmentId, getCurrentShopId(), memberId, memberId],
  );
  if (!rows[0]) throw createError('此預約目前沒有待補資料項目。', 404, 'CUSTOMER_ONBOARDING_NOT_FOUND');
  const token = crypto.randomBytes(32).toString('base64url');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  await getPool().query(
    'UPDATE onboardings SET public_token_hash = ? WHERE id = ? AND shop_id = ?',
    [hash, rows[0].id, getCurrentShopId()],
  );
  return { token };
}

module.exports = {
  createBookingRequest,
  getCompletedGroomingPhotoImage,
  getOnboardingToken,
  listCompletedGroomingRecords,
  listAvailability,
  listPets,
  listProducts,
  listServices,
};
