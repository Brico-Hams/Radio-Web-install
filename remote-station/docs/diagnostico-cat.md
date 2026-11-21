# Diagnóstico CAT y protocolos de red offline

El diagnóstico convierte consultas allowlist y decodifica una sola respuesta
aportada explícitamente. No abre serie, no envía paquetes, no cambia RTS/DTR ni
prueba una conexión. Es una herramienta ejecutable de validación de protocolos,
no una consola de control físico terminada.

## CLI

Desde el repositorio:

```powershell
py -3.12 -m bricoham_remote_station.cat_diagnostics list
py -3.12 -m bricoham_remote_station.cat_diagnostics query --model K3S --command FA
py -3.12 -m bricoham_remote_station.cat_diagnostics query `
  --model K3S --command FA --reply-hex 464130303031343037343030303b
```

Después de reinstalar el paquete con `py -3.12 -m pip install .`, también
está disponible `bricoham-cat` con los mismos argumentos. El resultado es JSON;
las consultas se devuelven en `request_hex`. `--command` es un identificador
de allowlist, no texto CAT libre, y no incluye el terminador.

La secuencia de SmartSDR en este diagnóstico es siempre 1. No gestiona sesiones
ni colas TCP. Las respuestas de error SmartSDR se muestran como fallos, no
como consultas correctas. El descubrimiento Hermes-Lite tampoco envía nada.

## Cobertura de protocolos

De los 46 candidatos, 31 tienen perfil de consultas por modelo y 14 solo
primitivas de familia SmartSDR/Hermes-Lite. IC-7100 e IC-7200 incorporan las
consultas CI-V documentadas; IC-7800 queda `unimplemented`: no se sustituye por
otro Icom. Este diagnóstico offline no abre transporte ni acredita validación física.

Los perfiles [Icom CI-V](hardware/icom-civ.md) usan los identificadores
`03` (frecuencia) y `04` (modo), con dirección predeterminada documentada por
modelo. El modo se devuelve como código numérico CI-V, no como una medición
completa del filtro ni una normalización común a otros fabricantes:

```powershell
py -3.12 -m bricoham_remote_station.cat_diagnostics query `
  --model IC-7300 --command 03 --reply-hex FEFEE094030040071400FD
```

Los perfiles [Yaesu](hardware/yaesu-cat.md) tienen anchos de frecuencia
distintos y no ofrecen `MD1` para FT-991A ni FTDX3000. No se reutiliza el perfil
FTX-1 para estos equipos.

## API local

`GET /api/v1/protocols`, con bearer de cualquier rol configurado, expone:

- `api_version` y `schema_version`;
- `transport_enabled: false` y `hardware_validation_complete: false`;
- los 46 candidatos con su protocolo, consultas y disponibilidad de decoder;
- `hardware_status: unsupported`, separado de la implementación del codec;
- `binding_status`: `model_profile`, `family_syntax_only` o `unimplemented`.

`family_syntax_only` indica una sintaxis común investigada, no que cada radio
de esa familia ni su firmware estén validados. Un candidato sin perfil muestra
lista vacía y no se sustituye por otro. Consultar este endpoint no detecta una
radio ni modifica su configuración.

## Interpretación y límites

- Los parsers rechazan prefijos, longitudes, terminadores y campos inválidos.
- Si una consulta tiene encoder pero aún no decoder, puede generarse el query;
  pedir que se interprete su respuesta devuelve error explícito.
- FTX-1 devuelve `frequency_hz` según el manual oficial 2508-C. El antiguo campo
  experimental `frequency_field_unscaled` se sustituye; se conserva el parser
  crudo de biblioteca. MD requiere MAIN/SUB (`MD0`/`MD1`); PC/AC/TX son consultas,
  no setters ni sondeo mutante del SPA-1.
- Kenwood expone códigos de modo crudos, no un modo normalizado inferido.
- K3S `ID017` es legacy compartido; `OM` distingue la presencia de placa RF R.
- Para K3S `DT`, la biblioteca requiere modo DATA observado; la CLI no acepta
  inventar ese contexto, así que no expone un decoder independiente de DT.
- Ninguna prueba offline acredita transporte, audio, espectro, PTT o TX.

Las evidencias y revisiones por modelo están en
[la investigación CAT](investigacion-cat-github.md) y sus fichas enlazadas.
