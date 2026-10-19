const fs = require('fs');
const path = require('path');

const operationsCenterPath = path.resolve(
  __dirname,
  '..',
  '..',
  'tools',
  'Pets-Operations-Center.ps1',
);
const deploymentEntryPath = path.resolve(
  __dirname,
  '..',
  '..',
  'deploy-production.ps1',
);
const deploymentLauncherPath = path.resolve(
  __dirname,
  '..',
  '..',
  'tools',
  'Invoke-ProductionDeployment.ps1',
);
const operationsCenter = fs.readFileSync(operationsCenterPath, 'utf8');
const deploymentEntry = fs.readFileSync(deploymentEntryPath, 'utf8');
const deploymentLauncher = fs.readFileSync(deploymentLauncherPath, 'utf8');

function getFunctionSource(source, functionName, nextFunctionName) {
  const start = source.indexOf(`function ${functionName} {`);
  const end = source.indexOf(`function ${nextFunctionName} {`, start);
  if (start < 0 || end < 0) {
    throw new Error(`Could not locate function ${functionName}.`);
  }
  return source.slice(start, end);
}

describe('Operations Center Production deployment wiring', () => {
  test('enables the deploy button and routes clicks to the deployment operation', () => {
    expect(operationsCenter).toMatch(/\$deployButton\.Text = '啟動部署'\s+\$deployButton\.Enabled = \$true/);
    expect(operationsCenter).toMatch(
      /\$script:Controls\.DeployButton\.Add_Click\(\{\s*Request-ProductionDeploymentOperation\s*\}\)/,
    );
    expect(operationsCenter).toMatch(/可能會將此 commit 推送至 GitHub origin\/master/);
    expect(operationsCenter).toMatch(/\[System\.Windows\.Forms\.MessageBoxButtons\]::YesNo/);
  });

  test('starts a visible interactive launcher without redirecting console streams', () => {
    const starter = getFunctionSource(
      operationsCenter,
      'Start-ProductionDeploymentProcess',
      'Request-ProductionDeploymentOperation',
    );

    expect(starter).toMatch(/Join-Path \$script:ProjectRoot 'tools\\Invoke-ProductionDeployment\.ps1'/);
    expect(starter).toMatch(/-ExpectedCommit \{1\}.*\$ExpectedCommit/);
    expect(starter).toMatch(/\$startInfo\.UseShellExecute = \$true/);
    expect(starter).toMatch(/\$startInfo\.WindowStyle = \[System\.Diagnostics\.ProcessWindowStyle\]::Normal/);
    expect(starter).toMatch(/\$startInfo\.RedirectStandardInput = \$false/);
    expect(starter).toMatch(/\$startInfo\.RedirectStandardOutput = \$false/);
    expect(starter).toMatch(/\$startInfo\.RedirectStandardError = \$false/);
    expect(starter).not.toMatch(/Start-BackgroundOperation|Invoke-CapturedProcess/);
    expect(deploymentLauncher).toMatch(/Join-Path \$projectRoot 'deploy-production\.ps1'/);
    expect(deploymentLauncher).toMatch(/Start-Process|Process\]::Start/);
    expect(deploymentLauncher).toMatch(/\.WaitForExit\(\)/);
    expect(deploymentLauncher).toMatch(/\.ExitCode/);
    expect(deploymentLauncher).toMatch(/exit \$exitCode/);
    expect(deploymentLauncher).toMatch(/\$startInfo\.RedirectStandardInput = \$false/);
    expect(deploymentLauncher).toMatch(/\$startInfo\.RedirectStandardOutput = \$false/);
    expect(deploymentLauncher).toMatch(/\$startInfo\.RedirectStandardError = \$false/);
  });

  test('reports launch errors and requires an observed zero exit code for success', () => {
    const request = getFunctionSource(
      operationsCenter,
      'Request-ProductionDeploymentOperation',
      'Start-BackgroundOperation',
    );

    expect(request).toMatch(/Start-ProductionDeploymentProcess[\s\S]*?-ExpectedCommit \$expectedCommit/);
    expect(request).toMatch(/catch \{[\s\S]*?Status '啟動失敗'[\s\S]*?'未回報部署成功。'/);
    expect(request).toMatch(/\$process\.ExitCode/);
    expect(request).toMatch(/\$exitCode -eq 0/);
    expect(request).toMatch(/入口退出碼 \$exitCode/);
    expect(request).toMatch(/結果未確認；退出碼無法讀取/);
    expect(operationsCenter).toMatch(/if \(\$script:OperationState\.DeploymentProcess\) \{\s+\$formClosingArgs\.Cancel = \$true/);
  });

  test('preserves the deployment entry interactive authorization and safety checks', () => {
    expect(deploymentEntry).toMatch(/ValidatePattern\('\^\[0-9a-fA-F\]\{40\}\$'\)/);
    expect(deploymentEntry).toMatch(/branch -cne 'master'/);
    expect(deploymentEntry).toMatch(/Working tree is not clean/);
    expect(deploymentEntry).toMatch(/headSha -cne \$ExpectedCommit/);
    expect(deploymentEntry).toMatch(/ExpectedRemoteUrl/);
    expect(deploymentEntry).toMatch(/refs\/heads\/master/);
    expect(deploymentEntry).toMatch(/StrictHostKeyChecking=yes/);
    expect(deploymentEntry).toMatch(/Read-Host "To authorize pushing exactly/);
    expect(deploymentEntry).toMatch(/Read-Host "Confirm all three conditions/);
    expect(deploymentEntry).toMatch(/Read-Host "After Browser Acceptance passes/);
    expect(deploymentEntry).toMatch(/deployExitCode -ne 0/);
    expect(deploymentEntry).toMatch(/confirmExitCode -ne 0/);
  });
});
