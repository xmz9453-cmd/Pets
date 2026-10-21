'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { OperationsManager, SAFE_BACKUP_NAME, safeText } = require('./operations');

const HOST = '127.0.0.1';
const PORT = 4173;
const PUBLIC_ROOT = path.resolve(__dirname, 'public');
const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.ico', 'image/x-icon'],
]);

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  });
  response.end(message);
}

function sendJson(response, statusCode, value) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  });
  response.end(JSON.stringify(value));
}

async function readJsonBody(request, maxBytes = 8192) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > maxBytes) throw new Error('請求內容太大。');
    chunks.push(chunk);
  }
  if (total === 0) return {};
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error();
    return value;
  } catch {
    throw new Error('請求格式無效。');
  }
}

function createServer({ host = HOST, port = PORT, operations = new OperationsManager() } = {}) {
  const server = http.createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD' &&
        !(request.method === 'POST' && request.url.startsWith('/api/'))) {
      response.setHeader('Allow', 'GET, HEAD');
      return sendText(response, 405, '不支援此請求方式。');
    }

    let parsedUrl;
    let pathname;
    try {
      parsedUrl = new URL(request.url, `http://${HOST}:${PORT}`);
      pathname = parsedUrl.pathname;
      pathname = decodeURIComponent(pathname);
    } catch {
      return sendText(response, 400, '網址格式無效。');
    }

    if (pathname.startsWith('/api/')) {
      const authority = `127.0.0.1:${server.address()?.port || port}`;
      const origin = request.headers.origin;
      let validOrigin = false;
      try {
        const originUrl = new URL(origin);
        validOrigin = originUrl.protocol === 'http:' && originUrl.hostname === '127.0.0.1' &&
          originUrl.port === String(server.address()?.port || port);
      } catch {}
      if (request.headers.host !== authority || (request.method === 'POST' && !validOrigin) ||
          (origin && !validOrigin) ||
          request.headers['x-ops-token'] !== operations.token) {
        return sendJson(response, 403, { error: '本機管理頁面驗證失敗，請重新載入頁面。' });
      }

      try {
        if (request.method === 'GET' && pathname === '/api/status/local') {
          return sendJson(response, 200, await operations.getLocalStatus());
        }
        if (request.method === 'GET' && pathname === '/api/git/changes') {
          return sendJson(response, 200, await operations.getGitChanges());
        }
        if (request.method === 'GET' && pathname === '/api/git/commit-preview') {
          return sendJson(response, 200, await operations.getCommitPreview());
        }
        if (request.method === 'GET' && pathname === '/api/git/diff') {
          const filePath = parsedUrl.searchParams.get('path');
          if (!filePath) return sendJson(response, 400, { error: '請指定要檢視的變更檔案。' });
          return sendJson(response, 200, await operations.getGitDiff(filePath));
        }
        if (request.method === 'POST' && pathname === '/api/git/commit-all') {
          const body = await readJsonBody(request, 1024 * 1024);
          if (!Array.isArray(body.expectedFiles) || body.expectedFiles.length > 500 ||
              typeof body.message !== 'string' || typeof body.expectedHead !== 'string' || body.confirmation !== 'COMMIT') {
            return sendJson(response, 400, { error: '提交資料或確認內容無效，未執行提交。' });
          }
          return sendJson(response, 200, await operations.commitAll(body.expectedHead, body.expectedFiles, body.message, body.confirmation));
        }
        if (request.method === 'POST' && pathname === '/api/status/production') {
          const body = await readJsonBody(request);
          if (typeof body.username !== 'string' || !/^[A-Za-z0-9._-]{1,64}$/.test(body.username) ||
              typeof body.password !== 'string' || body.password.length < 1 || body.password.length > 1024) {
            return sendJson(response, 400, { error: '請輸入有效的 Production 帳號與密碼。' });
          }
          const credentials = { username: body.username, password: body.password };
          try { return sendJson(response, 200, await operations.getProductionStatus(credentials)); }
          finally { credentials.password = ''; }
        }
        if (request.method === 'POST' && pathname === '/api/backups') {
          const body = await readJsonBody(request);
          if (typeof body.username !== 'string' || !/^[A-Za-z0-9._-]{1,64}$/.test(body.username) ||
              typeof body.password !== 'string' || body.password.length < 1 || body.password.length > 1024) {
            return sendJson(response, 400, { error: '請輸入有效的 Production 帳號與密碼。' });
          }
          const credentials = { username: body.username, password: body.password };
          try { return sendJson(response, 200, await operations.listBackups(credentials)); }
          finally { credentials.password = ''; }
        }
        if (request.method === 'POST' && pathname === '/api/backups/verify') {
          const body = await readJsonBody(request);
          if (typeof body.username !== 'string' || !/^[A-Za-z0-9._-]{1,64}$/.test(body.username) ||
              typeof body.password !== 'string' || body.password.length < 1 || body.password.length > 1024 ||
              typeof body.backupName !== 'string' || !SAFE_BACKUP_NAME.test(body.backupName)) {
            return sendJson(response, 400, { error: '帳號、密碼或備份檔名無效；未執行檢查。' });
          }
          const credentials = { username: body.username, password: body.password };
          try { return sendJson(response, 200, await operations.verifyBackupArtifact(credentials, body.backupName)); }
          finally { credentials.password = ''; }
        }
        if (request.method === 'GET' && pathname === '/api/backups') {
          return sendJson(response, 200, await operations.listBackups());
        }
        if (request.method === 'POST' && pathname === '/api/operations') {
          const body = await readJsonBody(request);
          if (!['backup', 'deploy', 'restore'].includes(body.kind)) {
            return sendJson(response, 400, { error: '不支援的操作。' });
          }
          if (body.kind === 'backup' && body.confirmation !== 'BACKUP') {
            return sendJson(response, 400, { error: '備份確認文字不符，未執行操作。' });
          }
          if (body.kind === 'backup' && (!body.credentials || typeof body.credentials.username !== 'string' ||
              !/^[A-Za-z0-9._-]{1,64}$/.test(body.credentials.username) ||
              typeof body.credentials.password !== 'string' || body.credentials.password.length < 1 || body.credentials.password.length > 1024)) {
            return sendJson(response, 400, { error: '請輸入有效的 Production 帳號與密碼，未執行備份。' });
          }
          if (body.kind === 'deploy' && body.confirmation !== 'DEPLOY') {
            return sendJson(response, 400, { error: '部署確認文字不符，未執行操作。' });
          }
          if (body.kind === 'restore' && (!SAFE_BACKUP_NAME.test(String(body.backupName || '')) ||
              body.servicesStopped !== true || body.confirmation !== 'RESTORE')) {
            return sendJson(response, 400, { error: '還原備份或人工確認無效，未執行操作。' });
          }
          return sendJson(response, 202, await operations.startOperation(body.kind, body));
        }
        const operationRoute = /^\/api\/operations\/([0-9a-f-]{36})(?:\/(confirm|cancel))?$/.exec(pathname);
        if (operationRoute && request.method === 'GET' && !operationRoute[2]) {
          const operation = operations.getOperation(operationRoute[1]);
          return operation ? sendJson(response, 200, operation) : sendJson(response, 404, { error: '找不到此操作。' });
        }
        if (operationRoute && request.method === 'POST' && operationRoute[2] === 'confirm') {
          const body = await readJsonBody(request);
          return sendJson(response, 200, await operations.submitConfirmation(operationRoute[1], body.value));
        }
        if (operationRoute && request.method === 'POST' && operationRoute[2] === 'cancel') {
          return sendJson(response, 200, await operations.cancelAtPrompt(operationRoute[1]));
        }
        if (request.method !== 'GET' && request.method !== 'POST') {
          response.setHeader('Allow', 'GET, POST');
          return sendJson(response, 405, { error: '不支援此請求方式。' });
        }
        return sendJson(response, 404, { error: '找不到此管理功能。' });
      } catch (error) {
        return sendJson(response, 400, { error: safeText(error.message || '操作無法完成。') });
      }
    }

    if (pathname === '/') pathname = '/index.html';
    const filePath = path.resolve(PUBLIC_ROOT, `.${pathname}`);
    const relativePath = path.relative(PUBLIC_ROOT, filePath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      return sendText(response, 403, '禁止存取此路徑。');
    }

    fs.realpath(filePath, (realPathError, resolvedFilePath) => {
      if (realPathError) return sendText(response, 404, '找不到此頁面。');
      const resolvedRelativePath = path.relative(PUBLIC_ROOT, resolvedFilePath);
      if (resolvedRelativePath.startsWith('..') || path.isAbsolute(resolvedRelativePath)) {
        return sendText(response, 403, '禁止存取此路徑。');
      }
      fs.stat(resolvedFilePath, (statError, stat) => {
        if (statError || !stat.isFile()) {
        return sendText(response, 404, '找不到此頁面。');
      }
      const contentType = MIME_TYPES.get(path.extname(resolvedFilePath).toLowerCase());
      if (!contentType) return sendText(response, 404, '找不到此頁面。');

      response.writeHead(200, {
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; form-action 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'no-store',
      });
      if (request.method === 'HEAD') return response.end();
      if (path.basename(resolvedFilePath) === 'index.html') {
        fs.readFile(resolvedFilePath, 'utf8', (readError, html) => {
          if (readError) return response.destroy();
          response.end(html.replace('<!-- OPS_TOKEN -->', `<meta name="ops-token" content="${operations.token}">`));
        });
        return;
      }
      const stream = fs.createReadStream(resolvedFilePath);
      stream.on('error', () => {
        if (!response.headersSent) sendText(response, 500, '讀取頁面時發生錯誤。');
        else response.destroy();
      });
      stream.pipe(response);
      });
    });
  });
  server.operations = operations;
  return server;
}

function openBrowser(url) {
  if (process.platform !== 'win32') {
    console.log('請在瀏覽器開啟：' + url);
    return;
  }
  execFile('rundll32.exe', ['url.dll,FileProtocolHandler', url], (error) => {
    if (error) console.log('瀏覽器無法自動開啟，請手動前往：' + url);
  });
}

function start({ host = HOST, port = PORT, openBrowserFunction = openBrowser } = {}) {
  const server = createServer({ host, port });
  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`本機連接埠 ${port} 已被使用。請關閉占用該連接埠的程式後，再重新啟動管理中心。`);
    } else {
      console.error(`本機服務啟動失敗：${error.message}`);
    }
    process.exitCode = 1;
  });
  server.listen(port, host, () => {
    const url = `http://${host}:${port}/`;
    console.log(`寵物3.0管理中心已啟動：${url}`);
    console.log('關閉此命令視窗即可停止本機服務。');
    openBrowserFunction(url);
  });
  return server;
}

if (require.main === module) start();

module.exports = { HOST, PORT, PUBLIC_ROOT, createServer, readJsonBody, start };
