# Auditoría de firmware y módulos web — 2026-11

Base de conocimiento (solo lectura, en el checkout principal, no copiada aquí): `docs/quansheng-uv-5k-v3/` (feature-mechanisms, hardware-and-versions, hardware-tests, problems-and-solutions, reverse-engineering-notes, guia-conexion-sat-usb, validation-roadmap) y `docs/community-firmware/` (bugs-and-limitations, developer-guide).

Limitación: la revisión se hizo sin shell; **ninguna prueba se ha ejecutado**. Estados: OK / corregido / rediseñado / pendiente de hardware.

## Firmware (`firmware/bricohams/`)

| Variante | Comprobación | Referencia | Estado | Prueba en radio real |
|---|---|---|---|---|
| CAT RX (`cat_rx.c`) | Estados 2/3/4/5/6, caps 7, lease 3000 ms, renovación sin retune, estado intacto tras rechazo | hardware-tests (contrato de consulta), feature-mechanisms | OK | Sintonizar con lease y expiración con RF |
| CAT TX (`cat_tx.c`) | Bucle acotado por lease y tiempo máximo, des-PTT con tecla, estado denegado fijo | feature-mechanisms (CAT), bugs-and-limitations | OK en código | TX real en carga ficticia |
| Pases SAT (`passes.c`) | Una lectura/INFO con hora del host movía el reloj de pases | hardware-tests (tabla de pases sin validar), reverse-engineering-notes | corregido: solo ops de escritura actualizan el reloj y se ignora hora < 2020 | Leer/escribir tabla y borrar con CLEAR (bloqueo de flash) |
| Pases SAT (escritura) | `write_entries` no comprueba sector borrado | hardware-and-versions (mapa flash) | pendiente de hardware (semántica del driver no disponible aquí) | Escritura/relectura de 0x00F000 |
| ARDF (`ardf.c`, `ardf_foxhunt.inc`) | Matemática segura (≤10 zorros, 1000..999990 ms); KEY_9 cargaba ganancia con zorro desactualizado | feature-mechanisms (ARDF) | corregido (KEY_9 llama a `BH_ARDF_Update()` antes) | Ciclo de zorros y ganancia guardada |
| Espectro (`spectrum.c`) | Revisión de `spectrum.c`; `spectrum_foxhunt.inc` no revisado | feature-mechanisms, bugs-and-limitations | pendiente de hardware / no revisado a fondo | Refresco de pantalla y bloqueo |
| Doppler / presets | Revisados sin cambios | feature-mechanisms | OK en código | Seguimiento de pase real |
| Satélite (SAT) | Pantalla SAT se abre al arrancar vía inyección en main.c | problems-and-solutions | pendiente de hardware | Arranque, teclado, pantalla |
| Manifiesto (`build-bricohams.cjs`, `catalog.json`) | `satPasses.hardwareValidated: true` contradecía la base | hardware-tests | corregido a `false` | — |
| Hello `F4HWN v6.1.0`, 0x7B00..0x7B31 | Sin cambios de formato | hardware-tests | OK (USB-C validado) | Vía jack CH340 (silencio tras 4 bytes basura) |
| Multiboot 0x0720-0x073E | Calibración 0x010000 compartida; slot 0 protegido | hardware-and-versions | pendiente de hardware | Backup, escritura y restauración de slot |

## Módulos web

| Módulo | Comprobación | Referencia | Estado | Prueba en radio real |
|---|---|---|---|---|
| `quansheng-connector.js` | Trama AB CD, CRC 0xFFFF, hello/timestamp | feature-mechanisms | OK | Conexión USB-C y jack |
| `quansheng-connector.js` (pases) | Lecturas enviaban hora del host y movían el reloj | hardware-tests | corregido: `passTableExchange` envía hora solo en ops 1/2/3; nuevo `syncSatelliteClock()` explícito | Lectura sin cambio de reloj |
| `quansheng-connector.js` (`receiveResponse`) | Longitud fuera de rango lanza error en vez de resincronizar | problems-and-solutions | pendiente (no modificado) | Ruido en jack CH340 |
| `transports.js` | Relleno de 1 byte a 64 B, DTR | guia-conexion-sat-usb | OK (visto parcialmente) | Paquetes de 64 B |
| `quansheng-live`, `-tools`, `-factory`, `backup-store`, `firmware-catalog`, `ftx1-*`, gd77/anytone, `radio-ui`, `app`, UI multiboot | No revisados en esta pasada | — | pendiente | — |

## Pruebas añadidas

- `firmware/tests/passes_test.c`: READ/INFO no mueven el reloj; hora anterior a 2020 ignorada.
- `tests/connectors.test.cjs`: lecturas con host_time 0 y sincronización explícita.

## Pendiente

Hardware: ruta jack CH340, tabla de pases, CAT TX, RF/Doppler, teclado/pantalla, escrituras de flash, restauración multiboot, diferencias V3/K1. No hecho: revisión de los módulos web sin listar, `spectrum_foxhunt.inc`, bench scripts, y ejecución de pruebas.
