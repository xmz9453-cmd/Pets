# Pets 2.0 — Production Deployment & Operations Manual (DEPLOYMENT.md)

---

## 1. Overview & Baseline Architecture

This document provides standard operating procedures (SOP) for **Pets 2.0 Production Deployment Automation**.

### Key Infrastructure Baseline
- **OS**: Ubuntu 24.04.5 LTS
- **User**: `zhe` (`/home/zhe/pets`)
- **Runtime**: Node.js `v24.22.2` (LTS), npm `11.19.1`, MySQL Community Server `8.4.13` (LTS), Nginx `1.24.0` (Ubuntu 24.04 package), Git `2.43.0`
- **Application dependencies** (locked by package-lock files): Backend Express `5.3.0`, mysql2 `3.24.6`, dotenv `18.0.9`, cors `2.8.6`, multer `2.5.0`; Frontend Next.js `16.4.3`, React `19.3.1`, Bootstrap `5.3.8`
- **Git Repository**: `https://github.com/xmz9453-cmd/Pets.git` (`master` branch)
- **Database Target**: `psop_one` (MySQL)
- **Contract PDF Storage**: private filesystem directory configured by `CONTRACT_STORAGE_ROOT`; not part of the Git checkout or Nginx document root.
- **Shop Logo Storage**: private filesystem directory configured by `SHOP_LOGO_STORAGE_ROOT`; only validated PNG/JPG/WebP files are served through the public logo endpoint.
- **Portal Background Storage**: private filesystem directory configured by `PORTAL_BACKGROUND_STORAGE_ROOT`; only the selected, validated PNG/JPG/WebP image is publicly served.
- **Grooming Photo Storage**: private filesystem directory configured by `GROOMING_PHOTO_STORAGE_ROOT`; customer images are served only after member ownership and completed-service checks.
- **Product Image Storage**: private filesystem directory configured by `PRODUCT_IMAGE_STORAGE_ROOT`; one validated PNG/JPG/WebP image is allowed per product.
- **Application Services**:
  - Backend: `pets-backend.service` (`http://127.0.0.1:3001`)
  - Frontend: `pets-frontend.service` (`http://127.0.0.1:3000`)
  - Reverse Proxy: Nginx (`http://175.183.34.91/` -> `/api/` to `:3001`, `/` to `:3000`)

---

## 2. Directory Layout & State Model

### Directory Structure
- **Backup Directory**: `/home/zhe/pets-backups/` (`chmod 700`)
- **Deployment State Directory**: `/home/zhe/pets-deploy-state/` (`chmod 700`)
- **State File**: `/home/zhe/pets-deploy-state/deployment.state` (`chmod 600`)
- **Lock File**: `/home/zhe/pets-deploy-state/deployment.lock`
- **Logs**: `/home/zhe/pets-deploy-state/logs/deploy-YYYYMMDD-HHMMSS.log`
- **Contract PDF Storage Root**: configured per environment; the Production candidate is `/home/zhe/pets-data/contracts/`. Provision it separately with access restricted to the Backend service account; do not expose it through Nginx.

### Complete Application Backup and Restore

The verified backup bundle contains the compressed MySQL dump, Contract PDFs, Shop Logos, Portal Backgrounds, Grooming Photos, Product Images, SHA-256 manifests, and the Git commit SHA for the application version. Configure `CONTRACT_STORAGE_ROOT` in the Backend environment and repository `.env` used by maintenance scripts; the root must already exist and be private. Media roots may be configured with `SHOP_LOGO_STORAGE_ROOT`, `PORTAL_BACKGROUND_STORAGE_ROOT`, `GROOMING_PHOTO_STORAGE_ROOT`, and `PRODUCT_IMAGE_STORAGE_ROOT`; by default they are separate directories next to the contract root.

`deploy/backup.sh` requires a clean Git working tree so the recorded commit identifies the code version used for recovery. It creates a timestamped `pets_backup_YYYYMMDD_HHMMSS.tar.gz` bundle and checksum sidecar. Completed bundles are verified and stored with mode `600`; bundles older than 30 days are removed. Keep the bundle and its `.sha256` sidecar together.

Deployment creates this backup before applying pending migrations. The backup script checks whether optional Logo, Portal Background, Product Image, and Grooming Photo reference schemas exist, so a valid pre-migration database can still be backed up; when a reference schema is absent, its files are included but cannot be cross-checked against that schema. The database account does not need the MySQL `PROCESS` privilege for tablespace metadata.

Application source is recovered by checking out the recorded `app_commit` from the GitHub repository. The bundle does not include `.env` or other secrets: store those separately in an encrypted, access-controlled backup. This is an application-level recovery set, not a full VM or operating-system image.

The migration sequence snapshots existing portal footer and background metadata before migration 034 and restores it after the shop-scoping changes; do not edit migration 034 in place. New grooming photos and product images are stored outside the Git checkout and included in backup bundles; do not expose these media roots through Nginx.

Restore a complete bundle with:

```bash
bash deploy/restore.sh /home/zhe/pets-backups/pets_backup_YYYYMMDD_HHMMSS.tar.gz
```

The restore script validates archive members, checksums, PDF and media manifests, and verifies that restored database references match files before reporting success. It displays the application commit recorded in the bundle; check out that commit when rebuilding the application. Older v1 bundles do not include Logo or Background files: restore keeps existing media in place and verifies database references against it. Stop the application services before restore to prevent reads/writes during filesystem and database replacement; the storage coordination lock serializes media changes and backup/restore. Type `RESTORE` only after confirming the target environment and bundle. A failed database restore may leave the new storage directories installed and the previous directories preserved as `.before-restore-*` for manual recovery; investigate before restarting application services.

### Formal State Transition Flow (Decision 20)
```
[Uninitialized / SUCCESS]
      │
      ▼  (run deploy/deploy.sh)
  [RUNNING]
      │
      ├── (Failure / Abort) ──────────────► [FAILED] (Requires manual investigation & clear-state.sh)
      │
      ▼  (All 5 Technical Health Checks PASS)
  [DEPLOYED] (verification=pending)
      │
      ▼  (Human performs browser check & runs deploy/confirm.sh)
  [SUCCESS] (verification=PASS)
```

---

## 3. Environment Installation (First Time Setup)

`deploy/install.sh` only initializes the application's backup and deployment-state directories. It does **not** install Ubuntu packages, MySQL, Node.js, Nginx, or the application services.

The management-center first-build workflow uses `deploy/bootstrap-ubuntu.sh` for a new Ubuntu 24.04 VM. The MVP's live inventory reported Node.js `v24.22.2`, npm `11.19.1`, MySQL Community Server `8.4.13`, Nginx `1.24.0`, and Git `2.43.0`. The bootstrap uses NodeSource's Node.js 24.x channel and Oracle's signed MySQL 8.4 LTS APT repository; it verifies the installed Node.js and MySQL major versions before continuing. The MySQL repository's current Ubuntu 24.04 candidate is `8.4.13`, matching the observed MVP patch version; future runs may use a newer security patch within the 8.4 LTS series.

While the MVP VM is available, run this read-only inventory on it:

```bash
lsb_release -ds
node --version
npm --version
mysql --version
sudo mysql --batch --skip-column-names -e "SELECT VERSION();"
nginx -v 2>&1
git --version
```

`mysql --version` reports the client; the SQL query reports the server version. Re-run this inventory before a future replacement if the MVP runtime has changed. The `xmz9453-cmd/Pets` GitHub repository is currently public, so the bootstrap's HTTPS clone requires no credential.

The first-build flow also requires Ubuntu 24.04, SSH enabled and reachable, and the `zhe` account with sudo access. The management center can install its SSH public key after the host fingerprint is verified; do not copy a private key to Ubuntu. If SSH was not selected during Ubuntu setup, use the Ubuntu or VM console:

```bash
sudo apt update
sudo apt install -y openssh-server
sudo systemctl enable --now ssh
sudo systemctl status ssh
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

The installed Ubuntu account password is the one-time initial SSH login credential. Select the correct host in the management center, compare the SHA256 fingerprint shown above using **核對／更新主機指紋**, then choose **設定／輪替 SSH 金鑰** and enter that Ubuntu account password in its password dialog. The tool installs the matching public key into that account's `authorized_keys`, tests key-based login, and keeps the private key on Windows with restricted file permissions. It does not save the password. If SSH password authentication is disabled, temporarily enable it from the Ubuntu console for this one-time key installation, validate the SSH configuration with `sudo sshd -t`, and restart SSH; after successful key login, password authentication can be disabled again if desired. Configure VMware networking and any active firewall to permit SSH before Bootstrap and HTTP after it. The bootstrap does not configure VMware networking, DNS, a firewall, or TLS. The repository is currently public and is cloned over HTTPS without credentials; if its visibility changes, design a dedicated read-only authentication flow before running the bootstrap. Never put a personal access token in the script or `.env`.

Once these prerequisites and versions are confirmed and key-based login succeeds, select the PETS host profile in the management center and run **首次建置 Ubuntu**. The first-build script refuses to initialize an existing project, service configuration, MySQL database/account, or data directory. It creates a fresh database and seed administrator; the initial administrator password is removed from `.env` after the seed succeeds. It also installs a `visudo`-validated sudoers rule allowing `zhe` to restart only `pets-backend.service` and `pets-frontend.service`, as required by the standard non-interactive deployment workflow. Verify the site in a browser and complete the existing human deployment-confirmation step afterward.

If a first build has initialized the VM but the standard deployment exits with a `FAILED` deployment state, inspect the reported deployment log before retrying. After confirming the failure did not complete successfully, use the Ubuntu VM console to run `sudo bash /home/zhe/pets/deploy/clear-state.sh` and enter `CLEAR_STATE`; this clears only the abnormal deployment-state marker, not the database, backups, logs, or application files. Then rerun Bootstrap to resume the incomplete first build.

For an already prepared VM, run the installer script to initialize required directories and permissions:

```bash
cd /home/zhe/pets
bash deploy/install.sh
```

---

## 4. Standard Routine Deployment SOP

### Step 1: Execute Automated Deployment

```bash
cd /home/zhe/pets
bash deploy/deploy.sh
```

**Automated Tasks Performed by `deploy.sh`**:
1. Acquires lock (`deployment.lock`).
2. Validates state (`deployment.state`).
3. Confirms Git Working Tree is CLEAN.
4. Executes `git fetch origin master` & Fast-forward merge (`git merge --ff-only`).
5. Fixes and verifies `TARGET_SHA` consistency.
6. Installs Backend dependencies (`npm ci`).
7. Installs Frontend dependencies (`npm ci`).
8. Builds Frontend production bundle (`npm run build`).
9. Creates verified Database Backup (`deploy/backup.sh`).
10. Runs pending Database Migrations with Safety Guard (`node database/scripts/migrate.js`).
11. Restarts Application Services (`pets-backend.service` & `pets-frontend.service`).
12. Runs 5 Technical Health Checks:
    - `pets-backend.service` active
    - Backend HTTP `/api/health` & `/api/health/database` PASS
    - `pets-frontend.service` active
    - Frontend direct HTTP `http://127.0.0.1:3000/` PASS
    - Nginx Reverse Proxy HTTP `http://127.0.0.1/` PASS
13. Transitions state to `status=DEPLOYED`, `verification=pending`.

---

### Step 2: Human Production Verification

Open a web browser on external client network:
- Visit: `http://175.183.34.91/`
- Verify Login page renders correctly.
- Perform test login and check key operation flows (Customers, Pets, Appointments, Operations).

---

### Step 3: Confirm Deployment Success

Once browser verification is complete, execute:

```bash
cd /home/zhe/pets
bash deploy/confirm.sh
```

When prompted, type `CONFIRM` to mark deployment as `SUCCESS` (`verification=PASS`).

---

## 5. Maintenance & Emergency Manual Operations

### Manual Database Backup
To create a standalone database backup:

```bash
bash deploy/backup.sh
```

### Emergency Database Restoration (Decision 12)
To restore a specific backup file into the production database:

```bash
bash deploy/restore.sh /home/zhe/pets-backups/pets_backup_YYYYMMDD_HHMMSS.tar.gz
```
*Requires operator to explicitly type `RESTORE` to execute.*

### Clearing Failed / Stuck State
If a deployment fails or exits unexpectedly (`status=FAILED` or `status=RUNNING`):

1. Investigate the failure log in `/home/zhe/pets-deploy-state/logs/`.
2. Perform necessary manual fixes.
3. Reset state file:

```bash
bash deploy/clear-state.sh
```
*Requires typing `CLEAR_STATE` to execute.*

---

## 6. Safety & Security Rules

1. **No Automatic Rollback**: In case of deployment or migration failures, automatic git rollback or automatic DB restore is strictly prohibited to prevent data corruption.
2. **Secret Masking (Decision 45)**: Known database secrets from `.env` and sensitive patterns in logs are masked dynamically. `.env` files are never dumped into logs.
3. **Migration Protection**: `migrate.js` enforces a strict Production Safety Guard validating DB Host, DB Name, and Environment on every execution.
