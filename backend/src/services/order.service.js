const { getPool } = require('../config/database');
const { getCurrentShopId } = require('../utils/shop-context');
const customerRepository = require('../data/customer.repository');
const productRepository = require('../data/product.repository');
const serviceRepository = require('../data/service.repository');
const orderRepository = require('../data/order.repository');

const VALID_BU = new Set(['DOG', 'CAT']);
const VALID_STATUS = new Set(['UNPAID', 'PAID', 'CANCELLED']);
const VALID_SOURCE_TYPES = new Set(['WALK_IN', 'APPOINTMENT']);

function validation(fields) { const error = new Error('Validation failed'); error.statusCode = 400; error.code = 'VALIDATION_ERROR'; error.fields = fields; return error; }
function notFound() { const error = new Error('Order not found'); error.statusCode = 404; error.code = 'ORDER_NOT_FOUND'; return error; }
function conflict(code, message) { const error = new Error(message); error.statusCode = 409; error.code = code; return error; }
function id(value) { return Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null; }

async function validateItems(items, businessUnit, connection, sourceType = 'WALK_IN') {
  if (!Array.isArray(items) || items.length === 0) throw validation({ items: 'Order must contain at least one item' });
  const errors = {}; const normalized = []; let total = 0;
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index] || {}; const serviceId = id(item.service_id); const productId = id(item.product_id); const petId = id(item.pet_id); const packageId = id(item.customer_service_package_id);
    if ((serviceId && productId) || (!serviceId && !productId)) { errors[`items[${index}]`] = 'Each item must reference one service or product'; continue; }
    if (packageId && (!serviceId || !petId)) { errors[`items[${index}].customer_service_package_id`] = 'A service package can only be used for a pet service'; continue; }
    if (packageId && Number(item.quantity === undefined ? 1 : item.quantity) !== 1) { errors[`items[${index}].quantity`] = 'A service package can only cover one service'; continue; }
    if (sourceType === 'APPOINTMENT' && serviceId && !petId) { errors[`items[${index}].pet_id`] = 'Pet is required for appointment service items'; continue; }
    if (petId && !serviceId) { errors[`items[${index}].pet_id`] = 'Pet can only be specified for service items'; continue; }
    const quantity = Number(item.quantity === undefined ? 1 : item.quantity); const price = Number(item.transaction_price);
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(price) || price < 0) { errors[`items[${index}]`] = 'Quantity must be positive and transaction price must be a non-negative whole number'; continue; }
    const master = serviceId ? await serviceRepository.getServiceById(serviceId, connection) : await productRepository.getProductById(productId, connection);
    if (!master || master.status !== 'ACTIVE') { errors[`items[${index}]`] = serviceId ? 'Service is invalid' : 'Product is invalid'; continue; }
    if (productId && !master.is_sellable) { errors[`items[${index}]`] = 'Product is not available for sale'; continue; }
    if (!master.allow_fractional_quantity && !Number.isInteger(quantity)) {
      errors[`items[${index}].quantity`] = 'Quantity must be a whole number for this item';
      continue;
    }
    if (master.allow_fractional_quantity && Math.round(quantity * 100) / 100 !== quantity) {
      errors[`items[${index}].quantity`] = 'Quantity cannot have more than two decimal places';
      continue;
    }
    if (master.species !== 'BOTH' && master.species !== businessUnit) { errors[`items[${index}]`] = 'Item does not match order business unit'; continue; }
    if (packageId && serviceId && master.type !== 'GROOMING') { errors[`items[${index}].customer_service_package_id`] = 'Service packages can only be used for grooming'; continue; }
    let transactionPrice = packageId ? 0 : productId ? Number(master.price) : price;
    if (serviceId && petId && master.breed_price_category && master.breed_price_category !== 'STANDARD') {
      const [petRows] = await connection.query(
        'SELECT species, breed FROM pets WHERE id = ? AND shop_id = ? LIMIT 1',
        [petId, getCurrentShopId()],
      );
      const pet = petRows[0];
      if (!pet || (master.species !== 'BOTH' && master.species !== pet.species)) {
        errors[`items[${index}].pet_id`] = 'Pet is invalid or does not match service';
        continue;
      }
      const priceColumn = {
        BATH: 'bath_price',
        ELECTRIC_CLIPPER: 'electric_clipper_price',
        HAND_SCISSOR: 'hand_scissor_price',
      }[master.breed_price_category];
      const [breedPrices] = await connection.query(
        `SELECT ${priceColumn} AS breed_price, bath_price_is_starting
         FROM shop_pet_breed_prices
         WHERE shop_id = ? AND breed = ?
         LIMIT 1`,
        [getCurrentShopId(), pet.breed],
      );
      const breedPrice = breedPrices[0];
      if (breedPrice) {
        if (breedPrice.breed_price == null) {
          if (breedPrice.bath_price != null) {
            errors[`items[${index}].service_id`] = '此品種不提供此服務，請確認價目或改用其他服務';
            continue;
          }
        } else {
          const basePrice = Number(breedPrice.breed_price);
          if ((!packageId && price < basePrice) || (!breedPrice.bath_price_is_starting && !packageId && price !== basePrice)) {
            errors[`items[${index}].transaction_price`] = `此服務價格不可低於價目表 ${basePrice} 元`;
            continue;
          }
        }
        transactionPrice = packageId ? 0 : price;
      }
    }
    const amount = Math.round(transactionPrice * quantity);
    normalized.push({ item_type: serviceId ? 'SERVICE' : 'PRODUCT', service_type: serviceId ? master.type : null, service_id: serviceId, product_id: productId, pet_id: petId, customer_service_package_id: packageId, name: master.name, unit: master.unit || (serviceId ? '次' : '件'), transaction_price: transactionPrice, quantity, item_amount: amount });
    total += amount;
  }
  if (Object.keys(errors).length) throw validation(errors);
  const packageIds = normalized.map((item) => item.customer_service_package_id).filter(Boolean);
  const duplicatePackageIds = [...new Set(packageIds)].filter((packageId) => (
    packageIds.filter((candidate) => candidate === packageId).length > 1
  ));
  if (duplicatePackageIds.length) {
    throw validation({ items: '每張美容包月卡每筆訂單只能折抵一項美容主服務' });
  }
  if (packageIds.length) {
    const [pointPackages] = await connection.query(
      'SELECT id FROM customer_service_packages WHERE shop_id = ? AND id IN (?) AND is_point_package = TRUE',
      [getCurrentShopId(), packageIds],
    );
    const pointPackageIds = new Set(pointPackages.map((servicePackage) => Number(servicePackage.id)));
    const pointPackageItems = normalized.filter((item) => pointPackageIds.has(Number(item.customer_service_package_id)));
    for (const item of pointPackageItems) {
      const groomingItemsForPet = normalized.filter((candidate) => (
        candidate.item_type === 'SERVICE'
        && candidate.service_type === 'GROOMING'
        && candidate.pet_id === item.pet_id
      ));
      if (groomingItemsForPet.length > 1) {
        throw validation({ items: '同一隻寵物每筆訂單只能選一種美容主服務扣包月點數' });
      }
    }
  }
  return { items: normalized, total: Math.round(total) };
}

async function validateCustomer(customerId, connection) {
  const customer = await customerRepository.getCustomerById(customerId, connection);
  if (!customer || customer.status !== 'ACTIVE') throw validation({ customer_id: 'Customer is invalid' });
}

async function validateOrderSource(payload, customerId, connection) {
  const sourceType = payload.source_type || 'WALK_IN';
  const appointmentId = id(payload.appointment_id);
  if (!VALID_SOURCE_TYPES.has(sourceType)) throw validation({ source_type: 'Order source must be WALK_IN or APPOINTMENT' });
  if (sourceType === 'WALK_IN') {
    if (payload.appointment_id !== undefined && payload.appointment_id !== null && payload.appointment_id !== '') {
      throw validation({ appointment_id: 'Walk-in orders cannot reference an appointment' });
    }
    return { sourceType, appointmentId: null };
  }
  if (!appointmentId) throw validation({ appointment_id: 'Appointment is required for appointment orders' });
  const [appointments] = await connection.query('SELECT id, customer_id, status FROM appointments WHERE id = ? AND shop_id = ? LIMIT 1', [appointmentId, getCurrentShopId()]);
  const appointment = appointments[0];
  if (!appointment) throw validation({ appointment_id: 'Appointment is invalid' });
  if (Number(appointment.customer_id) !== customerId) throw validation({ appointment_id: 'Appointment does not belong to customer' });
  return { sourceType, appointmentId, appointment };
}

async function validateAppointmentServiceItems(appointmentId, items, connection) {
  const serviceItems = (items || []).filter((item) => id(item?.service_id));

  const [operationRows] = await connection.query(
    "SELECT id FROM daily_operations WHERE appointment_id = ? AND shop_id = ? AND status = 'COMPLETED' LIMIT 1",
    [appointmentId, getCurrentShopId()],
  );
  if (!operationRows.length) {
    throw validation({ items: 'Daily operation must be completed before billing' });
  }
  if (serviceItems.length === 0) return;

  for (const item of serviceItems) {
    const serviceId = id(item.service_id);
    const petId = id(item.pet_id);
    if (!petId) throw validation({ items: 'Pet is required for appointment service items' });
    const [petRows] = await connection.query(
      `SELECT p.species
       FROM appointment_pets ap
       INNER JOIN pets p ON p.id = ap.pet_id AND p.shop_id = ap.shop_id
       WHERE ap.appointment_id = ? AND ap.pet_id = ? AND ap.shop_id = ?
       LIMIT 1`,
      [appointmentId, petId, getCurrentShopId()],
    );
    if (!petRows.length) throw validation({ items: 'Pet is not linked to this appointment' });
    const [serviceRows] = await connection.query(
      'SELECT id, type, status, species FROM services WHERE id = ? AND shop_id = ? LIMIT 1',
      [serviceId, getCurrentShopId()],
    );
    const service = serviceRows[0];
    if (!service || service.status !== 'ACTIVE') {
      throw validation({ items: 'Service is invalid' });
    }
    if (service.species !== 'BOTH' && service.species !== petRows[0].species) {
      throw validation({ items: 'Service is not compatible with appointment pet' });
    }

    if (service.type === 'ADD_ON') continue;

    let completedRows = [];
    if (service.type === 'GROOMING') {
      [completedRows] = await connection.query(
        `SELECT 1
         FROM appointment_pets ap
         INNER JOIN appointment_pet_services aps ON aps.appointment_pet_id = ap.id AND aps.shop_id = ap.shop_id
         INNER JOIN daily_operations d ON d.appointment_id = ap.appointment_id AND d.shop_id = ap.shop_id
         WHERE ap.appointment_id = ? AND ap.shop_id = ?
           AND ap.pet_id = ?
           AND aps.service_id = ?
           AND d.status = 'COMPLETED'
         LIMIT 1`,
        [appointmentId, getCurrentShopId(), petId, serviceId],
      );
    } else if (service.type === 'BOARDING') {
      [completedRows] = await connection.query(
        `SELECT 1
         FROM boardings b
         WHERE b.appointment_id = ? AND b.pet_id = ? AND b.shop_id = ? AND b.status = 'COMPLETED'
         LIMIT 1`,
        [appointmentId, petId, getCurrentShopId()],
      );
    } else {
      throw validation({ items: 'Appointment source orders only support grooming or boarding services' });
    }

    if (!completedRows.length) {
      throw validation({ items: 'Appointment service must be completed before billing' });
    }

    const [billedRows] = await connection.query(
      `SELECT 1
       FROM order_items oi
       INNER JOIN orders o ON o.id = oi.order_id AND o.shop_id = oi.shop_id
       WHERE o.appointment_id = ? AND o.shop_id = ? AND o.source_type = 'APPOINTMENT'
         AND oi.service_id = ? AND oi.pet_id = ? AND oi.item_type = 'SERVICE'
       LIMIT 1`,
      [appointmentId, getCurrentShopId(), serviceId, petId],
    );
    if (billedRows.length) {
      throw conflict('SERVICE_ALREADY_BILLED', 'Completed appointment service has already been billed');
    }
  }
}

async function validateServicePackageRedemption(item, appointmentId, customerId, connection) {
  const [packageRows] = await connection.query(
    `SELECT cp.id, cp.is_point_package, cp.remaining_uses, s.package_point_cost,
            s.breed_price_category, b.remaining_uses AS service_remaining_uses
     FROM customer_service_packages cp
     INNER JOIN services s ON s.id = ? AND s.shop_id = cp.shop_id
     LEFT JOIN customer_service_package_balances b
       ON b.shop_id = cp.shop_id AND b.customer_service_package_id = cp.id AND b.service_id = ?
     WHERE cp.id = ? AND cp.shop_id = ? AND cp.customer_id = ? AND cp.pet_id = ?
       AND cp.status = 'ACTIVE' AND cp.remaining_uses > 0
       AND cp.starts_on <= CURRENT_DATE AND cp.expires_on >= CURRENT_DATE
     LIMIT 1 FOR UPDATE`,
    [item.service_id, item.service_id, item.customer_service_package_id, getCurrentShopId(), customerId, item.pet_id],
  );
  const servicePackage = packageRows[0];
  if (!servicePackage) {
    throw validation({ items: '所選方案已失效、次數不足或不適用於此寵物與服務' });
  }
  if (!['BATH', 'ELECTRIC_CLIPPER', 'HAND_SCISSOR'].includes(servicePackage.breed_price_category)
    || ![1, 2, 3].includes(Number(servicePackage.package_point_cost))) {
    throw validation({ items: '美容包月卡只適用於洗澡、電剪修毛或全手修剪主服務' });
  }
  if (servicePackage.is_point_package) {
    const pointCost = Number(servicePackage.package_point_cost);
    if (pointCost < 1 || pointCost > 3 || Number(servicePackage.remaining_uses) < pointCost) {
      throw validation({ items: '此包月卡點數不足，或此服務尚未設定包月扣點' });
    }
    item.package_point_cost = pointCost;
  } else if (Number(servicePackage.service_remaining_uses) < 1) {
    throw validation({ items: '所選方案已失效、次數不足或不適用於此寵物與服務' });
  }
  if (appointmentId) {
    const [redemptionRows] = await connection.query(
      `SELECT id FROM customer_service_package_transactions
       WHERE shop_id = ? AND customer_service_package_id = ? AND appointment_id = ? AND transaction_type = 'REDEEM'
       LIMIT 1`,
      [getCurrentShopId(), item.customer_service_package_id, appointmentId],
    );
    if (redemptionRows.length) {
      throw conflict('SERVICE_PACKAGE_ALREADY_USED', '此預約已使用過這份服務方案');
    }
  }
}

async function redeemServicePackage(item, appointmentId, orderId, orderItemId, operatorId, connection) {
  const [packageRows] = await connection.query(
    'SELECT is_point_package FROM customer_service_packages WHERE id = ? AND shop_id = ? LIMIT 1 FOR UPDATE',
    [item.customer_service_package_id, getCurrentShopId()],
  );
  const pointPackage = Boolean(packageRows[0]?.is_point_package);
  const pointCost = pointPackage ? Number(item.package_point_cost) : 1;
  if (!pointPackage) {
    const [balanceResult] = await connection.query(
      `UPDATE customer_service_package_balances
       SET remaining_uses = remaining_uses - 1
       WHERE shop_id = ? AND customer_service_package_id = ? AND service_id = ? AND remaining_uses > 0`,
      [getCurrentShopId(), item.customer_service_package_id, item.service_id],
    );
    if (balanceResult.affectedRows !== 1) {
      throw conflict('SERVICE_PACKAGE_SERVICE_NOT_AVAILABLE', '此方案沒有該服務的可用次數');
    }
  }
  const [result] = await connection.query(
    `UPDATE customer_service_packages
     SET status = IF(remaining_uses <= ?, 'EXHAUSTED', 'ACTIVE'),
         remaining_uses = remaining_uses - ?
     WHERE id = ? AND shop_id = ? AND status = 'ACTIVE' AND remaining_uses >= ?
       AND starts_on <= CURRENT_DATE AND expires_on >= CURRENT_DATE`,
    [pointCost, pointCost, item.customer_service_package_id, getCurrentShopId(), pointCost],
  );
  if (result.affectedRows !== 1) {
    throw conflict('SERVICE_PACKAGE_NOT_AVAILABLE', '此方案已無法使用，請重新整理後再試');
  }
  await connection.query(
    `INSERT INTO customer_service_package_transactions
       (shop_id, customer_service_package_id, transaction_type, service_id, change_uses, appointment_id, order_id, order_item_id, operator_id, note)
     VALUES (?, ?, 'REDEEM', ?, ?, ?, ?, ?, ?, ?)`,
    [
      getCurrentShopId(),
      item.customer_service_package_id,
      item.service_id,
      -pointCost,
      appointmentId,
      orderId,
      orderItemId,
      operatorId,
      appointmentId ? '預約服務完成扣次' : '現場服務扣次',
    ],
  );
}

async function saveOrder(payload, existing = null, transactionConnection = null, operatorId = null) {
  const customerId = id(payload.customer_id ?? existing?.customer_id); const businessUnit = payload.business_unit || existing?.business_unit;
  if (!customerId) throw validation({ customer_id: 'Customer is required' });
  if (!VALID_BU.has(businessUnit)) throw validation({ business_unit: 'Business unit must be DOG or CAT' });
  const status = payload.status || existing?.status || 'UNPAID';
  if (!VALID_STATUS.has(status)) throw validation({ status: 'Order status is invalid' });
  if (payload.status === 'PAID') throw validation({ status: 'Order can only be marked PAID through payment' });
  const connection = transactionConnection || await getPool().getConnection();
  const ownsTransaction = !transactionConnection;
  try {
    if (ownsTransaction) await connection.beginTransaction();
    await validateCustomer(customerId, connection);
    const sourceType = payload.source_type ?? existing?.source_type ?? 'WALK_IN';
    const appointmentId = id(payload.appointment_id ?? existing?.appointment_id);
    const source = await validateOrderSource({
      source_type: sourceType,
      appointment_id: appointmentId,
    }, customerId, connection);
    const itemResult = await validateItems(payload.items ?? existing?.items, businessUnit, connection, source.sourceType);
    if (source.sourceType === 'APPOINTMENT') {
      await validateAppointmentServiceItems(source.appointmentId, itemResult.items, connection);
    }
    for (const item of itemResult.items) {
      if (item.customer_service_package_id) {
        await validateServicePackageRedemption(
          item,
          source.sourceType === 'APPOINTMENT' ? source.appointmentId : null,
          customerId,
          connection,
        );
      }
    }
    const orderStatus = itemResult.total === 0 && itemResult.items.some((item) => item.customer_service_package_id)
      ? 'PAID'
      : status;
    const orderId = existing ? existing.id : await orderRepository.insertOrder({ customer_id: customerId, source_type: source.sourceType, appointment_id: source.appointmentId, business_unit: businessUnit, status: orderStatus, total_amount: itemResult.total }, connection);
    if (existing) { await orderRepository.updateOrder(orderId, { customer_id: customerId, source_type: source.sourceType, appointment_id: source.appointmentId, business_unit: businessUnit, status: orderStatus, total_amount: itemResult.total }, connection); await orderRepository.deleteItems(orderId, connection); }
    for (const item of itemResult.items) {
      const orderItemId = await orderRepository.insertItem(orderId, item, connection);
      if (item.customer_service_package_id) {
        await redeemServicePackage(
          item,
          source.sourceType === 'APPOINTMENT' ? source.appointmentId : null,
          orderId,
          orderItemId,
          operatorId,
          connection,
        );
      }
    }
    if (ownsTransaction) await connection.commit(); return orderId;
  } catch (error) { if (ownsTransaction) await connection.rollback(); throw error; } finally { if (ownsTransaction) connection.release(); }
}

async function listOrders(filters) { return orderRepository.listOrders(filters); }
async function getOrder(orderId) { const order = await orderRepository.getOrderById(orderId); if (!order) throw notFound(); return { order }; }
async function createOrder(payload = {}, operatorId = null) { const orderId = await saveOrder(payload, null, null, operatorId); return getOrder(orderId); }
async function updateOrder(orderId, payload = {}) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const existing = await orderRepository.getOrderById(orderId, connection, true);
    if (!existing) throw notFound();
    if (existing.status !== 'UNPAID') throw conflict('ORDER_READ_ONLY', 'Completed or cancelled orders cannot be edited');
    if (existing.items.some((item) => item.customer_service_package_id)) {
      throw conflict('SERVICE_PACKAGE_ORDER_READ_ONLY', 'Orders that have used a service package cannot be edited');
    }
    const orderIdResult = await saveOrder(payload, existing, connection);
    await connection.commit();
    return getOrder(orderIdResult);
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

async function deleteOrder(orderId) {
  const normalizedOrderId = id(orderId);
  if (!normalizedOrderId) throw notFound();
  await orderRepository.deleteOrder(normalizedOrderId);
  return { message: 'Order deleted successfully' };
}

module.exports = { createOrder, deleteOrder, getOrder, listOrders, updateOrder };
