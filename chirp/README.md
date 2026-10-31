# Bricohams · CSV de CHIRP para la Quansheng UV-K5 V3 (España)

Memorias listas para importar con CHIRP en una UV-K5 V3, con el firmware de serie o con F4HWN/egzumer. Se generan con `python scripts/build-chirp-spain.py`. Cada archivo cabe en las 200 memorias de la radio y empieza en la memoria 1.

| Archivo | Canales | Contenido |
|---|---|---|
| `repetidores-espana-fm.csv` | 125 | Repetidores FM de 2 m y 70 cm, con desplazamiento y subtono de acceso si está publicado. Ordenados por distrito EA. |
| `aeropuertos-am-rx-an-mc.csv` | 180 | Todas las frecuencias de aeropuertos, civiles y militares, de Andalucía a Murcia (comunidades AN, AR, AS, CB, CE, CL, CM, CN, CT, EX, GA, IB, MC). Solo RX. |
| `aeropuertos-am-rx-md-vc.csv` | 52 | Lo mismo para Madrid, Melilla, Navarra, País Vasco, La Rioja y C. Valenciana. Solo RX. |
| `pmr446-cb-rx.csv` | 96 | PMR446 (16 canales, NFM) y CB 27 MHz (40 canales CEPT en AM y en FM). Solo RX. |

## Listado ampliado local (`chirp/local/`, fuera de git)

`python scripts/build-chirp-spain.py --with-web` descarga además los listados públicos de repetidores de origen URE:

- [ea5pg.es](https://www.ea5pg.es/repetidores-vhf-uhf-espanol/), actualizado el 02-01-2024.
- [ea4t.es](https://ea4t.es/listado-de-repetidores-de-vhf), de VHF y de [UHF](https://ea4t.es/listado-de-repetidores-de-uhf).
- [Blog de EA7EER](https://ea7eerblog.wordpress.com/repetidores-vhf/), de 2017.

Los fusiona con HearHam y genera en `chirp/local/` dos archivos con unos 225 repetidores FM, uno para EA0–EA6 y otro para EA7–EA9.

- **Prioridad cuando hay discrepancias:** ea5pg, después ea4t, después HearHam y por último EA7EER. Si a uno le falta el subtono, se toma del siguiente que lo tenga.
- **Atribución:** la columna Comment indica de qué fuentes sale cada repetidor.

Esos listados no tienen licencia abierta, así que el resultado se queda en local y no se publica.

## Fuentes de los archivos publicados (datos del 31-10-2026)

- **Repetidores:**
  - [HearHam](https://hearham.com/repeaters), a través de la plantilla `data/channel-templates/ES.json` del repositorio.
  - ED5YBF del Radio Club Región de Murcia ([ea5rcz.es](https://ea5rcz.es/ed5ybf/)), sacado de los marcadores de bricohams-sdr.
- **Aeropuertos:** [OurAirports](https://ourairports.com/data/), de dominio público.
- **PMR446 y CB:** canales normalizados (ECC/DEC(15)05 y CEPT 40 canales).

No se han podido usar:

- **RepeaterBook:** su API exige autorización y sus datos no se pueden redistribuir libremente.
- **repeatermap.de:** su API es experimental y solo se abre a algunos proyectos.
- **Tablas de EA1KN en qsl.net:** desde España están bloqueadas por los cortes de IPs de LaLiga.

## Qué se ha quedado fuera

- **Listado incompleto.** Ni HearHam ni los listados URE son un registro nacional completo, y muchos repetidores no publican subtono. Antes de transmitir, comprueba el tono con el radio club local.
- **Repetidores digitales.** Los DMR, D-STAR, C4FM y YSF quedan fuera, porque la UV-K5 solo hace FM/AM. Son unos 40 en el listado ampliado.
- **10 m y 6 m.** Ninguna de las fuentes publica repetidores españoles en esas bandas.
- **Simplex.** Algunas entradas son pasarelas o nodos en simplex (`Duplex` vacío).
- **Aeropuertos.** Se incluyen 108–144 MHz (civil, ATIS en VOR y VHF militar) y 225–400 MHz (UHF militar). Se descartan siete valores de OurAirports que no son canales válidos y que deberías contrastar con el AIP de ENAIRE:
  - LEMD TWR 118.07 y 118.67.
  - LEMO 25.89, 28.442, 26.472 y 27.537, probablemente con la coma decimal mal puesta.
  - LERT 672.15.

  Las designaciones de 8,33 kHz se convierten a su frecuencia real, y una aproximación compartida (p. ej. CANARIAS APP) se guarda una sola vez.

## Por qué solo recepción en aviación, PMR y CB

- **Aviación civil y militar:** transmitir exige un equipo aeronáutico homologado. La AM de la UV-K5 no lo es, y un error de frecuencia o modulación interfiere en comunicaciones de seguridad.
- **PMR446:** solo se permite con equipos homologados de 0,5 W y antena fija. La UV-K5 no lo es.
- **CB:** la UV-K5 no puede transmitir en 27 MHz, y en esa banda recibe con poca sensibilidad.

## Importar en CHIRP

1. En CHIRP: *Radio → Download From Radio* para leer la UV-K5 y guardar una copia de seguridad (`.img`).
2. *File → Open* sobre el CSV. Se abre en una pestaña aparte.
3. Selecciona las filas, copia (Ctrl+C) y pégalas (Ctrl+V) en la pestaña de la radio, en la primera memoria libre. Si combinas archivos, elige las filas de tu zona para no pasar de 200.
4. *Radio → Upload To Radio*.

Con F4HWN, elige en CHIRP el modelo dedicado con el driver que acompaña al firmware (ver `docs/AYUDA-QUANSHENG.md`). Haz siempre una descarga nueva de la radio antes de pegar memorias.
