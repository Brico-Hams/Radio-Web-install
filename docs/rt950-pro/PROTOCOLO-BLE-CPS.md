# Protocolo BLE / CPS del RT-950 Pro

Niveles de evidencia: **[código]**, **[doc. autor]**, **[medido autor]**, **[inferencia]**, **[pendiente de prueba en radio]**. Licencias entre paréntesis tras cada repo (ver [REPOSITORIOS.md](REPOSITORIOS.md)). Todo está descrito con palabras propias; no se copian valores de claves ni código.

Abreviaturas de enlace:
- **bartasx** = `https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/` (MIT)
- **nivin** = `https://github.com/nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS/blob/3384123/` (MIT)
- **hertzz** = `https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/` (GPL-3.0, "or later" no concedido en cabecera)
- **pe1hvh** = `https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/` (MIT)
- **nathan** = `https://github.com/NathanBarguss/Chirp_Radtel-RT-950-Pro/blob/254d2cd/` (MIT por cabecera de cada .py)

## 1. GATT

| Hecho | Fuente | Nivel |
|---|---|---|
| Servicio 0xFFE0; característica serie 0xFFE1 (alternativa 0xFFE2); característica de init/desbloqueo 0xFF31 | [bartasx protocol.py#L9-L12](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/protocol.py#L9-L12) | código |
| Hertzz: ff31 = control/autenticación, ff32 = datos preferida, ffe1 = respaldo | [hertzz docs/bluetooth.md#L12-L19](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/docs/bluetooth.md#L12-L19) | doc. autor |
| Hertzz: MTU 512 en el módulo; trozos de 20 B por defecto, hasta 133 B en actualización del módulo | [hertzz docs/bluetooth.md#L18](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/docs/bluetooth.md#L18), [#L97-L101](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/docs/bluetooth.md#L97-L101) | doc. autor |
| nivin: MTU "fijado en 23" por la radio, trozos de 20 B | [nivin ble_bridge.py#L194-L196](https://github.com/nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS/blob/3384123/ble_bridge.py#L194-L196), [#L322](https://github.com/nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS/blob/3384123/ble_bridge.py#L322) | doc. autor + código |
| bartasx: carga útil = MTU−3 con respaldo de 20; 10 ms entre trozos | [transport.py#L28](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/transport.py#L28), [#L49-L51](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/transport.py#L49-L51), [#L69](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/transport.py#L69) | código |

**Contradicción MTU**: 512 (hertzz, módulo) vs 23 (nivin, observado). Ver [CONTRADICCIONES.md](CONTRADICCIONES.md#c-01).

## 2. Desbloqueo (ff31)

- La radio rechaza todo el tráfico en ffe1 hasta recibir una escritura en ff31; `--no-unlock` hace fallar el handshake. [nivin ble_bridge.py#L12-L20](https://github.com/nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS/blob/3384123/ble_bridge.py#L12-L20), [#L90-L96](https://github.com/nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS/blob/3384123/ble_bridge.py#L90-L96) — doc. autor.
- Token de 20 bytes: cuatro bytes 0x3F, un byte 0x02 y 15 bytes aleatorios; se escribe en ff31 con respuesta y se espera 1,2 s; la radio contesta "!!!!". [bartasx transport.py#L89-L95](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/transport.py#L89-L95) — código.
- nivin reutiliza un token fijo capturado (estructura idéntica; valor no reproducido aquí). [ble_bridge.py#L179-L180](https://github.com/nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS/blob/3384123/ble_bridge.py#L179-L180), [radtel_rt950pro_BLE_int.py#L3677](https://github.com/nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS/blob/3384123/radtel_rt950pro_BLE_int.py#L3677) — código. Que funcione porque la respuesta es determinista es afirmación del autor; no probado en otras radios — pendiente de prueba en radio.
- Hertzz describe el token serie como 4×0x3F + byte selector de baudios + relleno aleatorio de 0–98, y un desafío de 20 bytes con dos algoritmos de clave aceptados. [hertzz docs/bluetooth.md#L37-L58](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/docs/bluetooth.md#L37-L58) — doc. autor. El byte tras 0x3F es 0x02 en bartasx; la relación con el "selector de baudios" de Hertzz está pendiente de fuente.
- Handshake por modelo proviene del servidor KDH. [hertzz docs/bluetooth.md#L60-L66](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/docs/bluetooth.md#L60-L66) — doc. autor.
- Comandos AT (`AT+BAUD`, `AT+RST`) por ff31. [hertzz docs/bluetooth.md#L21-L31](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/docs/bluetooth.md#L21-L31) — doc. autor.

## 3. Handshake de programación

Orden en bartasx ([transport.py#L98-L135](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/transport.py#L98-L135), código): token ff31 → cadena `PROGRAMBT9000U` → esperar ACK 0x06 (hasta 32 reintentos) → `F` → 16 bytes de respuesta → `M` → modelo ASCII de 12 bytes → trama `SEND` de 25 bytes → ACK 0x06.

Constantes: cadena de handshake, ACK 0x06, END 'E', READ 0x52, WRITE 0x57, ALT_READ 0x54, ALT_WRITE 0x58, bloque 128. [bartasx protocol.py#L17-L24](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/protocol.py#L17-L24) — código.

nivin: espera de handshake 2,5 s y descarte de un 0x06 duplicado antes del blob `F`. [BLE_int.py#L2431](https://github.com/nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS/blob/3384123/radtel_rt950pro_BLE_int.py#L2431), [#L2437-L2448](https://github.com/nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS/blob/3384123/radtel_rt950pro_BLE_int.py#L2437-L2448) — código.

Respuestas por USB (firmware 0.29): `F` = 16 bytes, `M` = "RT-950" rellenado a 12. [pe1hvh docs/protocol.md#L16-L24](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/docs/protocol.md#L16-L24) — medido por el autor. Interpretación de pares BCD de `F`: inferencia ([#L26-L35](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/docs/protocol.md#L26-L35)). La versión de firmware no se puede leer con estos comandos ([#L37-L44](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/docs/protocol.md#L37-L44)). Nathan solo exige que el modelo no esté vacío (pendiente de re-verificar línea: `rt950pro/transport.py#L195-L199`).

## 4. Negociación de clave XOR

- Trama `SEND` + byte de código `((rand 1..2)<<4)|(rand 0..4)` + 19 bytes aleatorios en 0..19. Índice de clave: si `código&0x20` → `(código−0x20)*2+1`, si no `(código−0x10)*2`; luego +1; el índice del grupo es el byte `trama[4+idx]`. [bartasx protocol.py#L58-L70](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/protocol.py#L58-L70) — código.
- Tabla de 20 cadenas de 4 bytes (idéntica en nivin). [bartasx protocol.py#L50-L56](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/protocol.py#L50-L56), [nivin BLE_int.py#L2232-L2253](https://github.com/nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS/blob/3384123/radtel_rt950pro_BLE_int.py#L2232-L2253) — código. (No se reproduce la tabla.)
- Cifrado: clave cíclica; un byte se XORea salvo que el byte de clave sea 0x20 o el dato esté en {0x00, 0xFF, k, k^0xFF}. [bartasx protocol.py#L73-L84](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/protocol.py#L73-L84) — código.
- Hertzz documenta XOR opcional de 4 bytes con tabla de 20 entradas. [docs/bluetooth.md#L90-L95](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/docs/bluetooth.md#L90-L95) — doc. autor.

## 5. Lectura y escritura de bloques

- Lectura: `[CMD][ADDR_HI][ADDR_LO][0x80]` → eco de 4 B de cabecera + 128 B. Escritura: cabecera + 128 B → ACK 0x06. [bartasx transport.py#L162](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/transport.py#L162), [#L203-L206](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/transport.py#L203-L206) — código.
- nivin: bloques de 132 B llegan en ~7 notificaciones; el CPS reintenta tras ~1 s ([ble_bridge.py#L322](https://github.com/nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS/blob/3384123/ble_bridge.py#L322) para los trozos; el reintento de ~1 s: pendiente de línea exacta) — doc. autor.
- Hertzz: paquete de lectura de 8 B `[0x52][AddrH][AddrL][0x08]`, ReadEnd 0x54, WriteEnd 0x58. [docs/bluetooth.md#L85-L88](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/docs/bluetooth.md#L85-L88) — doc. autor (contradice el bloque de 128).
- Segmentos y pacing por segmento en nivin: ACK 8/10/10/10/10/10 s; APRS 30 s con 0,10 s de retardo y 0,5 s de asentamiento; 0,05 s tras bloque en ajustes; la radio se autoconfirma tras el ACK de APRS y luego corta el BLE, por lo que el `E` final es "mejor esfuerzo". [BLE_int.py#L2290-L2301](https://github.com/nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS/blob/3384123/radtel_rt950pro_BLE_int.py#L2290-L2301), [ble_bridge.py#L22-L25](https://github.com/nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS/blob/3384123/ble_bridge.py#L22-L25) — código/doc. autor.
- pe1hvh (de NeonPlug): canales 8 s; ajustes 10 s + 50 ms; APRS 30 s + 100 ms + 500 ms antes de `E`. [docs/protocol.md#L62-L68](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/docs/protocol.md#L62-L68) — doc. autor.
- Timeouts bartasx: 5 s general, 8 s por bloque de lectura, 8 s ACK de escritura. [transport.py#L71](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/transport.py#L71), [#L162](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/transport.py#L162), [#L206](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/transport.py#L206) — código.
- Intervalo de conexión: nivin usa el lento por defecto; `--fast` pide optimizado a caudal. [ble_bridge.py#L83-L96](https://github.com/nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS/blob/3384123/ble_bridge.py#L83-L96) — código.

## 6. Marcos y CRC (contradicción)

- UART CPS según Hertzz: marco A5 con relleno `FF FF FF` y CRC-CCITT (poly 0x1021, init 0), `T`=ReadEnd, `X`=WriteEnd, `E`=Erase. [docs/cps-uart.md#L14-L54](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/docs/cps-uart.md#L14-L54), [docs/bluetooth.md#L72-L79](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/docs/bluetooth.md#L72-L79) — doc. autor.
- Resto de repos: bytes crudos sin marco ni CRC; fin de sesión 0x06 (lectura) / 0x45 (escritura) según [hertzz tools/README.md#L94-L119](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/tools/README.md#L94-L119) (doc. autor, contradice su propio docs/cps-uart.md); radiosmith: "sin checksums" ([protocol.py#L13](https://github.com/toddbartholow/radiosmith/blob/12a7dd9/src/radiosmith/rt950/protocol.py#L13), MIT) — doc. autor.
- Fin de sesión 'E' en Nathan: [docs/MemoryMap.md#L50](https://github.com/NathanBarguss/Chirp_Radtel-RT-950-Pro/blob/254d2cd/docs/MemoryMap.md#L50) — doc. autor.
- Qué lo resolvería: captura BLE/USB de una sesión CPS oficial en la misma radio y firmware — pendiente de prueba en radio.

## 7. Autenticación en UART (Hertzz)

UID del MCU XOR datos del bootloader comparado con "RT-950". [docs/cps-uart.md#L70-L77](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/docs/cps-uart.md#L70-L77) — doc. autor. Paquete 128 B, bloque de borrado 256 B ([#L101](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/docs/cps-uart.md#L101)).

## 8. Pendientes

- Valor exacto del byte tras 0x3F y significado del "selector de baudios": pendiente de fuente.
- ¿El token fijo de nivin funciona en toda radio/firmware?: pendiente de prueba en radio.
- Existencia de ff32 en la radio real (solo documentado por Hertzz): pendiente de prueba en radio.
