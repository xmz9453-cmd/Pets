'use strict';

const token = document.querySelector('meta[name="ops-token"]')?.content || '';
const dialog = document.querySelector('#confirm-dialog');
const dialogForm = document.querySelector('#confirm-form');
const dialogTitle = document.querySelector('#dialog-title');
const dialogEyebrow = document.querySelector('#dialog-eyebrow');
const dialogContent = document.querySelector('#dialog-content');
const dialogConfirm = document.querySelector('#dialog-confirm');
const dialogCancel = document.querySelector('#dialog-cancel');
const operationPanel = document.querySelector('#operation-panel');
const operationOutput = document.querySelector('#operation-output');
const activeOperationLabel = document.querySelector('#active-operation-label');
let busy = false;
let currentOperationId = null;
let handledPrompt = null;
let currentChanges = [];

const changeList = document.querySelector('#change-list');
const changeSummary = document.querySelector('#changes-summary');
const commitButton = document.querySelector('#commit-selected');

function element(name, className, text) {
  const node = document.createElement(name);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function api(path, options = {}) {
  const headers = { 'X-Ops-Token': token, ...(options.headers || {}) };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(path, { ...options, headers, cache: 'no-store', credentials: 'same-origin' });
  let body;
  try { body = await response.json(); }
  catch { throw new Error('管理中心回傳無法辨識的結果。'); }
  if (!response.ok) throw new Error(body.error || '操作未能完成。');
  return body;
}

function setPanel(message, state = '') {
  operationPanel.textContent = message;
  operationPanel.dataset.state = state;
}

function setBadge(id, label, state = '') {
  const badge = document.querySelector(id);
  badge.textContent = label;
  badge.classList.toggle('good', state === 'good');
  badge.classList.toggle('bad', state === 'bad');
}

function displayProductionStatus(status) {
  if (!status.available) {
    setBadge('#production-status-badge', '無法確認', 'bad');
    document.querySelector('#production-status').textContent = status.reason;
    document.querySelector('#production-commit').textContent = '無法確認';
    document.querySelector('#production-record-commit').textContent = '無法確認';
    document.querySelector('#production-time').textContent = '無法確認';
    return;
  }
  setBadge('#production-status-badge', '已取得', 'good');
  const labels = { RUNNING: '部署進行中', FAILED: '部署失敗', DEPLOYED: '部署完成，等待人工驗收', SUCCESS: '部署及驗收成功' };
  document.querySelector('#production-status').textContent = labels[status.status] || status.status;
  document.querySelector('#production-commit').textContent = status.liveCommit || '無法確認';
  document.querySelector('#production-record-commit').textContent = status.commit;
  document.querySelector('#production-time').textContent = window.OperationsTime.formatTaipeiTimestamp(status.verifiedAt || status.timestamp);
}

function displayCompletedDeployment(operation) {
  const result = operation.result;
  if (operation.kind !== 'deploy' || operation.status !== 'succeeded' ||
      !result?.shaMatches || !/^[a-f0-9]{40}$/.test(result.deployedCommit || '')) return;

  const deployedCommit = result.deployedCommit;
  const state = result.deploymentState || {};
  document.querySelector('#local-head').textContent = deployedCommit;
  document.querySelector('#github-master').textContent = deployedCommit;
  document.querySelector('#production-status').textContent = '部署及驗收成功';
  document.querySelector('#production-commit').textContent = deployedCommit;
  document.querySelector('#production-record-commit').textContent = state.commit || deployedCommit;
  document.querySelector('#production-time').textContent = state.verifiedAt || state.timestamp
    ? window.OperationsTime.formatTaipeiTimestamp(state.verifiedAt || state.timestamp)
    : '本次部署已完成';
  setBadge('#production-status-badge', 'SHA 已核對', 'good');
  document.querySelector('#status-message').textContent =
    `部署成功；本機、GitHub、Production SHA 已一致：${deployedCommit}`;
}

async function refreshStatus() {
  const credentials = await openConfirmation({
    title: '查詢 Production 狀態', eyebrow: '唯讀查詢',
    paragraphs: [
      { text: '請輸入 Production 帳號與密碼。資料只用於這次唯讀狀態查詢，不會儲存。' },
      { text: '查詢只會讀取部署狀態檔，並核對固定的 Production 主機指紋。若伺服器不允許密碼登入，查詢仍會失敗。', note: true },
    ],
    fields: [
      { name: 'username', label: 'Production 帳號', value: 'zhe', autocomplete: 'username' },
      { name: 'password', label: 'Production 密碼', type: 'password', autocomplete: 'current-password' },
    ],
    confirmText: '查詢狀態', validate: (value) => !value.username || !value.password ? '請輸入帳號與密碼。' : '',
  });
  if (!credentials) return;
  const button = document.querySelector('#refresh-status');
  button.disabled = true;
  document.querySelector('#service-status').textContent = '管理中心已連線；正在查詢正式環境…';
  document.querySelector('#status-message').textContent = '正在查詢本機與 Production 狀態…';
  setBadge('#local-status-badge', '查詢中');
  setBadge('#production-status-badge', '查詢中');
  try {
    const [localResult, productionResult] = await Promise.allSettled([
      api('/api/status/local'),
      api('/api/status/production', { method: 'POST', body: JSON.stringify(credentials) }),
    ]);
    if (localResult.status === 'fulfilled') {
      const local = localResult.value;
      document.querySelector('#local-branch').textContent = local.branch;
      document.querySelector('#local-worktree').textContent = local.clean ? '乾淨' : `有 ${local.changedCount} 項變更`;
      document.querySelector('#local-head').textContent = local.head;
      document.querySelector('#github-master').textContent = local.githubMaster || local.githubReason || '無法確認';
      setBadge('#local-status-badge', local.clean ? '狀態正常' : '有未提交變更', local.clean ? 'good' : 'bad');
    } else {
      document.querySelector('#local-branch').textContent = '無法取得';
      document.querySelector('#local-worktree').textContent = '無法取得';
      document.querySelector('#local-head').textContent = '無法取得';
      document.querySelector('#github-master').textContent = '無法確認';
      setBadge('#local-status-badge', '查詢失敗', 'bad');
    }

    const production = productionResult.status === 'fulfilled'
      ? productionResult.value
      : { available: false, reason: productionResult.reason.message || '查詢失敗。' };
    displayProductionStatus(production);
    document.querySelector('#service-status').textContent = production.available
      ? '管理中心已連線；正式環境狀態已更新'
      : '管理中心已連線；正式環境查詢失敗';
    const localAvailable = localResult.status === 'fulfilled';
    document.querySelector('#status-message').textContent = localAvailable
      ? production.available ? '狀態已更新；Production 查詢為唯讀。' : `本機狀態已更新；Production 查詢未完成：${production.reason}`
      : `本機狀態查詢失敗：${localResult.reason.message || '查詢失敗。'}`;
    if (localAvailable) {
      const local = localResult.value;
      const comparison = local.githubMaster && production.available
        ? (local.head === local.githubMaster && local.head === production.liveCommit && production.commit === production.liveCommit
          ? '本機、GitHub、Production 程式與部署紀錄 SHA 完全一致。'
          : `SHA 不一致：本機 ${local.head}；GitHub ${local.githubMaster}；Production 程式 ${production.liveCommit}；部署紀錄 ${production.commit}。`)
        : local.githubMaster
          ? `本機與 GitHub SHA ${local.head === local.githubMaster ? '一致' : '不一致'}；Production SHA 尚未確認。`
          : local.githubReason;
      document.querySelector('#status-message').textContent += ` ${comparison}`;
    }
  } catch (error) {
    setBadge('#local-status-badge', '查詢失敗', 'bad');
    document.querySelector('#status-message').textContent = error.message;
    setBadge('#production-status-badge', '未確認', 'bad');
  } finally {
    credentials.password = '';
    button.disabled = false;
  }
}

function openConfirmation({ title, eyebrow = '確認操作', paragraphs = [], fields = [], checkbox, confirmText = '確認', validate }) {
  return new Promise((resolve) => {
    dialogTitle.textContent = title;
    dialogEyebrow.textContent = eyebrow;
    dialogContent.replaceChildren();
    const controls = new Map();
    for (const paragraph of paragraphs) {
      dialogContent.append(element('p', paragraph.note ? 'dialog-note' : '', paragraph.text));
    }
    for (const field of fields) {
      const label = element('label', 'dialog-field', field.label);
      let input;
      if (field.options) {
        input = element('select');
        input.name = field.name;
        for (const option of field.options) {
          const item = element('option', '', option.label);
          item.value = option.value;
          input.append(item);
        }
      } else {
        input = element('input');
        input.name = field.name;
        input.type = field.type || 'text';
        input.autocomplete = 'off';
        if (field.autocomplete) input.autocomplete = field.autocomplete;
        if (field.placeholder) input.placeholder = field.placeholder;
        if (field.value) input.value = field.value;
      }
      label.append(input);
      dialogContent.append(label);
      controls.set(field.name, input);
    }
    let checkInput = null;
    if (checkbox) {
      const label = element('label', 'dialog-check');
      checkInput = element('input');
      checkInput.type = 'checkbox';
      checkInput.name = checkbox.name;
      const text = element('span', '', checkbox.label);
      label.append(checkInput, text);
      dialogContent.append(label);
      controls.set(checkbox.name, checkInput);
    }
    const errorNode = element('p', 'dialog-error', '');
    errorNode.setAttribute('role', 'alert');
    dialogContent.append(errorNode);
    dialogConfirm.textContent = confirmText;
    dialogCancel.disabled = false;
    let complete = false;
    const clean = (value) => {
      if (complete) return;
      complete = true;
      dialogForm.removeEventListener('submit', onSubmit);
      dialogCancel.removeEventListener('click', onCancel);
      dialog.removeEventListener('cancel', onNativeCancel);
      if (dialog.open) dialog.close();
      for (const input of dialogContent.querySelectorAll('input[type="password"]')) input.value = '';
      resolve(value);
    };
    const values = () => Object.fromEntries([...controls].map(([name, input]) => [name, input.type === 'checkbox' ? input.checked : input.value]));
    const onSubmit = (event) => {
      event.preventDefault();
      const submitted = values();
      const message = validate ? validate(submitted) : '';
      if (message) {
        errorNode.textContent = message;
        const first = [...controls.values()].find((control) => control.type !== 'checkbox' && !control.disabled);
        first?.focus();
        return;
      }
      clean(submitted);
    };
    const onCancel = () => clean(null);
    const onNativeCancel = (event) => { event.preventDefault(); clean(null); };
    dialogForm.addEventListener('submit', onSubmit);
    dialogCancel.addEventListener('click', onCancel);
    dialog.addEventListener('cancel', onNativeCancel);
    dialog.showModal();
    const first = [...controls.values()].find((control) => control.type !== 'checkbox');
    first?.focus();
  });
}

function renderOperation(operation) {
  activeOperationLabel.textContent = operation.status === 'waiting-confirmation' ? '等待你的確認' : operation.stage;
  if (operation.status === 'succeeded') {
    setPanel(operation.summary || '操作成功。', 'success');
  } else if (operation.status === 'unconfirmed') {
    setPanel(operation.error || '遠端結果未確認。請先查詢狀態，勿直接重試。', 'unconfirmed');
  } else if (operation.status === 'failed') {
    setPanel(operation.error || '操作失敗。', 'error');
  } else if (operation.status === 'waiting-confirmation') {
    setPanel(`等待確認：${operation.confirmation?.message || '請依畫面提示完成確認。'}`);
  } else {
    setPanel(`操作進行中：${operation.stage}。請保持管理中心啟動視窗開啟。`);
  }
  operationOutput.replaceChildren();
  const outputLines = operation.output || [];
  for (const line of outputLines) operationOutput.append(element('li', '', line));
  if (outputLines.length === 0 && operation.status === 'running') {
    operationOutput.append(element('li', 'operation-output-empty', '目前沒有新的執行訊息；上方階段會在收到下一個部署回報時更新。請保持管理中心開啟，不要重複啟動部署。'));
  }
}

const promptDetails = {
  'push-authorization': (prompt) => ({
    title: '確認推送版本', eyebrow: '部署步驟 1',
    paragraphs: [{ text: 'GitHub master 尚未包含目前要部署的版本。若要推送這個指定版本，請輸入下方完整版本識別碼。' }, { text: `指定版本：${prompt.expectedCommit}`, note: true }],
    fields: [{ name: 'value', label: '完整版本識別碼' }], confirmText: '授權此推送',
    validate: (value) => value.value === prompt.expectedCommit ? '' : '版本識別碼不符；尚未送出確認。',
  }),
  'unverified-recovery': (prompt) => ({
    title: '封存未驗收部署並重新部署', eyebrow: '部署恢復確認',
    paragraphs: [
      { text: `Production 目前記錄的 commit ${prompt.expectedCommit} 已完成技術部署，但 Browser Acceptance 尚未通過。這一步不會把舊部署標記為成功；它會封存舊狀態，並在接下來明確授權的新部署中保留舊 commit 作為前一版紀錄。`, note: true },
      { text: `確認舊版驗收未通過，並授權繼續部署新 commit，請輸入 RECOVER ${prompt.expectedCommit}。` },
    ],
    fields: [{ name: 'value', label: '恢復確認文字' }], confirmText: '封存舊狀態並繼續',
    validate: (value) => value.value === `RECOVER ${prompt.expectedCommit}` ? '' : `請完整輸入 RECOVER ${prompt.expectedCommit}。`,
  }),
  'deploy-freeze': (prompt) => ({
    title: '確認正式部署', eyebrow: '部署步驟 2',
    paragraphs: [{ text: '開始正式部署前，請確認期間不會更新 GitHub master，也沒有其他正式部署正在執行。' }, { text: `請輸入：DEPLOY ${prompt.expectedCommit} FREEZE`, note: true }],
    fields: [{ name: 'value', label: '部署確認文字' }], confirmText: '確認部署',
    validate: (value) => value.value === `DEPLOY ${prompt.expectedCommit} FREEZE` ? '' : '確認文字不符；未開始部署。',
  }),
  'browser-acceptance': () => ({
    title: '完成網站人工驗收', eyebrow: '部署步驟 3',
    paragraphs: [{ text: '部署已完成技術檢查。請開啟 http://175.183.34.91/ 手動驗收正式網站，確認正常後再輸入 PASS。' }, { text: '若驗收未通過，請取消；系統不會送出最終確認。', note: true }],
    fields: [{ name: 'value', label: '人工驗收結果' }], confirmText: '送出驗收結果',
    validate: (value) => value.value === 'PASS' ? '' : '請輸入精確的 PASS。',
  }),
  'remote-confirmation': () => ({
    title: '確認部署驗收結果', eyebrow: '部署步驟 4',
    paragraphs: [{ text: '你已確認瀏覽器驗收通過。此步驟會將 Production 部署狀態標記為成功。' }, { text: '請輸入 CONFIRM 完成最後確認。', note: true }],
    fields: [{ name: 'value', label: '最後確認文字' }], confirmText: '完成 Production 確認',
    validate: (value) => value.value === 'CONFIRM' ? '' : '請輸入精確的 CONFIRM。',
  }),
};

async function submitPrompt(operation, prompt) {
  const build = promptDetails[prompt.type];
  if (!build) {
    await api(`/api/operations/${operation.id}/cancel`, { method: 'POST' }).catch(() => {});
    setPanel('部署入口回報未知確認步驟；已取消等待，請查詢 Production 狀態。', 'unconfirmed');
    return;
  }
  const answer = await openConfirmation(build(prompt));
  if (!answer) {
    await api(`/api/operations/${operation.id}/cancel`, { method: 'POST' });
    return;
  }
  await api(`/api/operations/${operation.id}/confirm`, {
    method: 'POST', body: JSON.stringify({ value: answer.value }),
  });
}

async function watchOperation(operationId) {
  currentOperationId = operationId;
  handledPrompt = null;
  busy = true;
  setButtonsDisabled(true);
  try {
    while (currentOperationId === operationId) {
      const operation = await api(`/api/operations/${operationId}`);
      renderOperation(operation);
      displayCompletedDeployment(operation);
      if (operation.status === 'waiting-confirmation' && operation.confirmation) {
        const promptKey = `${operation.id}:${operation.confirmation.type}`;
        if (handledPrompt !== promptKey) {
          handledPrompt = promptKey;
          try { await submitPrompt(operation, operation.confirmation); }
          catch (error) {
            await api(`/api/operations/${operation.id}/cancel`, { method: 'POST' }).catch(() => {});
            setPanel(`${error.message} 已取消此確認步驟。`, 'error');
          }
        }
      }
      if (['succeeded', 'failed', 'unconfirmed'].includes(operation.status)) break;
      await new Promise((resolve) => setTimeout(resolve, 900));
    }
  } catch (error) {
    setPanel(`管理中心連線中斷：${error.message} 若遠端操作已開始，請先查詢狀態，不要重試。`, 'unconfirmed');
  } finally {
    busy = false;
    currentOperationId = null;
    setButtonsDisabled(false);
  }
}

function setButtonsDisabled(disabled) {
  document.querySelectorAll('.card-action, #refresh-status, #load-changes').forEach((button) => { button.disabled = disabled; });
  commitButton.disabled = disabled || currentChanges.filter((file) => !file.sensitive).length === 0;
}

function renderChanges(data) {
  currentChanges = data.files || [];
  changeList.replaceChildren();
  if (!currentChanges.length) {
    changeList.append(element('p', 'empty-changes', '目前沒有可檢視的變更。'));
  }
  for (const file of currentChanges) {
    const row = element('div', 'change-row');
    const displayPath = file.originalPath ? `${file.originalPath} → ${file.path}` : file.path;
    row.append(element('span', 'change-status', file.status), element('span', 'change-path', displayPath));
    if (file.sensitive) row.append(element('span', 'protected-file', '不納入提交'));
    else {
      const diffButton = element('button', 'small-button', '查看差異');
      diffButton.type = 'button';
      diffButton.addEventListener('click', () => viewDiff(file.path).catch((error) => setPanel(error.message, 'error')));
      row.append(diffButton);
    }
    changeList.append(row);
  }
  const eligibleCount = currentChanges.filter((file) => !file.sensitive).length;
  const protectedCount = currentChanges.length - eligibleCount;
  commitButton.disabled = eligibleCount === 0;
  changeSummary.textContent = `分支 ${data.branch} · 版本 ${data.head.slice(0, 12)} · 將提交 ${eligibleCount} 項可提交變更${protectedCount ? `，另有 ${protectedCount} 項受保護檔案不納入` : ''}${data.hasProtectedChanges ? '；另有受保護路徑不顯示、不納入提交' : ''}。`;
}

async function loadChanges() {
  const button = document.querySelector('#load-changes');
  button.disabled = true;
  changeSummary.textContent = '正在讀取本機變更…';
  try { renderChanges(await api('/api/git/changes')); }
  finally { button.disabled = false; }
}

async function viewDiff(filePath) {
  const result = await api(`/api/git/diff?path=${encodeURIComponent(filePath)}`);
  await openConfirmation({
    title: result.protected ? '檔案內容已保護' : `檢視差異：${result.path}`,
    eyebrow: '本機變更檢視',
    paragraphs: [
      { text: result.message || (result.truncated ? '差異內容過長，畫面只顯示前段。' : '以下是此檔案目前已暫存與尚未暫存的差異。') },
      { text: result.diff || (result.protected ? '' : '沒有可顯示的文字差異。'), note: true },
    ],
    confirmText: '關閉', validate: () => '',
  });
}

async function commitReviewedChanges() {
  const message = document.querySelector('#commit-message').value.trim();
  if (!message || busy) return;
  const preview = await api('/api/git/commit-preview');
  if (!preview.files.length) {
    setPanel('沒有可提交的本機變更。受保護檔案不會由此功能處理。', 'error');
    return;
  }
  const answer = await openConfirmation({
    title: '確認建立本機提交', eyebrow: '本機 Git 提交',
    paragraphs: [
      { text: `將一次提交 ${preview.files.length} 個目前可提交的變更：` },
      { text: preview.files.map((entry) => entry.originalPath ? `${entry.originalPath} → ${entry.path}` : entry.path).join('\n'), note: true },
      ...(preview.excludedSensitiveCount || preview.protectedChangesRemain
        ? [{ text: '部分機密或受保護路徑不會列出、不會納入本次提交。', note: true }]
        : []),
      { text: `提交說明：${message}` },
      { text: '這一步只建立本機提交，不會連線或上傳 GitHub，也不會部署 Production。Git 提交或檔案過濾設定可能執行本機程式。', note: true },
      { text: '輸入 COMMIT 才會繼續。' },
    ],
    fields: [{ name: 'confirmation', label: '提交確認文字' }], confirmText: '建立本機提交',
    validate: (value) => value.confirmation === 'COMMIT' ? '' : '請輸入精確的 COMMIT。',
  });
  if (!answer) return;
  busy = true;
  setButtonsDisabled(true);
  try {
    const result = await api('/api/git/commit-all', { method: 'POST', body: JSON.stringify({
      expectedHead: preview.head, expectedFiles: preview.files, message, confirmation: answer.confirmation,
    }) });
    document.querySelector('#commit-message').value = '';
    setPanel(`已建立本機提交：${result.head}`, 'success');
    if (result.output) operationOutput.replaceChildren(element('li', '', result.output));
    await loadChanges();
  } catch (error) { setPanel(error.message, 'error'); }
  finally { busy = false; setButtonsDisabled(false); }
}

async function beginBackup() {
  const credentials = await openConfirmation({
    title: '連線查詢備份清單', eyebrow: 'Production 帳號驗證',
    paragraphs: [
      { text: '請輸入 Production SSH 帳號與密碼。密碼只用於本次清單查詢及備份操作，操作結束後會清除。' },
      { text: '連線會核對固定的伺服器主機指紋；管理中心不會儲存密碼。', note: true },
    ],
    fields: [
      { name: 'username', label: 'Production 帳號', value: 'zhe', autocomplete: 'username' },
      { name: 'password', label: 'Production 密碼', type: 'password', autocomplete: 'current-password' },
    ],
    confirmText: '查詢備份清單',
    validate: (value) => !value.username || !value.password ? '請輸入帳號與密碼。' : '',
  });
  if (!credentials) return;
  let target;
  try {
    target = await api('/api/backups', { method: 'POST', body: JSON.stringify(credentials) });
  } catch (error) {
    credentials.password = '';
    throw error;
  }
  const answer = await openConfirmation({
    title: '建立 Production 備份', eyebrow: '建立備份',
    paragraphs: [
      { text: `目標資料庫：${target.database}` },
      { text: '備份包含資料庫與合約 PDF，完成後會驗證備份及 checksum。' },
      { text: '既有備份政策會刪除超過 30 天的備份檔及其 checksum。此操作會寫入 Production 資料。', note: true },
      { text: '請輸入 BACKUP 確認執行。' },
    ],
    fields: [{ name: 'value', label: '備份確認文字' }], confirmText: '建立備份',
    validate: (value) => value.value === 'BACKUP' ? '' : '請輸入精確的 BACKUP。',
  });
  if (!answer) { credentials.password = ''; return; }
  try {
    await beginOperation('backup', { confirmation: answer.value, credentials });
  } finally {
    credentials.password = '';
  }
}

async function verifyExistingBackup() {
  const credentials = await openConfirmation({
    title: '驗證既有備份', eyebrow: '唯讀檢查',
    paragraphs: [
      { text: '輸入 Production SSH 帳號密碼後，選擇要檢查的備份。這只會讀取備份檔與 checksum，不會建立、刪除或修改檔案。' },
      { text: '連線會核對固定的伺服器主機指紋；密碼不會儲存。', note: true },
    ],
    fields: [
      { name: 'username', label: 'Production 帳號', value: 'zhe', autocomplete: 'username' },
      { name: 'password', label: 'Production 密碼', type: 'password', autocomplete: 'current-password' },
    ],
    confirmText: '載入備份清單',
    validate: (value) => !value.username || !value.password ? '請輸入帳號與密碼。' : '',
  });
  if (!credentials) return;
  busy = true;
  setButtonsDisabled(true);
  operationOutput.replaceChildren();
  try {
    setPanel('正在唯讀載入 Production 備份清單…');
    const target = await api('/api/backups', { method: 'POST', body: JSON.stringify(credentials) });
    if (!target.backups.length) {
      setPanel(`Production 資料庫 ${target.database} 目前沒有可供檢查的備份。`, 'error');
      return;
    }
    const choice = await openConfirmation({
      title: '選擇要驗證的備份', eyebrow: '唯讀檢查',
      paragraphs: [
        { text: `目標資料庫：${target.database}` },
        { text: '此操作只讀取所選備份及 checksum，驗證完成後會顯示明確結果。' },
      ],
      fields: [{ name: 'backupName', label: '備份檔案', options: target.backups.map((name) => ({ value: name, label: window.OperationsTime.formatBackupOption(name) })) }],
      confirmText: '開始唯讀驗證',
    });
    if (!choice) return;
    setPanel(`正在唯讀驗證 ${choice.backupName}…`);
    const result = await api('/api/backups/verify', {
      method: 'POST', body: JSON.stringify({ ...credentials, backupName: choice.backupName }),
    });
    setPanel(`驗證成功：${result.backupName}；備份檔存在且 checksum 相符。`, 'success');
    operationOutput.replaceChildren(element('li', '', result.detail));
  } finally {
    credentials.password = '';
    busy = false;
    setButtonsDisabled(false);
  }
}

async function beginDeployment() {
  const local = await api('/api/status/local');
  if (local.branch !== 'master' || !local.clean) {
    setPanel(`部署已阻擋：分支為「${local.branch}」，工作樹${local.clean ? '乾淨' : `有 ${local.changedCount} 項變更`}。請先處理本機 Git 狀態。`, 'error');
    return;
  }
  const answer = await openConfirmation({
    title: '更新 Production 網站', eyebrow: '更新網站',
    paragraphs: [
      { text: `目標版本：${local.head}` },
      { text: '此流程會執行既有部署預檢；若 GitHub master 落後，之後會另外要求你確認是否推送。' },
      { text: '部署會更新 Production 網站服務，並可能建立正式備份。請先確認你要繼續。', note: true },
      { text: '請輸入 DEPLOY 開始預檢。' },
    ],
    fields: [{ name: 'value', label: '開始部署確認' }], confirmText: '開始部署預檢',
    validate: (value) => value.value === 'DEPLOY' ? '' : '請輸入精確的 DEPLOY。',
  });
  if (!answer) return;
  await beginOperation('deploy', { confirmation: answer.value });
}

async function beginRestore() {
  const target = await api('/api/backups');
  if (target.backups.length === 0) {
    setPanel(`Production 資料庫 ${target.database} 的備份目錄目前沒有可用備份。`, 'error');
    return;
  }
  const answer = await openConfirmation({
    title: '還原 Production 資料', eyebrow: '破壞性操作',
    paragraphs: [
      { text: `目標資料庫：${target.database}` },
      { text: '還原會覆寫資料庫現有資料及合約 PDF。管理中心不會自動停止服務。', note: true },
      { text: '只有在 pets-backend.service 與 pets-frontend.service 都已停止時才可繼續。請先確認備份選擇正確。' },
    ],
    fields: [
      { name: 'backupName', label: '選擇備份', options: target.backups.map((name) => ({ value: name, label: window.OperationsTime.formatBackupOption(name) })) },
      { name: 'confirmation', label: '輸入 RESTORE 確認' },
    ],
    checkbox: { name: 'servicesStopped', label: '我已確認 pets-backend.service 與 pets-frontend.service 均已停止。' },
    confirmText: '執行還原',
    validate: (value) => !value.servicesStopped ? '請先確認兩個應用服務均已停止。' : value.confirmation !== 'RESTORE' ? '請輸入精確的 RESTORE。' : '',
  });
  if (!answer) return;
  const second = await openConfirmation({
    title: '最後確認還原', eyebrow: '再次確認 Production',
    paragraphs: [
      { text: `即將還原備份：${answer.backupName}` },
      { text: `目標資料庫：${target.database}` },
      { text: '這會取代 Production 資料庫與合約 PDF，且無法保證回復至還原前狀態。', note: true },
      { text: '再次輸入 RESTORE 才會送出命令。' },
    ],
    fields: [{ name: 'confirmation', label: '最後還原確認' }], confirmText: '確認並還原',
    validate: (value) => value.confirmation === 'RESTORE' ? '' : '請輸入精確的 RESTORE。',
  });
  if (!second) return;
  await beginOperation('restore', {
    backupName: answer.backupName,
    servicesStopped: answer.servicesStopped,
    confirmation: second.confirmation,
  });
}

async function beginOperation(kind, payload) {
  if (busy) return;
  const operation = await api('/api/operations', {
    method: 'POST', body: JSON.stringify({ kind, ...payload }),
  });
  await watchOperation(operation.id);
}

document.querySelector('#refresh-status').addEventListener('click', () => refreshStatus().catch((error) => setPanel(error.message, 'error')));
document.querySelector('#load-changes').addEventListener('click', () => loadChanges().catch((error) => { changeSummary.textContent = error.message; setPanel(error.message, 'error'); }));
commitButton.addEventListener('click', () => commitReviewedChanges().catch((error) => setPanel(error.message, 'error')));
document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', async () => {
    if (busy) return;
    try {
      const action = button.dataset.action;
      if (action === 'status') await refreshStatus();
      else if (action === 'backup') await beginBackup();
      else if (action === 'verify-backup') await verifyExistingBackup();
      else if (action === 'deploy') await beginDeployment();
      else if (action === 'restore') await beginRestore();
    } catch (error) {
      setPanel(error.message, 'error');
    }
  });
});
