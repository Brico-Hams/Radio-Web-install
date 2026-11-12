# Recuperación y riesgos

Evidencia: **[código]**, **[doc. autor]**, **[medido autor]**, **[inferencia]**, **[pendiente de prueba en radio]**. Nada aquí está probado por este proyecto; son informes de terceros. Detalles técnicos en [FIRMWARE-Y-FLASHEO.md](FIRMWARE-Y-FLASHEO.md) y [MAPA-DE-MEMORIA.md](MAPA-DE-MEMORIA.md).

## 1. Qué puede dejar la radio inservible

| Riesgo | Fuente | Nivel |
|---|---|---|
| Flashear una imagen equivocada o cortar la alimentación | [nicsure README.md#L40](https://github.com/nicsure/RT-950-Pro-Web-Flasher/blob/818f37b/README.md#L40) (sin licencia) | doc. autor |
| Bootloader descarta el último bloque de cada subida (hace falta bloque 0xFF extra) | [jaymart FINDINGS.md#L178-L190](https://github.com/jaymart1983/rt950-pro-re/blob/4ecc044/FINDINGS.md#L178-L190) (sin licencia) | medido autor; pendiente de prueba en radio |
| Relleno de bloque parcial con 0xFF "requiere confirmación en hardware" | [nicsure PROTOCOL.md#L28](https://github.com/nicsure/RT-950-Pro-Web-Flasher/blob/818f37b/PROTOCOL.md#L28) | doc. autor |
| Bootloader sin CRC/firma en el salto: un SP válido basta para arrancar una imagen corrupta | [hertzz docs/bootloader.md#L125-L148](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/docs/bootloader.md#L125-L148) (GPL-3.0) | doc. autor; el transporte sí lleva CRC ([tools/README.md#L157-L169](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/tools/README.md#L157-L169)) |
| Escribir canales 961–990 (0x7800–0x7BBF) en firmware de 960 canales: puede sobrescribir datos tipo calibración y cambiar el comportamiento de TX | [pe1hvh README.md#L56-L58](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/README.md#L56-L58), [docs/memory-map.md#L22-L26](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/docs/memory-map.md#L22-L26) (MIT) | doc. autor; no verificado de forma independiente |
| Escribir 0x7800–0x7FFF o 0xE000+ ("no escribir"; posible calibración) | [nathan MemoryMap.md#L12-L14](https://github.com/NathanBarguss/Chirp_Radtel-RT-950-Pro/blob/254d2cd/docs/MemoryMap.md#L12-L14) (MIT) | doc. autor; pendiente de prueba en radio |
| Escribir APRS con 0x55: sin ACK | [pe1hvh memory-map.md#L110-L118](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/docs/memory-map.md#L110-L118) | medido autor |
| Relés PTT activo-bajo: polaridad errónea daña el PA (solo firmware propio de Hertzz) | [hertzz README.md#L144](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/README.md#L144) | doc. autor |
| El RT-950 borra un sector completo de 4 KB al escribir su primer bloque; por eso radiosmith solo escribe sectores enteros (32 bloques en orden, con relectura) de canales 1–896 (0x0000–0x6FFF) y nunca ajustes, VFO, APRS, 0x7000–0x7FFF ni calibración. (El aviso de CH340/bit 7 de esa misma página es de la sección DM-32UV, no del RT-950.) | [radiosmith SAFETY.md#L27-L38](https://github.com/toddbartholow/radiosmith/blob/12a7dd9/docs/SAFETY.md#L27-L38) (MIT) | doc. autor |
| Driver experimental puede programar mal la radio | [pe1hvh README.md#L8-L9](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/README.md#L8-L9) | doc. autor |
| Tras escribir, la radio cachea canales: reiniciar para ver el resultado | [jaymart FINDINGS.md#L147-L148](https://github.com/jaymart1983/rt950-pro-re/blob/4ecc044/FINDINGS.md#L147-L148) | medido autor |
| Tras lectura/escritura BLE la radio deja de enviar APRS a la app hasta reiniciar; tras escribir APRS puede cortar el BLE | [sp3ark README.md#L235-L238](https://github.com/SP3ARK/Radtel-950-Pro-Bluetooth-Programmator/blob/a8bb41a/README.md#L235-L238), [nivin ble_bridge.py#L22-L25](https://github.com/nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS/blob/3384123/ble_bridge.py#L22-L25) | doc. autor |

## 2. Qué NO cubre una copia del CPS
Inferencia a partir de los mapas: el CPS (`.dat`) y la imagen CHIRP/BLE leen solo los segmentos de §MAPA (canales, VFO, función, DTMF, modulación, nombres, APRS). No cubren:
- Flash SPI completa (pantalla de inicio, fuentes, archivo de recursos de 141 registros). [jaymart FINDINGS.md#L353-L361](https://github.com/jaymart1983/rt950-pro-re/blob/4ecc044/FINDINGS.md#L353-L361) — medido autor.
- 0xE000+ (posible calibración) y 0x7BC0–0x7FFF, que ningún cliente lee ni escribe (pe1hvh [memory-map.md#L13](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/docs/memory-map.md#L13), [#L20](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/docs/memory-map.md#L20)) — inferencia; ubicación real de la calibración: pendiente de prueba en radio.
- 0x9080–0x90FF (función): se lee pero no se escribe en pe1hvh ([#L28-L35](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/docs/memory-map.md#L28-L35)).
- El firmware/bootloader: no hay lectura por UART ([hertzz tools/README.md#L150-L190](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/tools/README.md#L150-L190)).
- Datos de usuario de nicFW950 u otros firmwares.

## 3. Vías de recuperación documentadas
1. **Bootloader por botones**: encender con PB12 y PE5 a bajo (teclas 3 y 4 según tools/README), y volver a flashear un BTF válido. [hertzz bootloader.md#L156-L162](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/docs/bootloader.md#L156-L162); [jaymart FINDINGS.md#L201-L224](https://github.com/jaymart1983/rt950-pro-re/blob/4ecc044/FINDINGS.md#L201-L224) (es vía de recuperación, no de actualización) — doc./medido autor. Correspondencia pin↔botón: pendiente de fuente.
2. **El bootloader se conserva** en actualizaciones OEM, de modo que un firmware dañado no borra la vía 1. [hertzz bootloader.md#L297-L298](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/docs/bootloader.md#L297-L298) — doc. autor.
3. **Restauración NAND de 4 MiB** con el firmware de copia/restauración de nicsure y después firmware de fábrica. [README.md#L15-L35](https://github.com/nicsure/RT-950-Pro-Web-Flasher/blob/818f37b/README.md#L15-L35) — doc. autor. Protocolo escrito para el cable del RT-880 ([FIRMWARE_SERIAL_PROTOCOL.md#L3](https://github.com/nicsure/RT-950-Pro-Web-Flasher/blob/818f37b/FIRMWARE_SERIAL_PROTOCOL.md#L3)); compatibilidad con firmware de serie: pendiente de prueba en radio. El firmware de copia está en el Patreon del autor, no en el repo.
4. **Volver a cargar el .img/CPS guardado antes de escribir**: pe1hvh lo califica como "única forma de restaurar" ([README.md#L59-L61](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/README.md#L59-L61)).
5. radiosmith restringe la escritura a los sectores de canales 1–896 (0x0000–0x6FFF) y por defecto está desactivada ([write.py#L27](https://github.com/toddbartholow/radiosmith/blob/12a7dd9/src/radiosmith/rt950/write.py#L27), [cli.py#L301](https://github.com/toddbartholow/radiosmith/blob/12a7dd9/src/radiosmith/cli.py#L301)) — código (MIT).

## 4. Prácticas recomendadas (derivadas, inferencia)
- Leer y guardar la imagen antes de cualquier escritura; guardarla junto al CPS `.dat`.
- No escribir fuera de canales/ajustes conocidos hasta ubicar la calibración.
- Mantener alimentación estable durante flasheos; no desconectar USB/BLE.
- No exponer el puente TCP de nicsure en redes no confiables (escucha 0.0.0.0 sin autenticación; [BridgeService.kt#L250](https://github.com/nicsure/RT950Pro-BTLE-TCP-Bridge/blob/cf0f7f9/app/src/main/java/uk/co/nicsure/rt950btlebridge/BridgeService.kt#L250)).
- Descargar firmware solo de fuentes verificadas y comparar hashes si el autor los publica ([erkanz releases/v1.1/README.md#L14-L17](https://github.com/erkanz/radtel-RT950PRO/blob/51c84d4/releases/v1.1/README.md#L14-L17)).

## 5. Pendientes
- Cómo se recupera una radio cuyo bootloader pierde el último bloque tras un flasheo parcial: pendiente de prueba en radio.
- Existencia de copia de seguridad de calibración con herramientas públicas: pendiente de fuente.

## Comprobado en una radio real (RadiCodex, 2026-11-11)

- Grabar 5 canales en la zona 5, que estaba vacía, solo cambió esos 116 bytes. La relectura BLE coincidió y el tramo `0x7800–0x7BFF` quedó intacto.
- Restaurar registros en blanco sobre esos canales, bloque a bloque, falló la verificación y no cambió nada. Es coherente con la regla de [radiosmith `rt950/write.py`](https://github.com/toddbartholow/radiosmith/blob/12a7dd9/src/radiosmith/rt950/write.py#L5-L14): el sector de 4 KB solo se borra al escribir su primer bloque. Con escritura del sector completo `0x3000–0x3FFF` se restauró, y la copia posterior tiene el mismo SHA-256 que la anterior a la escritura. Nivel: medido en radio.
