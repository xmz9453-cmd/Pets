#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/home/zhe/pets-backups}"
TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"
ENV_FILE="${PROJECT_ROOT}/.env"
DB_HOST="localhost"
DB_PORT="3306"
DB_NAME="psop_one"
DB_USER="psop_dev_user"
DB_PASSWORD=""
CONTRACT_STORAGE_ROOT=""

if [ -f "${ENV_FILE}" ]; then
  eval "$(grep -E '^(DB_HOST|DB_PORT|DB_NAME|DB_USER|DB_PASSWORD)=' "${ENV_FILE}" | sed 's/"/\\"/g' || true)"
  CONTRACT_STORAGE_ROOT="$(sed -n 's/^CONTRACT_STORAGE_ROOT=//p' "${ENV_FILE}" | tail -n 1)"
  CONTRACT_STORAGE_ROOT="${CONTRACT_STORAGE_ROOT#\"}"
  CONTRACT_STORAGE_ROOT="${CONTRACT_STORAGE_ROOT%\"}"
fi

if [ -z "${CONTRACT_STORAGE_ROOT}" ] || [ ! -d "${CONTRACT_STORAGE_ROOT}" ]; then
  echo "[backup.sh ERROR] CONTRACT_STORAGE_ROOT must identify an existing contract storage directory." >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

STAGE_DIR="$(mktemp -d "${BACKUP_DIR}/.pets-backup.XXXXXX")"
ARCHIVE_TMP="${BACKUP_DIR}/.pets_backup_${TIMESTAMP}.tar.gz.tmp"
BACKUP_FILE="${BACKUP_DIR}/pets_backup_${TIMESTAMP}.tar.gz"
LOCK_PID=""
LOCK_READ_FD=""
LOCK_WRITE_FD=""
cleanup() {
  if [ -n "${LOCK_PID}" ]; then
    printf "SELECT RELEASE_LOCK('pets_contract_pdf_storage');\n" >&"${LOCK_WRITE_FD}" 2>/dev/null || true
    exec {LOCK_WRITE_FD}>&-
    exec {LOCK_READ_FD}<&-
    wait "${LOCK_PID}" 2>/dev/null || true
  fi
  unset MYSQL_PWD
  rm -rf -- "${STAGE_DIR}"
  rm -f -- "${ARCHIVE_TMP}"
}
trap cleanup EXIT
chmod 700 "${STAGE_DIR}"

mkdir -p "${STAGE_DIR}/pdf-root/contract-versions"
SYMLINK_LIST="${STAGE_DIR}/contract-storage-symlinks.txt"
if ! find "${CONTRACT_STORAGE_ROOT}" -type l -print > "${SYMLINK_LIST}"; then
  echo "[backup.sh ERROR] Could not scan Contract PDF storage for symbolic links." >&2
  exit 1
fi
if [ -s "${SYMLINK_LIST}" ]; then
  echo "[backup.sh ERROR] Contract storage must not contain symbolic links." >&2
  exit 1
fi

export MYSQL_PWD="${DB_PASSWORD}"
coproc PDF_STORAGE_LOCK {
  mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" \
    --batch --skip-column-names --unbuffered "${DB_NAME}"
}
LOCK_PID="${PDF_STORAGE_LOCK_PID}"
LOCK_READ_FD="${PDF_STORAGE_LOCK[0]}"
LOCK_WRITE_FD="${PDF_STORAGE_LOCK[1]}"
printf "SELECT GET_LOCK('pets_contract_pdf_storage', 30);\n" >&"${LOCK_WRITE_FD}"
if ! IFS= read -r -t 35 LOCK_RESULT <&"${LOCK_READ_FD}" || [ "${LOCK_RESULT}" != "1" ]; then
  unset MYSQL_PWD
  echo "[backup.sh ERROR] Could not acquire the Contract PDF storage backup lock." >&2
  exit 1
fi

if ! mysqldump -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" \
  --single-transaction --quick --lock-tables=false "${DB_NAME}" \
  | gzip -9 > "${STAGE_DIR}/database.sql.gz"; then
  echo "[backup.sh ERROR] Database dump failed." >&2
  exit 1
fi
gzip -t "${STAGE_DIR}/database.sql.gz"

CONTRACT_TABLE_COUNT="$(mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" "${DB_NAME}" \
  --batch --skip-column-names \
  -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'contract_versions';")"
if [[ ! "${CONTRACT_TABLE_COUNT}" =~ ^[01]$ ]]; then
  echo "[backup.sh ERROR] Could not determine whether contract_versions exists." >&2
  exit 1
fi

if [ "${CONTRACT_TABLE_COUNT}" = "1" ]; then
  mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" "${DB_NAME}" \
    --batch --skip-column-names \
    -e "SELECT storage_path, file_size, file_hash FROM contract_versions WHERE storage_path IS NOT NULL ORDER BY storage_path;" \
    > "${STAGE_DIR}/database-PDF-references.tsv"
  while IFS=$'\t' read -r storage_key expected_size expected_hash; do
    [ -n "${storage_key}" ] || continue
    if [[ ! "${storage_key}" =~ ^contract-versions/[a-f0-9]{32}\.pdf$ ]]; then
      echo "[backup.sh ERROR] Database contains an invalid Contract PDF storage key." >&2
      exit 1
    fi
    source_pdf="${CONTRACT_STORAGE_ROOT}/${storage_key}"
    target_pdf="${STAGE_DIR}/pdf-root/${storage_key}"
    if [ ! -f "${source_pdf}" ] || [ -L "${source_pdf}" ]; then
      echo "[backup.sh ERROR] A database-referenced Contract PDF is missing or unsafe." >&2
      exit 1
    fi
    actual_size="$(wc -c < "${source_pdf}" | tr -d ' ')"
    actual_hash="$(sha256sum "${source_pdf}" | cut -d' ' -f1)"
    if [ "${actual_size}" != "${expected_size}" ] || [ "${actual_hash}" != "${expected_hash}" ] \
      || [ "${actual_size}" -le 0 ] || [ "${actual_size}" -gt 10485760 ] \
      || ! head -c 5 "${source_pdf}" | cmp -s - <(printf '%%PDF-'); then
      echo "[backup.sh ERROR] A database-referenced Contract PDF failed integrity verification." >&2
      exit 1
    fi
    mkdir -p "$(dirname "${target_pdf}")"
    cp -- "${source_pdf}" "${target_pdf}"
  done < "${STAGE_DIR}/database-PDF-references.tsv"
else
  echo "[backup.sh] contract_versions is absent; validating legacy Contract PDF storage."
  LEGACY_CONTRACT_DIR="${CONTRACT_STORAGE_ROOT}/contract-versions"
  if [ ! -d "${LEGACY_CONTRACT_DIR}" ]; then
    echo "[backup.sh ERROR] Legacy Contract PDF storage directory does not exist." >&2
    exit 1
  fi
  LEGACY_PDF_LIST="${STAGE_DIR}/legacy-contract-pdfs.list"
  if ! find "${LEGACY_CONTRACT_DIR}" -mindepth 1 -maxdepth 1 -print0 > "${LEGACY_PDF_LIST}"; then
    echo "[backup.sh ERROR] Could not scan legacy Contract PDF storage." >&2
    exit 1
  fi
  while IFS= read -r -d '' source_pdf; do
    filename="$(basename "${source_pdf}")"
    if [ ! -f "${source_pdf}" ] || [ -L "${source_pdf}" ] \
      || [[ ! "${filename}" =~ ^[a-f0-9]{32}\.pdf$ ]]; then
      echo "[backup.sh ERROR] Legacy Contract PDF storage contains an unrecognized or unsafe entry." >&2
      exit 1
    fi
    actual_size="$(wc -c < "${source_pdf}" | tr -d ' ')"
    actual_hash="$(sha256sum "${source_pdf}" | cut -d' ' -f1)"
    if [ "${actual_size}" -le 0 ] || [ "${actual_size}" -gt 10485760 ] \
      || ! head -c 5 "${source_pdf}" | cmp -s - <(printf '%%PDF-'); then
      echo "[backup.sh ERROR] A legacy Contract PDF failed integrity verification." >&2
      exit 1
    fi
    target_pdf="${STAGE_DIR}/pdf-root/contract-versions/${filename}"
    cp -- "${source_pdf}" "${target_pdf}"
    printf 'contract-versions/%s\t%s\t%s\n' "${filename}" "${actual_size}" "${actual_hash}" \
      >> "${STAGE_DIR}/database-PDF-references.tsv"
  done < "${LEGACY_PDF_LIST}"
fi
unset MYSQL_PWD

if [ -d "${CONTRACT_STORAGE_ROOT}/contract-versions" ]; then
  stored_pdf_count="$(find "${CONTRACT_STORAGE_ROOT}/contract-versions" -type f -name '*.pdf' | wc -l | tr -d ' ')"
  referenced_pdf_count="$(find "${STAGE_DIR}/pdf-root/contract-versions" -type f -name '*.pdf' | wc -l | tr -d ' ')"
  if [ "${stored_pdf_count}" -gt "${referenced_pdf_count}" ]; then
    echo "[backup.sh WARNING] Unreferenced PDF files were excluded from the database-consistent backup."
  fi
fi
(
  cd "${STAGE_DIR}/pdf-root"
  find contract-versions -type f -name '*.pdf' -print0 \
    | sort -z \
    | while IFS= read -r -d '' pdf_file; do
      printf '%s\t%s\t%s\n' \
        "${pdf_file}" \
        "$(wc -c < "${pdf_file}" | tr -d ' ')" \
        "$(sha256sum "${pdf_file}" | cut -d' ' -f1)"
    done
) > "${STAGE_DIR}/PDF_MANIFEST.tsv"
tar -czf "${STAGE_DIR}/contract-pdfs.tar.gz" -C "${STAGE_DIR}/pdf-root" contract-versions

{
  printf 'format=pets-contract-backup-v1\n'
  printf 'timestamp=%s\n' "${TIMESTAMP}"
  printf 'database=%s\n' "${DB_NAME}"
  printf 'pdf_count=%s\n' "$(find "${STAGE_DIR}/pdf-root/contract-versions" -type f -name '*.pdf' | wc -l | tr -d ' ')"
} > "${STAGE_DIR}/manifest.txt"

(
  cd "${STAGE_DIR}"
  sha256sum database.sql.gz contract-pdfs.tar.gz PDF_MANIFEST.tsv manifest.txt > SHA256SUMS
)
chmod 600 "${STAGE_DIR}/database.sql.gz" "${STAGE_DIR}/contract-pdfs.tar.gz" \
  "${STAGE_DIR}/PDF_MANIFEST.tsv" "${STAGE_DIR}/manifest.txt" "${STAGE_DIR}/SHA256SUMS"
tar -czf "${ARCHIVE_TMP}" -C "${STAGE_DIR}" \
  database.sql.gz contract-pdfs.tar.gz PDF_MANIFEST.tsv manifest.txt SHA256SUMS
chmod 600 "${ARCHIVE_TMP}"
gzip -t "${ARCHIVE_TMP}"
tar -tzf "${ARCHIVE_TMP}" | sort > "${STAGE_DIR}/archive-contents.txt"
printf '%s\n' PDF_MANIFEST.tsv SHA256SUMS contract-pdfs.tar.gz database.sql.gz manifest.txt \
  | sort > "${STAGE_DIR}/expected-contents.txt"
if ! cmp -s "${STAGE_DIR}/archive-contents.txt" "${STAGE_DIR}/expected-contents.txt"; then
  echo "[backup.sh ERROR] Backup archive contents failed verification." >&2
  exit 1
fi
mv -- "${ARCHIVE_TMP}" "${BACKUP_FILE}"
chmod 600 "${BACKUP_FILE}"

find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'pets_backup_*.tar.gz' -mtime +30 -delete
echo "[backup.sh SUCCESS] Verified database + contract PDF bundle: ${BACKUP_FILE}"
echo "BACKUP_FILE=${BACKUP_FILE}"
