# Frecuencia y modo Yaesu por selector explícito

Implementacion experimental segun el manual CAT oficial Yaesu 2508-C,
[evidencia y limites](hardware/ftx1-spa1.md). Pruebas de software con puerto
serie de banco; sin validacion de hardware, firmware ni RF.

## Activacion local

En el JSON indicado por `--radio-settings-config`, junto con modelo FTX-1,
puerto y baud explicitos:

```json
{
  "power_adjustment_enabled": false,
  "power_level_max": 30,
  "tuner_switching_enabled": false,
  "frequency_adjustment_enabled": true,
  "mode_adjustment_enabled": true
}
```

Los dos ultimos flags son independientes y desactivados por defecto; un fichero
anterior de tres campos sigue siendo valido y no habilita estas escrituras.
Los otros seis Yaesu del catálogo admiten flags independientes con los límites
y selectores de su manual, descritos al final. IC-7300 y otros modelos rechazan
estos flags activados. No cambia la allowlist de lectura
de `GET /api/v1/cat`.

## API y consola compartida

Agente y host exponen `POST /api/v1/radio-settings`, solo admin/operador:

```json
{"operation":"read_operating"}
```

Devuelve `receivers.MAIN` y `receivers.SUB`, cada uno con `frequency_hz` y
`mode_code`, ademas de politica local, `mode_options`, `tx_active`, `tuner_busy`
y `observed_at`. No incluye `power_level`; `read` conserva la lectura separada
de potencia/acoplador. Los modos son los documentados, no disponibilidad
validada fisicamente para cada banda o configuracion.

```json
{"operation":"set_frequency","request_id":"unique-frequency-request-0001","receiver":"MAIN","frequency_hz":14260000}
```

```json
{"operation":"set_mode","request_id":"unique-mode-request-0001","receiver":"SUB","mode_code":"2"}
```

`FA` es MAIN y `FB` SUB (PDF 17); NO seleccionan el VFO activo ni transmisor.
Frecuencia: Hz enteros 30000..470000000, nueve digitos CAT. `MD0`/`MD1`
seleccionan el receptor cuyo modo se ajusta (PDF 20). No se aceptan codigos
reservados ni cadenas CAT arbitrarias.

El panel web/Android/tablet/iPhone/iPad comparte la misma implementacion:
seleccion explicita MAIN/SUB, lectura previa y bloqueo tras error hasta volver
a leer. Cambiar el selector no envia una orden a la radio.
Controles, unidades, estados no disponibles y avisos de seguridad siguen el
idioma ES/EN/FR/PT elegido en la consola. Cambiar idioma conserva lectura,
selector, valores editados y bloqueos; no reconecta ni emite consultas/setters.
Los identificadores CAT, MAIN/SUB, VFO-A/B y nombres técnicos de modo no se traducen.

## Garantias y limites

Todas las operaciones comparten lock, presupuesto global de tres segundos y
cache acotada de 256 identificadores con potencia. Antes de escribir se exige
ID0840 y se consulta RX y AC; TX, sintonia ATU o movimiento/sintonia ATAS
bloquean la operacion. Tras escribir, ID0840 y TX de distinto prefijo sirven
como barrera frente a eco tardio e identidad incorrecta;
se leen ambos receptores, se compara el objetivo y se vuelven a comprobar TX/AC.

No hay ACK inventado, reintento ni rollback automatico. Un error puede significar
que el equipo si cambio: leer antes de decidir una nueva orden. El estado se lee
secuencialmente, no es un snapshot atomico; RX observado no es un interlock
fisico. Otro operador, VOX o controlador puede actuar entre comandos.
No habilita PTT, CW, audio TX, sintonizacion RF ni espectro nativo.

## FT-710, FT-991A, FTDX10, FTDX101D/MP y FTDX3000

Usan el mismo endpoint y flags locales; no se extrapola el rango del FTX-1.
`receiver_options`, `frequency_min_hz` y `frequency_max_hz` describen los
selectores y límites del [manual por modelo](hardware/yaesu-cat.md).
`MAIN`/`SUB` son claves estables de API: la consola muestra VFO-A/B salvo en
FTDX101D/MP. FT-991A y FTDX3000 no tienen MD1 documentado: SUB devuelve
`mode_code: null`, muestra no disponible y rechaza `set_mode`, pero permite FB.

Hz enteros: 30000..75000000 para FT-710, FTDX10 y FTDX101D/MP;
30000..470000000 para FT-991A; 30000..60000000 con ocho dígitos para FTDX3000.
Estos límites CAT no autorizan transmitir en esas frecuencias/bandas.
La lectura operativa incluye además `power_level` como consigna, sin `power_head`.
ID correcto, RX y AC se verifican antes de cualquier escritura. ID sirve de
barrera frente a eco tardío antes de releer el objetivo; TX/AC se confirman
después. Los límites de seguridad y no-reintento anteriores siguen aplicándose.
