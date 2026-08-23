const dailyOperationsRepository = require('../data/daily-operations.repository');
const appointmentRepository = require('../data/appointment.repository');
const { getPool } = require('../config/database');

// State Machine Configuration
const VALID_TRANSITIONS = {
  'SCHEDULED': ['CHECKED_IN'],
  'CHECKED_IN': ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'],
  'IN_PROGRESS': ['CHECKED_IN', 'COMPLETED'],
  'COMPLETED': ['IN_PROGRESS'],
};

const VALID_STATUSES = new Set(['SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED']);

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

function createForbiddenError(code, message) {
  const error = new Error(message);
  error.statusCode = 403;
  error.code = code;
  return error;
}

function isValidStateTransition(fromStatus, toStatus) {
  if (!VALID_STATUSES.has(fromStatus) || !VALID_STATUSES.has(toStatus)) {
    return false;
  }
  const allowedTransitions = VALID_TRANSITIONS[fromStatus] || [];
  return allowedTransitions.includes(toStatus);
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

async function listTodayOperations(query = {}) {
  const filters = {
    date: query.date || null,
    status: query.status || 'ALL',
    serviceType: query.serviceType || null,
    species: query.species || null,
    searchCustomer: query.searchCustomer || null,
    searchPet: query.searchPet || null,
    searchPhone: query.searchPhone || null,
  };

  return dailyOperationsRepository.listTodayOperations(filters);
}

async function getDailyOperation(id) {
  const operation = await dailyOperationsRepository.findByIdWithRelations(id);
  if (!operation) {
    throw createNotFoundError(
      'DAILY_OPERATION_NOT_FOUND',
      'Daily operation not found'
    );
  }
  return operation;
}

async function checkIn(id) {
  return withTransaction(async (connection) => {
    const operation = await dailyOperationsRepository.findById(id);
    if (!operation) {
      throw createNotFoundError(
        'DAILY_OPERATION_NOT_FOUND',
        'Daily operation not found'
      );
    }

    if (operation.status !== 'SCHEDULED') {
      throw createValidationError({
        status: `Cannot check-in from status ${operation.status}`,
      });
    }

    // Update status and check-in time
    await dailyOperationsRepository.updateStatus(id, 'CHECKED_IN', connection);
    await dailyOperationsRepository.updateCheckInTime(id, connection);

    return dailyOperationsRepository.findByIdWithRelations(id, connection);
  });
}

async function undoCheckIn(id) {
  return withTransaction(async (connection) => {
    const operation = await dailyOperationsRepository.findById(id);
    if (!operation) {
      throw createNotFoundError(
        'DAILY_OPERATION_NOT_FOUND',
        'Daily operation not found'
      );
    }

    if (operation.status !== 'CHECKED_IN') {
      throw createValidationError({
        status: `Cannot undo check-in from status ${operation.status}`,
      });
    }

    // Update status back to SCHEDULED
    await dailyOperationsRepository.updateStatus(id, 'SCHEDULED', connection);

    return dailyOperationsRepository.findByIdWithRelations(id, connection);
  });
}

async function startWork(id) {
  return withTransaction(async (connection) => {
    const operation = await dailyOperationsRepository.findById(id);
    if (!operation) {
      throw createNotFoundError(
        'DAILY_OPERATION_NOT_FOUND',
        'Daily operation not found'
      );
    }

    if (operation.status !== 'CHECKED_IN') {
      throw createValidationError({
        status: `Cannot start work from status ${operation.status}`,
      });
    }

    // Update status and started time
    await dailyOperationsRepository.updateStatus(id, 'IN_PROGRESS', connection);
    await dailyOperationsRepository.updateStartedTime(id, connection);

    return dailyOperationsRepository.findByIdWithRelations(id, connection);
  });
}

async function completeWork(id) {
  return withTransaction(async (connection) => {
    const operation = await dailyOperationsRepository.findById(id);
    if (!operation) {
      throw createNotFoundError(
        'DAILY_OPERATION_NOT_FOUND',
        'Daily operation not found'
      );
    }

    if (operation.status !== 'CHECKED_IN' && operation.status !== 'IN_PROGRESS') {
      throw createValidationError({
        status: `Cannot complete work from status ${operation.status}`,
      });
    }

    // Update status and completed time
    await dailyOperationsRepository.updateStatus(id, 'COMPLETED', connection);
    await dailyOperationsRepository.updateCompletedTime(id, connection);

    return dailyOperationsRepository.findByIdWithRelations(id, connection);
  });
}

async function reopenWork(id) {
  return withTransaction(async (connection) => {
    const operation = await dailyOperationsRepository.findById(id);
    if (!operation) {
      throw createNotFoundError(
        'DAILY_OPERATION_NOT_FOUND',
        'Daily operation not found'
      );
    }

    if (operation.status !== 'COMPLETED') {
      throw createValidationError({
        status: `Cannot reopen from status ${operation.status}`,
      });
    }

    // Update status back to IN_PROGRESS
    await dailyOperationsRepository.updateStatus(id, 'IN_PROGRESS', connection);

    return dailyOperationsRepository.findByIdWithRelations(id, connection);
  });
}

async function updateStaffAssignment(id, staffId, userStaff) {
  // Verify authorization - only OWNER can reassign
  const isOwner = userStaff && userStaff.roles && userStaff.roles.includes('OWNER');
  if (!isOwner) {
    throw createForbiddenError(
      'UNAUTHORIZED_STAFF_ASSIGNMENT',
      'Only owner can reassign staff'
    );
  }

  return withTransaction(async (connection) => {
    const operation = await dailyOperationsRepository.findById(id);
    if (!operation) {
      throw createNotFoundError(
        'DAILY_OPERATION_NOT_FOUND',
        'Daily operation not found'
      );
    }

    // Verify staff exists
    if (staffId) {
      const [staffRows] = await connection.query(
        'SELECT id FROM staff WHERE id = ? AND status = ? LIMIT 1',
        [staffId, 'ACTIVE']
      );
      if (!staffRows || staffRows.length === 0) {
        throw createValidationError({
          responsible_staff_id: 'Staff not found or inactive',
        });
      }
    }

    // Update staff
    await dailyOperationsRepository.updateResponsibleStaff(id, staffId, connection);

    return dailyOperationsRepository.findByIdWithRelations(id, connection);
  });
}

async function updateWorkNote(id, note) {
  return withTransaction(async (connection) => {
    const operation = await dailyOperationsRepository.findById(id);
    if (!operation) {
      throw createNotFoundError(
        'DAILY_OPERATION_NOT_FOUND',
        'Daily operation not found'
      );
    }

    // Validate note - allow empty/null
    let normalizedNote = null;
    if (note && typeof note === 'string') {
      normalizedNote = note.trim();
      if (normalizedNote.length > 1000) {
        throw createValidationError({
          work_note: 'Work note cannot exceed 1000 characters',
        });
      }
      if (normalizedNote.length === 0) {
        normalizedNote = null;
      }
    }

    // Update note
    await dailyOperationsRepository.updateWorkNote(
      id,
      normalizedNote,
      connection
    );

    const updated = await dailyOperationsRepository.findByIdWithRelations(id, connection);
    return updated;
  });
}

async function getOrCreateDailyOperation(appointmentId, connection = null) {
  // Try to find existing
  let operation = await dailyOperationsRepository.findByAppointmentId(appointmentId);
  
  if (!operation) {
    // Create new
    const pool = connection || getPool();
    const id = await dailyOperationsRepository.create(appointmentId, connection);
    operation = await dailyOperationsRepository.findById(id);
  }
  
  return operation;
}

module.exports = {
  listTodayOperations,
  getDailyOperation,
  checkIn,
  undoCheckIn,
  startWork,
  completeWork,
  reopenWork,
  updateStaffAssignment,
  updateWorkNote,
  getOrCreateDailyOperation,
  isValidStateTransition,
};
