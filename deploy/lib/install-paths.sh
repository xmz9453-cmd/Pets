#!/usr/bin/env bash

path_is_within_or_equal() {
  [[ "$1" == "$2" || "$1" == "$2/"* ]]
}

validate_state_path() {
  local project_root="$1" state_dir="$2" project_real state_real

  if [[ "${state_dir}" != /* || -L "${state_dir}" ]]; then
    echo '[deploy safety ERROR] State path must be an absolute path and must not be a symbolic link.' >&2
    return 1
  fi
  if [[ "${#state_dir}" -gt 4096 || "${state_dir}" =~ [[:cntrl:]] ]]; then
    echo '[deploy safety ERROR] State path contains unsupported characters or is too long.' >&2
    return 1
  fi
  project_real="$(realpath -m -- "${project_root}")" || return 1
  state_real="$(realpath -m -- "${state_dir}")" || return 1
  if [[ "${state_real}" == / || "${state_real}" == /home || "${state_real}" == /home/zhe ]]; then
    echo '[deploy safety ERROR] State path must be a private subdirectory, not a filesystem or home directory.' >&2
    return 1
  fi
  if path_is_within_or_equal "${state_real}" "${project_real}" ||
      path_is_within_or_equal "${project_real}" "${state_real}"; then
    echo '[deploy safety ERROR] State and project paths must not overlap.' >&2
    return 1
  fi

  STATE_DIR="${state_real}"
  LOG_DIR="${STATE_DIR}/logs"
}

validate_install_paths() {
  local project_root="$1" backup_dir="$2" state_dir="$3"
  local project_real backup_real

  if [[ -L "${backup_dir}" || -L "${state_dir}" ]]; then
    echo '[deploy safety ERROR] Backup and state paths must not be symbolic links.' >&2
    return 1
  fi
  if [[ "${#backup_dir}" -gt 4096 || "${backup_dir}" =~ [[:cntrl:]] ]]; then
    echo '[deploy safety ERROR] Backup path contains unsupported characters or is too long.' >&2
    return 1
  fi
  project_real="$(realpath -m -- "${project_root}")" || return 1
  backup_real="$(realpath -m -- "${backup_dir}")" || return 1
  if [[ "${backup_dir}" != /* || "${backup_real}" == / ||
        "${backup_real}" == /home || "${backup_real}" == /home/zhe ]]; then
    echo '[deploy safety ERROR] Backup path must be an absolute private subdirectory, not a filesystem or home directory.' >&2
    return 1
  fi
  if path_is_within_or_equal "${backup_real}" "${project_real}" ||
      path_is_within_or_equal "${project_real}" "${backup_real}"; then
    echo '[deploy safety ERROR] Backup, state, and project paths must not overlap.' >&2
    return 1
  fi

  if ! validate_state_path "${project_root}" "${state_dir}"; then
    return 1
  fi
  if path_is_within_or_equal "${backup_real}" "${STATE_DIR}" ||
      path_is_within_or_equal "${STATE_DIR}" "${backup_real}"; then
    echo '[deploy safety ERROR] Backup, state, and project paths must not overlap.' >&2
    return 1
  fi

  BACKUP_DIR="${backup_real}"
}

ensure_private_owned_directory() {
  local directory="$1" owner mode
  if [[ -L "${directory}" ]]; then
    echo "[deploy safety ERROR] Refusing symbolic-link directory: ${directory}" >&2
    return 1
  fi
  if [[ ! -e "${directory}" ]]; then
    if ! (umask 077; mkdir -p -- "${directory}"); then
      echo "[deploy safety ERROR] Could not create private directory: ${directory}" >&2
      return 1
    fi
  fi
  if [[ ! -d "${directory}" || -L "${directory}" ]]; then
    echo "[deploy safety ERROR] Expected a real directory: ${directory}" >&2
    return 1
  fi
  owner="$(stat -c '%u' -- "${directory}")" || return 1
  mode="$(stat -c '%a' -- "${directory}")" || return 1
  if [[ "${owner}" != "$(id -u)" || "${mode}" != 700 ]]; then
    echo "[deploy safety ERROR] Directory must be owned by the current user and have mode 700: ${directory} (owner=${owner}, mode=${mode}). No permission changes were made." >&2
    return 1
  fi
}
