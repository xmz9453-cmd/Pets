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
$script:ProductionSshHost = '175.183.34.91'
$script:ProductionSshUser = 'zhe'
$script:SshTarget = "$($script:ProductionSshUser)@$($script:ProductionSshHost)"
$script:ExpectedProductionHostFingerprint = 'SHA256:YWPE7arZLZ8/67Ta6hLRdBj73eNdk24klgUo+rRBm6s'
$script:SshNetCacheRoot = Join-Path $env:LOCALAPPDATA 'Pets-Operations-Center\sshnet-2026.0.0'
$script:SshNetAssembly = $null
$script:ProductionRoot = '/home/zhe/pets'
$script:BackupScript = '/home/zhe/pets/deploy/backup.sh'
$script:RestoreScript = '/home/zhe/pets/deploy/restore.sh'
$script:RestoreBackupDirectory = '/home/zhe/pets-backups'
$script:GitPath = $null
$script:Controls = @{}
$script:OperationState = @{
    IsBusy = $false
    LocalHeadSha = $null
    GitHubMasterSha = $null
    ActiveOperation = $null
    AllowClose = $false
    VerifiedBackupDirectory = $null
    VerifiedBackupHost = $null
    VerifiedBackupUser = $null
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

function Initialize-SshNetAssemblies {
    $packageRoot = Join-Path $script:SshNetCacheRoot 'packages'
    $assemblyRelativePaths = @(
        'System.Runtime.CompilerServices.Unsafe.6.1.2\lib\net462\System.Runtime.CompilerServices.Unsafe.dll',
        'System.Buffers.4.6.1\lib\net462\System.Buffers.dll',
        'System.Numerics.Vectors.4.6.1\lib\net462\System.Numerics.Vectors.dll',
        'System.Memory.4.6.3\lib\net462\System.Memory.dll',
        'System.Threading.Tasks.Extensions.4.5.4\lib\net461\System.Threading.Tasks.Extensions.dll',
        'System.Formats.Asn1.10.0.10\lib\net462\System.Formats.Asn1.dll',
        'Microsoft.Bcl.AsyncInterfaces.8.0.0\lib\net462\Microsoft.Bcl.AsyncInterfaces.dll',
        'Microsoft.Extensions.DependencyInjection.Abstractions.8.0.2\lib\net462\Microsoft.Extensions.DependencyInjection.Abstractions.dll',
        'Microsoft.Extensions.Logging.Abstractions.8.0.3\lib\net462\Microsoft.Extensions.Logging.Abstractions.dll',
        'BouncyCastle.Cryptography.2.7.0\lib\net461\BouncyCastle.Cryptography.dll',
        'Microsoft.Bcl.Cryptography.10.0.10\lib\net462\Microsoft.Bcl.Cryptography.dll',
        'SSH.NET.2026.0.0\lib\net462\Renci.SshNet.dll'
    )
    $assemblyPaths = @()
    foreach ($relativePath in $assemblyRelativePaths) {
        $assemblyPath = Join-Path $packageRoot $relativePath
        if (-not (Test-Path -LiteralPath $assemblyPath -PathType Leaf)) {
            throw "SSH.NET 2026.0.0 相依組件不存在：$relativePath"
        }
        $assemblyPaths += $assemblyPath
    }

    if (-not ('PetsOperations.SshAssemblyResolver' -as [type])) {
        Add-Type -TypeDefinition @'
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Security.Cryptography;

namespace PetsOperations
{
    public static class SshAssemblyResolver
    {
        private static readonly object Sync = new object();
        private static Dictionary<string, string> AssemblyPaths;
        private static HashSet<string> ReferencedIdentities;

        public static void Register(string[] paths)
        {
            var assemblyPaths = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            var identities = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var path in paths)
            {
                var name = AssemblyName.GetAssemblyName(path);
                if (assemblyPaths.ContainsKey(name.Name))
                    throw new InvalidOperationException("Duplicate SSH.NET dependency assembly: " + name.Name);
                assemblyPaths.Add(name.Name, Path.GetFullPath(path));
            }

            foreach (var path in paths)
            {
                var packageAssembly = Assembly.ReflectionOnlyLoadFrom(path);
                foreach (var reference in packageAssembly.GetReferencedAssemblies())
                {
                    string candidatePath;
                    if (!assemblyPaths.TryGetValue(reference.Name, out candidatePath))
                        continue;

                    var candidate = AssemblyName.GetAssemblyName(candidatePath);
                    var referenceToken = GetToken(reference);
                    if (referenceToken.Length == 0 || referenceToken != GetToken(candidate))
                        continue;
                    if (candidate.Version < reference.Version)
                        throw new InvalidOperationException(
                            "SSH.NET dependency version is older than its package reference: " +
                            reference.FullName + " -> " + candidate.FullName);

                    identities.Add(GetIdentityKey(reference));
                }
            }

            lock (Sync)
            {
                if (AssemblyPaths != null)
                {
                    foreach (var entry in assemblyPaths)
                    {
                        string registeredPath;
                        if (!AssemblyPaths.TryGetValue(entry.Key, out registeredPath) ||
                            !String.Equals(registeredPath, entry.Value, StringComparison.OrdinalIgnoreCase))
                            throw new InvalidOperationException("SSH.NET assembly resolver was already registered for a different cache.");
                    }
                    return;
                }

                AssemblyPaths = assemblyPaths;
                ReferencedIdentities = identities;
                AppDomain.CurrentDomain.AssemblyResolve += ResolveAssembly;
            }
        }

        private static Assembly ResolveAssembly(object sender, ResolveEventArgs eventArgs)
        {
            var requested = new AssemblyName(eventArgs.Name);
            if (!ReferencedIdentities.Contains(GetIdentityKey(requested)))
                return null;

            string path;
            if (!AssemblyPaths.TryGetValue(requested.Name, out path))
                return null;

            var expected = AssemblyName.GetAssemblyName(path);
            if (GetToken(requested) != GetToken(expected) || requested.Version > expected.Version)
                return null;

            foreach (var loaded in AppDomain.CurrentDomain.GetAssemblies())
            {
                if (!loaded.IsDynamic &&
                    String.Equals(loaded.FullName, expected.FullName, StringComparison.OrdinalIgnoreCase) &&
                    String.Equals(loaded.Location, path, StringComparison.OrdinalIgnoreCase))
                    return loaded;
            }

            return Assembly.LoadFrom(path);
        }

        private static string GetIdentityKey(AssemblyName name)
        {
            return name.Name + "|" + name.Version + "|" + GetToken(name) + "|" + (name.CultureName ?? String.Empty);
        }

        private static string GetToken(AssemblyName name)
        {
            var token = name.GetPublicKeyToken();
            return token == null ? String.Empty : BitConverter.ToString(token).Replace("-", String.Empty);
        }
    }

    public sealed class SshHostKeyVerifier
    {
        private readonly IDictionary context;
        private readonly string expectedFingerprint;

        public SshHostKeyVerifier(IDictionary context, string expectedFingerprint)
        {
            this.context = context;
            this.expectedFingerprint = expectedFingerprint;
        }

        public void OnHostKeyReceived(object sender, EventArgs eventArgs)
        {
            context["SshDiagnosticStage"] = "HostKeyVerification";
            var eventType = eventArgs.GetType();
            var hostKeyProperty = eventType.GetProperty("HostKey");
            var canTrustProperty = eventType.GetProperty("CanTrust");
            if (hostKeyProperty == null || canTrustProperty == null)
                throw new InvalidOperationException("SSH.NET host-key event arguments are missing required properties.");

            var hostKey = (byte[])hostKeyProperty.GetValue(eventArgs, null);
            string actualFingerprint;
            using (var sha256 = SHA256.Create())
            {
                actualFingerprint = "SHA256:" +
                    Convert.ToBase64String(sha256.ComputeHash(hostKey)).TrimEnd('=');
            }

            var canTrust = String.Equals(actualFingerprint, expectedFingerprint, StringComparison.Ordinal);
            canTrustProperty.SetValue(eventArgs, canTrust, null);
            context["HostKeyVerified"] = canTrust;
            context["HostKeyRejected"] = !canTrust;
            if (canTrust)
                context["SshDiagnosticStage"] = "Other";
        }
    }
}
'@
    }
    [PetsOperations.SshAssemblyResolver]::Register([string[]]$assemblyPaths)

    $sshAssembly = $null
    foreach ($assemblyPath in $assemblyPaths) {
        $expectedName = [System.Reflection.AssemblyName]::GetAssemblyName($assemblyPath)
        $assembly = [System.Reflection.Assembly]::LoadFrom($assemblyPath)
        if ($assembly.GetName().FullName -cne $expectedName.FullName -or
            [System.IO.Path]::GetFullPath($assembly.Location) -ine [System.IO.Path]::GetFullPath($assemblyPath)) {
            throw "SSH.NET 相依組件載入身分或路徑衝突：$($expectedName.FullName)"
        }
        if ($assembly.GetName().Name -eq 'Renci.SshNet') {
            $sshAssembly = $assembly
        }
    }
    if (-not $sshAssembly) {
        throw '無法載入 SSH.NET 2026.0.0 組件。'
    }
    foreach ($typeName in @(
        'Renci.SshNet.SshClient',
        'Renci.SshNet.PasswordAuthenticationMethod',
        'Renci.SshNet.Common.HostKeyEventArgs'
    )) {
        if (-not $sshAssembly.GetType($typeName, $false)) {
            throw "SSH.NET 組件缺少必要類型：$typeName"
        }
    }
    return $sshAssembly
}

$script:SshNetAssembly = Initialize-SshNetAssemblies

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

function Get-PreflightStderrSummary {
    param([AllowEmptyString()][string]$Text)

    if ([string]::IsNullOrWhiteSpace($Text)) {
        return '無'
    }

    $signatures = @()
    if ($Text -match '(?i)\bpermission denied\b') { $signatures += 'PermissionDenied' }
    if ($Text -match '(?i)\bno such file or directory\b') { $signatures += 'MissingPath' }
    if ($Text -match '(?i)\bnot a directory\b') { $signatures += 'NotDirectory' }
    if ($Text -match '(?i)\bread-only file system\b') { $signatures += 'ReadOnlyFileSystem' }
    if ($Text -match '(?i)\boperation not permitted\b') { $signatures += 'OperationNotPermitted' }
    if ($Text -match '(?i)\bdisk quota exceeded\b') { $signatures += 'DiskQuotaExceeded' }
    if ($Text -match '(?i)\binput/output error\b') { $signatures += 'InputOutputError' }
    if ($Text -match '(?i)\btoo many levels of symbolic links\b') { $signatures += 'SymlinkLoop' }
    if ($Text -match '(?i)\b(connection timed out|operation timed out)\b') { $signatures += 'TimedOut' }
    if ($Text -match '(?i)\b(connection refused|could not resolve hostname|name or service not known)\b') {
        $signatures += 'ConnectionFailure'
    }

    if ($signatures.Count -eq 0) {
        return '有；內容已抑制，沒有符合的診斷特徵。'
    }
    return "有；辨識特徵：$($signatures -join ', ')；原文已抑制。"
}

function Get-PreflightExceptionType {
    param([Parameter(Mandatory = $true)][System.Exception]$Exception)

    try {
        $typeName = $Exception.GetType().FullName
        if ([string]::IsNullOrEmpty($typeName) -or $typeName.Length -gt 128 -or
            $typeName -cnotmatch '\A[A-Za-z_][A-Za-z0-9_.+`]{0,127}\z') {
            return 'OtherException'
        }
        return $typeName
    } catch {
        return 'OtherException'
    }
}

function Get-PreflightInnerExceptionTypes {
    param([Parameter(Mandatory = $true)][System.Exception]$Exception)

    $typeNames = New-Object System.Collections.Generic.List[string]
    $currentException = $Exception
    for ($depth = 1; $depth -le 3; $depth++) {
        try {
            $currentException = $currentException.InnerException
        } catch {
            return '讀取失敗'
        }
        if ($null -eq $currentException) {
            break
        }
        $typeNames.Add((Get-PreflightExceptionType -Exception $currentException))
    }

    if ($typeNames.Count -eq 0) {
        return '無內層例外'
    }
    return $typeNames -join ' -> '
}

function Get-PreflightSshExceptionCategory {
    param([Parameter(Mandatory = $true)][System.Exception]$Exception)

    $currentException = $Exception
    for ($depth = 0; $depth -le 3; $depth++) {
        try {
            if ($null -eq $currentException) {
                return 'NotApplicable'
            }
            $exceptionType = $currentException.GetType()
            $isSshException = $false
            for ($typeDepth = 0; $typeDepth -lt 8 -and $null -ne $exceptionType; $typeDepth++) {
                if ($exceptionType.FullName -ceq 'Renci.SshNet.Common.SshException') {
                    $isSshException = $true
                    break
                }
                $exceptionType = $exceptionType.BaseType
            }
            if ($isSshException) {
                $message = $currentException.Message
                if ($currentException.GetType().FullName -ceq 'Renci.SshNet.Common.SshException' -and
                    $message -cmatch '\AFailed to open a channel after [0-9]+ attempts\.\z') {
                    return 'ChannelOpenFailed'
                }
                if ($message -ceq 'Client is not connected.') {
                    return 'ConnectionLost'
                }
                if ($message -ceq 'Operation has timed out.') {
                    return 'Timeout'
                }
                return 'Unknown'
            }
            $currentException = $currentException.InnerException
        } catch {
            return 'Unknown'
        }
    }
    if ($null -eq $currentException) {
        return 'NotApplicable'
    }
    return 'Unknown'
}

function Clear-SshCredential {
    param([System.Security.SecureString]$SecurePassword)

    if ($null -ne $SecurePassword) {
        try {
            $SecurePassword.Clear()
        } finally {
            $SecurePassword.Dispose()
        }
    }
}

function ConvertTo-PosixShellSingleQuotedString {
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$Value
    )

    return "'" + $Value.Replace("'", "'\''") + "'"
}

function Test-RestoreBundlePath {
    param([AllowEmptyString()][string]$Path)

    return $Path -cmatch '\A/home/zhe/pets-backups/pets_backup_\d{8}_\d{6}\.tar\.gz\z'
}

function Show-RestoreBundleSelectionDialog {
    param([Parameter(Mandatory = $true)][string[]]$BundlePaths)

    if ($BundlePaths.Count -eq 0) {
        return $null
    }

    $dialog = New-Object System.Windows.Forms.Form
    $dialog.Text = '選擇遠端還原備份'
    $dialog.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterParent
    $dialog.Size = New-Object System.Drawing.Size(620, 360)
    $dialog.MinimumSize = New-Object System.Drawing.Size(520, 280)
    $dialog.ShowInTaskbar = $false

    $layout = New-Object System.Windows.Forms.TableLayoutPanel
    $layout.Dock = [System.Windows.Forms.DockStyle]::Fill
    $layout.ColumnCount = 1
    $layout.RowCount = 3
    $layout.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::AutoSize)))
    $layout.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Percent, 100)))
    $layout.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::AutoSize)))

    $label = New-Object System.Windows.Forms.Label
    $label.Text = '遠端備份目錄中的 bundle（由新到舊）：'
    $label.AutoSize = $true
    $label.Margin = New-Object System.Windows.Forms.Padding(8)
    $layout.Controls.Add($label, 0, 0)

    $list = New-Object System.Windows.Forms.ListBox
    $list.Dock = [System.Windows.Forms.DockStyle]::Fill
    $list.IntegralHeight = $false
    foreach ($bundlePath in $BundlePaths) {
        [void]$list.Items.Add($bundlePath)
    }
    if ($list.Items.Count -gt 0) {
        $list.SelectedIndex = 0
    }
    $layout.Controls.Add($list, 0, 1)

    $buttonPanel = New-Object System.Windows.Forms.FlowLayoutPanel
    $buttonPanel.FlowDirection = [System.Windows.Forms.FlowDirection]::RightToLeft
    $buttonPanel.Dock = [System.Windows.Forms.DockStyle]::Fill
    $buttonPanel.AutoSize = $true
    $selectButton = New-Object System.Windows.Forms.Button
    $selectButton.Text = '選擇'
    $selectButton.AutoSize = $true
    $selectButton.DialogResult = [System.Windows.Forms.DialogResult]::OK
    $cancelButton = New-Object System.Windows.Forms.Button
    $cancelButton.Text = '取消'
    $cancelButton.AutoSize = $true
    $cancelButton.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
    $buttonPanel.Controls.Add($selectButton)
    $buttonPanel.Controls.Add($cancelButton)
    $layout.Controls.Add($buttonPanel, 0, 2)
    $dialog.Controls.Add($layout)
    $dialog.AcceptButton = $selectButton
    $dialog.CancelButton = $cancelButton

    try {
        if ($dialog.ShowDialog($script:Controls.Form) -eq [System.Windows.Forms.DialogResult]::OK) {
            return [string]$list.SelectedItem
        }
        return $null
    } finally {
        $dialog.Dispose()
    }
}

function Request-ExactRestoreConfirmation {
    $dialog = New-Object System.Windows.Forms.Form
    $dialog.Text = '第二次確認還原'
    $dialog.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterParent
    $dialog.Size = New-Object System.Drawing.Size(470, 170)
    $dialog.MinimumSize = New-Object System.Drawing.Size(430, 160)
    $dialog.ShowInTaskbar = $false

    $layout = New-Object System.Windows.Forms.TableLayoutPanel
    $layout.Dock = [System.Windows.Forms.DockStyle]::Fill
    $layout.ColumnCount = 1
    $layout.RowCount = 3
    $layout.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::AutoSize)))
    $layout.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::AutoSize)))
    $layout.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::AutoSize)))

    $label = New-Object System.Windows.Forms.Label
    $label.Text = "請輸入 RESTORE。此人工輸入只會作為標準輸入交給 restore.sh；腳本仍會先執行預檢，並自行要求精確確認。"
    $label.AutoSize = $true
    $label.MaximumSize = New-Object System.Drawing.Size(420, 0)
    $label.Margin = New-Object System.Windows.Forms.Padding(8)
    $layout.Controls.Add($label, 0, 0)

    $restoreTextBox = New-Object System.Windows.Forms.TextBox
    $restoreTextBox.Dock = [System.Windows.Forms.DockStyle]::Top
    $restoreTextBox.Margin = New-Object System.Windows.Forms.Padding(8)
    $layout.Controls.Add($restoreTextBox, 0, 1)

    $buttonPanel = New-Object System.Windows.Forms.FlowLayoutPanel
    $buttonPanel.FlowDirection = [System.Windows.Forms.FlowDirection]::RightToLeft
    $buttonPanel.Dock = [System.Windows.Forms.DockStyle]::Fill
    $buttonPanel.AutoSize = $true
    $confirmButton = New-Object System.Windows.Forms.Button
    $confirmButton.Text = '確認並啟動還原'
    $confirmButton.AutoSize = $true
    $confirmButton.DialogResult = [System.Windows.Forms.DialogResult]::OK
    $cancelButton = New-Object System.Windows.Forms.Button
    $cancelButton.Text = '取消'
    $cancelButton.AutoSize = $true
    $cancelButton.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
    $buttonPanel.Controls.Add($confirmButton)
    $buttonPanel.Controls.Add($cancelButton)
    $layout.Controls.Add($buttonPanel, 0, 2)
    $dialog.Controls.Add($layout)
    $dialog.AcceptButton = $confirmButton
    $dialog.CancelButton = $cancelButton

    try {
        if ($dialog.ShowDialog($script:Controls.Form) -eq [System.Windows.Forms.DialogResult]::OK) {
            return [string]$restoreTextBox.Text
        }
        return $null
    } finally {
        $dialog.Dispose()
    }
}

function Request-RestoreOperation {
    $script:Controls.RestoreStateValue.Text = '正在列舉遠端備份…'
    Start-BackgroundOperation -Operation '列舉正式環境還原備份（唯讀）' -Action 'RestoreList'
}

function Request-RestoreConfirmation {
    param(
        [Parameter(Mandatory = $true)][string]$BundlePath,
        [Parameter(Mandatory = $true)][string]$DatabaseName
    )

    if (-not (Test-RestoreBundlePath -Path $BundlePath)) {
        $script:Controls.RestoreStateValue.Text = '已阻擋：備份路徑或檔名無效'
        Add-OperationLog -Operation '正式環境還原' -Status '已阻擋；備份路徑或檔名無效' -Output @(
            '未建立背景工作或呼叫還原命令。'
        )
        return
    }

    $confirmation = [System.Windows.Forms.MessageBox]::Show(
        $script:Controls.Form,
        "目標環境：正式環境`r`n目標主機：$($script:SshTarget)`r`n遠端專案：$($script:ProductionRoot)`r`n目標資料庫：$DatabaseName（讀取遠端 .env；預設 psop_one）`r`n備份 bundle：$BundlePath`r`n`r`n警告：還原會取代資料庫及 Contract PDF。依部署文件，還原前必須先停止應用服務；restore.sh 不會代為停止服務。`r`n`r`n是否繼續至第二次 RESTORE 確認？",
        '確認正式環境還原',
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Warning,
        [System.Windows.Forms.MessageBoxDefaultButton]::Button2
    )
    if ($confirmation -ne [System.Windows.Forms.DialogResult]::Yes) {
        $script:Controls.RestoreStateValue.Text = '還原已取消'
        Add-OperationLog -Operation '正式環境還原' -Status '使用者取消；未建立還原工作或呼叫還原命令' -Output @(
            "目標資料庫：$DatabaseName",
            "備份 bundle：$BundlePath"
        )
        return
    }

    $servicesStoppedConfirmation = [System.Windows.Forms.MessageBox]::Show(
        $script:Controls.Form,
        "啟動還原前，請先停止以下兩個應用服務：`r`n- pets-backend.service`r`n- pets-frontend.service`r`n`r`n請確認上述兩個服務均已停止。是否確認兩個服務都已停止並繼續？",
        '確認應用服務已停止',
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Warning,
        [System.Windows.Forms.MessageBoxDefaultButton]::Button2
    )
    if ($servicesStoppedConfirmation -ne [System.Windows.Forms.DialogResult]::Yes) {
        $script:Controls.RestoreStateValue.Text = '還原已取消：未確認應用服務均已停止'
        Add-OperationLog -Operation '正式環境還原' `
            -Status '停服確認未通過；未建立還原工作或呼叫還原命令' -Output @(
                '使用者未確認 pets-backend.service 與 pets-frontend.service 均已停止。',
                "目標資料庫：$DatabaseName",
                "備份 bundle：$BundlePath"
            )
        return
    }

    $restoreConfirmation = Request-ExactRestoreConfirmation
    if ($restoreConfirmation -cne 'RESTORE') {
        $script:Controls.RestoreStateValue.Text = '還原已取消：未輸入精確 RESTORE'
        Add-OperationLog -Operation '正式環境還原' -Status '第二次確認取消或輸入不符；未建立還原工作或呼叫還原命令' -Output @(
            "目標資料庫：$DatabaseName",
            "備份 bundle：$BundlePath"
        )
        return
    }

    $script:Controls.RestoreStateValue.Text = '已確認；準備執行還原預檢'
    return [pscustomobject]@{
        BundlePath = $BundlePath
        Confirmation = $restoreConfirmation
        DatabaseName = $DatabaseName
    }
}

function New-VerifiedSshClient {
    param(
        [Parameter(Mandatory = $true)][string]$HostName,
        [Parameter(Mandatory = $true)][string]$Username,
        [Parameter(Mandatory = $true)][System.Security.SecureString]$SecurePassword,
        [Parameter(Mandatory = $true)][System.Reflection.Assembly]$SshAssembly,
        [Parameter(Mandatory = $true)][hashtable]$Context
    )

    $passwordPointer = [IntPtr]::Zero
    $password = $null
    try {
        $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
        $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
        $authenticationType = $SshAssembly.GetType('Renci.SshNet.PasswordAuthenticationMethod', $true)
        $authenticationConstructor = $authenticationType.GetConstructor([type[]]@([string], [string]))
        $authentication = $authenticationConstructor.Invoke([object[]]@($Username, $password))
        $Context.SshAuthentication = $authentication

        $authenticationMethods = [Array]::CreateInstance($authenticationType, 1)
        $authenticationMethods.SetValue($authentication, 0)
        $connectionInfoType = $SshAssembly.GetType('Renci.SshNet.ConnectionInfo', $true)
        $connectionInfoConstructor = $connectionInfoType.GetConstructor(
            [type[]]@([string], [int], [string], $authenticationType.MakeArrayType())
        )
        $connectionInfo = $connectionInfoConstructor.Invoke(
            [object[]]@($HostName, 22, $Username, $authenticationMethods)
        )
        $connectionInfo.Timeout = [TimeSpan]::FromSeconds(15)
        $connectionInfo.RetryAttempts = 1

        $clientType = $SshAssembly.GetType('Renci.SshNet.SshClient', $true)
        $clientConstructor = $clientType.GetConstructor([type[]]@($connectionInfoType))
        $client = $clientConstructor.Invoke([object[]]@($connectionInfo))
        $Context.SshClient = $client
        $Context.HostKeyVerified = $false
        $Context.HostKeyRejected = $false

        $expectedFingerprint = $script:ExpectedProductionHostFingerprint
        $hostKeyVerifier = [PetsOperations.SshHostKeyVerifier]::new($Context, $expectedFingerprint)
        $hostKeyEvent = $clientType.GetEvent('HostKeyReceived')
        if (-not $hostKeyEvent) {
            throw 'SSH.NET client does not expose the HostKeyReceived event.'
        }
        $hostKeyHandler = [System.Delegate]::CreateDelegate(
            $hostKeyEvent.EventHandlerType,
            $hostKeyVerifier,
            [PetsOperations.SshHostKeyVerifier].GetMethod('OnHostKeyReceived')
        )
        $hostKeyEvent.AddEventHandler($client, $hostKeyHandler)
        $Context.SshHostKeyVerifier = $hostKeyVerifier
        $Context.SshHostKeyHandler = $hostKeyHandler
        return $client
    } finally {
        if ($passwordPointer -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
        }
        $password = $null
    }
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
            } catch {
                return $false
            }
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
        [AllowEmptyString()][string]$StandardInputText,
        [switch]$MarkPushAttempted
    )

    $redirectStandardInput = $PSBoundParameters.ContainsKey('StandardInputText')
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
    $startInfo.RedirectStandardInput = $redirectStandardInput
    if ([string]::Equals($FilePath, $script:GitPath, [System.StringComparison]::OrdinalIgnoreCase)) {
        $startInfo.EnvironmentVariables['GIT_NO_LAZY_FETCH'] = '1'
    }

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    try {
        if (-not $process.Start()) {
            throw "無法啟動程序：$FilePath"
        }
        $Context.ProcessStarted = $true
        $Context.Process = $process
        if ($MarkPushAttempted) {
            $Context.PushAttempted = $true
        }
        if ($redirectStandardInput) {
            $process.StandardInput.NewLine = "`n"
            $process.StandardInput.WriteLine($StandardInputText)
            $process.StandardInput.Close()
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

function Invoke-ProductionOpenSsh {
    param(
        [Parameter(Mandatory = $true)][string]$RemoteCommand,
        [Parameter(Mandatory = $true)][hashtable]$Context,
        [Parameter(Mandatory = $true)][string]$Stage,
        [ValidateRange(1, 3600000)][int]$TimeoutMilliseconds = 30000,
        [AllowEmptyString()][string]$StandardInputText
    )

    if (-not (Test-Path -LiteralPath $script:SshPath -PathType Leaf) -or
        -not (Test-Path -LiteralPath $script:SshKey -PathType Leaf)) {
        throw '正式環境 SSH 程式或私鑰不存在；未啟動 SSH。'
    }

    $invokeArguments = @{
        FilePath = $script:SshPath
        Arguments = @(
            '-T', '-i', $script:SshKey,
            '-o', 'IdentitiesOnly=yes',
            '-o', 'StrictHostKeyChecking=yes',
            '-o', 'BatchMode=yes',
            '-o', 'ConnectTimeout=15',
            $script:SshTarget, $RemoteCommand
        )
        WorkingDirectory = $script:ProjectRoot
        Context = $Context
        Stage = $Stage
        TimeoutMilliseconds = $TimeoutMilliseconds
    }
    if ($PSBoundParameters.ContainsKey('StandardInputText')) {
        $invokeArguments.StandardInputText = $StandardInputText
    }
    return Invoke-CapturedProcess @invokeArguments
}

function Test-ProductionOpenSshAuthentication {
    param([Parameter(Mandatory = $true)][hashtable]$Context)

    $Context.OpenSshAuthenticationStatus = 'Running'
    $Context.SshDiagnosticStage = 'OpenSshAuthentication'
    if (-not (Test-Path -LiteralPath $script:SshPath -PathType Leaf)) {
        $status = 'ExecutionError'
        $reason = 'OpenSSH 執行檔不存在；未能驗證 SSH。'
    } elseif (-not (Test-Path -LiteralPath $script:SshKey -PathType Leaf)) {
        $status = 'ExecutionError'
        $reason = 'SSH 私鑰檔案不存在；未能驗證 SSH。'
    } else {
        try {
            $result = Invoke-ProductionOpenSsh -RemoteCommand ':' -Context $Context `
                -Stage '驗證正式環境 OpenSSH 私鑰認證' -TimeoutMilliseconds 30000

            if ($result.TimedOut) {
                $status = 'TimedOut'
                $reason = 'OpenSSH 私鑰驗證逾時；預檢維持阻擋。'
            } elseif ($result.Cancelled) {
                $status = 'Cancelled'
                $reason = 'OpenSSH 私鑰驗證已取消。'
            } elseif ($result.ExitCode -eq 0) {
                $status = 'Succeeded'
                $reason = 'OpenSSH 私鑰認證成功；StrictHostKeyChecking 已通過。'
            } else {
                $diagnostic = "$($result.Stderr)`n$($result.Stdout)"
                if ($diagnostic -match '(?im)^Host key verification failed\.\s*$|^No (?:RSA|DSA|ECDSA|ED25519|ECDSA-SK|ED25519-SK) host key is known for .+ and you have requested strict checking\.\s*$|^Offending .+ key in .+|^WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!') {
                    $status = 'HostKeyRejected'
                    $reason = 'OpenSSH known_hosts 主機金鑰驗證失敗；預檢維持阻擋。'
                } elseif ($diagnostic -match '(?im)^[^\r\n]*:\s*Permission denied \([^)\r\n]+\)\.\s*$') {
                    $status = 'AuthenticationFailed'
                    $reason = 'OpenSSH 伺服器明確拒絕了提供的認證方式；預檢維持阻擋。'
                } elseif ($diagnostic -match '(?im)^ssh: connect to host .+ port \d+: Connection timed out\s*$') {
                    $status = 'TimedOut'
                    $reason = 'OpenSSH 連線逾時；預檢維持阻擋。'
                } elseif ($diagnostic -match '(?im)^ssh: connect to host .+ port \d+: (?:Connection refused|No route to host|Network is unreachable)\s*$|^ssh: Could not resolve hostname .+:\s*(?:Name or service not known|No such host is known)\s*$') {
                    $status = 'ConnectionError'
                    $reason = 'OpenSSH 無法連線至目標主機；預檢維持阻擋。'
                } else {
                    $status = 'UnclassifiedFailure'
                    $reason = 'SSH 驗證失敗，原因未分類；預檢維持阻擋。'
                }
            }
        } catch {
            if ($_.Exception -is [System.ComponentModel.Win32Exception] -or
                $_.Exception -is [System.IO.FileNotFoundException] -or
                $_.Exception -is [System.IO.DirectoryNotFoundException]) {
                $status = 'ExecutionError'
                $reason = 'OpenSSH 驗證程序無法啟動；預檢維持阻擋。'
            } else {
                $status = 'UnclassifiedFailure'
                $reason = 'SSH 驗證失敗，原因未分類；預檢維持阻擋。'
            }
        }
    }

    $Context.OpenSshAuthenticationStatus = $status
    return [pscustomobject]@{
        Status = $status
        Reason = $reason
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

function Get-ProductionDeploymentStatus {
    param([Parameter(Mandatory = $true)][hashtable]$Context)

    $unknown = '無法確認'
    $pathCaveat = '固定路徑尚未獨立確認為 Production 實際使用路徑。'
    $remoteCommand = "if [ -f /home/zhe/pets-deploy-state/deployment.state ]; then cat -- /home/zhe/pets-deploy-state/deployment.state; else printf '%s\n' 'PETS_DEPLOYMENT_STATE_NOT_FOUND'; exit 44; fi"
    $result = Invoke-ProductionOpenSsh -RemoteCommand $remoteCommand `
        -Context $Context -Stage '唯讀查詢 Production 部署狀態' -TimeoutMilliseconds 30000

    if ($result.TimedOut) {
        return [pscustomobject]@{
            Outcome = 'Failed'
            Detail = "Production 狀態查詢逾時；狀態未確認。$pathCaveat"
            Status = $unknown
            Commit = $unknown
            Verification = $unknown
            Timestamp = $unknown
        }
    }
    if ($result.Cancelled) {
        return [pscustomobject]@{
            Outcome = 'Cancelled'
            Detail = "Production 狀態查詢已取消；狀態未確認。$pathCaveat"
            Status = $unknown
            Commit = $unknown
            Verification = $unknown
            Timestamp = $unknown
        }
    }

    $stdout = [string]$result.Stdout
    $outputLines = @($stdout -split "`r?`n" | Where-Object { $_.Length -gt 0 })
    if ($result.ExitCode -eq 44 -and
        $outputLines.Count -eq 1 -and
        $outputLines[0] -ceq 'PETS_DEPLOYMENT_STATE_NOT_FOUND') {
        return [pscustomobject]@{
            Outcome = 'Unavailable'
            Detail = "設定路徑未回報可讀的普通狀態檔；可能不存在或無法檢查，Production 狀態未確認。$pathCaveat"
            Status = $unknown
            Commit = $unknown
            Verification = $unknown
            Timestamp = $unknown
        }
    }
    if ($result.ExitCode -ne 0) {
        $detail = "遠端狀態查詢失敗（Exit Code $($result.ExitCode)）；不能據此判定狀態檔不存在。"
        $stderr = Protect-SensitiveText -Text ([string]$result.Stderr).Trim()
        if ($stderr) {
            $detail += " $stderr"
        }
        return [pscustomobject]@{
            Outcome = 'Failed'
            Detail = "$detail $pathCaveat"
            Status = $unknown
            Commit = $unknown
            Verification = $unknown
            Timestamp = $unknown
        }
    }

    $fields = @{}
    $parseError = $null
    if ([string]::IsNullOrWhiteSpace($stdout)) {
        $parseError = '狀態檔輸出為空。'
    } else {
        $lines = New-Object System.Collections.Generic.List[string]
        foreach ($line in ($stdout -split "`r?`n")) {
            $lines.Add($line)
        }
        while ($lines.Count -gt 0 -and $lines[$lines.Count - 1] -ceq '') {
            $lines.RemoveAt($lines.Count - 1)
        }
        foreach ($line in $lines) {
            if ($line -cnotmatch '^([a-z_]+)=(.*)$') {
                $parseError = '狀態檔包含格式錯誤的資料列。'
                break
            }
            $field = $Matches[1]
            if ($field -cnotin @(
                'status', 'commit', 'previous_commit', 'timestamp', 'backup',
                'verification', 'log_file', 'verified_at'
            )) {
                $parseError = '狀態檔包含不支援的欄位。'
                break
            }
            if ($fields.ContainsKey($field)) {
                $parseError = '狀態檔包含重複欄位。'
                break
            }
            if ([string]::IsNullOrEmpty($Matches[2])) {
                $parseError = '狀態檔包含空欄位值。'
                break
            }
            $fields[$field] = $Matches[2]
        }
    }

    if (-not $parseError) {
        foreach ($field in @('status', 'commit', 'verification', 'timestamp')) {
            if (-not $fields.ContainsKey($field)) {
                $parseError = "狀態檔缺少必要欄位：$field。"
                break
            }
        }
    }
    if (-not $parseError -and $fields['status'] -cnotin @('RUNNING', 'FAILED', 'DEPLOYED', 'SUCCESS')) {
        $parseError = '狀態欄位值無效。'
    }
    if (-not $parseError -and $fields['commit'] -cnotmatch '^(pending|NONE|[0-9a-fA-F]{40})$') {
        $parseError = 'commit 欄位值無效。'
    }
    if (-not $parseError -and $fields['verification'] -cnotmatch '^(pending|failed|PASS)$') {
        $parseError = 'verification 欄位值無效。'
    }
    if (-not $parseError -and $fields['timestamp'] -cnotmatch '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\+08:00$') {
        $parseError = 'timestamp 欄位格式無效。'
    }
    if (-not $parseError) {
        $hasCommitSha = $fields['commit'] -cmatch '^[0-9a-fA-F]{40}$'
        $validCombination = switch ($fields['status']) {
            'RUNNING' { $fields['verification'] -ceq 'pending' -and ($fields['commit'] -ceq 'pending' -or $hasCommitSha) }
            'FAILED' { $fields['verification'] -ceq 'failed' -and ($fields['commit'] -ceq 'NONE' -or $hasCommitSha) }
            'DEPLOYED' { $fields['verification'] -ceq 'pending' -and $hasCommitSha }
            'SUCCESS' { $fields['verification'] -ceq 'PASS' -and $hasCommitSha }
        }
        if (-not $validCombination) {
            $parseError = 'status、commit 與 verification 欄位組合不一致。'
        }
    }
    if (-not $parseError -and $fields.ContainsKey('verified_at')) {
        if ($fields['status'] -cne 'SUCCESS' -or
            $fields['verified_at'] -cnotmatch '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\+08:00$') {
            $parseError = 'verified_at 欄位與部署狀態不一致或格式無效。'
        }
    }
    if (-not $parseError -and $fields['status'] -ceq 'SUCCESS' -and -not $fields.ContainsKey('verified_at')) {
        $parseError = 'SUCCESS 狀態缺少 verified_at 欄位。'
    }

    if ($parseError) {
        return [pscustomobject]@{
            Outcome = 'Invalid'
            Detail = "狀態檔內容無效：$parseError $pathCaveat"
            Status = $unknown
            Commit = $unknown
            Verification = $unknown
            Timestamp = $unknown
        }
    }

    return [pscustomobject]@{
        Outcome = 'Confirmed'
        Detail = "Production 部署狀態已確認：遠端狀態檔輸出與必要欄位格式有效。$pathCaveat"
        Status = $fields['status']
        Commit = $fields['commit']
        Verification = $fields['verification']
        Timestamp = $fields['timestamp']
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
        IsClean = $status.IsClean
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

function Write-BackupButtonDiagnostic {
    param(
        [Parameter(Mandatory = $true)][string]$Status,
        [string[]]$Output = @()
    )

    try {
        Add-OperationLog -Operation 'Backup 按鈕診斷' -Status $Status -Output $Output
    } catch {
        return
    }
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

    $directory = $ExpectedDirectory
    if ([string]::IsNullOrWhiteSpace($directory) -or $directory.Length -gt 4096 -or
        $directory -match '[\x00-\x1F\x7F]') {
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
    $destinationText = if ($script:OperationState.VerifiedBackupDirectory) {
        $script:Controls.BackupDestinationValue.Text
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
只有經 SSH 主機金鑰驗證及備份目的地唯讀預檢後，才會允許執行備份。

是否繼續執行正式環境備份？
"@
    $confirmation = Confirm-BackupRequest -Message $confirmationMessage
    if ($confirmation -ne [System.Windows.Forms.DialogResult]::OK) {
        $script:Controls.ActivityLabel.Text = '正式環境備份：已取消'
        Add-OperationLog -Operation '正式環境備份' -Status '使用者取消；未建立背景工作或呼叫 SSH'
        return
    }

    if ([string]::IsNullOrWhiteSpace($script:OperationState.VerifiedBackupDirectory) -or
        $script:OperationState.VerifiedBackupDirectory -cnotmatch '\A/' -or
        $script:OperationState.VerifiedBackupDirectory -match '[\x00-\x1F\x7F]' -or
        $script:OperationState.VerifiedBackupHost -cne $script:ProductionSshHost -or
        $script:OperationState.VerifiedBackupUser -cne $script:ProductionSshUser) {
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
        -BackupDestination $script:OperationState.VerifiedBackupDirectory
}

function Set-OperationButtonsEnabled {
    param(
        [bool]$Enabled,
        [bool]$UnconfirmedProcess = $false
    )
    $destinationVerified = 'not-evaluated'
    $hostMatches = 'not-evaluated'
    $usernameMatches = 'not-evaluated'
    $isBusy = 'unavailable'
    $backupEnabledBefore = 'unavailable'
    $backupEnabledAfter = 'unavailable'
    try {
        $script:Controls.RefreshButton.Enabled = $Enabled
        $script:Controls.TestButton.Enabled = $Enabled
        $script:Controls.GitHubButton.Enabled = $Enabled
        $script:Controls.PushButton.Enabled = $Enabled
        $script:Controls.ProductionStateQueryButton.Enabled = $Enabled
        $script:Controls.DeploymentPreflightButton.Enabled = $Enabled
        $script:Controls.SshTestButton.Enabled = $Enabled
        $script:Controls.BackupDestinationButton.Enabled = $Enabled
        $script:Controls.RestoreButton.Enabled = $Enabled
        $script:Controls.SshHostInput.Enabled = $Enabled
        $script:Controls.SshUsernameInput.Enabled = $Enabled
        $script:Controls.SshPasswordInput.Enabled = $Enabled
        $script:Controls.CancelOperationButton.Enabled = -not $Enabled
        try {
            $isBusy = [bool]$script:OperationState.IsBusy
        } catch {
            $isBusy = 'unavailable'
        }
        try {
            $backupEnabledBefore = $script:Controls.BackupButton.Enabled
        } catch {
            $backupEnabledBefore = 'unavailable'
        }
        $destinationVerified = -not [string]::IsNullOrWhiteSpace($script:OperationState.VerifiedBackupDirectory)
        $hostMatches = $script:OperationState.VerifiedBackupHost -ceq $script:ProductionSshHost
        $usernameMatches = $script:OperationState.VerifiedBackupUser -ceq $script:ProductionSshUser
        $script:Controls.BackupButton.Enabled = $Enabled -and
            $destinationVerified -and $hostMatches -and $usernameMatches
        try {
            $backupEnabledAfter = $script:Controls.BackupButton.Enabled
        } catch {
            $backupEnabledAfter = 'unavailable'
        }
    } catch {
        try {
            $exceptionType = $_.Exception.GetType().FullName
            try {
                $backupEnabledAfter = $script:Controls.BackupButton.Enabled
            } catch {
                $backupEnabledAfter = 'unavailable'
            }
            Write-BackupButtonDiagnostic -Status '按鈕狀態更新例外' -Output @(
                "ExceptionType: $exceptionType",
                "Enabled: $Enabled",
                "DestinationVerified: $destinationVerified",
                "HostMatches: $hostMatches",
                "UsernameMatches: $usernameMatches",
                "IsBusy: $isBusy",
                "UnconfirmedProcess: $UnconfirmedProcess",
                "BackupEnabledBefore: $backupEnabledBefore",
                "BackupEnabledAfter: $backupEnabledAfter"
            )
        } catch {
        }
        throw
    }
    Write-BackupButtonDiagnostic -Status '按鈕狀態更新' -Output @(
        "Enabled: $Enabled",
        "DestinationVerified: $destinationVerified",
        "HostMatches: $hostMatches",
        "UsernameMatches: $usernameMatches",
        "IsBusy: $isBusy",
        "UnconfirmedProcess: $UnconfirmedProcess",
        "BackupEnabledBefore: $backupEnabledBefore",
        "BackupEnabledAfter: $backupEnabledAfter"
    )
}

function Start-BackgroundOperation {
    param(
        [Parameter(Mandatory = $true)][string]$Operation,
        [Parameter(Mandatory = $true)][ValidateSet('LocalStatus', 'GitHubMaster', 'Tests', 'PushMasterPreflight', 'PushMaster', 'DeploymentPreflight', 'ProductionStateQuery', 'Backup', 'RestoreList', 'Restore', 'SshTest', 'BackupDestinationPreflight')][string]$Action,
        [string]$ExpectedHeadSha,
        [string]$ExpectedRemoteSha,
        [string]$BackupDestination,
        [string]$RestoreBundlePath,
        [string]$RestoreConfirmation,
        [string]$SshHost,
        [string]$SshUsername,
        [System.Security.SecureString]$SshPassword
    )
    if ($Action -eq 'Backup' -and (
        [string]::IsNullOrWhiteSpace($BackupDestination) -or
        $BackupDestination -cnotmatch '\A/' -or
        $BackupDestination.Length -gt 4096 -or
        $BackupDestination -match '[\x00-\x1F\x7F]' -or
        $script:OperationState.VerifiedBackupDirectory -cne $BackupDestination -or
        $script:OperationState.VerifiedBackupHost -cne $script:ProductionSshHost -or
        $script:OperationState.VerifiedBackupUser -cne $script:ProductionSshUser
    )) {
        $script:Controls.ActivityLabel.Text = "$Operation：已阻擋（目的地驗證狀態無效）"
        Add-OperationLog -Operation $Operation -Status '已阻擋；目的地與有效驗證狀態不一致' -Output @(
            '未建立背景工作或呼叫 SSH。'
        )
        return
    }
    if ($Action -eq 'Restore' -and (
        -not (Test-RestoreBundlePath -Path $RestoreBundlePath) -or
        $RestoreConfirmation -cne 'RESTORE'
    )) {
        $script:Controls.RestoreStateValue.Text = '已阻擋：還原備份或第二次確認無效'
        Add-OperationLog -Operation $Operation -Status '已阻擋；還原備份或第二次確認無效' -Output @(
            '未建立背景工作或呼叫 SSH。'
        )
        return
    }
    if ($script:OperationState.IsBusy -or
        ($script:OperationState.ActiveOperation -and $script:OperationState.ActiveOperation.StopUnconfirmed)) {
        if ($SshPassword) {
            Clear-SshCredential -SecurePassword $SshPassword
        }
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
        ProcessStarted = $false
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
        SshClient = $null
        SshAuthentication = $null
        SshHostKeyVerifier = $null
        SshHostKeyHandler = $null
        SshPassword = $SshPassword
        HostKeyVerified = $false
        HostKeyRejected = $false
        SshDiagnosticStage = 'SshClientInitialization'
        SshAuthenticationSucceeded = $false
        OpenSshAuthenticationStatus = 'NotRun'
        SshDisconnectFailed = $false
        SshCleanupFailed = $false
    }
    $script:OperationState.ActiveOperation = $context
    $request = @{
        Action = $Action
        Operation = $Operation
        Context = $context
        ExpectedHeadSha = $ExpectedHeadSha
        ExpectedRemoteSha = $ExpectedRemoteSha
        BackupDestination = $BackupDestination
        RestoreBundlePath = $RestoreBundlePath
        RestoreConfirmation = $RestoreConfirmation
        BackupSshPath = $script:SshPath
        BackupSshKey = $script:SshKey
        BackupSshTarget = $script:SshTarget
        BackupProductionRoot = $script:ProductionRoot
        BackupScript = $script:BackupScript
        RestoreScript = $script:RestoreScript
        RestoreBackupDirectory = $script:RestoreBackupDirectory
        SshNetAssembly = $script:SshNetAssembly
        ExpectedProductionHostFingerprint = $script:ExpectedProductionHostFingerprint
        SshHost = $SshHost
        SshUsername = $SshUsername
        SshPassword = $SshPassword
    }
    $completedRequest = $request
    $completedUi = $script:Controls
    $completedState = $script:OperationState

    $functionNames = @(
        'ConvertTo-ProcessArgument',
        'Protect-SensitiveText',
        'Get-PreflightStderrSummary',
        'Get-PreflightExceptionType',
        'Get-PreflightInnerExceptionTypes',
        'Get-PreflightSshExceptionCategory',
        'ConvertTo-PosixShellSingleQuotedString',
        'Clear-SshCredential',
        'New-VerifiedSshClient',
        'Stop-StartedProcessTree',
        'Invoke-CapturedProcess',
        'Invoke-ProductionOpenSsh',
        'Test-ProductionOpenSshAuthentication',
        'Invoke-GitReadOnly',
        'Get-LocalProjectStatus',
        'Get-GitHubMasterStatus',
        'Get-DeploymentPreflight',
        'Get-ProductionDeploymentStatus',
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
$script:SshNetAssembly = $workerRequest.SshNetAssembly
$script:ExpectedProductionHostFingerprint = $workerRequest.ExpectedProductionHostFingerprint
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
    $script:RestoreScript = $workerRequest.RestoreScript
    $script:RestoreBackupDirectory = $workerRequest.RestoreBackupDirectory
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
        'ProductionStateQuery' {
            $workContext.Stage = '查詢 Production 部署狀態（唯讀）'
            $result = Get-ProductionDeploymentStatus -Context $workContext
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
            if ([string]::IsNullOrWhiteSpace($destination) -or
                $destination -cnotmatch '\A/' -or $destination.Length -gt 4096 -or
                $destination -match '[\x00-\x1F\x7F]') {
                throw '有效備份目的地未驗證；拒絕啟動 SSH。'
            }
            if (-not (Test-Path -LiteralPath $script:SshPath -PathType Leaf) -or
                -not (Test-Path -LiteralPath $script:SshKey -PathType Leaf)) {
                throw '正式環境 SSH 程式或金鑰不存在；未啟動 SSH。'
            }

            $quotedDestination = ConvertTo-PosixShellSingleQuotedString -Value $destination
            $remoteCommand = "cd -- '$($script:ProductionRoot)' && BACKUP_DIR=$quotedDestination exec bash '$($script:BackupScript)'"
            $result = Invoke-ProductionOpenSsh -RemoteCommand $remoteCommand `
                -Context $workContext `
                -Stage '執行正式環境 backup.sh' -TimeoutMilliseconds 3600000
            break
        }
        'RestoreList' {
            if (-not (Test-Path -LiteralPath $script:SshPath -PathType Leaf) -or
                -not (Test-Path -LiteralPath $script:SshKey -PathType Leaf)) {
                throw '正式環境 SSH 程式或金鑰不存在；未啟動備份列舉。'
            }
            $remoteListCommand = @(
                'cd -- /home/zhe/pets || exit 90'
                'database=psop_one'
                'if [ -f .env ]; then'
                '  configured_database=$(sed -n ''s/^DB_NAME=//p'' .env | tail -n 1 | tr -d ''"'')'
                '  if [ -n "$configured_database" ]; then database="$configured_database"; fi'
                'fi'
                'if ! printf ''%s'' "$database" | grep -Eq ''^[A-Za-z0-9_-]{1,64}$''; then exit 91; fi'
                'printf ''DATABASE=%s\n'' "$database"'
                'find -- /home/zhe/pets-backups -mindepth 1 -maxdepth 1 -type f -name ''pets_backup_????????_??????.tar.gz'' -printf ''%f\n'''
            ) -join "`n"
            $listResult = Invoke-ProductionOpenSsh -RemoteCommand $remoteListCommand `
                -Context $workContext `
                -Stage '唯讀列舉正式環境備份 bundle' -TimeoutMilliseconds 30000
            if ($listResult.TimedOut) {
                $result = $listResult
                break
            }
            if ($listResult.Cancelled) {
                $result = $listResult
                break
            }
            if ($listResult.ExitCode -ne 0) {
                $detail = Protect-SensitiveText -Text $listResult.Stderr.Trim()
                throw "遠端備份列舉失敗，退出碼 $($listResult.ExitCode)：$detail"
            }
            $listLines = @($listResult.Stdout -split "`r?`n" | Where-Object { $_ -ne '' })
            $databaseLines = @($listLines | Where-Object { $_ -cmatch '^DATABASE=[A-Za-z0-9_-]{1,64}$' })
            if ($databaseLines.Count -ne 1) {
                throw '遠端備份列舉未回傳唯一且有效的目標資料庫名稱。'
            }
            $bundlePaths = New-Object System.Collections.Generic.List[string]
            foreach ($line in $listLines) {
                if ($line -ceq $databaseLines[0]) {
                    continue
                }
                if ($line -cnotmatch '\Apets_backup_\d{8}_\d{6}\.tar\.gz\z') {
                    throw '遠端備份列舉回傳了不符合允許命名格式的檔名；拒絕提供選擇。'
                }
                $bundlePaths.Add("$($script:RestoreBackupDirectory)/$line")
            }
            $result = [pscustomobject]@{
                DatabaseName = $databaseLines[0].Substring('DATABASE='.Length)
                BundlePaths = @($bundlePaths | Sort-Object -Descending)
                TimedOut = $false
                Cancelled = $false
                ExitCode = 0
                Stdout = $listResult.Stdout
                Stderr = $listResult.Stderr
            }
            break
        }
        'Restore' {
            $bundlePath = [string]$workerRequest.RestoreBundlePath
            if ($bundlePath -cnotmatch '\A/home/zhe/pets-backups/pets_backup_\d{8}_\d{6}\.tar\.gz\z' -or
                $workerRequest.RestoreConfirmation -cne 'RESTORE') {
                throw '還原備份路徑或人工確認無效；拒絕啟動 SSH。'
            }
            if (-not (Test-Path -LiteralPath $script:SshPath -PathType Leaf) -or
                -not (Test-Path -LiteralPath $script:SshKey -PathType Leaf)) {
                throw '正式環境 SSH 程式或金鑰不存在；未啟動還原。'
            }

            $quotedBundlePath = ConvertTo-PosixShellSingleQuotedString -Value $bundlePath
            $remoteCommand = "cd -- '$($script:ProductionRoot)' && exec bash '$($script:RestoreScript)' $quotedBundlePath"
            $result = Invoke-ProductionOpenSsh -RemoteCommand $remoteCommand `
                -Context $workContext -Stage '執行正式環境 restore.sh' `
                -TimeoutMilliseconds 3600000 -StandardInputText $workerRequest.RestoreConfirmation
            break
        }
        { $_ -in @('SshTest', 'BackupDestinationPreflight') } {
            $sshResult = [ordered]@{
                AuthStatus = 'Failed'
                DestinationStatus = if ($workerRequest.Action -eq 'BackupDestinationPreflight') { 'Failed' } else { 'NotRun' }
                Destination = $null
                DestinationCanonical = $null
                DestinationSource = $null
                DestinationState = 'Unknown'
                FailureStage = 'SshConnection'
                RemoteExitCode = $null
                RemoteExitCodeReadStatus = 'NotRead'
                ExceptionType = 'None'
                InnerExceptionTypes = '尚未讀取'
                SshExceptionCategory = 'NotApplicable'
                StderrSummary = '尚未讀取。'
                StderrReadStatus = 'NotRead'
                Reason = 'SSH 連線失敗；詳細例外資訊不記錄。'
                DiagnosticStage = $workContext.SshDiagnosticStage
                ErrorCategory = 'Failed'
                AuthenticationSucceeded = $workContext.SshAuthenticationSucceeded
            }
            $command = $null
            $remoteCommandAttempted = $false
            try {
                if ($workContext.CancelRequested) {
                    $workContext.SshDiagnosticStage = 'CancelledBeforeConnection'
                    $sshResult.AuthStatus = 'Cancelled'
                    $sshResult.DestinationStatus = 'NotRun'
                    $sshResult.FailureStage = 'Cancelled'
                    $sshResult.Reason = '使用者取消；SSH 尚未連線。'
                } else {
                    $workContext.Stage = '建立 SSH 密碼認證連線'
                    $workContext.SshDiagnosticStage = 'SshClientInitialization'
                    $client = New-VerifiedSshClient -HostName $workerRequest.SshHost `
                        -Username $workerRequest.SshUsername -SecurePassword $workerRequest.SshPassword `
                        -SshAssembly $script:SshNetAssembly -Context $workContext
                    if ($workContext.CancelRequested) {
                        $workContext.SshDiagnosticStage = 'CancelledBeforeConnection'
                        $sshResult.AuthStatus = 'Cancelled'
                        $sshResult.DestinationStatus = 'NotRun'
                        $sshResult.FailureStage = 'Cancelled'
                        $sshResult.Reason = '使用者取消；SSH 尚未連線。'
                    } else {
                        $workContext.SshDiagnosticStage = 'ConnectionHandshake'
                        $client.Connect()
                        if ($workContext.HostKeyVerified) {
                            $workContext.SshAuthenticationSucceeded = $true
                            $workContext.SshDiagnosticStage = 'AuthenticationSucceeded'
                        } else {
                            $workContext.SshDiagnosticStage = 'HostKeyVerification'
                        }
                        if ($workContext.CancelRequested) {
                            $sshResult.AuthStatus = 'Cancelled'
                            $sshResult.DestinationStatus = 'NotRun'
                            $sshResult.FailureStage = 'Cancelled'
                            $sshResult.Reason = '使用者取消 SSH 連線。'
                        } elseif (-not $workContext.HostKeyVerified) {
                            throw 'HostKeyVerificationUnconfirmed'
                        } else {
                            $openSshAuthentication = Test-ProductionOpenSshAuthentication -Context $workContext
                            if ($openSshAuthentication.Status -ne 'Succeeded') {
                                $sshResult.AuthStatus = $openSshAuthentication.Status
                                $sshResult.DestinationStatus = 'NotRun'
                                $sshResult.FailureStage = switch ($openSshAuthentication.Status) {
                                    'HostKeyRejected' { 'HostKeyVerification' }
                                    'TimedOut' { 'OpenSshAuthentication' }
                                    'Cancelled' { 'Cancelled' }
                                    'AuthenticationFailed' { 'SshAuthentication' }
                                    'ConnectionError' { 'SshConnection' }
                                    'ExecutionError' { 'ProcessExecution' }
                                    default { 'OpenSshAuthentication' }
                                }
                                $sshResult.Reason = $openSshAuthentication.Reason
                                if ($openSshAuthentication.Status -eq 'HostKeyRejected') {
                                    $workContext.SshDiagnosticStage = 'HostKeyVerification'
                                }
                            } else {
                                $sshResult.AuthStatus = 'Succeeded'
                                $sshResult.Reason = 'OpenSSH 私鑰認證成功，且 SSH.NET 固定主機指紋驗證成功。'
                            }
                            if ($openSshAuthentication.Status -eq 'Succeeded' -and
                                $workerRequest.Action -eq 'BackupDestinationPreflight') {
                                $workContext.Stage = '唯讀檢查備份目的地'
                                $workContext.SshDiagnosticStage = 'Other'
                                $sshResult.FailureStage = 'OtherRemoteProcessing'
                                $remoteCheck = @(
                                    'cd -- ''/home/zhe/pets'' || exit 90'
                                    'if [ -n "${BACKUP_DIR:-}" ]; then'
                                    '  destination="$BACKUP_DIR"'
                                    '  source="BACKUP_DIR"'
                                    'else'
                                    '  destination="/home/zhe/pets-backups"'
                                    '  source="DEFAULT"'
                                    'fi'
                                    'if [ -L "$destination" ]; then'
                                    '  state="SYMLINK"'
                                    'elif [ ! -e "$destination" ]; then'
                                    '  state="MISSING"'
                                    'elif [ ! -d "$destination" ]; then'
                                    '  state="NOT_DIRECTORY"'
                                    'elif [ ! -r "$destination" ] || [ ! -w "$destination" ] || [ ! -x "$destination" ]; then'
                                    '  state="NOT_WRITABLE"'
                                    'else'
                                    '  state="READY"'
                                    'fi'
                                    'canonical=""'
                                    'if [ "$state" = "READY" ]; then'
                                    '  canonical="$(cd -- "$destination" && pwd -P)" || state="UNCONFIRMED"'
                                    'fi'
                                    'printf ''DESTINATION_SOURCE=%s\nDESTINATION_PATH=%s\nDESTINATION_STATE=%s\nDESTINATION_CANONICAL=%s\n'' "$source" "$destination" "$state" "$canonical"'
                                ) -join "`n"
                                $sshResult.FailureStage = 'CreateCommand'
                                $command = $client.CreateCommand($remoteCheck)
                                $sshResult.FailureStage = 'OtherRemoteProcessing'
                                $command.CommandTimeout = [TimeSpan]::FromSeconds(15)
                                $sshResult.FailureStage = 'Execute'
                                $remoteCommandAttempted = $true
                                $commandOutput = $command.Execute()
                                $sshResult.FailureStage = 'ReadExitStatus'
                                $sshResult.RemoteExitCode = $command.ExitStatus
                                $sshResult.RemoteExitCodeReadStatus = 'Read'
                                $sshResult.FailureStage = 'ReadStderr'
                                $stderrText = $command.Error
                                $sshResult.StderrReadStatus = 'Read'
                                $sshResult.StderrSummary = '讀取成功；摘要尚未產生。'
                                $sshResult.FailureStage = 'OtherRemoteProcessing'
                                $sshResult.StderrSummary = Get-PreflightStderrSummary -Text $stderrText
                                $sshResult.FailureStage = 'ParseRemoteOutput'
                                $reportedStateLines = @($commandOutput -split "`r?`n" |
                                    Where-Object { $_ -cmatch '^DESTINATION_STATE=(READY|SYMLINK|MISSING|NOT_DIRECTORY|NOT_WRITABLE|UNCONFIRMED)$' })
                                if ($reportedStateLines.Count -eq 1) {
                                    $sshResult.DestinationState = $reportedStateLines[0].Substring('DESTINATION_STATE='.Length)
                                }
                                if ($workContext.CancelRequested) {
                                    $sshResult.AuthStatus = 'Cancelled'
                                    $sshResult.DestinationStatus = 'NotRun'
                                    $sshResult.FailureStage = 'Cancelled'
                                    $sshResult.Reason = '唯讀備份目的地驗證已取消。'
                                } elseif ($null -eq $sshResult.RemoteExitCode) {
                                    $sshResult.FailureStage = 'ReadExitStatus'
                                    $sshResult.Reason = '唯讀檢查命令未回報退出碼；備份維持阻擋。'
                                } elseif ($sshResult.RemoteExitCode -ne 0) {
                                    $sshResult.FailureStage = 'RemoteCommandExitCode'
                                    $sshResult.Reason = '唯讀檢查命令失敗；備份維持阻擋。'
                                } else {
                                    $sshResult.FailureStage = 'ParseRemoteOutput'
                                    $sourceLines = @($commandOutput -split "`r?`n" |
                                        Where-Object { $_ -cmatch '^DESTINATION_SOURCE=(BACKUP_DIR|DEFAULT)$' })
                                    $pathLines = @($commandOutput -split "`r?`n" |
                                        Where-Object { $_.StartsWith('DESTINATION_PATH=', [StringComparison]::Ordinal) })
                                    $stateLines = @($commandOutput -split "`r?`n" |
                                        Where-Object { $_ -cmatch '^DESTINATION_STATE=(READY|SYMLINK|MISSING|NOT_DIRECTORY|NOT_WRITABLE|UNCONFIRMED)$' })
                                    $canonicalLines = @($commandOutput -split "`r?`n" |
                                        Where-Object { $_.StartsWith('DESTINATION_CANONICAL=', [StringComparison]::Ordinal) })
                                    if ($sourceLines.Count -ne 1 -or $pathLines.Count -ne 1 -or
                                        $stateLines.Count -ne 1 -or $canonicalLines.Count -ne 1) {
                                        $sshResult.FailureStage = 'OutputParsing'
                                        $sshResult.Reason = '遠端未回報可確認的備份目的地；備份維持阻擋。'
                                    } else {
                                        $destination = $pathLines[0].Substring('DESTINATION_PATH='.Length)
                                        $destinationState = $stateLines[0].Substring('DESTINATION_STATE='.Length)
                                        $sshResult.DestinationState = $destinationState
                                        if ($destinationState -cne 'READY') {
                                            $sshResult.FailureStage = 'DestinationState'
                                            $sshResult.Reason = switch ($destinationState) {
                                                'SYMLINK' { '備份目的地是符號連結；拒絕驗證。' }
                                                'MISSING' { '備份目的地尚不存在；唯讀預檢不會建立目錄。' }
                                                'NOT_DIRECTORY' { '備份目的地不是目錄。' }
                                                'NOT_WRITABLE' { '目前 SSH 帳號無法讀取、寫入或進入備份目錄。' }
                                                'UNCONFIRMED' { '無法確認備份目的地的實際絕對路徑。' }
                                                default { '備份目的地狀態無法確認。' }
                                            }
                                        } elseif ([string]::IsNullOrWhiteSpace($destination) -or
                                            $destination.Length -gt 4096 -or
                                            $destination -match '[\x00-\x1F\x7F]') {
                                            $sshResult.FailureStage = 'OutputParsing'
                                            $sshResult.Reason = '備份目的地格式無效或包含不允許的路徑字元；備份維持阻擋。'
                                        } else {
                                            $canonicalDestination = $canonicalLines[0].Substring('DESTINATION_CANONICAL='.Length)
                                            if ([string]::IsNullOrWhiteSpace($canonicalDestination) -or
                                                $canonicalDestination.Length -gt 4096 -or
                                                $canonicalDestination -notmatch '\A/' -or
                                                $canonicalDestination -match '[\x00-\x1F\x7F]') {
                                                $sshResult.FailureStage = 'CanonicalPathValidation'
                                                $sshResult.Reason = '備份目的地實際路徑無效或無法確認；備份維持阻擋。'
                                            } else {
                                                $sshResult.DestinationStatus = 'Verified'
                                                $sshResult.Destination = $destination
                                                $sshResult.DestinationCanonical = $canonicalDestination
                                                $sshResult.DestinationSource = $sourceLines[0].Substring('DESTINATION_SOURCE='.Length)
                                                $sshResult.FailureStage = 'None'
                                                $sshResult.Reason = 'SSH 認證成功，且備份目的地已完成唯讀驗證。'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } catch {
                $originalException = $_.Exception
                $originalFailureStage = $sshResult.FailureStage
                $sshResult.ExceptionType = Get-PreflightExceptionType -Exception $originalException
                try {
                    $sshResult.InnerExceptionTypes = Get-PreflightInnerExceptionTypes -Exception $originalException
                } catch {
                    $sshResult.InnerExceptionTypes = '讀取失敗'
                }
                if ($originalFailureStage -eq 'Execute') {
                    try {
                        $sshResult.SshExceptionCategory = Get-PreflightSshExceptionCategory -Exception $originalException
                    } catch {
                        $sshResult.SshExceptionCategory = 'Unknown'
                    }
                }
                if ($command -and $remoteCommandAttempted) {
                    if ($sshResult.RemoteExitCodeReadStatus -eq 'NotRead') {
                        if ($originalFailureStage -eq 'ReadExitStatus') {
                            $sshResult.RemoteExitCodeReadStatus = 'ReadFailed'
                        } else {
                            try {
                                $sshResult.RemoteExitCode = $command.ExitStatus
                                $sshResult.RemoteExitCodeReadStatus = 'Read'
                            } catch {
                                $sshResult.RemoteExitCodeReadStatus = 'ReadFailed'
                            }
                        }
                    }
                    if ($sshResult.StderrReadStatus -eq 'NotRead') {
                        if ($originalFailureStage -eq 'ReadStderr') {
                            $sshResult.StderrReadStatus = 'ReadFailed'
                            $sshResult.StderrSummary = '讀取失敗；原始內容未記錄。'
                        } else {
                            try {
                                $stderrText = $command.Error
                                $sshResult.StderrReadStatus = 'Read'
                                $sshResult.StderrSummary = '讀取成功；摘要尚未產生。'
                                $sshResult.StderrSummary = Get-PreflightStderrSummary -Text $stderrText
                            } catch {
                                $sshResult.StderrReadStatus = 'ReadFailed'
                                $sshResult.StderrSummary = '讀取失敗；原始內容未記錄。'
                            }
                        }
                    }
                }
                if ($workContext.CancelRequested) {
                    $sshResult.AuthStatus = 'Cancelled'
                    $sshResult.DestinationStatus = 'NotRun'
                    $sshResult.FailureStage = 'Cancelled'
                    $sshResult.Reason = 'SSH 操作已取消。'
                    if ($workContext.SshDiagnosticStage -eq 'SshClientInitialization') {
                        $workContext.SshDiagnosticStage = 'CancelledBeforeConnection'
                    }
                } elseif ($workContext.HostKeyRejected) {
                    $sshResult.AuthStatus = 'HostKeyRejected'
                    $sshResult.DestinationStatus = 'NotRun'
                    $sshResult.FailureStage = 'HostKeyVerification'
                    $sshResult.Reason = '伺服器主機金鑰未知或與已信任指紋不符；已拒絕連線。'
                    $workContext.SshDiagnosticStage = 'HostKeyVerification'
                } elseif ($workContext.OpenSshAuthenticationStatus -eq 'Running') {
                    $sshResult.AuthStatus = 'UnclassifiedFailure'
                    $sshResult.DestinationStatus = 'NotRun'
                    $sshResult.FailureStage = 'OpenSshAuthentication'
                    $sshResult.Reason = 'SSH 驗證失敗，原因未分類；預檢維持阻擋。'
                    $workContext.SshDiagnosticStage = 'OpenSshAuthentication'
                } elseif ($originalException.GetType().FullName -eq 'Renci.SshNet.Common.SshOperationTimeoutException' -or
                    $originalException -is [System.TimeoutException]) {
                    if ($sshResult.AuthStatus -eq 'Succeeded') {
                        $sshResult.DestinationStatus = 'TimedOut'
                    } else {
                        $sshResult.AuthStatus = 'TimedOut'
                        $sshResult.DestinationStatus = 'NotRun'
                        $sshResult.FailureStage = 'SshConnection'
                    }
                    $sshResult.Reason = 'SSH 連線或唯讀檢查逾時；備份維持阻擋。'
                } elseif ($originalException.GetType().FullName -eq 'Renci.SshNet.Common.SshAuthenticationException') {
                    $sshResult.AuthStatus = 'AuthenticationFailed'
                    $sshResult.DestinationStatus = 'NotRun'
                    $sshResult.FailureStage = 'SshAuthentication'
                    $sshResult.Reason = 'SSH 帳號或密碼認證失敗。'
                    $workContext.SshDiagnosticStage = 'PasswordAuthentication'
                } elseif ($sshResult.AuthStatus -eq 'Succeeded') {
                    $sshResult.DestinationStatus = 'Failed'
                    $sshResult.Reason = 'SSH 認證成功，但備份目的地唯讀驗證失敗；備份維持阻擋。'
                } else {
                    $sshResult.AuthStatus = 'Failed'
                    $sshResult.DestinationStatus = 'NotRun'
                    $sshResult.FailureStage = 'SshConnection'
                    $sshResult.Reason = if ($workerRequest.Action -eq 'BackupDestinationPreflight') {
                        'SSH 連線失敗；已抑制例外內容。'
                    } else {
                        if ($originalException.InnerException) {
                            "$($originalException.GetType().FullName) (InnerException: $($originalException.InnerException.GetType().FullName))"
                        } else {
                            $originalException.GetType().FullName
                        }
                    }
                }
            } finally {
                if ($command) {
                    $command.Dispose()
                }
            }
            $sshResult.DiagnosticStage = $workContext.SshDiagnosticStage
            $sshResult.ErrorCategory = if ($sshResult.AuthStatus -eq 'Succeeded') {
                switch ($sshResult.DestinationStatus) {
                    'TimedOut' { 'TimedOut' }
                    'Failed' { 'Failed' }
                    default { 'Succeeded' }
                }
            } else {
                $sshResult.AuthStatus
            }
            $sshResult.HostKeyVerified = [bool]$workContext.HostKeyVerified
            $sshResult.OpenSshAuthenticationSucceeded = $workContext.OpenSshAuthenticationStatus -eq 'Succeeded'
            $sshResult.AuthenticationSucceeded = $sshResult.HostKeyVerified -and
                $sshResult.OpenSshAuthenticationSucceeded
            $result = [pscustomobject]$sshResult
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
} finally {
    if ($workContext -is [System.Collections.IDictionary]) {
        if ($workContext.SshClient) {
            try {
                if ($workContext.SshClient.IsConnected) {
                    try {
                        $workContext.SshClient.Disconnect()
                    } catch {
                        $workContext.SshDisconnectFailed = $true
                    }
                }
            } catch {
                $workContext.SshCleanupFailed = $true
            } finally {
                try {
                    $workContext.SshClient.Dispose()
                } catch {
                    $workContext.SshCleanupFailed = $true
                }
                $workContext.SshClient = $null
                $workContext.SshHostKeyHandler = $null
                $workContext.SshHostKeyVerifier = $null
            }
        }
        if ($workContext.SshAuthentication) {
            try {
                $workContext.SshAuthentication.Dispose()
            } catch {
                $workContext.SshCleanupFailed = $true
            } finally {
                $workContext.SshAuthentication = $null
            }
        }
        if ($workerRequest.SshPassword) {
            try {
                Clear-SshCredential -SecurePassword $workerRequest.SshPassword
            } catch {
                $workContext.SshCleanupFailed = $true
            } finally {
                $workerRequest.SshPassword = $null
                $workContext.SshPassword = $null
            }
        }
        if ($workerRequest.Action -in @('SshTest', 'BackupDestinationPreflight') -and $result) {
            $cleanupFailed = $workContext.SshCleanupFailed -or $workContext.SshDisconnectFailed
            $result | Add-Member -NotePropertyName CleanupFailed `
                -NotePropertyValue $cleanupFailed -Force
            $result | Add-Member -NotePropertyName CleanupSucceeded `
                -NotePropertyValue (-not $cleanupFailed) -Force
            if ($result.AuthStatus -ne 'Cancelled' -and $workContext.SshCleanupFailed) {
                $result.AuthStatus = 'CleanupFailed'
                $result.ErrorCategory = 'Failed'
                $result.DiagnosticStage = 'Other'
                $result.DestinationStatus = 'Failed'
                $result.Destination = $null
                $result.FailureStage = 'SshCleanup'
                $result.ExceptionType = 'CleanupFailure'
                $result.Reason = 'SSH 認證已完成，但連線或認證資源清理未能確認；備份維持阻擋。'
            } elseif ($result.AuthStatus -ne 'Cancelled' -and $workContext.SshDisconnectFailed) {
                $result.AuthStatus = 'CleanupFailed'
                $result.ErrorCategory = 'Failed'
                $result.DiagnosticStage = 'Other'
                $result.DestinationStatus = 'Failed'
                $result.Destination = $null
                $result.FailureStage = 'SshCleanup'
                $result.ExceptionType = 'CleanupFailure'
                $result.Reason = 'SSH 連線已完成，但關閉連線未能確認；備份維持阻擋。'
            }
        }
    }
}
'@
    $workerScript = ($functionDefinitions -join "`r`n") + "`r`n" + $workerScript

    $completionAddOperationLog = (Get-Command Add-OperationLog -CommandType Function -ErrorAction Stop).ScriptBlock
    $completionFormatProcessOutput = (Get-Command Format-ProcessOutput -CommandType Function -ErrorAction Stop).ScriptBlock
    $completionProtectSensitiveText = (Get-Command Protect-SensitiveText -CommandType Function -ErrorAction Stop).ScriptBlock
    $completionSetOperationButtonsEnabled = (Get-Command Set-OperationButtonsEnabled -CommandType Function -ErrorAction Stop).ScriptBlock
    $completionStartBackgroundOperation = (Get-Command Start-BackgroundOperation -CommandType Function -ErrorAction Stop).ScriptBlock
    $completionShowRestoreBundleSelectionDialog = (Get-Command Show-RestoreBundleSelectionDialog -CommandType Function -ErrorAction Stop).ScriptBlock
    $completionRequestRestoreConfirmation = (Get-Command Request-RestoreConfirmation -CommandType Function -ErrorAction Stop).ScriptBlock

    $completionProductionSshHost = $script:ProductionSshHost
    $completionProductionSshUser = $script:ProductionSshUser
    $completionSshTarget = $script:SshTarget
    $completionHandler = {
        param($completionPayload)
        $workContext = $completedRequest.Context
        $closeAfterCompletion = $workContext.CloseWhenDone
        $unconfirmedProcess = $workContext.Process -and $workContext.StopUnconfirmed
        $nextPush = $null
        $nextRestore = $null
        try {
            if ($completionPayload.Error) {
                $workError = $completionPayload.Error
                $exceptionDetails = New-Object System.Collections.Generic.List[string]
                if ($completedRequest.Action -in @('SshTest', 'BackupDestinationPreflight')) {
                    $exceptionDetails.Add('SSH 工作未完成；為避免認證資料外洩，不記錄例外內容或堆疊。')
                    $diagnosticStage = if ($workContext.SshDiagnosticStage -in @(
                        'SshClientInitialization',
                        'ConnectionHandshake',
                        'HostKeyVerification',
                        'PasswordAuthentication',
                        'AuthenticationSucceeded',
                        'OpenSshAuthentication',
                        'CancelledBeforeConnection',
                        'Other'
                    )) {
                        $workContext.SshDiagnosticStage
                    } else {
                        'Other'
                    }
                    $authenticationConfirmed = if (
                        $workContext.SshAuthenticationSucceeded -and
                        $workContext.OpenSshAuthenticationStatus -eq 'Succeeded'
                    ) { '是' } else { '否（未確認）' }
                    $exceptionDetails.Add("診斷階段：$diagnosticStage")
                    $errorCategory = if ($workContext.CancelRequested) { 'Cancelled' } else { 'Failed' }
                    $exceptionDetails.Add("錯誤類別：$errorCategory")
                    $exceptionDetails.Add("SSH 認證成功已確認：$authenticationConfirmed")
                    $cleanupFailed = $workContext.SshCleanupFailed -or $workContext.SshDisconnectFailed
                    $exceptionDetails.Add("清理失敗：$(if ($cleanupFailed) { '是' } else { '否' })")
                } elseif ($null -ne $workError) {
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
                    $completedUi.ActivityLabel.Text = if ($completedRequest.Action -eq 'Restore') {
                        "$($completedRequest.Operation)：遠端結果未確認"
                    } else {
                        "$($completedRequest.Operation)：停止狀態未確認"
                    }
                    if ($completedRequest.Action -eq 'Restore') {
                        $completedUi.RestoreStateValue.Text = '本機 SSH 程序停止狀態及遠端還原結果均未確認'
                    }
                    & $completionAddOperationLog -Operation $completedRequest.Operation -Status '停止狀態未確認' -Output @(
                        $exceptionDetails.ToArray(),
                        $(if ($workContext.PushAttempted) { '推送可能已在遠端完成；請重新查詢 GitHub master SHA。' }),
                        $(if ($completedRequest.Action -eq 'Restore') {
                            'SSH 程序停止狀態未確認；遠端還原可能仍在執行或已完成。請勿假設已取消或重試，先人工確認環境狀態。'
                        }),
                        "執行階段：$($workContext.Stage)"
                    )
                } elseif ($completedRequest.Action -eq 'Restore' -and $workContext.CancelRequested) {
                    $completedUi.RestoreStateValue.Text = if ($workContext.ProcessStarted) {
                        '取消請求；遠端還原結果未確認'
                    } else {
                        '已取消；未啟動還原 SSH'
                    }
                    $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：遠端結果未確認"
                    & $completionAddOperationLog -Operation $completedRequest.Operation `
                        -Status '取消請求；遠端結果未確認' -Output @(
                            $exceptionDetails.ToArray(),
                            $(if ($workContext.ProcessStarted) {
                                'SSH 已啟動；遠端還原是否仍在執行或已完成無法確認。請勿假設已取消或重試，先人工確認環境狀態。'
                            } else {
                                'SSH 尚未啟動；未送出還原命令。'
                            }),
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
                    if ($completedRequest.Action -eq 'RestoreList') {
                        $completedUi.RestoreStateValue.Text = '遠端備份列舉已取消'
                    }
                    if ($completedRequest.Action -in @('SshTest', 'BackupDestinationPreflight')) {
                        $completedUi.SshAuthenticationValue.Text = '已取消'
                        if ($completedRequest.Action -eq 'BackupDestinationPreflight') {
                            $completedState.VerifiedBackupDirectory = $null
                            $completedState.VerifiedBackupHost = $null
                            $completedState.VerifiedBackupUser = $null
                            $completedUi.BackupDestinationValue.Text = '未驗證；備份維持阻擋'
                            $completedUi.BackupStateValue.Text = '目的地預檢已取消'
                        }
                    }
                    $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：已取消"
                    & $completionAddOperationLog -Operation $completedRequest.Operation -Status '已取消並確認無活動子程序' -Output @(
                        $exceptionDetails.ToArray(),
                        "執行階段：$($workContext.Stage)"
                    )
                } elseif ($completedRequest.Action -in @('SshTest', 'BackupDestinationPreflight')) {
                    $completedUi.SshAuthenticationValue.Text = '失敗：SSH 工作未完成'
                    if ($completedRequest.Action -eq 'BackupDestinationPreflight') {
                        $completedState.VerifiedBackupDirectory = $null
                        $completedState.VerifiedBackupHost = $null
                        $completedState.VerifiedBackupUser = $null
                        $completedUi.BackupDestinationValue.Text = '未驗證；備份維持阻擋'
                        $completedUi.BackupStateValue.Text = '目的地預檢失敗'
                    }
                    $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：失敗"
                    & $completionAddOperationLog -Operation $completedRequest.Operation -Status '失敗；錯誤內容已抑制' `
                        -Output $exceptionDetails.ToArray()
                } elseif ($completedRequest.Action -eq 'Restore') {
                    if ($workContext.ProcessStarted) {
                        $completedUi.RestoreStateValue.Text = '執行中發生錯誤；遠端還原結果未確認'
                        $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：遠端結果未確認"
                        & $completionAddOperationLog -Operation $completedRequest.Operation -Status '執行錯誤；遠端結果未確認' -Output @(
                            $exceptionDetails.ToArray(),
                            'SSH 程序已啟動；無法確認遠端還原是否仍在執行或已完成。請勿假設失敗或重試，先人工確認環境狀態。',
                            "執行階段：$($workContext.Stage)"
                        )
                    } else {
                        $completedUi.RestoreStateValue.Text = '還原未執行；背景工作失敗'
                        $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：未執行"
                        & $completionAddOperationLog -Operation $completedRequest.Operation -Status '失敗；還原 SSH 未啟動' -Output @(
                            $exceptionDetails.ToArray(),
                            '未啟動 SSH 或送出還原命令。',
                            "執行階段：$($workContext.Stage)"
                        )
                    }
                } else {
                    if ($completedRequest.Action -eq 'Restore') {
                        $completedUi.RestoreStateValue.Text = '還原執行失敗；請檢查紀錄'
                    } elseif ($completedRequest.Action -eq 'RestoreList') {
                        $completedUi.RestoreStateValue.Text = '遠端備份列舉失敗'
                    }
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
                } elseif ($completedRequest.Action -eq 'ProductionStateQuery') {
                    $queryFailure = if ($unconfirmedProcess) {
                        '查詢結果未確認；本機 SSH 程序停止狀態尚未確認。'
                    } elseif ($workContext.CancelRequested) {
                        '查詢已取消；Production 狀態未確認。'
                    } else {
                        "查詢失敗：$message"
                    }
                    $completedUi.ProductionStateQueryResultValue.Text = "$queryFailure 固定狀態檔路徑尚未獨立確認為 Production 實際使用路徑。"
                    $completedUi.ProductionDeployStatusValue.Text = '無法確認'
                    $completedUi.ProductionDeployCommitValue.Text = '無法確認'
                    $completedUi.ProductionDeployVerificationValue.Text = '無法確認'
                    $completedUi.ProductionDeployTimestampValue.Text = '無法確認'
                }
            } else {
                switch ($completedRequest.Action) {
                'LocalStatus' {
                    $status = $completionPayload.Result
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
                    $completedState.GitHubMasterSha = [string]$completionPayload.Result
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
                'ProductionStateQuery' {
                    $state = $completionPayload.Result
                    $completedUi.ProductionStateQueryResultValue.Text = $state.Detail
                    $completedUi.ProductionDeployStatusValue.Text = $state.Status
                    $completedUi.ProductionDeployCommitValue.Text = $state.Commit
                    $completedUi.ProductionDeployVerificationValue.Text = $state.Verification
                    $completedUi.ProductionDeployTimestampValue.Text = $state.Timestamp
                    $resultLabel = switch ($state.Outcome) {
                        'Confirmed' { '已確認' }
                        'Failed' { '查詢失敗' }
                        'Cancelled' { '已取消' }
                        'Unavailable' { '狀態檔不存在或無法確認' }
                        'Invalid' { '狀態內容無效' }
                        default { '無法確認' }
                    }
                    $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：$resultLabel"
                    & $completionAddOperationLog -Operation $completedRequest.Operation `
                        -Status $resultLabel -Output @(
                            $state.Detail,
                            "部署狀態：$($state.Status)",
                            "commit：$($state.Commit)",
                            "verification：$($state.Verification)",
                            "timestamp：$($state.Timestamp)"
                        )
                }
                'DeploymentPreflight' {
                    $preflight = $completionPayload.Result
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
                    $preflight = $completionPayload.Result
                    $confirmation = [System.Windows.Forms.MessageBox]::Show(
                        $completedUi.Form,
                        "推送前檢查通過。`r`n`r`n本機分支：$($preflight.Branch)`r`n本機 HEAD：$($preflight.Head)`r`nGitHub origin/master：$($preflight.RemoteHead)`r`n工作目錄狀態：$(if ($preflight.IsClean) { '乾淨' } else { '有未提交變更' })`r`n`r`n此次推送只會上傳已提交的 Git commit；未提交變更不會隨此次推送上傳。`r`n`r`n即將執行：git push origin master`r`n`r`n不會自動建立 commit，也不會自動 pull、merge、rebase、reset 或 force push。`r`n`r`n是否繼續？",
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
                    $result = $completionPayload.Result
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
                    $result = $completionPayload.Result
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
                    $result = $completionPayload.Result
                    $completion = Get-BackupCompletion -Result $result `
                        -ExpectedDirectory $completedRequest.BackupDestination
                    $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：$($completion.ActivityText)"
                    & $completionAddOperationLog -Operation $completedRequest.Operation `
                        -Status $completion.Status -Output $completion.Output
                }
                'RestoreList' {
                    $result = $completionPayload.Result
                    if ($result.TimedOut) {
                        $completedUi.RestoreStateValue.Text = '遠端備份列舉逾時'
                        $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：逾時"
                        & $completionAddOperationLog -Operation $completedRequest.Operation -Status '逾時' -Output @(
                            '唯讀列舉逾時；未執行還原命令。'
                        )
                    } elseif ($result.Cancelled) {
                        $completedUi.RestoreStateValue.Text = '遠端備份列舉已取消'
                        $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：已取消"
                        & $completionAddOperationLog -Operation $completedRequest.Operation -Status '已取消' -Output @(
                            '唯讀列舉已停止；未執行還原命令。'
                        )
                    } elseif ($result.BundlePaths.Count -eq 0) {
                        $completedUi.RestoreStateValue.Text = '遠端目錄中沒有有效的 bundle'
                        $completedUi.ActivityLabel.Text = '沒有可選擇的還原備份'
                        & $completionAddOperationLog -Operation $completedRequest.Operation -Status '完成；沒有符合命名格式的備份' -Output @(
                            "目標主機：$completionSshTarget",
                            "目標資料庫：$($result.DatabaseName)",
                            '只讀列舉完成；未執行還原命令。'
                        )
                    } else {
                        $completedUi.RestoreStateValue.Text = "找到 $($result.BundlePaths.Count) 個命名格式符合的候選 bundle"
                        & $completionAddOperationLog -Operation $completedRequest.Operation -Status '遠端備份列舉成功' -Output @(
                            "目標主機：$completionSshTarget",
                            "目標資料庫：$($result.DatabaseName)",
                            "命名格式符合的 bundle 候選數量：$($result.BundlePaths.Count)",
                            '僅列舉一般檔案與檔名；bundle 內容將由 restore.sh 在任何資料變更前驗證。'
                        )
                        $selectedBundle = & $completionShowRestoreBundleSelectionDialog -BundlePaths $result.BundlePaths
                        if (-not $selectedBundle) {
                            $completedUi.RestoreStateValue.Text = '未選擇備份；還原已取消'
                            & $completionAddOperationLog -Operation '正式環境還原' `
                                -Status '未選擇備份；未建立還原工作或呼叫還原命令'
                        } else {
                            $nextRestore = & $completionRequestRestoreConfirmation -BundlePath $selectedBundle `
                                -DatabaseName $result.DatabaseName
                        }
                    }
                }
                'Restore' {
                    $result = $completionPayload.Result
                    $output = @(& $completionFormatProcessOutput -Result $result)
                    $successMarker = $result.ExitCode -eq 0 -and
                        $result.Stdout -cmatch '(?m)^\[restore\.sh SUCCESS\] Database and \d+ Contract PDF file\(s\) restored and verified\.$'
                    $scriptReportedError = ($result.Stdout + "`n" + $result.Stderr) -cmatch '(?m)^\[restore\.sh ERROR\]'
                    if ($result.TimedOut -or $result.Cancelled) {
                        $completedUi.RestoreStateValue.Text = '遠端還原結果未確認'
                        $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：結果未確認"
                        & $completionAddOperationLog -Operation $completedRequest.Operation `
                            -Status '結果未確認' -Output @(
                                "目標主機：$completionSshTarget",
                                "備份 bundle：$($completedRequest.RestoreBundlePath)",
                                $output,
                                'SSH 已逾時或中斷；遠端是否仍在執行或已完成無法確認。請勿假設已取消或重試，先人工確認環境狀態。'
                            )
                    } elseif ($successMarker) {
                        $completedUi.RestoreStateValue.Text = '腳本回報還原及驗證成功'
                        $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：腳本回報成功"
                        & $completionAddOperationLog -Operation $completedRequest.Operation `
                            -Status 'restore.sh SUCCESS 標記及退出碼已確認' -Output @(
                                "目標主機：$completionSshTarget",
                                "備份 bundle：$($completedRequest.RestoreBundlePath)",
                                $output
                            )
                    } elseif ($result.ExitCode -ne 0 -and $scriptReportedError) {
                        $completedUi.RestoreStateValue.Text = '還原失敗'
                        $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：失敗（exit $($result.ExitCode)）"
                        & $completionAddOperationLog -Operation $completedRequest.Operation `
                            -Status "還原失敗（exit $($result.ExitCode)）" -Output @(
                                "目標主機：$completionSshTarget",
                                "備份 bundle：$($completedRequest.RestoreBundlePath)",
                                $output
                            )
                    } elseif ($result.ExitCode -ne 0) {
                        $completedUi.RestoreStateValue.Text = '還原 SSH 結果未確認'
                        $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：結果未確認"
                        & $completionAddOperationLog -Operation $completedRequest.Operation `
                            -Status 'SSH 失敗；遠端還原結果未確認' -Output @(
                                "目標主機：$completionSshTarget",
                                "備份 bundle：$($completedRequest.RestoreBundlePath)",
                                $output,
                                '未收到 restore.sh 明確錯誤或成功標記；請勿假設未執行或重試，先人工確認環境狀態。'
                            )
                    } else {
                        $completedUi.RestoreStateValue.Text = '腳本結果無法確認'
                        $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：結果未確認"
                        & $completionAddOperationLog -Operation $completedRequest.Operation `
                            -Status '結果未確認；缺少腳本成功標記' -Output @(
                                "目標主機：$completionSshTarget",
                                "備份 bundle：$($completedRequest.RestoreBundlePath)",
                                $output,
                                '退出碼為 0 但未找到 restore.sh 成功標記；不回報成功，也不自動重試。'
                            )
                    }
                }
                { $_ -in @('SshTest', 'BackupDestinationPreflight') } {
                    $result = $completionPayload.Result
                    $completedUi.SshAuthenticationValue.Text = switch ($result.AuthStatus) {
                        'Succeeded' { '成功：OpenSSH 私鑰認證及固定主機指紋驗證通過' }
                        'AuthenticationFailed' { '失敗：SSH 密碼或私鑰認證失敗' }
                        'HostKeyRejected' { '失敗：主機金鑰未知或不符' }
                        'TimedOut' { '逾時：SSH 連線未完成' }
                        'Cancelled' { '已取消' }
                        'CleanupFailed' { '認證完成但連線清理未確認' }
                        default { '失敗：SSH 連線未完成' }
                    }
                    if ($completedRequest.Action -eq 'BackupDestinationPreflight') {
                        $destinationVerified = $result.DestinationStatus -eq 'Verified'
                        $cleanupSucceeded = [bool]$result.CleanupSucceeded
                        $hostKeyVerified = [bool]$result.HostKeyVerified
                        $privateKeyVerified = [bool]$result.OpenSshAuthenticationSucceeded
                        $hostMatches = $completedRequest.SshHost -ceq $completionProductionSshHost
                        $usernameMatches = $completedRequest.SshUsername -ceq $completionProductionSshUser
                        $preflightSucceeded = $destinationVerified -and
                            $cleanupSucceeded -and $hostKeyVerified -and $privateKeyVerified -and
                            $hostMatches -and $usernameMatches
                        $preflightDiagnostics = @(
                            "DestinationStatus 為 Verified：$(if ($destinationVerified) { '是' } else { '否' })",
                            "CleanupSucceeded 為 true：$(if ($cleanupSucceeded) { '是' } else { '否' })",
                            "SSH.NET 固定主機指紋驗證：$(if ($hostKeyVerified) { '通過' } else { '未通過' })",
                            "OpenSSH 私鑰及 known_hosts 驗證：$(if ($privateKeyVerified) { '通過' } else { '未通過' })",
                            "主機比對：$(if ($hostMatches) { '通過' } else { '未通過' })",
                            "帳號比對：$(if ($usernameMatches) { '通過' } else { '未通過' })",
                            "最終成功判定：$(if ($preflightSucceeded) { '通過' } else { '未通過' })"
                        )
                        if ($preflightSucceeded) {
                            $completedState.VerifiedBackupDirectory = $result.DestinationCanonical
                            $completedState.VerifiedBackupHost = $completedRequest.SshHost
                            $completedState.VerifiedBackupUser = $completedRequest.SshUsername
                            $completedUi.BackupDestinationValue.Text = "$($result.DestinationCanonical)（BACKUP_DIR=$($result.Destination)；來源：$($result.DestinationSource)）"
                            $completedUi.BackupStateValue.Text = '備份目的地唯讀驗證成功'
                            $completedUi.BackupButton.Text = '備份'
                            $completedUi.ActivityLabel.Text = '備份目的地唯讀驗證成功；尚未執行備份'
                            & $completionAddOperationLog -Operation $completedRequest.Operation -Status '驗證成功；尚未執行備份' `
                                -Output ($preflightDiagnostics + @(
                                    'OpenSSH 私鑰認證、StrictHostKeyChecking 及 SSH.NET 固定主機指紋驗證均成功。',
                                    "備份目的地實際路徑：$($result.DestinationCanonical)",
                                    "backup.sh 使用的 BACKUP_DIR：$($result.Destination)",
                                    "BACKUP_DIR 來源：$($result.DestinationSource)",
                                    '只檢查既有目錄狀態；未建立目錄、變更權限、建立備份或刪除檔案。'
                                ))
                        } else {
                            $completedState.VerifiedBackupDirectory = $null
                            $completedState.VerifiedBackupHost = $null
                            $completedState.VerifiedBackupUser = $null
                            $completedUi.BackupDestinationValue.Text = '未驗證；備份維持阻擋'
                            $completedUi.BackupStateValue.Text = '目的地預檢失敗'
                            $completedUi.BackupButton.Text = '備份（目的地未驗證）'
                            $completedUi.ActivityLabel.Text = if ($result.DestinationStatus -eq 'TimedOut') {
                                '唯讀驗證備份目的地：逾時'
                            } else {
                                "唯讀驗證備份目的地：$($result.DestinationStatus)"
                            }
                            & $completionAddOperationLog -Operation $completedRequest.Operation `
                                -Status '目的地未驗證；備份維持阻擋' -Output ($preflightDiagnostics + @(
                                    "SSH 認證狀態：$($result.AuthStatus)",
                                    "錯誤類別：$($result.ErrorCategory)",
                                    "清理失敗：$(if ($result.CleanupFailed) { '是' } else { '否' })",
                                    "失敗階段：$($result.FailureStage)",
                                    "遠端命令退出碼：$(if ($null -eq $result.RemoteExitCode) { '未取得' } else { $result.RemoteExitCode })",
                                    "退出碼讀取狀態：$($result.RemoteExitCodeReadStatus)",
                                    "遠端目的地狀態：$($result.DestinationState)",
                                    "例外類型：$($result.ExceptionType)",
                                    "內層例外類型（最多 3 層）：$($result.InnerExceptionTypes)",
                                    "SSH Execute 例外分類：$($result.SshExceptionCategory)",
                                    "stderr 讀取狀態：$($result.StderrReadStatus)",
                                    "遠端 stderr 摘要：$($result.StderrSummary)",
                                    $result.Reason
                                ))
                        }
                    } else {
                        $completedUi.ActivityLabel.Text = switch ($result.AuthStatus) {
                            'Succeeded' { 'SSH 認證成功；備份目的地尚未驗證' }
                            'AuthenticationFailed' { 'SSH 認證失敗' }
                            'HostKeyRejected' { 'SSH 主機金鑰驗證失敗' }
                            'TimedOut' { 'SSH 連線逾時' }
                            'Cancelled' { 'SSH 連線已取消' }
                            'CleanupFailed' { 'SSH 認證完成但連線清理未確認' }
                            default { 'SSH 連線失敗' }
                        }
                        $diagnosticStage = if ($result.DiagnosticStage -in @(
                            'SshClientInitialization',
                            'ConnectionHandshake',
                            'HostKeyVerification',
                            'PasswordAuthentication',
                            'AuthenticationSucceeded',
                            'OpenSshAuthentication',
                            'CancelledBeforeConnection',
                            'Other'
                        )) {
                            $result.DiagnosticStage
                        } else {
                            'Other'
                        }
                        $errorCategory = if ($result.ErrorCategory -in @(
                            'HostKeyRejected',
                            'AuthenticationFailed',
                            'TimedOut',
                            'Cancelled',
                            'Failed',
                            'Succeeded'
                        )) {
                            $result.ErrorCategory
                        } else {
                            'Failed'
                        }
                        & $completionAddOperationLog -Operation $completedRequest.Operation `
                            -Status $result.AuthStatus -Output @(
                                "診斷階段：$diagnosticStage",
                                "錯誤類別：$errorCategory",
                                "清理失敗：$(if ($result.CleanupFailed) { '是' } else { '否' })",
                                "SSH 認證成功已確認：$(if ($result.AuthenticationSucceeded) { '是' } else { '否（未確認）' })",
                                $result.Reason
                            )
                    }
                }
                }
            }
        } catch {
            if ($completedRequest.Action -in @('SshTest', 'BackupDestinationPreflight')) {
                $completedUi.SshAuthenticationValue.Text = '失敗：完成處理未能確認'
                $completedUi.BackupDestinationValue.Text = '未驗證；備份維持阻擋'
                $completedUi.BackupStateValue.Text = '目的地預檢失敗'
                $completedState.VerifiedBackupDirectory = $null
                $completedState.VerifiedBackupHost = $null
                $completedState.VerifiedBackupUser = $null
                $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：完成處理失敗"
                & $completionAddOperationLog -Operation $completedRequest.Operation -Status '完成處理失敗；錯誤內容已抑制' `
                    -Output @('SSH 完成處理例外資訊不記錄。')
            } else {
                $completedUi.ActivityLabel.Text = "$($completedRequest.Operation)：完成處理失敗"
                & $completionAddOperationLog -Operation $completedRequest.Operation -Status '完成處理失敗' -Output @(
                    (& $completionProtectSensitiveText -Text $_.Exception.Message)
                )
            }
        } finally {
            try {
                if ($completedRequest.Action -in @('SshTest', 'BackupDestinationPreflight')) {
                    if ($completedRequest.SshPassword) {
                        Clear-SshCredential -SecurePassword $completedRequest.SshPassword
                        $completedRequest.SshPassword = $null
                        $workContext.SshPassword = $null
                    }
                    $completedUi.SshPasswordInput.Clear()
                }
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
                if ($completedRequest.Action -in @('ReadOnlySshPreflight', 'SshTest', 'BackupDestinationPreflight')) {
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
                    & $completionSetOperationButtonsEnabled -Enabled $true `
                        -UnconfirmedProcess ([bool]$unconfirmedProcess)
                } else {
                    & $completionSetOperationButtonsEnabled -Enabled $false `
                        -UnconfirmedProcess ([bool]$unconfirmedProcess)
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
        if ($nextRestore -and -not $closeAfterCompletion) {
            & $completionStartBackgroundOperation -Operation '正式環境資料庫與 Contract PDF 還原' `
                -Action 'Restore' -RestoreBundlePath $nextRestore.BundlePath `
                -RestoreConfirmation $nextRestore.Confirmation
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
        if ($Action -in @('SshTest', 'BackupDestinationPreflight')) {
            Add-OperationLog -Operation $Operation -Status 'SSH 工作無法啟動' -Output @(
                '診斷階段：Other',
                '錯誤類別：Failed',
                'SSH 認證成功已確認：否（未確認）',
                '例外內容與堆疊未記錄。'
            )
        } else {
            Add-OperationLog -Operation $Operation -Status '無法啟動' -Output @(
                (Protect-SensitiveText -Text $_.Exception.Message)
            )
        }
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
        if ($request.SshPassword) {
            Clear-SshCredential -SecurePassword $request.SshPassword
            $request.SshPassword = $null
            $context.SshPassword = $null
            $script:Controls.SshPasswordInput.Clear()
        }
    }
}

function Start-SshUiOperation {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet('SshTest', 'BackupDestinationPreflight')]
        [string]$Action
    )

    $hostName = $script:Controls.SshHostInput.Text.Trim()
    $username = $script:Controls.SshUsernameInput.Text.Trim()
    if ($hostName -cnotmatch '^[A-Za-z0-9.-]{1,253}$' -or
        $username -cnotmatch '^[A-Za-z_][A-Za-z0-9._-]{0,63}$') {
        $script:Controls.SshPasswordInput.Clear()
        $script:Controls.SshAuthenticationValue.Text = '失敗：主機或帳號格式無效'
        $script:Controls.ActivityLabel.Text = 'SSH：輸入格式無效'
        return
    }
    if ($hostName -cne $script:ProductionSshHost -or $username -cne $script:ProductionSshUser) {
        $script:Controls.SshPasswordInput.Clear()
        $script:Controls.SshAuthenticationValue.Text = '已阻擋：驗證僅允許正式環境主機與帳號'
        $script:Controls.ActivityLabel.Text = 'SSH 驗證：已阻擋（主機或帳號不符）'
        if ($Action -eq 'BackupDestinationPreflight') {
            $script:Controls.BackupDestinationValue.Text = '未驗證；預檢僅允許正式環境主機與帳號'
            $script:Controls.BackupStateValue.Text = '正式操作待目的地驗證'
            $script:OperationState.VerifiedBackupDirectory = $null
            $script:OperationState.VerifiedBackupHost = $null
            $script:OperationState.VerifiedBackupUser = $null
            Set-OperationButtonsEnabled -Enabled $true
        }
        return
    }

    $passwordCharacters = $script:Controls.SshPasswordInput.Text.ToCharArray()
    $script:Controls.SshPasswordInput.Clear()
    if ($passwordCharacters.Length -eq 0) {
        $script:Controls.SshAuthenticationValue.Text = '尚未連線：請輸入密碼'
        $script:Controls.ActivityLabel.Text = 'SSH：尚未連線'
        return
    }

    $securePassword = New-Object System.Security.SecureString
    try {
        foreach ($character in $passwordCharacters) {
            $securePassword.AppendChar($character)
        }
    } catch {
        Clear-SshCredential -SecurePassword $securePassword
        throw
    } finally {
        [Array]::Clear($passwordCharacters, 0, $passwordCharacters.Length)
        $passwordCharacters = $null
    }

    $script:Controls.SshAuthenticationValue.Text = '連線中…'
    if ($Action -eq 'BackupDestinationPreflight') {
        $script:OperationState.VerifiedBackupDirectory = $null
        $script:OperationState.VerifiedBackupHost = $null
        $script:OperationState.VerifiedBackupUser = $null
        $script:Controls.BackupDestinationValue.Text = '驗證中…'
        $script:Controls.BackupStateValue.Text = '目的地驗證中；備份仍受阻擋'
        $script:Controls.BackupButton.Enabled = $false
    }
    $operation = if ($Action -eq 'SshTest') { '測試 SSH 連線' } else { '唯讀驗證備份目的地' }
    try {
        Start-BackgroundOperation -Operation $operation -Action $Action `
            -SshHost $hostName -SshUsername $username -SshPassword $securePassword
    } catch {
        Clear-SshCredential -SecurePassword $securePassword
        $script:Controls.SshAuthenticationValue.Text = '失敗：無法啟動 SSH 工作'
        if ($Action -eq 'BackupDestinationPreflight') {
            $script:Controls.BackupDestinationValue.Text = '未驗證；備份維持阻擋'
            $script:Controls.BackupStateValue.Text = '正式操作待目的地驗證'
        }
        $script:Controls.ActivityLabel.Text = "$operation：無法啟動"
    }
}

function Request-ActiveOperationCancellation {
    $context = $script:OperationState.ActiveOperation
    if (-not $context) {
        return
    }
    $context.CancelRequested = $true
    $context.Stage = '取消目前操作'
    if ($context.SshClient) {
        try {
            $context.SshClient.Disconnect()
        } catch {
            $context.SshDisconnectFailed = $true
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

function New-TextInputRow {
    param(
        [Parameter(Mandatory = $true)][System.Windows.Forms.TableLayoutPanel]$Table,
        [Parameter(Mandatory = $true)][string]$Label,
        [Parameter(Mandatory = $true)][string]$ControlName,
        [string]$InitialValue = '',
        [switch]$Password
    )

    $row = $Table.RowCount
    $Table.RowCount++
    $Table.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::AutoSize)))
    $labelControl = New-Object System.Windows.Forms.Label
    $labelControl.Text = $Label
    $labelControl.AutoSize = $true
    $labelControl.Margin = New-Object System.Windows.Forms.Padding(4, 7, 8, 5)
    $inputControl = New-Object System.Windows.Forms.TextBox
    $inputControl.Dock = [System.Windows.Forms.DockStyle]::Fill
    $inputControl.Text = $InitialValue
    $inputControl.Margin = New-Object System.Windows.Forms.Padding(4, 5, 4, 5)
    if ($Password) {
        $inputControl.UseSystemPasswordChar = $true
    }
    $Table.Controls.Add($labelControl, 0, $row)
    $Table.Controls.Add($inputControl, 1, $row)
    $script:Controls[$ControlName] = $inputControl
    return $inputControl
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
[void](New-InfoRow -Table $productionTable -Label 'Production 狀態查詢結果' `
    -Value '尚未查詢；固定狀態檔路徑尚未在 Production 實際確認' -ControlName 'ProductionStateQueryResultValue')
[void](New-InfoRow -Table $productionTable -Label '部署 status' -Value '尚未查詢' -ControlName 'ProductionDeployStatusValue')
[void](New-InfoRow -Table $productionTable -Label '部署 commit' -Value '尚未查詢' -ControlName 'ProductionDeployCommitValue')
[void](New-InfoRow -Table $productionTable -Label '部署 verification' -Value '尚未查詢' -ControlName 'ProductionDeployVerificationValue')
[void](New-InfoRow -Table $productionTable -Label '部署 timestamp' -Value '尚未查詢' -ControlName 'ProductionDeployTimestampValue')
[void](New-InfoRow -Table $productionTable -Label '狀態檔路徑' `
    -Value '/home/zhe/pets-deploy-state/deployment.state（尚未在 Production 實際確認）')
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
$script:Controls.ProductionStateQueryButton = New-ActionButton -Text '查詢 Production 部署狀態（唯讀）'
$productionTable.Controls.Add($script:Controls.ProductionStateQueryButton, 0, $productionTable.RowCount + 1)
$productionTable.SetColumnSpan($script:Controls.ProductionStateQueryButton, 2)
$deployButton = New-ActionButton -Text '部署（第二階段啟用）' -Enabled $false
$productionTable.Controls.Add($deployButton, 0, $productionTable.RowCount + 2)
$productionTable.SetColumnSpan($deployButton, 2)
$script:Controls.DeploymentPreflightButton = New-ActionButton -Text '部署前檢查'
$productionTable.Controls.Add($script:Controls.DeploymentPreflightButton, 0, $productionTable.RowCount + 3)
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
[void](New-InfoRow -Table $serverTable -Label 'SSH 認證' -Value '尚未連線' -ControlName 'SshAuthenticationValue')
[void](New-TextInputRow -Table $serverTable -Label 'SSH 主機' -InitialValue $script:ProductionSshHost -ControlName 'SshHostInput')
[void](New-TextInputRow -Table $serverTable -Label 'SSH 帳號' -InitialValue $script:ProductionSshUser -ControlName 'SshUsernameInput')
[void](New-TextInputRow -Table $serverTable -Label 'SSH 密碼' -ControlName 'SshPasswordInput' -Password)
[void](New-InfoRow -Table $serverTable -Label '還原' -Value '等待遠端 bundle 列舉' -ControlName 'RestoreStateValue')
[void](New-InfoRow -Table $serverTable -Label '伺服器重建' -Value '尚無完整重建流程' -ControlName 'RebuildStateValue')
$serverButtons = New-Object System.Windows.Forms.FlowLayoutPanel
$serverButtons.AutoSize = $true
$serverButtons.Dock = [System.Windows.Forms.DockStyle]::Fill
$script:Controls.SshTestButton = New-ActionButton -Text '測試 SSH 連線'
$script:Controls.BackupDestinationButton = New-ActionButton -Text '唯讀驗證備份目的地'
$script:Controls.CancelOperationButton = New-ActionButton -Text '取消目前操作' -Enabled $false
$backupButton = New-ActionButton -Text '備份（目的地未驗證）' -Enabled $false
$script:Controls.BackupButton = $backupButton
$script:Controls.RestoreButton = New-ActionButton -Text '選擇遠端備份並還原'
$rebuildButton = New-ActionButton -Text '重建（尚未接線）' -Enabled $false
$serverButtons.Controls.Add($script:Controls.SshTestButton)
$serverButtons.Controls.Add($script:Controls.BackupDestinationButton)
$serverButtons.Controls.Add($script:Controls.CancelOperationButton)
$serverButtons.Controls.Add($backupButton)
$serverButtons.Controls.Add($script:Controls.RestoreButton)
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
$script:Controls.RestoreButton.Add_Click({
    Request-RestoreOperation
})
$script:Controls.SshTestButton.Add_Click({
    Start-SshUiOperation -Action 'SshTest'
})
$script:Controls.BackupDestinationButton.Add_Click({
    Start-SshUiOperation -Action 'BackupDestinationPreflight'
})
$script:Controls.ProductionStateQueryButton.Add_Click({
    $script:Controls.ProductionStateQueryResultValue.Text = '查詢中…；固定狀態檔路徑尚未在 Production 實際確認'
    $script:Controls.ProductionDeployStatusValue.Text = '尚未確認'
    $script:Controls.ProductionDeployCommitValue.Text = '尚未確認'
    $script:Controls.ProductionDeployVerificationValue.Text = '尚未確認'
    $script:Controls.ProductionDeployTimestampValue.Text = '尚未確認'
    Start-BackgroundOperation -Operation '查詢 Production 部署狀態（唯讀）' -Action 'ProductionStateQuery'
})
$script:Controls.CancelOperationButton.Add_Click({
    $context = $script:OperationState.ActiveOperation
    if ($context) {
        Request-ActiveOperationCancellation
        $script:Controls.ActivityLabel.Text = "正在取消：$($context.Stage)"
    }
})
$script:Controls.SshHostInput.Add_TextChanged({
    $script:OperationState.VerifiedBackupDirectory = $null
    $script:OperationState.VerifiedBackupHost = $null
    $script:OperationState.VerifiedBackupUser = $null
    $script:Controls.BackupDestinationValue.Text = '未驗證；正式備份禁止執行'
    $script:Controls.BackupStateValue.Text = '正式操作待目的地驗證'
    $script:Controls.BackupButton.Text = '備份（目的地未驗證）'
    if (-not $script:OperationState.IsBusy) {
        $script:Controls.BackupButton.Enabled = $false
    }
    $isBusy = 'unavailable'
    try {
        $isBusy = [bool]$script:OperationState.IsBusy
    } catch {
        $isBusy = 'unavailable'
    }
    Write-BackupButtonDiagnostic -Status 'SSH 主機欄位變更' -Output @(
        "IsBusy: $isBusy"
    )
})
$script:Controls.SshUsernameInput.Add_TextChanged({
    $script:OperationState.VerifiedBackupDirectory = $null
    $script:OperationState.VerifiedBackupHost = $null
    $script:OperationState.VerifiedBackupUser = $null
    $script:Controls.BackupDestinationValue.Text = '未驗證；正式備份禁止執行'
    $script:Controls.BackupStateValue.Text = '正式操作待目的地驗證'
    $script:Controls.BackupButton.Text = '備份（目的地未驗證）'
    if (-not $script:OperationState.IsBusy) {
        $script:Controls.BackupButton.Enabled = $false
    }
    $isBusy = 'unavailable'
    try {
        $isBusy = [bool]$script:OperationState.IsBusy
    } catch {
        $isBusy = 'unavailable'
    }
    Write-BackupButtonDiagnostic -Status 'SSH 帳號欄位變更' -Output @(
        "IsBusy: $isBusy"
    )
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
    param($formSender, $formClosingArgs)
    if ($script:OperationState.AllowClose) {
        return
    }
    if ($script:OperationState.IsBusy) {
        $formClosingArgs.Cancel = $true
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
            Request-ActiveOperationCancellation
            $script:Controls.ActivityLabel.Text = "正在取消目前操作：$($script:OperationState.ActiveOperation.Stage)"
        } else {
            $script:Controls.ActivityLabel.Text = "繼續等待：$($script:OperationState.ActiveOperation.Operation)"
        }
        return
    }

    $context = $script:OperationState.ActiveOperation
    if (-not $context -or -not $context.Process) {
        return
    }

    $formClosingArgs.Cancel = $true
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
            $formClosingArgs.Cancel = $false
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
