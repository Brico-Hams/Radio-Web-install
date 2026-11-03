#requires -Version 5.1
<#
Builds and verifies the signed RadiCodex release APK (github flavor).
Secrets are only prompted (Read-Host -AsSecureString), exported to the child
gradle process environment and removed afterwards. Nothing is echoed or written.
#>
[CmdletBinding()]
param(
    [string]$DefaultKeystore = 'C:\Users\anato\Documents\rt950-satelite\secrets\bricohams-android.jks'
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

function ConvertTo-PlainText([System.Security.SecureString]$Secure) {
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

$keystore = Read-Host "Ruta del keystore [$DefaultKeystore]"
if ([string]::IsNullOrWhiteSpace($keystore)) { $keystore = $DefaultKeystore }
if (-not (Test-Path -LiteralPath $keystore -PathType Leaf)) { throw "No existe el keystore: $keystore" }
$resolved = (Resolve-Path -LiteralPath $keystore).Path
if ($resolved.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) { throw 'El keystore no debe estar dentro del repositorio.' }

$alias = Read-Host 'Alias de la clave'
if ([string]::IsNullOrWhiteSpace($alias)) { throw 'El alias es obligatorio.' }
$storePass = Read-Host 'Contrasena del keystore' -AsSecureString
$keyPass = Read-Host 'Contrasena de la clave (vacio = la del keystore)' -AsSecureString

$names = 'RADICODEX_KEYSTORE_PATH', 'RADICODEX_KEYSTORE_PASSWORD', 'RADICODEX_KEY_ALIAS', 'RADICODEX_KEY_PASSWORD'
$previous = @{}
foreach ($n in $names) { $previous[$n] = [Environment]::GetEnvironmentVariable($n, 'Process') }

try {
    $storePlain = ConvertTo-PlainText $storePass
    $keyPlain = ConvertTo-PlainText $keyPass
    if ([string]::IsNullOrEmpty($keyPlain)) { $keyPlain = $storePlain }
    $env:RADICODEX_KEYSTORE_PATH = $resolved
    $env:RADICODEX_KEYSTORE_PASSWORD = $storePlain
    $env:RADICODEX_KEY_ALIAS = $alias
    $env:RADICODEX_KEY_PASSWORD = $keyPlain
    $storePlain = $null; $keyPlain = $null

    & (Join-Path $root 'android\gradlew.bat') -p (Join-Path $root 'android') ':app:assembleGithubRelease' --no-daemon
    if ($LASTEXITCODE -ne 0) { throw "assembleGithubRelease fallo: $LASTEXITCODE" }
}
finally {
    foreach ($n in $names) { [Environment]::SetEnvironmentVariable($n, $previous[$n], 'Process') }
}

$apk = Join-Path $root 'android\app\build\outputs\apk\github\release\app-github-release.apk'
if (-not (Test-Path -LiteralPath $apk)) { throw "No se genero el APK firmado: $apk (revisa que las variables RADICODEX_* hayan llegado a Gradle)." }

$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } elseif ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } else { Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
$apksigner = Get-ChildItem -Path (Join-Path $sdk 'build-tools') -Filter 'apksigner.bat' -Recurse -ErrorAction SilentlyContinue |
    Sort-Object { [version]($_.Directory.Name -replace '[^0-9.].*$', '') } -ErrorAction SilentlyContinue | Select-Object -Last 1
if (-not $apksigner) { throw "No se encontro apksigner en $sdk\build-tools. Define ANDROID_HOME." }

$report = & $apksigner.FullName verify --verbose --print-certs $apk 2>&1
if ($LASTEXITCODE -ne 0) { $report | Write-Host; throw 'apksigner verify fallo.' }
$report | Write-Host

$apkHash = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash.ToLowerInvariant()
$certLine = $report | Where-Object { $_ -match 'certificate SHA-256 digest:' } | Select-Object -First 1
$certHash = if ($certLine) { ($certLine -split ':\s*', 2)[1].Trim() } else { '(no disponible)' }

Write-Host ''
Write-Host "APK:              $apk"
Write-Host "SHA-256 del APK:  $apkHash"
Write-Host "SHA-256 del certificado (AllowedAPKSigningKeys): $certHash"
