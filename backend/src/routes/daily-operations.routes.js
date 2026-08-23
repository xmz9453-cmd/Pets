const express = require('express');
const dailyOperationsController = require('../controllers/daily-operations.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorize');

const router = express.Router();

// List operations (GET /api/operations)
router.get(
  '/operations',
  requireAuthentication,
  requireRole(['OWNER', 'FRONT_DESK', 'GROOMER']),
  dailyOperationsController.listOperations
);

// Get single operation (GET /api/operations/:id)
router.get(
  '/operations/:id',
  requireAuthentication,
  requireRole(['OWNER', 'FRONT_DESK', 'GROOMER']),
  dailyOperationsController.getOperation
);

// Check-in (POST /api/operations/:id/check-in)
router.post(
  '/operations/:id/check-in',
  requireAuthentication,
  requireRole(['OWNER', 'FRONT_DESK']),
  dailyOperationsController.checkIn
);

// Undo check-in (POST /api/operations/:id/undo-check-in)
router.post(
  '/operations/:id/undo-check-in',
  requireAuthentication,
  requireRole(['OWNER', 'FRONT_DESK']),
  dailyOperationsController.undoCheckIn
);

// Start work (POST /api/operations/:id/start-work)
router.post(
  '/operations/:id/start-work',
  requireAuthentication,
  requireRole(['OWNER', 'GROOMER']),
  dailyOperationsController.startWork
);

// Complete work (POST /api/operations/:id/complete-work)
router.post(
  '/operations/:id/complete-work',
  requireAuthentication,
  requireRole(['OWNER', 'GROOMER']),
  dailyOperationsController.completeWork
);

// Reopen work (POST /api/operations/:id/reopen-work)
router.post(
  '/operations/:id/reopen-work',
  requireAuthentication,
  requireRole(['OWNER', 'GROOMER']),
  dailyOperationsController.reopenWork
);

// Update staff assignment (PUT /api/operations/:id/staff-assignment)
router.put(
  '/operations/:id/staff-assignment',
  requireAuthentication,
  requireRole(['OWNER']),
  dailyOperationsController.updateStaffAssignment
);

// Update work note (PUT /api/operations/:id/work-note)
router.put(
  '/operations/:id/work-note',
  requireAuthentication,
  requireRole(['OWNER', 'FRONT_DESK', 'GROOMER']),
  dailyOperationsController.updateWorkNote
);

module.exports = router;
