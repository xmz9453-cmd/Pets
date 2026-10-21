#!/usr/bin/env bash

remove_expired_backup_bundles() {
  local backup_directory="$1" expired_backup filename
  find "${backup_directory}" -maxdepth 1 -type f -name 'pets_backup_*.tar.gz' -mtime +30 -print0 \
    | while IFS= read -r -d '' expired_backup; do
      filename="${expired_backup##*/}"
      [[ "${filename}" =~ ^pets_backup_[0-9]{8}_[0-9]{6}\.tar\.gz$ ]] || continue
      rm -f -- "${expired_backup}" "${expired_backup}.sha256"
    done
}

publish_backup_bundle() {
  local backup_directory="$1" archive_tmp="$2" backup_file="$3" checksum_tmp="$4"
  local checksum_file="${backup_file}.sha256" archive_name checksum_name hash_line

  archive_name="${backup_file##*/}"
  checksum_name="${checksum_tmp##*/}"
  if [[ ! "${archive_name}" =~ ^pets_backup_[0-9]{8}_[0-9]{6}\.tar\.gz$ ]] ||
     [[ "${checksum_name}" != ".${archive_name%.tar.gz}.sha256.tmp" ]] ||
     [[ "${archive_tmp}" != "${backup_directory}/.${archive_name}.tmp" ]] ||
     [[ -L "${archive_tmp}" || ! -f "${archive_tmp}" || ! -s "${archive_tmp}" ]] ||
     [[ -e "${backup_file}" || -L "${backup_file}" || -e "${checksum_file}" || -L "${checksum_file}" ||
        -e "${checksum_tmp}" || -L "${checksum_tmp}" ]]; then
    echo "[backup.sh ERROR] Backup archive or checksum output is unsafe or already exists." >&2
    return 1
  fi

  hash_line="$(sha256sum -- "${archive_tmp}")"
  hash_line="${hash_line%% *}"
  if [[ ! "${hash_line}" =~ ^[0-9a-f]{64}$ ]]; then
    echo "[backup.sh ERROR] Could not calculate the backup checksum." >&2
    return 1
  fi
  printf '%s  %s\n' "${hash_line}" "${archive_name}" > "${checksum_tmp}"
  chmod 600 "${checksum_tmp}"

  mv -n -- "${archive_tmp}" "${backup_file}"
  if [[ -e "${archive_tmp}" || ! -f "${backup_file}" || -L "${backup_file}" ]]; then
    echo "[backup.sh ERROR] Could not publish the backup archive." >&2
    return 1
  fi
  mv -n -- "${checksum_tmp}" "${checksum_file}"
  if [[ -e "${checksum_tmp}" || ! -f "${checksum_file}" || -L "${checksum_file}" ]]; then
    echo "[backup.sh ERROR] Could not publish the backup checksum sidecar." >&2
    return 1
  fi

  chmod 600 "${backup_file}" "${checksum_file}"
  if ! (cd "${backup_directory}" && sha256sum --check --status "${checksum_file}"); then
    echo "[backup.sh ERROR] Published backup checksum verification failed." >&2
    return 1
  fi
}
