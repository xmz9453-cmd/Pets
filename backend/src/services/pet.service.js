const { getPool } = require('../config/database');
const petRepository = require('../data/pet.repository');

const VALID_SPECIES = new Set(['DOG', 'CAT']);
const VALID_GENDERS = new Set(['MALE', 'FEMALE', 'UNKNOWN']);
const VALID_UNITS = new Set(['KG', 'LB']);
const VALID_STATUSES = new Set(['ACTIVE', 'INACTIVE']);

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

function validatePetPayload(payload, { allowPartial = false } = {}) {
  const fieldErrors = {};
  const requiredFields = ['name', 'species'];

  for (const field of requiredFields) {
    if (!allowPartial && !payload[field]) {
      fieldErrors[field] = `${field} is required`;
    }
  }

  if (payload.name !== undefined && payload.name !== null && String(payload.name).trim().length < 1) {
    fieldErrors.name = 'Pet name is required';
  }

  if (payload.name !== undefined && payload.name !== null && String(payload.name).trim().length > 100) {
    fieldErrors.name = 'Pet name must be 1-100 characters';
  }

  if (payload.species !== undefined && payload.species !== null && !VALID_SPECIES.has(payload.species)) {
    fieldErrors.species = 'Species must be DOG or CAT';
  }

  if (payload.gender !== undefined && payload.gender !== null && payload.gender !== '' && !VALID_GENDERS.has(payload.gender)) {
    fieldErrors.gender = 'Gender must be MALE, FEMALE, or UNKNOWN';
  }

  if (payload.breed !== undefined && payload.breed !== null && String(payload.breed).length > 100) {
    fieldErrors.breed = 'Breed must be 100 characters or less';
  }

  const birthday = payload.birthday !== undefined ? payload.birthday : payload.birth_date;
  if (birthday !== undefined && birthday !== null && birthday !== '') {
    const parsedBirthday = new Date(`${birthday}T00:00:00Z`);
    const normalizedBirthday = !Number.isNaN(parsedBirthday.getTime()) ? parsedBirthday.toISOString().slice(0, 10) : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(birthday)) || normalizedBirthday !== String(birthday) || parsedBirthday > new Date()) {
      fieldErrors.birthday = 'Birthday must be a valid date that is not in the future';
    }
  }

  if (payload.weight !== undefined && payload.weight !== null) {
    const weightValue = Number(payload.weight);
    if (Number.isNaN(weightValue) || weightValue <= 0 || weightValue > 300) {
      fieldErrors.weight = 'Weight must be greater than 0 and less than or equal to 300';
    }
  }

  if (payload.weight_unit !== undefined && payload.weight_unit !== null && !VALID_UNITS.has(payload.weight_unit)) {
    fieldErrors.weight_unit = 'Weight unit must be KG or LB';
  }

  if (payload.photo_url !== undefined && payload.photo_url !== null && payload.photo_url !== '') {
    const photoUrl = String(payload.photo_url);
    if (!/^https?:\/\//i.test(photoUrl)) {
      fieldErrors.photo_url = 'Photo URL must use http:// or https://';
    }
  }

  if (payload.note !== undefined && payload.note !== null && String(payload.note).length > 1000) {
    fieldErrors.note = 'Note must be 1000 characters or less';
  }

  if (payload.special_notes !== undefined && payload.special_notes !== null && String(payload.special_notes).length > 2000) {
    fieldErrors.special_notes = 'Special notes must be 2000 characters or less';
  }

  if (payload.status !== undefined && payload.status !== null && !VALID_STATUSES.has(payload.status)) {
    fieldErrors.status = 'Status must be ACTIVE or INACTIVE';
  }

  return fieldErrors;
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

async function listPets(filters = {}) {
  return petRepository.listPets(filters);
}

async function getPetById(petId) {
  const pet = await petRepository.getPetDetail(petId);
  if (!pet) {
    throw createNotFoundError('PET_NOT_FOUND', 'Pet not found');
  }
  return pet;
}

async function createPet(payload) {
  const errors = validatePetPayload(payload);
  if (Object.keys(errors).length) {
    throw createValidationError(errors);
  }

  if (!payload.customer_id) {
    throw createValidationError({ customer_id: 'Customer is required' });
  }

  const customer = await petRepository.findCustomerById(payload.customer_id);
  if (!customer) {
    throw createNotFoundError('CUSTOMER_NOT_FOUND', 'Customer not found');
  }
  if (customer.status !== 'ACTIVE') {
    throw createValidationError({ customer_id: 'Customer must be active' });
  }

  return withTransaction(async (connection) => {
    const petId = await petRepository.createPet({
      name: payload.name,
      species: payload.species,
      breed: payload.breed,
      gender: payload.gender || 'UNKNOWN',
      birth_date: payload.birthday || payload.birth_date || null,
      weight: payload.weight,
      weight_unit: payload.weight_unit,
      chip_number: payload.chip_number,
      photo_url: payload.photo_url,
      notes: payload.note !== undefined ? payload.note : payload.notes,
      special_notes: payload.special_notes,
      status: 'ACTIVE',
    }, connection);

    await petRepository.createPetRelationship({ petId, customerId: payload.customer_id, isPrimary: true }, connection);
    const petDetail = await petRepository.getPetDetail(petId, connection);
    return { pet: petDetail.pet };
  });
}

async function updatePet(petId, payload) {
  const existing = await petRepository.getPetById(petId);
  if (!existing) {
    throw createNotFoundError('PET_NOT_FOUND', 'Pet not found');
  }

  const errors = validatePetPayload(payload, { allowPartial: true });
  if (Object.keys(errors).length) {
    throw createValidationError(errors);
  }

  if (payload.customer_id !== undefined) {
    const customer = await petRepository.findCustomerById(payload.customer_id);
    if (!customer) {
      throw createNotFoundError('CUSTOMER_NOT_FOUND', 'Customer not found');
    }
    if (customer.status !== 'ACTIVE') {
      throw createValidationError({ customer_id: 'Customer must be active' });
    }
  }

  if (payload.status === 'ACTIVE' && existing.status !== 'ACTIVE') {
    const primary = await petRepository.findPrimaryRelationship(petId);
    const customer = await petRepository.findCustomerById(payload.customer_id || primary?.customer_id);
    if (!customer || customer.status !== 'ACTIVE') {
      throw createValidationError({ status: 'Pet cannot be activated while its customer is inactive' });
    }
  }

  const updatePayload = {
    name: payload.name,
    species: payload.species,
    breed: payload.breed,
    gender: payload.gender,
    birth_date: payload.birthday !== undefined ? (payload.birthday || null) : payload.birth_date,
    weight: payload.weight,
    weight_unit: payload.weight_unit,
    chip_number: payload.chip_number,
    photo_url: payload.photo_url,
    notes: payload.note !== undefined ? (payload.note || null) : payload.notes,
    special_notes: payload.special_notes,
    status: payload.status,
  };

  const filtered = Object.fromEntries(
    Object.entries(updatePayload).filter(([_, value]) => value !== undefined),
  );

  if (payload.customer_id !== undefined) {
    const currentPrimary = await petRepository.findPrimaryRelationship(petId);
    await withTransaction(async (connection) => {
      await petRepository.createPetRelationship({ petId, customerId: payload.customer_id, isPrimary: true }, connection);
      if (currentPrimary && Number(currentPrimary.customer_id) !== Number(payload.customer_id)) {
        await petRepository.removeRelationship(petId, currentPrimary.customer_id, connection);
      }
      await petRepository.updatePet(petId, filtered, connection);
    });
  } else {
    await petRepository.updatePet(petId, filtered);
  }
  const updated = await petRepository.getPetById(petId);
  return { pet: updated };
}

async function activatePet(petId) {
  const pet = await petRepository.getPetById(petId);
  if (!pet) {
    throw createNotFoundError('PET_NOT_FOUND', 'Pet not found');
  }

  if (pet.status === 'ACTIVE') {
    return { pet };
  }

  if (pet.status !== 'INACTIVE') {
    throw createValidationError({ status: 'Invalid pet status transition' });
  }

  const updated = await petRepository.updatePet(petId, { status: 'ACTIVE' });
  return { pet: updated };
}

async function deactivatePet(petId) {
  const pet = await petRepository.getPetById(petId);
  if (!pet) {
    throw createNotFoundError('PET_NOT_FOUND', 'Pet not found');
  }

  if (pet.status === 'INACTIVE') {
    return { pet };
  }

  if (pet.status !== 'ACTIVE') {
    throw createValidationError({ status: 'Invalid pet status transition' });
  }

  const updated = await petRepository.updatePet(petId, { status: 'INACTIVE' });
  return { pet: updated };
}

async function listRelationships(petId) {
  const pet = await petRepository.getPetById(petId);
  if (!pet) {
    throw createNotFoundError('PET_NOT_FOUND', 'Pet not found');
  }

  return { relationships: await petRepository.listRelationshipsByPetId(petId) };
}

async function addRelationship(petId, payload) {
  const pet = await petRepository.getPetById(petId);
  if (!pet) {
    throw createNotFoundError('PET_NOT_FOUND', 'Pet not found');
  }

  if (!payload.customer_id) {
    throw createValidationError({ customer_id: 'Customer is required' });
  }

  const customer = await petRepository.findCustomerById(payload.customer_id);
  if (!customer) {
    throw createNotFoundError('CUSTOMER_NOT_FOUND', 'Customer not found');
  }

  const existing = await petRepository.findRelationshipByPetAndCustomer(petId, payload.customer_id);
  if (existing) {
    const error = new Error('Relationship already exists');
    error.statusCode = 409;
    error.code = 'RELATIONSHIP_EXISTS';
    throw error;
  }

  const primaryExisting = await petRepository.findPrimaryRelationship(petId);
  const shouldPrimary = !primaryExisting || payload.is_primary === true;

  return withTransaction(async (connection) => {
    await petRepository.createPetRelationship({
      petId,
      customerId: payload.customer_id,
      isPrimary: shouldPrimary,
    }, connection);

    if (payload.is_primary === true && primaryExisting) {
      await petRepository.setPrimaryRelationship(petId, payload.customer_id, connection);
    }

    return { relationships: await petRepository.listRelationshipsByPetId(petId) };
  });
}

async function setPrimaryCustomer(petId, customerId) {
  const pet = await petRepository.getPetById(petId);
  if (!pet) {
    throw createNotFoundError('PET_NOT_FOUND', 'Pet not found');
  }

  const relation = await petRepository.findRelationshipByPetAndCustomer(petId, customerId);
  if (!relation) {
    throw createNotFoundError('RELATIONSHIP_NOT_FOUND', 'Pet customer relationship not found');
  }

  return withTransaction(async (connection) => {
    await petRepository.setPrimaryRelationship(petId, customerId, connection);
    return { relationships: await petRepository.listRelationshipsByPetId(petId) };
  });
}

async function removeCustomerRelationship(petId, customerId) {
  const pet = await petRepository.getPetById(petId);
  if (!pet) {
    throw createNotFoundError('PET_NOT_FOUND', 'Pet not found');
  }

  const relation = await petRepository.findRelationshipByPetAndCustomer(petId, customerId);
  if (!relation) {
    throw createNotFoundError('RELATIONSHIP_NOT_FOUND', 'Pet customer relationship not found');
  }

  if (relation.is_primary === 1 || relation.is_primary === true) {
    const error = new Error('Primary customer cannot be removed. Set a new primary first.');
    error.statusCode = 400;
    error.code = 'PRIMARY_CUSTOMER_CANNOT_REMOVE';
    throw error;
  }

  return withTransaction(async (connection) => {
    await petRepository.removeRelationship(petId, customerId, connection);
    return { relationships: await petRepository.listRelationshipsByPetId(petId) };
  });
}

module.exports = {
  addRelationship,
  createPet,
  deactivatePet,
  getPetById,
  listPets,
  listRelationships,
  removeCustomerRelationship,
  setPrimaryCustomer,
  updatePet,
  activatePet,
};
