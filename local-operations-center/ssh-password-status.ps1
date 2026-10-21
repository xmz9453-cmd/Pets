$ErrorActionPreference = 'Stop'

# Node.js reads redirected child-process streams as UTF-8; avoid the Windows OEM code page.
$utf8 = New-Object System.Text.UTF8Encoding($false)
[Console]::InputEncoding = $utf8
[Console]::OutputEncoding = $utf8
$OutputEncoding = $utf8

# This helper accepts credentials only through stdin. It has one fixed, read-only command.
$credentialJson = [Console]::In.ReadToEnd()
$credentials = $null
$client = $null
$authentication = $null
$stage = 'INPUT_VALIDATION'
$assemblyBeingLoaded = $null
$hostKeyState = @{ Received = $false; Verified = $false }
$hostKeyReceived = $false
$hostKeyVerified = $false
try {
    $credentials = ConvertFrom-Json -InputObject $credentialJson
    if ($credentials.username -cnotmatch '\A[A-Za-z0-9._-]{1,64}\z' -or
        [string]::IsNullOrEmpty($credentials.password) -or $credentials.password.Length -gt 1024) {
        throw '帳號或密碼格式無效。'
    }

    $stage = 'DEPENDENCY_FILE_CHECK'
    $packageRoot = Join-Path $env:LOCALAPPDATA 'Pets-Operations-Center\sshnet-2026.0.0\packages'
    $assemblyPaths = @(
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
        'System.ValueTuple.4.6.2\lib\net462\System.ValueTuple.dll',
        'SSH.NET.2026.0.0\lib\net462\Renci.SshNet.dll'
    ) | ForEach-Object { Join-Path $packageRoot $_ }
    foreach ($assemblyPath in $assemblyPaths) {
        $assemblyBeingLoaded = [IO.Path]::GetFileNameWithoutExtension($assemblyPath)
        if (-not (Test-Path -LiteralPath $assemblyPath -PathType Leaf)) {
            throw 'DependencyFileMissing'
        }
    }
    # SSH.NET can request package assemblies lazily during key exchange. They live
    # in separate NuGet folders, so LoadFrom alone may not resolve that request.
    if (-not ('PetsOperations.SshPackageResolver' -as [type])) {
        Add-Type -TypeDefinition @'
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq.Expressions;
using System.Reflection;
using System.Security.Cryptography;

namespace PetsOperations
{
    public static class SshPackageResolver
    {
        private static readonly object Sync = new object();
        private static Dictionary<string, string> Paths;

        public static void Register(string[] paths)
        {
            var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var path in paths)
            {
                var identity = AssemblyName.GetAssemblyName(path);
                if (map.ContainsKey(identity.Name))
                    throw new InvalidOperationException("Duplicate SSH package assembly: " + identity.Name);
                map.Add(identity.Name, Path.GetFullPath(path));
            }
            lock (Sync)
            {
                if (Paths != null)
                    throw new InvalidOperationException("SSH package resolver was registered more than once.");
                Paths = map;
                AppDomain.CurrentDomain.AssemblyResolve += Resolve;
            }
        }

        public static Delegate CreateHostKeyHandler(Type handlerType, SshHostKeyVerifier verifier)
        {
            var invoke = handlerType.GetMethod("Invoke");
            var signature = invoke.GetParameters();
            if (invoke.ReturnType != typeof(void) || signature.Length != 2)
                throw new InvalidOperationException("Unexpected SSH host-key event signature.");
            var parameters = new ParameterExpression[] {
                Expression.Parameter(signature[0].ParameterType, signature[0].Name),
                Expression.Parameter(signature[1].ParameterType, signature[1].Name)
            };
            var method = typeof(SshHostKeyVerifier).GetMethod("OnHostKeyReceived");
            var body = Expression.Call(Expression.Constant(verifier), method,
                Expression.Convert(parameters[0], typeof(object)),
                Expression.Convert(parameters[1], typeof(object)));
            return Expression.Lambda(handlerType, body, parameters).Compile();
        }

        private static Assembly Resolve(object sender, ResolveEventArgs args)
        {
            var requested = new AssemblyName(args.Name);
            string path;
            if (Paths == null || !Paths.TryGetValue(requested.Name, out path))
                return null;

            var available = AssemblyName.GetAssemblyName(path);
            if (requested.Version > available.Version ||
                !String.Equals(Token(requested), Token(available), StringComparison.OrdinalIgnoreCase))
                return null;

            foreach (var loaded in AppDomain.CurrentDomain.GetAssemblies())
            {
                if (!loaded.IsDynamic &&
                    String.Equals(loaded.Location, path, StringComparison.OrdinalIgnoreCase) &&
                    String.Equals(loaded.GetName().Name, requested.Name, StringComparison.OrdinalIgnoreCase))
                    return loaded;
            }
            return Assembly.LoadFrom(path);
        }

        private static string Token(AssemblyName name)
        {
            var token = name.GetPublicKeyToken();
            return token == null ? String.Empty : BitConverter.ToString(token).Replace("-", String.Empty);
        }
    }

    public sealed class SshHostKeyVerifier
    {
        private readonly IDictionary state;
        private readonly string expectedFingerprint;

        public SshHostKeyVerifier(IDictionary state, string expectedFingerprint)
        {
            this.state = state;
            this.expectedFingerprint = expectedFingerprint;
        }

        public void OnHostKeyReceived(object sender, object eventArgs)
        {
            state["Received"] = true;
            var type = eventArgs.GetType();
            var keyProperty = type.GetProperty("HostKey");
            var trustProperty = type.GetProperty("CanTrust");
            if (keyProperty == null || trustProperty == null)
                throw new InvalidOperationException("SSH host-key event arguments are incomplete.");

            var hostKey = (byte[])keyProperty.GetValue(eventArgs, null);
            string fingerprint;
            using (var sha = SHA256.Create())
                fingerprint = Convert.ToBase64String(sha.ComputeHash(hostKey)).TrimEnd('=');
            var trusted = String.Equals(fingerprint, expectedFingerprint, StringComparison.Ordinal);
            trustProperty.SetValue(eventArgs, trusted, null);
            state["Verified"] = trusted;
        }
    }
}
'@
    }
    [PetsOperations.SshPackageResolver]::Register([string[]]$assemblyPaths)
    $stage = 'DEPENDENCY_LOAD'
    foreach ($assemblyPath in $assemblyPaths) {
        $assemblyBeingLoaded = [IO.Path]::GetFileNameWithoutExtension($assemblyPath)
        [void][Reflection.Assembly]::LoadFrom($assemblyPath)
    }

    $stage = 'SSH_TYPE_CHECK'
    $assemblyBeingLoaded = 'Renci.SshNet'
    $sshAssembly = [Reflection.Assembly]::LoadFrom(($assemblyPaths | Where-Object { $_ -like '*Renci.SshNet.dll' } | Select-Object -First 1))
    foreach ($typeName in @('Renci.SshNet.SshClient', 'Renci.SshNet.PasswordAuthenticationMethod', 'Renci.SshNet.Common.HostKeyEventArgs')) {
        if (-not $sshAssembly.GetType($typeName, $false)) { throw 'SshRequiredTypeMissing' }
    }

    $stage = 'AUTHENTICATION_SETUP'
    $authentication = New-Object Renci.SshNet.PasswordAuthenticationMethod($credentials.username, $credentials.password)
    $connection = New-Object Renci.SshNet.ConnectionInfo('175.183.34.91', 22, $credentials.username, $authentication)
    $connection.Timeout = [TimeSpan]::FromSeconds(15)
    $client = New-Object Renci.SshNet.SshClient($connection)
    $expected = 'YWPE7arZLZ8/67Ta6hLRdBj73eNdk24klgUo+rRBm6s'
    $stage = 'CONNECT'
    $hostKeyVerifier = [PetsOperations.SshHostKeyVerifier]::new($hostKeyState, $expected)
    $hostKeyEvent = $client.GetType().GetEvent('HostKeyReceived')
    if (-not $hostKeyEvent) { throw 'SshHostKeyEventMissing' }
    $hostKeyHandler = [PetsOperations.SshPackageResolver]::CreateHostKeyHandler(
        $hostKeyEvent.EventHandlerType, $hostKeyVerifier
    )
    $hostKeyEvent.AddEventHandler($client, $hostKeyHandler)
    $client.Connect()
    $hostKeyReceived = [bool]$hostKeyState.Received
    $hostKeyVerified = [bool]$hostKeyState.Verified
    $stage = 'REMOTE_COMMAND'
    $command = "if [ -f /home/zhe/pets-deploy-state/deployment.state ]; then cat -- /home/zhe/pets-deploy-state/deployment.state; else exit 44; fi"
    $result = $client.RunCommand($command)
    if ($result.Result) { [Console]::Out.Write($result.Result) }
    if ($result.Error) { [Console]::Error.WriteLine('PROD_SSH_ERROR=REMOTE_COMMAND_FAILED') }
    if ($null -eq $result.ExitStatus) { exit 1 }
    exit [int]$result.ExitStatus
} catch {
    $category = 'CONNECTION_FAILED'
    $hostKeyReceived = $hostKeyReceived -or [bool]$hostKeyState.Received
    $hostKeyVerified = $hostKeyVerified -or [bool]$hostKeyState.Verified
    $exception = $_.Exception
    $chain = @()
    $messages = @()
    for ($depth = 0; $null -ne $exception -and $depth -lt 5; $depth++) {
        $chain += $exception.GetType().FullName
        $messages += [string]$exception.Message
        $exception = $exception.InnerException
    }
    $safeExceptionTypes = @($chain | Where-Object {
        $_ -cmatch '\A[A-Za-z_][A-Za-z0-9_.+`]{0,127}\z'
    } | Select-Object -First 4)
    $missingAssemblyName = $null
    $exception = $_.Exception
    for ($depth = 0; $null -ne $exception -and $depth -lt 5; $depth++) {
        if ($exception -is [System.IO.FileNotFoundException] -and
            -not [string]::IsNullOrWhiteSpace($exception.FileName)) {
            $candidateName = [string]$exception.FileName
            if ($candidateName.Contains('\') -or $candidateName.Contains('/')) {
                $candidateName = [IO.Path]::GetFileNameWithoutExtension($candidateName)
            } else {
                $candidateName = ($candidateName -split ',', 2)[0].Trim()
                $candidateName = $candidateName -replace '(?i)\.(?:dll|exe)\z', ''
            }
            if ($candidateName -cmatch '\A[A-Za-z0-9_.-]{1,128}\z') {
                $missingAssemblyName = $candidateName
            }
            break
        }
        $exception = $exception.InnerException
    }
    if ($stage -eq 'INPUT_VALIDATION') {
        $category = 'INVALID_CREDENTIAL_INPUT'
    } elseif ($stage -eq 'DEPENDENCY_FILE_CHECK') {
        $category = 'DEPENDENCY_FILE_MISSING'
    } elseif ($stage -eq 'DEPENDENCY_RESOLVER') {
        $category = 'DEPENDENCY_RESOLVER_FAILED'
    } elseif ($stage -eq 'DEPENDENCY_LOAD') {
        $category = 'DEPENDENCY_LOAD_FAILED'
    } elseif ($stage -eq 'SSH_TYPE_CHECK') {
        $category = 'SSH_TYPE_MISSING'
    } elseif ($stage -eq 'AUTHENTICATION_SETUP') {
        $category = 'AUTHENTICATION_SETUP_FAILED'
    } elseif ($hostKeyReceived -and -not $hostKeyVerified) {
        $category = 'HOST_KEY_MISMATCH'
    } elseif (@($messages | Where-Object { $_ -match '(?i)host key could not be verified' }).Count -gt 0) {
        $category = 'HOST_KEY_MISMATCH'
    } elseif (@($messages | Where-Object { $_ -match '(?i)(key exchange|key-exchange).*(negotiat|algorithm)|(negotiat|algorithm).*(key exchange|key-exchange)' }).Count -gt 0) {
        $category = 'KEY_EXCHANGE_FAILED'
    } elseif ($messages -contains 'No suitable authentication method found to complete authentication.') {
        $category = 'AUTHENTICATION_REJECTED'
    } elseif ($chain -contains 'Renci.SshNet.Common.SshAuthenticationException') {
        $category = 'AUTHENTICATION_REJECTED'
    } elseif ($chain -contains 'Renci.SshNet.Common.SshOperationTimeoutException' -or
        $chain -contains 'System.TimeoutException') {
        $category = 'TIMEOUT'
    } elseif ($chain -contains 'System.Net.Sockets.SocketException') {
        $socketCode = $null
        for ($item = $_.Exception; $null -ne $item -and $null -eq $socketCode; $item = $item.InnerException) {
            if ($item -is [System.Net.Sockets.SocketException]) { $socketCode = $item.SocketErrorCode }
        }
        if ($socketCode -eq [System.Net.Sockets.SocketError]::ConnectionRefused) {
            $category = 'CONNECTION_REFUSED'
        } elseif ($socketCode -in @([System.Net.Sockets.SocketError]::NetworkUnreachable, [System.Net.Sockets.SocketError]::HostUnreachable)) {
            $category = 'NETWORK_UNREACHABLE'
        } elseif ($socketCode -eq [System.Net.Sockets.SocketError]::TimedOut) {
            $category = 'TIMEOUT'
        } elseif ($socketCode -in @([System.Net.Sockets.SocketError]::ConnectionReset, [System.Net.Sockets.SocketError]::ConnectionAborted, [System.Net.Sockets.SocketError]::Shutdown)) {
            $category = 'CONNECTION_RESET'
        } elseif ($socketCode -eq [System.Net.Sockets.SocketError]::HostNotFound) {
            $category = 'HOST_RESOLUTION_FAILED'
        } else {
            $category = 'SOCKET_FAILURE'
        }
    } elseif ($stage -eq 'REMOTE_COMMAND') {
        $category = 'REMOTE_COMMAND_FAILED'
    } elseif ($stage -eq 'CONNECT' -and $chain -contains 'Renci.SshNet.Common.SshConnectionException') {
        $category = 'SSH_HANDSHAKE_FAILED'
    } elseif ($stage -eq 'CONNECT') {
        $category = if ($null -ne $missingAssemblyName) { 'CONNECT_DEPENDENCY_MISSING' } else { 'SSH_CONNECT_FAILED' }
    }
    [Console]::Error.WriteLine("PROD_SSH_ERROR=$category")
    [Console]::Error.WriteLine("PROD_SSH_STAGE=$stage")
    if ($safeExceptionTypes.Count -gt 0) {
        [Console]::Error.WriteLine("PROD_SSH_EXCEPTION_CHAIN=$($safeExceptionTypes -join '|')")
    }
    if ($missingAssemblyName) {
        [Console]::Error.WriteLine("PROD_SSH_MISSING_ASSEMBLY=$missingAssemblyName")
    }
    [Console]::Error.WriteLine("PROD_SSH_HOSTKEY_EVENT=$([bool]$hostKeyState.Received)")
    exit 1
} finally {
    if ($client) {
        if ($hostKeyEvent -and $hostKeyHandler) {
            try { $hostKeyEvent.RemoveEventHandler($client, $hostKeyHandler) } catch {}
        }
        try { if ($client.IsConnected) { $client.Disconnect() } } catch {}
        $client.Dispose()
    }
    if ($authentication) { $authentication.Dispose() }
    if ($credentials) { $credentials.password = '' }
    $credentialJson = $null
}
