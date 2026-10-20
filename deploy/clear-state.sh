#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Pets 2.0 - Emergency State Recovery Script (clear-state.sh)
# Resets stuck RUNNING or FAILED deployment state files safely.
# Requires explicit human confirmation ('CLEAR_STATE').
# ==============================================================================

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${DEPLOY_DIR}/.." && pwd)"
source "${DEPLOY_DIR}/lib/install-paths.sh"
STATE_DIR="${STATE_DIR:-/home/zhe/pets-deploy-state}"
if ! validate_state_path "${PROJECT_ROOT}" "${STATE_DIR}"; then
  exit 1
fi
STATE_FILE="${STATE_DIR}/deployment.state"
LOCK_FILE="${STATE_DIR}/deployment.lock"

ensure_private_owned_directory "${STATE_DIR}"
exec 200>"${LOCK_FILE}"
if ! command -v flock >/dev/null 2>&1; then
  echo "[clear-state.sh ERROR] flock is required for safe state locking." >&2
  exit 1
fi
if ! flock -n 200; then
  echo "[clear-state.sh ERROR] Another deployment process currently holds the lock." >&2
  exit 1
fi

if [ -f "${STATE_FILE}" ]; then
  if [ -L "${STATE_FILE}" ]; then
    echo "[clear-state.sh ERROR] Refusing to clear a symbolic-link deployment state file." >&2
    exit 1
  fi
  CURRENT_STATUS=""
  STATUS_COUNT=0
  while IFS= read -r STATE_LINE || [ -n "${STATE_LINE}" ]; do
    case "${STATE_LINE}" in
      status=*)
        STATUS_COUNT=$((STATUS_COUNT + 1))
        CURRENT_STATUS="${STATE_LINE#status=}"
        ;;
    esac
  done < "${STATE_FILE}"
  if [ "${STATUS_COUNT}" -ne 1 ] || [[ ! "${CURRENT_STATUS}" =~ ^(RUNNING|FAILED|DEPLOYED|SUCCESS)$ ]]; then
    echo "[clear-state.sh ERROR] Deployment state status is missing, duplicated, or invalid; refusing to clear it." >&2
    exit 1
  fi
  echo "Current deployment status: ${CURRENT_STATUS}"

  if [ "${CURRENT_STATUS}" != "FAILED" ] && [ "${CURRENT_STATUS}" != "RUNNING" ]; then
    echo "[clear-state.sh ERROR] Refusing to clear valid normal state '${CURRENT_STATUS}'." >&2
    echo "clear-state.sh is restricted to abnormal states (FAILED or RUNNING)." >&2
    exit 1
  fi
else
  echo "[clear-state.sh] No deployment.state file found."
  exit 0
fi

read -rp "Type 'CLEAR' or 'CLEAR_STATE' to reset deployment state: " CONFIRMATION
if [ "${CONFIRMATION}" != "CLEAR" ] && [ "${CONFIRMATION}" != "CLEAR_STATE" ]; then
  echo "[clear-state.sh] State reset cancelled by user."
  exit 0
fi

# Remove deployment.state so next deploy.sh can start fresh
rm -f "${STATE_FILE}" "${STATE_FILE}.tmp"

echo "[clear-state.sh SUCCESS] Deployment state file cleared. A new deployment can now be started."
