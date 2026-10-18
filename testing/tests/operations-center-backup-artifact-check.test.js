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
  'ConvertTo-PosixShellSingleQuotedString',
  'Test-BackupArtifactFileName',
  'Get-BackupArtifactErrorDiagnostic',
  'New-BackupArtifactCheckCommand',
  'Get-BackupArtifactCheckOutcome',
  'Clear-SshCredential',
  'Show-BackupArtifactSelectionDialog',
  'Start-BackgroundOperation',
  'Start-SshUiOperation',
  'Request-BackupArtifactCheckOperation',
  'Invoke-BackupSshOperation',
  'Clear-BackupSshResources'
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

$backupArtifactClickHandlers = @($sourceAst.FindAll({
  param($node)
  $node -is [System.Management.Automation.Language.ScriptBlockExpressionAst] -and
    $node.Extent.Text -match '(?s)^\{\s*Request-BackupArtifactCheckOperation\s*\}$'
}, $true))
if ($backupArtifactClickHandlers.Count -ne 1) {
  throw 'Backup artifact button click handler not found uniquely.'
}
$script:backupArtifactButtonClickHandlerText = $backupArtifactClickHandlers[0].Extent.Text

$workerAssignment = $sourceAst.Find({
  param($node)
  $node -is [System.Management.Automation.Language.AssignmentStatementAst] -and
    $node.Left.Extent.Text -eq '$workerScript' -and
    $node.Right -is [System.Management.Automation.Language.CommandExpressionAst]
}, $true)
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
function Invoke-ControlledStringBinding {
  param([string]$Value)
  return $Value
}

$validName = 'pets_backup_20261017_095021.tar.gz'
$validHash = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
$validOutput = @(
  'ARTIFACT_STATE=OK',
  'ARTIFACT_SIZE=12345',
  "ARTIFACT_SHA256=$validHash",
  'CHECKSUM_STATE=OK',
  'CHECKSUM_FORMAT=VALID',
  'CHECKSUM_ENTRY=FOUND',
  'CHECKSUM_VERIFY=PASS'
) -join [string][char]10
function Get-TestOutcome {
  param(
    [AllowNull()][object]$Result,
    [hashtable]$Context = @{
      HostKeyVerified = $true
      SshAuthenticationSucceeded = $true
      BackupCommandAttempted = $true
      SshCleanupFailed = $false
      SshDisconnectFailed = $false
    },
    [string]$FileName = $validName
  )
  return Get-BackupArtifactCheckOutcome -Result $Result -FileName $FileName -Context $Context
}
function New-CheckResult {
  param(
    [string]$Stdout,
    [AllowNull()][object]$ExitCode = 0,
    [bool]$TimedOut = $false,
    [bool]$Cancelled = $false,
    [bool]$ExecutionUnconfirmed = $false
  )
  return [pscustomobject]@{
    ExitCode = $ExitCode
    Stdout = $Stdout
    Stderr = ''
    TimedOut = $TimedOut
    Cancelled = $Cancelled
    ExecutionUnconfirmed = $ExecutionUnconfirmed
  }
}

function Add-OperationLog {
  param([string]$Operation, [string]$Status, [string[]]$Output = @())
  [void]$script:testLogs.Add(($Output -join ([string][char]10)))
}
function Reset-TestControls {
  $passwordInput = [pscustomobject]@{ Text = 'isolated-test-only' }
  $passwordInput | Add-Member -MemberType ScriptMethod -Name Clear -Value { $this.Text = '' }
  $script:Controls = @{
    BackupArtifactStateValue = [pscustomobject]@{ Text = '' }
    ActivityLabel = [pscustomobject]@{ Text = '' }
    SshHostInput = [pscustomobject]@{ Text = 'mock.invalid' }
    SshUsernameInput = [pscustomobject]@{ Text = 'isolated-user' }
    SshPasswordInput = $passwordInput
    SshAuthenticationValue = [pscustomobject]@{ Text = '' }
  }
  $script:OperationState = @{ IsBusy = $false; ActiveOperation = $null }
  $script:testLogs = New-Object System.Collections.Generic.List[string]
  $script:backgroundCalls = 0
  $script:unexpectedBackgroundProgress = 0
}
function Get-TestLogText {
  return $script:testLogs -join ([string][char]10)
}
Reset-TestControls
$script:ProductionSshHost = 'mock.invalid'
$script:ProductionSshUser = 'isolated-user'
$script:actualStartBackgroundDefinition = $functionDefinitions['Start-BackgroundOperation']

Add-TestCase 'Selection dialog suppresses layout indices from its function output' {
  $dialogDefinition = $functionDefinitions['Show-BackupArtifactSelectionDialog']
  $suppressedAdds = [regex]::Matches(
    $dialogDefinition,
    '(?m)^\s*\[void\]\$layout\.RowStyles\.Add\('
  ).Count
  $unsuppressedAdds = [regex]::Matches(
    $dialogDefinition,
    '(?m)^\s*\$layout\.RowStyles\.Add\('
  ).Count
  Assert-True ($suppressedAdds -eq 3) 'Selection dialog does not suppress all three RowStyles.Add() return values.'
  Assert-True ($unsuppressedAdds -eq 0) 'Selection dialog can emit a RowStyles.Add() return value.'
}
Add-TestCase 'Backup artifact button passes the selected filename through production request and UI functions' {
  Reset-TestControls
  $buttonHandlerBody = $script:backupArtifactButtonClickHandlerText -replace '^\{\s*|\s*\}$', ''
  Assert-True ($buttonHandlerBody.Trim() -ceq 'Request-BackupArtifactCheckOperation') 'Backup artifact button does not invoke the production request function directly.'
  Set-Item Function:\Show-BackupArtifactSelectionDialog -Value {
    return $validName
  }
  Set-Item Function:\Start-BackgroundOperation -Value {
    param(
      $Operation,
      $Action,
      [object]$BackupArtifactName,
      $SshHost,
      $SshUsername,
      [System.Security.SecureString]$SshPassword
    )
    $script:backgroundCalls++
    $script:capturedArtifactName = $BackupArtifactName
    Clear-SshCredential -SecurePassword $SshPassword
  }

  Request-BackupArtifactCheckOperation

  Assert-True ($script:backgroundCalls -eq 1) 'Button click did not reach the isolated background-operation boundary exactly once.'
  Assert-True ($script:capturedArtifactName -is [string]) 'Selected filename did not remain a scalar string through the button call chain.'
  Assert-True ($script:capturedArtifactName -ceq $validName) 'Selected filename was not passed through unchanged.'
  Assert-True (-not $script:testLogs.Count) 'Successful isolated button call unexpectedly logged an error.'
}

Add-TestCase 'UI validates a filename as a string and passes it unchanged without SSH' {
  Reset-TestControls
  Set-Item Function:\Start-BackgroundOperation -Value {
    param($Operation, $Action, [object]$BackupArtifactName, $SshPassword)
    $script:backgroundCalls++
    $script:capturedArtifactName = $BackupArtifactName
    Clear-SshCredential -SecurePassword $SshPassword
  }
  Start-SshUiOperation -Action 'BackupArtifactCheck' -BackupArtifactName $validName
  Assert-True ($script:backgroundCalls -eq 1) 'Valid filename did not reach the background-operation boundary.'
  Assert-True ($script:capturedArtifactName -ceq $validName) 'Valid filename was not passed through unchanged.'
  Assert-True (-not $script:testLogs.Count) 'Successful isolated validation unexpectedly logged an error.'
}
Add-TestCase 'UI rejects empty, malformed, object, and array values before background work' {
  Reset-TestControls
  Set-Item Function:\Start-BackgroundOperation -Value {
    param($Operation, $Action, [object]$BackupArtifactName, $SshPassword)
    $script:backgroundCalls++
    if ($SshPassword) { Clear-SshCredential -SecurePassword $SshPassword }
  }
  $invalidInputs = @(
    '',
    'not-a-backup-name',
    [pscustomobject]@{ Name = $validName },
    [string[]]@($validName, 'second'),
    [object[]]@([pscustomobject]@{ Name = 'first' }, [pscustomobject]@{ Name = 'second' })
  )
  foreach ($invalidInput in $invalidInputs) {
    Start-SshUiOperation -Action 'BackupArtifactCheck' -BackupArtifactName $invalidInput
  }
  Assert-True ($script:backgroundCalls -eq 0) 'An invalid filename reached background work.'
  Assert-True ($script:Controls.BackupArtifactStateValue.Text.Length -gt 0) 'Invalid input was not visibly rejected.'
}
Add-TestCase 'Request returns on user cancellation without starting an operation' {
  Reset-TestControls
  Set-Item Function:\Show-BackupArtifactSelectionDialog -Value { return $null }
  Set-Item Function:\Start-SshUiOperation -Value {
    param($Action, [object]$BackupArtifactName)
    $script:backgroundCalls++
  }
  Request-BackupArtifactCheckOperation
  Assert-True ($script:backgroundCalls -eq 0) 'User cancellation started an operation.'
}
Add-TestCase 'Background operation rejects invalid values before worker setup' {
  Reset-TestControls
  Invoke-Expression $script:actualStartBackgroundDefinition
  Set-Item Function:\Set-OperationButtonsEnabled -Value {
    $script:unexpectedBackgroundProgress++
    throw 'Background setup must not be reached for invalid filenames.'
  }
  $invalidInputs = @(
    $null,
    '',
    'not-a-backup-name',
    [pscustomobject]@{ Name = $validName },
    [string[]]@($validName, 'second'),
    [object[]]@([pscustomobject]@{ Name = 'first' }, [pscustomobject]@{ Name = 'second' })
  )
  foreach ($invalidInput in $invalidInputs) {
    Start-BackgroundOperation -Operation 'isolated check' -Action 'BackupArtifactCheck' -BackupArtifactName $invalidInput
  }
  Assert-True ($script:unexpectedBackgroundProgress -eq 0) 'Invalid input reached worker setup.'
  Assert-True (-not $script:OperationState.IsBusy) 'Invalid input marked the operation busy.'
  Assert-True ($script:Controls.BackupArtifactStateValue.Text.Length -gt 0) 'Background operation did not reject invalid input.'
}
Add-TestCase 'Start-SshUiOperation catch records safe diagnostics only' {
  Reset-TestControls
  Invoke-Expression $functionDefinitions['Start-SshUiOperation']
  Set-Item Function:\Start-BackgroundOperation -Value {
    param($Operation, $Action, [object]$BackupArtifactName, $SshPassword)
    throw 'CONTROLLED_START_BACKGROUND_SECRET'
  }
  Start-SshUiOperation -Action 'BackupArtifactCheck' -BackupArtifactName $validName
  $logText = Get-TestLogText
  Assert-True ($logText -match 'Boundary=Start-SshUiOperation') 'Start-SshUiOperation boundary was not recorded.'
  Assert-True ($logText -match 'ErrorId=Unknown') 'Untrusted error identifier was not suppressed.'
  Assert-True ($logText -match 'ErrorType=System\.Management\.Automation\.RuntimeException') 'Filtered error type was not recorded.'
  Assert-True ($logText -match 'Location=[A-Za-z0-9_.-]+:[0-9]+:[0-9]+') 'Safe source location was not recorded.'
  Assert-True ($logText -notmatch 'CONTROLLED_START_BACKGROUND_SECRET') 'Raw exception message leaked into diagnostics.'
  Assert-True ($logText -notmatch [regex]::Escape($validName)) 'Filename argument leaked into diagnostics.'
}
Add-TestCase 'Request catch records safe diagnostics without reproducing the reported incident' {
  Reset-TestControls
  Set-Item Function:\Show-BackupArtifactSelectionDialog -Value { return $validName }
  Set-Item Function:\Start-SshUiOperation -Value {
    param($Action, [object]$BackupArtifactName)
    throw 'CONTROLLED_REQUEST_BOUNDARY_SECRET'
  }
  Request-BackupArtifactCheckOperation
  $logText = Get-TestLogText
  Assert-True ($logText -match 'Boundary=Request-BackupArtifactCheckOperation') 'Request boundary was not recorded.'
  Assert-True ($logText -match 'ErrorId=Unknown') 'Untrusted error identifier was not suppressed.'
  Assert-True ($logText -match 'ErrorType=System\.Management\.Automation\.RuntimeException') 'Filtered error type was not recorded.'
  Assert-True ($logText -match 'Location=[A-Za-z0-9_.-]+:[0-9]+:[0-9]+') 'Safe source location was not recorded.'
  Assert-True ($logText -notmatch 'CONTROLLED_REQUEST_BOUNDARY_SECRET') 'Raw exception message leaked into diagnostics.'
  Assert-True ($logText -notmatch [regex]::Escape($validName)) 'Filename argument leaked into diagnostics.'
}
Add-TestCase 'Controlled conversion error keeps only a whitelisted PowerShell error identifier' {
  $inputObject = [pscustomobject]@{}
  $inputObject | Add-Member -MemberType ScriptMethod -Name ToString -Value {
    throw 'CONTROLLED_TRANSFORMATION_SECRET'
  } -Force
  try {
    Invoke-ControlledStringBinding -Value $inputObject
    throw 'Controlled conversion did not fail.'
  } catch {
    $diagnostic = Get-BackupArtifactErrorDiagnostic -ErrorRecord $_ -Boundary 'Start-SshUiOperation'
  }
  $diagnosticText = $diagnostic -join ([string][char]10)
  Assert-True ($diagnosticText -match 'ErrorId=ParameterArgumentTransformationError') 'Safe PowerShell transformation identifier was not retained.'
  Assert-True ($diagnosticText -match 'ErrorType=System\.Management\.Automation\.ParameterBindingArgumentTransformationException') 'PowerShell transformation error type was not recorded.'
  Assert-True ($diagnosticText -notmatch 'CONTROLLED_TRANSFORMATION_SECRET') 'Controlled raw exception message leaked into diagnostics.'
}

Add-TestCase 'Only the prescribed filename is accepted' {
  Assert-True (Test-BackupArtifactFileName -FileName $validName) 'Valid backup filename was rejected.'
  foreach ($invalidName in @(
    '/home/zhe/pets-backups/' + $validName,
    '../' + $validName,
    'pets_backup_20261017_095021.tar.gz;touch',
    'pets_backup_20261017_09502.tar.gz',
    'other_20261017_095021.tar.gz'
  )) {
    Assert-True (-not (Test-BackupArtifactFileName -FileName $invalidName)) "Unsafe filename accepted: $invalidName"
  }
}
Add-TestCase 'Remote command is read-only and confined to the fixed backup directory' {
  $command = New-BackupArtifactCheckCommand -FileName $validName
  Assert-True ($command -like "*backup_dir='/home/zhe/pets-backups'*") 'Fixed backup directory is missing.'
  Assert-True ($command.Contains('checksum_file="$backup_file.sha256"')) 'Backup checksum sidecar path is missing.'
  Assert-True ($command -match 'checksum_lines" -ne 1') 'Command does not enforce the generated single-entry sidecar format.'
  Assert-True ($command -match 'sha256sum -- "\$backup_file"') 'Target SHA-256 is not calculated.'
  Assert-True ($command -notmatch '(?im)^\s*(?:mkdir|chmod|chown|rm|mv|cp|tar|curl|wget|scp|rsync)(?:\s|$)') 'Command includes a mutating, transfer, or restore operation.'
  Assert-True ($command -notmatch '(?im)^\s*(?:ssh|sudo|bash -c)(?:\s|$)') 'Command provides a nested or arbitrary remote-command path.'
  $threw = $false
  try { [void](New-BackupArtifactCheckCommand -FileName '../' + $validName) } catch { $threw = $true }
  Assert-True $threw 'Command builder accepted a path rather than a filename.'
}
Add-TestCase 'Missing archive is FAIL' {
  $output = $validOutput.Replace('ARTIFACT_STATE=OK', 'ARTIFACT_STATE=MISSING')
  $output = $output.Replace('ARTIFACT_SIZE=12345', 'ARTIFACT_SIZE=UNKNOWN')
  $output = $output.Replace("ARTIFACT_SHA256=$validHash", 'ARTIFACT_SHA256=UNKNOWN')
  $outcome = Get-TestOutcome -Result (New-CheckResult -Stdout $output)
  Assert-True ($outcome.Verdict -ceq 'FAIL') "Expected FAIL, got $($outcome.Verdict)."
}
Add-TestCase 'Empty archive is FAIL and reports zero size' {
  $output = $validOutput.Replace('ARTIFACT_SIZE=12345', 'ARTIFACT_SIZE=0')
  $outcome = Get-TestOutcome -Result (New-CheckResult -Stdout $output)
  Assert-True ($outcome.Verdict -ceq 'FAIL' -and $outcome.Size -eq 0) 'Zero-byte archive was not reported as FAIL with size zero.'
}
Add-TestCase 'Non-regular archive and checksum files are FAIL' {
  $archiveOutput = $validOutput.Replace('ARTIFACT_STATE=OK', 'ARTIFACT_STATE=NOT_REGULAR')
  $archiveResult = Get-TestOutcome -Result (New-CheckResult -Stdout $archiveOutput)
  $checksumOutput = $validOutput.Replace('CHECKSUM_STATE=OK', 'CHECKSUM_STATE=NOT_REGULAR')
  $checksumResult = Get-TestOutcome -Result (New-CheckResult -Stdout $checksumOutput)
  Assert-True ($archiveResult.Verdict -ceq 'FAIL') 'Non-regular archive was not rejected.'
  Assert-True ($checksumResult.Verdict -ceq 'FAIL') 'Non-regular checksum sidecar was not rejected.'
}
Add-TestCase 'Missing checksum sidecar is FAIL' {
  $output = $validOutput.Replace('CHECKSUM_STATE=OK', 'CHECKSUM_STATE=MISSING')
  $outcome = Get-TestOutcome -Result (New-CheckResult -Stdout $output)
  Assert-True ($outcome.Verdict -ceq 'FAIL') "Expected FAIL, got $($outcome.Verdict)."
}
Add-TestCase 'Malformed checksum format is FAIL' {
  $output = $validOutput.Replace('CHECKSUM_FORMAT=VALID', 'CHECKSUM_FORMAT=INVALID')
  $outcome = Get-TestOutcome -Result (New-CheckResult -Stdout $output)
  Assert-True ($outcome.Verdict -ceq 'FAIL') "Expected FAIL, got $($outcome.Verdict)."
}
Add-TestCase 'Unreadable archive and checksum sidecar are FAIL' {
  $archiveOutput = $validOutput.Replace('ARTIFACT_STATE=OK', 'ARTIFACT_STATE=UNREADABLE')
  $sidecarOutput = $validOutput.Replace('CHECKSUM_STATE=OK', 'CHECKSUM_STATE=UNREADABLE')
  $archiveOutcome = Get-TestOutcome -Result (New-CheckResult -Stdout $archiveOutput)
  $sidecarOutcome = Get-TestOutcome -Result (New-CheckResult -Stdout $sidecarOutput)
  Assert-True ($archiveOutcome.Verdict -ceq 'FAIL') 'Unreadable archive was not reported as FAIL.'
  Assert-True ($sidecarOutcome.Verdict -ceq 'FAIL') 'Unreadable checksum sidecar was not reported as FAIL.'
}
Add-TestCase 'Duplicate target checksum entries are FAIL' {
  $output = $validOutput.Replace('CHECKSUM_ENTRY=FOUND', 'CHECKSUM_ENTRY=DUPLICATE')
  $output = $output.Replace('CHECKSUM_VERIFY=PASS', 'CHECKSUM_VERIFY=NOT_RUN')
  $outcome = Get-TestOutcome -Result (New-CheckResult -Stdout $output)
  Assert-True ($outcome.Verdict -ceq 'FAIL') "Expected FAIL, got $($outcome.Verdict)."
}
Add-TestCase 'Checksum entry missing from sidecar is FAIL' {
  $output = $validOutput.Replace('CHECKSUM_ENTRY=FOUND', 'CHECKSUM_ENTRY=MISSING')
  $output = $output.Replace('CHECKSUM_VERIFY=PASS', 'CHECKSUM_VERIFY=NOT_RUN')
  $outcome = Get-TestOutcome -Result (New-CheckResult -Stdout $output)
  Assert-True ($outcome.Verdict -ceq 'FAIL') "Expected FAIL, got $($outcome.Verdict)."
}
Add-TestCase 'Checksum mismatch is FAIL' {
  $output = $validOutput.Replace('CHECKSUM_VERIFY=PASS', 'CHECKSUM_VERIFY=FAIL')
  $outcome = Get-TestOutcome -Result (New-CheckResult -Stdout $output)
  Assert-True ($outcome.Verdict -ceq 'FAIL') "Expected FAIL, got $($outcome.Verdict)."
}
Add-TestCase 'Remote command rejects a competing archive with this run checksum' {
  $bashPath = 'C:\Program Files\Git\bin\bash.exe'
  if (-not (Test-Path -LiteralPath $bashPath -PathType Leaf)) {
    throw "Bash is required to execute the isolated checksum verifier: $bashPath"
  }

  $backupDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ("pets-backup-check-" + [guid]::NewGuid().ToString('N'))
  [void](New-Item -ItemType Directory -Path $backupDirectory)
  try {
    $archivePath = Join-Path $backupDirectory $validName
    $checksumPath = "$archivePath.sha256"
    $competitorArchive = [System.Text.Encoding]::ASCII.GetBytes('competing archive')
    $thisRunArchive = [System.Text.Encoding]::ASCII.GetBytes('this run archive')
    [System.IO.File]::WriteAllBytes($archivePath, $competitorArchive)
    $thisRunHashBytes = [System.Security.Cryptography.SHA256]::Create().ComputeHash($thisRunArchive)
    $thisRunHash = ([BitConverter]::ToString($thisRunHashBytes)).Replace('-', '').ToLowerInvariant()
    [System.IO.File]::WriteAllText(
      $checksumPath,
      ("$thisRunHash  $validName" + [string][char]10),
      (New-Object System.Text.UTF8Encoding($false))
    )

    $bashBackupDirectory = '/' + $backupDirectory.Substring(0, 1).ToLowerInvariant() +
      $backupDirectory.Substring(2).Replace('\', '/')
    $quotedBackupDirectory = ConvertTo-PosixShellSingleQuotedString -Value $bashBackupDirectory
    $quotedFileName = ConvertTo-PosixShellSingleQuotedString -Value $validName
    $command = @(
      "backup_file_name=$quotedFileName"
      (New-BackupArtifactCheckCommand -BackupDirectory $bashBackupDirectory -DynamicFileName)
    ) -join [string][char]10
    Assert-True ($command.Contains("backup_dir=$quotedBackupDirectory")) 'Dynamic verifier did not use the reported archive directory.'
    Assert-True ($command.Contains('file_name="$backup_file_name"')) 'Dynamic verifier did not use the reported archive filename.'
    Assert-True ($command.Contains('backup_file="$backup_dir/$file_name"')) 'Dynamic verifier did not compose the requested archive path.'
    $scriptPath = Join-Path $backupDirectory 'check-backup.sh'
    [System.IO.File]::WriteAllText($scriptPath, $command, (New-Object System.Text.UTF8Encoding($false)))

    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $bashPath
    $startInfo.Arguments = '-- "' + $scriptPath + '"'
    $startInfo.WorkingDirectory = $backupDirectory
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $process = [System.Diagnostics.Process]::Start($startInfo)
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()
    $result = [pscustomobject]@{
      ExitCode = $process.ExitCode
      Stdout = $stdout
      Stderr = $stderr
      TimedOut = $false
      Cancelled = $false
    }
    $outcome = Get-TestOutcome -Result $result

    Assert-True ($outcome.Verdict -ceq 'FAIL') "Expected mismatched competing archive and sidecar to FAIL, got $($outcome.Verdict)."
    Assert-True ($stdout -match '(?m)^ARTIFACT_STATE=OK$') "Dynamic verifier did not inspect the archive in the explicit directory. Output: $stdout"
    Assert-True ($stdout -match '(?m)^CHECKSUM_ENTRY=FOUND$') "Dynamic verifier did not inspect the explicit archive's sidecar. Output: $stdout"
    Assert-True ($stdout -match '(?m)^CHECKSUM_VERIFY=FAIL$') "Remote verifier did not report a checksum mismatch. Output: $stdout Error: $stderr"
    Assert-True ([System.IO.File]::ReadAllText($archivePath) -ceq 'competing archive') 'Verifier modified the competing archive.'
    Assert-True ([System.IO.File]::ReadAllText($checksumPath) -ceq ("$thisRunHash  $validName" + [string][char]10)) 'Verifier modified the checksum sidecar.'
  } finally {
    Remove-Item -LiteralPath $backupDirectory -Recurse -Force
  }
}
Add-TestCase 'Only a complete verified checksum result is PASS' {
  $outcome = Get-TestOutcome -Result (New-CheckResult -Stdout $validOutput)
  Assert-True ($outcome.Verdict -ceq 'PASS') "Expected PASS, got $($outcome.Verdict)."
  Assert-True ($outcome.Size -eq 12345) 'Verified file size was not returned.'
  Assert-True ($outcome.Sha256 -ceq $validHash) 'Verified archive SHA-256 was not returned.'
}
Add-TestCase 'Complete verified checksum result with trailing LF is PASS' {
  $output = $validOutput + [string][char]10
  $outcome = Get-TestOutcome -Result (New-CheckResult -Stdout $output)
  Assert-True ($outcome.Verdict -ceq 'PASS') "Expected PASS, got $($outcome.Verdict)."
  Assert-True ($outcome.Size -eq 12345) 'Verified file size was not returned.'
  Assert-True ($outcome.Sha256 -ceq $validHash) 'Verified archive SHA-256 was not returned.'
}
Add-TestCase 'Complete verified checksum result with trailing CRLF is PASS' {
  $output = $validOutput + ([string][char]13 + [string][char]10)
  $outcome = Get-TestOutcome -Result (New-CheckResult -Stdout $output)
  Assert-True ($outcome.Verdict -ceq 'PASS') "Expected PASS, got $($outcome.Verdict)."
}
Add-TestCase 'Blank line between artifact check fields remains unconfirmed' {
  $output = $validOutput.Replace('ARTIFACT_SIZE=12345', 'ARTIFACT_SIZE=12345' + [string][char]10 + [string][char]10)
  $outcome = Get-TestOutcome -Result (New-CheckResult -Stdout $output)
  Assert-True ($outcome.Verdict -ceq 'UNCONFIRMED') "Expected UNCONFIRMED, got $($outcome.Verdict)."
}
Add-TestCase 'Unknown or malformed artifact SHA-256 cannot produce PASS' {
  $unknownHash = $validOutput.Replace("ARTIFACT_SHA256=$validHash", 'ARTIFACT_SHA256=UNKNOWN')
  $unknownHashOutcome = Get-TestOutcome -Result (New-CheckResult -Stdout $unknownHash)
  $malformedHash = $validOutput.Replace("ARTIFACT_SHA256=$validHash", 'ARTIFACT_SHA256=not-a-hash')
  $malformedHashOutcome = Get-TestOutcome -Result (New-CheckResult -Stdout $malformedHash)
  $missingHash = (@($validOutput -split ([string][char]10) | Where-Object { $_ -notlike 'ARTIFACT_SHA256=*' }) -join [string][char]10)
  $missingHashOutcome = Get-TestOutcome -Result (New-CheckResult -Stdout $missingHash)
  Assert-True ($unknownHashOutcome.Verdict -ceq 'UNCONFIRMED') 'UNKNOWN artifact hash with CHECKSUM_VERIFY=PASS was accepted.'
  Assert-True ($malformedHashOutcome.Verdict -ceq 'UNCONFIRMED') 'Malformed artifact hash was not left unconfirmed.'
  Assert-True ($missingHashOutcome.Verdict -ceq 'UNCONFIRMED') 'Missing artifact hash field was not left unconfirmed.'
}
Add-TestCase 'Timeout and incomplete remote response remain unconfirmed' {
  $timeout = Get-TestOutcome -Result (New-CheckResult -Stdout $validOutput -TimedOut $true -ExecutionUnconfirmed $true)
  $cancelled = Get-TestOutcome -Result (New-CheckResult -Stdout $validOutput -Cancelled $true)
  $incomplete = Get-TestOutcome -Result $null
  $malformed = Get-TestOutcome -Result (New-CheckResult -Stdout 'CONNECTED')
  $notRun = Get-TestOutcome -Result (New-CheckResult -Stdout ($validOutput.Replace('CHECKSUM_VERIFY=PASS', 'CHECKSUM_VERIFY=NOT_RUN')))
  Assert-True ($timeout.Verdict -ceq 'UNCONFIRMED') 'Timed-out inspection was not unconfirmed.'
  Assert-True ($cancelled.Verdict -ceq 'UNCONFIRMED') 'Cancelled inspection was not unconfirmed.'
  Assert-True ($incomplete.Verdict -ceq 'UNCONFIRMED') 'Missing inspection result was not unconfirmed.'
  Assert-True ($malformed.Verdict -ceq 'UNCONFIRMED') 'Malformed remote output was not unconfirmed.'
  Assert-True ($notRun.Verdict -ceq 'UNCONFIRMED') 'Unperformed checksum verification was not unconfirmed.'
}
Add-TestCase 'SSH connection or checksum sidecar presence alone cannot produce PASS' {
  $connectionOnly = Get-TestOutcome -Result (New-CheckResult -Stdout 'CONNECTED')
  $checksumOnly = Get-TestOutcome -Result (New-CheckResult -Stdout 'CHECKSUM_STATE=OK')
  $untrustedContext = @{
    HostKeyVerified = $false
    SshAuthenticationSucceeded = $false
    BackupCommandAttempted = $false
    SshCleanupFailed = $false
    SshDisconnectFailed = $false
  }
  $untrusted = Get-TestOutcome -Result (New-CheckResult -Stdout $validOutput) -Context $untrustedContext
  Assert-True ($connectionOnly.Verdict -ceq 'UNCONFIRMED') 'SSH connection output alone was accepted.'
  Assert-True ($checksumOnly.Verdict -ceq 'UNCONFIRMED') 'Checksum sidecar presence alone was accepted.'
  Assert-True ($untrusted.Verdict -ceq 'FAIL') 'Unverified SSH authentication/fingerprint was accepted.'
}
Add-TestCase 'Cleanup failure prevents PASS' {
  $context = @{
    HostKeyVerified = $true
    SshAuthenticationSucceeded = $true
    BackupCommandAttempted = $true
    SshCleanupFailed = $true
    SshDisconnectFailed = $false
  }
  $outcome = Get-TestOutcome -Result (New-CheckResult -Stdout $validOutput) -Context $context
  Assert-True ($outcome.Verdict -ceq 'UNCONFIRMED') 'Cleanup failure allowed a PASS result.'
}
Add-TestCase 'Worker routes through mocked SSH.NET with fixed host and no fallback' {
  $global:artifactMockCalls = New-Object System.Collections.Generic.List[string]
  $global:artifactMockResult = New-CheckResult -Stdout $validOutput
  $global:artifactMockClient = $null
  $global:artifactWorkerScript = [scriptblock]::Create(
    (($requiredFunctions | ForEach-Object { $functionDefinitions[$_] }) -join ([string][char]13 + [char]10)) +
    ([string][char]13 + [char]10) + $workerSource
  )
  $mockSource = @'
param($Phase, $HostName, $Username, $RemoteCommand, $TimeoutMilliseconds, $Context)
$global:artifactMockCalls.Add($Phase)
if ($Phase -ceq 'Connect') {
  if ($global:artifactMockClient) { $Context.SshClient = $global:artifactMockClient }
  return [pscustomobject]@{ AuthenticationSucceeded = $true; HostKeyVerified = $true }
}
$global:artifactCapturedCommand = $RemoteCommand
$global:artifactCapturedHost = $HostName
$global:artifactCapturedUsername = $Username
$global:artifactCapturedTimeout = $TimeoutMilliseconds
return $global:artifactMockResult
'@
  $request = @{
    Action = 'BackupArtifactCheck'
    Context = @{
      CancelRequested = $false
      SshCleanupFailed = $false
      SshDisconnectFailed = $false
      SshClient = $null
      SshAuthentication = $null
      SshPassword = $null
    }
    BackupArtifactName = $validName
    BackupTestMode = $true
    BackupMockExecutorScript = $mockSource
    RestoreTestMode = $false
    RestoreRemoteExecutorScript = $null
    SshHost = 'mock.invalid'
    SshUsername = 'isolated-user'
    SshPassword = ConvertTo-SecureString -String 'isolated-test-password' -AsPlainText -Force
    SshNetAssembly = $null
    ExpectedProductionHostFingerprint = 'test-fingerprint'
    BackupSshPath = 'unused'
    BackupSshKey = 'unused'
    BackupSshTarget = 'unused'
    BackupProductionRoot = '/isolated/project'
    BackupScript = '/isolated/backup.sh'
    RestoreScript = '/isolated/restore.sh'
    RestoreBackupDirectory = '/isolated/restore-only'
  }
  $workerResult = & $global:artifactWorkerScript 'D:\isolated' 'git' $request
  Assert-True ($workerResult.ExitCode -eq 0) 'Mocked worker did not return the command result.'
  Assert-True (($global:artifactMockCalls -join ',') -ceq 'Connect,Command') 'Worker did not authenticate before sending one command.'
  Assert-True ($global:artifactCapturedCommand -like "*backup_dir='/home/zhe/pets-backups'*") 'Worker did not use the fixed backup directory.'
  Assert-True ($global:artifactCapturedHost -ceq 'mock.invalid' -and $global:artifactCapturedUsername -ceq 'isolated-user') 'Worker changed the isolated mock endpoint.'
  Assert-True ($global:artifactCapturedTimeout -eq 30000) 'Worker did not set a bounded timeout.'
  Assert-True ($workerResult.CleanupSucceeded) 'Worker did not confirm SSH cleanup.'

  $fakeClient = [pscustomobject]@{ IsConnected = $true }
  $fakeClient | Add-Member -MemberType ScriptMethod -Name Disconnect -Value { throw 'isolated disconnect failure' }
  $fakeClient | Add-Member -MemberType ScriptMethod -Name Dispose -Value {}
  $global:artifactMockClient = $fakeClient
  $cleanupRequest = $request.Clone()
  $cleanupRequest.Context = @{
    CancelRequested = $false
    SshCleanupFailed = $false
    SshDisconnectFailed = $false
    SshClient = $null
    SshAuthentication = $null
    SshPassword = $null
  }
  $cleanupRequest.SshPassword = ConvertTo-SecureString -String 'isolated-test-password' -AsPlainText -Force
  $cleanupResult = & $global:artifactWorkerScript 'D:\isolated' 'git' $cleanupRequest
  $cleanupOutcome = Get-BackupArtifactCheckOutcome -Result $cleanupResult -FileName $validName -Context $cleanupRequest.Context
  Assert-True (-not $cleanupResult.CleanupSucceeded) 'Worker reported failed SSH disconnect cleanup as successful.'
  Assert-True ($cleanupOutcome.Verdict -ceq 'UNCONFIRMED') 'Worker cleanup failure allowed PASS.'
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

describe('Operations Center backup artifact check isolated behavior', () => {
  test.each([
    'Selection dialog suppresses layout indices from its function output',
    'Backup artifact button passes the selected filename through production request and UI functions',
    'UI validates a filename as a string and passes it unchanged without SSH',
    'UI rejects empty, malformed, object, and array values before background work',
    'Request returns on user cancellation without starting an operation',
    'Background operation rejects invalid values before worker setup',
    'Start-SshUiOperation catch records safe diagnostics only',
    'Request catch records safe diagnostics without reproducing the reported incident',
    'Controlled conversion error keeps only a whitelisted PowerShell error identifier',
    'Only the prescribed filename is accepted',
    'Remote command is read-only and confined to the fixed backup directory',
    'Missing archive is FAIL',
    'Empty archive is FAIL and reports zero size',
    'Non-regular archive and checksum files are FAIL',
    'Missing checksum sidecar is FAIL',
    'Malformed checksum format is FAIL',
    'Unreadable archive and checksum sidecar are FAIL',
    'Duplicate target checksum entries are FAIL',
    'Checksum entry missing from sidecar is FAIL',
    'Checksum mismatch is FAIL',
    'Remote command rejects a competing archive with this run checksum',
    'Only a complete verified checksum result is PASS',
    'Complete verified checksum result with trailing LF is PASS',
    'Complete verified checksum result with trailing CRLF is PASS',
    'Blank line between artifact check fields remains unconfirmed',
    'Unknown or malformed artifact SHA-256 cannot produce PASS',
    'Timeout and incomplete remote response remain unconfirmed',
    'SSH connection or checksum sidecar presence alone cannot produce PASS',
    'Cleanup failure prevents PASS',
    'Worker routes through mocked SSH.NET with fixed host and no fallback',
  ])('%s', (name) => {
    const result = testResults.find((item) => item.Name === name);
    expect(result).toBeDefined();
    expect(result).toMatchObject({ Passed: true, Error: null });
  });
});
