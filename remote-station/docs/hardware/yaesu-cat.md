# Yaesu CAT: consultas y ajustes experimentales por modelo

El módulo
[`yaesu_cat.py`](../../bricoham_remote_station/drivers/yaesu_cat.py) proporciona
formateo y análisis CAT puros para seis modelos concretos. No abre puertos,
controla líneas serie, conmuta PTT ni transmite. Además de consultas, construye
setters documentados de frecuencia, modo y consigna de potencia; ejecutarlos
requiere flags locales explícitos en el agente. La inclusión
de un comando solo significa que el manual identifica su forma;
no constituye una certificación de compatibilidad física de
BricoHams.

## Superficie pública

- `read_commands(model: YaesuModel) -> tuple[YaesuReadCommand, ...]`
- `build_query(model: YaesuModel, command: YaesuReadCommand) -> bytes`
- `parse_frequency_reply(model: YaesuModel, command: YaesuReadCommand, frame: bytes) -> int`:
  devuelve Hz.
- `parse_mode_reply(model: YaesuModel, command: YaesuReadCommand, frame: bytes) -> tuple[YaesuBand, YaesuMode]`.
- `parse_identification_reply(model: YaesuModel, frame: bytes) -> str`: devuelve el ID CAT.

Los argumentos `model` y `command` deben ser miembros de sus enums. No se
aceptan comandos CAT arbitrarios. Las respuestas deben coincidir con la consulta
y con los anchos y códigos documentados para el modelo.

Los miembros de `YaesuReadCommand` son `FREQUENCY_A` (`FA`), `FREQUENCY_B`
(`FB`), `MAIN_MODE` (`MD0`), `SUB_MODE` (`MD1`) e `IDENTIFICATION` (`ID`).
`read_commands(model)` devuelve, en el orden del enum, solo los comandos
permitidos para ese modelo. `SUB_MODE` solo está habilitado para FT-710, FTDX10,
FTDX101D y FTDX101MP.

También se implementan `PC`, `TX`, `AC`, `KS`, `KP`, `KR` y `BI` para los seis
modelos. `KS` devuelve 4..60 WPM; `KP` traduce 00..75 a 300..1050 Hz en pasos
de 10; `KR` y `BI` devuelven booleanos. `TX` admite 0 RX, 1 CAT TX y 2 TX
originado en la radio. `AC` devuelve `tuner_busy`: FT-710 usa AC003 para
sintonía ATU y AC02n para ATAS (cualquier n distinto de 0 bloquea ajustes);
los otros cinco usan AC002 para sintonía. No se escriben estos comandos.

## Matriz de comandos implementados

| Modelo | Frecuencia | Modo principal | Modo secundario | ID esperado |
| --- | --- | --- | --- | --- |
| FT-710 | `FA;`, `FB;`, 9 dígitos en Hz | `MD0;` | `MD1;` | `0800` |
| FT-991A | `FA;`, `FB;`, 9 dígitos en Hz | `MD0;` | No implementado: el manual solo documenta el selector principal `0` | `0670` |
| FTDX10 | `FA;`, `FB;`, 9 dígitos en Hz | `MD0;` | `MD1;` | `0761` |
| FTDX101D | `FA;`, `FB;`, 9 dígitos en Hz | `MD0;` | `MD1;` | `0681` |
| FTDX101MP | `FA;`, `FB;`, 9 dígitos en Hz | `MD0;` | `MD1;` | `0682` |
| FTDX3000 | `FA;`, `FB;`, 8 dígitos en Hz | `MD0;` | No implementado: su parámetro MD está fijado a `0` | `0462` |

`FA` y `FB` identifican respectivamente VFO-A y VFO-B en los manuales de los
modelos listados. Los manuales FT-710 y FTDX10 usan VFO-A/VFO-B; el FTDX101D/MP
los denomina banda MAIN/SUB. No se infiere que VFO-B y la banda SUB sean
intercambiables. `MD0;` consulta el modo del selector `0`; `MD1;` solo se
habilita en los modelos cuyo manual documenta el selector secundario `1`.

El parser de frecuencia interpreta el campo decimal, de ancho fijo, como Hz y
lo devuelve como entero. La amplitud está vinculada al modelo: nueve dígitos
para cinco radios y ocho para el FTDX3000. El parser no asigna unidades a otros
valores ni asume que el radio esté físicamente conectado.

### Códigos de modo

Los códigos se validan por modelo, no por marca:

- FT-710, FTDX10 y FTDX101D/MP: `1` LSB, `2` USB, `3` CW-U, `4` FM, `5` AM,
  `6` RTTY-LSB, `7` CW-L, `8` DATA-LSB, `9` RTTY-USB, `A` DATA-FM, `B` FM-N,
  `C` DATA-USB, `D` AM-N, `E` PSK, `F` DATA-FM-N.
- FT-991A comparte los códigos `1`–`D`, pero `E` significa C4FM; no se acepta
  `F`.
- FTDX3000: `1` LSB, `2` USB, `3` CW, `4` FM, `5` AM, `6` FSK-LSB,
  `7` CW-R, `8` PKT-L, `9` FSK-USB, `A` PKT-FM, `B` FM-N, `C` PKT-U, `D` AM-N.
  Los códigos de otros modelos no se presuponen.

## Evidencia oficial

Manuales CAT de Yaesu consultados (tablas de comandos, anchos de campos y
valores específicos de `ID`):

- [FT-710 CAT Operation Reference Book, 2306-C](https://yaesu.com/Files/4CB893D7-1018-01AF-FA97E9E9AD48B50C/FT-710_CAT_OM_ENG_2306-C.pdf)
- [FT-991A CAT Operation Reference Manual, 1711-D](https://yaesu.com/Files/4CB893D7-1018-01AF-FA97E9E9AD48B50C/FT-991A_CAT_OM_ENG_1711-D.pdf)
- [FTDX10 CAT Operation Reference Book, 2308-F](https://yaesu.com/Files/4CB893D7-1018-01AF-FA97E9E9AD48B50C/FTDX10_CAT_OM_ENG_2308-F.pdf)
- [FTDX101MP/D CAT Operation Reference Manual, 2308-L](https://yaesu.com/Files/4CB893D7-1018-01AF-FA97E9E9AD48B50C/FTDX101MP_D_CAT_OM_ENG_2308-L.pdf)
- [FTDX3000 Series CAT Operation Reference Book, 2006-D](https://yaesu.com/Files/4CB893D7-1018-01AF-FA97E9E9AD48B50C/FTDX3000_CAT_OM_ENG_2006-D.PDF)

El manual 2308-L documenta conjuntamente FTDX101D y FTDX101MP, con IDs
separados. Las fuentes secundarias usadas para corroborar la existencia de
backends son [Hamlib `ft710.c`](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/yaesu/ft710.c),
[`ft991.c`](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/yaesu/ft991.c),
[`ftdx10.c`](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/yaesu/ftdx10.c),
[`ftdx101.c`](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/yaesu/ftdx101.c),
[`ftdx101mp.c`](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/yaesu/ftdx101mp.c)
y [`ft3000.c`](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/yaesu/ft3000.c),
fijados al commit
[`af198ace7697c84f5d8ce084271208e383012792`](https://github.com/Hamlib/Hamlib/commit/af198ace7697c84f5d8ce084271208e383012792).
Hamlib se considera evidencia secundaria, no prueba de compatibilidad de este
proyecto.

### Páginas y límites de los ajustes nuevos

Las páginas son índices PDF (1-based); los valores son del manual, no medidas RF.

| Modelo / revisión | AC / BI | FA-FB | KP-KR / KS | PC (W de consigna) | TX |
| --- | --- | --- | --- | --- | --- |
| FT-710 2306-C | 7 / 8 | 14, 30 kHz..75 MHz | 15 / 15 | 19, 5..100 | 22 |
| FT-991A 1711-D | 5 / 6 | 10, 30 kHz..470 MHz | 11 / 12 | 15, 5..100 | 18 |
| FTDX10 2308-F | 7 / 8 | 14, 30 kHz..75 MHz | 15 / 15 | 19, 5..100 | 23 |
| FTDX101D/MP 2308-L | 7 / 8 | 14, 30 kHz..75 MHz | 15 / 15 | 19, D: 5..100; MP: 5..200 | 23 |
| FTDX3000 2006-D | 5 / 6 | 10, 30 kHz..60 MHz, 8 dígitos | 11 / 12 | 14, 5..100 | 17 |

El agente requiere ID del modelo correcto antes de cualquier escritura, RX y
ausencia de sintonía/movimiento. Tras escribir exige ID como barrera frente al
eco tardío, lectura coincidente del ajuste y RX/AC confirmados. Comparte el lock
CAT, limita la transacción a tres segundos y deduplica 256 request IDs recientes
en memoria. Un error no se reintenta ni se revierte: el ajuste puede haberse
aplicado y debe leerse explícitamente.

La consola usa MAIN/SUB para FTDX101D/MP y VFO-A/B para los demás. Para FT-991A
y FTDX3000 el modo secundario es `null`, se muestra no disponible y se bloquea
su setter; nunca se copia el modo principal. No se selecciona VFO activo/TX.
Véanse [frecuencia/modo](../control-frecuencia-modo.md) y
[potencia/acoplador](../control-potencia-acoplador.md).

## Límites

No se implementan otras consultas/setters, notificaciones espontáneas,
transmisión, PTT, llave CW, reproducción/escritura de memorias, sintonía RF ni
conmutación de ATU/ATAS. No se
ha probado ningún transceptor físico; la velocidad, paridad, bits de parada,
handshake y rutas USB/red quedan fuera de este codec. No se debe inferir
compatibilidad del FTDX101D con el FTDX101MP, ni de otro modelo Yaesu, a partir
de la familia de radio: cada ID y tabla de modo se valida según su evidencia.
