# Baofeng DM-32UV: firmware aperto, OpenGD77 e come compilarlo

Revisione: 26-10-2026. Risultato della ricerca del codice sorgente e delle modalità di compilazione del firmware
per DM-32UV su GitHub, Codeberg, GitLab, GitFlic, il sito OpenGD77 e i gruppi
Telegram OpenGD77 EA, Baofeng DM-32UV EA, Baofeng DM-32UV RU e OpenGD77 Rus.
Nessuna informazione di questa guida è stata testata su una radio Bricohams: ogni dato indica la propria fonte.

## Riepilogo

| Domanda | Risposta |
| --- | --- |
| Esiste il codice sorgente del port OpenGD77 per DM-32 (OpenDM32)? | **No.** Viene distribuito solo in formato binario. Lo confermano i gruppi e il sito OpenGD77 |
| È possibile installare OpenGD77 su DM-32? | Sì, in versione sperimentale: CPS ufficiale (tipo «DM32/UV008») o [grid.radio](https://grid.radio/opengd77/). I gruppi riferiscono che non esiste una versione stabile |
| Esiste un firmware aperto compilabile? | **Sì: [RadioFoundry](https://github.com/RadioFoundry/RadioFoundry)** (MIT). FM e voce DMR nei due sensi, CTCSS/DCS, APRS, GPS e hotspot sono stati provati in aria |
| Qual è la licenza attuale di OpenGD77? | In stile BSD, con divieto d'uso commerciale (non GPL) dal 2019. Solo il vecchio mirror [open-ham/OpenGD77](https://github.com/open-ham/OpenGD77) è GPL-2.0 |
| Codec AMBE? | Proprietario (DVSI). Nessun progetto aperto lo distribuisce: viene estratto dal firmware di fabbrica dell'utente stesso |

## Hardware

| Blocco | Componente |
| --- | --- |
| SoC | Hongruan HR_C7000 (Dahua DH4570): core C-SKY CK803S a 168 MHz, 288 KB di SRAM, modem DMR/FM integrato, senza flash interna |
| Ricetrasmettitore RF | FD6818 (senza datasheet pubblico; registri compatibili nello spirito con BK4819/AT1846S) |
| Flash del programma | Classe GD25Q80 / 25Q16 da 1 MB, esecuzione in loco a `0x03000000` |
| Flash dei dati | GD25Q128 o Puya PY25Q128HA, 16 MB: codeplug, calibrazione, contatti |
| Schermo | Colori 240x320, controller di classe ST7789 su bus i8080 a 8 bit |
| Altro | ALPU-MP (autenticazione I2C), RDA5807M (FM commerciale), GPS ATGM336H, RTC con batteria |
| Programmazione | Jack K1 a 2 pin con cavo USB-seriale a 115200 baud. La USB-C è nella batteria e serve solo per la ricarica |

Mappa della flash del programma:

| Intervallo | Contenuto |
| --- | --- |
| `0x03000000-0x0300BFFF` | Bootloader Baofeng (modalità aggiornamento PTT+SK1). Non toccare mai |
| `0x0300C000-0x030E7FFF` | Applicazione (880 KB in RadioFoundry) |
| `0x030E8000-0x030FFFFF` | Slot del codec (RadioFoundry) |

Nella flash dei dati, sotto `0x700000` si trovano il codeplug di fabbrica e la
**calibrazione** (la pagina da 4 KB il cui ultimo byte vale 2). Non scriverci mai.

Dettagli completi, in gran parte misurati su una radio: [hardware-dm32.md di RadioFoundry](https://github.com/RadioFoundry/RadioFoundry/blob/main/docs/spec/hardware-dm32.md),
con clock e PLL, periferiche, interrupt, pinout, registri FD6818, percorsi audio,
formato della calibrazione e protocolli. Datasheet HR_C7000 (documenti 1 e 2), foto annotata
della scheda e schema del caricatore in [yo3hjv/Baofeng-DM32](https://github.com/yo3hjv/Baofeng-DM32)
(senza licenza: viene solo citato con un collegamento).

## Famiglie di firmware di fabbrica

| Firmware | Famiglia | Nota |
| --- | --- | --- |
| `DM32.01.*` | ROW, la più comune | Base di OpenDM32 e RadioFoundry (`DM32.01.01.049`) |
| `DM32.NRF.*` / Fanti | Taiwan, stesso ramo di `01.*` | |
| `DM32.00.*` / `UV32.*` | HR-Vocoder | RadioFoundry accetta il relativo codec (`DM32.00.01.046HRVocoder`) |

Passare da una famiglia all'altra provoca un soft-brick: ripristinare in modalità aggiornamento (PTT+SK1).
File `BFUV32-V2`: intestazione da 256 byte (`BFUV32-V2` ... `END`) seguita dall'immagine raw
collegata a `0x0300C000`. Non è cifrato né firmato.

## Passo 0: backup

Prima di installare qualsiasi firmware, copia entrambe le flash. Contengono calibrazione RX/TX e
chiave ALPU, uniche per ciascuna radio:

- `OpenUV008_Flasher_v1` di andynvkz ([infotex58, argomento 1155](http://infotex58.ru/forum/index.php?topic=1155.0)): radio spenta, premere Read e accenderla quando richiesto. Ripetere per la flash del programma e per quella dei dati.
- In alternativa, gli script Python di [rogerclarkmelbourne/DM32](https://github.com/rogerclarkmelbourne/DM32/tree/main/python).
- Anche grid.radio offre Backup/Restore dei due chip dal browser.
- Se un cavo non funziona, provare un altro chip USB-seriale (CH340, FTDI o CP2102). Secondo RadioFoundry, la ROM HR_C7000 risponde solo con FTDI.

## Installare OpenGD77 (sperimentale)

1. Eseguire il passo 0 e conservare i file in un luogo sicuro.
2. Installare OpenGD77 CPS `E2026.05.26.01` o successivo ([download sperimentali](https://www.opengd77.com/downloads/PC_CPS/Experimental/)).
3. In Radio Type selezionare **DM32/UV008** e aprire Extras > Firmware loader.
4. A radio spenta, tenere premuti **PTT + SK1** e accenderla. Il LED verde indica la modalità aggiornamento. Collegare il cavo.
5. Scegliere il firmware (riferimento: `OpenGD77_DM32_20260704.bin`) e attendere il completamento.
6. Scrivere il codeplug predefinito.
7. Per tornare al firmware di fabbrica, ripetere con il firmware Baofeng dal relativo CPS in modalità aggiornamento.

Alternativa senza installare nulla: [grid.radio](https://grid.radio/opengd77/) con Chrome o Edge
(Web Serial, senza Zadig). Fonte della procedura: [guida di xreflector.es (PDF)](https://radio.xreflector.es/wp-content/uploads/2026/07/Install-OpenGD77-on-Baofeng-DM-32_EN.pdf).

Stato secondo i gruppi (agosto-ottobre 2026): nessuna versione stabile, audio DMR basso e
vari malfunzionamenti. Copre solo la famiglia `01.*`. Autori: andynvkz (port UV008), Koshak e RA4FHE
(DM-32), Roger VK3KYY (CPS).

## Compilare il firmware: RadioFoundry

[RadioFoundry](https://github.com/RadioFoundry/RadioFoundry) è un nuovo firmware DMR aperto
(MIT, creato il 24-10-2026), con un nucleo comune e un livello specifico per radio. Non deriva dal codice
OpenGD77. Non sono ancora disponibili release: occorre compilarlo.

```text
git clone https://github.com/RadioFoundry/RadioFoundry
cd RadioFoundry
git submodule update --init
tools/build-csky-toolchain.sh            # GCC csky-elf en ~/toolchains/csky-elf (unos 45 min)
make BOARD=dm32                          # build/dm32/rfoundry_dm32.bin
tools/hrc7000_codec.py --stock DM32.01.01.049.bin   # tu firmware de fabrica: anade el codec en local
tools/serial_loader.py --model dm32 build/dm32/rfoundry_dm32_codec.bin --wrap build/dm32/rfoundry_dm32_codec_BFUV32.bin
```
| Passaggio | Dettaglio |
| --- | --- |
| Toolchain | `tools/build-csky-toolchain.sh` oppure l'immagine Docker `tools/docker/csky-toolchain/run.sh make BOARD=dm32` |
| Codec | `tools/hrc7000_codec.py` verifica il firmware di fabbrica tramite SHA-256 e copia il codec sulla tua macchina. Non viene mai caricato nel repository né condiviso. Senza codec funziona solo FM |
| Flash | `tools/serial_loader.py` comunica con il protocollo del bootloader Baofeng (YMODEM a 115200). `--wrap` crea il file `BFUV32-V2` per l'aggiornatore ufficiale. `--stock ARCHIVO` ripristina il firmware di fabbrica |
| Migrare il codeplug | Eseguire prima `tools/dm32_migrate.py all --image ... --dry-run`. Usa `dmrconf` di qdmr 0.15 |
| Sicurezza | RadioFoundry non modifica il bootloader né la flash dei dati sotto `0x700000` |
| Stato | Secondo la documentazione stessa, gli strumenti di flash e migrazione non sono stati testati su una radio. Iniziare con `--dry-run`, antenna collegata e senza trasmettere fino alla verifica |

Lista di controllo per l'avvio: [dm32-bringup.md](https://github.com/RadioFoundry/RadioFoundry/blob/main/docs/testing/dm32-bringup.md).

## Protocollo del bootloader Baofeng

Entrare premendo PTT + SK1 all'accensione (LED verde). Cavo a 115200 8N1.

| Passaggio | Host | Radio |
| --- | --- | --- |
| 1 | `52` | `06` |
| 2 | `4D 00 00 00 01` | `4D 01 09` |
| 3 | `06` | `BFUV32-V2` |
| 4 | `45 00 00 00 00` | `06` |
| 5 | `31` | `43` |
| 6 | `01` | `43` |
| 7 | `00 FF` + blocco da 128 byte (nome, NUL, dimensione in ASCII) + CRC-16/XMODEM. Cancella l'applicazione (fino a 15 s) | `06 43` |
| 8 | Per ogni KB: `02`, numero n, `FF-n`, 1024 byte, CRC | `06` |
| 9 | `04` | riavvio |

Il bootloader è separato e sopravvive a una scrittura non riuscita: se l'immagine non si avvia,
rimuovi la batteria e rientra in modalità aggiornamento.

## Altre risorse trovate

| Risorsa | Cosa offre |
| --- | --- |
| [M7OCM/DM-32UV](https://github.com/M7OCM/DM-32UV) | Archivio di CPS e firmware ufficiali; ramo Mods con firmware di fabbrica modificati (senza verifica ALPU, bande ampliate, correzione NMEA del GPS) e relativo script di patch |
| [Chicago-Offline/dm32-info](https://github.com/Chicago-Offline/dm32-info) | Specifiche, versioni firmware con SHA-256 e mappa della community |
| [gzalo/dm32-uv](https://github.com/gzalo/dm32-uv) (MIT) | Reverse engineering del bootloader e della ROM |
| [infamy/DM32-Protocol-Spec](https://github.com/infamy/DM32-Protocol-Spec) | Protocollo di programmazione del CPS |
| [chaffed/CHiRP-DM32UV-Support](https://github.com/chaffed/CHiRP-DM32UV-Support), [fivelidz/dm32uv-linux](https://github.com/fivelidz/dm32uv-linux), [insideTheFlux/dm32uv-tools](https://github.com/insideTheFlux/dm32uv-tools) | Programmazione del codeplug con CHIRP, Linux e strumenti di mappatura |
| Driver FD6818 aperti | [bf-k61-firmware-aura](https://github.com/sophiel-meow/bf-k61-firmware-aura) (GPL-3.0, Rust) |
| [jasiek/baocoder](https://github.com/jasiek/baocoder) | Codec AMBE estratto da DM-32: proprietario, **non usare** |
| [dongrat/HR_C70X0SDKlib](https://github.com/dongrat/HR_C70X0SDKlib) | Presentato come SDK per HR_C7000, ma vuoto al 26-10-2026 |
| GitFlic, GitLab, Codeberg | Nessun contenuto su DM-32 o HR_C7000 |

## Licenze e limiti

- RadioFoundry è MIT; l'attuale OpenGD77 vieta l'uso commerciale; OpenDM32 non pubblica il codice sorgente.
  Non si mescola codice con licenze incompatibili né si ridistribuiscono firmware di terzi.
- Il codec AMBE viene usato solo dopo averlo estratto dal firmware di fabbrica della propria radio.
- Calibrazione e chiave ALPU sono specifiche di ciascuna radio: non copiarle da un'altra unità.
- Trasmettere solo sulle bande autorizzate, anche se un firmware modificato lo consente.

Bricohams mantiene inoltre un dossier tecnico e uno scheletro di port per C-SKY nel
repository privato `dm32uv-opengd77-port`. Il percorso consigliato oggi è compilare RadioFoundry.