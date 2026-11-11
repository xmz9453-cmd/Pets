const request = require('supertest');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((line) => { const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/); if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2]; });
process.env.NODE_ENV = 'test'; process.env.DB_NAME = process.env.TEST_DB_NAME || 'psop_test';

const app = require('../../backend/src/app');
const { setup } = require('../../database/scripts/setup');
const { getPool, closePool } = require('../../backend/src/config/database');
const { getFoundationOwner } = require('../../database/seeds/staff-authentication-seed');
const owner = getFoundationOwner();
let sequence = 0;
let testServiceCategories = [];
let testBreed = null;
let createdServiceIds = [];
let createdProductIds = [];

async function login() {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ username: owner.username, password: owner.password });
  return agent;
}

async function createCustomer(agent) {
  sequence += 1;
  const suffix = `${Date.now()}${sequence}`.slice(-8);
  const response = await agent.post('/api/customers').send({ name: `Package Client ${suffix}`, phone: `08${suffix}` });
  return response.body.data.customer.id;
}

describe('Service package API', () => {
  beforeAll(async () => {
    await setup();
    await getPool().query('DELETE FROM auth_sessions');
  });

  beforeEach(async () => {
    testServiceCategories = [];
    testBreed = null;
    await getPool().query('DELETE FROM customer_service_package_transactions');
    await getPool().query('DELETE FROM order_items');
    await getPool().query('DELETE FROM customer_service_package_balances');
    await getPool().query('DELETE FROM customer_service_packages');
    await getPool().query('DELETE FROM service_package_plan_services');
    await getPool().query('DELETE FROM payments');
    await getPool().query('DELETE FROM orders');
    await getPool().query('DELETE FROM service_package_plans');
    await getPool().query('DELETE FROM groomings');
    await getPool().query('DELETE FROM daily_operations');
    await getPool().query('DELETE FROM appointment_pet_services');
    await getPool().query('DELETE FROM appointment_pets');
    await getPool().query('DELETE FROM appointments');
    await getPool().query('DELETE FROM auth_sessions');
  });

  afterEach(async () => {
    if (testBreed) {
      await getPool().query(
        'DELETE FROM shop_pet_breed_prices WHERE shop_id = 1 AND breed = ?',
        [testBreed],
      );
    }
    for (const service of testServiceCategories) {
      await getPool().query(
        'UPDATE services SET breed_price_category = ?, package_point_cost = ? WHERE id = ?',
        [service.breed_price_category, service.package_point_cost, service.id],
      );
    }
    testServiceCategories = [];
  });

  afterAll(async () => {
    await getPool().query('DELETE FROM customer_service_package_transactions');
    await getPool().query('DELETE FROM order_items');
    if (createdProductIds.length) {
      await getPool().query('DELETE FROM products WHERE id IN (?) AND shop_id = 1', [createdProductIds]);
    }
    await getPool().query('DELETE FROM customer_service_package_balances');
    await getPool().query('DELETE FROM customer_service_packages');
    await getPool().query('DELETE FROM service_package_plan_services');
    await getPool().query('DELETE FROM payments');
    await getPool().query('DELETE FROM orders');
    await getPool().query('DELETE FROM service_package_plans');
    await getPool().query('DELETE FROM groomings');
    await getPool().query('DELETE FROM daily_operations');
    await getPool().query('DELETE FROM appointment_pet_services');
    await getPool().query('DELETE FROM appointment_pets');
    await getPool().query('DELETE FROM appointments');
    if (createdServiceIds.length) {
      await getPool().query('DELETE FROM services WHERE id IN (?) AND shop_id = 1', [createdServiceIds]);
    }
    await getPool().query('DELETE FROM auth_sessions');
    await closePool();
  });

  test('disables package plans and sales for shops that opt out', async () => {
    const agent = await login();
    const [[shop]] = await getPool().query(
      'SELECT service_packages_enabled FROM shops WHERE id = 1 LIMIT 1',
    );
    try {
      await getPool().query(
        'UPDATE shops SET service_packages_enabled = FALSE WHERE id = 1',
      );
      const plans = await agent.get('/api/service-package-plans');
      expect(plans.status).toBe(200);
      expect(plans.body.data).toEqual({ enabled: false, plans: [] });
      const purchase = await agent.post('/api/service-packages/purchase').send({
        plan_id: 1,
        customer_id: 1,
        pet_id: 1,
        payment_method: 'CASH',
      });
      expect(purchase.status).toBe(403);
      expect(purchase.body.error.code).toBe('SERVICE_PACKAGES_DISABLED');
    } finally {
      await getPool().query(
        'UPDATE shops SET service_packages_enabled = ? WHERE id = 1',
        [shop.service_packages_enabled],
      );
    }
  });

  test('sells one five-point beauty card and deducts one selected grooming service at a time', async () => {
    const agent = await login();
    const customerId = await createCustomer(agent);
    const petResponse = await agent.post('/api/pets').send({
      name: `Package Pet ${sequence}`,
      species: 'DOG',
      gender: 'MALE',
      customer_id: customerId,
    });
    expect(petResponse.status).toBe(201);
    const petId = petResponse.body.data.pet.id;
    const [serviceRows] = await getPool().query(
      "SELECT id, species, price, breed_price_category, package_point_cost FROM services WHERE type = 'GROOMING' AND status = 'ACTIVE' AND species IN ('DOG', 'BOTH') ORDER BY id LIMIT 2",
    );
    expect(serviceRows.length).toBe(2);
    const bathService = serviceRows[0];
    const fullGroomingService = serviceRows[1];
    testServiceCategories = serviceRows.map((service) => ({
      id: service.id,
      breed_price_category: service.breed_price_category,
      package_point_cost: service.package_point_cost,
    }));
    await getPool().query(
      "UPDATE services SET breed_price_category = 'BATH', package_point_cost = 1 WHERE id = ?",
      [bathService.id],
    );
    await getPool().query(
      "UPDATE services SET breed_price_category = 'ELECTRIC_CLIPPER', package_point_cost = 2 WHERE id = ?",
      [fullGroomingService.id],
    );
    const planResponse = await agent.post('/api/service-package-plans').send({
      bath_service_id: bathService.id,
      species: 'DOG',
    });
    expect(planResponse.status).toBe(201);
    const planId = planResponse.body.data.plan.id;
    expect(planResponse.body.data.plan).toEqual(expect.objectContaining({
      name: '美容包月卡（狗）',
      usage_count: 5,
      offer_type: 'POINT_CARD',
    }));

    const duplicatePlan = await agent.post('/api/service-package-plans').send({
      bath_service_id: bathService.id,
      species: 'DOG',
    });
    expect(duplicatePlan.status).toBe(400);

    const baseBathPrice = Number(bathService.price);
    const purchaseResponse = await agent.post('/api/service-packages/purchase').send({
      customer_id: customerId,
      pet_id: petId,
      plan_id: planId,
      payment_method: 'CASH',
      quoted_bath_price: baseBathPrice,
    });
    expect(purchaseResponse.status).toBe(201);
    const refundablePackageId = purchaseResponse.body.data.package.id;
    const refundableOrderId = purchaseResponse.body.data.order_id;
    const purchaseOrder = await agent.get(`/api/orders/${refundableOrderId}`);
    expect(purchaseOrder.body.data.order.status).toBe('PAID');
    expect(purchaseOrder.body.data.order.items[0]).toEqual(expect.objectContaining({
      item_type: 'PACKAGE',
      item_amount: baseBathPrice * 4,
    }));
    const [[refundablePayment]] = await getPool().query('SELECT id FROM payments WHERE order_id = ? LIMIT 1', [refundableOrderId]);
    expect((await agent.post(`/api/payments/${refundablePayment.id}/void`).send({ reason: '未使用退款' })).status).toBe(200);
    const refundedPackages = await agent.get(`/api/customers/${customerId}/service-packages`);
    expect(refundedPackages.body.data.packages[0]).toEqual(expect.objectContaining({
      id: refundablePackageId,
      remaining_uses: 0,
      status: 'VOID',
    }));
    expect(refundedPackages.body.data.packages[0].expires_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const [[expiration]] = await getPool().query(
      'SELECT DATEDIFF(expires_on, starts_on) AS days FROM customer_service_packages WHERE id = ?',
      [refundablePackageId],
    );
    expect(Number(expiration.days)).toBe(50);

    testBreed = `Package Test Breed ${sequence}`;
    await getPool().query(
      `INSERT INTO shop_pet_breed_prices
         (shop_id, breed, bath_price, bath_price_is_starting, electric_clipper_price, hand_scissor_price)
       VALUES (1, ?, 500, TRUE, 1000, 1500)`,
      [testBreed],
    );
    await getPool().query('UPDATE pets SET breed = ? WHERE id = ? AND shop_id = 1', [testBreed, petId]);
    const belowStartingPrice = await agent.post('/api/service-packages/purchase').send({
      customer_id: customerId,
      pet_id: petId,
      plan_id: planId,
      payment_method: 'CASH',
      quoted_bath_price: 499,
    });
    expect(belowStartingPrice.status).toBe(400);

    const secondPurchaseResponse = await agent.post('/api/service-packages/purchase').send({
      customer_id: customerId,
      pet_id: petId,
      plan_id: planId,
      payment_method: 'CASH',
      quoted_bath_price: 600,
    });
    expect(secondPurchaseResponse.status).toBe(201);
    expect(secondPurchaseResponse.body.data.package.price).toBe(2400);
    const packageId = secondPurchaseResponse.body.data.package.id;
    const orderId = secondPurchaseResponse.body.data.order_id;
    const packageOrder = await agent.get(`/api/orders/${orderId}`);
    expect(packageOrder.body.data.order.items[0].item_amount).toBe(2400);

    const appointmentResponse = await agent.post('/api/appointments').send({
      customer_id: customerId,
      appointment_date: '2026-11-12',
      appointment_time: '09:00:00',
      pets: [{ pet_id: petId, service_ids: [bathService.id] }],
    });
    expect(appointmentResponse.status).toBe(201);
    const appointmentId = appointmentResponse.body.data.appointment.id;
    const [[operation]] = await getPool().query(
      'SELECT id FROM daily_operations WHERE appointment_id = ? AND shop_id = 1 LIMIT 1',
      [appointmentId],
    );
    expect(operation).toBeTruthy();
    expect((await agent.post(`/api/operations/${operation.id}/check-in`)).status).toBe(200);
    const groomingResponse = await agent.post('/api/groomings').send({
      daily_operation_id: operation.id,
      pet_id: petId,
      before_condition: '良好',
      actual_grooming_content: '洗澡與修剪',
      grooming_result: '完成',
    });
    expect(groomingResponse.status).toBe(201);
    expect((await agent.post(`/api/groomings/${groomingResponse.body.data.id}/complete`)).status).toBe(200);

    const redemption = await agent.post('/api/orders').send({
      customer_id: customerId,
      source_type: 'APPOINTMENT',
      appointment_id: appointmentId,
      business_unit: 'DOG',
      items: [{
        service_id: bathService.id,
        pet_id: petId,
        customer_service_package_id: packageId,
        transaction_price: Number(bathService.price),
        quantity: 1,
      }],
    });
    expect(redemption.status).toBe(201);
    expect(redemption.body.data.order.total_amount).toBe(0);
    expect(redemption.body.data.order.status).toBe('PAID');

    const walkInRedemption = await agent.post('/api/orders').send({
      customer_id: customerId,
      source_type: 'WALK_IN',
      business_unit: 'DOG',
      items: [{
        service_id: bathService.id,
        pet_id: petId,
        customer_service_package_id: packageId,
        transaction_price: Number(bathService.price),
        quantity: 1,
      }, {
        service_id: fullGroomingService.id,
        pet_id: petId,
        customer_service_package_id: packageId,
        transaction_price: Number(fullGroomingService.price),
        quantity: 1,
      }],
    });
    expect(walkInRedemption.status).toBe(400);
    expect(walkInRedemption.body.error.fields.items).toMatch(/只能折抵一項/);

    const electricClipperRedemption = await agent.post('/api/orders').send({
      customer_id: customerId,
      source_type: 'WALK_IN',
      business_unit: 'DOG',
      items: [{
        service_id: fullGroomingService.id,
        pet_id: petId,
        customer_service_package_id: packageId,
        transaction_price: Number(fullGroomingService.price),
        quantity: 1,
      }],
    });
    expect(electricClipperRedemption.status).toBe(201);
    expect(electricClipperRedemption.body.data.order.total_amount).toBe(0);
    expect(electricClipperRedemption.body.data.order.status).toBe('PAID');
    const [[walkInTransaction]] = await getPool().query(
      `SELECT appointment_id, note FROM customer_service_package_transactions
       WHERE customer_service_package_id = ? AND order_id = ? AND transaction_type = 'REDEEM'`,
      [packageId, electricClipperRedemption.body.data.order.id],
    );
    expect(walkInTransaction.appointment_id).toBeNull();
    expect(walkInTransaction.note).toBe('現場服務扣次');

    const packageList = await agent.get(`/api/customers/${customerId}/service-packages`);
    expect(packageList.body.data.packages.find((servicePackage) => servicePackage.id === packageId)).toEqual(expect.objectContaining({
      id: packageId,
      purchased_uses: 5,
      remaining_uses: 2,
      status: 'ACTIVE',
    }));
    expect(packageList.body.data.packages.find((servicePackage) => servicePackage.id === packageId).service_balances).toEqual([]);
    const [redemptionRows] = await getPool().query(
      `SELECT change_uses FROM customer_service_package_transactions
       WHERE customer_service_package_id = ? AND order_id = ? AND transaction_type = 'REDEEM'
       ORDER BY change_uses`,
      [packageId, electricClipperRedemption.body.data.order.id],
    );
    expect(redemptionRows.map((row) => Number(row.change_uses))).toEqual([-2]);

    const addOn = await agent.post('/api/services').send({
      name: `Package Add-on ${Date.now()}-${sequence}`,
      type: 'ADD_ON',
      price: 100,
      unit: '次',
      species: 'DOG',
    });
    const boardingService = await agent.post('/api/services').send({
      name: `Package Boarding ${Date.now()}-${sequence}`,
      type: 'BOARDING',
      price: 1000,
      unit: '晚',
      species: 'DOG',
      duration_minutes: 60,
    });
    const product = await agent.post('/api/products').send({
      name: `Package Product ${Date.now()}-${sequence}`,
      price: 100,
      unit: '件',
      species: 'DOG',
    });
    expect(addOn.status).toBe(201);
    expect(boardingService.status).toBe(201);
    expect(product.status).toBe(201);
    createdServiceIds.push(addOn.body.data.service.id, boardingService.body.data.service.id);
    createdProductIds.push(product.body.data.product.id);
    for (const service of [addOn.body.data.service, boardingService.body.data.service]) {
      const invalidRedemption = await agent.post('/api/orders').send({
        customer_id: customerId,
        business_unit: 'DOG',
        items: [{
          service_id: service.id,
          pet_id: petId,
          customer_service_package_id: packageId,
          transaction_price: Number(service.price),
          quantity: 1,
        }],
      });
      expect(invalidRedemption.status).toBe(400);
    }
    const invalidProductRedemption = await agent.post('/api/orders').send({
      customer_id: customerId,
      business_unit: 'DOG',
      items: [{
        product_id: product.body.data.product.id,
        customer_service_package_id: packageId,
        transaction_price: 100,
        quantity: 1,
      }],
    });
    expect(invalidProductRedemption.status).toBe(400);

    const handScissorService = await agent.post('/api/services').send({
      name: `Package Hand Scissor ${Date.now()}-${sequence}`,
      type: 'GROOMING',
      price: 1500,
      unit: '次',
      species: 'DOG',
      duration_minutes: 90,
      breed_price_category: 'HAND_SCISSOR',
    });
    expect(handScissorService.status).toBe(201);
    createdServiceIds.push(handScissorService.body.data.service.id);
    const thirdPurchaseResponse = await agent.post('/api/service-packages/purchase').send({
      customer_id: customerId,
      pet_id: petId,
      plan_id: planId,
      payment_method: 'CASH',
      quoted_bath_price: 600,
    });
    expect(thirdPurchaseResponse.status).toBe(201);
    const handScissorRedemption = await agent.post('/api/orders').send({
      customer_id: customerId,
      source_type: 'WALK_IN',
      business_unit: 'DOG',
      items: [{
        service_id: handScissorService.body.data.service.id,
        pet_id: petId,
        customer_service_package_id: thirdPurchaseResponse.body.data.package.id,
        transaction_price: 1500,
        quantity: 1,
      }],
    });
    expect(handScissorRedemption.status).toBe(201);
    const handCardList = await agent.get(`/api/customers/${customerId}/service-packages`);
    expect(handCardList.body.data.packages.find((servicePackage) => (
      servicePackage.id === thirdPurchaseResponse.body.data.package.id
    )).remaining_uses).toBe(2);

    const [[payment]] = await getPool().query('SELECT id FROM payments WHERE order_id = ? LIMIT 1', [orderId]);
    const refund = await agent.post(`/api/payments/${payment.id}/void`).send({ reason: '使用後退款' });
    expect(refund.status).toBe(409);
    expect(refund.body.error.code).toBe('SERVICE_PACKAGE_ALREADY_USED');
    const planEdit = await agent.patch(`/api/service-package-plans/${planId}`).send({
      bath_service_id: bathService.id,
      species: 'DOG',
    });
    expect(planEdit.status).toBe(409);
    expect(planEdit.body.error.code).toBe('SERVICE_PACKAGE_PLAN_READ_ONLY');
  });
});
