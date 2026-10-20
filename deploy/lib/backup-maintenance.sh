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
