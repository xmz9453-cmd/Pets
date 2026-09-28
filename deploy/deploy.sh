#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Pets 2.0 - Production Automated Deployment Entry Point (deploy.sh)
# Design Baseline: Production Deployment Automation Design Freeze v1.0
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="${STATE_DIR:-/home/zhe/pets-deploy-state}"
STATE_FILE="${STATE_DIR}/deployment.state"
LOCK_FILE="${STATE_DIR}/deployment.lock"
LOG_DIR="${STATE_DIR}/logs"
TIMESTAMP="$(date +'%Y%m%d-%H%M%S')"
ISO_TIMESTAMP="$(date +'%Y-%m-%dT%H:%M:%S+08:00')"
LOG_FILE="${LOG_DIR}/deploy-${TIMESTAMP}.log"

# Read actual DB_PASSWORD from .env without echoing or dumping .env
KNOWN_SECRET=""
if [ -f "${PROJECT_ROOT}/.env" ]; then
  KNOWN_SECRET="$(grep -E '^DB_PASSWORD=' "${PROJECT_ROOT}/.env" | cut -d'=' -f2- | tr -d '"\r\n' || true)"
fi

# Secret masking using actual secret values from .env + key pattern matching
mask_secrets() {
  if [ -n "${KNOWN_SECRET:-}" ] && [ "${#KNOWN_SECRET}" -ge 4 ]; then
    sed -E "s/$(printf '%s' "${KNOWN_SECRET}" | sed 's/[[\.*^$]/\\&/g')/**********/g" | sed -E 's/(DB_PASSWORD|PASSWORD|SECRET|TOKEN|authorization)=[^ &]*/\1=**********/gi'
  else
    sed -E 's/(DB_PASSWORD|PASSWORD|SECRET|TOKEN|authorization)=[^ &]*/\1=**********/gi'
  fi
}

mkdir -p "${STATE_DIR}" "${LOG_DIR}"
chmod 700 "${STATE_DIR}" "${LOG_DIR}"

# 1. Acquire Deployment Lock
exec 200>"${LOCK_FILE}"
if command -v flock >/dev/null 2>&1; then
  if ! flock -n 200; then
    echo "[deploy.sh ERROR] Another deployment process is currently running or holds the lock." >&2
    exit 1
  fi
fi

# Secret-masked logging setup (Decision 45: do not dump .env, mask known secrets)
exec > >(mask_secrets | tee -a "${LOG_FILE}") 2>&1

echo "================================================================="
echo " Pets 2.0 Production Deployment Started at ${ISO_TIMESTAMP}"
echo " Log File: ${LOG_FILE}"
echo "================================================================="

# Helper for atomic state file update
write_state() {
  local p_status="$1"
  local p_commit="$2"
  local p_prev_commit="$3"
  local p_backup="$4"
  local p_verification="$5"
  local p_log_file="$6"

  cat <<EOF > "${STATE_FILE}.tmp"
status=${p_status}
commit=${p_commit}
previous_commit=${p_prev_commit}
timestamp=${ISO_TIMESTAMP}
backup=${p_backup}
verification=${p_verification}
log_file=${p_log_file}
EOF
  mv "${STATE_FILE}.tmp" "${STATE_FILE}"
  chmod 600 "${STATE_FILE}"
}

# 2. Read and Validate Existing Deployment State
PREV_COMMIT="NONE"
PREV_BACKUP="NONE"

if [ -f "${STATE_FILE}" ]; then
  eval "$(grep -E '^(status|commit|previous_commit|backup|verification)=' "${STATE_FILE}" || true)"
  EXISTING_STATUS="${status:-}"

  if [ "${EXISTING_STATUS}" = "RUNNING" ]; then
    echo "[deploy.sh ERROR] Deployment State is RUNNING. Previous deployment did not exit cleanly." >&2
    echo "Run deploy/clear-state.sh after manual investigation before starting a new deployment." >&2
    exit 1
  elif [ "${EXISTING_STATUS}" = "FAILED" ]; then
    echo "[deploy.sh ERROR] Deployment State is FAILED. Previous failure must be investigated." >&2
    echo "Run deploy/clear-state.sh after manual recovery before starting a new deployment." >&2
    exit 1
  elif [ "${EXISTING_STATUS}" = "DEPLOYED" ]; then
    echo "[deploy.sh ERROR] Deployment State is DEPLOYED (verification pending)." >&2
    echo "Run deploy/confirm.sh to certify the existing deployment before starting a new one." >&2
    exit 1
  fi
  PREV_COMMIT="${commit:-NONE}"
  PREV_BACKUP="${backup:-NONE}"
fi

# 3. Transition State to RUNNING
write_state "RUNNING" "pending" "${PREV_COMMIT}" "pending" "pending" "${LOG_FILE}"

cleanup_on_failure() {
  local exit_code=$?
  if [ "${exit_code}" -ne 0 ]; then
    echo "=================================================================" >&2
    echo " [deploy.sh FAIL] Deployment aborted at stage due to an error." >&2
    echo "=================================================================" >&2
    write_state "FAILED" "${TARGET_SHA:-NONE}" "${PREV_COMMIT}" "${BACKUP_FILE_PATH:-NONE}" "failed" "${LOG_FILE}"
  fi
}
trap cleanup_on_failure EXIT

# 4. Check Working Tree CLEAN
echo "[Step 1/11] Checking Git Working Tree status..."
cd "${PROJECT_ROOT}"
if [ -n "$(git status --porcelain)" ]; then
  echo "[deploy.sh ERROR] Git Working Tree is NOT clean. Aborting deployment." >&2
  exit 1
fi
echo "[Step 1/11 PASS] Working Tree is clean."

# 5. Git Fetch & Fast-Forward Update
echo "[Step 2/11] Fetching latest changes from origin/master..."
git fetch origin master
if ! git merge --ff-only origin/master; then
  echo "[deploy.sh ERROR] Git Fast-Forward update failed. Local branch has diverged." >&2
  exit 1
fi
echo "[Step 2/11 PASS] Git repository updated."

# 6. Fix TARGET_SHA & Consistency Check Helper
TARGET_SHA="$(git rev-parse HEAD)"
echo "[Step 3/11] Fixed TARGET_SHA: ${TARGET_SHA}"

check_target_sha() {
  local current_sha
  current_sha="$(git rev-parse HEAD)"
  if [ "${current_sha}" != "${TARGET_SHA}" ]; then
    echo "[deploy.sh ERROR] TARGET_SHA mismatch! Expected ${TARGET_SHA}, got ${current_sha}" >&2
    exit 1
  fi
}
check_target_sha
write_state "RUNNING" "${TARGET_SHA}" "${PREV_COMMIT}" "pending" "pending" "${LOG_FILE}"
echo "[Step 3/11 PASS] TARGET_SHA consistency verified."

# 7. Backend npm ci
echo "[Step 4/11] Installing Backend dependencies (npm ci)..."
(cd "${PROJECT_ROOT}/backend" && npm ci)
check_target_sha
echo "[Step 4/11 PASS] Backend dependencies installed."

# 8. Frontend npm ci
echo "[Step 5/11] Installing Frontend dependencies (npm ci)..."
(cd "${PROJECT_ROOT}/frontend" && npm ci)
check_target_sha
echo "[Step 5/11 PASS] Frontend dependencies installed."

# 9. Frontend Build
echo "[Step 6/11] Building Frontend (next build)..."
(cd "${PROJECT_ROOT}/frontend" && npm run build)
check_target_sha
echo "[Step 6/11 PASS] Frontend build completed."

# 10. Database Backup
echo "[Step 7/11] Executing Production Database Backup..."
BACKUP_OUTPUT="$("${PROJECT_ROOT}/deploy/backup.sh")"
echo "${BACKUP_OUTPUT}"
BACKUP_FILE_PATH="$(echo "${BACKUP_OUTPUT}" | grep -E '^BACKUP_FILE=' | cut -d'=' -f2-)"

if [ -z "${BACKUP_FILE_PATH}" ] || [ ! -f "${BACKUP_FILE_PATH}" ]; then
  echo "[deploy.sh ERROR] Database backup failed or backup file missing." >&2
  exit 1
fi
check_target_sha
write_state "RUNNING" "${TARGET_SHA}" "${PREV_COMMIT}" "${BACKUP_FILE_PATH}" "pending" "${LOG_FILE}"
echo "[Step 7/11 PASS] Database Backup completed: ${BACKUP_FILE_PATH}"

# 11. Pending Migrations (with Safety Guard)
echo "[Step 8/11] Running Database Pending Migrations..."
(cd "${PROJECT_ROOT}" && node database/scripts/migrate.js)
check_target_sha
echo "[Step 8/11 PASS] Database Migrations executed successfully."

# 12. Service Restart
echo "[Step 9/11] Restarting Application Services (pets-backend & pets-frontend)..."
sudo systemctl restart pets-backend.service
sudo systemctl restart pets-frontend.service
echo "[Step 9/11 PASS] Services restarted."

# 13. Technical Health Check (Decision / Section 22: all 5 health checks)
echo "[Step 10/11] Performing Technical Health Check..."

echo " 1/5 Checking pets-backend.service status..."
if ! systemctl is-active --quiet pets-backend.service; then
  echo "[deploy.sh ERROR] pets-backend.service is not active!" >&2
  exit 1
fi

echo " 2/5 Checking Backend HTTP Health Endpoint (/api/health & /api/health/database)..."
if ! curl -sf http://127.0.0.1:3001/api/health >/dev/null; then
  echo "[deploy.sh ERROR] Backend HTTP /api/health check failed!" >&2
  exit 1
fi
if ! curl -sf http://127.0.0.1:3001/api/health/database >/dev/null; then
  echo "[deploy.sh ERROR] Backend Database HTTP /api/health/database check failed!" >&2
  exit 1
fi

echo " 3/5 Checking pets-frontend.service status..."
if ! systemctl is-active --quiet pets-frontend.service; then
  echo "[deploy.sh ERROR] pets-frontend.service is not active!" >&2
  exit 1
fi

echo " 4/5 Checking Frontend HTTP Response (http://127.0.0.1:3000/)..."
if ! curl -sf http://127.0.0.1:3000/ >/dev/null; then
  echo "[deploy.sh ERROR] Frontend direct HTTP check (http://127.0.0.1:3000/) failed!" >&2
  exit 1
fi

echo " 5/5 Checking Nginx Reverse Proxy HTTP Endpoint (http://127.0.0.1/)..."
if ! curl -sf http://127.0.0.1/ >/dev/null; then
  echo "[deploy.sh ERROR] Nginx Reverse Proxy HTTP check (http://127.0.0.1/) failed!" >&2
  exit 1
fi

check_target_sha
echo "[Step 10/11 PASS] All Technical Health Checks PASSED."

# 14. Mark DEPLOYED (verification pending)
trap - EXIT
write_state "DEPLOYED" "${TARGET_SHA}" "${PREV_COMMIT}" "${BACKUP_FILE_PATH}" "pending" "${LOG_FILE}"

echo "================================================================="
echo " [deploy.sh SUCCESS] Deployment Completed Successfully!"
echo " Status             : DEPLOYED"
echo " Target Commit      : ${TARGET_SHA}"
echo " Verification State : pending"
echo " Backup File        : ${BACKUP_FILE_PATH}"
echo " Log File           : ${LOG_FILE}"
echo "================================================================="
echo " NEXT ACTION REQUIRED (HUMAN OPERATOR):"
echo " 1. Perform Browser Production Verification on http://175.183.34.91/"
echo " 2. Run 'deploy/confirm.sh' and type 'CONFIRM' to certify deployment."
echo "================================================================="
