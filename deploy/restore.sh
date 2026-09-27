#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Pets 2.0 - Emergency Production Database Restore Script (restore.sh)
# Restores a verified gzip compressed SQL backup file into MySQL.
# Design Baseline: Decision 12 - Confirmation Prompt MUST be 'RESTORE'
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_FILE="${1:-}"

if [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: $0 <path-to-sql.gz-backup-file>"
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "[restore.sh ERROR] Backup file not found: ${BACKUP_FILE}" >&2
  exit 1
fi

echo "[restore.sh] Verifying backup gzip integrity..."
if ! gzip -t "${BACKUP_FILE}" 2>/dev/null; then
  echo "[restore.sh ERROR] Backup file gzip integrity check failed: ${BACKUP_FILE}" >&2
  exit 1
fi

# Load DB settings
ENV_FILE="${PROJECT_ROOT}/.env"
DB_HOST="localhost"
DB_PORT="3306"
DB_NAME="psop_one"
DB_USER="psop_dev_user"
DB_PASSWORD=""

if [ -f "${ENV_FILE}" ]; then
  eval "$(grep -E '^(DB_HOST|DB_PORT|DB_NAME|DB_USER|DB_PASSWORD)=' "${ENV_FILE}" | sed 's/"/\\"/g' || true)"
fi

echo "================================================================="
echo " WARNING: You are about to RESTORE the database '${DB_NAME}'"
echo " Target Host  : ${DB_HOST}"
echo " Backup File  : ${BACKUP_FILE}"
echo "================================================================="
read -rp "Type 'RESTORE' to proceed with database restoration: " CONFIRMATION

if [ "${CONFIRMATION}" != "RESTORE" ]; then
  echo "[restore.sh] Restoration cancelled by user."
  exit 0
fi

# Helper to attempt service recovery on restore error
attempt_service_recovery_and_fail() {
  local reason="$1"
  echo "=================================================================" >&2
  echo "[restore.sh ERROR] ${reason}" >&2
  echo "[restore.sh] Attempting emergency application service recovery..." >&2
  
  sudo systemctl start pets-backend.service || true
  sudo systemctl start pets-frontend.service || true

  echo "[restore.sh] Running emergency health check..." >&2
  curl -sf http://127.0.0.1:3001/api/health >/dev/null || true
  curl -sf http://127.0.0.1:3000/ >/dev/null || true
  curl -sf http://127.0.0.1/ >/dev/null || true

  echo "=================================================================" >&2
  echo "[restore.sh FAIL] Restoration FAILED. Original restore failure preserved." >&2
  echo "=================================================================" >&2
  exit 1
}

echo "[restore.sh] Restoring database '${DB_NAME}'..."
export MYSQL_PWD="${DB_PASSWORD}"

if ! zcat "${BACKUP_FILE}" | mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" "${DB_NAME}"; then
  unset MYSQL_PWD
  attempt_service_recovery_and_fail "Database SQL restoration command failed!"
fi

# Post-Restore Verifications (Decision / Section 3)
echo "[restore.sh] Running Post-Restore Database Verification..."

# 1. Target DB exists
if ! mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -e "USE ${DB_NAME};" >/dev/null 2>&1; then
  unset MYSQL_PWD
  attempt_service_recovery_and_fail "Post-restore check failed: Target database '${DB_NAME}' does not exist!"
fi

# 2. Table count normal (derived from project migration files)
EXPECTED_TABLE_COUNT="$(grep -i -h "CREATE TABLE" "${PROJECT_ROOT}/database/migrations"/*.sql 2>/dev/null | wc -l | tr -d ' ')"
EXPECTED_MIGRATION_COUNT="$(ls -1 "${PROJECT_ROOT}/database/migrations"/*.sql 2>/dev/null | wc -l | tr -d ' ')"

TABLE_COUNT="$(mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -D "${DB_NAME}" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}';" 2>/dev/null || echo 0)"
if [ "${TABLE_COUNT}" -lt "${EXPECTED_TABLE_COUNT}" ]; then
  unset MYSQL_PWD
  attempt_service_recovery_and_fail "Post-restore check failed: Table count is abnormal (${TABLE_COUNT} tables found, expected ${EXPECTED_TABLE_COUNT})!"
fi

# 3. Migration state readable
MIGRATION_COUNT="$(mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -D "${DB_NAME}" -N -e "SELECT COUNT(*) FROM schema_migrations;" 2>/dev/null || echo 0)"
if [ "${MIGRATION_COUNT}" -lt "${EXPECTED_MIGRATION_COUNT}" ]; then
  unset MYSQL_PWD
  attempt_service_recovery_and_fail "Post-restore check failed: schema_migrations count is abnormal (${MIGRATION_COUNT} recorded, expected ${EXPECTED_MIGRATION_COUNT})!"
fi

# 4. Basic operational data readable (staff table or shop_settings)
STAFF_COUNT="$(mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -D "${DB_NAME}" -N -e "SELECT COUNT(*) FROM staff;" 2>/dev/null || echo 0)"
if [ "${STAFF_COUNT}" -le 0 ]; then
  unset MYSQL_PWD
  attempt_service_recovery_and_fail "Post-restore check failed: staff operational data is missing or empty!"
fi

unset MYSQL_PWD
echo "[restore.sh SUCCESS] Database '${DB_NAME}' restored and verified successfully."
echo " - Tables verified     : ${TABLE_COUNT}"
echo " - Migrations recorded : ${MIGRATION_COUNT}"
echo " - Staff accounts      : ${STAFF_COUNT}"
