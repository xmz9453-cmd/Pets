const { getPool } = require('../config/database');
const { getCurrentShopId } = require('../utils/shop-context');
const appointmentRepository = require('../data/appointment.repository');
const dailyOperationsRepository = require('../data/daily-operations.repository');
const dailyOperationsService = require('./daily-operations.service');
const groomingRepository = require('../data/grooming.repository');
const groomingPhotoRepository = require('../data/grooming-photo.repository');
const groomingPhotoStorage = require('../utils/grooming-photo-storage');
const { withMediaStorageLock } = require('../utils/media-storage-lock');
const { logError } = require('../utils/logger');

const GROOMING_PHOTO_CATEGORIES = new Set(['BEFORE', 'AFTER', 'CONCERN']);
const MAX_GROOMING_PHOTOS = 5;

function presentPhoto(photo, imageUrl) {
  return {
    id: Number(photo.id),
    category: photo.category,
    file_size: Number(photo.file_size),
    original_filename: photo.original_filename,
    created_at: photo.created_at,
    image_url: imageUrl,
  };
}

async function listPresentedPhotos(groomingId, audience = 'staff') {
  const photos = await groomingPhotoRepository.listByGroomingId(groomingId);
  const shopId = getCurrentShopId();
  return photos.map((photo) => presentPhoto(
    photo,
    audience === 'customer'
      ? `/api/public/member/grooming-photos/${Number(photo.id)}?shop_id=${shopId}`
      : `/api/groomings/${Number(groomingId)}/photos/${Number(photo.id)}/image`,
  ));
}

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

function createConflictError(code, message) {
  const error = new Error(message);
  error.statusCode = 409;
  error.code = code;
  return error;
}

function normalizeOptionalText(value, maxLength = 2000) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized = String(value).trim();
  if (normalized.length > maxLength) {
    throw createValidationError({ text: `Text must be ${maxLength} characters or fewer` });
  }
  return normalized;
}

async function ensureDailyOperationExists(dailyOperationId) {
  const operation = await dailyOperationsRepository.findById(dailyOperationId);
  if (!operation) {
    throw createNotFoundError('DAILY_OPERATION_NOT_FOUND', 'Daily operation not found');
  }
  return operation;
}

async function ensurePetBelongsToOperation(dailyOperationId, petId) {
  const operation = await ensureDailyOperationExists(dailyOperationId);

  const [rows] = await getPool().query(
    'SELECT 1 FROM appointment_pets WHERE appointment_id = ? AND pet_id = ? AND shop_id = ? LIMIT 1',
    [operation.appointment_id, petId, getCurrentShopId()],
  );

  if (!rows || rows.length === 0) {
    throw createValidationError({ pet_id: 'Pet is not linked to this appointment' });
  }

  return operation;
}

async function listGroomings(query = {}) {
  const dailyOperationId = query.daily_operation_id ? Number(query.daily_operation_id) : null;
  if (!dailyOperationId) {
    return [];
  }

  await ensureDailyOperationExists(dailyOperationId);
  const rows = await groomingRepository.listByDailyOperationId(dailyOperationId);
  const photos = await groomingPhotoRepository.listByGroomingIds(rows.map((row) => Number(row.id)));
  const photosByGrooming = new Map();
  for (const photo of photos) {
    const groomingId = Number(photo.grooming_id);
    if (!photosByGrooming.has(groomingId)) photosByGrooming.set(groomingId, []);
    photosByGrooming.get(groomingId).push(presentPhoto(
      photo,
      `/api/groomings/${groomingId}/photos/${Number(photo.id)}/image`,
    ));
  }
  return rows.map((row) => ({
    id: Number(row.id),
    daily_operation_id: Number(row.daily_operation_id),
    pet_id: Number(row.pet_id),
    pet_name: row.pet_name,
    species: row.species,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    before_condition: row.before_condition,
    actual_grooming_content: row.actual_grooming_content,
    grooming_result: row.grooming_result,
    note: row.note,
    service_names: row.service_names,
    photos: photosByGrooming.get(Number(row.id)) || [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

async function getGrooming(id) {
  const record = await groomingRepository.findByIdWithRelations(id);
  if (!record) {
    throw createNotFoundError('GROOMING_NOT_FOUND', 'Grooming record not found');
  }

  return {
    id: Number(record.id),
    daily_operation_id: Number(record.daily_operation_id),
    appointment_id: Number(record.appointment_id),
    pet_id: Number(record.pet_id),
    pet_name: record.pet_name,
    species: record.species,
    gender: record.gender,
    customer_name: record.customer_name,
    customer_phone: record.customer_phone,
    service_names: record.service_names,
    photos: await listPresentedPhotos(record.id),
    before_condition: record.before_condition,
    actual_grooming_content: record.actual_grooming_content,
    grooming_result: record.grooming_result,
    note: record.note,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

async function createGrooming(payload = {}) {
  const dailyOperationId = Number(payload.daily_operation_id);
  const petId = Number(payload.pet_id);

  if (!dailyOperationId || !Number.isInteger(dailyOperationId) || dailyOperationId <= 0) {
    throw createValidationError({ daily_operation_id: 'Daily operation is required' });
  }

  if (!petId || !Number.isInteger(petId) || petId <= 0) {
    throw createValidationError({ pet_id: 'Pet is required' });
  }

  const operation = await ensurePetBelongsToOperation(dailyOperationId, petId);
  if (operation.status !== 'CHECKED_IN' && operation.status !== 'IN_PROGRESS' && operation.status !== 'COMPLETED') {
    throw createValidationError({ status: `Cannot add grooming record from status ${operation.status}` });
  }

  const existing = await groomingRepository.findByDailyOperationAndPet(dailyOperationId, petId);
  if (existing) {
    throw createConflictError('GROOMING_ALREADY_EXISTS', 'Grooming work already exists for this pet');
  }

  const nextPayload = {
    daily_operation_id: dailyOperationId,
    pet_id: petId,
    before_condition: normalizeOptionalText(payload.before_condition, 2000),
    actual_grooming_content: normalizeOptionalText(payload.actual_grooming_content, 2000),
    grooming_result: normalizeOptionalText(payload.grooming_result, 2000),
    note: normalizeOptionalText(payload.note, 2000),
  };

  const id = await groomingRepository.createRecord(nextPayload);
  return getGrooming(id);
}

async function updateGrooming(id, payload = {}) {
  const existing = await groomingRepository.findById(id);
  if (!existing) {
    throw createNotFoundError('GROOMING_NOT_FOUND', 'Grooming record not found');
  }

  const nextPayload = {};

  if (payload.daily_operation_id !== undefined) {
    const dailyOperationId = Number(payload.daily_operation_id);
    if (!dailyOperationId || !Number.isInteger(dailyOperationId) || dailyOperationId <= 0) {
      throw createValidationError({ daily_operation_id: 'Daily operation is required' });
    }
    await ensurePetBelongsToOperation(dailyOperationId, existing.pet_id);
    nextPayload.daily_operation_id = dailyOperationId;
  }

  if (payload.pet_id !== undefined) {
    const petId = Number(payload.pet_id);
    if (!petId || !Number.isInteger(petId) || petId <= 0) {
      throw createValidationError({ pet_id: 'Pet is required' });
    }
    await ensurePetBelongsToOperation(nextPayload.daily_operation_id ?? existing.daily_operation_id, petId);
    nextPayload.pet_id = petId;
  }

  if (payload.before_condition !== undefined) {
    nextPayload.before_condition = normalizeOptionalText(payload.before_condition, 2000);
  }
  if (payload.actual_grooming_content !== undefined) {
    nextPayload.actual_grooming_content = normalizeOptionalText(payload.actual_grooming_content, 2000);
  }
  if (payload.grooming_result !== undefined) {
    nextPayload.grooming_result = normalizeOptionalText(payload.grooming_result, 2000);
  }
  if (payload.note !== undefined) {
    nextPayload.note = normalizeOptionalText(payload.note, 2000);
  }

  if (nextPayload.daily_operation_id !== undefined || nextPayload.pet_id !== undefined) {
    const finalDailyOperationId = nextPayload.daily_operation_id ?? existing.daily_operation_id;
    const finalPetId = nextPayload.pet_id ?? existing.pet_id;
    const duplicate = await groomingRepository.findByDailyOperationAndPet(finalDailyOperationId, finalPetId);
    if (duplicate && Number(duplicate.id) !== Number(id)) {
      throw createConflictError('GROOMING_ALREADY_EXISTS', 'Grooming work already exists for this pet');
    }
  }

  await groomingRepository.updateRecord(id, nextPayload);
  return getGrooming(id);
}

async function completeGrooming(id) {
  const existing = await groomingRepository.findById(id);
  if (!existing) {
    throw createNotFoundError('GROOMING_NOT_FOUND', 'Grooming record not found');
  }

  const operation = await ensureDailyOperationExists(existing.daily_operation_id);
  if (operation.status !== 'CHECKED_IN' && operation.status !== 'IN_PROGRESS') {
    throw createValidationError({ status: `Cannot complete grooming from status ${operation.status}` });
  }

  await dailyOperationsService.completeWork(String(existing.daily_operation_id));
  return getGrooming(id);
}

async function addGroomingPhoto(id, file, categoryValue) {
  const category = String(categoryValue || '').trim().toUpperCase();
  if (!GROOMING_PHOTO_CATEGORIES.has(category)) {
    throw createValidationError({ category: '照片分類必須為 BEFORE、AFTER 或 CONCERN。' });
  }
  const existing = await groomingRepository.findById(id);
  if (!existing) throw createNotFoundError('GROOMING_NOT_FOUND', 'Grooming record not found');
  await ensureDailyOperationExists(existing.daily_operation_id);

  try {
    return await withMediaStorageLock(async () => {
      if (await groomingPhotoRepository.countByGroomingId(id) >= MAX_GROOMING_PHOTOS) {
        throw createConflictError('GROOMING_PHOTO_LIMIT_REACHED', '每次美容最多可上傳 5 張照片。');
      }

      const inspected = await groomingPhotoStorage.inspectUploadedFile(file);
      const storageKey = groomingPhotoStorage.createStorageKey(inspected.extension);
      await groomingPhotoStorage.moveTemporaryFile(file.path, storageKey);
      try {
        const photoId = await groomingPhotoRepository.create({
          grooming_id: Number(id),
          category,
          storage_key: storageKey,
          mime_type: inspected.mimeType,
          file_size: inspected.bytes.length,
          original_filename: inspected.originalFilename,
        });
        return {
          photo: presentPhoto(
            { id: photoId, category, file_size: inspected.bytes.length, original_filename: inspected.originalFilename },
            `/api/groomings/${Number(id)}/photos/${photoId}/image`,
          ),
        };
      } catch (error) {
        await groomingPhotoStorage.removeStoredImage(storageKey).catch((cleanupError) => {
          logError('Failed to remove orphaned grooming photo after database failure', {
            code: cleanupError.code,
            groomingId: Number(id),
          });
        });
        throw error;
      }
    });
  } finally {
    if (file?.path) {
      await groomingPhotoStorage.removeTemporaryFile(file.path).catch((cleanupError) => {
        logError('Failed to remove grooming photo upload temporary file', { code: cleanupError.code });
      });
    }
  }
}

async function removeGroomingPhoto(groomingId, photoId) {
  return withMediaStorageLock(async () => {
    const photo = await groomingPhotoRepository.findById(photoId);
    if (!photo || Number(photo.grooming_id) !== Number(groomingId)) {
      throw createNotFoundError('GROOMING_PHOTO_NOT_FOUND', 'Grooming photo not found');
    }
    await groomingPhotoRepository.deleteById(photoId);
    try {
      await groomingPhotoStorage.removeStoredImage(photo.storage_key);
    } catch (error) {
      logError('Failed to remove deleted grooming photo file', { photoId: Number(photoId), code: error.code });
      throw error;
    }
    return { id: Number(photoId) };
  });
}

async function getGroomingPhotoImage(groomingId, photoId) {
  const photo = await groomingPhotoRepository.findById(photoId);
  if (!photo || Number(photo.grooming_id) !== Number(groomingId)) {
    throw createNotFoundError('GROOMING_PHOTO_NOT_FOUND', 'Grooming photo not found');
  }
  return groomingPhotoStorage.readStoredImage(photo.storage_key, photo.mime_type);
}

module.exports = {
  addGroomingPhoto,
  completeGrooming,
  createGrooming,
  getGrooming,
  getGroomingPhotoImage,
  listGroomings,
  removeGroomingPhoto,
  updateGrooming,
};
