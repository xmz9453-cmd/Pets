const { spawnSync } = require('child_process');
const path = require('path');

const powershell = 'powershell.exe';
const operationsCenterPath = path.resolve(
  __dirname,
  '..',
  '..',
  'tools',
  'Pets-Operations-Center.ps1',
);

const mockExecutorSource = String.raw`
param(
  [string]$RemoteCommand,
  [hashtable]$Context,
  [string]$Stage,
  [int]$TimeoutMilliseconds,
  [AllowNull()][string]$StandardInputText
)
$stdout = if ($RemoteCommand -like '*find -- /home/zhe/pets-backups*') {
  ('DATABASE=psop_one' + [char]10 + 'pets_backup_20261017_123456.tar.gz')
} else {
  '[restore.sh SUCCESS] Database and 2 Contract PDF file(s) restored and verified.'
}
[pscustomobject]@{
  ExitCode = 0
  Stdout = $stdout
  Stderr = ''
  TimedOut = $false
  Cancelled = $false
  CapturedCommand = $RemoteCommand
  CapturedInput = $StandardInputText
  CapturedStage = $Stage
  CapturedTimeoutMilliseconds = $TimeoutMilliseconds
}
`;

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
  'Test-RestoreBundlePath',
  'Invoke-RestoreRemoteCommand',
  'Invoke-RestoreConfirmationGate',
  'Get-RestoreCompletionVerdict',
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

Invoke-Expression ($functionDefinitions['Test-RestoreBundlePath'])
Invoke-Expression ($functionDefinitions['Invoke-RestoreRemoteCommand'])
Invoke-Expression ($functionDefinitions['Invoke-RestoreConfirmationGate'])
Invoke-Expression ($functionDefinitions['Get-RestoreCompletionVerdict'])
$script:productionCalls = 0
function Invoke-ProductionOpenSsh {
  $script:productionCalls++
  throw 'Production SSH is forbidden in this test harness.'
}

$cases = New-Object System.Collections.Generic.List[object]
function Add-TestCase {
  param([string]$Name, [scriptblock]$Body)
  try {
    & $Body
    [void]$cases.Add([pscustomobject]@{ Name = $Name; Passed = $true; Error = $null })
  } catch {
    [void]$cases.Add([pscustomobject]@{ Name = $Name; Passed = $false; Error = $_.Exception.Message })
  }
}
function Assert-True {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw $Message }
}
function Assert-GateRejected {
  param(
    [string]$Name,
    [bool]$WarningConfirmed,
    [bool]$ServicesStoppedConfirmed,
    [AllowEmptyString()][string]$Confirmation
  )
  $script:scheduleCalls = 0
  $decision = Invoke-RestoreConfirmationGate -BundlePath '/home/zhe/pets-backups/pets_backup_20261017_123456.tar.gz' -DatabaseName 'psop_test' -WarningConfirmed $WarningConfirmed -ServicesStoppedConfirmed $ServicesStoppedConfirmed -RestoreConfirmation $Confirmation -ScheduleRestore { param($request) $script:scheduleCalls++ }
  Assert-True (-not $decision.Accepted) "$Name unexpectedly accepted."
  Assert-True ($script:scheduleCalls -eq 0) "$Name scheduled Restore $script:scheduleCalls time(s)."
}

Add-TestCase 'Warning cancellation blocks scheduling' {
  Assert-GateRejected -Name 'Warning cancellation' -WarningConfirmed $false -ServicesStoppedConfirmed $false -Confirmation ''
}
Add-TestCase 'Service-stop confirmation rejection blocks scheduling' {
  Assert-GateRejected -Name 'Service-stop rejection' -WarningConfirmed $true -ServicesStoppedConfirmed $false -Confirmation ''
}
foreach ($confirmation in @('', 'RESTORE-now', 'restore')) {
  $caseName = "Confirmation '$confirmation' blocks scheduling"
  Add-TestCase $caseName {
    Assert-GateRejected -Name $caseName -WarningConfirmed $true -ServicesStoppedConfirmed $true -Confirmation $confirmation
  }.GetNewClosure()
}
Add-TestCase 'All confirmations schedule exactly once' {
  $script:scheduleCalls = 0
  $decision = Invoke-RestoreConfirmationGate -BundlePath '/home/zhe/pets-backups/pets_backup_20261017_123456.tar.gz' -DatabaseName 'psop_test' -WarningConfirmed $true -ServicesStoppedConfirmed $true -RestoreConfirmation 'RESTORE' -ScheduleRestore { param($request) $script:scheduleCalls++ }
  Assert-True $decision.Accepted 'All valid confirmations were not accepted.'
  Assert-True ($script:scheduleCalls -eq 1) "Expected one scheduled Restore; got $script:scheduleCalls."
  Assert-True ($decision.Request.Confirmation -ceq 'RESTORE') 'Scheduled confirmation was not preserved.'
}

Add-TestCase 'Test mode rejects missing Mock without calling Production SSH' {
  $script:productionCalls = 0
  $threw = $false
  try {
    Invoke-RestoreRemoteCommand -RemoteCommand 'mock-only' -Context @{} -Stage 'test' -TestMode $true
  } catch { $threw = $true }
  Assert-True $threw 'Missing Mock did not fail closed.'
  Assert-True ($script:productionCalls -eq 0) 'Production SSH stub was called.'
}
Add-TestCase 'Test mode rejects empty Mock without calling Production SSH' {
  $script:productionCalls = 0
  $threw = $false
  try {
    Invoke-RestoreRemoteCommand -RemoteCommand 'mock-only' -Context @{} -Stage 'test' -TestMode $true -MockExecutor {}
  } catch { $threw = $true }
  Assert-True $threw 'Empty Mock did not fail closed.'
  Assert-True ($script:productionCalls -eq 0) 'Production SSH stub was called.'
}
Add-TestCase 'Malformed Mock ScriptBlock source is rejected before remote execution' {
  $mock = $null
  $threw = $false
  try { $mock = [scriptblock]::Create('param(') } catch { $threw = $true }
  Assert-True $threw 'Invalid Mock source was accepted by the PowerShell parser.'
  Assert-True ($script:productionCalls -eq 0) 'Production SSH stub was called.'
}

$workerFunctionSource = @(
  $functionDefinitions['ConvertTo-PosixShellSingleQuotedString'],
  $functionDefinitions['Invoke-RestoreRemoteCommand'],
  'function Protect-SensitiveText { param([string]$Text) return $Text }',
  'function Invoke-ProductionOpenSsh { throw ''Production SSH is forbidden in this test harness.'' }'
) -join ([string][char]13 + [char]10)
function Invoke-IsolatedWorker {
  param([string]$Action, [AllowNull()][string]$MockSource)
  $request = @{
    Action = $Action
    Context = @{
      Operation = 'isolated test'
      Stage = ''
      CancelRequested = $false
      ProcessStarted = $false
    }
    RestoreTestMode = $true
    RestoreRemoteExecutorScript = $MockSource
    RestoreBundlePath = '/home/zhe/pets-backups/pets_backup_20261017_123456.tar.gz'
    RestoreConfirmation = 'RESTORE'
    BackupSshPath = 'not-used'
    BackupSshKey = 'not-used'
    BackupSshTarget = 'mock-target'
    BackupProductionRoot = '/isolated/project'
    RestoreScript = '/isolated/restore.sh'
    RestoreBackupDirectory = '/isolated/backups'
    SshPassword = $null
  }
  $runspace = [System.Management.Automation.Runspaces.RunspaceFactory]::CreateRunspace()
  $powershell = [System.Management.Automation.PowerShell]::Create()
  try {
    $runspace.Open()
    $powershell.Runspace = $runspace
    [void]$powershell.AddScript($workerFunctionSource + ([string][char]13 + [char]10) + $workerSource)
    [void]$powershell.AddArgument('/isolated/project')
    [void]$powershell.AddArgument('unused-git')
    [void]$powershell.AddArgument($request)
    $output = @($powershell.Invoke())
    if ($powershell.Streams.Error.Count -gt 0) {
      throw ($powershell.Streams.Error | ForEach-Object { $_.ToString() } | Out-String)
    }
    return [pscustomobject]@{ Output = $output; Request = $request }
  } finally {
    $powershell.Dispose()
    $runspace.Dispose()
  }
}

$mockSource = @'
param(
  [string]$RemoteCommand,
  [hashtable]$Context,
  [string]$Stage,
  [int]$TimeoutMilliseconds,
  [AllowNull()][string]$StandardInputText
)
$stdout = if ($RemoteCommand -like '*find -- /home/zhe/pets-backups*') {
  ('DATABASE=psop_one' + [char]10 + 'pets_backup_20261017_123456.tar.gz')
} else {
  '[restore.sh SUCCESS] Database and 2 Contract PDF file(s) restored and verified.'
}
[pscustomobject]@{
  ExitCode = 0
  Stdout = $stdout
  Stderr = "MOCK-COMMAND:$RemoteCommand"
  TimedOut = $false
  Cancelled = $false
  CapturedCommand = $RemoteCommand
  CapturedInput = $StandardInputText
  CapturedStage = $Stage
  CapturedTimeoutMilliseconds = $TimeoutMilliseconds
}
'@

Add-TestCase 'RestoreList worker uses injected Mock and returns fixture backup list' {
  $workerResult = Invoke-IsolatedWorker -Action 'RestoreList' -MockSource $mockSource
  Assert-True ($workerResult.Output.Count -eq 1) 'Worker did not return exactly one result.'
  $result = $workerResult.Output[0]
  Assert-True ($result.DatabaseName -ceq 'psop_one') 'Mock database name was not returned.'
  Assert-True ($result.BundlePaths.Count -eq 1) 'Mock backup listing was not parsed.'
  Assert-True ($result.BundlePaths[0] -ceq '/isolated/backups/pets_backup_20261017_123456.tar.gz') 'Unexpected backup path.'
  Assert-True ($result.Stderr -like 'MOCK-COMMAND:*find -- /home/zhe/pets-backups*') 'RestoreList command did not reach Mock.'
}
Add-TestCase 'Restore worker sends expected command and exact standard input to injected Mock' {
  $workerResult = Invoke-IsolatedWorker -Action 'Restore' -MockSource $mockSource
  Assert-True ($workerResult.Output.Count -eq 1) 'Worker did not return exactly one result.'
  $result = $workerResult.Output[0]
  Assert-True ($result.CapturedCommand -ceq "cd -- '/isolated/project' && exec bash '/isolated/restore.sh' '/home/zhe/pets-backups/pets_backup_20261017_123456.tar.gz'") 'Unexpected Restore command.'
  Assert-True ($result.CapturedInput -ceq 'RESTORE') 'Mock did not receive exact RESTORE standard input.'
  Assert-True ($result.CapturedTimeoutMilliseconds -eq 3600000) 'Restore timeout was not passed to Mock.'
}
Add-TestCase 'Worker test mode without Mock fails before any Production SSH fallback' {
  $threw = $false
  try { [void](Invoke-IsolatedWorker -Action 'Restore' -MockSource '') } catch { $threw = $true }
  Assert-True $threw 'Worker accepted test mode without a Mock.'
}
Add-TestCase 'Worker test mode with malformed Mock source fails closed' {
  $threw = $false
  try { [void](Invoke-IsolatedWorker -Action 'Restore' -MockSource 'param(') } catch { $threw = $true }
  Assert-True $threw 'Worker accepted malformed Mock source.'
}

$successMarker = '[restore.sh SUCCESS] Database and 2 Contract PDF file(s) restored and verified.'
Add-TestCase 'Exit code zero and exact success marker are successful' {
  $verdict = Get-RestoreCompletionVerdict -Result ([pscustomobject]@{
    ExitCode = 0; Stdout = $successMarker; Stderr = ''; TimedOut = $false; Cancelled = $false
  })
  Assert-True ($verdict -ceq 'Success') "Expected Success, received $verdict."
}
Add-TestCase 'Non-zero exit code is never successful' {
  $verdict = Get-RestoreCompletionVerdict -Result ([pscustomobject]@{
    ExitCode = 1; Stdout = $successMarker; Stderr = ''; TimedOut = $false; Cancelled = $false
  })
  Assert-True ($verdict -cne 'Success') 'Non-zero exit code was successful.'
}
Add-TestCase 'Explicit remote failure is classified as failure' {
  $verdict = Get-RestoreCompletionVerdict -Result ([pscustomobject]@{
    ExitCode = 1; Stdout = ''; Stderr = '[restore.sh ERROR] Mock failure'; TimedOut = $false; Cancelled = $false
  })
  Assert-True ($verdict -ceq 'Failure') "Expected Failure, received $verdict."
}
Add-TestCase 'Missing success marker is not successful' {
  $verdict = Get-RestoreCompletionVerdict -Result ([pscustomobject]@{
    ExitCode = 0; Stdout = 'done'; Stderr = ''; TimedOut = $false; Cancelled = $false
  })
  Assert-True ($verdict -cne 'Success') 'Missing success marker was successful.'
}
Add-TestCase 'Timeout remains unconfirmed and not successful' {
  $verdict = Get-RestoreCompletionVerdict -Result ([pscustomobject]@{
    ExitCode = 0; Stdout = $successMarker; Stderr = ''; TimedOut = $true; Cancelled = $false
  })
  Assert-True ($verdict -ceq 'Unconfirmed') "Timeout verdict was $verdict."
}
Add-TestCase 'Cancellation remains unconfirmed and not successful' {
  $verdict = Get-RestoreCompletionVerdict -Result ([pscustomobject]@{
    ExitCode = 1; Stdout = ''; Stderr = ''; TimedOut = $false; Cancelled = $true
  })
  Assert-True ($verdict -ceq 'Unconfirmed') "Cancellation verdict was $verdict."
}
Add-TestCase 'Null and incomplete result are not successful' {
  $nullVerdict = Get-RestoreCompletionVerdict -Result $null
  $incompleteVerdict = Get-RestoreCompletionVerdict -Result ([pscustomobject]@{ Stdout = $successMarker })
  Assert-True ($nullVerdict -cne 'Success') 'Null result was successful.'
  Assert-True ($incompleteVerdict -cne 'Success') 'Incomplete result was successful.'
}

ConvertTo-Json -InputObject @($cases.ToArray()) -Compress -Depth 8
`;

let testResults;
beforeAll(() => {
  const result = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-Command', '-'], {
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

describe('Operations Center Restore isolated behavior', () => {
  test.each([
    'Warning cancellation blocks scheduling',
    'Service-stop confirmation rejection blocks scheduling',
    "Confirmation '' blocks scheduling",
    "Confirmation 'RESTORE-now' blocks scheduling",
    "Confirmation 'restore' blocks scheduling",
    'All confirmations schedule exactly once',
    'Test mode rejects missing Mock without calling Production SSH',
    'Test mode rejects empty Mock without calling Production SSH',
    'Malformed Mock ScriptBlock source is rejected before remote execution',
    'RestoreList worker uses injected Mock and returns fixture backup list',
    'Restore worker sends expected command and exact standard input to injected Mock',
    'Worker test mode without Mock fails before any Production SSH fallback',
    'Worker test mode with malformed Mock source fails closed',
    'Exit code zero and exact success marker are successful',
    'Non-zero exit code is never successful',
    'Explicit remote failure is classified as failure',
    'Missing success marker is not successful',
    'Timeout remains unconfirmed and not successful',
    'Cancellation remains unconfirmed and not successful',
    'Null and incomplete result are not successful',
  ])('%s', (name) => {
    const result = testResults.find((item) => item.Name === name);
    expect(result).toBeDefined();
    expect(result).toMatchObject({ Passed: true, Error: null });
  });

  test('Mock source has no network, external-process, or Production-host references', () => {
    expect(mockExecutorSource).not.toMatch(/\b(?:ssh|curl|Start-Process|Invoke-WebRequest|Invoke-RestMethod|ProcessStartInfo)\b/i);
    expect(mockExecutorSource).not.toMatch(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    expect(mockExecutorSource).not.toMatch(/175\.183\.34\.91|ProductionSshHost|SshTarget/i);
  });
});
