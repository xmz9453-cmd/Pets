# TASK-0009 Implementation Plan

## Phase Overview
Implementing Daily Operations block with state machine, check-in, time tracking, staff assignment, and work notes.

---

## 1. Database Implementation

### 1.1 New Table: daily_operations
```sql
CREATE TABLE daily_operations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT NOT NULL,
  status ENUM('SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED') DEFAULT 'SCHEDULED',
  check_in_time TIMESTAMP NULL,
  started_time TIMESTAMP NULL,
  completed_time TIMESTAMP NULL,
  responsible_staff_id INT NULL,
  work_note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_daily_operations_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_daily_operations_staff FOREIGN KEY (responsible_staff_id) REFERENCES staff(id) ON DELETE SET NULL,
  UNIQUE KEY uq_daily_operations_appointment (appointment_id),
  INDEX idx_daily_operations_status (status),
  INDEX idx_daily_operations_created_at (created_at)
);
```

### 1.2 Migration File
File: `database/migrations/008_create_daily_operations.sql`
- Create daily_operations table
- Add indexes for date-based queries
- Ensure referential integrity

---

## 2. Backend Implementation

### 2.1 Data Layer (Repository)
File: `backend/src/data/daily-operations.repository.js`
- `findByAppointmentId(appointmentId)`
- `findByIdWithRelations(id)`
- `listTodayOperations(filters, search)`
- `create(appointmentId, staffId)`
- `updateStatus(id, newStatus)`
- `updateCheckInTime(id)`
- `updateStartedTime(id)`
- `updateCompletedTime(id)`
- `updateResponsibleStaff(id, staffId)`
- `updateWorkNote(id, note)`

### 2.2 Service Layer
File: `backend/src/services/daily-operations.service.js`
- State validation (allowed transitions)
- Check-in validation & logic
- Undo check-in logic
- Start work logic
- Complete work logic
- Reopen work logic
- Staff assignment with authorization check
- Work note update
- Query building for filters/search

### 2.3 Controller Layer
File: `backend/src/controllers/daily-operations.controller.js`
- `listOperations` - GET with filters
- `getOperation` - GET by id
- `checkIn` - POST state transition
- `undoCheckIn` - POST state transition
- `startWork` - POST state transition
- `completeWork` - POST state transition
- `reopenWork` - POST state transition
- `updateStaffAssignment` - PUT
- `updateWorkNote` - PUT

### 2.4 Routes
File: `backend/src/routes/daily-operations.routes.js`
- GET `/operations` - List today's operations
- GET `/operations/:id` - Get single operation
- POST `/operations/:id/check-in` - Check-in
- POST `/operations/:id/undo-check-in` - Undo check-in
- POST `/operations/:id/start-work` - Start work
- POST `/operations/:id/complete-work` - Complete work
- POST `/operations/:id/reopen-work` - Reopen work
- PUT `/operations/:id/staff-assignment` - Update staff
- PUT `/operations/:id/work-note` - Update work note
- All routes require authentication
- State-changing operations require specific roles

### 2.5 Integration
- Update `backend/src/app.js` to register operations routes
- Use existing auth middleware
- Follow existing error handling patterns
- Use existing validation patterns

---

## 3. Frontend Implementation

### 3.1 Operations Page
File: `frontend/pages/operations.js`
- Layout with search/filters at top
- Operations list below
- Today's date display
- Real-time state updates after actions

### 3.2 Components to Create
- OperationsList.js - Main list display
- SearchBar.js - Customer/Pet/Phone search
- FilterBar.js - Status, Service Type, Species filters
- OperationRow.js - Single operation display + action buttons
- StaffAssignmentModal.js - Staff reassignment dialog
- WorkNoteModal.js - Work note edit dialog

### 3.3 UI Features
- Search input: Customer name, Pet name, Phone
- Filter buttons: Today's All, Pending, Completed
- Dropdown filters: Service Type, Species (DOG/CAT), Status
- Status-dependent action buttons
- Click to navigate to Customer/Pet details
- Reload persistence (React state)

### 3.4 API Integration
- Fetch operations on page load
- Refetch after state changes
- Display loading/error states
- Show appropriate error messages

---

## 4. State Machine Implementation

### 4.1 Allowed Transitions (Backend Enforced)
```
SCHEDULED → CHECKED_IN
CHECKED_IN → SCHEDULED (undo check-in)
CHECKED_IN → IN_PROGRESS
IN_PROGRESS → CHECKED_IN
CHECKED_IN → COMPLETED
IN_PROGRESS → COMPLETED
COMPLETED → IN_PROGRESS (reopen)

Rejected transitions (return 400 error):
- SCHEDULED → IN_PROGRESS
- SCHEDULED → COMPLETED
- IN_PROGRESS → SCHEDULED
- COMPLETED → SCHEDULED
- COMPLETED → CHECKED_IN
- Any other combination
```

### 4.2 Time Tracking
- Check-in: system timestamp when transitioning to CHECKED_IN
- Started Time: system timestamp when transitioning to IN_PROGRESS
- Completed Time: system timestamp when transitioning to COMPLETED
- Times generated by backend (not trusted from frontend)

---

## 5. Testing Implementation

### 5.1 Test File
File: `testing/tests/daily-operations.test.js`

### 5.2 Test Coverage
1. **List Operations**
   - Get today's operations
   - Filter by status
   - Filter by service type
   - Filter by species
   - Search by customer
   - Search by pet
   - Search by phone
   - Sorting by appointment time ASC

2. **Check-in Flow**
   - Valid check-in (SCHEDULED → CHECKED_IN)
   - Check-in time recorded
   - Duplicate check-in rejected
   - Undo check-in (CHECKED_IN → SCHEDULED)
   - Invalid undo rejected

3. **State Transitions**
   - All valid transitions pass
   - All invalid transitions rejected
   - Specific tests for:
     - SCHEDULED → IN_PROGRESS (should fail)
     - SCHEDULED → COMPLETED (should fail)
     - IN_PROGRESS → SCHEDULED (should fail)
     - COMPLETED → SCHEDULED (should fail)
     - COMPLETED → CHECKED_IN (should fail)

4. **Time Tracking**
   - Check-in time correct
   - Started time correct
   - Completed time correct
   - Times consistent with state

5. **Staff Assignment**
   - Valid staff assignment
   - Invalid staff rejected
   - Reassignment works
   - Unauthorized assignment rejected

6. **Work Note**
   - Create work note
   - Update work note
   - Invalid input rejected
   - Only current note stored (no history)

7. **Data Integrity**
   - Multiple pets in appointment (one operation)
   - Multiple services in appointment (one operation)
   - Service becomes INACTIVE (existing appointment still displays)
   - Cancelled appointments not in list
   - Not checked-in appointments in list
   - Completed appointments retained in list

---

## 6. Browser Verification Plan

### 6.1 Login & Entry
- [ ] Login to system
- [ ] Navigate to /operations
- [ ] Page loads correctly
- [ ] Today's date displays

### 6.2 Today's List
- [ ] Today's appointments displayed
- [ ] Cancelled appointments excluded
- [ ] Not checked-in appointments shown
- [ ] Completed appointments retained
- [ ] Time sorting correct (ASC)

### 6.3 Check-in Workflow
- [ ] SCHEDULED operation visible
- [ ] Click check-in button
- [ ] Status changes to CHECKED_IN
- [ ] Check-in time displays
- [ ] Reload - state persists

### 6.4 Work Workflow
- [ ] CHECKED_IN operation visible
- [ ] Click start work button
- [ ] Status changes to IN_PROGRESS
- [ ] Started time displays
- [ ] Click complete button
- [ ] Status changes to COMPLETED
- [ ] Completed time displays
- [ ] Reload - state persists

### 6.5 Reversal Workflow
- [ ] CHECKED_IN → SCHEDULED (undo check-in) works
- [ ] IN_PROGRESS → CHECKED_IN works
- [ ] COMPLETED → IN_PROGRESS works

### 6.6 Staff Management
- [ ] Current staff displays
- [ ] Click reassign button
- [ ] Staff selection modal opens
- [ ] Select new staff
- [ ] Staff updates
- [ ] Reload - staff persists

### 6.7 Work Note
- [ ] Create work note
- [ ] Note displays
- [ ] Edit work note
- [ ] Updated note displays
- [ ] Reload - note persists

### 6.8 Search
- [ ] Customer search works
- [ ] Pet search works
- [ ] Phone search works
- [ ] Results filter correctly

### 6.9 Filters
- [ ] Today's All shows all
- [ ] Pending shows SCHEDULED/CHECKED_IN/IN_PROGRESS
- [ ] Completed shows COMPLETED
- [ ] Service Type filter works
- [ ] DOG filter works
- [ ] CAT filter works
- [ ] Status filter works

### 6.10 Navigation
- [ ] Customer name link goes to customer details
- [ ] Pet name link goes to pet details
- [ ] Can navigate back to operations

---

## 7. Regression Plan

Verify no breakage to existing features:
- [ ] Authentication still works
- [ ] Staff roles still work
- [ ] Customer management unaffected
- [ ] Pet management unaffected
- [ ] Service management unaffected
- [ ] Appointment management unaffected
- [ ] Shop settings unaffected
- [ ] All existing tests still pass

---

## 8. Implementation Sequence

### Phase A: Database
1. Create migration file 008
2. Test migration runs successfully
3. Verify table created with correct schema

### Phase B: Backend Data & Services
1. Create repository
2. Create service with validations & state machine
3. Create controller
4. Create routes
5. Update app.js

### Phase C: Backend Testing
1. Write tests
2. Verify all tests pass
3. Verify no regression

### Phase D: Frontend
1. Create /operations page
2. Implement search/filters
3. Implement list display
4. Implement action buttons
5. Implement modals (staff, work note)
6. Implement navigation

### Phase E: Browser Verification
1. Manual testing of all workflows
2. Verify state persistence
3. Verify error handling
4. Verify edge cases

### Phase F: Regression
1. Run all existing tests
2. Manual browser verification of existing features
3. No breaking changes

---

## 9. Key Design Decisions

1. **Appointment-Driven**: Daily Operations created from existing Appointments, not standalone
2. **One-to-One**: One Daily Operations per Appointment (even with multiple pets/services)
3. **State Machine**: Enforced on backend, only valid transitions allowed
4. **Timestamps**: Generated by backend in UTC, never trusted from frontend
5. **No History**: Only current state stored, no audit log or history
6. **Search**: Simple text search, not complex query builder
7. **Today-focused**: Default list shows today, can query other dates
8. **Authorization**: Reuse existing staff roles and auth patterns

---

## 10. Expected Files Changed/Created

### Created:
- `database/migrations/008_create_daily_operations.sql`
- `backend/src/data/daily-operations.repository.js`
- `backend/src/services/daily-operations.service.js`
- `backend/src/controllers/daily-operations.controller.js`
- `backend/src/routes/daily-operations.routes.js`
- `frontend/pages/operations.js`
- `frontend/components/OperationsList.js`
- `frontend/components/SearchBar.js`
- `frontend/components/FilterBar.js`
- `frontend/components/OperationRow.js`
- `frontend/components/StaffAssignmentModal.js`
- `frontend/components/WorkNoteModal.js`
- `testing/tests/daily-operations.test.js`

### Modified:
- `backend/src/app.js` (add operations routes)

### No Changes:
- Existing appointment/customer/pet/service/auth code

