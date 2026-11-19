$ErrorActionPreference = "Stop"

$installRoot = Join-Path $env:LOCALAPPDATA "Programs\RadiCodex"
$appSource = Join-Path $PSScriptRoot "app"
$nodeSource = Join-Path $PSScriptRoot "runtime\node.exe"

if (-not (Test-Path (Join-Path $appSource "server.cjs")) -or -not (Test-Path $nodeSource)) {
  throw "No se encuentra el paquete completo. Extrae primero el ZIP descargado."
}

New-Item -ItemType Directory -Path $installRoot -Force | Out-Null
# Copy-Item into an existing folder nests it (app\app) and keeps stale files, so replace it on upgrade.
# The app folder holds no user data: radio backups live in the browser.
$appTarget = Join-Path $installRoot "app"
if (Test-Path $appTarget) { Remove-Item -Path $appTarget -Recurse -Force }
Copy-Item -Path $appSource -Destination $appTarget -Recurse -Force
New-Item -ItemType Directory -Path (Join-Path $installRoot "runtime") -Force | Out-Null
Copy-Item -Path $nodeSource -Destination (Join-Path $installRoot "runtime\node.exe") -Force

$startScript = Join-Path $installRoot "Start.ps1"
Copy-Item -Path (Join-Path $PSScriptRoot "Start.ps1") -Destination $startScript -Force
$programsDir = [Environment]::GetFolderPath("Programs")
$shortcutPath = Join-Path $programsDir "RadiCodex.lnk"
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$startScript`""
$shortcut.WorkingDirectory = $installRoot
$shortcut.Description = "Inicia RadiCodex de BricoHams en este equipo"
$shortcut.Save()

# Remove the pre-RadiCodex install (it holds no user data).
Remove-Item -Path (Join-Path $programsDir "Bricohams Radio Workspace.lnk") -Force -ErrorAction SilentlyContinue
Remove-Item -Path (Join-Path $env:LOCALAPPDATA "Programs\Bricohams Radio Workspace") -Recurse -Force -ErrorAction SilentlyContinue

Write-Output "Instalado en: $installRoot"
Write-Output "Abre RadiCodex desde el menu Inicio."
