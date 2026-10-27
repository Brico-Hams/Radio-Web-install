param(
    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$output = [IO.Path]::GetFullPath($OutputDirectory)
if (Test-Path -LiteralPath $output) { throw "El destino debe ser nuevo: $output" }
if (-not $env:JAVA_HOME -or -not (Test-Path -LiteralPath (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
    throw 'Configura JAVA_HOME con JDK 17.'
}
if (-not $env:ANDROID_HOME -or -not (Test-Path -LiteralPath (Join-Path $env:ANDROID_HOME 'platforms\android-35\android.jar'))) {
    throw 'Configura ANDROID_HOME con Android SDK 35.'
}
$signer = Join-Path $env:ANDROID_HOME 'build-tools\35.0.0\apksigner.bat'
if (-not (Test-Path -LiteralPath $signer)) { throw 'Faltan Android Build Tools 35.0.0.' }

Push-Location $root
try {
    & .\android\gradlew.bat -p android :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest --no-daemon
    if ($LASTEXITCODE -ne 0) { throw "La compilacion Android fallo: $LASTEXITCODE" }
    $artifacts = @(
        @{ Source = 'android\app\build\outputs\apk\debug\app-debug.apk'; Name = 'bricohams-android-0.8.0-beta-debug.apk' },
        @{ Source = 'android\app\build\outputs\apk\androidTest\debug\app-debug-androidTest.apk'; Name = 'bricohams-android-0.8.0-beta-androidTest.apk' }
    )
    foreach ($artifact in $artifacts) {
        & $signer verify $artifact.Source
        if ($LASTEXITCODE -ne 0) { throw "La firma de $($artifact.Name) no verifica." }
    }
    $tests = 0
    $failures = 0
    foreach ($report in Get-ChildItem -LiteralPath 'android\app\build\test-results\testDebugUnitTest' -Filter 'TEST-*.xml') {
        [xml]$xml = Get-Content -LiteralPath $report.FullName -Raw
        $tests += [int]$xml.testsuite.tests
        $failures += [int]$xml.testsuite.failures + [int]$xml.testsuite.errors
    }
    if ($tests -eq 0 -or $failures -ne 0) { throw "Pruebas host no verificadas: $tests pruebas, $failures fallos." }
    [xml]$lint = Get-Content -LiteralPath 'android\app\build\reports\lint-results-debug.xml' -Raw
    $lintErrors = @($lint.issues.issue | Where-Object { $_.severity -in @('Error', 'Fatal') }).Count
    $lintWarnings = @($lint.issues.issue | Where-Object { $_.severity -eq 'Warning' }).Count
    if ($lintErrors -ne 0) { throw "Lint contiene $lintErrors errores." }
    $revision = (& git rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo leer la revision Git.' }
    $dirty = [bool](& git status --porcelain)
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo leer el estado Git.' }
    $sourceNames = & git ls-files --cached --others --exclude-standard android
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo inventariar las fuentes Android.' }
    $sources = @($sourceNames | Sort-Object -Unique | ForEach-Object {
        [ordered]@{ file = $_; sha256 = (Get-FileHash -LiteralPath ($_ -replace '/', '\') -Algorithm SHA256).Hash.ToLowerInvariant() }
    })
    New-Item -ItemType Directory -Path $output | Out-Null
    foreach ($artifact in $artifacts) { Copy-Item -LiteralPath $artifact.Source -Destination (Join-Path $output $artifact.Name) }
    Copy-Item -LiteralPath 'docs\ANDROID.md' -Destination (Join-Path $output 'ANDROID.md')
    Copy-Item -LiteralPath 'LICENSE' -Destination (Join-Path $output 'LICENSE')
    Copy-Item -LiteralPath 'android\app\src\main\assets\NOTICE.txt' -Destination (Join-Path $output 'NOTICE.txt')
    Copy-Item -LiteralPath 'android\app\src\main\assets\LICENSE-APACHE-2.0.txt' -Destination (Join-Path $output 'LICENSE-APACHE-2.0.txt')
    Copy-Item -LiteralPath 'android\app\src\main\assets\LICENSE-USB-SERIAL-MIT.txt' -Destination (Join-Path $output 'LICENSE-USB-SERIAL-MIT.txt')
    Copy-Item -LiteralPath 'android\app\src\main\assets\LICENSE-SATELLITE-MIT.txt' -Destination (Join-Path $output 'LICENSE-SATELLITE-MIT.txt')
    Copy-Item -LiteralPath 'android\app\src\main\assets\LICENSE-RHINO.txt' -Destination (Join-Path $output 'LICENSE-RHINO.txt')
    $info = [ordered]@{
        format = 'bricohams-android-build'
        version = 1
        applicationId = 'org.bricohams.radio'
        applicationVersion = '0.8.0-beta'
        stability = 'beta'
        signing = 'debug'
        minimumApi = 26
        targetApi = 35
        revision = $revision
        dirty = $dirty
        builtAt = [DateTime]::UtcNow.ToString('o')
        hostTests = $tests
        testFailures = $failures
        lintErrors = $lintErrors
        lintWarnings = $lintWarnings
        instrumentationTestsExecuted = $false
        hardwareTested = $false
        sourceHashes = $sources
        capabilities = @('local-logbook', 'logbook-search', 'adif-export-ascii', 'adif-import-preview-transactional', 'json-export-import', 'ardf-manual-observations', 'ardf-session-statistics', 'ardf-observation-history', 'foreground-gps-fix', 'morse-text', 'morse-wav-experimental', 'usb-cdc-cat-rx-experimental', 'usb-uart-known-single-port-adapters', 'sstv-robot36-wav-experimental', 'sstv-png-export', 'satellite-sgp4-offline', 'tle-catalog-import', 'satellite-pass-cat-rx-experimental', 'foreground-microphone-bounded-capture', 'morse-captured-audio-experimental', 'sstv-robot36-captured-audio-experimental')
        unavailable = @('continuous-audio-decoding', 'sstv-transmission', 'channel-programming', 'lotw-signing-upload', 'continuous-gps-track', 'satellite-auto-download')
    }
    [IO.File]::WriteAllText((Join-Path $output 'build-info.json'), (($info | ConvertTo-Json -Depth 8) + "`n"), [Text.UTF8Encoding]::new($false))
    $sums = Get-ChildItem -LiteralPath $output -File | Sort-Object Name | ForEach-Object {
        "$((Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant())  $($_.Name)"
    }
    $sums | Set-Content -LiteralPath (Join-Path $output 'SHA256SUMS') -Encoding ascii
    Write-Output "APK Beta generada con $tests pruebas host correctas, $lintErrors errores y $lintWarnings avisos lint."
    Write-Output "Destino: $output. Sin pruebas en telefono ni programacion de radio."
} finally {
    Pop-Location
}
