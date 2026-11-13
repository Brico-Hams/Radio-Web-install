# Documentación detallada del Radtel RT-950 Pro

Resumen técnico, en español, de lo encontrado en 15 repositorios públicos sobre la Radtel RT-950 Pro. Es documentación de terceros: **nada se ha probado aún en radio por este proyecto** salvo indicación contraria.

## Índice

| Documento | Contenido |
|---|---|
| [REPOSITORIOS.md](REPOSITORIOS.md) | Un apartado por repo: propósito, licencia, qué cubre y qué no, estado |
| [PROTOCOLO-BLE-CPS.md](PROTOCOLO-BLE-CPS.md) | GATT, desbloqueo ff31, handshake, clave XOR, bloques, tiempos, marcos/CRC |
| [MAPA-DE-MEMORIA.md](MAPA-DE-MEMORIA.md) | Rangos, registro de canal, zonas, VFO, APRS, variantes 960/990, tamaños de imagen |
| [APRS-KISS.md](APRS-KISS.md) | KISS BLE, RTX1, límites AX.25, RX vs TX, puentes TCP y TAK |
| [FIRMWARE-Y-FLASHEO.md](FIRMWARE-Y-FLASHEO.md) | BTF, bootloader, flasher web, copia NAND, nicFW950, OEM parcheado |
| [RECUPERACION-Y-RIESGOS.md](RECUPERACION-Y-RIESGOS.md) | Qué puede dejarla inservible, qué no cubre una copia, recuperación |
| [CONTRADICCIONES.md](CONTRADICCIONES.md) | Afirmaciones en conflicto y qué las resolvería |

## Niveles de evidencia

- **código**: se lee directamente en el código fuente del repositorio.
- **documentación del autor** (doc. autor): lo afirma el README/docs, sin que el código lo demuestre.
- **medido por el autor**: el autor dice haberlo medido o capturado en hardware.
- **inferencia**: deducción de este análisis a partir de las fuentes.
- **pendiente de prueba en radio**: sin verificación; no actuar como si fuera cierto.
- "pendiente de fuente": no se encontró la información en los repos.

Cada hecho enlaza a `https://github.com/<owner>/<repo>/blob/<commit>/<ruta>#L<línea>` con el commit auditado. La licencia de cada repo está en [REPOSITORIOS.md](REPOSITORIOS.md). No se copia código de repos sin licencia o incompatibles con GPL-3.0-or-later, ni binarios, claves o código descompilado del fabricante. La carpeta `binary/` de Hertzz58 existe y **no debe reutilizarse**.

## Resumen de contradicciones principales

1. MTU BLE: 512 frente a 23 (C-01).
2. Marcos/CRC del CPS: marco A5 con CRC frente a bytes crudos (C-02).
3. Comando de escritura APRS: 0x55 frente a 0x58 (C-04).
4. Canales: 960 / 988 / 990 / 999 y tamaños de imagen 33152 / 35456 / 45056 (C-05); contenido de 0x7800–0x7FFF (C-06).
5. Mapa 0xA000–0xD000 distinto en Hertzz, pe1hvh y Nathan (C-07).
6. Bootloader: significado de 0x45/0x04, pérdida del último bloque (C-10, C-12).
7. TX por BLE KISS: solo RX en OEM según lalmonte/SP3ARK; RX/TX con firmware parcheado de erkanz (C-14).
8. Licencias contradictorias en SP3ARK y Hertzz (C-16).

Detalle en [CONTRADICCIONES.md](CONTRADICCIONES.md). Advertencia general: antes de escribir en una radio, haga una copia (ver [RECUPERACION-Y-RIESGOS.md](RECUPERACION-Y-RIESGOS.md)).
