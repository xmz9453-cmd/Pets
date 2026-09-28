#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Pets 2.0 - Production Database Backup Script (backup.sh)
# Creates gzip compressed mysqldump backups and verifies integrity.
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/home/zhe/pets-backups}"
TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

# Read database settings from .env if present
ENV_FILE="${PROJECT_ROOT}/.env"
DB_HOST="localhost"
DB_PORT="3306"
DB_NAME="psop_one"
DB_USER="psop_dev_user"
DB_PASSWORD=""

if [ -f "${ENV_FILE}" ]; then
  # Load env variables safely without exporting arbitrary code
  eval "$(grep -E '^(DB_HOST|DB_PORT|DB_NAME|DB_USER|DB_PASSWORD)=' "${ENV_FILE}" | sed 's/"/\\"/g')"
fi

BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "[backup.sh] Starting database backup for DB: '${DB_NAME}'..."

# Configure MySQL password via environment variable to avoid CLI exposure
export MYSQL_PWD="${DB_PASSWORD}"

# Perform mysqldump with safe defaults
if ! mysqldump -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" --single-transaction --quick --lock-tables=false "${DB_NAME}" | gzip -9 > "${BACKUP_FILE}"; then
  echo "[backup.sh ERROR] mysqldump failed." >&2
  rm -f "${BACKUP_FILE}"
  unset MYSQL_PWD
  exit 1
fi

unset MYSQL_PWD
chmod 600 "${BACKUP_FILE}"

# Verification 1: File exists
if [ ! -f "${BACKUP_FILE}" ]; then
  echo "[backup.sh ERROR] Backup file was not created: ${BACKUP_FILE}" >&2
  exit 1
fi

# Verification 2: File is non-empty
FILE_SIZE="$(wc -c < "${BACKUP_FILE}" | tr -d ' ')"
if [ "${FILE_SIZE}" -le 0 ]; then
  echo "[backup.sh ERROR] Backup file is empty (0 bytes): ${BACKUP_FILE}" >&2
  rm -f "${BACKUP_FILE}"
  exit 1
fi

# Verification 3: Gzip integrity check
if ! gzip -t "${BACKUP_FILE}" 2>/dev/null; then
  echo "[backup.sh ERROR] Backup file gzip integrity check failed: ${BACKUP_FILE}" >&2
  rm -f "${BACKUP_FILE}"
  exit 1
fi

echo "[backup.sh SUCCESS] Backup created and verified: ${BACKUP_FILE} (${FILE_SIZE} bytes)"

# Retention: Delete backups older than 30 days (Warning only if fails)
echo "[backup.sh] Cleaning up backups older than 30 days..."
if ! find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +30 -delete 2>/dev/null; then
  echo "[backup.sh WARNING] Retention cleanup encountered non-fatal error." >&2
fi

echo "BACKUP_FILE=${BACKUP_FILE}"
