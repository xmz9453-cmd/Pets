#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Pets 2.0 - Production Verification Confirmation Script (confirm.sh)
# Transition state from DEPLOYED (verification=pending) -> SUCCESS (verification=PASS).
# Requires explicit human typing of 'CONFIRM'.
# ==============================================================================

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${DEPLOY_DIR}/.." && pwd)"
source "${DEPLOY_DIR}/lib/state.sh"
source "${DEPLOY_DIR}/lib/install-paths.sh"
STATE_DIR="${STATE_DIR:-/home/zhe/pets-deploy-state}"
if ! validate_state_path "${PROJECT_ROOT}" "${STATE_DIR}"; then
  exit 1
fi
STATE_FILE="${STATE_DIR}/deployment.state"
LOCK_FILE="${STATE_DIR}/deployment.lock"
LOG_DIR="${STATE_DIR}/logs"

ensure_private_owned_directory "${STATE_DIR}"
ensure_private_owned_directory "${LOG_DIR}"
exec 200>"${LOCK_FILE}"
if ! command -v flock >/dev/null 2>&1; then
  echo "[confirm.sh ERROR] flock is required for safe state locking." >&2
  exit 1
fi
if ! flock -n 200; then
  echo "[confirm.sh ERROR] Another deployment process currently holds the lock." >&2
  exit 1
fi

if [ ! -f "${STATE_FILE}" ]; then
  echo "[confirm.sh ERROR] deployment.state file not found." >&2
  exit 1
fi

if ! read_deployment_state "${STATE_FILE}"; then
  echo "[confirm.sh ERROR] Deployment state is malformed or unsafe; refusing confirmation." >&2
  exit 1
fi
CURRENT_STATUS="${DEPLOY_STATE[status]}"
CURRENT_VERIFICATION="${DEPLOY_STATE[verification]}"
CURRENT_COMMIT="${DEPLOY_STATE[commit]}"
CURRENT_PREV_COMMIT="${DEPLOY_STATE[previous_commit]}"
CURRENT_TIMESTAMP="${DEPLOY_STATE[timestamp]}"
CURRENT_BACKUP="${DEPLOY_STATE[backup]}"
CURRENT_LOG_FILE="${DEPLOY_STATE[log_file]}"

if [ "${CURRENT_STATUS}" != "DEPLOYED" ] || [ "${CURRENT_VERIFICATION}" != "pending" ]; then
  echo "[confirm.sh ERROR] Invalid state for verification confirmation." >&2
  echo "Expected  : status=DEPLOYED, verification=pending" >&2
  echo "Current   : status=${CURRENT_STATUS}, verification=${CURRENT_VERIFICATION}" >&2
  exit 1
fi

echo "================================================================="
echo " PRODUCTION VERIFICATION CONFIRMATION"
echo "-----------------------------------------------------------------"
echo " Status             : ${CURRENT_STATUS}"
echo " Verification State : ${CURRENT_VERIFICATION}"
echo " Target Commit      : ${CURRENT_COMMIT}"
echo " Previous Commit    : ${CURRENT_PREV_COMMIT}"
echo " Deployed At        : ${CURRENT_TIMESTAMP}"
echo " Backup File        : ${CURRENT_BACKUP}"
echo " Log File           : ${CURRENT_LOG_FILE}"
echo "================================================================="

read -rp "Type 'CONFIRM' to certify Production Verification PASS: " CONFIRMATION

if [ "${CONFIRMATION}" != "CONFIRM" ]; then
  echo "[confirm.sh] Confirmation cancelled by user."
  exit 0
fi

VERIFIED_AT="$(TZ=Asia/Taipei date +'%Y-%m-%dT%H:%M:%S%:z')"

# Atomic state update to SUCCESS & PASS
cat <<EOF > "${STATE_FILE}.tmp"
status=SUCCESS
commit=${CURRENT_COMMIT}
previous_commit=${CURRENT_PREV_COMMIT}
timestamp=${CURRENT_TIMESTAMP}
backup=${CURRENT_BACKUP}
verification=PASS
verified_at=${VERIFIED_AT}
log_file=${CURRENT_LOG_FILE}
EOF

mv "${STATE_FILE}.tmp" "${STATE_FILE}"
chmod 600 "${STATE_FILE}"

# Append verification record block to current deployment log if log file exists
if [ -n "${CURRENT_LOG_FILE}" ] && [ -f "${CURRENT_LOG_FILE}" ]; then
  cat <<EOF >> "${CURRENT_LOG_FILE}"

===== PRODUCTION VERIFICATION =====
user=zhe
verified_at=${VERIFIED_AT}
verification=PASS
result=SUCCESS
===================================
EOF
fi

echo "================================================================="
echo " [confirm.sh SUCCESS] Deployment verification marked as PASS."
echo " Status updated to: SUCCESS (verification=PASS)"
echo "================================================================="
