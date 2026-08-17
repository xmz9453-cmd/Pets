# TASK-0001 Human Browser Verification Checklist

TASK ID: TASK-0001

Scenario: Foundation End-to-End Verification

Checklist:

- MySQL is running locally.
- Local `.env` and `.env.test` exist outside Git tracking.
- Backend starts on port 3001.
- Frontend starts on port 3000.
- Browser opens the frontend.
- Frontend renders the Engineering Foundation view.
- Frontend calls `GET /api/health`.
- Frontend calls `GET /api/health/database`.
- Application health shows `ok`.
- Database health shows `connected`.

Expected Result:

Foundation Flow completes successfully.
