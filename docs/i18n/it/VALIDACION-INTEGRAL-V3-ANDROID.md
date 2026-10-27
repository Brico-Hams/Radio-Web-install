# Validazione integrale UV-K5 V3, Android e firmware Bricohams

Autori: Anatol Emilio Lopez Maitchovcow EA5KAO, Diego Roca EA5JEF e Pedro
Roca, fondatori e membri del consiglio direttivo di Bricohams.
Informazioni: <https://bricohams.org> e <https://bricohams.com>.

Revisione iniziale: 26-10-2026. **Audit in corso; non è un certificato di
funzionamento né una revisione esaustiva già completata.** Gli avvisi e le
attribuzioni di codice, foto e documenti di terzi sono mantenuti.

## Identificazione della distribuzione

Non basta che due APK riportino `0.8.1-beta`: commit, SHA-256 dell'APK,
firma e hash dei sorgenti devono identificare esattamente la distribuzione verificata.

| Distribuzione | Identità | Evidenza |
| --- | --- | --- |
| Albero di lavoro iniziale | Base `42fa5e014b270b929b58f7fd2fee2a28f482d1c0`, modifiche locali | Android host, lint e APK verificati durante questa revisione |
| Main pubblicato consultato | `01c58563e6507d17bd2bec612ef669840abfeddb` | Revisione isolata senza sostituire le modifiche locali; include General/POTA/SOTA e nuovo elenco passaggi |
| APK installata sul telefono | Non identificata | Nessun telefono visibile su ADB; non verificata |
| Firmware dello slot SAT attuale | L'utente indica slot 3 | Nessuna porta radio rilevabile; indice, banco, CRC e versione in sospeso |

Risultati della revisione isolata pubblicata: **93 test Android host
riusciti, zero fallimenti/errori**, lint senza errori e 13 avvisi, APK debug
compilata. SHA-256 di questa ricostruzione:
`b739992a1b4cba67fdd87e97efdf5408e84f549068b51043d854da094ed1152d`.
Non è l'hash di un APK scaricato dal web né installato su un telefono.
La correzione CRC locale non è inclusa in questa ricostruzione di main.

I 13 avvisi lint di entrambe le revisioni riguardano due dipendenze di
test con versioni più recenti, cinque avvisi del dizionario inglese su
"satelite", un candidato al plurale, tre trattini tipografici, un'ellissi
e la forma dell'icona. Le dipendenze e il marchio non vengono modificati per nasconderli.

Il web pubblicato non è necessariamente uguale all'albero locale. Né si
deduce il contenuto dell'APK scaricabile dal testo di una guida.
I test della base locale non devono essere attribuiti alla revisione pubblicata
o a un APK non identificato.

![Catena funzionale di contatti, canali per slot e CAT](../../atlas/android-cat-validacion.svg)

Questo disegno è una rappresentazione funzionale originale, non uno schema elettrico.
Non contiene collegamenti interni, valori dei componenti o livelli di tensione
dedotti. Le mappe di pin e memoria sono nell'[atlas](ATLAS-UV-K5-V3.md).

## Livelli di evidenza

1. Sorgente revisionato: dimostra l'implementazione prevista, non la sua esecuzione.
2. Test host/JVM/Robolectric: verifica gli scenari simulati specifici.
3. Test Android strumentato: richiede un dispositivo/emulatore identificato.
4. Radio reale: richiede versione, slot, banco e configurazione identificati.
5. Misura RF/elettrica esterna: richiede strumento, collegamento e procedura.

Un ACK di scrittura non sostituisce rilettura, persistenza dopo riavvio o
misura RF. Un test SQLite su computer non certifica la memoria del telefono.
Lo stato finale di ogni scenario deve indicare livello ed evidenza; non
trasformare "non eseguito" in "corretto".

## Problema corretto: CRC del backup Android

`QuanshengMemory.verifyFlash` richiedeva `0x073E` per 2097152 byte tutti insieme.
Il comando di riferimento limita ogni richiesta a 4096 byte. Il mock
consentiva l'intervallo impossibile e nascondeva l'errore. Il web verificava
già per settori; Android necessitava della stessa correzione.

La correzione locale interroga i 512 settori verificando indirizzo/lunghezza/stato
e confronta il CRC di ogni settore con i byte letti. Restituisce il CRC totale locale
solo dopo averli verificati tutti. Un errore, compreso quello dell'ultimo settore
`0x1ff000`, blocca il backup e non abilita la scrittura.
Non elimina backup esistenti, calibra la radio né scrive settori.

Ora il mock impone 4096 byte e verifica che vengano richiesti tutti i
settori. È stato aggiunto un test per l'ultimo settore corrotto e il rifiuto di un intervallo
incompleto prima di inviare comandi. I test host della base locale:
92 riusciti dopo l'estensione dei limiti, annullamento e schermata canali, zero
fallimenti/errori; lint senza errori e 13 avvisi. L'APK debug
è compilata, ma questa correzione non è stata pubblicata né installata su un telefono.

SHA-256 dell'APK locale ricostruita dopo queste correzioni:
`cd9d3bfd3bfe0405be23995dd906aae63614ec9d38de1a1ff8cea1997156ab25`.
Questo hash sostituisce la ricostruzione locale precedente; non identifica l'APK
pubblicata né quella installata.

È stato corretto anche il manifest generato da `build-android.ps1`: non dichiara
più inesistenti CAT PTT, SSTV TX e programmazione canali che sono implementati
in via sperimentale. Ciò non rende tali funzioni certificate.

## Annullamento e limiti dell'editor Android

Durante il monitoraggio del ciclo di vita è stato rilevato un altro problema: chiudere
la schermata accodava la chiusura del trasporto dietro l'attività in esecuzione.
Di conseguenza, una copia o una scrittura lunga poteva continuare a inviare blocchi
anche se l'interfaccia dichiarava già terminata la sessione.

La connessione ora mantiene una generazione di sessione e controlla che sia ancora
attiva e in primo piano prima di ogni scambio. Anche le attività in coda controllano
la propria generazione prima di iniziare. La chiusura resta nel worker per rilasciare
ordinatamente il trasporto, ma non abilita nuovi comandi di un'operazione annullata.
La risposta a un comando già inviato potrebbe essere ancora in sospeso oppure il comando
potrebbe essere stato applicato: non si promette il rollback.
Un timeout o l'annullamento richiedono una nuova connessione e un nuovo backup.
Anche gli errori chiudono il trasporto e rimuovono il riferimento in memoria, non solo
l'autorizzazione al backup: premere di nuovo Backup non riutilizza una connessione
non valida. Un test della schermata inietta un errore di trasporto, verifica la chiusura
e controlla che il secondo tentativo non invii altri comandi.

I test simulano l'annullamento dopo aver nascosto il primo canale: il blocco seguente
non viene inviato né viene mostrato nuovamente un record incompleto.
Annullano inoltre il backup dopo il primo blocco Flash e verificano che il successivo
non venga interrogato né dichiarato CRC verificato. La lettura fisica Flash
richiede identificazione e convalida gli intervalli tramite sottrazione per evitare
overflow di `address + length`. Viene controllato l'ultimo blocco valido.
I test CRC rifiutano lunghezza della risposta corta/lunga, indirizzo,
lunghezza del settore o stato non corretti prima del settore successivo.

## Contatti: ambito e criteri

I contatti sono QSO del log di stazione, non contatti DMR della radio né
la rubrica Android. La radio UV-K5 V3 di questo progetto non è
un terminale DMR. Non c'è integrazione con ContactsProvider.

| Caso | Verifica richiesta |
| --- | --- |
| Inserimento | Salvare nominativo, UTC, frequenza, modo, rapporti e note; verificare ID e tutti i campi |
| Persistenza | Chiudere completamente, riaprire e riavviare il telefono; non basta che resti visualizzato |
| Modifica | Stesso ID, un solo record, campi non modificati intatti |
| Eliminazione | Annullare la conferma mantiene il record; confermandola si elimina solo quello selezionato |
| Ricerca | Maiuscole/minuscole, Unicode, nessuna corrispondenza, più di 50 record; esportazione non troncata |
| General/POTA/SOTA | Selezione e persistenza del log; campi stazione/riferimento; isolamento tra log |
| Duplicati | Avviso all'interno del log, conferma esplicita; non unire QSO di attività diverse |
| ADIF | Anteprima, annullamento senza scrittura, lunghezze, campi non conservati, UTC, deduplicazione |
| JSON | Round-trip UTF-8, ID, conflitti e rollback; il ripristino non elimina record precedenti |
| Errori | Spazio esaurito, URI annullata o non scrivibile, chiusura/rotazione e importazione incompleta |
| Privacy | Copie private; non includere nominativi, posizioni o database reali nel repository |

I test host esistenti coprono SQLite e riapertura, Unicode, CRUD,
importazione atomica e ripristino. I casi sul telefono restano in sospeso.
L'esportazione LoTW non certifica firma, caricamento o accettazione TQSL.

I test strumentati di `RadioStoreTest` non aprono né puliscono più
il `bricohams.db` dell'utente. Ogni caso rimappa quel nome a un database privato
`instrumentation-<UUID>.db` ed elimina solo il proprio database al termine.
Includono riapertura dopo modifica/eliminazione/ripristino JSON, ripristino ripetuto
senza duplicati e importazione non valida senza persistenza di record parziali.
L'APK di test e lint sono stati compilati correttamente. **Questi test non sono stati
eseguiti su un telefono o emulatore**; la compilazione non dimostra
che le asserzioni siano state superate.

## Canali e isolamento per slot

L'editor Android attuale modifica **canali FM esistenti**: non equivale al CRUD
completo del web e non consente di dedurre aggiunte/eliminazioni/copia tra slot.
Non usarlo per promettere la gestione di contatti DMR.

Prima di ogni test fisico:

1. Identificare hardware V3/PY32 e firmware esatto, non solo il nome del profilo.
2. Leggere inventario multiboot, etichetta e CRC; annotare separatamente indice
   interno ed etichetta visibile. Non scrivere supponendo che "slot 3" sia l'indice 3.
3. Confermare il banco attivo ed eseguire un backup completo verificato su disco.
4. Scegliere un canale di test del banco attivo senza sostituire dati dell'utente.
5. Provare nome/RX/TX/CTCSS/DCS/potenza/larghezza/blocco TX, evitando la TX fisica.
6. Rileggere tutti i byte e confrontare regioni protette e calibrazione.
7. Riavviare e verificare la persistenza; cambiare slot e controllare che gli
   altri banchi mantengano i rispettivi hash. Ripristinare e verificare l'originale.
8. Disconnessione, timeout e rifiuto di un blocco devono chiudere la sessione e richiedere
   una nuova lettura/backup; un'interruzione non va presentata come transazione atomica.

Il comando di scrittura deve nascondere gli attributi interessati, scrivere record/
nominativi e ripristinare gli attributi prima della rilettura. La mappa
calibrazione non viene modificata né vengono ripristinati dati di un'altra radio.

## CAT in SAT RX e Android

CAT RX è temporaneo e distinto dalla scrittura dei canali. F4HWN v6.1 da solo
non garantisce la presenza del modulo CAT Bricohams. Servono QUERY valido e
capacità attese, con l'app SAT RX aperta e CAT abilitato tramite
il tasto 8. Il test iniziale non richiede PTT.

| Caso | Risultato atteso ed evidenza |
| --- | --- |
| Identificazione | Versione corretta e foto/schermata dello slot attivo, senza dedurla dal nome |
| QUERY | Sessione attiva, capacità e frequenza coerenti |
| SET RX VHF/UHF | ACK in sospeso seguito da QUERY applicato; confrontare schermata e frequenza esterna |
| Fuori banda | Rifiuto esplicito, senza cambiare sintonia |
| Rumore/CRC/sequenza | Rifiuto o timeout limitato; non eseguire inavvertitamente il comando successivo |
| STOP | Disattivazione remota e ripristino confermato; verificare anche l'uscita dalla schermata |
| OTG scollegato | Sessione chiusa, messaggio esplicito e nessuna sintonia tardiva |
| Rotazione/background | Nessun worker duplicato né SET dopo l'abbandono |
| Passaggio SGP4/Doppler | Osservatore/TLE/ora identificati; confrontare previsione e aggiornamenti RX |
| Separazione persistente | Canali e calibrazione identici prima/dopo CAT |
| Lease PTT | Test separato con autorizzazione e carico/strumentazione adeguati, non antenna libera per impostazione predefinita |

Per PTT vanno verificati armamento locale tasto 9, diniego per blocco/
banda/stato, rilascio tramite STOP/disconnessione, scadenza della lease e limite
di 120 s. Non si prova TX automaticamente né si certificano potenza, armoniche
o frequenza senza strumenti. Il telefono non dispone dell'altoparlante/microfono della
radio solo per aver collegato CAT.

## Modifiche hardware: compatibilità e limiti

La compatibilità di una modifica V1 non si trasferisce alla V3 solo perché condividono
il case. MCU, memoria e RF sono diversi. La fonte K1 teardown consultata
conferma PY32F071, 128 KB Flash, 16 KB SRAM e memoria SPI 2 MB; non dimostra
una modifica specifica su tutte le revisioni della scheda V3.

| Famiglia | Classificazione per questo audit | Evidenza mancante prima di raccomandarla |
| --- | --- | --- |
| Antenna esterna/adattatore | Accessorio, non modifica della scheda | Connettore esatto, carico meccanico, ROS e banda; il guadagno RX non garantisce TX sicura |
| USB-C/OTG/dati | Interfaccia esistente | Cavo dati, host/permesso, alimentazione ed enumerazione reali |
| Cavo Kenwood USB-seriale | Condizionale all'adattatore e pinout | Livelli e cavo adeguato; non collegare direttamente RS-232 |
| EEPROM V1 ampliata | Non direttamente applicabile | V3 usa Flash SPI, non inserire EEPROM per analogia |
| SI4732/SSB/HF di V1 | Non verificato per V3 | Scheda, alimentazione, bus, spazio, firmware PY32 e test RX |
| LNA/filtri satellitari | Non verificato | Schema di quella revisione, impedenze, selettività, saturazione, isolamento TX |
| Filtro passa-basso TX | Non verificato | Frequenza, potenza, perdite, ROS e misura delle armoniche su carico |
| Modifica bobine/27 MHz | Non estrapolabile dalla V1 | Schema, valori misurati, stabilità e conformità; non pubblicare valori inventati |
| Espansione Flash SPI | Non supportata dalle mappe attuali | JEDEC, tensione, piedinatura, comandi, settori, bootloader e ogni lettore/scrittore |
| ESP32/coproc. | Progetto di adattamento, non plug-and-play | Bus e arbitraggio, livelli, alimentazione e driver V3 dedicato |
| SWD/debug | Condizionale a scheda e firmware | Pad confermati, livelli, backup e ripristino senza cancellare la calibrazione |
| Audio/discriminatore | Non verificato | Schema analogico, isolamento, carico e test senza iniettare tensione in ADC/DAC |
| Batteria/carica/potenza | Fuori dall'attuale validazione | Non modificare celle/protezioni né aumentare la potenza con istruzioni non verificate |

La radio non è stata aperta né modificata durante questo audit. Non ci sono
evidenze per certificare tutte le modifiche possibili. Gli schemi completi dei
collegamenti interni richiedono foto di entrambi i lati della scheda esatta,
tracciamento della continuità senza alimentazione e valori/componenti identificati
da personale qualificato; non si deducono da un diagramma a blocchi. Le protezioni
della batteria, RF e calibrazione non vengono aggirate.

## Documentazione e generazione del firmware

Fonti principali:

- [Atlas hardware e mappe V3](ATLAS-UV-K5-V3.md).
- [Build, formati BHA1/BHT1 e residente indipendente](BRICOHAMS-FIRMWARE.md).
- [Android: archiviazione, CAT, canali, permessi e limitazioni](ANDROID.md).
- [Configurazione e sicurezza dei banchi](AYUDA-CONFIGURACION.md).
- [Guida Quansheng](AYUDA-QUANSHENG.md).
- [Stato della distribuzione](ESTADO-ENTREGA.md).

La revisione integrale deve confrontare tutti i documenti e l'HTML generato con
codice e manifest, non correggere solo la pagina principale. Le cronologie
storiche delle distribuzioni mantengono i risultati precedenti e non vengono
riscritte per attribuire loro nuove verifiche.

Registrare per ogni build: commit/dirty, toolchain e flag, licenze, mappa/
dimensione Flash-RAM-stack, hash dei sorgenti/BIN/APK, formato e indirizzo di
caricamento, matrice dei test, errori noti e procedura di recupero.
I problemi già rilevati includono CRC oltre il limite del firmware,
mock troppo permissivo, manifest Android obsoleto, differenze tra main
pubblicato/locale, timebase del residente e mancanza di driver fisico
per il trasferimento delle app. La guida del residente documenta le correzioni
e non confonde compilazione riproducibile con esecuzione convalidata.

### Regressione di questa revisione

Dopo aver integrato la guida nell'aiuto, server locale ed elenco degli installatori:
283 test web riusciti, zero fallimenti, e `npm run check` corretto.
Questa evidenza appartiene all'albero locale modificato, non al main pubblicato.
Anche la compilazione dell'instrumentazione Android e `lintDebug` terminano
correttamente; non è stata installata alcuna APK né inviato alcun comando alla radio.

Nel controllo dei dispositivi compaiono solo COM3 Intel AMT SOL e l'elenco ADB è vuoto.
COM3 non viene usata come sostituto della porta Quansheng.
Servono enumerazione della radio e autorizzazione ADB del telefono prima
di eseguire i test fisici descritti.

### Confronto documentale effettuato

| Documento o gruppo | Confronto e correzione di questa revisione | Limite |
| --- | --- | --- |
| Architettura | Eliminata l'affermazione che non esiste la scrittura dei canali Quansheng; distingue le letture precedenti dai test in sospeso | Non certifica protocolli di altre apparecchiature |
| Stato della distribuzione | Mantenuta la matrice storica e aggiunta l'identificazione della base locale rispetto al main pubblicato | I risultati storici non vengono riscritti |
| Android | CRC settoriale, annullamento, chiusura dopo errore e database strumentato isolato | Il manuale locale non descrive automaticamente l'APK pubblicata più recente |
| Atlas V3 | Matrice delle modifiche senza estrapolazione V1, fonti e assenza di uno schema completo verificato nel materiale consultato | Nessuna misura elettrica né continuità di questa unità |
| Libreria firmware | Link AnyTone/Android/audit e separazione tra derivati F4HWN e piattaforma BHA1 | Catalogare non equivale a installare o convalidare |
| Guida Quansheng | Riviste le sezioni di visualizzatore, catalogo, slot e DFU; mantengono ambito e CRC dei test precedenti | Avvio SAT e scrittura dei canali sono ancora in sospeso |
| Configurazione, OpenGD77 e AnyTone | Confronto di copie, modifica locale e limiti di scrittura per famiglia | Una Quansheng non convalida hardware DMR né converte JSON/CSV in RDT |
| Esempi e ARDF | Provenienza, licenze e distinzione tra ARDF ufficiale e modulo Bricohams | Non si certificano binari di terzi o modifiche RF |
| Bricohams | Corretta identità della linea derivata; residente indipendente e formati documentati separatamente | Mancano test USB/Flash fisici e budget RAM dell'integrazione |
| Karina, Dim0s e indice di terzi | Corretto lo stato storico della registrazione; distinti ZIP omonimi da 2296162 e 2161962 byte con hash differenti | Nessun sorgente Karina verificato né equivalenza tra i due ZIP |
| Distribuzione, ADR e marchio | Separata la raccomandazione di un'origine dedicata dalla Pages realmente condivisa; conservati gli URL storici con chiarimento; tema Android arancione confrontato con le risorse | Nessuna migrazione automatica dei dati né validazione visiva su dispositivo |
| Comunità e licenze | Ricerche negative descritte con il loro ambito, non come prova di inesistenza; assenza di permesso di ridistribuzione verificato non presentata come parere universale | Non sono state nuovamente verificate tutte le licenze remote |
| HTML e packaging | Guide rigenerate e verificate tramite test di link, server, Pages/esportatore e installatori | Non è stata pubblicata una nuova versione |

Questa tabella registra l'ambito percorso; non dichiara una revisione riga per
riga di tutta la documentazione né di tutti i repository esterni.
Le restanti sezioni e fonti devono essere confrontate prima della chiusura
dell'audit esaustivo richiesto. L'assenza di problemi osservati non viene trasformata
in una certificazione del funzionamento di tutti i componenti.

Nella piattaforma portatile lo scratch dell'archiviazione è stato ridotto da 5184
a 4160 byte in conformità al limite combinato BHA1, risparmiando 1024 byte senza
ridurre i pacchetti validi. Nove test CTest passano, compreso il trasferimento
JS/C e il caricamento del massimo con 3072 byte di codice più 1024 di dati. Non è
ancora una misura di RAM/stack del residente con USB/Flash integrati.

### Nuova validazione locale del 27-10-2026

Nell'albero di lavoro attuale, `npm test` termina con 285 test superati
e zero errori; anche `npm run check` termina correttamente. Non è stato
possibile ripetere i test Android: Gradle ha trovato Java 8, mentre Android
Gradle Plugin 8.7.3 richiede Java 11 o successivo, e non è stato trovato
un altro JDK installato. Non è stato nemmeno possibile ricostruire le
suite CTest: CMake non ha trovato NMake né un compilatore C disponibile.
Questi blocchi riguardano l'ambiente di validazione e non sono risultati
di test del codice. Non sono stati eseguiti test strumentati, USB,
radio o RF.

## Chiusura e certificazione in sospeso

Non viene rilasciato un certificato finché non siano identificati APK installata, telefono/Android,
firmware e slot/banco, eseguiti casi fisici senza perdite, conservate evidenze
private e registrati gli errori/riparazioni con nuovo test.
Un audit software soddisfacente non certifica l'omologazione RF,
la sicurezza elettrica né tutte le modifiche di terzi.
