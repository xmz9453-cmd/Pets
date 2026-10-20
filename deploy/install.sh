#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Pets 2.0 - Production Deployment Environment Installer (install.sh)
# Initializes backup and deployment state directories with 700/600 permissions.
# ==============================================================================

BACKUP_DIR="${BACKUP_DIR:-/home/zhe/pets-backups}"
STATE_DIR="${STATE_DIR:-/home/zhe/pets-deploy-state}"
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${DEPLOY_DIR}/.." && pwd)"
source "${DEPLOY_DIR}/lib/install-paths.sh"

if ! validate_install_paths "${PROJECT_ROOT}" "${BACKUP_DIR}" "${STATE_DIR}"; then
  exit 1
fi

if ! command -v flock >/dev/null 2>&1; then
  echo "[install.sh ERROR] flock is required for safe deployment state locking." >&2
  exit 1
fi

echo "[install.sh] Initializing private deployment directories..."

ensure_private_owned_directory "${BACKUP_DIR}"
ensure_private_owned_directory "${STATE_DIR}"
ensure_private_owned_directory "${LOG_DIR}"

echo "[install.sh] Installation complete. Backup & State directories ready."
