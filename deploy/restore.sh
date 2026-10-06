#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_FILE="${1:-}"
if [ -z "${BACKUP_FILE}" ] || [ ! -f "${BACKUP_FILE}" ]; then
  echo "Usage: $0 <path-to-pets-backup-bundle.tar.gz>" >&2
  exit 1
fi

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
  echo "[restore.sh ERROR] CONTRACT_STORAGE_ROOT must identify an existing contract storage directory." >&2
  exit 1
fi

STAGE_DIR="$(mktemp -d)"
NEW_CONTRACTS="${CONTRACT_STORAGE_ROOT}/.contract-versions-restore-${$}"
OLD_CONTRACTS="${CONTRACT_STORAGE_ROOT}/.contract-versions-before-restore-${$}"
CONTRACTS_INSTALLED=0
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
  rm -rf -- "${STAGE_DIR}"
  if [ "${CONTRACTS_INSTALLED}" -eq 0 ]; then
    rm -rf -- "${NEW_CONTRACTS}"
  fi
}
trap cleanup EXIT
chmod 700 "${STAGE_DIR}"

tar -tzf "${BACKUP_FILE}" | sort > "${STAGE_DIR}/archive-contents.txt"
printf '%s\n' PDF_MANIFEST.tsv SHA256SUMS contract-pdfs.tar.gz database.sql.gz manifest.txt \
  | sort > "${STAGE_DIR}/expected-contents.txt"
if ! cmp -s "${STAGE_DIR}/archive-contents.txt" "${STAGE_DIR}/expected-contents.txt"; then
  echo "[restore.sh ERROR] Backup bundle has unexpected or missing archive members." >&2
  exit 1
fi
tar -xzf "${BACKUP_FILE}" -C "${STAGE_DIR}"
(
  cd "${STAGE_DIR}"
  sha256sum -c SHA256SUMS
)
gzip -t "${STAGE_DIR}/database.sql.gz"
grep -qx 'format=pets-contract-backup-v1' "${STAGE_DIR}/manifest.txt"
grep -qx "database=${DB_NAME}" "${STAGE_DIR}/manifest.txt"
if grep -Eq '(^|/)\.\.?(/|$)|^/' "${STAGE_DIR}/archive-contents.txt"; then
  echo "[restore.sh ERROR] Backup contains an unsafe archive path." >&2
  exit 1
fi

mkdir -p "${STAGE_DIR}/pdf-root"
tar -tzf "${STAGE_DIR}/contract-pdfs.tar.gz" > "${STAGE_DIR}/pdf-contents.txt"
while IFS= read -r member; do
  if [ "${member}" != "contract-versions/" ] \
    && [[ ! "${member}" =~ ^contract-versions/[a-f0-9]{32}\.pdf$ ]]; then
    echo "[restore.sh ERROR] Contract PDF archive contains an unexpected path." >&2
    exit 1
  fi
done < "${STAGE_DIR}/pdf-contents.txt"
tar -xzf "${STAGE_DIR}/contract-pdfs.tar.gz" -C "${STAGE_DIR}/pdf-root"
if find "${STAGE_DIR}/pdf-root" -type l -print -quit | grep -q .; then
  echo "[restore.sh ERROR] PDF archive contains a symbolic link." >&2
  exit 1
fi
while IFS= read -r member_path; do
  relative_member="${member_path#${STAGE_DIR}/pdf-root/}"
  if [ "${relative_member}" != "contract-versions" ] \
    && [[ ! "${relative_member}" =~ ^contract-versions/[a-f0-9]{32}\.pdf$ ]]; then
    echo "[restore.sh ERROR] PDF archive contains an unexpected extracted file." >&2
    exit 1
  fi
done < <(find "${STAGE_DIR}/pdf-root" -mindepth 1 -print)

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
) > "${STAGE_DIR}/verified-PDF_MANIFEST.tsv"
if ! cmp -s "${STAGE_DIR}/PDF_MANIFEST.tsv" "${STAGE_DIR}/verified-PDF_MANIFEST.tsv"; then
  echo "[restore.sh ERROR] PDF manifest does not match the archived PDF files." >&2
  exit 1
fi

PDF_COUNT="$(find "${STAGE_DIR}/pdf-root/contract-versions" -type f -name '*.pdf' | wc -l | tr -d ' ')"
grep -qx "pdf_count=${PDF_COUNT}" "${STAGE_DIR}/manifest.txt"

echo "================================================================="
echo " WARNING: Restoring database '${DB_NAME}' and Contract PDF files"
echo " Backup Bundle: ${BACKUP_FILE}"
echo "================================================================="
read -rp "Type 'RESTORE' to proceed with restoration: " CONFIRMATION
if [ "${CONFIRMATION}" != "RESTORE" ]; then
  echo "[restore.sh] Restoration cancelled by user."
  exit 0
fi

export MYSQL_PWD="${DB_PASSWORD}"
coproc PDF_STORAGE_LOCK {
  mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" \
    --batch --skip-column-names "${DB_NAME}"
}
LOCK_PID="${PDF_STORAGE_LOCK_PID}"
LOCK_READ_FD="${PDF_STORAGE_LOCK[0]}"
LOCK_WRITE_FD="${PDF_STORAGE_LOCK[1]}"
printf "SELECT GET_LOCK('pets_contract_pdf_storage', 30);\n" >&"${LOCK_WRITE_FD}"
if ! IFS= read -r -t 35 LOCK_RESULT <&"${LOCK_READ_FD}" || [ "${LOCK_RESULT}" != "1" ]; then
  unset MYSQL_PWD
  echo "[restore.sh ERROR] Could not acquire the Contract PDF storage restore lock." >&2
  exit 1
fi

if [ -e "${OLD_CONTRACTS}" ]; then
  echo "[restore.sh ERROR] Restore recovery path already exists; refusing to continue." >&2
  exit 1
fi
mv "${STAGE_DIR}/pdf-root/contract-versions" "${NEW_CONTRACTS}"
if [ -e "${CONTRACT_STORAGE_ROOT}/contract-versions" ]; then
  mv "${CONTRACT_STORAGE_ROOT}/contract-versions" "${OLD_CONTRACTS}"
fi
mv "${NEW_CONTRACTS}" "${CONTRACT_STORAGE_ROOT}/contract-versions"
chmod 700 "${CONTRACT_STORAGE_ROOT}/contract-versions"
find "${CONTRACT_STORAGE_ROOT}/contract-versions" -type f -exec chmod 600 {} \;
CONTRACTS_INSTALLED=1

if ! zcat "${STAGE_DIR}/database.sql.gz" | mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" "${DB_NAME}"; then
  unset MYSQL_PWD
  echo "[restore.sh ERROR] Database restoration failed; preserve files for manual recovery." >&2
  exit 1
fi

if ! mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -D "${DB_NAME}" \
  -N -B -e "SELECT storage_path, file_size, file_hash FROM contract_versions WHERE storage_path IS NOT NULL ORDER BY storage_path;" \
  > "${STAGE_DIR}/database-PDF-references.tsv"; then
  unset MYSQL_PWD
  echo "[restore.sh ERROR] Could not verify restored Contract PDF references." >&2
  exit 1
fi

: > "${STAGE_DIR}/expected-PDF-files.txt"
while IFS=$'\t' read -r storage_key expected_size expected_hash; do
  [ -n "${storage_key}" ] || continue
  if [[ ! "${storage_key}" =~ ^contract-versions/[a-f0-9]{32}\.pdf$ ]]; then
    unset MYSQL_PWD
    echo "[restore.sh ERROR] Restored database contains an invalid Contract PDF storage key." >&2
    exit 1
  fi
  pdf_path="${CONTRACT_STORAGE_ROOT}/${storage_key}"
  if [ ! -f "${pdf_path}" ] || [ -L "${pdf_path}" ]; then
    unset MYSQL_PWD
    echo "[restore.sh ERROR] A restored Contract PDF reference is missing or unsafe." >&2
    exit 1
  fi
  actual_size="$(wc -c < "${pdf_path}" | tr -d ' ')"
  if [ "${actual_size}" -le 0 ] || [ "${actual_size}" -gt 10485760 ] \
    || ! head -c 5 "${pdf_path}" | cmp -s - <(printf '%%PDF-'); then
    unset MYSQL_PWD
    echo "[restore.sh ERROR] Restored Contract PDF is not a valid bounded PDF file." >&2
    exit 1
  fi
  actual_hash="$(sha256sum "${pdf_path}" | cut -d' ' -f1)"
  if [ "${actual_size}" != "${expected_size}" ] || [ "${actual_hash}" != "${expected_hash}" ]; then
    unset MYSQL_PWD
    echo "[restore.sh ERROR] Restored Contract PDF metadata does not match its file." >&2
    exit 1
  fi
  printf '%s\n' "${storage_key#contract-versions/}" >> "${STAGE_DIR}/expected-PDF-files.txt"
done < "${STAGE_DIR}/database-PDF-references.tsv"
unset MYSQL_PWD

find "${CONTRACT_STORAGE_ROOT}/contract-versions" -maxdepth 1 -type f -printf '%f\n' \
  | sort > "${STAGE_DIR}/actual-PDF-files.txt"
sort -o "${STAGE_DIR}/expected-PDF-files.txt" "${STAGE_DIR}/expected-PDF-files.txt"
if ! cmp -s "${STAGE_DIR}/expected-PDF-files.txt" "${STAGE_DIR}/actual-PDF-files.txt"; then
  echo "[restore.sh ERROR] Restored PDF storage contains missing or unexpected files." >&2
  exit 1
fi

if [ -d "${OLD_CONTRACTS}" ]; then
  rm -rf -- "${OLD_CONTRACTS}"
fi
echo "[restore.sh SUCCESS] Database and ${PDF_COUNT} Contract PDF file(s) restored and verified."
