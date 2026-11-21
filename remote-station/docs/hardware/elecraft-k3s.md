# Evidencia CAT: Elecraft K3S, K3, KX3 y KX2

## Implementado y pendiente

Codec propio de consultas de lectura, sin abrir puertos ni habilitar TX. La
Programmer's Reference oficial conjunta K3S/K3/KX3/KX2, rev. G5, se cotejó
para las consultas de esta tabla. Las pruebas son sintéticas, no físicas.
El codec no abre dispositivos. El agente ofrece transporte serie de lectura
`experimental` opt-in; la validación de hardware sigue siendo `unsupported`.

## Perfiles adicionales K3, KX3 y KX2

Se cotejó G5 para un subconjunto conservador: `FA/FB`, `MD/MD$` y
`BW/BW$`. Los perfiles no heredan `ID`, `OM`, `DT` ni setters del K3S.
G5 excluye FM en KX2; su decoder rechaza `MD4` y `MD$4`.
En KX3/KX2 con DUAL RX, `MD$` y `BW$` devuelven los valores del receptor
principal: no se declara un segundo receptor ni filtro independiente.
Los meta-modos K2 pueden traducir respuestas DATA/REV a LSB/USB; no se
modifican para normalizar la lectura.

Los modelos nuevos figuran como candidatos de fuente primaria Elecraft,
no como incorporaciones a la lista de terceros. Para su conexión serie se
requiere el cable/interfaz específico del modelo; no se infiere USB nativo
por compartir la sintaxis. Pruebas con bytes y transporte serie simulados;
sin aceptación física, audio, PTT ni CW.

| Consulta | Forma de respuesta | Interpretación |
|---|---|---|
| `FA;`, `FB;` | Prefijo y 11 dígitos decimales | Frecuencia en Hz, manual p. 11 |
| `MD;`, `MD$;` | Prefijo y un dígito | Modo de A/B; `1,2,3,4,5,6,7,9`, p. 16 |
| `BW;`, `BW$;` | Prefijo y cuatro dígitos | Ancho en unidades de 10 Hz, convertido a Hz, p. 8 |
| `DT;` | `DTn;`, `n=0..3` | DATA A, AFSK A, FSK D, PSK D; solo válido si el modo observado es DATA/DATA-REV, p. 11 |
| `ID;` | `ID017;` | Identificación legacy, compartida; no identifica por sí sola un K3S, p. 14 |
| `OM;` | Espacio y 12 posiciones de módulos | Posiciones `APXSDFfLVR--` o guiones; `R` acredita placa RF K3S, p. 21 |

`MD$` no significa seleccionar el VFO: consulta su modo sin modificarlo.
`DT` describe el último submodo del VFO A, no un submodo B independiente.
El manual advierte que los meta-modos K2 pueden convertir respuestas DATA
a LSB/USB. BricoHams no modifica meta-modos; cualquier resultado describe
la respuesta recibida, no un estado físico verificado.

## Conexión pendiente de validación

La ruta candidata del catálogo es USB. Antes de abrir un puerto se debe validar
la interfaz concreta, el firmware y configuración de comunicación, y comprobar
que RTS/DTR no estén asociados a PTT/keying. Ninguno de esos pasos está
automatizado ni probado aquí. Tampoco se implementan audio, P3/panadapter,
memorias ni CAT de escritura.

El codec tiene tipos propios y no reutiliza el perfil K4. Solo comparte con
otros codecs el framing ASCII y el parser numérico de ancho fijo, sin inferir
capacidades de hardware.

## Fuentes

- [Referencia oficial G5](https://ftp.elecraft.com/K3S/Manuals%20Downloads/K3S%26K3%26KX3%26KX2%20Pgmrs%20Ref,%20G5.pdf): páginas 8, 11, 14, 16 y 21, consultas revisadas el 20-11-2026.
- [Directorio oficial K3S](https://ftp.elecraft.com/K3S/Manuals%20Downloads/): manual de usuario y opciones para futura verificación de conexión.
- [Hamlib, descriptor K3S y helpers de modo](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/kenwood/k3.c): referencia secundaria, no integrada ni copiada.
