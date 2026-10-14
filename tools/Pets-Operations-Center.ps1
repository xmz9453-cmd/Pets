[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$script:ProjectRoot = 'D:\MVP'
$script:KnownProductionSha = '5aeb5dc37dc4a3d10b26dca5888e083fa7bdd043'
$script:SshPath = if ($env:WINDIR) {
    Join-Path $env:WINDIR 'System32\OpenSSH\ssh.exe'
} else {
    $null
}
$script:SshKey = Join-Path $HOME '.ssh\pets3_production'
$script:SshTarget = 'zhe@175.183.34.91'
$script:ProductionRoot = '/home/zhe/pets'
$script:BackupScript = '/home/zhe/pets/deploy/backup.sh'
$script:VerifiedBackupDirectory = $null
$script:GitPath = $null
$script:Controls = @{}
$script:OperationState = @{
    IsBusy = $false
    LocalHeadSha = $null
    GitHubMasterSha = $null
    ActiveOperation = $null
    AllowClose = $false
}

if (-not $env:WINDIR -or -not (Test-Path -LiteralPath $script:ProjectRoot -PathType Container)) {
    throw "Windows 專案目錄不存在：$script:ProjectRoot"
}
if ([Threading.Thread]::CurrentThread.ApartmentState -ne [Threading.ApartmentState]::STA) {
    throw 'Windows Forms 需要 STA 執行緒。請使用 powershell.exe -STA -File tools\Pets-Operations-Center.ps1 啟動。'
}

try {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
} catch {
    throw "Windows Forms 無法使用：$($_.Exception.Message)"
}

$gitCommand = Get-Command git.exe -ErrorAction SilentlyContinue
if (-not $gitCommand) {
    throw '找不到 git.exe。請先安裝 Git for Windows，並確認 git.exe 位於 PATH。'
}
$script:GitPath = $gitCommand.Source

function ConvertTo-ProcessArgument {
    param([Parameter(Mandatory = $true)][AllowEmptyString()][string]$Value)

    if ($Value.Length -gt 0 -and $Value -notmatch '[\s"]') {
        return $Value
    }

    $builder = New-Object System.Text.StringBuilder
    [void]$builder.Append('"')
    $slashes = 0
    foreach ($character in $Value.ToCharArray()) {
        if ($character -eq [char]'\') {
            $slashes++
            continue
        }
        if ($character -eq [char]'"') {
            [void]$builder.Append(('\' * (2 * $slashes + 1)))
            [void]$builder.Append('"')
            $slashes = 0
            continue
        }
        if ($slashes -gt 0) {
            [void]$builder.Append(('\' * $slashes))
            $slashes = 0
        }
        [void]$builder.Append($character)
    }
    if ($slashes -gt 0) {
        [void]$builder.Append(('\' * (2 * $slashes)))
    }
    [void]$builder.Append('"')
    return $builder.ToString()
}

function Protect-SensitiveText {
    param([AllowEmptyString()][string]$Text)

    $safeText = $Text -replace '(?i)(https?://)[^/@\s]+@', '$1[REDACTED]@'
    $safeText = $safeText -replace '(?i)\b(DB_PASSWORD|PASSWORD|PASSWD|PASSPHRASE|TOKEN|SECRET|API_KEY|CONTRACT_STORAGE_ROOT)\s*=\s*[^\s,;]+', '$1=[REDACTED]'
    return $safeText
}

function Stop-StartedProcessTree {
    param(
        [Parameter(Mandatory = $true)][System.Diagnostics.Process]$Process,
        [Parameter(Mandatory = $true)][hashtable]$Context
    )

    if ($Process.HasExited) {
        return $true
    }

    $Context.Stage = "停止逾時程序樹（PID $($Process.Id)）"
    $taskkillPath = Join-Path $env:WINDIR 'System32\taskkill.exe'
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $taskkillPath
    $startInfo.Arguments = "/PID $($Process.Id) /T /F"
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true

    $stopper = New-Object System.Diagnostics.Process
    $stopper.StartInfo = $startInfo
    try {
        if (-not $stopper.Start()) {
            return $false
        }
        $stdoutTask = $stopper.StandardOutput.ReadToEndAsync()
        $stderrTask = $stopper.StandardError.ReadToEndAsync()
        if (-not $stopper.WaitForExit(5000)) {
            try {
                $stopper.Kill()
                if (-not $stopper.WaitForExit(3000)) {
                    return $false
                }
            } catch {
                return $false
            }
            return $false
        }
        $outputDrained = $stdoutTask.Wait(1000) -and $stderrTask.Wait(1000)
        if (-not $outputDrained) {
            try {
                $stopper.Kill()
                [void]$stopper.WaitForExit(3000)
            } catch { }
            return $false
        }
        [void]$stdoutTask.Result
        [void]$stderrTask.Result
        if (-not $Process.WaitForExit(5000)) {
            return $false
        }
        return ($stopper.ExitCode -eq 0)
    } catch {
        return $false
    } finally {
        $stopper.Dispose()
    }
}

function Invoke-CapturedProcess {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$WorkingDirectory,
        [Parameter(Mandatory = $true)][hashtable]$Context,
        [Parameter(Mandatory = $true)][string]$Stage,
        [ValidateRange(1, 3600000)][int]$TimeoutMilliseconds = 30000,
        [switch]$MarkPushAttempted
    )

    if ($TimeoutMilliseconds -le 0) {
        throw '子程序逾時必須是有限的正整數。'
    }
    if ($Context.CancelRequested) {
        throw "$($Context.Operation) 的 $Stage 已取消，子程序尚未啟動。"
    }

    $Context.Stage = $Stage
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $FilePath
    $startInfo.Arguments = (($Arguments | ForEach-Object {
        ConvertTo-ProcessArgument -Value $_
    }) -join ' ')
    $startInfo.WorkingDirectory = $WorkingDirectory
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    if ([string]::Equals($FilePath, $script:GitPath, [System.StringComparison]::OrdinalIgnoreCase)) {
        $startInfo.EnvironmentVariables['GIT_NO_LAZY_FETCH'] = '1'
    }

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    try {
        if (-not $process.Start()) {
            throw "無法啟動程序：$FilePath"
        }
        $Context.Process = $process
        if ($MarkPushAttempted) {
            $Context.PushAttempted = $true
        }
        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()
        $Context.StdoutTask = $stdoutTask
        $Context.StderrTask = $stderrTask
        $stopReason = $null
        $elapsed = [System.Diagnostics.Stopwatch]::StartNew()
        while (-not $process.HasExited) {
            if ($Context.CancelRequested) {
                $stopReason = 'cancelled'
                break
            }
            if ($elapsed.ElapsedMilliseconds -ge $TimeoutMilliseconds) {
                $stopReason = 'timeout'
                break
            }
            [void]$process.WaitForExit(200)
        }
        $elapsed.Stop()

        if ($stopReason) {
            $Context.Stage = if ($stopReason -eq 'timeout') {
                "$Stage 逾時；停止本機程序樹"
            } else {
                "$Stage 取消中；停止本機程序樹"
            }
            $stopped = Stop-StartedProcessTree -Process $process -Context $Context
            if (-not $stopped) {
                throw "$($Context.Operation) 的 $Stage 已要求停止，但無法確認本機程序樹已結束（PID $($process.Id)）。請等待或再次嘗試取消；未確認停止前不會回報取消成功。"
            }
            $Context.Process = $null
            $Context.StdoutTask = $null
            $Context.StderrTask = $null
            $drained = $stdoutTask.Wait(3000) -and $stderrTask.Wait(3000)
            if (-not $drained) {
                throw "$($Context.Operation) 的 $Stage 已停止程序，但 stdout/stderr 未能在 3 秒內排空；不會無限等待輸出。"
            }
            $capturedStdout = $stdoutTask.Result
            $capturedStderr = $stderrTask.Result
            return [pscustomobject]@{
                ExitCode = if ($stopReason -eq 'timeout') { $null } else { 1 }
                Stdout = $capturedStdout
                Stderr = $capturedStderr
                TimedOut = ($stopReason -eq 'timeout')
                Cancelled = ($stopReason -eq 'cancelled')
                TimeoutSeconds = [Math]::Ceiling($TimeoutMilliseconds / 1000)
                Stage = $Stage
            }
        }

        if (-not $process.HasExited) {
            throw "$($Context.Operation) 的 $Stage 狀態無法確認。"
        }
        $Context.Process = $null
        $Context.StdoutTask = $null
        $Context.StderrTask = $null
        if (-not $stdoutTask.Wait(3000) -or -not $stderrTask.Wait(3000)) {
            throw "$($Context.Operation) 的 $Stage 已結束，但 stdout/stderr 未能在 3 秒內排空；不會無限等待輸出。"
        }
        return [pscustomobject]@{
            ExitCode = $process.ExitCode
            Stdout = $stdoutTask.Result
            Stderr = $stderrTask.Result
            TimedOut = $false
            Cancelled = $false
            TimeoutSeconds = [Math]::Ceiling($TimeoutMilliseconds / 1000)
            Stage = $Stage
        }
    } finally {
        if ($process.HasExited) {
            if ($Context.Process -eq $process) {
                $Context.Process = $null
                $Context.StdoutTask = $null
                $Context.StderrTask = $null
            }
            $process.Dispose()
        } else {
            $Context.StopUnconfirmed = $true
        }
    }
}

function Invoke-GitReadOnly {
    param(
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][hashtable]$Context,
        [Parameter(Mandatory = $true)][string]$Stage
    )

    $result = Invoke-CapturedProcess -FilePath $script:GitPath -Arguments $Arguments `
        -WorkingDirectory $script:ProjectRoot -Context $Context -Stage $Stage `
        -TimeoutMilliseconds 30000
    if ($result.TimedOut) {
        throw "$($Context.Operation) 的 $Stage 逾時（30 秒）：git $($Arguments -join ' ')。"
    }
    if ($result.Cancelled) {
        throw "$($Context.Operation) 的 $Stage 已取消。"
    }
    if ($result.ExitCode -ne 0) {
        $detail = $result.Stderr.Trim()
        if (-not $detail) {
            $detail = $result.Stdout.Trim()
        }
        $detail = Protect-SensitiveText -Text $detail
        throw "Git 查詢失敗，退出碼 $($result.ExitCode)：git $($Arguments -join ' ') $detail"
    }
    return $result
}

function Get-LocalProjectStatus {
    param([Parameter(Mandatory = $true)][hashtable]$Context)

    $Context.Stage = '準備讀取 Git 分支'
    $branchResult = Invoke-GitReadOnly -Arguments @('branch', '--show-current') `
        -Context $Context -Stage '讀取 Git 分支'
    $Context.Stage = '準備讀取 HEAD SHA'
    $headResult = Invoke-GitReadOnly -Arguments @('rev-parse', '--verify', 'HEAD') `
        -Context $Context -Stage '讀取 HEAD SHA'
    $Context.Stage = '準備讀取工作樹狀態'
    $statusResult = Invoke-GitReadOnly -Arguments @('status', '--porcelain=v1', '--untracked-files=all') `
        -Context $Context -Stage '讀取工作樹狀態'

    $branch = $branchResult.Stdout.Trim()
    if (-not $branch) {
        $branch = 'detached HEAD'
    }
    $head = $headResult.Stdout.Trim().ToLowerInvariant()
    if ($head -notmatch '^[0-9a-f]{40}$') {
        throw 'Git 回傳的 HEAD 不是有效的完整 commit SHA。'
    }

    return [pscustomobject]@{
        Branch = $branch
        Head = $head
        IsClean = [string]::IsNullOrWhiteSpace($statusResult.Stdout)
        StatusOutput = $statusResult.Stdout.Trim()
    }
}

function Get-GitHubMasterStatus {
    param([Parameter(Mandatory = $true)][hashtable]$Context)

    $result = Invoke-CapturedProcess -FilePath $script:GitPath `
        -Arguments @('ls-remote', '--exit-code', 'origin', 'refs/heads/master') `
        -WorkingDirectory $script:ProjectRoot -Context $Context `
        -Stage '查詢 GitHub origin/master' -TimeoutMilliseconds 30000
    if ($result.TimedOut) {
        throw "$($Context.Operation) 的 GitHub origin/master 查詢逾時（30 秒）。"
    }
    if ($result.Cancelled) {
        throw "$($Context.Operation) 的 GitHub origin/master 查詢已取消。"
    }
    if ($result.ExitCode -ne 0) {
        $detail = Protect-SensitiveText -Text $result.Stderr.Trim()
        throw "GitHub origin/master 查詢失敗，退出碼 $($result.ExitCode)。 $detail"
    }
    $lines = @($result.Stdout -split "`r?`n" | Where-Object { $_.Trim() })
    if ($lines.Count -ne 1 -or $lines[0] -notmatch '^([0-9a-fA-F]{40})\s+refs/heads/master$') {
        throw '無法唯一確認 GitHub origin/master 的完整 SHA。'
    }
    return $Matches[1].ToLowerInvariant()
}

function Get-DeploymentPreflight {
    param([Parameter(Mandatory = $true)][hashtable]$Context)

    $checks = New-Object System.Collections.Generic.List[object]
    $localStatus = $null
    $localError = $null
    try {
        $localStatus = Get-LocalProjectStatus -Context $Context
        $checks.Add([pscustomobject]@{
            Name = '本機 Git 狀態可正常取得'
            Status = 'PASS'
            Detail = '已取得分支、HEAD 與包含未追蹤檔案的工作樹狀態。'
        })
    } catch {
        $localError = Protect-SensitiveText -Text $_.Exception.Message
        $checks.Add([pscustomobject]@{
            Name = '本機 Git 狀態可正常取得'
            Status = 'FAIL'
            Detail = $localError
        })
    }

    $branchStatus = '無法確認'
    $branchDetail = '本機 Git 狀態無法取得。'
    if ($localStatus) {
        if ($localStatus.Branch -ceq 'master') {
            $branchStatus = 'PASS'
            $branchDetail = "目前分支：$($localStatus.Branch)"
        } else {
            $branchStatus = 'FAIL'
            $branchDetail = "目前分支為 '$($localStatus.Branch)'，不是 master。"
        }
    }
    $checks.Add([pscustomobject]@{
        Name = '目前分支為 master'
        Status = $branchStatus
        Detail = $branchDetail
    })

    $headStatus = if ($localStatus) { 'PASS' } else { '無法確認' }
    $headDetail = if ($localStatus) { "本機 HEAD：$($localStatus.Head)" } else { '本機 HEAD SHA 無法取得。' }
    $checks.Add([pscustomobject]@{
        Name = '本機 HEAD SHA 可取得'
        Status = $headStatus
        Detail = $headDetail
    })

    $worktreeStatus = '無法確認'
    $worktreeDetail = '本機工作樹狀態無法取得。'
    if ($localStatus) {
        if ($localStatus.IsClean) {
            $worktreeStatus = 'PASS'
            $worktreeDetail = '工作樹乾淨（包含未追蹤檔案檢查）。'
        } else {
            $worktreeStatus = 'FAIL'
            $worktreeDetail = "工作樹有未提交或未追蹤變更：$($localStatus.StatusOutput -replace "`r?`n", '; ')"
        }
    }
    $checks.Add([pscustomobject]@{
        Name = '工作樹乾淨（包含未追蹤檔案）'
        Status = $worktreeStatus
        Detail = $worktreeDetail
    })

    $trackingStatus = '無法確認'
    $trackingDetail = '本機分支或 tracking ref 尚未驗證。'
    try {
        $localMasterResult = Invoke-GitReadOnly -Arguments @('rev-parse', '--verify', 'refs/heads/master^{commit}') `
            -Context $Context -Stage '確認本機 master 參照'
        $originMasterResult = Invoke-GitReadOnly -Arguments @('rev-parse', '--verify', 'refs/remotes/origin/master^{commit}') `
            -Context $Context -Stage '確認本機 origin/master 參照'
        if ($localMasterResult.Stdout.Trim() -notmatch '^[0-9a-fA-F]{40}$' -or
            $originMasterResult.Stdout.Trim() -notmatch '^[0-9a-fA-F]{40}$') {
            throw '本機 master 或 origin/master 未解析為有效的完整 commit SHA。'
        }

        $shallowResult = Invoke-GitReadOnly -Arguments @('rev-parse', '--is-shallow-repository') `
            -Context $Context -Stage '確認本機提交歷史完整'
        $shallowState = $shallowResult.Stdout.Trim()
        if ($shallowState -ceq 'true') {
            throw '本機是 shallow repository，無法可靠比較完整提交關係。'
        }
        if ($shallowState -cne 'false') {
            throw "無法確認本機提交歷史是否完整：$shallowState"
        }

        $trackingResult = Invoke-GitReadOnly -Arguments @(
            'rev-list', '--left-right', '--count', 'refs/heads/master...refs/remotes/origin/master'
        ) -Context $Context -Stage '計算本機 master 與 origin/master 提交關係'
        $trackingOutput = $trackingResult.Stdout.Trim()
        if ($trackingOutput -notmatch '^([0-9]+)\s+([0-9]+)$') {
            throw "無法解析 ahead/behind 數據：$trackingOutput"
        }

        [decimal]$aheadCount = $Matches[1]
        [decimal]$behindCount = $Matches[2]
        if ($aheadCount -eq 0 -and $behindCount -eq 0) {
            $trackingStatus = 'PASS'
            $trackingDetail = '本機 master 與 origin/master 完全同步（ahead 0，behind 0）。'
        } elseif ($aheadCount -gt 0 -and $behindCount -eq 0) {
            $trackingStatus = 'FAIL'
            $trackingDetail = "本機 master 領先 origin/master（ahead $aheadCount，behind 0）；未同步。"
        } elseif ($aheadCount -eq 0 -and $behindCount -gt 0) {
            $trackingStatus = 'FAIL'
            $trackingDetail = "本機 master 落後 origin/master（ahead 0，behind $behindCount）；未同步。"
        } else {
            $trackingStatus = 'FAIL'
            $trackingDetail = "本機 master 與 origin/master 分歧（ahead $aheadCount，behind $behindCount）。"
        }
    } catch {
        $trackingStatus = '無法確認'
        $trackingDetail = "無法比較：$(Protect-SensitiveText -Text $_.Exception.Message)"
    }
    $checks.Add([pscustomobject]@{
        Name = '本機 master 與 origin/master 提交關係'
        Status = $trackingStatus
        Detail = $trackingDetail
    })

    $repositoryValid = $false
    $originSafe = $false
    $repositoryDetail = $null
    try {
        $repositoryResult = Invoke-GitReadOnly -Arguments @('rev-parse', '--is-inside-work-tree') `
            -Context $Context -Stage '確認有效 Git repository'
        if ($repositoryResult.Stdout.Trim() -cne 'true') {
            throw '目前路徑不是有效的 Git 工作樹。'
        }
        $repositoryValid = $true
        $originResult = Invoke-GitReadOnly -Arguments @('remote', 'get-url', 'origin') `
            -Context $Context -Stage '確認 origin remote 設定'
        $originUrl = $originResult.Stdout.Trim()
        $originUri = $null
        if (-not [uri]::TryCreate($originUrl, [System.UriKind]::Absolute, [ref]$originUri) -or
            $originUri.Scheme -cne 'https' -or $originUri.Host -ine 'github.com') {
            throw 'origin 必須設定為 GitHub HTTPS remote；其他傳輸方式不會嘗試連線。'
        }
        $originSafe = $true
        $repositoryDetail = '有效 Git 工作樹，且 origin 已設定為 GitHub HTTPS remote。'
    } catch {
        $repositoryDetail = Protect-SensitiveText -Text $_.Exception.Message
    }
    $repositoryStatus = if ($repositoryValid -and $originSafe) { 'PASS' } else { 'FAIL' }
    $checks.Add([pscustomobject]@{
        Name = '有效 Git repository 且必要 origin 設定存在'
        Status = $repositoryStatus
        Detail = $repositoryDetail
    })

    $remoteSha = $null
    $remoteStatus = '無法確認'
    $remoteDetail = '因 repository 或 origin 設定未通過，未執行 GitHub 查詢。'
    if ($repositoryValid -and $originSafe) {
        try {
            $remoteSha = Get-GitHubMasterStatus -Context $Context
            $remoteStatus = 'PASS'
            $remoteDetail = "即時取得 GitHub origin/master SHA：$remoteSha"
        } catch {
            $remoteDetail = "即時查詢失敗：$(Protect-SensitiveText -Text $_.Exception.Message)"
        }
    }
    $checks.Add([pscustomobject]@{
        Name = '即時查詢 GitHub origin/master'
        Status = $remoteStatus
        Detail = $remoteDetail
    })

    $compareStatus = '無法確認'
    $compareDetail = '本機或 GitHub SHA 無法取得，未能比較。'
    if ($localStatus -and $remoteSha) {
        if ($localStatus.Head -ceq $remoteSha) {
            $compareStatus = 'PASS'
            $compareDetail = '本機 HEAD 與 GitHub master SHA 一致。'
        } else {
            $compareStatus = 'FAIL'
            $compareDetail = "本機 HEAD $($localStatus.Head) 與 GitHub master $remoteSha 不一致。"
        }
    }
    $checks.Add([pscustomobject]@{
        Name = '本機 HEAD 與 GitHub master SHA 一致'
        Status = $compareStatus
        Detail = $compareDetail
    })

    return [pscustomobject]@{
        IsPass = (@($checks | Where-Object { $_.Status -ne 'PASS' }).Count -eq 0)
        Checks = $checks.ToArray()
        Branch = if ($localStatus) { $localStatus.Branch } else { '無法確認' }
        Head = if ($localStatus) { $localStatus.Head } else { '無法確認' }
        IsClean = if ($localStatus) { $localStatus.IsClean } else { $null }
        StatusOutput = if ($localStatus) { $localStatus.StatusOutput } else { $null }
        RemoteHead = if ($remoteSha) { $remoteSha } else { '無法確認' }
    }
}

function Get-PushPreflight {
    param([Parameter(Mandatory = $true)][hashtable]$Context)

    $status = Get-LocalProjectStatus -Context $Context
    if ($status.Branch -cne 'master') {
        throw "目前分支為 '$($status.Branch)'，推送只允許 master。"
    }
    $shallowResult = Invoke-GitReadOnly -Arguments @('rev-parse', '--is-shallow-repository') `
        -Context $Context -Stage '確認本機提交歷史完整'
    $shallowState = $shallowResult.Stdout.Trim()
    if ($shallowState -ieq 'true') {
        throw '本機是 shallow repository，無法可靠判斷完整提交關係；不會自動 fetch，請人工補足歷史後重新檢查。'
    }
    if ($shallowState -cne 'false') {
        throw "無法確認本機提交歷史是否完整（git rev-parse 回傳 '$shallowState'）；未執行推送。"
    }

    $followTags = Invoke-CapturedProcess -FilePath $script:GitPath `
        -Arguments @('config', '--bool', '--get', 'push.followTags') `
        -WorkingDirectory $script:ProjectRoot -Context $Context `
        -Stage '確認推送不會附帶標籤' -TimeoutMilliseconds 30000
    if ($followTags.TimedOut -or $followTags.Cancelled) {
        throw '無法完成 push.followTags 設定檢查；未執行推送。'
    }
    if ($followTags.ExitCode -eq 0 -and $followTags.Stdout.Trim() -ieq 'true') {
        throw 'Git 設定 push.followTags=true 會附帶推送標籤；請由使用者處理設定後重新檢查。'
    }
    if (($followTags.ExitCode -eq 0 -and $followTags.Stdout.Trim() -ine 'false') -or
        ($followTags.ExitCode -ne 0 -and $followTags.ExitCode -ne 1)) {
        throw "無法確認 push.followTags 設定（退出碼 $($followTags.ExitCode)）；未執行推送。"
    }

    $recurseSubmodules = Invoke-CapturedProcess -FilePath $script:GitPath `
        -Arguments @('config', '--get', 'push.recurseSubmodules') `
        -WorkingDirectory $script:ProjectRoot -Context $Context `
        -Stage '確認推送不會連帶推送子模組' -TimeoutMilliseconds 30000
    if ($recurseSubmodules.TimedOut -or $recurseSubmodules.Cancelled) {
        throw '無法完成 push.recurseSubmodules 設定檢查；未執行推送。'
    }
    if (($recurseSubmodules.ExitCode -eq 0 -and $recurseSubmodules.Stdout.Trim() -cne 'no') -or
        ($recurseSubmodules.ExitCode -ne 0 -and $recurseSubmodules.ExitCode -ne 1)) {
        throw "Git 設定 push.recurseSubmodules=$($recurseSubmodules.Stdout.Trim()) 可能連帶操作子模組；未執行推送。"
    }

    $remoteSha = Get-GitHubMasterStatus -Context $Context
    $remoteCommit = Invoke-CapturedProcess -FilePath $script:GitPath `
        -Arguments @('cat-file', '-e', "$remoteSha^{commit}") `
        -WorkingDirectory $script:ProjectRoot -Context $Context `
        -Stage '確認本機具備 GitHub commit 物件' -TimeoutMilliseconds 30000
    if ($remoteCommit.TimedOut) {
        throw '確認本機是否具備遠端 commit 物件逾時（30 秒）；未執行推送。'
    }
    if ($remoteCommit.Cancelled) {
        throw '確認本機遠端 commit 物件已取消；未執行推送。'
    }
    if ($remoteCommit.ExitCode -ne 0) {
        throw "本機缺少 GitHub origin/master commit $remoteSha；不會自動 fetch，請人工更新並重新檢查。"
    }

    $ancestorResult = Invoke-CapturedProcess -FilePath $script:GitPath `
        -Arguments @('merge-base', '--is-ancestor', $remoteSha, $status.Head) `
        -WorkingDirectory $script:ProjectRoot -Context $Context `
        -Stage '確認 GitHub master 是本機 HEAD 的祖先' -TimeoutMilliseconds 30000
    if ($ancestorResult.TimedOut) {
        throw '確認提交關係逾時（30 秒）；未執行推送。'
    }
    if ($ancestorResult.Cancelled) {
        throw '確認提交關係已取消；未執行推送。'
    }
    if ($ancestorResult.ExitCode -eq 1) {
        throw "GitHub origin/master ($remoteSha) 不是本機 HEAD 的祖先；可能遠端領先或歷史分歧，未執行推送。"
    }
    if ($ancestorResult.ExitCode -ne 0) {
        $detail = Protect-SensitiveText -Text $ancestorResult.Stderr.Trim()
        throw "無法可靠判斷提交關係，退出碼 $($ancestorResult.ExitCode)。 $detail"
    }

    return [pscustomobject]@{
        Branch = $status.Branch
        Head = $status.Head
        RemoteHead = $remoteSha
    }
}

function Add-OperationLog {
    param(
        [Parameter(Mandatory = $true)][string]$Operation,
        [Parameter(Mandatory = $true)][string]$Status,
        [string[]]$Output = @()
    )

    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $script:Controls.LogBox.AppendText("[$timestamp] [$Status] $Operation`r`n")
    foreach ($line in $Output) {
        if ($line) {
            $script:Controls.LogBox.AppendText("  $line`r`n")
        }
    }
    $script:Controls.LogBox.AppendText("`r`n")
    $script:Controls.LogBox.SelectionStart = $script:Controls.LogBox.TextLength
    $script:Controls.LogBox.ScrollToCaret()
}

function Format-ProcessOutput {
    param([Parameter(Mandatory = $true)]$Result)
    $lines = New-Object System.Collections.Generic.List[string]
    foreach ($line in ($Result.Stdout -split "`r?`n")) {
        if ($line) {
            $lines.Add("[stdout] $(Protect-SensitiveText -Text $line)")
        }
    }
    foreach ($line in ($Result.Stderr -split "`r?`n")) {
        if ($line) {
            $lines.Add("[stderr] $(Protect-SensitiveText -Text $line)")
        }
    }
    if ($Result.TimedOut) {
        $lines.Add('[error] 程序逾時；本機程序已停止。')
    } else {
        $lines.Add("[exit code] $($Result.ExitCode)")
    }
    return $lines.ToArray()
}

function Get-BackupProcessOutcome {
    param(
        [Parameter(Mandatory = $true)]$Result,
        [Parameter(Mandatory = $true)][string]$ExpectedDirectory
    )

    if ($Result.TimedOut -or $Result.Cancelled -or $Result.ExitCode -ne 0) {
        return [pscustomobject]@{
            Success = $false
            BackupFile = $null
            Reason = '備份程序未以成功退出碼完成。'
        }
    }

    $directory = $ExpectedDirectory.TrimEnd('/')
    $directoryPattern = '\A/(?:[A-Za-z0-9_-][A-Za-z0-9._-]*(?:/[A-Za-z0-9_-][A-Za-z0-9._-]*)*)\z'
    if ([string]::IsNullOrWhiteSpace($directory) -or $directory -cnotmatch $directoryPattern) {
        return [pscustomobject]@{
            Success = $false
            BackupFile = $null
            Reason = '備份目的地格式無效。'
        }
    }

    $expectedPattern = '\ABACKUP_FILE=(' + [regex]::Escape($directory) +
        '/pets_backup_[0-9]{8}_[0-9]{6}\.tar\.gz)\z'
    $backupFileMatches = @(
        $Result.Stdout -split "`r?`n" |
            Where-Object { $_ -cmatch $expectedPattern } |
            ForEach-Object { [regex]::Match($_, $expectedPattern).Groups[1].Value }
    )
    if ($backupFileMatches.Count -ne 1) {
        return [pscustomobject]@{
            Success = $false
            BackupFile = $null
            Reason = '成功輸出中未能唯一確認符合目的地的 BACKUP_FILE。'
        }
    }

    return [pscustomobject]@{
        Success = $true
        BackupFile = $backupFileMatches[0]
        Reason = $null
    }
}

function Get-BackupCompletion {
    param(
        [Parameter(Mandatory = $true)]$Result,
        [Parameter(Mandatory = $true)][string]$ExpectedDirectory
    )

    $outcome = Get-BackupProcessOutcome -Result $Result -ExpectedDirectory $ExpectedDirectory
    $output = @(Format-ProcessOutput -Result $Result)
    if ($outcome.Success) {
        return [pscustomobject]@{
            Success = $true
            Status = '成功'
            ActivityText = '成功'
            Output = @("備份檔：$($outcome.BackupFile)") + $output
        }
    }

    $status = if ($Result.TimedOut -or $Result.Cancelled) {
        '失敗；遠端結果未確認'
    } else {
        "失敗（exit $($Result.ExitCode)）"
    }
    $details = @($outcome.Reason) + $output
    if ($Result.TimedOut -or $Result.Cancelled) {
        $details += 'SSH 中止或逾時後，遠端備份程序是否已結束無法確認；請勿據此假設備份未產生。'
    }

    return [pscustomobject]@{
        Success = $false
        Status = $status
        ActivityText = $status
        Output = $details
    }
}

function Confirm-BackupRequest {
    param([Parameter(Mandatory = $true)][string]$Message)

    return [System.Windows.Forms.MessageBox]::Show(
        $script:Controls.Form,
        $Message,
        '確認正式環境備份',
        [System.Windows.Forms.MessageBoxButtons]::OKCancel,
        [System.Windows.Forms.MessageBoxIcon]::Warning,
        [System.Windows.Forms.MessageBoxDefaultButton]::Button2
    )
}

function Request-BackupOperation {
    $destinationText = if ($script:VerifiedBackupDirectory) {
        $script:VerifiedBackupDirectory
    } else {
        '尚未驗證；正式備份禁止執行'
    }
    $confirmationMessage = @"
正式環境備份目標
SSH 主機：$($script:SshTarget)
遠端專案：$($script:ProductionRoot)
備份腳本：$($script:BackupScript)
有效備份目的地：$destinationText

備份腳本會刪除備份目錄中符合命名條件且超過 30 天的舊備份。
目前無法驗證遠端實際生效的 BACKUP_DIR；即使確認，本次仍會拒絕執行，不會建立背景工作或呼叫 SSH。

是否繼續檢查？
"@
    $confirmation = Confirm-BackupRequest -Message $confirmationMessage
    if ($confirmation -ne [System.Windows.Forms.DialogResult]::OK) {
        $script:Controls.ActivityLabel.Text = '正式環境備份：已取消'
        Add-OperationLog -Operation '正式環境備份' -Status '使用者取消；未建立背景工作或呼叫 SSH'
        return
    }

    if ([string]::IsNullOrWhiteSpace($script:VerifiedBackupDirectory)) {
        $script:Controls.ActivityLabel.Text = '正式環境備份：已阻擋（目的地未驗證）'
        Add-OperationLog -Operation '正式環境備份' -Status '已阻擋；備份目的地未驗證' -Output @(
            "SSH 主機：$($script:SshTarget)",
            "遠端專案：$($script:ProductionRoot)",
            "備份腳本：$($script:BackupScript)",
            '未建立背景工作或呼叫 SSH。'
        )
        return
    }

    Start-BackgroundOperation -Operation '正式環境備份' -Action 'Backup' `
        -BackupDestination $script:VerifiedBackupDirectory
}

function Set-OperationButtonsEnabled {
    param([bool]$Enabled)
    $script:Controls.RefreshButton.Enabled = $Enabled
    $script:Controls.TestButton.Enabled = $Enabled
    $script:Controls.GitHubButton.Enabled = $Enabled
    $script:Controls.PushButton.Enabled = $Enabled
    $script:Controls.DeploymentPreflightButton.Enabled = $Enabled
    $script:Controls.BackupButton.Enabled = $Enabled
}

function Start-BackgroundOperation {
    param(
        [Parameter(Mandatory = $true)][string]$Operation,
        [Parameter(Mandatory = $true)][ValidateSet('LocalStatus', 'GitHubMaster', 'Tests', 'PushMasterPreflight', 'PushMaster', 'DeploymentPreflight', 'Backup')][string]$Action,
        [string]$ExpectedHeadSha,
        [string]$ExpectedRemoteSha,
        [string]$BackupDestination
    )
    if ($script:OperationState.IsBusy -or
        ($script:OperationState.ActiveOperation -and $script:OperationState.ActiveOperation.StopUnconfirmed)) {
        return
    }

    $script:OperationState.IsBusy = $true
    Set-OperationButtonsEnabled -Enabled $false
    $script:Controls.ActivityLabel.Text = "$Operation：執行中…"
    Add-OperationLog -Operation $Operation -Status '執行中'
    $context = @{
        Operation = $Operation
        Stage = '準備中'
        Process = $null
        StdoutTask = $null
        StderrTask = $null
        CancelRequested = $false
        CloseWhenDone = $false
        StopUnconfirmed = $false
        Runspace = $null
        PowerShell = $null
        AsyncResult = $null
        CompletionHandled = $false
        CompletionHandler = $null
    }
    $script:OperationState.ActiveOperation = $context
    $request = @{
        Action = $Action
        Operation = $Operation
        Context = $context
        ExpectedHeadSha = $ExpectedHeadSha
        ExpectedRemoteSha = $ExpectedRemoteSha
        BackupDestination = $BackupDestination
        BackupSshPath = $script:SshPath
        BackupSshKey = $script:SshKey
        BackupSshTarget = $script:SshTarget
        BackupProductionRoot = $script:ProductionRoot
        BackupScript = $script:BackupScript
    }
    $completedRequest = $request
    $completedUi = $script:Controls
    $completedState = $script:OperationState

    $functionNames = @(
        'ConvertTo-ProcessArgument',
        'Protect-SensitiveText',
        'Stop-StartedProcessTree',
        'Invoke-CapturedProcess',
        'Invoke-GitReadOnly',
        'Get-LocalProjectStatus',
        'Get-GitHubMasterStatus',
        'Get-DeploymentPreflight',
        'Get-PushPreflight'
    )
    $functionDefinitions = foreach ($functionName in $functionNames) {
        $functionInfo = Get-Command $functionName -CommandType Function -ErrorAction Stop
        "function $functionName {`r`n$($functionInfo.Definition)`r`n}"
    }
    $workerScript = @'
$ErrorActionPreference = 'Stop'
$script:ProjectRoot = $args[0]
$script:GitPath = $args[1]
$workerRequest = $args[2]
$workContext = $null
try {
    if ($null -eq $workerRequest -or $workerRequest -isnot [System.Collections.IDictionary]) {
        throw '背景工作未收到有效的操作請求物件。'
    }
    $workContext = $workerRequest.Context
    if ($null -eq $workContext -or $workContext -isnot [System.Collections.IDictionary]) {
        throw '背景工作操作請求未包含有效的操作狀態物件。'
    }
    $script:SshPath = $workerRequest.BackupSshPath
    $script:SshKey = $workerRequest.BackupSshKey
    $script:SshTarget = $workerRequest.BackupSshTarget
    $script:ProductionRoot = $workerRequest.BackupProductionRoot
    $script:BackupScript = $workerRequest.BackupScript
    $workContext.Stage = '解析背景工作請求完成'
    switch ($workerRequest.Action) {
        'LocalStatus' {
            $workContext.Stage = '開始本機 Git 狀態檢查'
            $result = Get-LocalProjectStatus -Context $workContext
            break
        }
        'GitHubMaster' {
            $workContext.Stage = '開始 GitHub master 查詢'
            $result = Get-GitHubMasterStatus -Context $workContext
            break
        }
        'DeploymentPreflight' {
            $workContext.Stage = '執行部署前唯讀檢查'
            $result = Get-DeploymentPreflight -Context $workContext
            break
        }
        'Tests' {
            $workContext.Stage = '準備啟動 npm 測試'
            $npm = Join-Path $env:WINDIR 'System32\cmd.exe'
            $result = Invoke-CapturedProcess -FilePath $npm `
                -Arguments @('/d', '/s', '/c', 'npm.cmd --prefix testing test') `
                -WorkingDirectory $script:ProjectRoot -Context $workContext `
                -Stage '執行 npm 測試' -TimeoutMilliseconds 600000
            break
        }
        'Backup' {
            $destination = [string]$workerRequest.BackupDestination
            $directoryPattern = '\A/(?:[A-Za-z0-9_-][A-Za-z0-9._-]*(?:/[A-Za-z0-9_-][A-Za-z0-9._-]*)*)\z'
            if ([string]::IsNullOrWhiteSpace($destination) -or
                $destination -cnotmatch $directoryPattern) {
                throw '有效備份目的地未驗證；拒絕啟動 SSH。'
            }
            if (-not (Test-Path -LiteralPath $script:SshPath -PathType Leaf) -or
                -not (Test-Path -LiteralPath $script:SshKey -PathType Leaf)) {
                throw '正式環境 SSH 程式或金鑰不存在；未啟動 SSH。'
            }

            $remoteCommand = "cd -- '$($script:ProductionRoot)' && exec bash '$($script:BackupScript)'"
            $result = Invoke-CapturedProcess -FilePath $script:SshPath `
                -Arguments @(
                    '-T', '-i', $script:SshKey,
                    '-o', 'IdentitiesOnly=yes',
                    '-o', 'StrictHostKeyChecking=yes',
                    '-o', 'BatchMode=yes',
                    '-o', 'ConnectTimeout=15',
                    $script:SshTarget, $remoteCommand
                ) `
                -WorkingDirectory $script:ProjectRoot -Context $workContext `
                -Stage '執行正式環境 backup.sh' -TimeoutMilliseconds 3600000
            break
        }
        'PushMasterPreflight' {
            $workContext.Stage = '執行推送前檢查'
            $result = Get-PushPreflight -Context $workContext
            break
        }
        'PushMaster' {
            $workContext.Stage = '重新確認推送條件'
            $preflight = Get-PushPreflight -Context $workContext
            if ($preflight.Head -cne $workerRequest.ExpectedHeadSha -or
                $preflight.RemoteHead -cne $workerRequest.ExpectedRemoteSha) {
                throw '確認對話框顯示後，本機 HEAD 或 GitHub master 已變更；為避免使用過期目標，未執行推送。'
            }

            $workContext.Stage = '執行 git push origin master'
            $pushResult = Invoke-CapturedProcess -FilePath $script:GitPath `
                -Arguments @('push', 'origin', 'master') `
                -WorkingDirectory $script:ProjectRoot -Context $workContext `
                -Stage '推送 GitHub master' -TimeoutMilliseconds 120000 -MarkPushAttempted
            if ($pushResult.TimedOut -or $pushResult.Cancelled) {
                $result = [pscustomobject]@{
                    Phase = 'PushUnconfirmed'
                    ProcessResult = $pushResult
                    Head = $preflight.Head
                    RemoteHead = $preflight.RemoteHead
                }
                break
            }
            if ($pushResult.ExitCode -ne 0) {
                $result = [pscustomobject]@{
                    Phase = 'PushFailed'
                    ProcessResult = $pushResult
                    Head = $preflight.Head
                    RemoteHead = $preflight.RemoteHead
                }
                break
            }

            $workContext.Stage = '驗證推送後 GitHub master SHA'
            $verifiedRemoteSha = Get-GitHubMasterStatus -Context $workContext
            $result = [pscustomobject]@{
                Phase = if ($verifiedRemoteSha -ceq $preflight.Head) { 'Verified' } else { 'VerifyMismatch' }
                ProcessResult = $pushResult
                Head = $preflight.Head
                RemoteHead = $verifiedRemoteSha
            }
            break
        }
        default {
            throw "背景工作收到未知操作類型：$($workerRequest.Action)"
        }
    }
    $result
} catch {
    if ($workContext -is [System.Collections.IDictionary]) {
        $workContext.Stage = "背景工作錯誤：$($workContext.Stage)"
    }
    throw
}
'@
    $workerScript = ($functionDefinitions -join "`r`n") + "`r`n" + $workerScript

    $completionAddOperationLog = (Get-Command Add-OperationLog -CommandType Function -ErrorAction Stop).ScriptBlock
    $completionFormatProcessOutput = (Get-Command Format-ProcessOutput -CommandType Function -ErrorAction Stop).ScriptBlock
    $completionProtectSensitiveText = (Get-Command Protect-SensitiveText -CommandType Function -ErrorAction Stop).ScriptBlock
    $completionSetOperationButtonsEnabled = (Get-Command Set-OperationButtonsEnabled -CommandType Function -ErrorAction Stop).ScriptBlock
    $completionStartBackgroundOperation = (Get-Command Start-BackgroundOperation -CommandType Function -ErrorAction Stop).ScriptBlock

    $completionHandler = {
        param($eventArgs)
        $workContext = $completedRequest.Context
        $closeAfterCompletion = $workContext.CloseWhenDone
        $unconfirmedProcess = $workContext.Process -and $workContext.StopUnconfirmed
        $nextPush = $null
        try {
            if ($eventArgs.Error) {
                $workError = $eventArgs.Error
                $exceptionDetails = New-Object System.Collections.Generic.List[string]
                if ($null -ne $workError) {
                    $message = & $completionProtectSensitiveText -Text $workError.Message
                    $exceptionDetails.Add("例外類型：$($workError.GetType().FullName)")
                    $exceptionDetails.Add("例外訊息：$message")
                    if (-not [string]::IsNullOrWhiteSpace($workError.StackTrace)) {
                        $stack = & $completionProtectSensitiveText -Text $workError.StackTrace
                        $exceptionDetails.Add("例外堆疊：$stack")
                    }
                } else {
                    $message = '背景工作失敗，但 RunWorkerCompleted 未提供原始例外資訊。'
                    $exceptionDetails.Add('例外診斷：未提供原始工作例外（Error 為 Null）')
                    $exceptionDetails.Add("例外訊息：$message")
                }
                if ($unconfirmedProcess) {
                    $message += ' 本機程序是否已停止尚未確認；可再次關閉視窗選擇取消，或選擇繼續等待。'
                    $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：停止狀態未確認"
                    & $completionAddOperationLog -Operation $completedRequest.Operation -Status '停止狀態未確認' -Output @(
                        $exceptionDetails.ToArray(),
                        $(if ($workContext.PushAttempted) { '推送可能已在遠端完成；請重新查詢 GitHub master SHA。' }),
                        "執行階段：$($workContext.Stage)"
                    )
                } elseif ($completedRequest.Action -eq 'PushMaster' -and $workContext.PushAttempted) {
                    $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：結果未確認"
                    & $completionAddOperationLog -Operation $completedRequest.Operation -Status '結果未確認' -Output @(
                        $exceptionDetails.ToArray(),
                        '推送已開始或可能已送出；請重新查詢 GitHub master SHA，勿直接假設遠端未更新。',
                        "執行階段：$($workContext.Stage)"
                    )
                } elseif ($workContext.CancelRequested) {
                    $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：已取消"
                    & $completionAddOperationLog -Operation $completedRequest.Operation -Status '已取消並確認無活動子程序' -Output @(
                        $exceptionDetails.ToArray(),
                        "執行階段：$($workContext.Stage)"
                    )
                } else {
                    $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：失敗"
                    & $completionAddOperationLog -Operation $completedRequest.Operation -Status '失敗' -Output @(
                        $exceptionDetails.ToArray(),
                        "執行階段：$($workContext.Stage)"
                    )
                }
                if ($completedRequest.Action -eq 'LocalStatus') {
                    $failureText = if ($workContext.CancelRequested -and -not $unconfirmedProcess) { '已取消' } else { '查詢失敗' }
                    $completedUi.BranchValue.Text = $failureText
                    $completedUi.HeadValue.Text = $failureText
                    $completedUi.WorktreeValue.Text = $failureText
                    $completedState.LocalHeadSha = $null
                } elseif ($completedRequest.Action -eq 'GitHubMaster') {
                    $failureText = if ($workContext.CancelRequested -and -not $unconfirmedProcess) { '已取消' } else { '查詢失敗' }
                    $completedUi.GitHubShaValue.Text = $failureText
                    $completedUi.GitHubCompareValue.Text = if ($workContext.CancelRequested -and -not $unconfirmedProcess) {
                        '未完成比較'
                    } else {
                        '無法確認'
                    }
                    $completedState.GitHubMasterSha = $null
                } elseif ($completedRequest.Action -eq 'DeploymentPreflight') {
                    $completedUi.BranchValue.Text = '無法確認'
                    $completedUi.HeadValue.Text = '無法確認'
                    $completedUi.WorktreeValue.Text = '無法確認'
                    $completedUi.GitHubShaValue.Text = '無法確認'
                    $completedUi.GitHubCompareValue.Text = '無法確認'
                    $completedState.LocalHeadSha = $null
                    $completedState.GitHubMasterSha = $null
                }
            } else {
                switch ($completedRequest.Action) {
                'LocalStatus' {
                    $status = $eventArgs.Result
                    $completedState.LocalHeadSha = $status.Head
                    $completedUi.BranchValue.Text = $status.Branch
                    $completedUi.HeadValue.Text = $status.Head
                    $completedUi.WorktreeValue.Text = if ($status.IsClean) { '乾淨' } else { '有未提交變更' }
                    $completedUi.WorktreeValue.ForeColor = if ($status.IsClean) {
                        [System.Drawing.Color]::DarkGreen
                    } else {
                        [System.Drawing.Color]::DarkRed
                    }
                    $details = @("分支：$($status.Branch)", "HEAD：$($status.Head)")
                    if ($status.IsClean) {
                        $details += '工作樹：乾淨'
                    } else {
                        $details += '工作樹：有未提交變更'
                        $details += ($status.StatusOutput -split "`r?`n" | ForEach-Object { "  $_" })
                    }
                    if ($completedState.GitHubMasterSha) {
                        $same = $completedState.LocalHeadSha -ceq $completedState.GitHubMasterSha
                        $completedUi.GitHubCompareValue.Text = if ($same) { '一致' } else { '不一致' }
                    }
                    $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：成功"
                    & $completionAddOperationLog -Operation $completedRequest.Operation -Status '成功' -Output $details
                }
                'GitHubMaster' {
                    $completedState.GitHubMasterSha = [string]$eventArgs.Result
                    $completedUi.GitHubShaValue.Text = $completedState.GitHubMasterSha
                    if ($completedState.LocalHeadSha) {
                        $same = $completedState.LocalHeadSha -ceq $completedState.GitHubMasterSha
                        $completedUi.GitHubCompareValue.Text = if ($same) { '一致' } else { '不一致' }
                    } else {
                        $completedUi.GitHubCompareValue.Text = '請先檢查本機狀態'
                    }
                    $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：成功"
                    & $completionAddOperationLog -Operation $completedRequest.Operation -Status '成功' -Output @(
                        "GitHub master：$($completedState.GitHubMasterSha)",
                        "與本機 HEAD：$($completedUi.GitHubCompareValue.Text)",
                        '查詢方式：git ls-remote（未執行 fetch/pull/push）'
                    )
                }
                'DeploymentPreflight' {
                    $preflight = $eventArgs.Result
                    $completedUi.BranchValue.Text = $preflight.Branch
                    $completedUi.HeadValue.Text = $preflight.Head
                    $completedUi.WorktreeValue.Text = if ($null -eq $preflight.IsClean) {
                        '無法確認'
                    } elseif ($preflight.IsClean) {
                        '乾淨（PASS）'
                    } else {
                        '有未提交變更（FAIL）'
                    }
                    $completedUi.WorktreeValue.ForeColor = if ($preflight.IsClean -eq $true) {
                        [System.Drawing.Color]::DarkGreen
                    } elseif ($preflight.IsClean -eq $false) {
                        [System.Drawing.Color]::DarkRed
                    } else {
                        [System.Drawing.SystemColors]::ControlText
                    }
                    $completedUi.GitHubShaValue.Text = $preflight.RemoteHead
                    $compareCheck = @($preflight.Checks | Where-Object {
                        $_.Name -eq '本機 HEAD 與 GitHub master SHA 一致'
                    })[0]
                    $completedUi.GitHubCompareValue.Text = "$($compareCheck.Status)：$($compareCheck.Detail)"
                    $completedState.LocalHeadSha = if ($preflight.Head -ne '無法確認') { $preflight.Head } else { $null }
                    $completedState.GitHubMasterSha = if ($preflight.RemoteHead -ne '無法確認') {
                        $preflight.RemoteHead
                    } else {
                        $null
                    }
                    $checkDetails = @($preflight.Checks | ForEach-Object {
                        "[$($_.Status)] $($_.Name)：$($_.Detail)"
                    })
                    $checkDetails += "目前分支：$($preflight.Branch)"
                    $checkDetails += "本機 HEAD SHA：$($preflight.Head)"
                    $checkDetails += "GitHub origin/master SHA：$($preflight.RemoteHead)"
                    $checkDetails += "工作樹狀態：$($completedUi.WorktreeValue.Text)"
                    $checkDetails += '本檢查僅驗證本機與 GitHub 狀態，未執行正式伺服器檢查或部署。'
                    if ($preflight.IsPass) {
                        $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：PASS"
                        & $completionAddOperationLog -Operation $completedRequest.Operation -Status 'PASS' -Output $checkDetails
                    } else {
                        $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：FAIL"
                        & $completionAddOperationLog -Operation $completedRequest.Operation -Status 'FAIL' -Output $checkDetails
                    }
                }
                'PushMasterPreflight' {
                    $preflight = $eventArgs.Result
                    $confirmation = [System.Windows.Forms.MessageBox]::Show(
                        $completedUi.Form,
                        "推送前檢查通過。`r`n`r`n本機分支：$($preflight.Branch)`r`n本機 HEAD：$($preflight.Head)`r`nGitHub origin/master：$($preflight.RemoteHead)`r`n`r`n即將執行：git push origin master`r`n`r`n不會自動建立 commit，也不會自動 pull、merge、rebase、reset 或 force push。`r`n`r`n是否繼續？",
                        '確認推送到 GitHub',
                        [System.Windows.Forms.MessageBoxButtons]::YesNo,
                        [System.Windows.Forms.MessageBoxIcon]::Warning,
                        [System.Windows.Forms.MessageBoxDefaultButton]::Button2
                    )
                    if ($confirmation -eq [System.Windows.Forms.DialogResult]::Yes) {
                        $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：準備推送"
                        & $completionAddOperationLog -Operation $completedRequest.Operation -Status '推送前檢查通過；已確認' -Output @(
                            "分支：$($preflight.Branch)",
                            "本機 HEAD：$($preflight.Head)",
                            "GitHub origin/master：$($preflight.RemoteHead)"
                        )
                        $nextPush = @{
                            ExpectedHeadSha = $preflight.Head
                            ExpectedRemoteSha = $preflight.RemoteHead
                        }
                    } else {
                        $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：已取消"
                        & $completionAddOperationLog -Operation $completedRequest.Operation -Status '使用者取消；未執行推送' -Output @(
                            "本機 HEAD：$($preflight.Head)",
                            "GitHub origin/master：$($preflight.RemoteHead)"
                        )
                    }
                }
                'PushMaster' {
                    $result = $eventArgs.Result
                    $output = @(& $completionFormatProcessOutput -Result $result.ProcessResult)
                    if ($result.Phase -eq 'PushUnconfirmed') {
                        $status = if ($result.ProcessResult.TimedOut) { '逾時；結果未確認' } else { '取消；結果未確認' }
                        $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：結果未確認"
                        & $completionAddOperationLog -Operation $completedRequest.Operation -Status $status -Output @(
                            $output,
                            '推送可能已在遠端完成；請重新查詢 GitHub master SHA，以確認實際結果。'
                        )
                    } elseif ($result.Phase -eq 'PushFailed') {
                        $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：失敗"
                        & $completionAddOperationLog -Operation $completedRequest.Operation -Status '推送失敗' -Output $output
                    } elseif ($result.Phase -eq 'VerifyMismatch') {
                        $completedUi.GitHubShaValue.Text = $result.RemoteHead
                        $completedState.GitHubMasterSha = $result.RemoteHead
                        $completedUi.GitHubCompareValue.Text = if ($result.RemoteHead -ceq $result.Head) {
                            '一致'
                        } else {
                            '不一致'
                        }
                        $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：結果未確認"
                        & $completionAddOperationLog -Operation $completedRequest.Operation -Status '結果未確認；推送後 SHA 不一致' -Output @(
                            "本次本機 HEAD：$($result.Head)",
                            "目前 GitHub origin/master：$($result.RemoteHead)",
                            '未自動重試或強制推送；請人工檢查遠端狀態。'
                        )
                    } elseif ($result.Phase -eq 'Verified') {
                        $completedUi.GitHubShaValue.Text = $result.RemoteHead
                        $completedUi.GitHubCompareValue.Text = '一致'
                        $completedState.GitHubMasterSha = $result.RemoteHead
                        $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：推送成功"
                        & $completionAddOperationLog -Operation $completedRequest.Operation -Status '推送成功' -Output @(
                            "本次本機 HEAD：$($result.Head)",
                            "推送後 GitHub origin/master：$($result.RemoteHead)",
                            '推送命令成功，且推送後遠端 SHA 完全一致。'
                        )
                    } else {
                        throw "推送回傳未知驗證階段：$($result.Phase)"
                    }
                }
                'Tests' {
                    $result = $eventArgs.Result
                    $output = @(& $completionFormatProcessOutput -Result $result)
                    if ($result.TimedOut) {
                        $timeoutMessage = "$($completedRequest.Operation) 的 $($result.Stage) 逾時（$($result.TimeoutSeconds) 秒）；已停止本機程序樹。"
                        $output = @($timeoutMessage) + $output
                        $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：逾時"
                        & $completionAddOperationLog -Operation $completedRequest.Operation -Status '逾時' -Output $output
                    } elseif ($result.Cancelled) {
                        $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：已取消"
                        & $completionAddOperationLog -Operation $completedRequest.Operation -Status '已取消並確認停止' -Output $output
                    } elseif ($result.ExitCode -eq 0) {
                        $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：成功（exit $($result.ExitCode)）"
                        & $completionAddOperationLog -Operation $completedRequest.Operation -Status "成功（exit $($result.ExitCode)）" -Output $output
                    } else {
                        $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：失敗（exit $($result.ExitCode)）"
                        & $completionAddOperationLog -Operation $completedRequest.Operation -Status "失敗（exit $($result.ExitCode)）" -Output $output
                    }
                }
                'Backup' {
                    $result = $eventArgs.Result
                    $completion = Get-BackupCompletion -Result $result `
                        -ExpectedDirectory $completedRequest.BackupDestination
                    $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：$($completion.ActivityText)"
                    & $completionAddOperationLog -Operation $completedRequest.Operation `
                        -Status $completion.Status -Output $completion.Output
                }
                }
            }
        } catch {
            $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：完成處理失敗"
            & $completionAddOperationLog -Operation $completedRequest.Operation -Status '完成處理失敗' -Output @(
                (& $completionProtectSensitiveText -Text $_.Exception.Message)
            )
        } finally {
            try {
                if ($workContext.PowerShell) {
                    $workContext.PowerShell.Dispose()
                }
                if ($workContext.Runspace) {
                    if ($workContext.Runspace.RunspaceStateInfo.State -eq [System.Management.Automation.Runspaces.RunspaceState]::Opened) {
                        $workContext.Runspace.Close()
                    }
                    $workContext.Runspace.Dispose()
                }
            } catch {
                if ($completedRequest.Action -eq 'ReadOnlySshPreflight') {
                    & $completionAddOperationLog -Operation $completedRequest.Operation `
                        -Status '背景工作資源清理失敗' -Output @(
                            '清理失敗；例外訊息與堆疊未記錄。'
                        )
                } else {
                    & $completionAddOperationLog -Operation $completedRequest.Operation `
                        -Status '背景工作資源清理失敗' -Output @(
                            (& $completionProtectSensitiveText -Text $_.Exception.Message)
                        )
                }
            } finally {
                $workContext.PowerShell = $null
                $workContext.Runspace = $null
                $workContext.AsyncResult = $null
                $workContext.CompletionHandler = $null
                $completedState.IsBusy = $false
                if (-not $unconfirmedProcess) {
                    $completedState.ActiveOperation = $null
                    & $completionSetOperationButtonsEnabled -Enabled $true
                } else {
                    & $completionSetOperationButtonsEnabled -Enabled $false
                }
            }
            if ($closeAfterCompletion -and -not $unconfirmedProcess) {
                $completedState.AllowClose = $true
                $completedUi.Form.Close()
            }
        }
        if ($nextPush -and -not $closeAfterCompletion) {
            & $completionStartBackgroundOperation -Operation '推送到 GitHub（git push origin master）' `
                -Action 'PushMaster' -ExpectedHeadSha $nextPush.ExpectedHeadSha `
                -ExpectedRemoteSha $nextPush.ExpectedRemoteSha
        }
    }.GetNewClosure()
    $context.CompletionHandler = $completionHandler
    try {
        $runspace = [System.Management.Automation.Runspaces.RunspaceFactory]::CreateRunspace()
        $context.Runspace = $runspace
        $runspace.Open()
        $powershell = [System.Management.Automation.PowerShell]::Create()
        $context.PowerShell = $powershell
        $powershell.Runspace = $runspace
        [void]$powershell.AddScript($workerScript)
        [void]$powershell.AddArgument($script:ProjectRoot)
        [void]$powershell.AddArgument($script:GitPath)
        [void]$powershell.AddArgument($request)
        $context.AsyncResult = $powershell.BeginInvoke()
    } catch {
        $script:OperationState.IsBusy = $false
        $script:OperationState.ActiveOperation = $null
        Set-OperationButtonsEnabled -Enabled $true
        $script:Controls.ActivityLabel.Text = "$Operation：無法啟動"
        Add-OperationLog -Operation $Operation -Status '無法啟動' -Output @(
            (Protect-SensitiveText -Text $_.Exception.Message)
        )
        if ($context.PowerShell) {
            $context.PowerShell.Dispose()
            $context.PowerShell = $null
        }
        if ($context.Runspace) {
            if ($context.Runspace.RunspaceStateInfo.State -eq [System.Management.Automation.Runspaces.RunspaceState]::Opened) {
                $context.Runspace.Close()
            }
            $context.Runspace.Dispose()
            $context.Runspace = $null
        }
    }
}

function New-InfoRow {
    param(
        [Parameter(Mandatory = $true)][System.Windows.Forms.TableLayoutPanel]$Table,
        [Parameter(Mandatory = $true)][string]$Label,
        [Parameter(Mandatory = $true)][string]$Value,
        [Parameter(Mandatory = $true)][string]$ControlName
    )

    $row = $Table.RowCount
    $Table.RowCount++
    $Table.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::AutoSize)))
    $labelControl = New-Object System.Windows.Forms.Label
    $labelControl.Text = $Label
    $labelControl.AutoSize = $true
    $labelControl.Margin = New-Object System.Windows.Forms.Padding(4, 7, 8, 5)
    $valueControl = New-Object System.Windows.Forms.Label
    $valueControl.Text = $Value
    $valueControl.AutoSize = $true
    $valueControl.MaximumSize = New-Object System.Drawing.Size(470, 0)
    $valueControl.Margin = New-Object System.Windows.Forms.Padding(4, 7, 4, 5)
    $Table.Controls.Add($labelControl, 0, $row)
    $Table.Controls.Add($valueControl, 1, $row)
    $script:Controls[$ControlName] = $valueControl
    return $valueControl
}

function New-ActionButton {
    param(
        [Parameter(Mandatory = $true)][string]$Text,
        [bool]$Enabled = $true
    )
    $button = New-Object System.Windows.Forms.Button
    $button.Text = $Text
    $button.AutoSize = $true
    $button.Enabled = $Enabled
    $button.Margin = New-Object System.Windows.Forms.Padding(4, 8, 8, 4)
    return $button
}

$form = New-Object System.Windows.Forms.Form
$form.Text = '寵物3.0｜開發、佈署與伺服器重建中心'
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
$form.Size = New-Object System.Drawing.Size(1120, 820)
$form.MinimumSize = New-Object System.Drawing.Size(900, 680)
$form.Font = New-Object System.Drawing.Font('Microsoft JhengHei UI', 9)
$script:Controls.Form = $form

$rootLayout = New-Object System.Windows.Forms.TableLayoutPanel
$rootLayout.Dock = [System.Windows.Forms.DockStyle]::Fill
$rootLayout.Padding = New-Object System.Windows.Forms.Padding(12)
$rootLayout.ColumnCount = 2
$rootLayout.RowCount = 3
$rootLayout.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle([System.Windows.Forms.SizeType]::Percent, 50)))
$rootLayout.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle([System.Windows.Forms.SizeType]::Percent, 50)))
$rootLayout.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Percent, 34)))
$rootLayout.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Percent, 34)))
$rootLayout.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Percent, 32)))
$form.Controls.Add($rootLayout)

$localGroup = New-Object System.Windows.Forms.GroupBox
$localGroup.Text = '1. 本機開發'
$localGroup.Dock = [System.Windows.Forms.DockStyle]::Fill
$localTable = New-Object System.Windows.Forms.TableLayoutPanel
$localTable.Dock = [System.Windows.Forms.DockStyle]::Fill
$localTable.AutoScroll = $true
$localTable.ColumnCount = 2
$localTable.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle([System.Windows.Forms.SizeType]::AutoSize)))
$localTable.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle([System.Windows.Forms.SizeType]::Percent, 100)))
[void](New-InfoRow -Table $localTable -Label '專案路徑' -Value $script:ProjectRoot -ControlName 'ProjectPathValue')
[void](New-InfoRow -Table $localTable -Label 'Git 分支' -Value '尚未檢查' -ControlName 'BranchValue')
[void](New-InfoRow -Table $localTable -Label 'HEAD SHA' -Value '尚未檢查' -ControlName 'HeadValue')
[void](New-InfoRow -Table $localTable -Label '工作樹' -Value '尚未檢查' -ControlName 'WorktreeValue')
$localButtons = New-Object System.Windows.Forms.FlowLayoutPanel
$localButtons.AutoSize = $true
$localButtons.Dock = [System.Windows.Forms.DockStyle]::Fill
$script:Controls.RefreshButton = New-ActionButton -Text '重新檢查狀態'
$script:Controls.TestButton = New-ActionButton -Text '執行必要測試'
$localButtons.Controls.Add($script:Controls.RefreshButton)
$localButtons.Controls.Add($script:Controls.TestButton)
$localTable.Controls.Add($localButtons, 0, $localTable.RowCount)
$localTable.SetColumnSpan($localButtons, 2)
$localGroup.Controls.Add($localTable)
$rootLayout.Controls.Add($localGroup, 0, 0)

$githubGroup = New-Object System.Windows.Forms.GroupBox
$githubGroup.Text = '2. GitHub 版本'
$githubGroup.Dock = [System.Windows.Forms.DockStyle]::Fill
$githubTable = New-Object System.Windows.Forms.TableLayoutPanel
$githubTable.Dock = [System.Windows.Forms.DockStyle]::Fill
$githubTable.AutoScroll = $true
$githubTable.ColumnCount = 2
$githubTable.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle([System.Windows.Forms.SizeType]::AutoSize)))
$githubTable.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle([System.Windows.Forms.SizeType]::Percent, 100)))
[void](New-InfoRow -Table $githubTable -Label 'origin/master SHA' -Value '尚未查詢' -ControlName 'GitHubShaValue')
[void](New-InfoRow -Table $githubTable -Label '與本機 HEAD' -Value '尚未比較' -ControlName 'GitHubCompareValue')
$script:Controls.GitHubButton = New-ActionButton -Text '檢查 GitHub master'
$githubTable.Controls.Add($script:Controls.GitHubButton, 0, $githubTable.RowCount)
$githubTable.SetColumnSpan($script:Controls.GitHubButton, 2)
$script:Controls.PushButton = New-ActionButton -Text '推送到 GitHub'
$githubTable.Controls.Add($script:Controls.PushButton, 0, $githubTable.RowCount + 1)
$githubTable.SetColumnSpan($script:Controls.PushButton, 2)
$githubGroup.Controls.Add($githubTable)
$rootLayout.Controls.Add($githubGroup, 1, 0)

$productionGroup = New-Object System.Windows.Forms.GroupBox
$productionGroup.Text = '3. Production 部署'
$productionGroup.Dock = [System.Windows.Forms.DockStyle]::Fill
$productionTable = New-Object System.Windows.Forms.TableLayoutPanel
$productionTable.Dock = [System.Windows.Forms.DockStyle]::Fill
$productionTable.AutoScroll = $true
$productionTable.ColumnCount = 2
$productionTable.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle([System.Windows.Forms.SizeType]::AutoSize)))
$productionTable.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle([System.Windows.Forms.SizeType]::Percent, 100)))
[void](New-InfoRow -Table $productionTable -Label '目前已知 SHA' -Value $script:KnownProductionSha -ControlName 'ProductionShaValue')
[void](New-InfoRow -Table $productionTable -Label '即時狀態' -Value '尚未即時確認' -ControlName 'ProductionLiveValue')
$targetLabel = New-Object System.Windows.Forms.Label
$targetLabel.Text = '目標 SHA'
$targetLabel.AutoSize = $true
$targetLabel.Margin = New-Object System.Windows.Forms.Padding(4, 8, 8, 5)
$targetInput = New-Object System.Windows.Forms.TextBox
$targetInput.Dock = [System.Windows.Forms.DockStyle]::Fill
$targetInput.ReadOnly = $false
$targetInput.Text = ''
$targetInput.Margin = New-Object System.Windows.Forms.Padding(4, 5, 4, 5)
$productionTable.Controls.Add($targetLabel, 0, $productionTable.RowCount)
$productionTable.Controls.Add($targetInput, 1, $productionTable.RowCount)
$targetInput.AccessibleDescription = '本階段不會使用或傳送此 SHA。'
$deployButton = New-ActionButton -Text '部署（第二階段啟用）' -Enabled $false
$productionTable.Controls.Add($deployButton, 0, $productionTable.RowCount + 1)
$productionTable.SetColumnSpan($deployButton, 2)
$script:Controls.DeploymentPreflightButton = New-ActionButton -Text '部署前檢查'
$productionTable.Controls.Add($script:Controls.DeploymentPreflightButton, 0, $productionTable.RowCount + 2)
$productionTable.SetColumnSpan($script:Controls.DeploymentPreflightButton, 2)
$productionGroup.Controls.Add($productionTable)
$rootLayout.Controls.Add($productionGroup, 0, 1)

$serverGroup = New-Object System.Windows.Forms.GroupBox
$serverGroup.Text = '4. 伺服器管理'
$serverGroup.Dock = [System.Windows.Forms.DockStyle]::Fill
$serverTable = New-Object System.Windows.Forms.TableLayoutPanel
$serverTable.Dock = [System.Windows.Forms.DockStyle]::Fill
$serverTable.AutoScroll = $true
$serverTable.ColumnCount = 2
$serverTable.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle([System.Windows.Forms.SizeType]::AutoSize)))
$serverTable.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle([System.Windows.Forms.SizeType]::Percent, 100)))
[void](New-InfoRow -Table $serverTable -Label '備份' -Value '正式操作待目的地驗證' -ControlName 'BackupStateValue')
[void](New-InfoRow -Table $serverTable -Label '備份目的地' -Value '未驗證；正式備份禁止執行' -ControlName 'BackupDestinationValue')
[void](New-InfoRow -Table $serverTable -Label '還原' -Value '已有 deploy/restore.sh；未接線' -ControlName 'RestoreStateValue')
[void](New-InfoRow -Table $serverTable -Label '伺服器重建' -Value '尚無完整重建流程' -ControlName 'RebuildStateValue')
$serverButtons = New-Object System.Windows.Forms.FlowLayoutPanel
$serverButtons.AutoSize = $true
$serverButtons.Dock = [System.Windows.Forms.DockStyle]::Fill
$backupButton = New-ActionButton -Text '備份（目的地未驗證）'
$script:Controls.BackupButton = $backupButton
$restoreButton = New-ActionButton -Text '還原（尚未接線）' -Enabled $false
$rebuildButton = New-ActionButton -Text '重建（尚未接線）' -Enabled $false
$serverButtons.Controls.Add($backupButton)
$serverButtons.Controls.Add($restoreButton)
$serverButtons.Controls.Add($rebuildButton)
$serverTable.Controls.Add($serverButtons, 0, $serverTable.RowCount)
$serverTable.SetColumnSpan($serverButtons, 2)
$serverGroup.Controls.Add($serverTable)
$rootLayout.Controls.Add($serverGroup, 1, 1)

$logGroup = New-Object System.Windows.Forms.GroupBox
$logGroup.Text = '操作紀錄'
$logGroup.Dock = [System.Windows.Forms.DockStyle]::Fill
$logLayout = New-Object System.Windows.Forms.TableLayoutPanel
$logLayout.Dock = [System.Windows.Forms.DockStyle]::Fill
$logLayout.ColumnCount = 1
$logLayout.RowCount = 2
$logLayout.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Percent, 100)))
$logLayout.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::AutoSize)))
$script:Controls.LogBox = New-Object System.Windows.Forms.TextBox
$script:Controls.LogBox.Multiline = $true
$script:Controls.LogBox.ReadOnly = $true
$script:Controls.LogBox.ScrollBars = [System.Windows.Forms.ScrollBars]::Vertical
$script:Controls.LogBox.WordWrap = $false
$script:Controls.LogBox.Dock = [System.Windows.Forms.DockStyle]::Fill
$script:Controls.LogBox.Font = New-Object System.Drawing.Font('Consolas', 9)
$logLayout.Controls.Add($script:Controls.LogBox, 0, 0)
$script:Controls.ActivityLabel = New-Object System.Windows.Forms.Label
$script:Controls.ActivityLabel.Text = '待命'
$script:Controls.ActivityLabel.AutoSize = $true
$script:Controls.ActivityLabel.Dock = [System.Windows.Forms.DockStyle]::Fill
$script:Controls.ActivityLabel.Padding = New-Object System.Windows.Forms.Padding(4, 6, 4, 2)
$logLayout.Controls.Add($script:Controls.ActivityLabel, 0, 1)
$logGroup.Controls.Add($logLayout)
$rootLayout.Controls.Add($logGroup, 0, 2)
$rootLayout.SetColumnSpan($logGroup, 2)

$script:Controls.RefreshButton.Add_Click({
    Start-BackgroundOperation -Operation '重新檢查本機狀態' -Action 'LocalStatus'
})
$script:Controls.TestButton.Add_Click({
    Start-BackgroundOperation -Operation '執行必要測試（npm --prefix testing test）' -Action 'Tests'
})
$script:Controls.GitHubButton.Add_Click({
    Start-BackgroundOperation -Operation '檢查 GitHub master（git ls-remote）' -Action 'GitHubMaster'
})
$script:Controls.PushButton.Add_Click({
    Start-BackgroundOperation -Operation '推送到 GitHub' -Action 'PushMasterPreflight'
})
$script:Controls.BackupButton.Add_Click({
    Request-BackupOperation
})
$script:Controls.DeploymentPreflightButton.Add_Click({
    $script:Controls.BranchValue.Text = '檢查中…'
    $script:Controls.HeadValue.Text = '檢查中…'
    $script:Controls.WorktreeValue.Text = '檢查中…'
    $script:Controls.GitHubShaValue.Text = '檢查中…'
    $script:Controls.GitHubCompareValue.Text = '檢查中…'
    $script:Controls.WorktreeValue.ForeColor = [System.Drawing.SystemColors]::ControlText
    Start-BackgroundOperation -Operation '部署前檢查（唯讀）' -Action 'DeploymentPreflight'
})

$form.Add_Shown({
    Start-BackgroundOperation -Operation '啟動時檢查本機 Git 狀態' -Action 'LocalStatus'
})

$form.Add_FormClosing({
    param($sender, $eventArgs)
    if ($script:OperationState.AllowClose) {
        return
    }
    if ($script:OperationState.IsBusy) {
        $eventArgs.Cancel = $true
        $choice = [System.Windows.Forms.MessageBox]::Show(
            $script:Controls.Form,
            "「$($script:OperationState.ActiveOperation.Operation)」仍在執行。`r`n`r`n是：取消目前操作並在確認停止後關閉`r`n否：繼續等待",
            '操作仍在執行',
            [System.Windows.Forms.MessageBoxButtons]::YesNo,
            [System.Windows.Forms.MessageBoxIcon]::Warning,
            [System.Windows.Forms.MessageBoxDefaultButton]::Button2
        )
        if ($choice -eq [System.Windows.Forms.DialogResult]::Yes) {
            $script:OperationState.ActiveOperation.CloseWhenDone = $true
            $script:OperationState.ActiveOperation.CancelRequested = $true
            $script:Controls.ActivityLabel.Text = "正在取消並停止本機程序：$($script:OperationState.ActiveOperation.Stage)"
        } else {
            $script:Controls.ActivityLabel.Text = "繼續等待：$($script:OperationState.ActiveOperation.Operation)"
        }
        return
    }

    $context = $script:OperationState.ActiveOperation
    if (-not $context -or -not $context.Process) {
        return
    }

    $eventArgs.Cancel = $true
    $choice = [System.Windows.Forms.MessageBox]::Show(
        $script:Controls.Form,
        "先前操作的本機程序尚未確認停止。`r`n`r`n是：再次嘗試停止該程序樹並關閉`r`n否：繼續等待",
        '本機程序停止狀態未確認',
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Error,
        [System.Windows.Forms.MessageBoxDefaultButton]::Button2
    )
    if ($choice -ne [System.Windows.Forms.DialogResult]::Yes) {
        $script:Controls.ActivityLabel.Text = '繼續等待本機程序結束；目前不會回報取消成功'
        return
    }

    $stopped = Stop-StartedProcessTree -Process $context.Process -Context $context
    if ($stopped) {
        $readersDrained = $true
        if ($context.StdoutTask) {
            $readersDrained = $context.StdoutTask.Wait(3000) -and $readersDrained
        }
        if ($context.StderrTask) {
            $readersDrained = $context.StderrTask.Wait(3000) -and $readersDrained
        }
        if ($readersDrained) {
            $context.Process.Dispose()
            $context.Process = $null
            $context.StdoutTask = $null
            $context.StderrTask = $null
            $script:OperationState.ActiveOperation = $null
            $script:OperationState.AllowClose = $true
            $eventArgs.Cancel = $false
            Add-OperationLog -Operation $context.Operation -Status '已取消並確認停止' `
                -Output @('已確認本機程序樹停止且輸出管道已排空。')
            return
        }
    }

    [System.Windows.Forms.MessageBox]::Show(
        $script:Controls.Form,
        '無法確認本機程序樹及其輸出管道均已停止。視窗保持開啟；可選擇繼續等待，或再次嘗試取消並關閉。',
        '停止未確認',
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Error
    ) | Out-Null
    $script:Controls.ActivityLabel.Text = '停止狀態未確認；可再次選擇等待或重試關閉'
})

$processMonitor = New-Object System.Windows.Forms.Timer
$processMonitor.Interval = 1000
$processMonitor.add_Tick({
    $context = $script:OperationState.ActiveOperation
    if ($context -and $script:OperationState.IsBusy -and
        $context.AsyncResult -and -not $context.CompletionHandled -and
        $context.AsyncResult.IsCompleted) {
        $context.CompletionHandled = $true
        $result = $null
        $workerError = $null
        try {
            $asyncOutput = $context.PowerShell.EndInvoke($context.AsyncResult)
            if ($context.PowerShell.Streams.Error.Count -gt 0) {
                $workerError = $context.PowerShell.Streams.Error[0].Exception
            }
            if ($asyncOutput.Count -eq 1) {
                $result = $asyncOutput[0]
            } elseif ($asyncOutput.Count -gt 1) {
                $result = $asyncOutput.ToArray()
            }
        } catch {
            $workerError = $_.Exception
            if ($null -eq $workerError) {
                $workerError = $_
            }
        }
        $completionArgs = [pscustomobject]@{
            Error = $workerError
            Result = $result
        }
        & $context.CompletionHandler $completionArgs
        return
    }
    if (-not $context -or -not $context.Process -or $script:OperationState.IsBusy) {
        return
    }
    try {
        if (-not $context.Process.HasExited) {
            return
        }
        $stdoutDrained = -not $context.StdoutTask -or $context.StdoutTask.Wait(1000)
        $stderrDrained = -not $context.StderrTask -or $context.StderrTask.Wait(1000)
        if (-not ($stdoutDrained -and $stderrDrained)) {
            $script:Controls.ActivityLabel.Text = '本機程序已結束，但輸出尚未排空；不會回報取消成功'
            return
        }
        $context.Process.Dispose()
        $context.Process = $null
        $context.StdoutTask = $null
        $context.StderrTask = $null
        $script:OperationState.ActiveOperation = $null
        Set-OperationButtonsEnabled -Enabled $true
        Add-OperationLog -Operation $context.Operation -Status '本機程序已結束；操作結果未確認' `
            -Output @('程序已結束且輸出管道已排空；由於先前停止未確認，不將原操作視為成功。')
        $script:Controls.ActivityLabel.Text = '本機程序已結束；原操作結果未確認'
        if ($context.CloseWhenDone) {
            $script:OperationState.AllowClose = $true
            $script:Controls.Form.Close()
        }
    } catch {
        $script:Controls.ActivityLabel.Text = '本機程序狀態檢查失敗；停止仍未確認'
        Add-OperationLog -Operation $context.Operation -Status '停止狀態未確認' `
            -Output @((Protect-SensitiveText -Text $_.Exception.Message))
    }
})
$processMonitor.Start()

[void]$form.ShowDialog()
$processMonitor.Stop()
$processMonitor.Dispose()
