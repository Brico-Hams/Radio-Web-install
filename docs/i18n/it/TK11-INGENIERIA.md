# TK-11: ingegneria dell'interoperabilità e percorso verso un firmware proprio

Base di conoscenza sul Quansheng TK-11. Ogni dato riporta la sua fonte; ciò che non è confermato è contrassegnato come **UNVERIFIED**. Questo progetto non flasha firmware sul TK-11 e questo documento non lo cambia.

## Ambito e regole

- Si usano solo fonti pubbliche e l'implementazione di questo repository. Non è stato decompilato alcun binario né copiato codice di TK-11 Manager.
- Il codice di CHIRP-to-TK11-csv è GPL-3.0 ed è portato con attribuzione in `ACKNOWLEDGEMENTS.md`. Il driver di CHIRP è GPL-2.0-or-later.
- Di TK-11 Manager si descrive solo il comportamento pubblicato nella sua presentazione. La sua licenza non è nota.
- Nulla di quanto scritto qui è stato provato su una radio reale, tranne ciò che già fa `tk11-connector.js`.

## Fonti

| Id | Fonte | Contenuto |
|---|---|---|
| [F1](https://urez.org/tk-11-manager-la-herramienta-definitiva-para-programar-tu-quansheng-tk-11-desde-el-pc/) | Articolo di URZ su TK-11 Manager | Funzioni e misure di sicurezza dello strumento |
| [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) | CHIRP-to-TK11-csv (GPL-3.0) | Formato CSV di importazione del TK-11 |
| [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) | Driver tk11.py di CHIRP | Protocollo CPS e mappa di memoria |
| [F4](https://github.com/armel/tk11-teardown) | Teardown di armel (Apache-2.0) | MCU, memoria e mancanza di documentazione |
| F5 | `tk11-connector.js` e `tk11-ui.js` di questo repository | Implementazione indipendente basata su F3 |
| [F6](https://github.com/spm81/Multi-UVTools) | Multi-UVTools di spm81 (senza LICENSE) | Affermazioni sugli offset del TK-11; solo dati, senza riutilizzare codice; fonte unica, **UNVERIFIED**; si basa sul modulo TK11 di CHIRP, quindi non è indipendente da F3 negli offset condivisi |
| [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf) | Datasheet AP8048B di MVSilicon | Pin, SWD, cifratura del codice nella Flash SPI, aggiornamento via SD/USB |
| [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf) | Datasheet AP8048C di MVSilicon | Come F7 per la variante C |
| [F9](https://github.com/rob-w/tk11-firmware-custom) | rob-w/tk11-firmware-custom (fork di F4) | Descritto come reimplementazione aperta del firmware, ma contiene solo README, LICENSE, PDF e JPG; nessun codice né binario; ultimo push 2025-04-29 |
| [F10](https://github.com/qshosfw/hermes) | README di qshosfw/hermes (GPL-3.0) | Fonte secondaria che definisce il TK-11 una radio con Beken BK4819 |
| [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg) | Foto del teardown, vista A retro della PCB V2.0 | Osservazione visiva dell'autore di questo documento |

## Hardware

| Elemento | Dato | Fonte |
|---|---|---|
| MCU | AP8048 di MVSilicon, basato su Arm Cortex-M3 | [F4](https://github.com/armel/tk11-teardown) |
| Flash interna | 2 MB | [F4](https://github.com/armel/tk11-teardown) |
| SRAM interna | 128 KB | [F4](https://github.com/armel/tk11-teardown) |
| EEPROM o Flash SPI esterna | Nessuna identificata sulla PCB | [F4](https://github.com/armel/tk11-teardown) |
| Dati persistenti | Bootloader, firmware, calibrazione, impostazioni e 999 canali risiederebbero nella Flash interna; è una deduzione dell'autore del teardown, **UNVERIFIED** | [F4](https://github.com/armel/tk11-teardown) |
| Datasheet | Non esiste un datasheet pubblico completo; i dettagli sono forniti solo sotto NDA | [F4](https://github.com/armel/tk11-teardown) |
| SDK e strumenti | Secondo F4 non esistono SDK né toolchain pubblici per l'AP8048. Ricerche su GitHub (2026-11-09) di `AP8048` e `tk11 firmware`: 0 repository; non sono stati trovati su github.com, urez.org né spm81.github.io sorgenti di firmware, file di aggiornamento, protocollo di aggiornamento né combinazione di tasti del bootloader. Esiste un SDK di MVSilicon per un chip fratello, leadercxn/bp1048_sdk_v0.1.12 (non esaminato; licenza sconosciuta). F9 non fornisce codice | [F4](https://github.com/armel/tk11-teardown), [F9](https://github.com/rob-w/tk11-firmware-custom) |
| Variante della MCU | In F4 ci sono datasheet di AP8048A, B e C. Quale monti il TK-11 è **UNVERIFIED**: la marcatura nella foto non è leggibile | [F4](https://github.com/armel/tk11-teardown/tree/main/datasheet), [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg) |
| Porta SWD | I datasheet di B e C (LQFP48 7x7 mm) elencano "Serial wire debug (SWD) interface": GPIO_C[13] = SWCLK, GPIO_C[14] = SWDIO, sui pin 2 (SWCLK) e 3 (SWDIO) in B e C. Massa DVSS: pin 38 (B), pin 39 (C); IOVDD 3,3 V: pin 40 (B). Contraddizione: il README di F4 dice che il chip non ha interfaccia esterna di programmazione o debug. Se SWD sia attivo o bloccato nel TK-11 è **UNVERIFIED** | [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf), [F4](https://github.com/armel/tk11-teardown) |
| Reset | Nessuna delle due tabelle dei pin elenca un pin NRST; pin POWER_KEY: 17 in B e C | [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf) |
| Interfaccia Flash SPI e cifratura del codice | Pin GPIO_A[13..18] = FSH_HOLD, FSH_SCK, FSH_SI, FSH_WP, FSH_SO, FSH_CS = pin da 21 a 26 in entrambe le varianti. L'elenco delle caratteristiche include "Code encryption mechanism in SPI-flash". Che la "Flash interna da 2 MB" sia una Flash SPI nel package che usa quei pin è una **deduzione** dai datasheet, **UNVERIFIED** | [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf) |
| Canale di aggiornamento secondo il datasheet | "Firmware updatable through SD/USB drive" (B e C); quello dell'AP8048A parla di avvio da Flash SPI e aggiornamento tramite disco SD o USB. Non si sa se il TK-11 lo usi: **UNVERIFIED** | [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf) |
| Core e memoria secondo il datasheet | Cortex-M3 a 96 MHz e 128 KB di SRAM | [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf) |
| Chip RF | F4 include datasheet di BK4819 e BK4829 (Beken). Osservazione dalla foto: due chip QFN con logo Beken in zone schermate, coerente con BK4819/BK4829; i riferimenti esatti sono **UNVERIFIED**. F10 definisce il TK-11 una radio Beken BK4819 (fonte secondaria) | [F4](https://github.com/armel/tk11-teardown/tree/main/datasheet), [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg), [F10](https://github.com/qshosfw/hermes) |
| Ricevitore FM | F4 include il datasheet dell'RDA5807M; la foto mostra un chip SOP con marcatura "5807M" (osservazione) | [F4](https://github.com/armel/tk11-teardown/tree/main/datasheet), [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg) |
| Footprint SOP-8 non montato | Osservazione dalla foto: un footprint SOP-8 vuoto accanto alla MCU; la sua funzione è **UNVERIFIED** (di solito una Flash SPI o EEPROM opzionale) | [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg) |
| Pad di test | Osservazione dalla foto: a quella risoluzione non si vedono pad SWD etichettati | [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg) |
| Collegamento del CPS | Seriale a 38400 baud con DTR attivo | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| Display e audio | Non identificati in questo documento: **UNVERIFIED** | F5 |

## Protocollo CPS

### Trama

Ogni messaggio contiene intestazione, payload, CRC e chiusura. Il payload e il CRC sono mascherati con uno XOR ciclico di 16 byte e il CRC è calcolato sul payload in chiaro ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)).

```text
AB CD LL LL [carga util][CRC16-XMODEM LE]  DC BA
LL LL = longitud de la carga util (u16 LE)
clave XOR = 16 6C 14 E6 2E 91 0D 40 21 35 D5 40 13 03 E9 80
```

Il valore "magic" a 32 bit è generato a caso dal CPS ufficiale; con un valore fisso (5) la radio risponde ugualmente, ma deve essere lo stesso in tutta la sessione ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)).

### Tabella dei comandi

| Id | Nome | Payload | Fonte |
|---|---|---|---|
| `0x01F4` | Richiesta di connessione | Tipo u16, lunghezza 4, magic u32 | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x01F5` | Risposta di connessione | Stringa del firmware nei byte da 4 a 19; l'analisi è di F5, **UNVERIFIED** rispetto al CPS ufficiale | F5 |
| `0x01FB` | Lettura della memoria | Tipo u16, lunghezza 12, indirizzo u32 (`0x080000` più l'offset), dimensione u16, 2 byte a zero, magic u32 | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x01FC` | Risposta di lettura | 12 byte di intestazione e i dati; massimo `0x200` per blocco | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x01FD` | Scrittura della memoria | La stessa intestazione di 16 byte e i dati; massimo `0x200` per blocco | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x01FE` | Risposta di scrittura | Trama di 16 byte in totale; il successo si verifica dal codice | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x05DD` | Riavvio | Solo tipo e lunghezza; il driver lo definisce e il suo uso reale nel CPS ufficiale è **UNVERIFIED** | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| Altri | Qualsiasi comando di aggiornamento, calibrazione o bootloader | Non documentato: **UNVERIFIED** | F5 |

Il limite di memoria del driver è `0x23000` (140 KiB) a partire dalla base `0x080000` ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)). Non si sa se `0x080000` sia un indirizzo reale della Flash o un indirizzo logico del CPS: **UNVERIFIED**.

## Mappa di memoria

Gli offset sono relativi alla base `0x080000` ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)).

| Offset | Dimensione | Contenuto | Fonte |
|---|---|---|---|
| `0x00000` | 999 × 64 B (`0xF9C0`) | Canali | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| Da `0x0F9C0` a `0x10FFF` | `0x1640` | Non documentato; può contenere la calibrazione, **UNVERIFIED** | F5 |
| `0x11000` | 1011 B | Indicatore di utilizzo per canale (`0xFF` è vuoto); gli ultimi 12 non sono identificati | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x12000` | `0x48` | Radio FM: VFO, id del canale, indicatore di memoria e 32 frequenze | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x13000` | `0xF8` | Impostazioni generali | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x14000` | `0x70` | Impostazioni generali 2: codici di cancellazione e riattivazione, nome dell'apparato | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x15000` | `0x10` | Selezione corrente: 8 valori u16 di A, B, frequenza, canale e NOAA | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x16000` | 32 × `0x80` | Liste di scansione; terminano esattamente a `0x17000` | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x17000` | 4 B | Password di accensione di 6 cifre, u32 little endian, secondo Multi-UVTools; **UNVERIFIED**, lacuna di CHIRP | [F6](https://github.com/spm81/Multi-UVTools) |
| `0x1A000` | 16 × 24 B | Contatti DTMF: nome di 16 B e codice di 8 B | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x1A800` | 16 × 24 B | Contatti a 5 toni: come DTMF | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x22000` | 16 × 40 B | Indirizzi di decodifica NOAA SAME: 8 B di indirizzo e 32 B di testo | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x22280` | 128 B | Controllo degli eventi NOAA SAME | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x23000` | Fine | Limite di memoria del CPS | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| Resto | Spazi tra le strutture | Non documentato; vengono sempre conservati | F5 |
| `0x0D6008` | 1024 B | Logo di avvio 128x64 monocromatico secondo Multi-UVTools (relativo alla base `0x080000`, come il resto); fuori dalla finestra di `0x23000` del CPS; **UNVERIFIED** | [F6](https://github.com/spm81/Multi-UVTools) |

### Calibrazione: risoluzione della sovrapposizione

Multi-UVTools ([F6](https://github.com/spm81/Multi-UVTools), fonte unica, **UNVERIFIED**) afferma che la calibrazione del TK-11 occupa `0x010000`-`0x021000` (68 KB) e che il suo pulitore di EEPROM conserva `0x010000`-`0x015010` e `0x020000`-`0x021000`. Il suo codice dichiara di basarsi sul modulo TK11 di CHIRP, quindi non è indipendente da F3 negli offset condivisi. L'intervallo `0x11000`-`0x1A980` si scontra con strutture di CHIRP (utilizzo, FM, impostazioni, liste, contatti), per cui non può essere tutto calibrazione. Le parti che cadono in lacune di CHIRP sono `0x10000`-`0x10FFF` e `0x20000`-`0x20FFF`: candidate, **UNVERIFIED**. `tk11-connector.js` non scrive mai in nessuna di queste zone (l'elenco `UNVERIFIED_REGIONS` serve solo a nominarle nel confronto tra copie) né nel logo.

Il VFO principale (da A-F01 a A-F11 e da B-F01 a B-F11 nei menu di CHIRP) non ha una struttura propria nel driver: dove siano salvate le frequenze del VFO è **UNVERIFIED**. L'unico VFO documentato è quello della radio FM. Le "zone" non compaiono in nessuna fonte: la cosa più simile sono le 32 liste di scansione, ciascuna con un nome di 16 B, due priorità u16 e 48 canali u16 ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)); se il TK-11 abbia zone come il DMR è **UNVERIFIED**.

### Record di canale (64 byte)

Le frequenze si salvano in unità di 10 Hz e i toni CTCSS in decimi di hertz; i codici DCS si salvano come il numero ottale letto in decimale ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)).

| Byte | Campo | Note |
|---|---|---|
| 0 | `rx_freq` | u32 |
| 4 | `freq_diff` | u32, shift |
| 8 | `tx_non_standard_1` | Non documentato |
| 9 | `tx_non_standard_2` | Non documentato |
| 10 | `rx_qt_type` | 0 nessuno, 1 CTCSS, 2 DCS normale, 3 DCS invertito |
| 11 | `tx_qt_type` | Come il precedente |
| 12 | `freq_dir` | 0 simplex, 1 più, 2 meno |
| 13 | `band` | Il nibble basso a 1 è banda stretta (secondo F5) |
| 14 | `step` | Passo |
| 15 | `encrypt` | Da 0 a 10 |
| 16 | `power` | 0 bassa, 1 media, 2 alta |
| 17 | `busy` | Blocco per canale occupato |
| 18 | `reverse` | Inversione delle frequenze |
| 19 | `dtmf_decode_flag` | Decodifica della segnalazione |
| 20 | `ptt_id` | Da 0 a 3 |
| 21 | `mode` | 0 FM, 1 AM, 2 LSB, 3 USB, 4 CW |
| 22 | `scan_list` | `0xFF` nessuna |
| 23 | `sq` | Da 0 a 8 |
| 24 | `name` | 16 byte ASCII |
| 40 | `rx_qt` | u32 |
| 44 | `tx_qt` | u32 |
| 48 | `unknown` | 8 byte non documentati |
| 56 | `tx_qt2` | u32 non documentato |
| 60 | `signal` | 0 DTMF, 1 5 toni |
| 61 | `unknown_2` | 3 byte non documentati |

### Impostazioni generali (`0x13000`)

| Byte | Campi | Fonte |
|---|---|---|
| Da 0 a 16 | Canale A/B, squelch NOAA, TOT, scansione NOAA, blocco tastiera, VOX, microfono, modalità frequenza, visualizzazione, AGC, risparmio, doppio ascolto, retroilluminazione, canale di chiamata (u16), beep | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| Da 17 a 27 | Quattro azioni dei tasti laterali, modalità di scansione, blocco automatico, schermata di avvio, allarme, tono di fine TX, coda del ripetitore, tono di coda | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| Da 28 a 40 | Riduzione del rumore, trasposizione, volumi A e B, tono dei tasti, lingua, NOAA SAME, barra del segnale | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| Da 41 a 55 | Luminosità, codice di cancellazione, tono laterale DTMF, risposta DTMF, ricerca del tono, tono CW (u16) | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| Da 56 a 127 | Blocco DTMF: separatore, gruppo, tempi, identificatore di 8 B e codici di salita e discesa | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| Da 128 a 215 | Blocco a 5 toni: come DTMF più protocollo e 15 frequenze utente | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| Da 216 a 247 | Due righe di 16 caratteri del testo di benvenuto | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |

## Formato CSV del TK-11

Il CSV che importa TK-11 Manager e che genera il convertitore di nikantgr ha un'intestazione fissa. Che TK-11 Manager lo importi così com'è è **UNVERIFIED** da parte mia: [F1](https://urez.org/tk-11-manager-la-herramienta-definitiva-para-programar-tu-quansheng-tk-11-desde-el-pc/) dice solo che esporta e importa CSV, e [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) lo descrive come il formato del software di Quansheng.

```text
No.,Name,RX Freq[MHZ],TX Freq[MHZ],QT Encode Type,QT Encode1,QT Decode Type,QT Decode,MSW,Band,Powrer,Busy Lock,ScanList,Demode,Freq Reverse,SQ,Encrypt,Signaling Decode,PTTID,Signal
1,PMR01,446.00625,0.15300,Null,Null,Null,Null,2K,12.5K,Low,OFF,1,FM,OFF,3,OFF,OFF,OFF,DTMF
2,,,,,,,,,,,,,,,,,,,
```

### Colonne

L'intestazione scrive "Powrer" con quell'errore di battitura e lo si conserva così com'è. I valori predefiniti sono quelli fissati dal convertitore.

| Colonna | Valori osservati | Note | Fonte |
|---|---|---|---|
| `No.` | 1, 2, 3, … | Progressivo da 1; gli spazi sono righe vuote | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Name` | Testo | Massimo 12 caratteri secondo l'autore ("i think"), **UNVERIFIED**; la memoria ne ammette 16 | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `RX Freq[MHZ]` | 446.00625 | MHz con 5 decimali | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `TX Freq[MHZ]` | 145.07500 | Frequenza assoluta; `0.15300` significa senza TX | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `QT Encode Type` | Null, Ctcss, NDCS, IDCS | NDCS è DCS normale e IDCS invertito | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `QT Encode1` | Null, 77.0, 023 | Tono CTCSS o codice DCS | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `QT Decode Type` | Null, Ctcss, NDCS, IDCS | Come la codifica | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `QT Decode` | Null, 77.0, 023 | Come la codifica | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `MSW` | 2K | Significato **UNVERIFIED**; CHIRP elenca da 2K a 5K | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Band` | 12.5K, 25K | Larghezza di banda: stretta o larga | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Powrer` | Low, Middle, High | Potenza | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Busy Lock` | ON, OFF | Blocco per canale occupato | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `ScanList` | 1 | Il convertitore scrive sempre 1; la numerazione da 1 a 32 e il valore senza lista sono **UNVERIFIED** | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Demode` | FM, AM, LSB, USB, CW | Modulazione | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Freq Reverse` | ON, OFF | Inversione delle frequenze | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `SQ` | 3 | Squelch da 0 a 8 | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Encrypt` | OFF | Cifratura; il convertitore scrive solo OFF | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Signaling Decode` | OFF | Il convertitore scrive solo OFF | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `PTTID` | OFF | Altri valori **UNVERIFIED**; si usano quelli di CHIRP | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Signal` | DTMF, 5TONE | Tipo di segnalazione | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |

### Conversione da CHIRP

Il convertitore ([F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py)) fa quanto segue ed è portato in `tk11-connector.js`:

- Rinumera da 1 tra la memoria più bassa e la più alta, e lascia righe vuote negli spazi.
- Calcola la frequenza TX con il duplex: meno e più sottraggono e sommano lo shift, split prende lo shift come TX, off scrive `0.15300` e il resto copia la RX.
- Converte Tone in CTCSS di codifica, TSQL in CTCSS su entrambi i lati, DTCS e DTCS-R secondo la polarità (N normale, R invertita) e Cross secondo la modalità incrociata.
- NFM dà banda di 12.5K e qualsiasi altra modalità 25K; la demodulazione ammette solo FM, AM, LSB, USB e CW.
- Pubblica varianti con virgolette, con virgola decimale e con il separatore dell'impostazione regionale. Qui si portano le prime due e la terza no.
- Modifiche di questo repository: la potenza si prende da CHIRP (Low e High; il resto è Middle).

Le funzioni pubbliche di `R.TK11` sono `channelsToTk11Csv`, `channelsFromCsv` (rileva TK-11 o CHIRP dall'intestazione) e `chirpCsvToTk11Csv`. L'importazione riempie solo la tabella della pagina; la radio non cambia finché non si preme il pulsante di scrittura dei canali, che richiede prima una copia verificata. Le righe non valide vengono scartate indicandone il motivo.

## Cosa espone TK-11 Manager

Tutto quanto segue proviene da [F1](https://urez.org/tk-11-manager-la-herramienta-definitiva-para-programar-tu-quansheng-tk-11-desde-el-pc/); lo strumento non è stato eseguito né analizzato.

| Capacità | Dettaglio pubblicato | Confronto con CHIRP |
|---|---|---|
| Esecuzione | Nel browser, senza Internet né invio di dati | Stesso protocollo; CHIRP è per desktop |
| Protocollo | Basato sul driver TK11 di CHIRP, secondo l'articolo | Stessa mappa di memoria |
| Canali | Gestione completa dei 999 | Uguale |
| Impostazioni | Generali, tasti e funzioni rapide | Uguale |
| Liste di scansione | Sì | Uguale; le zone non sono menzionate |
| DTMF e 5 toni | Contatti e segnali | Uguale |
| Radio FM | Sì | Uguale |
| Copie | Automatica a ogni lettura; ripristino | Non è automatica in CHIRP |
| Sicurezza | Verifica il firmware prima di modificare, scrive solo i blocchi cambiati e verifica byte per byte | Miglioramento del metodo, non del formato |
| Strumenti avanzati | Visualizzatore di memoria | Nessun visualizzatore in CHIRP |
| Dati | Esporta e importa CSV e apre immagini di CHIRP | Uguale per il CSV |
| Aggiornamento del firmware | Non menzionato | Nessuno strumento pubblico lo offre |
| Interfaccia | Walkie virtuale e sette temi più uno personalizzabile | Nessun equivalente |

Conclusione: l'articolo non rivela nessuna regione di memoria, impostazione né comando che non sia nel driver di CHIRP. Che cosa significhi "verificare il firmware" e come lo faccia è **UNVERIFIED**.

## Percorso verso un firmware funzionante

### Passi

Tutti i passi sono **UNVERIFIED** finché non vengono eseguiti con una radio di prova. Nessuno viene implementato in questa applicazione.

1. **Accesso SWD e protezione in lettura.** Secondo i datasheet di AP8048B e AP8048C ([F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf)), SWCLK è il pin 2 e SWDIO il pin 3 del LQFP48; massa sul pin 38 (B) o 39 (C) e IOVDD da 3,3 V sul pin 40 (B). Non c'è pin NRST. Collegare una sonda (ST-Link, J-Link o CMSIS-DAP) con OpenOCD e leggere solo l'IDCODE e la lista degli AP (vedere "Procedura hardware"). Non eseguire mai uno sblocco o una cancellazione totale: in molte MCU distrugge la Flash.
2. **Dump completo della Flash.** Se il debug è aperto, leggere i 2 MB con la sonda, due volte, e confrontare gli SHA-256. Conservare il dump come copia privata e non ridistribuirlo. Poi cercarvi un record di canale noto per sapere se `0x080000` è un indirizzo reale.
3. **Identificare il bootloader.** Vedere nel dump la tabella dei vettori, la dimensione e l'indirizzo del loader, e se verifica firma o CRC.
4. **Catturare il protocollo di aggiornamento.** Con l'updater ufficiale e un analizzatore USB (USBPcap con Wireshark, oppure un analizzatore hardware), catturare un aggiornamento completo di una radio di prova: come entra in modalità loader, se riutilizza la trama AB CD, XOR e CRC, e il formato del file (intestazione, cifratura, firma). Bisogna confrontare due versioni. Non si deve rinviare nessuna scrittura catturata a una radio.
5. **Toolchain e SDK dell'AP8048.** Un compilatore `arm-none-eabi-gcc` per Cortex-M3 va bene per il core, ma le periferiche (clock, GPIO, LCD, tastiera, audio, RF) sono solo nell'SDK di MVSilicon o in documentazione sotto NDA ([F4](https://github.com/armel/tk11-teardown)). Se non c'è SDK, i registri andranno dedotti dalla scheda.
6. **Prova minima di lampeggio e LCD.** Caricare un piccolo programma nella SRAM da 128 KB con il debugger ed eseguirlo senza scrivere nella Flash, per accendere la retroilluminazione o la torcia e poi disegnare sull'LCD. Così non si tocca nulla di permanente.
7. **Porting.** Solo con il passo 6 risolto: scrivere i driver di display, tastiera, audio e RF, conservare il bootloader e mantenere la stessa mappa di memoria e lo stesso protocollo CPS in modo che CHIRP e TK-11 Manager continuino a funzionare. Il firmware K5 di F4HWN non si può portare così com'è: ha un'altra MCU (Cortex-M0), un'altra mappa di memoria e EEPROM esterna ([F4](https://github.com/armel/tk11-teardown)).

### Verdetto di fattibilità

Un firmware proprio completo oggi non è fattibile. Ci sono tre blocchi duri: l'AP8048 non ha SDK pubblico ([F4](https://github.com/armel/tk11-teardown)), non esiste un protocollo di aggiornamento pubblico e non si sa se il debug SWD sia aperto. Il datasheet del produttore declassa il blocco di SWD da "sconosciuto" a "documentato dal produttore, stato nel TK-11 non verificato" ([F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf)). Compare un nuovo blocco: la cifratura del codice nella Flash SPI citata da quei datasheet. L'obiettivo realistico è un traguardo di avvio (lampeggio e LCD dalla SRAM) con una radio sacrificabile, e solo se il passo 1 va bene. Un firmware completo con RF, audio e menu sarebbe un progetto di mesi con reverse engineering dell'hardware, e comunque senza garanzia che il chip lo consenta.

## Procedura hardware (radio di prova)

Tutto è **UNVERIFIED** finché non viene fatto. Solo con una radio di prova, mai con la radio di uso quotidiano.

1. Identificare la variante (A, B o C) dalla marcatura del chip con una lente.
2. Individuare per continuità i pin 2 (SWCLK), 3 (SWDIO), massa e 3,3 V dal LQFP48 (punto del pin 1) fino a pad di test o via. Preferire una via piuttosto che saldare sul pin.
3. Preparare una sonda CMSIS-DAP, ST-Link o J-Link con la radio alimentata dalla propria batteria, VTref a 3,3 V e velocità di 100 kHz.
4. Sessione OpenOCD di sola lettura, che legge solo l'IDCODE del DP e la lista degli AP:

```text
openocd -f interface/cmsis-dap.cfg -c "transport select swd" -c "adapter speed 100" -c "swd newdap ap8048 cpu -enable" -c "dap create ap8048.dap -chain-position ap8048.cpu" -c "init" -c "dap info" -c "shutdown"
```

5. Poiché non c'è NRST, collegarsi con la radio in funzione (senza "connect under reset").
6. Solo se l'AP risponde: creare un target cortex_m, eseguire `mdw 0x00000000 8` per vedere la tabella dei vettori e fare `dump_image` della regione di codice due volte, confrontando gli SHA-256.
7. Cercare nel dump un record di canale noto per mettere in relazione l'offset 0 del CPS con un indirizzo di Flash.
8. Vietato: qualsiasi comando di cancellazione, sblocco, scrittura in Flash, byte di opzione o cancellazione totale. La radio va su un carico fittizio e non trasmette mai.
9. Cattura USB, solo se compaiono un updater ufficiale e il suo file: USBPcap e Wireshark sul cavo del CPS, confrontare due versioni e non rinviare mai scritture catturate.
10. Opzionale: analizzatore logico sui pin da 21 a 26 (FSH) durante l'avvio per vedere se le letture della Flash passano da lì; secondo il datasheet ci si aspetta che i dati siano cifrati.

## Che cosa si può fare senza una radio sacrificabile

- (a) Copie di sicurezza di sola lettura con il CPS più lo strumento "Confronta due copie" di questo pannello: cambiare un'opzione di menu nella radio, fare una copia nuova e confrontarle serve a mappare campi sconosciuti e a confermare o respingere gli offset di Multi-UVTools (per `0x17000`: impostare una password di accensione, fare la copia e confrontare). Richiede un TK-11, ma non scrive mai.
- (b) Sonda SWD di sola lettura dell'IDCODE (obbliga ad aprire la radio; influisce sulla garanzia).
- (c) Ricerca a tavolino sui datasheet.

Tutto il resto richiede una radio sacrificabile.

### Rischi

| Rischio | Effetto | Mitigazione |
|---|---|---|
| Cancellazione della Flash allo sblocco del debug | Si perdono bootloader, calibrazione e canali | Non sbloccare mai; fare prima il dump con il debug aperto |
| Calibrazione fuori dalla copia del CPS | Radio fuori specifica dopo un errore | Il CPS non la espone (la mappa arriva a `0x23000`); serve il dump completo |
| Sovrascrittura del bootloader | Radio inutilizzabile senza sonda | Flashare solo la regione applicativa e conservare il dump |
| Catture di aggiornamento rinviate | Una versione incompatibile blocca la radio | Non rinviare scritture catturate |
| Diritti d'autore e NDA | Problemi legali nel pubblicare dump o datasheet | Non ridistribuire dump né documenti sotto NDA; consultare la legge locale sul reverse engineering |
| Conformità radioelettrica | Un firmware proprio può emettere fuori banda o senza omologazione | Rispettare i limiti delle bande e la normativa locale |
| Falsa sicurezza dei test | I test di questo repository coprono solo il CPS simulato | Provare sempre su una radio di prova |

## Registro delle modifiche

### 2026-11-09

Cosa si è appreso:

- Il driver di CHIRP è GPL-2.0-or-later, non GPL-3.0-or-later; ultimo commit del file 2026-03-19 ([F3](https://raw.githubusercontent.com/kk7ds/chirp/master/chirp/drivers/tk11.py)).
- Le liste di scansione di CHIRP terminano esattamente a `0x17000` (32 × `0x80` da `0x16000`).
- Multi-UVTools non ha LICENSE e le sue affermazioni sul TK-11 sono di fonte unica e non indipendenti da CHIRP ([F6](https://github.com/spm81/Multi-UVTools)).
- rob-w/tk11-firmware-custom non contiene codice né binari ([F9](https://github.com/rob-w/tk11-firmware-custom)).
- armel/tk11-teardown include datasheet di AP8048A/B/C, BK4819, BK4829 e RDA5807M ([F4](https://github.com/armel/tk11-teardown/tree/main/datasheet)).
- I datasheet di AP8048B e AP8048C elencano SWD (pin 2 e 3), cifratura del codice nella Flash SPI e aggiornamento via SD/USB, e non elencano NRST ([F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf)).
- Osservazioni dalla foto: MCU mVsilicon AP8048 LQFP48, due QFN Beken, un SOP "5807M" e un footprint SOP-8 vuoto ([F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg)).
- F10 definisce il TK-11 una radio Beken BK4819 (fonte secondaria) ([F10](https://github.com/qshosfw/hermes)).
- Ricerche su GitHub di `AP8048` e `tk11 firmware`: 0 repository; nessuna fonte, file o protocollo di aggiornamento del firmware pubblici.
- urez.org ha solo l'articolo su TK-11 Manager e non dice nulla del firmware ([F1](https://urez.org/tk-11-manager-la-herramienta-definitiva-para-programar-tu-quansheng-tk-11-desde-el-pc/)).

Modifiche al codice:

- Licenza di CHIRP corretta in GPL-2.0-or-later in `tk11-connector.js`.
- Nuovo elenco `UNVERIFIED_REGIONS` (mai scrivibile) e funzioni `describeOffset` e `diffImages` in `R.TK11`.
- Pulsante "Confronta due copie" nel pannello TK-11: sola lettura, non tocca la radio.
