'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { HOST, PORT, PUBLIC_ROOT, createServer } = require('../server');

async function withServer(run, operations) {
  const server = createServer({ host: HOST, port: 0, operations });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, HOST, resolve);
  });
  try {
    await run(`http://${HOST}:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('首頁、CSS 與前端 JavaScript 可正常取得', async () => {
  await withServer(async (base) => {
    for (const [route, type] of [['/', 'text/html'], ['/styles.css', 'text/css'], ['/app.js', 'text/javascript']]) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200, route);
      assert.match(response.headers.get('content-type'), new RegExp(type));
      assert.ok((await response.text()).length > 0);
    }
  });
});

test('查看狀態以唯讀 mock 顯示本機與 GitHub master SHA', async () => {
  const { OperationsManager } = require('../operations');
  const manager = new OperationsManager();
  const localSha = 'a'.repeat(40);
  const githubSha = 'b'.repeat(40);
  manager.git = async (args) => {
    if (args[0] === 'branch') return 'master';
    if (args[0] === 'rev-parse') return localSha;
    if (args[0] === 'status') return '';
    if (args[0] === 'remote') return 'https://github.com/example/Pets.git';
    throw new Error('Unexpected git query');
  };
  manager.run = async () => ({
    stdout: `${githubSha}\trefs/heads/master\n`,
    stderr: '', error: null, timedOut: false, exitCode: 0,
  });
  const status = await manager.getLocalStatus();
  assert.equal(status.head, localSha);
  assert.equal(status.githubMaster, githubSha);
  assert.equal(status.clean, true);
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
  assert.match(html, /id="github-master"/);
  assert.match(app, /local\.githubMaster/);
});

test('不存在的路徑回傳 404', async () => {
  await withServer(async (base) => {
    const response = await fetch(base + '/missing-file');
    assert.equal(response.status, 404);
  });
});

test('路徑穿越請求不會讀取管理中心目錄外的檔案', async () => {
  const outside = path.resolve(PUBLIC_ROOT, '..', 'README.md');
  assert.equal(fs.existsSync(outside), true, 'traversal target should exist outside public');
  await withServer(async (base) => {
    const response = await fetch(base + '/%2e%2e%2fREADME.md');
    assert.notEqual(response.status, 200);
    assert.ok([400, 403, 404].includes(response.status));
  });
});

test('服務使用固定連接埠並只監聽 127.0.0.1', async () => {
  assert.equal(HOST, '127.0.0.1');
  assert.equal(PORT, 4173);
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, HOST, resolve);
  });
  assert.equal(server.address().address, '127.0.0.1');
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('固定連接埠被占用時會清楚失敗，不會改用其他連接埠', async () => {
  const blocker = createServer();
  await new Promise((resolve, reject) => {
    blocker.once('error', reject);
    blocker.listen(0, HOST, resolve);
  });
  try {
    const occupiedPort = blocker.address().port;
    const script = "require('./server').start({ port: Number(process.argv[1]), openBrowserFunction() {} })";
    const child = spawn(process.execPath, ['-e', script, String(occupiedPort)], {
      cwd: path.join(__dirname, '..'), windowsHide: true,
    });
    let output = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => { output += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { output += chunk; });
    const exitCode = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', resolve);
    });
    assert.equal(exitCode, 1);
    assert.match(output, new RegExp(`連接埠 ${occupiedPort} 已被使用`));
  } finally {
    await new Promise((resolve, reject) => blocker.close((error) => error ? reject(error) : resolve()));
  }
});

test('四項功能提供固定操作入口，未啟用文案已移除', () => {
  const html = fs.readFileSync(path.join(PUBLIC_ROOT, 'index.html'), 'utf8');
  for (const [name, action] of [['更新網站', 'deploy'], ['建立備份', 'backup'], ['還原資料', 'restore'], ['查看狀態', 'status']]) {
    assert.match(html, new RegExp(`<h3>${name}</h3>[\\s\\S]*?data-action="${action}"`));
  }
  const js = fs.readFileSync(path.join(PUBLIC_ROOT, 'app.js'), 'utf8');
  for (const route of ['/api/status/local', '/api/status/production', '/api/backups', '/api/operations']) {
    assert.ok(js.includes(route), `missing fixed API route ${route}`);
  }
  assert.doesNotMatch(js, /child_process|XMLHttpRequest|WebSocket|\bexec\s*\(/i);
  assert.doesNotMatch(html, /尚未啟用/);
});

test('API 需要本機來源與每次啟動權杖；拒絕任意操作與非法還原輸入', async () => {
  const calls = [];
  const operations = {
    token: 'test-only-token',
    async getLocalStatus() { return { branch: 'test', clean: true, head: 'a'.repeat(40) }; },
    async getProductionStatus(credentials) { calls.push({ productionStatus: { ...credentials } }); return { available: false, reason: 'mock' }; },
    async listBackups() { calls.push('list-backups'); return { database: 'mock', backups: [] }; },
    async startOperation(kind, body) { calls.push({ kind, body }); return { id: 'mock-id' }; },
    getOperation() { return null; },
    async submitConfirmation() { return {}; },
    async cancelAtPrompt() { return {}; },
  };
  await withServer(async (base) => {
    const page = await fetch(base + '/');
    assert.match(await page.text(), /name="ops-token" content="test-only-token"/);
    assert.equal((await fetch(base + '/api/status/local')).status, 403);
    assert.equal((await fetch(base + '/api/status/local', {
      headers: { 'X-Ops-Token': operations.token, Origin: 'http://localhost:4173' },
    })).status, 403);
    assert.equal((await fetch(base + '/api/status/local', {
      headers: { 'X-Ops-Token': operations.token },
    })).status, 200);
    const post = (body) => fetch(base + '/api/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Ops-Token': operations.token, Origin: base },
      body: JSON.stringify(body),
    });
    const statusPost = (body) => fetch(base + '/api/status/production', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Ops-Token': operations.token, Origin: base },
      body: JSON.stringify(body),
    });
    assert.equal((await statusPost({ username: 'zhe', password: '' })).status, 400);
    const statusResponse = await statusPost({ username: 'zhe', password: 'mock-secret' });
    assert.equal(statusResponse.status, 200);
    assert.doesNotMatch(await statusResponse.text(), /mock-secret/);
    assert.equal((await post({ kind: 'arbitrary-command', command: 'not allowed' })).status, 400);
    assert.equal((await post({ kind: 'restore', backupName: '../../secret', servicesStopped: true, confirmation: 'RESTORE' })).status, 400);
    assert.deepEqual(calls, [{ productionStatus: { username: 'zhe', password: 'mock-secret' } }]);
  }, operations);
});

test('操作模組固定 Production 目標並驗證狀態、備份名稱及輸出遮罩', () => {
  const { PRODUCTION, SAFE_BACKUP_NAME, quotePosix, safeText, parseDeploymentState } = require('../operations');
  assert.deepEqual(PRODUCTION, {
    host: '175.183.34.91', username: 'zhe', projectRoot: '/home/zhe/pets',
    backupDirectory: '/home/zhe/pets-backups', stateFile: '/home/zhe/pets-deploy-state/deployment.state',
  });
  assert.equal(SAFE_BACKUP_NAME.test('pets_backup_20261020_123456.tar.gz'), true);
  assert.equal(SAFE_BACKUP_NAME.test('../pets_backup_20261020_123456.tar.gz'), false);
  assert.equal(quotePosix("a'b"), "'a'\\''b'");
  assert.equal(safeText('TOKEN=secret'), 'TOKEN=[REDACTED]');
  const state = [
    'status=SUCCESS', `commit=${'a'.repeat(40)}`, `previous_commit=${'b'.repeat(40)}`,
    'timestamp=2026-10-20T12:00:00+08:00', 'backup=/home/zhe/pets-backups/pets_backup_20261020_120000.tar.gz',
    'verification=PASS', 'log_file=/home/zhe/pets-deploy-state/logs/deploy-20261020-120000.log',
    'verified_at=2026-10-20T12:10:00+08:00',
  ].join('\n');
  assert.equal(parseDeploymentState(state).status, 'SUCCESS');
  assert.throws(
    () => parseDeploymentState(state.split('\n').filter((line) => !line.startsWith('previous_commit=')).join('\n')),
    /缺少必要欄位：previous_commit/,
  );
  assert.throws(() => parseDeploymentState(''), /沒有收到資料；遠端狀態檔可能是空檔/);
  assert.throws(() => parseDeploymentState(`${state}\nunknown=field`));
});

test('Production 密碼查詢啟動失敗時回傳可呈現的未確認狀態', async () => {
  const { OperationsManager } = require('../operations');
  const manager = new OperationsManager();
  manager.runPasswordSshStatus = async () => { throw new Error('本機 SSH.NET 相依檔案不完整；未建立連線。'); };
  assert.deepEqual(await manager.getProductionStatus({ username: 'zhe', password: 'mock-secret' }), {
    available: false,
    reason: '本機 SSH.NET 相依檔案不完整；未建立連線。',
  });
});

test('Production SSH 固定診斷代碼轉成安全且可行動的提示', async () => {
  const { OperationsManager } = require('../operations');
  const cases = [
    ['HOST_KEY_MISMATCH', /主機指紋與固定值不符/],
    ['KEY_EXCHANGE_FAILED', /沒有相容的 SSH 金鑰交換演算法/],
    ['SSH_HANDSHAKE_FAILED', /SSH 交握階段/],
    ['CONNECT_DEPENDENCY_MISSING', /缺少執行階段組件/],
    ['AUTHENTICATION_REJECTED', /伺服器拒絕密碼認證/],
    ['TIMEOUT', /連線逾時/],
    ['CONNECTION_REFUSED', /拒絕 SSH 連線/],
    ['CONNECTION_RESET', /連線在完成前被伺服器或網路中斷/],
    ['SOCKET_FAILURE', /SSH 網路連線失敗/],
    ['DEPENDENCY_ERROR', /SSH 元件載入失敗/],
    ['DEPENDENCY_LOAD_FAILED', /DLL 存在，但 Windows PowerShell 無法載入/],
    ['SSH_TYPE_MISSING', /缺少必要 SSH 類型/],
    ['AUTHENTICATION_SETUP_FAILED', /尚未連線伺服器/],
  ];
  for (const [category, expected] of cases) {
    const manager = new OperationsManager();
    manager.runPasswordSshStatus = async () => ({ exitCode: 1, stdout: '', stderr: `PROD_SSH_ERROR=${category}\n`, error: null, timedOut: false });
    const status = await manager.getProductionStatus({ username: 'zhe', password: 'mock-secret' });
    assert.equal(status.available, false);
    assert.match(status.reason, expected);
    assert.doesNotMatch(status.reason, /mock-secret/);
  }
});

test('Production SSH 連線診斷只顯示受限的例外類型，不顯示原始例外內容', async () => {
  const { OperationsManager } = require('../operations');
  const manager = new OperationsManager();
  manager.runPasswordSshStatus = async () => ({
    exitCode: 1, stdout: '',
    stderr: [
      'PROD_SSH_ERROR=SSH_CONNECT_FAILED',
      'PROD_SSH_STAGE=CONNECT',
      'PROD_SSH_HOSTKEY_EVENT=False',
      'PROD_SSH_MISSING_ASSEMBLY=System.Collections',
      'PROD_SSH_EXCEPTION_CHAIN=System.Management.Automation.MethodInvocationException|System.InvalidOperationException',
      'Exception message contains mock-secret',
    ].join('\n'), error: null, timedOut: false,
  });
  const status = await manager.getProductionStatus({ username: 'zhe', password: 'mock-secret' });
  assert.match(status.reason, /階段 CONNECT/);
  assert.match(status.reason, /主機指紋事件 未觸發/);
  assert.match(status.reason, /缺少組件 System.Collections/);
  assert.match(status.reason, /System\.InvalidOperationException/);
  assert.doesNotMatch(status.reason, /mock-secret|Exception message/);
});

test('SSH.NET PowerShell helper 明列 System.ValueTuple 相依並在 SSH.NET 前載入', () => {
  const helper = fs.readFileSync(path.join(__dirname, '..', 'ssh-password-status.ps1'), 'utf8');
  const tuplePath = 'System.ValueTuple.4.6.2\\lib\\net462\\System.ValueTuple.dll';
  const sshPath = 'SSH.NET.2026.0.0\\lib\\net462\\Renci.SshNet.dll';
  assert.ok(helper.includes(tuplePath));
  assert.ok(helper.indexOf(tuplePath) < helper.indexOf(sshPath));
});

test('SSH.NET 連線前只註冊已核准套件路徑的組件解析器', () => {
  const helper = fs.readFileSync(path.join(__dirname, '..', 'ssh-password-status.ps1'), 'utf8');
  const resolverRegistration = helper.indexOf('[PetsOperations.SshPackageResolver]::Register([string[]]$assemblyPaths)');
  const connectCall = helper.indexOf('$client.Connect()');
  assert.ok(helper.includes('class SshPackageResolver'));
  assert.ok(helper.includes('Paths.TryGetValue(requested.Name, out path)'));
  assert.ok(resolverRegistration >= 0 && resolverRegistration < connectCall);
  assert.ok(helper.includes('Assembly.LoadFrom(path)'));
  assert.ok(helper.includes('class SshHostKeyVerifier'));
  assert.ok(helper.includes('CreateHostKeyHandler('));
  assert.doesNotMatch(helper, /add_HostKeyReceived\s*\(\s*\{/);
});

test('Production 狀態查詢轉送 SSH.NET 命令輸出', () => {
  const helper = fs.readFileSync(path.join(__dirname, '..', 'ssh-password-status.ps1'), 'utf8');
  assert.match(helper, /\$commandOutput = \$sshCommand\.Execute\(\)\s*if \(\$commandOutput\) \{ \[Console\]::Out\.Write\(\$commandOutput\) \}/);
  assert.doesNotMatch(helper, /\$result\.Output/);
});

test('確認文字必須精確符合目前等待中的部署關卡', async () => {
  const { OperationsManager } = require('../operations');
  const manager = new OperationsManager();
  let resolvePrompt;
  const operation = {
    id: 'mock-operation', kind: 'deploy', status: 'waiting-confirmation', stage: 'browser-acceptance',
    createdAt: manager.now(), updatedAt: manager.now(), confirmation: { type: 'browser-acceptance', message: 'Mock prompt' },
    summary: null, output: [], error: null, result: null,
    pendingPrompt: 'browser-acceptance', promptResolver: { resolve: (value) => { resolvePrompt = value; } },
  };
  manager.operations.set(operation.id, operation);
  await assert.rejects(manager.submitConfirmation(operation.id, 'DEPLOY'), /確認文字/);
  await manager.submitConfirmation(operation.id, 'PASS');
  assert.equal(resolvePrompt, 'PASS');
});

test('deploy-freeze confirmation reports a clear deployment stage', async () => {
  const { OperationsManager } = require('../operations');
  const manager = new OperationsManager();
  const expectedCommit = '6b7a79a9651e189600535095a418aaa40bc92514';
  const operation = {
    id: 'mock-freeze-operation', kind: 'deploy', status: 'waiting-confirmation', stage: 'deploy-freeze',
    createdAt: manager.now(), updatedAt: manager.now(),
    confirmation: { type: 'deploy-freeze', message: 'Mock prompt', expectedCommit },
    summary: null, output: [], error: null, result: null,
    pendingPrompt: 'deploy-freeze', promptResolver: null,
  };
  manager.operations.set(operation.id, operation);
  const child = { stdin: { write: (value) => { operation.stdinValue = value; } } };
  const promptPromise = manager.waitForPrompt(operation, child, { type: 'deploy-freeze', expectedCommit, message: 'Mock prompt' });
  await manager.submitConfirmation(operation.id, `DEPLOY ${expectedCommit} FREEZE`);
  await promptPromise;
  assert.equal(operation.stdinValue, `DEPLOY ${expectedCommit} FREEZE\n`);
  assert.equal(operation.status, 'running');
  assert.notEqual(operation.stage, 'deploy-freeze');
  assert.match(operation.output[0], /deploy-freeze/);
});

test('GitHub 推送結果未確認時不會誤報為 Production 部署已開始', () => {
  const deployment = fs.readFileSync(path.join(__dirname, '..', '..', 'deploy-production.ps1'), 'utf8');
  const operations = fs.readFileSync(path.join(__dirname, '..', 'operations.js'), 'utf8');
  assert.match(deployment, /phase = \$script:DeploymentPhase/);
  assert.match(deployment, /\$script:DeploymentPhase = 'github-push'/);
  assert.match(operations, /parsed\.result\.phase === 'github-push'/);
  assert.match(operations, /正式伺服器部署尚未開始/);
});

test('取消等待中的部署確認會送出空值，不接受替代確認字串', async () => {
  const { OperationsManager } = require('../operations');
  const manager = new OperationsManager();
  let resolvePrompt;
  const operation = {
    id: 'mock-cancel-operation', kind: 'deploy', status: 'waiting-confirmation', stage: 'remote-confirmation',
    createdAt: manager.now(), updatedAt: manager.now(), confirmation: { type: 'remote-confirmation', message: 'Mock prompt' },
    summary: null, output: [], error: null, result: null,
    pendingPrompt: 'remote-confirmation', promptResolver: { resolve: (value) => { resolvePrompt = value; } },
  };
  manager.operations.set(operation.id, operation);
  await assert.rejects(manager.submitConfirmation(operation.id, 'NO'), /確認文字/);
  await manager.cancelAtPrompt(operation.id);
  assert.equal(resolvePrompt, '');
});

test('遠端備份逾時會標示結果未確認，mock 不會連線 Production', async () => {
  const { OperationsManager } = require('../operations');
  const manager = new OperationsManager();
  manager.runPasswordSshStatus = async () => ({ exitCode: null, stdout: '', stderr: 'PROD_SSH_COMMAND_STARTED=1', error: null, timedOut: true });
  const operation = await manager.startOperation('backup', { confirmation: 'BACKUP', credentials: { username: 'mock-user', password: 'mock-password' } });
  await manager.operations.get(operation.id).promise;
  const result = manager.getOperation(operation.id);
  assert.equal(result.status, 'unconfirmed');
  assert.match(result.error, /結果未確認/);
});

test('備份與還原腳本明確回報失敗時標示失敗；mock 不會連線 Production', async () => {
  const { OperationsManager } = require('../operations');
  const backupManager = new OperationsManager();
  backupManager.runPasswordSshStatus = async () => ({ exitCode: 2, stdout: '[backup.sh ERROR] mock failure', stderr: '', error: null, timedOut: false });
  const backup = await backupManager.startOperation('backup', { confirmation: 'BACKUP', credentials: { username: 'mock-user', password: 'mock-password' } });
  await backupManager.operations.get(backup.id).promise;
  assert.equal(backupManager.getOperation(backup.id).status, 'failed');

  const restoreManager = new OperationsManager();
  let restoreCall = 0;
  restoreManager.runSsh = async () => {
    restoreCall += 1;
    return restoreCall === 1
      ? { exitCode: 0, stdout: '', stderr: '', error: null, timedOut: false }
      : { exitCode: 1, stdout: '[restore.sh ERROR] mock failure', stderr: '', error: null, timedOut: false };
  };
  const restore = await restoreManager.startOperation('restore', {
    backupName: 'pets_backup_20261020_123456.tar.gz', servicesStopped: true, confirmation: 'RESTORE',
  });
  await restoreManager.operations.get(restore.id).promise;
  assert.equal(restoreManager.getOperation(restore.id).status, 'failed');
});

test('啟動檔與服務入口使用同一路徑及連接埠', () => {
  const bat = fs.readFileSync(path.join(__dirname, '..', '啟動管理中心.bat'), 'utf8');
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(bat, /node\.exe "%~dp0server\.js"/i);
  assert.match(bat, /randomUUID/);
  assert.match(server, /const HOST = '127\.0\.0\.1'/);
  assert.match(server, /const PORT = 4173/);
  assert.match(server, /function start\(\{ host = HOST, port = PORT/);
  assert.match(server, /server\.listen\(port, host/);
  assert.match(server, /const url = `http:\/\/\$\{host\}:\$\{port\}\//);
});
