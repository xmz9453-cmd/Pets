#!/usr/bin/env bash
set -euo pipefail
umask 077

BOOTSTRAP_USER="${PETS_BOOTSTRAP_USER:-zhe}"
BOOTSTRAP_HOST_ID="${PETS_BOOTSTRAP_HOST_ID:-pets}"
PROJECT_ROOT="/home/${BOOTSTRAP_USER}/pets"
STATE_DIR="/home/${BOOTSTRAP_USER}/pets-deploy-state"
BACKUP_DIR="/home/${BOOTSTRAP_USER}/pets-backups"
ENV_FILE="${PROJECT_ROOT}/.env"
BOOTSTRAP_STATE="${STATE_DIR}/bootstrap.state"
REPOSITORY_URL="https://github.com/xmz9453-cmd/Pets.git"
MYSQL_SIGNING_KEY_FINGERPRINT="BCA43417C3B485DD128EC6D4B7B3B788A8D3785C"

fail() {
  printf '[bootstrap ERROR] %s\n' "$1" >&2
  exit 1
}

if [[ "${EUID}" -ne 0 ]]; then
  fail "Run through sudo; no system changes were made."
fi
if [[ ! "${BOOTSTRAP_USER}" =~ ^[A-Za-z_][A-Za-z0-9_-]{0,31}$ ]] ||
   [[ ! "${BOOTSTRAP_HOST_ID}" =~ ^[a-z0-9-]{1,32}$ ]]; then
  fail "Bootstrap user or host profile is invalid."
fi
[[ "${BOOTSTRAP_USER}" == "zhe" ]] || fail "The existing deployment scripts require the zhe service account."
for protected_path in "${PROJECT_ROOT}" "${PROJECT_ROOT}/.git" "${ENV_FILE}" \
  "${STATE_DIR}" "${BOOTSTRAP_STATE}" "${BOOTSTRAP_STATE}.clone-complete" \
  "${BOOTSTRAP_STATE}.seed-complete" "${BACKUP_DIR}" "/home/${BOOTSTRAP_USER}/pets-data" \
  /etc/apt/keyrings/mysql-apt.gpg /etc/apt/sources.list.d/mysql-8.4-lts.list \
  /etc/apt/keyrings/nodesource.gpg /etc/apt/sources.list.d/nodesource.list \
  /etc/sudoers.d/pets-service-restart; do
  [[ ! -L "${protected_path}" ]] || fail "Refusing to use symbolic-link path ${protected_path}."
done
if [[ -z "${PETS_BOOTSTRAP_OWNER_USERNAME:-}" ||
      ! "${PETS_BOOTSTRAP_OWNER_USERNAME}" =~ ^[A-Za-z0-9._-]{1,64}$ ]]; then
  fail "A valid initial owner username is required."
fi
if [[ -z "${PETS_BOOTSTRAP_OWNER_PASSWORD_B64:-}" ]]; then
  fail "The initial owner password is missing."
fi
if [[ ! -r /etc/os-release ]]; then
  fail "Cannot identify the operating system."
fi
# shellcheck disable=SC1091
source /etc/os-release
if [[ "${ID:-}" != ubuntu || "${VERSION_ID:-}" != "24.04" ]]; then
  fail "This bootstrap supports Ubuntu 24.04 LTS only."
fi
SYSTEM_ARCH="$(dpkg --print-architecture)"
[[ "${SYSTEM_ARCH}" == "amd64" ]] || fail "The MySQL 8.4 repository setup supports amd64 only."

if [[ -f "${BOOTSTRAP_STATE}" ]] && grep -qx 'status=COMPLETE' "${BOOTSTRAP_STATE}"; then
  grep -qx "host_profile=${BOOTSTRAP_HOST_ID}" "${BOOTSTRAP_STATE}" \
    || fail "This host was initialized for a different profile; no changes made."
  APP_COMMIT="$(sed -n 's/^app_commit=//p' "${BOOTSTRAP_STATE}")"
  printf '[bootstrap SUCCESS] This host profile is already initialized; no changes made. app_commit=%s\n' "${APP_COMMIT:-unknown}"
  exit 0
fi
if [[ -f "${BOOTSTRAP_STATE}" ]] && ! grep -qx "host_profile=${BOOTSTRAP_HOST_ID}" "${BOOTSTRAP_STATE}"; then
  fail "An incomplete bootstrap belongs to a different profile; refusing to continue."
fi

id "${BOOTSTRAP_USER}" >/dev/null 2>&1 || fail "The SSH login user ${BOOTSTRAP_USER} does not exist."
USER_HOME="$(getent passwd "${BOOTSTRAP_USER}" | cut -d: -f6)"
[[ "${USER_HOME}" == "/home/${BOOTSTRAP_USER}" ]] || fail "The SSH user must have a /home/${BOOTSTRAP_USER} home directory."
if [[ -e "${PROJECT_ROOT}" && ! -d "${PROJECT_ROOT}" ]]; then
  fail "The project path exists but is not a directory."
fi
if [[ -d "${PROJECT_ROOT}" && ! -d "${PROJECT_ROOT}/.git" ]]; then
  if [[ -n "$(find "${PROJECT_ROOT}" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
    fail "The project directory is not empty and is not a Git checkout; refusing to overwrite it."
  fi
fi
if [[ -f "${ENV_FILE}" && ! -f "${BOOTSTRAP_STATE}" ]]; then
  fail "An existing .env was found without a bootstrap state marker; refusing to replace settings."
fi
if [[ ! -f "${BOOTSTRAP_STATE}" ]] &&
   { [[ -e /etc/systemd/system/pets-backend.service ]] ||
     [[ -e /etc/systemd/system/pets-frontend.service ]] ||
     [[ -e /etc/nginx/sites-available/pets ]]; }; then
  fail "Existing Pets service configuration was found without a bootstrap marker; refusing to replace it."
fi
if [[ ! -f "${BOOTSTRAP_STATE}" ]] &&
   { [[ -e /etc/apt/keyrings/mysql-apt.gpg ]] ||
     [[ -e /etc/apt/sources.list.d/mysql-8.4-lts.list ]] ||
     [[ -e /etc/apt/keyrings/nodesource.gpg ]] ||
     [[ -e /etc/apt/sources.list.d/nodesource.list ]] ||
     [[ -e /etc/sudoers.d/pets-service-restart ]]; }; then
  fail "Existing NodeSource, MySQL APT, or Pets sudoers configuration was found without a bootstrap marker; refusing to replace it."
fi
if [[ -e /etc/nginx/sites-enabled/pets || -L /etc/nginx/sites-enabled/pets ]] &&
   [[ "$(readlink -f /etc/nginx/sites-enabled/pets)" != "/etc/nginx/sites-available/pets" ]]; then
  fail "An unrelated Nginx site already uses the Pets site link; refusing to replace it."
fi
if [[ -e /etc/nginx/sites-enabled/default || -L /etc/nginx/sites-enabled/default ]] &&
   [[ ! -L /etc/nginx/sites-enabled/default ||
      "$(readlink -f /etc/nginx/sites-enabled/default)" != "/etc/nginx/sites-available/default" ]]; then
  fail "An unrelated Nginx site uses the default site link; refusing to remove it."
fi
if [[ ! -f "${BOOTSTRAP_STATE}" ]]; then
  for existing_path in "${STATE_DIR}" "${BACKUP_DIR}" "/home/${BOOTSTRAP_USER}/pets-data"; do
    [[ ! -e "${existing_path}" && ! -L "${existing_path}" ]] \
      || fail "Existing data directory ${existing_path} was found without a bootstrap marker; refusing to modify it."
  done
fi

if [[ ! -f "${BOOTSTRAP_STATE}" ]]; then
  if command -v mysql >/dev/null 2>&1; then
    DATABASE_EXISTS="$(mysql --protocol=socket --batch --skip-column-names -e \
      "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='psop_one';" 2>/dev/null)" \
      || fail "A MySQL client exists but the local server cannot be safely inspected; refusing to continue."
    APP_USER_EXISTS="$(mysql --protocol=socket --batch --skip-column-names -e \
      "SELECT COUNT(*) FROM mysql.user WHERE User='psop_app' AND Host='localhost';" 2>/dev/null)" \
      || fail "Could not safely inspect the existing MySQL application account; refusing to continue."
    [[ "${DATABASE_EXISTS}" == "0" ]] || fail "Database psop_one already exists without a bootstrap marker; refusing to modify it."
    [[ "${APP_USER_EXISTS}" == "0" ]] || fail "MySQL account psop_app already exists without a bootstrap marker; refusing to modify it."
  fi
  install -d -o "${BOOTSTRAP_USER}" -g "${BOOTSTRAP_USER}" -m 700 "${STATE_DIR}" "${BACKUP_DIR}"
  printf 'status=RUNNING\nhost_profile=%s\n' "${BOOTSTRAP_HOST_ID}" > "${BOOTSTRAP_STATE}"
  chown "${BOOTSTRAP_USER}:${BOOTSTRAP_USER}" "${BOOTSTRAP_STATE}"
  chmod 600 "${BOOTSTRAP_STATE}"
fi

printf '[bootstrap] Installing supported Ubuntu packages and Node.js 24 LTS...\n'
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends ca-certificates curl git gnupg gzip nginx openssh-client openssl sudo tar util-linux
install -d -m 755 /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
  | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
chmod 644 /etc/apt/keyrings/nodesource.gpg
printf 'deb [arch=%s signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main\n' \
  "${SYSTEM_ARCH}" > /etc/apt/sources.list.d/nodesource.list
mysql_key_tmp="$(mktemp)"
mysql_keyring_tmp=""
trap 'rm -f -- "${mysql_key_tmp:-}"; [[ -z "${mysql_keyring_tmp:-}" ]] || rm -f -- "${mysql_keyring_tmp}"' EXIT
curl -fsSL https://repo.mysql.com/RPM-GPG-KEY-mysql-2025 -o "${mysql_key_tmp}"
mysql_key_fingerprint="$(gpg --batch --show-keys --with-colons "${mysql_key_tmp}" | awk -F: '$1 == "fpr" { print $10; exit }')"
[[ "${mysql_key_fingerprint}" == "${MYSQL_SIGNING_KEY_FINGERPRINT}" ]] \
  || fail "The MySQL APT signing key fingerprint did not match the pinned official key."
mysql_keyring_tmp="$(mktemp /etc/apt/keyrings/mysql-apt.gpg.XXXXXX)"
gpg --batch --yes --dearmor --output "${mysql_keyring_tmp}" "${mysql_key_tmp}"
chmod 644 "${mysql_keyring_tmp}"
mv -- "${mysql_keyring_tmp}" /etc/apt/keyrings/mysql-apt.gpg
mysql_keyring_tmp=""
rm -f -- "${mysql_key_tmp}"
mysql_key_tmp=""
trap - EXIT
printf 'deb [arch=amd64 signed-by=/etc/apt/keyrings/mysql-apt.gpg] https://repo.mysql.com/apt/ubuntu/ noble mysql-8.4-lts\n' \
  > /etc/apt/sources.list.d/mysql-8.4-lts.list
apt-get update
MYSQL_SERVER_CANDIDATE="$(apt-cache policy mysql-server | sed -n 's/^[[:space:]]*Candidate: //p' | head -n 1)"
[[ "${MYSQL_SERVER_CANDIDATE}" =~ ^8\.4\. ]] \
  || fail "The configured official repository did not provide a MySQL 8.4 LTS candidate."
apt-get install -y --no-install-recommends nodejs "mysql-server=${MYSQL_SERVER_CANDIDATE}"
node_major="$(node --version | sed -E 's/^v([0-9]+).*/\1/')"
if [[ "${node_major}" != "24" ]]; then
  fail "Expected Node.js 24 LTS, installed version is $(node --version)."
fi
systemctl enable --now mysql
MYSQL_SERVER_VERSION="$(mysql --protocol=socket --batch --skip-column-names -e 'SELECT VERSION();')" \
  || fail "MySQL was installed but its local server version could not be verified."
[[ "${MYSQL_SERVER_VERSION}" =~ ^8\.4\. ]] \
  || fail "Expected MySQL 8.4 LTS, found ${MYSQL_SERVER_VERSION}."

SERVICE_SUDOERS_FILE="/etc/sudoers.d/pets-service-restart"
SERVICE_SUDOERS_RULE="${BOOTSTRAP_USER} ALL=(root) NOPASSWD: /usr/bin/systemctl restart pets-backend.service, /usr/bin/systemctl restart pets-frontend.service"
if [[ -e "${SERVICE_SUDOERS_FILE}" || -L "${SERVICE_SUDOERS_FILE}" ]]; then
  [[ -f "${SERVICE_SUDOERS_FILE}" && ! -L "${SERVICE_SUDOERS_FILE}" ]] \
    || fail "Pets service sudoers path is not a regular file; refusing to replace it."
  cmp -s "${SERVICE_SUDOERS_FILE}" <(printf '%s\n' "${SERVICE_SUDOERS_RULE}") \
    || fail "Pets service sudoers file has unexpected contents; refusing to replace it."
  chown root:root "${SERVICE_SUDOERS_FILE}"
  chmod 440 "${SERVICE_SUDOERS_FILE}"
else
  sudoers_tmp="$(mktemp /etc/sudoers.d/pets-service-restart.XXXXXX)"
  printf '%s\n' "${SERVICE_SUDOERS_RULE}" > "${sudoers_tmp}"
  chown root:root "${sudoers_tmp}"
  chmod 440 "${sudoers_tmp}"
  if ! visudo -cf "${sudoers_tmp}" >/dev/null; then
    rm -f -- "${sudoers_tmp}"
    fail "Pets service sudoers rule did not pass visudo validation."
  fi
  mv -- "${sudoers_tmp}" "${SERVICE_SUDOERS_FILE}"
fi
visudo -cf /etc/sudoers >/dev/null \
  || fail "The sudoers configuration did not pass validation."

if [[ -d "${PROJECT_ROOT}/.git" ]]; then
  CURRENT_REMOTE="$(git -C "${PROJECT_ROOT}" remote get-url origin)"
  [[ "${CURRENT_REMOTE}" == "${REPOSITORY_URL}" ]] || fail "Existing Git checkout has a different origin; refusing to use it."
elif [[ ! -f "${BOOTSTRAP_STATE}.clone-complete" ]]; then
  if [[ -d "${PROJECT_ROOT}" ]]; then
    rmdir "${PROJECT_ROOT}"
  fi
  install -d -o "${BOOTSTRAP_USER}" -g "${BOOTSTRAP_USER}" -m 755 "$(dirname "${PROJECT_ROOT}")"
  sudo -u "${BOOTSTRAP_USER}" -H git clone --branch master -- "${REPOSITORY_URL}" "${PROJECT_ROOT}"
  touch "${BOOTSTRAP_STATE}.clone-complete"
  chown "${BOOTSTRAP_USER}:${BOOTSTRAP_USER}" "${BOOTSTRAP_STATE}.clone-complete"
  chmod 600 "${BOOTSTRAP_STATE}.clone-complete"
fi

if [[ -f "${ENV_FILE}" ]]; then
  DB_PASSWORD="$(sed -n 's/^DB_PASSWORD=\([0-9a-f]\{64\}\)$/\1/p' "${ENV_FILE}" | head -n 1)"
  [[ "${DB_PASSWORD}" =~ ^[0-9a-f]{64}$ ]] || fail "Existing .env does not contain a valid generated database password."
else
  DB_PASSWORD="$(openssl rand -hex 32)"
fi
OWNER_PASSWORD="$(printf '%s' "${PETS_BOOTSTRAP_OWNER_PASSWORD_B64}" | base64 --decode)" \
  || fail "Initial owner password encoding is invalid."
[[ "${#OWNER_PASSWORD}" -ge 16 && "${OWNER_PASSWORD}" != *$'\n'* && "${OWNER_PASSWORD}" != *$'\r'* ]] \
  || fail "Initial owner password must have at least 16 characters and no line breaks."
[[ ! "${OWNER_PASSWORD}" =~ [[:cntrl:]] ]] || fail "Initial owner password must not contain control characters."
OWNER_PASSWORD_ENV="${OWNER_PASSWORD//\\/\\\\}"
OWNER_PASSWORD_ENV="${OWNER_PASSWORD_ENV//\"/\\\"}"

if [[ ! -f "${ENV_FILE}" ]]; then
  install -d -o "${BOOTSTRAP_USER}" -g "${BOOTSTRAP_USER}" -m 700 "${PROJECT_ROOT}"
  cat > "${ENV_FILE}" <<EOF
DB_HOST=localhost
DB_PORT=3306
DB_NAME=psop_one
DB_USER=psop_app
DB_PASSWORD=${DB_PASSWORD}
BACKEND_PORT=3001
FRONTEND_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_API_BASE_URL=
CONTRACT_STORAGE_ROOT=/home/${BOOTSTRAP_USER}/pets-data/contracts
SHOP_LOGO_STORAGE_ROOT=/home/${BOOTSTRAP_USER}/pets-data/shop-logos
PORTAL_BACKGROUND_STORAGE_ROOT=/home/${BOOTSTRAP_USER}/pets-data/portal-backgrounds
GROOMING_PHOTO_STORAGE_ROOT=/home/${BOOTSTRAP_USER}/pets-data/grooming-photos
PRODUCT_IMAGE_STORAGE_ROOT=/home/${BOOTSTRAP_USER}/pets-data/product-images
EOF
  chown "${BOOTSTRAP_USER}:${BOOTSTRAP_USER}" "${ENV_FILE}"
  chmod 600 "${ENV_FILE}"
fi
unset PETS_BOOTSTRAP_OWNER_PASSWORD_B64

if ! mysql --protocol=socket -e "CREATE DATABASE IF NOT EXISTS psop_one CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;" >/dev/null 2>&1 ||
   ! mysql --protocol=socket -e \
     "CREATE USER IF NOT EXISTS 'psop_app'@'localhost' IDENTIFIED BY '${DB_PASSWORD}'; ALTER USER 'psop_app'@'localhost' IDENTIFIED BY '${DB_PASSWORD}'; GRANT ALL PRIVILEGES ON psop_one.* TO 'psop_app'@'localhost';" >/dev/null 2>&1; then
  fail "Could not initialize the application database; credentials were not printed."
fi
unset DB_PASSWORD

install -d -o "${BOOTSTRAP_USER}" -g "${BOOTSTRAP_USER}" -m 700 \
  "/home/${BOOTSTRAP_USER}/pets-data/contracts" \
  "/home/${BOOTSTRAP_USER}/pets-data/shop-logos" \
  "/home/${BOOTSTRAP_USER}/pets-data/portal-backgrounds" \
  "/home/${BOOTSTRAP_USER}/pets-data/grooming-photos" \
  "/home/${BOOTSTRAP_USER}/pets-data/product-images"

cat > /etc/systemd/system/pets-backend.service <<EOF
[Unit]
Description=Pets Backend
After=network.target mysql.service
Requires=mysql.service

[Service]
Type=simple
User=${BOOTSTRAP_USER}
Group=${BOOTSTRAP_USER}
WorkingDirectory=${PROJECT_ROOT}/backend
Environment=NODE_ENV=production
EnvironmentFile=${ENV_FILE}
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/pets-frontend.service <<EOF
[Unit]
Description=Pets Frontend
After=network.target pets-backend.service

[Service]
Type=simple
User=${BOOTSTRAP_USER}
Group=${BOOTSTRAP_USER}
WorkingDirectory=${PROJECT_ROOT}/frontend
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm run start -- --hostname 127.0.0.1 --port 3000
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/nginx/sites-available/pets <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 12m;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
ln -sfn /etc/nginx/sites-available/pets /etc/nginx/sites-enabled/pets
if [[ -L /etc/nginx/sites-enabled/default ]] &&
   [[ "$(readlink -f /etc/nginx/sites-enabled/default)" == "/etc/nginx/sites-available/default" ]]; then
  rm -- /etc/nginx/sites-enabled/default
fi
nginx -t
systemctl daemon-reload
systemctl enable pets-backend.service pets-frontend.service nginx
systemctl restart nginx

printf '[bootstrap] Installing backend dependencies and initializing the empty production database...\n'
sudo -u "${BOOTSTRAP_USER}" -H npm --prefix "${PROJECT_ROOT}/backend" ci
sudo -u "${BOOTSTRAP_USER}" -H env NODE_ENV=production node "${PROJECT_ROOT}/database/scripts/migrate.js"
if [[ ! -f "${BOOTSTRAP_STATE}.seed-complete" ]]; then
  env_file_tmp="$(mktemp "${ENV_FILE}.XXXXXX")"
  trap '[[ -z "${env_file_tmp:-}" ]] || rm -f -- "${env_file_tmp}"' EXIT
  grep -Ev '^AUTH_FOUNDATION_OWNER_(USERNAME|PASSWORD)=' "${ENV_FILE}" > "${env_file_tmp}"
  printf 'AUTH_FOUNDATION_OWNER_USERNAME=%s\nAUTH_FOUNDATION_OWNER_PASSWORD="%s"\n' \
    "${PETS_BOOTSTRAP_OWNER_USERNAME}" "${OWNER_PASSWORD_ENV}" >> "${env_file_tmp}"
  chown "${BOOTSTRAP_USER}:${BOOTSTRAP_USER}" "${env_file_tmp}"
  chmod 600 "${env_file_tmp}"
  mv -- "${env_file_tmp}" "${ENV_FILE}"
  env_file_tmp=""
  trap - EXIT
  sudo -u "${BOOTSTRAP_USER}" -H env NODE_ENV=production node "${PROJECT_ROOT}/database/scripts/seed.js"
  touch "${BOOTSTRAP_STATE}.seed-complete"
  chown "${BOOTSTRAP_USER}:${BOOTSTRAP_USER}" "${BOOTSTRAP_STATE}.seed-complete"
  chmod 600 "${BOOTSTRAP_STATE}.seed-complete"
fi
if grep -Eq '^AUTH_FOUNDATION_OWNER_(USERNAME|PASSWORD)=' "${ENV_FILE}"; then
  sed -E -i '/^AUTH_FOUNDATION_OWNER_(USERNAME|PASSWORD)=/d' "${ENV_FILE}"
  chmod 600 "${ENV_FILE}"
fi
unset OWNER_PASSWORD OWNER_PASSWORD_ENV PETS_BOOTSTRAP_OWNER_USERNAME

printf '[bootstrap] Preparing deployment state and running the standard deployment checks...\n'
sudo -u "${BOOTSTRAP_USER}" -H bash "${PROJECT_ROOT}/deploy/install.sh"
APP_COMMIT="$(git -C "${PROJECT_ROOT}" rev-parse --verify 'HEAD^{commit}')"
[[ "${APP_COMMIT}" =~ ^[0-9a-f]{40}$ ]] || fail "Could not determine the checked-out application commit."
sudo -u "${BOOTSTRAP_USER}" -H bash "${PROJECT_ROOT}/deploy/deploy.sh" "${APP_COMMIT}"

printf 'status=COMPLETE\nhost_profile=%s\napp_commit=%s\n' "${BOOTSTRAP_HOST_ID}" "${APP_COMMIT}" > "${BOOTSTRAP_STATE}"
chown "${BOOTSTRAP_USER}:${BOOTSTRAP_USER}" "${BOOTSTRAP_STATE}"
chmod 600 "${BOOTSTRAP_STATE}"
printf '[bootstrap SUCCESS] Ubuntu dependencies, database, services, and application deployment completed.\n'
