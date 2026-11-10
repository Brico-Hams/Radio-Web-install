# Reconocimientos y fuentes

[Español](ACKNOWLEDGEMENTS.md) · [English (US)](ACKNOWLEDGEMENTS.en.md) · [Français](ACKNOWLEDGEMENTS.fr.md) · [Deutsch](ACKNOWLEDGEMENTS.de.md)

Bricohams Radio Workspace es una **implementación independiente con fines de interoperabilidad**. Se estudiaron formatos y protocolos documentados o publicados. El catálogo precompilado distribuye imágenes F4HWN v6.1.0 y derivadas Bricohams: conserva la licencia Apache-2.0 y el NOTICE upstream, junto con GPL-3.0-or-later para las aportaciones Bricohams. Los hashes, procedencia y opciones están en `precompiled/catalog.json`; los avisos y ambas licencias acompañan a los binarios. No existe afiliación ni respaldo de los proyectos citados. Las marcas pertenecen a sus propietarios.

## Referencias de protocolo y formato

Las herramientas nativas de visor/teclado, reinicio, mantenimiento,
DFU, gestion de apps y filtrado/exportacion RF son implementaciones
independientes para interoperabilidad. No cargan scripts de UV Studio ni
copian su interfaz. Esto no transfiere a Bricohams la autoria de firmware,
apps, logos o recursos de terceros, ni constituye una garantia juridica.
Las licencias y avisos originales siguen siendo obligatorios.

| Proyecto | Uso como referencia | Licencia |
| --- | --- | --- |
| [OpenGD77 CPS web (grid.radio)](https://grid.radio/opengd77/) | Protocolo CPS `C`/`R`/`W`/`X`, modos, mapas de memoria, guía de controladores | Sitio de terceros |
| [OpenGD77](https://www.opengd77.com/) · [open-ham/OpenGD77](https://github.com/open-ham/OpenGD77) | Formato de codeplug y bloque de datos personalizados (satélites tipo 3) | GPL-2.0 |
| [F4HWN · armel/uv-k1-k5v3-firmware-custom](https://github.com/armel/uv-k1-k5v3-firmware-custom) y su [wiki](https://github.com/armel/uv-k1-k5v3-firmware-custom/wiki) | UART, Multiboot, Multiconfig, slots, CRC | Apache-2.0 |
| [UV Studio](https://armel.github.io/uvstudio/) | Flujo de slots/copias y referencia de interoperabilidad LCD/RF Log; revisión fijada `e7aa946f6de002559e1aaf3f91765db7fc2ed567`. El visor web es una implementación independiente, no una copia del código del sitio | Sitio de terceros |
| [egzumer/uv-k5-firmware-custom](https://github.com/egzumer/uv-k5-firmware-custom) | Antecedente del firmware F4HWN y su protocolo | Apache-2.0 |
| [DualTachyon/uv-k5-firmware](https://github.com/DualTachyon/uv-k5-firmware) | Protocolo base Quansheng | Apache-2.0 |
| [(tr)uSDX · DL2MAN](https://dl2man.de/) y [uSDX · PE1NNZ](https://github.com/threeme3/usdx) | **Coautores del soporte (tr)uSDX** de la APK: Guido (PE1NNZ, concepto, circuito y código del uSDX) y Manuel (DL2MAN, (tr)uSDX, PCB sándwich y LPF clase E). Comandos CAT y streaming de audio según [“(tr)uSDX Details”](https://dl2man.de/5-trusdx-details/). No se reutiliza su código | Proyecto y firmware de sus autores |
| Manuales de Yaesu (FT-817ND/818ND/857D/897D, FTX-1 CAT 2508-C) e Icom (IC-705 CI-V rev. 6) | CAT multirradio de la APK, escrito desde estos documentos | Documentación del fabricante |
| Manuales CAT de QRP Labs (QMX firmware 1.04_003, QDX Rev 1.06) | CAT de QMX/QMX+ y QDX/QDX-M en la APK, escrito desde estos documentos | Documentación del fabricante |
| [CHIRP · kk7ds/chirp](https://github.com/kk7ds/chirp) `chirp/drivers/tk11.py` (Dan Smith 2012, Thibaut Berg 2025) | Tramado, XOR, CRC16-XMODEM, comandos 0x01F4-0x01FE y 0x05DD y mapa de memoria del Quansheng TK-11; `tk11-connector.js` es una portación/reimplementación con atribución | GPL-3.0-or-later |
| [CHIRP-to-TK11-csv](https://github.com/nikantgr/CHIRP-to-TK11-csv) `convert_chirp_to_tk11.py` (© 2025 Nikos K. Kantarakias, SY1EBE) | Formato CSV de importación del TK-11 (columnas, valores, tonos) y conversión de CHIRP a TK-11; la lógica de `chirpToTk11Rows` y `tk11RowsToCsv` en `tk11-connector.js` es una portación a JavaScript con cambios (potencia tomada de CHIRP, sin variante de configuración regional) | GPL-3.0 |
| [TK-11 Manager · URZ](https://urez.org/tk-11-manager-la-herramienta-definitiva-para-programar-tu-quansheng-tk-11-desde-el-pc/) (Fernando Lamarca Belanche, RxSTAR) | Solo se leyó el artículo público para documentar qué ofrece la herramienta; no se copia ni analiza su código y no se reutiliza ningún recurso | Sin licencia consultada |
| [Multi-UVTools · spm81](https://github.com/spm81/Multi-UVTools) | Solo se consultó qué funciones existen (nombres de herramientas); el repositorio no tiene licencia, así que no se copia ni traduce código, textos ni interfaz | Sin licencia (todos los derechos reservados) |
| [FT8CN](https://github.com/N0BOY/FT8CN) (BG7YOZ) | Estudiado solo para entender cómo resuelve CAT, USB serie y audio en Android; no se copia código ni recursos | MIT |
| [pe1hvh/chirp_radtel_rt950pro](https://github.com/pe1hvh/chirp_radtel_rt950pro) `radtel_rt950pro.py` (© 2025 Nathan G. Barguss 2E0NBS, © 2026 PE1HVH) | Radtel RT-950 Pro: tabla de 20 claves XOR y regla de selección, sesión de clonado, formato de canal de 32 bytes (BCD, tonos CTCSS/DCS) y bloque APRS de 128 bytes (`_APRS_SPECS`); `Rt950Protocol.kt` es una portación a Kotlin con cambios | MIT |
| [infamy/NeonPlug](https://github.com/infamy/NeonPlug) `src/radios/rt950pro` | Radtel RT-950 Pro por Bluetooth LE: UUID, desbloqueo `ff31`, regiones de memoria, trama `SEND` fija y tiempos de espera de confirmación | MIT |
| [frrojas92/rt950_tak_bridge](https://github.com/frrojas92/rt950_tak_bridge) (Fernando Rojas, CA6FEG) | KISS sobre BLE del RT-950 Pro (tramado y desescape de `ffe1`) en `Aprs.kt` | MIT |
| [nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS](https://github.com/nivingoonesekera/Radtel-RT-950Pro-BLE-bridge-for-CHIRP-and-CPS) `ble_bridge.py` | Desbloqueo, ritmo de escritura en fragmentos de 20 bytes y reconexión BLE del RT-950 Pro en `Rt950Ble.kt` | MIT |

## Dependencias

| Paquete | Uso | Licencia |
| --- | --- | --- |
| [satellite.js](https://github.com/shashwatak/satellite-js) 6.0.1 | Propagación SGP4/SDP4 | MIT |

## Fuentes de datos

| Proveedor | Datos | Condiciones |
| --- | --- | --- |
| [RadioID.net](https://radioid.net/) | Contactos DMR | Términos de RadioID |
| [RepeaterBook](https://www.repeaterbook.com/) | Repetidores | Requiere token aprobado. “Data courtesy of RepeaterBook.com” |
| [SatNOGS DB](https://db.satnogs.org/) | Transmisores y TLE | CC BY-SA 4.0 |
| [CelesTrak](https://celestrak.org/) | TLE | Términos de CelesTrak |
| [opengd77.com](https://www.opengd77.com/downloads/) y [GitHub Releases de F4HWN](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases) | Firmware oficial | Licencias de cada proyecto |
| [armel/k1-teardown](https://github.com/armel/k1-teardown) (F4HWN) | Siete fotos del teardown del UV-K1 en `docs/atlas/`, reducidas a 1600 px | Apache-2.0 |

## Documentación y herramientas

- Identidad propia Bricohams: [logotipo original de Bricohams Studio](https://github.com/Brico-Hams/Bricohams-Studio/blob/767edd66028d10f859346190d0c8044bd8e5a2b2/assets/logo-bricohams.png), conservado sin redibujar ni recolorear. Procedencia y verificación en [Guía de marca](docs/BRANDING.md).
- [MDN: Web Serial API](https://developer.mozilla.org/docs/Web/API/Web_Serial_API) y [WebUSB API](https://developer.mozilla.org/docs/Web/API/WebUSB_API).
- Vallado, Crawford, Hujsak y Kelso, *Revisiting Spacetrack Report #3* (2006): vector de prueba SGP4 usado en los tests.
- [Zadig](https://zadig.akeo.ie/) (WinUSB en Windows), [WCH CH341SER](https://www.wch-ic.com/downloads/CH341SER_EXE.html), [Silicon Labs CP210x](https://www.silabs.com/developer-tools/usb-to-uart-bridge-vcp-drivers) y [Prolific PL2303](https://www.prolific.com.tw/) — enlazados, no redistribuidos.

Gracias a la comunidad de radioaficionados y a los autores de estos proyectos por publicar su trabajo.
# Apps Labs precompiladas

El catalogo de pruebas redistribuye SystemInfo, BroadcastFM, Cube3D, Tetris,
Breakout y Minesweeper de Armel F4HWN, archivo v6.1.0, bajo Apache-2.0.
Se conservan sus nombres, cabeceras, licencia y NOTICE originales.
Los manifiestos identifican la procedencia y SHA-256; no se atribuye su
autoria a Bricohams ni se afirma validacion funcional en hardware.
