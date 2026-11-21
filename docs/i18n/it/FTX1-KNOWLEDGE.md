# Conoscenza Yaesu FTX-1: riferimento di ricerca

## Introduzione e legenda di sicurezza

Questo documento raccoglie quanto appreso da 22 repository pubblici sullo Yaesu
FTX-1 (comandi CAT, USB, memorie, firmware, hardware, satelliti e architetture
remote) e lo confronta con ciò che Bricohams fa già. È materiale di
riferimento: non sostituisce il manuale ufficiale Yaesu "CAT Operation
Reference Manual" né la guida utente `docs/AYUDA-FTX1.md`.

Dove si trovano le fonti: ogni repository è clonato senza modifiche in
`third_party/ftx1/<carpeta>`. La tabella con l'URL, il commit e la licenza di
ciascuno è in `third_party/ftx1/SOURCES.md`. Le citazioni si scrivono
`[carpeta:ruta]`, con la cartella sotto `third_party/ftx1/`. Le citazioni
`[SOURCES.md]` rimandano a `third_party/ftx1/SOURCES.md`.

Legenda di sicurezza. Queste etichette segnano righe e paragrafi:

- **ESCRIBE EN LA RADIO**: salva dati che persistono nella radio (memoria,
  menu, orologio, stato) o cambia lo stato della radio.
- **REGION/LIMITES TX**: cambia o influisce sulle bande o sulla potenza con cui
  la radio può trasmettere.
- **CALIBRACION**: tocca dati di calibrazione di fabbrica.
- **FIRMWARE**: legge, prepara o carica firmware.

Questo progetto non automatizza mai nulla di ciò che è segnato come
**REGION/LIMITES TX**, **CALIBRACION** o **FIRMWARE**. Non automatizza nemmeno
la trasmissione (PTT, CW, accordatore). Tutto ciò che è segnato **ESCRIBE EN LA
RADIO** e che lo strumento offre (memorie, menu) richiede di leggere prima, fare
la copia, simulare e verificare rileggendo.

Notazione: i comandi sono ASCII terminati da `;`. `P1` è il lato: 0 = MAIN,
1 = SUB, salvo diversa indicazione. `?;` è il rifiuto della radio. "Solo
impostazione" significa che non ha lettura né risposta. Il CAT richiede firmware
MAIN 1.08 o successivo [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]
[ew1abz-yaesu-ftx-1-memory-manipulator:doc/cat-version-diff.md]. Sono state viste
tre revisioni del manuale CAT: 2306, 2507(-B) e 2508-C
[captobie-ftx1-remote:ftx1-cat-manual-errata.md]
[ew1abz-yaesu-ftx-1-memory-manipulator:doc/cat-version-diff.md]. Il manuale
2508-C ha 89 famiglie di comandi nell'indice (90 con `EO`, che compare solo
nella tabella di dettaglio) e 580 righe di dettaglio, 427 delle quali di `EX`
[rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md].

Nessun repository studiato contiene codice che scriva firmware, cambi regione o
limiti di TX (salvo lo strumento di regione della sezione 5 e i menu di potenza
`PC`/`EX`), né che scriva la calibrazione. Del firmware si legge solo la
versione con `VE`.

## Riferimento dei comandi CAT

I disaccordi tra le fonti e gli errata del manuale sono conservati nella
colonna Note. Le righe con **ESCRIBE EN LA RADIO** cambiano dati che
persistono. Quelle di TX (`TX`, `MX`, `KY`) e di avvio dell'accordatore (`AC`)
attivano il trasmettitore: questo progetto non le usa.

| Comando | Impostazione | Lettura | Risposta | Parametri | Note | Fonti |
|---|---|---|---|---|---|---|
| AB | `AB;` | - | - | Copia MAIN su SUB | Solo impostazione. Rigplane lo chiama "M=S equalize"; non è un'operazione VFO A/B | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] [rigplane-rigplane-core:rigs/ftx1.toml] |
| AC | `AC P1 P2 P3;` | `AC;` | `AC P1 P2 P3;` | P1 0 interno/1 esterno; P2 0 ATU, 2 ATAS; P3 0 OFF, 1 ON, 3 START (2 riservato) | P3=3 avvia l'accordatore e **trasmette**. Verificato su radio: P1=0 non fa nulla su una Optima, P1=1 funziona. Forme: interno `AC003;`/`AC000;`, esterno `AC103;`/`AC100;`, ATAS `AC123;`/`AC120;`; ATAS rifiuta tutto ciò che non sia `AC12x`; `AC;` può restare diverso da zero al termine (si sorveglia PO); antenna `EX030704;`, tipo di accordatore `EX030701;`/`EX030702;`. **ESCRIBE EN LA RADIO** (stato) | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| AG | `AG P1 nnn;` | `AG P1;` | `AG P1 nnn;` | Guadagno AF, 3 cifre, 000-255 | Usato da gnfrazier, rigplane, WebUI, iTracMan e SEM | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Vfo.cs] |
| AI | `AI0;`/`AI1;` | `AI;` | `AI s;` | Informazione automatica OFF/ON | Nessuna fonte descrive il formato dei messaggi non richiesti; le app fanno polling invece di dipendere da AI. Vedi sezione 3 | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] |
| AM | `AM;` | - | - | Salva lo stato del VFO-A MAIN nel canale di memoria selezionato (senza argomento di canale) | Solo impostazione. Salva tono/CTCSS, modo e shift (MW no). **ESCRIBE EN LA RADIO** | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| AO | lettura/impostazione | sì | - | Livello di uscita AMC 001-100 (ITM: `AOnnn`) | Non implementato in rigplane | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| BA | `BA;` | - | - | Copia SUB su MAIN | Solo impostazione | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] |
| BC | `BC P1 s;` | `BC P1;` | `BC P1 s;` | Auto notch (DNF) OFF/ON per lato | Forma SUB provata al banco | [rigplane-rigplane-core:rigs/ftx1.toml] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] |
| BD | `BD P1;` | - | - | Banda giù | Nessuna risposta. Rigplane invia `BD0;`; WebUI e POK `BDv;` | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| BI | `BI s;` | `BI;` | `BI s;` | Break-in OFF/ON | EUG legge lo stato all'offset 2 | [rigplane-rigplane-core:rigs/ftx1.toml] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java] |
| BM | `BM;` | - | - | Salva lo stato del VFO-B SUB nella memoria selezionata | Solo impostazione. Salva il VFO SUB reale (può corrompere il canale, p. es. bloccato a 144 MHz). **ESCRIBE EN LA RADIO** | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] |
| BP | `BP P1 P2 nnn;` | `BP P1 P2;` | `BP P1 P2 nnn;` | Notch manuale. P2=0: stato 000/001; P2=1: frequenza 001-320 (x10 Hz = 10-3200 Hz) | Il manuale non ha un comando per la larghezza del notch. La risposta può non essere numerica (`BP01F35;`) nei modi senza notch (FM). Forma SUB `BP10`/`BP11` | [bg7nzl-ftx1ctl:ftx1cat.py] [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| BS | `BS P1 nn;` | la lettura dà `?;` | - | Selezione di banda, nn 00-14 (gnfrazier: 5=14 MHz, 6=18, 7=21, 8=24.5, 9=28, 10=50 MHz) | Solo scrittura. **Disaccordo**: PR2EM, ITM, POK e RZO lo usano; le note di WebUI dicono che la radio (e il suo mock) lo rifiutano. PR2EM: la banda degli 11 m non ha codice e invia `FA027555000;` + `MD02;`. RZO usa `BS113` | [rigplane-rigplane-core:rigs/ftx1.toml] [gnfrazier-ftxcat:ftxcontrol.py] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] [rzochowski-cat-ftx1:cat-presets.json] |
| BU | `BU P1;` | - | - | Banda su | Nessuna risposta | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] |
| CF | `CF P1 0 0 rx tx 000;` (clarifier on/off); `CF P1 0 1 +/-nnnn;` (offset) | `CF P1 00;` / `CF P1 01;` (rigplane `CF000;`/`CF001;`) | `CF P1 0 P3 ...;` (11 caratteri) | P3 0 = impostazione CLAR, 1 = frequenza CLAR; offset +/-0000-9999 Hz (la doc di gnfrazier dice +/-9995; ew1abz-memory +/-9990 nelle memorie) | ew1abz-control usa le stesse due forme | [gnfrazier-ftxcat:ftxcontrol.py] [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs] [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Vfo.cs] |
| CH | impostazione | - | - | Canale di memoria su/giù | Non implementato in rigplane; POK lo usa | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [pokibon3-FTX1Controller:js/ftx1.js] |
| CN | `CN P1 P2 ppp;` | `CN P1 P2;` | `CN P1 P2 ppp;` | P2 0 = CTCSS (ppp 000-049, indice di una tabella di 50 toni), 1 = DCS (000-103, 104 codici) | Indice: 00=67.0 ... 12=100.0 ... 49=254.1 Hz (tabella completa in fritzsche). MW ignora CN; impostare CN prima di AM. Rigplane implementa solo CTCSS | [fritzsche-yaesu-ftx1:cat_format.md] [rigplane-rigplane-core:rigs/ftx1.toml] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] |
| CO | `CO P1 P2 nnnn;` | `CO P1 P2;` | `CO P1 P2 nnnn;` | P2 0 = contour on/off, 1 = frequenza contour, 2 = APF on/off, 3 = frequenza APF | Rigplane usa `CO00/CO02/CO03`. EUG usa `CO02;`/`CO020000;`/`CO020001;` come interruttore APF | [rigplane-rigplane-core:rigs/ftx1.toml] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java] |
| CS | `CS s;` | `CS;` | `CS s;` | Spot CW | | [rigplane-rigplane-core:rigs/ftx1.toml] |
| CT | `CT P1 P2;` | `CT P1;` | `CT P1 P2;` (la radio reale risponde P2 di una cifra) | P2 0 OFF, 1 TONE (ENC on/DEC off), 2 TSQL (ENC+DEC), 3 DCS, 4 PR FREQ, 5 REV TONE | **Differisce dai codici 1 e 2 di P8 in MW/MR (scambiati)**, vedi sezione 4 | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] [rigplane-rigplane-core:rigs/ftx1.toml] |
| DA | lettura/impostazione | `DA;` | - | Contrasto 00-20 e luminosità TFT/LED 00-20. L'impostazione è combinata (`DA00` + tre valori di 2 cifre): bisogna leggere e unire prima | Intenzionalmente non pubblico in rigplane. captobie lo elenca tra i comandi usati | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [captobie-ftx1-remote:CLAUDE.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| DN | impostazione | - | - | MIC DOWN | I titoli dell'indice e del dettaglio differiscono | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [captobie-ftx1-remote:ftx1-cat-manual-errata.md] |
| DT | `DT0 yyyymmdd;` / `DT1 hhmmss;` | lettura | - | Data e ora | Non implementato in rigplane. **ESCRIBE EN LA RADIO** (orologio) | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [Semyonic-ftx1-programmer:src/cat/commands.ts] |
| EO | impostazione | - | - | Encoder offset, 6 selettori (MAIN/SUB/entrambi x manopola principale/FUNC, +/-, Hz/kHz/MHz) | Ha pagina di dettaglio ma nessuna voce nell'indice | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [captobie-ftx1-remote:ftx1-cat-manual-errata.md] |
| EX | `EX P1P2P3 P4;` (indirizzo di menu + valore) | `EX P1P2P3;` | `EX P1P2P3 P4;` | 427 indirizzi di menu; la larghezza di P4 varia secondo la voce. Noti: `EX010413` MOD SOURCE DATA, `EX010113` SSB, `EX010514/15` mark/shift RTTY, `EX010417` tono PSK di DATA, `EX0202 05+n` tipo di memoria CW, `EX020203` CW weight, `EX060103` APRS AF MUTE, `EX030204` SCAN RESUME, `EX050201` MY POSITION latitudine, `EX030604/05/06` CH-STEP per modo | **ESCRIBE EN LA RADIO** (menu). Errata verificati su radio: `EX020203` P4 è lo scostamento rispetto a 2.5 in passi di 0.1 (00=2.5, 20=4.5); `EX040107` AUTO POWER OFF 2 cifre, 00=OFF, 01-24 = 0.5-12 h; `EX010322` DCS CODE richiede 3 cifre 000-103; `EX030503` HF MAX POWER massimo 100 W interi (**REGION/LIMITES TX**); `EX030504` 50M MAX POWER 005-100 (sospettato); il blocco `EX05xx` colloca MY POSITION in P2=02 e SD CARD, SOFT VERSION, **CALIBRACION** e RESET in P2=03-06; `EX050109` risponde `?;`. Solo sospettate: incoerenze tra gli intervalli P1/P3 del manuale e la Tabella 3 (OS, RPT SHIFT, SPEED UNIT, WIND UNIT, ANT2, RF-SQL VR, TUN-LIN, MOD SOURCE, elenco MIC, FM DIAL STEP, conteggio DTMF). Scrivere EX direttamente può cambiare velocità CAT, bit di stop, timeout o porta TUN/LIN (il ripristino di PR2EM li omette). SEM abbina la risposta all'indirizzo di 8 caratteri. Le voci di azione del catalogo (CALIBRACION, RESET) non vengono mai inviate | [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [captobie-ftx1-remote:ftx1-cat-manual-errata.md] [captobie-ftx1-remote:CLAUDE.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/menu.py] [Semyonic-ftx1-programmer:src/cat/transport.ts] [pokibon3-FTX1Controller:js/exmenu.js] |
| EX01 (audio) | `EX01` + categoria 01-05 + parametro 01-03 + valore di 2 cifre con segno | lettura | - | Equalizzatore AF per modo: alti/medi/bassi da -20 a +10 | È un uso concreto di `EX`. **ESCRIBE EN LA RADIO** | [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| FA | `FA fffffffff;` | `FA;` | `FA fffffffff;` | Frequenza MAIN, 9 cifre in Hz. ITM limita l'impostazione a 30 kHz-470 MHz; RX di fabbrica 30 kHz-174 MHz e 400-470 MHz | Usato da gnfrazier, bg7nzl, ew1abz-*, PR2EM e WebUI. FB/f Sub non è affidabile con MAIN su un canale dei 6 m (captobie). PR2EM rilegge `FA;` dopo l'impostazione | [fritzsche-yaesu-ftx1:cat_format.md] [gnfrazier-ftxcat:ftxcontrol.py] [bg7nzl-ftx1ctl:ftx1cat.py] [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs] [captobie-ftx1-remote:CLAUDE.md] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.cs] |
| FB | `FB fffffffff;` | `FB;` | `FB fffffffff;` | Frequenza SUB, 9 cifre | Con split `ST1`, FB diventa il VFO di TX, nel modo di MAIN. In Look4Sat: FA = downlink (RX), FB = uplink (TX) | [gnfrazier-ftxcat:ftxcontrol.py] [captobie-ftx1-remote:CLAUDE.md] [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt] |
| FD | non documentato | - | non richiesto | Il primo parametro è il lato dello scope | Messaggio non richiesto che scatena richieste `SS` (secondo un commento di RZO) | [rzochowski-cat-ftx1:serial-server.mjs] |
| FN | lettura/impostazione | sì | `FN;`/`FN d;` | Fine tuning OFF/ON/Fast | Non implementato in rigplane. POK lo usa come assegnazione FUNC | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Vfo.cs] [pokibon3-FTX1Controller:js/ftx1.js] |
| FR | `FR nn;` | `FR;` | `FR nn;` | 00 = ricezione dual, 01 = ricezione singola (POK: `FR0v;`) | Stato della funzione del ricevitore | [captobie-ftx1-remote:CLAUDE.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| FS | (FT-991A) | - | - | Solo nel profilo FT-991A di POK | Non è dell'FTX-1 | [pokibon3-FTX1Controller:js/ft991a.js] |
| FT | `FT v;` | `FT;` | `FT v;` | Seleziona il trasmettitore MAIN/SUB (0/1) | Non dà il permesso di trasmettere. `SC<lado>1` sposta VS/FT. In Look4Sat, scegliere SUB non attiva il PTT | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] [captobie-ftx1-remote:CLAUDE.md] [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt] |
| GP | lettura/impostazione | sì | - | Quattro uscite CMOS a 5 V LOW/HIGH | Non pubblico in rigplane. **ESCRIBE EN LA RADIO** (uscite fisiche) | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| GT | `GT P1 P2;` | `GT P1;` | `GT P1 P3;` | Impostazione P2: 0 OFF, 1 FAST, 2 MID, 3 SLOW, 4 AUTO. Risposta P3: 0 OFF, 1 FAST, 2 MID, 3 SLOW, 4 AUTO-FAST, 5 AUTO-MID, 6 AUTO-SLOW | L'impostazione e la risposta usano codifiche diverse (manuale); le risposte 4/5/6 significano AUTO. `GT0` senza risposta in C4FM | [bg7nzl-ftx1ctl:ftx1cat.py] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| ID | - | `ID;` | `ID0840;` | ID fisso del modello 0840 | Validato da ew1abz-*, rigplane e RZO. POK cita `0800` come ID vecchio in un commento; il suo profilo FT-991A usa `0570`/`0670` | [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs] [rigplane-rigplane-core:rigs/ftx1.toml] [gnfrazier-ftxcat:ftxcontrol.py] [rzochowski-cat-ftx1:serial-server.mjs] [pokibon3-FTX1Controller:js/ftx1.js] |
| IF | - | `IF;` | `IF` + canale(5) + frequenza(9) + segno clar(1) + clar(4) + RX clar(1) + TX clar(1) + modo(1) + VFO/mem(1) + tono(1) + `00` + shift(1) + `;` (30 caratteri) | Stato composto di MAIN; stesso formato di MR | La radio da banco ha risposto shift `3` (la sezione IF del manuale non lo documenta; OS documenta 3 = ARS). Non c'è un campo per PTT né per split | [rigplane-rigplane-core:rigs/ftx1.toml] [gnfrazier-ftxcat:ftxcontrol.py] [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] |
| IS | `IS P1 0 +/-nnnn;` | `IS P1;` | `IS P1 0 +/-nnnn;` | IF shift +/-0000-1200 Hz a passi di 20 | Stranezza: P2 deve essere `0`; l'`1` di Hamlib è stato rifiutato dalla radio | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| KM | `KM n texto;` | `KM n;` | - | Memoria del tasto 1-5, fino a 50 caratteri | La radio aggiunge `}` da sé; più di 50 dà `?;`; `KM<n>;` è una lettura (non si può svuotare uno slot). Caratteri A-Z 0-9 `/ ? , . = + - ( ) @ :`; prosign `=` BT, `+` AR, `(` KN. SEM: il testo non può contenere `}` né `;`. **ESCRIBE EN LA RADIO**. Indice e dettaglio con titoli diversi | [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [rigplane-rigplane-core:rigs/ftx1.toml] [Semyonic-ftx1-programmer:src/cat/commands.ts] |
| KP | `KP nn;` | `KP;` | `KP nn;` | Indice del tono CW, 2 cifre 00-75 = 300 + 10n Hz | | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| KR | lettura/impostazione | sì | - | Keyer CW OFF/ON (`KR0/1`) | gnfrazier ha `set_cw_keyer` (stringa non individuata) | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| KS | `KS nnn;` | `KS;` | `KS nnn;` | Velocità CW in WPM, 3 cifre, 4-60 | | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| KY | `KY P1 P2;` | - | - | P1 0 = memoria CW TEXT, 1 = memoria CW MESSAGE; P2 1-5 riproduce, 0 ferma (`KY00` ferma) | **Trasmette** se BK-IN è attivo; un secondo KY riavvia il messaggio. Non esiste una forma di KY con testo libero: il CW digitato è KM nello slot 5 e poi KY. EUG usa `KY ` + testo in maiuscolo + `;` | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/EcranComenzi.java] |
| LK | `LK s;` | `LK;` | `LK s;` | Blocco pannello/manopola OFF/ON | | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [rzochowski-cat-ftx1:serial-server.mjs] |
| LM | lettura/impostazione | sì | - | Registrazione/caricamento di messaggi vocali, canale/stato. `LM0;` seleziona lo slot (arma la registrazione); `LM1` registra sulla SD | Stranezza: `LM1` registra l'audio RX sulla SD della radio, non è riproduzione. **ESCRIBE EN LA RADIO** | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| MA | `MA;` | - | - | Memoria (scelta con MC) su VFO MAIN | Solo impostazione. Carica solo la frequenza (fritzsche: non i toni) | [fritzsche-yaesu-ftx1:cat_format.md] [gnfrazier-ftxcat:ftxcontrol.py] |
| MB | `MB;` | - | - | Memoria su VFO SUB | Carica un buffer di schermo, non il VFO-B SUB reale (ew1abz) | [gnfrazier-ftxcat:ftxcontrol.py] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] |
| MC | `MC P1 ccccc;` | 2508-C: `MC P1;` (2507-B: `MC;`) | `MC P1 ccccc;` | P1 lato; canale 00001-00999 (anche P-nnL/U, 5 MHz, EMGCH) | Fritzsche chiama MC "a 6 cifre" (lato + 5). Il manuale dice 00001-00099 in MC e 00001-00999 in MR/MW/MZ; verificato su radio 1-999. Non si può scegliere uno slot vuoto (conserva il precedente senza avviso). `MC0` prima di `VM011`. Secondo fritzsche è solo impostazione (senza risposta) | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/cat-version-diff.md] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [gnfrazier-ftxcat:ftxcontrol.py] |
| MD | `MD P1 m;` | `MD P1;` | `MD P1 m;` | Modi: 0 = WFM (ew1abz) / "LSB o FM" (fritzsche), 1 LSB, 2 USB, 3 CW-U, 4 FM, 5 AM, 6 RTTY-L, 7 CW-L, 8 DATA-L, 9 RTTY-U, A DATA-FM, B FM-N, C DATA-U, D AM-N, E PSK, F DATA-FM-N, H C4FM-DN, I C4FM-VW | **Disaccordo su `0`**: ew1abz dice WFM e fritzsche "LSB (o FM su alcuni modelli)". L'elenco di fritzsche omette E e I; bg7nzl e ew1abz li includono. In C4FM `MD` risponde `H`; il manuale elenca anche `I`. ITM legge il codice `0` come sentinella AMS, non come guasto (nessun comando CAT per scegliere AMS). La radio lo rifiuta durante TX (banco di rigplane) | [gnfrazier-ftxcat:ftxcontrol.py] [bg7nzl-ftx1ctl:ftx1cat.py] [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:tests/FTX1WinController.Tests/CatCommandsTests.cs] [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt] |
| MG | `MG nnn;` | `MG;` | `MG nnn;` | Guadagno del microfono, 3 cifre (ITM 0-100) | | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:CLAUDE.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| ML | `ML P1 ...;` | `ML P1;` | - | Monitor: stato (P1=0) / livello 000-100 (P1=1; WebUI `ML0nnn`) | **Conflitto**: il manuale lo documenta; la radio viva di rigplane risponde `?;` e dice che si controlla dal menu EX | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] |
| MR | - | `MR ccccc;` | `MR` + ccccc + freq(9) + segno clar(1) + clar(4) + RX clar + TX clar + modo + tipo + tono + `00` + shift + `;` (27 byte di parametri, 30 caratteri) | Legge un canale senza selezionarlo | Vedi sezione 4. Canale vuoto dà `?;`. `MR00000` in modo Memoria restituisce il canale attivo, non il VFO | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs] [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] |
| MS | lettura/impostazione | sì | - | Selettore del misuratore MAIN/SUB 0-5 (`MS<main><sub>;`) | Selezione del misuratore del pannello; rigplane ha visto `MS35;` selezionare VDD. Non pubblico | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.cs] |
| MT | `MT ccccc tag12;` | `MT ccccc;` | `MT ccccc tag12;` (17 caratteri di parametri) | Nome di 12 caratteri riempito con spazi; ASCII 0x20-0x7D senza `;` | **ESCRIBE EN LA RADIO**. Canale vuoto dà `?;` | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs] [Semyonic-ftx1-programmer:src/cat/commands.ts] |
| MW | `MW` + registro di 27 caratteri (vedi MR) + `;` | nessuna (solo impostazione) | - | Crea o sovrascrive un canale | **ESCRIBE EN LA RADIO**. P9 (`00`) deve essere `00` o dà `?;`. NON salva il tono (torna al codice 12 / 100.0 Hz). La posizione 17 deve essere `+`/`-` (`S` non vale; fritzsche). La tabella di dettaglio del manuale omette lettura/risposta | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] |
| MX | `MX P1;` | `MX;` | `MX0;`/`MX1;` | MOX OFF/ON | Azione di TX; la usa bg7nzl. Rigplane la protegge con autorità di TX gestita | [bg7nzl-ftx1ctl:ftx1cat.py] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] |
| MZ | `MZ ccccc s fffffffff;` | `MZ ccccc;` | `MZ ccccc s fffffffff;` (15 caratteri) | s 0 = split off, 1 = on; frequenza di TX in 9 cifre Hz | **ESCRIBE EN LA RADIO**. Registro di memoria split; si scrive dopo AM | [ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md] [Semyonic-ftx1-programmer:src/cat/commands.ts] |
| NA | `NA P1 s;` | `NA P1;` | `NA P1 s;` | Narrow OFF/ON (captobie: P1 0 = MAIN, 1 = SUB) | `SH` non cambia con NAR in SSB/CW/RTTY/DATA (la larghezza reale è il preset del menu NAR WIDTH) | [gnfrazier-ftxcat:ftxcontrol.py] [captobie-ftx1-remote:CLAUDE.md] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] |
| NL | `NL P1 nnn;` | `NL P1;` | `NL P1 nnn;` | Livello del noise blanker OFF/001-010 (scritto con 3 cifre; PR2EM e WebUI `NL0nnn;`) | | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] |
| OI | - | `OI;` | stesso formato di IF | Stato composto di SUB (banda opposta) | Lo usa ew1abz-control per la frequenza SUB | [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| OS | `OS P1 d;` | `OS P1;` | `OS P1 d;` | d 0 Simplex, 1 Plus, 2 Minus, 3 ARS | **Solo modo FM** (ignorato senza avviso negli altri). Errata: l'ordine della pagina OS e quello della Tabella 3 differiscono (Tabella 3: 0 -, 1 simplex, 2 +, 3 ARS); l'app segue la pagina OS. Solo direzione; lo shift è un valore del menu EX | [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:ftx1-cat-manual-errata.md] |
| PA | `PA P1 P2;` | `PA P1;` | `PA P1 P2;` | P1 0 = HF/50 MHz, 1 = VHF, 2 = UHF. HF/50: 0 IPO, 1 AMP1, 2 AMP2. VHF/UHF: 0 OFF, 1 ON | Per gruppo di banda, non per canale | [bg7nzl-ftx1ctl:ftx1cat.py] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] |
| PB | lettura/impostazione | sì | - | Riproduzione/stop di messaggio vocale (`PB0<ranura>;`, `PB00;` ferma; ITM slot 0-5) | **Trasmette** se si riproduce con TX attivo | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/EcranComenzi.java] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| PC | `PC P1 nnn;` | `PC;` | `PC P1 nnn;` | P1 1 = testa da campo (manuale 005-010 W), 2 = SPA-1 (005-100 W) | **REGION/LIMITES TX**. **Disaccordo**: bg7nzl (banco): la testa accetta 001-010 W; rigplane: `PC2000;` dà `?;`, minimo 5 W con SPA-1. gnfrazier: 5-10 W da campo, 5-100 W con SPA-1, con un TODO sui decimi di watt; WebUI accetta frazionari (`PC10.5;`) e sonda se >6 W viene rifiutato per dedurre la batteria. ITM scopre la testa attiva dalla risposta. Errata: il limite HF MAX POWER è di `EX`, 100 W interi | [bg7nzl-ftx1ctl:ftx1cat.py] [rigplane-rigplane-core:rigs/ftx1.toml] [gnfrazier-ftxcat:README.md] [gnfrazier-ftxcat:ftxcontrol.py] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| PL | `PL nnn;` | `PL;` | `PL nnn;` | Livello del processore vocale 0-100 (traccia reale `PL003;`) | | [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| PR | `PR P1 s;` | `PR P1;` | `PR P1 s;` | P1 0 = processore vocale, 1 = equalizzatore parametrico del mic; s OFF/ON | **Errata (verificata su radio)**: il manuale dice 1 = OFF, 2 = ON; la radio usa 0 = OFF, 1 = ON (ITM: la lettura accetta `0` o `2` come off) | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [iTracMan-FTX1WinController:tests/FTX1WinController.Tests/CatCommandsTests.cs] |
| PS | `PS s;` | `PS;` | `PS s;` | Accensione/spegnimento | `PS0;` spegne la radio. EUG lo invia all'uscita dall'app; SEM lo richiede "armato". **ESCRIBE EN LA RADIO** (stato) | [rigplane-rigplane-core:rigs/ftx1.toml] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/MainActivity.java] [Semyonic-ftx1-programmer:src/cat/commands.ts] |
| QI | `QI;` | - | - | Salva QMB | Solo impostazione. **ESCRIBE EN LA RADIO** | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Vfo.cs] |
| QR | `QR;` | - | - | Richiama QMB | Solo impostazione. ITM ha una guardia contro le race condition nel richiamo | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/RadioController.Vfo.cs] |
| QS | `QS;` | - | - | Split rapido | Solo POK | [pokibon3-FTX1Controller:js/ftx1.js] |
| RA | `RA P1 s;` | `RA P1;` | `RA P1 s;` | Attenuatore RF (12 dB secondo WebUI) | Rifiutato (`?;`) con MAIN a 461.550 MHz in una prova al banco | [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] |
| RC | `RC;` | - | - | `reset_clarifier` di rigplane | **Non documentato in 2508-C** (solo provenienza del profilo) | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] |
| RG | `RG P1 nnn;` | `RG P1;` | `RG P1 nnn;` | Guadagno RF 000-255 | | [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| RI | - | `RI P1;` | stato radio di 8 campi | `RI0` (P7 stato dello scan, P8 squelch); `RI1` risponde `?;`. PR2EM: 7 caratteri (HI-SWR[0], rec[1], TX[2], tuning[4], scan[5], busy[6]) | Il tuner-sweep lo usa per rilevare l'accordatore (cifra 6) | [captobie-ftx1-remote:CLAUDE.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |
| RL | `RL P1 nn;` | `RL P1;` | `RL P1 nn;` | Livello DNR OFF/01-10 (EUG: forma `RL000;`) | | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java] |
| RM | - | `RM P1;` | `RM P1 nnn 000;` (rigplane: `RM{tipo}{main:03d}{sub:03d}`) | Misuratori P1 1..8: 1 S-MAIN, 2 S-SUB, 3 COMP, 4 ALC, 5 PO, 6 SWR, 7 IDD, 8 VDD; valore 000-255 | Grezzo, non calibrato. bg7nzl (solo nel software del PC; nulla viene scritto nella radio, **CALIBRACION** lato host): VDD ~ grezzo*13.8/203, IDD grezzo*3/255, COMP grezzo*30/255 dB, ALC grezzo*200/252 %, SWR 1+0.333(e^(0.0151 grezzo)-1), PO lineare a tratti fino a 15 W. Rigplane: grezzo 210 ~ 13.8 V (banco). L'indice dice RM Set=X ma il dettaglio mostra una riga `P1=0`. RZO nota disposizioni di uno o due valori. EUG legge `RM8;` ogni 5 s per dedurre testa da 6 W o 10 W | [bg7nzl-ftx1ctl:ftx1cat.py] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java] |
| SC | `SC P1 m;` | `SC;` restituisce l'ultimo comando (p. es. `SC11;`) | - | Scan: m 0 OFF, 1 UP, 2 DOWN | `SC0;`/`SC1;` come lettura dà `?;`. Qualsiasi stop ferma entrambi gli scan. `SC<lado>1` sposta VS/FT su quel lato | [gnfrazier-ftxcat:ftxcontrol.py] [captobie-ftx1-remote:CLAUDE.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| SD | `SD nnnn;` | `SD;` | `SD nnnn;` | Ritardo di break-in (ms); indice di 2 cifre: 0-5 = 30/50/100/150/200/250 ms e poi passi di 100 ms (6-33 fino a 3000 ms) | `VD` usa la stessa tabella 00-33 | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| SF | lettura/impostazione | sì | - | Assegnazione della manopola FUNC (`SF0<perilla>;`) | Solo del pannello frontale; RZO e POK la usano | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [rzochowski-cat-ftx1:serial-server.mjs] [pokibon3-FTX1Controller:js/ftx1.js] |
| SH | `SH P1 0 nn;` (gnfrazier) / `SH P1 nnn;` (rigplane) | `SH P1;` | `SH P1 nnn;` | Codice di larghezza del filtro | **Disaccordo** nella stringa di impostazione: gnfrazier `SH{lado}0{codigo:02d}`; rigplane `SH{rx}{codigo:03d}` (stesse cifre). WebUI `SH00nn;` legge 2 caratteri agli offset 2-3 | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] |
| SM | - | `SM P1;` | `SM P1 nnn;` | S-meter (0-255) | La richiesta SUB restituisce sempre il lato 0 (`SM1;` senza risposta utile; RZO usa la cifra VFO del comando in coda) | [rigplane-rigplane-core:rigs/ftx1.toml] [gnfrazier-ftxcat:ftxcontrol.py] [rzochowski-cat-ftx1:serial-server.mjs] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| SQ | `SQ P1 nnn;` | `SQ P1;` | `SQ P1 nnn;` | Squelch | **Disaccordo**: WebUI dice 000-100; ITM e SEM 0-255 | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| SS | lettura/impostazione | sì | - | Impostazioni dello scope, 7 selettori (velocità/picco/marker/colore/livello/span/modo). `SS04+/-dd.d;` D-LEVEL; `SS01` D-PEAK (cifra +1); `SS02` marker; `SS03` colore (cifra hex +1, colori 1-11 = `0-9,A`) | RZO interroga all'avvio `SS04 SS05 SS00 SS03 SS06`. PR2EM-A: cursore -60..60 a mezzi passi. Non implementato in rigplane | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] [rzochowski-cat-ftx1:serial-server.mjs] |
| ST | `ST s;` | `ST;` | `ST s;` | Split OFF/ON | `ST1` spegne il doppio display (`FR01`). WebUI annota che `ST` è nella sua lista di rifiuti del mock e non lo usa; Look4Sat invia `ST1;`/`ST0;` senza analizzare la risposta | [gnfrazier-ftxcat:ftxcontrol.py] [captobie-ftx1-remote:CLAUDE.md] [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt] [git-jcw-FTX-1-WebUI:js/cat/mock-radio.js] |
| SV | `SV;` | - | - | Scambia MAIN/SUB | Solo impostazione. Non serve in modo VFO/Memoria. In captobie sposta solo la mappa audio in ricezione dual | [fritzsche-yaesu-ftx1:cat_format.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] |
| TS | lettura/impostazione | sì | - | TXW (sorveglianza di TX) OFF/ON | Trattenuto: efficace solo con Split attivo, ma la radio fa eco con Split spento. Protetto da TX gestito in rigplane | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| TX | `TX0;`/`TX1;` | `TX;` | `TX0` RX, `TX1` TX via CAT, `TX2` TX dalla radio (pannello/mic/VOX) | PTT | gnfrazier legge `TX2` come "in trasmissione". L'impostazione accetta solo 0/1 (captobie). Hamlib `t` dà 3 per TX2 | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:CLAUDE.md] |
| UP | impostazione | - | - | MIC UP | | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| VD | lettura/impostazione | sì | - | Ritardo VOX, tabella 00-33, passi di 100 ms (per MIC/USB/BLUETOOTH) | Non pubblico in rigplane | [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| VE | - | `VE P1;` | versione in BCD | P1 0 MAIN, 1 DISPLAY, 2 SDR, 3 DSP, 4 SPA-1, 5 FC-80 | **FIRMWARE**: solo lettura; nulla viene scritto. Le CPU non disponibili vengono omesse o rispondono vuoto | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/transport.py] |
| VG | lettura/impostazione | sì | - | Guadagno VOX 000-100 | Non pubblico in rigplane | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| VM | `VM P1 pp;` | `VM P1;` | `VM P1 pp;` | pp 00 VFO, 10 MT, 11 Memory, 20 PMS, 21 P-01L..P-50U, 51 banda dei 5 MHz, 91 EMG. fritzsche: `VM000;` VFO; `VM;` memoria | **Disaccordo**: fritzsche documenta `VM;` come "passare a memoria"; ew1abz usa `VM011;`. `VM011` fallisce in silenzio a meno che si scriva `MC0` subito prima. Il manuale elenca `VM` due volte (la prima voce di dettaglio copia AM) | [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] [fritzsche-yaesu-ftx1:cat_format.md] [captobie-ftx1-remote:ftx1-cat-manual-errata.md] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] |
| VS | `VS v;` | `VS;` | `VS v;` | Seleziona la coppia TX/RX MAIN/SUB | Look4Sat lo usa con `FT1;` per scegliere SUB come TX | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:CLAUDE.md] [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt] |
| VX | `VX s;` | `VX;` | `VX s;` | VOX OFF/ON | | [rigplane-rigplane-core:rigs/ftx1.toml] |
| ZI | impostazione | - | - | Zero-in automatico CW per lato (`ZI0;`) | Non implementato in rigplane | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/EcranComenzi.java] |

Altri fatti sul CAT:

- Non esiste un comando CAT per D-COLOR, DG-ID TX/RX, HRI MODE, richiamare o
  leggere i canali HOME, MAG né le impostazioni di WIRES-X
  [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md].
- Non c'è un comando documentato per cancellare un canale di memoria
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md]. La
  potenza per canale non è programmabile via CAT
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md].
- Non c'è un comando di tracking MAIN/SUB in 2508-C
  [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md].
- **Disaccordo** non riconciliato: il profilo di rigplane usa l'id di modello
  Hamlib 2028 [rigplane-rigplane-core:rigs/ftx1.toml]; captobie usa il 1051,
  presente per la prima volta in Hamlib 4.7 [captobie-ftx1-remote:CLAUDE.md].
- Errata solo sospettati (non verificati): refusi "mesc", "SYNBOL", "Bycycle" e
  "LONGTUDE"; la posizione del connettore USB è incoerente; il manuale CAT non
  menziona l'audio USB
  [captobie-ftx1-remote:ftx1-cat-manual-errata.md]
  [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md].
- Comandi nascosti o speciali non documentati (SPR/SPW e altri) sono fuori da
  questa tabella di proposito; vedi la sezione 5.

## Interfacce USB, seriali e audio

**Porte (UART dual CP210x)**

- Il connettore USB-C espone un hub interno: UART dual Silicon Labs CP2105 (VID
  10C4 PID EA70; la seconda funzione seriale compare come 26AA:0030) e un codec
  audio USB (VID 0D8C PID 0016)
  [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:CLAUDE.md].
- Enhanced COM Port = CAT-1 (comandi CAT). Standard COM Port = CAT-2 (PTT, CW,
  DATA o CAT secondario)
  [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]
  [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md].
- Driver: Silicon Labs Dual CP210x USB to UART Bridge; Windows mostra
  "Enhanced COM Port (COMx)" e "Standard COM Port (COMy)". Linux
  `/dev/ttyUSB0`/`ttyUSB1`; macOS `/dev/tty.SLAB_USBtoUART`; su Pi, per id,
  `...CP2105...-if00-port0` è il CAT e l'interfaccia 1 è la porta di
  manipolazione
  [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]
  [captobie-ftx1-remote:Pi/README.md].
- bg7nzl sceglie solo "Enhanced COM Port" per il CAT e "Standard COM Port" per
  il PTT (porte predefinite nel codice COM11/COM12)
  [bg7nzl-ftx1ctl:docs/user_manual_en.md] [bg7nzl-ftx1ctl:ftx1cat.py].
- CAT-3 è la UART posteriore TUNER/LINEAR; non serve per l'USB ed è meglio
  lasciare `TUN/LIN PORT SELECT` al valore predefinito
  [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/cat-version-diff.md].
- WSL2: `usbipd bind/attach` del CP2105 (10c4:ea70) lo rende inutilizzabile su
  Windows [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]. Su Linux
  bisogna aggiungere l'utente al gruppo `dialout` [gnfrazier-ftxcat:faq.md].
- Una Pi in sottotensione fa cadere l'hub USB della radio. `cp210x ttyUSB...: failed set request` ferma la manipolazione del CW
  [captobie-ftx1-remote:CLAUDE.md] [captobie-ftx1-remote:Pi/README.md].
- I servizi audio falliscono con "Device or resource busy" se un altro client
  occupa la scheda audio [captobie-ftx1-remote:Pi/README.md].

**Velocità e formato del frame**

- Opzioni di CAT-1 RATE: 4800, 9600, 19200, 38400, 115200; di fabbrica 38400;
  ogni PRESET (5) ha il proprio CAT-1 RATE
  [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md].
- Predefinito 38400 8N1 in gnfrazier, bg7nzl, ew1abz-control,
  ew1abz-memory-manipulator, rigplane, PR2EM, ITM, WebUI, SEM, Look4Sat e la
  maggior parte delle app Android; EUG usa 4800 8N1 sulla porta DATA
  [gnfrazier-ftxcat:ftxcontrol.py] [bg7nzl-ftx1ctl:ftx1cat.py]
  [ew1abz-yaesu-ftx-1-control:ftx1-ctl/src/config.rs]
  [ew1abz-yaesu-ftx-1-memory-manipulator:src/main.rs]
  [rigplane-rigplane-core:rigs/ftx1.toml] [Eugen68-Yaesu-FTX1-CAT-Control:README.md].
- **Disaccordo**: la configurazione Pi di captobie imposta CAT-1 a **115200**
  (`rigctld -s 115200`) [captobie-ftx1-remote:Pi/README.md]; anche RZO
  raccomanda 115200 [rzochowski-cat-ftx1:README.md]; il resto, 38400. POK
  sonda 38400, 4800, 9600, 19200 e 115200 [pokibon3-FTX1Controller:js/serial.js].
- Voci di menu (OPERATION SETTING, GENERAL): `CAT-1 RATE`, `CAT-1 TIME OUT TIMER` (p. es. 100 ms), `CAT-1 CAT-3 STOP BIT` = 1 bit, `CAT-2 RATE`, `CAT-2 TIME OUT TIMER`
  [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]. Cambiarle a mano è
  **ESCRIBE EN LA RADIO**; nessuno strumento le scrive.
- Protezione del PTT tramite RTS/DTR su CAT-2 (mettere OFF se si usa CAT-2 come
  CAT con controllo di flusso): `RADIO SETTING, MODE SSB/AM/FM/DATA/RTTY RPTT SELECT`,
  `CW SETTING, MODE CW RPTT SELECT`, `CW SETTING, PC KEYING`,
  `PRESET, PRESET1-5 RPTT SELECT`
  [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]. Aprire la porta di
  manipolazione alza brevemente DTR/RTS
  [captobie-ftx1-remote:Pi/README.md].
- DTR/RTS secondo ogni app (**le app non coincidono**): PR2EM li disattiva prima
  di aprire (potrebbero attivare il PTT con RPTT); WebUI li abbassa (le linee di
  Standard COM possono trasmettere); Look4Sat li forza a falso; BYF li attiva;
  POK in FT-991A imposta RTS on e DTR off
  [evertonma-FTX-1CAT_PR2EM:ftx1cat/ui/app.py]
  [git-jcw-FTX-1-WebUI:js/cat/transport.js]
  [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1Controller.kt]
  [byf3332-Yaesu-FTX1-Cat-Tunnel:app/src/main/java/com/byf3332/cattunnel/CatTcpBridge.kt]
  [pokibon3-FTX1Controller:js/ft991a.js].

**Metodi di PTT (informativo; questo progetto non trasmette)**

- CAT `TX1;`/`TX0;` [gnfrazier-ftxcat:ftxcontrol.py]; MOX `MX1;`/`MX0;`
  [bg7nzl-ftx1ctl:ftx1cat.py]; RTS su CAT-2 [bg7nzl-ftx1ctl:ftx1cat.py]
  [bg7nzl-ftx1ctl:docs/user_manual_en.md]; RTS/DTR su CAT-2 per il CW
  [captobie-ftx1-remote:docs/cw-protocol.md].
- Relay CW di captobie: TCP 8534 con JSON, per impostazione predefinita linea
  RTS, `playoutDelayMs` 300 (20-1000), `heartbeatTimeoutMs` 1000, `maxKeyDownMs`
  5000; usa solo CAT-2, mai la porta CAT di rigctld
  [captobie-ftx1-remote:docs/cw-protocol.md] [captobie-ftx1-remote:CLAUDE.md].

**Audio USB**

- Codec 0D8C:0016 sotto l'hub interno [rigplane-rigplane-core:rigs/ftx1.toml].
- **Disaccordo** sui canali: il profilo di rigplane dice che l'audio RX è solo
  sul canale SINISTRO (il destro è rumore di fondo; `rx_audio_channel = "left"`) [rigplane-rigplane-core:rigs/ftx1.toml]; captobie dice stereo con
  Main a sinistra e Sub a destra in ricezione dual, legato al ricevitore
  fisico anche se si scambia dal pannello, e che `SV` li sposta solo in
  ricezione dual [captobie-ftx1-remote:CLAUDE.md]
  [captobie-ftx1-remote:Pi/README.md].
- Frequenza di campionamento: ALSA dsnoop/dmix di captobie a 2 canali, 48000 Hz,
  S16_LE ("stima iniziale", non confermata)
  [captobie-ftx1-remote:Pi/asound-ftx1.conf]; CLAUDE.md cita anche cattura
  stereo a 44.1 kHz e 48 kHz nei dati di Windows
  [captobie-ftx1-remote:CLAUDE.md]. `YaesuCatBackendConfig` di rigplane
  ammette `audio_sample_rate`, `rx_device` e `tx_device`
  [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md].
- Per inviare audio di TX dal PC serve MOD SOURCE = USB (`RADIO SETTING, MODE SSB/AM/FM/DATA, MOD SOURCE`: MIC, USB, Bluetooth, AUTO; nel
  PRESET: MIC, USB, REAR, AUTO). **Disaccordo/errata**: il valore 2 è REAR nel
  preset e Bluetooth per modo. Inoltre `USB MOD GAIN` (sorvegliare l'ALC)
  [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md]
  [captobie-ftx1-remote:ftx1-cat-manual-errata.md]
  [captobie-ftx1-remote:Pi/README.md].
- Rigplane non usa lo scope hardware per l'FTX-1; il panadapter ricava dall'audio
  RX [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md].

**Tempi e latenza**

- `post_write_delay` di Hamlib = 50 ms; captobie usa 10 (27 mila risposte
  pulite su Mac, 17 mila su Pi; 0 o 5 hanno dato a volte risposte sfasate). La
  radio risponde in ~5 ms; una lettura ~14 ms con ritardo 10. `rigctld -m 1051 -r <puerto> -s 115200 -t 4532 -o -C post_write_delay=10` (`-o` serve per gli
  argomenti VFO) [captobie-ftx1-remote:CLAUDE.md]
  [captobie-ftx1-remote:Pi/README.md].
- fritzsche: minimo 50 ms tra i comandi; MW non risponde, attendere dopo
  [fritzsche-yaesu-ftx1:cat_format.md]. gnfrazier: 0.1 s dopo l'apertura, 0.05 s
  dopo la scrittura, lettura con timeout di 1.0 s [gnfrazier-ftxcat:ftxcontrol.py].
  bg7nzl: 2 ms dopo la scrittura, `read_until(;)`, timeout 1.0 s, misuratori a
  ~1 Hz [bg7nzl-ftx1ctl:ftx1cat.py] [bg7nzl-ftx1ctl:docs/user_manual_en.md].
  ew1abz: timeout di lettura 200 ms e polling della TUI ogni 500 ms
  [ew1abz-yaesu-ftx-1-memory-manipulator:src/main.rs]
  [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs]
  [ew1abz-yaesu-ftx-1-control:ftx1-ctl/src/app.rs].
- Rigplane: livelli di polling vivo (frequenza/modo) 1.0 s e livello lento con
  TTL di 120 s; un client CAT esterno mette in pausa il polling
  [rigplane-rigplane-core:rigs/ftx1.toml].
- Altre app: PR2EM 0.8 s di timeout di risposta e 20 ms tra le scritture;
  ITM FIFO half-duplex con 1.2 s di timeout e 40 ms di cadenza; WebUI un solo
  comando in volo, lettura 350 ms, le impostazioni attendono 12 ms per `?;` (150 ms
  sull'accordatore); RZO 1.5 s (2 s per ID) e 40 ms tra le richieste iniziali; POK
  polling rapido 200 ms, lento 1500 ms, livelli 6000 ms; SEM 1 s di timeout
  [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/transport.py]
  [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatConnection.cs]
  [git-jcw-FTX-1-WebUI:js/cat/cat-link.js]
  [rzochowski-cat-ftx1:serial-server.mjs] [pokibon3-FTX1Controller:js/ftx1.js]
  [Semyonic-ftx1-programmer:src/cat/transport.ts].
- Una scansione delle memorie va a ~9-10 canali/s
  [captobie-ftx1-remote:CLAUDE.md]. Durante il TX, modo e split vengono rifiutati
  con `?;` e la frequenza viene accettata [rigplane-rigplane-core:rigs/ftx1.toml].

**Informazione automatica (AI)**

- `AI0;`/`AI1;` esiste [gnfrazier-ftxcat:ftxcontrol.py]
  [rigplane-rigplane-core:rigs/ftx1.toml]. Nessun repository descrive il
  formato non richiesto. SEM, WebUI e questo progetto spengono AI alla
  connessione e fanno polling; RZO prova `AI1;` e torna al polling se non c'è ack
  [Semyonic-ftx1-programmer:src/cat/commands.ts]
  [git-jcw-FTX-1-WebUI:js/radio.js] [rzochowski-cat-ftx1:serial-server.mjs].

**Altri fatti**
- Rigplane: `has_lan=false`, 2 ricevitori, potenza massima 100 W e minima 5 W,
  schema VFO unico `ab_shared`
  [rigplane-rigplane-core:rigs/ftx1.toml]
  [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md].
- Consiglio di copia: salvare memoria e configurazione sulla scheda SD prima di
  usare script; la radio è "capricciosa" e può servire un reset completo
  [gnfrazier-ftxcat:README.md].
- La scala dei misuratori di Optima/SPA-1 in bg7nzl è inesatta
  [bg7nzl-ftx1ctl:docs/user_manual_en.md].
- Android: PR2EM-A e Look4Sat enumerano tutte le porte e chiedono il permesso in
  esecuzione; BYF filtra per 10C4:EA70 in `usb_device_filter.xml`; EUG usa il
  primo driver e la prima porta per il CAT e lascia spento il lettore della
  porta DATA perché gestori concorrenti rompevano l'affidabilità del CAT
  [evertonma-FTX-1CAT_PR2EM_Android:app/src/main/java/com/pr2em/ftx1cat/CatRadio.kt]
  [byf3332-Yaesu-FTX1-Cat-Tunnel:app/src/main/res/xml/usb_device_filter.xml]
  [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java]
  [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1Controller.kt].
- Web Serial: WebUI e SEM filtrano per VID 0x10C4; POK chiede la porta senza
  filtro [git-jcw-FTX-1-WebUI:js/cat/transport.js]
  [Semyonic-ftx1-programmer:src/cat/transport.ts]
  [pokibon3-FTX1Controller:js/serial.js].

## Formato delle memorie e come si leggono e si scrivono

**Identificatori e intervalli di canale**
[ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs]

- 00001-00999 canali di memoria; `P-01L`...`P-50U` PMS; 50001-50020 banda dei 5
  MHz; `EMGCH` emergenza. Gli identificatori sono di 5 caratteri in
  MR/MW/MT/MZ.
- Tipo di canale (posizione 25 di MR/MW): 0 VFO, 1 Memory Channel, 2 Memory Tune,
  3 QMB, 4 riservato, 5 PMS. La tabella di MW di fritzsche coincide; il suo testo
  di MR elenca solo 0/1/2 [fritzsche-yaesu-ftx1:cat_format.md].
- Codici `VM`: 00 VFO, 10 MT, 11 Memory, 20 PMS, 21 P-01L..P-50U, 51 banda dei 5
  MHz, 91 EMG
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md].
- Conflitto di intervallo: MC 00001-00099 contro MR/MW/MZ 00001-00999
  [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md]; il profilo di rigplane
  elenca solo i canali 1-99 [rigplane-rigplane-core:rigs/ftx1.toml]; il CSV delle
  lacune parla di fino a 09999 per MC
  [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv];
  gnfrazier commenta "MC P2 = 00001-00099"
  [gnfrazier-ftxcat:ftxcontrol.py]. captobie ha visto 277-278 canali sulla sua
  radio [captobie-ftx1-remote:CLAUDE.md]. I canali HOME non si possono leggere né
  richiamare via CAT.

**Registro MR/MW (27 caratteri di parametri dopo `MR`/`MW`; 30 con `;`)**
[fritzsche-yaesu-ftx1:cat_format.md]
[ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md]

| Posizione (da 1) | Campo |
|---|---|
| 1-2 | `MR`/`MW` |
| 3-7 | canale (5) |
| 8-16 | frequenza in Hz (9) |
| 17 | segno del clarifier `+`/`-` (MR può mostrare `S`; in MW deve essere `+`/`-`) |
| 18-21 | offset del clarifier in Hz (4); ew1abz: -9990..+9990 |
| 22 | clarifier RX 0/1 |
| 23 | clarifier TX 0/1 |
| 24 | modo (codici di MD) |
| 25 | tipo di canale (sopra) |
| 26 | tipo di SQL: 0 OFF, 1 CTCSS ENC/DEC, 2 CTCSS ENC, 3 DCS, 4 PR FREQ, 5 REV TONE |
| 27-28 | fisso `00` (ew1abz: "non mappato", potrebbe codificare ARS/split/M-GRP) |
| 29 | shift 0 simplex, 1 più, 2 meno (MW anche `3` ARS secondo ew1abz `to_mw_char`) |
| 30 | `;` |

- Esempio `MR00008145675000+000000412002;`
  [fritzsche-yaesu-ftx1:cat_format.md]. Risposta di prova di ew1abz-control
  `IF00000014074000-050010200000;`
  [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs].
- **Disaccordo/errata**: la nota di MR nella sezione MA di fritzsche dice "modo
  di tono alla posizione 18" (errata; la tabella di MR dice 26)
  [fritzsche-yaesu-ftx1:cat_format.md].
- Scambio dei codici SQL rispetto a CT: in MW/MR 1 = ENC/DEC e 2 = ENC; in CT
  1 = ENC (TONE) e 2 = ENC/DEC (TSQL); `CmdCt::set` li scambia
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md]
  [fritzsche-yaesu-ftx1:cat_format.md].
- ARS: si salva con `OS` P2=3; MR non porta il flag ARS, quindi le letture
  restituiscono la direzione risolta (più/meno)
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md].

**Campi supportati e non supportati**
[ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md]

- Supportati: numero di canale, frequenza RX, direzione dello shift, modo
  (17), clarifier, tipo di SQL, tono CTCSS (CN, 50 toni), DCS (104 codici),
  nome (12 ASCII), ARS e frequenza di TX in split (MZ).
- Non supportati: frequenza di shift (menu EX per banda: 28 MHz 0-1000
  kHz a passi di 10 kHz, 50 MHz 0-4000 kHz a passi di 10 kHz, 144 e 430 MHz
  0-100 MHz a passi di 50 kHz), M-GRP, IPO/preamp, DNF, DNR, narrow, attenuatore,
  livello NB, AGC (tutti globali per lato o banda, non per canale); anche
  compressore ed EQ vocale non sono per canale
  [ew1abz-yaesu-ftx-1-memory-manipulator:README.md].

**Strumento ew1abz-yaesu-ftx-1-memory-manipulator (`ftx1-mm`)**

- Colonne CSV: Channel Number, Frequency (Hz), Memory Tag, Mode, Channel Type,
  Squelch Type, Shift (Hz), Clarifier Offset (Hz), Rx Clarifier Enabled, Tx
  Clarifier Enabled, CTCSS Tone, DCS Tone; opzionale `Split TX (Hz)`
  [ew1abz-yaesu-ftx-1-memory-manipulator:src/main.rs]
  [ew1abz-yaesu-ftx-1-memory-manipulator:chirp_ft897_to_ftx1.py]
  [ew1abz-yaesu-ftx-1-memory-manipulator:README.md].
- Nomi di SQL nel CSV: `CtcssOff`, `CtcssEnc` (TONE della radio),
  `CtcssEncDec` (TSQ), `Dcs`; shift `Simplex`, `PlusShift`,
  `MinusShift`, `Ars`; tipo di canale `MemoryChannel`, ecc.; flag del
  clarifier `RxClarifierOff/On`.
- Lettura: ciclo `MR` + `MT` (+ `CN`, `MZ`) per canale verso CSV. Scrittura: CSV
  verso `MW`/`MT` per canale (**ESCRIBE EN LA RADIO**)
  [ew1abz-yaesu-ftx-1-memory-manipulator:CLAUDE.md].
- Sequenza di scrittura per canale (13 passi): `MW` (crea lo slot), `VM` P2=11,
  `MC`, `VM` P2=00, `MD` FM, `OS` shift, `MD` modo reale, `FA`, `CT`, `CN` CTCSS,
  `CN` DCS, `AM` (conferma), `MT` nome (`MZ` dopo `AM` se c'è split)
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md].
- È additiva: tocca solo i canali del CSV e non cancella. Validata con un
  viaggio di 16 canali lettura, scrittura e lettura byte per byte identico
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md].
- Opzioni: `--read-radio`, `--write-radio`, `--check-data`, `--print`,
  `--port` (predefinita `/dev/ttyUSB0`), `--speed` (38400), `--file`,
  `--allow-any-frequency`
  [ew1abz-yaesu-ftx-1-memory-manipulator:README.md].
- **REGION/LIMITES TX** (morbido): validazione di 30 kHz-174 MHz e 400-470 MHz;
  `--allow-any-frequency` la salta (radio modificate MARS-CAP, SATCOM,
  lacuna 174-400 MHz)
  [ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs].
- Sono ammessi canali non contigui; le righe `#` sono commenti; il foglio di
  calcolo toglie gli zeri a sinistra e `.0` (lo strumento riempie a 5 e
  abbina il tono per valore)
  [ew1abz-yaesu-ftx-1-memory-manipulator:README.md].
- Conversione CHIRP (`chirp_ft897_to_ftx1.py`): FM a FM, NFM a FM-N, AM, LSB, USB,
  CW a CW-U, DIG a DATA-U, PKT a DATA-FM; duplex ""/+/- a
  Simplex/PlusShift/MinusShift; Tone ""/Tone/TSQL/DTCS a
  CtcssOff/CtcssEnc/CtcssEncDec/Dcs; nome troncato a 12. Vengono omessi con
  motivo su stderr: DV (D-STAR), WFM, tono incrociato, TSQL-R/DTCS-R, duplex
  split, frequenza o posizione non valida
  [ew1abz-yaesu-ftx-1-memory-manipulator:chirp_ft897_to_ftx1.py]. Rinumerare:
  `renumber_channels.py`
  [ew1abz-yaesu-ftx-1-memory-manipulator:renumber_channels.py].

**Strumento fritzsche-yaesu-ftx1 (programmatore di memorie)**

- Strategie di caricamento (**ESCRIBE EN LA RADIO**): (1) analogico senza tono:
  `VM000;`, `FA...;`, `MW...;`; (2) analogico con tono/DCS: `MW`, `CT0x`, `CN...`,
  `MC0nnnnn`, `AM;` (ordine della doc) contro l'ordine di CLAUDE.md `MW`,
  `MC0nnnnn`, `VM000`, `MA`, `CT`, `CN`, `AM` (**l'ordine differisce tra**
  [fritzsche-yaesu-ftx1:cat_format.md] e [fritzsche-yaesu-ftx1:CLAUDE.md]); (3)
  digitale C4FM/DN: `MD0H;` e poi `MW` diretto.
- Etichetta "Nominativo-Città" fino a 12 caratteri; le dieresi passano ad ASCII
  con `CharConverter.js` [fritzsche-yaesu-ftx1:CLAUDE.md]. MC a 6 cifre
  (`MC000011`), MR a 5 [fritzsche-yaesu-ftx1:CLAUDE.md].
- **REGION/LIMITES TX** (morbido): la validazione salta le frequenze fuori da HF
  0.1-174, VHF 174-350, aria 350-400 e UHF 400-524 MHz
  [fritzsche-yaesu-ftx1:CLAUDE.md]. **Disaccordo** con la copertura di fabbrica
  di ew1abz (30 kHz-174 e 400-470 MHz).
- Formati CSV: CHIRP (`--chirp-csv`) con `Location,Name,Frequency,Duplex,Offset, Tone,rToneFreq,cToneFreq,DtcsCode,DtcsPolarity,Mode,TStep,Skip,Comment`; e
  quello di relais.dl3el.de (`--csv`) separato da `;` con virgola decimale
  tedesca, senza campo Location (`--start-mem` numera); DMR, D-Star e Tetra sono
  esclusi. C'è un'incoerenza nella doc tra `--start-mem` e `--mem-start`
  [fritzsche-yaesu-ftx1:csv_formats.md].
- Scaricamento/verifica: `node js/download.js [--verify]` esporta in CHIRP;
  verificare confronta MR con la rilettura `MC` + `FA`
  [fritzsche-yaesu-ftx1:CLAUDE.md]. `MA` carica solo la frequenza; `AM`/`BM`
  salvano lo stato reale del VFO. Il caricamento non ammette la cancellazione
  [fritzsche-yaesu-ftx1:csv_formats.md].

**Altri strumenti**

- captobie: elenca con `MR` e `MT`, un canale vuoto risponde `?;` e si ferma
  dopo 100 vuoti consecutivi; `VM011` fallisce salvo `MC0` subito prima. Scrive
  la memoria del tasto (`KM`), il menu del tipo di memoria CW e impostazioni
  profonde tramite `EX` (**ESCRIBE EN LA RADIO**); le voci di azione del
  catalogo (incluse CALIBRACION/RESET) non vengono mai inviate
  [captobie-ftx1-remote:CLAUDE.md].
- gnfrazier: VFO/memoria con `VM P1;`, `MC`, `MA`, `MB`; senza CSV né massivo
  [gnfrazier-ftxcat:ftxcontrol.py].
- ew1abz-control: memorie di frequenza locali in TOML (`[[freq_memory]]`),
  non della radio [ew1abz-yaesu-ftx-1-control:README.md].
- rigplane: elenco di memorie in sola lettura (`MR` + `MT`, canali 1-99); le
  famiglie di scrittura sono pianificate
  [rigplane-rigplane-core:rigs/ftx1.toml]
  [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv].
- PR2EM e SEM: editor di memorie con CSV (SEM importa anche ADMS-14 e FT5D
  `.dat`); PR2EM rilegge per confermare dopo `MW`; SEM limita i canali
  gestiti a 1-99 e la lettura a 1-999 (**ESCRIBE EN LA RADIO**)
  [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py]
  [Semyonic-ftx1-programmer:src/cat/codec.ts]
  [Semyonic-ftx1-programmer:src/io/adms14-csv.ts]
  [Semyonic-ftx1-programmer:src/io/ft5d-dat.ts].

## Strumento di regione e intervalli di TX

Solo riepilogo. **ESCRIBE EN LA RADIO** **REGION/LIMITES TX** **CALIBRACION**.
Questo progetto non la usa, non la automatizza e non la riproduce. Per i
dettagli bisogna andare al repository originale
(`https://github.com/Evgeny161rus/ftx1-region-tool`, copia in
`third_party/ftx1/Evgeny161rus-ftx1-region-tool`).

**Che cos'è.** Uno strumento da riga di comando in Python che usa comandi di
servizio non documentati, presenti nel firmware MAIN ma assenti dal manuale
CAT, per leggere e scrivere singoli byte della EEPROM della radio. I byte che
modifica si trovano accanto alla tabella di calibrazione di fabbrica
[Evgeny161rus-ftx1-region-tool:README.md]
[Evgeny161rus-ftx1-region-tool:ftx1_region.py]. Tocca la EEPROM solo tramite
questi comandi di servizio (`SPR` lettura, `SPW` scrittura); non usa menu né
comandi normali.

**Che cosa cambia, in concetto.** Il codice di destinazione o regione della
radio. Da questo codice dipende la tabella di bande su cui il firmware permette
di trasmettere. Cambiarlo amplia o riduce gli intervalli di TX; lo strumento
documenta tabelle diverse per regione (stretta alle bande radioamatoriali, più
ampia, o quasi continua). Lo stesso strumento avverte che una regione molto ampia
può offrire intervalli in cui il percorso RF non è pensato per funzionare
[Evgeny161rus-ftx1-region-tool:README.md]. È fatto per una versione precisa del
firmware MAIN (V01.13); in altre versioni bisogna prima fare un dump perché gli
indirizzi e i codici possono differire.

**Salvaguardie dello strumento.** Dump preventivo della EEPROM con checksum;
copia automatica prima di scrivere (si interrompe se non riesce a leggere);
rifiuto di un codice attuale sconosciuto salvo che lo si forzi; modalità di
simulazione; conferma esplicita; rilettura con tentativi dopo la scrittura;
serve poi spegnere e riaccendere completamente la radio
[Evgeny161rus-ftx1-region-tool:README.md]. Un ordine generico di scrittura
permette di raggiungere qualsiasi byte, compresa la calibrazione
[Evgeny161rus-ftx1-region-tool:README.md]. Le versioni vecchie avevano un difetto
di lettura che produceva dump e copie corrotti.

**Rischi.**

- Perdita di calibrazione: si scrive EEPROM di servizio accanto a essa; il dump
  completo preventivo è l'unica rete di sicurezza.
- Legale e omologazione: trasmettere fuori da ciò che consente la licenza o
  l'omologazione di tipo è responsabilità dell'utente; cambiare la regione può
  violarle [Evgeny161rus-ftx1-region-tool:README.md].
- Garanzia: la modifica può annullare la garanzia
  [Evgeny161rus-ftx1-region-tool:README.md].
- L'autore lo offre "così com'è" e declina ogni responsabilità per danni, perdita
  di dati o malfunzionamenti [Evgeny161rus-ftx1-region-tool:README.md].
- Se il firmware ripristina il codice all'avvio, il repository indica che
  servirebbe un programmatore esterno e modificare un dump
  [Evgeny161rus-ftx1-region-tool:README.md].

**Come ripristinare, in concetto.** Rimettere il codice di regione originale
(salvato nel dump preventivo) con lo stesso strumento e riavviare la radio.
Se la calibrazione è stata danneggiata, ripristinare dal dump completo o
rivolgersi a un servizio tecnico Yaesu.

**In questo progetto.** `SPR`/`SPW`, i cambi di regione o limiti di TX e ogni
scrittura di calibrazione sono esclusi di proposito.

### Scheda dello strumento

Link: [repository originale](https://github.com/Evgeny161rus/ftx1-region-tool/)
e [copia inclusa in questo progetto](https://github.com/Brico-Hams/Radio-Web-install/tree/main/third_party/ftx1/Evgeny161rus-ftx1-region-tool).
Questa scheda si limita a descrivere; non contiene indirizzi EEPROM, valori dei
codici di regione, sintassi del frame di scrittura né una procedura passo passo.

**Linguaggio e requisiti.**

- Un solo script Python (`ftx1_region.py`), firmato "R6AAF", che richiede
  Python 3.8 o superiore e la libreria `pyserial`. Si installa da sola la prima
  volta con `pip` (con `--user` se serve, o `ensurepip`), a meno che sia
  definito `FTX1_NO_AUTOINSTALL=1`
  [Evgeny161rus-ftx1-region-tool:README.md]
  [Evgeny161rus-ftx1-region-tool:requirements.txt].
- Funziona su Windows, Linux e macOS tramite il normale cavo USB del CAT: va
  usata la porta "Enhanced" del CP2105 (38400 baud per impostazione predefinita,
  `--baud` la cambia, `--port` forza la porta). Non serve aprire la radio.
- Senza argomenti apre un menu interattivo. L'interfaccia è russa, inglese o
  entrambe; la scelta si salva in `~/.ftx1_region_lang` e `--lang` la cambia solo
  per quella volta [Evgeny161rus-ftx1-region-tool:ftx1_region.py].
- Il repository include anche una guida passo passo in russo, che qui non si
  riassume.

**Firmware supportato.**

- È pensata per l'FTX-1 con MAIN V01.13: da quell'immagine provengono la tabella
  delle regioni e le tabelle degli intervalli di TX che usa. Su altre versioni
  bisogna prima fare un dump e verificare con `info`, perché indirizzi e codici
  possono differire [Evgeny161rus-ftx1-region-tool:README.md].
- La lettura della versione usa `VE`; l'identificazione usa `ID` (l'FTX-1
  risponde `ID0840`).
- Raggiunge solo i primi 64 KiB della EEPROM (indirizzo a 16 bit), dei 128 KiB
  del chip; regione, calibrazione e impostazioni sono all'inizio.

**Profilo FT-710.** Con `--radio ft710` (o scegliendolo nel menu) lo stesso
strumento usa un altro profilo: EEPROM SPI da 32 KiB, altra posizione del codice
e di un indicatore "4K", identificazione `ID0710` e copia sempre completa prima
di scrivere. Serve per fare dump, sondare, cambiare regione e analizzare file
dell'FT-710 [Evgeny161rus-ftx1-region-tool:ftx1_region.py]. Sull'FT-710 il
cambio di regione usa inoltre un comando `JP`; sull'FTX-1 quel comando è uno
scheletro che risponde `?;`, per questo qui si usano gli ordini di servizio
EEPROM.

**Sottocomandi che solo leggono** (non cambiano la radio):

- `ports`: elenca le porte seriali e segna quella del CAT.
- `info`: legge `ID`, la versione e il codice di regione attuale; mostra il suo
  nome e gli intervalli di TX che il firmware consente per quel codice.
- `list`: tabella dei codici di regione noti (nome, se è "ampio" e una
  descrizione); è locale e non parla con la radio.
- `dump`: scarica la EEPROM in un `.bin` e in un `.txt` (vedi sotto).
- `read`: legge un solo byte di EEPROM.
- `probe` (pensato per l'FT-710): richieste di sola lettura di `ID`, `VE`, `JP`
  e letture di EEPROM; salva un registro nella cartella dei dump e dice se il
  dump completo via CAT è possibile.
- `analyze`: analizza offline un `.bin` già salvato (dimensione, regione, blocchi
  non vuoti) e con `--diff` lo confronta con un altro.
- `hardware`: stampa solo istruzioni per un dump con programmatore esterno (chip
  SPI dell'FT-710, CH341A e clip SOP8, due dump e confronto dell'impronta, non
  applicare 5 V a un chip da 3,3 V).
- `patch`: offline, cambia il codice di regione dentro una copia di un dump e
  salva un file nuovo; non tocca la radio, ma il risultato è pensato per essere
  scritto con un programmatore esterno (**REGION/LIMITES TX**).

**Sottocomandi che scrivono:**

- `set`: cambia il codice di regione (**ESCRIBE EN LA RADIO** **REGION/LIMITES TX**).
  Accetta il codice o il nome, oppure lo chiede mostrando la tabella.
- `write`: scrive un solo byte in qualsiasi posizione della EEPROM, compresa la
  calibrazione (**ESCRIBE EN LA RADIO** **REGION/LIMITES TX** **CALIBRACION**);
  è un'opzione per esperti e non va usata alla cieca.
- La voce di menu "set" (senza argomenti) fa lo stesso di `set`.

**Dump e copie.**

- Il dump si legge byte per byte, a circa 12 ms per byte: il dump normale (i
  primi 4 KiB: intestazione, calibrazione e regione) richiede circa 50 s e quello
  completo da 64 KiB (`--full`) circa 13 minuti. `--double` legge due volte e
  confronta.
- Accanto al `.bin` salva un `.txt` con data, porta, identificazione, firmware,
  regione, somma SHA-256 e numero di byte con errore.
- Senza `--out`, i dump vanno nella cartella `dumps` accanto allo script, e le
  copie automatiche precedenti alla scrittura nella cartella `backups`; entrambe
  si creano da sole e il percorso completo si stampa alla fine.
- La copia automatica precedente a `set` copre i primi 512 byte della EEPROM
  (intestazione, calibrazione e regione); sull'FT-710 è sempre la EEPROM
  completa.

**Salvaguardie.**

- `set --dry-run`: mostra il codice attuale e quello nuovo con i loro intervalli
  e si ferma senza scrivere nulla.
- Se il codice attuale è sconosciuto, rifiuta di scrivere salvo `--force`.
- Copia automatica preventiva e sua verifica: se un byte non si legge o la
  regione della copia non coincide con quella attuale, annulla (`--no-backup` la
  omette).
- Conferma esplicita (bisogna scrivere `yes`; `--yes` la omette).
- Rilettura dopo la scrittura, con tentativi e pause, perché il firmware cambia
  tabelle subito dopo; se non si riesce a leggere, avvisa con
  `write sent, but the readback failed` (non è un errore di scrittura).
- Bisogna spegnere e riaccendere completamente la radio e riguardare con `info`.
  Se il codice torna indietro, il firmware lo ripristina all'avvio e servirebbe
  un programmatore esterno.
- Gli errori CAT non chiudono il menu; vengono solo stampati.

**Difetti noti e corretti.** Il 2026-11-09 è stata corretta la lettura di `SPR`:
la risposta veniva letta fino al primo `;`, ma quel byte può essere anche un dato
o la somma di controllo, così il flusso si sfasava e le risposte successive
corrispondevano a indirizzi precedenti con la somma corretta. Risultato: dump e
copie corrotti, e `set` che scriveva e poi falliva la verifica. Ora si legge una
risposta di lunghezza fissa, si svuota il buffer e si ritenta, si verifica la
copia preventiva e anche `ID`. I dump precedenti sono stati marcati come
`_CORRUPT` e non servono per ripristinare
[Evgeny161rus-ftx1-region-tool:README.md].

**Comandi CAT nascosti che documenta.** Dopo la tabella ordinata dei comandi del
firmware MAIN, lo strumento descrive un blocco di comandi nascosti: `DP`, `SP`,
`EO`, `FD`, `KT`, `PE`, `ZZ`, `VE`, `JP`, `A0`, `A1`, `A2`, `RL`, `EX` e `SW`.
Si citano solo i nomi; quelli usati dallo strumento sono `SPR` e `SPW` (lettura
e scrittura di un byte di EEPROM), e `SPIR` risponde sulla radio reale
[Evgeny161rus-ftx1-region-tool:README.md].

**Avvertenze legali e d'uso.** Trasmettere solo dove la licenza lo consente;
cambiare la regione può violare l'omologazione di tipo e la garanzia; si scrive
EEPROM di servizio accanto alla calibrazione, quindi bisogna fare un dump prima
della prima scrittura; è offerto "così com'è", senza garanzia, e l'autore declina
ogni responsabilità per danni, perdita di dati, apparecchiature rovinate o
violazione di leggi locali
[Evgeny161rus-ftx1-region-tool:README.md].

## Firmware (Reid-n0rc)

Solo riepilogo. **FIRMWARE**. Questo progetto non carica, non applica patch e non
prepara firmware.

Fatti del repository `Reid-n0rc-FTX-1_Firmware`
[Reid-n0rc-FTX-1_Firmware:README.md] [Reid-n0rc-FTX-1_Firmware:AGENTS.md]:

- Stato: "appena iniziato, nulla decodificato". `decomp/` contiene solo
  `.gitkeep`; i compiti T01-T11 sono in `todo` e le loro sezioni di risultati
  sono vuote [Reid-n0rc-FTX-1_Firmware:decomp/.gitkeep]
  [Reid-n0rc-FTX-1_Firmware:docs/tasks/T04-container-decode.md].
- Il microcontrollore non è identificato (il censimento hardware T03 è
  in sospeso). I chip dell'FT-710 compaiono solo come ipotesi di confronto
  [Reid-n0rc-FTX-1_Firmware:docs/tasks/T03-hardware-survey.md].
- Immagini (non verificato, blog di un rivenditore di marzo 2026): DISPLAY
  V01-09, MAIN V01-12, DSP V01-07, SDR V01-06; possibile immagine separata per la
  testa da campo e il corpo amplificatore (Optima)
  [Reid-n0rc-FTX-1_Firmware:docs/tasks/T02-sources.md]
  [Reid-n0rc-FTX-1_Firmware:AGENTS.md]. Altre fonti citano MAIN 01-13 e
  DISPLAY 01-10 come le ultime
  [sq9pd-Yaesu-FTX-1-mod:README.md].
- Contenitore: sconosciuto in questo repository; ipotesi tipo FT-710 (`.SFL`
  con intestazione ASCII, etichetta di dimensione e CRC, e payload codificato).
  Un altro repository (sq9pd) conferma in pratica un formato di questo tipo
  [Reid-n0rc-FTX-1_Firmware:docs/tasks/T04-container-decode.md]
  [sq9pd-Yaesu-FTX-1-mod:patch.py].
- Procedura di aggiornamento: non è documentata in questo repository (T06 in
  sospeso); sull'FT-710 la CPU DISPLAY legge la scheda SD, non verificato
  sull'FTX-1 [Reid-n0rc-FTX-1_Firmware:docs/tasks/T06-update-path.md]. In sintesi,
  l'aggiornamento ufficiale Yaesu è l'unica via supportata; i file di firmware
  ufficiali e quelli di terze parti si caricano seguendo il processo Yaesu
  [sq9pd-Yaesu-FTX-1-mod:README.md].
- Strumenti: Ghidra 12.1.4 senza interfaccia grafica e script di nomi ed
  esportazione [Reid-n0rc-FTX-1_Firmware:tools/README.md]. Non ci sono risultati
  sul CAT in questo repository; T07 prevede di confrontare la tabella CAT
  documentata con quella del firmware
  [Reid-n0rc-FTX-1_Firmware:docs/tasks/T07-cat-commands.md].
- I manuali, le immagini decodificate e i progetti Ghidra non sono versionati; il
  firmware resta di Yaesu [Reid-n0rc-FTX-1_Firmware:AGENTS.md] [SOURCES.md].
- Regola del repository: nessuna scrittura sulla radio senza l'approvazione del
  proprietario ogni volta (caricamento di firmware, EEPROM, comandi CAT non
  provati) [Reid-n0rc-FTX-1_Firmware:AGENTS.md].

**Rischi.** Un aggiornamento interrotto o fallito può far perdere le
impostazioni o rendere la radio inutilizzabile; conviene salvare memorie e
impostazioni prima e conservare il firmware originale. Un firmware di terze
parti non è approvato da Yaesu. La versione del firmware si può leggere senza
rischi con `VE` [sq9pd-Yaesu-FTX-1-mod:README.md]
[gnfrazier-ftxcat:ftxcontrol.py].

## Modifiche hardware e copertura frontale

Riepilogo. Non si riproducono patch né dati di patching.

**Copertura frontale protettiva (radiohyperactivity).** File di supporto per una
copertura artigianale per l'FTX-1 Field: sagome di gommapiuma PE (A4 e US
Letter, SVG e PDF), sorgenti FreeCAD e STL stampabili (sagome di gommapiuma da 1
a 5 mm e guscio da 20 a 40 mm di profondità a passi di 2 mm). Non c'è modifica
elettrica né scrittura sulla radio
[radiohyperactivity-ftx1-front-cover:README.md].

**Modifica sq9pd (firmware di terze parti).** **FIRMWARE**
**ESCRIBE EN LA RADIO** (l'utente dovrebbe caricare il risultato con il
processo di aggiornamento Yaesu; lo strumento prepara solo file). Non è
ufficiale né approvata da Yaesu. Riepilogo di ciò che offre
[sq9pd-Yaesu-FTX-1-mod:README.md]:

- Parte dai firmware ufficiali MAIN 01-13 e DISPLAY 01-10 e accetta solo questi
  file di ingresso esatti (controlli di dimensione e impronta; rifiuta file già
  modificati) [sq9pd-Yaesu-FTX-1-mod:manifest.json]
  [sq9pd-Yaesu-FTX-1-mod:patch.py].
- Quattro pagine di cinque pulsanti configurabili nella riga inferiore, 70
  funzioni assegnabili, orologio nella barra superiore, pulsante di scan nativo e
  scorciatoie (APRS, FIL/NOTCH/NB/AMC), e due correzioni minori (BEEP LEVEL = 0
  senza bip muti e un errata "DELY").
- **SWR SCAN**: **trasmette RF** mentre scansiona (101 punti). Richiede modo
  VFO, accordatore spento e senza SPLIT/RIT/XIT; forza AM e potenza bassa; non
  limita la scansione ai limiti di banda, quindi l'intero intervallo deve essere
  lecito per trasmettere (**REGION/LIMITES TX**, responsabilità dell'utente); non
  aggiunge taglio per SWR alto; il TOT di fabbrica di 60 s resta attivo; durante
  la scansione il CAT blocca le modifiche e l'avvio del TX.
- Funziona offline (Python 3.9+ o pagina del browser); senza upload né
  analitica; i file originali non vengono distribuiti. I test dello strumento
  indicano che il patching interattivo nel browser "non è ancora provato"
  [sq9pd-Yaesu-FTX-1-mod:TEST_RESULTS.json].
- Rischi: un aggiornamento fallito può far perdere le impostazioni o rendere la
  radio inutilizzabile; le salvaguardie "non possono garantire protezione da ogni
  guasto"; se il TX persiste, spegnere la radio. Ripristinare: reinstallare MAIN
  e DISPLAY originali e fare il reset di fabbrica (cancella le impostazioni
  utente).

Altre menzioni di hardware: accordatore esterno mAT-30 tramite il connettore
TUNER/LINEAR con cavo mAT-CY
[hatandspecs-ftx1-tuner-sweep:docs/usage.md]; un programmatore esterno CH341A
come risorsa dello strumento di regione
[Evgeny161rus-ftx1-region-tool:README.md].

### Strumento web di sq9pd (ftx-1-mod.sq9pd.pl)

**FIRMWARE**. Link: [sito web](https://ftx-1-mod.sq9pd.pl/) e
[repository](https://github.com/sq9pd/Yaesu-FTX-1-mod). Il sito non si è potuto
scaricare automaticamente (HTTP 403, 2026-11-17). Questa descrizione deriva dalla
cartella `site/` del repository: un'applicazione web statica (`index.html`,
`app.js`, `content.js`, `patch-core.js`, `patch-data.js`, più foglio di stile e
immagini) che sembra essere ciò che serve il sito (non verificato)
[sq9pd-Yaesu-FTX-1-mod:site/index.html] [sq9pd-Yaesu-FTX-1-mod:site/app.js]
[sq9pd-Yaesu-FTX-1-mod:site/content.js] [sq9pd-Yaesu-FTX-1-mod:site/patch-core.js]
[sq9pd-Yaesu-FTX-1-mod:site/patch-data.js]. Questo progetto non la usa né
riproduce patch.

- **Cosa ottiene l'utente.** Una pagina in polacco (predefinito) o inglese che
  spiega la modifica con tre schermate (schermata principale, configurazione dei
  pulsanti e grafico di SWR SCAN), le istruzioni e i limiti di SWR SCAN, come
  tornare al firmware originale e due selettori di file (MAIN e DISPLAY) che
  generano i file `.SFL` modificati da scaricare. La pagina non programma la
  radio: il caricamento lo fa l'utente con il processo di aggiornamento Yaesu
  [sq9pd-Yaesu-FTX-1-mod:README.md] [sq9pd-Yaesu-FTX-1-mod:READMEPL.md].
- **Dove viene eseguito.** Tutto nel browser, sul computer dell'utente: la
  pagina dice che i file non vengono mai caricati su un server, che la verifica
  SHA-256 e il patching sono locali, senza analitica né librerie esterne. In
  coerenza con ciò, la politica di sicurezza dei contenuti della pagina vieta
  qualsiasi connessione di rete (`connect-src 'none'`) e il codice non fa
  richieste. Richiede Web Crypto (HTTPS o localhost) e una casella di consenso
  prima del patching. I file originali e quelli già modificati non sono inclusi
  nel repository.
- **Quale versione accetta.** La consegna "FTX-1 MAIN V40 + DISPLAY V35",
  basata sui firmware Yaesu MAIN 01-13 e DISPLAY 01-10: solo i file ufficiali
  esatti `FTX-1_MAIN_V0113.SFL` e `FTX-1_DISPLAY_V0110.SFL`. Altre versioni non
  sono supportate. V40 e V35 sono versioni della modifica (i nomi dei file
  mantengono i numeri di fabbrica) e non include la correzione audio CW di MAIN
  V41 [sq9pd-Yaesu-FTX-1-mod:manifest.json].
- **Modifiche, a livello di funzioni.**
  - Quattro pagine di cinque pulsanti configurabili nella riga inferiore (si
    assegnano nelle impostazioni dello schermo), con 70 funzioni assegnabili e
    disposizione predefinita.
  - Orologio nella barra superiore; funzioni non legate allo spettro
    disponibili con lo spettro nascosto.
  - Scorciatoie: APRS (modem, elenchi di stazioni e messaggi, beacon), 3DSS,
    accordatore e antenna, larghezza e spostamento del filtro, notch, contour,
    NB, AMC, e impostazioni che attivano la manopola FUNC.
  - Scan nativo del ricevitore selezionato; elenchi di banda e di modo con
    pressione breve e azione alternativa con pressione lunga.
  - **SWR SCAN**: scansione di adattamento dell'antenna a 101 punti attorno alla
    frequenza del VFO, con quattro larghezze di scansione; **trasmette RF** e
    non è un misuratore calibrato in modo indipendente (**REGION/LIMITES TX**:
    l'intera scansione deve essere consentita). Ha codici di errore propri.
  - Due correzioni del firmware originale (bip muti con BEEP LEVEL = 0 e un
    errata di menu).
- **Controlli di sicurezza.** Si controlla lo SHA-256 del file alla selezione, la
  sua dimensione, l'intestazione, l'etichetta di dimensione e il CRC del
  formato SFL, l'hash del payload decodificato e che i byte originali
  coincidano prima di applicare le differenze; poi si verificano il CRC e lo
  SHA-256 del risultato rispetto all'atteso. Un file di un'altra versione, già
  modificato o corrotto viene rifiutato; il download si attiva solo con un
  risultato verificato e si mostrano gli hash atteso e reale. La versione in
  Python ripete gli stessi controlli e non salva il risultato se falliscono
  [sq9pd-Yaesu-FTX-1-mod:patch.py] [sq9pd-Yaesu-FTX-1-mod:SHA256SUMS.txt].
- **Stato dei test.** Il file dei risultati dà "PASS" nella verifica offline: i
  risultati di Python e JavaScript sono identici byte per byte per MAIN e
  DISPLAY, i casi negativi passano e l'interfaccia (polacco e inglese, layout
  stretto) si vede bene. Il patching interattivo nel browser risulta "not yet
  tested in browser; Python and JS engine verified"
  [sq9pd-Yaesu-FTX-1-mod:TEST_RESULTS.json]. Qui non si è provato nulla di
  tutto questo.
- **Come tornare al firmware di fabbrica.** Salvare prima impostazioni e
  memorie, reinstallare i MAIN e DISPLAY originali con il processo Yaesu e fare
  il reset di fabbrica (cancella le impostazioni utente); reinstallare il
  firmware originale non sostituisce il reset
  [sq9pd-Yaesu-FTX-1-mod:README.md].
- **Avvertenze.** Modifica non ufficiale né approvata da Yaesu, a responsabilità
  dell'utente e senza garanzia; un errore o un aggiornamento interrotto può far
  perdere le impostazioni o rendere la radio inutilizzabile; le salvaguardie
  software non garantiscono protezione da ogni guasto e, se la radio continua a
  trasmettere, va spenta. Lo strumento non è un compilatore né un editor
  generale di firmware.

## Scansione dell'accordatore (tuner sweep)

**ATTENZIONE: ogni passo TRASMETTE.** **ESCRIBE EN LA RADIO** (cambia il VFO in
diretta e attiva il TX; non scrive memoria, menu né EEPROM)
[hatandspecs-ftx1-tuner-sweep:README.md]. Questo progetto non implementa la
scansione né avvia l'accordatore.

`hatandspecs-ftx1-tuner-sweep` è un'applicazione locale in Flask
(`http://127.0.0.1:5000`) che percorre il VFO dell'FTX-1 sulle bande scelte
e fa partire un accordatore automatico esterno perché salvi una memoria per
frequenza (provato con un mAT-30, FTX-1 Optima, 15 m e 12 m)
[hatandspecs-ftx1-tuner-sweep:README.md] [hatandspecs-ftx1-tuner-sweep:docs/usage.md].

| Comando | Significato | Fonte |
|---|---|---|
| `FA<9 digitos Hz>;` | imposta o legge la frequenza MAIN | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |
| `AC103;` | avvia la sintonia dell'accordatore esterno (equivale a tenere premuto [TUNER] 2 s); **trasmette** | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] [hatandspecs-ftx1-tuner-sweep:AGENTS.md] |
| `AC101;` | ferma la sintonia e lascia l'accordatore nel circuito | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |
| `RI;` | attività dell'accordatore (8 cifre, la sesta è tuning) | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |
| `PC;` | legge la potenza configurata | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |
| `MD0;` | legge il modo MAIN | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |

- Menu necessario sulla radio: TUN/LIN PORT SELECT = EXT-TUNER e TUNER SELECT =
  EXT [hatandspecs-ftx1-tuner-sweep:docs/usage.md]. Seriale 38400 8N1 su CAT-1.
- Algoritmo: per intervallo, frequenze ordinate (prima = bordo inferiore + 1 kHz,
  ultima = bordo superiore - 1 kHz, intermedie su una griglia di 10 kHz); per
  frequenza: `FA`, attesa di 300 ms, `AC103;`, attesa fissa di 5 s con polling
  `RI;` ogni 300 ms, e sempre `AC101;`. `RI` non è affidabile con accordatori
  esterni (linea di avvio unidirezionale), quindi non ci si fida della fine della
  sintonia [hatandspecs-ftx1-tuner-sweep:app.py]
  [hatandspecs-ftx1-tuner-sweep:AGENTS.md].
- I privilegi di banda derivano da `bandplans.tsv` modificabile (USA esatti per
  classe; altri paesi approssimati) o da intervalli propri in Hz
  [hatandspecs-ftx1-tuner-sweep:docs/band-privileges.md].
- Sicurezza: potenza raccomandata di 5 W o meno e l'app la legge soltanto; ogni
  passo trasmette circa 5 s; richiede una lista di controllo preventiva; Stop
  termina il passo in corso; non rileva se la frequenza è occupata; senza test
  automatici [hatandspecs-ftx1-tuner-sweep:docs/usage.md]
  [hatandspecs-ftx1-tuner-sweep:app.py] [hatandspecs-ftx1-tuner-sweep:AGENTS.md].

## Satelliti e Look4Sat

`juanmmmmmmm-Look4Sat-FTX1` è un fork sperimentale di Look4Sat con "Yaesu
FTX-1" come modello di radio, via USB OTG diretto (senza PC né rigctld). **ESCRIBE
EN LA RADIO** (VFO, modo, split e CTCSS); non si è trovato **REGION/LIMITES TX**,
**CALIBRACION** né **FIRMWARE**
[juanmmmmmmm-Look4Sat-FTX1:README.md].

- Modello: MAIN = RX/downlink, SUB = TX/uplink
  [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/RadioTrackingService.kt].
- Avvio: modo MAIN secondo il modo di downlink, modo SUB secondo quello di
  uplink; frequenza SUB iniziale = base di TX o metà della banda di uplink; poi
  `FT1;` + `VS1;` (SUB come lato di TX).
- Comandi usati: `FA%09d;`, `FB%09d;`, `MD0<codigo>;`/`MD1<codigo>;`,
  `FT0/1;`, `VS0/1;`, `ST1/ST0;`, `CN10%03d;` (tono CTCSS su SUB, indice 000-049,
  solo toni standard con tolleranza di 0.05 Hz) e `CT11;`/`CT10;`; un
  controllo innocuo `FA;` dopo 150 ms alla connessione
  [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt]
  [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1Controller.kt].
- Doppler: ogni ciclo di 1 s calcola la posizione e la velocità radiale, mappa la
  base di uplink sul downlink con il passo di banda del transponder lineare e
  applica `getUplinkFreq`/`getDownlinkFreq`; lo scostamento di downlink
  dell'utente si applica prima della mappatura per l'uplink e dopo per il
  downlink; solo transponder lineari
  [juanmmmmmmm-Look4Sat-FTX1:core/domain/src/main/java/com/rtbishop/look4sat/core/domain/utility/DopplerFrequencyCalculator.kt].
- Sintonia manuale: legge FB/FA, confronta con l'ultimo valore inviato (soglia di
  20 Hz) e dopo due letture stabili ricalcola la base di TX e riprende le
  correzioni.
- FM: CTCSS solo nel codificatore di uplink di SUB, configurabile; il
  tracking non applica da solo un tono scelto.
- PTT: il software non lo invia mai (`pttOn()` registra e restituisce falso);
  DTR/RTS forzati a falso; solo PTT fisico del microfono.
- `stopTracking()` annulla solo il task: **non ripristina** frequenza, modo,
  split, VFO né CTCSS precedenti.

## Architetture remote, tunnel e WebUI

| App | Progetto | Trasporto e porte | Sicurezza e autenticazione | Latenza |
|---|---|---|---|---|
| evertonma-FTX-1CAT_PR2EM | Desktop locale; costruttori e parser CAT separati dall'interfaccia Tk; thread di lavoro con coda (raggruppa per chiave) | pyserial, solo locale | Senza rete né autenticazione | Trasporto con RLock; frame non richiesti a un callback [evertonma-FTX-1CAT_PR2EM:ftx1cat/ui/worker.py] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/transport.py] |
| evertonma-FTX-1CAT_PR2EM_Android | Android locale; un solo esecutore serializza il CAT | USB host seriale | Solo permesso USB in esecuzione | Richieste bloccanti con timeout; cursori con debounce di 90 ms [evertonma-FTX-1CAT_PR2EM_Android:app/src/main/java/com/pr2em/ftx1cat/CatRadio.kt] |
| Eugen68-Yaesu-FTX1-CAT-Control | Android locale; CAT e DATA condividono una connessione USB | Porta CAT + porta DATA (RTS/DTR) + audio USB | Nessuna | Letture a eventi; lettore DATA spento per proteggere il CAT [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java] |
| iTracMan-FTX1WinController | WPF: comandi, facciata asincrona, connessione serializzata e trasporto seriale | Due COM virtuali (CAT-1 e CAT-2 per il PTT) | Locale | FIFO, 1.2 s, 40 ms [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatConnection.cs] |
| pokibon3-FTX1Controller | PWA da browser con Web Serial; DSP in AudioWorklet/Worker | Web Serial verso l'Enhanced COM; Standard COM per tasto/PTT | Contesto sicuro; senza autenticazione (locale) | Vedi sezione 3 [pokibon3-FTX1Controller:js/serial.js] |
| git-jcw-FTX-1-WebUI | Interfaccia statica con Web Serial e wrapper Electron; coda in `cat-link.js` | Web Serial | Electron: permessi solo per pagine `file:`, isolamento di contesto, sandbox, istanza unica, link esterni al browser; **senza bridge IPC, senza autenticazione e senza CSP esplicita in `main.cjs`** | Un comando in volo; le impostazioni sono prioritarie e raggruppate [git-jcw-FTX-1-WebUI:electron/main.cjs] [git-jcw-FTX-1-WebUI:js/cat/cat-link.js] |
| rzochowski-cat-ftx1 | Client Nuxt/Vue, route API di Nuxt e un server Node `serial-server.mjs` su `127.0.0.1:3001` con `serialport`; stato via **SSE** (`/events`, senza WebSocket) | HTTP e SSE su loopback; 8N1 con baud configurabili | Solo loopback ma CORS `*`; **senza autenticazione** | Coda con timeout; richieste iniziali ogni 40 ms; aggiornamento di 150 ms dopo l'impostazione [rzochowski-cat-ftx1:nuxt.config.ts] [rzochowski-cat-ftx1:serial-server.mjs] [rzochowski-cat-ftx1:server/api/command.post.ts] |
| Semyonic-ftx1-programmer | App TS da browser (codec, comandi, trasporto, store, UI) | Web Serial | Modalità simulazione (dry-run) predefinita e scritture bloccate finché non si "arma"; `PS0`, `TX1` e `MX1` richiedono l'armamento; senza conferma per operazione né copia automatica [Semyonic-ftx1-programmer:src/store/connection.ts] [Semyonic-ftx1-programmer:src/cat/transport.ts] | Scritture e richieste serializzate |
| byf3332-Yaesu-FTX1-Cat-Tunnel | **Tunnel**: ponte USB seriale verso TCP grezzo; servizio in primo piano | Server TCP sulla porta **4532**, in ascolto su `0.0.0.0`, **un solo client alla volta (uno nuovo sostituisce il precedente)**; senza UDP, WebSocket, COM virtuale né rigctl | **Nessuna** (senza autenticazione né cifratura) | TCP_NODELAY e keepalive; lettura USB 200 ms, scrittura seriale 2 s, lettura TCP 1 s; passaggio trasparente dei byte [byf3332-Yaesu-FTX1-Cat-Tunnel:app/src/main/java/com/byf3332/cattunnel/CatTcpBridge.kt] [byf3332-Yaesu-FTX1-Cat-Tunnel:app/src/main/java/com/byf3332/cattunnel/CatBridgeService.kt] |
| juanmmmmmmm-Look4Sat-FTX1 | Android; controller FTX-1 in `core:data`, un controller USB condiviso | USB seriale | Permesso USB in esecuzione | Mutex di I/O serializza le transazioni; ciclo di 1 s [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/injection/MainContainer.kt] |
| captobie-ftx1-remote | Suite remota con `rigctld` di Hamlib (Mac/iOS/iPad, Windows, Pi come relay), flusso audio della Pi e relay CW | `rigctld` TCP 4532; CW TCP 8534; audio Main sin./Sub destra | Non valutata nelle note | `post_write_delay` di 10 ms [captobie-ftx1-remote:CLAUDE.md] [captobie-ftx1-remote:Pi/README.md] |
| rigplane-rigplane-core | Libreria asincrona multiradio con interfaccia web; backend `yaesu-cat` | USB CAT-1 (senza LAN) | Non valutata nelle note | Polling a livelli [rigplane-rigplane-core:rigs/ftx1.toml] |

Note per questo progetto: il tunnel TCP di BYF e il server locale di RZO non
hanno autenticazione; qualsiasi soluzione remota propria dovrebbe richiedere
autenticazione e limitare l'accesso alla rete locale o a un tunnel cifrato.

## Riepilogo per repository

| Cartella | Scopo | Linguaggio | Licenza | Funzioni |
|---|---|---|---|---|
| captobie-ftx1-remote | Suite di controllo remoto via Hamlib `rigctld` (Mac/iOS/iPad, Windows, Pi) con errata del manuale CAT | Swift, C#/WinUI3, Python, Arduino | MIT; i binari di Hamlib in `Vendor/` sono LGPL/GPL | Client Hamlib 1051, audio della Pi, relay CW (TCP 8534), elenco e scansione di memorie, catalogo EX, errata verificati |
| fritzsche-yaesu-ftx1 | Programmatore di memorie: caricare e scaricare elenchi di ripetitori | JavaScript (Web Serial e CLI Node) | Senza licenza upstream ("così com'è"); permesso MIT secondo il proprietario, per l'utente | CSV CHIRP e relais.dl3el.de, strategie MW/AM/CT/CN, scaricamento e verifica, validazione della frequenza |
| ew1abz-yaesu-ftx-1-control | TUI e libreria di sintonia e clarifier | Rust (`ftx1` e `ftx1-ctl`) | Senza licenza upstream; permesso MIT secondo l'utente | `ID`/`FA`/`IF`/`OI`/`CF`, radio simulata, 38400, memorie TOML |
| ew1abz-yaesu-ftx-1-memory-manipulator | Copia e ripristino di memorie tramite CSV (`ftx1-mm`) | Rust e Python | MIT (solo in `Cargo.toml`) | Lettura MR/MT/CN/MZ, scrittura MW+AM, convertitore CHIRP, rinumerazione, differenze CAT 2507-B e 2508-C |
| gnfrazier-ftxcat | Modulo Python di controllo CAT (sperimentale) | Python (pyserial) | MIT | Circa 45 funzioni (frequenza, modo, PTT, potenza, AGC, misuratori, VFO/memoria, clarifier, CW, NB/DNR/DNF), guida di installazione USB/CAT, note WSL2 |
| bg7nzl-ftx1ctl | Console grafica con misuratori, waterfall audio, notch manuale e server NET rigctl | Python | Senza licenza upstream; permesso MIT secondo l'utente | CAT + PTT via RTS, conversione dei misuratori RM, notch BP, preamp PA, potenza PC, rigctl TCP 4532 per WSJT-X/JTDX |
| rigplane-rigplane-core | Libreria multiradio asincrona con interfaccia web; FTX-1 tramite `yaesu-cat` | Python e Svelte/TS | MIT | Profilo `rigs/ftx1.toml`, audit CAT rispetto al manuale (89 famiglie), guida USB, semantica MAIN/SUB |
| evertonma-FTX-1CAT_PR2EM | Strumento desktop di controllo, memorie e menu | Python (Tkinter, pyserial) | PolyForm Noncommercial 1.0.0 (non compatibile con GPL; solo riferimento) | Controlli rapidi, editor di memorie con CSV, editor di menu EX con copia JSON, simulatore e test |
| evertonma-FTX-1CAT_PR2EM_Android | Versione Android: controllo CAT di base | Kotlin | PolyForm Noncommercial 1.0.0 | Frequenza, modo, banda, 4 cursori, editor EX, selettore di porta USB |
| Eugen68-Yaesu-FTX1-CAT-Control | Suite Android di CAT, CW, RTTY e diario | Java, ONNX e libreria nativa | MIT | Decodificatore CW con IA, RTTY, diario ADIF, cluster, PSK Reporter, audio USB, memorie di CW e voce |
| iTracMan-FTX1WinController | Controller per Windows | C# / WPF | MIT | Pannello di funzioni completo, misuratori, messaggi, preset, audio locale, doppio COM, test xUnit |
| pokibon3-FTX1Controller | PWA da browser con Web Serial | JavaScript (WASM per CW e FT8) | Senza licenza upstream; permesso MIT secondo l'utente; `js/cwdec/` è GPL | Audio USB, waterfall, decodificatore e manipolazione CW, FT8/FT4, menu FUNC/EX, memorie, PWA offline, profilo FT-991A |
| git-jcw-FTX-1-WebUI | Interfaccia Web Serial e applicazione Electron | JavaScript | MIT | Waterfall derivato dall'audio, 4 misuratori, logica dell'accordatore, memoria di bande, potenza limitata, radio simulata |
| rzochowski-cat-ftx1 | Pannello web locale | Nuxt/Vue (TypeScript) e Node serialport | Senza licenza upstream; permesso MIT secondo l'utente | Stato via SSE, controlli dello scope, preset, comando CAT manuale, server su loopback (CORS `*`, senza autenticazione) |
| Semyonic-ftx1-programmer | Programmatore di memorie e menu nel browser | TypeScript (prototipi JSX) | GPL-3.0 | Modifica di memorie ed EX, importazione CSV/ADMS-14/FT5D, simulazione e armamento, console di debug |
| byf3332-Yaesu-FTX1-Cat-Tunnel | Ponte Android USB seriale verso TCP | Kotlin | WTFPL 2 | Tunnel TCP grezzo 4532 senza autenticazione, filtro 10C4:EA70 |
| juanmmmmmmm-Look4Sat-FTX1 | Tracking di satelliti con controllo Doppler dell'FTX-1 | Kotlin (Android) | GPL-3.0 | Doppler MAIN/SUB a 1 s, CTCSS, rilevamento di sintonia manuale, senza PTT via software |
| Evgeny161rus-ftx1-region-tool | Legge e scrive EEPROM e cambia il codice di regione via CAT | Python | Senza licenza upstream; permesso MIT secondo l'utente | Comandi di servizio non documentati, dump della EEPROM, copia automatica, interfaccia RU/EN. **ESCRIBE EN LA RADIO** **REGION/LIMITES TX** |
| Reid-n0rc-FTX-1_Firmware | Progetto di analisi del firmware | Markdown, Java (Ghidra), Python, shell | Senza licenza upstream; permesso MIT secondo l'utente; il firmware resta di Yaesu | Tabellone di compiti T01-T11 senza risultati, script di Ghidra. **FIRMWARE** |
| sq9pd-Yaesu-FTX-1-mod | Patcher offline del firmware MAIN 01-13 / DISPLAY 01-10 | Python e JavaScript | Senza licenza upstream; permesso MIT secondo l'utente | Pagine di pulsanti, SWR SCAN, patching con controllo dell'impronta. **FIRMWARE** |
| radiohyperactivity-ftx1-front-cover | Copertura frontale protettiva artigianale per FTX-1 Field | CAD (FreeCAD, STL, SVG) | GPL-3.0 | Sagome di gommapiuma PE, gusci stampabili da 20 a 40 mm |
| hatandspecs-ftx1-tuner-sweep | Scansione di VFO che avvia un accordatore esterno | Python (Flask) e HTML | MIT | FA/AC/RI/PC/MD, bande secondo la licenza, margine di 1 kHz, attesa fissa. **TRANSMITE** |

Le licenze della colonna Licenza provengono da `third_party/ftx1/SOURCES.md`.
Il permesso MIT "secondo l'utente" non è scritto in questo repository
[SOURCES.md]. Il codice PolyForm Noncommercial (evertonma) si conserva solo come
riferimento e non si copia in questo progetto GPL-3.0 [SOURCES.md].

## Confronto con Bricohams

Ciò che esiste proviene dalle note di questo progetto: lo strumento
web/desktop (`ftx1.html`, `ftx1-core.js`, `ftx1-menu.js`, `ftx1-ui.js`) via Web
Serial e RadiCodex su Android (`RigActivity`, `YaesuFtx1` e `Ftx1Rig` in
`RigProtocols.kt`). Ogni scrittura viene controllata nell'intervallo prima
dell'invio e verificata rileggendo. Regole di questo lavoro: solo ricezione e
VFO; nulla attiva il trasmettitore.

Valori di "Stato in questo ramo": "Già esistente", "Aggiunto" (funzioni
pianificate) o "Fuori ambito (motivo)".

| Funzione | Repo che la hanno | Web/desktop | Android | Stato in questo ramo |
|---|---|---|---|---|
| Connettere e identificare (`ID;` = `ID0840;`, `AI0;`) | Quasi tutti | Sì | Sì | Già esistente |
| Leggere la frequenza VFO A/B | Quasi tutti | Sì (`FA;`/`FB;`) | Sì | Già esistente |
| Impostare la frequenza VFO A/B con verifica | Quasi tutti | Solo API, senza controllo nell'interfaccia | Sì | Aggiunto (pannello VFO sul web); su Android già esistente |
| Modo MAIN (`MD0 m;`) | Quasi tutti | No | Sì | Aggiunto (web, con rilettura); su Android già esistente |
| Split `ST0`/`ST1` | ITM, Look4Sat, SEM, rigplane | No | Sì (tracking per satellite) | Aggiunto (web); su Android già esistente |
| Leggere e scrivere memorie 1-999 | fritzsche, ew1abz-memory, PR2EM, SEM, POK | Sì | Sì (una alla volta) | Già esistente |
| Copia/ripristino JSON e CSV delle memorie | ew1abz-memory, fritzsche, PR2EM, SEM | Sì | No | Già esistente (web). Android: fuori ambito (non pianificato in questo ramo) |
| Menu EX: leggere, scrivere, copia e differenze | PR2EM, SEM, POK, captobie, RZO | Sì (voci di sola lettura rifiutate) | No | Già esistente (web). Android: fuori ambito (non pianificato in questo ramo) |
| AF, RF, SQL, larghezza, IF shift, AGC, preamp, attenuatore e potenza (web) | gnfrazier, rigplane, WebUI, ITM, bg7nzl | Sì, con rilettura | - | Già esistente |
| AF, RF, SQL, larghezza, IF shift, AGC, preamp, attenuatore e potenza (Android) | Gli stessi | - | Esistono in `Ftx1Rig` ma senza schermata | Aggiunto (collegamento in `RigActivity`) |
| Misuratori `RM1`-`RM8` (web) | WebUI, bg7nzl, PR2EM, ITM, rigplane | Sì, ogni 1 s | - | Già esistente |
| Misuratori `RM1`-`RM8` (Android) | Gli stessi | - | Solo S-meter MAIN | Aggiunto (in `RigActivity`; `supportsMeter` e `supportsRfPower` per `Ftx1Rig`) |
| Noise blanker `NL` (OFF/001-010) | gnfrazier, PR2EM, WebUI | No | No | Aggiunto (web e Android) |
| DNR `RL` (OFF/01-10) | gnfrazier, PR2EM, EUG, ITM | No | No | Aggiunto (web e Android) |
| Auto notch `BC` OFF/ON | WebUI, ITM, rigplane | No | No | Aggiunto (web e Android) |
| Notch manuale `BP` (stato P2=0; frequenza 001-320 x10 Hz con P2=1; in FM la risposta non numerica è null) | bg7nzl, WebUI, ITM, rigplane | No | No | Aggiunto (web e Android) |
| Narrow `NA` OFF/ON | gnfrazier, WebUI, SEM | No | No | Aggiunto (web e Android) |
| Clarifier `CF` (on/off e offset -9999..+9999 Hz) | gnfrazier, ew1abz-control, ITM | No | No | Aggiunto (web e Android) |
| Velocità CW `KS` (4-60 WPM) | gnfrazier, WebUI, ITM, EUG | No | No | Aggiunto (web e Android) |
| Blocco del pannello `LK` OFF/ON | gnfrazier, SEM, RZO, POK | No | No | Aggiunto (web e Android) |
| Memorie split `MZ` | ew1abz-memory, SEM | No | Sì | Già esistente (Android). Web: fuori ambito (non pianificato in questo ramo) |
| PMS, banda dei 5 MHz, EMGCH | ew1abz-memory, SEM | No | No | Fuori ambito (non pianificato in questo ramo) |
| Cancellare un canale di memoria | nessuno (nessun comando documentato) | No | No | Fuori ambito (non c'è un comando documentato) |
| PTT (`TX`/`MX`), pressione del CW (`KY`, `PB`, relay CW) | bg7nzl, gnfrazier, EUG, captobie, ITM | No | Prova di PTT da 3 s esistente | Fuori ambito (attiva il trasmettitore) |
| Avvio dell'accordatore (`AC` P3=3) e scansione dell'accordatore | WebUI, ITM, hatandspecs | No | No | Fuori ambito (attiva il trasmettitore) |
| Cambio di banda `BS`/`BU`/`BD` e scambio `AB`/`BA`/`SV` | PR2EM, ITM, WebUI, SEM, POK | No | No | Fuori ambito (solo impostazione, non verificabile) |
| `SPR`/`SPW` (EEPROM di servizio) | Evgeny161rus-ftx1-region-tool | No | No | Fuori ambito (scrive EEPROM di servizio) |
| Cambio di regione e limiti di TX | Evgeny161rus-ftx1-region-tool | No | No | Fuori ambito (cambia le bande di TX, legale e garanzia) |
| Calibrazione | nessuno (solo reset/calibrazione nel menu EX) | No | No | Fuori ambito (rischio di perdita di calibrazione) |
| Caricamento di firmware o patch | sq9pd, Reid-n0rc | No | No | Fuori ambito (può rendere la radio inutilizzabile) |
| Doppler dei satelliti | Look4Sat-FTX1 | No | Tracking tramite `RigTracker` (FA, FB, ST) | Già esistente (Android). Web: fuori ambito (non pianificato in questo ramo) |
| Scope, waterfall e audio USB | WebUI, POK, ITM, RZO | No | No | Fuori ambito (non pianificato in questo ramo) |
| Decodificatori (CW, RTTY, FT8) e diario | EUG, POK | No | Modulo digitale FT8/FT4 a parte | Fuori ambito (non pianificato in questo ramo) |
| Tunnel TCP/rigctl e accesso remoto | BYF, bg7nzl, captobie, RZO | No | No | Fuori ambito (non pianificato in questo ramo; senza autenticazione nei riferimenti) |
| Orologio `DT`, schermo `DA`, memorie vocali `LM`/`PB` e del tasto `KM` | SEM, ITM, EUG | No | No | Fuori ambito (**ESCRIBE EN LA RADIO** senza necessità per ricezione/VFO) |

Riepilogo delle funzioni pianificate: sono solo di ricezione e VFO, ogni
scrittura viene controllata nell'intervallo prima dell'invio e verificata
rileggendo, e nulla attiva il trasmettitore. Sul web: `NL`, `RL`, `BC`, `BP`, `NA`,
`CF`, `KS`, `LK` (P1: 0 = MAIN, 1 = SUB), il pannello VFO (frequenza A/B con
l'API esistente, modo MAIN con `MD0 m;` e rilettura) e split `ST0`/`ST1`. Su
Android: collegare a `RigActivity` le impostazioni di `Ftx1Rig` (AF, RF, SQL,
larghezza, IF shift, AGC, preamp, attenuatore e potenza) e i misuratori
`RM1`-`RM8`, e riportare `supportsMeter` e `supportsRfPower` per `Ftx1Rig`.
Escluso di proposito: PTT/KY/manipolazione del CW, avvio dell'accordatore,
`BU`/`BD`/`SV`/`AB`/`BA`, `SPR`/`SPW`, cambi di regione o limiti di TX,
calibrazione e caricamento di firmware.

