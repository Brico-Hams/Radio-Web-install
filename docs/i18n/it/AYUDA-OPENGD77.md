# Guida OpenGD77: configurazione e uso sicuro

**Data della verifica: 2026-10-25.** Testo originale in spagnolo basato sulle fonti ufficiali indicate alla fine e sul codice di questa applicazione. Non è una traduzione del manuale né una garanzia di funzionamento di tutte le build.

Per scegliere una radio, una revisione della scheda o una specifica immagine, consulta [Modelli e compatibilità](AYUDA-OPENGD77-MODELOS.md). Qui si spiega come organizzare la configurazione, usare le funzioni documentate e riconoscere i limiti dell'editor web.

## Cancellazione locale dei canali (Beta)

In un codeplug standard da 128 KiB, **Elimina dal file** libera la memoria
selezionata e rimuove i relativi riferimenti nelle 68 zone standard (80 canali per
zona) e nelle 64 liste di scansione (32 canali per lista). Pulisce anche i
riferimenti come priorità 1, priorità 2 e canale TX designato, azzerandoli.
Conserva nomi, indicatori, altri canali e i relativi numeri; non rinumera.
Non modifica i contatti né la lista SAT. La mappa è confrontata con il
[parser binario del CPS pubblico](https://grid.radio/opengd77/js/g77.js).

Questa procedura non supporta i formati Scanner con zone estese. Opera su
una copia in memoria: esporta il binario modificato con un altro nome e conserva
l'originale. In modalità normale richiede conferma; PRO la omette per questa
sessione. Non scrive sulla radio: la scrittura fisica OpenGD77 resta bloccata finché
non sarà disponibile il backup MCU completo richiesto. La radio Quansheng collegata non
consente di validare l'hardware OpenGD77.

## Importare ripetitori REMER (solo file locale)

La scheda REMER del pianificatore propone le frequenze VHF/FM trascritte dalla
fonte fornita dall'utente. Seleziona le memorie necessarie e
aggiungile al codeplug aperto; l'applicazione lo rilegge con il parser
OpenGD77 per verificare che nome, frequenze e modalità compaiano nell'elenco.
Le memorie sono predisposte solo per la ricezione. I CTCSS pubblicati restano
una nota di riferimento: i toni non vengono codificati né verificati in RF.

L'elenco non certifica che una frequenza, un tono, una posizione o un ripetitore siano ancora
attuali. Prima di qualsiasi uso, conferma le informazioni con REMER e le autorità competenti.
Le frequenze HF/SSB della stessa fonte sono mostrate
come contesto e non vengono importate come canali VHF. Il fatto che il parser accetti un canale
attesta soltanto che la struttura standard del binario è leggibile; non dimostra che
il firmware lo mostri dopo la scrittura, che si riceva RF o che la radio sia stata
programmata. La scrittura fisica resta bloccata.

## Importare canali CSV da CPS o CHIRP

In **Canali preparati**, importa `Channels.csv` esportato da OpenGD77 CPS
o un CSV con le intestazioni standard CHIRP (`Name`, `Frequency`, `Duplex`, `Offset`,
`Mode`). Il parser accetta solo canali FM analogici nelle bande VHF 136-174 MHz
e UHF 400-470 MHz. Per CHIRP risolve `+`, `-`, `split` e `off`, e rifiuta
frequenze, offset o modalità che non può convalidare. I record vengono convertiti
in canali solo RX; i toni della fonte vengono annotati, non programmati. Controlla
la tabella dei canali preparati, scegli un modello FM e salva il binario
locale per ispezionarlo prima di usare il CPS.

Le righe digitali/DMR di `Channels.csv` sono esplicitamente escluse: i
contatti, i gruppi TG, le liste RX e i riferimenti di zona di `Contacts.csv`,
`TG_Lists.csv` e `Zones.csv` non vengono migrati con questa importazione. Questi file
sono tabelle correlate, non un codeplug binario indipendente. I CSV
proprietari di Retevis/RT950 e i file `.4rdmf` non vengono interpretati in base all'estensione
né alla presenza di colonne di frequenza: servono specifiche verificate
per mappare i campi. Una riga esclusa viene segnalata con il numero di riga e il motivo;
non viene scartata silenziosamente né mescolata al binario.

## Verifica web senza installazione (25-10-2026)

L'interfaccia include una matrice **OpenGD77 CPS: disponibilità effettiva sul web**.
È distribuita come sito statico HTTPS, senza installare Node né il pacchetto locale.
L'accesso fisico richiede WebUSB/Web Serial e le autorizzazioni del browser; può
essere necessario un driver di sistema. La compatibilità con i dispositivi mobili non è garantita.

| Funzione | Web senza server installato |
| --- | --- |
| Aprire/salvare codeplug standard, modificare/eliminare canali e pulire i riferimenti | Disponibile |
| Importare RadioID user.csv | Disponibile; la richiesta API diretta non supporta CORS |
| Gruppi BrandMeister | Ricerca diretta per prefisso e importazione come gruppi |
| RepeaterBook | Importazione di JSON ottenuto con autorizzazione; richiesta autenticata solo con server |
| Lista SAT, TLE pubblicati, passaggi SGP4 e memorie Doppler | Disponibile nel browser |
| Eseguire il backup di calibrazione/codeplug alla connessione | Automatico, persistente e con hash; copia parziale |
| Copiare il firmware MCU dell'unità | Non implementato in modo completo e verificato per modello |
| Operazioni radio dopo il backup parziale | Bloccate, incluse nuove letture/acquisizioni |
| Flash, ripristino, voci, database massivo degli ID ed editor completo di zone/impostazioni | Non implementati qui |

Non viene promessa la piena parità con grid.radio né con il CPS desktop.
Sono state verificate le intestazioni dei fornitori: BrandMeister ammette l'origine web;
RadioID non restituisce Access-Control-Allow-Origin per la richiesta verificata.
Questi limiti non vengono nascosti usando proxy pubblici o dati fittizi.

### Backup preliminare obbligatorio

La connessione identifica l'unità ed esegue automaticamente BackupManager prima
di abilitare qualsiasi altra operazione radio. L'identificazione e le letture
necessarie a creare la copia sono le uniche eccezioni. Calibrazione e codeplug
vengono salvati in IndexedDB e riletti con SHA-256 prima di esportare il manifesto.
Se manca il firmware MCU, il risultato dichiara **BACKUP PARZIALE**, non viene concesso
il permesso e sono bloccate nuove letture, acquisizioni, scritture e ripristini, anche
in PRO. La copia consente di aprire il codeplug e modificarlo offline senza toccare la radio.

Questa protezione non crea un lettore firmware inesistente. Non si può affermare
che il firmware originale completo venga già salvato automaticamente. Non si provano
modalità/indirizzi MCU arbitrari per simulare questa funzione.
Se per «originale» si intende il firmware commerciale di fabbrica già sostituito, serve solo
una copia precedente all'installazione; la lettura di OpenGD77 non recupera quei byte.

## 1. Prima di collegare o trasmettere

1. Identifica produttore, modello completo, revisione hardware e firmware installato. «UV380», «10W» e «10W PLUS» non sono equivalenti.
2. Annota versione del CPS, data/build del firmware, lingua e modifiche hardware. Conserva anche il nome e la provenienza del pacchetto installato.
3. Verifica la tua autorizzazione, il piano delle bande e i parametri pubblicati dal responsabile del ripetitore o della rete. Un campo frequenza accettato dal software **non autorizza a trasmettere**.
4. Inizia con canali di **sola ricezione**, VOX disattivato e beacon APRS disattivati. Collega un'antenna adeguata prima di qualsiasi trasmissione.
5. Conserva le copie originali fuori dal browser. Non calibrare né installare un altro firmware per risolvere un semplice errore di canale.

OpenGD77 è orientato alla radioamatorialità. Non conserva necessariamente tutte le funzioni del firmware commerciale. La guida consultata indica che SMS TX/RX e le liste di scansione commerciali non sono supportati e che privacy/cifratura non rientrano nei suoi obiettivi. Non interpretare questa descrizione come un parere legale valido in tutto il mondo. [G: Introduction]

### Tre significati distinti di «supportato»

| Evidenza | Cosa dimostra | Cosa non dimostra |
| --- | --- | --- |
| Un modello compare nel manuale | Esiste documentazione per quella famiglia o funzione | Che qualsiasi revisione commerciale sia compatibile |
| È presente in `firmware-core.js`, `TARGETS` | Il catalogo riconosce una destinazione e alcuni nomi di pacchetto | Installazione USB, autenticità di per sé o compatibilità con la tua scheda |
| È presente in `gd77-connector.js`, `MODELS` | Il connettore conosce un valore di identificazione del protocollo | Test fisici con ogni modello, flash o autorizzazione alla scrittura |
| La radio risponde all'identificazione | È stata ricevuta una struttura riconosciuta e una famiglia corrispondente | Backup completo o compatibilità universale della memoria |
| L'editor mostra canali | Può interpretare l'area standard del file | Che abbia letto canali estesi, tutti i dati utente o il firmware |

**Stato effettivo di questo sito web: la scrittura OpenGD77 è BLOCCATA.** Il backup implementato salva calibrazione e codeplug standard, ma restituisce `complete: false`: manca un protocollo verificato per copiare integralmente il firmware interno del MCU. Pertanto non viene concessa l'autorizzazione alla scrittura. Scaricare un'immagine ufficiale **non sostituisce** una copia dell'unità. Il fatto che un CPS esterno consenta la scrittura non rimuove questo blocco. [L]

## 2. Firmware, codeplug, calibrazione e copie

| Elemento | Contenuto o finalità | Precauzione |
| --- | --- | --- |
| Firmware | Programma eseguito dalla radio | Scegliere famiglia, revisione e variante esatte; non è un elenco di canali |
| Codeplug | Configurazione: canali, contatti, gruppi, zone e altre impostazioni | Il formato del produttore e quello OpenGD77 non sono intercambiabili senza verifica |
| Calibrazione | Impostazioni RF specifiche dell'unità | Non copiare da un'altra radio né modificare senza strumentazione e procedura specifica |
| EEPROM / Flash | Aree di memoria con contenuti dipendenti dall'apparecchio | «Flash» non significa necessariamente firmware MCU né clonazione integrale |
| MCU ROM / memoria interna | Immagine interna che in alcuni apparecchi il CPS può trattare come copia separata | Il sito web non dispone di una lettura integrale verificata che consenta di concedere l'autorizzazione |
| Voci, database degli ID, dati orbitali | Risorse aggiuntive caricate con il CPS | Non presumere che siano inclusi in un codeplug da 128 KiB |

La guida raccomanda di copiare EEPROM, Flash, calibrazione, MCU ROM e codeplug prima della prima scrittura della configurazione. La disponibilità effettiva di ciascuna copia va verificata nel CPS e sul modello utilizzato; questo elenco non certifica che tutte le radio espongano le stesse aree. Archivia gli originali, non soltanto il file modificato. [G: Backup Before You Do Anything Else]

### Uso disponibile sul web

1. Apri l'applicazione su `localhost` o HTTPS e utilizza un browser che esponga WebUSB o WebSerial, a seconda della famiglia. La compatibilità dipende dal browser e dal sistema.
2. Seleziona la famiglia corretta: `MK22`, `STM32` o `SERIAL`. Verifica l'identificazione fisica prima di collegare.
3. Chiudi CPS, MMDVMHost e qualsiasi programma che stia usando la radio. Autorizza solo il dispositivo previsto.
4. La connessione identifica la radio e richiede un backup automatico. Controlla il registro e gli errori: il risultato atteso è **parziale**, non un backup integrale.
5. Verifica il download del file `.rwb.json`. La cronologia consente di esportare di nuovo il manifesto e i singoli binari. Il browser potrebbe rifiutare l'archiviazione persistente: esporta in una cartella scelta da te.
6. Il codeplug della copia parziale si apre automaticamente per la modifica offline. **Leggi codeplug** resta bloccato senza un backup integrale. Puoi anche aprire un binario standard di esattamente **131072 byte (128 KiB)**; le estensioni supportate non sostituiscono la verifica del contenuto.
7. Modifica il file locale e usa **Salva binario 128 KiB**. Questo non modifica la radio. La scrittura resta bloccata.
8. Disconnetti dall'applicazione prima di cambiare pagina o aprire il CPS.

Il modulo modifica i canali esistenti: nome ASCII fino a 16 caratteri, RX, TX, FM/DMR, CC, TS e sola ricezione. Mantiene i campi non modificati; non è un editor completo di tutte le funzioni del CPS. Gli strumenti di pianificazione possono inoltre aggiungere al file locale canali basati su un modello, contatti e dati satellitari. Questo non certifica che tutte le funzioni firmware siano implementate nel browser. [L]

**Limite importante:** la lettura web riguarda l'area standard di 128 KiB e non include i canali estesi **1025 e successivi**. Non descrivere il file come un clone completo né come copia di tutte le zone e risorse di una configurazione estesa. Un JSON di backup o del CPS, un ZIP firmware e un binario di dimensioni corrispondenti non sono automaticamente un codeplug valido.

### Lavorare con il CPS esterno

La guida richiede **OpenGD77 CPS** per una radio che esegue già OpenGD77, non il CPS commerciale di Radioddity, Baofeng, TYT o Retevis. Raccomanda di creare un nuovo codeplug o importare un CSV e controllare il risultato. Salva l'originale e una copia di lavoro prima di scrivere. Dopo una scrittura consentita dal CPS, rileggi e verifica un canale per ogni scenario. Questa procedura non viene presentata come un modo per sbloccare il sito web. [G: Codeplug compatibility; CPS software]

## 3. Modello mentale: come si integrano i dati

```text
Identidad propia: indicativo + DMR ID
Contactos digitales: destinos TG o llamadas privadas
Lista TG / RX Group: selección de destinos para un canal
Canal: RX/TX + modo + tonos o CC/TS + destino/lista + restricciones
Zona: selección ordenada de canales
Exploración: canales de la zona o intervalo del VFO
```

Un **database di ID** serve a mostrare i nominativi dei corrispondenti. Non sostituisce i contatti né assegna il TG di trasmissione. Un **contatto digitale** può rappresentare un gruppo o una chiamata privata: il tipo è importante quanto il numero.

Nel CPS o nei codeplug commerciali troverai «RX Group», «RX Group List» o «gruppo di ricezione». OpenGD77 documenta l'uso delle **TG Lists** per selezionare un TG dal canale e, in base al filtro, limitare ciò che si riceve. Non presumere che una lista importata riproduca esattamente le regole di ricezione del firmware commerciale. [G: CPS software — Overview]

### Ordine consigliato per la programmazione

1. Inserisci il tuo nominativo e DMR ID, se pertinente.
2. Crea contatti digitali di tipo gruppo per i TG necessari; separa le chiamate private.
3. Crea liste TG utili per ripetitore, area geografica o impiego.
4. Crea canali con le frequenze, la modalità e i parametri del servizio effettivo.
5. Assegna una lista TG o un contatto diretto, secondo il flusso scelto.
6. Raggruppa i canali in zone piccole e ordinate.
7. Controlla esclusioni dalla scansione, potenza, TOT e sola ricezione.
8. Salva, verifica e prova prima in ricezione.

Non è necessario duplicare un canale per ogni TG quando RX/TX, CC e uso del ripetitore coincidono e la lista TG comprende le destinazioni. Può però essere utile separare i canali con TS, condizioni operative o restrizioni differenti.

**Precisazione sulle versioni:** la sezione generale del CPS raccomanda almeno una lista TG con un contatto di gruppo; anche la sezione `Channel Details` documenta la selezione di **TG Lst o Contact**, non di entrambi contemporaneamente. Questi flussi vanno verificati nel CPS/build utilizzato; non sono una ragione per affermare che tutte le versioni gestiscano entrambi nello stesso modo.

## 4. Campi del canale e significato pratico

| Campo | FM | DMR | Cosa verificare |
| --- | --- | --- | --- |
| Nome | Identificazione locale | Identificazione locale | Un nome non configura il ripetitore |
| RX | Frequenza sulla quale la radio riceve | Frequenza sulla quale la radio riceve | Sul ripetitore, di solito la sua uscita |
| TX | Frequenza sulla quale la radio trasmette | Frequenza sulla quale la radio trasmette | Sul ripetitore, di solito il suo ingresso |
| Modalità | FM / FM stretta | DMR | Deve corrispondere al servizio |
| BW | 25 o 12,5 kHz nella guida | Non equivale alla selezione di TS | Seguire la canalizzazione locale |
| RX CSS | CTCSS o DCS in ricezione | Non si applica come filtro DMR | Un tono errato può silenziare audio valido |
| TX CSS | CTCSS o DCS trasmesso | Non applicabile | Usare quello richiesto dal ripetitore |
| Color Code | Non applicabile | CC 0–15 | Non è un TG né un tono analogico |
| Timeslot | Non applicabile | TS1 o TS2 | Deve corrispondere all'assegnazione della rete |
| TG List / Contact | Non è la lista dei toni DTMF | Destinazione selezionabile o diretta | Verificare tipo di gruppo/privato ed eventuali override |
| DMR ID | Da solo non identifica una trasmissione FM | Identità digitale personale | Può esistere un'impostazione specifica per canale |
| RX Only | Impedisce TX | Impedisce TX | Molto utile durante la preparazione |
| TOT | Limite di trasmissione | Limite di trasmissione | Verificare durata effettiva e avviso |
| Ch Power | Potenza personale o Master | Potenza personale o Master | Il valore visualizzato non è una misura RF |
| Zone Skip / All Skip | Esclusione dalla scansione | Esclusione dalla scansione | Sono controlli distinti |
| Posizione del canale | Coordinate del ripetitore | Coordinate del ripetitore | Non confondere con la posizione dell'operatore |
| APRS | Profilo beacon FM | Può richiedere una frequenza FM separata | Non equivale alla ricezione APRS |

**Simplex:** RX e TX coincidono. **Ripetitore:** programma esplicitamente entrambe le frequenze; non fare affidamento solo sul segno di uno shift. Il passo di sintonia del VFO non è la larghezza di banda FM.

`Reverse` scambia il funzionamento RX/TX del ripetitore; `Talkaround` trasmette sulla frequenza RX per il funzionamento diretto. Non sono la stessa cosa e la guida li descrive come reciprocamente esclusivi. Usali solo dopo aver verificato dove trasmetterà effettivamente la radio. `Force DMO` forza il funzionamento DMR diretto anche con frequenze diverse; non è un'opzione generica per «migliorare la copertura». [G: Channel Quick Menu; Channel Details]

## 5. Scenario A: canale FM di ascolto o ripetitore

1. Crea un canale FM e inizia con `RX Only`.
2. Inserisci RX e TX secondo le indicazioni del responsabile del servizio; per il simplex usa la stessa frequenza.
3. Imposta FM larga/stretta in base alla canalizzazione.
4. Inserisci il tono **TX** richiesto. Durante la diagnosi lascia RX CSS senza tono, salvo necessità nota.
5. Regola lo squelch per eliminare il rumore senza sopprimere i segnali deboli; non usarlo al posto del tono corretto.
6. Aggiungi il canale a una zona; controlla `Zone Skip` e `All Skip`.
7. Verifica l'audio in ricezione. Solo dopo, se sei autorizzato, abilita TX con potenza prudente ed esegui una breve prova.

CTCSS e DCS controllano l'apertura dell'audio o l'accesso; **non cifrano la conversazione**. Il monitor aiuta a distinguere l'assenza di segnale dalla chiusura causata da un filtro. La scansione dei toni VFO può rilevare CTCSS o DCS e, secondo la guida, applica il risultato sia a RX sia a TX: controlla entrambi prima di trasmettere.

Il tono di apertura a **1750 Hz** e le sequenze **DTMF** sono funzioni distinte da CTCSS/DCS. Non inviare DTMF ai controller senza conoscerne funzione e autorizzazione. Il suono udito localmente non riproduce sempre esattamente i DTMF trasmessi: la guida segnala differenze hardware su MD-UV380 e MD-9600. [G: FM specific functionality]

## 6. Scenario B: ripetitore DMR con più TG

1. Ottieni RX, TX, CC e la distribuzione dei TG per TS dal responsabile del ripetitore.
2. Inserisci il tuo DMR ID valido. Non utilizzare l'ID di un'altra persona né il numero del TG come identità personale.
3. Crea contatti di tipo **Group Call** con i rispettivi numeri TG; crea una lista TG e assegnala al canale.
4. Configura RX/TX, CC e TS del canale. Inizia con un TG noto e consentito su quel TS.
5. Verifica la ricezione con i filtri previsti; per la diagnosi, allenta i filtri in modo controllato e ripristina le impostazioni normali.
6. Verifica che non sia presente una selezione manuale di TG/TS proveniente da una prova precedente.
7. Se è consentito trasmettere, ascolta prima, attiva il TG secondo le regole della rete e lascia pause tra gli interventi.

Ascoltare un TG non implica che sia collegato permanentemente a quel ripetitore. I TG statici, dinamici, i riflettori e le regole di attivazione dipendono dalla **rete e dall'amministratore**, non solo dal codeplug.

### Selezione temporanea, contatti e chiamate private

Nella disposizione di tasti di riferimento, `#` consente di inserire un TG e premere `#` due volte consente di inserire una destinazione privata. Il tasto di cambio TS e i contatti con TS preferenziale possono modificare il TS attivo. I controlli equivalenti variano secondo la radio; consulta la tabella dei modelli.
Una selezione manuale o un **override** può prevalere sul canale o sulla lista. La guida documenta la cancellazione dell'override TS tenendo premuto il tasto TS e l'uscita da una chiamata privata selezionando un TG o tramite altri controlli specifici. Verifica la destinazione e il TS visualizzati **prima del PTT**.

Non confondere una «chiamata privata» DMR con la riservatezza. Non è cifrata per il fatto di essere privata. Anche la ricezione o l'accettazione automatica delle chiamate private dipende dalle opzioni firmware. [G: DMR specific functionality; Making and receiving DMR Private Calls]

### Filtri DMR: non sono tutti uguali

| Controllo | Cosa interessa | Precauzione |
| --- | --- | --- |
| DMR Filter Off | Non limita in base al criterio TG/contatto degli altri modi | Non elimina tutti i requisiti del segnale |
| TG | Filtra per il TG selezionato | Può nascondere altri gruppi ricevuti |
| Ct | Filtra per i contatti di chiamata privata del codeplug, secondo la guida | Non confondere con la lista TG |
| TGL | Filtra per i gruppi della lista TG | Verificare contenuto e assegnazione della lista |
| TS Filter | Ascolta lo slot previsto o consente di cercare attività tra gli slot | Disattivarlo non crea due ricevitori simultanei |
| CC Scan, prima CC Filter | Cerca un CC valido per la ricezione | Non significa «ignorare tutti i CC»; può ritardare o perdere l'inizio |

La guida spiega che il circuito DMR richiede un CC e che il firmware ne cerca una corrispondenza quando è abilitato `CC Scan`. Non è raccomandato nel normale funzionamento con CC noto. Spiega anche che l'ascolto su entrambi i TS usa un algoritmo di selezione, non una ricezione simultanea indipendente. L'inversione visiva di CC/TS e della modalità può indicare impostazioni di filtro, non un guasto dello schermo. [G: Filters (Channel)]

**Diagnosi in ordine:** frequenza e modalità → segnale RF → CC → TS → TG/tipo di chiamata → filtri → stato del collegamento di rete. Cambiare tutto contemporaneamente impedisce di capire cosa abbia risolto il problema.

## 7. Zone, RX groups e scansione

Una **zona** è una raccolta ordinata di canali, non una banda né una rete. Lo stesso canale può essere utilizzato in più zone. Una **lista TG** raccoglie destinazioni digitali; non indica quali canali scansionare.

La guida non implementa le **Scan Lists commerciali** come funzione equivalente. Per riprodurre un insieme di scansione, crea una zona con quei canali ed esegui la scansione della zona. Importare il campo «Scan List» da un file commerciale non è sufficiente.

### Scenario C: scansionare una zona locale

1. Crea una zona con i canali che desideri effettivamente ascoltare.
2. Verifica che siano utilizzabili singolarmente e che non siano esclusi da `Zone Skip`.
3. Avvia la scansione con il controllo del tuo modello. Su GD-77 e su vari modelli con l'assegnazione di riferimento si usa una pressione prolungata di su.
4. Regola `Scan dwell` se perdi segnali deboli o intermittenti: più tempo per canale migliora le possibilità di rilevarli, ma rallenta la scansione.
5. Scegli il comportamento: `Hold` resta sul canale in presenza di segnale; `Pause` riprende dopo il ritardo; `Stop` termina quando trova un segnale valido.
6. Se disponibile, usa l'esclusione temporanea di un canale disturbante. Non confonderla con la modifica persistente di `Zone Skip` o `All Skip`.
7. Per `All Channels`, controlla separatamente `All Skip`.

La scansione VFO usa limiti inferiore/superiore e un passo, non una zona. `Dual Watch` alterna l'ascolto tra VFO; **non dimostra la doppia ricezione simultanea**. La scansione dello spettro è un'altra visualizzazione, non un analizzatore calibrato. [G: Scanning; VFO specific functionality; Channel Details]

Su GD-77S organizza zone da **massimo 16 canali accessibili** tramite il selettore; il fatto che il formato supporti zone più grandi non amplia il comando fisico.

`Roaming`, nella guida consultata, ordina la zona in base alla distanza dai ripetitori quando sono disponibili la posizione dell'operatore e le coordinate dei canali. Non verifica che ogni ripetitore sia operativo né seleziona quello con il segnale RF più forte. Non ordina `All Channels` ed è disattivato durante la scansione. [G: Roaming]

## 8. Schermate, controlli e conservazione delle modifiche

| Schermata o modalità | Uso | Verifica |
| --- | --- | --- |
| VFO A/B | Sintonizzazione e prove dei parametri | Verificare RX e TX, non solo la frequenza evidenziata |
| Canale | Funzionamento dal codeplug e dalla zona | Controllare zona, canale, TG e TS effettivi |
| Channel Details | Modificare dati del canale o VFO | Distinguere applicazione temporanea e salvataggio |
| Last Heard | Consultare l'attività digitale ricevuta | Non rappresenta tutti gli utenti della rete |
| Radio Info | Batteria, data/ora e posizione secondo l'apparecchio | L'ora può andare persa senza RTC |
| RSSI | Indicazione del livello ricevuto | Non sostituisce un misuratore RF calibrato |
| GPS | Stato del ricevitore installato | L'assenza o `None` non si risolve caricando un codeplug |
| Satelliti | Previsioni e funzionamento orbitale | Richiede ora, posizione ed elementi orbitali validi |

In `Channel Details`, la guida distingue **Green** per confermare, **SK2 + Green** per salvare in modo persistente e **Red** per annullare. Il blocco della configurazione può impedire modifiche permanenti. Questi nomi descrivono controlli logici, non tasti fisicamente identici su tutti gli apparecchi.

Le impostazioni temporanee della potenza del canale, del TG e del TS potrebbero non modificare il codeplug. Dopo una prova, cambia canale o consulta i dettagli per verificare cosa è rimasto memorizzato. Conserva sul computer una versione nota del file.

Le opzioni dello schermo includono, a seconda della piattaforma/build, illuminazione, contrasto, inversione, colori e modalità giorno/notte. Un GD-77 con schermo invertito non diventa fisicamente la variante LCD «Black». Non estendere i temi di colore ai modelli monocromatici né le schermate al GD-77S, che non ha schermo. [G: Main screens; Display Options; Channel Details]

## 9. Accessibilità e suoni

OpenGD77 documenta avvisi sonori, ripetizione delle indicazioni vocali e livelli della voce. Le risorse vocali vengono caricate **separatamente con il CPS**; cambiare la lingua del menu non cambia automaticamente la voce installata.

1. Verifica che il file vocale sia adatto al firmware e alla lingua.
2. Seleziona `Prompt`: silenzioso, beep, beep senza tasti o voce, secondo la disponibilità.
3. Prova i livelli `Voice`, `Voice L2` e `Voice L3`: cambiano quando vengono annunciate le informazioni e il relativo dettaglio; non sono tre lingue.
4. Usa il controllo equivalente a SK1 per ripetere l'ultimo annuncio; se la radio sta già parlando, può interromperlo.
5. Regola il volume dei beep e degli avvisi di inizio/fine DMR e TOT senza eliminare avvertimenti necessari.
6. Prima di usare la configurazione in movimento, esegui una prova completa senza fare affidamento sullo schermo.

Su **GD-77S**, caricare le voci è essenziale per un uso pratico, perché non ci sono schermo né tastiera. Il pulsante di modalità consente di scorrere i controlli TG, scansione, TS, CC, filtri, zona e potenza; SK1/SK2 cambiano funzione in base alla modalità annunciata. Non applicare le sequenze del GD-77 con schermo. [G: Sound Options — Prompt; GD-77S operation]

Il guadagno del microfono FM e DMR si regola separatamente. Più guadagno non equivale a maggiore portata: può peggiorare l'intelligibilità. Il VOX può causare trasmissioni involontarie; disattivalo durante la configurazione, le prove e la connessione USB.

## 10. Potenza, batteria e calibrazione

La potenza **Master** viene usata in VFO e nei canali che ereditano tale impostazione; un canale può avere una potenza specifica. La guida indica che la potenza specifica viene evidenziata e che una modifica effettuata durante l'uso può essere temporanea. Per renderla persistente, usa la procedura di salvataggio dei dettagli del modello.

Non esiste un'unica scala valida per tutti i portatili e i mobili. La guida distingue apparecchi da 5 W, varianti da 10 W e mobili; inoltre, l'opzione di scala di un UV380 **10W non PLUS** non trasforma un normale portatile in un hardware diverso. La variante **10W PLUS richiede la propria immagine specifica**. [G: Controlling Tx power; Radio Options — Mode; F2]

Buone pratiche:

- Usa la potenza minima necessaria e un'antenna appropriata.
- Verifica alimentazione, batteria, connettori e ROS prima di indagare su una presunta mancanza di potenza.
- Non interpretare un valore sullo schermo come garanzia di potenza misurata.
- Non cercare di ottenere 10 W modificando un'etichetta, un menu o la calibrazione di un'unità da 5 W.
- Non copiare la calibrazione da un'altra radio, anche se dello stesso modello.
- Non modificare impostazioni di riferimento, deviazione o potenza per correggere un errore CC/TG.
- La calibrazione richiede strumentazione, carico adeguato e una procedura specifica. Se non ne disponi, conserva i valori originali.

Una radio può surriscaldarsi molto durante trasmissioni prolungate, soprattutto come hotspot. Una potenza tollerabile con voce intermittente non garantisce un servizio continuo sicuro.

## 11. Hotspot DMR via USB

La guida documenta la radio come modem per **voce DMR** per MMDVMHost/Pi-Star e contempla BlueDV con riserve di compatibilità. Non è un accesso alla rete dal browser, né un punto di accesso Wi-Fi, né trasforma tutte le radio in ripetitori duplex.

### Scenario D: radio compatibile come hotspot

1. Conferma che il modello e la build siano supportati. **RD-5R/DM-5R non supporta l'hotspot** a causa della limitazione USB durante TX.
2. Seleziona l'opzione hotspot appropriata sulla radio; non mantenere contemporaneamente una sessione CPS/web.
3. Collega al computer o all'apparecchio MMDVMHost il cavo di programmazione adatto.
4. In Pi-Star, la guida identifica il tipo di modem `OpenGD77 DMR hotspot (USB)`. Se non è disponibile, verifica la versione e la documentazione dell'host.
5. Configura frequenza, CC, ID e rete in base alle norme e all'host. Verifica la modalità sullo schermo della radio.
6. Inizia con potenza bassa, ventilazione e prove brevi. Non estendere a un mobile le tabelle percentuale/potenza di un portatile.
7. Se l'USB si riavvia durante la trasmissione, considera prima l'iniezione RF: la guida raccomanda un'antenna esterna separata, una protezione RF sull'USB e misure appropriate sull'host. In questa configurazione evita di usare l'antenna direttamente sul portatile.

I valori `RFLevel`/percentuale dell'host non corrispondono a watt universali. La guida descrive perfino una gestione speciale del valore 100 in alcune implementazioni; non applicarla come regola per ogni build. La gestione dei gruppi, l'autenticazione e i collegamenti dipendono anche dal software e dalla rete dell'host. [G: Hotspot mode]

## 12. APRS: cosa può e non può fare

La guida documenta la **trasmissione FM APRS AFSK a 1200 o 300 baud** e **non la ricezione/decodifica APRS AX.25**. Non promettere mappe delle stazioni ricevute, messaggistica APRS bidirezionale né un TNC generico.

I meccanismi sono distinti:

| Meccanismo | Dove viaggiano i dati | Dipendenze |
| --- | --- | --- |
| FM APRS | Pacchetto AFSK su una frequenza FM | Profilo APRS, nominativo, posizione e frequenza appropriata |
| Posizione tramite Talker Alias DMR | Informazioni nel flusso DMR | Supporto del ripetitore/rete e opzioni TA |
| Pubblicazione su un sito APRS | Elaborazione successiva tramite infrastruttura | Copertura dei ricevitori, gateway e rete; la sola trasmissione non la garantisce |

### Scenario E: primo beacon FM APRS

1. Configura il nominativo e un profilo APRS in OpenGD77 CPS. La guida descrive fino a **8 profili**, non un numero universale per ogni versione futura.
2. Imposta SSID, destinazione/rotta, simbolo, commento, velocità e frequenza secondo la rete locale. Non copiare una rotta terrestre per un satellite.
3. Fornisci una posizione manuale valida o un GPS reale con fix. Non indicare GPS come sorgente se la radio non ha un ricevitore funzionante.
4. Assegna il profilo al canale o al VFO corrispondente.
5. Seleziona inizialmente `Manual`; verifica posizione e frequenza prima di trasmettere un beacon di prova.
6. Verifica la ricezione con un'infrastruttura o un ricevitore adeguato, non solo con il beep locale. Alcuni modelli non riproducono il ritorno audio.
7. Solo allora attiva `PTT`, `Auto` o `Smart`, se necessario. Controlla intervallo e decadimento per non occupare inutilmente il canale.

In `PTT`, la guida colloca il beacon al rilascio del PTT rispettando i timer; `Auto` usa intervalli e `Smart` si regola in base a movimento e virata. Una posizione non valida può impedire il beacon o mostrare `Location?`. La disattivazione temporanea e le combinazioni di tasti dipendono dal modello.

Un profilo può impostare una frequenza TX diversa; in caso contrario viene usata quella del canale/VFO analogico. Su un canale DMR, la guida richiede una frequenza APRS esplicita per questa funzione FM. La frequenza propria del profilo non si applica allo stesso modo in modalità satellite né nella modalità APRS `PTT`: verifica queste eccezioni prima di operare. [G: FM APRS location transmission; APRS Options]

L'opzione TA `APRS` o `Both` non attiva un ricevitore AX.25. La guida avverte di problemi con il Talker Alias trasmesso su ripetitori/reti Motorola; lascia disattivato TA TX salvo che il supporto del sistema sia noto. La ricezione TA non dipende dall'abilitazione della trasmissione. Non pubblicare automaticamente coordinate personali senza valutarne la privacy.

## 13. GPS, NMEA e registrazione

Il GPS è una **funzionalità hardware**, non qualcosa che compare installando un file. La guida documenta versioni con ricevitore opzionale e modifiche in determinate famiglie; non tutte le unità con lo stesso nome hanno il GPS.
| Stato/opzione | Significato nella guida | Conseguenza |
| --- | --- | --- |
| `None` | Nessun modulo rilevato | Verificare variante, installazione e compatibilità; non presumere un guasto del menu |
| `Off` | GPS disattivato | Su MD-9600/RT-90 ci sono restrizioni sul controllo dell'alimentazione |
| `On` | Ricevitore abilitato | Deve acquisire la posizione; provare all'aperto |
| `NMEA` | Dati GPS inviati tramite USB seriale | Impedisce la normale comunicazione CPS finché non si seleziona `Off` o `On` |
| `Log` | Registrazione NMEA in Flash | Consuma spazio e può sottrarne ad altre risorse |

La mancanza di fix all'interno non prova che il modulo sia guasto. Attendi all'aperto e controlla la schermata GPS. La direzione ricavata dallo spostamento non equivale a una bussola magnetica funzionante da fermi. Con GPS operativo, la guida documenta l'aggiornamento dell'orologio e l'uso della posizione da parte di altre funzioni.

**Avviso sulla memoria:** nei dispositivi con Flash da 1 MB, come l'esempio GD-77 della guida, abilitare la registrazione GPS utilizza spazio del database degli ID DMR e può **eliminarne i dati**; anche la presenza delle voci incide sullo spazio disponibile. Disattiva la registrazione e ricarica il database se devi ripristinarlo. Non attribuire a tutti i modelli le capacità di registrazione di una Flash. [G: General Options — GPS; GPS Screen]

I pacchetti MK22 con suffisso `_NMEA` sono varianti pubblicate; la loro esistenza non prova che una radio non modificata disponga di GPS. Non confondere un'**immagine variante NMEA** con la **modalità di uscita NMEA via USB** del menu. Prima di scegliere, verifica le note della build e l'hardware. [F1]

## 14. Satelliti: preparazione e funzionamento

La schermata satellitare documentata prevede i passaggi, mostra azimut/elevazione e applica la correzione Doppler a RX/TX. Non trasforma l'apparecchio in un ricevitore di tutte le modalità orbitali né certifica il full duplex.

### Scenario F: preparare un passaggio

1. Verifica lo stato operativo e le regole del satellite consultando fonti aggiornate dell'operatore/AMSAT.
2. Aggiorna con il CPS gli elementi orbitali **Keps/TLE** e i parametri dei satelliti che utilizzerai davvero.
3. Inserisci posizione e data/ora corrette; verifica UTC rispetto all'ora locale. Un grande scarto orario sposta le previsioni.
4. Conferma frequenze, modalità, toni e se il satellite consente in quel momento voce, beacon o APRS.
5. Controlla l'elenco dei passaggi e poi la vista polare o i dati in tempo reale.
6. Prova la ricezione prima di trasmettere. Regola antenna, orientamento e potenza per il passaggio, senza applicare le regole generiche dei ripetitori terrestri.
7. Se è previsto APRS via satellite, usa i parametri specifici. La guida contempla profili con il nome del satellite per personalizzare i valori previsti.

La guida indica che il caricamento dei Keps con il CPS regola anche data/ora. Le radio senza RTC possono perderla allo spegnimento; non estendere la conservazione a tutto il catalogo. L'elenco RTC relativo a MD-9600/RT-90, UV380/RT-3S e DM-1701 riflette l'ambito del testo, non certifica tutti i modelli successivi.

Dati orbitali obsoleti, emisfero errato o confusione tra gradi decimali e un altro formato producono previsioni inesatte anche se il firmware funziona correttamente. Allarmi, cambio automatico del satellite e controlli dei toni speciali dipendono dalla build/piattaforma. La modifica locale dei dati satellitari su questo sito web **non li carica sulla radio** finché la scrittura resta bloccata. [G: Satellite Screen; L]

## 15. USB, modalità di connessione e firmware

**Uso normale/CPS e bootloader sono modalità diverse.** In modalità di aggiornamento l'identificazione CPS potrebbe non funzionare e uno schermo vuoto non dimostra che l'apparecchio sia guasto. Il cavo deve essere adatto a quell'hardware; non tutti i connettori a due pin implicano lo stesso cavo o protocollo.

La guida distingue l'installazione MK22 da quella STM32: per l'aggiornamento STM32 documenta il driver STM DFUSe; per la normale comunicazione CPS si applica un altro contesto di porta/driver. Non cambiare driver a caso né presumere che un driver DFU risolva WebUSB o WebSerial in modalità normale.

### Se devi installare o aggiornare il firmware al di fuori del sito web

1. Controlla modello e revisione nella [matrice](AYUDA-OPENGD77-MODELOS.md), oltre alle istruzioni dello specifico pacchetto.
2. Conserva le copie disponibili e il firmware originale relativo all'unità.
3. Usa il caricatore firmware di **OpenGD77 CPS** indicato dal progetto, non il caricatore commerciale per un'immagine OpenGD77.
4. Verifica il firmware «donatore» richiesto da quella famiglia. La guida indica di selezionarlo nel caricatore per fornire i componenti del codec AMBE; non va installato come sostituto seguendo istruzioni di un altro apparecchio.
5. Prima di iniziare, conferma modello, variante, lingua e revisione. La selezione corretta del donatore può abilitare DMR; senza la procedura richiesta, la guida descrive il funzionamento solo FM.
6. Segui la sequenza di bootloader **specifica per modello e revisione**, con alimentazione stabile. Non esiste qui una combinazione universale.
7. Dopo l'installazione, verifica identificazione, audio, RX/TX e configurazione; crea le copie consentite dal CPS.

Non vengono fornite istruzioni di ripristino basate su ponticellare schede, cancellare aree o scrivere la calibrazione di un'altra unità. Se l'identificazione è ambigua, interrompi l'aggiornamento finché l'hardware non è stato documentato.

## 16. Diagnosi per sintomi

| Sintomo | Verifiche da quelle meno invasive a quelle più incisive | Cosa evitare |
| --- | --- | --- |
| Connetti è disabilitato | HTTPS/localhost, API del browser, famiglia e conferma | Cambiare firmware solo per abilitare un pulsante |
| Permesso USB/seriale ma nessuna identificazione | Modalità normale, cavo corretto, CPS/host chiuso, famiglia corretta | Forzare un'altra famiglia o presumere la mappa di memoria |
| Struttura di identificazione sconosciuta | Registrare modello/build e messaggio; usare strumenti documentati per quella versione | Ignorare la convalida del connettore |
| Copia parziale e scrittura bloccata | Esportare calibrazione/codeplug e manifesto; conservare lo stato | Trattare uno ZIP scaricato come backup MCU |
| Il file non si apre | Esattamente 131072 byte e formato standard; non JSON né firmware | Riempire o troncare un file per adattarlo |
| Mancano i canali 1025+ | Limite esplicito dell'editor web | Salvare l'area standard come se fosse un backup esteso |
| FM riceve un segnale ma non audio | RX CSS, squelch, mute, modalità/larghezza di banda e volume | Ricalibrare prima la RF |
| DMR riceve un segnale ma non audio | CC, TS, TG/contatto, filtri e stato del collegamento | Usare CC Scan in permanenza senza necessità |
| Si ascolta un TG ma si trasmette su un altro | Override, contatto diretto, lista TG e TS attivo | Fidarsi solo del nome del canale |
| Il ripetitore non si apre | TX effettivo, tono FM o CC/TS DMR, copertura e regole d'accesso | Aumentare la potenza senza verificare la configurazione |
| Errore RX Only / TX non disponibile | Solo ricezione, TX Inhibit, limiti di banda e TOT | Rimuovere restrizioni senza autorizzazione |
| Non compaiono nominativi DMR | Database ID caricato, lunghezza/spazio, Talker Alias ricevuto | Confondere il database ID con la lista TG |
| Non vengono scansionati i canali previsti | Zona attiva, Zone Skip, All Skip e modalità di scansione | Cercare una Scan List commerciale non implementata |
| USB si scollega durante TX | Iniezione RF, antenna separata e installazione; RD-5R non è hotspot | Disattivare le protezioni o insistere alla massima potenza |
| Il CPS smette di comunicare quando si attiva il GPS | Uscita `NMEA`: tornare a `Off` o `On` | Reinstallare il firmware prima di verificare la modalità USB |
| GPS mostra `None` / non acquisisce | Presenza effettiva del modulo, supporto della build e prova all'aperto | Presumere che il GPS sia di fabbrica dal nome commerciale |
| APRS mostra `Location?` o non trasmette | Posizione, profilo, nominativo, frequenza, modalità beacon, TX Inhibit | Attivare beacon automatici per «provare di più» |
| Passaggi satellitari incoerenti | Ora, data, UTC, posizione, TLE e stato effettivo del satellite | Cambiare frequenze a intuito |
| GD-77S non emette annunci vocali | Voci caricate, volume e modalità di controllo | Applicare istruzioni per schermo del GD-77 |
| MD-9600/RT-90 senza RX/TX dopo l'aggiornamento | Immagine HW e revisione effettiva, alimentazione e copie | Flashare revisioni a caso seguendo una regola universale |
| Un'opzione non compare | Modello, variante, lingua e data/build | Presumere che tutte le schermate corrispondano alla versione installata |

## 17. Glossario

| Termine | Significato |
| --- | --- |
| AMBE | Codec vocale digitale la cui integrazione richiede la procedura documentata del donatore |
| APRS | Sistema di scambio di informazioni su stazioni/posizione; qui si distinguono FM AFSK e dati DMR |
| Build | Compilazione specifica del firmware; registrare data e revisione |
| CC | Color Code DMR, valore 0–15 |
| Codeplug | File/struttura di configurazione della radio |
| Contatto | Destinazione digitale con numero e tipo di chiamata |
| CPS | Programma per computer per configurare e mantenere la radio |
| CTCSS / DCS / CSS | Sistemi di segnalazione a tono/codice FM; non sono cifratura |
| DMO | Funzionamento digitale diretto, senza ripetitore |
| DMR ID | Identificatore digitale di una stazione; non è il TG |
| DTMF | Segnalazione tramite coppie di toni per controllo o composizione |
| Keps / TLE | Dati orbitali usati per prevedere i satelliti |
| MCU | Microcontrollore che esegue il firmware |
| MMDVMHost | Software host per modem digitali, utilizzato nello scenario hotspot |
| NMEA | Formato di messaggi di navigazione; in base al contesto, anche nome di un'uscita o di una variante |
| Override | Selezione temporanea che prevale su un valore salvato |
| PTT / VOX | Trasmissione tramite pulsante / attivazione vocale |
| RTC | Orologio in tempo reale; presenza e mantenimento dipendono dall'apparecchio |
| RX / TX | Ricezione / trasmissione |
| RX Group / TG List | Raggruppamento di contatti; verificare la semantica nel firmware/CPS usato |
| SK1 / SK2 | Nomi logici dei tasti laterali; la posizione varia in base al modello |
| TA | Talker Alias, informazioni aggiuntive trasmesse in DMR |
| TG | Talkgroup, destinazione di una chiamata di gruppo DMR |
| TOT | Timer che limita una trasmissione |
| TS | Timeslot DMR, 1 o 2 |
| VFO | Modalità di sintonia per frequenza |
| Zona | Raccolta ordinata di canali |

## 18. Fonti, versioni e licenze

Consultazione effettuata il **2026-10-25**, con download della guida per la lettura locale e verifiche circoscritte degli indici ufficiali; non è stato esaminato in massa l'archivio del forum.

- **[G] Guida ufficiale in inglese:** [Markdown mantenuto](https://raw.githubusercontent.com/LibreDMR/OpenGD77_UserGuide/master/OpenGD77_User_Guide.md). Per un riferimento riproducibile, l'ultima modifica del file indicata dall'API consultata è [33de63dcb002fcd837419fda25a2e535b940dbcd, 2026-03-08](https://github.com/LibreDMR/OpenGD77_UserGuide/blob/33de63dcb002fcd837419fda25a2e535b940dbcd/OpenGD77_User_Guide.md). I nomi delle sezioni citate identificano le evidenze funzionali.
- **[R] Repository ufficiale della guida:** [LibreDMR/OpenGD77_UserGuide](https://github.com/LibreDMR/OpenGD77_UserGuide). Il README spiega la separazione dal vecchio repository per questioni di licenza, dichiara **GPL 2 per questi documenti** e segnala che viene mantenuta solo la versione inglese; quella cinese è obsoleta.
- **[W] Sito del progetto:** [opengd77.com](https://www.opengd77.com/). Alla data della consultazione, la pagina iniziale spiega la chiusura del forum interattivo e il problema del traffico dei bot.
- **[A] Archivio statico:** [indice del forum archiviato](https://www.opengd77.com/archive/index.html). È presentato come istantanea con data visibile di luglio 2025; non prova tutte le funzioni di una build del 2026. Registrazione, profili e altri collegamenti potrebbero non funzionare.
- **[F1] Indice MK22 consultato:** [GD77, 2026-05-04, revisione 946183e9002d277dfaba616a1eea15bfe959c692](https://www.opengd77.com/downloads/GD77/Firmware/20260504_946183e9002d277dfaba616a1eea15bfe959c692/). Include pacchetti specifici per GD77, GD77S, DM1801, DM1801A e RD5R, con varianti secondo la destinazione.
- **[F2] Indice dei portatili STM32 consultato:** [MDUV380_DM1701, 2026-05-04, revisione ebd7100bb4c930e6ff0c24202474b5b72e7d6beb](https://www.opengd77.com/downloads/MDUV380_DM1701/Firmware/20260504_ebd7100bb4c930e6ff0c24202474b5b72e7d6beb/). Include `OpenMDUV380_10W_PLUS.zip` separato dallo standard, oltre a DM1701 e RT84.
- **[F3] Indice dei mobili consultato:** [MD9600, 2026-05-04, revisione e779365405cbe4a73803a402626294764784b11f](https://www.opengd77.com/downloads/MD9600/Firmware/20260504_e779365405cbe4a73803a402626294764784b11f/). Contiene immagini HW V1/V2/V4/V5.
- **[F4] Indice MD2017 consultato:** [2026-05-05, revisione 6b43740c89378240c0cabad0ca827e5b0963124e](https://www.opengd77.com/downloads/MD2017/Firmware/20260505_6b43740c89378240c0cabad0ca827e5b0963124e/). Conferma un pacchetto pubblicato, non l'equivalenza con un altro modello.
- **[C] Note di manutenzione verificate:** [changelog MDUV380_DM1701 del 2026-05-04](https://www.opengd77.com/downloads/MDUV380_DM1701/Firmware/20260504_ebd7100bb4c930e6ff0c24202474b5b72e7d6beb/changelog.txt). Descrive l'adattamento del collegamento del codec a strumenti recenti, non promette tutte le funzioni per ogni modello.
- **[L] Evidenze locali di questa applicazione:** [`firmware-core.js`](../../../firmware-core.js), `TARGETS`; [`gd77-connector.js`](../../../gd77-connector.js), `MODELS`, `connect`, `backup`, `readCodeplugRaw`; [`radio-ui.js`](../../../radio-ui.js), stato delle autorizzazioni, lettura/modifica ed esportazione. Descrive l'implementazione, non una campagna di test fisici.

I percorsi `Latest` consultati reindirizzavano a tali directory; possono cambiare e non equivalgono a «stabile per qualsiasi apparecchio». Guida, pacchetti e archivio del forum seguono cronologie diverse. In caso di discrepanze, dai priorità alle istruzioni verificate per il pacchetto e l'hardware esatti, senza estendere automaticamente gli aggiornamenti recenti.

**Licenze:** la dichiarazione GPL 2 citata riguarda il repository della guida. Non si presume una licenza MIT né si estende tale dichiarazione al firmware attuale, ai donatori, al codec, alle voci, al CPS, alle immagini o a tutte le relative dipendenze. Prima di ridistribuire qualsiasi componente, verifica la licenza specifica; il fatto che un download sia pubblico non annulla le condizioni d'uso o di distribuzione.