# Repositorios auditados

Evidencia: **[código]**, **[doc. autor]**, **[medido autor]**, **[inferencia]**, **[pendiente de prueba en radio]**. Proyecto destino: GPL-3.0-or-later. Regla: solo se podría reutilizar código MIT o GPL-3.0(-or-later); todo lo demás se describe con palabras propias. La ausencia de fichero de licencia se comprobó con búsqueda de `LICEN*` en la raíz del clon (sin resultados).

Resumen de licencias:

| Repo | Licencia | Reutilizable en GPL-3.0-or-later |
|---|---|---|
| Hertzz58/Radtel-RT950-Pro-Firmware | GPL v3 (sin "or later" en cabecera) | Dudoso, no tocar |
| NathanBarguss/Chirp_Radtel-RT-950-Pro | MIT por cabecera de cada .py | Sí (cabecera) |
| SP3ARK/Radtel-950-Pro-Bluetooth-Programmator | contradictoria (MIT vs propietaria) | No |
| bartasx/… | MIT | Sí |
| erkanz/radtel-RT950PRO | ninguna | No |
| frrojas92/rt950_tak_bridge | MIT | Sí |
| jaymart1983/rt950-pro-re | ninguna | No |
| lalmonte/radiochat-aprs | GPL-3.0-or-later (código; no el nombre ni el icono) | Sí (código) |
| nicsure ×3 | ninguna | No |
| nivingoonesekera/… | MIT | Sí |
| pe1hvh/chirp_radtel_rt950pro | MIT | Sí |
| radiohambrasil/conversor-chirp | licencia de uso propia | No |
| toddbartholow/radiosmith | MIT | Sí |

## 1. Hertzz58/Radtel-RT950-Pro-Firmware (`b49804b`)
- **Propósito**: firmware abierto en fase temprana de bring-up. [README.md#L9-L10](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/README.md#L9-L10), periféricos mayormente sin probar [#L37-L39](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/README.md#L37-L39) — doc. autor.
- **Licencia**: texto GPL v3 en [LICENSE#L1-L2](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/LICENSE#L1-L2); README la matiza con "experimentación educativa/radioaficionada" ([#L156-L159](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/README.md#L156-L159)). "O posterior" no concedido en la cabecera: pendiente de fuente.
- **Cubre**: BLE, UART CPS, bootloader, formato BTF, herramientas. [docs/bluetooth.md](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/docs/bluetooth.md), [docs/cps-uart.md](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/docs/cps-uart.md), [docs/bootloader.md](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/docs/bootloader.md), [tools/README.md](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/tools/README.md).
- **No cubre / límites**: documentos internamente contradictorios (ver [CONTRADICCIONES.md](CONTRADICCIONES.md)); `binary/` contiene material del fabricante: no reutilizar. Claves publicadas del fabricante: no reproducir.
- **Estado**: en desarrollo temprano; APRS solo inicializado (inferencia, líneas pendientes).

## 2. NathanBarguss/Chirp_Radtel-RT-950-Pro (`254d2cd`)
- **Propósito**: driver CHIRP y librería de transporte USB. Mapa en [docs/MemoryMap.md](https://github.com/NathanBarguss/Chirp_Radtel-RT-950-Pro/blob/254d2cd/docs/MemoryMap.md).
- **Licencia**: sin LICENSE en raíz; cabecera MIT en [chirp_driver/radtel_rt950pro.py#L41](https://github.com/NathanBarguss/Chirp_Radtel-RT-950-Pro/blob/254d2cd/chirp_driver/radtel_rt950pro.py#L41), [rt950pro/transport.py#L1](https://github.com/NathanBarguss/Chirp_Radtel-RT-950-Pro/blob/254d2cd/rt950pro/transport.py#L1), [rt950pro/channel.py#L1](https://github.com/NathanBarguss/Chirp_Radtel-RT-950-Pro/blob/254d2cd/rt950pro/channel.py#L1). (radiosmith la describe como "sin licencia; solo hechos" en [protocol.py#L8](https://github.com/toddbartholow/radiosmith/blob/12a7dd9/src/radiosmith/rt950/protocol.py#L8): discrepancia, pendiente de fuente).
- **Cubre**: 960 canales, VFO, función, DTMF, modulación, nombres, APRS (0x55), imagen de 33152 B.
- **No cubre**: canales 961–990; BLE (solo USB).
- **Estado**: base de pe1hvh y nivin; documentos WIP sin leer (`IN_PROGRESS.md`, `RADIO_PROTOCOL_WIP.md`, `DESIGN.md`, `MEMORY_OVERWRITE.md`): pendiente de fuente.

## 3. SP3ARK/Radtel-950-Pro-Bluetooth-Programmator (`a8bb41a`)
- **Propósito**: app Android de programación BLE; escritura diferencial ([README.md#L62-L64](https://github.com/SP3ARK/Radtel-950-Pro-Bluetooth-Programmator/blob/a8bb41a/README.md#L62-L64)); memorias de recepción 15 FM + 15 AM + 15 SSB ([#L110-L112](https://github.com/SP3ARK/Radtel-950-Pro-Bluetooth-Programmator/blob/a8bb41a/README.md#L110-L112)); rango 18–620 MHz ([#L78](https://github.com/SP3ARK/Radtel-950-Pro-Bluetooth-Programmator/blob/a8bb41a/README.md#L78)).
- **Licencia**: [LICENSE#L1](https://github.com/SP3ARK/Radtel-950-Pro-Bluetooth-Programmator/blob/a8bb41a/LICENSE#L1) dice MIT (copyright SP3ARK, línea 3) pero [README.md#L265-L269](https://github.com/SP3ARK/Radtel-950-Pro-Bluetooth-Programmator/blob/a8bb41a/README.md#L265-L269) dice propietario, código cerrado. Tratar como no reutilizable.
- **Cubre**: solo README y APK; sin código fuente. **No cubre**: protocolo verificable.
- **Estado**: binario cerrado; APRS RX/iGate ([#L132](https://github.com/SP3ARK/Radtel-950-Pro-Bluetooth-Programmator/blob/a8bb41a/README.md#L132)).

## 4. bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering (`b9bda79`)
- **Propósito**: ingeniería inversa del BLE y CLI Python.
- **Licencia**: MIT en [pyproject.toml#L10](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/pyproject.toml#L10) y en la sección License del README; sin fichero LICENSE.
- **Cubre**: GATT, desbloqueo, XOR, lectura/escritura de 45056 B, decodificador de bloques ([protocol.py](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/protocol.py), [transport.py](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/transport.py), [decoder.py](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/decoder.py)).
- **No cubre**: firmware, APRS KISS. Docstring obsoleto de 43776 ([commands.py#L89](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/commands.py#L89)); posible error en `patch_aprs_in_blob` ([decoder.py#L324](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/decoder.py#L324)).
- **Estado**: funcional según el autor (doc. autor).

## 5. erkanz/radtel-RT950PRO (`51c84d4`)
- **Propósito**: parches de firmware OEM V0.29: BLE/USB KISS, SMS APRS. [README.md#L12-L26](https://github.com/erkanz/radtel-RT950PRO/blob/51c84d4/README.md#L12-L26).
- **Licencia**: ninguna (sin fichero LICEN*). No reutilizar; solo descripción.
- **Cubre**: mapa de parches, hashes, límites AX.25, lista de comprobación. **No cubre**: UUID GATT, MTU, procedimiento de flasheo, aviso de brick: pendiente de fuente.
- **Estado**: "trabajo en curso" según el propio autor ([README.md#L1-L8](https://github.com/erkanz/radtel-RT950PRO/blob/51c84d4/README.md#L1-L8)); v1.1 con pruebas de hardware.

## 6. frrojas92/rt950_tak_bridge (`865afc5`)
- **Propósito**: puente KISS/APRS → Cursor-on-Target (TAK). [README.md#L78-L82](https://github.com/frrojas92/rt950_tak_bridge/blob/865afc5/README.md#L78-L82).
- **Licencia**: MIT, CA6FEG (LICENSE#L1 y #L3; [enlace](https://github.com/frrojas92/rt950_tak_bridge/blob/865afc5/LICENSE#L1)).
- **Cubre**: decodificación Mic-E/posición sin comprimir. **No cubre**: UDP, transporte TCP KISS ([README.md#L376](https://github.com/frrojas92/rt950_tak_bridge/blob/865afc5/README.md#L376)); sin `requirements.txt`.
- **Estado**: en desarrollo, README por delante del código.

## 7. jaymart1983/rt950-pro-re (`4ecc044`)
- **Propósito**: ingeniería inversa (BTF, bootloader, flash SPI, hardware, 156 funciones). [FINDINGS.md](https://github.com/jaymart1983/rt950-pro-re/blob/4ecc044/FINDINGS.md).
- **Licencia**: ninguna; [STATUS.md#L12](https://github.com/jaymart1983/rt950-pro-re/blob/4ecc044/STATUS.md#L12) dice que el código fuente del RT-900 es local y sin licencia; [README.md#L13](https://github.com/jaymart1983/rt950-pro-re/blob/4ecc044/README.md#L13) dice que no incluye firmware OEM ni salida de descompilador.
- **Cubre**: BTF, bootloader, SPI, teclado, hardware, errores del cargador. **No cubre**: cabecera BTF de 992 B, cifrado y checksum: pendiente de fuente. Catálogo de 156 funciones (`STATUS.md#L54`, sin leer línea a línea).
- **Estado**: investigación activa.

## 8. lalmonte/radiochat-aprs (`9c7b092`)
- **Propósito**: cliente APRS chat Android. [README.md#L6-L8](https://github.com/lalmonte/radiochat-aprs/blob/9c7b092/README.md#L6-L8).
- **Licencia**: GPL-3.0-or-later ([README.md#L12](https://github.com/lalmonte/radiochat-aprs/blob/9c7b092/README.md#L12), [#L21](https://github.com/lalmonte/radiochat-aprs/blob/9c7b092/README.md#L21); [LICENSE#L1-L2](https://github.com/lalmonte/radiochat-aprs/blob/9c7b092/LICENSE#L1-L2)); nombre e icono no cubiertos ([#L509-L510](https://github.com/lalmonte/radiochat-aprs/blob/9c7b092/README.md#L509-L510)); datos de símbolos con licencias mezcladas ([#L531](https://github.com/lalmonte/radiochat-aprs/blob/9c7b092/README.md#L531)).
- **Cubre**: KISS BLE RX con RT-950 Pro, KISS TCP, APRS-IS, iGate. **No cubre**: TX con RT-950 (perfil `supportsTx=false`), programación.
- **Estado**: activo; afirmación RX-only sin método de comprobación.

## 9. nicsure/RT-950-Pro-Web-Flasher (`818f37b`)
- **Propósito**: flasheo BTF por Web Serial y copia/restauración NAND. [README.md#L3](https://github.com/nicsure/RT-950-Pro-Web-Flasher/blob/818f37b/README.md#L3).
- **Licencia**: ninguna. Solo descripción.
- **Cubre**: protocolo de actualización, NAND 4 MiB. **No cubre**: el firmware de copia (en Patreon), el handshake `PROGRAMBT9000U`/`UPDATE` (visible en la captura, no en `app.js`).
- **Estado**: funcional según autor; relleno del último bloque por confirmar.

## 10. nicsure/RT950Pro-BTLE-TCP-Bridge (`cf0f7f9`)
- **Propósito**: puente BLE→TCP KISS y gestor de canales nicFW950. [README.md#L1-L3](https://github.com/nicsure/RT950Pro-BTLE-TCP-Bridge/blob/cf0f7f9/README.md#L1-L3).
- **Licencia**: ninguna; el README afirma "totalmente open source" ([#L7](https://github.com/nicsure/RT950Pro-BTLE-TCP-Bridge/blob/cf0f7f9/README.md#L7)), lo que no equivale a una licencia.
- **Cubre**: FFE0/FFE1, 0xAA sobre FFE1. **No cubre**: FF31, MTU, autenticación TCP.
- **Estado**: APK compilados autofirmados.

## 11. nicsure/nicFW950_BTLE_Console (`5bd0f22`)
- **Propósito**: consola Web Bluetooth. [README.md#L11-L14](https://github.com/nicsure/nicFW950_BTLE_Console/blob/5bd0f22/README.md#L11-L14).
- **Licencia**: ninguna. **Cubre**: FFE0/FFE1 ([src/config.js#L3-L4](https://github.com/nicsure/nicFW950_BTLE_Console/blob/5bd0f22/src/config.js#L3-L4)). **No cubre**: OEM, memoria.
- **Estado**: pendiente de fuente (resto de `src/` sin leer).

## 12. nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS (`3384123`)
- **Propósito**: puente BLE para CHIRP y CPS (puerto serie virtual) y driver. [ble_bridge.py#L12-L20](https://github.com/nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS/blob/3384123/ble_bridge.py#L12-L20).
- **Licencia**: MIT, VK3NWG con partes de Nathan 2025 ([LICENSE#L1](https://github.com/nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS/blob/3384123/LICENSE#L1), [#L3](https://github.com/nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS/blob/3384123/LICENSE#L3), [#L10](https://github.com/nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS/blob/3384123/LICENSE#L10)).
- **Cubre**: desbloqueo con token fijo, timeouts, 960 canales, 33152 B. **No cubre**: 990 canales.
- **Estado**: funcional según autor; token fijo no probado en otras radios.

## 13. pe1hvh/chirp_radtel_rt950pro (`6060640`)
- **Propósito**: driver CHIRP 10×99 con nombres de zona. [README.md#L1-L5](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/README.md#L1-L5).
- **Licencia**: MIT, Nathan 2025 y PE1HVH 2026 ([LICENSE#L1](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/LICENSE#L1), [#L3-L4](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/LICENSE#L3-L4)).
- **Cubre**: 990 canales, zonas, tonos, VFO/función/DTMF/modulación/APRS; probado en fw 0.29 ([README.md#L21-L23](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/README.md#L21-L23)) — medido autor.
- **No cubre**: firmware <0.24 para canales 961–990; BLE propio. Experimental ([README.md#L8-L9](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/README.md#L8-L9)).

## 14. radiohambrasil/conversor-chirp (`facf621`)
- **Propósito**: conversión CHIRP/CPS `.dat`. [README.md#L19-L27](https://github.com/radiohambrasil/conversor-chirp/blob/facf621/README.md#L19-L27).
- **Licencia**: licencia de uso propia: no modificar, mantener créditos, fuente no distribuida ([README.md#L56-L66](https://github.com/radiohambrasil/conversor-chirp/blob/facf621/README.md#L56-L66)). Incompatible con GPL.
- **Cubre**: solo README; sin código. No menciona `PROGRAMBT9000U` ni XOR.

## 15. toddbartholow/radiosmith (`12a7dd9`)
- **Propósito**: programar DM-32UV y RT-950 PRO desde navegador/terminal. [README.md#L3](https://github.com/toddbartholow/radiosmith/blob/12a7dd9/README.md#L3).
- **Licencia**: MIT, Todd Bartholow (LICENSE#L1 y #L3; [enlace](https://github.com/toddbartholow/radiosmith/blob/12a7dd9/LICENSE#L1)).
- **Cubre**: lectura USB 115200 8N1, 128 B sin CRC ([protocol.py#L13](https://github.com/toddbartholow/radiosmith/blob/12a7dd9/src/radiosmith/rt950/protocol.py#L13)); APRS leído con `T` y guardado como `aprs.bin` ([tests/test_rt950.py#L141](https://github.com/toddbartholow/radiosmith/blob/12a7dd9/tests/test_rt950.py#L141)); escritura solo de canales 1–896 en sectores de 4 KB ([SAFETY.md#L27-L38](https://github.com/toddbartholow/radiosmith/blob/12a7dd9/docs/SAFETY.md#L27-L38)); el RT-950 no informa de firmware ([README.md#L70](https://github.com/toddbartholow/radiosmith/blob/12a7dd9/README.md#L70)).
- **No cubre**: BLE (cita el puente de nivin como origen del protocolo, [protocol.py#L10](https://github.com/toddbartholow/radiosmith/blob/12a7dd9/src/radiosmith/rt950/protocol.py#L10)); escritura APRS.
- **Estado**: escrituras desactivadas por defecto ([cli.py#L301](https://github.com/toddbartholow/radiosmith/blob/12a7dd9/src/radiosmith/cli.py#L301)).
