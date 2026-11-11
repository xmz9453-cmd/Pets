const { getPool } = require('../config/database');
const { getCurrentShopId } = require('../utils/shop-context');
const paymentRepository = require('../data/payment.repository');

const VALID_SPECIES = new Set(['DOG', 'CAT', 'BOTH']);
const VALID_PAYMENT_METHODS = new Set(['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'MOBILE_PAYMENT']);

async function packagesEnabled(connection = getPool()) {
  const [rows] = await connection.query(
    'SELECT service_packages_enabled FROM shops WHERE id = ? LIMIT 1',
    [getCurrentShopId()],
  );
  return Boolean(rows[0]?.service_packages_enabled);
}

async function ensurePackagesEnabled(connection = getPool()) {
  if (!await packagesEnabled(connection)) {
    const error = new Error('此店家目前未開放包月方案');
    error.statusCode = 403;
    error.code = 'SERVICE_PACKAGES_DISABLED';
    throw error;
  }
}

function validation(fields) {
  const error = new Error('Validation failed');
  error.statusCode = 400;
  error.code = 'VALIDATION_ERROR';
  error.fields = fields;
  return error;
}

function notFound() {
  const error = new Error('Service package not found');
  error.statusCode = 404;
  error.code = 'SERVICE_PACKAGE_NOT_FOUND';
  return error;
}

function conflict(code, message) {
  const error = new Error(message);
  error.statusCode = 409;
  error.code = code;
  return error;
}

function normalizeId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizePlan(row) {
  const entitlements = row.service_entitlements
    ? row.service_entitlements.split(',').map((entry) => {
      const [serviceId, includedUses] = entry.split(':').map(Number);
      return { service_id: serviceId, included_uses: includedUses };
    })
    : [];
  return {
    ...row,
    id: Number(row.id),
    shop_id: Number(row.shop_id),
    usage_count: 5,
    price: Number(row.price),
    entitlements,
    service_ids: entitlements.map((entitlement) => entitlement.service_id),
    service_ids_by_type: {
      bath: entitlements[0]?.service_id || null,
    },
    bath_service_price: Number(row.bath_service_price || 0),
  };
}

function normalizePackage(row) {
  return {
    ...row,
    id: Number(row.id),
    plan_id: Number(row.plan_id),
    customer_id: Number(row.customer_id),
    pet_id: Number(row.pet_id),
    purchase_order_id: Number(row.purchase_order_id),
    purchased_uses: Number(row.purchased_uses),
    remaining_uses: Number(row.remaining_uses),
    price: Number(row.price),
    status: row.effective_status || row.status,
    is_point_package: Boolean(row.is_point_package),
    service_ids: row.service_ids ? row.service_ids.split(',').map(Number) : [],
    service_balances: row.service_balances
      ? row.service_balances.split(',').map((entry) => {
        const [serviceId, purchasedUses, remainingUses] = entry.split(':').map(Number);
        return { service_id: serviceId, purchased_uses: purchasedUses, remaining_uses: remainingUses };
      })
      : [],
  };
}

async function validatePlan(payload, connection, ignorePlanId = null) {
  const description = String(payload.description || '').trim();
  const species = payload.species || 'BOTH';
  const bathServiceId = normalizeId(payload.bath_service_id);
  const errors = {};
  if (description.length > 255) errors.description = '說明不可超過 255 字';
  if (!VALID_SPECIES.has(species)) errors.species = '適用寵物種類無效';
  if (!bathServiceId) errors.bath_service_id = '請選擇洗澡服務';
  if (Object.keys(errors).length) throw validation(errors);
  const [duplicateRows] = await connection.query(
    `SELECT id FROM service_package_plans
     WHERE shop_id = ? AND offer_type = 'POINT_CARD' AND status = 'ACTIVE'
       AND (species = ? OR species = 'BOTH' OR ? = 'BOTH')
       AND (? IS NULL OR id <> ?)
     LIMIT 1`,
    [getCurrentShopId(), species, species, ignorePlanId, ignorePlanId],
  );
  if (duplicateRows.length) throw validation({ species: '此寵物種類已設定美容包月卡' });

  const [services] = await connection.query(
    `SELECT id, species, breed_price_category, package_point_cost, price
     FROM services
     WHERE shop_id = ? AND id = ? AND type = 'GROOMING' AND status = 'ACTIVE'`,
    [getCurrentShopId(), bathServiceId],
  );
  const bathService = services[0];
  if (!bathService || (species !== 'BOTH' && bathService.species !== 'BOTH' && bathService.species !== species)
    || (species === 'BOTH' && bathService.species !== 'BOTH')) {
    throw validation({ bath_service_id: '請選擇有效且適用於此寵物種類的洗澡美容服務' });
  }
  if (bathService.breed_price_category !== 'BATH' || Number(bathService.package_point_cost) !== 1) {
    throw validation({ bath_service_id: '請先在服務管理將此服務設為洗澡（扣 1 點）' });
  }
  return {
    name: `美容包月卡（${species === 'BOTH' ? '狗與貓' : species === 'DOG' ? '狗' : '貓'}）`,
    offer_type: 'POINT_CARD',
    usage_count: 5,
    price: Number(bathService.price) * 4,
    species,
    description: description || null,
    bath_service_id: bathServiceId,
    bath_service_price: Number(bathService.price),
    entitlements: [{ service_id: bathServiceId, included_uses: 1 }],
  };
}

async function listPlans(filters = {}) {
  const enabled = await packagesEnabled();
  if (!enabled) return { enabled, plans: [] };
  const conditions = ['p.shop_id = ?'];
  const params = [getCurrentShopId()];
  if (filters.status && filters.status !== 'ALL') {
    conditions.push('p.status = ?');
    params.push(filters.status);
  }
  const [rows] = await getPool().query(
    `SELECT p.*, MAX(s.price) AS bath_service_price,
            GROUP_CONCAT(CONCAT(ps.service_id, ':', ps.included_uses) ORDER BY ps.service_id) AS service_entitlements
     FROM service_package_plans p
     LEFT JOIN service_package_plan_services ps ON ps.shop_id = p.shop_id AND ps.plan_id = p.id
     LEFT JOIN services s ON s.id = ps.service_id AND s.shop_id = ps.shop_id
     WHERE ${conditions.join(' AND ')} AND p.offer_type = 'POINT_CARD'
     GROUP BY p.id
     ORDER BY p.created_at DESC, p.id DESC`,
    params,
  );
  return { enabled, plans: rows.map(normalizePlan) };
}

async function createPlan(payload = {}) {
  await ensurePackagesEnabled();
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const plan = await validatePlan(payload, connection);
    const [result] = await connection.query(
      `INSERT INTO service_package_plans (shop_id, name, description, offer_type, term, usage_count, price, species)
       VALUES (?, ?, ?, ?, 'MONTH', ?, ?, ?)`,
      [getCurrentShopId(), plan.name, plan.description, plan.offer_type, plan.usage_count, plan.price, plan.species],
    );
    for (const entitlement of plan.entitlements) {
      await connection.query(
        'INSERT INTO service_package_plan_services (shop_id, plan_id, service_id, included_uses) VALUES (?, ?, ?, ?)',
        [getCurrentShopId(), result.insertId, entitlement.service_id, entitlement.included_uses],
      );
    }
    await connection.commit();
    return { plan: { id: result.insertId, ...plan, term: 'MONTH', status: 'ACTIVE' } };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updatePlan(planId, payload = {}) {
  await ensurePackagesEnabled();
  const id = normalizeId(planId);
  if (!id) throw notFound();
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const [existingRows] = await connection.query(
      "SELECT id FROM service_package_plans WHERE id = ? AND shop_id = ? AND offer_type = 'POINT_CARD' LIMIT 1 FOR UPDATE",
      [id, getCurrentShopId()],
    );
    if (!existingRows.length) throw notFound();
    if (payload.status !== undefined) {
      if (!['ACTIVE', 'INACTIVE'].includes(payload.status)) throw validation({ status: '方案狀態無效' });
      await connection.query(
        'UPDATE service_package_plans SET status = ? WHERE id = ? AND shop_id = ?',
        [payload.status, id, getCurrentShopId()],
      );
    } else {
      const [soldPackages] = await connection.query(
        'SELECT id FROM customer_service_packages WHERE shop_id = ? AND plan_id = ? LIMIT 1',
        [getCurrentShopId(), id],
      );
      if (soldPackages.length) {
        throw conflict('SERVICE_PACKAGE_PLAN_READ_ONLY', '方案售出後不可修改內容；請停用舊方案並建立新方案');
      }
      const plan = await validatePlan(payload, connection, id);
      await connection.query(
        `UPDATE service_package_plans
         SET name = ?, description = ?, offer_type = ?, term = 'MONTH', usage_count = ?, price = ?, species = ?
         WHERE id = ? AND shop_id = ?`,
        [plan.name, plan.description, plan.offer_type, plan.usage_count, plan.price, plan.species, id, getCurrentShopId()],
      );
      await connection.query(
        'DELETE FROM service_package_plan_services WHERE shop_id = ? AND plan_id = ?',
        [getCurrentShopId(), id],
      );
      for (const entitlement of plan.entitlements) {
        await connection.query(
          'INSERT INTO service_package_plan_services (shop_id, plan_id, service_id, included_uses) VALUES (?, ?, ?, ?)',
          [getCurrentShopId(), id, entitlement.service_id, entitlement.included_uses],
        );
      }
    }
    await connection.commit();
    return { plan: (await getPlan(id)).plan };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getPlan(planId) {
  const id = normalizeId(planId);
  if (!id) throw notFound();
  const [rows] = await getPool().query(
    `SELECT p.*, MAX(s.price) AS bath_service_price,
            GROUP_CONCAT(CONCAT(ps.service_id, ':', ps.included_uses) ORDER BY ps.service_id) AS service_entitlements
     FROM service_package_plans p
     LEFT JOIN service_package_plan_services ps ON ps.shop_id = p.shop_id AND ps.plan_id = p.id
     LEFT JOIN services s ON s.id = ps.service_id AND s.shop_id = ps.shop_id
     WHERE p.id = ? AND p.shop_id = ? AND p.offer_type = 'POINT_CARD'
     GROUP BY p.id LIMIT 1`,
    [id, getCurrentShopId()],
  );
  if (!rows[0]) throw notFound();
  return { plan: normalizePlan(rows[0]) };
}

async function listCustomerPackages(customerId, filters = {}) {
  const id = normalizeId(customerId);
  if (!id) throw validation({ customer_id: '客戶資料無效' });
  const [rows] = await getPool().query(
    `SELECT cp.*, CASE WHEN cp.status = 'ACTIVE' AND cp.expires_on < CURRENT_DATE THEN 'EXPIRED' ELSE cp.status END AS effective_status,
            p.name AS plan_name, p.term, COALESCE(cp.purchase_price, p.price) AS price, pet.name AS pet_name,
            cp.is_point_package
     FROM customer_service_packages cp
     INNER JOIN service_package_plans p ON p.id = cp.plan_id AND p.shop_id = cp.shop_id
     INNER JOIN pets pet ON pet.id = cp.pet_id AND pet.shop_id = cp.shop_id
     WHERE cp.shop_id = ? AND cp.customer_id = ?
       AND (? IS NULL OR cp.pet_id = ?)
       AND (? = 0 OR (cp.status = 'ACTIVE' AND cp.remaining_uses > 0 AND cp.expires_on >= CURRENT_DATE))
     GROUP BY cp.id
     ORDER BY cp.created_at DESC, cp.id DESC`,
    [
      getCurrentShopId(), id,
      normalizeId(filters.pet_id), normalizeId(filters.pet_id),
      filters.usable_only === 'true' ? 1 : 0,
    ],
  );
  const packages = rows.map(normalizePackage);
  if (!packages.length) return { packages };
  const packageIds = packages.map((servicePackage) => servicePackage.id);
  const [balanceRows] = await getPool().query(
    `SELECT b.customer_service_package_id, b.service_id, b.purchased_uses, b.remaining_uses, s.name AS service_name
     FROM customer_service_package_balances b
     INNER JOIN services s ON s.id = b.service_id AND s.shop_id = b.shop_id
     WHERE b.shop_id = ? AND b.customer_service_package_id IN (?)
     ORDER BY b.service_id`,
    [getCurrentShopId(), packageIds],
  );
  const balancesByPackage = new Map();
  for (const balance of balanceRows) {
    const packageId = Number(balance.customer_service_package_id);
    if (!balancesByPackage.has(packageId)) balancesByPackage.set(packageId, []);
    balancesByPackage.get(packageId).push({
      service_id: Number(balance.service_id),
      service_name: balance.service_name,
      purchased_uses: Number(balance.purchased_uses),
      remaining_uses: Number(balance.remaining_uses),
    });
  }
  const [transactions] = await getPool().query(
    `SELECT t.id, t.customer_service_package_id, t.transaction_type, t.service_id, t.change_uses,
            t.appointment_id, t.order_id, t.note, t.created_at, staff.display_name AS operator_name,
            service.name AS service_name
     FROM customer_service_package_transactions t
     LEFT JOIN staff ON staff.id = t.operator_id
     LEFT JOIN services service ON service.id = t.service_id AND service.shop_id = t.shop_id
     WHERE t.shop_id = ? AND t.customer_service_package_id IN (?)
     ORDER BY t.created_at DESC, t.id DESC`,
    [getCurrentShopId(), packageIds],
  );
  const transactionsByPackage = new Map();
  for (const transaction of transactions) {
    const packageId = Number(transaction.customer_service_package_id);
    if (!transactionsByPackage.has(packageId)) transactionsByPackage.set(packageId, []);
    transactionsByPackage.get(packageId).push({
      ...transaction,
      id: Number(transaction.id),
      change_uses: Number(transaction.change_uses),
      service_id: transaction.service_id == null ? null : Number(transaction.service_id),
      appointment_id: transaction.appointment_id == null ? null : Number(transaction.appointment_id),
      order_id: transaction.order_id == null ? null : Number(transaction.order_id),
    });
  }
  return {
    packages: packages.map((servicePackage) => ({
      ...servicePackage,
      service_balances: balancesByPackage.get(servicePackage.id) || [],
      transactions: transactionsByPackage.get(servicePackage.id) || [],
    })),
  };
}

async function purchasePackage(payload = {}, operatorId) {
  const planId = normalizeId(payload.plan_id);
  const customerId = normalizeId(payload.customer_id);
  const petId = normalizeId(payload.pet_id);
  const paymentMethod = payload.payment_method;
  const errors = {};
  if (!planId) errors.plan_id = '美容包月卡設定無效';
  if (!customerId) errors.customer_id = '客戶資料無效';
  if (!petId) errors.pet_id = '請選擇寵物';
  if (!VALID_PAYMENT_METHODS.has(paymentMethod)) errors.payment_method = '付款方式無效';
  if (Object.keys(errors).length) throw validation(errors);

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    await ensurePackagesEnabled(connection);
    const [plans] = await connection.query(
      `SELECT p.*
       FROM service_package_plans p
       WHERE p.id = ? AND p.shop_id = ? AND p.status = 'ACTIVE'
       LIMIT 1 FOR UPDATE`,
      [planId, getCurrentShopId()],
    );
    const plan = plans[0];
    if (!plan) throw validation({ plan_id: '美容包月卡設定不存在或已停用' });
    const [planServices] = await connection.query(
      `SELECT s.id, s.species, s.breed_price_category, s.package_point_cost, ps.included_uses
       FROM service_package_plan_services ps
       INNER JOIN services s ON s.id = ps.service_id AND s.shop_id = ps.shop_id
       WHERE ps.shop_id = ? AND ps.plan_id = ? AND s.status = 'ACTIVE' AND s.type = 'GROOMING'
         AND s.breed_price_category = 'BATH' AND s.package_point_cost = 1`,
      [getCurrentShopId(), planId],
    );
    const bathService = planServices[0];
    if (plan.offer_type !== 'POINT_CARD' || planServices.length !== 1
      || Number(bathService?.included_uses) !== 1) {
      throw validation({ plan_id: '請先完成美容包月卡的洗澡計價服務設定' });
    }
    const [petRows] = await connection.query(
      `SELECT pet.id, pet.species, pet.breed
       FROM pets pet
       INNER JOIN pet_customer_relationships pcr ON pcr.pet_id = pet.id AND pcr.shop_id = pet.shop_id
       INNER JOIN customers c ON c.id = pcr.customer_id AND c.shop_id = pcr.shop_id
       WHERE pet.id = ? AND pcr.customer_id = ? AND pet.shop_id = ?
         AND pet.status = 'ACTIVE' AND c.status = 'ACTIVE'
       LIMIT 1 FOR UPDATE`,
      [petId, customerId, getCurrentShopId()],
    );
    const pet = petRows[0];
    if (!pet) throw validation({ pet_id: '寵物不屬於此客戶' });
    if (plan.species !== 'BOTH' && plan.species !== pet.species) {
      throw validation({ pet_id: '方案不適用於此寵物種類' });
    }
    if (bathService.species !== 'BOTH' && bathService.species !== pet.species) {
      throw validation({ plan_id: '目前設定的洗澡服務不適用於此寵物' });
    }
    let minimumBathPrice = Number(bathService.price);
    let requiresManualBathPrice = false;
    let breedPrice = null;
    if (pet.species === 'DOG') {
      const [breedPriceRows] = await connection.query(
        `SELECT bath_price, bath_price_is_starting
         FROM shop_pet_breed_prices
         WHERE shop_id = ? AND breed = ?
         LIMIT 1`,
        [getCurrentShopId(), pet.breed],
      );
      breedPrice = breedPriceRows[0];
      const [[catalog]] = await connection.query(
        'SELECT COUNT(*) AS total FROM shop_pet_breed_prices WHERE shop_id = ?',
        [getCurrentShopId()],
      );
      if (Number(catalog.total) > 0) {
        if (!breedPrice || breedPrice.bath_price == null) {
          requiresManualBathPrice = true;
        } else {
          minimumBathPrice = Number(breedPrice.bath_price);
        }
      }
    }
    const quotedBathPrice = payload.quoted_bath_price === undefined || payload.quoted_bath_price === ''
      ? requiresManualBathPrice ? null : minimumBathPrice
      : Number(payload.quoted_bath_price);
    if (!Number.isInteger(quotedBathPrice) || quotedBathPrice <= 0
      || (!requiresManualBathPrice && quotedBathPrice < minimumBathPrice)
      || (pet.species === 'DOG' && breedPrice?.bath_price != null
        && !breedPrice.bath_price_is_starting && quotedBathPrice !== minimumBathPrice)) {
      throw validation({
        quoted_bath_price: requiresManualBathPrice
          ? '此品種需輸入現場確認的洗澡單價'
          : `洗澡報價不可低於 ${minimumBathPrice} 元`,
      });
    }
    const purchasePrice = quotedBathPrice * 4;
    const businessUnit = pet.species;
    const [orderResult] = await connection.query(
      `INSERT INTO orders (shop_id, customer_id, source_type, appointment_id, business_unit, status, total_amount)
       VALUES (?, ?, 'WALK_IN', NULL, ?, 'UNPAID', ?)`,
      [getCurrentShopId(), customerId, businessUnit, purchasePrice],
    );
    const paymentId = await paymentRepository.insertPayment({
      order_id: orderResult.insertId,
      amount: purchasePrice,
      payment_method: paymentMethod,
      operator_id: operatorId,
    }, connection);
    await connection.query(
      "UPDATE orders SET status = 'PAID' WHERE id = ? AND shop_id = ?",
      [orderResult.insertId, getCurrentShopId()],
    );
    const [dates] = await connection.query(
      'SELECT CURRENT_DATE AS starts_on, DATE_ADD(CURRENT_DATE, INTERVAL 50 DAY) AS expires_on',
    );
    const [packageResult] = await connection.query(
      `INSERT INTO customer_service_packages
         (shop_id, plan_id, customer_id, pet_id, purchase_order_id, purchased_uses, remaining_uses, starts_on, expires_on, is_point_package, purchase_price)
       VALUES (?, ?, ?, ?, ?, 5, 5, ?, ?, TRUE, ?)`,
      [
        getCurrentShopId(), planId, customerId, petId, orderResult.insertId,
        dates[0].starts_on, dates[0].expires_on, purchasePrice,
      ],
    );
    await connection.query(
      `INSERT INTO customer_service_package_transactions
         (shop_id, customer_service_package_id, transaction_type, change_uses, order_id, operator_id, note)
       VALUES (?, ?, 'PURCHASE', ?, ?, ?, '方案購買入帳')`,
      [getCurrentShopId(), packageResult.insertId, 5, orderResult.insertId, operatorId],
    );
    await connection.commit();
    return {
      package: {
        id: packageResult.insertId,
        plan_id: planId,
        customer_id: customerId,
        pet_id: petId,
        purchase_order_id: orderResult.insertId,
        purchased_uses: 5,
        remaining_uses: 5,
        is_point_package: true,
        price: purchasePrice,
        starts_on: dates[0].starts_on,
        expires_on: dates[0].expires_on,
        status: 'ACTIVE',
        service_balances: [],
      },
      order_id: Number(orderResult.insertId),
      payment_id: Number(paymentId),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  createPlan,
  getPlan,
  listCustomerPackages,
  listPlans,
  purchasePackage,
  updatePlan,
};
