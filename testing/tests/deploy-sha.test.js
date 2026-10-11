const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const gitBash = process.platform === 'win32'
  ? 'C:\\Program Files\\Git\\bin\\bash.exe'
  : '/bin/bash';

function createFixture() {
  if (!fs.existsSync(gitBash)) {
    throw new Error(`Bash is required for the deployment SHA test: ${gitBash}`);
  }

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pets-deploy-sha-test-'));
  const projectRoot = path.join(root, 'project');
  const remoteRoot = path.join(root, 'origin.git');
  const toolRoot = path.join(root, 'tools');
  const markerFile = path.join(root, 'deployment-operations.txt');
  const backupFile = path.join(root, 'backup.tar.gz');
  const stateDir = path.join(root, 'state');
  const logDir = path.join(stateDir, 'logs');
  const bashEnv = path.join(root, 'bash-env');
  fs.mkdirSync(path.join(projectRoot, 'deploy'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, 'backend'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, 'frontend'), { recursive: true });
  fs.mkdirSync(toolRoot, { recursive: true });
  fs.writeFileSync(bashEnv, 'curl() { return 0; }\nexport -f curl\n');

  const runGit = (cwd, ...args) => {
    const result = spawnSync('git', ['-C', cwd, ...args], {
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'Deployment SHA Test',
        GIT_AUTHOR_EMAIL: 'deployment-sha-test@example.invalid',
        GIT_COMMITTER_NAME: 'Deployment SHA Test',
        GIT_COMMITTER_EMAIL: 'deployment-sha-test@example.invalid',
      },
    });
    if (result.status !== 0) {
      throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
    }
    return result.stdout.trim();
  };

  const sourceScript = path.resolve(__dirname, '..', '..', 'deploy', 'deploy.sh');
  fs.copyFileSync(sourceScript, path.join(projectRoot, 'deploy', 'deploy.sh'));
  fs.writeFileSync(path.join(projectRoot, 'deploy', 'backup.sh'), [
    '#!/usr/bin/env bash',
    'set -euo pipefail',
    'printf "backup\\n" >> "$MOCK_OPERATION_MARKER"',
    ': > "$MOCK_BACKUP_FILE"',
    'printf "BACKUP_FILE=%s\\n" "$MOCK_BACKUP_FILE"',
    '',
  ].join('\n'));
  fs.chmodSync(path.join(projectRoot, 'deploy', 'backup.sh'), 0o755);
  fs.writeFileSync(path.join(projectRoot, 'app.txt'), 'target version\n');

  spawnSync('git', ['init', '--bare', '--initial-branch=master', remoteRoot], { encoding: 'utf8' });
  spawnSync('git', ['init', '--initial-branch=master', projectRoot], { encoding: 'utf8' });
  runGit(projectRoot, 'config', 'user.name', 'Deployment SHA Test');
  runGit(projectRoot, 'config', 'user.email', 'deployment-sha-test@example.invalid');
  runGit(projectRoot, 'add', '.');
  runGit(projectRoot, 'commit', '-m', 'target commit');
  const targetSha = runGit(projectRoot, 'rev-parse', 'HEAD');
  runGit(projectRoot, 'remote', 'add', 'origin', remoteRoot);
  runGit(projectRoot, 'push', '-u', 'origin', 'master');

  const installMock = (name, body) => {
    const filePath = path.join(toolRoot, name);
    fs.writeFileSync(filePath, `#!/usr/bin/env bash\n${body}\n`);
    fs.chmodSync(filePath, 0o755);
  };
  installMock('npm', 'printf "npm %s\\n" "$*" >> "$MOCK_OPERATION_MARKER"');
  installMock('node', 'printf "migration\\n" >> "$MOCK_OPERATION_MARKER"');
  installMock('sudo', 'printf "restart %s\\n" "$*" >> "$MOCK_OPERATION_MARKER"');
  installMock('systemctl', 'printf "systemctl %s\\n" "$*" >> "$MOCK_OPERATION_MARKER"; exit 0');
  installMock('curl', 'exit 0');

  const env = {
    ...process.env,
    PATH: `${toolRoot}${path.delimiter}${process.env.PATH}`,
    STATE_DIR: stateDir,
    BASH_ENV: process.platform === 'win32'
      ? `/${bashEnv[0].toLowerCase()}${bashEnv.slice(2).replace(/\\/g, '/')}`
      : bashEnv,
    MOCK_BACKUP_FILE: backupFile,
    MOCK_OPERATION_MARKER: markerFile,
  };

  function runDeploy(args = []) {
    return spawnSync(gitBash, [path.join(projectRoot, 'deploy', 'deploy.sh'), ...args], {
      cwd: projectRoot,
      env,
      encoding: 'utf8',
    });
  }

  function operations() {
    return fs.existsSync(markerFile) ? fs.readFileSync(markerFile, 'utf8') : '';
  }

  return {
    env,
    logDir,
    markerFile,
    operations,
    projectRoot,
    remoteRoot,
    root,
    runDeploy,
    runGit,
    targetSha,
    toolRoot,
  };
}

describe('deployment target SHA validation', () => {
  let fixture;

  beforeEach(() => {
    fixture = createFixture();
  });

  afterEach(() => {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  });

  test('deploys only a valid requested SHA and records it as the final target', () => {
    const result = fixture.runDeploy([fixture.targetSha]);

    if (result.status !== 0) {
      throw new Error(`Deployment failed:\n${result.stdout}\n${result.stderr}`);
    }
    expect(fixture.runGit(fixture.projectRoot, 'rev-parse', 'HEAD')).toBe(fixture.targetSha);
    const state = fs.readFileSync(path.join(fixture.env.STATE_DIR, 'deployment.state'), 'utf8');
    expect(state).toContain(`commit=${fixture.targetSha}`);
    expect(state).toContain('status=DEPLOYED');
    expect(fixture.operations()).toContain('migration');
    expect(fixture.operations()).toContain('backup');
  });

  test('rejects a missing SHA before creating deployment state or running deployment operations', () => {
    const result = fixture.runDeploy();

    expect(result.status).toBe(2);
    expect(fixture.operations()).toBe('');
    expect(fs.existsSync(fixture.env.STATE_DIR)).toBe(false);
  });

  test('rejects a malformed SHA before creating deployment state or running deployment operations', () => {
    const result = fixture.runDeploy(['not-a-sha']);

    expect(result.status).toBe(2);
    expect(fixture.operations()).toBe('');
    expect(fs.existsSync(fixture.env.STATE_DIR)).toBe(false);
  });

  test('rejects a syntactically valid SHA that does not exist in the repository objects', () => {
    const result = fixture.runDeploy(['0000000000000000000000000000000000000000']);

    expect(result.status).not.toBe(0);
    expect(fixture.operations()).toBe('');
    expect(fs.readFileSync(path.join(fixture.env.STATE_DIR, 'deployment.state'), 'utf8'))
      .toContain('status=FAILED');
  });

  test('rejects an existing commit that is not in fetched GitHub master history', () => {
    fixture.runGit(fixture.projectRoot, 'checkout', '-b', 'side');
    fs.writeFileSync(path.join(fixture.projectRoot, 'side.txt'), 'side-only commit\n');
    fixture.runGit(fixture.projectRoot, 'add', 'side.txt');
    fixture.runGit(fixture.projectRoot, 'commit', '-m', 'side-only commit');
    const sideSha = fixture.runGit(fixture.projectRoot, 'rev-parse', 'HEAD');
    fixture.runGit(fixture.projectRoot, 'push', 'origin', 'side');
    fixture.runGit(fixture.projectRoot, 'fetch', 'origin', 'refs/heads/side');
    fixture.runGit(fixture.projectRoot, 'checkout', '--detach', fixture.targetSha);

    const result = fixture.runDeploy([sideSha]);

    expect(result.status).not.toBe(0);
    expect(fixture.operations()).toBe('');
    expect(fs.readFileSync(path.join(fixture.env.STATE_DIR, 'deployment.state'), 'utf8'))
      .toContain(`commit=${sideSha}`);
    expect(fs.readFileSync(path.join(fixture.env.STATE_DIR, 'deployment.state'), 'utf8'))
      .toContain('status=FAILED');
  });

  test('rejects the requested target when GitHub master advances beyond it', () => {
    fs.writeFileSync(path.join(fixture.projectRoot, 'app.txt'), 'newer master version\n');
    fixture.runGit(fixture.projectRoot, 'add', 'app.txt');
    fixture.runGit(fixture.projectRoot, 'commit', '-m', 'newer master commit');
    const newerMasterSha = fixture.runGit(fixture.projectRoot, 'rev-parse', 'HEAD');
    fixture.runGit(fixture.projectRoot, 'push', 'origin', 'master');
    fixture.runGit(fixture.projectRoot, 'checkout', '--detach', fixture.targetSha);
    const productionShaBeforeDeploy = fixture.runGit(fixture.projectRoot, 'rev-parse', 'HEAD');
    const remoteMaster = spawnSync('git', ['ls-remote', fixture.remoteRoot, 'refs/heads/master'], {
      encoding: 'utf8',
    });
    expect(remoteMaster.status).toBe(0);
    const githubMasterSha = remoteMaster.stdout.split(/\s+/)[0];
    expect(githubMasterSha).toBe(newerMasterSha);

    const result = fixture.runDeploy([fixture.targetSha]);

    expect(result.status).not.toBe(0);
    expect(fixture.operations()).not.toMatch(/backup|migration|npm|restart|systemctl/i);
    expect(fixture.runGit(fixture.projectRoot, 'rev-parse', 'HEAD')).toBe(productionShaBeforeDeploy);
    expect(fixture.runGit(fixture.projectRoot, 'rev-parse', 'HEAD')).not.toBe(newerMasterSha);
    const state = fs.readFileSync(path.join(fixture.env.STATE_DIR, 'deployment.state'), 'utf8');
    expect(state).toContain(`commit=${fixture.targetSha}`);
    expect(state).toContain('status=FAILED');
  });
});
