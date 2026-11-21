# Logbook local y exportación ADIF

Esta parte de la fase 7 es ejecutable sin radio: almacena QSOs en SQLite,
normaliza la fecha/hora a UTC y exporta ADIF 3.1.4. No envía CAT, no acciona
PTT y no toma frecuencias simuladas del coordinador como contactos reales.

Después de instalar el paquete Python:

```powershell
bricoham-logbook --database ".\logbook.sqlite3" add `
  --call EA1ABC/P --started-at 2026-11-20T14:15:16+01:00 `
  --frequency-hz 14074001 --mode USB

bricoham-logbook --database ".\logbook.sqlite3" list
bricoham-logbook --database ".\logbook.sqlite3" export-adif |
  Set-Content -Encoding ascii ".\contactos.adi"
```

Sin instalar scripts se puede usar `py -3.12 -m bricoham_remote_station.logbook`
con los mismos argumentos.

## Consola web y API local

El logbook web se activa explícitamente al arrancar:

```powershell
py -3.12 -m bricoham_remote_station --logbook-database ".\logbook.sqlite3"
```

La carpeta debe existir. Al iniciar se crea la tabla si es necesario; sin la
opción, las rutas de logbook responden `503 logbook_not_configured`.
El archivo puede ser el mismo utilizado por la CLI. Conserva una copia con
las escrituras detenidas antes de actualizar o trasladarlo.

Tras conectar la consola, pulsa **Consultar logbook**. Admin y operador pueden
guardar contactos manuales; el oyente solo puede leer y exportar. El invitado
no puede acceder al logbook. Los campos se presentan vacíos, sin rellenarlos
con la demostración. La fecha exige zona explícita; la lista muestra UTC.

- `GET /api/v1/logbook?offset=0`: páginas de hasta 50 contactos, orden UTC
  ascendente, con `has_more`, `offset` y `can_write`.
- `POST /api/v1/logbook`: alta JSON autenticada y transaccional, máximo 4096
  bytes; campos exactos `call`, `started_at`, `frequency_hz`, `mode`.
- `GET /api/v1/logbook/adif`: descarga autenticada de hasta 5000 contactos;
  para una base mayor, exporta con la CLI sin ese límite.

No se reintentan altas automáticamente. Si se pierde la respuesta al guardar,
consulta la lista antes de repetir: no hay deduplicación implícita.
Los errores de almacenamiento se notifican y no se convierten en listas vacías.
El navegador admite únicamente frecuencias enteras representables con exactitud
en JavaScript; rechaza respuestas fuera de ese rango en lugar de redondearlas.

## Campos y límites

- Se guardan indicativo, fecha/hora de inicio, frecuencia entera en Hz y modo.
- Modos implementados: CW, SSB, USB, LSB, AM, FM, RTTY y FT8. ADIF exporta
  USB/LSB como MODE=SSB más SUBMODE=USB/LSB; no genera BAND sin un perfil de
  bandas/región validado.
- El indicativo se normaliza a mayúsculas y admite barras internas. Esto es
  validación sintáctica, no comprobación de licencia ni identidad.
- La hora requiere zona explícita. No se infiere la zona local.
- En la CLI la base se crea al guardar el primer QSO, en la ruta indicada. Listar o
  exportar una base inexistente produce un error, no un logbook vacío ficticio.
- Cada alta se confirma en una transacción; los lectores abren SQLite en modo
  read-only. Un fallo de base de datos o de validación devuelve salida de error
  y código CLI no cero.
- No incluye edición, eliminación, importación ADIF, RST, sincronización,
  diplomas ni separación de contactos por usuario/estación. No es una plataforma de
  logbook completa ni desbloquea las fases de control remoto/audio/TX.

## Evidencia y pruebas

[ADIF 3.1.4 oficial](https://adif.org/314/ADIF_314.htm) es la referencia de
formato y campos. El exportador es propio. Las pruebas comprueban persistencia,
orden UTC, unidades exactas, longitudes de campos, clasificación USB/SSB,
errores de entrada y que la exportación no modifique el archivo SQLite.
