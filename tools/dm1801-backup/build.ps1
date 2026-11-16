#requires -Version 5.1
# Construye dist\DM1801-Backup.exe (un solo archivo, sin consola).
# Requisitos: Python 3.11+ con tkinter y `pip install pyinstaller`.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
python -m unittest discover -s tests
if ($LASTEXITCODE) { throw 'Las pruebas fallaron' }
python -m PyInstaller --noconfirm --clean --onefile --windowed --name DM1801-Backup `
  --paths src `
  --add-data "vendor\dmrconfig\dmrconfig.exe;vendor\dmrconfig" `
  --add-data "vendor\dmrconfig\LICENSE;vendor\dmrconfig" `
  --add-data "THIRD-PARTY-NOTICES.txt;." `
  launcher.py
if ($LASTEXITCODE) { throw 'PyInstaller falló' }
(Get-FileHash dist\DM1801-Backup.exe -Algorithm SHA256).Hash | Out-File dist\DM1801-Backup.exe.sha256 -Encoding ascii
Write-Host 'Listo: dist\DM1801-Backup.exe'
