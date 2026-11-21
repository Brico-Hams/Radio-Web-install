# Evidencia CAT: Elecraft K4

## Estado

BricoHams incluye un codec puro para consultar frecuencia de VFO A/B (`FA;`,
`FB;`) y modo de VFO A/B (`MD;`, `MD$;`). El codec no abre puertos, no transmite
comandos de escritura y no declara compatibilidad CAT. Solo se verificó con
tramas sintéticas; no hay una unidad K4 probada.

## Consultas CAT documentadas

La Programmer's Reference del K4, rev. D12 (4 de mayo de 2026), define el
protocolo como comandos ASCII terminados en punto y coma. Las consultas GET
usan el prefijo del comando y devuelven una respuesta con el mismo formato.
`$` al final del prefijo selecciona VFO B/subreceptor cuando el comando lo
admite.

| Consulta | Respuesta documentada | Implementación BricoHams |
|---|---|---|
| `FA;` | `FAnnnnnnnnnnn;`, frecuencia de 11 dígitos en Hz | Allowlist y parser de entero en Hz |
| `FB;` | Igual que `FA`, para VFO B | Allowlist y parser de entero en Hz |
| `MD;` | `MDn;`, modo principal | Allowlist y parser de código documentado |
| `MD$;` | `MD$n;`, modo del subreceptor/VFO B | Allowlist y parser de código documentado |

Modos K4 documentados: `1` LSB, `2` USB, `3` CW, `4` FM, `5` AM, `6` DATA,
`7` CW reverse y `9` DATA reverse. `0` y `8` son N/A y se rechazan. El submodo
DATA (`DT`) queda fuera del codec, por lo que `DATA` no implica identificar
FT8/AFSK/FSK/PSK.

## Transporte, espectro y limites

- La referencia documenta clientes por dos puertos COM virtuales USB-B, puerto
  RS-232 y Ethernet. Este codec no elige transporte ni configura velocidad.
- El K4 documenta streaming de audio digital, datos dB/bin para reproducir un
  panadapter y un flujo IQ marcado como pendiente. Los datos se sirven por
  puertos Ethernet dedicados, pero la referencia indica que los detalles del
  protocolo y aplicaciones de ejemplo se entregan bajo solicitud. BricoHams no
  implementa estos flujos y mantiene scope/waterfall como `unsupported`.
- La referencia dice que K4 ejecuta un superset de los comandos K3/K3S. Esto no
  valida por sí solo el K3S ni otros modelos en BricoHams. El
  [codec K3S](elecraft-k3s.md) se implementa separadamente tras cotejar su
  propia referencia; no hereda capacidades K4.
- No se implementan CAT de escritura, memoria, audio, PTT ni TX. Tampoco se
  activa RTS/DTR.

## Fuentes

- [Elecraft K4 Programmer's Reference, rev. D12 (oficial)](https://ftp.elecraft.com/K4/Manuals%20Downloads/K4ProgrammersReferencerev.D12.html)
- [Elecraft K3S/K3/KX3/KX2 Programmer's Reference, rev. G5 (oficial)](https://ftp.elecraft.com/K3S/Manuals%20Downloads/K3S%26K3%26KX3%26KX2%20Pgmrs%20Ref,%20G5.pdf) - consultas K3S cotejadas en su ficha propia
- [Hamlib K3/K3S/K4 descriptor](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/kenwood/k3.c)
- [Hamlib helpers Elecraft](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/kenwood/elecraft.c)
- [Hamlib helpers CAT comunes](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/kenwood/kenwood.c)
