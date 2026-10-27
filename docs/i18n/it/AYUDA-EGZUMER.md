# Egzumer: fonti, configurazione e differenze con V3

Revisione: 25-10-2026. Fonte esaminata:
`egzumer/uv-k5-firmware-custom`, commit
`7607f0a4bd6203d1f06b70556fc1ce0d7399d6b3`.

## Cosa offre questo repository

Pubblica codice C, header, Makefile e documentazione di una reimplementazione
del firmware Quansheng UV-K5/K6/5R della famiglia originale. Il README spiega
la provenienza da DualTachyon, le modifiche OneOfEleven e il parser fagci.
Questa base non è il port PY32 per UV-K5 V3/UV-K1.

Il suo file LICENSE contiene **Apache License 2.0**, non MIT. Quando derivi
codice, conserva gli avvisi, le attribuzioni e quelli dei componenti. La licenza
di Egzumer non dimostra che un'altra immagine chiamata Karina usi la stessa
licenza né che siano disponibili i sorgenti esatti di quel binario.

## Hardware e uso su questo sito

| Aspetto | Egzumer originale | F4HWN PY32 di questo sito |
| --- | --- | --- |
| Famiglia | Piattaforma originale UV-K5 V1 / DP32 | UV-K5 V3 / UV-K1 PY32 |
| Sistema di build | Makefile e flag 0/1 | CMake e opzioni per preset |
| Parser | Base fagci con modifiche Egzumer | Port e modifiche per versione |
| Memoria/dati | Mappa del suo firmware | Non si presume equivalente |
| Multiboot Armel v6 | Non documentato come funzionalità di questa base | Estensione specifica del progetto PY32 |
| Preparazione in slot web | Non supportata | Solo immagini riconosciute e verificate |

Non usare un flasher V1 né un'immagine Egzumer originale su una V3. Le diciture
K5/K6 in copertina non provano la revisione della MCU. Consulta la scheda e il
progetto. Il comando Bricohams V3 non include un compilatore Egzumer.

## Funzioni e impostazioni utente

Il README documenta correzione AM, demodulazione SSB, spettro, scansione rapida,
modifica del nome, modalità di visualizzazione, tasti assegnabili, batteria,
retroilluminazione, microfono e ricerca CTCSS/DCS. Qui SSB indica la
demodulazione in ricezione; non significa un trasmettitore SSB.

Per i concetti RX/TX, step, larghezza, SQL, toni, VOX, TOT e blocco canale,
consulta la [configurazione comune](AYUDA-CONFIGURACION.md). Usa il nome del
menu, non numeri trasferiti da F4HWN v6 o Karina. L'ordine e i nomi sono stati
modificati rispetto al firmware stock.

La wiki ufficiale è il riferimento per le sequenze di tasti della build installata:

- [Wiki e manuale](https://github.com/egzumer/uv-k5-firmware-custom/wiki).
- [Release](https://github.com/egzumer/uv-k5-firmware-custom/releases).

Non tutte le scorciatoie sono state verificate sull'hardware, né vengono
trasferite automaticamente ai firmware derivati. Il README segnala limiti di
gamma dinamica, sovraccarico e filtri d'ingresso; AM fix non può eliminare i
limiti fisici. Un'antenna con maggiore guadagno può peggiorare la ricezione in
un ambiente RF intenso.

## Opzioni di compilazione del commit esaminato

Valori `?=` del Makefile: sono valori predefiniti che un argomento make può
sovrascrivere. 0/1 non corrispondono a ON/OFF di CMake né ai menu della radio.
Le spiegazioni delle funzioni condivise sono nella [riferimento F4HWN e opzioni storiche](AYUDA-OPCIONES-F4HWN.md); il nome in comune
non garantisce che implementazione o memorizzazione siano uguali.

| Opzione | Predefinito | Scopo |
| --- | --- | --- |
| ENABLE_UART | 1 | Comunicazione di configurazione con PC |
| ENABLE_AIRCOPY | 0 | Trasferimento AirCopy compatibile |
| ENABLE_FMRADIO | 1 | Ricevitore di radiodiffusione FM |
| ENABLE_NOAA | 0 | Funzioni meteorologiche NOAA |
| ENABLE_VOICE | 0 | Avvisi vocali |
| ENABLE_VOX | 1 | Attivazione TX tramite audio, configurare/disattivare per evitare incidenti |
| ENABLE_ALARM | 0 | Funzione di allarme con possibili emissioni; non usarla come test |
| ENABLE_TX1750 | 0 | Tono di accesso al ripetitore |
| ENABLE_PWRON_PASSWORD | 0 | Password di accensione; non cifra tutta la memoria |
| ENABLE_DTMF_CALLING | 1 | Logica delle chiamate DTMF |
| ENABLE_FLASHLIGHT | 1 | LED/torcia dell'hardware |
| ENABLE_BIG_FREQ | 1 | Frequenza con caratteri grandi |
| ENABLE_SMALL_BOLD | 1 | Testo piccolo in grassetto |
| ENABLE_CUSTOM_MENU_LAYOUT | 1 | Layout alternativo dei menu |
| ENABLE_KEEP_MEM_NAME | 1 | Conservazione del nome durante la modifica della memoria |
| ENABLE_WIDE_RX | 1 | Ricezione di gamme estese; non autorizza TX |
| ENABLE_TX_WHEN_AM | 0 | Consente il percorso TX mentre è attiva la modalità RX AM; non dimostra la modulazione AM |
| ENABLE_F_CAL_MENU | 0 | Calibrazione della frequenza con strumenti |
| ENABLE_CTCSS_TAIL_PHASE_SHIFT | 0 | Trattamento della coda CTCSS tramite fase |
| ENABLE_BOOT_BEEPS | 0 | Suoni all'avvio |
| ENABLE_SHOW_CHARGE_LEVEL | 0 | Visualizzazione del livello di carica |
| ENABLE_REVERSE_BAT_SYMBOL | 0 | Variante visiva della batteria |
| ENABLE_NO_CODE_SCAN_TIMEOUT | 1 | Comportamento del timeout di ricerca codici |
| ENABLE_AM_FIX | 1 | Correzione della ricezione/guadagno AM |
| ENABLE_SQUELCH_MORE_SENSITIVE | 1 | Criterio di squelch più sensibile |
| ENABLE_FASTER_CHANNEL_SCAN | 1 | Miglioramento della velocità di scansione |
| ENABLE_RSSI_BAR | 1 | Indicatore di intensità |
| ENABLE_AUDIO_BAR | 1 | Indicatore audio |
| ENABLE_COPY_CHAN_TO_VFO | 1 | Copia della memoria nel VFO |
| ENABLE_SPECTRUM | 1 | Analizzatore di spettro |
| ENABLE_REDUCE_LOW_MID_TX_POWER | 0 | Variante degli obiettivi di potenza bassa/media |
| ENABLE_BYP_RAW_DEMODULATORS | 0 | Percorsi RAW avanzati di demodulazione |
| ENABLE_BLMIN_TMP_OFF | 0 | Trattamento temporaneo della luce minima |
| ENABLE_SCAN_RANGES | 1 | Intervalli di scansione |
| ENABLE_AM_FIX_SHOW_DATA | 0 | Dati diagnostici AM fix |
| ENABLE_AGC_SHOW_DATA | 0 | Dati diagnostici AGC |
| ENABLE_UART_RW_BK_REGS | 0 | Accesso ai registri RF; non attivare di routine |
| ENABLE_CLANG | 0 | Compilazione con Clang nella configurazione del progetto |
| ENABLE_SWD | 0 | Supporto al debug SWD |
| ENABLE_OVERLAY | 0 | Overlay della memoria di questa base, non slot firmware |
| ENABLE_LTO | 1 | Ottimizzazione del collegamento |

In quel Makefile, Clang imposta LTO=0; con LTO=1 viene impostato OVERLAY=0.
Queste regole appartengono a questa base e non vanno copiate in CMake PY32
senza analisi. L'attivazione delle opzioni può superare la memoria disponibile
o interrompere combinazioni; l'esistenza di una chiave non implica il supporto
di tutte le combinazioni.

Per compilare, usa la toolchain e la procedura del suo README in un checkout
fissato, conserva mappa, licenza e hash e convalida l'hardware V1. Egzumer non è
stato compilato, flashato né testato durante questa integrazione documentale.

## Relazione con Karina e Bricohams

Una genealogia di funzioni simili non permette di ricostruire i sorgenti esatti
di Karina. Neppure i driver e i nomi che menzionano Egzumer ne sono una prova.
Attualmente Bricohams V3 deriva da F4HWN PY32, non da questo repository
originale. Un progetto Bricohams V1 sarebbe un'altra compilazione e richiederebbe
un'altra convalida hardware.

## Fonti fissate

- [README del commit](https://github.com/egzumer/uv-k5-firmware-custom/blob/7607f0a4bd6203d1f06b70556fc1ce0d7399d6b3/README.md).
- [Makefile del commit](https://github.com/egzumer/uv-k5-firmware-custom/blob/7607f0a4bd6203d1f06b70556fc1ce0d7399d6b3/Makefile).
- [Licenza Apache-2.0](https://github.com/egzumer/uv-k5-firmware-custom/blob/7607f0a4bd6203d1f06b70556fc1ce0d7399d6b3/LICENSE).
- [Pack V3 e nuove evidenze Karina](AYUDA-PACK-DIM0S.md).