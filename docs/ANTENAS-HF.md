# Antenas de hilo HF/VHF: diseñador y analizador

Página **Antenas** de la aplicación. Complementa las [antenas para satélites](ANTENAS-SATELITE.md) y usa el mismo solucionador de método de momentos (`hardware/antenas/mom.py`), portado a JavaScript en `antenna-core.js`. Todo se calcula en el navegador y funciona sin conexión.

## Límites y seguridad

- Es **solo simulación**: conductores perfectos, hilo fino y sin pérdidas óhmicas.
- No hay suelo con pérdidas: la altura sobre el suelo se modela en espacio libre o con un plano de tierra perfecto (imagen) en z = 0.
- Comprueba siempre la antena con un analizador antes de transmitir.
- No transmitas nunca sin una antena o una carga adaptada.
- Los valores de trampas, balun y coaxial son datos que introduce el usuario; no hay base de datos de cables.

## Funciones

| Función | Qué hace | Origen de los números |
| --- | --- | --- |
| Geometría | Vista 2D/3D, tabla editable de hilos y cargas | Datos del usuario |
| Barrido y ajuste | SWR, R, X, carta de Smith y ajuste Nelder-Mead a SWR mínimo | Modelo de momentos |
| Radiación | Cortes en azimut y elevación, diagrama 3D, ganancia en dBi y corrientes | Modelo de momentos |
| Adaptación | Balun 1:1, 1:2, 1:4, 1:6, 1:9, red L y coaxial | Fórmulas de línea y circuito |

## Plantillas y trampas

Hay plantillas de dipolo de media onda, V invertida y dipolo multibanda con trampas (de 2 a 5 bandas y hasta 8 trampas LC en paralelo). Fija C para calcular L, o L para calcular C, con la resonancia `f = 1/(2π√(LC))`. Cada sección parte de c/(4f) sin factores de acortamiento inventados: usa el asesor y el ajuste automático.

## Formato CSV de medida

El archivo del analizador puede traer columnas de frecuencia y SWR, o frecuencia, R y X. Se detectan la cabecera, las unidades Hz, kHz o MHz, el separador (coma, punto y coma o tabulador) y la coma decimal. Ejemplo: `frecuencia;swr`.

## Bandas por radio

La lista de bandas se limita a las que la radio puede transmitir según los datos del repositorio: Icom IC-705 e IC-9700 (planes de bandas de `FREQUENCY_RANGES.md`), Yaesu FTX-1 (14 bandas de `third_party/ftx1/rigplane-rigplane-core/rigs/ftx1.toml`), TH-D75 (rangos de la banda A), OpenGD77 (límites por defecto, no son un plan de bandas ni una autorización), Quansheng y AnyTone. truSDX y QMX solo traen el rango de sintonía CAT (no son límites de TX). Si una radio no tiene datos de TX en el repositorio (p. ej. TK11) se muestra «pendiente de fuente».

## Medir SWR desde la radio

La app nunca pone la radio en transmisión: transmites tú, y solo se lee el medidor mientras la radio indique TX. Los puntos (frecuencia, SWR) se superponen a la curva del modelo como un CSV importado. En escritorio se usa la estación remota (`GET /api/remote/swr`) o, para el FTX-1, Web Serial directo (solo lectura de `TX;`, `FA;` y `RM6;`); en Android, la pantalla de antenas (WebView sin red, CSP estricta) lee la radio del perfil por CAT. Nunca transmitas sin una carga adaptada o una antena.

| Radio | Medidor de SWR por CAT | Fuente |
| --- | --- | --- |
| Icom IC-705 | ok | CI-V `15 12` (guía de referencia CI-V del IC-705 p. 5) y TX `1C 00` (p. 15); `rigs/ic705.toml` |
| Icom IC-7300 | parcial (escala hasta SWR 3,0) | CI-V `15 12` / `1C 00` (`rigs/ic7300.toml`) |
| Icom IC-7300MK2 | parcial (escala hasta SWR 3,0) | CI-V `15 12` / `1C 00` (`rigs/ic7300mk2.toml`) |
| Icom IC-7610 | parcial (escala hasta SWR 3,0) | CI-V `15 12` / `1C 00` (`rigs/ic7610.toml`) |
| Icom IC-9700 | parcial (escala hasta SWR 3,0) | CI-V `15 12` / `1C 00` (`rigs/ic9700.toml`) |
| Icom IC-905 | parcial (escala hasta SWR 3,0) | CI-V `15 12` / `1C 00` (`rigs/ic905.toml`) |
| Icom IC-7100 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Icom IC-7200 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Icom IC-7410 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Icom IC-7600 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Icom IC-7700 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Icom IC-7760 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Icom IC-7800 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Icom IC-7850 / IC-7851 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Icom IC-9100 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Icom IC-R8600 | pendiente de fuente | solo receptor, no transmite |
| Yaesu FTX-1 | parcial (escala aproximada) | `RM6;` en `docs/FTX1-KNOWLEDGE.md` |
| Yaesu FT-710 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Yaesu FT-991A | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Yaesu FTDX10 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Yaesu FTDX101D | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Yaesu FTDX101MP | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Yaesu FTDX3000 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Yaesu FT-817 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Yaesu FT-818 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Yaesu FT-857 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Yaesu FT-897 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Kenwood TS-590S | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Kenwood TS-590SG | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Kenwood TS-890S | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Kenwood TS-990S | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Kenwood TH-D75 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Elecraft K3S | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Elecraft K4 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| FlexRadio FLEX-6400 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| FlexRadio FLEX-6400M | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| FlexRadio FLEX-6600 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| FlexRadio FLEX-6600M | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| FlexRadio FLEX-6700 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| FlexRadio FLEX-8400 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| FlexRadio FLEX-8400M | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| FlexRadio FLEX-8600 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| FlexRadio FLEX-8600M | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| FlexRadio AURORA-510 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| FlexRadio AURORA-510M | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| FlexRadio AURORA-520 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| FlexRadio AURORA-520M | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| QRP Labs QMX / QMX+ | pendiente de fuente | `SW;` sin escala documentada |
| QRP Labs QCX | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| QRP Labs QDX | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| (tr)uSDX | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Hermes Lite 2 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Quansheng UV-K5 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| OpenGD77 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Radtel RT-950 Pro | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| Radtel RT-S10 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| AnyTone D878 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |
| TK11 | pendiente de fuente | sin comando de lectura de SWR en el repositorio |

Los Icom marcados como parcial solo tienen los puntos documentados SWR 1,0 a 3,0 (raw 0 a 120); un valor raw mayor se descarta. El nivel `SWR` de Hamlib que lee la estación remota solo se muestra en una radio cuando Hamlib lo devuelve; el repositorio no documenta qué backends lo hacen, por lo que las radios anteriores siguen en «pendiente de fuente».
