#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Pets 2.0 - Emergency State Recovery Script (clear-state.sh)
# Resets stuck RUNNING or FAILED deployment state files safely.
# Requires explicit human confirmation ('CLEAR_STATE').
# ==============================================================================

STATE_DIR="${STATE_DIR:-/home/zhe/pets-deploy-state}"
STATE_FILE="${STATE_DIR}/deployment.state"
LOCK_FILE="${STATE_DIR}/deployment.lock"

mkdir -p "${STATE_DIR}"
exec 200>"${LOCK_FILE}"
if command -v flock >/dev/null 2>&1; then
  if ! flock -n 200; then
    echo "[clear-state.sh ERROR] Another deployment process currently holds the lock." >&2
    exit 1
  fi
fi

if [ -f "${STATE_FILE}" ]; then
  echo "Current Deployment State:"
  cat "${STATE_FILE}"
  echo "-----------------------------------------------------------------"
  
  eval "$(grep -E '^(status)=' "${STATE_FILE}" || true)"
  CURRENT_STATUS="${status:-}"

  if [ "${CURRENT_STATUS}" = "SUCCESS" ] || [ "${CURRENT_STATUS}" = "DEPLOYED" ]; then
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
