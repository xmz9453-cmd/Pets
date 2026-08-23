const dailyOperationsService = require('../services/daily-operations.service');

function sendSuccess(res, payload, statusCode = 200) {
  res.status(statusCode).json({
    success: true,
    data: payload,
  });
}

async function listOperations(req, res, next) {
  try {
    const result = await dailyOperationsService.listTodayOperations(req.query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function getOperation(req, res, next) {
  try {
    const result = await dailyOperationsService.getDailyOperation(req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function checkIn(req, res, next) {
  try {
    const result = await dailyOperationsService.checkIn(req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function undoCheckIn(req, res, next) {
  try {
    const result = await dailyOperationsService.undoCheckIn(req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function startWork(req, res, next) {
  try {
    const result = await dailyOperationsService.startWork(req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function completeWork(req, res, next) {
  try {
    const result = await dailyOperationsService.completeWork(req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function reopenWork(req, res, next) {
  try {
    const result = await dailyOperationsService.reopenWork(req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function updateStaffAssignment(req, res, next) {
  try {
    const result = await dailyOperationsService.updateStaffAssignment(
      req.params.id,
      req.body.responsible_staff_id || null,
      req.auth.staff
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function updateWorkNote(req, res, next) {
  try {
    const result = await dailyOperationsService.updateWorkNote(
      req.params.id,
      req.body.work_note
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listOperations,
  getOperation,
  checkIn,
  undoCheckIn,
  startWork,
  completeWork,
  reopenWork,
  updateStaffAssignment,
  updateWorkNote,
};
