# Ejemplos: firmwares abiertos, canales y scripts

Revision: 26-10-2026. Archivos de ejemplo de la carpeta `examples/` del repositorio. Solo se
incluyen binarios cuya licencia permite redistribuirlos, con su licencia al lado. Los firmwares
de terceros sin esa licencia (Karina, Baofeng, OpenGD77 DM32) solo aparecen en el
[indice de hashes](BINARIOS-TERCEROS.md).

## Firmwares abiertos

| Carpeta | Contenido | Licencia | Para |
| --- | --- | --- | --- |
| [examples/firmware/f4hwn-v6.3.0](../examples/firmware/f4hwn-v6.3.0/SHA256SUMS) | `f4hwn.fusion`, `fieldops`, `labs` y `transfer` v6.3.0, mas el driver CHIRP de la misma release | Apache-2.0 (firmware, con `LICENSE` y `NOTICE`); GPL-2.0 o posterior (driver CHIRP, en su cabecera) | Quansheng UV-K5 V3 y UV-K1 (PY32F071) |
| [examples/firmware/moto-v1.3.2](../examples/firmware/moto-v1.3.2/SHA256SUMS) | Bootloader moto 1.3.2 en `.bin` y `.uf2` | Apache-2.0 | UV-K5 V3 / UV-K1. Cambiar el bootloader es arriesgado: ver el [atlas](ATLAS-UV-K5-V3.md#bootloader-y-flasheo) |

Origen: releases oficiales de [armel/uv-k1-k5v3-firmware-custom](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases/tag/v6.3.0)
y [muzkr/moto](https://github.com/muzkr/moto/releases/tag/v1.3.2). Los SHA-256 coinciden con los que
publica GitHub para cada archivo. Comprobar antes de usar:

```text
cd examples/firmware/f4hwn-v6.3.0
sha256sum -c SHA256SUMS
```

Flashear el firmware principal: [puesta en marcha de 0 a 100 %](AYUDA-QUANSHENG.md#puesta-en-marcha-de-0-a-100-).
La version mas reciente esta siempre en la release de armel; estas copias son una referencia fija.

## Canales

| Archivo | Contenido |
| --- | --- |
| [examples/channels/pmr446-solo-rx.chirp.csv](../examples/channels/pmr446-solo-rx.chirp.csv) | Los 16 canales PMR446 en formato CSV de CHIRP, FM estrecha y con TX desactivado (`Duplex = off`). Plantilla para importar en CHIRP o en esta web |

Las radios de radioaficionado no estan homologadas para PMR446: el archivo es solo de escucha.

## Scripts

Codigo propio de Bricohams, con la licencia del repositorio (GPL-3.0-or-later). Ejecutar con `python -I`.

| Script | Que hace |
| --- | --- |
| [tg_kb.py](../examples/scripts/tg_kb.py) | Convierte exportaciones JSON de Telegram Desktop de grupos tecnicos en una base de conocimiento local por temas (firmware, flasheo, calibracion, mods), con catalogo de archivos (SHA-256, MCU de destino por la tabla de vectores) y de enlaces. Elimina autores, alias, telefonos y correos. El resultado es material de terceros: guardarlo en local |
| [test_tg_kb.py](../examples/scripts/test_tg_kb.py) | Prueba de `tg_kb.py` con una exportacion sintetica: `python -I test_tg_kb.py` |
| [check_repos.py](../examples/scripts/check_repos.py) | Lee una lista `owner/repo` y saca una tabla con estado, ultimo push, licencia, estrellas y MCU (V3/K1 si hay codigo PY32). Necesita `gh` con sesion |
| [recover.py](../examples/scripts/recover.py) | Para repos borrados: busca copia en Software Heritage, captura en Wayback Machine y forks con el mismo nombre |

Uso tipico:

```text
python -I tg_kb.py salida ChatExport_grupo1 ChatExport_grupo2
python -I check_repos.py repos.txt > repos.md
python -I recover.py caidos.txt
```
