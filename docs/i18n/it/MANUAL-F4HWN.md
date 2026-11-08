# Manuale F4HWN (FH4): guida ai menu Bricohams

Manuale di riferimento del firmware F4HWN (FH4) per Quansheng UV-K5 e UV-K6:
blocco, retroilluminazione e i 68 menu dell’apparato. Edizione Bricohams dell’
8-11-2026. [Manuale completo in PDF](../../manuals/Manual_F4HWN_FH4_Bricohams_v2.pdf)
(13 pagine; include l’allegato stampabile di riferimento rapido di 3 pagine,
pagine 11-13). Il PDF è in spagnolo.

## Prima di tutto: attiva ALL

Premi MENU e seleziona `ALL` prima di usare questa guida. Senza ALL non
compariranno tutti i menu.

1. Premi il tasto MENU dell’apparato.
2. Nella schermata di selezione, cerca l’opzione ALL.
3. Conferma ALL e poi entra nel menu generale per vedere tutte le opzioni.

Se non selezioni ALL, comparirà solo una parte dei menu disponibili, la
numerazione visibile potrà sembrare incompleta rispetto a questa guida e il
numero totale di opzioni può variare in base alla versione e alla compilazione
del firmware. Dopo aver selezionato ALL, usa la guida in base al nome del menu e
non solo al numero.

## Ambito e numerazione

F4HWN (FH4) è un firmware personalizzato sviluppato da Armel, F4HWN, per la
famiglia Quansheng UV-K5 e le varianti compatibili, incluso l’UV-K6. Introduce
miglioramenti all’interfaccia, alla ricezione, ai tasti configurabili, alla
scansione e alla gestione dell’energia. La disponibilità delle funzioni dipende
sia dall’apparato sia dalle opzioni di compilazione.

Le 68 voci seguono l’ordine editoriale del manuale, non la numerazione
universale di tutte le versioni F4HWN. L’elenco reale può cambiare tra
compilazioni. Individua sempre le impostazioni dal nome breve (mnemonico) se il
numero non coincide e controlla `SysInf` per sapere quale compilazione è
installata. Alcune opzioni citate sono condizionali o possono mostrare etichette
diverse.

Nota Bricohams: le immagini di questo installer web sono F4HWN v6.1.0 per
UV-K5 V3 / UV-K1 (edizioni Bricohams negli slot). I menu si trovano tramite il
mnemonico e le opzioni dipendono dalla compilazione.

Discrepanza di numerazione segnalata dal manuale stesso: la sezione 2.3 del PDF
numera BLTime, BLMin e BLMax come 38, 39 e 40, mentre la tabella li numera 36,
37 e 38. Questa guida segue la tabella.

## Menu critici passo per passo

### KeyLck (30): blocco automatico

1. Premi MENU nella schermata principale.
2. Individua `KeyLck` con i tasti di navigazione.
3. Premi MENU per modificare e seleziona OFF o un tempo tra 00:15 e 10:00, a
   passi di 15 secondi.
4. Conferma con MENU ed esci con EXIT.
5. Attendi il tempo impostato senza premere tasti e verifica il blocco. Per
   sbloccare, usa la combinazione prevista dalla tua edizione; in molte varianti
   è una pressione prolungata di F/#.

Consiglio: 00:30-01:00 per il trasporto; OFF per l’uso continuo. L’ambito di
questo blocco dipende da `SetLck`.

### SetLck (63): ambito del blocco

1. Apri MENU e cerca `SetLck`.
2. Premi MENU per cambiare l’impostazione.
3. Seleziona KEYS per bloccare solo i tasti lasciando il PTT operativo, oppure
   KEYS+PTT per bloccare anche il pulsante di trasmissione.
4. Conferma, esci e prova il funzionamento in sicurezza, senza trasmettere al di
   fuori delle frequenze autorizzate.

Consiglio: KEYS+PTT evita emissioni accidentali durante il trasporto; KEYS
permette di usare il PTT senza sbloccare.

### BLTime, BLMin, BLMax e BLTxRx: luce fissa

1. Cerca `BLTime` (36 nella tabella) e seleziona ON per mantenere la
   retroilluminazione sempre accesa. Altre opzioni: OFF oppure da 5 secondi a
   5 minuti, a passi di 5 s.
2. Entra in `BLMin` (37): imposta la luminosità minima o di riposo, normalmente
   0-9; inizia con 0-2 per risparmiare energia.
3. Entra in `BLMax` (38): imposta la luminosità di attivazione, normalmente
   1-10; 3-5 è un punto di partenza pratico.
4. Controlla `BLTxRx` (39): OFF, TX, RX o TX/RX; scegli quali eventi attivano
   l’illuminazione.
5. Conferma ogni valore e osserva lo schermo a riposo, in ricezione e in
   trasmissione consentita. Se si spegne inaspettatamente, controlla i valori
   di luminosità minima e le scorciatoie di spegnimento temporaneo.

Autonomia: tenere accesa la retroilluminazione, soprattutto con BLMin/BLMax
alti, può ridurre sensibilmente la durata della batteria. BLTime=ON con
luminosità elevata scarica prima la batteria; per l’uso quotidiano prova
BLTime=10-20 s e una luminosità bassa. ON è utile da tavolo, con alimentazione
adeguata o quando prevale la visibilità.

## Riferimento dei 68 menu

Organizzazione funzionale del manuale. La numerazione può non coincidere con
compilazioni diverse; dai sempre priorità al mnemonico.

### 01-13: parametri di base di radio, audio e trasmissione

| N. | Menu | Funzione | Opzioni |
| --- | --- | --- | --- |
| 01 | `Step` | Passo di sintonia. | 0,01; 0,05; 0,1; 0,25; 0,5; 1; 1,25; 2,5; 5; 6,25; 8,33; 9; 10; 12,5; 15; 20; 25; 30; 50; 100; 125; 200; 250 e 500 kHz, secondo la compilazione. |
| 02 | `Power` | Potenza di trasmissione del canale. La potenza reale dipende da frequenza, batteria e calibrazione. | USER, LOW1-LOW5, MID e HIGH. Valori approssimativi: inferiore a 20 mW, 125 mW, 250 mW, 500 mW, 1 W, 2 W e 5 W; USER adotta `SetPwr`. |
| 03 | `RxDCS` | Filtra la ricezione tramite codici DCS digitali. Deve coincidere con il segnale ricevuto. | OFF e codici normale (N) o invertito (I) della tabella standard disponibile, come D023N/D023I fino a D754. |
| 04 | `TxDCS` | Invia un codice DCS durante la trasmissione. Non offre privacy né cifratura. | OFF e codici DCS della tabella standard in polarità N o I. |
| 05 | `RxCTCS` | Apre l’audio solo quando rileva il subtono analogico CTCSS selezionato. | OFF o toni normalizzati da 67,0 a 254,1 Hz, inclusi 88,5, 100,0 e 123,0 Hz. |
| 06 | `TxCTCS` | Aggiunge all’audio trasmesso il subtono CTCSS scelto; usalo quando un ripetitore richiede un tono di accesso. | OFF o toni standard da 67,0 a 254,1 Hz. |
| 07 | `TxODir` | Direzione dello shift di trasmissione. | OFF (nessuno shift), + (trasmette sopra RX) o − (sotto). |
| 08 | `TxOffs` | Entità dello shift TX/RX in MHz; regolabile a passi dell’apparato. Esempio: 0,600 MHz su un ripetitore che lo richiede. | Nominalmente tra 0 e 999,99999 MHz secondo i limiti di banda. |
| 09 | `W/N` | Larghezza del canale. Adattala al canale e alle norme applicabili. | WIDE (circa 25 kHz) o NARROW (12,5 kHz; può usare l’impostazione più stretta di `SetNFM`). |
| 10 | `BusyCL` | Blocco per canale occupato. | OFF consente di premere il PTT con attività rilevata; ON impedisce di trasmettere quando il canale è considerato occupato. |
| 11 | `Compnd` | Compander audio: comprime l’audio in trasmissione e/o lo espande in ricezione; conviene che entrambe le estremità siano compatibili. | OFF, TX, RX o TX/RX. |
| 12 | `Mode` | Modo di demodulazione. Le modalità e la capacità di trasmissione dipendono da hardware e versione. | FM, AM e, quando la compilazione lo include, USB. |
| 13 | `TXLock` | Blocco di trasmissione specifico del canale. | OFF abilita TX nel rispetto delle altre restrizioni; ON rende il canale di sola ricezione. |

### 14-23: memorie, canali e liste di scansione

| N. | Menu | Funzione | Opzioni |
| --- | --- | --- | --- |
| 14 | `ScAdd1` | Include il canale attuale nella lista di scansione 1; può appartenere anche ad altre liste. | OFF / ON. |
| 15 | `ScAdd2` | Include il canale attuale nella lista di scansione 2. | OFF / ON. |
| 16 | `ScAdd3` | Include il canale attuale nella lista di scansione 3. | OFF / ON. |
| 17 | `SList1` | Parametri di priorità/canali della lista 1 nelle varianti che espongono questa voce. Il significato esatto può variare. | Canali di memoria programmati (0-199) e selezione senza priorità secondo l’edizione. |
| 18 | `SList2` | Parametri di priorità/canali della lista 2; verifica l’etichetta sullo schermo. | Posizioni di memoria 0-199 e disattivazione della priorità secondo l’edizione. |
| 19 | `SList3` | Parametri di priorità/canali della lista 3. | Posizioni di memoria 0-199 e disattivazione della priorità secondo l’edizione. |
| 20 | `SList` | Lista usata all’avvio della scansione. | LIST [0] (canali senza lista), LIST [1], LIST [2], LIST [3], LISTS [1,2,3] o ALL (tutti i canali). |
| 21 | `ChSave` | Salva la frequenza e le impostazioni del VFO in una memoria libera o selezionata. Controlla prima di confermare, perché può sovrascrivere dati. | Memoria 0-199. |
| 22 | `ChDele` | Elimina il canale di memoria selezionato. Riguarda i dati archiviati: salva una copia con CHIRP prima di cancellazioni di massa. | Memoria 0-199. |
| 23 | `ChName` | Modifica il nome mostrato di un canale di memoria. | Memoria 0-199; fino a 10 caratteri nelle versioni documentate: lettere, numeri, spazi e alcuni simboli. |

### 24-32: tasti, blocco e risparmio

| N. | Menu | Funzione | Opzioni |
| --- | --- | --- | --- |
| 24 | `ScnRev` | Comportamento al rilevamento di un segnale durante la scansione. | STOP (fermarsi), CARRIER (riprendere al cessare del segnale, con attesa selezionabile da 0,25 a 20 s) o TIMEOUT (riprendere dopo 5-120 s anche se il segnale continua). |
| 25 | `F1Shrt` | Funzione della pressione breve del pulsante laterale F1. | Secondo la compilazione: NONE, MONITOR, SCAN, POWER, FLASHLIGHT, VOX, FM RADIO, VFO A/B, VFO/MEM, LOCK KEYPAD, 1750 Hz, BACKLIGHT e altre. |
| 26 | `F1Long` | Funzione della pressione lunga del pulsante laterale F1; può essere riservata a blocco o monitor. | Stesse famiglie di azioni assegnabili di `F1Shrt`. |
| 27 | `F2Shrt` | Funzione della pressione breve del pulsante laterale F2. | Un’azione dell’elenco disponibile, per esempio SCAN, POWER, MONITOR, MUTE o cambio di RX MODE. |
| 28 | `F2Long` | Funzione della pressione lunga di F2. | Opzioni di assegnazione equivalenti, soggette alle funzioni attivate nella compilazione. |
| 29 | `M Long` | Azione della pressione lunga di MENU. | Può essere assegnata a torcia, scansione, cambio VFO/memoria, blocco, luce e altre funzioni previste dall’edizione. |
| 30 | `KeyLck` | Timer di blocco automatico della tastiera. L’ambito del blocco si definisce in `SetLck` (63). | OFF o da 00:15 a 10:00 min a intervalli di 15 s. |
| 31 | `TxTOut` | Tempo massimo di trasmissione continua (TOT). Allo scadere interrompe TX; `SetTOT` controlla come avvisa. | Intervalli di 5 s, tipicamente da 30 s a 15 min secondo il firmware. |
| 32 | `BatSav` | Risparmio energetico del ricevitore. Valori più alti favoriscono l’autonomia, ma possono peggiorare il rilevamento di segnali brevi. | OFF o rapporti riposo/attività 1:1, 1:2, 1:3, 1:4 e 1:5. |

### 33-41: schermo, retroilluminazione e contrasto

| N. | Menu | Funzione | Opzioni |
| --- | --- | --- | --- |
| 33 | `BatTxt` | Informazione sulla batteria nell’interfaccia. | NONE (nessun testo), VOLTAGE (tensione in V) o PERCENT (percentuale stimata). |
| 34 | `ChDisp` | Presentazione del canale. Per mostrare il nome serve un nome salvato. | FREQ (frequenza), CHANNEL NUMBER (numero), NAME (nome) o NAME+FREQ. |
| 35 | `POnMsg` | Schermata/avviso di accensione; etichette concrete secondo l’edizione. | ALL/FULL (informazione completa), SOUND, MESSAGE, VOLTAGE o NONE. |
| 36 | `BLTime` | Durata della luce di fondo. ON aumenta il consumo; `BLMin` e `BLMax` modulano la luminosità. | OFF, da 5 s a 5 min a passi di 5 s, oppure ON (sempre accesa). |
| 37 | `BLMin` | Luminosità minima o di riposo. 0 la riduce al minimo o spegne la luce a riposo; un valore maggiore consuma di più. | Livelli 0-9 (alcuni controller mostrano 0-10). |
| 38 | `BLMax` | Luminosità massima con schermo attivo. Usa il minimo leggibile; il contrasto si regola a parte con `SetCtr`. | Livelli 1-10. |
| 39 | `BLTxRx` | Attivazione dell’illuminazione durante la comunicazione; controlla gli eventi di accensione della luce in trasmissione o ricezione. | OFF, TX, RX o TX/RX. |
| 40 | `SetCtr` | Contrasto dell’LCD. Regolalo per bilanciare leggibilità e ombreggiatura, soprattutto se si usa l’inversione visiva. | Valori 1-15. |
| 41 | `SetInv` | Inverte l’aspetto dello schermo. Non modifica il consumo della retroilluminazione in modo equivalente a `BLTime`. | OFF (normale) o ON (invertito). |

### 42-52: avvisi, toni e segnalazione DTMF

| N. | Menu | Funzione | Opzioni |
| --- | --- | --- | --- |
| 42 | `Beep` | Bip di conferma della pressione dei tasti. | OFF / ON. |
| 43 | `Roger` | Avviso al rilascio del PTT. Rispetta le prassi del canale. | OFF, ROGER (bip) o MDC (segnalazione di tipo dati nelle compilazioni che la offrono). |
| 44 | `STE` | Soppressione della coda di rumore al termine di una trasmissione; richiede compatibilità per essere efficace. | OFF / ON. |
| 45 | `RP STE` | Soppressione della coda tramite ripetitore. | OFF o ritardi 100-1000 ms (passi di 100 ms), secondo la versione. |
| 46 | `1 Call` | Canale di chiamata rapida assegnato all’accesso tramite scorciatoia/tasto compatibile. | Memoria 0-199. |
| 47 | `UPCode` | Stringa DTMF che può essere emessa alla pressione del PTT. | Fino a 16 caratteri, con cifre 0-9 e simboli DTMF consentiti. |
| 48 | `DWCode` | Stringa DTMF che può essere emessa al rilascio del PTT. | Fino a 16 caratteri dell’alfabeto DTMF consentito. |
| 49 | `PTT ID` | Momento di emissione dell’identificazione DTMF. | OFF, UP CODE, DOWN CODE, UP+DOWN CODE o APOLLO QUINDAR (secondo l’edizione). |
| 50 | `D ST` | Riproduzione locale dei toni DTMF durante la composizione. | OFF / ON. |
| 51 | `D Prel` | Tempo preliminare della segnalazione DTMF; permette di stabilizzare il collegamento prima di inviare i toni. | Valori 3-99 unità da 10 ms (30-990 ms). |
| 52 | `D Live` | Decodificatore DTMF in tempo reale sullo schermo. Richiede una ricezione dei toni sufficientemente pulita. | OFF / ON. |

### 53-60: sistema, ricezione e regolazioni fini

| N. | Menu | Funzione | Opzioni |
| --- | --- | --- | --- |
| 53 | `VOX` | Trasmissione attivata dalla voce. Prova con il rumore ambientale; una soglia inadeguata provoca attivazioni indesiderate. | OFF o livelli di sensibilità 1-10. |
| 54 | `SysInf` | Informazioni di sistema, normalmente di sola lettura: versione del firmware e dati come la tensione della batteria. Le informazioni esatte dipendono dalla compilazione. | Consultazione / sola lettura. |
| 55 | `RxMode` | Gestione del doppio ascolto: controlla quale VFO si ascolta e quale trasmette. | MAIN ONLY, DUAL RX RESPOND, CROSS BAND o MAIN TX DUAL RX. |
| 56 | `Sql` | Livello dello squelch. 0 lascia l’audio aperto; livelli alti richiedono un segnale più forte per aprire lo squelch. | 0-9. |
| 57 | `SetPwr` | Definisce la potenza che userà Power=USER (valori nominali). | Inferiore a 20 mW, 125 mW, 250 mW, 500 mW, 1 W, 2 W o 5 W. |
| 58 | `SetPTT` | Comportamento del PTT. Verifica lo stato TX usando ONEPUSH. | CLASSIC (tenere premuto per trasmettere) o ONEPUSH (commutazione a pressioni). |
| 59 | `SetTOT` | Forma dell’avviso di limite di tempo TX. Non sostituisce l’impostazione `TxTOut`. | OFF, SOUND (suono), VISUAL (schermo) o ALL (entrambi). |
| 60 | `SetEOT` | Avviso di fine trasmissione. Diverso da `Roger`, che aggiunge segnalazione all’audio trasmesso. | OFF, SOUND, VISUAL o ALL. |

### 61-68: interfaccia avanzata e opzioni di compilazione

| N. | Menu | Funzione | Opzioni |
| --- | --- | --- | --- |
| 61 | `SetMet` | Stile dello strumento di intensità del segnale (S-meter). | TINY o CLASSIC. |
| 62 | `SetGUI` | Stile/dimensione del carattere principale del VFO. Cambia la presentazione, non la sensibilità della radio. | TINY o CLASSIC. |
| 63 | `SetLck` | Ambito del blocco della tastiera. Lavora con il timer `KeyLck`. | KEYS (solo tasti) o KEYS+PTT (tasti e pulsante di trasmissione). |
| 64 | `SetTmr` | Visualizzazione dei timer di ricezione/trasmissione. | OFF / ON. |
| 65 | `SetOff` | Spegnimento automatico dell’apparato. | OFF o intervallo selezionabile da 1 min a 2 h, normalmente a passi di 1 min. |
| 66 | `SetNFM` | Larghezza di banda quando `W/N` è su stretto. NARROWER è presente solo nelle compilazioni che lo includono. | NARROW (~12,5 kHz) o NARROWER (~6,25 kHz). |
| 67 | `SetVol` | Regolazione di guadagno/volume interno; non equivale al controllo fisico del volume. | Livelli 0-63 nelle compilazioni con ENABLE_FEAT_F4HWN_VOL. |
| 68 | `SetKey` | Rimappatura di un tasto speciale nelle varianti RescueOps. Non è disponibile in tutte le compilazioni. | MENU, UP, DOWN, EXIT o STAR. |

## Raccomandazioni d’uso

- Salva con CHIRP una copia delle memorie e della configurazione prima di
  flashare, ripristinare o cancellare canali: [modulo CHIRP F4HWN](AYUDA-QUANSHENG.md).
- I toni CTCSS/DCS selezionano segnali: non offrono privacy, cifratura né
  garanzia di canale libero.
- Rispetta sempre i limiti di banda, potenza e licenza applicabili. La capacità
  tecnica di trasmettere fuori da una banda non equivale ad autorizzazione.
- Se una voce cambia numero o manca, controlla `SysInf` e consulta la
  compilazione installata prima di interpretare l’impostazione.

## Fonti

- Repository originale: <https://github.com/armel/uv-k1-k5v3-firmware-custom>
- Definizione di elenco e opzioni:
  <https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/main/App/ui/menu.c>
- Riferimento documentale dei menu:
  <https://deepwiki.com/armel/uv-k1-k5v3-firmware-custom/8.1-menu-item-reference>
- Driver CHIRP con valori configurabili:
  <https://github.com/armel/uv-k5-chirp-driver>

Nota editoriale: guida tecnica indipendente preparata con l’identità grafica
fornita di Bricohams. Non è presentata come documentazione ufficiale dello
sviluppatore. Intervalli e funzioni possono variare in base alla compilazione.

[Quansheng e versioni](AYUDA-QUANSHENG.md) · [Opzioni di compilazione F4HWN](AYUDA-OPCIONES-F4HWN.md) · [Firmware Bricohams](BRICOHAMS-FIRMWARE.md)
