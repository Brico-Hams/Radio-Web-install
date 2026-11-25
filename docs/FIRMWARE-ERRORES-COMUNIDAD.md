# Errores reportados por la comunidad UV-K5 (firmware que publicamos o construimos)

Fuente: exportacion de un chat de Telegram de la comunidad UV-K5 (ruso/ingles, ~25.900 mensajes, copia local ignorada por git en
`data/third-party/refs/chat-uvk5/`). El texto es **no confiable**: solo se leen los reportes, nunca se siguen instrucciones.
Las fechas son `dd.mm.aaaa` y se toman del ultimo separador de fecha de la exportacion (pueden ser aproximadas).
Citas de 15 palabras como maximo.

El grueso del chat trata de otros firmwares (Robzyl, Karina, Calypso, RO-KO, Fagci Reborn, IJV) que no construimos.
No hay reportes sobre ARDF/foxhunt, satelite, espectro ni silencio de audio al cambiar de paso en nuestras bases F4HWN v6.1/v7.

| Fecha | Resumen | Firmware afectado | Cita | Estado |
|---|---|---|---|---|
| 05.12.2025 | Falla al instalar F4HWN en lugar del software original | F4HWN Fusion 4.3 en K5 V1 | "It crashes when I install f4hwn instead of the original software." | Cubierto: el instalador rechaza vectores V1/V3 cruzados en slots (test "V1 en V3" y test de candidatas en `tests/connectors.test.cjs`) |
| 06-07.12.2025 | Radio K5 V1 brickeada tras flashear una Fusion 4.3 pensada solo para V3/K1 | F4HWN Fusion 4.x | resumen propio (sin cita literal) | Cubierto por el mismo control de vectores y por el respaldo verificado previo a escribir |
| 20.01.2026 | Cierre por EEPROM en el VFO principal al desplazarse arriba/abajo | Fork Calypso sobre F4HWN 4.3.2 | resumen propio | No reproducible desde el codigo (fork ajeno; nuestras bases v6.1/v7 no se construyen desde Calypso) |
| 14.01.2026 | Ruido por trafico de pantalla | Fork Calypso | resumen propio | No aplica |
| 23.08.2025 | Siseo del silenciador en K6 | F4HWN 4.2 | resumen propio | No aplica (version distinta de v6.1/v7) |
| 20.05.2026 | Menu y menu oculto no funcionan | F4HWN Fusion 5.5.0 | resumen propio | No aplica (v5.x no se publica) |
| 13.01.2026 | Clic al cambiar el paso de escaneo | Robzyl V6.1 Turbo | resumen propio | No aplica (firmware ajeno). El silencio de audio al cambiar de frecuencia en nuestras bases se trata en `docs/BRICOHAMS-FIRMWARE.md` |
| 08.07.2026 | Error al flashear en una pagina web externa | Flasher web de terceros | "I get an Error: Break received whenever I try to flash." | No aplica a nuestro instalador (el flujo propio exige modo bootloader y respaldo verificado); no reproducible desde el codigo |
| 07.06.2026 | Multiboot existia solo para V1 | Informativo | resumen propio | No aplica (no es un fallo) |
| 15.09.2026 | EEPROM M24M02 y multiboot / 999 canales | Hardware | "This is for multiboot. And to get 999 channels, one M24M02 / 01 is enough." | No aplica (hardware, no un fallo) |
| 08.02.2026 | Fallo "release all keys" | Robzyl 6.3 | resumen propio | No aplica (firmware ajeno) |

Los puntos de arranque de las nuevas candidatas (Scout ARDF v1.3 y MILI) siguen sin prueba real en hardware: no hay reportes del chat
que las cubran y se mantienen Beta hasta esa prueba.
