# Bricohams · CSV de CHIRP para la Quansheng UV-K5 V3 (España)

Memorias listas para importar con CHIRP en una UV-K5 V3, con el firmware de serie o con F4HWN/egzumer. Se generan con `python scripts/build-chirp-spain.py`.

| Archivo | Canales | Contenido |
|---|---|---|
| `repetidores-espana-fm.csv` | 125 | Repetidores FM de 2 m y 70 cm, con desplazamiento y subtono de acceso si está publicado. Ordenados por provincia. |
| `aeropuertos-espana-am-rx.csv` | 147 | Aeropuertos españoles en AM: TWR, APP, ATIS y GND. Solo recepción (`Duplex = off`). |

Cada archivo cabe en las 200 memorias de la radio y empieza en la memoria 1. Entre los dos suman 272 memorias, así que no caben a la vez: carga uno entero y, del otro, solo las filas de tu zona, a partir de una memoria libre (ver abajo).

## Fuentes (datos del 31-10-2026)

- **Repetidores:** [HearHam](https://hearham.com/repeaters), a través de la plantilla `data/channel-templates/ES.json` del propio repositorio. Se suma ED5YBF del Radio Club Región de Murcia ([ea5rcz.es](https://ea5rcz.es/ed5ybf/)), sacado de los marcadores de bricohams-sdr. La columna Comment enlaza la ficha de origen de cada repetidor.
- **Aeropuertos:** [OurAirports](https://ourairports.com/data/), datos de dominio público (`airports.csv` y `airport-frequencies.csv`).

RepeaterBook no se ha usado: su API exige autorización y sus datos no se pueden redistribuir libremente.

## Qué se ha quedado fuera

- **Listado incompleto.** HearHam no es un registro nacional: faltan repetidores y la mayoría (100 de 125) no publica subtono. Antes de transmitir, comprueba el tono en el listado de la URE o con el radio club local.
- **Repetidores digitales y fuera de servicio.** HearHam lista en España unos 141 DMR, 2 YSF, 2 D-STAR/FM y 3 FM fuera de servicio. No se incluyen, porque la UV-K5 solo hace FM/AM (los D-STAR/FM mixtos los descarta la plantilla de origen).
- **10 m y 6 m.** La fuente no publica repetidores de España en esas bandas.
- **Simplex.** Cinco entradas de 70 cm son pasarelas o nodos en simplex (`Duplex` vacío).
- **Aeropuertos.** Se descartan 14 frecuencias de aeródromos sin código OACI o fuera de 118–137 MHz. También dos de torre de LEMD (118.07 y 118.67) que no son canales válidos de 25 ni de 8,33 kHz en OurAirports; consulta el AIP de ENAIRE. Las designaciones de 8,33 kHz se convierten a su frecuencia real. Una misma aproximación compartida (p. ej. CANARIAS APP) se guarda una sola vez.

**Transmitir en la banda aérea es ilegal.** Las memorias de aeropuertos son solo de escucha.

## Importar en CHIRP

1. En CHIRP: *Radio → Download From Radio* para leer la UV-K5 y guardar una copia de seguridad (`.img`).
2. *File → Open* sobre el CSV. Se abre en una pestaña aparte.
3. Selecciona las filas, copia (Ctrl+C) y pégalas (Ctrl+V) en la pestaña de la radio, en la primera memoria libre. También puedes usar *File → Import* sobre la imagen de la radio.
4. *Radio → Upload To Radio*.

Con F4HWN, elige en CHIRP el modelo dedicado con el driver que acompaña al firmware (ver `docs/AYUDA-QUANSHENG.md`). Haz siempre una descarga nueva de la radio antes de pegar memorias.
