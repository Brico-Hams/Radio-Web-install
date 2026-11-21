# PTT FTX-1 experimental con sesion exclusiva

**Puede generar RF real. Desactivado por defecto.** El
[microfono remoto experimental](audio-tx.md) es un opt-in separado;
no implementa llave CW ni acredita fonia fisica completa.
No se ha probado con una radio fisica. Utiliza protecciones locales,
supervision de operador autorizado y parada fisica independiente del USB.

## Evidencia y alcance deliberadamente limitado

[Manual oficial Yaesu CAT 2508-C](https://www.yaesu.com/Files/4CB893D7-1018-01AF-FA97E9E9AD48B50C/FTX-1_CAT_OM_ENG_2508-C.pdf):

- PDF 26: `TX1;` activa CAT TX; `TX0;` solicita RX, incluido RADIO TX.
  `TX;` distingue RX=0, CAT TX=1 y RADIO TX=2.
- PDF 17: `FT;` identifica MAIN/SUB transmisor. No se infiere desde FA/FB.
- PDF 18: `IF;` identifica frecuencia, modo, VFO/memoria, clarificador TX y
  desplazamiento de repetidor. Se rechazan layouts/codigos desconocidos.
- PDF 26: `ST;` indica split.

Esta primera ruta SOLO admite transmisor MAIN, VFO (no memoria), simplex,
split desactivado, clarificador TX desactivado y LSB/USB. Consulta AC y bloquea
sintonia ATU/movimiento ATAS; PC debe respetar el limite local de consigna.
No cambia automaticamente modo, frecuencia, potencia, transmisor o preferencias.
No habilita esta funcion en otros modelos por analogia.

## Configuracion local

Sin `--ptt-config` no existe un controlador PTT disponible: la API responde 503.
Con fichero y `enabled: false`, START sigue bloqueado. Ejemplo desactivado:

```json
{
  "enabled": false,
  "frequency_min_hz": 14200000,
  "frequency_max_hz": 14300000,
  "power_max_watts": 5,
  "max_transmit_seconds": 10
}
```

Requiere ademas `--enable-experimental-cat --serial-model FTX-1` y puerto/baud
explicitos. Los valores son ejemplos administrativos, NO autorizacion de banda,
licencia o instalacion. El operador debe elegir limites compatibles con su
licencia, ancho de emision, antena/carga y protecciones locales. No hay
comprobacion SWR ni regulacion de potencia RF medida. Maximo configurable
1..30 s; limite PC 5..100 W de consigna, sujeto tambien al rango field/SPA-1.
Las escrituras de frecuencia/modo/potencia mantienen sus opt-ins independientes.

## API y flujo compartido web/movil

`GET /api/v1/ptt`: metadatos autenticados admin/operador, sin abrir puerto;
nunca devuelve el secreto de sesion.

`POST /api/v1/ptt`, mismo rol y restricciones JSON/origen que los demas controles:

```json
{"operation":"stop"}
```

Primero el operador solicita RX y exige confirmacion CAT. Arrancar el agente
no abre el puerto ni afirma que una radio este en RX.

```json
{"operation":"start","request_id":"unique-ptt-start-request-0001"}
```

START verifica las guardas, reserva el puerto CAT durante toda la sesion y
confirma CAT TX. No permite otras lecturas/ajustes CAT mientras este reservado.
Solo el resultado START y las renovaciones del poseedor incluyen `lease_id`.

```json
{"operation":"renew","lease_id":"secreto-devuelto-por-start"}
```

El lease dura 2 s. RENEW exige el secreto y vuelve a comprobar estado CAT TX,
modo, frecuencia, seleccion de transmisor, split, clarificador, AC y PC.
Nunca prolonga el maximo absoluto. No revive una sesion caducada.

```json
{"operation":"stop","cancel_request_id":"unique-ptt-start-request-0001"}
```

Cualquier admin/operador puede solicitar STOP sin conocer el secreto.
La cancelacion bloquea un START tardio con ese identificador. Se conservan
256 IDs recientes en memoria, no de forma persistente.

El panel requiere habilitacion explicita en esta sesion y mantener pulsado
raton/tactil, Espacio o Intro; no hay toggle TX. Renueva cada 0,5 s.
Soltar, cancelar el gesto, perder foco, ocultar pagina o desmontar el cliente
solicita RX con el host/token originales. Un START de respuesta tardia provoca
otra parada, no una renovacion. El simulador conserva TX bloqueado.

## Fallos y limites reales

El watchdog del agente solicita RX al caducar lease o maximo, sin depender de
que el navegador siga vivo. Una confirmacion TX perdida NO se reintenta:
se solicita RX. STOP usa `ID;` como barrera contra eco TX tardio y despues
exige `TX0;` observado; nunca inventa ACK.

Un fallo de STOP conserva el bloqueo CAT y el watchdog reintenta RX; no permite
otra sesion hasta confirmarlo. El cierre ordenado intenta RX antes de cerrar
el puerto. Errores de parada se registran como criticos y la UI no muestra exito.

Los intercambios tienen presupuesto global de 0,7 s; watchdog cada 0,05 s.
Un intercambio en curso puede retrasar la solicitud de parada, y el transporte,
driver o planificador no son tiempo real. **2 s es caducidad de lease, no
garantia de corte fisico en 2 s.** USB desconectado, proceso muerto, sistema
suspendido, fallo del driver o PTT/VOX local pueden impedir RX. No hay
interlock atomico frente a mandos locales ni medida continua de RF.

Las pruebas usan puerto serie de banco y conexiones HTTP/HTTPS reales,
incluyendo caducidad por tiempo real, limite absoluto, lease ajeno, cambios
locales, eco tardio, cancelacion y parada no confirmada. No acreditan hardware,
radioenlace, tablet, iOS ni ausencia de RF accidental en una instalacion.
