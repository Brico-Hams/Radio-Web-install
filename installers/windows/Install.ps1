$ErrorActionPreference = "Stop"

$installRoot = Join-Path $env:LOCALAPPDATA "Programs\Bricohams Radio Workspace"
$appSource = Join-Path $PSScriptRoot "app"
$nodeSource = Join-Path $PSScriptRoot "runtime\node.exe"

if (-not (Test-Path (Join-Path $appSource "server.cjs")) -or -not (Test-Path $nodeSource)) {
  throw "No se encuentra el paquete completo. Extrae primero el ZIP descargado."
}

New-Item -ItemType Directory -Path $installRoot -Force | Out-Null
Copy-Item -Path $appSource -Destination (Join-Path $installRoot "app") -Recurse -Force
New-Item -ItemType Directory -Path (Join-Path $installRoot "runtime") -Force | Out-Null
Copy-Item -Path $nodeSource -Destination (Join-Path $installRoot "runtime\node.exe") -Force

$startScript = Join-Path $installRoot "Start.ps1"
Copy-Item -Path (Join-Path $PSScriptRoot "Start.ps1") -Destination $startScript -Force
$shortcutPath = Join-Path ([Environment]::GetFolderPath("Programs")) "Bricohams Radio Workspace.lnk"
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$startScript`""
$shortcut.WorkingDirectory = $installRoot
$shortcut.Description = "Inicia Bricohams Radio Workspace en este equipo"
$shortcut.Save()

Write-Output "Instalado en: $installRoot"
Write-Output "Abre Bricohams Radio Workspace desde el menu Inicio."
