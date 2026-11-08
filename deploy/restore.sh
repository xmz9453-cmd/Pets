#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${DEPLOY_DIR}/.." && pwd)"
source "${DEPLOY_DIR}/lib/app-env.sh"
source "${DEPLOY_DIR}/lib/mysql-client.sh"
BACKUP_FILE="${1:-}"
if [ -z "${BACKUP_FILE}" ] || [ ! -f "${BACKUP_FILE}" ] || [ -L "${BACKUP_FILE}" ]; then
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
SHOP_LOGO_STORAGE_ROOT=""
PORTAL_BACKGROUND_STORAGE_ROOT=""
GROOMING_PHOTO_STORAGE_ROOT=""
PRODUCT_IMAGE_STORAGE_ROOT=""
if [ -f "${ENV_FILE}" ]; then
  load_deployment_env "${ENV_FILE}"
fi
if [ -z "${CONTRACT_STORAGE_ROOT}" ] || [ ! -d "${CONTRACT_STORAGE_ROOT}" ] || [ -L "${CONTRACT_STORAGE_ROOT}" ]; then
  echo "[restore.sh ERROR] CONTRACT_STORAGE_ROOT must identify an existing contract storage directory." >&2
  exit 1
fi
MEDIA_PARENT="$(dirname "${CONTRACT_STORAGE_ROOT}")"
SHOP_LOGO_STORAGE_ROOT="${SHOP_LOGO_STORAGE_ROOT:-${MEDIA_PARENT}/shop-logos}"
PORTAL_BACKGROUND_STORAGE_ROOT="${PORTAL_BACKGROUND_STORAGE_ROOT:-${MEDIA_PARENT}/portal-backgrounds}"
GROOMING_PHOTO_STORAGE_ROOT="${GROOMING_PHOTO_STORAGE_ROOT:-${MEDIA_PARENT}/grooming-photos}"
PRODUCT_IMAGE_STORAGE_ROOT="${PRODUCT_IMAGE_STORAGE_ROOT:-${MEDIA_PARENT}/product-images}"
mkdir -p -- "${SHOP_LOGO_STORAGE_ROOT}" "${PORTAL_BACKGROUND_STORAGE_ROOT}" \
  "${GROOMING_PHOTO_STORAGE_ROOT}" "${PRODUCT_IMAGE_STORAGE_ROOT}"
if [ -L "${SHOP_LOGO_STORAGE_ROOT}" ] || [ ! -d "${SHOP_LOGO_STORAGE_ROOT}" ] \
  || [ -L "${PORTAL_BACKGROUND_STORAGE_ROOT}" ] || [ ! -d "${PORTAL_BACKGROUND_STORAGE_ROOT}" ] \
  || [ -L "${GROOMING_PHOTO_STORAGE_ROOT}" ] || [ ! -d "${GROOMING_PHOTO_STORAGE_ROOT}" ] \
  || [ -L "${PRODUCT_IMAGE_STORAGE_ROOT}" ] || [ ! -d "${PRODUCT_IMAGE_STORAGE_ROOT}" ]; then
  echo "[restore.sh ERROR] Media roots must be real directories, not symbolic links." >&2
  exit 1
fi

canonical_path() {
  (cd -P -- "$1" && pwd)
}

CONTRACT_STORAGE_ROOT="$(canonical_path "${CONTRACT_STORAGE_ROOT}")"
SHOP_LOGO_STORAGE_ROOT="$(canonical_path "${SHOP_LOGO_STORAGE_ROOT}")"
PORTAL_BACKGROUND_STORAGE_ROOT="$(canonical_path "${PORTAL_BACKGROUND_STORAGE_ROOT}")"
GROOMING_PHOTO_STORAGE_ROOT="$(canonical_path "${GROOMING_PHOTO_STORAGE_ROOT}")"
PRODUCT_IMAGE_STORAGE_ROOT="$(canonical_path "${PRODUCT_IMAGE_STORAGE_ROOT}")"
if [ "${SHOP_LOGO_STORAGE_ROOT}" = "${PORTAL_BACKGROUND_STORAGE_ROOT}" ] \
  || [ "${SHOP_LOGO_STORAGE_ROOT}" = "${CONTRACT_STORAGE_ROOT}" ] \
  || [ "${PORTAL_BACKGROUND_STORAGE_ROOT}" = "${CONTRACT_STORAGE_ROOT}" ] \
  || [ "${GROOMING_PHOTO_STORAGE_ROOT}" = "${CONTRACT_STORAGE_ROOT}" ] \
  || [ "${GROOMING_PHOTO_STORAGE_ROOT}" = "${SHOP_LOGO_STORAGE_ROOT}" ] \
  || [ "${GROOMING_PHOTO_STORAGE_ROOT}" = "${PORTAL_BACKGROUND_STORAGE_ROOT}" ] \
  || [ "${PRODUCT_IMAGE_STORAGE_ROOT}" = "${CONTRACT_STORAGE_ROOT}" ] \
  || [ "${PRODUCT_IMAGE_STORAGE_ROOT}" = "${SHOP_LOGO_STORAGE_ROOT}" ] \
  || [ "${PRODUCT_IMAGE_STORAGE_ROOT}" = "${PORTAL_BACKGROUND_STORAGE_ROOT}" ] \
  || [ "${PRODUCT_IMAGE_STORAGE_ROOT}" = "${GROOMING_PHOTO_STORAGE_ROOT}" ]; then
  echo "[restore.sh ERROR] Contract and media storage roots must be different directories." >&2
  exit 1
fi

STAGE_DIR="$(mktemp -d)"
NEW_CONTRACTS="${CONTRACT_STORAGE_ROOT}/.contract-versions-restore-${$}"
OLD_CONTRACTS="${CONTRACT_STORAGE_ROOT}/.contract-versions-before-restore-${$}"
NEW_LOGOS="${SHOP_LOGO_STORAGE_ROOT}.restore-${$}"
OLD_LOGOS="${SHOP_LOGO_STORAGE_ROOT}.before-restore-${$}"
NEW_BACKGROUNDS="${PORTAL_BACKGROUND_STORAGE_ROOT}.restore-${$}"
OLD_BACKGROUNDS="${PORTAL_BACKGROUND_STORAGE_ROOT}.before-restore-${$}"
NEW_GROOMING_PHOTOS="${GROOMING_PHOTO_STORAGE_ROOT}.restore-${$}"
OLD_GROOMING_PHOTOS="${GROOMING_PHOTO_STORAGE_ROOT}.before-restore-${$}"
NEW_PRODUCT_IMAGES="${PRODUCT_IMAGE_STORAGE_ROOT}.restore-${$}"
OLD_PRODUCT_IMAGES="${PRODUCT_IMAGE_STORAGE_ROOT}.before-restore-${$}"
CONTRACTS_INSTALLED=0
LOGOS_INSTALLED=0
BACKGROUNDS_INSTALLED=0
GROOMING_PHOTOS_INSTALLED=0
PRODUCT_IMAGES_INSTALLED=0
LOCK_PID=""
LOCK_READ_FD=""
LOCK_WRITE_FD=""
cleanup() {
  if [ -n "${LOCK_PID}" ]; then
    printf "SELECT RELEASE_LOCK('pets_media_backup');\n" >&"${LOCK_WRITE_FD}" 2>/dev/null || true
    exec {LOCK_WRITE_FD}>&-
    exec {LOCK_READ_FD}<&-
    wait "${LOCK_PID}" 2>/dev/null || true
  fi
  rm -rf -- "${STAGE_DIR}"
  if [ "${CONTRACTS_INSTALLED}" -eq 0 ]; then
    rm -rf -- "${NEW_CONTRACTS}"
  fi
  if [ "${LOGOS_INSTALLED}" -eq 0 ]; then
    rm -rf -- "${NEW_LOGOS}"
  fi
  if [ "${BACKGROUNDS_INSTALLED}" -eq 0 ]; then
    rm -rf -- "${NEW_BACKGROUNDS}"
  fi
  if [ "${GROOMING_PHOTOS_INSTALLED}" -eq 0 ]; then
    rm -rf -- "${NEW_GROOMING_PHOTOS}"
  fi
  if [ "${PRODUCT_IMAGES_INSTALLED}" -eq 0 ]; then
    rm -rf -- "${NEW_PRODUCT_IMAGES}"
  fi
}
trap cleanup EXIT
chmod 700 "${STAGE_DIR}"

tar -tzf "${BACKUP_FILE}" | sort > "${STAGE_DIR}/archive-contents.txt"
printf '%s\n' PDF_MANIFEST.tsv SHA256SUMS contract-pdfs.tar.gz database.sql.gz manifest.txt \
  | sort > "${STAGE_DIR}/expected-legacy-contents.txt"
printf '%s\n' PDF_MANIFEST.tsv MEDIA_MANIFEST.tsv SHA256SUMS contract-pdfs.tar.gz database.sql.gz manifest.txt media-files.tar.gz \
  | sort > "${STAGE_DIR}/expected-contents.txt"
HAS_MEDIA=1
if ! cmp -s "${STAGE_DIR}/archive-contents.txt" "${STAGE_DIR}/expected-contents.txt"; then
  HAS_MEDIA=0
fi
if [ "${HAS_MEDIA}" -eq 0 ] \
  && ! cmp -s "${STAGE_DIR}/archive-contents.txt" "${STAGE_DIR}/expected-legacy-contents.txt"; then
  echo "[restore.sh ERROR] Backup bundle has unexpected or missing archive members." >&2
  exit 1
fi
if ! tar -tvzf "${BACKUP_FILE}" > "${STAGE_DIR}/archive-details.txt" ||
  ! awk -v expected_count="$((HAS_MEDIA == 1 ? 7 : 5))" \
    'substr($0, 1, 1) != "-" { invalid = 1 } END { if (NR != expected_count) invalid = 1; exit invalid }' \
    "${STAGE_DIR}/archive-details.txt"; then
  echo "[restore.sh ERROR] Backup bundle contains a non-regular or duplicate archive member." >&2
  exit 1
fi
tar -xzf "${BACKUP_FILE}" -C "${STAGE_DIR}"
(
  cd "${STAGE_DIR}"
  sha256sum -c SHA256SUMS
)
gzip -t "${STAGE_DIR}/database.sql.gz"
if [ "${HAS_MEDIA}" -eq 1 ]; then
  if grep -qx 'format=pets-contract-backup-v3' "${STAGE_DIR}/manifest.txt"; then
    HAS_EXTENDED_MEDIA=1
  elif grep -qx 'format=pets-contract-backup-v2' "${STAGE_DIR}/manifest.txt"; then
    HAS_EXTENDED_MEDIA=0
  else
    echo "[restore.sh ERROR] Backup manifest format is not supported." >&2
    exit 1
  fi
  grep -Eq '^app_commit=[0-9a-f]{40}$' "${STAGE_DIR}/manifest.txt"
  RESTORE_APP_COMMIT="$(sed -n 's/^app_commit=//p' "${STAGE_DIR}/manifest.txt")"
else
  HAS_EXTENDED_MEDIA=0
  grep -qx 'format=pets-contract-backup-v1' "${STAGE_DIR}/manifest.txt"
  RESTORE_APP_COMMIT="not-recorded-in-legacy-backup"
  echo "[restore.sh WARNING] This legacy backup does not contain uploaded media; existing Logo and Background files will be retained and checked."
fi
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
tar -tvzf "${STAGE_DIR}/contract-pdfs.tar.gz" > "${STAGE_DIR}/pdf-details.txt"
while IFS= read -r member_details; do
  member_type="${member_details:0:1}"
  member_name="${member_details##* }"
  if [[ "${member_type}" == d && "${member_name}" == contract-versions/ ]]; then
    continue
  fi
  if [[ "${member_type}" == - && "${member_name}" =~ ^contract-versions/[a-f0-9]{32}\.pdf$ ]]; then
    continue
  fi
  echo "[restore.sh ERROR] Contract PDF archive contains a non-regular or unexpected member." >&2
  exit 1
done < "${STAGE_DIR}/pdf-details.txt"
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

if [ "${HAS_MEDIA}" -eq 1 ]; then
mkdir -p "${STAGE_DIR}/media"
tar -tzf "${STAGE_DIR}/media-files.tar.gz" > "${STAGE_DIR}/media-contents.txt"
MEDIA_DIRECTORY_PATTERN='^(shop-logos|portal-backgrounds)$'
MEDIA_FILE_PATTERN='^(shop-logos|portal-backgrounds)/[a-f0-9]{32}\.(png|jpg|webp)$'
if [ "${HAS_EXTENDED_MEDIA}" -eq 1 ]; then
  MEDIA_DIRECTORY_PATTERN='^(shop-logos|portal-backgrounds|grooming-photos|product-images)$'
  MEDIA_FILE_PATTERN='^(shop-logos|portal-backgrounds|grooming-photos|product-images)/[a-f0-9]{32}\.(png|jpg|webp)$'
fi
while IFS= read -r member; do
  directory_name="${member%/}"
  if { [ "${member}" != "${directory_name}/" ] || [[ ! "${directory_name}" =~ ${MEDIA_DIRECTORY_PATTERN} ]]; } \
    && [[ ! "${member}" =~ ${MEDIA_FILE_PATTERN} ]]; then
    echo "[restore.sh ERROR] Media archive contains an unexpected path." >&2
    exit 1
  fi
done < "${STAGE_DIR}/media-contents.txt"
tar -tvzf "${STAGE_DIR}/media-files.tar.gz" > "${STAGE_DIR}/media-details.txt"
while IFS= read -r member_details; do
  member_type="${member_details:0:1}"
  member_name="${member_details##* }"
  directory_name="${member_name%/}"
  if [[ "${member_type}" == d && "${directory_name}" =~ ${MEDIA_DIRECTORY_PATTERN} ]]; then
    continue
  fi
  if [[ "${member_type}" == - && "${member_name}" =~ ${MEDIA_FILE_PATTERN} ]]; then
    continue
  fi
  echo "[restore.sh ERROR] Media archive contains a non-regular or unexpected member." >&2
  exit 1
done < "${STAGE_DIR}/media-details.txt"
tar -xzf "${STAGE_DIR}/media-files.tar.gz" -C "${STAGE_DIR}/media"
if find "${STAGE_DIR}/media" -type l -print -quit | grep -q .; then
  echo "[restore.sh ERROR] Media archive contains a symbolic link." >&2
  exit 1
fi
MEDIA_ROOTS=("${STAGE_DIR}/media/shop-logos" "${STAGE_DIR}/media/portal-backgrounds")
if [ "${HAS_EXTENDED_MEDIA}" -eq 1 ]; then
  MEDIA_ROOTS+=("${STAGE_DIR}/media/grooming-photos" "${STAGE_DIR}/media/product-images")
fi
for media_root in "${MEDIA_ROOTS[@]}"; do
  media_name="${media_root##*/}"
  if [ ! -d "${media_root}" ]; then
    echo "[restore.sh ERROR] Media archive is missing a required storage directory." >&2
    exit 1
  fi
done

: > "${STAGE_DIR}/verified-MEDIA_MANIFEST.tsv"
while IFS= read -r media_file; do
  relative_media_file="${media_file#${STAGE_DIR}/media/}"
  media_size="$(wc -c < "${media_file}" | tr -d ' ')"
  case "${relative_media_file}" in
    shop-logos/*)
      max_size=2097152
      ;;
    portal-backgrounds/*)
      max_size=10485760
      ;;
    grooming-photos/*|product-images/*)
      max_size=2097152
      ;;
    *)
      echo "[restore.sh ERROR] Extracted media archive contains an unexpected file." >&2
      exit 1
      ;;
  esac
  if [ "${media_size}" -le 0 ] || [ "${media_size}" -gt "${max_size}" ]; then
    echo "[restore.sh ERROR] Media archive contains an invalid file size." >&2
    exit 1
  fi
  printf '%s\t%s\t%s\n' "${relative_media_file}" "${media_size}" \
    "$(sha256sum "${media_file}" | cut -d' ' -f1)" >> "${STAGE_DIR}/verified-MEDIA_MANIFEST.tsv"
done < <(find "${MEDIA_ROOTS[@]}" -type f | sort)
if ! cmp -s "${STAGE_DIR}/MEDIA_MANIFEST.tsv" "${STAGE_DIR}/verified-MEDIA_MANIFEST.tsv"; then
  echo "[restore.sh ERROR] Media manifest does not match the archived files." >&2
  exit 1
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
) > "${STAGE_DIR}/verified-PDF_MANIFEST.tsv"
if ! cmp -s "${STAGE_DIR}/PDF_MANIFEST.tsv" "${STAGE_DIR}/verified-PDF_MANIFEST.tsv"; then
  echo "[restore.sh ERROR] PDF manifest does not match the archived PDF files." >&2
  exit 1
fi

PDF_COUNT="$(find "${STAGE_DIR}/pdf-root/contract-versions" -type f -name '*.pdf' | wc -l | tr -d ' ')"
grep -qx "pdf_count=${PDF_COUNT}" "${STAGE_DIR}/manifest.txt"
MEDIA_COUNT=0
if [ "${HAS_MEDIA}" -eq 1 ]; then
  MEDIA_COUNT="$(wc -l < "${STAGE_DIR}/MEDIA_MANIFEST.tsv" | tr -d ' ')"
  grep -qx "media_count=${MEDIA_COUNT}" "${STAGE_DIR}/manifest.txt"
fi

DATABASE_HAS_CONTRACT_TABLE="$(gzip -cd "${STAGE_DIR}/database.sql.gz" | awk '
  /^CREATE TABLE / {
    table_name = $3
    if (table_name == "IF") {
      table_name = $6
    }
    gsub(/[`;]/, "", table_name)
    if (table_name == "contract_versions") {
      found = 1
    }
  }
  END {
    print found ? "yes" : "no"
  }
')"

EXPECTED_PDF_FILES="${STAGE_DIR}/expected-PDF-files.txt"
: > "${EXPECTED_PDF_FILES}"
EXPECTED_ARCHIVE_MEMBERS="${STAGE_DIR}/expected-pdf-archive-members.txt"
printf '%s\n' 'contract-versions/' > "${EXPECTED_ARCHIVE_MEMBERS}"
while IFS=$'\t' read -r storage_key expected_size expected_hash; do
  [ -n "${storage_key}" ] || continue
  if [[ ! "${storage_key}" =~ ^contract-versions/[a-f0-9]{32}\.pdf$ ]] \
    || [[ ! "${expected_size}" =~ ^[0-9]+$ ]] \
    || [ "${expected_size}" -le 0 ] || [ "${expected_size}" -gt 10485760 ] \
    || [[ ! "${expected_hash}" =~ ^[a-f0-9]{64}$ ]]; then
    echo "[restore.sh ERROR] PDF manifest contains an invalid path or file record." >&2
    exit 1
  fi
  printf '%s\n' "${storage_key}" >> "${EXPECTED_ARCHIVE_MEMBERS}"
  printf '%s\n' "${storage_key#contract-versions/}" >> "${EXPECTED_PDF_FILES}"
done < "${STAGE_DIR}/PDF_MANIFEST.tsv"
sort -o "${EXPECTED_ARCHIVE_MEMBERS}" "${EXPECTED_ARCHIVE_MEMBERS}"
sort -o "${EXPECTED_PDF_FILES}" "${EXPECTED_PDF_FILES}"
sort -o "${STAGE_DIR}/pdf-contents.txt" "${STAGE_DIR}/pdf-contents.txt"
if ! cmp -s "${EXPECTED_ARCHIVE_MEMBERS}" "${STAGE_DIR}/pdf-contents.txt"; then
  echo "[restore.sh ERROR] Contract PDF archive members do not match the PDF manifest." >&2
  exit 1
fi

while IFS= read -r pdf_file; do
  [ -n "${pdf_file}" ] || continue
  pdf_path="${STAGE_DIR}/pdf-root/contract-versions/${pdf_file}"
  pdf_size="$(wc -c < "${pdf_path}" | tr -d ' ')"
  if [ "${pdf_size}" -le 0 ] || [ "${pdf_size}" -gt 10485760 ] \
    || ! head -c 5 "${pdf_path}" | cmp -s - <(printf '%%PDF-'); then
    echo "[restore.sh ERROR] Archived Contract PDF is not a valid bounded PDF file." >&2
    exit 1
  fi
done < "${EXPECTED_PDF_FILES}"

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

echo "================================================================="
echo " WARNING: Restoring database '${DB_NAME}', Contract PDFs, Shop Logos, and Portal Backgrounds"
echo " Backup Bundle: ${BACKUP_FILE}"
echo " Application Commit: ${RESTORE_APP_COMMIT}"
echo " Database Schema: contract_versions ${DATABASE_HAS_CONTRACT_TABLE}"
echo "================================================================="
read -rp "Type 'RESTORE' to proceed with restoration: " CONFIRMATION
if [ "${CONFIRMATION}" != "RESTORE" ]; then
  echo "[restore.sh] Restoration cancelled by user."
  exit 0
fi

MYSQL_CREDENTIALS_FILE="${STAGE_DIR}/mysql-client.cnf"
if ! write_mysql_client_defaults "${MYSQL_CREDENTIALS_FILE}"; then
  echo "[restore.sh ERROR] Could not create a private MySQL client option file." >&2
  exit 1
fi
coproc PDF_STORAGE_LOCK {
  mysql --defaults-extra-file="${MYSQL_CREDENTIALS_FILE}" \
    --batch --skip-column-names "${DB_NAME}"
}
LOCK_PID="${PDF_STORAGE_LOCK_PID}"
LOCK_READ_FD="${PDF_STORAGE_LOCK[0]}"
LOCK_WRITE_FD="${PDF_STORAGE_LOCK[1]}"
printf "SELECT GET_LOCK('pets_media_backup', 30);\n" >&"${LOCK_WRITE_FD}"
if ! IFS= read -r -t 35 LOCK_RESULT <&"${LOCK_READ_FD}" || [ "${LOCK_RESULT}" != "1" ]; then
  echo "[restore.sh ERROR] Could not acquire the Contract PDF storage restore lock." >&2
  exit 1
fi

TARGET_CONTRACT_TABLE_COUNT="$(mysql --defaults-extra-file="${MYSQL_CREDENTIALS_FILE}" "${DB_NAME}" \
  --batch --skip-column-names \
  -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'contract_versions';")"
if [[ ! "${TARGET_CONTRACT_TABLE_COUNT}" =~ ^[01]$ ]]; then
  echo "[restore.sh ERROR] Could not determine whether contract_versions exists in the restore target." >&2
  exit 1
fi
if [ "${DATABASE_HAS_CONTRACT_TABLE}" = "no" ] && [ "${TARGET_CONTRACT_TABLE_COUNT}" = "1" ]; then
  echo "[restore.sh ERROR] Refusing to restore a legacy dump into a target that retains contract_versions." >&2
  exit 1
fi

if [ -e "${OLD_CONTRACTS}" ] \
  || { [ "${HAS_MEDIA}" -eq 1 ] && { [ -e "${OLD_LOGOS}" ] || [ -e "${OLD_BACKGROUNDS}" ] \
    || [ -e "${NEW_LOGOS}" ] || [ -e "${NEW_BACKGROUNDS}" ]; }; } \
  || { [ "${HAS_EXTENDED_MEDIA}" -eq 1 ] && { [ -e "${OLD_GROOMING_PHOTOS}" ] \
    || [ -e "${OLD_PRODUCT_IMAGES}" ] || [ -e "${NEW_GROOMING_PHOTOS}" ] || [ -e "${NEW_PRODUCT_IMAGES}" ]; }; }; then
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

if [ "${HAS_MEDIA}" -eq 1 ]; then
cp -a "${STAGE_DIR}/media/shop-logos" "${NEW_LOGOS}"
find "${NEW_LOGOS}" -type d -exec chmod 700 {} \;
find "${NEW_LOGOS}" -type f -exec chmod 600 {} \;
mv "${SHOP_LOGO_STORAGE_ROOT}" "${OLD_LOGOS}"
mv "${NEW_LOGOS}" "${SHOP_LOGO_STORAGE_ROOT}"
LOGOS_INSTALLED=1

cp -a "${STAGE_DIR}/media/portal-backgrounds" "${NEW_BACKGROUNDS}"
find "${NEW_BACKGROUNDS}" -type d -exec chmod 700 {} \;
find "${NEW_BACKGROUNDS}" -type f -exec chmod 600 {} \;
mv "${PORTAL_BACKGROUND_STORAGE_ROOT}" "${OLD_BACKGROUNDS}"
mv "${NEW_BACKGROUNDS}" "${PORTAL_BACKGROUND_STORAGE_ROOT}"
BACKGROUNDS_INSTALLED=1
if [ "${HAS_EXTENDED_MEDIA}" -eq 1 ]; then
  cp -a "${STAGE_DIR}/media/grooming-photos" "${NEW_GROOMING_PHOTOS}"
  find "${NEW_GROOMING_PHOTOS}" -type d -exec chmod 700 {} \;
  find "${NEW_GROOMING_PHOTOS}" -type f -exec chmod 600 {} \;
  mv "${GROOMING_PHOTO_STORAGE_ROOT}" "${OLD_GROOMING_PHOTOS}"
  mv "${NEW_GROOMING_PHOTOS}" "${GROOMING_PHOTO_STORAGE_ROOT}"
  GROOMING_PHOTOS_INSTALLED=1

  cp -a "${STAGE_DIR}/media/product-images" "${NEW_PRODUCT_IMAGES}"
  find "${NEW_PRODUCT_IMAGES}" -type d -exec chmod 700 {} \;
  find "${NEW_PRODUCT_IMAGES}" -type f -exec chmod 600 {} \;
  mv "${PRODUCT_IMAGE_STORAGE_ROOT}" "${OLD_PRODUCT_IMAGES}"
  mv "${NEW_PRODUCT_IMAGES}" "${PRODUCT_IMAGE_STORAGE_ROOT}"
  PRODUCT_IMAGES_INSTALLED=1
fi
fi

if ! zcat "${STAGE_DIR}/database.sql.gz" | mysql --defaults-extra-file="${MYSQL_CREDENTIALS_FILE}" "${DB_NAME}"; then
  echo "[restore.sh ERROR] Database restoration failed; preserve prior media storage for manual recovery." >&2
  exit 1
fi

RESTORED_CONTRACT_TABLE_COUNT="$(mysql --defaults-extra-file="${MYSQL_CREDENTIALS_FILE}" "${DB_NAME}" \
  --batch --skip-column-names \
  -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'contract_versions';")"
if [[ ! "${RESTORED_CONTRACT_TABLE_COUNT}" =~ ^[01]$ ]]; then
  echo "[restore.sh ERROR] Could not determine whether contract_versions exists after database restoration." >&2
  exit 1
fi
RESTORED_HAS_CONTRACT_TABLE="no"
if [ "${RESTORED_CONTRACT_TABLE_COUNT}" = "1" ]; then
  RESTORED_HAS_CONTRACT_TABLE="yes"
fi
if [ "${RESTORED_HAS_CONTRACT_TABLE}" != "${DATABASE_HAS_CONTRACT_TABLE}" ]; then
  echo "[restore.sh ERROR] Restored database schema does not match the backup dump." >&2
  exit 1
fi

if [ "${RESTORED_HAS_CONTRACT_TABLE}" = "yes" ]; then
  if ! mysql --defaults-extra-file="${MYSQL_CREDENTIALS_FILE}" -D "${DB_NAME}" \
    -N -B -e "SELECT storage_path, file_size, file_hash FROM contract_versions WHERE storage_path IS NOT NULL ORDER BY storage_path;" \
    > "${STAGE_DIR}/database-PDF-references.tsv"; then
    echo "[restore.sh ERROR] Could not verify restored Contract PDF references." >&2
    exit 1
  fi

  : > "${EXPECTED_PDF_FILES}"
  while IFS=$'\t' read -r storage_key expected_size expected_hash; do
    [ -n "${storage_key}" ] || continue
    if [[ ! "${storage_key}" =~ ^contract-versions/[a-f0-9]{32}\.pdf$ ]]; then
      echo "[restore.sh ERROR] Restored database contains an invalid Contract PDF storage key." >&2
      exit 1
    fi
    pdf_path="${CONTRACT_STORAGE_ROOT}/${storage_key}"
    if [ ! -f "${pdf_path}" ] || [ -L "${pdf_path}" ]; then
      echo "[restore.sh ERROR] A restored Contract PDF reference is missing or unsafe." >&2
      exit 1
    fi
    actual_size="$(wc -c < "${pdf_path}" | tr -d ' ')"
    if [ "${actual_size}" -le 0 ] || [ "${actual_size}" -gt 10485760 ] \
      || ! head -c 5 "${pdf_path}" | cmp -s - <(printf '%%PDF-'); then
      echo "[restore.sh ERROR] Restored Contract PDF is not a valid bounded PDF file." >&2
      exit 1
    fi
    actual_hash="$(sha256sum "${pdf_path}" | cut -d' ' -f1)"
    if [ "${actual_size}" != "${expected_size}" ] || [ "${actual_hash}" != "${expected_hash}" ]; then
      echo "[restore.sh ERROR] Restored Contract PDF metadata does not match its file." >&2
      exit 1
    fi
    printf '%s\n' "${storage_key#contract-versions/}" >> "${EXPECTED_PDF_FILES}"
  done < "${STAGE_DIR}/database-PDF-references.tsv"
  sort -o "${EXPECTED_PDF_FILES}" "${EXPECTED_PDF_FILES}"
fi
find "${CONTRACT_STORAGE_ROOT}/contract-versions" -maxdepth 1 -type f -printf '%f\n' \
  | sort > "${STAGE_DIR}/actual-PDF-files.txt"
if ! cmp -s "${EXPECTED_PDF_FILES}" "${STAGE_DIR}/actual-PDF-files.txt"; then
  echo "[restore.sh ERROR] Restored PDF storage contains missing or unexpected files." >&2
  exit 1
fi

(
  cd "${CONTRACT_STORAGE_ROOT}"
  find contract-versions -type f -name '*.pdf' -print0 \
    | sort -z \
    | while IFS= read -r -d '' pdf_file; do
      printf '%s\t%s\t%s\n' \
        "${pdf_file}" \
        "$(wc -c < "${pdf_file}" | tr -d ' ')" \
        "$(sha256sum "${pdf_file}" | cut -d' ' -f1)"
    done
) > "${STAGE_DIR}/restored-PDF_MANIFEST.tsv"
if ! cmp -s "${STAGE_DIR}/PDF_MANIFEST.tsv" "${STAGE_DIR}/restored-PDF_MANIFEST.tsv"; then
  echo "[restore.sh ERROR] Restored Contract PDF files do not match the verified PDF manifest." >&2
  exit 1
fi

SHOP_LOGO_COLUMN_COUNT="$(mysql --defaults-extra-file="${MYSQL_CREDENTIALS_FILE}" "${DB_NAME}" \
  --batch --skip-column-names \
  -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'shop_settings' AND column_name = 'logo_storage_key';")"
if [[ ! "${SHOP_LOGO_COLUMN_COUNT}" =~ ^[01]$ ]]; then
  echo "[restore.sh ERROR] Could not determine whether restored shop_settings.logo_storage_key exists." >&2
  exit 1
fi
: > "${STAGE_DIR}/restored-logo-references.txt"
if [ "${SHOP_LOGO_COLUMN_COUNT}" = "1" ]; then
  if ! mysql --defaults-extra-file="${MYSQL_CREDENTIALS_FILE}" -D "${DB_NAME}" \
    -N -B -e "SELECT logo_storage_key FROM shop_settings WHERE logo_storage_key IS NOT NULL ORDER BY logo_storage_key;" \
    > "${STAGE_DIR}/restored-logo-references.txt"; then
    echo "[restore.sh ERROR] Could not verify restored Shop Logo references." >&2
    exit 1
  fi
else
  echo "[restore.sh] Restored schema has no shop_settings.logo_storage_key; skipping Logo reference checks."
fi
while IFS= read -r storage_key; do
  [ -n "${storage_key}" ] || continue
  if [[ ! "${storage_key}" =~ ^[a-f0-9]{32}\.(png|jpg|webp)$ ]] \
    || [ ! -f "${SHOP_LOGO_STORAGE_ROOT}/${storage_key}" ] \
    || [ -L "${SHOP_LOGO_STORAGE_ROOT}/${storage_key}" ]; then
    echo "[restore.sh ERROR] A restored Shop Logo reference is missing or unsafe." >&2
    exit 1
  fi
done < "${STAGE_DIR}/restored-logo-references.txt"

BACKGROUND_COLUMN_COUNT="$(mysql --defaults-extra-file="${MYSQL_CREDENTIALS_FILE}" "${DB_NAME}" \
  --batch --skip-column-names \
  -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'portal_backgrounds' AND column_name IN ('storage_key', 'file_size', 'mime_type');")"
if [[ ! "${BACKGROUND_COLUMN_COUNT}" =~ ^(0|3)$ ]]; then
  echo "[restore.sh ERROR] Restored Portal Background schema is incomplete; expected all required reference columns or none." >&2
  exit 1
fi
: > "${STAGE_DIR}/restored-background-references.tsv"
if [ "${BACKGROUND_COLUMN_COUNT}" = "3" ]; then
  if ! mysql --defaults-extra-file="${MYSQL_CREDENTIALS_FILE}" -D "${DB_NAME}" \
    -N -B -e "SELECT storage_key, file_size, mime_type FROM portal_backgrounds ORDER BY storage_key;" \
    > "${STAGE_DIR}/restored-background-references.tsv"; then
    echo "[restore.sh ERROR] Could not verify restored Portal Background references." >&2
    exit 1
  fi
else
  echo "[restore.sh] Restored schema has no Portal Background reference columns; skipping Background reference checks."
fi
while IFS=$'\t' read -r storage_key expected_size mime_type; do
  [ -n "${storage_key}" ] || continue
  background_path="${PORTAL_BACKGROUND_STORAGE_ROOT}/${storage_key}"
  if [[ ! "${storage_key}" =~ ^[a-f0-9]{32}\.(png|jpg|webp)$ ]] \
    || [ ! -f "${background_path}" ] || [ -L "${background_path}" ]; then
    echo "[restore.sh ERROR] A restored Portal Background reference is missing or unsafe." >&2
    exit 1
  fi
  actual_size="$(wc -c < "${background_path}" | tr -d ' ')"
  case "${storage_key##*.}:${mime_type}" in
    png:image/png|jpg:image/jpeg|webp:image/webp) ;;
    *) echo "[restore.sh ERROR] A restored Portal Background has mismatched media metadata." >&2; exit 1 ;;
  esac
  if [ "${actual_size}" != "${expected_size}" ]; then
    echo "[restore.sh ERROR] A restored Portal Background has an invalid file size." >&2
    exit 1
  fi
done < "${STAGE_DIR}/restored-background-references.tsv"

if [ "${HAS_EXTENDED_MEDIA}" -eq 1 ]; then
  PRODUCT_IMAGE_COLUMN_COUNT="$(mysql --defaults-extra-file="${MYSQL_CREDENTIALS_FILE}" "${DB_NAME}" \
    --batch --skip-column-names \
    -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name IN ('image_storage_key', 'image_file_size', 'image_mime_type');")"
  if [[ ! "${PRODUCT_IMAGE_COLUMN_COUNT}" =~ ^(0|3)$ ]]; then
    echo "[restore.sh ERROR] Restored Product Image schema is incomplete." >&2
    exit 1
  fi
  : > "${STAGE_DIR}/restored-product-image-references.tsv"
  if [ "${PRODUCT_IMAGE_COLUMN_COUNT}" = "3" ]; then
    mysql --defaults-extra-file="${MYSQL_CREDENTIALS_FILE}" -D "${DB_NAME}" \
      -N -B -e "SELECT image_storage_key, image_file_size, image_mime_type FROM products WHERE image_storage_key IS NOT NULL ORDER BY image_storage_key;" \
      > "${STAGE_DIR}/restored-product-image-references.tsv"
  fi
  while IFS=$'\t' read -r storage_key expected_size mime_type; do
    [ -n "${storage_key}" ] || continue
    image_path="${PRODUCT_IMAGE_STORAGE_ROOT}/${storage_key}"
    if [[ ! "${storage_key}" =~ ^[a-f0-9]{32}\.(png|jpg|webp)$ ]] \
      || [ ! -f "${image_path}" ] || [ -L "${image_path}" ]; then
      echo "[restore.sh ERROR] A restored Product Image reference is missing or unsafe." >&2
      exit 1
    fi
    actual_size="$(wc -c < "${image_path}" | tr -d ' ')"
    case "${storage_key##*.}:${mime_type}" in
      png:image/png|jpg:image/jpeg|webp:image/webp) ;;
      *) echo "[restore.sh ERROR] A restored Product Image has mismatched media metadata." >&2; exit 1 ;;
    esac
    if [ "${actual_size}" != "${expected_size}" ]; then
      echo "[restore.sh ERROR] A restored Product Image has an invalid file size." >&2
      exit 1
    fi
  done < "${STAGE_DIR}/restored-product-image-references.tsv"

  GROOMING_PHOTO_TABLE_COUNT="$(mysql --defaults-extra-file="${MYSQL_CREDENTIALS_FILE}" "${DB_NAME}" \
    --batch --skip-column-names \
    -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'grooming_photos';")"
  if [[ ! "${GROOMING_PHOTO_TABLE_COUNT}" =~ ^[01]$ ]]; then
    echo "[restore.sh ERROR] Could not determine whether grooming_photos exists after restore." >&2
    exit 1
  fi
  : > "${STAGE_DIR}/restored-grooming-photo-references.tsv"
  if [ "${GROOMING_PHOTO_TABLE_COUNT}" = "1" ]; then
    mysql --defaults-extra-file="${MYSQL_CREDENTIALS_FILE}" -D "${DB_NAME}" \
      -N -B -e "SELECT storage_key, file_size, mime_type FROM grooming_photos ORDER BY storage_key;" \
      > "${STAGE_DIR}/restored-grooming-photo-references.tsv"
  fi
  while IFS=$'\t' read -r storage_key expected_size mime_type; do
    [ -n "${storage_key}" ] || continue
    image_path="${GROOMING_PHOTO_STORAGE_ROOT}/${storage_key}"
    if [[ ! "${storage_key}" =~ ^[a-f0-9]{32}\.(png|jpg|webp)$ ]] \
      || [ ! -f "${image_path}" ] || [ -L "${image_path}" ]; then
      echo "[restore.sh ERROR] A restored Grooming Photo reference is missing or unsafe." >&2
      exit 1
    fi
    actual_size="$(wc -c < "${image_path}" | tr -d ' ')"
    case "${storage_key##*.}:${mime_type}" in
      png:image/png|jpg:image/jpeg|webp:image/webp) ;;
      *) echo "[restore.sh ERROR] A restored Grooming Photo has mismatched media metadata." >&2; exit 1 ;;
    esac
    if [ "${actual_size}" != "${expected_size}" ]; then
      echo "[restore.sh ERROR] A restored Grooming Photo has an invalid file size." >&2
      exit 1
    fi
  done < "${STAGE_DIR}/restored-grooming-photo-references.tsv"
fi

if [ "${HAS_MEDIA}" -eq 1 ]; then
  : > "${STAGE_DIR}/restored-MEDIA_MANIFEST.tsv"
  RESTORED_MEDIA_ROOTS=("${SHOP_LOGO_STORAGE_ROOT}" "${PORTAL_BACKGROUND_STORAGE_ROOT}")
  if [ "${HAS_EXTENDED_MEDIA}" -eq 1 ]; then
    RESTORED_MEDIA_ROOTS+=("${GROOMING_PHOTO_STORAGE_ROOT}" "${PRODUCT_IMAGE_STORAGE_ROOT}")
  fi
  while IFS= read -r media_file; do
    for media_root in "${RESTORED_MEDIA_ROOTS[@]}"; do
      relative_media_file="${media_file#${media_root}/}"
      if [ "${relative_media_file}" != "${media_file}" ]; then
        printf '%s/%s\t%s\t%s\n' "${media_root##*/}" "${relative_media_file}" \
          "$(wc -c < "${media_file}" | tr -d ' ')" \
          "$(sha256sum "${media_file}" | cut -d' ' -f1)" >> "${STAGE_DIR}/restored-MEDIA_MANIFEST.tsv"
        break
      fi
    done
  done < <(find "${RESTORED_MEDIA_ROOTS[@]}" -type f | sort)
  sort -o "${STAGE_DIR}/restored-MEDIA_MANIFEST.tsv" "${STAGE_DIR}/restored-MEDIA_MANIFEST.tsv"
  if ! cmp -s "${STAGE_DIR}/MEDIA_MANIFEST.tsv" "${STAGE_DIR}/restored-MEDIA_MANIFEST.tsv"; then
    echo "[restore.sh ERROR] Restored media files do not match the verified media manifest." >&2
    exit 1
  fi
fi

if [ -d "${OLD_CONTRACTS}" ]; then
  rm -rf -- "${OLD_CONTRACTS}"
fi
if [ "${HAS_MEDIA}" -eq 1 ]; then
  rm -rf -- "${OLD_LOGOS}" "${OLD_BACKGROUNDS}"
fi
if [ "${HAS_EXTENDED_MEDIA}" -eq 1 ]; then
  rm -rf -- "${OLD_GROOMING_PHOTOS}" "${OLD_PRODUCT_IMAGES}"
fi
echo "[restore.sh SUCCESS] Database, ${PDF_COUNT} Contract PDF file(s), and ${MEDIA_COUNT} uploaded media file(s) restored and verified."
