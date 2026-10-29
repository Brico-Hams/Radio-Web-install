# Beta Android Bricohams

## Ambito dell'APK

La schermata principale offre **Lingua del sistema**, **Español**, **English (US)**,
**Français** e **Deutsch**. La scelta viene salvata localmente e applicata a tutte le
schermate, inclusi canali USB, CAT, satelliti e SSTV. Nominativi, nomi dei canali e file
utente non vengono tradotti; il marchio rimane Bricohams.

Aprendo Satelliti, TLE/frequenze vengono aggiornati automaticamente via HTTPS da CelesTrak e SatNOGS se il catalogo manca o ha almeno 24 h. L'opzione si disattiva in Impostazioni. Posizione salvata e canali radio non vengono inviati; i server ricevono la normale richiesta HTTPS, incluso l'indirizzo IP. L’importazione offline resta disponibile. Questa revisione conserva le funzioni 0.8.0 e prepara APK 0.9.0-beta, versionCode 13. Test, lint e compilazione richiedono JDK 17 e SDK 35 e non possono funzionare localmente con Java 8. La CI deve verificare la nuova APK prima della distribuzione.

Senza osservatore salvato si apre la mappa mondiale offline, senza permesso GPS o posizione inventata. Satelliti, coperture e traccia selezionata appaiono con TLE validi e si aggiornano ogni 5 s quando la mappa è visibile. Il catalogo salvato funziona offline fino alla scadenza dei TLE. Al primo caricamento si selezionano i satelliti ricevibili (fino a 20 voci senza frequenze); la scelta salvata, compreso Nessuno, viene conservata. I passaggi richiedono ancora la posizione in Impostazioni. Gli errori sono mostrati.

Al successivo push del tag v0.5.2, Android Beta allega entrambe le APK 0.9.0-beta (app debug e test strumentati) e SHA256SUMS-android alla release creata dagli installer. Nessuna pubblicazione locale.

La [validazione integrale V3/Android](VALIDACION-INTEGRAL-V3-ANDROID.md) distingue
le prove host dai test su telefono/radio e include la matrice dei contatti,
i canali per slot e CAT. L'audit è in corso, non certificato.

Applicazione nativa Kotlin per Android 8.0/API 26 o successivi, senza server
né account. È un'implementazione indipendente: non
include codice o risorse di Look4sat, Robot36 o HAMRS.
La versione `0.9.0-beta` non sostituisce le loro funzionalità complete.

| Funzione | Stato |
| --- | --- |
| Contatti del log di stazione | Creare, cercare, consultare, modificare ed eliminare con conferma; SQLite locale |
| Scambio di contatti | Esportazione/importazione ADIF ASCII con anteprima, JSON UTF-8 e ripristino di copia JSON |
| LoTW | Esportazione ADIF per TQSL su computer; non ci sono firma né caricamento da Android |
| ARDF | Sessioni persistenti, beacon 1-10, cronologia, contatori, intervalli per beacon e somma filtrata di segmenti GPS |
| GPS | Posizione puntuale del telefono, con precisione e ora della posizione, previa autorizzazione |
| Esportazione ARDF | JSON con sessioni, osservazioni, contatti e coordinate quando disponibili |
| Morse da testo | Punti/trattini; spazi tra lettere e `/` tra parole |
| Morse da file audio | WAV PCM mono a 16 bit sperimentale, tono/velocità configurati |
| Microfono | Acquisizione in primo piano fino a 60 s e decodifica successiva Morse/Robot36; senza ascolto né decodifica continua |
| USB/CAT RX | CDC ACM e adattatori USB-seriale riconosciuti a porta singola, identificazione F4HWN v6+, interrogazione, sintonia temporanea confermata e STOP; sperimentale |
| CAT TX (PTT) | Invio Robot36 con PTT tramite lease armata sulla radio (tasto 9), nominativo obbligatorio, limite di 120 s, rifiuto per TX lock e bande; sperimentale |
| Satelliti | SGP4 offline, catalogo TLE importato, osservatore manuale, previsione 24 h e inseguimento Doppler RX via CAT durante il passaggio selezionato |
| SSTV Robot36 | Decodifica WAV o acquisizione microfono, anche con CAT in sintonia, e codificatore Robot36 per invio tramite PTT CAT; sperimentale |
| Scrittura di canali, subtoni e potenza | Editor di canali FM F4HWN v6 via USB con backup completo e rilettura |

L'interfaccia usa il PNG originale Bricohams e l'accento arancione su sfondo
scuro. L'icona mantiene il marchio originale invece di inventare una variante;
lint segnala la forma non convenzionale dell'icona di avvio. La palette del web
non è ancora stata modificata: la migrazione definitiva è ancora in sospeso.

## Installazione e dati

L'APK di sviluppo è firmato con la chiave debug degli strumenti Android,
non con un'identità di distribuzione Bricohams. Verifica lo SHA-256 pubblicato
insieme all'APK. Non è una versione di Google Play né una release stabile.
Android chiederà di autorizzare l'installazione dall'applicazione che apre l'APK.
Non installa driver né modifica la radio.
Gli eventuali comandi CAT RX modificano temporaneamente la sintonia di ricezione,
non la programmazione persistente della radio.

I dati sono salvati in un database SQLite privato dell'applicazione. Non ci sono
telemetria, servizio di localizzazione in background né
caricamento di dati. Il backup automatico e il trasferimento dei dati di sistema
sono disattivati nel manifest/nelle regole di estrazione.
**Esporta prima di disinstallare:** la disinstallazione elimina i dati locali.
Il ripristino JSON si avvia da Home e non elimina mai i dati esistenti.

Le esportazioni usano il selettore file di Android; non richiedono accesso
allo spazio di archiviazione generale. Il provider scelto potrebbe essere remoto:
scegliere un cloud implica condividere il contenuto con quel provider. Il JSON
contiene dati personali e posizioni; controlla la destinazione e non pubblicarlo.
Non viene richiesto né memorizzato alcun certificato LoTW.

Prima di migrare SQLite schema 1, il database intatto viene copiato in `bricohams-v1-backup.db`, nell’archivio privato. Migrazione transazionale: i contatti passano a Generale; un errore lascia lo schema 1 invariato.

## Log di stazione

I contatti sono raggruppati per attività: Generale (sempre presente), POTA e SOTA. Cambia libro seleziona il libro attivo. Crea un libro con nome ASCII, modello, riferimento (POTA `EA-0123`, SOTA `EA4/MD-001`; vuoto in Generale) e nominativo di stazione, obbligatorio per POTA/SOTA. L’inserimento rapido conserva frequenza e modo; RST non modificato passa tra 59 e 599 per fonia/CW-RTTY. UTC vuoto usa l’ora corrente al salvataggio. Ricerca e import/export ADIF riguardano il libro selezionato; JSON include tutti i libri. POTA propone `INDICATIVO@PARQUE-AAAAMMDD.adi`.

Prima del salvataggio, l’avviso duplicati confronta nominativo, banda ADIF (o frequenza fuori banda), modo e giorno UTC per POTA/SOTA. Non salvare conserva il modulo; Salva comunque aggiunge il contatto. `EA2XYZ` e `EA2XYZ/P` sono distinti. L’importazione ADIF ignora solo contatti identici in tutti i campi conservati. ADIF esporta BAND, STATION_CALLSIGN e MY_POTA_REF/MY_SOTA_REF se applicabili; campi attività importati e BAND incoerente sono segnalati non conservati. Nessuna ricerca online o invio POTA/SOTA; non si possono rinominare o eliminare libri.

1. Apri Log e inserisci nominativo, UTC ISO, frequenza MHz, modo,
   rapporti inviato/ricevuto e note.
2. Salva il contatto. L'elenco mostra gli ultimi 50; l'esportazione li include tutti.
3. Modifica apre il contatto con il suo ID originale; salvare non crea un duplicato.
   L'eliminazione richiede conferma e non può essere annullata.
4. Esporta ADIF per lo scambio/TQSL o JSON per conservare tutto il testo.

La data è interpretata come istante ISO; ADIF la converte in UTC. Le
frequenze ammesse dal modulo, 0.1-1300 MHz, non autorizzano a trasmettere.
I modi di una voce non affermano che la radio li supporti.
I moduli non ancora salvati vengono scartati al cambio di sezione.
La rotazione conserva i campi della sezione corrente tramite lo stato Android.

ADIF include CALL, QSO_DATE, TIME_ON, FREQ, MODE, RST_SENT, RST_RCVD e COMMENT.
L'esportazione ASCII rifiuta note con accenti, interruzioni di riga o altri
caratteri non supportati: non li elimina né li sostituisce silenziosamente.
JSON conserva UTF-8. L'esportazione non certifica che LoTW accetti un contatto;
firma, caricamento, risposta del servizio e conferma sono passaggi distinti.

### Cercare contatti

Da Log inserisci una parte del nominativo, delle note, del modo, della frequenza o dell'UTC
e premi Cerca contatti. Il confronto non distingue maiuscole e minuscole; non rimuove
gli accenti né interpreta intervalli/espressioni regolari. Vengono mostrati il totale
delle corrispondenze e le 50 corrispondenze più recenti. Mostra tutti i contatti
rimuove il filtro. La ricerca applicata sopravvive alla rotazione; premere Cerca
ricrea il modulo e scarta le modifiche non ancora salvate. L'esportazione include
sempre tutti i contatti, non solo le corrispondenze.

### Importare ADIF con anteprima

Da Log premi Importa ADIF (anteprima). Il selettore consente qualsiasi file,
ma vengono validati file di testo ADIF ASCII, fino a 16 MiB e 50000 contatti.
Ogni intestazione o record è limitato a 512 campi.
Non sono supportati ADX/XML, UTF-8 né altri formati binari. La lettura rispetta
la lunghezza dichiarata: il testo come `<EOR>` dentro COMMENT non termina il record.
Sono ammesse intestazioni con EOH o record senza intestazione, etichette
senza distinzione tra maiuscole e minuscole e suffissi di tipo ADIF. Ogni
record deve terminare con EOR.

Campi obbligatori: CALL, QSO_DATE (YYYYMMDD), TIME_ON (HHMM o HHMMSS),
FREQ in MHz, MODE, RST_SENT e RST_RCVD. COMMENT è facoltativo. Si applicano
agli stessi limiti dei contatti inseriti manualmente; modi come FT8
non vengono convertiti silenziosamente in altri. Un orario HHMM viene
rappresentato con i secondi 00. Il formato non conserva frazioni di secondo
in esportazione. La frequenza non viene dedotta da BAND e i rapporti mancanti
non vengono inventati.

L'anteprima mostra il numero di contatti e i **campi non conservati**,
per esempio BAND, SUBMODE, GRIDSQUARE o dati di conferma LoTW. I metadati
dell'intestazione non vengono incorporati nei contatti. Conserva il file
originale: questa importazione non sostituisce senza perdita qualsiasi ADIF.
Annullare non salva nulla. Un file malformato o un record non valido annulla
tutto prima di proporre l'importazione. Etichette duplicate, date impossibili
e lunghezze troncate sono errori espliciti.

Dopo l'accettazione, tutto viene aggiunto in una transazione SQLite. Se un
inserimento fallisce, l'intero insieme viene annullato. I record i cui campi
conservati sono identici a un record esistente o dello stesso file vengono
omessi: nominativo, istante UTC, frequenza numerica normalizzata, modo,
entrambi i rapporti e note. Se uno qualsiasi differisce, viene aggiunto un
nuovo contatto; non si sovrascrive in base al nominativo/orario.
Gli ID interni vengono generati di nuovo; non si usano ID esterni ADIF.
Reimportare lo stesso contenuto non duplica i contatti identici. I campi
non conservati non partecipano al confronto. Esporta prima una copia JSON
e controlla i contatori del risultato.

Mantieni aperta la schermata fino all'accettazione dell'anteprima. Ruotare/chiudere
prima dell'accettazione scarta l'anteprima senza salvare. Un'importazione già
accettata può terminare in background anche se la schermata viene chiusa; consulta
il log prima di ripeterla. Non esiste un servizio di importazione persistente.

### Ripristinare una copia JSON

Da Home, premi Importa copia JSON Bricohams e seleziona una copia versione 1
esportata da questa applicazione. Il file ammette fino a 16 MiB
e 50000 record per tabella. Vengono validati UTF-8, formato, campi, ID,
contatti, date, coordinate e riferimenti tra sessioni/osservazioni.
Non importa ADIF né JSON di altre applicazioni.

L'importazione è una transazione: qualsiasi errore annulla tutte le
modifiche. I nuovi ID vengono aggiunti; i record identici vengono conservati
senza duplicarli. Un ID esistente con contenuto diverso annulla l'importazione,
senza sovrascriverlo. Sessioni diverse non vengono unite in base al nome.
La risposta mostra quanti nuovi record sono stati incorporati. Non è un
ripristino distruttivo né una sostituzione completa del database.

## ARDF e GPS

1. Crea una sessione o selezionane una esistente.
2. Indica il beacon 1-10 e le note.
3. Facoltativamente, premi Ottieni posizione e accetta l'avviso sulla privacy e
   il permesso Android per la posizione precisa. Senza permesso puoi continuare senza GPS.
4. Con il GPS attivato, attendi una posizione recente; viene richiesta per un
   massimo di 30 secondi. Non viene usata una posizione storica del provider.
5. Salva l'osservazione. La posizione viene accettata solo entro 30 secondi,
   usando un orologio monotono; la sua precisione e l'UTC GPS vengono salvati
   separatamente dall'ora di registrazione dell'osservazione.

Salvare senza una posizione recente crea esplicitamente un'osservazione SENZA
coordinate e lo notifica. Non inventa una posizione. Uscire dalla schermata,
nascondere/chiudere l'attività o terminare la richiesta annulla gli aggiornamenti.
Le posizioni contrassegnate come simulate da Android vengono scartate.
Ogni posizione viene usata al massimo per un'osservazione; richiedila di nuovo
se serve un'altra misura.

La coordinata appartiene al telefono, non al trasmettitore. Non ci sono
triangolazione, direzione, RSSI, percorso continuo, mappa, sincronizzazione
con le statistiche RAM del firmware né classificazione automatica dei beacon
individuati. I contatori sono osservazioni manuali. Queste funzioni sono ancora in sospeso.

### Statistiche e cronologia ARDF

Nella sessione selezionata premi Statistiche e osservazioni della sessione.
Il pannello legge il database SQLite persistente e mostra:

- Numero di osservazioni e quante contengono coordinate.
- Intervallo tra la prima e l'ultima osservazione, non il tempo di attività né
  la durata dalla creazione della sessione. Zero o una osservazione producono 0 s.
- Per beacon: quantità, primo/ultimo UTC, quantità con coordinate e
  intervallo medio tra registrazioni. Con una sola osservazione non c'è media.
- Le ultime 100 osservazioni con note, UTC e coordinate/precisione/ora della
  posizione, oppure SENZA coordinate. L'esportazione JSON le include tutte.

La somma dei segmenti GPS usa Haversine su una sfera di raggio 6371008.8 m,
solo tra osservazioni consecutive del telefono. Entrambe devono avere
precisione dichiarata <=50 m e posizione da 0 a 30 s prima della registrazione.
Le ore di registrazione e posizione devono aumentare, con separazione massima
di 120 s. Un'osservazione senza GPS, imprecisa, vecchia o futura interrompe
la catena: non viene saltata per unire i punti ai due lati. Posizioni ripetute
o tempi uguali non generano segmenti. Viene indicato il numero di segmenti.

**Non è un percorso completo**, la distanza realmente percorsa, la distanza
da un beacon, la velocità o il punteggio di gara. Non esiste un filtro del rumore GPS:
la deriva può aumentare la somma anche senza movimento. Le lacune possono
ridurla. I tratti non vengono interpolati e non si deduce che un beacon
sia stato trovato osservandolo. I dati importati conservano il loro UTC;
le modifiche dell'orologio e la precisione del provider influiscono sui risultati.
Le statistiche vengono ricalcolate senza modificare i dati né il formato JSON.

## USB CDC e CAT RX sperimentale

Da Home, apri CAT RX USB sperimentale e scegli esplicitamente un
 dispositivo in base a VID, PID, driver e nome. Il telefono deve supportare USB host/OTG.
Sono supportati **CDC ACM standard** con un'interfaccia di controllo e una di
dati bulk, e adattatori riconosciuti CH34x, CP210x, FTDI o Prolific con
una sola porta. Le configurazioni composite ambigue/multipporta vengono rifiutate;
non viene indovinata una porta.
L'applicazione richiede il permesso USB Android prima di aprire il dispositivo.
Se il sistema ricrea la schermata al concedere il permesso, selezionalo di nuovo.
Non c'è connessione automatica quando si inserisce un cavo.

I driver USB-seriale provengono da **usb-serial-for-android 3.9.0**,
con licenza MIT inclusa negli asset e nella distribuzione. Viene usata solo la
relativa tabella dei dispositivi riconosciuti; un VID/PID sconosciuto non viene
forzato su un driver. La dipendenza è fissata e JitPack è limitato a quel modulo.
Non serve root né installare un driver esterno sul telefono.
Un cavo che funziona come COM in Windows non dimostra che sia compatibile
con Android. Inoltre, non tutte le porte USB-C di Quansheng espongono dati.
L'implementazione non certifica ancora il cavo della UV-K5 V3 fisica; OpenGD77
e AnyTone non usano questo protocollo CAT.

È necessaria l'immagine Bricohams Satelliti con CAT RX v1, basata su F4HWN v6+.
F4HWN originale non incorpora questo modulo, che riconosce la propria versione.
Questa schermata non installa firmware:

1. Avvia SAT RX sulla radio e abilita fisicamente CAT con il tasto 8.
2. Seleziona il dispositivo corretto e concedi il permesso Android.
3. L'applicazione configura CDC a 38400, 8N1, identifica tramite
   `0x0514/0x0515` e interroga `0x7B00/0x7B01`.
4. Interroga lo stato o inserisci i MHz in passi esatti di 10 Hz:
   136-174 o 400-470 MHz. Una risposta in coda non significa che sia stata applicata;
   si interroga fino alla conferma, per un massimo di dieci tentativi.
5. Ogni SET dura una lease di **3000 ms** nel firmware. Il pannello manuale
   non la rinnova automaticamente. L'inseguimento dei passaggi descritto
   sotto rinnova solo durante una sessione avviata esplicitamente.
6. STOP richiede la frequenza nominale. Nascondendo la schermata vengono annullati
   i SET non ancora inviati, si tenta STOP se c'è uno stato remoto/in sospeso
e vengono rilasciati interfacce/connessione. La disconnessione USB invalida la sessione.
   Per tornare è necessario riconnettersi; una sintonia precedente non riprende.

Lo stato è l'ultima risposta del firmware, non una misura RF. QUERY non
rinnova la lease. Se il cavo si scollega, non è possibile garantire l'invio di STOP:
viene segnalato l'errore e la lease ripristina la frequenza nominale solo se
il loop della radio è ancora in esecuzione. Controlla la frequenza sulla radio.
CRC, XOR e controllo di sequenza rilevano errori di protocollo, ma non sono
cifratura né autenticazione. CAT RX non effettua TX/PTT (è CAT TX, separato) né modifica firmware,
EEPROM o calibrazione. La modifica dei canali è separata, nell'editor canali.

Le operazioni USB sono serializzate fuori dal thread dell'interfaccia, conservano
byte residui dei pacchetti bulk e verificano i trasferimenti parziali.
Non vengono usati servizi in background. Queste funzioni sono testate
con USB simulata; mancano test OTG e RF con telefono/radio reali.

## Editor canali Quansheng via USB (Beta)

Correzione locale dell'audit: il CRC fisico viene richiesto su 512 settori da
4096 byte, non con un comando da 2 MiB che supera il limite `0x073E`. Vengono
verificati indirizzo, lunghezza, stato e CRC di ogni settore, compreso l'ultimo.
Per applicare la correzione è necessario ricostruire e installare l'APK; non modifica
da sola una versione già scaricata. Vedi il
[rapporto di validazione](VALIDACION-INTEGRAL-V3-ANDROID.md).

Schermata «Modifica canali Quansheng via USB (Beta)». È il porting Android
dell'editor web: stessi comandi F4HWN v6, stesso backup e stessa scrittura
con rilettura. Modifica solo canali FM esistenti.

1. Scegli il cavo (OTG con CDC o adattatore USB-seriale riconosciuto) e connetti.
   La radio viene identificata con `0x0514`. F4HWN v6.0 è in sola lettura.
2. Backup completo: calibrazione di 512 byte, Flash esterna di 2 MiB in
   blocchi da 128 byte con `0x0738`, CRC-32 verificato dalla radio con `0x073E`
   e firmware Main validato dall'intestazione `FMB1` e dal CRC. Richiede
   10-20 minuti a 38400 baud; lo schermo resta acceso. Viene salvato
   nell'archiviazione privata dell'app con `SHA256SUMS`. Richiede Labs v6.1+.
3. Leggi i canali: configurazione logica di 41344 byte (`0x051B`).
4. Scegli un canale e modifica nome, RX, TX, tono RX e TX (OFF, CTCSS in Hz come
   `88.5` o DCS come `D023N` / `D023I`), potenza (USER, LOW1-LOW5, MID, HIGH),
   banda stretta e blocco TX. Frequenze 136-174 e 400-470 MHz nella stessa
   banda, come sul web. Gli altri bit del canale vengono conservati.
5. Applica alla copia locale: non scrive ancora sulla radio.
6. Scrivi: conferma, verifica di nuovo il backup tramite SHA-256 e controlla
   che la radio sia ancora uguale a quando l'hai letta. Nasconde i canali interessati,
   scrive blocchi da 8 byte (`0x051D`), li mostra di nuovo e rilegge l'intera
   configurazione. Se la rilettura non corrisponde, viene segnalato e non viene
   considerata riuscita. VFO, impostazioni, calibrazione e banchi sono protetti.

Scollegare, uscire dalla schermata o un qualsiasi errore chiude la sessione: è necessario
riconnettersi e fare un backup prima di scrivere. Non è una transazione resistente
alle interruzioni di alimentazione. Riavvia la radio dopo la scrittura.

## Satelliti SGP4 e inseguimento dei passaggi

Da Home apri Satelliti. L’interfaccia ridisegnata usa codice e colori Bricohams propri, non risorse Look4sat: conto alla rovescia AOS/LOS e schede **Passaggi**, **Mappa**, **Satelliti**, **Impostazioni**.

Motore **satellite.js 6.0.1** (MIT), stessa distribuzione UMD web, tramite **Rhino 1.7.15** (MPL 2.0). Licenze e collegamenti sorgente inclusi. SHA-256:
`91fdd46e9523c6b232d24ff69fd5e9cade8471d20624a154df7d9c91dc212639`.
Un contesto Rhino condiviso esegue solo asset fissi, mai codice scaricato, senza accesso Java.

1. **Dati:** Impostazioni scarica il gruppo amatoriale CelesTrak (massimo 256 KiB) e i trasmettitori SatNOGS DB (16 MiB, CC BY-SA 4.0) via HTTPS. L'aggiornamento automatico opzionale avviene all'apertura o al ritorno se il catalogo manca o ha almeno 24 h. Dopo un errore il nuovo tentativo automatico attende 15 min; il pulsante riprova subito senza download duplicati. Nessun servizio periodico in background. I trasmettitori vivi e attivi devono appartenere al catalogo e avere downlink 136-174 o 400-470 MHz in passi di 10 Hz. Se SatNOGS fallisce, i nuovi TLE conservano le precedenti frequenze con avviso. Importazione TLE offline disponibile. File privati scritti atomicamente. Verifiche di 69 caratteri, checksum e NORAD; Alpha-5 e NORAD duplicati rifiutati. Scadenza dopo sette giorni; epoche oltre 24 h nel futuro rifiutate e intera finestra valida richiesta.
2. **Osservatore:** latitudine/longitudine in gradi, quota WGS84 in **km** (-0.5 a 9). Usa ultima posizione GPS chiede la posizione e copia l’ultimo fix GPS/rete con età e precisione. Controlla e Salva e calcola passaggi. Elevazione minima 0-60 gradi.
3. **Satelliti:** ricerca nome/NORAD, caselle e scorciatoie Tutti, Con RX, Nessuno. Il primo download seleziona i satelliti con RX nelle bande.
4. **Passaggi:** le prossime **24 h** si riempiono progressivamente. Schede con NORAD, nome, elevazione massima, giorno e AOS/LOS locali, azimut, modi, conto alla rovescia e avanzamento. Campionamento 5 s, attraversamenti raffinati a 500 ms; sotto l’orizzonte passi adattivi multipli di 5 s conservano la griglia web e limitano l’elevazione per non saltare attraversamenti (meno di 0.3 gradi/s anche a 200 km). AOS/LOS usano la soglia scelta; massimo campionato, non ottimizzato continuamente.
5. **Dettaglio:** tocca scheda o intestazione: radar polare (nord in alto, orizzonte al bordo, zenit al centro; AOS verde, LOS rosso, posizione arancione interpolata tra 60 punti SGP4), azimut/elevazione/distanza/Doppler dal vivo, UTC e downlink SatNOGS o MHz manuali. Connetti CAT: Doppler, SSTV e registrazione apre CAT con quel passaggio.
6. **Mappa:** coste offline Natural Earth 1:110m, pubblico dominio, satelliti, copertura sopra 0 gradi, osservatore e traccia selezionata 45 min prima/dopo. Tocca per selezionare; aggiornamento ogni 5 s se visibile.

Posizione, selezione e ultimo downlink per satellite restano privati, fuori dal JSON di campo. Nessun uplink dedotto; transponder lineari non supportati.

### Doppler RX del passaggio selezionato

Selezionare un passaggio apre CAT con un'istantanea di TLE, osservatore,
downlink e finestra. Non connette USB né invia comandi autonomamente.
Connetti il dispositivo, entra in SAT RX e abilita CAT con 8 sulla radio.
Premi **Avvia Doppler del passaggio selezionato** solo durante la finestra.
Non è previsto l'avvio programmato in background.

L'orbita viene propagata all'istante corrente e la velocità radiale è calcolata
come differenza di distanza centrata su un secondo. La correzione ricevuta è
`f_rx = f_nominal * (1 - velocidad_radial / 299792.458 km/s)`, arrotondata a
10 Hz. Sono richiesti elevazione non negativa, TLE valido e frequenza RX in banda.
Vengono inviati esclusivamente SET RX temporanei, mai TX/PTT, canali o EEPROM.

Dopo ogni conferma si attendono 750 ms prima dell'aggiornamento successivo,
anche se l'arrotondamento non cambia la frequenza; in questo modo si rinnova la lease di 3 s.
Non vengono accodate due operazioni USB simultanee. Il processo si arresta a fine
passaggio, TLE scaduto, orizzonte, disconnessione/errore, risposta non applicata,
intervallo/conferma di 2 s o più, orologio ripetuto/arretrato o salto UTC rispetto
al monotono superiore a 500 ms. I comandi manuali sono bloccati durante l'inseguimento;
il comando di arresto resta utilizzabile.

Arrestare, nascondere la schermata o scollegare annulla i SET futuri, tenta
STOP e chiude USB. Al ritorno non riprende: occorre riconnettersi e avviare
una nuova sessione. Se STOP fallisce, viene notificato, senza dichiarare il ripristino.
La lease è utile solo finché il firmware continua a eseguire il proprio loop.
La schermata mostra calcoli e ultima conferma, non una misura RF né una posizione
reale verificata. Manca la validazione sul campo dell'insieme telefono/cavo/firmware/radio.

### Registrare il passaggio e cercare SSTV

In CAT, Registra passaggio completo (WAV fino a LOS) acquisisce il microfono mentre Doppler resta attivo. Collega l’altoparlante radio al telefono. Acquisizione 48 kHz, media 3:1 verso **WAV 16 kHz mono** privato, circa 1.9 MB/min. Arresto a LOS, due ore, manuale o uscendo; intestazione WAV valida anche con errore. Non insieme alla ricezione Robot36 di 60 s.

Satelliti, Impostazioni, Registrazioni dei passaggi mostra durata e dimensioni. SSTV analizza finestre di 60 s ogni 23 s per contenere un’immagine intera di 37 s, scarta duplicati distanti meno di 10 s e salva PNG accanto al WAV. Esporta copia WAV alla destinazione scelta. Elimina rimuove WAV e PNG associati dopo conferma, senza possibilità di annullare. I test sintetici non certificano ricezione RF né hardware AudioRecord reale.

### Rotore AZ/EL Bricohams

Nel dettaglio di un passaggio, **Rotore AZ/EL: prepara e segui questo passaggio** apre il
controllo del rotore di [antenaSatCommrotor](https://github.com/Brico-Hams/antenaSatCommrotor)
tramite il suo Wi-Fi (`192.168.4.1`, unica destinazione HTTP senza TLS consentita) o tramite
BLE cifrato con PIN. Il telefono invia ora UTC, posizione, TLE e calibrazione di
nord/livello con la bussola; l'app avvisa degli attraversamenti del fine corsa del cavo,
dei passaggi troppo rapidi o zenitali, porta l'antenna all'AOS e attiva l'inseguimento
automatico mentre CAT corregge il Doppler. Guida completa in [ROTOR.md](../../ROTOR.md);
patch del firmware e versione a basso costo in
[hardware/rotor](../../../hardware/rotor/README.md). Non provato con un rotore fisico.

## Morse WAV sperimentale

Il selettore accetta audio, ma il parser richiede RIFF/WAVE PCM lineare mono
a 16 bit, 8-48 kHz, 0.1-60 secondi e massimo 8 MiB. Rifiuta float,
stereo, MP3, dati troncati e lunghezze incoerenti.

Configura il tono effettivo tra 300 e 1200 Hz e la velocità tra 5 e 45
parole al minuto. Il rilevatore usa finestre di circa 5 ms e l'energia
Goertzel del tono; interpreta la durata dei segnali e degli spazi con la
velocità configurata. Non stima automaticamente velocità né frequenza.
Non è riconoscimento vocale né una misura di confidenza statistica.
L'output mostra testo, punti/trattini e un avviso di incertezza;
`?` identifica codici non riconosciuti, non tutti i possibili errori.

Registrazioni deboli, rumore, fading, spostamento del tono, temporizzazione
irregolare o errori di configurazione possono produrre testo errato anche se
non appare `?`. Confronta il risultato con l'audio. Mantieni la schermata aperta
durante il calcolo: un cambio di configurazione o la chiusura dell'attività
può scartare il risultato in corso. L'importatore WAV non acquisisce dal
microfono e non trasmette.

## SSTV Robot36 da WAV

Da Home apri SSTV Robot36 da WAV e premi Decodifica WAV Robot36.
Seleziona RIFF/WAVE PCM lineare mono a 16 bit, fino a 8 MiB, 37-60 secondi
e frequenza di campionamento **8/16/24/32/40/48 kHz**. Non supporta 44.1 kHz,
MP3, float né stereo. Non seleziona immagini per la trasmissione.
L'audio deve contenere l'intera intestazione: leader a 1900 Hz, separazione
a 1200 Hz, VIS **8** con parità pari, stop e le 240 righe Robot36.
Non indovina il modo da un'immagine parziale né accetta altri VIS.

L'implementazione proprietaria usa una trasformata Hilbert FIR per stimare
la frequenza istantanea e allinea il primo porch. La temporizzazione è
150 ms per riga: sincronismo 9 ms, porch 3 ms, luminanza 88 ms,
separatore 4.5 ms, porch 1.5 ms e crominanza 44 ms. La luminanza ha
320 campioni per riga; la crominanza, 160 campioni, con Cr/Cb condivisi
tra coppie di righe. YCbCr a intervallo completo viene convertito in RGB e
il risultato è limitato a 0-255. Riferimento tecnico consultato:
[Robot36 di Ahmet Inan, revisione fissata](https://github.com/xdsopl/robot36/tree/5860ded4716170b562c3e915c7eebb879742dcd4),
pubblicato come CC0. Non sono inclusi codice C né immagini di quel progetto.
Non è una ricompilazione né una copia dell'app Android Robot36.

I campionamenti supportati vengono ridotti a 8 kHz mediando i blocchi. Non è
un front-end audio professionale né una soppressione completa di aliasing/rumore.
Non ci sono compensazione della deriva dell'orologio, inclinazione, Doppler, rumore,
audio troncato o recupero delle righe. Vengono controllati sincronismo e
separatore di colore per ogni riga. Se mancano dati o si perde il sincronismo,
l'operazione fallisce e non propone un'immagine completa né un PNG precedente.
Rilevare intestazione/righe non dimostra che tutti i pixel siano corretti.

Dopo la decodifica viene mostrata un'immagine **320x240**. Salva immagine PNG
apre il selettore Android. Il provider scelto potrebbe essere un cloud:
scegli la destinazione considerando il contenuto privato dell'immagine.
Non viene salvata automaticamente nella galleria. L'immagine resta in RAM;
ruotare o chiudere scarta l'anteprima. Esportala prima. Se la scrittura PNG
fallisce, il file parziale viene scartato.

L'importatore WAV non usa il microfono, audio USB, PTT né trasmette; questa
schermata non modifica la frequenza della radio. L'acquisizione facoltativa
si apre separatamente come descritto sotto. Il comportamento con registrazioni
RF e percorsi audio fisici deve ancora essere validato. Le prove sintetiche
non sostituiscono tali verifiche.

## SSTV Robot36 via CAT: ricezione in sintonia e invio con PTT

Nella schermata CAT, sotto la connessione USB, sono disponibili tre azioni SSTV.

**Ricevere.** Avvia il Doppler del passaggio o sintonizza manualmente, collega
l'altoparlante della radio all'ingresso audio del telefono e premi *Registra
Robot36 (CAT continua la sintonia)*. La registrazione usa la stessa acquisizione
di 60 s della schermata microfono e non ferma l'inseguimento CAT, eseguito in un
altro thread. Premi *Interrompi registrazione e decodifica* al termine dell'immagine.

**Inviare.** È necessaria l'immagine Bricohams Satelliti con CAT TX v1 (comando
`0x7B02`, vedi `BRICOHAMS-FIRMWARE.md`). Passaggi:

1. Inserisci il nominativo. **È obbligatorio**: senza un nominativo valido il
   selettore non si apre e il nominativo viene stampato nella fascia inferiore dell'immagine.
2. Collega l'uscita audio del telefono all'ingresso microfono della radio.
   La porta USB-C della radio resta per CAT; il telefono richiede jack da 3,5 mm o un
   hub OTG con audio.
3. Sulla radio, in SAT RX, premi il tasto 9: `CAT TX ARMED`.
4. Premi *Invia Robot36 via PTT CAT*, scegli l'immagine (ridimensionata a 320x240) e
   conferma la finestra con frequenza, nominativo e durata (~37 s).

L'app interroga la PTT e non trasmette se la radio non è armata, ha raggiunto il
limite o rifiuta TX. Attiva la PTT, attende la conferma della radio e solo allora
riproduce l'audio, rinnovando la lease ogni 400 ms. Se un rinnovo fallisce (tasto
premuto sulla radio, limite, blocco) o la schermata passa in background, interrompe
l'audio, rilascia la PTT e lo conferma con una nuova lettura. Se la rilettura
fallisce, la radio rilascia la PTT da sola dopo 1,5 s. L'audio è limitato a
110 s, al di sotto del timeout di 120 s della radio.

Trasmette sulla frequenza TX del VFO della radio, senza correzione Doppler di
uplink, e non è consentito durante l'inseguimento di un passaggio. È necessaria
una licenza e una frequenza autorizzata per SSTV. **Non convalidato su radio né RF.**

## Acquisizione microfono Morse e Robot36

Da Home premi Ricevi Morse / Robot36 con microfono. Seleziona il modo;
per Morse inserisci il tono tra 300 e 1200 Hz e la velocità tra 5 e
45 ppm. Robot36 ignora questi due campi. Il permesso `RECORD_AUDIO` viene
richiesto solo premendo Avvia acquisizione audio. **Concedere il permesso non
registra**: devi premere di nuovo avvia. Il rifiuto non impedisce di importare
WAV o usare le altre funzioni. All'apertura dell'applicazione non inizia alcuna
acquisizione.

L'ingresso è AudioRecord/MIC del sistema, PCM mono a 16 bit e 48 kHz.
Android seleziona il dispositivo di ingresso; non c'è selettore dei percorsi,
controllo del volume della radio né garanzia di compatibilità con un adattatore
audio USB. Il cavo CAT non implica il trasporto dell'audio.
Se l'hardware non supporta quel formato, l'apertura fallisce o l'ingresso
scompare, viene mostrato un errore e la risorsa viene rilasciata; non viene
inventato audio. Prova prima un segnale noto e verifica livello, saturazione e percorso.

Avvia prima dell'intestazione Robot36. Servono almeno 37 s e un'immagine completa
con gli stessi limiti di sincronismo dell'importatore WAV. Premi Interrompi e decodifica
al termine del segnale. L'acquisizione termina automaticamente dopo **60 secondi**,
per limite dei campioni e timer; non viene riempita con silenzio. L'audio viene
conservato solo in memoria durante l'operazione. Non viene scritto un WAV né
inviato in rete. L'immagine Robot36 può essere salvata in PNG tramite il selettore
Android; l'audio Morse mostra testo, punti/trattini e un avviso sperimentale.

Annullare e scartare l'audio, uscire, bloccare il telefono, aprire un'altra
attività o ruotare interrompe l'acquisizione quando si perde il primo piano,
rilascia il microfono e scarta il risultato in sospeso. **Non riprende** al ritorno.
L'anteprima dell'immagine non sopravvive alla rotazione. Non esiste un servizio,
registrazione in background, PTT, TX né decodifica continua in streaming:
prima si acquisisce, poi si decodifica. Un risultato sintetico corretto
non convalida la ricezione RF reale né il percorso microfono di un telefono.

## Compilazione

Requisiti: JDK 17, Android SDK 35, Build Tools 35.0.0 e accesso ai
repository ufficiali delle dipendenze durante la prima compilazione.
Il repository non include SDK, JDK, certificati né chiavi debug.

```powershell
$env:JAVA_HOME = 'C:\ruta\jdk-17'
$env:ANDROID_HOME = 'C:\ruta\android-sdk'
.\android\gradlew.bat -p android :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest
```

Il wrapper usa Gradle 8.9 con SHA-256 ufficiale fissato. AGP 8.7.3 e Kotlin
2.0.21 sono fissati. L'applicazione usa le viste Android e SQLite della
piattaforma, senza Compose, Room né backend: riduce le dipendenze di runtime
e permette di verificare prima archiviazione e permessi reali.
Le librerie di runtime sono usb-serial-for-android 3.9.0 e le relative
annotazioni AndroidX, Rhino 1.7.15 e satellite.js 6.0.1 incorporato come asset.
JUnit, Robolectric e AndroidX Test
fanno parte solo dei test.
Le loro licenze non sostituiscono quelle di Android, Gradle o del progetto.

Output:

- `android/app/build/outputs/apk/debug/app-debug.apk`.
- `android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk`.
- Report in `android/app/build/reports/`.

Per distribuire un insieme verificato su Windows, con gli stessi requisiti:

```powershell
.\scripts\build-android.ps1 -OutputDirectory 'C:\ruta\entregas\Android-0.9.0-beta'
```

La destinazione deve essere nuova. Lo script esegue test/lint, verifica le firme
APK e include applicazione, APK strumentata, guida, licenze, `build-info.json`
e `SHA256SUMS`. Il manifest identifica revisione, stato dirty, fonti tramite
hash, capacità e funzioni non disponibili. Dichiara sempre firma debug e test
fisico in sospeso; la compilazione non diventa una versione stabile.

Con telefono/emulatore di test connesso e autorizzato via ADB:

```powershell
.\android\gradlew.bat -p android :app:connectedDebugAndroidTest
```

Usa un dispositivo di test. Ogni test strumentato della persistenza
rimappa `bricohams.db` a un database privato `instrumentation-<UUID>.db`;
non apre né pulisce il log di stazione reale e rimuove solo il proprio database.
L'APK di test non è l'applicazione di uso quotidiano.

## Validazione effettuata e in sospeso

La validazione storica iniziale comprendeva 84 test host: cinque per modelli/ADIF, quattro per importazione
ADIF, tre per audio, otto per archiviazione/interfaccia, otto per protocollo CAT, due per la schermata CAT,
cinque per il codec dei canali, cinque per memoria/backup/scrittura Quansheng e otto
per USB CDC/seriale simulato, quattro per il nucleo Robot36 (incluso andata e ritorno del codificatore), due per la schermata SSTV,
quattro per invio SSTV tramite PTT CAT con radio simulata,
tre per SGP4/TLE, quattro per l'inseguimento, due per la schermata satelliti,
cinque per acquisizione PCM, sei per schermata microfono e sei per statistiche ARDF.
Verificano SQLite dopo chiusura/riapertura, aggiornamento/eliminazione,
esportazione JSON, coordinate nulle/valide, avvio schermate,
salvataggio e ricreazione attività, ordinamento UTC con frazioni e ripristino
JSON idempotente con rollback per conflitti/dati non validi. L'audio sintetico viene confrontato a
8/16/44.1/48 kHz e 5/15/30/45 ppm, incluso silenzio e tono errato.
Non sono misure di errore su registrazioni reali.
ARDF verifica 222.39016 m attraversando la linea del cambiamento di data all'equatore
(tolleranza 0.01 m), ordinamento UTC, medie separate per beacon, sessioni
isolate dopo chiusura/riapertura SQLite e visualizzazione della cronologia.
Vengono testati lacune, precisione, posizioni vecchie/future/ripetute,
registrazioni simultanee e ID duplicati. Non sono misure GPS sul campo.
L'acquisizione verifica esattamente 2880000 campioni per il limite di 60 s,
interruzione manuale senza riempimento, annullamento prima dell'apertura e durante lettura
bloccante, errori espliciti e rilascio. La schermata verifica permesso
senza avvio automatico, decodifica di Morse noto e Robot36 320x240 da
ingresso simulato, recupero dopo errore, timer e annullamento all'uscita
senza ripresa. Non sono test di AudioRecord su hardware reale.

CAT verifica CRC con vettore noto, frame di tutte le lunghezze,
CRC `FFFF` delle risposte upstream, identificazione, rumore/timeout, sequenza
e wrap, bande, annullamento SET e differenza tra accodato/applicato.
CDC verifica permessi, selezione non ambigua, configurazione, scritture
parziali, lettura di un pacchetto in più chiamate, errori e chiusura.
Gli adattatori seriali verificano selezione dei driver tramite VID/PID,
rifiuto di multipporta/sconosciuti, parametri 38400 8N1, lettura parziale,
propagazione degli errori senza ripetere SET e chiusura se la configurazione fallisce.
Il test integrato percorre schermata, identificazione, SET RX e STOP prima
della chiusura quando l'attività viene nascosta, usando un dispositivo simulato.
Canali: lettura di toni, potenza e flag; modifica che cambia solo i byte del canale;
tutti i 50 CTCSS e 104 DCS andata e ritorno; rifiuti senza modificare la
copia. Una radio F4HWN simulata verifica backup completo (CRC della radio,
Main, calibrazione), SHA-256 su disco, ordine di scrittura web, rilettura e
blocchi per impostazioni, radio modificata, v6.0, CRC e blocco rifiutato.
L'audit successivo aggiunge verifiche dei 512 settori CRC,
metadati della risposta errati, lettura fisica non identificata o con
intervalli che causano overflow di un intero, e annullamento di backup/scrittura.
La sessione dell'editor è legata al primo piano e alla sua generazione:
uscire, scollegarsi o invalidarla impedisce il successivo scambio USB e
scarta le attività obsolete non ancora iniziate. Un comando già inviato
potrebbe essere stato applicato; l'annullamento non esegue rollback né rende
atomica una scrittura. Conserva il backup e ripeti identificazione,
lettura e verifica prima di scrivere di nuovo. I test schermata verificano
errori senza USB e cancellazione delle copie di modifica all'uscita,
senza ripresa automatica. Dopo un errore il trasporto viene chiuso ed è
necessaria una nuova connessione, non basta premere di nuovo Backup.
I risultati correnti, separati da main
pubblicato e dai test fisici, sono nella
[matrice di validazione](VALIDACION-INTEGRAL-V3-ANDROID.md).
ADIF verifica andata/ritorno, etichette dentro commenti, intestazione facoltativa,
orari in minuti, campi non conservati, record troncati/non validi e ASCII.
SQLite verifica duplicati e rollback con un effettivo errore di inserimento iniettato.
L'interfaccia prova ricerca dopo rotazione e anteprima con annullamento/accettazione.
SSTV verifica geometria 320x240, temporizzazione iniziale, livelli di grigio a
8/16/48 kHz e barre RGB/CMY a 8 kHz: errore massimo di 12 livelli per canale
nei punti interni di grigio e 15 in quelli di colore verificati.
Vengono rifiutati VIS diverso, parità errata, silenzio, perdita di righe
e campionamenti/durate non supportati. L'interfaccia esporta un PNG che viene
riaperto e verificato come 320x240 e non propone l'esportazione dopo un errore.
Non sono state misurate tassi di errore né qualità su registrazioni reali.
SGP4 confronta un TLE di test fisso con il web: epoca, azimut/elevazione
tolleranza 0.00001 gradi, distanza (1 m), AOS/LOS (500 ms), massimo e
Doppler a passi di 10 Hz. Vengono verificati checksum, anzianità, bande,
finestra, rinnovo senza cambio frequenza, annullamento, orologio discontinuo,
risposta tardiva/in sospeso ed errori USB. Il test combinato applica
il Doppler calcolato a una radio CAT simulata e ripristina la frequenza nominale con STOP.
L'interfaccia importa un catalogo, calcola passaggi offline, invia
l'istantanea selezionata e rifiuta un passaggio scaduto senza SET e chiudendo USB.

L'APK e l'APK strumentata vengono compilate. Lint termina senza errori;
restano avvisi su versioni più recenti di dipendenze di test, forma
dell'icona originale e tipografia. Non vengono soppressi né considerati errori funzionali.

Non c'è un telefono Android connesso né un emulatore eseguito in questa validazione.
I test strumentati sono compilati, **non eseguiti**.
Restano in sospeso installazione, usabilità e permessi su telefono, GPS reale,
percorsi audio reali e tutte le funzioni indicate come non implementate.
