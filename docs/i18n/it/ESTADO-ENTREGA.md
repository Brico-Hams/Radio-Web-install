# Revisione dei requisiti e consegna

Revisione del 25-10-2026. Il progetto è ancora in Beta. Questa matrice distingue
le funzioni implementate dai test fisici e dagli obiettivi in sospeso.
Una compilazione riuscita non dimostra che una radio sia stata avviata con essa.
**Consegna incompleta:** restano requisiti da implementare e convalidare.

## Revisione complementare del 26-10-2026

La matrice e i dati seguenti del 25-10 sono storici. Per la verifica attuale,
consultare [Convalida integrale V3 e Android](VALIDACION-INTEGRAL-V3-ANDROID.md):
283 test web locali riusciti, 92 test Android host locali e 93 nella revisione
pubblicata isolata `01c58563e6507d17bd2bec612ef669840abfeddb`. Non sono risultati
intercambiabili. La correzione locale del CRC settoriale Android non è stata
pubblicata. I test strumentati usano una base isolata e compilano, ma non sono
stati eseguiti su dispositivo. Non esiste un certificato fisico per contatti,
canali o CAT dello slot SAT attuale.

La revisione pubblicata include registri General/POTA/SOTA e un elenco di
passaggi non presenti in questa base locale. I requisiti AND-02/AND-06 in sospeso
nella matrice storica vanno interpretati secondo la revisione valutata.
Il residente indipendente e le app BHA1 sono sperimentali: i test portabili non
equivalgono al supporto fisico USB/Flash né a un avvio convalidato.

## Richieste esaminate

| ID | Richiesta | Stato e prove | Attività necessaria per completarla |
| --- | --- | --- | --- |
| USB-01 | Caricare e cancellare canali PMR e ripetitori Quansheng | Connettore, editor e protezioni implementati. Due letture reali coincidenti di configurazione e calibrazione; 200 canali in F4HWN v6.0.0 | Backup integrale e prove reali di scrittura, cancellazione e rilettura |
| USB-02 | Caricare satelliti e memorie Doppler Quansheng | Pianificazione SGP4, memorie RX e CAT RX sperimentale nell'immagine Satelliti | Convalida RF e caricamento fisico delle memorie sull'unità |
| FW-01 | Catalogo delle versioni firmware | Catalogo e guide per famiglie, revisioni e opzioni | Mantenere copertura aggiungendo nuove versioni; il riconoscimento non equivale a compatibilità provata |
| WEB-01 | Pubblicare e ridistribuire il sito | Ultimo main pubblicato: `f7bd6125893385dd517fecd105967f241a65991f` | Pubblicare le modifiche successive e controllare Pages; nessuna nuova pubblicazione in questa revisione |
| FW-02 | Documentare esaustivamente Karina | Dossier V1, pacchetto V3/UV-K1 Dim0s, inventari, hash e funzioni osservate | Completare il confronto funzionale e visivo; il progetto sorgente non è stato recuperato |
| FW-03 | Bricohams con tutte le funzioni Karina | Implementazione indipendente sulla base aperta F4HWN V3; non è una copia né una ricompilazione di Karina | Parità funzionale completa e test per funzione; non si dichiara il 100 % |
| FW-04 | Multiboot e compilazione modulare su richiesta | Builder con commit fissato, preset, moduli separati e verifica strutturale | Provare avvio, cambio slot e recupero su V3 senza sostituire Main |
| FW-05 | Libreria firmware esistente negli slot | Selezione locale e classificazione per formato/modello, con rifiuto degli incompatibili | Installare e provare ogni immagine compatibile; nessuna conversione automatica da V1 a V3 |
| FW-06 | ARDF attivabile e separato se non entra tutto | Immagine ARDF: cicli, sincronizzazione e memoria manuale di attenuazione | Prove sul campo e comportamento documentato ancora da completare |
| FW-07 | Spettro e funzioni VFO-PRO | Immagine Spettro: RSSI, peak hold, media, preset RAM, esclusioni, acquisizione RX e ricerca CSS | Verificare RF/CSS ed equivalenza delle funzioni in sospeso; non trasmette né calibra |
| FW-08 | Conservare i preset dello spettro | Esportazione/importazione BHSP con convalida atomica e rilettura | Persistenza interna se necessaria; i file non sono EEPROM |
| FW-09 | Licenza MIT indicata per Karina | Dichiarazione registrata; nel pacchetto non è stato trovato un avviso verificabile | Identificare titolare, componente e testo della licenza prima di ridistribuirlo come MIT |
| HELP-01 | Aiuto completo per tutte le famiglie e opzioni | Quattordici guide HTML, comprese Android e questa revisione; 84 opzioni dell'interfaccia, storico di 18 versioni e 94 opzioni storiche | Estendere per ogni nuova funzione; non dichiarare copertura di varianti senza prove |
| HELP-02 | OpenGD77 e tutti i suoi modelli | Guida alla configurazione e matrice per famiglie/revisioni | Test fisici per modello; il catalogo non certifica tutte le radio |
| PRO-01 | Modalità PRO senza conferme ripetute | Attivazione esplicita per sessione e operazioni protette | Non elimina autorizzazioni del browser, backup, CRC, hash o protezione di Main |
| DATA-01 | Configurare RepeaterBook nella versione installata | Modulo provider e server locale con token in memoria | Prova con credenziali e autorizzazione proprie; nessun token incluso |
| DATA-02 | Scaricare automaticamente contatti DMR | RadioID e selezione/importazione; CSV web quando CORS impedisce l'API diretta | Verifica per apparecchio e capacità; non tutti i servizi consentono accesso diretto da Pages |
| DATA-03 | Scaricare stanze/gruppi DMR | Consultazione BrandMeister e importazione gruppi | Un talkgroup non equivale a tutte le stanze di ogni rete; completare le altre integrazioni richieste |
| GD77-01 | CPS OpenGD77 completo senza installare nulla | Edizione standard, riferimenti, dati e pianificazione nel browser | Flash, voci, database massivo degli ID, zone/impostazioni complete e parità con il CPS esterno non implementati |
| GD77-02 | Backup automatico del firmware originale e calibrazione prima dell'uso | Calibrazione e codeplug automatici con hash; risultato PARZIALE | Lettura integrale dell'MCU verificata per modello; le successive operazioni fisiche restano bloccate |
| ANY-01 | CPS AnyTone web | Sezione Beta con progetto JSON/CSV, importazione, modifica e zone | USB, RDT nativo e parametri completi per modello/firmware |
| ANY-02 | Codeplug con ripetitori digitali e analogici della Spagna | PMR e normalizzatori per RepeaterBook, RadioID e URE | Fonti attuali autorizzate, copertura nazionale confrontata e codeplug nativo del modello esatto |
| ANY-03 | Riutilizzare database OpenGD77 e Quansheng | Importazioni dei formati supportati con conservazione dei parametri conosciuti | Completare e verificare i campi non pubblicati; non inventare TS/TG |
| ANY-04 | Aeroporti se AnyTone supporta la banda aeronautica | Importazione di frequenze RF con fonte AIP e conferma manuale AM | Modello esatto, elenco aggiornato e verifica AM/spaziatura; nessun database aeroportuale nazionale incluso |
| CAT-01 | Cambiare frequenza durante il passaggio selezionato | CAT RX abilitato fisicamente, lease di 3 s e inseguimento web con arresto sicuro; separatamente, CAT TX v1 (PTT tramite lease, tasto 9) solo per invio SSTV | Convalida USB/RF reale; nessun inseguimento autonomo nella radio né Doppler in uplink |
| CAT-02 | Modificare da Android frequenza, subtoni e potenza per canale | Editor Android Beta dei canali FM F4HWN v6: nome, RX/TX, CTCSS/DCS RX e TX, potenza, stretto e blocco TX; backup completo con CRC dalla radio e SHA-256 su disco, scrittura a blocchi nell'ordine web e rilettura; 10 test host con radio simulata | Eseguire i test in CI, prova OTG reale con scrittura e rilettura su radio e persistenza dopo riavvio |
| AND-01 | Applicazione Android Bricohams | Progetto Kotlin 0.9.0-beta; SQLite, ADIF, SSTV, statistiche ARDF, acquisizione microfono e CAT RX via CDC ACM e adattatori riconosciuti, con test host | Funzioni in sospeso, installazione, autorizzazioni e test OTG/RF di ciascun cavo sul telefono |
| AND-02 | Funzioni satellitari tipo Look4sat, con interfaccia simile | SGP4 offline Android, TLE importati, osservatore manuale, passaggi 24 h e Doppler CAT RX con arresto sicuro | Interfaccia in stile Look4sat (elenco passaggi, radar polare, mappa), download automatico TLE e transponder, GPS osservatore, matrice telefono/cavo/radio e test sul campo; non si dichiara parità con Look4sat |
| AND-03 | SSTV Robot36 con CAT sul firmware Bricohams | Decoder WAV e acquisizione microfono con VIS/parità, colore 320x240 e PNG; schermata CAT registra Robot36 mentre Doppler o sintonizzazione CAT sono attivi; test sintetici | Convalida AudioRecord, percorso fisico e RF; decodifica continua in streaming, deriva e rumore |
| AND-04 | Interpretazione Morse | Testo, WAV PCM e acquisizione microfono fino a 60 s con decodifica successiva e tono/velocità fissi; test sintetici | AudioRecord reale, decodifica continua, adattamento e misure d'errore con campioni reali |
| AND-05 | «SSTVEncrip»: codificare e inviare SSTV come SSTV Encoder (interpretazione accettata dall'utente) | Codificatore Robot36 con andata/ritorno nel decoder; invio dalla schermata CAT con PTT CAT v1 del firmware (0x7B02): attivazione radio con tasto 9, lease 1,5 s, timeout a 120 s, blocco TX, bande, batteria e modulazione della radio, interruzione con qualsiasi tasto, nominativo obbligatorio stampato sull'immagine e conferma nell'app; test C del nucleo e dell'adattatore e 4 test host con radio simulata; immagine satellitare compilata senza avvisi | Prova sulla radio e misura RF (livello microfono, deviazione, LED, interruzione da tasto); altre modalità SSTV (Martin, Scottie, PD); Doppler uplink |
| AND-06 | Registro come HAMRS | Contatti SQLite, ricerca, modifica/cancellazione, ADIF ASCII con importazione/anteprima, JSON e ripristino transazionale; test host | Flusso e interfaccia tipo HAMRS (logbook per attività, modelli POTA/SOTA, inserimento rapido), convalida sul telefono e ADIF esteso; non si dichiara parità HAMRS |
| AND-07 | Caricamento su LoTW | Obiettivo documentato; ADIF/TQSL non equivale al caricamento diretto | Firma, certificato, custodia delle chiavi e flusso LoTW verificabile da Android |
| AND-08 | Statistiche di caccia alla volpe con GPS | Il firmware esporta il riepilogo; Android salva sessioni, storico, posizione puntuale con precisione/UTC, intervalli per beacon e somma filtrata di segmenti GPS senza unire intervalli mancanti, previa autorizzazione | GPS reale, percorso continuo, mappe, sincronizzazione firmware e statistiche di campo estese |
| BRAND-01 | Marchio Bricohams e bootlogo | Schermata iniziale e bitmap monocromatica integrata; Android conserva PNG originale e accento arancione | Verificare LCD fisico e interfaccia telefono |
| BRAND-02 | Arancione aziendale al termine e nei test | Palette documentata; logo aziendale conservato | Migrazione finale web/Android, contrasto e regressioni visive |
| DOC-01 | Documentazione naturale senza personalizzazione IA | Revisione editoriale delle attribuzioni visibili e dei racconti conversazionali | Mantenere uno stile tecnico diretto; conservare licenze e attribuzioni legali |
| REL-01 | Push su main al termine | Autorizzazione alla pubblicazione registrata | Chiudere i requisiti o concordare espressamente una consegna parziale; eseguire push e controllare CI/Pages |
| REL-02 | Nuovi programmi installabili con tutte le caratteristiche | Catena esistente per Windows, Debian/Raspberry Pi, Arch e FreeBSD | Costruire dalla revisione di consegna e provare contenuti/avvio; nessun nuovo installabile in questa revisione |
| REL-03 | ZIP con progetto, firmware, installabili ed evolutivi | Esportatore di sviluppo predisposto con verifica d'integrità ed esclusioni | Eseguirlo con tutti gli artefatti di consegna e verificare l'estrazione; non sostituisce le funzioni in sospeso |

## Prove software più recenti

- 211 test JavaScript riusciti in questa revisione, inclusi esportazione Android,
  estrazione ZIP e controllo d'integrità.
- Otto suite C riuscite nell'ultima convalida del firmware; questa revisione
  documentale e di consegna non modifica i sorgenti C.
- Compilazione ARDF con statistiche: 113960 byte RAW, RAM 12576/16384,
  Flash 113072/120832; manifesto e dieci hash delle sorgenti verificati.
- Satelliti CAT: 113868 byte RAW. Spettro con BHSP: 118044 byte RAW.
- Pannello ARDF presente e bloccato senza connessione nel browser.
- Nessuna di queste immagini è stata flashata o convalidata fisicamente.
- Android 0.7: APK e test strumentati compilati. Sessantanove test JVM/Robolectric
  riusciti in CI, inclusi USB/CAT simulato, ADIF, Robot36, SGP4, acquisizione/
schermata del microfono e statistiche/storico ARDF. Il 2026-10-26 passano in locale
  tutti gli 84 test host, inclusi quelli dell'editor canali (CAT-02) e dell'invio
  SSTV tramite PTT CAT (AND-05); manca la prima esecuzione in CI. Zero errori e
  tredici avvisi lint. Firme e hash delle 58 sorgenti verificati; il manifesto di
  ogni build registra il risultato corrispondente. I test strumentati sono compilati,
  ma non eseguiti; non è collegato alcun telefono.

I numeri sono prove datate, non un contatore che sostituisce i test di ogni
revisione. Le build precedenti restano artefatti evolutivi; il nome di una
cartella contenente `final` non le rende versioni stabili.

## Condizioni di consegna

1. Rivedere ogni ID e chiudere l'attività in sospeso con prove, oppure registrare
   una modifica di ambito approvata. Non sostituire un requisito con un pulsante o mock.
2. Testare software, documentazione, avvio locale e capacità reali. Per l'hardware:
   backup integrale, identificazione e prove autorizzate.
3. Applicare e verificare la palette arancione al completamento delle funzioni.
4. Costruire programmi installabili dalla stessa revisione e verificarne contenuti,
   licenze, integrità e avvio. Non riutilizzare pacchetti precedenti spacciandoli per nuovi.
5. Pubblicare su main, controllare CI e Pages e registrare la revisione pubblicata.
6. Esportare sorgenti, cronologia, artefatti firmware con sorgenti e licenze,
   programmi installabili ed evolutivi verificabili. Includere inventario e hash.
7. Estrarre lo ZIP in un'altra cartella, verificarne gli hash e provare l'avvio.
   Verificare che non contenga credenziali, backup radio o calibrazioni.

## Ambito dell'esportazione

L'esportatore genera uno **snapshot di sviluppo Beta**, non certifica il
completamento della matrice. Richiede l'accettazione tramite `--beta`. Non
pubblica, compila né esegue il flash. L'uso è descritto in
[Distribuzione](DEPLOYMENT.md#esportare-il-progetto). La consegna definitiva resta
subordinata ai punti precedenti.

Gli evolutivi sono compilazioni Bricohams verificabili e la cronologia Git di
HEAD insieme allo stato attuale dei sorgenti. Per impostazione predefinita non
include tutto `Documents/Multiboot`: contiene pacchetti di terze parti,
configurazioni e calibrazioni che non vanno confuse con una distribuzione del
progetto. Le cartelle di compilazioni fallite vengono segnalate, non presentate
come firmware. L'opzione `--android` include una consegna APK Beta solo se tutti
gli hash dei sorgenti corrispondono esattamente allo snapshot esportato; include
guida, licenze e prove di compilazione. Non incorpora APK evolutivi storici
senza i relativi sorgenti né inventa una convalida fisica.