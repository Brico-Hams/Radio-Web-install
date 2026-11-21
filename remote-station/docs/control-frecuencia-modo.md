# Frecuencia y modo MAIN/SUB FTX-1

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
Otros modelos rechazan ambos flags activados. No cambia la allowlist de lectura
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

## Garantias y limites

Todas las operaciones comparten lock, presupuesto global de tres segundos y
cache acotada de 256 identificadores con potencia. Se consulta RX y AC; TX,
sintonia ATU o movimiento/sintonia ATAS bloquean la operacion. Tras escribir,
una consulta TX de distinto prefijo sirve como barrera frente a eco tardio;
se leen ambos receptores, se compara el objetivo y se vuelven a comprobar TX/AC.

No hay ACK inventado, reintento ni rollback automatico. Un error puede significar
que el equipo si cambio: leer antes de decidir una nueva orden. El estado se lee
secuencialmente, no es un snapshot atomico; RX observado no es un interlock
fisico. Otro operador, VOX o controlador puede actuar entre comandos.
No habilita PTT, CW, audio TX, sintonizacion RF ni espectro nativo.
