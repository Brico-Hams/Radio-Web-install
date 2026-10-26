# Reconocimientos y fuentes

Bricohams Radio Workspace es una **implementación independiente con fines de interoperabilidad**. Se estudiaron formatos y protocolos documentados o publicados, pero **no se distribuye código fuente, firmware ni recursos gráficos de terceros** en este repositorio. No existe afiliación ni respaldo de los proyectos citados. Las marcas pertenecen a sus propietarios.

## Referencias de protocolo y formato

| Proyecto | Uso como referencia | Licencia |
| --- | --- | --- |
| [OpenGD77 CPS web (grid.radio)](https://grid.radio/opengd77/) | Protocolo CPS `C`/`R`/`W`/`X`, modos, mapas de memoria, guía de controladores | Sitio de terceros |
| [OpenGD77](https://www.opengd77.com/) · [open-ham/OpenGD77](https://github.com/open-ham/OpenGD77) | Formato de codeplug y bloque de datos personalizados (satélites tipo 3) | GPL-2.0 |
| [F4HWN · armel/uv-k1-k5v3-firmware-custom](https://github.com/armel/uv-k1-k5v3-firmware-custom) y su [wiki](https://github.com/armel/uv-k1-k5v3-firmware-custom/wiki) | UART, Multiboot, Multiconfig, slots, CRC | Apache-2.0 |
| [UV Studio](https://armel.github.io/uvstudio/) | Flujo de trabajo de slots y copias | Sitio de terceros |
| [egzumer/uv-k5-firmware-custom](https://github.com/egzumer/uv-k5-firmware-custom) | Antecedente del firmware F4HWN y su protocolo | Apache-2.0 |
| [DualTachyon/uv-k5-firmware](https://github.com/DualTachyon/uv-k5-firmware) | Protocolo base Quansheng | Apache-2.0 |

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
