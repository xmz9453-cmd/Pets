#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "${DEPLOY_DIR}/lib/state.sh"
source "${DEPLOY_DIR}/lib/app-env.sh"
source "${DEPLOY_DIR}/lib/backup-maintenance.sh"
source "${DEPLOY_DIR}/lib/mysql-client.sh"
source "${DEPLOY_DIR}/lib/install-paths.sh"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf -- "${TMP_DIR}"' EXIT

STATE_FILE="${TMP_DIR}/deployment.state"
mkdir -p "${TMP_DIR}/logs"
cat > "${STATE_FILE}" <<EOF
status=SUCCESS
commit=0123456789abcdef0123456789abcdef01234567
previous_commit=NONE
timestamp=2026-10-20T12:00:00+08:00
backup=/home/zhe/pets-backups/pets_backup_20261020_120000.tar.gz
verification=PASS
log_file=${TMP_DIR}/logs/deploy-20261020-120000.log
verified_at=2026-10-20T12:10:00+08:00
EOF
if ! read_deployment_state "${STATE_FILE}" || [[ "${DEPLOY_STATE[status]}" != SUCCESS ]]; then
  echo 'FAIL: valid deployment state rejected' >&2
  exit 1
fi

MARKER="${TMP_DIR}/state-command-ran"
sed "s|status=SUCCESS|status=\$(touch ${MARKER})|" "${STATE_FILE}" > "${TMP_DIR}/malicious.state"
if read_deployment_state "${TMP_DIR}/malicious.state" || [[ -e "${MARKER}" ]]; then
  echo 'FAIL: malicious state was accepted or executed' >&2
  exit 1
fi

printf 'status=SUCCESS\nstatus=FAILED\n' > "${TMP_DIR}/duplicate.state"
if read_deployment_state "${TMP_DIR}/duplicate.state"; then
  echo 'FAIL: duplicate state fields were accepted' >&2
  exit 1
fi

ENV_FILE="${TMP_DIR}/.env"
cat > "${ENV_FILE}" <<EOF
DB_HOST=localhost
DB_PORT=3306
DB_NAME=psop_one
DB_USER=backup-user
DB_PASSWORD=\$(touch ${TMP_DIR}/env-command-ran)
CONTRACT_STORAGE_ROOT="${TMP_DIR}/contract files"
UNUSED_VALUE=ignored
EOF
load_deployment_env "${ENV_FILE}"
if [[ "${DB_PASSWORD}" != "\$(touch ${TMP_DIR}/env-command-ran)" || -e "${TMP_DIR}/env-command-ran" ]]; then
  echo 'FAIL: .env value was executed or altered' >&2
  exit 1
fi
if [[ "${CONTRACT_STORAGE_ROOT}" != "${TMP_DIR}/contract files" || "${UNUSED_VALUE:-}" != '' ]]; then
  echo 'FAIL: .env allowlist or quoted value parsing failed' >&2
  exit 1
fi

DB_HOST='db host'
DB_PORT='3307'
DB_USER='user"name'
DB_PASSWORD='p#ass\\word"value'
MYSQL_OPTION_FILE="${TMP_DIR}/mysql-client.cnf"
if ! write_mysql_client_defaults "${MYSQL_OPTION_FILE}" ||
   [[ "$(stat -c '%a' "${MYSQL_OPTION_FILE}")" != 600 ]] ||
   ! grep -Fqx 'host="db host"' "${MYSQL_OPTION_FILE}" ||
   ! grep -Fqx 'user="user\"name"' "${MYSQL_OPTION_FILE}" ||
   ! grep -Fqx 'password="p#ass\\\\word\"value"' "${MYSQL_OPTION_FILE}"; then
  echo 'FAIL: MySQL credentials were not safely quoted in a mode-600 option file' >&2
  exit 1
fi
if rg -n 'MYSQL_PWD' "${DEPLOY_DIR}/backup.sh" "${DEPLOY_DIR}/restore.sh" >/dev/null; then
  echo 'FAIL: backup or restore still uses MYSQL_PWD' >&2
  exit 1
fi

PATH_PROJECT="${TMP_DIR}/project"
mkdir -p "${PATH_PROJECT}"
if ! validate_install_paths "${PATH_PROJECT}" "${TMP_DIR}/backup" "${TMP_DIR}/state"; then
  echo 'FAIL: installer rejected disjoint private subdirectories' >&2
  exit 1
fi
if validate_install_paths "${PATH_PROJECT}" "${PATH_PROJECT}/backups" "${TMP_DIR}/state" >/dev/null 2>&1 ||
   validate_install_paths "${PATH_PROJECT}" "${TMP_DIR}/shared" "${TMP_DIR}/shared/state" >/dev/null 2>&1; then
  echo 'FAIL: installer accepted overlapping project, backup, or state paths' >&2
  exit 1
fi
PRIVATE_DIR="${TMP_DIR}/private-dir"
ensure_private_owned_directory "${PRIVATE_DIR}"
if [[ "$(stat -c '%a' "${PRIVATE_DIR}")" != 700 ]]; then
  echo 'FAIL: a newly created installer directory is not mode 700' >&2
  exit 1
fi
WIDE_DIR="${TMP_DIR}/wide-dir"
mkdir "${WIDE_DIR}"
stat() {
  if [[ "$2" == '%a' && "$4" == "${WIDE_DIR}" ]]; then
    printf '755\n'
  else
    command stat "$@"
  fi
}
if ensure_private_owned_directory "${WIDE_DIR}" >/dev/null 2>&1 ||
   [[ "$(command stat -c '%a' "${WIDE_DIR}")" != 700 ]]; then
  echo 'FAIL: installer accepted a broad existing directory or changed its permissions' >&2
  exit 1
fi
unset -f stat
printf 'DB_NAME=portable_name\r\n' > "${TMP_DIR}/windows.env"
load_deployment_env "${TMP_DIR}/windows.env"
if [[ "${DB_NAME}" != portable_name ]]; then
  echo 'FAIL: CRLF .env parsing failed' >&2
  exit 1
fi

RETENTION_DIR="${TMP_DIR}/backup-retention"
mkdir -p "${RETENTION_DIR}"
touch "${RETENTION_DIR}/pets_backup_20260101_010101.tar.gz" \
  "${RETENTION_DIR}/pets_backup_20260101_010101.tar.gz.sha256" \
  "${RETENTION_DIR}/pets_backup_old.tar.gz" \
  "${RETENTION_DIR}/pets_backup_20261020_010101.tar.gz"
touch -d '40 days ago' "${RETENTION_DIR}/pets_backup_20260101_010101.tar.gz" \
  "${RETENTION_DIR}/pets_backup_20260101_010101.tar.gz.sha256" \
  "${RETENTION_DIR}/pets_backup_old.tar.gz"
remove_expired_backup_bundles "${RETENTION_DIR}"
if [[ -e "${RETENTION_DIR}/pets_backup_20260101_010101.tar.gz" ||
      -e "${RETENTION_DIR}/pets_backup_20260101_010101.tar.gz.sha256" ||
      ! -e "${RETENTION_DIR}/pets_backup_old.tar.gz" ||
      ! -e "${RETENTION_DIR}/pets_backup_20261020_010101.tar.gz" ]]; then
  echo 'FAIL: backup retention removed the wrong files or kept an expired matching bundle' >&2
  exit 1
fi

TEST_STATE_DIR="${TMP_DIR}/state-dir"
mkdir -p "${TMP_DIR}/bin"
cat > "${TMP_DIR}/bin/flock" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod +x "${TMP_DIR}/bin/flock"
mkdir -p "${TEST_STATE_DIR}/logs"
TEST_LOG="${TEST_STATE_DIR}/logs/deploy-20261020-120000.log"
touch "${TEST_LOG}"
cat > "${TEST_STATE_DIR}/deployment.state" <<EOF
status=DEPLOYED
commit=0123456789abcdef0123456789abcdef01234567
previous_commit=NONE
timestamp=2026-10-20T12:00:00+08:00
backup=/home/zhe/pets-backups/pets_backup_20261020_120000.tar.gz
verification=pending
log_file=${TEST_LOG}
EOF
printf 'CONFIRM\n' | PATH="${TMP_DIR}/bin:${PATH}" STATE_DIR="${TEST_STATE_DIR}" bash "${DEPLOY_DIR}/confirm.sh" >/dev/null
if ! grep -qx 'status=SUCCESS' "${TEST_STATE_DIR}/deployment.state" ||
   ! grep -qx 'verification=PASS' "${TEST_STATE_DIR}/deployment.state"; then
  echo 'FAIL: local confirmation flow did not update the fixture state' >&2
  exit 1
fi

printf 'status=FAILED\n' > "${TEST_STATE_DIR}/deployment.state"
printf 'CLEAR_STATE\n' | PATH="${TMP_DIR}/bin:${PATH}" STATE_DIR="${TEST_STATE_DIR}" bash "${DEPLOY_DIR}/clear-state.sh" >/dev/null
if [[ -e "${TEST_STATE_DIR}/deployment.state" ]]; then
  echo 'FAIL: confirmed local failed-state cleanup did not clear the fixture' >&2
  exit 1
fi

RESTORE_ROOT="${TMP_DIR}/restore-fixture"
mkdir -p "${RESTORE_ROOT}/deploy/lib" "${RESTORE_ROOT}/contract-storage"
cp "${DEPLOY_DIR}/restore.sh" "${RESTORE_ROOT}/deploy/restore.sh"
cp "${DEPLOY_DIR}/lib/app-env.sh" "${RESTORE_ROOT}/deploy/lib/app-env.sh"
cp "${DEPLOY_DIR}/lib/mysql-client.sh" "${RESTORE_ROOT}/deploy/lib/mysql-client.sh"
printf 'CONTRACT_STORAGE_ROOT="%s"\n' "${RESTORE_ROOT}/contract-storage" > "${RESTORE_ROOT}/.env"
python - "${TMP_DIR}" <<'PY'
import gzip, hashlib, io, pathlib, sys, tarfile
root = pathlib.Path(sys.argv[1])
names = ['PDF_MANIFEST.tsv', 'SHA256SUMS', 'contract-pdfs.tar.gz', 'database.sql.gz', 'manifest.txt']
with tarfile.open(root / 'symlink-bundle.tar.gz', 'w:gz') as archive:
    for name in names:
        info = tarfile.TarInfo(name)
        if name == 'manifest.txt':
            info.type = tarfile.SYMTYPE
            info.linkname = '/outside/manifest.txt'
            archive.addfile(info)
        else:
            data = b''
            info.size = len(data)
            archive.addfile(info, io.BytesIO(data))

pdf_stream = io.BytesIO()
with tarfile.open(fileobj=pdf_stream, mode='w:gz') as pdf_archive:
    directory = tarfile.TarInfo('contract-versions/')
    directory.type = tarfile.DIRTYPE
    pdf_archive.addfile(directory)
    link = tarfile.TarInfo('contract-versions/0123456789abcdef0123456789abcdef.pdf')
    link.type = tarfile.SYMTYPE
    link.linkname = '/outside/file.pdf'
    pdf_archive.addfile(link)
files = {
    'PDF_MANIFEST.tsv': b'',
    'contract-pdfs.tar.gz': pdf_stream.getvalue(),
    'database.sql.gz': gzip.compress(b''),
    'manifest.txt': b'format=pets-contract-backup-v1\ntimestamp=20261020_120000\ndatabase=psop_one\npdf_count=0\n',
}
checksums = ''.join(f"{hashlib.sha256(files[name]).hexdigest()}  {name}\n"
                   for name in ['database.sql.gz', 'contract-pdfs.tar.gz', 'PDF_MANIFEST.tsv', 'manifest.txt'])
files['SHA256SUMS'] = checksums.encode()
with tarfile.open(root / 'pdf-symlink-bundle.tar.gz', 'w:gz') as archive:
    for name in names:
        info = tarfile.TarInfo(name)
        data = files[name]
        info.size = len(data)
        archive.addfile(info, io.BytesIO(data))
PY
RESTORE_OUTPUT="$(bash "${RESTORE_ROOT}/deploy/restore.sh" "${TMP_DIR}/symlink-bundle.tar.gz" 2>&1 || true)"
if [[ "${RESTORE_OUTPUT}" != *'non-regular or duplicate archive member'* ]]; then
  echo 'FAIL: restore accepted an archive containing a symbolic link or rejected it for an unexpected reason' >&2
  exit 1
fi

RESTORE_OUTPUT="$(bash "${RESTORE_ROOT}/deploy/restore.sh" "${TMP_DIR}/pdf-symlink-bundle.tar.gz" 2>&1 || true)"
if [[ "${RESTORE_OUTPUT}" != *'non-regular or unexpected member'* ]]; then
  echo 'FAIL: restore accepted a PDF archive containing a symbolic link or rejected it for an unexpected reason' >&2
  exit 1
fi

echo 'PASS: state/env parsing, private MySQL credentials, installer path safety, backup retention, confirmation fixtures, lock flow, and unsafe archive rejection'
