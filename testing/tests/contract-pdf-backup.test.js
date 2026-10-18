const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const gitBash = process.platform === 'win32'
  ? 'C:\\Program Files\\Git\\bin\\bash.exe'
  : '/bin/bash';

function createFixture({ schemaCount = '1', references = '', pdfFiles = [] } = {}) {
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
  const backupScript = path.join(projectRoot, 'deploy', 'backup.sh');
  const backupGateScript = path.join(projectRoot, 'deploy', 'backup-gate.sh');
  const restoreScript = path.join(projectRoot, 'deploy', 'restore.sh');
  const restoreMarker = path.join(tempRoot, 'database-restored.txt');
  const queryLog = path.join(tempRoot, 'contract-reference-query.txt');

  fs.mkdirSync(path.dirname(backupScript), { recursive: true });
  fs.mkdirSync(backupRoot, { recursive: true });
  fs.mkdirSync(storageRoot, { recursive: true });
  fs.mkdirSync(contractDirectory, { recursive: true });
  fs.mkdirSync(toolRoot, { recursive: true });
  fs.copyFileSync(path.resolve(__dirname, '..', '..', 'deploy', 'backup.sh'), backupScript);
  fs.copyFileSync(path.resolve(__dirname, '..', '..', 'deploy', 'restore.sh'), restoreScript);

  const toBashPath = (value) => (process.platform === 'win32'
    ? `/${value[0].toLowerCase()}${value.slice(2).replace(/\\/g, '/')}`
    : value);
  const storageRootEnv = toBashPath(storageRoot);
  fs.writeFileSync(path.join(projectRoot, '.env'), [
    'DB_HOST=localhost',
    'DB_PORT=3306',
    'DB_NAME=psop_test',
    'DB_USER=test',
    'DB_PASSWORD=test-password',
    `CONTRACT_STORAGE_ROOT="${storageRootEnv}"`,
    '',
  ].join('\n'));

  const pdfs = pdfFiles.map(({ name = `${crypto.randomBytes(16).toString('hex')}.pdf`, bytes }) => {
    const fileBytes = bytes || Buffer.from('%PDF-1.7\nBackup test contract\n%%EOF\n');
    const filePath = path.join(contractDirectory, name);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, fileBytes);
    return {
      name,
      bytes: fileBytes,
      path: filePath,
      storageKey: `contract-versions/${name}`,
      hash: crypto.createHash('sha256').update(fileBytes).digest('hex'),
    };
  });

  const mysqlMock = `#!/usr/bin/env bash
set -e
if [[ "$*" == *"information_schema.tables"* ]]; then
  if [ "\${MOCK_SCHEMA_QUERY_ERROR:-0}" = "1" ]; then
    echo "schema query failed" >&2
    exit 9
  fi
  if [ -f "$MOCK_RESTORE_MARKER" ]; then
    printf '%s\\n' "$MOCK_RESTORED_SCHEMA_COUNT"
  else
    printf '%s\\n' "$MOCK_SCHEMA_COUNT"
  fi
  exit 0
fi
if [[ "$*" == *"SELECT storage_path"* ]]; then
  printf '%s\\n' "$*" > "$MOCK_QUERY_LOG"
  if [ "\${MOCK_AUTH_ERROR:-0}" = "1" ]; then
    echo "authentication failed" >&2
    exit 7
  fi
  if [ "\${MYSQL_PWD:-}" != "$MOCK_EXPECTED_PASSWORD" ]; then
    echo "authentication failed" >&2
    exit 7
  fi
  if [ "\${MOCK_REFERENCE_QUERY_ERROR:-0}" = "1" ]; then
    echo "reference query failed" >&2
    exit 8
  fi
  references="$MOCK_PDF_REFERENCES"
  if [ -f "$MOCK_RESTORE_MARKER" ] && [ "\${MOCK_RESTORED_REFERENCES_SET:-0}" = "1" ]; then
    references="$MOCK_RESTORED_PDF_REFERENCES"
  fi
  if [ -n "$references" ]; then
    printf '%s\\n' "$references"
  fi
  exit 0
fi
if [[ "$*" == *"--skip-column-names"* ]]; then
  while IFS= read -r query; do
    case "$query" in
      *GET_LOCK*)
        printf '%s\\n' "$*" > "$MOCK_LOCK_MYSQL_ARGS"
        printf '1\\n'
        ;;
      *RELEASE_LOCK*) printf '1\\n'; break ;;
    esac
  done
  exit 0
fi
cat >/dev/null
printf 'restored\\n' > "$MOCK_RESTORE_MARKER"
`;
  fs.writeFileSync(path.join(toolRoot, 'mysql'), mysqlMock);
  fs.writeFileSync(path.join(toolRoot, 'mysqldump'), `#!/usr/bin/env bash
printf 'CREATE TABLE \`customers\` (id INT);\\n'
if [ "$MOCK_SCHEMA_COUNT" = "1" ]; then
  printf 'CREATE TABLE \`contract_versions\` (id INT);\\n'
fi
`);
  fs.writeFileSync(path.join(toolRoot, 'find'), `#!/usr/bin/env bash
legacy_scan=0
for argument in "$@"; do
  if [ "$argument" = "-mindepth" ]; then
    legacy_scan=1
  fi
done
if [ "\${MOCK_FIND_FAILURE:-0}" = "1" ] && [ "$legacy_scan" = "1" ]; then
  printf 'legacy scan attempted\\n' > "$MOCK_FIND_MARKER"
  echo "injected find permission failure" >&2
  exit 13
fi
exec /usr/bin/find "$@"
`);
  fs.chmodSync(path.join(toolRoot, 'mysql'), 0o755);
  fs.chmodSync(path.join(toolRoot, 'mysqldump'), 0o755);
  fs.chmodSync(path.join(toolRoot, 'find'), 0o755);
  const bashEnv = path.join(tempRoot, 'bash-env');
  fs.writeFileSync(bashEnv, `hash -p '${toBashPath(path.join(toolRoot, 'find'))}' find\n`);

  const env = {
    ...process.env,
    BACKUP_DIR: toBashPath(backupRoot),
    BASH_ENV: toBashPath(bashEnv),
    MOCK_EXPECTED_PASSWORD: 'test-password',
    MOCK_FIND_MARKER: toBashPath(path.join(tempRoot, 'find-failure-marker.txt')),
    MOCK_LOCK_MYSQL_ARGS: toBashPath(path.join(tempRoot, 'lock-mysql-args.txt')),
    MOCK_PDF_REFERENCES: references,
    MOCK_QUERY_LOG: toBashPath(queryLog),
    MOCK_RESTORE_MARKER: toBashPath(restoreMarker),
    MOCK_RESTORED_SCHEMA_COUNT: schemaCount,
    MOCK_SCHEMA_COUNT: schemaCount,
    PATH: `${toBashPath(toolRoot)}:${process.env.PATH}`,
  };

  function runBackup(overrides = {}) {
    return spawnSync(gitBash, [backupScript], {
      cwd: projectRoot,
      env: { ...env, ...overrides },
      encoding: 'utf8',
    });
  }

  function runBackupGate(overrides = {}) {
    const bashBackupScript = toBashPath(backupScript);
    const migrationMarker = toBashPath(path.join(tempRoot, 'migration-marker.txt'));
    fs.writeFileSync(backupGateScript, [
      '#!/usr/bin/env bash',
      'set -euo pipefail',
      `BACKUP_OUTPUT="$("${bashBackupScript}")"`,
      `printf 'migration\\n' > "${migrationMarker}"`,
      '',
    ].join('\n'));
    return spawnSync(gitBash, [backupGateScript], {
      cwd: projectRoot,
      env: { ...env, ...overrides },
      encoding: 'utf8',
    });
  }

  function backupPathFor(result) {
    const match = result.stdout.match(/^BACKUP_FILE=(.+)$/m);
    if (!match) return null;
    return path.join(backupRoot, path.posix.basename(match[1]));
  }

  function runRestore(backupFile, overrides = {}) {
    return spawnSync(gitBash, [restoreScript, toBashPath(backupFile)], {
      cwd: projectRoot,
      env: { ...env, ...overrides },
      input: 'RESTORE\n',
      encoding: 'utf8',
    });
  }

  return {
    backupRoot,
    contractDirectory,
    env,
    pdfs,
    queryLog,
    restoreMarker,
    runBackup,
    runBackupGate,
    runRestore,
    backupPathFor,
    storageRoot,
    tempRoot,
  };
}

function removeFixture(fixture) {
  fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
}

function referenceFor(pdf) {
  return `${pdf.storageKey}\t${pdf.bytes.length}\t${pdf.hash}`;
}

function expectRestoreSuccess(restore) {
  if (restore.status !== 0) {
    throw new Error(`Restore command failed (${restore.status}): ${restore.stdout}\n${restore.stderr}`);
  }
}

describe('Contract PDF backup and restore scripts', () => {
  test('backs up and restores an old schema with no contract PDFs', () => {
    const fixture = createFixture({ schemaCount: '0' });
    try {
      const backup = fixture.runBackup();
      expect(backup.status).toBe(0);
      const backupFile = fixture.backupPathFor(backup);
      expect(backupFile).not.toBeNull();

      const restore = fixture.runRestore(backupFile);
      expectRestoreSuccess(restore);
      expect(fs.existsSync(fixture.restoreMarker)).toBe(true);
      expect(fs.existsSync(fixture.queryLog)).toBe(false);
      expect(restore.stdout).toContain('restored and verified');
    } finally {
      removeFixture(fixture);
    }
  });

  test('uses unbuffered MySQL output for the Contract PDF storage lock', () => {
    const fixture = createFixture({ schemaCount: '0' });
    try {
      const backup = fixture.runBackup();
      expect(backup.status).toBe(0);
      expect(fs.readFileSync(path.join(fixture.tempRoot, 'lock-mysql-args.txt'), 'utf8'))
        .toContain('--unbuffered');
    } finally {
      removeFixture(fixture);
    }
  });

  test('backs up and restores validated legacy PDFs when the old schema has no contract table', () => {
    const fixture = createFixture({
      schemaCount: '0',
      pdfFiles: [{ name: `${'a'.repeat(32)}.pdf` }],
    });
    try {
      const backup = fixture.runBackup();
      expect(backup.status).toBe(0);
      const backupFile = fixture.backupPathFor(backup);
      expect(backupFile).not.toBeNull();

      const restore = fixture.runRestore(backupFile);
      expectRestoreSuccess(restore);
      expect(fs.readFileSync(fixture.pdfs[0].path)).toEqual(fixture.pdfs[0].bytes);
      expect(fs.existsSync(fixture.queryLog)).toBe(false);
    } finally {
      removeFixture(fixture);
    }
  });

  test('backs up and restores a current schema with no PDF references', () => {
    const fixture = createFixture({ schemaCount: '1' });
    try {
      const backup = fixture.runBackup();
      expect(backup.status).toBe(0);
      const restore = fixture.runRestore(fixture.backupPathFor(backup));
      expectRestoreSuccess(restore);
      expect(fs.existsSync(fixture.queryLog)).toBe(true);
      expect(restore.stdout).toContain('restored and verified');
    } finally {
      removeFixture(fixture);
    }
  });

  test('preserves database authentication through reference queries and validates referenced PDFs', () => {
    const pdfName = `${'b'.repeat(32)}.pdf`;
    const fixture = createFixture({
      schemaCount: '1',
      pdfFiles: [{ name: pdfName }],
    });
    fixture.env.MOCK_PDF_REFERENCES = referenceFor(fixture.pdfs[0]);
    try {
      const backup = fixture.runBackup();
      expect(backup.status).toBe(0);
      expect(fs.existsSync(fixture.queryLog)).toBe(true);
      const restore = fixture.runRestore(fixture.backupPathFor(backup));
      expectRestoreSuccess(restore);
      expect(fs.readFileSync(fixture.pdfs[0].path)).toEqual(fixture.pdfs[0].bytes);
    } finally {
      removeFixture(fixture);
    }
  });

  test.each([
    ['schema inspection SQL failure', { MOCK_SCHEMA_QUERY_ERROR: '1' }],
    ['reference SQL failure', { MOCK_REFERENCE_QUERY_ERROR: '1' }],
    ['reference query authentication failure', { MOCK_AUTH_ERROR: '1' }],
  ])('aborts backup on %s', (_label, overrides) => {
    const fixture = createFixture({ schemaCount: '1' });
    try {
      const backup = fixture.runBackup(overrides);
      expect(backup.status).not.toBe(0);
      expect(backup.stdout).not.toMatch(/^BACKUP_FILE=/m);
      expect(fs.readdirSync(fixture.backupRoot).filter((name) => name.endsWith('.tar.gz'))).toHaveLength(0);
    } finally {
      removeFixture(fixture);
    }
  });

  test.each([
    ['missing referenced PDF', { pdfFiles: [], reference: `contract-versions/${'c'.repeat(32)}.pdf\t10\t${'d'.repeat(64)}` }],
    ['invalid storage path', { pdfFiles: [{ name: `${'e'.repeat(32)}.pdf` }], reference: `../${'e'.repeat(32)}.pdf\t10\t${'d'.repeat(64)}` }],
    ['size mismatch', { pdfFiles: [{ name: `${'f'.repeat(32)}.pdf` }], mismatch: 'size' }],
    ['hash mismatch', { pdfFiles: [{ name: `${'1'.repeat(32)}.pdf` }], mismatch: 'hash' }],
  ])('aborts backup on %s', (_label, scenario) => {
    const fixture = createFixture({
      schemaCount: '1',
      pdfFiles: scenario.pdfFiles,
    });
    let references = scenario.reference || '';
    if (scenario.mismatch) {
      const pdf = fixture.pdfs[0];
      references = scenario.mismatch === 'size'
        ? `${pdf.storageKey}\t${pdf.bytes.length + 1}\t${pdf.hash}`
        : `${pdf.storageKey}\t${pdf.bytes.length}\t${'0'.repeat(64)}`;
    }
    fixture.env.MOCK_PDF_REFERENCES = references;
    try {
      const backup = fixture.runBackup();
      expect(backup.status).not.toBe(0);
      expect(backup.stdout).not.toMatch(/^BACKUP_FILE=/m);
    } finally {
      removeFixture(fixture);
    }
  });

  test('rejects unrecognized files in legacy PDF storage instead of omitting them', () => {
    const fixture = createFixture({
      schemaCount: '0',
      pdfFiles: [{ name: 'unrecognized.pdf' }],
    });
    try {
      const backup = fixture.runBackup();
      expect(backup.status).not.toBe(0);
      expect(backup.stdout).not.toMatch(/^BACKUP_FILE=/m);
    } finally {
      removeFixture(fixture);
    }
  });

  test('aborts legacy backup when find cannot scan the PDF directory and blocks the migration gate', () => {
    const fixture = createFixture({ schemaCount: '0' });
    try {
      const backup = fixture.runBackupGate({ MOCK_FIND_FAILURE: '1' });
      expect(backup.status).not.toBe(0);
      expect(backup.stdout).not.toMatch(/^BACKUP_FILE=/m);
      expect(fs.existsSync(path.join(fixture.tempRoot, 'find-failure-marker.txt'))).toBe(true);
      expect(fs.existsSync(path.join(fixture.tempRoot, 'migration-marker.txt'))).toBe(false);
      expect(fs.readdirSync(fixture.backupRoot).filter((name) => name.endsWith('.tar.gz'))).toHaveLength(0);
    } finally {
      removeFixture(fixture);
    }
  });

  test('aborts when the legacy contract PDF directory does not exist', () => {
    const fixture = createFixture({ schemaCount: '0' });
    try {
      fs.rmSync(fixture.contractDirectory, { recursive: true, force: true });
      const backup = fixture.runBackup();
      expect(backup.status).not.toBe(0);
      expect(backup.stdout).not.toMatch(/^BACKUP_FILE=/m);
    } finally {
      removeFixture(fixture);
    }
  });

  test('rejects a corrupt archive before changing the database or existing PDF storage', () => {
    const fixture = createFixture({
      schemaCount: '1',
      pdfFiles: [{ name: `${'2'.repeat(32)}.pdf` }],
    });
    try {
      const backup = fixture.runBackup();
      expect(backup.status).toBe(0);
      const backupFile = fixture.backupPathFor(backup);
      const originalPdf = Buffer.from('existing production PDF directory content');
      fs.writeFileSync(fixture.pdfs[0].path, originalPdf);
      fs.appendFileSync(backupFile, Buffer.from('corrupt'));

      const restore = fixture.runRestore(backupFile);
      expect(restore.status).not.toBe(0);
      expect(restore.stdout).not.toContain('restored and verified');
      expect(fs.existsSync(fixture.restoreMarker)).toBe(false);
      expect(fs.readFileSync(fixture.pdfs[0].path)).toEqual(originalPdf);
    } finally {
      removeFixture(fixture);
    }
  });

  test('rejects legacy restore into a target that would retain contract_versions', () => {
    const fixture = createFixture({ schemaCount: '0' });
    try {
      const backup = fixture.runBackup();
      expect(backup.status).toBe(0);
      const restore = fixture.runRestore(fixture.backupPathFor(backup), {
        MOCK_SCHEMA_COUNT: '1',
        MOCK_RESTORED_SCHEMA_COUNT: '1',
      });
      expect(restore.status).not.toBe(0);
      expect(restore.stdout).not.toContain('restored and verified');
      expect(fs.existsSync(fixture.restoreMarker)).toBe(false);
    } finally {
      removeFixture(fixture);
    }
  });

  test('does not report success when post-restore PDF references fail manifest validation', () => {
    const fixture = createFixture({
      schemaCount: '1',
      pdfFiles: [{ name: `${'3'.repeat(32)}.pdf` }],
    });
    fixture.env.MOCK_PDF_REFERENCES = referenceFor(fixture.pdfs[0]);
    try {
      const backup = fixture.runBackup();
      expect(backup.status).toBe(0);
      const restore = fixture.runRestore(fixture.backupPathFor(backup), {
        MOCK_RESTORED_REFERENCES_SET: '1',
        MOCK_RESTORED_PDF_REFERENCES: '',
      });
      expect(restore.status).not.toBe(0);
      expect(restore.stdout).not.toContain('restored and verified');
      expect(restore.stderr).toContain('Restored PDF storage contains missing or unexpected files');
    } finally {
      removeFixture(fixture);
    }
  });

  test('preserves a competing checksum sidecar replaced before cleanup when archive publication loses a race', () => {
    const fixture = createFixture({ schemaCount: '1' });
    const raceToolRoot = path.join(fixture.tempRoot, 'race-tools');
    const raceMarker = path.join(fixture.tempRoot, 'archive-publish-race.txt');
    const toBashPath = (value) => (process.platform === 'win32'
      ? `/${value[0].toLowerCase()}${value.slice(2).replace(/\\/g, '/')}`
      : value);
    try {
      fs.mkdirSync(raceToolRoot);
      fs.writeFileSync(path.join(raceToolRoot, 'mv'), `#!/usr/bin/env bash
set -e
source_path="\${@: -2:1}"
destination="\${@: -1}"
if [[ "\${source_path##*/}" == .pets_backup_*.tar.gz.tmp \
  && "\${destination##*/}" == pets_backup_*.tar.gz ]]; then
  printf 'archive-publish-race\\n' > "$MOCK_ARCHIVE_RACE_MARKER"
  printf 'competing archive\\n' > "$destination"
  /usr/bin/stat -c '%d:%i' -- "\${destination}.sha256" > "$MOCK_CHECKSUM_IDENTITY"
  rm -- "\${destination}.sha256"
  printf 'competing checksum\\n' > "\${destination}.sha256"
fi
exec /usr/bin/mv "$@"
`);
      fs.chmodSync(path.join(raceToolRoot, 'mv'), 0o755);
      fs.appendFileSync(
        path.join(fixture.tempRoot, 'bash-env'),
        `hash -p '${toBashPath(path.join(raceToolRoot, 'mv'))}' mv\n`,
      );

      const backup = fixture.runBackup({
        MOCK_CHECKSUM_IDENTITY: toBashPath(path.join(fixture.tempRoot, 'checksum-identity.txt')),
        MOCK_ARCHIVE_RACE_MARKER: toBashPath(raceMarker),
      });

      expect(backup.status).not.toBe(0);
      expect(backup.stderr).toContain('Could not publish the backup archive.');
      expect(fs.readFileSync(raceMarker, 'utf8')).toBe('archive-publish-race\n');
      expect(fs.readFileSync(path.join(fixture.tempRoot, 'checksum-identity.txt'), 'utf8').trim())
        .toMatch(/^\d+:\d+$/);

      const archiveFiles = fs.readdirSync(fixture.backupRoot)
        .filter((name) => name.endsWith('.tar.gz'));
      expect(archiveFiles).toHaveLength(1);
      const archiveFile = path.join(fixture.backupRoot, archiveFiles[0]);
      expect(fs.readFileSync(archiveFile, 'utf8')).toBe('competing archive\n');
      expect(fs.readFileSync(`${archiveFile}.sha256`, 'utf8')).toBe('competing checksum\n');
    } finally {
      removeFixture(fixture);
    }
  });
});
