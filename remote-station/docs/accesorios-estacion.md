# Accesorios de estación: acopladores y amplificadores

Capa común `station-accessories.cjs` (Node, estación remota) y
`bricoham_station_agent/accessories.py` (estación Python). Ambas leen
`data/station-accessories-catalog.json`, que es la única lista de dispositivos.
**Solo hay controlador para los dispositivos con protocolo documentado en este
repositorio.** Todo lo demás figura como `pendiente de fuente`, aparece
deshabilitado en la consola y no envía ninguna trama.

## Seguridad (no se debilita)

- El amplificador arranca en **STANDBY** y solo pasa a OPERATE con una acción
  explícita del operador, con `accessories.amplifier.operateAllowed: true` en
  `remote-agent.json` (apagado por defecto), controlador disponible y banda conocida.
- Vuelve a STANDBY al desconectar la radio, ROE alta (`swrLimit`), fallo, pérdida
  de latido/lease, cambio de banda, parada de emergencia y cierre del agente.
  Si el STANDBY no se confirma, se bloquea un nuevo OPERATE hasta confirmarlo.
- OPERATE se rechaza en TX, durante la sintonía o tras un disparo de ROE.
- El cambio de banda (seguimiento por la frecuencia de la radio) se rechaza en TX
  y baja el amplificador a STANDBY.
- La sintonía solo se inicia por petición explícita, con potencia conocida
  de 10 W o menos (máximo del cabezal de campo FTX-1), límite de tiempo (20 s por
  defecto, 60 s máximo) y nunca con el amplificador en OPERATE.
- **No transmitas sin una carga o antena adaptada.** La consola lo recuerda.

## Configuración local

```json
{
  "accessories": {
    "amplifier": { "device": "<id del catálogo con controlador>", "operateAllowed": false },
    "tuner": { "device": "yaesu-ftx1-internal-atu" }
  }
}
```

La sintonía del FTX-1 (interna/ATAS) y de la radio por Hamlib sigue usando la ruta
existente del agente (`AC103/AC100`, `AC123/AC120`, `G TUNE`), con sus
límites y paradas. Si `accessories.tuner.device` está configurado, el botón TUNE pasa por
la capa de accesorios: exige TX apagado, amplificador en STANDBY y una potencia conocida
de 10 W o menos (`accessories.tuner.ratedPowerW` × nivel `RFPOWER` de la radio; sin ese dato
se rechaza), aplica el tope de tiempo y registra la ROE final.
Comando de la API: `POST /api/cmd {"cmd":"amp","value":"operate"|"standby"}`
(STANDBY nunca se rechaza ni se limita por tasa).

## Agente Python

`bricoham_station_agent` expone `GET/POST /api/v1/accessories` (también a través del
coordinador) cuando se pasa `--accessories-config`. Operaciones: `standby`, `operate`,
`emergency_stop`, `stop_tune` y `band` (`frequency_hz`). Un lease PTT activo cuenta como TX.
Sin controlador configurado solo hay supervisión: STANDBY, parada de emergencia y
STANDBY al cerrar el agente.

## Controladores de amplificador

`station-amplifier-drivers.cjs` (Node) y `bricoham_station_agent/amplifier_drivers.py` (Python)
implementan lectura de estado, STANDBY, OPERATE y análisis de fallos para Elecraft KPA1500, Expert/SPE,
ACOM y Gemini, solo con comandos de las fuentes citadas (licencias en
[THIRD-PARTY-REUSE.md](../../docs/THIRD-PARTY-REUSE.md)). **Todos están implementados según fuente pero no
probados en hardware**; la consola lo indica. Reglas comunes: los controladores nunca apagan el amplificador,
el STANDBY se relee y, si no se confirma, se lanza un error (la capa bloquea OPERATE); la conexión es
perezosa (no se abre ningún puerto al arrancar); el baud no tiene valor por defecto. La capa consulta el
amplificador una vez por segundo y vuelve a STANDBY ante fallo, ROE alta o si el equipo sale solo de OPERATE.
El seguimiento de banda solo existe para el KPA (`^FR`); Expert, ACOM y Gemini no tienen fuente de banda.

Configuración del enlace (local, sin credenciales):

```json
{ "accessories": { "amplifier": { "device": "acom-amplifiers", "operateAllowed": false, "host": "192.168.1.50", "port": 4001, "model": "700S" } } }
```

Node usa TCP (servidor serie-a-red o puerto de red del Gemini). Python usa `"host"` + `"tcp_port"` o
`"port"` (serie) + `"baud"`. `model` solo aplica a ACOM (`500S`, `600S`, `700S`, `1200S`, `2020S`).

## Matriz de soporte

| Dispositivo | Enlace | Estado | Sintonía / operación | Parada de seguridad | Fuente |
|---|---|---|---|---|---|
| FTX-1 ATU interno | CAT (radio) | ok | `AC103` inicia, `AC100` para; `AC101` inserta | `AC100` + `TX0`, tope 20 s, Hi-SWR | catálogo de radios `cat.tuner.internal`, `ftx1_cat.py` |
| ATAS-120 (FTX-1) | CAT (radio) | ok | `AC123` / `AC120` | `AC120` + `TX0`, tope 45 s | catálogo de radios `cat.tuner.atas` |
| mAT-30 (jack TUNER/LINEAR) | CAT del FTX-1 | partial | `AC103` / `AC101`; memorias dentro del acoplador | igual que ATU interno | `docs/FTX1-KNOWLEDGE.md` (hatandspecs-ftx1-tuner-sweep) |
| IC-7300 ATU interno | CI-V `1C 01` | partial | insertar/bypass/leer; inicio de sintonía `pendiente de fuente` | setters rechazados en TX | [control-potencia-acoplador.md](control-potencia-acoplador.md) |
| IC-705 | CI-V | pendiente de fuente | sin fuente en el repo | n/a | — |
| Radios con Hamlib `TUNER` | rigctld | partial | `G TUNE`, func `TUNER` | `T 0`, Hi-SWR | `rigctld-client.cjs` |
| Elecraft KAT500 / KAT100 | serie | pendiente de fuente | — | — | — |
| LDG AT-100/200/Z-100/Z-817/AT-1000 | serie/CAT | pendiente de fuente | — | — | — |
| MFJ-993/998 | — | pendiente de fuente | — | — | — |
| Palstar AT-Auto | serie | pendiente de fuente | — | — | — |
| Icom AH-4 / AH-705 | vía radio | pendiente de fuente | — | — | — |
| Elecraft KPA500 | serie | pendiente de fuente | — | STANDBY por la capa | el backend `kpa.c` de Hamlib solo registra el KPA1500 |
| Elecraft KPA1500 | TCP (serie-a-red) / serie en Python | partial, **implementado según fuente, sin probar en hardware** | `^OS0;`/`^OS1;`, lectura `^ON ^OP ^SW ^SF ^PWF`, banda `^FR` | `^OS0;` releído, nunca `^ON0` | `data/third-party/refs/Hamlib/amplifiers/elecraft/kpa.c`, `kpa1500.c` |
| Gemini DX1200 / HF-1K | TCP | partial, **implementado según fuente, sin probar en hardware** | `S` estado, `R` / `R1` / `R0` | `R0` releído; `TRIP` = fallo | `data/third-party/refs/Hamlib/amplifiers/gemini/gemini.c` |
| Expert 1.3K/1.5K/2K-FA | serie (Python) / TCP (Node) | partial, **implementado según fuente, sin probar en hardware** | trama `55 55 55 CNT DATA CHK`, estado `0x90`, `0x0D` conmuta OPERATE | `0x0D` solo tras leer el estado y una vez; STANDBY releído | Hamlib `expert.c`, macexpert-spe `SPEProtocol.swift`, SPE-1.3-2K-FA-Remote-server |
| ACOM 500S / 600S / 700S / 1200S / 2020S | serie (Python) / TCP (Node) | partial, **implementado según fuente, sin probar en hardware** | telemetría `55 92 04 15`; operate `55 81 08 02 00 06 00 1a` | standby `55 81 08 02 00 05 00 1b` releído; cualquier código de error = fallo | ACOM-Controller `MainWindow.xaml.cs`, `README.md` |
| ATU-100 EXT (YAF / 2E0UMK) | — | pendiente de fuente | — | — | sin protocolo de host (solo TX UART de depuración) |
| Palstar LA1K / BT-1500A / DX-1500 | serie | pendiente de fuente | — | — | — |
| FlexRadio PGXL | cliente TCP de estado | pendiente de fuente | — | STANDBY por la capa | `FLEX-SMARTSDR-API.md` no existe en el repo |
| Yaesu SPA-1 (vía FTX-1) | CAT `PC2nnn` | partial | solo consigna de potencia, sin standby/operate | n/a | [control-potencia-acoplador.md](control-potencia-acoplador.md) |

Para añadir un dispositivo hace falta una fuente citada (manual, `third_party/` o
código Hamlib) y tramas de prueba tomadas de ella; sin eso el estado sigue siendo
`pendiente de fuente`. Las pruebas usan controladores simulados: no prueban RF.
