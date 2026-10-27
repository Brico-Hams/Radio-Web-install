# Bricohams V3: compilazione modulare locale

## Identità e ambito

**BETA, in fase di convalida e test.** Le nuove compilazioni dichiarano
`stability: "beta"` e l'ambito di convalida in `build-info.json`, coperto da
SHA256SUMS. Si mantiene `hardwareTested: false` finché quello specifico binario non viene testato.
La lettura reale di una radio con F4HWN v6.0.0 non convalida questi firmware Bricohams.
La Modalità PRO del web riduce le conferme, non cambia moduli, licenze né
protezioni del firmware.

Edizione derivata dalla base open F4HWN per **UV-K5 V3 / UV-K1 PY32**. Non è Karina,
non supporta UV-K5 V1 e non aggiunge un bootloader proprio. Riutilizza il multiboot dell'
upstream e conserva la propria identità di protocollo `F4HWN v6.1.0`. L'edizione del
display passa a `Bricohams` tramite una variabile CMake, senza patchare il binario.

Base fissata:

- Repository: <https://github.com/armel/uv-k1-k5v3-firmware-custom>.
- Commit: `f556a96e73c3e423a00cf473aeb37f827cac05a5`.
- Versione dichiarata dai preset: `v6.1.0`.
- Licenza/attribuzione: vengono distribuiti i `LICENSE` e `NOTICE` originali.
- I sorgenti locali di riferimento si trovano in `Documents\Multiboot\Fusion61`.
  La modifica non confermata in `App/settings.c` viene mantenuta e **non è inclusa**.

Si sceglie questa base open per proseguire sull'hardware V3 e sui relativi slot.
Le limitazioni che impediscono di derivare Karina sono documentate in [KARINA.md](KARINA.md).
I suoi algoritmi, menu e driver non sono stati portati.

## Compilare su richiesta

### Linea indipendente: piattaforma di applicazioni Bricohams

`firmware/platform` avvia una linea distinta dall'applicazione F4HWN.
Contiene un validatore/caricatore di pacchetti in memoria, un contratto iniziale
di servizi e app diagnostiche e di blocchi, scritti in C e testati su desktop.
Ora include un **residente sperimentale compilabile** con avvio e glue
LCD/tastiera PY32. Non è stato verificato l'avvio sulla radio. **Non è un
sostituto convalidato e installabile di Labs né un SDK completo.**
La connessione a USB, Flash, LCD, tastiera o RF fisici non è stata testata.

Il formato sperimentale BHA1 non è FAP1 e non deve essere installato con il
caricatore di app esistente sul web. Gli interi sono little-endian:

| Offset | Bytes | Campo |
| --- | ---: | --- |
| 0 | 4 | Magic ASCII BHA1 |
| 4 | 4 | Dimensione dell'header, 64 |
| 8 | 4 | Versione API, 2 |
| 12 | 4 | Architettura, 1 = Cortex-M Thumb |
| 16 | 4 | Dimensione del codice, pari, 2..4096 |
| 20 | 4 | Dati inizializzati, 0..1024 |
| 24 | 4 | BSS, azzerato al caricamento |
| 28 | 4 | Offset di ingresso pari all'interno del codice, senza bit Thumb |
| 32 | 4 | Capacità richieste: display 1, tastiera 2, RX 4 |
| 36 | 4 | CRC-32 del codice e dei dati concatenati |
| 40 | 16 | Nome ASCII stampabile, riempito con zeri se inferiore a 16 |
| 56 | 4 | Riservato, zero |
| 60 | 4 | CRC-32 dei primi 60 byte |

Seguono codice e dati, senza byte in eccesso. Codice, dati e BSS insieme
non possono superare 4096 byte: è un budget iniziale, non una misurazione
del firmware residente. Il caricatore convalida tutto prima di modificare il
buffer di destinazione, copia codice/dati e azzera BSS. Non chiama il codice,
non risolve rilocazioni né conosce l'indirizzo finale di linking. Il
descrittore di output deve essere indipendente dai buffer di input
e destinazione; memoria e durata sono responsabilità del chiamante.

I CRC rilevano la corruzione, **non autenticano l'autore**. Le capacità
sono un filtro di ammissione, non una sandbox: il codice nativo su un MCU senza
isolamento può accedere direttamente alle periferiche. Non si deve eseguire
codice non attendibile né dichiarare un isolamento della calibrazione tramite questo filtro.
Questo componente non offre API TX né scrittura Flash.

Restano da convalidare l'avvio, LCD e tastiera del residente su PY32, completare i
driver Flash/USB/RF, misurare stack e tempi reali, installazione transazionale fisica,
recupero e integrazione completa delle applicazioni con l'hardware. Doom non è stato
implementato. Questo formato è provvisorio e non dimostra il funzionamento
fisico delle app. La precedente linea dei profili non viene sostituita.

#### Prima app: diagnostica del display

`bh_api.h` definisce un'ABI C sperimentale versione 2 con versione, dimensione, contesto e callback
per pulire, scrivere testo e presentare il display, oltre a un buffer di stato
privato dell'app con la relativa dimensione. Riceve gli eventi START, KEY, TICK
e STOP. I tasti sono identificatori della piattaforma, non codici UART:
EXIT ha valore 1. L'app restituisce continua, esci o errore esplicito;
in caso di errore di una callback non richiede altri servizi del display.

`diagnostics.c` presenta quattro righe Bricohams e accetta EXIT/STOP senza
scrivere su RF o memoria. L'esecuzione desktop usa servizi simulati; si verificano
versione/dimensione, callback assenti ed errori in ogni fase. Ciò non esegue istruzioni ARM sulla radio.

```powershell
node scripts\build-platform-app.cjs firmware-builds\diagnostics-nuevo
```

Richiede gli strumenti ARM già usati dal progetto e una destinazione
nuova. Produce ELF, codice BIN, `diagnostics.bha`, licenza e manifesto
con SHA-256 dei sorgenti e del pacchetto. La compilazione API 2 produce un pacchetto di
300 byte: 64 di header e 236 di codice/costanti.
`app.ld` collega l'app a `0x20002000`; questo indirizzo è sperimentale,
**non è riservato nel firmware F4HWN e non deve essere usato al suo interno**.
Non supporta globali mutabili né rilocazioni dinamiche. Il futuro nucleo
dovrà riservare la regione, lo stack e i buffer senza sovrapposizioni prima di
consentire l'esecuzione del punto di ingresso in modalità Thumb.

Il test C del caricatore accetta `diagnostics.bha` come argomento e verifica
il pacchetto ARM reale, i CRC e la copia in RAM. È una prova di caricamento,
non di esecuzione ARM, installazione in Flash o avvio del firmware.

#### Seconda app: Blocks

`blocks.c` implementa un gioco originale con pezzi di quattro celle e sette
forme, rotazione senza wall kicks, collisioni, caduta, blocco, eliminazione
di righe, fine partita e riavvio. Non usa codice, immagini, suoni o dati
di Tetris o Doom. La griglia testuale è di 10 colonne e 6 righe per
provare le callback attuali; non è un port grafico finale per LCD.

LEFT/RIGHT spostano, ROTATE ruota, DOWN scende di un passo, DROP fissa il pezzo,
RESTART ricomincia ed EXIT esce. Ogni TICK fa scendere di un passo: il nucleo
dovrà definire la cadenza, senza dipendere dalla velocità del loop.
La sequenza pseudo-casuale è deterministica e si reimposta su START/RESTART.
Le righe sono conteggiate nello stato ma non sono ancora visualizzate come punteggio.

Lo stato deve essere fornito dal nucleo in memoria allineata, azzerata prima
del primo evento ed esclusiva per questa app. Il manifesto riserva un
budget esterno di 256 byte; non è BSS del pacchetto. Il contratto API 2
include questo buffer e sostituisce l'API 1 iniziale. Il caricatore rifiuta i
pacchetti API 1: non mescola silenziosamente contratti binari diversi.

```powershell
node scripts\build-platform-app.cjs firmware-builds\blocks-nuevo blocks
```

L'app viene compilata per Cortex-M0+ senza libreria C né helper di divisione:
940 byte di pacchetto (64 di header, 876 di codice/costanti).
I test desktop verificano movimento, rotazione, cancellazione di
righe, fine partita, riavvio, errori dei servizi e 10000 eventi
con controllo del comportamento indefinito. Il caricatore C convalida e
copia anche il pacchetto ARM reale. **Quel codice ARM non è stato eseguito sulla
radio. Il residente sperimentale include un launcher, ma non un installer
di pacchetti esterni.**

#### Launcher portabile

`bh_launcher.c` gestisce una sola app nativa alla volta con un buffer allineato
ed esclusivo di 256 byte. Inizializzare una nuova istanza e mantenerla allo
stesso indirizzo per tutta la sua vita: il contratto contiene un puntatore alla
propria memoria. Non copiare le istanze né reinizializzarle mentre un'app è in esecuzione.

START viene inviato esclusivamente da `bh_launcher_start`; il dispatcher
accetta KEY, TICK e STOP. Quando si cambia app si invia STOP alla precedente;
uscita o errore libera l'app e ne azzera tutto lo stato. Un errore STOP impedisce
di avviare l'app successiva. Le chiamate rientranti a start/stop/dispatch
durante una callback vengono rifiutate. I tick devono arrivare in serie
dal loop principale; non è un'API sicura per gli interrupt.

Il launcher invoca funzioni C già collegate per i test desktop.
**Non converte l'indirizzo di un pacchetto ARM in una funzione né esegue BHA1
sul PC.** Mancano ancora il ponte di esecuzione MCU, l'installazione in Flash,
i driver, il menu LCD e il recupero. È un ciclo di vita portabile
testato, non un launcher residente avviabile né una sandbox.

#### Installazione persistente con due banchi

`bh_store.c` implementa la memorizzazione portabile di **un pacchetto e della
sua versione precedente** in due banchi astratti da 8192 byte. Non costituisce
ancora un catalogo di più app. Il driver deve fornire le funzioni di lettura,
scrittura e cancellazione esclusivamente per questi banchi; non è stato assegnato
alcun indirizzo della Flash della radio né riutilizzata la mappa F4HWN.

Prima di cancellare si convalida l'intero pacchetto BHA1 API 2 e si consulta la
versione precedente. Si cancella solo il banco inattivo e si verifica tramite lettura
che tutti i suoi byte siano `0xff`, incluso il marcatore di conferma:
un ACK di cancellazione senza un'effettiva cancellazione viene rifiutato prima di programmare.
Si scrive in blocchi
che non attraversano pagine da 128 byte e si rilegge ogni blocco. L'header
BHS1 include versione, generazione, lunghezza e CRC del pacchetto; viene riletto prima
di scrivere `DONE` come conferma finale. Dopo la conferma si riconvalidano header e
pacchetto. Il banco precedente non viene cancellato al termine.

La lettura seleziona la generazione valida più recente e può ripristinare
quella precedente se la nuova è incompleta o corrotta. Se nessuno è valido
ma esiste un banco confermato corrotto, viene segnalato un errore e non si installa
automaticamente al suo posto. Un errore del driver interrompe l'operazione senza simulare un successo.
Generazioni uguali sono ambigue e vengono rifiutate; all'esaurimento di `uint32_t` si
blocca una nuova installazione invece di permettere un wrap.

Il chiamante deve fornire uno scratch indipendente dal pacchetto di almeno
4160 byte e serializzare tutte le operazioni. Questo massimo include
64 byte di header e 4096 di codice/dati combinati: non si sommano i
massimi individuali di codice e dati, perché il contratto BHA1 limita la
RAM totale a 4096. Si riducono 1024 byte rispetto allo scratch iniziale senza
ridurre l'insieme dei pacchetti validi. Si testano sia codice da 4096
byte sia codice da 3072 più dati da 1024, e il rifiuto senza I/O quando lo
scratch è più corto di un byte. Non c'è heap né un buffer
interno dell'intero banco. Dopo un errore finale di scrittura/rilettura,
l'installazione potrebbe essere stata confermata: occorre consultare di nuovo
prima di riprovare, non presumere un rollback.

`bh_store_load` collega la selezione del banco al caricamento convalidato in RAM:
copia codice/dati e azzera BSS, senza saltare al punto di ingresso. Scratch e RAM
devono essere indipendenti, così come il descrittore di output. Una destinazione
insufficiente restituisce `BH_STORE_NO_SPACE`; gli errori non modificano la RAM né
il descrittore. Il chiamante deve riservare l'indirizzo reale di linking prima
dell'esecuzione; questo helper non convalida gli indirizzi né converte i byte in una funzione.

I test con NOR simulata coprono 322 interruzioni/errori di lettura,
scrittura e cancellazione durante la prima installazione e l'aggiornamento, incluse
scritture parziali, falsi ACK di scrittura/cancellazione, corruzione, pacchetto
massimo, generazioni uguali, alternanza ed esaurimento della generazione.
Si verifica che il banco precedente resti invariato a ogni interruzione di un
aggiornamento. Si testano anche caricamento di codice/dati/BSS e conservazione della
RAM in caso di errori. Ciò non dimostra la tolleranza alle interruzioni di corrente
o l'atomicità del chip reale. Mancano driver SPI/Flash,
riserva dei settori, installer USB e collegamento al launcher residente.

Test mantenuti della piattaforma (è richiesto un compilatore C11 desktop):

```powershell
cmake -S firmware\platform -B firmware-builds\platform-tests -DBUILD_TESTING=ON
cmake --build firmware-builds\platform-tests
ctest --test-dir firmware-builds\platform-tests --no-tests=error --output-on-failure
```

Gli otto test C e il test d'integrazione JavaScript/C passano tramite
CMake/CTest su desktop. Il test di integrazione è abilitato se Node.js viene trovato.
Il workflow `firmware-modules.yml` include anche questa suite separata
su Linux con controllo del comportamento indefinito; la modifica del
workflow locale non implica che sia già stato eseguito su GitHub.
#### Ricevitore sperimentale BHT1 e client di trasferimento

`bh_transfer.c` implementa la macchina a stati del ricevitore, senza driver
seriale/USB. `scripts/platform-transfer.cjs` codifica le richieste, convalida
le risposte e fornisce `uploadPackage(exchange, bytes, session)`, in cui `exchange`
deve fornire un frame completo e restituire esattamente la relativa risposta.
Non apre porte né offre l'installazione nell'attuale web.

Ogni richiesta ha un header da 24 byte e fino a 128 byte di payload.
Tutti gli interi sono u32 little-endian:

| Offset | Campo |
| --- | --- |
| 0 | Magic BHT1 |
| 4 | Operazione: BEGIN 1, DATA 2, COMMIT 3, ABORT 4, STATUS 5 |
| 8 | ID di sessione non nullo, scelto dal client |
| 12 | Offset nel pacchetto per DATA; zero nelle altre operazioni |
| 16 | Lunghezza del payload |
| 20 | CRC-32 di header e payload, azzerando questo campo |

BEGIN contiene due u32: lunghezza totale (66..4160) e CRC-32 dell'intero BHA1.
DATA invia blocchi contigui da 1..128 byte. Un blocco duplicato viene accettato
solo se coincide esattamente con byte già ricevuti e non avanza due volte l'offset;
si rifiutano lacune e sovrapposizioni parziali. Un BEGIN duplicato della stessa
sessione/lunghezza/CRC conserva l'avanzamento. Una sessione diversa non può
interrompere una ricezione attiva. ABORT annulla senza chiamare l'installer;
STATUS interroga senza prolungare la scadenza. La ricezione scade dopo 30000 ms
da BEGIN o dall'ultimo DATA valido, usando differenze senza segno in caso di wrap.
Una sessione scaduta o annullata richiede un nuovo ID.

COMMIT richiede tutti i byte, CRC totale corretto e convalida BHA1/API/
capacità prima di invocare la callback installer. Un COMMIT duplicato non
la invoca di nuovo, sia in caso di successo sia di errore: un errore di
scrittura può significare che la Flash è già stata confermata. Il client non
ritenta automaticamente un COMMIT la cui risposta è stata persa; deve interrogare
STATUS e lo storage prima di decidere una nuova operazione.

La risposta BHR1 è di 32 byte: magic, operazione, sessione, risultato, byte
ricevuti, stato, risultato dell'installer (i32), CRC dei primi 28.
Risultati: OK 0, BAD_FRAME 1, BAD_SESSION 2, BUSY 3, BAD_OFFSET 4,
INCOMPLETE 5, BAD_PACKAGE 6, INSTALL_ERROR 7, EXPIRED 8, BAD_STATE 9.
Stati: IDLE 0, RECEIVING 1, DONE 2, FAILED 3, CANCELLED 4, TIMED_OUT 5.
Il client rifiuta CRC, sessione, operazione, stato o ACK di offset errati.

Il chiamante deve serializzare le chiamate, mantenere vivi istanza e staging
e fornire buffer indipendenti per istanza, staging, frame e risposta.
È richiesto staging da 4160 byte. La callback lo riceve solo durante COMMIT
e non deve modificarlo né conservarlo. Una chiamata rientrante
restituisce BUSY senza generare una risposta. Il futuro trasporto fisico dovrà
limitare le attese, segnalare le disconnessioni e gestire il controllo di flusso.
L'API di trasferimento riceve frame completi;
la ricomposizione da un flusso frammentato arbitrariamente spetta a
`bh_stream.c`, descritto di seguito.
I CRC e l'ID di sessione **non autenticano il mittente**.

`bh_stream.c` consuma un byte per chiamata, riconosce magic BHT1 e lunghezza
limitata a 128 byte, e verifica il CRC prima di consegnare il frame al
ricevitore. Non richiede prefissi di lunghezza né separatori aggiuntivi.
Tollera frame frammentati o concatenati. Cerca nuovamente il magic dopo
rumore, lunghezza impossibile o CRC errato; un magic all'interno di un payload
valido non viene interpretato come una seconda richiesta. Restituisce errori
espliciti di framing e solo `BH_STREAM_REPLY` autorizza l'invio del suo buffer BHR1.
Il chiamante deve segnalare o registrare tali errori, non simulare un successo.

Un frame parziale scade dopo 1000 ms senza nuovi byte, usando differenze
senza segno per tollerare il wrap. `bh_stream_poll` consente di controllare
questa scadenza senza ricevere un altro byte. Un timeout scarta solo il frame
parziale, non annulla la sessione di trasferimento né altera il banco precedente.
Il driver dovrà segnalare una disconnessione e decidere se consentire la ripresa della sessione esistente.
Le chiamate e i buffer devono essere serializzati; la callback installer non
deve rientrare nello stream. Non c'è heap: il buffer di assemblaggio occupa 152 byte,
oltre alla struttura, alla risposta, allo staging e alla memoria temporanea del validatore.

L'integrazione desktop invia il flusso BHT1 grezzo da JS al ricevitore C tramite pipe,
installa su NOR simulata e convalida il successivo caricamento in RAM; copre due
generazioni, pacchetto massimo e ripetizioni senza reinstallare, inserendo rumore
prima di ogni frame. È stato rimosso il prefisso di lunghezza esclusivo del
primo harness. Lo stesso test con i pacchetti ARM
reali di Diagnostics e Blocks completa 34 scambi JS/C, inclusi
annullamento e rifiuto di CRC totale errato senza sostituire il banco attivo.
Il test C verifica anche 10000 frame malformati senza modificare la sessione
né chiamare l'installer. Lo stream testa tutti i punti di taglio di un frame STATUS,
frame concatenati, payload massimo, magic annidato,
recupero dopo corruzione, timeout con wrap e 100000 byte di rumore.
Ricevitore e stream vengono compilati anche per
Cortex-M0+. **Non è collegato al residente né scrive sulla Flash fisica**:
staging, scratch, RAM delle app e stack dovranno essere preventivati insieme prima di
integrarli; non si possono sommare buffer senza verificare il limite di 16 KiB.

Con i buffer massimi attuali, staging e scratch sommano 8320 byte:
superano già di 128 byte gli 8192 riservati a CORE, ancora prima di strutture,
framebuffer o stato delle app. APP e STACK hanno regioni proprie da 4096 byte ciascuna;
non sono RAM libera per questi buffer.
La riduzione dello scratch elimina sprechi, ma **non risolve da sola
l'integrazione**. Il ricevitore non verrà collegato al residente aggiungendo
questi buffer, né riducendo lo stack senza misurazioni per nascondere l'eccedenza.
Serve storage/verifica a blocchi oppure un riutilizzo della memoria con durate e
sovrapposizioni verificate, mantenendo il contratto attuale che impedisce la
sovrapposizione tra pacchetto e scratch durante l'installazione.

#### Primo residente indipendente PY32 sperimentale

```powershell
node scripts\build-platform-resident.cjs firmware-builds\residente-nuevo firmware\Fusion61
```

Il secondo argomento indica l'albero locale di riferimento che contiene gli
header CMSIS/LL PY32 e `Core/Src/system_py32f071.c`. Non viene collegata la sua
applicazione F4HWN: avvio, linker, shell, testo, framebuffer e glue del display/tastiera
di questa immagine si trovano in `firmware/platform`. Vengono mantenute
le attribuzioni BSD/Apache dei componenti di terze parti; non è codice
recuperato da Karina né un'affermazione d'indipendenza da ogni licenza.
Richiede ARM GNU Toolchain e non sovrascrive destinazioni esistenti.

Il builder compila prima Diagnostics e Blocks come BHA1 API 2 indipendenti
e li incorpora, senza modificarli, nella Flash del residente. All'avvio di un'app,
`resident_apps.c` convalida il suo pacchetto, lo copia nella regione da 4096 byte
in `0x20002000`, azzera BSS e prepara l'ingresso Thumb con barriere di memoria.
Il codice ARM contiene questo percorso di esecuzione: **la compilazione non dimostra che
il salto o le app funzionino sull'MCU**. Sono ammessi solo questi pacchetti
costruiti insieme al residente; non esiste caricamento da USB o storage
esterno e lo storage dual-bank non è ancora collegato.

Mappa verificata dal linker:

- Flash applicativa da `0x08002800`, 118 KiB; non include il bootloader.
- RAM del nucleo: `0x20000000..0x20001fff`, 8 KiB.
- RAM eseguibile per un'app: `0x20002000..0x20002fff`, 4 KiB.
- Stack: `0x20003000..0x20003fff`, 4 KiB; senza heap.

Lo startup proprio inizializza dati/BSS e VTOR. Disattiva e pulisce gli
interrupt esterni NVIC ereditati e quelli pendenti SysTick/PendSV;
poi attiva esclusivamente SysTick da 1 ms come base dei tempi.
L'ISR incrementa solo un contatore `volatile` a 32 bit: non chiama il launcher
né disegna. Gli aggiornamenti LCD non dipendono dal polling di COUNTFLAG né
perdono incrementi del contatore durante il disegno. Mantiene i clock forniti dal
bootloader, usando il calcolo CMSIS per leggerne la frequenza. Non programma la
Flash interna né lo storage dei canali. Il glue iniziale usa LCD ST7565
via GPIO e matrice tastiera; non inizializza RF né offre API TX. Ciò non
costituisce una garanzia di blocco fisico TX, né si ammette il salto da
un altro firmware che lasci periferiche attive.

Il menu consente di selezionare Diagnostics/Blocks con UP/DOWN e aprire con MENU.
In Blocks: 4/6 sinistra/destra, MENU ruota, DOWN scende, `*` caduta diretta,
0 riavvia ed EXIT torna indietro. Sono richiesti tre campioni stabili della tastiera
separati da 10 ms; non si ripete un tasto mantenuto né si accetta una combinazione.
La shell richiede un tick al massimo ogni 500 ms, senza raffiche di recupero.
I tick del gioco usano differenze temporali senza segno per tollerare il wrap
del contatore dei millisecondi. L'ISR deve essere gestita prima del millisecondo
successivo; un'app non può mascherare gli interrupt. Ciò non è
imponibile al codice nativo non attendibile: i tempi reali devono essere misurati.

Vengono prodotti ELF, BIN sperimentale, mappa, report stack del compilatore,
pacchetti BHA1, manifesti con SHA-256 e licenze/avvisi. Il builder verifica
i limiti del BIN, vettori stack/Reset/SysTick rispetto ai simboli ELF,
destinazione di tutti gli altri vettori, limiti RAM e assenza di simboli
irrisolti. I suoi test rifiutano vettori Thumb errati, RAM sovrapposta
e simboli assenti senza bisogno del compilatore ARM.
I report di stack individuali **non dimostrano** il massimo accumulato dello stack.
Shell e renderer sono testati su desktop, inclusi tick a
499/500 ms, wrap del tempo, ritorno al menu, errori e limiti del testo.
Il renderer 3x5 è originale e non include font o risorse di altri firmware.

**Non caricare questo BIN con l'attuale installer web né come slot multiboot.**
Non implementa identificazione/CRC dello slot F4HWN, protocollo USB, recupero o
installazione di app esterne. Il manifesto mantiene `hardwareTested: false`
e `installableWithCurrentWeb: false`. Il primo test di avvio dovrà
essere eseguito con copia completa verificata e una via di recupero collaudata.
### Distribuzione per immagini funzionali

#### Ricompilazione e test dei moduli del 26-10-2026

I tre profili sono stati ricompilati dal commit fissato, con branding
Bricohams, Beacon e VOX disattivati. Non è stato incorporato codice del binario
Karina né installata alcuna di queste compilazioni durante questo controllo.

| Profilo | BIN (byte) | Flash collegata / 120832 | RAM / 16384 |
| --- | ---: | ---: | ---: |
| ARDF | 113960 | 113072 | 12576 |
| Satelliti (include CAT TX) | 114844 | 113956 | 12384 |
| Spettro/VFO-PRO | 118040 | 117152 | 13440 |

La Flash collegata non include gli 888 byte dello stub multiboot, memorizzati anch'essi
nel BIN. Il costruttore verifica i vettori, l'identità,
i limiti dell'immagine e l'isolamento dello stub.

I nove test C desktop sono passati con Zig 0.13.0 come compilatore
C: ARDF e il relativo adattatore, Doppler, CAT RX, CAT TX, adattatore Satelliti,
Spettro, codec dei preset e adattatore Spettro. Gli adattatori usano
primitive RF/display simulate; questi risultati non certificano RF, audio,
avvio fisico né compatibilità funzionale completa con Karina.
Sono passati anche i sette test JavaScript del costruttore.

Questa è una ricompilazione verificata dei moduli esistenti, non una
nuova implementazione di tutte le funzioni Karina. In particolare non
certifica volume dinamico, autocattura equivalente con filtro antirumore,
temporizzazioni interne equivalenti di AM/squelch, generatore AM,
preset persistenti completi di stato né equivalenza dei menu.
Non vengono implementate autoresposte o beacon TX solo perché compaiono
nella documentazione Karina. L'identità di protocollo resta F4HWN:
ribattezzarla senza aggiornare connettori e mappe di memoria romperebbe
l'interoperabilità esistente.

Le funzioni vengono distribuite in immagini separate quando Flash/RAM impediscono
un'unica immagine. L'obiettivo è conservare Main e distribuire immagini compatibili negli
slot 1-4, non inventare il caricamento dinamico del codice né mescolare formati di banchi.
Non vengono assegnati slot né scritti automaticamente dati sull'hardware.

| Immagine funzionale | Stato reale |
| --- | --- |
| Bricohams ARDF | Immagine Beta costruita con `--module ardf`, cicli e memoria manuale di attenuazione in Fox Hunt |
| Bricohams Satelliti | Immagine Beta con Doppler manuale e CAT RX v1 costruita con `--module satellite`; non è tracking orbitale autonomo |
| Bricohams Spettro | Immagine Beta `--module spectrum`: 128 punti RX, peak hold, media, multipreset RAM e cattura VFO-PRO RX con inserimento della frequenza |
| Altre funzioni documentate di Karina | Richiedono ricostruzione e test; non si dichiarano incluse rinominando un'immagine |

La separazione non recupera codice Karina né garantisce equivalenza dei suoi
algoritmi. Ogni immagine deve avere manifesto, moduli effettivi, limiti,
sorgenti/licenze e convalida strutturale propri. Il budget deve essere misurato
dopo aver collegato ciascuna combinazione. Main non viene sostituita per dimostrare il
selettore e non si installano automaticamente binari di altri progetti.

### Nucleo proprio per satelliti

`firmware/bricohams/doppler.c` calcola correzioni di frequenza con
velocità radiale in mm/s. Un valore positivo significa che il satellite si allontana: RX diminuisce
e l'uplink nominale aumenta. Le frequenze sono espresse in unità di
10 Hz e arrotondate al passo più vicino. La formula corrisponde al modello
classico non relativistico della pianificazione web; non riproduce un algoritmo
Karina né abilita la trasmissione. L'output dichiara sempre `receive_only=true`.

`BRICOHAMS_ENABLE_SATELLITE=OFF` esclude la libreria. Convalida VHF
136-174/UHF 400-470 sia nominali sia corrette e velocità radiale fino a
12 km/s in entrambe le direzioni. Un input non valido conserva l'output
precedente e restituisce un errore esplicito. Non genera TLE, ora UTC, posizione,
passaggi SGP4 né velocità radiale: questi dati devono provenire da un predittore
convalidato. Inoltre non implementa CAT, tracking automatico o persistenza.
I test confrontano 241 velocità con un riferimento in doppia precisione,
segni, limiti e arrotondamento entro mezza unità (5 Hz).

### Immagine Satelliti: Doppler manuale in ricezione

Guide utente associate a questa immagine: [Introduzione al satellite](INICIACION-SATELITE.md)
(concetti, passaggi, Doppler, uso dei tasti 4/5/6/8/9 e CAT) e
[Antenne satellitari](ANTENAS-SATELITE.md) (Yagi bibanda e dipolo a V
simulati, con parti STL stampabili).

Il builder accetta `--module satellite` al posto di `--module ardf` nel
comando FieldOps qui sotto, con Beacon e VOX OFF. Rifiuta di combinarli:
usano display/tasti diversi della stessa modalità residente. Il nome del
binario include il modulo, per evitare di confondere le immagini.

L'adattatore `satellite_foxhunt.inc` prende RX e TX nominali dal VFO/canale
selezionato all'ingresso di Fox Hunt e mostra `SAT RX`. Richiede entrambe le
frequenze nelle bande ammesse. Non cambia i dati del VFO
né la frequenza TX; il risultato uplink calcolato non viene applicato al
trasmettitore. Cambia esclusivamente la sintonia RX e il relativo filtro tramite
le primitive esistenti. All'uscita, il flusso Fox Hunt ripristina i registri
del VFO usando `RADIO_SetupRegisters`. Da verificare sull'hardware.

| Tasto | Doppler manuale |
| --- | --- |
| 4 | Ridurre la velocità radiale di 500 m/s (avvicinamento negativo) |
| 5 | Velocità zero: ripristina la frequenza RX nominale |
| 6 | Aumentare la velocità radiale di 500 m/s (allontanamento positivo) |
| 8 | Abilitare CAT RX temporaneo / disabilitare e tornare a RX nominale; richiede un VFO valido |
| 9 | Armare / disarmare la PTT CAT (CAT TX v1) per inviare SSTV dall'app |
| 2 | Audio Fox Hunt esistente: silenzio, beep, audio ricevuto; inizia con l'impostazione upstream salvata |
| EXIT | Uscire e ripristinare la configurazione RF del VFO |

Limite manuale +/-12 km/s, senza wrap. Velocità e frequenza corretta
sono visualizzate sul display. `SAT INVALID VFO` indica un input nominale o
una correzione fuori intervallo: la nuova scrittura RF non viene eseguita e
viene mantenuta l'ultima sintonia accettata; il tasto 5 ripristina zero se il nominale è valido.
Per cambiare canale/frequenza nominale occorre uscire e rientrare.
I nuovi tasti rispettano il blocco tastiera e non usano F come inversore.
Non ci sono TLE, selezione automatica del satellite, orologio UTC, SGP4 né
previsione del passaggio nella radio. Si fornisce manualmente una
velocità radiale corretta da un predittore esterno, oppure una frequenza RX
assoluta tramite il nuovo CAT sperimentale. Non viene dedotta dall'RSSI.

La compilazione con etichetta SAT RX ha misurato 112320 byte, RAM 12352/16384 e Flash
111432/120832; ogni modifica successiva dovrà essere misurata nuovamente.
I test dell'adattatore simulano le primitive RF: verificano segni,
limiti, frequenza applicata, assenza di modifiche a TX/VFO e recupero
dopo un errore. Non certificano ricezione, audio né ripristino fisico.
La modalità è in ricezione, salvo la PTT CAT armata con 9 (vedi CAT TX); il resto del firmware mantiene il TX upstream.
Non è un firmware globalmente bloccato per TX né un apparato full-duplex.

#### CAT RX Bricohams v1 implementato

L'immagine `Satellite-CAT-final-20261025` misura 113868 byte RAW,
RAM 12384/16384 e Flash 112980/120832. Include il bootlogo Bricohams e un
endpoint sperimentale proprietario, non compatibile con i protocolli CAT
Kenwood/Yaesu né con il supporto CAT di altre edizioni F4HWN.

In SAT RX, premere 8 con la tastiera sbloccata: `CAT READY RX`.
Un comando valido mostra `SAT CAT RX`. I tasti 4/5/6 disabilitano CAT
e restituiscono il controllo al Doppler manuale; 8 lo disabilita e ripristina la
frequenza RX nominale d'ingresso. Il blocco della tastiera annulla CAT e torna
a RX nominale. Per rientrare è necessario abilitare di nuovo con 8.

Ogni SET rinnova un lease di 3000 ms. Alla scadenza si applica RX nominale,
si scarta qualsiasi SET in attesa e si mostra `CAT TIMEOUT`; CAT rimane
abilitato per un nuovo comando valido. QUERY, comandi non validi ed errori
non rinnovano il lease. Una correzione per un passaggio perso non viene mantenuta
indefinitamente. Il timeout viene verificato nel loop RX, non in un interrupt:
dipende dal fatto che il firmware continui a eseguire tale loop. Non è un watchdog
hardware né una garanzia in caso di blocco della CPU.

L'endpoint riutilizza i frame USB CDC/UART esistenti con offuscamento e
CRC; **non è cifratura né autenticazione**. Ammette solo frequenze assolute
in unità da 10 Hz, 136-174 o 400-470 MHz inclusi, e vengono applicate
solo quando SAT RX è abilitato localmente. Non modifica canali, subtoni, potenza,
EEPROM, Flash né TX. Modulazione/larghezza di banda sono quelle del VFO d'ingresso.
Non usarlo come controllo di trasmissione né affermare che la sintonia RF sia stata
misurata: la conferma indica che sono state invocate le primitive RX.

Contratto binario little-endian, comando privato `0x7B00`, risposta `0x7B01`.
L'header Size upstream esprime la lunghezza dei dati, senza header.
Non vengono assegnati nuovi comandi a firmware di terze parti.

| Offset richiesta | Bytes | Contenuto |
| --- | ---: | --- |
| 0 | 1 | Versione 1 |
| 1 | 1 | 0 QUERY, 1 SET_RX, 2 STOP_RX |
| 2 | 2 | Sequenza, ripetuta nella risposta |
| 4 | 4 | Frequenza RX in 10 Hz; zero obbligatorio per QUERY/STOP |

La richiesta deve essere esattamente di 8 byte; non ci sono campi opzionali.

| Offset risposta | Bytes | Contenuto |
| --- | ---: | --- |
| 0 | 1 | Versione 1 |
| 1 | 1 | Stato |
| 2 | 2 | Sequenza; zero se la lunghezza non consente di elaborare la richiesta |
| 4 | 4 | Capacità 7: bit 0 SET_RX, bit 1 QUERY, bit 2 STOP/lease; senza TX/scrittura persistente |
| 8 | 4 | Ultima frequenza applicata via software, 10 Hz; zero se CAT è disabilitato |
| 12 | 4 | Flag: bit 0 abilitato localmente, bit 1 lease remoto, bit 2 modifica in attesa |

Stati: 0 query corretta, 1 in coda, 2 lunghezza/campi errati,
3 versione non supportata, 4 operazione non supportata, 5 CAT non abilitato,
6 frequenza fuori banda. Ogni errore conserva lo stato precedente.
SET/STOP restituiscono 1: **non significa che sia stato applicato**. Il loop RX applica la
modifica convalidata, aggiorna la frequenza segnalata e azzera il bit pending.
Un SET successivo prima dell'applicazione sostituisce il precedente, non crea una coda
illimitata. STOP richiede RX nominale e termina il lease, senza disabilitare
la possibilità di un altro comando mentre rimane abilitato fisicamente.

Il connettore web espone `getCatStatus`, `setCatReceive(frequency10Hz)` e
`stopCatReceive`. Convalida sequenza/versione/capacità, distingue lo stato
in attesa da quello applicato e verifica il risultato con query limitate.
Non ritenta SET né rinnova automaticamente. Un errore invalida la
connessione secondo il flusso esistente e richiede la riconnessione. Non sono funzioni
di programmazione persistente e non autorizzano scritture senza backup.
#### CAT TX Bricohams v1 (PTT con lease)

Aggiunto il 2026-10-26 per inviare SSTV dall'app Android. È una PTT remota
per una sorgente audio esterna collegata all'ingresso microfono della radio; non cambia frequenza, potenza, subtoni, EEPROM né Flash. Il firmware
non genera l'audio: l'app riproduce Robot36 tramite un cavo all'ingresso
microfono mentre mantiene la PTT.

Sicurezza, in ordine:

1. **Conferma sulla radio.** Solo il tasto 9 in SAT RX arma la PTT
   (`CAT TX ARMED`); l'host non può armarla. Bloccare la tastiera, uscire da
   SAT RX o premere nuovamente 9 la disarma.
2. **Lease di 1500 ms.** L'host rinnova il comando KEY; se smette di farlo, la
   radio rilascia automaticamente la PTT. Anche un comando KEY in coda scade.
3. **Limite di 120 s per trasmissione.** Al raggiungimento, la radio rilascia la PTT, si disarma
e mostra `CAT TX LIMIT`; occorre armare di nuovo con 9.
4. **Bande e blocco TX della radio.** Prima di trasmettere vengono applicati gli stessi
   controlli del beacon Fox Hunt (`FOXHUNT_TxState`): blocco TX per banda,
   batteria bassa o tensione alta e modulazione FM. Se un controllo fallisce,
   `CAT TX DENIED` e nessun comando KEY funziona di nuovo finché non si riarma con 9.
5. **Qualsiasi tasto interrompe.** Durante la trasmissione il loop è modale: non vengono eseguiti la
   misura RX né i beep Geiger di Fox Hunt, ma solo UART e tastiera. Qualsiasi
   nuovo tasto rilascia la PTT e disarma.
6. **Indicativo obbligatorio.** L'app non trasmette senza un indicativo valido e lo
   stampa nell'immagine Robot36.

Trasmette sulla frequenza TX del VFO d'ingresso (con il relativo offset), senza
correzione Doppler di uplink. Il LED rosso si accende come per la PTT normale e
il display mostra `CAT TX ON AIR` e la frequenza TX. Durante la trasmissione,
i comandi CAT RX vengono accettati ma applicati al ritorno in RX.

Contratto: comando privato `0x7B02`, risposta `0x7B03`, little-endian.

| Offset richiesta | Bytes | Contenuto |
| --- | ---: | --- |
| 0 | 1 | Versione 1 |
| 1 | 1 | 0 QUERY, 1 KEY (attiva o rinnova il lease), 2 UNKEY |
| 2 | 2 | Sequenza, ripetuta nella risposta |
| 4 | 4 | Riservato, zero obbligatorio |

| Offset risposta | Bytes | Contenuto |
| --- | ---: | --- |
| 0 | 1 | Versione 1 |
| 1 | 1 | Stato |
| 2 | 2 | Sequenza; zero se la lunghezza non consente di elaborare la richiesta |
| 4 | 4 | Capacità 8: PTT con lease; senza frequenza, potenza né scrittura persistente |
| 8 | 4 | Flag: bit 0 armata, bit 1 in trasmissione, bit 2 KEY in attesa, bit 3 limite raggiunto; bit 8-15 stato VFO del rifiuto |
| 12 | 4 | Millisecondi in trasmissione, zero se non trasmette |

Stati: 0 corretto (KEY: già in trasmissione), 1 in coda (KEY in attesa o UNKEY
in attesa di applicazione), 2 lunghezza o riservato, 3 versione, 4 operazione,
5 non armata, 7 rifiutata dalla radio, 8 limite di 120 s. UNKEY viene accettato
sempre. Le capacità CAT RX restano 7: CAT TX è un endpoint separato.

Verificato il 2026-10-26: `cat_tx_test` (protocollo, lease, limite, rifiuto) e
`satellite_adapter_test` (armamento tramite tasto, trasmissione modale, interruzione da tasto,
rifiuto, limite, disarmo per blocco e uscita) passano con primitive RF
simulate. L'immagine F4HWN v6.1.0 Fusion con `--module satellite` e
`ENABLE_FEAT_F4HWN_FOXHUNT=ON` viene compilata senza avvisi: Flash 113212/120832,
RAM 12384/16384. **Senza convalida sulla radio né misurazioni RF.**

In **Quansheng > Operazioni** c'è un pannello CAT RX Beta per interrogare,
sintonizzare durante un lease e tornare alla frequenza nominale. Il suo stato è l'ultima risposta,
non telemetria continua. Il tracking web dei passaggi è descritto
qui sotto; Android dispone di un client USB sperimentale con tracking orbitale SGP4. I controlli si disabilitano senza
connessione o durante un'altra operazione. Per provarlo occorre avviare la nuova
immagine: connettersi al firmware originale non la installa né attiva CAT.

Le otto suite C includono protocollo, intervalli, lunghezze non valide,
sequenza riflessa, scadenza con rollover, mancato rinnovo da query,
annullamento locale/blocco e flusso dell'adattatore con RF simulata.
I test JavaScript simulano trasporto, risposte in attesa,
sequenza errata ed errori: non sostituiscono un test CAT USB/radio.
Il manifesto include `catRx` e gli hash del codice applicato. Non è stato
flashato né certificato il funzionamento fisico.

#### Tracking web dei passaggi implementato su CAT RX

In **SAT / passaggi**, aggiornare TLE/frequenze, indicare la posizione con consenso,
calcolare i passaggi e selezionare un passaggio e una frequenza FM puntuale.
**Segui il passaggio selezionato tramite CAT RX** si avvia solo durante l'intervallo
del passaggio selezionato e con il satellite sopra l'orizzonte. Non viene
programmato un avvio futuro non presidiato. La previsione deve essere stata
calcolata da meno di 15 minuti e il TLE deve rispettare la validità massima di sette giorni.
La radio richiede l'immagine CAT precedente, SAT RX e abilitazione fisica con 8.

`catPassTarget` riutilizza satellite.js/SGP4 e le convalide TLE
esistenti. Calcola la distanza osservatore-satellite a t-0.5 e t+0.5 secondi,
ricava la velocità radiale e applica `fRX = fNominal * (1 - vRadial/c)`.
Arrotonda a 10 Hz e rifiuta il risultato fuori dalle bande RX ammesse.
Ammette solo frequenze FM/FM stretta puntuali, non transponder lineari.
L'osservatore resta fisso durante la sessione: non segue GPS mobile né orienta antenne.

`CatPassTracker` prende una copia indipendente del piano: una modifica successiva
non altera silenziosamente la sessione attiva. L'interfaccia blocca le operazioni
radio/programmazione e i parametri del piano durante il tracking.
**Interrompi tracking CAT** resta fuori dal fieldset bloccato e rimane
operativo. Dopo ogni SET confermato attende 750 ms prima di calcolare il
successivo, circa un aggiornamento al secondo a seconda del collegamento.
Rinnova anche quando la frequenza arrotondata non cambia, per mantenere il lease.
Non mantiene due SET simultanei né promette una cadenza fissa in tempo reale.

Si interrompe al termine del passaggio, quando la pagina viene nascosta/chiusa,
quando viene ritirato il consenso o cambiano i dati, in caso di perdita della
connessione, errore di propagazione o conferma tardiva. Rifiuta anche regressioni
dell'orologio e intervalli di aggiornamento maggiori di 2000 ms. Un browser
sospeso non è un controller in tempo reale: se non può inviare STOP,
il ripristino dipende dal lease di 3 s del firmware. L'ora UTC del
dispositivo deve essere corretta; non c'è sincronizzazione esterna automatica.

Quando si annulla, il controller attende l'eventuale SET in corso prima di inviare
STOP; evita che un SET tardivo riattivi il tracking. Non ritenta
SET dopo l'annullamento né riavvia automaticamente le sessioni. Gli
errori di ripristino vengono mostrati, non trasformati in un successo. L'interfaccia
indica l'ultima frequenza e la geometria calcolate, non una misurazione RF.

Sei test del nucleo JavaScript coprono Doppler confrontato con
calcolo della distanza SGP4, convalide, snapshot del piano, rinnovo,
annullamento durante SET, fine del passaggio, discontinuità, risposte tardive
e disconnessione. Test browser con trasporto simulato: due SET RX,
STOP manuale e STOP simulato quando la pagina viene nascosta, senza errori e con il pulsante
di arresto utilizzabile mentre i parametri sono bloccati.
Questi comandi non sono stati eseguiti sulla radio reale. L'APK Android integra
CAT RX temporaneo via CDC e adattatori USB-serial riconosciuti, con tracking SGP4 autonomo. Il calcolo orbitale rimane fuori dall'MCU;
TLE/SGP4 non sono stati aggiunti all'MCU.

### Preset propri dello spettro, senza scrittura EEPROM

`firmware/bricohams/presets.c` definisce un contenitore BHSP v1 da 208 byte
con fino a 8 preset: nome ASCII di 8 caratteri, frequenza iniziale,
passo, punti, assestamento e campioni. Usa interi little-endian espliciti,
CRC32 IEEE e byte riservati a zero; non serializza struct C né dipende dal loro
allineamento. La selezione attiva fa parte del contenitore.

Il codec verifica le configurazioni e rifiuta corruzione, versione/campi riservati
sconosciuti e lunghezze non valide. Decodifica in temporaneo prima di sostituire
lo stato; codifica in temporaneo prima di sostituire la destinazione. I buffer
non devono sovrapporsi allo stato. Il CRC non è una firma né un'autenticazione.
Non è stato riservato un indirizzo in EEPROM/Flash: i dati vengono conservati
tramite file locale e trasferimento RAM descritto di seguito, non con salvataggio interno.
I test verificano andata/ritorno e corruzione di ciascuno dei 208 byte.

#### Trasferimento preset tramite file implementato

L'immagine `Spectrum-PresetFiles-beta-20261025` include esportazione e
importazione dell'intera tabella RAM, da **Quansheng > Operazioni >
Preset spettro Bricohams Beta**. Il file `.bhsp` è esattamente di
208 byte, senza dati privati di calibrazione o configurazione dei canali.
Il trasferimento non scrive EEPROM né Flash e non concede permessi di
programmazione persistente.
Il web non lo carica su server. Occorre ancora scaricarlo e
conservarlo; non viene salvato automaticamente nel telefono o nella radio.

Prima del trasferimento: entrare in SPEC RX, salvare almeno un preset con 8,
mettere in pausa con 4 (`HOLD`), disattivare MULTI se era attivo e sbloccare la tastiera.
Il trasferimento non è accettato dalla cattura RX. Per importare non
è necessario avere preset precedenti. L'esportazione di una tabella vuota dà errore.
L'abilitazione dipende dallo stato fisico della radio, non da un booleano
del web. La pressione di un tasto elaborato durante un trasferimento
scarta lo stato parziale. Anche l'uscita dalla modalità lo scarta.

L'esportazione acquisisce uno snapshot BHSP completo e lo restituisce in due
frammenti. L'importazione riceve entrambi i frammenti in un buffer temporaneo, convalida
il file completo e solo allora sostituisce la tabella RAM. Un'interruzione,
frammento mancante, token diverso o CRC errato non sostituisce la tabella.
Il formato generale del codec ammette più configurazioni dell'adattatore;
l'importazione richiede 128 punti, assestamento 10/20/40/80 ms, passi 125/250/625/1250 in unità
da 10 Hz, media 1/2/4/8 e finestra completa entro 136-174 o 400-470 MHz.
Nomi, selezione, campi riservati e record inutilizzati devono essere canonici.

L'importazione non sintonizza, non riprende la scansione e non ripristina guadagno,
blacklist, CSS né audio. Il tasto 9 recupera il preset successivo secondo il
comportamento esistente e 4 riprende. Il web rilegge l'intera tabella dopo
aver confermato l'importazione e richiede una corrispondenza byte per byte. Un errore di
rilettura viene mostrato come importazione non verificata: se il COMMIT è già
stato accettato, non si può affermare che la tabella sia ancora quella precedente.

Protocollo privato sperimentale little-endian `0x7B10` / risposta `0x7B11`,
sui frame USB CDC/UART esistenti. Non è cifratura né autenticazione.
Richieste: versione 1 (byte 0), operazione (byte 1), token non nullo a
32 bit (byte 2-5), e solo per le operazioni 2/3, frammento di 104 byte.
Gli altri comandi sono esattamente di 6 byte. Risposta: versione 1,
stato e lo stesso token, seguiti da 104 byte solo per le esportazioni
corrette. Gli errori sono di 6 byte. Non vengono serializzate struct C.

| Operazione | Azione |
| --- | --- |
| 0 | Creare uno snapshot e leggere i primi 104 byte |
| 1 | Leggere i secondi 104 byte dello stesso snapshot e chiudere il trasferimento |
| 2 | Avviare l'importazione con i primi 104 byte |
| 3 | Ricevere i secondi 104 byte |
| 4 | Convalidare e applicare l'intera tabella RAM |
| 5 | Scartare il trasferimento parziale, senza modificare i preset |

Una nuova operazione 0/2 sostituisce il trasferimento precedente. Le operazioni
1/3/4 richiedono token e fase corretti. Il trasferimento scade dopo
5000 ms dall'avvio; ciascun frammento non prolunga tale intervallo.
Stati: 0 corretto, 2 richiesta non valida, 3 manca lo stato fisico consentito,
4 tabella vuota/non valida per l'esportazione, 5 fase/token/scadenza errati,
6 file corrotto/non supportato, 7 configurazione non ammessa dall'adattatore.
Non ci sono tentativi automatici né COMMIT dopo un errore nei frammenti.

La compilazione registra `spectrumPresets` e gli hash dei sorgenti nel
manifesto. Test con radio e trasporto simulati: includono lettura,
CRC, commit atomico, recupero del file, rilettura differente,
sequenza/token, scadenza/rollover, lunghezze non valide e blocco durante
cattura/multipreset/tastiera. I preset vengono conservati tra le sessioni tramite
file, non equivale alla persistenza EEPROM. USB fisica non è stata testata.

### Immagine Spettro, VFO-PRO RX e multipreset
`--module spectrum` sostituisce `--module ardf` nel comando FieldOps
documentato più avanti, con una nuova directory di output. Richiede Fox Hunt
residente ON, Beacon OFF e overlay apps OFF. Ogni adattatore necessita della
propria immagine. La modalità Fox Hunt mostra `SPEC RX`; l'analizzatore
originale upstream resta disponibile tramite le altre azioni.

La scansione originale copre 128 punti: 64 sotto il centro, il centro
e 63 sopra. L'intera finestra deve rientrare in 136-174 o 400-470 MHz.
All'ingresso prende il centro del VFO/canale selezionato. Non modifica memorie,
RX/TX del canale né calibrazione. Modulazione e larghezza restano quelle del
VFO originale; inserire una RX non configura un nuovo profilo di canale.
Il guadagno usa i preset esistenti e consente di regolare solo i quattro
campi RX documentati di R13 dalla cattura. Non è possibile modificare
registri arbitrari. Il flusso di uscita ripristina RF con `RADIO_SetupRegisters`;
questo ripristino e il funzionamento RF sono ancora da verificare fisicamente.

| Tasto | Scansione originale |
| --- | --- |
| 0 | Attivare/disattivare la scansione circolare dei preset RAM; ne servono almeno due |
| 4 | Mettere in pausa/riprendere la scansione e il cambio finestra |
| 5 | Reimpostare peak hold ai livelli correnti |
| 6 | Passo 1.25, 2.5, 6.25, 12.5 kHz; reimposta il grafico |
| 7 | Media di 1, 2, 4, 8 campioni per punto; reimposta il grafico |
| * | Assestamento RX 20, 40, 80, 10 ms, ciclico; reimposta il grafico |
| 8 | Salvare nel preset RAM successivo; se sono otto, sostituire quello selezionato |
| 9 | Recuperare il preset RAM successivo in modo circolare |
| 3 / frecce | Attenuazione upstream; cambiare guadagno reimposta misure non confrontabili |
| 1 | Cancellare le esclusioni della sessione e reimpostare le misure |
| 2 | Nessuna azione durante la scansione; audio silenziato |
| PTT | Acquisire il punto misurato più forte in VFO-PRO RX; non trasmette |
| EXIT | Uscire, scartare i preset RAM e ripristinare il VFO |

RSSI grezzo e picchi vengono visualizzati con scala automatica 0...massimo dei
picchi del grafico, non dBm calibrati né una FFT. La scala può variare.
Ogni sintonia applica frequenza, filtro RX e reset di ricezione BK4819,
e attende almeno l'assestamento selezionato del SysTick reale prima di accettare campioni. Non
blocca in attesa di questo intervallo. Ogni campione proviene da un'altra iterazione.
Anche i ritardi del loop modale incidono sulla cadenza: non sono garantiti
frequenza di scansione, larghezza di banda di risoluzione o precisione strumentale.

L'assestamento inizia a 20 ms a ogni ingresso nella modalità ed è salvato
individualmente nei preset RAM/BHSP. I file precedenti da 20 ms
restano supportati; altri valori diversi da 10/20/40/80 vengono rifiutati senza
sostituire la tabella. La cattura VFO-PRO e le modifiche di guadagno mantengono
il loro assestamento indipendente da 20 ms. La modalità da 10 ms è sperimentale:
la sua disponibilità non dimostra che PLL, filtro o RSSI siano stabilizzati in ogni condizione. Non è una replica del parametro Delay o Turbo interno a Karina né riduce il tempo CSS.

`SPECTRUM ERROR` arresta nuove sintonie se la finestra non rientra in banda
o il nucleo restituisce errore. Gli estremi non vengono ritagliati silenziosamente:
occorre recuperare un preset valido, ridurre il passo oppure uscire e cambiare centro.
I nuovi tasti rispettano il blocco tastiera.

#### Cattura VFO-PRO originale: solo ricezione

Il riferimento funzionale è la sezione 4.4, pagina 22 del manuale Karina V1
di agosto 2026: cattura attiva e vista dettagliata. L'implementazione è
originale per V3. PTT non abilita TX né applica offset/subtoni di uplink.
Non certifica l'equivalenza completa con VFO-PRO Karina.

PTT seleziona il RSSI medio corrente maggiore fra i punti completati; in caso
di parità, il primo. Nel primo grafico considera solo i punti già completati;
poi considera anche quelli della scansione precedente non ancora aggiornati.
Non seleziona in base ai massimi storici né identifica le emittenti. Senza punti completati,
`WAIT SAMPLES` informa e la sintonia non viene cambiata.

| Tasto | Cattura RX |
| --- | --- |
| Su / giù | Sintonizzare un passo della scansione, senza uscire dalle bande RX |
| 2 | Attivare/disattivare l'audio ricevuto tramite il percorso upstream |
| 3 | Attenuazione upstream |
| MENU | Alternare aiuto e vista del guadagno RX: letture R13/R43 e campo selezionato |
| 6, nella vista guadagno | Selezionare LNAs, LNA, MIX o PGA |
| 1 / 7, nella vista guadagno | Diminuire/aumentare un indice del campo RX selezionato, senza wrap |
| 4 | Includere/escludere la frequenza acquisita nella blacklist di sessione |
| 9 | Attivare/disattivare la ricerca CTCSS/DCS opzionale, solo se il VFO originale è FM |
| * | Inserimento diretto RX di otto cifre; 43512500 rappresenta 435.12500 MHz |
| 5 | Centrare una nuova scansione sulla frequenza acquisita se l'intera finestra rientra |
| PTT | Nessuna azione; non trasmette |
| EXIT | Tornare al centro originale della scansione, reimpostando le misure e mantenendo i preset |

Le sintonie e le modifiche al guadagno attendono almeno 20 ms prima di mostrare
RSSI grezzo; nel frattempo appare `SETTLING`. `BAND LIMIT` conserva l'ultima
frequenza se si tenta di uscire dalla banda. `SPAN OUT OF BAND` conserva cattura
e centro precedenti se 5 non riesce a far rientrare tutta la finestra.
Registri e indici sono valori grezzi, non calibrazione certificata.
Si modificano solo i campi RX R13 descritti più avanti; non si modificano deviazione,
microfono, AFC né TX. La ricerca CTCSS/DCS opzionale è descritta sotto.
Non c'è elenco dei risultati né salvataggio della frequenza in memoria.

Con l'inserimento diretto, MENU applica solo otto cifre valide; * cancella una cifra
(annulla se il campo è vuoto) ed EXIT annulla senza sintonizzare. I numeri non eseguono
azioni di cattura durante l'inserimento delle cifre. PTT non
trasmette. `ENTER 8 DIGITS`, `FULL: 8 DIGITS` e `RX OUT OF BAND` segnalano
rifiuti; l'ultima sintonia accettata resta invariata.

Premendo di nuovo EXIT, già nella scansione, si esce dalla modalità tramite il flusso upstream. La sintonia
fine non modifica il centro finché non viene premuto 5 e non cambia mai RX/TX del canale.
Con tastiera bloccata, le frecce mantengono l'attenuazione upstream e non
sintonizzano. L'audio parte silenziato in cattura; la sua impostazione precedente
all'ingresso nella modalità viene mantenuta all'uscita. In questa immagine vengono
soppresse le scritture delle impostazioni Fox Hunt: guadagno e nuove opzioni sono di sessione.
Fuori da questa modalità il firmware mantiene il TX upstream; non è globalmente solo RX.

#### Guadagno RX manuale ed esclusioni

La vista dei registri consente di selezionare con 6 i campi R13 documentati
da `BK4819_InitAGC` upstream: LNAs (bit 9:8, indici 0-3), LNA
(7:5, 0-7), MIX (4:3, 0-3) e PGA (2:0, 0-7). 1 diminuisce e 7 aumenta;
`GAIN LIMIT` rifiuta l'overflow senza scrivere. Ogni modifica legge R13,
modifica esclusivamente la maschera selezionata e mantiene tutti gli altri
bit, inclusi quelli sconosciuti 15:10. Non cambia R43, R7E né le tabelle AGC.
Fox Hunt imposta già AGC all'ingresso; non viene abilitata una seconda politica AGC.

Gli indici non sono dB calibrati né valori intercambiabili con Karina.
`RX GAIN SESSION` segnala la modifica e si attende nuovamente l'assestamento.
Uscendo dalla vista registri viene mostrato MAN invece di ATT; il numero
dopo MAN è l'ultimo indice del preset, non un'attenuazione effettiva.
La regolazione manuale resta attiva tornando alla scansione e cambiando finestra,
ma non viene salvata nei preset. Cambiare il preset di guadagno con 3 o le frecce
di attenuazione upstream sostituisce questi campi e ritorna ad ATT.
Uscendo dalla modalità RF viene ripristinata dal flusso upstream, da verificare fisicamente.
Non si salva il guadagno in EEPROM né si esegue calibrazione.

La blacklist contiene 16 frequenze esatte in unità da 10 Hz, non intervalli.
4 in cattura alterna la frequenza: `FREQ EXCLUDED` / `FREQ INCLUDED`;
`BLACKLIST FULL` rifiuta una nuova voce senza espellerne un'altra. BL indica il numero
e X marca la cattura esclusa. Durante la scansione, 1 svuota la lista, reimposta le misure
e mostra `BLACKLIST CLEARED`.

Durante la scansione si salta ogni punto corrispondente senza sintonizzare né leggere
RSSI e si azzerano il relativo livello/picco. Viene disegnata una marca, non una misura.
La cattura automatica PTT ignora i punti esclusi; `POINTS EXCLUDED`
informa se tutti i punti completati sono esclusi. Il salto avanza anche
al termine del grafico o del preset, senza attendere il segnale né girare in loop bloccante.
La lista viene mantenuta tra preset e passi durante la sessione: se un'altra
graduazione non corrisponde esattamente, non viene esclusa una frequenza vicina.
La sintonia manuale può ascoltare una frequenza esclusa per poterla
includere di nuovo con 4. Non è una restrizione di accesso RF né TX.
La lista viene scartata all'uscita/spegnimento e non viene mai scritta in memoria persistente.

#### Ricerca CTCSS/DCS RX opzionale

In cattura FM, 9 attiva `CSS SEARCH...`; premendo ancora 9 la si disattiva.
`CSS NEEDS FM` rifiuta l'attivazione con altre modulazioni senza scrivere RF.
La ricerca riutilizza `BK4819_SetScanFrequency`, `BK4819_GetCxCSSScanResult`
e le tabelle/decodificatori DCS upstream. Non è un decoder DSP
originale né una certificazione del rilevamento hardware. La configurazione temporanea
del detector non modifica il tono TX/RX del canale né abilita la trasmissione.

R51 viene salvato prima dell'attivazione e ripristinato alla disattivazione, al ritorno
alla scansione con EXIT/5 o all'uscita dalla modalità. La primitiva di ricerca può reimpostare
il percorso RX: per questo si preservano e riapplicano i registri di guadagno R13
e AGC R7E. Non viene scritta calibrazione né salvato il risultato.
Quando cambia frequenza, la ricerca riparte su quella frequenza; quando cambia
guadagno vengono scartati il candidato e l'indicazione precedenti.

I risultati vengono ignorati nei primi 500 ms dopo sintonia/attivazione e consultati
al massimo ogni 250 ms. Un tono richiede due risultati consecutivi validi dello stesso tipo e indice,
separati da tale intervallo. Un risultato assente o non valido interrompe la conferma.
L'indicazione confermata scade dopo 1500 ms senza nuove conferme; il tono di una trasmissione precedente
non viene mantenuto indefinitamente.

CTCSS è visualizzato in Hz con un decimale e viene accettata solo una misura
entro 0.5 Hz dal valore nominale della tabella upstream; è un filtro di
visualizzazione, non una tolleranza strumentale misurata. DCS viene convalidato con il
decodificatore Golay upstream, prima normale e poi invertendo i suoi
23 bit; viene visualizzato in ottale con N/I. Tale polarità è un'interpretazione
del codeword osservato, da confrontare con un generatore/radio reale.

La riga audio/blacklist viene sostituita dal tono o da `CSS SEARCH...`
durante l'attivazione; i tasti audio ed esclusioni restano utilizzabili.
L'RSSI non viene usato per dichiarare valido il subtono, l'audio non viene filtrato per
il tono e i risultati non vengono copiati nelle memorie. Rumore, portanti deboli o registri
di rilevamento congelati possono produrre corrispondenze false: verificare
con una sorgente nota prima di usare l'indicazione per configurare
un'altra radio. I test dell'adattatore simulano i risultati del chip e del
decodificatore, verificano temporizzazione, normale/invertito, rifiuto, scadenza,
rollover e ripristino di R51/R13/R7E; non misurano il rilevamento RF reale.

#### Multipreset di sessione

I preset RAM1...RAM8 salvano finestra, passo e media, non guadagno, misure
né calibrazione. P0/0 indica che non ce n'è nessuno. Non sopravvivono all'uscita/spegnimento,
non scrivono EEPROM. La nuova immagine consente importazione/esportazione della tabella RAM
via USB/UART in file BHSP, come descritto sopra.

Per finestre diverse: PTT acquisisce, * inserisce un'altra RX, MENU conferma,
5 torna alla scansione centrata e 8 salva. Ripetere per gli intervalli necessari.
Con due o più preset, 0 avvia `MULTI` da quello selezionato. Al completamento di 128
punti viene mostrato il grafico e l'iterazione successiva avvia il preset seguente;
dopo l'ultimo ritorna al primo. Ogni finestra reimposta i propri livelli/picchi:
le misure di bande diverse non vengono mescolate. Non è scansione parallela,
ricerca per soglia né elenco di emittenti.

4 mette in pausa anche la transizione; 0 disattiva senza cancellare i preset.
`SAVE 2 PRESETS` segnala che ne servono due. Cambiare passo, media o guadagno
reimposta il grafico corrente senza saltarlo; non modifica il preset fino al salvataggio
con 8. PTT sospende il ciclo durante la cattura; EXIT o 5 tornano alla scansione.
All'uscita preset e MULTI vengono scartati.

Compilazione con bootlogo e trasferimento preset: 118044 byte, RAM
13440/16384, Flash 117156/120832; stub Multiboot da 888 byte e 83 rami
di isolamento verificati. Il margine di questa combinazione è ridotto:
non si possono aggiungere moduli senza ricontrollare dimensione e RAM.
Le otto suite C passano, compresi cattura parziale/completa, inserimento RX,
rifiuti, lettura senza scrittura di R43, cicli multipreset, pausa,
media, esclusioni esatte e limiti. Sono verificate 524288 combinazioni:
i 65536 possibili valori di R13, in quattro campi e in entrambe le direzioni,
inclusa l'assenza di wrap e la conservazione esatta dei bit estranei.
Le tre suite dello spettro passano senza ARDF/Satelliti.
Questi test simulano RF e display; non convalidano la radio fisica.

#### Selezione dal web

In Quansheng, **Firmware personalizzato > Immagini Bricohams locali**, si sceglie
ARDF, Satelliti o Spettro e si copia il comando PowerShell. Non usa le
caselle del catalogo online, non compila nel browser né installa alcunché.
Richiede strumenti ARM locali, un Fusion61 con il commit fissato
e una nuova destinazione. I percorsi del comando vanno adattati al computer.
Poi si caricano tutti i file di `artifacts`, inclusi SHA256SUMS
e build-info, nel verificatore esistente. Preparazione e installazione di uno slot
restano indipendenti e richiedono un backup verificato; Main viene conservata.
### Nuovo nucleo ARDF originale

L'implementazione originale parte dal comportamento documentato e dall'ispezione dei binari,
senza attendere i sorgenti Karina. Ciò **non certifica un'equivalenza al 100%** né
trasforma la base F4HWN in una riscrittura completa da zero.

`firmware/bricohams/ardf.c` e `ardf.h` sono un nucleo C99 scritto
indipendentemente: non sono state copiate le implementazioni ARDF o Karina.
Implementa cicli da 1-10 trasmettitori, modalità senza cicli (0), sincronizzazione
del trasmettitore/fase, avviso di fine turno e memoria dell'indice di guadagno per
VFO/trasmettitore con maschera A/B. Non controlla chip RF, TX, altoparlante, display,
tastiera, EEPROM né calibrazione.

Contratto:

- `bh_ardf_init` convalida prima di cambiare stato. Riconfigurare cancella i
  cronologici del guadagno. Una configurazione rifiutata conserva lo stato.
- Il clock in input è monotono `uint32_t` in millisecondi; è consentito
  un rollover tra chiamate, non salti all'indietro né intervalli di
  2^32 ms o superiori. L'adattatore deve convertire la base dei tick della radio.
- `correction_ppm` tra -50000 e 50000 modifica l'avanzamento del clock;
  un valore positivo lo accelera. Non è il valore `ClkCor` di un altro
  firmware né una regolazione dell'oscillatore RF. Le frazioni vengono mantenute tra aggiornamenti.
- Durata da 1000 a 999990 ms, avviso da 0 a 30000 ms senza superare il
  turno. Sono limiti di questa implementazione, non equivalenza binaria.
- `max_gain_index` deve provenire da una tabella RF convalidata per
  l'hardware; il nucleo non presume che un indice corrisponda a 5 dB.
- La lettura del guadagno restituisce `available=false` se non c'è cronologia;
  in quel caso non modifica l'indice di output. Il chiamante deve controllare
  il risultato, non convertirlo in una regolazione RF predefinita.
- Le funzioni restituiscono errori espliciti; il futuro adattatore deve
  segnalarli. Non chiamare concorrentemente da interrupt e UI.
- `BRICOHAMS_ENABLE_ARDF=OFF` esclude l'intera libreria in compilazione.
  È una selezione di compilazione, non il download dinamico di un modulo.

Test nativi (compilatore C, CMake e generatore disponibili in PATH):

```powershell
cmake -S .\firmware -B .\firmware-builds\core-tests -G Ninja -DBUILD_TESTING=ON
cmake --build .\firmware-builds\core-tests
ctest --test-dir .\firmware-builds\core-tests --output-on-failure
```

Il workflow `firmware-modules.yml` esegue i test C e controlla anche
la configurazione senza ARDF. Sono test del nucleo, non convalida radio.
La compilazione ARM consente di verificare la compatibilità delle istruzioni e
delle dipendenze, ma non sostituisce l'esecuzione dei test.

**Integrazione Beta disponibile:** `--module ardf` include il nucleo e un
adattatore in Fox Hunt residente. Il builder convalida tutti i punti
d'integrazione rispetto al checkout fissato prima di scrivere modifiche. Richiede
Fox Hunt ON, overlay apps OFF e Beacon OFF; non modifica i sorgenti originali.
Il clock proviene dal SysTick reale da 10 ms, non dal conteggio delle iterazioni del loop.
Usa esclusivamente la tabella di attenuazione Fox Hunt esistente; gli indici
sono salvati in RAM e recuperati manualmente, non al cambio automatico
del trasmettitore. Non scrive nuove configurazioni né calibrazione.

Compilazione:

```powershell
npm run build:bricohams -- `
  --source 'C:\Users\USER\Documents\Multiboot\Fusion61' `
  --output '.\firmware-builds\ardf-beta' `
  --preset FieldOps `
  --option ENABLE_FEAT_F4HWN_BEACON=OFF `
  --option ENABLE_VOX=OFF `
  --module ardf
```

Senza `--module`, il builder non applica adattatori né include nuclei originali.
`--module karina` e altri nomi non implementati vengono rifiutati esplicitamente.
Il manifesto include gli hash dei file applicati e le licenze proprie
GPL-3.0-or-later insieme a LICENSE/NOTICE Apache-2.0 dell'upstream.

`sourceChangesIncluded: false` significa che le modifiche locali
non confermate del repository di riferimento non sono incorporate; le modifiche del modulo appaiono
in `modules` e `moduleSources`.

In Fox Hunt, con la tastiera sbloccata:

| Tasto | Modulo ARDF |
| --- | --- |
| 4 | Numero di trasmettitori: OFF, 1...10, OFF. Reimposta sincronizzazione e cronologia |
| 5 | Durata: 15...120 s, incrementi di 15 s; iniziale 60 s. Reimposta sincronizzazione |
| 6 | Selezionare il numero del trasmettitore da sincronizzare |
| 7 | Sincronizzare l'inizio del trasmettitore selezionato con l'evento reale |
| 8 | Salvare l'attenuazione corrente e registrare un'osservazione manuale del trasmettitore attivo |
| 9 | Recuperare manualmente l'attenuazione salvata per il trasmettitore corrente, se presente |
| EXIT | Uscire da Fox Hunt, mantenendo il comportamento upstream |

La riga di contesto mostra numero/durata/selezione prima della sincronizzazione,
e trasmettitore/conto alla rovescia dopo. `!` indica gli ultimi 5 secondi: non
viene introdotto un nuovo beep. `ARDF ERROR` segnala un errore del nucleo; cambiare
numero/durata lo reinizializza. F non inverte le nuove azioni 4-9.
Il blocco tastiera esistente continua a impedire questi tasti. Ogni ingresso
nella modalità inizia con OFF; questo primo adattatore non dispone di ripristino persistente né memoria di due
VFO (il nucleo supporta invece due banchi).

Compilazione strutturale del 25-10-2026:
112672 byte d'immagine, RAM 12448/16384, Flash collegata 111784/120832,
stub Multiboot da 888 byte con 83 rami verificati. Sono misure di questa
combinazione, non una riserva garantita per qualsiasi insieme di moduli.
I test dell'adattatore usano chiamate radio simulate; verificano
tasti, sincronizzazione, display, errori e salvataggio/recupero manuale.
**Non è stata installata né convalidata su hardware.** Fuori da Fox Hunt il
firmware mantiene le capacità TX upstream; Beacon/VOX OFF non equivale
a bloccare tutte le trasmissioni. Non usarlo come firmware ARDF certificato.

**Da completare:** convalida fisica di display, tempi e attenuazione, opzioni
di persistenza/VFO, impostazioni di gara e ricezione. L'analizzatore originale,
cattura RX e multipreset sono integrati nell'immagine separata `spectrum`,
non in ARDF. Le funzioni descritte non certificano la piena parità con Karina.

### Statistiche ARDF per beacon implementate

L'immagine `ARDF-Stats-final-20261025` include bootlogo e osservazioni
manuali per beacon: 113960 byte RAW, RAM 12576/16384 e Flash
113072/120832. Non è rilevamento automatico né stima della posizione.

In ARDF sincronizzato, ogni pressione elaborata di 8 salva l'attenuazione
come prima e registra un'osservazione per il trasmettitore del turno corrente.
Il ciclo viene aggiornato prima dell'attribuzione, per evitare di usare un turno precedente
al superamento del suo limite. Ciascuno dei dieci beacon dispone di contatore,
primo/ultimo istante relativo alla sessione e ultimo indice di attenuazione.
Non vengono campionati né salvati RSSI, direzione, frequenza o coordinate GPS.
L'indice 0-5 appartiene alla tabella upstream a sei passi; non esprime dB.

I contatori saturano a 65535 senza wrap; un flag avvisa se si è tentato di
registrare altre osservazioni. In tal caso i totali sono un minimo, non un
conteggio esatto. Primo/ultimo orario e indice continuano ad aggiornarsi.
Il tempo è trascorso dall'ingresso/riconfigurazione di ARDF, non
dalla sincronizzazione del beacon. Si usa un clock uint32 in millisecondi:
la sessione deve durare meno di 2^32 ms (circa 49,7 giorni). Non è UTC né GPS,
e `receivedAt` nel JSON è l'ora di ricezione del computer.

Rientrare in ARDF o cambiare il numero/la durata dei trasmettitori avvia una
nuova sessione e cancella le osservazioni precedenti. Risincronizzare con 7 non
cancella i dati se numero/durata non cambiano. All'uscita il
tempo si ferma e l'ultima tabella RAM viene conservata fino all'avvio di un'altra sessione,
riconfigurazione o riavvio/spegnimento della radio. Per queste statistiche non viene scritta EEPROM/Flash;
il comportamento di salvataggio delle impostazioni Fox Hunt
upstream al di fuori di questa tabella resta quello esistente.

In **Quansheng > Operazioni > Statistiche ARDF Bricohams Beta**,
**Consulta e scarica statistiche ARDF** acquisisce uno snapshot e
richiede il download di JSON. Non c'è polling continuo né invio a servizi.
È consentito interrogare una sessione terminata o lo stato OFF, ma non una radio
che non abbia mai avviato ARDF dall'accensione. L'interfaccia identifica
errori del modulo, saturazione e assenza di posizione. Il download deve essere
confermato nel browser prima di scartare la sessione.

Il JSON include `connectionSession` del connettore e un contatore `session`
del firmware, locale a quell'avvio. Non sono identificatori globali:
riconnessioni o riavvii richiedono di conservare i file originali e di non
unire le sessioni solo in base al numero. `observations` contiene un record
per beacon osservato, non un evento per pressione né una traccia GPS.
Esporta la tabella riepilogativa; non ricostruisce le osservazioni intermedie.

Protocollo sperimentale privato little-endian: comando `0x7B20`, risposta
`0x7B21`. Richiesta esattamente da 4 byte: versione 1, operazione 0 (query),
sequenza a 16 bit. Risposta da 140 byte, più header upstream da
4 byte: rientra nel limite di risposta di 144 byte.

| Offset risposta | Bytes | Contenuto |
| --- | ---: | --- |
| 0 | 1 | Versione 1 |
| 1 | 1 | Stato: 0 corretta, 2 richiesta non valida, 3 nessuna sessione avviata |
| 2 | 1 | Flag: attiva=1, sincronizzata=2, errore modulo=4, contatore saturo=8 |
| 3 | 1 | Numero di trasmettitori, 0-10 |
| 4 | 2 | Sequenza rispecchiata; zero per richiesta di lunghezza non valida |
| 6 | 2 | Riservati a zero |
| 8 | 4 | Contatore sessione non nullo, reimpostato all'avvio |
| 12 | 4 | Durata del turno in ms |
| 16 | 4 | Tempo trascorso della sessione in ms |
| 20 | 120 | Dieci record da 12 byte, beacon 1-10 |

Ogni record contiene contatore uint16, indice di guadagno uint8,
valido uint8 (0/1), primo istante uint32 e ultimo istante uint32.
I record senza osservazioni sono zero. Il connettore convalida lunghezza,
versione, sequenza, campi riservati, numero beacon, indice,
ordine temporale e coerenza prima di fornire dati o esportare.
Le richieste non valide non cancellano né modificano la tabella. L'offuscamento
del trasporto non è cifratura/autenticazione.

Test C con radio simulata: limiti del turno, primo/ultimo orario,
contatore saturo, reimpostazioni, lettura dopo l'uscita, lunghezze non valide
e rollover del clock. Test JavaScript verificano snapshot e rifiuti di
sequenza, beacon, indice, orario, campi riservati e sessione mancante.
Integrazione USB e visualizzazione fisica restano da fare. Non viene
attribuita a un'osservazione passata la posizione del telefono: il futuro
record GPS dovrà acquisire i propri tempi/precisione e consenso.

### Nuovo nucleo indipendente di acquisizione dello spettro

`firmware/bricohams/spectrum.c` e `spectrum.h` implementano una macchina a
stati originale C99, senza copiare algoritmi Karina. Configura da
1 a 128 punti, frequenza iniziale e passo in unità da 10 Hz, assestamento
da 1-1000 ms e media di 1-16 campioni RSSI per punto. Ogni punto conserva
livello medio e massimo mantenuto; il reset dei massimi acquisisce i livelli correnti.
`BRICOHAMS_ENABLE_SPECTRUM=OFF` esclude questa libreria.

L'adattatore deve richiedere `bh_spectrum_frequency`, convalidare la banda reale,
sintonizzare il ricevitore e, solo in caso di successo, chiamare `bh_spectrum_tuned`.
I campioni prima dell'assestamento restituiscono `NOT_SETTLED` e non vengono
inclusi. Al completamento di un punto è di nuovo richiesta la sintonia, anche con
un solo punto. Al completamento di una scansione, `frames` viene incrementato.
I valori sono RSSI grezzo **non dBm calibrati**; l'adattatore deve garantire
che un valore maggiore rappresenti un segnale più forte.

Il clock ha lo stesso contratto monotono a 32 bit di ARDF; le funzioni non vanno chiamate
concorrenzialmente. L'adattatore determina la cadenza e acquisisce letture RF diverse:
chiamare molte volte con la stessa lettura non crea campioni indipendenti.
Il nucleo non controlla AGC/LNA/PGA, non trasmette TX,
non calcola una FFT né salva preset o calibrazione.

I test verificano limiti, cambio punto, calcolo esatto della frequenza,
media, massimi, assestamento, rollover, 128 punti con 16 campioni RSSI massimi e
rifiuto atomico di configurazioni non valide/overflow.
Non è l'analizzatore Karina. L'adattatore dell'immagine `spectrum` collega
questo nucleo al ricevitore e al display con l'ambito Beta descritto sopra;
resta da convalidare fisicamente.
Requisiti disponibili in PATH: Node.js 22+, Git, CMake 3.22+, Ninja, ARM GNU Toolchain e
Python 3 per il controllo dei formati upstream. Non richiede pacchetti
Python esterni né nuove dipendenze npm.

Configurazione usata e testata su Windows:

- Arm GNU Toolchain 13.3.Rel1, GCC 13.3.1.
- CMake 3.31.8.
- Ninja 1.13.1.
- Python 3.13, rilevato da CMake.

Dalla radice di questo repository, in PowerShell:

```powershell
npm run build:bricohams -- `
  --source 'C:\Users\anatol.lopez\Documents\Multiboot\Fusion61' `
  --output '.\firmware-builds\mi-fusion' `
  --preset Fusion `
  --option ENABLE_VOX=OFF
```

La destinazione **deve essere nuova**: una compilazione precedente non viene cancellata né sovrascritta.
Se una compilazione fallisce, viene mostrato l'errore e non viene fornito un insieme di
artefatti marcato come corretto; per riprovare, usa una nuova destinazione. I sorgenti
e i risultati diagnostici restano nella destinazione non riuscita.

Per Labs, sostituire `--preset Fusion` con `--preset Labs` e usare un'altra destinazione.
Sono accettati anche `FieldOps` e `Transfer`, anche se questi due
profili non sono stati compilati in questa convalida.

Ogni `--option` ammette esattamente `ENABLE_XXX=ON` o `ENABLE_XXX=OFF`.
È possibile ripetere `--option` per funzioni diverse, ma non per lo stesso nome.
Le opzioni disponibili sono quelle booleane dei preset del **commit locale fissato**, non quelle del
modulo online v6.3.0. Non sono accettate chiavi sconosciute, valori arbitrari, `DEV`, altro hardware né
versioni inventate.

Per elencarle senza compilare:

```powershell
$p = Get-Content 'C:\Users\USER\Documents\Multiboot\Fusion61\CMakePresets.json' -Raw | ConvertFrom-Json
$p.configurePresets | ForEach-Object { $_.cacheVariables } | Format-List
```

Il costruttore risolve l'ereditarietà dei preset e richiede di mantenere attivi:

- `ENABLE_FEAT_F4HWN`
- `ENABLE_UART`
- `ENABLE_USB`
- `ENABLE_FEAT_F4HWN_MULTIBOOT`
- `ENABLE_FEAT_F4HWN_MULTIBOOT_OVERLAY`

Queste condizioni mantengono il profilo di gestione degli slot; non garantiscono che
ogni combinazione restante sia utile o sicura. Il linker deve accettare RAM
e Flash, e i controlli upstream devono passare. Il budget non viene ridotto né
vengono omessi controlli per far rientrare un'immagine.

## Sorgenti, compilazione e riproducibilità

Lo script clona il repository **locale** in una cartella separata ed estrae il
commit fissato. Non modifica la cartella Fusion61, non applica il suo diff non confermato,
non scarica Karina né cambia versione per aggirare l'ispettore.

Vengono fissati `SOURCE_DATE_EPOCH` al tempo del commit, `TZ=UTC` e `LC_ALL=C`.
Con la toolchain indicata, due compilazioni Fusion in percorsi diversi
hanno prodotto lo stesso SHA-256 del `.bin`. Ciò verifica la riproducibilità locale
del firmware, non l'identità byte per byte di ELF, mappe o report che contengono
percorsi assoluti, né la riproducibilità con un'altra toolchain.

Il costruttore:

1. Convalida argomenti, commit e opzioni prima di creare la destinazione.
2. Clona i sorgenti e configura CMake in Release.
3. Compila con il preset scelto, edizione Bricohams e opzioni risolte.
4. Mantiene i controlli di formato e isolamento del ripristinatore RAM.
5. Verifica lunghezza, vettori PY32, versione e marchio dell'edizione nel binario.
6. Produce artefatti, opzioni effettive, strumenti e hash.

La directory `source` conserva il checkout usato. La cartella `artifacts`
contiene firmware, ELF, mappa, `size.txt`, `build-info.json`, `LICENSE`, `NOTICE`
e `SHA256SUMS`. Tutti, tranne il manifesto stesso, sono inclusi in SHA256SUMS.
L'hash rileva modifiche rispetto al manifesto, **non è una firma digitale**.

## Binari generati il 25-10-2026

Entrambi hanno `ENABLE_VOX=OFF`; le altre opzioni sono quelle del rispettivo preset upstream.

| Profilo | Binario | Byte RAW | RAM secondo linker | Flash secondo linker |
| --- | --- | ---: | ---: | ---: |
| Fusion | `bricohams.fusion.v6.1.0.bin` | 106808 | 12160 / 16384 | 105920 / 120832 |
| Labs | `bricohams.labs.v6.1.0.bin` | 114124 | 12544 / 16384 | 113236 / 120832 |

La dimensione RAW include la sezione di ripristino RAM e non coincide con la
riga FLASH del report. Entrambi i RAW sono inferiori al massimo di 120832 byte.
Il controllo di isolamento segnala 888 byte e 83 salti verificati.

SHA-256:

```text
65d877114264d8337cdd6e9a5a52dcb85689ac03e02ed0a98b2063bfcc281f23  bricohams.fusion.v6.1.0.bin
7a4cbb4fc6cd8363c776e2982c10b15e92ef779ec1867f49826556514a47bed4  bricohams.labs.v6.1.0.bin
```

Labs mantiene `ENABLE_FEAT_F4HWN_EXT_FLASH_RW` e
`ENABLE_FEAT_F4HWN_OVERLAY_APPS`; Fusion no. La capacità di backup fisico
richiede il protocollo compatibile della radio e non è stata testata con hardware.
Non sono state generate nuove `.app`: quelle esistenti richiedono ABI/API compatibili.

## Uso nel web e negli slot

Gli artefatti distribuiti vengono copiati in:

```text
Documents\Multiboot\Bricohams\Fusion
Documents\Multiboot\Bricohams\Labs
```

In **Quansheng > Firmware personalizzato > Verifica la compilazione scaricata**,
seleziona insieme **tutti** i file di una cartella degli artefatti. Il
verificatore richiede ogni voce di SHA256SUMS, inclusi mappa, ELF e licenze.
Dopo la verifica, **Usa questo firmware** lo prepara nel pannello degli slot.

In alternativa, seleziona `Documents\Multiboot` nella libreria locale:
i due `.bin` appaiono come immagini aggiuntive preparabili. La libreria
verifica la struttura e mostra l'hash, ma non verifica automaticamente il
manifesto adiacente; per farlo, usa il modulo di compilazione.

L'installazione mantiene backup completo, conferma e CRC dello slot. Usare
**slot 1-4, non Main**. Non sono stati scritti né cancellati dati della radio.
Fusion e Labs qui sono build sperimentali locali, non versioni ufficiali
firmate né certificate al banco. La catena stabile upstream non cambia
lo stato sperimentale di questa derivazione.

## Convalida hardware ancora da fare

Convalida software completata: 149 test, controllo sintassi e build
Pages corretti. Nel browser sono stati verificati i 7 file del manifesto di
ciascuna edizione, preparati entrambi i firmware e l'installazione è rimasta bloccata
senza connessione/backup. Alla selezione di Multiboot dopo la consegna sono state esaminate
73 immagini: 11 ammesse strutturalmente e 62 bloccate. Non si sono verificati errori
JavaScript in quel controllo.

Prima di considerarlo idoneo all'uso operativo restano da verificare identificazione
dell'unità, backup originale, test di avvio e recupero, calibrazione,
menu, RX e cambio di CFG/slot. Non si dichiara risolto il precedente errore USB.
Questi binari non vengono pubblicati né flashati automaticamente.

## Branding di avvio implementato

Il costruttore applica la schermata iniziale Bricohams a tutte le nuove edizioni,
con o senza adattatore. Mantiene gli avvisi di licenza upstream e non altera
il repository di riferimento. I punti di integrazione vengono convalidati una sola
volta: una sorgente diversa o una patch duplicata interrompono la compilazione.
Il manifesto registra gli hash in `brandingSources`, separati da
`moduleSources`; `sourceChangesIncluded: false` continua a riferirsi alle modifiche
locali del repository upstream, non all'assenza di queste patch originali.

Con `ENABLE_FEAT_F4HWN_LOGO=ON`, la modalità di accensione LOGO e le chiamate
a `UI_DisplayLogo` mostrano un adattamento monocromatico 128x48 del logo
originale Bricohams, più `Bricohams BETA` nell'ultima riga. Occupa 768 byte
di bitmap nella Flash interna. Il logo personalizzato della Flash esterna
non viene letto né sovrascritto: resta conservato, ma in questa modalità non viene mostrato nelle
immagini derivate. Disattivare LOGO in compilazione esclude la bitmap tramite
eliminazione del codice inutilizzato; l'opzione non viene forzata.

Le modalità NONE/SOUND continuano a non mostrare la schermata iniziale; la
preferenza di avvio memorizzata non cambia. Nelle modalità testo vengono mantenuti
messaggi personali e tensione; solo i messaggi predefiniti vuoti
vengono sostituiti da Bricohams/RADIO BETA e il piè di pagina identifica l'edizione Beta.
Non si afferma che il logo compaia in tutte le modalità di accensione.

`scripts/generate-bootlogo.ps1` genera `firmware/bricohams/bootlogo.h`
dal PNG originale usando System.Drawing su Windows. Il builder usa
l'header già generato, senza richiedere PowerShell o quella libreria per la compilazione.
Si mantiene la proporzione su sfondo bianco; la soglia di luminanza 190
converte i tratti scuri e arancioni in pixel attivi dell'LCD monocromatico.
L'hash SHA-256 del PNG è riportato nell'header. È un adattamento specifico
per l'hardware, non una sostituzione della risorsa a colori web/Android.

Immagini Beta con bootlogo compilate il 25-10-2026:

| Modulo | Directory sotto Documents/Multiboot/Bricohams | Byte RAW | RAM | Flash |
| --- | --- | ---: | ---: | ---: |
| ARDF | `ARDF-Bootlogo-final-20261025/artifacts` | 113452 | 12448/16384 | 112564/120832 |
| Satelliti | `Satellite-Bootlogo-final-20261025/artifacts` | 113096 | 12352/16384 | 112208/120832 |
| Spettro/VFO-PRO/CSS | `Spectrum-Bootlogo-final-20261025/artifacts` | 116808 | 13248/16384 | 115920/120832 |

Le misurazioni precedenti in altre cartelle si riferiscono a compilazioni
precedenti, senza questa bitmap. Il logo deve ancora essere verificato fisicamente
sull'LCD; compilare e renderizzare la bitmap su un computer non ne convalida
contrasto, orientamento o leggibilità sulla radio. Non è stato flashato.

## Fase successiva richiesta: Bricohams Android

L'APK nativa `0.8.2-beta` integra un logbook con ricerca e importazione ADIF, ADIF/JSON,
ripristino JSON, sessioni ARDF con cronologia/statistiche e somma filtrata dei segmenti,
GPS puntuale, Morse da testo/WAV sperimentale
e CAT RX temporaneo via USB CDC ACM e adattatori riconosciuti CH34x/CP210x/FTDI/Prolific.
La [guida Android](ANDROID.md) distingue le funzioni disponibili dagli
obiettivi successivi. Include SSTV Robot36 da WAV con esportazione PNG
e SGP4 offline con cataloghi TLE importati, passaggi e tracking Doppler RX.
Integra la cattura del microfono fino a 60 s in primo piano per la successiva
decodifica Morse/Robot36. Non include decodifica continua, scrittura
di canali né upload LoTW. L'equivalenza completa con Karina e
la convalida fisica di firmware e telefono restano da fare.
### Funzioni obiettivo

- Controllo del Quansheng da Android: leggere lo stato, regolare frequenza,
  subtoni e potenza per canale e accedere alle altre opzioni realmente esposte
  dall'hardware/firmware. Distinguere le regolazioni temporanee del VFO
  dalla scrittura persistente; non riscrivere l'intero codeplug per cambiare
  un campo se il protocollo consente un'operazione più mirata.
- Tracking dei satelliti con funzionalità simili a Look4sat: selezione del
  satellite, TLE, previsione dei passaggi, posizione dell'osservatore e correzione
  Doppler della frequenza via CAT durante il passaggio selezionato.
- Ricezione/decodifica SSTV, incluso Robot36; trasmissione SSTV come
  obiettivo da convalidare con il percorso audio e PTT disponibili.
- Interpretazione del Morse dall'audio, con indicazione dell'incertezza.
- Logbook con funzionalità ispirate a HAMRS: contatti, consultazione,
  modifica, esportazione ADIF e obiettivo di firma/upload su LoTW.
- Caccia alla volpe: sessioni, beacon, orari, osservazioni, percorso GPS,
  posizioni e statistiche di ricerca, con esportazione e funzionamento
  sul campo offline per le funzioni che non richiedono servizi.
- Marchio Bricohams nell'applicazione, nel firmware, nei bootlogo, nella documentazione e negli
  artefatti. Migrazione finale del web e dell'app al colore arancione aziendale,
  dopo aver completato e testato le funzioni, come richiesto.

### Ipotesi provvisorie e limiti

In assenza di risposta alle richieste di chiarimento, USB OTG con cavo di
programmazione è il trasporto iniziale previsto. Bluetooth richiederebbe un
adattatore e protocollo verificati; non si presume la presenza di Bluetooth nella radio.
Un cavo seriale di programmazione non implica il trasporto audio: SSTV e
Morse richiedono un ingresso/uscita audio separato e verificato.
Non si presume che Android possa mantenere USB e quel percorso audio su
qualsiasi telefono senza test.

CAT non è considerato disponibile solo perché esistono lettura/scrittura
dei canali. Prima vanno verificate le effettive capacità del firmware e, se necessario, progettato
un protocollo proprietario versionato con interrogazione delle capacità,
convalida per modello, conferma di ricezione, errori e recupero dalla
disconnessione. TX, limiti di banda e protezioni di backup restano
validi. Il tracking non deve abilitare TX automaticamente né continuare
a impartire modifiche dopo una perdita di connessione o l'arresto del passaggio.

L'upload diretto su LoTW resta un obiettivo, non un'integrazione
risolta. Occorre verificare il meccanismo di firma accettato e la gestione
sicura del certificato dell'indicativo su Android. L'alternativa iniziale
è ADIF da firmare con TQSL su computer; esportare ADIF non equivale a
caricarlo su LoTW. Non includere certificati, chiavi o password nel
repository, nei log diagnostici o nei progetti esportati.

Il termine richiesto "encriptions" resta da chiarire: non viene
interpretato automaticamente come cifratura delle comunicazioni radioamatoriali.
Non si dichiara il supporto della cifratura né la sua legalità.

Il GPS fornisce la posizione del telefono, non quella del beacon. Una posizione
stimata del trasmettitore richiede osservazioni/differenze temporali sufficienti e deve mostrare
la propria incertezza; il solo RSSI non consente di affermare una posizione esatta.
Percorsi e posizioni sono privati per impostazione predefinita, con permessi espliciti
e senza pubblicazione automatica.

Le applicazioni citate sono riferimenti funzionali, non sorgenti disponibili
né autorizzazione a copiare codice, risorse o marchi. Dare priorità a sorgenti
con licenza compatibile e mantenere le attribuzioni; se non disponibili, implementare
in modo indipendente sulla base della documentazione e del comportamento osservabile
consentito, senza aggirare protezioni. Non dichiarare parità senza test.

### Criteri prima di dichiarare conclusa la fase

1. Chiudere la matrice delle funzioni di ogni immagine e convalidare avvio,
   recupero, RX, ripristino dei registri e operazioni supportate su hardware
   identificato e con backup completo.
2. Approvare l'architettura Android e la matrice telefono/cavo/radio/firmware;
   verificare controllo CAT, disconnessioni e rilettura dopo modifiche ai canali.
3. Confrontare passaggi/Doppler con riferimenti noti, testare SSTV/Morse
   con campioni noti e poi con audio reale, e convalidare separatamente i record
   ADIF e firma/upload LoTW.
4. Testare GPS, permessi negati, assenza di rete, sessioni e statistiche
   sul campo senza inventare la posizione dei beacon.
5. Applicare e verificare branding Bricohams e bootlogo in base ai limiti
del display, mantenendo licenze e avvisi obbligatori. Applicare alla fine
   la palette arancione con contrasto accessibile, senza confondere gli stati di
   pericolo, successo e avviso. Consegnare APK e artefatti identificati per
   versione/hash solo quando lo stato della convalida è esplicito.