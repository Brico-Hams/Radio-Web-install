# Respaldo DM-1801 (solo lectura)

App local de Windows para respaldar el codeplug del Baofeng DM-1801 (DMR-IDV5, HID 15A2:0073) con
[dmrconfig](https://github.com/OpenRTX/dmrconfig) (`-r`). Nunca escribe en la radio: solo se invoca `dmrconfig -r`.

## Uso
1. Conecta y enciende la radio; cierra cualquier CPS.
2. Ejecuta `dist\DM1801-Backup.exe` (o `python launcher.py` desde este directorio).
3. «Detectar radio» → elige carpeta de destino → «Respaldar codeplug».
4. Se crea `dm1801-backup-AAAAMMDD-HHMMSS\` (nunca se sobrescribe) con `device.img`, `device.conf` y `manifest.json`
   (tamaños y SHA256). La app valida cabecera `1801` y marca los datos como solo lectura.

CLI: `python launcher.py detect` · `python launcher.py backup CARPETA`

## Construir y probar
```
python -m pip install pyinstaller
.\build.ps1        # ejecuta pruebas y genera dist\DM1801-Backup.exe (+ .sha256)
python -m unittest discover -s tests
```

## Límites
- Calibración, flash completa y firmware de fábrica: **no disponibles**. dmrconfig y su documentación no los leen
  y no se encontró método verificado para esta variante; no se envían comandos experimentales.
- `dmrconfig -r` a veces falla en el primer intento justo tras otra sesión HID; la app reintenta hasta 3 veces.
- Si Windows (Acceso controlado a carpetas) bloquea el ejecutable sin firmar en Documentos/Escritorio, la app lo
  informa; usa la carpeta por defecto `%USERPROFILE%\DM1801-Backups` u otra fuera de carpetas protegidas.
- El ejecutable no está firmado: SmartScreen/antivirus pueden avisar (PyInstaller). Alternativa: `python launcher.py`.
- Los respaldos contienen datos personales de la radio (contactos, nombre): no los publiques.
- Licencia: ver `THIRD-PARTY-NOTICES.txt` y `vendor\dmrconfig\LICENSE` (BSD-3).
