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
  'ConvertTo-PosixShellSingleQuotedString',
  'Test-BackupArtifactFileName',
  'New-BackupArtifactCheckCommand',
  'Get-BackupArtifactCheckOutcome',
  'Get-BackupAutoVerificationOutcome',
  'Reset-BackupArtifactStateForBackup',
  'Start-BackgroundOperation'
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

$completionAssignment = $sourceAst.Find({
  param($node)
  $node -is [System.Management.Automation.Language.AssignmentStatementAst] -and
    $node.Left.Extent.Text -eq '$completionHandler'
}, $true)
if (-not $completionAssignment) {
  throw 'Completion handler assignment not found.'
}
$completionScriptBlock = $completionAssignment.Right.Find({
  param($node)
  $node -is [System.Management.Automation.Language.ScriptBlockExpressionAst]
}, $true)
if (-not $completionScriptBlock) {
  throw 'Completion handler script block not found.'
}
$backupCompletionCase = $null
foreach ($switch in $completionScriptBlock.FindAll({
  param($node)
  $node -is [System.Management.Automation.Language.SwitchStatementAst] -and
    $node.Condition.Extent.Text -eq '$completedRequest.Action'
}, $true)) {
  foreach ($clause in $switch.Clauses) {
    if ($clause.Item1.Extent.Text -ceq "'Backup'" -and
        $clause.Item2.Extent.Text.Contains('Get-BackupAutoVerificationOutcome')) {
      $backupCompletionCaseText = @(
        $clause.Item2.Statements | ForEach-Object { $_.Extent.Text }
      ) -join [string][char]10
      $backupCompletionCase = [scriptblock]::Create($backupCompletionCaseText)
      break
    }
  }
  if ($backupCompletionCase) { break }
}
if (-not $backupCompletionCase) {
  throw 'Backup completion callback case not found.'
}

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

function Invoke-BackupCompletionCallback {
  param(
    [Parameter(Mandatory = $true)][string]$Stdout,
    [AllowNull()][object]$ExitCode = 0,
    [string]$InitialBackupState = 'previous verified backup',
    [string]$InitialArtifactState = 'PASS: previous backup'
  )
  $script:backupCompletionLogs = New-Object System.Collections.Generic.List[object]
  $completedUi = [pscustomobject]@{
    ActivityLabel = [pscustomobject]@{ Text = '' }
    SshAuthenticationValue = [pscustomobject]@{ Text = '' }
    BackupStateValue = [pscustomobject]@{ Text = $InitialBackupState }
    BackupArtifactStateValue = [pscustomobject]@{ Text = $InitialArtifactState }
  }
  $workContext = @{
    CancelRequested = $false
    BackupCommandAttempted = $true
    HostKeyVerified = $true
    SshAuthenticationSucceeded = $true
    SshCleanupFailed = $false
    SshDisconnectFailed = $false
  }
  $completedRequest = [pscustomobject]@{
    Context = $workContext
    Operation = 'Backup'
    BackupDestination = '/home/zhe/pets-backups'
  }
  $completionPayload = [pscustomobject]@{
    Result = [pscustomobject]@{
      ExitCode = $ExitCode
      Stdout = $Stdout
      Stderr = ''
      TimedOut = $false
      Cancelled = $false
    }
  }
  $completionAddOperationLog = {
    param([string]$Operation, [string]$Status, [string[]]$Output)
    [void]$script:backupCompletionLogs.Add([pscustomobject]@{
      Operation = $Operation
      Status = $Status
      Output = $Output
    })
  }
  . $backupCompletionCase
  return [pscustomobject]@{
    Ui = $completedUi
    Logs = @($script:backupCompletionLogs.ToArray())
    BackupFile = $autoVerification.BackupCompletion.BackupFile
    ArtifactOutcome = $autoVerification.ArtifactOutcome
  }
}

$successMarker = 'BACKUP_FILE=/home/zhe/pets-backups/pets_backup_20261017_123456.tar.gz'
$validVerifierLines = @(
  'ARTIFACT_STATE=OK',
  'ARTIFACT_SIZE=12345',
  'ARTIFACT_SHA256=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  'CHECKSUM_STATE=OK',
  'CHECKSUM_FORMAT=VALID',
  'CHECKSUM_ENTRY=FOUND',
  'CHECKSUM_VERIFY=PASS'
)
$validAutomaticOutput = (@($successMarker, 'BACKUP_AUTO_VERIFY_BEGIN') +
  $validVerifierLines + @('BACKUP_AUTO_VERIFY_END')) -join [string][char]10
$expectedVerifiedBackupState = -join ([int[]]@(
  0x5099, 0x4efd, 0x53ca, 0x672c, 0x6b21, 0x7522, 0x7269, 0x9a57, 0x8b49, 0x6210, 0x529f
) | ForEach-Object { [char]$_ })
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
Add-TestCase 'Successful backup automatically verifies the reported BACKUP_FILE' {
  $verificationLines = @(
    'ARTIFACT_STATE=OK',
    'ARTIFACT_SIZE=12345',
    'ARTIFACT_SHA256=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    'CHECKSUM_STATE=OK',
    'CHECKSUM_FORMAT=VALID',
    'CHECKSUM_ENTRY=FOUND',
    'CHECKSUM_VERIFY=PASS'
  )
  $stdoutLines = @($successMarker, 'BACKUP_AUTO_VERIFY_BEGIN') + $verificationLines + @('BACKUP_AUTO_VERIFY_END')
  $stdout = $stdoutLines -join [string][char]10
  $result = New-CommandResult -Stdout $stdout
  $context = @{
    HostKeyVerified = $true
    SshAuthenticationSucceeded = $true
    BackupCommandAttempted = $true
    SshCleanupFailed = $false
    SshDisconnectFailed = $false
  }
  $automatic = Get-BackupAutoVerificationOutcome -Result $result -ExpectedDirectory '/home/zhe/pets-backups' -Context $context
  Assert-True $automatic.BackupCompletion.Success 'Backup command result was not accepted.'
  Assert-True ($automatic.BackupCompletion.BackupFile -ceq '/home/zhe/pets-backups/pets_backup_20261017_123456.tar.gz') 'Automatic verification did not retain the exact reported path.'
  Assert-True ($automatic.ArtifactOutcome.Verdict -ceq 'PASS') "Successful backup did not pass artifact verification: $($automatic.ArtifactOutcome.Verdict) $($automatic.ArtifactOutcome.Detail)"
}
Add-TestCase 'Automatic verification failure is not reported as verification success' {
  $verificationLines = @(
    'ARTIFACT_STATE=OK',
    'ARTIFACT_SIZE=12345',
    'ARTIFACT_SHA256=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    'CHECKSUM_STATE=OK',
    'CHECKSUM_FORMAT=VALID',
    'CHECKSUM_ENTRY=FOUND',
    'CHECKSUM_VERIFY=FAIL'
  )
  $stdoutLines = @($successMarker, 'BACKUP_AUTO_VERIFY_BEGIN') + $verificationLines + @('BACKUP_AUTO_VERIFY_END')
  $result = New-CommandResult -Stdout ($stdoutLines -join [string][char]10)
  $context = @{
    HostKeyVerified = $true
    SshAuthenticationSucceeded = $true
    BackupCommandAttempted = $true
    SshCleanupFailed = $false
    SshDisconnectFailed = $false
  }
  $automatic = Get-BackupAutoVerificationOutcome -Result $result -ExpectedDirectory '/home/zhe/pets-backups' -Context $context
  Assert-True ($automatic.BackupCompletion.Success) 'Backup command should remain distinguished from verification.'
  Assert-True ($automatic.ArtifactOutcome.Verdict -ceq 'FAIL') "Checksum mismatch was not reported as verification failure: $($automatic.ArtifactOutcome.Verdict) $($automatic.ArtifactOutcome.Detail)"
  Assert-True ($automatic.ArtifactOutcome.Verdict -cne 'PASS') 'Failed artifact verification was reported as PASS.'
}
Add-TestCase 'Failed backup or invalid BACKUP_FILE never verifies a prior artifact' {
  $verificationBlock = @(
    'BACKUP_AUTO_VERIFY_BEGIN',
    'ARTIFACT_STATE=OK',
    'ARTIFACT_SIZE=12345',
    'ARTIFACT_SHA256=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    'CHECKSUM_STATE=OK',
    'CHECKSUM_FORMAT=VALID',
    'CHECKSUM_ENTRY=FOUND',
    'CHECKSUM_VERIFY=PASS',
    'BACKUP_AUTO_VERIFY_END'
  )
  $context = @{
    HostKeyVerified = $true
    SshAuthenticationSucceeded = $true
    BackupCommandAttempted = $true
    SshCleanupFailed = $false
    SshDisconnectFailed = $false
  }
  $failedOutputLines = @($successMarker) + $verificationBlock
  $failedBackup = New-CommandResult -ExitCode 7 -Stdout ($failedOutputLines -join [string][char]10)
  $failedOutcome = Get-BackupAutoVerificationOutcome -Result $failedBackup -ExpectedDirectory '/home/zhe/pets-backups' -Context $context
  Assert-True (-not $failedOutcome.BackupCompletion.Success) 'Failed backup was reported as successful.'
  Assert-True ($null -eq $failedOutcome.ArtifactOutcome) 'Failed backup reused old-path verification output.'

  $invalidPath = 'BACKUP_FILE=/home/zhe/pets-backups/previous_backup.tar.gz'
  $invalidOutputLines = @($invalidPath) + $verificationBlock
  $invalidBackup = New-CommandResult -Stdout ($invalidOutputLines -join [string][char]10)
  $invalidOutcome = Get-BackupAutoVerificationOutcome -Result $invalidBackup -ExpectedDirectory '/home/zhe/pets-backups' -Context $context
  Assert-True (-not $invalidOutcome.BackupCompletion.Success) 'Invalid BACKUP_FILE path was accepted.'
  Assert-True ($null -eq $invalidOutcome.ArtifactOutcome) 'Invalid BACKUP_FILE triggered artifact verification.'
}
Add-TestCase 'Starting a backup resets the previous artifact result' {
  $script:Controls = @{
    BackupArtifactStateValue = [pscustomobject]@{ Text = 'PASS: previous backup' }
    BackupStateValue = [pscustomobject]@{ Text = 'Previous backup verified' }
  }
  Reset-BackupArtifactStateForBackup
  Assert-True ($script:Controls.BackupArtifactStateValue.Text -notmatch 'PASS|previous') 'Previous artifact PASS remained visible when a backup started.'
  Assert-True ($script:Controls.BackupStateValue.Text -notmatch 'Previous backup verified') 'Previous backup success remained visible when a backup started.'
  Assert-True ($functionDefinitions['Start-BackgroundOperation'] -match 'Reset-BackupArtifactStateForBackup') 'Backup startup does not invoke the artifact-state reset.'
}
Add-TestCase 'Backup completion callback reports success only after verifier PASS' {
  $callback = Invoke-BackupCompletionCallback -Stdout $validAutomaticOutput
  Assert-True ($callback.ArtifactOutcome.Verdict -ceq 'PASS') "Artifact verifier did not report PASS: $($callback.ArtifactOutcome.Verdict) $($callback.Ui.BackupStateValue.Text) $($callback.Ui.BackupArtifactStateValue.Text)"
  Assert-True ($callback.Ui.BackupStateValue.Text -ceq $expectedVerifiedBackupState) 'Callback did not report combined success for PASS.'
  Assert-True (-not [string]::IsNullOrWhiteSpace($callback.Ui.ActivityLabel.Text)) 'Activity label was not updated.'
  Assert-True ($callback.Ui.BackupArtifactStateValue.Text -match 'PASS') 'Artifact UI did not identify this run as PASS.'
  Assert-True ($callback.Logs.Count -eq 1) 'Callback did not emit exactly one completion log for PASS.'
}
Add-TestCase 'Backup completion callback reports checksum failure and reason without overall success' {
  $failedVerifierLines = $validVerifierLines -replace '^CHECKSUM_VERIFY=PASS$', 'CHECKSUM_VERIFY=FAIL'
  $failedOutput = (@($successMarker, 'BACKUP_AUTO_VERIFY_BEGIN') +
    $failedVerifierLines + @('BACKUP_AUTO_VERIFY_END')) -join [string][char]10
  $callback = Invoke-BackupCompletionCallback -Stdout $failedOutput
  Assert-True ($callback.ArtifactOutcome.Verdict -ceq 'FAIL') "Checksum mismatch was not classified as FAIL: $($callback.ArtifactOutcome.Verdict) $($callback.Ui.BackupStateValue.Text) $($callback.Ui.BackupArtifactStateValue.Text)"
  Assert-True ($callback.Ui.BackupStateValue.Text -cne 'previous verified backup') 'Backup state retained the previous result.'
  Assert-True ($callback.Ui.BackupStateValue.Text -cne $expectedVerifiedBackupState) 'Failed checksum was displayed as overall success.'
  Assert-True ($callback.Ui.BackupArtifactStateValue.Text -match [regex]::Escape($callback.ArtifactOutcome.Detail)) 'Artifact UI omitted the checksum failure reason.'
  Assert-True ($callback.Logs.Count -eq 1) 'Failure status was not logged.'
  Assert-True (@($callback.Logs | Where-Object { $_.Output -match [regex]::Escape($callback.ArtifactOutcome.Detail) }).Count -eq 1) 'Failure reason was not logged.'
}
Add-TestCase 'Backup completion callback clears old PASS for missing or invalid verifier output' {
  $invalidVerifierOutputs = @(
    $successMarker,
    (($successMarker + [string][char]10 + 'BACKUP_AUTO_VERIFY_BEGIN' +
      [string][char]10 + 'ARTIFACT_STATE=OK' + [string][char]10 +
      'not-a-verifier-field' + [string][char]10 + 'BACKUP_AUTO_VERIFY_END')),
    (($successMarker + [string][char]10 + 'BACKUP_AUTO_VERIFY_BEGIN' +
      [string][char]10 + 'ARTIFACT_STATE=OK' + [string][char]10 +
      'ARTIFACT_SIZE=12345' + [string][char]10 + 'BACKUP_AUTO_VERIFY_END'))
  )
  foreach ($invalidOutput in $invalidVerifierOutputs) {
    $callback = Invoke-BackupCompletionCallback -Stdout $invalidOutput
    Assert-True ($callback.ArtifactOutcome.Verdict -ceq 'UNCONFIRMED') "Incomplete verifier output was not marked unconfirmed: $($callback.ArtifactOutcome.Verdict) $($callback.Ui.BackupStateValue.Text) $($callback.Ui.BackupArtifactStateValue.Text)"
    Assert-True ($callback.Ui.BackupStateValue.Text -cne 'previous verified backup') 'Callback retained the previous backup state.'
    Assert-True ($callback.Ui.BackupStateValue.Text -cne $expectedVerifiedBackupState) 'Incomplete verifier output was displayed as success.'
    Assert-True ($callback.Ui.BackupArtifactStateValue.Text -notmatch 'PASS') 'Previous or false PASS remained visible for incomplete verifier output.'
    Assert-True ($callback.Logs.Count -eq 1) 'Unconfirmed verification status was not logged.'
  }
}
Add-TestCase 'Backup completion callback does not retain old PASS after backup failure or invalid path' {
  $failedCallback = Invoke-BackupCompletionCallback -Stdout $validAutomaticOutput -ExitCode 7
  Assert-True ($null -eq $failedCallback.ArtifactOutcome) 'Failed backup ran artifact verification.'
  Assert-True ($failedCallback.Ui.BackupArtifactStateValue.Text -notmatch 'PASS') 'Old PASS remained visible after backup failure.'
  Assert-True ($failedCallback.Ui.BackupStateValue.Text -cne 'previous verified backup') 'Old backup state remained visible after failure.'

  $invalidPathOutput = @(
    'BACKUP_FILE=/home/zhe/pets-backups/previous_backup.tar.gz',
    'BACKUP_AUTO_VERIFY_FAILURE=BACKUP_FILE_OUTPUT'
  ) -join [string][char]10
  $invalidPathCallback = Invoke-BackupCompletionCallback -Stdout $invalidPathOutput -ExitCode 93
  Assert-True ($null -eq $invalidPathCallback.ArtifactOutcome) 'Invalid BACKUP_FILE triggered artifact verification.'
  Assert-True ($invalidPathCallback.BackupFile -eq $null) 'Invalid BACKUP_FILE was retained for verification.'
  Assert-True ($invalidPathCallback.Ui.BackupArtifactStateValue.Text -notmatch 'PASS') 'Old PASS remained visible after invalid BACKUP_FILE.'
  Assert-True ($invalidPathCallback.Ui.BackupStateValue.Text -cne 'previous verified backup') 'Old backup state remained visible after invalid BACKUP_FILE.'
}
Add-TestCase 'Automatic verifier command binds this BACKUP_FILE directory and name' {
  $reportedFile = '/isolated/backups/run-42/pets_backup_20261018_184500.tar.gz'
  $reportedDirectory = $reportedFile.Substring(0, $reportedFile.LastIndexOf('/'))
  $reportedName = $reportedFile.Substring($reportedFile.LastIndexOf('/') + 1)
  $verifierCommand = New-BackupArtifactCheckCommand -BackupDirectory $reportedDirectory -DynamicFileName
  Assert-True ($verifierCommand.StartsWith("backup_dir='$reportedDirectory'")) 'Verifier command did not use the reported archive directory.'
  Assert-True ($verifierCommand.Contains('file_name="$backup_file_name"')) 'Verifier command did not consume the current archive basename.'
  Assert-True ($verifierCommand.Contains('backup_file="$backup_dir/$file_name"')) 'Verifier archive path was not composed from the current directory and filename.'
  Assert-True ($workerSource.Contains(('backup_file_name="' + '$' + '{backup_file##*/}"'))) 'Worker does not derive the verifier filename from the reported BACKUP_FILE.'
  Assert-True ($workerSource.Contains(('backup_file_directory="' + '$' + '{backup_file%/*}"'))) 'Worker does not validate the reported BACKUP_FILE directory.'
  Assert-True ($workerSource.Contains('New-BackupArtifactCheckCommand -BackupDirectory $destination -DynamicFileName')) 'Worker is not using this operation destination for verification.'
  Assert-True ($reportedName -cmatch '^pets_backup_[0-9]{8}_[0-9]{6}\.tar\.gz$') 'Test BACKUP_FILE name is not valid.'
  Assert-True ($verifierCommand -notmatch 'find\s+.*-name|ls\s+-t|latest') 'Verifier command searches for a latest archive instead of using an explicit path.'
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
  Assert-True ($workerSource.Contains('New-BackupArtifactCheckCommand -BackupDirectory $destination -DynamicFileName')) 'Backup does not reuse the existing artifact checksum verifier.'
  Assert-True ($workerSource -match 'BACKUP_AUTO_VERIFY_BEGIN') 'Backup worker does not delimit automatic verification output.'
  Assert-True ($functionDefinitions['Start-BackgroundOperation'] -match 'Get-BackupAutoVerificationOutcome') 'Backup completion does not evaluate automatic artifact verification.'
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
    'Successful backup automatically verifies the reported BACKUP_FILE',
    'Automatic verification failure is not reported as verification success',
    'Failed backup or invalid BACKUP_FILE never verifies a prior artifact',
    'Starting a backup resets the previous artifact result',
    'Backup completion callback reports success only after verifier PASS',
    'Backup completion callback reports checksum failure and reason without overall success',
    'Backup completion callback clears old PASS for missing or invalid verifier output',
    'Backup completion callback does not retain old PASS after backup failure or invalid path',
    'Automatic verifier command binds this BACKUP_FILE directory and name',
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
