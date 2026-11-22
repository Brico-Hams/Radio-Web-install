# Diagnostico remoto / Remote diagnostics / Diagnostic distant / Ferndiagnose

## ES - Privacy e funzionamento

Il sistema registra **dati tecnici minimizzati**, non telemetria nascosta. L'invio
remoto è disattivato per impostazione predefinita e richiede il consenso e un
ricevitore HTTPS configurato dall'amministratore. Non si presuppone un servizio
centrale di BricoHams.

Il contratto accetta esclusivamente versione del software, componente, piattaforma
generica e fino a 16 eventi con codice, area, gravità, categoria dell'errore e
numero di riga. Non ammette messaggi, valori di eccezioni, percorsi, nomi utente,
token, nominativi, QSO, frequenze, audio, posizione, porte né identificatori del
dispositivo o dell'installazione. I campi aggiuntivi vengono rifiutati: non si
tenta di ripulire testo arbitrario per poi inviarlo.

**Non si promette anonimato assoluto.** Il ricevitore, il suo fornitore o un proxy
possono conoscere IP, credenziale di autorizzazione, ora e metadati di connessione.
L'operatore del ricevitore deve configurare i propri registri e la propria politica
di conservazione.

### Client

- Console di stazione web, Android/tablet e iPhone/iPad: Impostazioni permette di
  rivedere, scaricare, importare, inviare una volta, attivare l'invio automatico in
  primo piano ed eliminare i registri locali. Il consenso automatico non viene
  salvato; disconnettere o riavviare lo disattiva. Si usa l'host HTTPS di quella
  sessione.
- RadiCodex: la scheda di diagnostica permette di rivedere e autorizzare l'invio con
  URL HTTPS e token esclusivo solo in memoria. Invia solo in primo piano; disattivare
  o riavviare impedisce nuovi invii. Una richiesta già avviata potrebbe essere
  arrivata.
- Workspace HTML5: ogni pagina di strumento offre vista JSON, download, eliminazione
  locale e invio manuale tramite il server locale autorizzato. GitHub Pages non
  riceve rapporti: scaricare e importare nel client HTTPS.
- I vecchi rapporti USB dettagliati sono privati e non vengono inviati con questi
  meccanismi. Rivederli separatamente prima di condividerli manualmente.

Il registro nativo e la validazione dell'origine HTTPS risiedono nella libreria
Android `station-core`, riutilizzabile senza dipendenze dall'interfaccia RadiCodex.
Ogni applicazione inizializza il registro con il proprio componente del contratto
chiuso e la propria versione pubblica; tale identità non può cambiare durante la
stessa applicazione. RadiCodex conserva `radicodex` e la propria versione compilata.
L'agente indipendente userà `station-agent`, senza identificatori USB nei rapporti.
Il contratto JSON viene generato dalla stessa definizione Python e impacchettato con
la libreria. Questa estrazione non implementa da sola l'agente OTG né modifica
consenso, limiti, conservazione, validazione TLS o conferma HTTPS di ricezione.

I client JS conservano fino a 128 eventi e RadiCodex fino a 500 voci. La scadenza
logica è di sette giorni, verificata in lettura/scrittura; un dispositivo spento non
esegue una pulizia. Eliminare qui rimuove solo i registri locali: non ritira i
rapporti già ricevuti né garantisce la cancellazione fisica delle copie di backup.
Gli errori di archiviazione e di consegna vengono mostrati; consentire l'invio non
equivale a consegna confermata.

### Ricevitore e agenti Python

Il coordinatore abilita la ricezione con:

```text
bricohams-station-host --diagnostic-report-database <ruta-privada>/reports.sqlite3
```

Aggiungere gli argomenti TLS e di stazione abituali; l'esempio non sostituisce la
configurazione HTTPS. Quando convive con il Workspace locale (porta 8787), usare una
porta diversa per il coordinatore, ad esempio `--port 8443`.

Configurare `BRICOHAM_DIAGNOSTIC_REPORTER_TOKEN` con una credenziale casuale
esclusiva di almeno 32 caratteri. Il ruolo `diagnostic_reporter` può consegnare
rapporti, ma non controlla l'RF né consulta i rapporti. Amministratore/operatore
possono anch'essi consegnare; solo l'amministratore consulta
`GET /api/v1/diagnostic-reports`. La ricezione è disabilitata se non si configura il
database.

Host e agente generano registri locali in `~/.bricohams/diagnostics`, configurabile
con `--diagnostic-directory`. Per autorizzare l'invio a un ricevitore:

```text
--diagnostics-opt-in --diagnostics-url https://diagnostic.example.org
```

Il segreto viene fornito tramite `BRICOHAM_DIAGNOSTICS_TOKEN`, mai in URL, negli
argomenti del rapporto né nel codice sorgente. Non riutilizzare credenziali di
controllo della stazione; l'avvio rifiuta tale riutilizzo negli agenti Python.
`--diagnostics-ca <archivo>` permette di fidarsi di una CA propria senza saltare TLS.
Le code in memoria sono limitate a 128 eventi; in caso di saturazione si notifica lo
scarto dei più vecchi. Il worker non esegue I/O nel percorso di logging RF. I
registri locali sopravvivono al riavvio; la coda remota non è un outbox durevole e
viene ricostruita con eventi nuovi, non con tutto lo storico.

L'archivio ricevente limita a 500 rapporti, consegna gli ultimi 50 all'amministratore
e applica sette giorni di conservazione logica e un limite di pagine SQLite. Non
salva l'IP nel rapporto. L'API limita a 4096 byte per rapporto e 60 consegne al
minuto. In caso di errore HTTPS/conferma si riprova con un'attesa tra 60 e 600
secondi. Solo HTTP 202 con esattamente `{"accepted":true}` conferma la ricezione.

### Workspace Node locale

`npm start` genera uno storico minimizzato locale, separato dalle uscite originali
della console, che possono contenere diagnostica dettagliata e restano private.
Lo storico JSONL mantiene al massimo 128 rapporti e una scadenza logica di sette
giorni. Non viene esposto tramite un'API di lettura pubblica.

Configurare nell'ambiente del processo:

```text
BRICOHAM_DIAGNOSTICS_OPT_IN=1
BRICOHAM_DIAGNOSTICS_URL=https://diagnostic.example.org
BRICOHAM_DIAGNOSTICS_TOKEN=<secreto-exclusivo>
BRICOHAM_DIAGNOSTICS_CA=<archivo-CA-opcional>
```

L'autorizzazione abilita i log tecnici dell'host e l'inoltro di un rapporto del
browser quando si preme Invia. Senza di essa non c'è rete di diagnostica.
Il POST locale richiede origine esatta, JSON chiuso e limite di dimensione. Il
server resta su loopback; non è un proxy di CAT, PTT né firmware remoto.

## EN - Guida utente

L'invio remoto è disattivato per impostazione predefinita. Rivedere il JSON prima di
acconsentire. Sono ammessi solo metadati pubblici del software e categorie di errore
fisse; messaggi, segreti, nominativi, QSO, frequenze, audio, posizione e
identificatori di dispositivo/installazione sono esclusi. HTTPS non nasconde il
proprio IP o i metadati di connessione al ricevitore.

Usare Impostazioni nel client di stazione condiviso, Diagnostica in RadiCodex o il
pannello tecnico in Workspace. Gli utenti di Pages scaricano e importano il JSON nel
client di stazione HTTPS. Il consenso automatico del client vale solo per la sessione
e solo in primo piano. Eliminare i registri locali non richiama i rapporti consegnati
né cancella fisicamente i backup. I registri limitati scadono logicamente dopo sette
giorni, quando l'applicazione è attiva. Le vecchie esportazioni USB dettagliate sono
private e non vengono mai caricate automaticamente.

L'implementazione usa esattamente i flag/le variabili d'ambiente indicati sopra.
Configurare il proprio ricevitore HTTPS, una credenziale diagnostica dedicata, la CA
se necessaria, la conservazione e il logging del proxy. Il ruolo reporter non può
controllare l'hardware radio. Non si presuppongono un collettore pubblico BricoHams,
anonimato assoluto, consegna confermata senza riscontro né validazione fisica
dell'hardware.

## FR - Guida utente

L'invio remoto è disattivato per impostazione predefinita. Esaminare il JSON prima di
acconsentire. Sono ammessi solo i metadati pubblici del software e le categorie di
errore fisse: né messaggi, segreti, nominativi, QSO, frequenze, audio, posizione o
identificatori di dispositivo/installazione. HTTPS non nasconde il proprio IP o i
metadati di connessione al ricevitore.

Usare Impostazioni del client di stazione, Diagnostica di RadiCodex o il pannello
tecnico Workspace. Su Pages, scaricare e poi importare il JSON nel client HTTPS. Il
consenso automatico dei client vale solo per la sessione e il primo piano.
La cancellazione locale non ritira i rapporti ricevuti e non cancella fisicamente i
backup. La conservazione logica di sette giorni viene applicata quando
l'applicazione è attiva. Le vecchie esportazioni USB dettagliate restano private.

L'implementazione usa esattamente le opzioni e le variabili indicate sopra.
Configurare il proprio ricevitore HTTPS, un segreto di diagnostica esclusivo, la CA
se necessaria, la conservazione e i log del proxy. Il ruolo reporter non controlla la
radio. Non si presuppongono un collettore pubblico BricoHams, anonimato assoluto o
validazione hardware.

## DE - Guida utente

L'invio remoto è disattivato per impostazione predefinita. Controllare il JSON prima
del consenso. Sono ammessi solo metadati pubblici del software e categorie di errore
fisse: niente messaggi, segreti, nominativi, QSO, frequenze, audio, posizioni o
identificatori di dispositivo e installazione. HTTPS non nasconde IP e metadati di
connessione al ricevitore.

Usare le impostazioni del client di stazione, la diagnostica di RadiCodex o il
pannello tecnico di Workspace. Su Pages scaricare il JSON e importarlo nel client
HTTPS. Il consenso automatico del client vale solo per la sessione in primo piano.
L'eliminazione locale non richiama i rapporti inviati e non cancella fisicamente i
backup. I registri limitati scadono logicamente dopo sette giorni con applicazione
attiva. Le vecchie esportazioni USB dettagliate restano private e non vengono mai
inviate automaticamente.

L'implementazione usa le opzioni e le variabili d'ambiente indicate sopra. Configurare
il proprio ricevitore HTTPS, un segreto di diagnostica esclusivo, eventualmente la CA,
la conservazione e i log del proxy. Il reporter non può controllare hardware radio.
Non si presuppongono un ricevitore pubblico BricoHams, anonimato assoluto o
validazione hardware.

## PT - Guida utente

L'invio remoto è disattivato per impostazione predefinita. Rivedere il JSON prima di
autorizzare. Sono ammessi solo metadati pubblici del software e categorie fisse di
errori: nessun messaggio, segreto, nominativo, QSO, frequenza, audio, posizione o
identificatore del dispositivo/installazione. HTTPS non nasconde l'IP o i metadati di
connessione al ricevitore.

Usare Impostazioni del client di stazione, Diagnostica di RadiCodex o il pannello
tecnico Workspace. Su Pages scaricare e importare il JSON nel client HTTPS.
Il consenso automatico del client vale solo durante la sessione in primo piano.
Eliminare i registri locali non ritira i rapporti inviati né cancella fisicamente le
copie di backup. I registri limitati scadono logicamente dopo sette giorni quando
l'applicazione è attiva. Le vecchie esportazioni USB dettagliate restano private.

Usare le opzioni e le variabili indicate sopra per configurare un ricevitore HTTPS
proprio, un segreto esclusivo, una CA opzionale, la conservazione e i log del proxy.
Il ruolo reporter non controlla la radio. Non si presuppongono un ricevitore pubblico
BricoHams, anonimato assoluto o validazione fisica dell'hardware.
