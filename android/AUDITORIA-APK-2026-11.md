# Auditoría APK RadiCodex — 2026-11

Alcance: cada módulo de la APK frente a la base de conocimiento Quansheng UV-5K V3 / firmware comunitario y frente a la implementación web (`quansheng-connector.js`, `transports.js`, `ftx1-core.js`, `backup-store.js`).
Las referencias son a `docs/quansheng-uv-5k-v3/` (QS) y `docs/community-firmware/` (CF) del checkout principal (archivo + sección, sin copiar contenido).

**Aviso:** esta auditoría se hizo sin poder ejecutar Gradle ni un dispositivo. Los cambios y tests JVM no se han compilado ni ejecutado. Todo estado «corregido» significa «cambio de código + test escrito, pendiente de compilar y de confirmar en hardware».

Estados: **OK** (coincide con la referencia), **corregido**, **pendiente de hardware**.

## Quansheng: conexión y hello

| Comprobación | Referencia | Estado | Prueba real en dispositivo |
|---|---|---|---|
| Hello `0x0514`→`0x0515`, firmware `F4HWN v6.x`, CRC 0xFFFF aceptado | QS `hardware-tests.md` (USB-C CDC); QS `feature-mechanisms.md` (hello) | OK | Diagnóstico → «Enlace y hello»: debe mostrar `F4HWN v6.1.0`. |
| Líneas de control: CDC solo DTR, jack CH340 ambas a 0 (la app activaba DTR+RTS) | QS `hardware-tests.md` (líneas de control); QS `problems-and-solutions.md` | corregido (`SerialRadio.quanshengSettings`) | USB-C S20 FE→radio: hello en <1 s. Jack CH340 con cable de programación: comprobar respuesta (en el banco falló la vía CH340). |
| CH340 `1A86:7523` lo comparten truSDX y cable de programación | QS `hardware-and-versions.md` (adaptadores) | corregido (Diagnóstico prueba rig y luego hello Quansheng) | Conectar el cable CH340 a la radio y pulsar «Probar todo». |
| Relleno de paquete exacto de 64 bytes (CDC) | QS `problems-and-solutions.md` (paquetes USB) | corregido en `QuanshengMemory.exchange` (CAT ya lo hacía) | Lectura de configuración completa sin timeouts. |
| `supportedFirmware` acepta «bricohams» sin F4HWN | CF `firmware-matrix.md` | pendiente de hardware (se mantiene permisivo para builds Bricohams; la web exige F4HWN+v≥6) | Hello con la imagen Satélites real. |

## Canales, lectura/escritura y respaldo

| Comprobación | Referencia | Estado | Prueba real |
|---|---|---|---|
| Lectura config `0x051B` en bloques de 128 B, nombre/atributos | QS `feature-mechanisms.md` (canales) | OK | Diagnóstico «Lectura de canales»: nº de canales = el de la radio. |
| Escritura: ocultar→registros→mostrar→releer; área protegida ≥0x8800 y firmware v6.0 solo lectura | QS `problems-and-solutions.md`; CF `bugs-and-limitations.md` | OK (ya forzado en `QuanshengMemory`) | Editar un canal de prueba en una radio con copia hecha. |
| Respaldo 2 MiB sin sondear antes el lector/CRC de Flash (la web sonda 128 B + CRC) | QS `validation-roadmap.md` (respaldo) | corregido (`backup` + `flashRangeCrc`) | Respaldo completo (10-20 min, pantalla encendida, batería >50 %). |
| Calibración (`0xB000`) por unidad, nunca copiar entre radios | QS `hardware-and-versions.md` (calibración) | OK (solo lectura en el respaldo) | Diagnóstico «Calibración y lector de Flash». |
| Modo PRO: solo elude el respaldo obligatorio; no elude solo-lectura v6.0, zona protegida, protección slot 0 ni relectura | QS `problems-and-solutions.md`; Studio | OK, test añadido | Con PRO activo, intentar escribir en una radio v6.0: debe rechazar. |

## Multiboot, presets, ARDF y tabla de pases (nuevo, solo lectura)

La APK no tenía ninguna implementación. Se añade `QuanshengReadOnly` (consultas solamente).

| Comprobación | Referencia | Estado | Prueba real |
|---|---|---|---|
| Slots `0x0720` (66 B), 5 slots de 128 KiB, slot 0 protegido | QS `feature-mechanisms.md` (multiboot) | corregido (consulta); gestión de slots **no portada** | «Slots multiboot»: 5 entradas. |
| Presets BHSP v1 `0x7B10` (2×104 B con token, validar CRC) | QS `feature-mechanisms.md` (presets) | corregido (exportar); importar **no portado** | «Presets de espectro» con la imagen Satélites. |
| Estadísticas ARDF `0x7B20` (140 B); estado 3 = sin sesión, no es fallo | QS `feature-mechanisms.md` (ARDF) | corregido (leer) | Entrar en ARDF en la radio y leer. |
| Tabla de pases `0x7B30`: `host_time` ≠ 0 cambia el reloj RAM aun en consulta | QS `problems-and-solutions.md` (tabla de pases) | corregido: la APK lee con `host_time=0` y rechaza ops 1/2/3. La web envía `Date.now()` siempre (no modificado) | «Tabla de pases»: nº de pases; el reloj de la radio no cambia. |
| Subida de pases | QS `feature-mechanisms.md` | pendiente de hardware (no implementada en la APK) | — |

## CAT RX / TX (SSTV)

| Comprobación | Referencia | Estado | Prueba real |
|---|---|---|---|
| Consulta `0x7B00` v1 op 0; radio inactiva = estado 0, flags 0, frecuencia 0 (no es fallo) | QS `feature-mechanisms.md` (CAT RX) | OK | «Estado CAT RX» con y sin SAT RX. |
| Lease de 3000 ms, renovación a 1000 ms, STOP al salir | QS `feature-mechanisms.md` | OK | «Sintonía CAT RX (restaura sola)» con tecla 8 activa. |
| CAT-TX `0x7B02`: Diagnóstico solo consulta op 0 | QS `hardware-tests.md` (TX) | OK, test añadido (nunca se envía op≠0) | Estado PTT debe mostrar `keyed=false`. |
| TX SSTV real | QS `validation-roadmap.md` | pendiente de hardware (con carga ficticia) | — |

## Satélite, Doppler, brújula y GPS

| Comprobación | Referencia | Estado | Prueba real |
|---|---|---|---|
| Doppler solo RX, unidades 10 Hz, VHF/UHF | QS `feature-mechanisms.md` (Doppler) | OK | Pase real: la frecuencia aplicada debe coincidir con la pedida. |
| Seguimiento falla si el hueco entre pasos >2 s (doze/pantalla apagada) | — | pendiente de hardware (pantalla encendida durante el pase) | Pase de 10 min con pantalla encendida. |
| Ubicación: GPS + red + fusionado, permiso aproximado admitido | — | OK (`PhoneLocation`); ARDF en `MainActivity` solo usa GPS_PROVIDER | Al aire libre, con permiso aproximado y con preciso. |

## Rig CAT (FTX-1, truSDX, QMX, otros)

| Comprobación | Referencia | Estado | Prueba real |
|---|---|---|---|
| FTX-1 38400 8N1 por puerto Enhanced del CP2105; DTR/RTS a 0 | `ftx1-core.js`; QS `hardware-and-versions.md` | OK | Diagnóstico → FTX-1: 5 pasos OK. |
| truSDX 38400 y reintento a 115200; sin conmutar DTR/RTS (resetea) | `ftx1-core.js` | OK | Diagnóstico → truSDX. |
| QMX/QDX 11 dígitos, baud ignorado | `ftx1-core.js` | OK | Diagnóstico → QMX. |
| La prueba de rig fija y restaura frecuencia RX; nunca envía `TX`/`PC` | — | OK (test existente) | — |

## Modos digitales (FT8/FT4/FT2), rotor

| Comprobación | Referencia | Estado | Prueba real |
|---|---|---|---|
| Ventanas FT8 15 s / FT4 7,5 s / FT2 | — | pendiente de hardware (sin cambios en este pase) | Decodificar en banda real con reloj sincronizado. |
| Rotor/brújula | — | pendiente de hardware | Giro de prueba con la antena sin carga. |

## Diagnóstico / puente y Android S20 FE (SDK 33) + DeX

| Comprobación | Estado | Prueba real |
|---|---|---|
| «Probar todo» y un botón por módulo; informe guardado en `Android/data/.../files/diagnostics` y compartible; pasos «pendiente» no cuentan como fallo | corregido | Pulsar «Probar todo» con la radio y abrir el `.txt`. |
| Todo módulo es solo lectura o se restaura solo; no transmite | corregido, test añadido | — |
| Rotación/redimensión DeX recreaba `OpenGd77`, `Sstv`, `LiveAudio`, `Ftx`, `Rotor` (perdían USB/audio) | corregido (`configChanges` en el manifiesto) | Redimensionar ventana en DeX durante una operación. |
| Permiso USB, alimentación OTG, desconexión durante operación, restricciones en segundo plano | pendiente de hardware | Desenchufar a mitad de lectura: debe cerrar limpio. Cable OTG con alimentación para respaldo largo. |
| Puente TCP sin autenticación | OK (advertencia, solo con pantalla abierta) | Probar solo en red de confianza. |
