# Icom CI-V: codec de solo lectura

`bricoham_remote_station.drivers.icom_civ` codifica consultas binarias CI-V
predefinidas de frecuencia y modo y valida sus respuestas. No abre un puerto,
no selecciona ni cambia VFO, no transmite comandos de escritura, no controla
PTT/TX y no implementa el transporte USB, serie ni de red.

## API

- `build_query(model: IcomCivModel, command: IcomReadCommand) -> bytes`
  construye una consulta para `FREQUENCY` (`0x03`) o `MODE` (`0x04`).
- `parse_frequency_reply(model: IcomCivModel, frame: bytes) -> int` devuelve Hz.
- `parse_mode_reply(model: IcomCivModel, frame: bytes) -> IcomCivMode` devuelve
  un modo Icom conocido.

El codec usa el formato común documentado por Icom:
`FE FE radio E0 comando FD` al consultar y
`FE FE E0 radio comando datos FD` al responder. La frecuencia son cinco bytes
BCD de menor a mayor significancia; el modo incluye el código y, cuando se
devuelve, un número de filtro `1..3`. Las respuestas deben coincidir exactamente
en cabecera, terminador, comando, dirección y longitud. No se aceptan texto CAT,
tramas concatenadas, respuestas de otra radio ni modos/filtros desconocidos.

La selección de VFO y el encuadre del CI-V sobre USB/serie/red quedan fuera de
esta interfaz. En particular, el CI-V Reference Guide del IC-7300MK2 documenta
su conexión USB y los mismos comandos de consulta; eso no describe ni implementa
el encapsulado LAN. Los bytes sintéticos de las pruebas no validan hardware.

## Modelos y evidencia

La dirección por defecto proviene del registro de modelos de Hamlib fijado al
commit [`af198ace7697c84f5d8ce084271208e383012792`](https://github.com/Hamlib/Hamlib/tree/af198ace7697c84f5d8ce084271208e383012792/rigs/icom).
El callback compartido de frecuencia/modo es evidencia secundaria; la fuente
primaria de comandos es el manual Icom de cada modelo enlazado. En el snapshot
de Hamlib, [`icom.c`](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/icom/icom.c)
contiene el manejo CI-V compartido y
[`ICOM.md`](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/icom/ICOM.md)
describe la separación entre CI-V y sus transportes.

| Modelo | Dirección CI-V | Manual Icom público | Descriptor Hamlib fijado |
|---|---:|---|---|
| IC-705 | `A4` | [CI-V Reference Guide](https://www.icomjapan.com/support/manual/3064/) | [`ic705.c`](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/icom/ic705.c) |
| IC-7100 | `88` | [Full Manual](https://www.icomjapan.com/support/manual/2288/) | [`ic7100.c`](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/icom/ic7100.c) |
| IC-7200 | `76` | [Instruction Manual](https://www.icomjapan.com/support/manual/1419/); [Advanced Instructions](https://www.icomjapan.com/support/manual/1507/) | [`ic7200.c`](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/icom/ic7200.c) |
| IC-7300 | `94` | [Full Manual](https://www.icomjapan.com/support/manual/2271/) | [`ic7300.c`](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/icom/ic7300.c) |
| IC-7300MK2 | `B6` | [CI-V Reference Guide](https://www.icomjapan.com/support/manual/4486/) | [`ic7300.c`](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/icom/ic7300.c) |
| IC-7410 | `80` | [Instruction Manual](https://www.icomjapan.com/support/manual/2201/) | [`ic7410.c`](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/icom/ic7410.c) |
| IC-7600 | `7A` | [Instruction Manual](https://www.icomjapan.com/support/manual/2615/) | [`ic7600.c`](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/icom/ic7600.c) |
| IC-7610 | `98` | [CI-V Reference Guide](https://www.icomjapan.com/support/manual/1745/) | [`ic7610.c`](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/icom/ic7610.c) |
| IC-7700 | `74` | [Instruction Manual](https://www.icomjapan.com/support/manual/1409/) | [`ic7700.c`](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/icom/ic7700.c) |
| IC-7760 | `B2` | [CI-V Reference Guide](https://www.icomjapan.com/support/manual/4227/) | [`ic7760.c`](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/icom/ic7760.c) |
| IC-7850 | `8E` | [IC-7850/IC-7851 Instruction Manual](https://www.icomjapan.com/support/manual/1563/) | [`ic785x.c`](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/icom/ic785x.c) |
| IC-7851 | `8E` | [IC-7850/IC-7851 Instruction Manual](https://www.icomjapan.com/support/manual/1563/) | [`ic785x.c`](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/icom/ic785x.c) |
| IC-905 | `AC` | [CI-V Reference Guide](https://www.icomjapan.com/support/manual/3792/) | [`ic905.c`](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/icom/ic905.c) |
| IC-9100 | `7C` | [Instruction Manual](https://www.icomjapan.com/support/manual/1463/) | [`ic9100.c`](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/icom/ic9100.c) |
| IC-9700 | `A2` | [CI-V Reference Guide](https://www.icomjapan.com/support/manual/2161/) | [`ic9700.c`](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/icom/ic9700.c) |
| IC-R8600 | `96` | [CI-V Reference Guide](https://www.icomjapan.com/support/manual/1633/) | [`icr8600.c`](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/icom/icr8600.c) |

Los manuales oficiales del IC-7100 (sección 20, págs. 20-2–20-3 y 20-11;
dirección por defecto en la pág. 17-25) y del IC-7200 (Advanced Instructions,
sección 11, págs. 11-2–11-3 y 11-6; dirección por defecto en Instruction Manual,
pág. 32) describen las consultas `03`/`04`, los cinco bytes BCD de frecuencia
(diez dígitos) y los códigos de modo. Esos datos respaldan perfiles de consulta;
no validan unidades físicas ni transportes.

El IC-7800 sigue fuera del allowlist: la [búsqueda oficial de manuales Icom](https://www.icomjapan.com/support/manual/?open=2&keyword=IC-7800)
actualmente devuelve únicamente un archivo de actualización y notas de firmware,
no un manual del operador ni una referencia CI-V. Por ello no se pudo verificar
con fuente primaria el contenido de `03`/`04`, los cinco bytes BCD y la dirección
CI-V por defecto de ese modelo, y no se añadió un perfil basado en extrapolación
o fuentes secundarias. La [página oficial de descargas de Icom Europe](https://www.icomeurope.com/support/pdf-downloads/downloads-amateurfunkgeraete/)
ofrece folletos del IC-7800, pero no manual CI-V/avanzado ni tabla de comandos;
los intentos de localizar esos documentos en las rutas heredadas de Icom America
y la página de Icom UK tampoco proporcionaron un manual verificable.
El catálogo Hamlib fijado describe el IC-7300MK2 mediante un backend de red;
el codec implementa únicamente los bytes CI-V documentados por Icom, no ese
backend ni su encapsulado de red.

La presencia en la tabla significa únicamente que existen datos para generar y
validar tramas; no significa que BricoHams haya probado un radio o transporte.
Toda compatibilidad de hardware permanece pendiente de ensayo físico.
