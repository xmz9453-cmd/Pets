const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const gitBash = process.platform === 'win32'
  ? 'C:\\Program Files\\Git\\bin\\bash.exe'
  : '/bin/bash';

describe('Contract PDF backup and restore scripts', () => {
  test('round-trips SQL and contract files through a verified local bundle', () => {
    if (!fs.existsSync(gitBash)) {
      throw new Error(`Bash is required for the backup/restore test: ${gitBash}`);
    }
    const tempBase = process.platform === 'win32'
      ? path.join(__dirname, '.contract-pdf-backup-test-')
      : path.join(os.tmpdir(), 'pets-contract-backup-test-');
    const tempRoot = fs.mkdtempSync(tempBase);
    const projectRoot = path.join(tempRoot, 'project');
    const backupRoot = path.join(tempRoot, 'backups');
    const storageRoot = path.join(tempRoot, 'storage');
    const toolRoot = path.join(tempRoot, 'tools');
    const contractDirectory = path.join(storageRoot, 'contract-versions');
    const storageKey = `contract-versions/${crypto.randomBytes(16).toString('hex')}.pdf`;
    const pdfBytes = Buffer.from('%PDF-1.7\nBackup test contract\n%%EOF\n');
    const pdfHash = crypto.createHash('sha256').update(pdfBytes).digest('hex');
    const pdfPath = path.join(storageRoot, ...storageKey.split('/'));
    const backupScript = path.join(projectRoot, 'deploy', 'backup.sh');
    const restoreScript = path.join(projectRoot, 'deploy', 'restore.sh');

    try {
      fs.mkdirSync(path.dirname(backupScript), { recursive: true });
      fs.mkdirSync(backupRoot, { recursive: true });
      fs.mkdirSync(contractDirectory, { recursive: true });
      fs.mkdirSync(toolRoot, { recursive: true });
      fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
      fs.copyFileSync(path.resolve(__dirname, '..', '..', 'deploy', 'backup.sh'), backupScript);
      fs.copyFileSync(path.resolve(__dirname, '..', '..', 'deploy', 'restore.sh'), restoreScript);
      fs.writeFileSync(pdfPath, pdfBytes);
      const toBashPath = (value) => (process.platform === 'win32'
        ? `/${value[0].toLowerCase()}${value.slice(2).replace(/\\/g, '/')}`
        : value);
      const storageRootEnv = toBashPath(storageRoot);
      fs.writeFileSync(path.join(projectRoot, '.env'), [
        'DB_HOST=localhost',
        'DB_PORT=3306',
        'DB_NAME=psop_test',
        'DB_USER=test',
        'DB_PASSWORD=test',
        `CONTRACT_STORAGE_ROOT="${storageRootEnv}"`,
        '',
      ].join('\n'));

      const mysqlMock = `#!/usr/bin/env bash
if [[ "$*" == *"SELECT storage_path"* ]]; then
  printf '%s\\t%s\\t%s\\n' '${storageKey}' '${pdfBytes.length}' '${pdfHash}'
elif [[ "$*" == *"--skip-column-names"* ]]; then
  while IFS= read -r query; do
    if [[ "$query" == *"GET_LOCK"* ]]; then
      printf '1\\n'
    elif [[ "$query" == *"RELEASE_LOCK"* ]]; then
      printf '1\\n'
      break
    fi
  done
else
  cat >/dev/null
  printf 'restored\\n' > '${path.join(tempRoot, 'mysql-restored.txt')}'
fi
`;
      fs.writeFileSync(path.join(toolRoot, 'mysql'), mysqlMock);
      fs.writeFileSync(path.join(toolRoot, 'mysqldump'), '#!/usr/bin/env bash\nprintf "CREATE DATABASE test;\\n"\n');
      fs.chmodSync(path.join(toolRoot, 'mysql'), 0o755);
      fs.chmodSync(path.join(toolRoot, 'mysqldump'), 0o755);

      const env = {
        ...process.env,
        BACKUP_DIR: toBashPath(backupRoot),
        PATH: `${toolRoot}${path.delimiter}${process.env.PATH}`,
      };
      const backup = spawnSync(gitBash, [backupScript], { cwd: projectRoot, env, encoding: 'utf8' });
      if (backup.status !== 0) {
        throw new Error(`Backup command failed (${backup.status}): ${backup.stdout}\n${backup.stderr}`);
      }
      const backupFileMatch = backup.stdout.match(/^BACKUP_FILE=(.+)$/m);
      expect(backupFileMatch).not.toBeNull();
      const backupFile = backupFileMatch[1];
      const nativeBackupFile = path.join(backupRoot, path.posix.basename(backupFile));
      expect(fs.existsSync(nativeBackupFile)).toBe(true);

      const contents = spawnSync(gitBash, ['-lc', `tar -tzf '${backupFile}'`], { cwd: projectRoot, env, encoding: 'utf8' });
      expect(contents.status).toBe(0);
      expect(contents.stdout).toContain('database.sql.gz');
      expect(contents.stdout).toContain('contract-pdfs.tar.gz');
      expect(contents.stdout).toContain('PDF_MANIFEST.tsv');
      expect(contents.stdout).toContain('SHA256SUMS');

      fs.rmSync(contractDirectory, { recursive: true, force: true });
      const restore = spawnSync(gitBash, [restoreScript, backupFile], {
        cwd: projectRoot,
        env,
        input: 'RESTORE\n',
        encoding: 'utf8',
      });
      if (restore.status !== 0) {
        throw new Error(`Restore command failed (${restore.status}): ${restore.stdout}\n${restore.stderr}`);
      }
      expect(fs.readFileSync(pdfPath)).toEqual(pdfBytes);
      expect(fs.readFileSync(path.join(tempRoot, 'mysql-restored.txt'), 'utf8')).toBe('restored\n');
      expect(restore.stdout).toContain('restored and verified');
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
