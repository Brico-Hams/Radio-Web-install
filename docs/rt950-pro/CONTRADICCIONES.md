# Contradicciones entre fuentes

Cada entrada: afirmaciones en conflicto, fuentes y qué lo resolvería en la radio. Todo "resolver" es **pendiente de prueba en radio**. Las fuentes completas están en los documentos temáticos; aquí se enlazan las líneas clave.

<a id="c-01"></a>
## C-01 MTU BLE
- 512 (módulo) y trozos de 20/133 B: [Hertzz docs/bluetooth.md#L18](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/docs/bluetooth.md#L18), [#L97-L101](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/docs/bluetooth.md#L97-L101) (doc. autor).
- MTU fijo en 23 → 20 B: [nivin ble_bridge.py#L194-L196](https://github.com/nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS/blob/3384123/ble_bridge.py#L194-L196) (doc. autor); bartasx usa MTU−3 con respaldo 20 ([transport.py#L49-L51](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/transport.py#L49-L51)).
- Resolver: registrar el MTU negociado con un sniffer BLE en la radio real.

## C-02 Marcos y CRC del CPS
- Marco A5 + CRC-CCITT: [Hertzz docs/cps-uart.md#L14-L44](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/docs/cps-uart.md#L14-L44).
- Bytes crudos sin marco: [Hertzz tools/README.md#L94-L119](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/tools/README.md#L94-L119), [radiosmith protocol.py#L13](https://github.com/toddbartholow/radiosmith/blob/12a7dd9/src/radiosmith/rt950/protocol.py#L13) ("sin checksums"), [pe1hvh protocol.md#L3](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/docs/protocol.md#L3) (USB, fw 0.29, medido).
- Bloque de lectura: 128 B ([bartasx transport.py#L162](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/transport.py#L162)) vs 8 B ([Hertzz bluetooth.md#L85](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/docs/bluetooth.md#L85)).
- Resolver: captura del CPS oficial por USB y BLE.

## C-03 Fin de sesión
`E` ([Nathan MemoryMap.md#L50](https://github.com/NathanBarguss/Chirp_Radtel-RT-950-Pro/blob/254d2cd/docs/MemoryMap.md#L50)) vs `T`/`X` ([Hertzz cps-uart.md#L48-L54](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/docs/cps-uart.md#L48-L54)) vs 0x06 lectura/0x45 escritura ([Hertzz tools/README.md#L94-L119](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/tools/README.md#L94-L119)). Resolver: captura de sesión completa incluyendo el cierre.

## C-04 Comando de escritura APRS
0x55 ([Nathan MemoryMap.md#L54-L57](https://github.com/NathanBarguss/Chirp_Radtel-RT-950-Pro/blob/254d2cd/docs/MemoryMap.md#L54-L57)) vs 0x58 ([pe1hvh README.md#L26-L27](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/README.md#L26-L27), con 0x55 sin ACK, medido en fw 0.29; [nivin BLE_int.py#L2290-L2301](https://github.com/nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS/blob/3384123/radtel_rt950pro_BLE_int.py#L2290-L2301)). Probable diferencia de firmware (inferencia). Resolver: probar 0x55 en firmware antiguo.

## C-05 Número de canales y tamaño de imagen
960 (Nathan, nivin), 990 (Hertzz, pe1hvh), 988 (bartasx), 999 (jaymart [FINDINGS.md#L68-L86](https://github.com/jaymart1983/rt950-pro-re/blob/4ecc044/FINDINGS.md#L68-L86)); imágenes 33152 / 35456 / 45056, y 43776 como docstring obsoleto. Detalle y enlaces en [MAPA-DE-MEMORIA.md §2–§3](MAPA-DE-MEMORIA.md). Resolver: leer una radio de cada versión de firmware y comparar longitud y contenido de 0x7800–0x7FFF.

## C-06 Qué hay en 0x7800–0x7FFF
Calibración probable ([Nathan MemoryMap.md#L12-L14](https://github.com/NathanBarguss/Chirp_Radtel-RT-950-Pro/blob/254d2cd/docs/MemoryMap.md#L12-L14); [pe1hvh README.md#L56-L58](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/README.md#L56-L58), "no verificado") vs canales 961–990 en 0x7800–0x7BBF ([pe1hvh memory-map.md#L11-L13](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/docs/memory-map.md#L11-L13), medido en fw 0.29). Resolver: volcado antes/después de actualizar firmware 960→990 en la misma radio.

## C-07 Mapa 0xA000–0xD000
Hertzz: ext1/ext2/DTMF+mod/APRS ([cps-uart.md#L103-L113](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/docs/cps-uart.md#L103-L113)) vs DTMF/modulación/nombres de zona/nombres de modulación ([pe1hvh memory-map.md#L14-L19](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/docs/memory-map.md#L14-L19)) vs 0xC000 "reservado" ([Nathan MemoryMap.md#L16-L46](https://github.com/NathanBarguss/Chirp_Radtel-RT-950-Pro/blob/254d2cd/docs/MemoryMap.md#L16-L46)); jaymart corrigió 0xA200→0xC000 ([FINDINGS.md#L113-L136](https://github.com/jaymart1983/rt950-pro-re/blob/4ecc044/FINDINGS.md#L113-L136)). Resolver: modificar un nombre de zona con el CPS y comparar volcados.

## C-08 Registro de canal
Bit 6 del byte 15: estrecho (bartasx, Nathan, pe1hvh) vs "ancho" (jaymart [FINDINGS.md#L68-L86](https://github.com/jaymart1983/rt950-pro-re/blob/4ecc044/FINDINGS.md#L68-L86)); bytes 16–19 FHSS vs "reservados FF"; nombre GB2312 (bartasx) vs ASCII (jaymart/pe1hvh). Resolver: guardar un canal estrecho y otro ancho y comparar el byte.

## C-09 Función (0x9000)
0x60 usados / 0x9080–0x90FF variable ([pe1hvh memory-map.md#L14-L19](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/docs/memory-map.md#L14-L19), [#L28-L35](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/docs/memory-map.md#L28-L35)) vs 3×0x80 (Nathan MemoryMap.md#L16-L46) vs 0x80 (bartasx protocol.py#L28-L47). Resolver: cambiar ajustes y ver qué bytes cambian.

## C-10 Códigos de comando del bootloader
0x45 "erase" / 0x04 "flash programming" ([bootloader.md#L168-L173](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/docs/bootloader.md#L168-L173)) vs finalizar/anunciar ([tools/README.md#L165-L172](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/tools/README.md#L165-L172), [nicsure PROTOCOL.md#L25-L29](https://github.com/nicsure/RT-950-Pro-Web-Flasher/blob/818f37b/PROTOCOL.md#L25-L29)). Resolver: capturar un flasheo OEM.

## C-11 Cabecera BTF
jaymart: stub claro 0x000–0x3FF, clave en 0x400, cuerpo cifrado desde 0x800 ([FINDINGS.md#L30-L45](https://github.com/jaymart1983/rt950-pro-re/blob/4ecc044/FINDINGS.md#L30-L45)); Hertzz: 0x800 sin cifrar y clave en 0x400 ([tools/README.md#L32-L57](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/tools/README.md#L32-L57)); nicsure: identidad en 0x3E0 ([PROTOCOL.md#L26](https://github.com/nicsure/RT-950-Pro-Web-Flasher/blob/818f37b/PROTOCOL.md#L26)). En parte compatibles; ámbito del "stub": pendiente de fuente.

## C-12 Último bloque del flasheo
jaymart: se pierde el último bloque ([FINDINGS.md#L178-L190](https://github.com/jaymart1983/rt950-pro-re/blob/4ecc044/FINDINGS.md#L178-L190)); nicsure: relleno 0xFF suficiente (por confirmar) ([PROTOCOL.md#L28](https://github.com/nicsure/RT-950-Pro-Web-Flasher/blob/818f37b/PROTOCOL.md#L28)). Resolver: flashear con y sin bloque extra y comparar contra el original.

## C-13 Entrada al bootloader
PB12+PE5 ([bootloader.md#L156-L162](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/docs/bootloader.md#L156-L162)) vs teclas 3 y 4 ([tools/README.md#L189](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/tools/README.md#L189)): no contradictorio si PB12/PE5 son esas teclas; correspondencia pendiente de fuente.

## C-14 ¿TX por BLE KISS?
Solo RX en OEM ([lalmonte README.md#L128-L132](https://github.com/lalmonte/radiochat-aprs/blob/9c7b092/README.md#L128-L132); [SP3ARK README.md#L230](https://github.com/SP3ARK/Radtel-950-Pro-Bluetooth-Programmator/blob/a8bb41a/README.md#L230)) vs RX/TX con firmware parcheado ([erkanz README.md#L12-L17](https://github.com/erkanz/radtel-RT950PRO/blob/51c84d4/README.md#L12-L17)); SP3ARK además se contradice ([#L127-L128](https://github.com/SP3ARK/Radtel-950-Pro-Bluetooth-Programmator/blob/a8bb41a/README.md#L127-L128)). No son necesariamente incompatibles (firmwares distintos): inferencia. Resolver: enviar un marco KISS por FF31 con OEM V0.29 puro y mirar si hay PTT.

## C-15 Escritura de APRS y modelo
Mensaje APRS: 32 B (bartasx) vs 40 B (nivin, pe1hvh). Resolver: escribir un mensaje de 40 B y releerlo.

## C-16 Licencias
SP3ARK: [LICENSE#L1](https://github.com/SP3ARK/Radtel-950-Pro-Bluetooth-Programmator/blob/a8bb41a/LICENSE#L1) MIT vs [README.md#L265-L269](https://github.com/SP3ARK/Radtel-950-Pro-Bluetooth-Programmator/blob/a8bb41a/README.md#L265-L269) propietario. Hertzz: GPL v3 ([LICENSE#L1-L2](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/LICENSE#L1-L2)) frente a "uso educativo" ([README.md#L156-L159](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/README.md#L156-L159)). Resolver: aclaración del autor.

## C-17 Funciones BLE de frrojas92
README anuncia TCP/UDP y des-escape FEND/FESC; el código solo hace TCP ([main.py#L51](https://github.com/frrojas92/rt950_tak_bridge/blob/865afc5/src/rt950_tak_bridge/main.py#L51)). Ver [APRS-KISS.md §4](APRS-KISS.md).
