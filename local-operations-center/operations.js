'use strict';

const { randomBytes, randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PRODUCTION = Object.freeze({
  host: '175.183.34.91',
  username: 'zhe',
  projectRoot: '/home/zhe/pets',
  backupDirectory: '/home/zhe/pets-backups',
  stateFile: '/home/zhe/pets-deploy-state/deployment.state',
});
const SAFE_BACKUP_NAME = /^pets_backup_\d{8}_\d{6}\.tar\.gz$/;
const MUTATING_ACTIONS = new Set(['backup', 'deploy', 'restore']);
const OPERATION_OUTPUT_LIMIT = 80;
const OUTPUT_LINE_LIMIT = 1200;
const GIT_MUTATION_TIMEOUT = 120000;
const BLOCKED_REVIEW_PATH = /(^|[\\/])\.github([\\/]|$)/i;
const SENSITIVE_REVIEW_PATH = /(^|[\\/])(?:\.env(?:\.|$)|[^\\/]*(?:\.pem|\.key|\.pfx|\.p12|\.cer|\.crt)$|id_(?:rsa|ed25519)|[^\\/]*(?:secret|credential|password)[^\\/]*$)/i;
const REVIEWED_PASSWORD_DIAGNOSTIC = 'local-operations-center/ssh-password-status.ps1';

function isSensitiveReviewPath(filePath) {
  const normalizedPath = String(filePath).replace(/\\/g, '/');
  return normalizedPath !== REVIEWED_PASSWORD_DIAGNOSTIC && SENSITIVE_REVIEW_PATH.test(filePath);
}

function safeText(value) {
  return String(value ?? '')
    .replace(/(https?:\/\/)[^/@\s]+@/gi, '$1[REDACTED]@')
    .replace(/^(\s*Authorization\s*[:=]\s*).*$/gim, '$1[REDACTED]')
    .replace(/\b(DB_PASSWORD|PASSWORD|PASSWD|PASSPHRASE|TOKEN|SECRET|API_KEY)\s*=\s*[^\s,;]+/gi, '$1=[REDACTED]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
    .slice(0, OUTPUT_LINE_LIMIT);
}

function quotePosix(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function parseDeploymentState(text) {
  if (String(text).trim().length === 0) {
    throw new Error('Production 部署狀態查詢沒有收到資料；遠端狀態檔可能是空檔。');
  }
  const fields = Object.create(null);
  const allowed = new Set(['status', 'commit', 'previous_commit', 'timestamp', 'backup', 'verification', 'log_file', 'verified_at']);
  for (const line of String(text).split(/\r?\n/).filter(Boolean)) {
    const match = /^([a-z_]+)=(.*)$/.exec(line);
    if (!match || !allowed.has(match[1]) || fields[match[1]] !== undefined || !match[2]) {
      throw new Error('Production 部署狀態內容無法安全解析。');
    }
    fields[match[1]] = match[2];
  }
  const requiredFields = ['status', 'commit', 'previous_commit', 'timestamp', 'backup', 'verification', 'log_file'];
  const missingFields = requiredFields.filter((required) => !fields[required]);
  if (missingFields.length > 0) {
    throw new Error(`Production 部署狀態缺少必要欄位：${missingFields.join(', ')}`);
  }
  if (!['RUNNING', 'FAILED', 'DEPLOYED', 'SUCCESS'].includes(fields.status) ||
      !/^(pending|NONE|[a-f0-9]{40})$/i.test(fields.commit) ||
      !/^(NONE|[a-f0-9]{40})$/i.test(fields.previous_commit) ||
      !/^(pending|NONE|.+\/pets_backup_\d{8}_\d{6}\.tar\.gz)$/.test(fields.backup) ||
      !/^(pending|failed|PASS)$/.test(fields.verification) ||
      !/^.+\/logs\/deploy-\d{8}-\d{6}\.log$/.test(fields.log_file) ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/.test(fields.timestamp)) {
    throw new Error('Production 部署狀態欄位值無效。');
  }
  const hasSha = /^[a-f0-9]{40}$/i.test(fields.commit);
  const hasBackup = /^.+\/pets_backup_\d{8}_\d{6}\.tar\.gz$/.test(fields.backup);
  const valid = {
    RUNNING: fields.verification === 'pending' && (fields.commit === 'pending' || hasSha) && (fields.backup === 'pending' || hasBackup),
    FAILED: fields.verification === 'failed' && (fields.commit === 'NONE' || hasSha) &&
      (fields.backup === 'NONE' || fields.backup === 'pending' || hasBackup),
    DEPLOYED: fields.verification === 'pending' && hasSha && hasBackup,
    SUCCESS: fields.verification === 'PASS' && hasSha && hasBackup && !!fields.verified_at && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/.test(fields.verified_at),
  }[fields.status];
  if (!valid || (fields.status !== 'SUCCESS' && fields.verified_at !== undefined)) {
    throw new Error('Production 部署狀態欄位組合不一致。');
  }
  return {
    status: fields.status,
    commit: fields.commit.toLowerCase(),
    verification: fields.verification,
    timestamp: fields.timestamp,
    verifiedAt: fields.verified_at || null,
  };
}

function createChild(command, args, { cwd, timeoutMs, onLine, onSpawn, rawStdout = false, env = process.env, spawnImpl = spawn } = {}) {
  const child = spawnImpl(command, args, {
    cwd,
    env,
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: false,
  });
  if (onSpawn) child.once('spawn', () => onSpawn(child));
  let stdout = '';
  let rawStdoutBytes = 0;
  let stderr = '';
  let timedOut = false;
  let outputTruncated = false;
  const outLines = rawStdout ? null : readline.createInterface({ input: child.stdout });
  const errLines = readline.createInterface({ input: child.stderr });
  const append = (target, line) => {
    const safeLine = safeText(line);
    if (target === 'stdout') stdout += `${safeLine}\n`;
    else stderr += `${safeLine}\n`;
    if (stdout.length + stderr.length > 60000) {
      stdout = stdout.slice(-30000);
      stderr = stderr.slice(-30000);
      outputTruncated = true;
    }
    if (onLine) onLine(target, line);
  };
  if (rawStdout) {
    const chunks = [];
    child.stdout.on('data', (chunk) => {
      rawStdoutBytes += chunk.length;
      if (rawStdoutBytes > 8 * 1024 * 1024) {
        outputTruncated = true;
        child.kill();
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    child.stdout.on('end', () => { stdout = Buffer.concat(chunks).toString('utf8'); });
  } else {
    outLines.on('line', (line) => append('stdout', line));
  }
  errLines.on('line', (line) => append('stderr', line));
  const timer = setTimeout(() => {
    timedOut = true;
    if (process.platform === 'win32' && child.pid) {
      const taskkill = path.join(process.env.WINDIR || 'C:\\Windows', 'System32', 'taskkill.exe');
      const stopper = spawnImpl(taskkill, ['/PID', String(child.pid), '/T', '/F'], {
        windowsHide: true,
        stdio: 'ignore',
        shell: false,
      });
      stopper.on('error', () => child.kill());
      stopper.once('exit', (exitCode) => {
        if (exitCode !== 0 && !child.killed) child.kill();
      });
    } else {
      child.kill('SIGKILL');
    }
  }, timeoutMs);
  timer.unref?.();
  const done = new Promise((resolve) => {
    child.once('error', (error) => {
      clearTimeout(timer);
      resolve({ exitCode: null, stdout, stderr, error, timedOut, outputTruncated });
    });
    child.once('close', (exitCode, signal) => {
      clearTimeout(timer);
      if (outputTruncated) append('stderr', '[管理中心] 輸出過長，僅保留最後一段摘要。');
      resolve({ exitCode, signal, stdout, stderr, error: null, timedOut, outputTruncated });
    });
  });
  return { child, done };
}

class OperationsManager {
  constructor({ root = PROJECT_ROOT, spawnImpl = spawn, clock = () => new Date() } = {}) {
    this.root = root;
    this.spawnImpl = spawnImpl;
    this.clock = clock;
    this.token = randomBytes(32).toString('hex');
    this.operations = new Map();
    this.activeMutationId = null;
    this.gitMutation = false;
  }

  now() { return this.clock().toISOString(); }

  publicOperation(operation) {
    const { id, kind, status, stage, createdAt, updatedAt, confirmation, summary, output, error, result } = operation;
    return { id, kind, status, stage, createdAt, updatedAt, confirmation, summary, output: [...output], error, result };
  }

  addOutput(operation, line) {
    const cleaned = safeText(line).trim();
    if (!cleaned) return;
    if (!operation.output.includes(cleaned)) operation.output.push(cleaned);
    if (operation.output.length > OPERATION_OUTPUT_LIMIT) operation.output.shift();
    operation.updatedAt = this.now();
  }

  async run(command, args, options = {}) {
    const processHandle = createChild(command, args, {
      cwd: options.cwd,
      timeoutMs: options.timeoutMs || 30000,
      onLine: options.onLine,
      onSpawn: options.onSpawn,
      rawStdout: options.rawStdout,
      env: options.env,
      spawnImpl: this.spawnImpl,
    });
    if (options.stdinText !== undefined) {
      processHandle.child.stdin.end(options.stdinText);
    } else {
      processHandle.child.stdin.end();
    }
    return processHandle.done;
  }

  async git(args, timeoutMs = 30000, { trimOutput = true, rawStdout = false } = {}) {
    const result = await this.run('git.exe', ['-C', this.root, ...args], {
      cwd: this.root,
      timeoutMs,
      rawStdout,
      env: { ...process.env, GIT_NO_LAZY_FETCH: '1', GIT_OPTIONAL_LOCKS: '0' },
    });
    if (result.error || result.timedOut || result.outputTruncated || result.exitCode !== 0) {
      throw new Error('無法讀取本機 Git 狀態。');
    }
    return trimOutput ? result.stdout.trim() : result.stdout;
  }

  parseChangedPaths(porcelain) {
    const fields = String(porcelain).split('\0');
    const entries = [];
    for (let index = 0; index < fields.length; index += 1) {
      const record = fields[index];
      if (!record) continue;
      if (record.length < 4 || record[2] !== ' ') throw new Error('無法安全解析本機變更清單。');
      const status = record.slice(0, 2);
      const filePath = record.slice(3);
      const originalPath = /^[RC]/.test(status[0]) || /^[RC]/.test(status[1]) ? fields[++index] : null;
      if (!filePath || filePath.length > 4096) throw new Error('變更清單含有無效路徑。');
      entries.push({ path: filePath, status, originalPath: originalPath || null,
        sensitive: isSensitiveReviewPath(filePath) || Boolean(originalPath && isSensitiveReviewPath(originalPath)) });
    }
    return entries;
  }

  async getGitChanges() {
    const [branch, head, porcelain] = await Promise.all([
      this.git(['branch', '--show-current']),
      this.git(['rev-parse', '--verify', 'HEAD']),
      this.git(['status', '--porcelain=v1', '-z', '--untracked-files=all'], 30000, { trimOutput: false, rawStdout: true }),
    ]);
    if (!/^[a-f0-9]{40}$/i.test(head)) throw new Error('本機版本格式無效。');
    const allFiles = this.parseChangedPaths(porcelain);
    return {
      branch: branch || 'detached HEAD', head: head.toLowerCase(),
      files: allFiles.filter((entry) => !BLOCKED_REVIEW_PATH.test(entry.path) &&
        !(entry.originalPath && BLOCKED_REVIEW_PATH.test(entry.originalPath))),
      hasProtectedChanges: allFiles.some((entry) => BLOCKED_REVIEW_PATH.test(entry.path) ||
        (entry.originalPath && BLOCKED_REVIEW_PATH.test(entry.originalPath))),
    };
  }

  async getCommitPreview() {
    const changes = await this.getGitChanges();
    if (changes.branch !== 'master') throw new Error('目前分支不是 master；已停止提交。');
    const eligible = changes.files.filter((entry) => !entry.sensitive);
    return {
      branch: changes.branch,
      head: changes.head,
      files: eligible.map(({ path: filePath, status, originalPath }) => ({ path: filePath, status, originalPath })),
      excludedSensitiveCount: changes.files.length - eligible.length,
      protectedChangesRemain: changes.hasProtectedChanges,
    };
  }

  validateReviewPath(filePath, changes) {
    if (typeof filePath !== 'string' || !filePath || filePath.length > 4096 ||
        filePath.includes('\0') || path.isAbsolute(filePath) || /^[A-Za-z]:/.test(filePath) ||
        filePath.split(/[\\/]/).some((part) => !part || part === '.' || part === '..') ||
        BLOCKED_REVIEW_PATH.test(filePath)) throw new Error('檔案路徑無效或不允許操作。');
    const current = changes.find((entry) => entry.path === filePath);
    if (!current) throw new Error('此檔案已不在目前變更清單中，請重新載入。');
    return current;
  }

  async getGitDiff(filePath) {
    const changes = await this.getGitChanges();
    const entry = this.validateReviewPath(filePath, changes.files);
    if (entry.sensitive) return { path: entry.path, protected: true, diff: '', message: '此類檔案可能含有憑證或機密，管理中心不顯示內容。' };
    const absolutePath = path.resolve(this.root, filePath);
    const relative = path.relative(this.root, absolutePath);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error('檔案路徑超出專案範圍。');
    const stat = await fs.lstat(absolutePath).catch(() => null);
    if (stat?.isSymbolicLink()) throw new Error('為避免讀取專案外內容，不顯示符號連結差異。');
    const deleted = !stat && entry.status.includes('D');
    const untracked = entry.status === '??';
    if (!stat && !entry.originalPath && !deleted) throw new Error('檔案已不存在，請重新載入變更清單。');
    if (stat && !stat.isFile()) throw new Error('只允許檢視一般檔案差異。');
    if (stat && stat.size > 2 * 1024 * 1024) throw new Error('檔案超過 2 MB，管理中心不顯示其差異。');
    if (stat) {
      const actualPath = await fs.realpath(absolutePath);
      const actualRelative = path.relative(this.root, actualPath);
      if (actualRelative === '..' || actualRelative.startsWith(`..${path.sep}`) || path.isAbsolute(actualRelative)) throw new Error('為避免讀取專案外內容，已拒絕此路徑。');
    }
    const env = { ...process.env, GIT_NO_LAZY_FETCH: '1', GIT_OPTIONAL_LOCKS: '0', GIT_PAGER: 'cat' };
    const args = (stat && !untracked) || deleted
      ? ['-C', this.root, '--literal-pathspecs', 'diff', '--no-color', '--no-ext-diff', '--no-textconv', '--', filePath]
      : ['-C', this.root, '--literal-pathspecs', 'diff', '--no-index', '--no-color', '--no-ext-diff', '--no-textconv', '--', process.platform === 'win32' ? 'NUL' : '/dev/null', absolutePath];
    const result = await this.run('git.exe', args, { cwd: this.root, timeoutMs: 30000, env });
    const isExpectedNoIndexDiff = untracked && result.exitCode === 1;
    if (result.error || result.timedOut || (result.exitCode !== 0 && !isExpectedNoIndexDiff)) throw new Error('無法讀取這個檔案的差異。');
    const staged = await this.run('git.exe', ['-C', this.root, '--literal-pathspecs', 'diff', '--cached', '--no-ext-diff', '--no-textconv', '--', filePath], {
      cwd: this.root, timeoutMs: 30000,
      env: { ...process.env, GIT_NO_LAZY_FETCH: '1', GIT_OPTIONAL_LOCKS: '0', GIT_PAGER: 'cat' },
    });
    if (staged.error || staged.timedOut || staged.exitCode !== 0) throw new Error('無法讀取已暫存的差異。');
    const combinedDiff = `${staged.stdout ? '[已暫存變更]\n' + staged.stdout : ''}${result.stdout ? '\n[尚未暫存變更]\n' + result.stdout : ''}`;
    const diff = combinedDiff.split(/\r?\n/).map((line) => safeText(line)).join('\n');
    return { path: entry.path, protected: false, truncated: diff.length > 24000, diff: diff.slice(0, 24000) };
  }

  async commitAll(expectedHead, expectedFiles, message, confirmation) {
    if (confirmation !== 'COMMIT') throw new Error('提交確認文字不符，未執行提交。');
    if (!/^[a-f0-9]{40}$/.test(expectedHead) || !Array.isArray(expectedFiles) || expectedFiles.length < 1 ||
        expectedFiles.length > 500 || expectedFiles.some((item) => !item || typeof item.path !== 'string' ||
          typeof item.status !== 'string' || (item.originalPath !== null && item.originalPath !== undefined && typeof item.originalPath !== 'string'))) {
      throw new Error('變更清單無效或已過期，請重新載入。');
    }
    if (typeof message !== 'string' || !message.trim() || message.trim().length > 200 || /[\r\n\0]/.test(message)) {
      throw new Error('請輸入 1 至 200 個字元的單行提交說明。');
    }
    if (this.gitMutation || this.activeMutationId) throw new Error('目前已有其他變更或 Production 操作執行中。');
    this.gitMutation = true;
    try {
      const changes = await this.getGitChanges();
      if (changes.branch !== 'master') throw new Error('目前分支不是 master；已停止提交。');
      const selected = changes.files.filter((entry) => !entry.sensitive);
      const actualSnapshot = selected.map(({ path: filePath, status, originalPath }) => ({ path: filePath, status, originalPath: originalPath || null }));
      const expectedSnapshot = expectedFiles.map(({ path: filePath, status, originalPath }) => ({ path: filePath, status, originalPath: originalPath || null }));
      const sortSnapshot = (items) => items.sort((left, right) => left.path.localeCompare(right.path));
      if (changes.head !== expectedHead || JSON.stringify(sortSnapshot(actualSnapshot)) !== JSON.stringify(sortSnapshot(expectedSnapshot))) {
        throw new Error('確認畫面開啟後本機變更已改變；未提交，請重新載入清單。');
      }
      if (selected.length === 0) throw new Error('沒有可提交的檔案。');
      const gitPaths = [...new Set(selected.flatMap((entry) => [entry.path, entry.originalPath].filter(Boolean)))];
      const add = await this.run('git.exe', ['-C', this.root, '--literal-pathspecs', 'add', '-A', '--', ...gitPaths], {
        cwd: this.root, timeoutMs: GIT_MUTATION_TIMEOUT,
        env: { ...process.env, GIT_NO_LAZY_FETCH: '1', GIT_OPTIONAL_LOCKS: '0' },
      });
      if (add.error || add.timedOut || add.exitCode !== 0) {
        const detail = safeText(add.stderr || add.stdout || add.error?.message || '').trim()
          .split(/\r?\n/).filter(Boolean).slice(-4).join('\n');
        const error = new Error([
          add.timedOut ? '整理變更檔案逾時。' : add.error ? '無法啟動 Git 整理程序。' : `Git 整理變更檔案失敗（退出碼 ${add.exitCode}）。`,
          'Git 可能已暫存部分變更；請先重新載入變更清單查看狀態，勿直接重試。',
          detail,
        ].filter(Boolean).join('\n'));
        error.operationStatus = add.timedOut || add.error ? 'unconfirmed' : 'failed';
        throw error;
      }
      let commitStarted = false;
      const commit = await this.run('git.exe', ['-C', this.root, '--literal-pathspecs', 'commit', '--only', '-m', message.trim(), '--', ...gitPaths], {
        cwd: this.root, timeoutMs: GIT_MUTATION_TIMEOUT,
        env: { ...process.env, GIT_NO_LAZY_FETCH: '1', GIT_OPTIONAL_LOCKS: '0' },
        onSpawn: () => { commitStarted = true; },
      });
      if (commit.error || commit.timedOut) {
        throw new Error(commitStarted ? '提交程序已開始但中斷或逾時；結果未確認。請先重新載入變更清單與版本，再決定下一步。' : '提交程序未能啟動，尚未確認提交結果。');
      }
      if (commit.exitCode !== 0) {
        throw new Error(`提交未完成；檔案仍可能已暫存。請重新載入變更清單檢查。${safeText(commit.stderr).slice(-800)}`);
      }
      return {
        branch: changes.branch,
        head: await this.git(['rev-parse', '--verify', 'HEAD']),
        files: selected.length,
        output: `本機提交已完成，共整理 ${selected.length} 個檔案。`,
      };
    } finally { this.gitMutation = false; }
  }

  async getLocalStatus() {
    const [branchValue, head, porcelain] = await Promise.all([
      this.git(['branch', '--show-current']),
      this.git(['rev-parse', '--verify', 'HEAD']),
      this.git(['status', '--porcelain=v1', '--untracked-files=all']),
    ]);
    if (!/^[a-f0-9]{40}$/i.test(head)) throw new Error('本機 HEAD 格式無效。');
    const entries = porcelain ? porcelain.split(/\r?\n/).filter(Boolean) : [];
    return {
      branch: branchValue || 'detached HEAD',
      head: head.toLowerCase(),
      clean: entries.length === 0,
      changedCount: entries.length,
    };
  }

  sshKeyPath() {
    return path.join(os.homedir(), '.ssh', 'pets3_production');
  }

  async runSsh(remoteCommand, { timeoutMs = 30000, stdinText, onSpawn } = {}) {
    if (process.platform !== 'win32') throw new Error('正式環境操作僅支援此 Windows 管理中心。');
    const sshPath = path.join(process.env.WINDIR || 'C:\\Windows', 'System32', 'OpenSSH', 'ssh.exe');
    const key = this.sshKeyPath();
    await Promise.all([fs.access(sshPath), fs.access(key)]).catch(() => {
      throw new Error('找不到 Windows OpenSSH 或 Production 私鑰，未建立連線。');
    });
    const args = [
      '-T', '-i', key,
      '-o', 'IdentitiesOnly=yes',
      '-o', 'StrictHostKeyChecking=yes',
      '-o', 'BatchMode=yes',
      '-o', 'ConnectTimeout=15',
      '-o', 'ServerAliveInterval=15',
      '-o', 'ServerAliveCountMax=2',
      `${PRODUCTION.username}@${PRODUCTION.host}`,
      remoteCommand,
    ];
    return this.run(sshPath, args, { cwd: this.root, timeoutMs, stdinText, onSpawn });
  }

  async runPasswordSshStatus(username, password) {
    if (process.platform !== 'win32') throw new Error('唯讀密碼查詢僅支援此 Windows 管理中心。');
    const script = path.join(__dirname, 'ssh-password-status.ps1');
    await fs.access(script);
    const powershell = path.join(process.env.WINDIR || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const result = await this.run(powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script], {
      cwd: __dirname, timeoutMs: 45000, stdinText: JSON.stringify({ username, password }),
    });
    return result;
  }

  async getProductionStatus(credentials) {
    const command = `if [ -f ${quotePosix(PRODUCTION.stateFile)} ]; then cat -- ${quotePosix(PRODUCTION.stateFile)}; else exit 44; fi`;
    let result;
    try {
      if (!credentials || typeof credentials.username !== 'string' || typeof credentials.password !== 'string') {
        throw new Error('請輸入 Production 帳號與密碼。');
      }
      result = await this.runPasswordSshStatus(credentials.username, credentials.password);
    } catch (error) {
      return { available: false, reason: safeText(error.message || 'Production 狀態查詢未能啟動。') };
    }
    if (result.timedOut) return { available: false, reason: 'Production 狀態查詢逾時；狀態未確認。' };
    if (result.error) return { available: false, reason: 'Production 狀態查詢程序無法啟動。' };
    if (result.exitCode === 44) return { available: false, reason: 'Production 尚無可讀的部署狀態檔。' };
    if (result.exitCode !== 0) {
      const category = String(result.stderr || '').match(/(?:^|\r?\n)PROD_SSH_ERROR=([A-Z_]+)(?:\r?\n|$)/)?.[1];
      const stage = String(result.stderr || '').match(/(?:^|\r?\n)PROD_SSH_STAGE=([A-Z_]+)(?:\r?\n|$)/)?.[1];
      const exceptionMatch = String(result.stderr || '').match(/(?:^|\r?\n)PROD_SSH_EXCEPTION_CHAIN=([A-Za-z0-9_.+`|]+)(?:\r?\n|$)/);
      const exceptionChain = exceptionMatch && exceptionMatch[1].split('|').every((type) => /^[A-Za-z_][A-Za-z0-9_.+`]{0,127}$/.test(type))
        ? exceptionMatch[1].split('|').join(' → ')
        : null;
      const hostKeyEvent = String(result.stderr || '').match(/(?:^|\r?\n)PROD_SSH_HOSTKEY_EVENT=(True|False)(?:\r?\n|$)/i)?.[1];
      const missingAssembly = String(result.stderr || '').match(/(?:^|\r?\n)PROD_SSH_MISSING_ASSEMBLY=([A-Za-z0-9_.-]{1,128})(?:\r?\n|$)/)?.[1];
      const reasons = {
        INVALID_CREDENTIAL_INPUT: '帳號或密碼格式無效；未建立連線。',
        DEPENDENCY_ERROR: '本機 SSH 元件載入失敗；請確認管理中心的 SSH.NET 相依檔案完整。',
        DEPENDENCY_FILE_MISSING: '本機缺少 SSH.NET 相依 DLL；請先修復管理中心的本機相依套件。',
        DEPENDENCY_RESOLVER_FAILED: '本機 SSH.NET 相依組件解析器初始化失敗；請重新啟動管理中心，若仍發生請提供此診斷結果。',
        DEPENDENCY_LOAD_FAILED: '本機 SSH.NET DLL 存在，但 Windows PowerShell 無法載入其中一個組件；可能是檔案損毀、存取權限或 .NET Framework 載入衝突。',
        SSH_TYPE_MISSING: 'SSH.NET 組件已載入，但缺少必要 SSH 類型；本機套件版本或檔案可能不完整。',
        AUTHENTICATION_SETUP_FAILED: '本機無法建立 SSH 密碼認證物件；尚未連線伺服器。',
        CONNECT_DEPENDENCY_MISSING: 'SSH 連線時發現缺少執行階段組件；請回報下方組件名稱，以便修正本機相依設定。',
        HOST_KEY_MISMATCH: '伺服器主機指紋與固定值不符；為保護連線已拒絕。請透過可信管道向伺服器管理者核對指紋。',
        KEY_EXCHANGE_FAILED: '用戶端與伺服器沒有相容的 SSH 金鑰交換演算法；請伺服器管理者核對演算法設定，使用雙方支援且安全的組合。',
        SSH_HANDSHAKE_FAILED: '已進入 SSH 交握階段，但伺服器未完成 SSH 工作階段協商；請管理者查看伺服器 SSH 紀錄及演算法設定。',
        SSH_CONNECT_FAILED: 'SSH 連線階段失敗；請管理者查看伺服器 SSH 紀錄。',
        AUTHENTICATION_REJECTED: '伺服器拒絕密碼認證；可能是帳密錯誤、帳號政策或伺服器停用密碼登入，需由伺服器管理者查認證紀錄。',
        TIMEOUT: '連線逾時；請確認網路/VPN、防火牆及伺服器 SSH 連接埠。',
        CONNECTION_REFUSED: '伺服器拒絕 SSH 連線；請確認 SSH 服務正在執行且連接埠 22 可用。',
        CONNECTION_RESET: 'SSH 連線在完成前被伺服器或網路中斷；請管理者查看 SSH 服務紀錄，並確認防火牆或網路設備沒有重置連線。',
        HOST_RESOLUTION_FAILED: '無法解析 SSH 伺服器位址；請確認管理中心設定的固定主機位址及網路。',
        SOCKET_FAILURE: 'SSH 網路連線失敗；請確認網路、防火牆及伺服器 SSH 服務，並查看伺服器連線紀錄。',
        NETWORK_UNREACHABLE: '目前網路無法到達伺服器；請確認網路、VPN 或防火牆。',
        REMOTE_COMMAND_FAILED: 'SSH 已連線，但讀取部署狀態命令失敗；請確認遠端狀態檔及讀取權限。',
        CONNECTION_FAILED: 'SSH 連線失敗，原因無法安全分類；請查看伺服器 SSH 認證紀錄。',
      };
      let reason = reasons[category] || 'Production 唯讀查詢失敗；原因未能分類，狀態未確認。';
      if (category === 'SSH_CONNECT_FAILED' || category === 'SSH_HANDSHAKE_FAILED' || category === 'CONNECT_DEPENDENCY_MISSING') {
        const diagnostics = [];
        if (stage) diagnostics.push(`階段 ${stage}`);
        if (hostKeyEvent) diagnostics.push(`主機指紋事件 ${hostKeyEvent === 'True' ? '已觸發' : '未觸發'}`);
        if (missingAssembly) diagnostics.push(`缺少組件 ${missingAssembly}`);
        if (exceptionChain) diagnostics.push(`例外類型 ${exceptionChain}`);
        if (diagnostics.length) reason += `（診斷：${diagnostics.join('；')}）`;
      }
      return { available: false, reason };
    }
    try {
      return { available: true, ...parseDeploymentState(result.stdout) };
    } catch (error) {
      return { available: false, reason: safeText(error.message) };
    }
  }

  async listBackups() {
    const command = [
      `cd -- ${quotePosix(PRODUCTION.projectRoot)} || exit 90`,
      "database='psop_one'",
      'if [ -r .env ]; then configured_database=$(sed -n \'s/^DB_NAME=//p\' .env | tail -n 1 | tr -d \'"\\r\'); if [ -n "$configured_database" ]; then database="$configured_database"; fi; fi',
      'if [[ ! "$database" =~ ^[A-Za-z0-9_-]{1,64}$ ]]; then exit 91; fi',
      'printf "DATABASE=%s\\n" "$database"',
      `if [ -d ${quotePosix(PRODUCTION.backupDirectory)} ]; then find -- ${quotePosix(PRODUCTION.backupDirectory)} -mindepth 1 -maxdepth 1 -type f -name 'pets_backup_????????_??????.tar.gz' -printf '%f\\n' | sort -r; fi`,
    ].join('\n');
    const result = await this.runSsh(command);
    if (result.timedOut) throw new Error('Production 備份清單查詢逾時。');
    if (result.error || result.exitCode !== 0) throw new Error('Production 備份清單查詢失敗。');
    const lines = result.stdout.split(/\r?\n/).filter(Boolean);
    const databases = lines.filter((line) => /^DATABASE=[A-Za-z0-9_-]{1,64}$/.test(line));
    if (databases.length !== 1) throw new Error('Production 未回傳有效的目標資料庫資訊。');
    const names = lines.filter((line) => !line.startsWith('DATABASE='));
    if (names.some((name) => !SAFE_BACKUP_NAME.test(name))) throw new Error('Production 備份清單包含無效檔名，已停止提供還原選項。');
    return { database: databases[0].slice('DATABASE='.length), backups: names };
  }

  async newOperation(kind) {
    if (this.activeMutationId || this.gitMutation) throw new Error('目前已有其他操作執行中，請等待它完成。');
    const operation = {
      id: randomUUID(), kind, status: 'running', stage: '準備中',
      createdAt: this.now(), updatedAt: this.now(), confirmation: null,
      summary: null, output: [], error: null, result: null,
      pendingPrompt: null, promptResolver: null, sideEffectStarted: false,
    };
    this.operations.set(operation.id, operation);
    this.activeMutationId = operation.id;
    this.pruneOperations();
    return operation;
  }

  pruneOperations() {
    if (this.operations.size <= 40) return;
    for (const [id, operation] of this.operations) {
      if (id !== this.activeMutationId && !['running', 'waiting-confirmation'].includes(operation.status)) {
        this.operations.delete(id);
        if (this.operations.size <= 30) break;
      }
    }
  }

  async startOperation(kind, payload = {}) {
    if (this.gitMutation) throw new Error('目前已有本機版本操作執行中，請等待它完成。');
    if (!MUTATING_ACTIONS.has(kind)) throw new Error('不支援的管理操作。');
    if (kind === 'backup' && payload.confirmation !== 'BACKUP') throw new Error('備份確認文字不符；未執行操作。');
    if (kind === 'deploy' && payload.confirmation !== 'DEPLOY') throw new Error('部署確認文字不符；未執行操作。');
    if (kind === 'restore' && (!SAFE_BACKUP_NAME.test(String(payload.backupName || '')) ||
        payload.servicesStopped !== true || payload.confirmation !== 'RESTORE')) {
      throw new Error('還原備份或人工確認無效；未執行操作。');
    }
    const operation = await this.newOperation(kind);
    operation.promise = this.performOperation(operation, payload)
      .catch((error) => {
        operation.error = safeText(error.message || '操作失敗。');
        operation.status = error.operationStatus || (operation.sideEffectStarted ? 'unconfirmed' : 'failed');
        operation.stage = operation.status === 'unconfirmed' ? '遠端結果未確認' : '操作未完成';
      })
      .finally(() => {
        operation.confirmation = null;
        operation.pendingPrompt = null;
        operation.promptResolver = null;
        operation.updatedAt = this.now();
        if (this.activeMutationId === operation.id) this.activeMutationId = null;
      });
    return this.publicOperation(operation);
  }

  async performOperation(operation, payload) {
    if (operation.kind === 'backup') await this.performBackup(operation);
    else if (operation.kind === 'restore') await this.performRestore(operation, payload);
    else await this.performDeployment(operation);
  }

  async performBackup(operation) {
    operation.stage = '連線並執行備份腳本';
    this.addOutput(operation, '正在連線並準備執行 Production 備份；請保持管理中心視窗開啟。');
    const remoteCommand = `cd -- ${quotePosix(PRODUCTION.projectRoot)} && exec bash ${quotePosix(PRODUCTION.projectRoot + '/deploy/backup.sh')}`;
    const result = await this.runSsh(remoteCommand, {
      timeoutMs: 60 * 60 * 1000,
      onSpawn: () => { operation.sideEffectStarted = true; },
    });
    for (const line of `${result.stdout}\n${result.stderr}`.split(/\r?\n/).filter(Boolean)) this.addOutput(operation, line);
    if (result.timedOut || result.error) throw new Error('備份命令中斷或逾時；遠端結果未確認，請先查詢備份清單再決定是否重試。');
    if (result.exitCode !== 0) {
      if (result.exitCode === 255 && operation.sideEffectStarted) {
        throw new Error('SSH 連線在備份結果確認前中斷；遠端結果未確認，請先查詢備份清單再決定是否重試。');
      }
      const error = new Error('備份腳本回報失敗；請查看操作摘要並確認遠端備份清單。');
      error.operationStatus = 'failed';
      throw error;
    }
    const markers = result.stdout.split(/\r?\n/).filter((line) => line.startsWith('BACKUP_FILE='));
    if (markers.length !== 1) throw new Error('備份腳本沒有唯一回報備份檔；結果未確認。');
    const backupPath = markers[0].slice('BACKUP_FILE='.length);
    const prefix = PRODUCTION.backupDirectory + '/';
    const name = backupPath.startsWith(prefix) ? backupPath.slice(prefix.length) : '';
    if (!SAFE_BACKUP_NAME.test(name)) throw new Error('備份檔路徑或檔名不符合允許格式；結果未確認。');
    operation.stage = '驗證備份檔與 checksum';
    const verifyCommand = `cd -- ${quotePosix(PRODUCTION.backupDirectory)} && test -f ${quotePosix(name)} && test -f ${quotePosix(name + '.sha256')} && sha256sum -c -- ${quotePosix(name + '.sha256')}`;
    const verification = await this.runSsh(verifyCommand, { timeoutMs: 30000 });
    if (verification.error || verification.timedOut) {
      throw new Error('備份產物驗證連線中斷或逾時；遠端結果未確認。');
    }
    if (verification.exitCode !== 0 || !verification.stdout.includes(`${name}: OK`)) {
      const error = new Error('備份產物或 checksum 驗證未通過；不能回報備份成功。');
      error.operationStatus = 'failed';
      throw error;
    }
    operation.status = 'succeeded';
    operation.stage = '備份與 checksum 驗證成功';
    operation.result = { backupName: name, verified: true };
    operation.summary = `備份完成：${name}；checksum 驗證成功。`;
  }

  async performRestore(operation, payload) {
    const name = String(payload.backupName || '');
    if (!SAFE_BACKUP_NAME.test(name)) throw new Error('所選備份檔名無效。');
    if (payload.servicesStopped !== true) throw new Error('必須先確認 pets-backend.service 與 pets-frontend.service 均已停止。');
    if (payload.confirmation !== 'RESTORE') throw new Error('還原確認文字不符；未送出還原命令。');
    operation.stage = '再次確認所選備份仍存在';
    const exactPath = PRODUCTION.backupDirectory + '/' + name;
    const check = await this.runSsh(`test -f ${quotePosix(exactPath)} && test ! -L ${quotePosix(exactPath)}`, { timeoutMs: 30000 });
    if (check.error || check.timedOut || check.exitCode !== 0) throw new Error('所選 Production 備份不存在或無法確認；未送出還原命令。');
    operation.stage = '執行正式資料還原';
    this.addOutput(operation, `正在連線並準備還原：${name}。請保持管理中心視窗開啟。`);
    const restoreScript = PRODUCTION.projectRoot + '/deploy/restore.sh';
    const remoteCommand = `cd -- ${quotePosix(PRODUCTION.projectRoot)} && printf '%s\\n' RESTORE | exec bash ${quotePosix(restoreScript)} ${quotePosix(exactPath)}`;
    const result = await this.runSsh(remoteCommand, {
      timeoutMs: 60 * 60 * 1000,
      onSpawn: () => { operation.sideEffectStarted = true; },
    });
    for (const line of `${result.stdout}\n${result.stderr}`.split(/\r?\n/).filter(Boolean)) this.addOutput(operation, line);
    if (result.timedOut || result.error) throw new Error('還原命令中斷或逾時；遠端結果未確認。請勿假設還原失敗或重試，先人工確認 Production 狀態。');
    if (result.exitCode !== 0 && /^\[restore\.sh ERROR\]/m.test(result.stdout + '\n' + result.stderr)) {
      const error = new Error('還原腳本回報失敗；請檢查 Production 狀態及操作摘要。');
      error.operationStatus = 'failed';
      throw error;
    }
    if (result.exitCode !== 0 || !/^\[restore\.sh SUCCESS\] Database and \d+ Contract PDF file\(s\) restored and verified\.$/m.test(result.stdout)) {
      throw new Error('還原腳本未回報有效成功標記；請查看 Production 狀態並人工確認。');
    }
    operation.status = 'succeeded';
    operation.stage = '還原腳本成功標記與退出碼已確認';
    operation.result = { backupName: name, verified: true };
    operation.summary = `還原完成：${name}；還原腳本成功標記已確認。`;
  }

  async waitForPrompt(operation, child, prompt) {
    if (!prompt || !['push-authorization', 'deploy-freeze', 'browser-acceptance', 'remote-confirmation'].includes(prompt.type)) {
      throw new Error('部署入口回報未知的確認步驟。');
    }
    operation.status = 'waiting-confirmation';
    operation.stage = prompt.type;
    operation.confirmation = { type: prompt.type, message: safeText(prompt.message), expectedCommit: prompt.expectedCommit || null };
    operation.pendingPrompt = prompt.type;
    const value = await new Promise((resolve, reject) => {
      operation.promptResolver = { resolve, reject };
      const timeout = setTimeout(() => reject(new Error('網頁確認等待逾時；部署結果需重新查詢。')), 15 * 60 * 1000);
      operation.promptResolver.timeout = timeout;
    });
    const expected = {
      'push-authorization': prompt.expectedCommit,
      'deploy-freeze': `DEPLOY ${prompt.expectedCommit} FREEZE`,
      'browser-acceptance': 'PASS',
      'remote-confirmation': 'CONFIRM',
    }[prompt.type];
    if (value !== '' && value !== expected) throw new Error('確認輸入與目前步驟不符。');
    if (prompt.type === 'push-authorization' && value !== '') operation.sideEffectStarted = true;
    if (prompt.type === 'deploy-freeze' && value !== '') operation.sideEffectStarted = true;
    operation.confirmation = null;
    operation.pendingPrompt = null;
    operation.promptResolver = null;
    operation.status = 'running';
    child.stdin.write(value + '\n');
    return value;
  }

  async performDeployment(operation) {
    const status = await this.getLocalStatus();
    if (status.branch !== 'master') throw new Error(`目前分支為「${status.branch}」，部署只允許 master。`);
    if (!status.clean) throw new Error(`工作樹有 ${status.changedCount} 項未提交或未追蹤變更；既有部署安全檢查會阻擋部署。`);
    operation.result = { expectedCommit: status.head };
    operation.stage = '啟動既有 Production 部署入口';
    const powershell = path.join(process.env.WINDIR || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const script = path.join(this.root, 'deploy-production.ps1');
    try {
      await fs.access(script);
    } catch {
      throw new Error('找不到部署入口 deploy-production.ps1；未啟動部署或連線 Production。');
    }
    const parsed = { prompt: null, result: null };
    const processHandle = createChild(powershell, ['-NoProfile', '-File', script, '-ExpectedCommit', status.head, '-WebControl'], {
      cwd: this.root,
      timeoutMs: 3 * 60 * 60 * 1000,
      spawnImpl: this.spawnImpl,
      onLine: (stream, rawLine) => {
        const line = String(rawLine);
        if (stream === 'stdout' && line.startsWith('OPS_PROMPT:')) {
          try { parsed.prompt = JSON.parse(line.slice('OPS_PROMPT:'.length)); }
          catch { parsed.prompt = { type: 'invalid' }; }
          const currentPrompt = parsed.prompt;
          this.waitForPrompt(operation, processHandle.child, currentPrompt).catch((error) => {
            operation.error = safeText(error.message);
            operation.status = operation.sideEffectStarted ? 'unconfirmed' : 'failed';
            processHandle.child.stdin.write('\n');
          });
          return;
        }
        if (stream === 'stdout' && line.startsWith('OPS_RESULT:')) {
          try { parsed.result = JSON.parse(line.slice('OPS_RESULT:'.length)); }
          catch { parsed.result = null; }
          return;
        }
        if (line.trim()) this.addOutput(operation, line);
      },
    });
    processHandle.child.stdin.on('error', () => {});
    const childDone = processHandle.done;
    const result = await childDone;
    if (result.timedOut) throw new Error('部署流程逾時；Production 結果未確認，請使用查看狀態確認後再決定下一步。');
    if (result.error) throw new Error('部署入口無法啟動。');
    if (result.exitCode === 0 && parsed.result?.type === 'deployment-complete' && parsed.result.status === 'SUCCESS' && parsed.result.commit?.toLowerCase() === status.head) {
      operation.status = 'succeeded';
      operation.stage = 'Production 部署與人工驗收成功';
      operation.result = { expectedCommit: status.head, status: 'SUCCESS' };
      operation.summary = `Production 部署及驗收完成：${status.head}`;
      return;
    }
    if (parsed.result?.type === 'deployment-stopped' && parsed.result.remoteMutationStarted === false) {
      operation.sideEffectStarted = false;
      operation.result = { expectedCommit: status.head, outcome: 'stopped-before-remote-operation' };
    } else if (parsed.result?.type === 'deployment-stopped' && parsed.result.remoteMutationStarted === true) {
      operation.sideEffectStarted = true;
      operation.result = { expectedCommit: status.head, outcome: 'remote-result-unconfirmed' };
      const error = new Error('Production 部署命令已啟動，但未取得最終成功狀態。請先使用唯讀狀態查詢確認伺服器狀態，再決定後續操作；不要直接重試。');
      error.operationStatus = 'unconfirmed';
      throw error;
    } else if (operation.sideEffectStarted) {
      const error = new Error('部署確認後流程中斷，Production 結果未確認。請先使用唯讀狀態查詢確認伺服器狀態，再決定後續操作；不要直接重試。');
      error.operationStatus = 'unconfirmed';
      throw error;
    }
    throw new Error(result.exitCode === 0 ? '部署入口未回報有效的最終成功狀態。' : (operation.error || '部署入口未成功完成。'));
  }

  async submitConfirmation(id, value) {
    const operation = this.operations.get(id);
    if (!operation || operation.status !== 'waiting-confirmation' || !operation.promptResolver) throw new Error('目前沒有等待中的網頁確認步驟。');
    const prompt = operation.confirmation;
    const expected = {
      'push-authorization': prompt.expectedCommit,
      'deploy-freeze': `DEPLOY ${prompt.expectedCommit} FREEZE`,
      'browser-acceptance': 'PASS',
      'remote-confirmation': 'CONFIRM',
    }[prompt.type];
    if (value !== '' && value !== expected) throw new Error('確認文字不符；尚未傳送給部署入口。');
    const waiter = operation.promptResolver;
    clearTimeout(waiter.timeout);
    waiter.resolve(value);
    return this.publicOperation(operation);
  }

  async cancelAtPrompt(id) {
    return this.submitConfirmation(id, '');
  }

  getOperation(id) {
    const operation = this.operations.get(id);
    return operation ? this.publicOperation(operation) : null;
  }
}

module.exports = {
  OperationsManager,
  PROJECT_ROOT,
  PRODUCTION,
  SAFE_BACKUP_NAME,
  parseDeploymentState,
  quotePosix,
  safeText,
};
