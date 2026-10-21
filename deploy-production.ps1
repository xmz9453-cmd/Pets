[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-fA-F]{40}$')]
    [string]$ExpectedCommit,
    [switch]$WebControl
)

$ErrorActionPreference = 'Stop'

$script:RepositoryRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$script:SshPath = Join-Path $env:WINDIR 'System32\OpenSSH\ssh.exe'
$script:SshKey = Join-Path $HOME '.ssh\pets3_production'
$script:SshTarget = 'zhe@175.183.34.91'
$script:ProductionRoot = '/home/zhe/pets'
$script:StateFile = '/home/zhe/pets-deploy-state/deployment.state'
$script:ExpectedRemoteUrl = 'https://github.com/xmz9453-cmd/Pets.git'
$script:WebRemoteMutationStarted = $false
$script:DeploymentPhase = 'preflight'

function Read-DeploymentAuthorization {
    param(
        [Parameter(Mandatory = $true)][string]$Kind,
        [Parameter(Mandatory = $true)][string]$Message,
        [Parameter(Mandatory = $true)][string]$ExpectedValue
    )

    if (-not $WebControl) {
        return Read-Host $Message
    }

    $event = [pscustomobject]@{
        type = $Kind
        message = $Message
        expectedCommit = $ExpectedCommit.ToLowerInvariant()
    } | ConvertTo-Json -Compress
    [Console]::Out.WriteLine("OPS_PROMPT:$event")
    [Console]::Out.Flush()
    $response = [Console]::In.ReadLine()
    if ($null -eq $response) {
        throw 'Web management confirmation input was closed.'
    }
    if ($response -cne $ExpectedValue) {
        throw 'The web management confirmation did not match the required value.'
    }
    return $response
}

function Write-DeploymentResultEvent {
    param(
        [Parameter(Mandatory = $true)][string]$Type,
        [bool]$RemoteMutationStarted = $false
    )
    if (-not $WebControl) { return }
    $event = [pscustomobject]@{
        type = $Type
        status = if ($Type -eq 'deployment-complete') { 'SUCCESS' } else { $null }
        commit = $ExpectedCommit.ToLowerInvariant()
        remoteMutationStarted = $RemoteMutationStarted
        phase = $script:DeploymentPhase
    } | ConvertTo-Json -Compress
    [Console]::Out.WriteLine("OPS_RESULT:$event")
    [Console]::Out.Flush()
}

function Invoke-Git {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)

    $output = & git.exe -C $script:RepositoryRoot @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        $detail = ($output | ForEach-Object { "$_" }) -join "`n"
        throw "Git command failed with exit code ${exitCode}: git $($Arguments -join ' ')`n$detail"
    }

    return (($output | ForEach-Object { "$_" }) -join "`n").Trim()
}

function Get-GitHubMasterSha {
    $output = Invoke-Git -Arguments @('ls-remote', '--exit-code', 'origin', 'refs/heads/master')
    $lines = @($output -split "`n" | Where-Object { $_.Trim().Length -gt 0 })
    if ($lines.Count -ne 1 -or $lines[0] -notmatch '^([0-9a-fA-F]{40})\s+refs/heads/master$') {
        throw 'Could not uniquely determine GitHub origin/master SHA.'
    }

    return $Matches[1].ToLowerInvariant()
}

function Invoke-ReadOnlySsh {
    param([Parameter(Mandatory = $true)][string]$RemoteCommand)

    $output = & $script:SshPath -T -i $script:SshKey `
        -o IdentitiesOnly=yes `
        -o StrictHostKeyChecking=yes `
        -o BatchMode=yes `
        -o ConnectTimeout=15 `
        -o ServerAliveInterval=15 `
        -o ServerAliveCountMax=2 `
        $script:SshTarget $RemoteCommand
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "Read-only SSH command failed with exit code $exitCode."
    }

    return @($output | ForEach-Object { "$_" })
}

function Test-ProductionSshAuthentication {
    $output = & $script:SshPath -T -i $script:SshKey `
        -o IdentitiesOnly=yes `
        -o StrictHostKeyChecking=yes `
        -o BatchMode=yes `
        -o ConnectTimeout=15 `
        -o ServerAliveInterval=15 `
        -o ServerAliveCountMax=2 `
        $script:SshTarget ':' 2>&1
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "Production SSH key authentication preflight failed with exit code $exitCode; deployment was not authorized or started."
    }
}

function Get-ProductionState {
    $remoteCommand = "cat -- $script:StateFile"
    $lines = Invoke-ReadOnlySsh -RemoteCommand $remoteCommand
    $state = @{}
    $allowedFields = @('status', 'commit', 'previous_commit', 'timestamp', 'backup', 'verification', 'log_file', 'verified_at')

    foreach ($line in $lines) {
        if ($line -cnotmatch '^([a-z_]+)=(.*)$') {
            throw 'Production returned an invalid deployment state record.'
        }
        $field = $Matches[1]
        $value = $Matches[2]
        if ($field -cnotin $allowedFields) {
            throw "Production returned unknown state field '$field'."
        }
        if ($state.ContainsKey($field)) {
            throw "Production returned duplicate state field '$field'."
        }
        if ([string]::IsNullOrEmpty($value)) {
            throw "Production returned an empty value for '$field'."
        }
        $state[$field] = $value
    }

    foreach ($field in @('status', 'commit', 'previous_commit', 'timestamp', 'backup', 'verification', 'log_file')) {
        if (-not $state.ContainsKey($field)) {
            throw "Production deployment state is missing '$field'."
        }
    }

    if ($state['status'] -cnotin @('RUNNING', 'FAILED', 'DEPLOYED', 'SUCCESS')) {
        throw 'Production returned an invalid status value.'
    }
    if ($state['commit'] -cnotmatch '^(pending|NONE|[0-9a-fA-F]{40})$') {
        throw 'Production returned an invalid commit value.'
    }
    if ($state['previous_commit'] -cnotmatch '^(NONE|[0-9a-fA-F]{40})$') {
        throw 'Production returned an invalid previous_commit value.'
    }
    if ($state['timestamp'] -cnotmatch '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\+08:00$') {
        throw 'Production returned an invalid timestamp value.'
    }
    if ($state['backup'] -cnotmatch '^(pending|NONE|.+/pets_backup_[0-9]{8}_[0-9]{6}\.tar\.gz)$') {
        throw 'Production returned an invalid backup value.'
    }
    if ($state['verification'] -cnotmatch '^(pending|failed|PASS)$') {
        throw 'Production returned an invalid verification value.'
    }
    if ($state['log_file'] -cnotmatch '^.+/logs/deploy-[0-9]{8}-[0-9]{6}\.log$') {
        throw 'Production returned an invalid log_file value.'
    }
    if ($state['status'] -ceq 'SUCCESS') {
        if (-not $state.ContainsKey('verified_at') -or
            $state['verified_at'] -cnotmatch '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\+08:00$') {
            throw 'Production SUCCESS state is missing a valid verified_at value.'
        }
    }
    elseif ($state.ContainsKey('verified_at')) {
        throw 'Production returned verified_at for a state that is not SUCCESS.'
    }

    $hasCommitSha = $state['commit'] -cmatch '^[0-9a-fA-F]{40}$'
    $hasBackupFile = $state['backup'] -cmatch '^.+/pets_backup_[0-9]{8}_[0-9]{6}\.tar\.gz$'
    $validCombination = switch ($state['status']) {
        'RUNNING' { $state['verification'] -ceq 'pending' -and ($state['commit'] -ceq 'pending' -or $hasCommitSha) -and ($state['backup'] -ceq 'pending' -or $hasBackupFile) }
        'FAILED' { $state['verification'] -ceq 'failed' -and ($state['commit'] -ceq 'NONE' -or $hasCommitSha) -and ($state['backup'] -ceq 'NONE' -or $state['backup'] -ceq 'pending' -or $hasBackupFile) }
        'DEPLOYED' { $state['verification'] -ceq 'pending' -and $hasCommitSha -and $hasBackupFile }
        'SUCCESS' { $state['verification'] -ceq 'PASS' -and $hasCommitSha -and $hasBackupFile }
    }
    if (-not $validCombination) {
        throw 'Production returned an invalid combination of deployment state values.'
    }

    return $state
}

function Assert-ProductionState {
    param(
        [Parameter(Mandatory = $true)][hashtable]$State,
        [Parameter(Mandatory = $true)][string]$ExpectedStatus,
        [Parameter(Mandatory = $true)][string]$ExpectedVerification,
        [Parameter(Mandatory = $true)][string]$ExpectedSha
    )

    if ($State['status'] -cne $ExpectedStatus -or
        $State['verification'] -cne $ExpectedVerification -or
        $State['commit'].ToLowerInvariant() -cne $ExpectedSha) {
        throw "Production state did not match $ExpectedStatus/$ExpectedVerification for commit $ExpectedSha."
    }
}

try {
    $ExpectedCommit = $ExpectedCommit.ToLowerInvariant()
    if ($WebControl) {
        $utf8 = New-Object System.Text.UTF8Encoding($false)
        [Console]::InputEncoding = $utf8
        [Console]::OutputEncoding = $utf8
    }

    if (-not (Test-Path -LiteralPath $script:SshPath -PathType Leaf)) {
        throw "Windows OpenSSH was not found at '$script:SshPath'."
    }
    if (-not (Test-Path -LiteralPath $script:SshKey -PathType Leaf)) {
        throw "Production SSH key was not found at '$script:SshKey'."
    }

    $branch = Invoke-Git -Arguments @('branch', '--show-current')
    if ($branch -cne 'master') {
        throw "Expected branch 'master'; current branch is '$branch'."
    }

    $workingTree = Invoke-Git -Arguments @('status', '--porcelain=v1', '--untracked-files=all')
    if ($workingTree.Length -gt 0) {
        throw 'Working tree is not clean; commit or otherwise resolve all changes before deployment.'
    }

    $headSha = (Invoke-Git -Arguments @('rev-parse', 'HEAD')).ToLowerInvariant()
    if ($headSha -cne $ExpectedCommit) {
        throw "Expected commit does not match local HEAD. Expected $ExpectedCommit; found $headSha."
    }

    $fetchUrlOutput = Invoke-Git -Arguments @('remote', 'get-url', '--all', 'origin')
    $pushUrlOutput = Invoke-Git -Arguments @('remote', 'get-url', '--push', '--all', 'origin')
    $fetchUrls = @($fetchUrlOutput -split "`n")
    $pushUrls = @($pushUrlOutput -split "`n")
    if ($fetchUrls.Count -ne 1 -or $fetchUrls[0] -cne $script:ExpectedRemoteUrl -or
        $pushUrls.Count -ne 1 -or $pushUrls[0] -cne $script:ExpectedRemoteUrl) {
        throw "Git origin fetch and push URLs must both be '$script:ExpectedRemoteUrl'."
    }

    $remoteSha = Get-GitHubMasterSha
    if ($remoteSha -cne $ExpectedCommit) {
        $ancestorOutput = & git.exe -C $script:RepositoryRoot merge-base --is-ancestor $remoteSha $ExpectedCommit 2>&1
        $ancestorExitCode = $LASTEXITCODE
        if ($ancestorExitCode -ne 0) {
            throw "GitHub master ($remoteSha) is not an ancestor of expected commit ($ExpectedCommit); refusing deployment."
        }

        Write-Host "GitHub master is behind the requested deployment commit."
        $pushAuthorization = Read-DeploymentAuthorization -Kind 'push-authorization' `
            -Message "To authorize pushing exactly $ExpectedCommit to origin/master, type that full SHA" `
            -ExpectedValue $ExpectedCommit
        if ($pushAuthorization -cne $ExpectedCommit) {
            throw 'Push was not explicitly authorized; deployment stopped.'
        }

        if ((Get-GitHubMasterSha) -cne $remoteSha) {
            throw 'GitHub master changed during the pre-push checks; deployment stopped.'
        }

        $script:DeploymentPhase = 'github-push'
        $script:WebRemoteMutationStarted = $true
        [void](Invoke-Git -Arguments @('push', 'origin', "${ExpectedCommit}:refs/heads/master"))
        $remoteSha = Get-GitHubMasterSha
        if ($remoteSha -cne $ExpectedCommit) {
            throw "GitHub master did not resolve to the requested commit after push; found $remoteSha."
        }
    }

    $script:DeploymentPhase = 'pre-deploy-check'
    $preDeploySha = Get-GitHubMasterSha
    if ($preDeploySha -cne $ExpectedCommit) {
        throw 'GitHub master changed before deployment; deployment stopped.'
    }

    Write-Host 'Checking Production SSH key authentication before the final deployment confirmation.'
    Test-ProductionSshAuthentication
    Write-Host 'Production SSH key authentication succeeded.'

    Write-Warning 'This confirmation does not technically lock GitHub master. Do not allow master updates or another deployment to this Production environment until deployment reaches DEPLOYED.'
    $deployAuthorization = Read-DeploymentAuthorization -Kind 'deploy-freeze' `
        -Message "Confirm all three conditions: no GitHub master updates, no concurrent Production deployment, and GitHub master equals $ExpectedCommit. Type DEPLOY $ExpectedCommit FREEZE" `
        -ExpectedValue "DEPLOY $ExpectedCommit FREEZE"
    if ($deployAuthorization -cne "DEPLOY $ExpectedCommit FREEZE") {
        throw 'Production deployment was not explicitly authorized.'
    }

    $quotedRemoteUrl = "'" + $script:ExpectedRemoteUrl + "'"
    $quotedExpectedSha = "'" + $ExpectedCommit + "'"
    $deployCommand = "cd $script:ProductionRoot || exit 1; remote_url=`$(git remote get-url origin) || exit 1; if [ `"`$remote_url`" != $quotedRemoteUrl ]; then echo 'Production origin URL mismatch; refusing deployment.' >&2; exit 41; fi; set -o pipefail; remote_sha=`$(timeout 45s git ls-remote --exit-code origin refs/heads/master | cut -f1) || exit 43; if [ -z `"`$remote_sha`" ] || [ `"`$remote_sha`" != $quotedExpectedSha ]; then echo 'GitHub master changed before deployment; refusing deployment.' >&2; exit 42; fi; exec bash $script:ProductionRoot/deploy/deploy.sh $quotedExpectedSha"

    Write-Host "Starting Production deployment for $ExpectedCommit."
    $script:DeploymentPhase = 'production-deploy'
    $script:WebRemoteMutationStarted = $true
    & $script:SshPath -T -i $script:SshKey `
        -o IdentitiesOnly=yes `
        -o StrictHostKeyChecking=yes `
        -o BatchMode=yes `
        -o ConnectTimeout=15 `
        -o ServerAliveInterval=15 `
        -o ServerAliveCountMax=2 `
        $script:SshTarget $deployCommand
    $deployExitCode = $LASTEXITCODE
    if ($deployExitCode -ne 0) {
        throw "Production deploy.sh failed with SSH exit code $deployExitCode; Browser Acceptance was not started."
    }

    $deployedState = Get-ProductionState
    Assert-ProductionState -State $deployedState -ExpectedStatus 'DEPLOYED' -ExpectedVerification 'pending' -ExpectedSha $ExpectedCommit

    Write-Host ''
    Write-Host 'Deployment completed its technical checks. Perform Browser Acceptance manually at:'
    Write-Host 'http://175.183.34.91/'
    $acceptance = Read-DeploymentAuthorization -Kind 'browser-acceptance' `
        -Message 'After Browser Acceptance passes, type PASS to continue' `
        -ExpectedValue 'PASS'
    if ($acceptance -cne 'PASS') {
        throw 'Browser Acceptance was not confirmed with PASS; remote confirmation was not called.'
    }

    if ($WebControl) {
        $script:DeploymentPhase = 'production-confirmation'
        $remoteConfirmation = Read-DeploymentAuthorization -Kind 'remote-confirmation' `
            -Message 'Type CONFIRM to certify Production Verification PASS' `
            -ExpectedValue 'CONFIRM'
        if ($remoteConfirmation -cne 'CONFIRM') {
            throw 'Production confirmation was not explicitly authorized.'
        }
        $confirmCommand = "cd $script:ProductionRoot && printf '%s\n' CONFIRM | exec bash $script:ProductionRoot/deploy/confirm.sh"
        & $script:SshPath -T -i $script:SshKey `
            -o IdentitiesOnly=yes `
            -o StrictHostKeyChecking=yes `
            -o BatchMode=yes `
            -o ConnectTimeout=15 `
            -o ServerAliveInterval=15 `
            -o ServerAliveCountMax=2 `
            $script:SshTarget $confirmCommand
    } else {
        $script:DeploymentPhase = 'production-confirmation'
        $confirmCommand = "cd $script:ProductionRoot && exec bash $script:ProductionRoot/deploy/confirm.sh"
        Write-Host "Starting the existing Production confirmation script. It will request the separate remote input 'CONFIRM'."
        & $script:SshPath -tt -i $script:SshKey `
            -o IdentitiesOnly=yes `
            -o StrictHostKeyChecking=yes `
            -o BatchMode=yes `
            -o ConnectTimeout=15 `
            -o ServerAliveInterval=15 `
            -o ServerAliveCountMax=2 `
            $script:SshTarget $confirmCommand
    }
    $confirmExitCode = $LASTEXITCODE
    if ($confirmExitCode -ne 0) {
        throw "Production confirm.sh failed with SSH exit code $confirmExitCode."
    }

    $finalState = Get-ProductionState
    Assert-ProductionState -State $finalState -ExpectedStatus 'SUCCESS' -ExpectedVerification 'PASS' -ExpectedSha $ExpectedCommit

    Write-Host "Production deployment verified: commit $ExpectedCommit, status SUCCESS, verification PASS."
    Write-DeploymentResultEvent -Type 'deployment-complete' -RemoteMutationStarted $script:WebRemoteMutationStarted
}
catch {
    Write-DeploymentResultEvent -Type 'deployment-stopped' -RemoteMutationStarted $script:WebRemoteMutationStarted
    [Console]::Error.WriteLine("Production deployment stopped: $($_.Exception.Message)")
    exit 1
}
