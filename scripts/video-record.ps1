[CmdletBinding()]
param(
    [string]$Scene,
    [switch]$All,
    [ValidateRange(0, 180)][int]$Seconds = 0,
    [string]$ClipsDir = (Join-Path $env:USERPROFILE 'RadiCodex-video\clips'),
    [string]$Serial,
    [string]$Plan
)

$ErrorActionPreference = 'Stop'

# Works from scripts\ and from scripts\video\
$repo = $PSScriptRoot
while ($repo -and -not (Test-Path (Join-Path $repo 'docs\VIDEO-RADICODEX-1.1.md'))) { $repo = Split-Path $repo -Parent }
if (-not $repo) { throw 'No se encuentra docs\VIDEO-RADICODEX-1.1.md.' }
if (-not $Plan) { $Plan = Join-Path $repo 'docs\VIDEO-RADICODEX-1.1.md' }

if (-not (Get-Command adb -ErrorAction SilentlyContinue)) { throw 'adb no esta en el PATH.' }
if (-not $Scene -and -not $All) { throw 'Indica -Scene Vnn o -All.' }

$adb = @()
if ($Serial) { $adb = @('-s', $Serial) }

$resolvedClips = [System.IO.Path]::GetFullPath($ClipsDir)
if ($resolvedClips.StartsWith($repo, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "La carpeta de clips debe estar fuera del repo: $resolvedClips"
}
New-Item -ItemType Directory -Force -Path $resolvedClips | Out-Null

$scenes = foreach ($line in Get-Content -Encoding UTF8 $Plan) {
    if ($line -match '^\|\s*(V\d{2})\s*\|') {
        $cells = $line.Trim().Trim('|').Split('|') | ForEach-Object { $_.Trim() }
        [pscustomobject]@{ Id = $cells[0]; Screen = $cells[1]; Radio = $cells[2]; Actions = $cells[3]; Duration = [int]$cells[6] }
    }
}
if (-not $scenes) { throw "No se encontraron escenas en $Plan" }

if (-not $All) {
    $scenes = @($scenes | Where-Object { $_.Id -eq $Scene.ToUpper() })
    if (-not $scenes) { throw "Escena desconocida: $Scene" }
}

foreach ($s in $scenes) {
    $limit = if ($Seconds -gt 0) { $Seconds } else { [Math]::Min(180, $s.Duration + 10) }
    Write-Host ""
    Write-Host "== $($s.Id) | $($s.Screen) | radio: $($s.Radio) ==" -ForegroundColor Yellow
    Write-Host "Acciones: $($s.Actions)"
    if ($s.Radio -ne 'ninguna') { Write-Host "Conecta la radio $($s.Radio) por OTG. NO transmitas sin carga artificial; QMX+ nunca." -ForegroundColor Red }
    Read-Host "Pulsa Enter para grabar $limit s (la grabacion empieza ya)"

    $remote = "/sdcard/radicodex-$($s.Id).mp4"
    & adb @adb shell screenrecord --time-limit $limit $remote
    if ($LASTEXITCODE -ne 0) { throw "screenrecord fallo en $($s.Id)" }
    Start-Sleep -Seconds 1
    $local = Join-Path $resolvedClips "$($s.Id).mp4"
    & adb @adb pull $remote $local
    if ($LASTEXITCODE -ne 0) { throw "adb pull fallo en $($s.Id)" }
    & adb @adb shell rm $remote
    Write-Host "Clip guardado: $local" -ForegroundColor Green
}
