# Pets 2.0 — Production Deployment & Operations Manual (DEPLOYMENT.md)

---

## 1. Overview & Baseline Architecture

This document provides standard operating procedures (SOP) for **Pets 2.0 Production Deployment Automation**.

### Key Infrastructure Baseline
- **OS**: Ubuntu 24.04.5 LTS
- **User**: `zhe` (`/home/zhe/pets`)
- **Runtime**: Node.js `v24.21.0`, npm `11.19.0`, MySQL `8.0.46`, Nginx `1.24.0`
- **Git Repository**: `https://github.com/xmz9453-cmd/Pets.git` (`master` branch)
- **Database Target**: `psop_one` (MySQL)
- **Application Services**:
  - Backend: `pets-backend.service` (`http://127.0.0.1:3001`)
  - Frontend: `pets-frontend.service` (`http://127.0.0.1:3000`)
  - Reverse Proxy: Nginx (`http://175.183.34.91/` -> `/api/` to `:3001`, `/` to `:3000`)

---

## 2. Directory Layout & State Model

### Directory Structure
- **Backup Directory**: `/home/zhe/pets-backups/` (`chmod 700`)
- **Deployment State Directory**: `/home/zhe/pets-deploy-state/` (`chmod 700`)
- **State File**: `/home/zhe/pets-deploy-state/deployment.state` (`chmod 600`)
- **Lock File**: `/home/zhe/pets-deploy-state/deployment.lock`
- **Logs**: `/home/zhe/pets-deploy-state/logs/deploy-YYYYMMDD-HHMMSS.log`

### Formal State Transition Flow (Decision 20)
```
[Uninitialized / SUCCESS]
      │
      ▼  (run deploy/deploy.sh)
  [RUNNING]
      │
      ├── (Failure / Abort) ──────────────► [FAILED] (Requires manual investigation & clear-state.sh)
      │
      ▼  (All 5 Technical Health Checks PASS)
  [DEPLOYED] (verification=pending)
      │
      ▼  (Human performs browser check & runs deploy/confirm.sh)
  [SUCCESS] (verification=PASS)
```

---

## 3. Environment Installation (First Time Setup)

Run the installer script to initialize required directories and permissions:

```bash
cd /home/zhe/pets
bash deploy/install.sh
```

---

## 4. Standard Routine Deployment SOP

### Step 1: Execute Automated Deployment

```bash
cd /home/zhe/pets
bash deploy/deploy.sh
```

**Automated Tasks Performed by `deploy.sh`**:
1. Acquires lock (`deployment.lock`).
2. Validates state (`deployment.state`).
3. Confirms Git Working Tree is CLEAN.
4. Executes `git fetch origin master` & Fast-forward merge (`git merge --ff-only`).
5. Fixes and verifies `TARGET_SHA` consistency.
6. Installs Backend dependencies (`npm ci`).
7. Installs Frontend dependencies (`npm ci`).
8. Builds Frontend production bundle (`npm run build`).
9. Creates verified Database Backup (`deploy/backup.sh`).
10. Runs pending Database Migrations with Safety Guard (`node database/scripts/migrate.js`).
11. Restarts Application Services (`pets-backend.service` & `pets-frontend.service`).
12. Runs 5 Technical Health Checks:
    - `pets-backend.service` active
    - Backend HTTP `/api/health` & `/api/health/database` PASS
    - `pets-frontend.service` active
    - Frontend direct HTTP `http://127.0.0.1:3000/` PASS
    - Nginx Reverse Proxy HTTP `http://127.0.0.1/` PASS
13. Transitions state to `status=DEPLOYED`, `verification=pending`.

---

### Step 2: Human Production Verification

Open a web browser on external client network:
- Visit: `http://175.183.34.91/`
- Verify Login page renders correctly.
- Perform test login and check key operation flows (Customers, Pets, Appointments, Operations).

---

### Step 3: Confirm Deployment Success

Once browser verification is complete, execute:

```bash
cd /home/zhe/pets
bash deploy/confirm.sh
```

When prompted, type `CONFIRM` to mark deployment as `SUCCESS` (`verification=PASS`).

---

## 5. Maintenance & Emergency Manual Operations

### Manual Database Backup
To create a standalone database backup:

```bash
bash deploy/backup.sh
```

### Emergency Database Restoration (Decision 12)
To restore a specific backup file into the production database:

```bash
bash deploy/restore.sh /home/zhe/pets-backups/psop_one_YYYYMMDD_HHMMSS.sql.gz
```
*Requires operator to explicitly type `RESTORE` to execute.*

### Clearing Failed / Stuck State
If a deployment fails or exits unexpectedly (`status=FAILED` or `status=RUNNING`):

1. Investigate the failure log in `/home/zhe/pets-deploy-state/logs/`.
2. Perform necessary manual fixes.
3. Reset state file:

```bash
bash deploy/clear-state.sh
```
*Requires typing `CLEAR_STATE` to execute.*

---

## 6. Safety & Security Rules

1. **No Automatic Rollback**: In case of deployment or migration failures, automatic git rollback or automatic DB restore is strictly prohibited to prevent data corruption.
2. **Secret Masking (Decision 45)**: Known database secrets from `.env` and sensitive patterns in logs are masked dynamically. `.env` files are never dumped into logs.
3. **Migration Protection**: `migrate.js` enforces a strict Production Safety Guard validating DB Host, DB Name, and Environment on every execution.
