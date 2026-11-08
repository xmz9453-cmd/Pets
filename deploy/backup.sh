#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${DEPLOY_DIR}/.." && pwd)"
source "${DEPLOY_DIR}/lib/app-env.sh"
source "${DEPLOY_DIR}/lib/backup-maintenance.sh"
source "${DEPLOY_DIR}/lib/mysql-client.sh"
BACKUP_DIR="${BACKUP_DIR:-/home/zhe/pets-backups}"
TIMESTAMP="$(TZ=Asia/Taipei date +'%Y%m%d_%H%M%S')"
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

if [ -z "${APP_COMMIT:-}" ]; then
  if [ -n "$(git -C "${PROJECT_ROOT}" status --porcelain)" ]; then
    echo "[backup.sh ERROR] Application source must have a clean Git working tree before backup." >&2
    exit 1
  fi
  APP_COMMIT="$(git -C "${PROJECT_ROOT}" rev-parse HEAD)"
fi
if [[ ! "${APP_COMMIT}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "[backup.sh ERROR] APP_COMMIT must be a 40-character lowercase Git commit SHA." >&2
  exit 1
fi

if [ -z "${CONTRACT_STORAGE_ROOT}" ] || [ ! -d "${CONTRACT_STORAGE_ROOT}" ] || [ -L "${CONTRACT_STORAGE_ROOT}" ]; then
  echo "[backup.sh ERROR] CONTRACT_STORAGE_ROOT must identify an existing contract storage directory." >&2
  exit 1
fi
MEDIA_PARENT="$(dirname "${CONTRACT_STORAGE_ROOT}")"
SHOP_LOGO_STORAGE_ROOT="${SHOP_LOGO_STORAGE_ROOT:-${MEDIA_PARENT}/shop-logos}"
PORTAL_BACKGROUND_STORAGE_ROOT="${PORTAL_BACKGROUND_STORAGE_ROOT:-${MEDIA_PARENT}/portal-backgrounds}"
GROOMING_PHOTO_STORAGE_ROOT="${GROOMING_PHOTO_STORAGE_ROOT:-${MEDIA_PARENT}/grooming-photos}"
PRODUCT_IMAGE_STORAGE_ROOT="${PRODUCT_IMAGE_STORAGE_ROOT:-${MEDIA_PARENT}/product-images}"

ensure_media_root() {
  local root="$1" label="$2"
  mkdir -p -- "${root}"
  if [ -L "${root}" ] || [ ! -d "${root}" ]; then
    echo "[backup.sh ERROR] ${label} storage root must be a real directory, not a symbolic link." >&2
    exit 1
  fi
  if find "${root}" -type l -print -quit | grep -q .; then
    echo "[backup.sh ERROR] ${label} storage must not contain symbolic links." >&2
    exit 1
  fi
}

ensure_media_root "${SHOP_LOGO_STORAGE_ROOT}" "Shop Logo"
ensure_media_root "${PORTAL_BACKGROUND_STORAGE_ROOT}" "Portal Background"
ensure_media_root "${GROOMING_PHOTO_STORAGE_ROOT}" "Grooming Photo"
ensure_media_root "${PRODUCT_IMAGE_STORAGE_ROOT}" "Product Image"

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
  echo "[backup.sh ERROR] Contract and media storage roots must be different directories." >&2
  exit 1
fi

umask 077
mkdir -p "${BACKUP_DIR}"
if [ -L "${BACKUP_DIR}" ] || [ ! -d "${BACKUP_DIR}" ]; then
  echo "[backup.sh ERROR] Backup destination must be a real directory, not a symbolic link." >&2
  exit 1
fi

STAGE_DIR="$(mktemp -d "${BACKUP_DIR}/.pets-backup.XXXXXX")"
ARCHIVE_TMP="${BACKUP_DIR}/.pets_backup_${TIMESTAMP}.tar.gz.tmp"
BACKUP_FILE="${BACKUP_DIR}/pets_backup_${TIMESTAMP}.tar.gz"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
CHECKSUM_TMP="${BACKUP_DIR}/.pets_backup_${TIMESTAMP}.sha256.tmp"
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
  rm -f -- "${ARCHIVE_TMP}" "${CHECKSUM_TMP}"
}
trap cleanup EXIT
chmod 700 "${STAGE_DIR}"
MYSQL_CREDENTIALS_FILE="${STAGE_DIR}/mysql-client.cnf"
if ! write_mysql_client_defaults "${MYSQL_CREDENTIALS_FILE}"; then
  echo "[backup.sh ERROR] Could not create a private MySQL client option file." >&2
  exit 1
fi

if [ -e "${BACKUP_FILE}" ] || [ -L "${BACKUP_FILE}" ] \
  || [ -e "${CHECKSUM_FILE}" ] || [ -L "${CHECKSUM_FILE}" ] \
  || [ -e "${ARCHIVE_TMP}" ] || [ -L "${ARCHIVE_TMP}" ] \
  || [ -e "${CHECKSUM_TMP}" ] || [ -L "${CHECKSUM_TMP}" ]; then
  echo "[backup.sh ERROR] Backup archive or checksum output already exists." >&2
  exit 1
fi

mkdir -p "${STAGE_DIR}/pdf-root/contract-versions" \
  "${STAGE_DIR}/media/shop-logos" "${STAGE_DIR}/media/portal-backgrounds" \
  "${STAGE_DIR}/media/grooming-photos" "${STAGE_DIR}/media/product-images"
SYMLINK_LIST="${STAGE_DIR}/contract-storage-symlinks.txt"
if ! find "${CONTRACT_STORAGE_ROOT}" -type l -print > "${SYMLINK_LIST}"; then
  echo "[backup.sh ERROR] Could not scan Contract PDF storage for symbolic links." >&2
  exit 1
fi
if [ -s "${SYMLINK_LIST}" ]; then
  echo "[backup.sh ERROR] Contract storage must not contain symbolic links." >&2
  exit 1
fi

coproc PDF_STORAGE_LOCK {
  mysql --defaults-extra-file="${MYSQL_CREDENTIALS_FILE}" \
    --batch --skip-column-names --unbuffered "${DB_NAME}"
}
LOCK_PID="${PDF_STORAGE_LOCK_PID}"
LOCK_READ_FD="${PDF_STORAGE_LOCK[0]}"
LOCK_WRITE_FD="${PDF_STORAGE_LOCK[1]}"
printf "SELECT GET_LOCK('pets_media_backup', 30);\n" >&"${LOCK_WRITE_FD}"
if ! IFS= read -r -t 35 LOCK_RESULT <&"${LOCK_READ_FD}" || [ "${LOCK_RESULT}" != "1" ]; then
  echo "[backup.sh ERROR] Could not acquire the Contract PDF storage backup lock." >&2
  exit 1
fi

if ! mysqldump --defaults-extra-file="${MYSQL_CREDENTIALS_FILE}" \
  --single-transaction --quick --lock-tables=false --no-tablespaces "${DB_NAME}" \
  | gzip -9 > "${STAGE_DIR}/database.sql.gz"; then
  echo "[backup.sh ERROR] Database dump failed." >&2
  exit 1
fi
gzip -t "${STAGE_DIR}/database.sql.gz"

CONTRACT_TABLE_COUNT="$(mysql --defaults-extra-file="${MYSQL_CREDENTIALS_FILE}" "${DB_NAME}" \
  --batch --skip-column-names \
  -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'contract_versions';")"
if [[ ! "${CONTRACT_TABLE_COUNT}" =~ ^[01]$ ]]; then
  echo "[backup.sh ERROR] Could not determine whether contract_versions exists." >&2
  exit 1
fi

if [ "${CONTRACT_TABLE_COUNT}" = "1" ]; then
  mysql --defaults-extra-file="${MYSQL_CREDENTIALS_FILE}" "${DB_NAME}" \
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
if [ -d "${CONTRACT_STORAGE_ROOT}/contract-versions" ]; then
  stored_pdf_count="$(find "${CONTRACT_STORAGE_ROOT}/contract-versions" -type f -name '*.pdf' | wc -l | tr -d ' ')"
  referenced_pdf_count="$(find "${STAGE_DIR}/pdf-root/contract-versions" -type f -name '*.pdf' | wc -l | tr -d ' ')"
  if [ "${stored_pdf_count}" -gt "${referenced_pdf_count}" ]; then
    echo "[backup.sh WARNING] Unreferenced PDF files were excluded from the database-consistent backup."
  fi
fi

copy_media_files() {
  local source_root="$1" media_name="$2" max_size="$3" source_file storage_key target_file size hash
  for source_file in "${source_root}"/* "${source_root}"/.[!.]* "${source_root}"/..?*; do
    [ -e "${source_file}" ] || [ -L "${source_file}" ] || continue
    storage_key="${source_file##*/}"
    if [ "${storage_key}" = ".tmp" ] && [ -d "${source_file}" ]; then
      continue
    fi
    if [ ! -f "${source_file}" ] || [ -L "${source_file}" ]; then
      echo "[backup.sh ERROR] ${media_name} storage contains an unexpected directory or file." >&2
      return 1
    fi
    if [[ ! "${storage_key}" =~ ^[a-f0-9]{32}\.(png|jpg|webp)$ ]]; then
      echo "[backup.sh ERROR] ${media_name} storage contains an invalid storage key." >&2
      return 1
    fi
    size="$(wc -c < "${source_file}" | tr -d ' ')"
    if [ "${size}" -le 0 ] || [ "${size}" -gt "${max_size}" ]; then
      echo "[backup.sh ERROR] ${media_name} storage contains an invalid file size." >&2
      return 1
    fi
    target_file="${STAGE_DIR}/media/${media_name}/${storage_key}"
    cp -- "${source_file}" "${target_file}"
    chmod 600 "${target_file}"
    hash="$(sha256sum "${target_file}" | cut -d' ' -f1)"
    printf '%s/%s\t%s\t%s\n' "${media_name}" "${storage_key}" "${size}" "${hash}" \
      >> "${STAGE_DIR}/MEDIA_MANIFEST.tsv"
  done
}

: > "${STAGE_DIR}/MEDIA_MANIFEST.tsv"
if ! copy_media_files "${SHOP_LOGO_STORAGE_ROOT}" shop-logos 2097152 \
  || ! copy_media_files "${PORTAL_BACKGROUND_STORAGE_ROOT}" portal-backgrounds 10485760 \
  || ! copy_media_files "${GROOMING_PHOTO_STORAGE_ROOT}" grooming-photos 2097152 \
  || ! copy_media_files "${PRODUCT_IMAGE_STORAGE_ROOT}" product-images 2097152; then
  exit 1
fi
sort -o "${STAGE_DIR}/MEDIA_MANIFEST.tsv" "${STAGE_DIR}/MEDIA_MANIFEST.tsv"

SHOP_LOGO_COLUMN_COUNT="$(mysql --defaults-extra-file="${MYSQL_CREDENTIALS_FILE}" "${DB_NAME}" \
  --batch --skip-column-names \
  -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'shop_settings' AND column_name = 'logo_storage_key';")"
if [[ ! "${SHOP_LOGO_COLUMN_COUNT}" =~ ^[01]$ ]]; then
  echo "[backup.sh ERROR] Could not determine whether shop_settings.logo_storage_key exists." >&2
  exit 1
fi

: > "${STAGE_DIR}/database-logo-references.txt"
if [ "${SHOP_LOGO_COLUMN_COUNT}" = "1" ]; then
  mysql --defaults-extra-file="${MYSQL_CREDENTIALS_FILE}" "${DB_NAME}" \
    --batch --skip-column-names \
    -e "SELECT logo_storage_key FROM shop_settings WHERE logo_storage_key IS NOT NULL ORDER BY logo_storage_key;" \
    > "${STAGE_DIR}/database-logo-references.txt"
else
  echo "[backup.sh] shop_settings.logo_storage_key is absent; preserving Logo files without database-reference checks for this legacy schema."
fi
while IFS= read -r storage_key; do
  [ -n "${storage_key}" ] || continue
  if [[ ! "${storage_key}" =~ ^[a-f0-9]{32}\.(png|jpg|webp)$ ]] \
    || [ ! -f "${STAGE_DIR}/media/shop-logos/${storage_key}" ]; then
    echo "[backup.sh ERROR] A database-referenced Shop Logo is missing or unsafe." >&2
    exit 1
  fi
done < "${STAGE_DIR}/database-logo-references.txt"

BACKGROUND_COLUMN_COUNT="$(mysql --defaults-extra-file="${MYSQL_CREDENTIALS_FILE}" "${DB_NAME}" \
  --batch --skip-column-names \
  -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'portal_backgrounds' AND column_name IN ('storage_key', 'file_size', 'mime_type');")"
if [[ ! "${BACKGROUND_COLUMN_COUNT}" =~ ^(0|3)$ ]]; then
  echo "[backup.sh ERROR] Portal Background schema is incomplete; expected all required reference columns or none." >&2
  exit 1
fi

: > "${STAGE_DIR}/database-background-references.tsv"
if [ "${BACKGROUND_COLUMN_COUNT}" = "3" ]; then
  mysql --defaults-extra-file="${MYSQL_CREDENTIALS_FILE}" "${DB_NAME}" \
    --batch --skip-column-names \
    -e "SELECT storage_key, file_size, mime_type FROM portal_backgrounds ORDER BY storage_key;" \
    > "${STAGE_DIR}/database-background-references.tsv"
else
  echo "[backup.sh] portal_backgrounds reference columns are absent; preserving Background files without database-reference checks for this legacy schema."
fi
while IFS=$'\t' read -r storage_key expected_size mime_type; do
  [ -n "${storage_key}" ] || continue
  if [[ ! "${storage_key}" =~ ^[a-f0-9]{32}\.(png|jpg|webp)$ ]] \
    || [ ! -f "${STAGE_DIR}/media/portal-backgrounds/${storage_key}" ]; then
    echo "[backup.sh ERROR] A database-referenced Portal Background is missing or unsafe." >&2
    exit 1
  fi
  actual_size="$(wc -c < "${STAGE_DIR}/media/portal-backgrounds/${storage_key}" | tr -d ' ')"
  case "${storage_key##*.}:${mime_type}" in
    png:image/png|jpg:image/jpeg|webp:image/webp) ;;
    *) echo "[backup.sh ERROR] A Portal Background has mismatched media metadata." >&2; exit 1 ;;
  esac
  if [ "${actual_size}" != "${expected_size}" ]; then
    echo "[backup.sh ERROR] A database-referenced Portal Background has an invalid file size." >&2
    exit 1
  fi
done < "${STAGE_DIR}/database-background-references.tsv"

PRODUCT_IMAGE_COLUMN_COUNT="$(mysql --defaults-extra-file="${MYSQL_CREDENTIALS_FILE}" "${DB_NAME}" \
  --batch --skip-column-names \
  -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name IN ('image_storage_key', 'image_file_size', 'image_mime_type');")"
if [[ ! "${PRODUCT_IMAGE_COLUMN_COUNT}" =~ ^(0|3)$ ]]; then
  echo "[backup.sh ERROR] Product Image schema is incomplete; expected all required reference columns or none." >&2
  exit 1
fi
: > "${STAGE_DIR}/database-product-image-references.tsv"
if [ "${PRODUCT_IMAGE_COLUMN_COUNT}" = "3" ]; then
  mysql --defaults-extra-file="${MYSQL_CREDENTIALS_FILE}" "${DB_NAME}" \
    --batch --skip-column-names \
    -e "SELECT image_storage_key, image_file_size, image_mime_type FROM products WHERE image_storage_key IS NOT NULL ORDER BY image_storage_key;" \
    > "${STAGE_DIR}/database-product-image-references.tsv"
fi
while IFS=$'\t' read -r storage_key expected_size mime_type; do
  [ -n "${storage_key}" ] || continue
  image_path="${STAGE_DIR}/media/product-images/${storage_key}"
  if [[ ! "${storage_key}" =~ ^[a-f0-9]{32}\.(png|jpg|webp)$ ]] \
    || [ ! -f "${image_path}" ] || [ -L "${image_path}" ]; then
    echo "[backup.sh ERROR] A database-referenced Product Image is missing or unsafe." >&2
    exit 1
  fi
  actual_size="$(wc -c < "${image_path}" | tr -d ' ')"
  case "${storage_key##*.}:${mime_type}" in
    png:image/png|jpg:image/jpeg|webp:image/webp) ;;
    *) echo "[backup.sh ERROR] A Product Image has mismatched media metadata." >&2; exit 1 ;;
  esac
  if [ "${actual_size}" != "${expected_size}" ]; then
    echo "[backup.sh ERROR] A database-referenced Product Image has an invalid file size." >&2
    exit 1
  fi
done < "${STAGE_DIR}/database-product-image-references.tsv"

GROOMING_PHOTO_TABLE_COUNT="$(mysql --defaults-extra-file="${MYSQL_CREDENTIALS_FILE}" "${DB_NAME}" \
  --batch --skip-column-names \
  -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'grooming_photos';")"
if [[ ! "${GROOMING_PHOTO_TABLE_COUNT}" =~ ^[01]$ ]]; then
  echo "[backup.sh ERROR] Could not determine whether grooming_photos exists." >&2
  exit 1
fi
: > "${STAGE_DIR}/database-grooming-photo-references.tsv"
if [ "${GROOMING_PHOTO_TABLE_COUNT}" = "1" ]; then
  mysql --defaults-extra-file="${MYSQL_CREDENTIALS_FILE}" "${DB_NAME}" \
    --batch --skip-column-names \
    -e "SELECT storage_key, file_size, mime_type FROM grooming_photos ORDER BY storage_key;" \
    > "${STAGE_DIR}/database-grooming-photo-references.tsv"
fi
while IFS=$'\t' read -r storage_key expected_size mime_type; do
  [ -n "${storage_key}" ] || continue
  image_path="${STAGE_DIR}/media/grooming-photos/${storage_key}"
  if [[ ! "${storage_key}" =~ ^[a-f0-9]{32}\.(png|jpg|webp)$ ]] \
    || [ ! -f "${image_path}" ] || [ -L "${image_path}" ]; then
    echo "[backup.sh ERROR] A database-referenced Grooming Photo is missing or unsafe." >&2
    exit 1
  fi
  actual_size="$(wc -c < "${image_path}" | tr -d ' ')"
  case "${storage_key##*.}:${mime_type}" in
    png:image/png|jpg:image/jpeg|webp:image/webp) ;;
    *) echo "[backup.sh ERROR] A Grooming Photo has mismatched media metadata." >&2; exit 1 ;;
  esac
  if [ "${actual_size}" != "${expected_size}" ]; then
    echo "[backup.sh ERROR] A database-referenced Grooming Photo has an invalid file size." >&2
    exit 1
  fi
done < "${STAGE_DIR}/database-grooming-photo-references.tsv"

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
  printf 'format=pets-contract-backup-v3\n'
  printf 'timestamp=%s\n' "${TIMESTAMP}"
  printf 'database=%s\n' "${DB_NAME}"
  printf 'app_commit=%s\n' "${APP_COMMIT}"
  printf 'pdf_count=%s\n' "$(find "${STAGE_DIR}/pdf-root/contract-versions" -type f -name '*.pdf' | wc -l | tr -d ' ')"
  printf 'media_count=%s\n' "$(wc -l < "${STAGE_DIR}/MEDIA_MANIFEST.tsv" | tr -d ' ')"
} > "${STAGE_DIR}/manifest.txt"

tar -czf "${STAGE_DIR}/media-files.tar.gz" -C "${STAGE_DIR}/media" \
  shop-logos portal-backgrounds grooming-photos product-images
(
  cd "${STAGE_DIR}"
  sha256sum database.sql.gz contract-pdfs.tar.gz PDF_MANIFEST.tsv media-files.tar.gz MEDIA_MANIFEST.tsv manifest.txt > SHA256SUMS
)
chmod 600 "${STAGE_DIR}/database.sql.gz" "${STAGE_DIR}/contract-pdfs.tar.gz" \
  "${STAGE_DIR}/PDF_MANIFEST.tsv" "${STAGE_DIR}/media-files.tar.gz" \
  "${STAGE_DIR}/MEDIA_MANIFEST.tsv" "${STAGE_DIR}/manifest.txt" "${STAGE_DIR}/SHA256SUMS"
tar -czf "${ARCHIVE_TMP}" -C "${STAGE_DIR}" \
  database.sql.gz contract-pdfs.tar.gz PDF_MANIFEST.tsv media-files.tar.gz MEDIA_MANIFEST.tsv manifest.txt SHA256SUMS
chmod 600 "${ARCHIVE_TMP}"
gzip -t "${ARCHIVE_TMP}"
tar -tzf "${ARCHIVE_TMP}" | sort > "${STAGE_DIR}/archive-contents.txt"
printf '%s\n' PDF_MANIFEST.tsv SHA256SUMS contract-pdfs.tar.gz database.sql.gz manifest.txt media-files.tar.gz MEDIA_MANIFEST.tsv \
  | sort > "${STAGE_DIR}/expected-contents.txt"
if ! cmp -s "${STAGE_DIR}/archive-contents.txt" "${STAGE_DIR}/expected-contents.txt"; then
  echo "[backup.sh ERROR] Backup archive contents failed verification." >&2
  exit 1
fi
if ! publish_backup_bundle "${BACKUP_DIR}" "${ARCHIVE_TMP}" "${BACKUP_FILE}" "${CHECKSUM_TMP}"; then
  exit 1
fi

remove_expired_backup_bundles "${BACKUP_DIR}"
if [ ! -f "${BACKUP_FILE}" ] || [ -L "${BACKUP_FILE}" ] ||
   [ ! -f "${CHECKSUM_FILE}" ] || [ -L "${CHECKSUM_FILE}" ] ||
   ! (cd "${BACKUP_DIR}" && sha256sum --check --status "$(basename "${CHECKSUM_FILE}")"); then
  echo "[backup.sh ERROR] Published backup bundle is missing or failed final checksum verification." >&2
  exit 1
fi
echo "[backup.sh SUCCESS] Verified database, Contract PDFs, Shop Logos, and Portal Backgrounds for ${APP_COMMIT}: ${BACKUP_FILE}"
echo "BACKUP_FILE=${BACKUP_FILE}"
