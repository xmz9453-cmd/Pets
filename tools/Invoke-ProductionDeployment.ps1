[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-fA-F]{40}$')]
    [string]$ExpectedCommit
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$powerShellPath = Join-Path $PSHOME 'powershell.exe'
$deployScriptPath = Join-Path $projectRoot 'deploy-production.ps1'
$exitCode = 1
$deploymentProcess = $null

try {
    if (-not (Test-Path -LiteralPath $powerShellPath -PathType Leaf)) {
        throw "找不到 Windows PowerShell：$powerShellPath"
    }
    if (-not (Test-Path -LiteralPath $deployScriptPath -PathType Leaf)) {
        throw "找不到既有 Production 部署入口：$deployScriptPath"
    }

    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $powerShellPath
    $startInfo.Arguments = '-NoProfile -File "{0}" -ExpectedCommit {1}' -f $deployScriptPath, $ExpectedCommit
    $startInfo.WorkingDirectory = $projectRoot
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $false
    $startInfo.RedirectStandardInput = $false
    $startInfo.RedirectStandardOutput = $false
    $startInfo.RedirectStandardError = $false

    $deploymentProcess = [System.Diagnostics.Process]::Start($startInfo)
    if ($null -eq $deploymentProcess) {
        throw 'Windows PowerShell 未回傳可監看的部署程序。'
    }

    $deploymentProcess.WaitForExit()
    $exitCode = $deploymentProcess.ExitCode
    Write-Host ''
    Write-Host "deploy-production.ps1 已結束，退出碼：$exitCode。"
} catch {
    [Console]::Error.WriteLine("Production 部署啟動器失敗：$($_.Exception.Message)")
    $exitCode = 1
} finally {
    if ($deploymentProcess) {
        $deploymentProcess.Dispose()
    }
}

exit $exitCode
