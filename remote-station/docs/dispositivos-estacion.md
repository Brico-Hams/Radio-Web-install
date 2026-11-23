# Dispositivos de estación (relés, rotores serie, ruta de señal)

Experimental y sin validación en hardware real. Todos los datos de protocolo
proceden de [STATION-DEVICES-SOURCES.md](STATION-DEVICES-SOURCES.md); lo que no
figura allí es «pendiente de fuente» y se muestra deshabilitado.

Código: `station-devices.cjs` (agente Node, rutas `GET /api/devices` y
`POST /api/devices/cmd`) y `bricoham_station_agent/station_devices.py` (agente
Python; el rotor serie se integra en `rotor.py`). El contrato de cada dispositivo
es `id`, `type`, `status()`, `commands` y `safe_state()`.

## Seguridad

- Nada de este módulo emite RF por sí mismo.
- La conmutación está **desactivada por defecto** (`enabled: false`).
- Las tomas con rol `radio` o `amp` se rechazan mientras se transmite (o si el
  estado de TX es desconocido) y apagar/ciclar exige confirmación explícita.
- Tras cada cambio se lee el estado físico (`verified`). Encender un DLI puede
  retrasarse por las secuencias del equipo: `verified: false` no es un error.
- Un corte de comunicación nunca corta alimentación: el estado seguro de los
  relés es «no hacer nada». Los rotores reciben STOP al perder el operador, al
  cerrar el agente y a los 30 s de movimiento.
- STOP del rotor se permite siempre (sin bloqueo de operador ni `enabled`).
- No transmitas sin carga o antena adaptada; la consola lo advierte.
- Las credenciales Digest del DLI solo viven en el agente (`remote-agent.json`,
  modo 0600) y nunca se envían a los clientes.

## Configuración (agente Node, `devices` en `remote-agent.json`)

```json
[
  {"id":"pdu","kind":"dli","host":"192.168.0.50","username":"…","password":"…","enabled":false,
   "outlets":[{"name":"radio","index":0,"role":"radio"},{"name":"amp","index":1,"role":"amp"}]},
  {"id":"relays","kind":"modbus","host":"192.168.0.60","enabled":false,
   "outlets":[{"name":"rotor","index":0,"role":"rotor"}]},
  {"id":"tgxl","kind":"listed","model":"tuner-genius-xl"}
]
```

Los rotores serie requieren una función `serialFactory` inyectada (el agente Node
no incluye dependencia serie). En Python: `--rotor-serial` (ver
[control de rotores](control-rotores.md)).

## Ruta de señal

Radio → amplificador → acoplador → conmutador → antena, construida con los
dispositivos configurados; las etapas sin dispositivo se listan como ausentes.
Antenna Genius, Tuner Genius XL, Power Genius XL, iBoot, Alpha 87A y OM2000A+
aparecen como «pendiente de fuente», sin control.

## Matriz de soporte

| Dispositivo | Enlace | Estado | Fuente |
|---|---|---|---|
| Digital Loggers Web Power Switch (REST) | HTTP + digest | ok | [REST](https://www.digital-loggers.com/rest.html); la respuesta de lectura se asume JSON booleano (sin verificar; otra forma se rechaza) |
| Waveshare Modbus POE ETH Relay | Modbus TCP 502, unidad 1 | ok (ciclo: pendiente de fuente) | [wiki](https://www.waveshare.com/wiki/Modbus_POE_ETH_Relay) + especificación Modbus V1.1b3 |
| Hy-Gain DCU-1 / DCU-1X | serie 4800 8N1 | parcial (sin lectura de rumbo; STOP sin confirmar) | Hamlib rotorez, manual RT-21 Apéndice F |
| Idiom Press Rotor-EZ / RotorCard | serie 4800 8N1 | ok | Hamlib rotorez |
| Green Heron RT-21 | serie 4800 / 9600 8N1 | ok | manual RT-21 Apéndice F, Hamlib rotorez.c |
| Yaesu GS-232A | serie 150-9600 8N1 (baudios explícitos) | parcial (sin validación en hardware) | Hamlib gs232a.c |
| Yaesu GS-232B | serie 1200-9600 8N1 (baudios explícitos) | parcial (sin validación en hardware) | Hamlib gs232b.c |
| SPID Rot2Prog | serie 600 8N1 | parcial (sin validación en hardware) | Hamlib spid.c, spid.txt |
| Hy-Gain DCU2 / DCU3 / YRC-1 | serie 9600 | pendiente de fuente | solo catálogo (Hamlib 406) |
| 4O3A Antenna Genius, Tuner Genius XL, Power Genius XL | red | pendiente de fuente | sin protocolo público |
| Dataprobe iBoot-PDU, Alpha 87A, OM Power OM2000A+ | red / serie | pendiente de fuente | no localizado |
