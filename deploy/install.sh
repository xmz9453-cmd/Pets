#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Pets 2.0 - Production Deployment Environment Installer (install.sh)
# Initializes backup and deployment state directories with 700/600 permissions.
# ==============================================================================

BACKUP_DIR="${BACKUP_DIR:-/home/zhe/pets-backups}"
STATE_DIR="${STATE_DIR:-/home/zhe/pets-deploy-state}"
LOG_DIR="${STATE_DIR}/logs"

echo "[install.sh] Initializing Pets 2.0 deployment directories..."

# Create directories with 700 permissions
mkdir -p "${BACKUP_DIR}"
mkdir -p "${STATE_DIR}"
mkdir -p "${LOG_DIR}"

chmod 700 "${BACKUP_DIR}" "${STATE_DIR}" "${LOG_DIR}"

echo "[install.sh] Installation complete. Backup & State directories ready."
