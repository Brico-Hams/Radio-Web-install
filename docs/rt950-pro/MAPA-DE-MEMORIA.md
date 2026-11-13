# Mapa de memoria del RT-950 Pro

Evidencia: **[código]**, **[doc. autor]**, **[medido autor]**, **[inferencia]**, **[pendiente de prueba en radio]**. Las fuentes discrepan; se listan todas. Ver [CONTRADICCIONES.md](CONTRADICCIONES.md).

Abreviaturas: **bartasx** = `https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/` (MIT) · **nathan** = `https://github.com/NathanBarguss/Chirp_Radtel-RT-950-Pro/blob/254d2cd/` (MIT por cabecera) · **nivin** = `https://github.com/nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS/blob/3384123/` (MIT) · **pe1hvh** = `https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/` (MIT) · **hertzz** = `https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/` (GPL-3.0) · **jaymart** = `https://github.com/jaymart1983/rt950-pro-re/blob/4ecc044/` (sin licencia: solo descripción).

## 1. Rangos de direcciones según cada fuente

| Rango | pe1hvh (fw 0.29, medido) | Nathan / nivin (960 canales) | Hertzz (UART doc.) |
|---|---|---|---|
| 0x0000–0x77FF | canales 1–960 | canales 960×32 | canales |
| 0x7800–0x7BBF | canales 961–990 | "hueco", no escribir; ¿calibración? | canales (hasta 0x7BC0, 990×32) |
| 0x7BC0–0x7FFF | sin uso (todo 0xFF en la radio de prueba) | hueco | — |
| 0x8000 | VFO | VFO A/B/C (3×0x80) | VFO |
| 0x9000 | función (0x60 usados) | función (3×0x80) | sistema |
| 0xA000 | DTMF (0x200) | DTMF (0x200) | ext1 (384 B) |
| 0xB000 | modulación (0x200) | modulación | ext2 (256 B) |
| 0xC000 | nombres de zona (0xC000–0xC09F, 10×16) | reservado/desconocido | DTMF+modulación (256 B) |
| 0xD000 | nombres de canales de modulación (0x300) | nombres (0xD000–0xD2FF) | APRS+varios (768 B) |
| 0xE000 | desconocido (¿calibración?), nunca escrito | cola de firmware (calibración, inferida) | — |

Fuentes: pe1hvh [docs/memory-map.md#L11-L20](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/docs/memory-map.md#L11-L20) (medido por el autor en fw 0.29); Nathan [docs/MemoryMap.md#L7](https://github.com/NathanBarguss/Chirp_Radtel-RT-950-Pro/blob/254d2cd/docs/MemoryMap.md#L7), [#L12-L14](https://github.com/NathanBarguss/Chirp_Radtel-RT-950-Pro/blob/254d2cd/docs/MemoryMap.md#L12-L14), [#L16-L46](https://github.com/NathanBarguss/Chirp_Radtel-RT-950-Pro/blob/254d2cd/docs/MemoryMap.md#L16-L46) (doc. autor); Hertzz [docs/cps-uart.md#L103-L113](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/docs/cps-uart.md#L103-L113) (doc. autor; contradice a los demás en 0xA000–0xD000, y a su propio [tools/README.md#L94-L119](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/tools/README.md#L94-L119), que añade sondas de calibración en 0xF000 y 0xF200).

Segmentos leídos por cada cliente:
- Nathan: 0x0000 len 0x7800; 0x8000 len 0x100; 0x9000 len 0x100; 0xA000 len 0x200; 0xB000 len 0x200; 0xD000 len 0x300; APRS (cmd 0x54/0x55) 0x0000 len 0x80. [transport.py#L83-L89](https://github.com/NathanBarguss/Chirp_Radtel-RT-950-Pro/blob/254d2cd/rt950pro/transport.py#L83-L89) — código. Suma 33152.
- nivin: mismos tamaños, APRS con 0x54/0x58. [radtel_rt950pro_BLE_int.py#L2290-L2301](https://github.com/nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS/blob/3384123/radtel_rt950pro_BLE_int.py#L2290-L2301) — código.
- pe1hvh: 0x0000 len 0x8000 (hasta 0x7BFF efectivo), 0x8000, 0x9000 (0x100), 0xA000, 0xB000, 0xD000 (0x300), APRS 0x54/0x58, nombres de zona en 0xC000 len 0x100. [radtel_rt950pro.py#L3394-L3403](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/radtel_rt950pro.py#L3394-L3403) — código.
- bartasx: 0x0000 len 0x2300; 0x2380 len 0x5880; 0x8000 len 0x80; 0x9000 len 0x80; 0xA000 len 0x3300; ALT 0x0000 len 0x80. [protocol.py#L28-L47](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/protocol.py#L28-L47) — código. Hueco 0x2300–0x237F no leído.

## 2. Tamaños de imagen

| Tamaño | Origen | Evidencia |
|---|---|---|
| 33152 | Nathan `_memsize` ([chirp_driver.py#L1038](https://github.com/NathanBarguss/Chirp_Radtel-RT-950-Pro/blob/254d2cd/rt950pro/chirp_driver.py#L1038)); nivin ([BLE_int.py#L4079](https://github.com/nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS/blob/3384123/radtel_rt950pro_BLE_int.py#L4079)); imagen "legacy 960" de pe1hvh ([tests/test_driver.py#L146](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/tests/test_driver.py#L146)) | código |
| 35456 | pe1hvh `_memsize` = suma de segmentos ([docs/chirp-interface.md#L68](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/docs/chirp-interface.md#L68); [radtel_rt950pro.py#L4545](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/radtel_rt950pro.py#L4545)) | código (la suma de los segmentos del punto 1 da 35456: inferencia aritmética) |
| 45056 | bartasx READ_TOTAL y segmentos de escritura ([protocol.py#L37-L44](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/protocol.py#L37-L44)); SP3ARK menciona volcados antiguos de 45056 ([README.md#L161-L162](https://github.com/SP3ARK/Radtel-950-Pro-Bluetooth-Programmator/blob/a8bb41a/README.md#L161-L162), licencia contradictoria) | código / doc. autor |
| 43776 | solo en el docstring de `_prepare_write_blob` ([commands.py#L89](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/commands.py#L89)); los segmentos reales suman 45056 | código (docstring obsoleto; inferencia) |

El offset de `TAIL_START = 0x7A80` en los tests de Nathan es un offset de fichero dentro del segmento DTMF, no una cola de firmware: [tests/test_chirp_driver.py#L35](https://github.com/NathanBarguss/Chirp_Radtel-RT-950-Pro/blob/254d2cd/tests/test_chirp_driver.py#L35) — inferencia.

## 3. Variantes: 960 vs 990 canales (0x7800–0x7BFF, canales 961–990)

- pe1hvh: 990 canales = 10 zonas × 99, zona z canal k = ranura (z−1)×99+k; 0x7800–0x7BBF solo se escribe si se editaron esos canales; nunca más allá de 0x7BFF. [docs/memory-map.md#L11-L12](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/docs/memory-map.md#L11-L12), [#L22-L26](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/docs/memory-map.md#L22-L26) — medido por el autor (fw 0.29) + doc.
- pe1hvh README: el fw antiguo era 960 canales (15 zonas × 64), la memoria acababa en 0x77FF; NeonPlug vio datos tipo calibración en 0x7800–0x7FFF en una radio y escribir 990 canales los sobrescribiría; "no verificado de forma independiente". [README.md#L55-L58](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/README.md#L55-L58) — doc. autor; **pendiente de prueba en radio**.
- Nathan: 0x7800–0x7FFF desconocido, posible sombra de calibración, no escribir ([MemoryMap.md#L12-L14](https://github.com/NathanBarguss/Chirp_Radtel-RT-950-Pro/blob/254d2cd/docs/MemoryMap.md#L12-L14)).
- Hertzz: 990×32 hasta 0x7BC0. jaymart: 999 registros ([FINDINGS.md#L68-L86](https://github.com/jaymart1983/rt950-pro-re/blob/4ecc044/FINDINGS.md#L68-L86)). bartasx: 988 ranuras (0–279 + 280–987). radiosmith: decodifica 960 ([codeplug.py#L31](https://github.com/toddbartholow/radiosmith/blob/12a7dd9/src/radiosmith/rt950/codeplug.py#L31)), solo escribe sectores de canales 1–896 (0x0000–0x6FFF; [write.py#L27](https://github.com/toddbartholow/radiosmith/blob/12a7dd9/src/radiosmith/rt950/write.py#L27)), el CPS guarda 990 en 10 zonas de 99 ([cpsfile.py#L4](https://github.com/toddbartholow/radiosmith/blob/12a7dd9/src/radiosmith/rt950/cpsfile.py#L4)).
- Que un firmware concreto use 960 o 990: inferencia de pe1hvh; pendiente de prueba en radio.

## 4. Registro de canal (32 bytes)

Consistente entre bartasx ([decoder.py#L428-L473](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/decoder.py#L428-L473)) y Nathan ([channel.py#L443-L461](https://github.com/NathanBarguss/Chirp_Radtel-RT-950-Pro/blob/254d2cd/rt950pro/channel.py#L443-L461)) — código:

| Bytes | Contenido |
|---|---|
| 0–3 | RX, BCD de 4 bytes little-endian en unidades de 10 Hz; todo 0x00/0xFF = vacío (bartasx además marca vacío un nibble >9, [decoder.py#L30-L44](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/decoder.py#L30-L44)) |
| 4–7 | TX, mismo formato |
| 8–9 / 10–11 | tono RX / TX, little-endian: <256 con byte alto 0 = índice DCS base 1; si no CTCSS×10; 0xFFFF = off ([decoder.py#L58-L65](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/decoder.py#L58-L65)) |
| 12 | nibble bajo = grupo de señalización |
| 13 | nibble bajo = PTT ID |
| 14 | nibble bajo = potencia (0 alta, 1 media, 2 baja); nibble alto = scrambler |
| 15 | b7 FHSS, b6 estrecho (1=NFM), b5–4 cifrado, b3 bloqueo canal ocupado, b2 añadir a scan, b1 TX permitido, b0 AM |
| 16–19 | código FHSS (válido si byte 19 = 0xA0) |
| 20–31 | nombre, GB2312, relleno 0xFF (bartasx) |

Discrepancias: jaymart indica bytes 0x10–0x13 "reservados FF", nombre ASCII y bit 6 = "ancho" ([FINDINGS.md#L68-L86](https://github.com/jaymart1983/rt950-pro-re/blob/4ecc044/FINDINGS.md#L68-L86), doc. autor, campos 0x0C–0x0E "derivados" de Hertzz, no confirmados) frente a bit 6 = estrecho en bartasx/Nathan/pe1hvh. Tonos de jaymart: CTCSS = frecuencia×10, DCS = índice base 1 en tabla de 104 códigos ([FINDINGS.md#L90](https://github.com/jaymart1983/rt950-pro-re/blob/4ecc044/FINDINGS.md#L90)). Nombre ASCII vs GB2312: pendiente de prueba en radio.

## 5. Zonas y nombres

- Nombres de zona: 10×16 B en 0xC000 (pe1hvh), máx. 12 caracteres; ASCII en pe1hvh vs GB2312 en bartasx. [pe1hvh memory-map.md#L102-L108](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/docs/memory-map.md#L102-L108); bartasx lo ubica en el blob 0x9C80 (= radio 0xC000) [decoder.py#L368](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/decoder.py#L368), [commands.py#L434-L436](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/commands.py#L434-L436) — código.
- Nathan marca 0xC000–0xCFFF como "no referenciado por el CPS" (doc. autor) — contradice a pe1hvh/bartasx.
- jaymart: 10 ranuras de zona en 0xC000, paso de 16 B; antes etiquetado 0xA200 (dirección de RT-900, errónea; 0xA200 está borrado) — [FINDINGS.md#L113-L136](https://github.com/jaymart1983/rt950-pro-re/blob/4ecc044/FINDINGS.md#L113-L136), doc. autor.
- Modo de división de canales (0x9026): 0 = Zone CH Mode, 1 = All CH Mode. [pe1hvh memory-map.md#L37-L43](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/docs/memory-map.md#L37-L43) — doc. autor.
- Nombres de canal de modulación en 0xD000: 3×16×16 B. [bartasx commands.py#L437-L440](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/commands.py#L437-L440) — código.

## 6. VFO, función, DTMF, modulación

- VFO (pe1hvh): frecuencia con un dígito decimal por byte en 10 Hz; offset en 100 Hz; tabla de 10 pasos (2,5 … 100 kHz); banda derivada (VHF <300 MHz). [memory-map.md#L62-L80](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/docs/memory-map.md#L62-L80) — doc. autor.
- Función: 0x9000–0x907F escrito; 0x9080–0x90FF todo 0xFF en un volcado y con datos en otro; el driver solo escribe 0x9000–0x907F. [#L28-L35](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/docs/memory-map.md#L28-L35) — medido por el autor. Contradicción con Nathan/nivin (0x100 leídos).
- DTMF (bartasx): mi ID bytes 0–4, ptt_id 6, 16 grupos en 32+16·i. [decoder.py#L603-L614](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/decoder.py#L603-L614) — código.
- Modulación (bartasx): tabla FM 16×u16, FM actual 32, modo 33, tabla AM desde 34, am_cur 66, mod_mode 67, am_gain 68, SSB 16×5 B desde 69, ssb_cur 149, pasos 150–151, ganancia 152. [decoder.py#L617-L641](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/decoder.py#L617-L641) — código. Campos globales en pe1hvh [memory-map.md#L82-L100](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/docs/memory-map.md#L82-L100).
- Blob empaquetado de bartasx (offsets del fichero, no direcciones de radio): CH1 0x0000–0x2300, CH2 0x2300–0x7B80, VFO 0x7B80–0x7C00, FUNC 0x7C00–0x7C80, DTMF 0x7C80–0xAF80, SYS 0xAF80–0xB000. [commands.py#L33-L38](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/commands.py#L33-L38) — código.

## 7. Bloque APRS (espacio ALT, 0x0000, 128 B)

bartasx [decoder.py#L683-L719](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/decoder.py#L683-L719) (código): aprs_on byte 0, gps_on byte 1, tz 6, lat/lon en grados/min/seg con marcas 'N'/'S' (78) y 'W'/'E' (87), altitud i16 en 15–16, indicativo 17–22, SSID 23, enrutado 24 (0 ninguno, 1 WIDE1-1, 2 WIDE2-2, 3 TRACE3-3, 4/5 personalizado), símbolo 26, tipo de baliza 34, tiempo de baliza 36, mensaje en 79 (32 B en bartasx; 40 B en nivin [BLE_int.py#L1112](https://github.com/nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS/blob/3384123/radtel_rt950pro_BLE_int.py#L1112), [#L1516](https://github.com/nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS/blob/3384123/radtel_rt950pro_BLE_int.py#L1516) y pe1hvh [memory-map.md#L110-L118](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/docs/memory-map.md#L110-L118)).

Comando de escritura APRS: 0x58 (nivin, pe1hvh: con 0x55 no hay ACK, medido en HW) frente a 0x55 (Nathan [MemoryMap.md#L54-L57](https://github.com/NathanBarguss/Chirp_Radtel-RT-950-Pro/blob/254d2cd/docs/MemoryMap.md#L54-L57)).

Posible fallo no usado por la CLI: `patch_aprs_in_blob` copia a "REG 0xAF80" en el decimal 35840 ([decoder.py#L324](https://github.com/bartasx/Radtel-RT-950-PRO-bluetooth-reverse-engineering/blob/b9bda79/rt950/decoder.py#L324)) — pendiente de prueba.

## 8. Flash SPI (jaymart, mediciones de ingeniería inversa)

Mapa: 0x000000–0x013FFF configuración (canales, VFO, ajustes, calibración, APRS); 0x090000–0x0B5FFF pantalla de inicio 240×320 RGB565 (153 600 B, [Nathan MemoryMap.md#L59-L64](https://github.com/NathanBarguss/Chirp_Radtel-RT-950-Pro/blob/254d2cd/docs/MemoryMap.md#L59-L64)); 0x0E0000–0x1D4FFF fuentes; 0x200000–0x2CAFFF archivo de recursos (141 registros); resto borrado. [FINDINGS.md#L353-L361](https://github.com/jaymart1983/rt950-pro-re/blob/4ecc044/FINDINGS.md#L353-L361) — medido por el autor. La radio cachea la lista de canales al arrancar: hace falta reiniciar tras escribir ([#L147-L148](https://github.com/jaymart1983/rt950-pro-re/blob/4ecc044/FINDINGS.md#L147-L148)).

## 9. Pendiente de fuente

- Qué contiene realmente 0x7BC0–0x7FFF y 0xE000+ en cada firmware.
- Mapeo exacto del bloque de calibración (ubicación confirmada): pendiente de prueba en radio.
