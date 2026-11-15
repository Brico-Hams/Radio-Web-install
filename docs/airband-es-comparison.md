# Comparacion de frecuencias de aerodromos: guia 101ATM vs OurAirports (Espana)

- Fuente primaria: 101ATM AIRBAND Spain AD COM Guide v1.0 (2026-11-07), pagina 1; origen citado: ENAIRE AIP España, AIRAC 10/26 & AMDT 412/26 (29-OCT-26). Third-party, educational use only; facts extracted, PDF not redistributed.
- Fuente secundaria: OurAirports (https://davidmegginson.github.io/ourairports-data/airport-frequencies.csv), obtenido el 2026-11-15T06:42:01.527Z.
- Las discrepancias no se resuelven automaticamente: revisar contra el AIP de ENAIRE.

## Resumen

| estado | filas |
| --- | --- |
| coincide | 106 |
| solo guia | 111 |
| solo OurAirports | 103 |
| fuera de banda (no se programa) | 22 |
| sin publicar en la guia | 1 |
| aerodromo solo en la guia: sin coordenadas en ES-airports.json, no se programa | 12 |

## Detalle

| ICAO | servicio guia | canal OACI | MHz guia | tipo OurAirports | MHz OurAirports | estado |
| --- | --- | --- | --- | --- | --- | --- |
| ES-0001 |  |  |  | TWR | 118.55000 | solo OurAirports |
| ES-0001 |  |  |  | RDO | 123.32500 | solo OurAirports |
| ES-0001 |  |  |  | APP | 128.50000 | solo OurAirports |
| ES-0002 |  |  |  | CTAF | 130.12500 | solo OurAirports |
| ES-0010 |  |  |  | CTAF | 129.85000 | solo OurAirports |
| ES-0012 |  |  |  | RADIO | 130.12500 | solo OurAirports |
| ES-0020 |  |  |  | AutoInfo | 130.12500 | solo OurAirports |
| ES-0024 |  |  |  | info | 130.12500 | solo OurAirports |
| ES-0054 |  |  |  | CTAF | 130.12500 | solo OurAirports |
| ES-0069 |  |  |  | TWR | 123.50000 | solo OurAirports |
| ES-0098 |  |  |  | Banda Aèria | 130.12500 | solo OurAirports |
| ES-0111 |  |  |  | VHF | 131.12500 | solo OurAirports |
| ES-0123 |  |  |  | auto informa | 130.12500 | solo OurAirports |
| ES-0132 |  |  |  | CTAF | 130.12500 | solo OurAirports |
| ES-0148 |  |  |  | VHF | 131.12500 | solo OurAirports |
| ES-0158 |  |  |  | CTAF | 130.12500 | solo OurAirports |
| ES-0162 |  |  |  | Info | 129.97500 | solo OurAirports |
| ES-0167 |  |  |  | CTAF | 130.10000 | solo OurAirports |
| ES-0175 |  |  |  | RADIO | 135.12500 | solo OurAirports |
| ES-0178 |  |  |  | VHF | 130.12500 | solo OurAirports |
| ES-0219 |  |  |  | VFR | 129.97500 | solo OurAirports |
| ES-0219 |  |  |  | VFR | 129.97500 | solo OurAirports |
| ES-0263 |  |  |  | A/A | 123.50000 | solo OurAirports |
| GCFV | TWR | 118.475 | 118.47500 |  |  | solo guia |
| GCFV | SEC | 119.200 | 119.20000 |  |  | solo guia |
| GCFV | GMC | 121.700 | 121.70000 | GND | 121.70000 | coincide |
| GCFV | ATIS | 118.650 | 118.65000 | ATIS | 118.65000 | coincide |
| GCFV |  |  |  | TWR | 118.50000 | solo OurAirports |
| GCFV |  |  |  | APP | 129.30000 | solo OurAirports |
| GCGM | AFIS | 118.375 | 118.37500 |  |  | solo guia |
| GCGM |  |  |  | TWR | 118.40000 | solo OurAirports |
| GCGM |  |  |  | GND | 121.70000 | solo OurAirports |
| GCHI | AFIS | 118.075 | 118.07500 |  |  | solo guia |
| GCHI |  |  |  | TWR | 118.10000 | solo OurAirports |
| GCHI |  |  |  | GND | 121.60000 | solo OurAirports |
| GCHI |  |  |  | A/D | 126.10000 | solo OurAirports |
| GCLA | TWR | 118.900 | 118.90000 | TWR | 118.90000 | coincide |
| GCLA | GMC | 121.800 | 121.80000 | GND | 121.80000 | coincide |
| GCLA | ATIS | 118.250 | 118.25000 |  |  | solo guia |
| GCLA |  |  |  | ATIS | 118.60000 | solo OurAirports |
| GCLA |  |  |  | APP | 126.10000 | solo OurAirports |
| GCLP | TWR | 118.300 | 118.30000 | TWR | 118.30000 | coincide |
| GCLP | GMC | 121.700 | 121.70000 | GND | 121.70000 | coincide |
| GCLP | CLR | 125.000 | 125.00000 |  |  | solo guia |
| GCLP | BKP | 121.175 | 121.17500 |  |  | solo guia |
| GCLP | ATIS | 118.600 | 118.60000 | ATIS | 118.60000 | coincide |
| GCLP |  |  |  | APP | 120.90000 | solo OurAirports |
| GCRR | TWR | 120.700 | 120.70000 | TWR | 120.70000 | coincide |
| GCRR | GMC | 121.800 | 121.80000 | GND | 121.80000 | coincide |
| GCRR | BKP | 124.000 | 124.00000 |  |  | solo guia |
| GCRR | ATIS | 118.625 | 118.62500 | ATIS | 118.62500 | coincide |
| GCRR |  |  |  | APP | 129.30000 | solo OurAirports |
| GCTS | TWR | 119.000 | 119.00000 |  |  | solo guia |
| GCTS | GMC | 121.900 | 121.90000 | GND | 121.90000 | coincide |
| GCTS | CLR | 121.750 | 121.75000 | DLV | 121.75000 | coincide |
| GCTS | ATIS | 118.675 | 118.67500 | ATIS | 118.67500 | coincide |
| GCTS | APP | 127.700 | 127.70000 |  |  | solo guia |
| GCTS | APP | 128.125 | 128.12500 |  |  | solo guia |
| GCTS | BKP | 120.300 | 120.30000 | APP | 120.30000 | coincide |
| GCXO | TWR | 118.700 | 118.70000 | TWR | 118.70000 | coincide |
| GCXO | GMC | 121.700 | 121.70000 | GND | 121.70000 | coincide |
| GCXO | CLR | 121.850 | 121.85000 |  |  | solo guia |
| GCXO | ATIS | 118.575 | 118.57500 | ATIS | 118.57500 | coincide |
| GCXO | APP | 124.800 | 124.80000 | APP | 124.80000 | coincide |
| GCXO | APP | 128.850 | 128.85000 | APP | 128.85000 | coincide |
| GCXO | SEC | 120.000 | 120.00000 |  |  | solo guia |
| GCXO | MIL | 120.775 | 120.77500 |  |  | solo guia |
| GECE | HLP | 123.325 | 123.32500 |  |  | solo guia |
| GECE | AWS | 122.500 | 122.50000 | AWOS | 122.50000 | coincide |
| GEML | TWR | 119.525 | 119.52500 |  |  | solo guia |
| GEML | GMC | 121.775 | 121.77500 |  |  | solo guia |
| GEML | MIL | 139.300 | 139.30000 |  |  | fuera de banda (no se programa) |
| GEML |  |  |  | TWR | 118.50000 | solo OurAirports |
| GEML |  |  |  | GND | 121.70000 | solo OurAirports |
| LEAB | TWR | 122.105 | 122.10000 | TWR | 122.10000 | coincide |
| LEAB | GMC | 121.805 | 121.80000 | GND | 121.80000 | coincide |
| LEAB | MIL | 139.305 | 139.30500 |  |  | fuera de banda (no se programa) |
| LEAB | APP | 118.730 | 118.72500 | APP | 118.72500 | coincide |
| LEAG | HLP | 123.325 | 123.32500 |  |  | solo guia |
| LEAG | AWS | 123.425 | 123.42500 |  |  | solo guia |
| LEAL | TWR | 118.155 | 118.15000 | TWR | 118.15000 | coincide |
| LEAL | GMC | 130.655 | 130.65000 |  |  | solo guia |
| LEAL | CLR | 119.855 | 119.85000 |  |  | solo guia |
| LEAL | ATIS | 120.080 | 120.07500 |  |  | solo guia |
| LEAL |  |  |  | APP | 118.80000 | solo OurAirports |
| LEAL |  |  |  | GND | 121.70000 | solo OurAirports |
| LEAM | TWR | 118.350 | 118.35000 | APP | 118.35000 | coincide |
| LEAM | GMC | 121.705 | 121.70000 | GND | 121.70000 | coincide |
| LEAM | ATIS | 119.055 | 119.05000 |  |  | solo guia |
| LEAM |  |  |  | TWR | 118.35000 | solo OurAirports |
| LEAO | TWR | 126.100 | 126.10000 |  |  | solo guia |
| LEAO | MIL | 129.375 | 129.37500 |  |  | solo guia |
| LEAO | MIL | 139.300 | 139.30000 |  |  | fuera de banda (no se programa) |
| LEAS | TWR | 118.150 | 118.15000 | APP | 118.15000 | coincide |
| LEAS | GMC | 121.705 | 121.70000 | GND | 121.70000 | coincide |
| LEAS | ATIS | xxx.xxx |  |  |  | sin publicar en la guia |
| LEAS |  |  |  | TWR | 118.15000 | solo OurAirports |
| LEAX |  |  |  | CTAF | 123.50000 | solo OurAirports |
| LEBA | AFIS | 118.305 | 118.30000 | CTAF | 118.30000 | coincide |
| LEBB | TWR | 118.500 | 118.50000 | TWR | 118.50000 | coincide |
| LEBB | GMC | 121.705 | 121.70000 | GND | 121.70000 | coincide |
| LEBB | APP | 127.450 | 127.45000 |  |  | solo guia |
| LEBB | ATIS | 118.830 | 118.82500 | ATIS | 118.82500 | coincide |
| LEBB |  |  |  | APP | 120.70000 | solo OurAirports |
| LEBE |  |  |  | INFO | 123.50000 | solo OurAirports |
| LEBG | AFIS | 125.430 | 125.42500 | AFIS | 125.42500 | coincide |
| LEBG |  |  |  | UNIC | 122.40000 | solo OurAirports |
| LEBL | TWR ARR | 118.105 | 118.10000 | TWR | 118.10000 | coincide |
| LEBL | TWR DEP | 118.330 | 118.32500 |  |  | solo guia |
| LEBL | CLR | 121.805 | 121.80000 | CLD | 121.80000 | coincide |
| LEBL | GMC C | 121.655 | 121.65000 | GND | 121.65000 | coincide |
| LEBL | GMC N | 121.705 | 121.70000 |  |  | solo guia |
| LEBL | GMC S | 122.230 | 122.22500 |  |  | solo guia |
| LEBL | ATIS ARR | 118.655 | 118.65000 | ATIS | 118.65000 | coincide |
| LEBL | ATIS DEP | 121.980 | 121.97500 |  |  | solo guia |
| LEBL | BKP | 122.830 | 122.82500 |  |  | solo guia |
| LEBL |  |  |  | APP | 119.10000 | solo OurAirports |
| LEBT | HLP | 126.750 | 126.75000 |  |  | solo guia |
| LEBT | HLP | 129.375 | 129.37500 |  |  | solo guia |
| LEBZ | TWR | 122.105 | 122.10000 | TWR | 122.10000 | coincide |
| LEBZ | GMC | 130.155 | 130.15000 |  |  | solo guia |
| LEBZ | MIL | 139.300 | 139.30000 |  |  | fuera de banda (no se programa) |
| LEBZ | APP | 120.505 | 120.50000 |  |  | solo guia |
| LECD |  |  |  | TWR | 123.50000 | solo OurAirports |
| LECH | TWR | 120.680 | 120.67500 | TWR | 120.67500 | coincide |
| LECH | BKP | 121.830 | 121.82500 |  |  | solo guia |
| LECH |  |  |  | APP | 120.10000 | solo OurAirports |
| LECI |  |  |  | INFO | 123.50000 | solo OurAirports |
| LECN |  |  |  | CTAF | 123.50000 | solo OurAirports |
| LECO | TWR | 118.305 | 118.30000 | TWR | 118.30000 | coincide |
| LECO | GMC | 121.705 | 121.70000 | GND | 121.70000 | coincide |
| LECO | ATIS | 129.005 | 129.00000 |  |  | solo guia |
| LECO |  |  |  | APP | 120.20000 | solo OurAirports |
| LECU | TWR | 118.705 | 118.70000 | TWR | 118.70000 | coincide |
| LECU | GMC | 121.805 | 121.80000 | GND | 121.80000 | coincide |
| LECU | MIL | 137.525 | 137.52500 |  |  | fuera de banda (no se programa) |
| LECU | ATIS | 118.230 | 118.22500 |  |  | solo guia |
| LECV | TWR | 123.225 | 123.22500 |  |  | solo guia |
| LECV | MIL | 339.200 | 339.20000 |  |  | fuera de banda (no se programa) |
| LEDA | TWR | 121.330 | 121.32500 | Tower | 121.32500 | coincide |
| LEDA | GMC | 121.630 | 121.62500 |  |  | solo guia |
| LEDA |  |  |  | Approach | 127.70000 | solo OurAirports |
| LEDA |  |  |  | BAA Company | 131.67500 | solo OurAirports |
| LEEC | TWR | 126.750 | 126.75000 |  |  | solo guia |
| LEEC | TWR | 129.375 | 129.37500 |  |  | solo guia |
| LEFM |  |  |  | A/G | 123.40000 | solo OurAirports |
| LEGA | TWR | 118.700 | 118.70000 | TWR | 118.70000 | coincide |
| LEGA | GMC | 121.825 | 121.82500 | GND | 121.82500 | coincide |
| LEGA | MIL | 122.100 | 122.10000 | MIL | 122.10000 | coincide |
| LEGE | TWR | 118.505 | 118.50000 | TWR | 118.50000 | coincide |
| LEGE | GMC | 121.705 | 121.70000 | GND | 121.70000 | coincide |
| LEGE | APP | 129.905 | 129.90000 |  |  | solo guia |
| LEGE | ATIS | 128.755 | 128.75000 |  |  | solo guia |
| LEGE |  |  |  | APP | 120.90000 | solo OurAirports |
| LEGR | TWR | 118.855 | 118.85000 | TWR | 118.85000 | coincide |
| LEGR | GMC | 121.930 | 121.92500 | GND | 121.92500 | coincide |
| LEGR | ATIS | 120.630 | 120.62500 | ATIS | 120.62500 | coincide |
| LEGT | TWR | 129.930 | 129.92500 |  |  | solo guia |
| LEGT | GMC | 121.605 | 121.60000 | GND | 121.60000 | coincide |
| LEGT | MIL | 139.305 | 139.30500 |  |  | fuera de banda (no se programa) |
| LEGT |  |  |  | APP | 127.10000 | solo OurAirports |
| LEGT |  |  |  | DEP | 127.10000 | solo OurAirports |
| LEHC | AFIS | 128.955 | 128.95000 | LEHC_AFIS | 128.95000 | coincide |
| LEHC |  |  |  | LEZG_APP | 119.30000 | solo OurAirports |
| LEIB | TWR | 118.505 | 118.50000 | TWR | 118.50000 | coincide |
| LEIB | GMC | 121.930 | 121.92500 |  |  | solo guia |
| LEIB | CLR | 121.380 | 121.37500 |  |  | solo guia |
| LEIB | ATIS | 119.805 | 119.80000 | APP | 119.80000 | coincide |
| LEIB |  |  |  | APP | 118.12500 | solo OurAirports |
| LEIB |  |  |  | GND | 121.80000 | solo OurAirports |
| LEIG |  |  |  | Air/Air | 123.17500 | solo OurAirports |
| LEJR | TWR | 118.555 | 118.55000 | TWR | 118.55000 | coincide |
| LEJR | GMC | 133.280 | 133.27500 |  |  | solo guia |
| LEJR | ATIS | 125.655 | 125.65000 |  |  | solo guia |
| LEJR |  |  |  | GND | 121.60000 | solo OurAirports |
| LEJR |  |  |  | APP | 128.50000 | solo OurAirports |
| LELC | TWR | 124.425 | 124.42500 |  |  | solo guia |
| LELC | GMC | 121.600 | 121.60000 | GND | 121.60000 | coincide |
| LELC | MIL | 139.300 | 139.30000 |  |  | fuera de banda (no se programa) |
| LELC | APP | 130.300 | 130.30000 | APP | 130.30000 | coincide |
| LELC | BKP | 125.025 | 125.02500 |  |  | solo guia |
| LELC | ATIS | 128.605 | 128.60000 |  |  | solo guia |
| LELC |  |  |  | TWR | 130.30000 | solo OurAirports |
| LELL | TWR | 120.805 | 120.80000 |  |  | solo guia |
| LELL | GMC | 121.605 | 121.60000 |  |  | solo guia |
| LELL | A/G | 123.500 | 123.50000 | ACBS | 123.50000 | coincide |
| LELN | TWR | 122.105 | 122.10000 |  |  | solo guia |
| LELN | APP | 121.280 | 121.27500 |  |  | solo guia |
| LELN | MIL | 139.305 | 139.30500 |  |  | fuera de banda (no se programa) |
| LELO |  |  |  | twr | 118.57500 | solo OurAirports |
| LELO |  |  |  | twr | 123.22500 | solo OurAirports |
| LELT |  |  |  | CTAF | 123.37500 | solo OurAirports |
| LEMD | TWR A18R/D36L | 118.080 | 118.07500 |  |  | solo guia |
| LEMD | TWR A32L/D14R | 118.155 | 118.15000 | TWR | 118.15000 | coincide |
| LEMD | TWR A18L/D36R | 118.680 | 118.67500 |  |  | solo guia |
| LEMD | TWR A32R/D14L | 118.980 | 118.97500 | TWR | 118.97500 | coincide |
| LEMD | GMC E-SUR | 121.630 | 121.62500 |  |  | solo guia |
| LEMD | GMC E-NOR | 121.755 | 121.75000 |  |  | solo guia |
| LEMD | GMC C-SUR | 121.980 | 121.97500 |  |  | solo guia |
| LEMD | GMC C-NOR | 123.155 | 123.15000 |  |  | solo guia |
| LEMD | SDP S-SUR | 121.705 | 121.70000 |  |  | solo guia |
| LEMD | SDP S-NOR | 121.855 | 121.85000 | GND | 121.85000 | coincide |
| LEMD | SDP W-SUR | 123.005 | 123.00000 |  |  | solo guia |
| LEMD | SDP W-NOR | 123.255 | 123.25000 |  |  | solo guia |
| LEMD | CLR EAST | 130.080 | 130.07500 | CLD | 130.07500 | coincide |
| LEMD | CLR WEST | 130.355 | 130.35000 | CLD | 130.35000 | coincide |
| LEMD | ATIS ARR | 118.255 | 118.25000 | ATIS | 118.25000 | coincide |
| LEMD | ATIS DEP | 130.855 | 130.85000 | ATIS DEP | 130.85000 | coincide |
| LEMD |  |  |  | EMR | 122.97500 | solo OurAirports |
| LEMD |  |  |  | APP | 127.50000 | solo OurAirports |
| LEMG | TWR RWY 13/31 | 118.155 | 118.15000 | TWR | 118.15000 | coincide |
| LEMG | TWR RWY 12/30 | 118.780 | 118.77500 | TWR | 118.77500 | coincide |
| LEMG | CLR | 121.880 | 121.87500 |  |  | solo guia |
| LEMG | ATIS ARR | 120.380 | 120.37500 | ATIS | 120.37500 | coincide |
| LEMG | GMC-W | 121.705 | 121.70000 |  |  | solo guia |
| LEMG | GMC-E | 121.955 | 121.95000 | GND | 121.95000 | coincide |
| LEMG | BKP | 124.780 | 124.77500 |  |  | solo guia |
| LEMG | ATIS DEP | 124.480 | 124.47500 |  |  | solo guia |
| LEMG |  |  |  | APP | 123.85000 | solo OurAirports |
| LEMH | TWR | 118.205 | 118.20000 | TWR | 118.20000 | coincide |
| LEMH | GMC | 121.755 | 121.75000 | GND | 121.75000 | coincide |
| LEMH | APP | 119.655 | 119.65000 | APP | 119.65000 | coincide |
| LEMH | A-A | 119.655 | 119.65000 | APP | 119.65000 | coincide |
| LEMH | ATIS | 129.155 | 129.15000 |  |  | solo guia |
| LEMI | TWR | 121.330 | 121.32500 |  |  | solo guia |
| LEMI | GMC | 121.755 | 121.75000 |  |  | solo guia |
| LEMO | TWR | 122.100 | 122.10000 | TWR | 122.10000 | coincide |
| LEMO | GMC | 337.900 | 337.90000 |  |  | fuera de banda (no se programa) |
| LEMO | MIL | 139.300 | 139.30000 |  |  | fuera de banda (no se programa) |
| LEMO | USA | 396.850 | 396.85000 |  |  | fuera de banda (no se programa) |
| LEMR |  |  |  | TWR | 118.15000 | solo OurAirports |
| LEMR |  |  |  | RDO | 123.50000 | solo OurAirports |
| LEMT |  |  |  | VHF | 123.50000 | solo OurAirports |
| LEMU |  |  |  | RADIO | 123.50000 | solo OurAirports |
| LENA |  |  |  | TWR | 122.47500 | solo OurAirports |
| LEOC |  |  |  | UNIC | 122.60000 | solo OurAirports |
| LEOS |  |  |  | Info | 123.50000 | solo OurAirports |
| LEPA | TWR ARR | 118.305 | 118.30000 |  |  | solo guia |
| LEPA | TWR DEP | 118.455 | 118.45000 |  |  | solo guia |
| LEPA | BKP | 121.605 | 121.60000 |  |  | solo guia |
| LEPA | OPS | 130.250 | 130.25000 | OPS | 130.25000 | coincide |
| LEPA | ATIS ARR | 119.255 | 119.25000 | ATIS | 119.25000 | coincide |
| LEPA | GMC-SUR | 121.705 | 121.70000 |  |  | solo guia |
| LEPA | GMC-NORT | 121.905 | 121.90000 |  |  | solo guia |
| LEPA | CLR | 123.880 | 123.87500 |  |  | solo guia |
| LEPA | INFO MIL | 165.275 | 165.27500 |  |  | fuera de banda (no se programa) |
| LEPA | ATIS DEP | 121.780 | 121.77500 |  |  | solo guia |
| LEPA |  |  |  | APP | 118.95000 | solo OurAirports |
| LEPI |  |  |  | RADIO | 123.50000 | solo OurAirports |
| LEPP | TWR | 118.200 | 118.20000 | APP | 118.20000 | coincide |
| LEPP | GMC | 121.705 | 121.70000 | GND | 121.70000 | coincide |
| LEPP |  |  |  | TWR | 118.20000 | solo OurAirports |
| LERE |  |  |  | LEVC_N_TACC | 120.10000 | solo OurAirports |
| LERE |  |  |  | RADIO | 123.32500 | solo OurAirports |
| LERI | TWR | 139.075 | 139.07500 |  |  | fuera de banda (no se programa) |
| LERI | SEC | 118.100 | 118.10000 | TWR | 118.10000 | coincide |
| LERJ | TWR | 118.580 | 118.57500 |  |  | solo guia |
| LERJ | GMC | 121.705 | 121.70000 |  |  | solo guia |
| LERJ | HLP | 123.255 | 123.25000 |  |  | solo guia |
| LERL | AFIS | 118.055 | 118.05000 |  |  | solo guia |
| LERM |  |  |  | RF | 123.32500 | solo OurAirports |
| LERP |  |  |  | VHF | 123.45000 | solo OurAirports |
| LERS | TWR | 128.880 | 128.87500 |  |  | solo guia |
| LERS | GMC | 121.705 | 121.70000 | GND | 121.70000 | coincide |
| LERS | ATIS | 120.255 | 120.25000 |  |  | solo guia |
| LERS |  |  |  | APP | 118.15000 | solo OurAirports |
| LERS |  |  |  | TWR | 118.15000 | solo OurAirports |
| LERT | TWR | 119.750 | 119.75000 | TWR | 119.75000 | coincide |
| LERT | TWR | 122.100 | 122.10000 | TWR | 122.10000 | coincide |
| LERT | HLP | 122.225 | 122.22500 | TWR | 122.22500 | coincide |
| LERT | GND | 130.700 | 130.70000 | GND | 130.70000 | coincide |
| LERT | ATIS | 282.025 | 282.02500 |  |  | fuera de banda (no se programa) |
| LERT |  |  |  | APP | 120.80000 | solo OurAirports |
| LERT |  |  |  | GCA | 123.30000 | solo OurAirports |
| LERT |  |  |  | MISC | 126.20000 | solo OurAirports |
| LERT |  |  |  | APP | 128.50000 | solo OurAirports |
| LERT |  |  |  | GCA | 134.10000 | solo OurAirports |
| LESA | TWR | 118.105 | 118.10000 |  |  | solo guia |
| LESA | GMC | 121.855 | 121.85000 | GND | 121.85000 | coincide |
| LESA | MIL | 139.300 | 139.30000 |  |  | fuera de banda (no se programa) |
| LESA | APP | 124.405 | 124.40000 | APP | 124.40000 | coincide |
| LESA | APP | 140.100 | 140.10000 |  |  | fuera de banda (no se programa) |
| LESB | A/G | 122.705 | 122.70000 |  |  | solo guia |
| LESB |  |  |  | APP | 119.40000 | solo OurAirports |
| LESB |  |  |  | CTAF | 123.50000 | solo OurAirports |
| LESB |  |  |  | ATIS | 128.27500 | solo OurAirports |
| LESB |  |  |  | OPS | 130.25000 | solo OurAirports |
| LESL |  |  |  | RDO | 123.50000 | solo OurAirports |
| LESO | TWR | 119.855 | 119.85000 |  |  | solo guia |
| LESO | GMC | 121.705 | 121.70000 |  |  | solo guia |
| LESO | ATIS | 120.830 | 120.82500 |  |  | solo guia |
| LEST | TWR | 118.755 | 118.75000 | TWR | 118.75000 | coincide |
| LEST | GMC | 121.705 | 121.70000 | GND | 121.70000 | coincide |
| LEST | APP | 120.200 | 120.20000 |  |  | solo guia |
| LEST | APP | 118.200 | 118.20000 | APP | 118.20000 | coincide |
| LEST | ATIS | 127.755 | 127.75000 |  |  | solo guia |
| LESU | AFIS | 122.205 | 122.20000 |  |  | solo guia |
| LESU | BKP | 131.605 | 131.60000 |  |  | solo guia |
| LESU |  |  |  | EMERG | 121.50000 | solo OurAirports |
| LETA | HLP | 122.800 | 122.80000 |  |  | solo guia |
| LETI |  |  |  | TWR | 129.97500 | solo OurAirports |
| LETL | A/A | 122.680 | 122.67500 | VHF | 122.67500 | coincide |
| LETL | AWS | 131.055 | 131.05000 |  |  | solo guia |
| LETO | TWR | 122.100 | 122.10000 | TWR | 122.10000 | coincide |
| LETO | GMC | 118.300 | 118.30000 | GND | 118.30000 | coincide |
| LETO | MIL | 139.300 | 139.30000 |  |  | fuera de banda (no se programa) |
| LETO | APP | 119.950 | 119.95000 |  |  | solo guia |
| LETO |  |  |  | APP | 118.40000 | solo OurAirports |
| LETO |  |  |  | GCA | 118.90000 | solo OurAirports |
| LEVC | TWR | 118.555 | 118.55000 | TWR | 118.55000 | coincide |
| LEVC | GMC | 121.880 | 121.87500 |  |  | solo guia |
| LEVC | CLR | 123.580 | 123.57500 |  |  | solo guia |
| LEVC | APP | 120.100 | 120.10000 | APP | 120.10000 | coincide |
| LEVC | APP | 124.750 | 124.75000 |  |  | solo guia |
| LEVC | ATIS | 121.080 | 121.07500 | ATIS | 121.07500 | coincide |
| LEVC |  |  |  | GND | 121.70000 | solo OurAirports |
| LEVD | TWR | 122.205 | 122.20000 | TWR | 122.20000 | coincide |
| LEVD | MIL | 139.700 | 139.70000 |  |  | fuera de banda (no se programa) |
| LEVD | MIL | 139.300 | 139.30000 |  |  | fuera de banda (no se programa) |
| LEVT | TWR | 118.450 | 118.45000 | TWR | 118.45000 | coincide |
| LEVT | GMC | 121.805 | 121.80000 | GND | 121.80000 | coincide |
| LEVT | ATIS | 119.355 | 119.35000 |  |  | solo guia |
| LEVX | TWR | 118.455 | 118.45000 | TWR | 118.45000 | coincide |
| LEVX | GMC | 121.705 | 121.70000 | GND | 121.70000 | coincide |
| LEVX | BKP | 118.955 | 118.95000 |  |  | solo guia |
| LEVX | ATIS | 120.830 | 120.82500 |  |  | solo guia |
| LEVX |  |  |  | APP | 120.20000 | solo OurAirports |
| LEXJ | TWR | 118.105 | 118.10000 |  |  | solo guia |
| LEXJ | GMC | 121.705 | 121.70000 |  |  | solo guia |
| LEXJ | APP | 118.375 | 118.37500 |  |  | solo guia |
| LEXJ | ATIS | 127.530 | 127.52500 |  |  | solo guia |
| LEZG | TWR | 122.105 | 122.10000 |  |  | solo guia |
| LEZG | GMC | 118.105 | 118.10000 | GND | 118.10000 | coincide |
| LEZG | MIL | 139.300 | 139.30000 |  |  | fuera de banda (no se programa) |
| LEZG | APP | 119.305 | 119.30000 | APP | 119.30000 | coincide |
| LEZG | APP | 127.055 | 127.05000 |  |  | solo guia |
| LEZG | APP | 125.055 | 125.05000 |  |  | solo guia |
| LEZG |  |  |  | TWR | 118.10000 | solo OurAirports |
| LEZL | TWR | 118.105 | 118.10000 |  |  | solo guia |
| LEZL | GMC | 121.705 | 121.70000 | GND | 121.70000 | coincide |
| LEZL | MIL | 278.075 | 278.07500 |  |  | fuera de banda (no se programa) |
| LEZL | ATIS | 118.180 | 118.17500 | ATIS | 118.17500 | coincide |
| LEZL |  |  |  | APP | 125.80000 | solo OurAirports |

## Aerodromos solo en la guia

- LEAG: aerodromo solo en la guia: sin coordenadas en ES-airports.json, no se programa
- LEAO: aerodromo solo en la guia: sin coordenadas en ES-airports.json, no se programa
- LEBT: aerodromo solo en la guia: sin coordenadas en ES-airports.json, no se programa
- LECV: aerodromo solo en la guia: sin coordenadas en ES-airports.json, no se programa
- LEEC: aerodromo solo en la guia: sin coordenadas en ES-airports.json, no se programa
- LELN: aerodromo solo en la guia: sin coordenadas en ES-airports.json, no se programa
- LEMI: aerodromo solo en la guia: sin coordenadas en ES-airports.json, no se programa
- LERJ: aerodromo solo en la guia: sin coordenadas en ES-airports.json, no se programa
- LERL: aerodromo solo en la guia: sin coordenadas en ES-airports.json, no se programa
- LESO: aerodromo solo en la guia: sin coordenadas en ES-airports.json, no se programa
- LETA: aerodromo solo en la guia: sin coordenadas en ES-airports.json, no se programa
- LEXJ: aerodromo solo en la guia: sin coordenadas en ES-airports.json, no se programa
