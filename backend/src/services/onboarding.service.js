const crypto = require('crypto');
const { getPool } = require('../config/database');
const { setCurrentShopId, getCurrentShopId } = require('../utils/shop-context');
const customerRepository = require('../data/customer.repository');
const petRepository = require('../data/pet.repository');
const { normalizeMultiSelectValue } = require('./pet.service');
const appointmentRepository = require('../data/appointment.repository');
const dailyOperationsRepository = require('../data/daily-operations.repository');
const contractVersionRepository = require('../data/contract-version.repository');
const serviceRepository = require('../data/service.repository');
const onboardingRepository = require('../data/onboarding.repository');
const contractPdfStorage = require('../utils/contract-pdf-storage');
const { isSpeciesCompatible } = require('./service.service');

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,}$/;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const MAX_SIGNATURE_SIZE = 1024 * 1024;
const CUSTOMER_FIELDS = new Set(['name', 'phone', 'address', 'line_account', 'id_number', 'emergency_contact', 'emergency_phone', 'note']);
const PET_FIELDS = new Set(['name', 'species', 'gender', 'breed', 'weight', 'chip_number', 'personality', 'medical_history', 'other_history', 'note']);
const APPOINTMENT_FIELDS = new Set(['appointment_date', 'appointment_time', 'service_id']);

function createError(message, statusCode, code, fields) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  if (fields) error.fields = fields;
  return error;
}

function validation(fields) {
  return createError('Validation failed', 400, 'VALIDATION_ERROR', fields);
}

function tokenHash(token) {
  if (typeof token !== 'string' || !TOKEN_PATTERN.test(token)) {
    throw createError('Onboarding not found', 404, 'ONBOARDING_NOT_FOUND');
  }
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseJson(value) {
  if (typeof value === 'string') return JSON.parse(value);
  return value;
}

function dbDateMilliseconds(value) {
  if (value instanceof Date) return value.getTime();
  return new Date(`${String(value).replace(' ', 'T')}Z`).getTime();
}

function normalizeObject(value, fields, fieldName, arrayFields = new Set()) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw validation({ [fieldName]: 'Must be an object' });
  }
  const normalized = {};
  for (const [key, fieldValue] of Object.entries(value)) {
    if (!fields.has(key)) continue;
    if (arrayFields.has(key)) {
      if (!Array.isArray(fieldValue) || fieldValue.some((item) => typeof item !== 'string')) {
        throw validation({ [`${fieldName}.${key}`]: 'Must be an array of strings' });
      }
      normalized[key] = fieldValue.map((item) => item.trim()).filter(Boolean);
      continue;
    }
    if (fieldValue !== null && typeof fieldValue === 'object') {
      throw validation({ [`${fieldName}.${key}`]: 'Must be a scalar value' });
    }
    const text = fieldValue === null ? '' : String(fieldValue).trim();
    if (text.length > 2000) throw validation({ [`${fieldName}.${key}`]: 'Value is too long' });
    normalized[key] = text;
  }
  return normalized;
}

function normalizeOnboardingPet(value) {
  const normalized = normalizeObject(
    value,
    PET_FIELDS,
    'pet',
    new Set(['personality', 'medical_history']),
  );
  if ((normalized.personality || []).length > 8) {
    throw validation({ 'pet.personality': 'Personality selection must have 8 or fewer values' });
  }
  if ((normalized.medical_history || []).length > 30) {
    throw validation({ 'pet.medical_history': 'Medical history selection must have 30 or fewer values' });
  }
  if ((normalized.other_history || '').length > 1000) {
    throw validation({ 'pet.other_history': 'Other history must be 1000 characters or less' });
  }
  return normalized;
}

function checkWritable(row) {
  if (row.status === 'COMPLETED' || row.status === 'EXPIRED') {
    throw createError('Onboarding can no longer be used', 410, 'ONBOARDING_UNAVAILABLE');
  }
  if (dbDateMilliseconds(row.expires_at) <= Date.now()) {
    throw createError('Onboarding has expired', 410, 'ONBOARDING_EXPIRED');
  }
}

async function createWithCreator(staffId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [versions] = await connection.query(
      `SELECT id FROM contract_versions
       WHERE shop_id = ? AND status = 'PUBLISHED' AND is_current = TRUE
       LIMIT 1 FOR UPDATE`,
      [getCurrentShopId()],
    );
    if (!versions[0]) {
      throw createError('A current published contract is required', 409, 'CONTRACT_VERSION_NOT_AVAILABLE');
    }
    const id = await onboardingRepository.createOnboarding({
      tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
      contractVersionId: versions[0].id,
      staffId,
    }, connection);
    await connection.commit();
    return { token, onboarding_id: id };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function create(staffId) {
  return createWithCreator(staffId);
}

async function createPublic() {
  const { token } = await createWithCreator(null);
  return { token };
}

async function getPublic(token) {
  const row = await onboardingRepository.getPublicData(tokenHash(token));
  if (!row) throw createError('Onboarding not found', 404, 'ONBOARDING_NOT_FOUND');
  setCurrentShopId(row.shop_id);
  const expired = row.status === 'EXPIRED' || dbDateMilliseconds(row.expires_at) <= Date.now();
  const [services] = await getPool().query(
    `SELECT id, name, type, species, price
     FROM services WHERE shop_id = ? AND status = 'ACTIVE'
     ORDER BY sort_order ASC, name ASC`,
    [row.shop_id],
  );
  return {
    onboarding: {
      status: expired ? 'EXPIRED' : row.status,
      created_at: row.created_at,
      expires_at: row.expires_at,
      customer: parseJson(row.customer_data) || {},
      pet: parseJson(row.pet_data) || {},
      appointment: parseJson(row.appointment_data) || {},
      customer_resolution: row.customer_resolution,
      pet_resolution: row.pet_resolution,
    },
    contract: {
      version: row.version_label,
      file_name: row.file_name,
      mime_type: row.mime_type,
    },
    services,
  };
}

async function loadMutable(token, connection = getPool()) {
  const hash = tokenHash(token);
  const row = await onboardingRepository.getByTokenHash(hash, connection);
  if (!row) throw createError('Onboarding not found', 404, 'ONBOARDING_NOT_FOUND');
  setCurrentShopId(row.shop_id);
  if (dbDateMilliseconds(row.expires_at) <= Date.now()) {
    await connection.query(
      `UPDATE onboardings SET status = 'EXPIRED'
       WHERE public_token_hash = ? AND shop_id = ? AND status IN ('NOT_STARTED', 'IN_PROGRESS')`,
      [hash, getCurrentShopId()],
    );
  }
  checkWritable(row);
  return row;
}

async function autosave(token, payload = {}) {
  const row = await loadMutable(token);
  const data = {
    customerData: normalizeObject(payload.customer, CUSTOMER_FIELDS, 'customer'),
    petData: normalizeOnboardingPet(payload.pet),
    appointmentData: normalizeObject(payload.appointment, APPOINTMENT_FIELDS, 'appointment'),
  };
  const pool = getPool();
  await pool.getConnection().then(async (connection) => {
    try {
      await connection.beginTransaction();
      const locked = await loadMutable(token, connection);
      await onboardingRepository.saveData(locked.id, data, connection);
      if (locked.status === 'NOT_STARTED') {
        await connection.query(`UPDATE onboardings SET status = 'IN_PROGRESS' WHERE id = ? AND shop_id = ?`, [locked.id, getCurrentShopId()]);
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  });
  return { saved: true };
}

function makeCandidateKey() {
  return crypto.randomBytes(24).toString('base64url');
}

async function searchCustomers(token, query) {
  const row = await loadMutable(token);
  const search = String(query || '').trim();
  if (search.length < 2) throw validation({ query: 'Enter at least 2 characters' });
  const [rows] = await getPool().query(
    `SELECT id, name, phone FROM customers
     WHERE shop_id = ? AND status = 'ACTIVE' AND (name LIKE ? OR phone LIKE ?)
     ORDER BY name ASC LIMIT 20`,
    [getCurrentShopId(), `%${search}%`, `%${search}%`],
  );
  const candidates = rows.map((item) => ({ key: makeCandidateKey(), id: Number(item.id) }));
  await onboardingRepository.saveCandidates(row.id, 'customer', candidates);
  return { candidates: rows.map((item, index) => ({ key: candidates[index].key, name: item.name, phone: item.phone })) };
}

async function searchPets(token, query) {
  const row = await loadMutable(token);
  const search = String(query || '').trim();
  if (search.length < 2) throw validation({ query: 'Enter at least 2 characters' });
  const [rows] = await getPool().query(
    `SELECT p.id, p.name, p.species, p.breed, p.chip_number
     FROM pets p WHERE p.shop_id = ? AND p.status = 'ACTIVE' AND (p.name LIKE ? OR p.chip_number LIKE ?)
     ORDER BY p.name ASC LIMIT 20`,
    [getCurrentShopId(), `%${search}%`, `%${search}%`],
  );
  const candidates = rows.map((item) => ({ key: makeCandidateKey(), id: Number(item.id) }));
  await onboardingRepository.saveCandidates(row.id, 'pet', candidates);
  return { candidates: rows.map((item, index) => ({ key: candidates[index].key, name: item.name, species: item.species, breed: item.breed, chip_number: item.chip_number })) };
}

async function resolve(token, kind, payload = {}) {
  const row = await loadMutable(token);
  const resolution = payload.resolution;
  if (!['EXISTING', 'NEW'].includes(resolution)) {
    throw validation({ resolution: 'Resolution must be EXISTING or NEW' });
  }
  let matchedId = null;
  if (resolution === 'EXISTING') {
    const candidates = parseJson(kind === 'customer' ? row.customer_candidates : row.pet_candidates) || [];
    const candidate = candidates.find((item) => item.key === payload.candidate_key);
    if (!candidate) throw validation({ candidate_key: 'Choose a candidate from the latest search results' });
    matchedId = Number(candidate.id);
  }
  if (kind === 'customer') {
    await onboardingRepository.setCustomerResolution(row.id, resolution, matchedId);
    return { customer_resolution: resolution };
  }
  await onboardingRepository.setPetResolution(row.id, resolution, matchedId);
  return { pet_resolution: resolution };
}

function validateSubmit(row, signatureData) {
  const customer = parseJson(row.customer_data) || {};
  const pet = parseJson(row.pet_data) || {};
  const appointment = parseJson(row.appointment_data) || {};
  const errors = {};
  if (row.customer_resolution === 'UNRESOLVED') errors.customer_resolution = 'Resolve the customer before submitting';
  if (row.pet_resolution === 'UNRESOLVED') errors.pet_resolution = 'Resolve the pet before submitting';
  if (row.customer_resolution === 'NEW') {
    if (!customer.name) errors['customer.name'] = 'Name is required';
    if (!/^[0-9][0-9\s\-()\+\.]{5,29}$/.test(customer.phone || '')) errors['customer.phone'] = 'Phone format is invalid';
    for (const [field, maximum] of Object.entries({ name: 100, phone: 30, address: 255, line_account: 100, id_number: 50, emergency_contact: 100, emergency_phone: 30, note: 1000 })) {
      if (customer[field] && String(customer[field]).length > maximum) errors[`customer.${field}`] = `Must be ${maximum} characters or less`;
    }
  }
  if (row.pet_resolution === 'NEW') {
    if (!pet.name) errors['pet.name'] = 'Pet name is required';
    if (!['DOG', 'CAT'].includes(pet.species)) errors['pet.species'] = 'Species must be DOG or CAT';
    if (!['MALE', 'FEMALE', 'UNKNOWN'].includes(pet.gender || 'UNKNOWN')) errors['pet.gender'] = 'Gender is invalid';
    if (pet.weight && (!Number.isFinite(Number(pet.weight)) || Number(pet.weight) <= 0 || Number(pet.weight) > 300)) errors['pet.weight'] = 'Weight must be greater than 0 and at most 300';
    if (!Array.isArray(pet.personality) || pet.personality.length > 8) errors['pet.personality'] = 'Personality must be an array of up to 8 selections';
    if (!Array.isArray(pet.medical_history) || pet.medical_history.length > 30) errors['pet.medical_history'] = 'Medical history must be an array of up to 30 selections';
    if (pet.other_history && String(pet.other_history).length > 1000) errors['pet.other_history'] = 'Other history must be 1000 characters or less';
    for (const [field, maximum] of Object.entries({ name: 100, breed: 100, chip_number: 100, note: 2000 })) {
      if (pet[field] && String(pet[field]).length > maximum) errors[`pet.${field}`] = `Must be ${maximum} characters or less`;
    }
  }
  const date = appointment.appointment_date || '';
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00Z`) : null;
  if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) errors['appointment.appointment_date'] = 'Appointment date is invalid';
  if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(appointment.appointment_time || '')) errors['appointment.appointment_time'] = 'Appointment time is required';
  if (!Number.isInteger(Number(appointment.service_id)) || Number(appointment.service_id) <= 0) errors['appointment.service_id'] = 'Service is required';
  if (!signatureData) errors.signature = 'Signature is required';
  if (Object.keys(errors).length) throw validation(errors);
  return { customer, pet, appointment };
}

function decodeSignature(value) {
  if (typeof value !== 'string') throw validation({ signature: 'PNG signature is required' });
  const encoded = value.replace(/^data:image\/png;base64,/, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw validation({ signature: 'Signature must be PNG data' });
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.length < PNG_SIGNATURE.length || bytes.length > MAX_SIGNATURE_SIZE || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw validation({ signature: 'Signature must be a valid PNG under 1 MiB' });
  }
  let offset = PNG_SIGNATURE.length;
  let firstChunk = true;
  let hasEnd = false;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > bytes.length || (firstChunk && (type !== 'IHDR' || length !== 13))) {
      throw validation({ signature: 'Signature must be a valid PNG under 1 MiB' });
    }
    if (firstChunk && (!bytes.readUInt32BE(offset + 8) || !bytes.readUInt32BE(offset + 12))) {
      throw validation({ signature: 'Signature PNG dimensions are invalid' });
    }
    if (type === 'IEND') {
      if (length !== 0 || chunkEnd !== bytes.length) throw validation({ signature: 'Signature must be a valid PNG under 1 MiB' });
      hasEnd = true;
      break;
    }
    firstChunk = false;
    offset = chunkEnd;
  }
  if (!hasEnd) throw validation({ signature: 'Signature must be a valid PNG under 1 MiB' });
  return bytes;
}

async function submit(token, payload = {}) {
  const hash = tokenHash(token);
  const connection = await getPool().getConnection();
  let transactionCommitted = false;
  try {
    await connection.beginTransaction();
    const row = await onboardingRepository.getByTokenHash(hash, connection, true);
    if (!row) throw createError('Onboarding not found', 404, 'ONBOARDING_NOT_FOUND');
    setCurrentShopId(row.shop_id);
    if (dbDateMilliseconds(row.expires_at) <= Date.now()
        && row.status !== 'COMPLETED' && row.status !== 'EXPIRED') {
      await onboardingRepository.expire(row.id, connection);
      await connection.commit();
      transactionCommitted = true;
      throw createError('Onboarding has expired', 410, 'ONBOARDING_EXPIRED');
    }
    checkWritable(row);
    const signature = decodeSignature(payload.signature_png);
    const { customer, pet, appointment } = validateSubmit(row, signature);
    const contract = await contractVersionRepository.getContractVersionById(row.contract_version_id, connection);
    if (!contract || contract.status !== 'PUBLISHED') throw createError('Pinned contract version is unavailable', 409, 'CONTRACT_VERSION_NOT_AVAILABLE');
    await contractPdfStorage.verifyStoredFile(contract);
    const services = await serviceRepository.getServiceById(Number(appointment.service_id), connection);
    if (!services || services.status !== 'ACTIVE') throw validation({ 'appointment.service_id': 'Service is unavailable' });
    const [customerRows] = await connection.query(
      'SELECT id, status FROM customers WHERE id = ? AND shop_id = ? LIMIT 1',
      [row.matched_customer_id || 0, getCurrentShopId()],
    );
    if (row.customer_resolution === 'EXISTING' && (!customerRows[0] || customerRows[0].status !== 'ACTIVE')) {
      throw validation({ customer_resolution: 'The selected Customer is no longer available' });
    }
    const [petRows] = await connection.query(
      'SELECT id, species, status FROM pets WHERE id = ? AND shop_id = ? LIMIT 1',
      [row.matched_pet_id || 0, getCurrentShopId()],
    );
    if (row.pet_resolution === 'EXISTING' && (!petRows[0] || petRows[0].status !== 'ACTIVE')) {
      throw validation({ pet_resolution: 'The selected Pet is no longer available' });
    }
    const species = row.pet_resolution === 'EXISTING' ? petRows[0].species : pet.species;
    if (!isSpeciesCompatible(services.species, species)) throw validation({ 'appointment.service_id': 'Service is not compatible with pet species' });

    const customerId = row.customer_resolution === 'EXISTING'
      ? Number(row.matched_customer_id)
      : await customerRepository.createCustomer({
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        lineId: customer.line_account,
        idCardNumber: customer.id_number,
        emergencyContactName: customer.emergency_contact,
        emergencyContactPhone: customer.emergency_phone,
        note: customer.note,
      }, connection);
    const petId = row.pet_resolution === 'EXISTING'
      ? Number(row.matched_pet_id)
      : await petRepository.createPet({
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        gender: pet.gender || 'UNKNOWN',
        weight: pet.weight || null,
        weight_unit: pet.weight ? 'KG' : null,
        chip_number: pet.chip_number,
        personality: JSON.stringify(normalizeMultiSelectValue(pet.personality)),
        medical_history: JSON.stringify(normalizeMultiSelectValue(pet.medical_history)),
        other_history: pet.other_history,
        notes: pet.note,
      }, connection);
    const [relationshipRows] = await connection.query(
      'SELECT 1 FROM pet_customer_relationships WHERE pet_id = ? AND customer_id = ? AND shop_id = ? LIMIT 1',
      [petId, customerId, getCurrentShopId()],
    );
    if (!relationshipRows.length) {
      await petRepository.createPetRelationship({ petId, customerId, isPrimary: row.pet_resolution === 'NEW' }, connection);
    }

    const appointmentId = await appointmentRepository.createAppointment({
      customer_id: customerId,
      appointment_date: appointment.appointment_date,
      appointment_time: appointment.appointment_time,
      status: 'SCHEDULED',
      note: null,
    }, connection);
    const appointmentPetId = await appointmentRepository.createAppointmentPet({ appointmentId, petId }, connection);
    await appointmentRepository.createAppointmentPetService({
      appointmentPetId,
      serviceId: Number(appointment.service_id),
      durationMinutes: Number(services.duration_minutes),
    }, connection);
    await dailyOperationsRepository.create(appointmentId, connection);
    const signatureHash = crypto.createHash('sha256').update(signature).digest('hex');
    await connection.query(
      `INSERT INTO contract_history
       (shop_id, onboarding_id, customer_id, pet_id, appointment_id, contract_version_id, version,
        pdf_hash, storage_path, agreed_at, signature_evidence, signature_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), ?, ?)`,
      [getCurrentShopId(), row.id, customerId, petId, appointmentId, contract.id, contract.version_label, contract.file_hash, contract.storage_path, signature, signatureHash],
    );
    await connection.query(
      `UPDATE onboardings SET status = 'COMPLETED', completed_at = UTC_TIMESTAMP() WHERE id = ? AND shop_id = ?`,
      [row.id, getCurrentShopId()],
    );
    await connection.commit();
    transactionCommitted = true;
    return { completed: true };
  } catch (error) {
    if (!transactionCommitted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getContractPdf(token) {
  const row = await onboardingRepository.getPublicData(tokenHash(token));
  if (!row) throw createError('Onboarding not found', 404, 'ONBOARDING_NOT_FOUND');
  setCurrentShopId(row.shop_id);
  if (row.status === 'COMPLETED' || row.status === 'EXPIRED' || dbDateMilliseconds(row.expires_at) <= Date.now()) {
    throw createError('Onboarding can no longer be used', 410, 'ONBOARDING_UNAVAILABLE');
  }
  const version = await contractVersionRepository.getContractVersionById(row.contract_version_id);
  if (!version || version.status !== 'PUBLISHED') throw createError('Contract PDF is unavailable', 409, 'CONTRACT_VERSION_NOT_AVAILABLE');
  return contractPdfStorage.verifyStoredFile(version);
}

module.exports = {
  autosave,
  create,
  createPublic,
  getContractPdf,
  getPublic,
  resolve,
  searchCustomers,
  searchPets,
  submit,
};
