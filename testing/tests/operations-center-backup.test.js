const { spawnSync } = require('child_process');
const path = require('path');

const operationsCenterPath = path.resolve(
  __dirname,
  '..',
  '..',
  'tools',
  'Pets-Operations-Center.ps1',
);

const powershellHarness = String.raw`
$ErrorActionPreference = 'Stop'
$tokens = $null
$parseErrors = $null
$sourceAst = [System.Management.Automation.Language.Parser]::ParseFile(
  $env:OPERATIONS_CENTER_PATH,
  [ref]$tokens,
  [ref]$parseErrors
)
if ($parseErrors.Count -gt 0) {
  throw ($parseErrors | ForEach-Object { $_.Message } | Out-String)
}

$requiredFunctions = @(
  'Clear-SshCredential',
  'Invoke-BackupSshOperation',
  'Clear-BackupSshResources',
  'Get-BackupProcessOutcome',
  'Get-BackupCompletion',
  'ConvertTo-PosixShellSingleQuotedString'
)
$functionDefinitions = @{}
$sourceAst.FindAll({
  param($node)
  $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and
    $requiredFunctions -contains $node.Name
}, $true) | ForEach-Object {
  $functionDefinitions[$_.Name] = $_.Extent.Text
}
foreach ($name in $requiredFunctions) {
  if (-not $functionDefinitions.ContainsKey($name)) {
    throw "Required function not found: $name"
  }
  Invoke-Expression $functionDefinitions[$name]
}

$workerAssignment = $sourceAst.Find({
  param($node)
  $node -is [System.Management.Automation.Language.AssignmentStatementAst] -and
    $node.Left.Extent.Text -eq '$workerScript' -and
    $node.Right -is [System.Management.Automation.Language.CommandExpressionAst]
}, $true)
if (-not $workerAssignment) {
  throw 'Worker script assignment not found.'
}
$workerLiteral = $workerAssignment.Right.Find({
  param($node)
  $node -is [System.Management.Automation.Language.StringConstantExpressionAst] -and
    $node.Value.Contains('$workerRequest = $args[2]')
}, $true)
if (-not $workerLiteral) {
  throw 'Worker script literal not found.'
}
$workerSource = $workerLiteral.Value

$script:cases = New-Object System.Collections.Generic.List[object]
function Add-TestCase {
  param([string]$Name, [scriptblock]$Body)
  try {
    & $Body
    [void]$script:cases.Add([pscustomobject]@{ Name = $Name; Passed = $true; Error = $null })
  } catch {
    [void]$script:cases.Add([pscustomobject]@{ Name = $Name; Passed = $false; Error = $_.Exception.Message })
  }
}
function Assert-True {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw $Message }
}

$mockSource = @'
param(
  [string]$Phase,
  [string]$HostName,
  [string]$Username,
  [string]$RemoteCommand,
  [int]$TimeoutMilliseconds,
  [hashtable]$Context
)
$global:backupMockCalls.Add($Phase)
if ($global:backupMockThrowOnPhase -ceq $Phase) {
  throw 'mock exception contains test-backup-password'
}
if ($Phase -ceq 'Connect') {
  return [pscustomobject]@{
    AuthenticationSucceeded = $global:backupMockAuthenticationSucceeded
    HostKeyVerified = $global:backupMockHostKeyVerified
  }
}
return $global:backupMockCommandResult
'@

function Invoke-BackupWithMock {
  param(
    [bool]$AuthenticationSucceeded = $true,
    [bool]$HostKeyVerified = $true,
    [Parameter(Mandatory = $true)]$CommandResult,
    [string]$ThrowOnPhase = ''
  )
  $global:backupMockCalls = New-Object System.Collections.Generic.List[string]
  $global:backupMockAuthenticationSucceeded = $AuthenticationSucceeded
  $global:backupMockHostKeyVerified = $HostKeyVerified
  $global:backupMockCommandResult = $CommandResult
  $global:backupMockThrowOnPhase = $ThrowOnPhase
  $context = @{
    CancelRequested = $false
    HostKeyVerified = $false
    SshAuthenticationSucceeded = $false
    SshCleanupFailed = $false
    SshDisconnectFailed = $false
  }
  $result = Invoke-BackupSshOperation -HostName 'mock.invalid' -Username 'isolated-user' -RemoteCommand 'isolated command' -Context $context -SshAssembly $null -TimeoutMilliseconds 3600000 -TestMode $true -MockExecutor ([scriptblock]::Create($mockSource))
  return [pscustomobject]@{ Result = $result; Context = $context; Calls = @($global:backupMockCalls) }
}

function New-CommandResult {
  param(
    [AllowNull()][object]$ExitCode = 0,
    [string]$Stdout = '',
    [string]$Stderr = '',
    [bool]$TimedOut = $false,
    [bool]$Cancelled = $false
  )
  return [pscustomobject]@{
    ExitCode = $ExitCode
    Stdout = $Stdout
    Stderr = $Stderr
    TimedOut = $TimedOut
    Cancelled = $Cancelled
  }
}

$successMarker = 'BACKUP_FILE=/home/zhe/pets-backups/pets_backup_20261017_123456.tar.gz'
Add-TestCase 'Authentication failure never reaches the backup command' {
  $execution = Invoke-BackupWithMock -AuthenticationSucceeded $false -CommandResult (New-CommandResult)
  Assert-True ($execution.Calls.Count -eq 1 -and $execution.Calls[0] -ceq 'Connect') 'Command phase ran after authentication failure.'
  Assert-True ($execution.Result.FailureStage -ceq 'Authentication') 'Authentication failure was not reported.'
  $completion = Get-BackupCompletion -Result $execution.Result -ExpectedDirectory '/home/zhe/pets-backups'
  Assert-True (-not $completion.Success) 'Authentication failure was reported as success.'
}
Add-TestCase 'Unverified host fingerprint never reaches the backup command' {
  $execution = Invoke-BackupWithMock -HostKeyVerified $false -CommandResult (New-CommandResult)
  Assert-True ($execution.Calls.Count -eq 1 -and $execution.Calls[0] -ceq 'Connect') 'Command phase ran without verified host fingerprint.'
  Assert-True ($execution.Result.FailureStage -ceq 'HostKeyVerification') 'Host key failure was not reported.'
}
Add-TestCase 'Non-zero command exit code is not successful' {
  $execution = Invoke-BackupWithMock -CommandResult (New-CommandResult -ExitCode 7 -Stdout $successMarker)
  $completion = Get-BackupCompletion -Result $execution.Result -ExpectedDirectory '/home/zhe/pets-backups'
  Assert-True (-not $completion.Success) 'Non-zero exit code was reported as success.'
}
Add-TestCase 'Timed-out command with success marker remains unconfirmed' {
  $execution = Invoke-BackupWithMock -CommandResult (New-CommandResult -Stdout $successMarker -TimedOut $true)
  $completion = Get-BackupCompletion -Result $execution.Result -ExpectedDirectory '/home/zhe/pets-backups'
  Assert-True (-not $completion.Success) 'Timed-out command was reported as success.'
  Assert-True $execution.Result.ExecutionUnconfirmed 'Timeout result was not marked unconfirmed.'
}
Add-TestCase 'Cancelled command with success marker remains unconfirmed' {
  $execution = Invoke-BackupWithMock -CommandResult (New-CommandResult -Stdout $successMarker -Cancelled $true)
  $completion = Get-BackupCompletion -Result $execution.Result -ExpectedDirectory '/home/zhe/pets-backups'
  Assert-True (-not $completion.Success) 'Cancelled command was reported as success.'
  Assert-True $execution.Result.ExecutionUnconfirmed 'Cancellation result was not marked unconfirmed.'
}
Add-TestCase 'Missing malformed and duplicate success markers are rejected' {
  foreach ($stdout in @(
    '',
    'BACKUP_FILE=not-a-valid-backup.tar.gz',
    ($successMarker + [char]10 + $successMarker)
  )) {
    $execution = Invoke-BackupWithMock -CommandResult (New-CommandResult -Stdout $stdout)
    $completion = Get-BackupCompletion -Result $execution.Result -ExpectedDirectory '/home/zhe/pets-backups'
    Assert-True (-not $completion.Success) "Invalid success output was accepted: $stdout"
  }
}
Add-TestCase 'Only one valid marker with zero exit code is successful' {
  $execution = Invoke-BackupWithMock -CommandResult (New-CommandResult -Stdout $successMarker)
  $completion = Get-BackupCompletion -Result $execution.Result -ExpectedDirectory '/home/zhe/pets-backups'
  Assert-True $completion.Success 'Valid unique success marker was rejected.'
  Assert-True ($execution.Context.SshAuthenticationSucceeded -and $execution.Context.HostKeyVerified) 'Authentication or host key was not verified before command.'
  Assert-True ($execution.Calls.Count -eq 2 -and $execution.Calls[1] -ceq 'Command') 'Expected authenticated command phase.'
}
Add-TestCase 'Unconfirmed execution and sensitive stdout/stderr are never logged' {
  $execution = Invoke-BackupWithMock -CommandResult (New-CommandResult -ExitCode 9 -Stdout 'test-backup-password diagnostic' -Stderr 'SENSITIVE-OUTPUT')
  $completion = Get-BackupCompletion -Result $execution.Result -ExpectedDirectory '/home/zhe/pets-backups'
  $logText = @($completion.Output) -join [Environment]::NewLine
  Assert-True (-not $completion.Success) 'Failed command was reported as success.'
  Assert-True ($logText -notmatch 'test-backup-password|SENSITIVE-OUTPUT') 'Sensitive command output entered completion logs.'
}
Add-TestCase 'Mock exception text is suppressed' {
  $execution = Invoke-BackupWithMock -CommandResult (New-CommandResult) -ThrowOnPhase 'Connect'
  $completion = Get-BackupCompletion -Result $execution.Result -ExpectedDirectory '/home/zhe/pets-backups'
  $logText = @($completion.Output) -join [Environment]::NewLine
  Assert-True (-not $completion.Success) 'Mock exception was reported as success.'
  Assert-True ($logText -notmatch 'test-backup-password') 'Exception text entered completion logs.'
}
Add-TestCase 'Missing empty or disabled test mocks fail closed' {
  $context = @{ CancelRequested = $false }
  $missingFailed = $false
  try {
    Invoke-BackupSshOperation -HostName 'mock.invalid' -Username 'isolated-user' -RemoteCommand 'isolated command' -Context $context -SshAssembly $null -TestMode $true
  } catch { $missingFailed = $true }
  Assert-True $missingFailed 'Test mode accepted a missing Mock.'

  $emptyFailed = $false
  try {
    Invoke-BackupSshOperation -HostName 'mock.invalid' -Username 'isolated-user' -RemoteCommand 'isolated command' -Context $context -SshAssembly $null -TestMode $true -MockExecutor {}
  } catch { $emptyFailed = $true }
  Assert-True $emptyFailed 'Test mode accepted an empty Mock.'

  $disabledFailed = $false
  try {
    Invoke-BackupSshOperation -HostName 'mock.invalid' -Username 'isolated-user' -RemoteCommand 'isolated command' -Context $context -SshAssembly $null -TestMode $false -MockExecutor ([scriptblock]::Create($mockSource))
  } catch { $disabledFailed = $true }
  Assert-True $disabledFailed 'Disabled test mode accepted a Mock.'
}
Add-TestCase 'Invalid mock connection or command results fail closed' {
  $context = @{ CancelRequested = $false; HostKeyVerified = $false; SshAuthenticationSucceeded = $false }
  $invalidConnectionMock = {
    param($Phase, $HostName, $Username, $RemoteCommand, $TimeoutMilliseconds, $Context)
    return [pscustomobject]@{}
  }
  $connectionResult = Invoke-BackupSshOperation -HostName 'mock.invalid' -Username 'isolated-user' -RemoteCommand 'isolated command' -Context $context -SshAssembly $null -TestMode $true -MockExecutor $invalidConnectionMock
  Assert-True (-not (Get-BackupCompletion -Result $connectionResult -ExpectedDirectory '/home/zhe/pets-backups').Success) 'Invalid connection Mock result was accepted.'
  Assert-True (-not $connectionResult.ExecutionUnconfirmed) 'Invalid connection result was incorrectly marked as a remote command.'

  $invalidCommandMock = {
    param($Phase, $HostName, $Username, $RemoteCommand, $TimeoutMilliseconds, $Context)
    if ($Phase -ceq 'Connect') {
      return [pscustomobject]@{ AuthenticationSucceeded = $true; HostKeyVerified = $true }
    }
    return [pscustomobject]@{ ExitCode = 0; Stdout = 'BACKUP_FILE=/home/zhe/pets-backups/pets_backup_20261017_123456.tar.gz'; TimedOut = $false; Cancelled = $false }
  }
  $context = @{ CancelRequested = $false; HostKeyVerified = $false; SshAuthenticationSucceeded = $false }
  $commandResult = Invoke-BackupSshOperation -HostName 'mock.invalid' -Username 'isolated-user' -RemoteCommand 'isolated command' -Context $context -SshAssembly $null -TestMode $true -MockExecutor $invalidCommandMock
  Assert-True (-not (Get-BackupCompletion -Result $commandResult -ExpectedDirectory '/home/zhe/pets-backups').Success) 'Invalid command Mock result was accepted.'
  Assert-True $commandResult.ExecutionUnconfirmed 'Invalid command result was not conservatively marked unconfirmed.'
}

function New-FakeDisposable {
  param([bool]$Connected = $false, [bool]$ThrowOnDisconnect = $false)
  $fake = [pscustomobject]@{
    IsConnected = $Connected
    DisconnectCount = 0
    DisposeCount = 0
    ThrowOnDisconnect = $ThrowOnDisconnect
  }
  $fake | Add-Member -MemberType ScriptMethod -Name Disconnect -Value {
    $this.DisconnectCount++
    if ($this.ThrowOnDisconnect) { throw 'mock disconnect failure' }
    $this.IsConnected = $false
  }
  $fake | Add-Member -MemberType ScriptMethod -Name Dispose -Value {
    $this.DisposeCount++
  }
  return $fake
}
Add-TestCase 'Resource cleanup disposes client authentication command and password' {
  foreach ($terminalState in @('success', 'authentication-failure', 'host-key-failure', 'command-failure', 'timeout', 'cancel', 'exception')) {
    $authenticationSucceeded = $terminalState -ne 'authentication-failure'
    $hostKeyVerified = $terminalState -ne 'host-key-failure'
    $throwOnPhase = if ($terminalState -eq 'exception') { 'Command' } else { '' }
    $commandResult = switch ($terminalState) {
      'command-failure' { New-CommandResult -ExitCode 3 }
      'timeout' { New-CommandResult -Stdout $successMarker -TimedOut $true }
      'cancel' { New-CommandResult -Stdout $successMarker -Cancelled $true }
      default { New-CommandResult -Stdout $successMarker }
    }
    $execution = Invoke-BackupWithMock -AuthenticationSucceeded $authenticationSucceeded -HostKeyVerified $hostKeyVerified -CommandResult $commandResult -ThrowOnPhase $throwOnPhase
    $client = New-FakeDisposable -Connected $true
    $authentication = New-FakeDisposable
    $command = New-FakeDisposable
    $password = ConvertTo-SecureString -String 'test-backup-password' -AsPlainText -Force
    $execution.Context.SshClient = $client
    $execution.Context.SshAuthentication = $authentication
    $execution.Context.SshCommand = $command
    $execution.Context.SshCleanupFailed = $false
    $execution.Context.SshDisconnectFailed = $false
    $cleanupSucceeded = Clear-BackupSshResources -Context $execution.Context -SecurePassword $password
    Assert-True $cleanupSucceeded "Cleanup failed for $terminalState."
    Assert-True ($client.DisconnectCount -eq 1 -and $client.DisposeCount -eq 1) "Client cleanup failed for $terminalState."
    Assert-True ($authentication.DisposeCount -eq 1 -and $command.DisposeCount -eq 1) "Authentication/command cleanup failed for $terminalState."
    Assert-True ($null -eq $execution.Context.SshClient -and $null -eq $execution.Context.SshAuthentication -and $null -eq $execution.Context.SshCommand) "Context retained SSH resources for $terminalState."
    $passwordDisposed = $false
    try { $password.AppendChar('x') } catch { $passwordDisposed = $true }
    Assert-True $passwordDisposed "SecureString was not disposed for $terminalState."
  }
}
Add-TestCase 'Cleanup failure is reported and does not leave credentials uncleared' {
  $client = New-FakeDisposable -Connected $true -ThrowOnDisconnect $true
  $password = ConvertTo-SecureString -String 'test-backup-password' -AsPlainText -Force
  $context = @{ SshClient = $client; SshCleanupFailed = $false; SshDisconnectFailed = $false }
  $cleanupSucceeded = Clear-BackupSshResources -Context $context -SecurePassword $password
  Assert-True (-not $cleanupSucceeded) 'Disconnect failure was reported as successful cleanup.'
  Assert-True ($client.DisposeCount -eq 1) 'Client was not disposed after disconnect failure.'
  $passwordDisposed = $false
  try { $password.AppendChar('x') } catch { $passwordDisposed = $true }
  Assert-True $passwordDisposed 'Password was not disposed after cleanup failure.'
}

Add-TestCase 'Backup destination preflight skips OpenSSH authentication and Backup uses SSH.NET helper' {
  Assert-True ($workerSource -match '(?s)\$secondaryAuthentication\s*=\s*if\s*\(\$workerRequest\.Action\s*-eq\s*''SshTest''\)\s*\{\s*Test-ProductionOpenSshAuthentication') 'Preflight no longer selects SSH.NET-only authentication.'
  Assert-True ($workerSource -match 'Invoke-BackupSshOperation') 'Backup does not call the SSH.NET execution helper.'
  Assert-True ($workerSource -notmatch 'Invoke-ProductionOpenSsh\\s+-RemoteCommand\\s+\\$remoteCommand') 'Backup still invokes OpenSSH.'
}

ConvertTo-Json -InputObject @($script:cases.ToArray()) -Compress -Depth 8
`;

let testResults;
beforeAll(() => {
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '-'], {
    encoding: 'utf8',
    input: powershellHarness,
    env: {
      ...process.env,
      OPERATIONS_CENTER_PATH: operationsCenterPath,
    },
    timeout: 30000,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Isolated PowerShell harness failed:\n${result.stdout}\n${result.stderr}`);
  }
  testResults = JSON.parse(result.stdout.trim());
});

describe('Operations Center Backup isolated behavior', () => {
  test.each([
    'Authentication failure never reaches the backup command',
    'Unverified host fingerprint never reaches the backup command',
    'Non-zero command exit code is not successful',
    'Timed-out command with success marker remains unconfirmed',
    'Cancelled command with success marker remains unconfirmed',
    'Missing malformed and duplicate success markers are rejected',
    'Only one valid marker with zero exit code is successful',
    'Unconfirmed execution and sensitive stdout/stderr are never logged',
    'Mock exception text is suppressed',
    'Missing empty or disabled test mocks fail closed',
    'Invalid mock connection or command results fail closed',
    'Resource cleanup disposes client authentication command and password',
    'Cleanup failure is reported and does not leave credentials uncleared',
    'Backup destination preflight skips OpenSSH authentication and Backup uses SSH.NET helper',
  ])('%s', (name) => {
    const result = testResults.find((item) => item.Name === name);
    expect(result).toBeDefined();
    expect(result).toMatchObject({ Passed: true, Error: null });
  });
});
