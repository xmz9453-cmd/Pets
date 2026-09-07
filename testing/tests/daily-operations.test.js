const request = require('supertest');
const fs = require('fs');
const path = require('path');

function loadLocalEnvForTestDatabase() {
  const envPath = path.resolve(__dirname, '..', '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    lines.forEach((line) => {
      const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
      if (match && process.env[match[1]] === undefined) {
        process.env[match[1]] = match[2];
      }
    });
  }

  process.env.NODE_ENV = 'test';
  process.env.DB_NAME = process.env.TEST_DB_NAME || 'psop_test';
}

loadLocalEnvForTestDatabase();

const app = require('../../backend/src/app');
const { setup } = require('../../database/scripts/setup');
const { getPool, closePool } = require('../../backend/src/config/database');
const { getFoundationOwner } = require('../../database/seeds/staff-authentication-seed');

const owner = getFoundationOwner();

async function loginAsOwner() {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/login').send({
    username: owner.username,
    password: owner.password,
  });
  return { agent, response };
}

async function createCustomer(agent, payload) {
  return agent.post('/api/customers').send(payload);
}

async function createPet(agent, payload) {
  return agent.post('/api/pets').send(payload);
}

async function getServiceIds() {
  const [rows] = await getPool().query('SELECT id FROM services ORDER BY id LIMIT 10');
  return rows.map((row) => row.id);
}

async function createAppointment(agent, payload) {
  return agent.post('/api/appointments').send(payload);
}

async function ensureDailyOperationExists(appointmentId) {
  const [existing] = await getPool().query(
    'SELECT id FROM daily_operations WHERE appointment_id = ? LIMIT 1',
    [appointmentId]
  );
  if (!existing || existing.length === 0) {
    await getPool().query(
      'INSERT INTO daily_operations (appointment_id, status) VALUES (?, ?)',
      [appointmentId, 'SCHEDULED']
    );
  }
  const [rows] = await getPool().query(
    'SELECT id FROM daily_operations WHERE appointment_id = ? LIMIT 1',
    [appointmentId]
  );
  return rows[0].id;
}

describe('Daily Operations API', () => {
  beforeAll(async () => {
    await setup();
    await getPool().query('DELETE FROM auth_sessions');
  });

  beforeEach(async () => {
    await getPool().query('DELETE FROM auth_sessions');
    await getPool().query('DELETE FROM boardings');
    await getPool().query('DELETE FROM groomings');
    await getPool().query('DELETE FROM daily_operations');
    await getPool().query('DELETE FROM appointment_pet_services');
    await getPool().query('DELETE FROM appointment_pets');
    await getPool().query('DELETE FROM payments');
    await getPool().query('DELETE FROM order_items');
    await getPool().query('DELETE FROM orders');
    await getPool().query('DELETE FROM appointments');
    await getPool().query('DELETE FROM pet_customer_relationships');
    await getPool().query('DELETE FROM pets');
    await getPool().query('DELETE FROM payments');
    await getPool().query('DELETE FROM customers');
  });

  afterAll(async () => {
    await closePool();
  });

  describe('List Operations', () => {
    test('GET /api/operations returns today\'s operations sorted by appointment time', async () => {
      const { agent } = await loginAsOwner();

      // Create test data
      const customer = await createCustomer(agent, {
        name: 'Alice',
        phone: '0912-111-111',
      });
      const customerId = customer.body.data.customer.id;

      const pet = await createPet(agent, {
        name: 'Mochi',
        species: 'DOG',
        gender: 'MALE',
        customer_id: customerId,
      });
      const petId = pet.body.data.pet.id;

      const [serviceId] = await getServiceIds();
      const today = new Date().toISOString().split('T')[0];

      const appt1 = await createAppointment(agent, {
        customer_id: customerId,
        appointment_date: today,
        appointment_time: '10:00:00',
        pets: [{ pet_id: petId, service_ids: [serviceId] }],
      });

      const appt2 = await createAppointment(agent, {
        customer_id: customerId,
        appointment_date: today,
        appointment_time: '09:00:00',
        pets: [{ pet_id: petId, service_ids: [serviceId] }],
      });

      await ensureDailyOperationExists(appt1.body.data.appointment.id);
      await ensureDailyOperationExists(appt2.body.data.appointment.id);

      const response = await agent.get('/api/operations');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      // Should be sorted by appointment time ASC
      expect(response.body.data[0].start_time).toBe('09:00:00');
      expect(response.body.data[1].start_time).toBe('10:00:00');
      expect(response.body.data[0].can_create_appointment_order).toBe(false);
      expect(response.body.data[1].can_create_appointment_order).toBe(false);
    });

    test('Cancelled appointments are excluded from list', async () => {
      const { agent } = await loginAsOwner();

      const customer = await createCustomer(agent, {
        name: 'Bob',
        phone: '0912-222-222',
      });
      const customerId = customer.body.data.customer.id;

      const pet = await createPet(agent, {
        name: 'Luna',
        species: 'CAT',
        gender: 'FEMALE',
        customer_id: customerId,
      });
      const petId = pet.body.data.pet.id;

      const [serviceId] = await getServiceIds();
      const today = new Date().toISOString().split('T')[0];

      const normalAppt = await createAppointment(agent, {
        customer_id: customerId,
        appointment_date: today,
        appointment_time: '10:00:00',
        pets: [{ pet_id: petId, service_ids: [serviceId] }],
      });

      const cancelledAppt = await createAppointment(agent, {
        customer_id: customerId,
        appointment_date: today,
        appointment_time: '11:00:00',
        pets: [{ pet_id: petId, service_ids: [serviceId] }],
      });

      // Cancel the second appointment
      await agent.patch(`/api/appointments/${cancelledAppt.body.data.appointment.id}`).send({
        status: 'CANCELLED',
      });

      await ensureDailyOperationExists(normalAppt.body.data.appointment.id);
      await ensureDailyOperationExists(cancelledAppt.body.data.appointment.id);

      const response = await agent.get('/api/operations');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].appointment_id).toBe(normalAppt.body.data.appointment.id);
    });
  });

  describe('Check-in Workflow', () => {
    test('POST /api/operations/:id/check-in transitions SCHEDULED → CHECKED_IN and records time', async () => {
      const { agent } = await loginAsOwner();

      const customer = await createCustomer(agent, {
        name: 'Charlie',
        phone: '0912-333-333',
      });
      const customerId = customer.body.data.customer.id;

      const pet = await createPet(agent, {
        name: 'Max',
        species: 'DOG',
        gender: 'MALE',
        customer_id: customerId,
      });
      const petId = pet.body.data.pet.id;

      const [serviceId] = await getServiceIds();
      const today = new Date().toISOString().split('T')[0];

      const appt = await createAppointment(agent, {
        customer_id: customerId,
        appointment_date: today,
        appointment_time: '10:00:00',
        pets: [{ pet_id: petId, service_ids: [serviceId] }],
      });

      const operationId = await ensureDailyOperationExists(appt.body.data.appointment.id);

      const response = await agent.post(`/api/operations/${operationId}/check-in`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('CHECKED_IN');
      expect(response.body.data.check_in_time).toBeTruthy();
    });

    test('Check-in from non-SCHEDULED state is rejected', async () => {
      const { agent } = await loginAsOwner();

      const customer = await createCustomer(agent, {
        name: 'Diana',
        phone: '0912-444-444',
      });
      const customerId = customer.body.data.customer.id;

      const pet = await createPet(agent, {
        name: 'Bella',
        species: 'CAT',
        gender: 'FEMALE',
        customer_id: customerId,
      });
      const petId = pet.body.data.pet.id;

      const [serviceId] = await getServiceIds();
      const today = new Date().toISOString().split('T')[0];

      const appt = await createAppointment(agent, {
        customer_id: customerId,
        appointment_date: today,
        appointment_time: '10:00:00',
        pets: [{ pet_id: petId, service_ids: [serviceId] }],
      });

      const operationId = await ensureDailyOperationExists(appt.body.data.appointment.id);

      // Check-in once
      await agent.post(`/api/operations/${operationId}/check-in`);

      // Try to check-in again
      const response = await agent.post(`/api/operations/${operationId}/check-in`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('POST /api/operations/:id/undo-check-in transitions CHECKED_IN → SCHEDULED', async () => {
      const { agent } = await loginAsOwner();

      const customer = await createCustomer(agent, {
        name: 'Eve',
        phone: '0912-555-555',
      });
      const customerId = customer.body.data.customer.id;

      const pet = await createPet(agent, {
        name: 'Fluffy',
        species: 'DOG',
        gender: 'FEMALE',
        customer_id: customerId,
      });
      const petId = pet.body.data.pet.id;

      const [serviceId] = await getServiceIds();
      const today = new Date().toISOString().split('T')[0];

      const appt = await createAppointment(agent, {
        customer_id: customerId,
        appointment_date: today,
        appointment_time: '10:00:00',
        pets: [{ pet_id: petId, service_ids: [serviceId] }],
      });

      const operationId = await ensureDailyOperationExists(appt.body.data.appointment.id);

      // Check-in
      await agent.post(`/api/operations/${operationId}/check-in`);

      // Undo
      const response = await agent.post(`/api/operations/${operationId}/undo-check-in`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('SCHEDULED');
    });
  });

  describe('State Transitions', () => {
    test('CHECKED_IN → IN_PROGRESS transition with started time', async () => {
      const { agent } = await loginAsOwner();

      const customer = await createCustomer(agent, {
        name: 'Frank',
        phone: '0912-666-666',
      });
      const customerId = customer.body.data.customer.id;

      const pet = await createPet(agent, {
        name: 'Rex',
        species: 'DOG',
        gender: 'MALE',
        customer_id: customerId,
      });
      const petId = pet.body.data.pet.id;

      const [serviceId] = await getServiceIds();
      const today = new Date().toISOString().split('T')[0];

      const appt = await createAppointment(agent, {
        customer_id: customerId,
        appointment_date: today,
        appointment_time: '10:00:00',
        pets: [{ pet_id: petId, service_ids: [serviceId] }],
      });

      const operationId = await ensureDailyOperationExists(appt.body.data.appointment.id);

      // Check-in first
      await agent.post(`/api/operations/${operationId}/check-in`);

      // Start work
      const response = await agent.post(`/api/operations/${operationId}/start-work`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('IN_PROGRESS');
      expect(response.body.data.started_time).toBeTruthy();
    });

    test('Complete work from CHECKED_IN state', async () => {
      const { agent } = await loginAsOwner();

      const customer = await createCustomer(agent, {
        name: 'Grace',
        phone: '0912-777-777',
      });
      const customerId = customer.body.data.customer.id;

      const pet = await createPet(agent, {
        name: 'Daisy',
        species: 'CAT',
        gender: 'FEMALE',
        customer_id: customerId,
      });
      const petId = pet.body.data.pet.id;

      const [serviceId] = await getServiceIds();
      const today = new Date().toISOString().split('T')[0];

      const appt = await createAppointment(agent, {
        customer_id: customerId,
        appointment_date: today,
        appointment_time: '10:00:00',
        pets: [{ pet_id: petId, service_ids: [serviceId] }],
      });

      const operationId = await ensureDailyOperationExists(appt.body.data.appointment.id);

      // Check-in
      await agent.post(`/api/operations/${operationId}/check-in`);

      // Complete directly from CHECKED_IN
      const response = await agent.post(`/api/operations/${operationId}/complete-work`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('COMPLETED');
      expect(response.body.data.completed_time).toBeTruthy();
    });

    test('Complete work from IN_PROGRESS state', async () => {
      const { agent } = await loginAsOwner();

      const customer = await createCustomer(agent, {
        name: 'Henry',
        phone: '0912-888-888',
      });
      const customerId = customer.body.data.customer.id;

      const pet = await createPet(agent, {
        name: 'Shadow',
        species: 'DOG',
        gender: 'MALE',
        customer_id: customerId,
      });
      const petId = pet.body.data.pet.id;

      const [serviceId] = await getServiceIds();
      const today = new Date().toISOString().split('T')[0];

      const appt = await createAppointment(agent, {
        customer_id: customerId,
        appointment_date: today,
        appointment_time: '10:00:00',
        pets: [{ pet_id: petId, service_ids: [serviceId] }],
      });

      const operationId = await ensureDailyOperationExists(appt.body.data.appointment.id);

      // Check-in → Start
      await agent.post(`/api/operations/${operationId}/check-in`);
      await agent.post(`/api/operations/${operationId}/start-work`);

      // Complete from IN_PROGRESS
      const response = await agent.post(`/api/operations/${operationId}/complete-work`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('COMPLETED');
      expect(response.body.data.completed_time).toBeTruthy();
    });

    test('Reopen work from COMPLETED state', async () => {
      const { agent } = await loginAsOwner();

      const customer = await createCustomer(agent, {
        name: 'Iris',
        phone: '0912-999-999',
      });
      const customerId = customer.body.data.customer.id;

      const pet = await createPet(agent, {
        name: 'Spot',
        species: 'DOG',
        gender: 'MALE',
        customer_id: customerId,
      });
      const petId = pet.body.data.pet.id;

      const [serviceId] = await getServiceIds();
      const today = new Date().toISOString().split('T')[0];

      const appt = await createAppointment(agent, {
        customer_id: customerId,
        appointment_date: today,
        appointment_time: '10:00:00',
        pets: [{ pet_id: petId, service_ids: [serviceId] }],
      });

      const operationId = await ensureDailyOperationExists(appt.body.data.appointment.id);

      // Complete the work
      await agent.post(`/api/operations/${operationId}/check-in`);
      await agent.post(`/api/operations/${operationId}/complete-work`);

      // Reopen
      const response = await agent.post(`/api/operations/${operationId}/reopen-work`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('IN_PROGRESS');
    });

    test('Invalid transitions are rejected', async () => {
      const { agent } = await loginAsOwner();

      const customer = await createCustomer(agent, {
        name: 'Jack',
        phone: '0912-000-000',
      });
      const customerId = customer.body.data.customer.id;

      const pet = await createPet(agent, {
        name: 'Tommy',
        species: 'CAT',
        gender: 'MALE',
        customer_id: customerId,
      });
      const petId = pet.body.data.pet.id;

      const [serviceId] = await getServiceIds();
      const today = new Date().toISOString().split('T')[0];

      const appt = await createAppointment(agent, {
        customer_id: customerId,
        appointment_date: today,
        appointment_time: '10:00:00',
        pets: [{ pet_id: petId, service_ids: [serviceId] }],
      });

      const operationId = await ensureDailyOperationExists(appt.body.data.appointment.id);

      // Try SCHEDULED → IN_PROGRESS (invalid)
      const response1 = await agent.post(`/api/operations/${operationId}/start-work`);
      expect(response1.status).toBe(400);

      // Try SCHEDULED → COMPLETED (invalid)
      const response2 = await agent.post(`/api/operations/${operationId}/complete-work`);
      expect(response2.status).toBe(400);
    });
  });

  describe('Staff Assignment', () => {
    test('PUT /api/operations/:id/staff-assignment updates responsible staff', async () => {
      const { agent } = await loginAsOwner();

      const customer = await createCustomer(agent, {
        name: 'Karen',
        phone: '0912-101-010',
      });
      const customerId = customer.body.data.customer.id;

      const pet = await createPet(agent, {
        name: 'Buddy',
        species: 'DOG',
        gender: 'MALE',
        customer_id: customerId,
      });
      const petId = pet.body.data.pet.id;

      const [serviceId] = await getServiceIds();
      const today = new Date().toISOString().split('T')[0];

      const appt = await createAppointment(agent, {
        customer_id: customerId,
        appointment_date: today,
        appointment_time: '10:00:00',
        pets: [{ pet_id: petId, service_ids: [serviceId] }],
      });

      const operationId = await ensureDailyOperationExists(appt.body.data.appointment.id);

      // Get a staff ID from database
      const [staffRows] = await getPool().query(
        'SELECT id FROM staff WHERE status = ? LIMIT 2',
        ['ACTIVE']
      );
      const staffId = staffRows[0].id;

      const response = await agent.put(`/api/operations/${operationId}/staff-assignment`).send({
        responsible_staff_id: staffId,
      });

      expect(response.status).toBe(200);
      expect(response.body.data.responsible_staff_id).toBe(staffId);
    });

    test('Staff assignment with non-existent staff is rejected', async () => {
      const { agent } = await loginAsOwner();

      const customer = await createCustomer(agent, {
        name: 'Liam',
        phone: '0912-202-020',
      });
      const customerId = customer.body.data.customer.id;

      const pet = await createPet(agent, {
        name: 'Coco',
        species: 'CAT',
        gender: 'FEMALE',
        customer_id: customerId,
      });
      const petId = pet.body.data.pet.id;

      const [serviceId] = await getServiceIds();
      const today = new Date().toISOString().split('T')[0];

      const appt = await createAppointment(agent, {
        customer_id: customerId,
        appointment_date: today,
        appointment_time: '10:00:00',
        pets: [{ pet_id: petId, service_ids: [serviceId] }],
      });

      const operationId = await ensureDailyOperationExists(appt.body.data.appointment.id);

      const response = await agent.put(`/api/operations/${operationId}/staff-assignment`).send({
        responsible_staff_id: 99999,
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Work Note', () => {
    test('PUT /api/operations/:id/work-note creates and updates work note', async () => {
      const { agent } = await loginAsOwner();

      const customer = await createCustomer(agent, {
        name: 'Megan',
        phone: '0912-303-030',
      });
      const customerId = customer.body.data.customer.id;

      const pet = await createPet(agent, {
        name: 'Simba',
        species: 'DOG',
        gender: 'MALE',
        customer_id: customerId,
      });
      const petId = pet.body.data.pet.id;

      const [serviceId] = await getServiceIds();
      const today = new Date().toISOString().split('T')[0];

      const appt = await createAppointment(agent, {
        customer_id: customerId,
        appointment_date: today,
        appointment_time: '10:00:00',
        pets: [{ pet_id: petId, service_ids: [serviceId] }],
      });

      const operationId = await ensureDailyOperationExists(appt.body.data.appointment.id);

      const noteText = 'Customer called, will arrive 15 minutes late';
      const response = await agent.put(`/api/operations/${operationId}/work-note`).send({
        work_note: noteText,
      });

      expect(response.status).toBe(200);
      expect(response.body.data.work_note).toBe(noteText);

      // Update the note
      const newNoteText = 'Customer arrived, starting grooming';
      const updateResponse = await agent.put(`/api/operations/${operationId}/work-note`).send({
        work_note: newNoteText,
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.work_note).toBe(newNoteText);
    });

    test('Work note with excessive length is rejected', async () => {
      const { agent } = await loginAsOwner();

      const customer = await createCustomer(agent, {
        name: 'Nathan',
        phone: '0912-404-040',
      });
      const customerId = customer.body.data.customer.id;

      const pet = await createPet(agent, {
        name: 'Nala',
        species: 'CAT',
        gender: 'FEMALE',
        customer_id: customerId,
      });
      const petId = pet.body.data.pet.id;

      const [serviceId] = await getServiceIds();
      const today = new Date().toISOString().split('T')[0];

      const appt = await createAppointment(agent, {
        customer_id: customerId,
        appointment_date: today,
        appointment_time: '10:00:00',
        pets: [{ pet_id: petId, service_ids: [serviceId] }],
      });

      const operationId = await ensureDailyOperationExists(appt.body.data.appointment.id);

      const longNote = 'x'.repeat(1001);
      const response = await agent.put(`/api/operations/${operationId}/work-note`).send({
        work_note: longNote,
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Multiple Pet/Service Handling', () => {
    test('Multiple pets in one appointment creates single daily operation', async () => {
      const { agent } = await loginAsOwner();

      const customer = await createCustomer(agent, {
        name: 'Olivia',
        phone: '0912-505-050',
      });
      const customerId = customer.body.data.customer.id;

      const pet1 = await createPet(agent, {
        name: 'Roxy',
        species: 'DOG',
        gender: 'FEMALE',
        customer_id: customerId,
      });

      const pet2 = await createPet(agent, {
        name: 'Whiskers',
        species: 'CAT',
        gender: 'MALE',
        customer_id: customerId,
      });

      const [serviceId1, serviceId2] = await getServiceIds();
      const today = new Date().toISOString().split('T')[0];

      const appt = await createAppointment(agent, {
        customer_id: customerId,
        appointment_date: today,
        appointment_time: '10:00:00',
        pets: [
          { pet_id: pet1.body.data.pet.id, service_ids: [serviceId1] },
          { pet_id: pet2.body.data.pet.id, service_ids: [serviceId2] },
        ],
      });

      await ensureDailyOperationExists(appt.body.data.appointment.id);

      // Verify only one daily operation for this appointment
      const [rows] = await getPool().query(
        'SELECT COUNT(*) as count FROM daily_operations WHERE appointment_id = ?',
        [appt.body.data.appointment.id]
      );
      expect(rows[0].count).toBe(1);
    });
  });
});
