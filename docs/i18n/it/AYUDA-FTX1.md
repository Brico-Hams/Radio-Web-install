# Guida Yaesu FTX-1: memorie e configurazione

L'editor web FTX-1 Beta legge, modifica, copia e scrive le memorie e le
impostazioni del menu dello Yaesu FTX-1 dal browser, tramite la porta CAT USB e
Web Serial. Usa solo i comandi documentati nel manuale ufficiale Yaesu "CAT
Operation Reference Manual" dell'FTX-1. Non sostituisce ADMS né il software
Yaesu e non invia dati a nessun server.

## Requisiti e connessione

- Chrome o Edge su `localhost` o HTTPS (Web Serial).
- Firmware MAIN 1.08 o successivo: il manuale indica che il CAT non funziona con
  versioni precedenti.
- Cavo USB-C verso la radio. Windows mostra due porte "Silicon Labs Dual
  CP210x"; va bene la `Enhanced COM Port` (CAT-1) o la `Standard COM Port` (CAT-2).
- Chiudi qualsiasi altro programma CAT (WSJT-X, logger, cat-ftx1) prima di
  connetterti.
- Velocità: quella di `CAT-1 RATE` o `CAT-2 RATE` secondo la porta (di fabbrica
  38400 e 4800 bps). Una FTX-1 reale ha risposto su CAT-2 a 4800 bps.

Alla connessione la pagina invia `ID;` ed esige la risposta `ID0840;` dell'FTX-1.
Poi invia `AI0;` per disattivare l'informazione automatica durante il lavoro.

## Memorie

"Leggi memorie" interroga i canali scelti (1-999) con `MR` e il nome con `MT`. Un
canale vuoto risponde `?;` e viene mostrato come libero. Puoi modificare:

| Campo | Comando | Valori |
|---|---|---|
| Frequenza | `MW` | 0.030000-470.000000 MHz |
| Modo | `MW` | LSB, USB, CW-U, CW-L, FM, FM-N, AM, AM-N, RTTY, DATA, PSK, C4FM |
| Tono | `MW` | OFF, CTCSS ENC/DEC, CTCSS ENC, DCS, PR FREQ, REV TONE |
| Shift | `MW` | Simplex, + o - |
| Nome | `MT` | Fino a 12 caratteri ASCII |

Il clarifier viene conservato come letto. La frequenza del subtono, il codice
DCS e l'ampiezza dello shift non fanno parte di `MR`/`MW`: sono impostazioni FM
globali del menu (`TONE FREQ`, `DCS CODE`, `RPT SHIFT(144MHz)`,
`RPT SHIFT(430MHz)`) modificabili nella sezione di configurazione. Non esiste un
comando documentato per cancellare un canale: un canale occupato non può essere
svuotato dalla pagina web.

"Copia canale" duplica un canale in un'altra posizione dell'editor. "Esporta
CSV" crea un CSV con colonne CHIRP; "Importa CSV" accetta CSV CHIRP o OpenGD77
con canali FM e li colloca a partire dal canale iniziale indicato. I toni di
origine vanno persi nell'importazione: controllali prima di scrivere.

## Configurazione della radio (menu)

La tabella è generata dalla tabella 3 (MENU Chart) del manuale con
`scripts/build-ftx1-menu.py`. Ogni impostazione si legge con `EX` e si scrive con
lo stesso comando, rispettando il numero di cifre e i valori documentati. Le
voci segnate "-" nel manuale non sono proposte. Restano in sola lettura le
impostazioni che possono interrompere il collegamento CAT (velocità, timer e bit
di stop CAT, porta TUN/LIN), la regolazione di riferimento `REF FREQ ADJ`, la
destinazione APRS fissa e lo stato Bluetooth.

## Copia, simulazione e scrittura

La scrittura resta bloccata finché non si completano tre passi nella stessa
sessione:

1. Leggere dalla radio.
2. Scaricare la copia JSON di quella lettura (`bricohams-ftx1-backup`).
3. Premere "Simula scrittura" e controllare la tabella delle differenze.

Vengono inviati solo i canali o le impostazioni modificati. Ognuno viene riletto
e confrontato con quanto inviato; se la radio risponde `?;` o un valore diverso,
la scrittura si ferma e indica il canale o l'impostazione. Per annullare, carica
la copia JSON con "Ripristina copia JSON", simula e scrivi di nuovo.

## Controllo remoto (CAT)

Il pannello «4. Controllo remoto (CAT)» agisce solo sulla ricezione; non invia
mai comandi di trasmissione. Scegli MAIN o SUB, premi «Leggi» e modifica i
controlli: ogni modifica viene inviata, riletta e confrontata. I valori fuori
intervallo vengono rifiutati prima dell'invio. I misuratori (`SM`, `RM`) possono
aggiornarsi ogni secondo; il polling si ferma alla disconnessione o in caso di
errore.

| Comando | Uso |
| --- | --- |
| `SM P1;` | S-meter, 000-255 (sola lettura) |
| `RM P1;` | Misure 1 S(MAIN), 2 S(SUB), 3 COMP, 4 ALC, 5 PO, 6 SWR, 7 IDD, 8 VDD (sola lettura) |
| `AG P1 P2P2P2;` | Guadagno AF, 000-255 |
| `RG P1 P2P2P2;` | Guadagno RF, 000-255 |
| `SQ P1 P2P2P2;` | Squelch, 000-255 |
| `SH P1 0 P3P3;` | Larghezza: indice 00-23 della Tabella 5 del manuale (il valore in Hz dipende dal modo; si mostra solo l'indice) |
| `IS P1 0 P3 P4P4P4P4;` | Shift IF, -1200..+1200 Hz a passi di 20 Hz |
| `GT P1 P2;` | AGC: 0 OFF, 1 FAST, 2 MID, 3 SLOW, 4 AUTO (la lettura distingue AUTO-FAST/MID/SLOW) |
| `PA P1 P2;` | Preamplificatore: 0 HF/50 (IPO, AMP1, AMP2), 1 VHF e 2 UHF (OFF, ON) |
| `RA0 P2;` | Attenuatore RF, 0 OFF, 1 ON |
| `PC P1 P2P2P2;` | Potenza: 1 = testa FTX-1 (5-10 W), 2 = SPA-1 (5-100 W); l'intervallo deriva dalla risposta della radio |

L'elenco delle funzioni si ispira a cat-ftx1 (rzochowski, licenza MIT secondo il
suo autore; il file LICENSE è ancora in sospeso in quel repository). Non è stato
copiato codice.

## Limiti

- Solo canali di memoria 1-999. PMS, 5 MHz, canale di emergenza e memorie split
  (`MZ`) non vengono modificati.
- Il README di cat-ftx1 avverte che alcune risposte reali dell'FTX-1 differiscono
  dal manuale. Prova prima con un canale libero e conserva sempre la copia.
- I modi segnati "-" nel manuale (per esempio il codice `0`, usato da alcuni
  canali reali) vengono letti e mostrati ma mai scritti: scegli prima un altro
  modo.
- Il manuale Yaesu non è distribuito con questo progetto.
