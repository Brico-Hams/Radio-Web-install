<img src="bricohams-logo.png" alt="Bricohams" width="240" height="89">

<p><a href="README.md">Español</a> · <a href="README.en.md">English (US)</a> · <a href="README.de.md">Deutsch</a> · <a href="README.it.md">Italiano</a> · <a href="README.fr.md">Français</a></p>

# Bricohams Radio Workspace

Due ambienti con connettori proprietari WebUSB/Web Serial, operazioni locali e backup automatico prima di abilitare le scritture.

## Organizzazione e prove di distribuzione

- [docs/](docs) contiene la documentazione originale, [docs/i18n/](docs/i18n)
  le traduzioni. La [guida Android/F-Droid](docs/FDROID.md) collega le quattro lingue.
- [android/](android) contiene l'app nativa e i test;
  [installers/](installers) contiene gli script di installazione per sistema.
- [fdroid/](fdroid) contiene la ricetta candidata;
  [fastlane/](fastlane) contiene le schede multilingue del negozio.
- [scripts/](scripts) e [.github/workflows/](.github/workflows) contengono
  strumenti e automazione. I pacchetti generati vanno in `dist/installers/`,
  non nel codice versionato; i download sono pubblicati in
  [GitHub Releases](https://github.com/Brico-Hams/Radio-Web-install/releases).
- I percorsi web pubblici restano stabili per collegamenti, installatori e
  connettori. Nessun file storico o backup viene eliminato.

Per provare una versione, scaricare il pacchetto della propria architettura e
`SHA256SUMS`, verificarne l'integrità e seguire [Distribuzione](docs/i18n/it/DEPLOYMENT.md).
Sono disponibili pacchetti Debian/Ubuntu e Raspberry Pi, ricetta Arch Linux,
installatore FreeBSD e ZIP Windows x64, non pacchetti macOS o app firmate da
un negozio. Iniziare senza radio: lingua, tema, navigazione e mappa.
Poi provare la lettura con hardware compatibile e backup precedente; non
scrivere o trasmettere per verificare l'installazione. La generazione dei
pacchetti non certifica prove su ogni sistema fisico.

## Quansheng: catalogo precompilato, visualizzatore e registro RF

- Nove immagini v6.1.0 distribuite con il sito: Bricohams ARDF, Satellite,
  Spectrum, Labs e Fusion, oltre a F4HWN ufficiale Fusion, FieldOps, Transfer e Labs.
  Non occorre compilare né scegliere una cartella. Prima di preparare uno slot vengono verificati SHA-256, dimensioni
  e struttura; l’installazione richiede comunque un backup.
- Visualizzatore LCD all’avvio, apertura automatica alla connessione, pausa prima di
  qualsiasi operazione e acquisizione PNG. La porta viene condivisa senza due lettori.
- Tastiera remota breve/lunga, senza PTT, con backup completo,
  abilitazione manuale e conferma per tasto. F1/F2 possono eseguire funzioni di trasmissione
  a seconda della radio; l’invio UART non equivale a un’esecuzione confermata.
- Riavvio nativo con conferma letterale, senza nuovi tentativi né cambio di slot;
  chiude la porta e revoca i permessi. Verificare manualmente l’avvio.
- Registro RF v2 in fondo con cronologia ed esportazione CSV sicura. Solo dati
  ricevuti dal firmware; non vengono inventate date UTC né misurazioni calibrate.
- Catalogo di sei app Labs upstream v6.1.0 con SHA-256, FAP1 e ABI/API
  verificati: preparare o scaricare non installa né esegue. Include SystemInfo,
  BroadcastFM e quattro giochi/demo; non beacon né app di soccorso.
- Manutenzione nativa: logo PNG/BIN, backup/ripristino della calibrazione e della Flash
  esterna, con rilettura e protezione del settore di calibrazione.
- Assistente nativo di fabbrica in due passaggi: Flash stock verificata e DFU
  per modello, con backup completo e conferme esplicite. Le immagini stock vengono scaricate da collegamenti ufficiali fissati e convalidate tramite SHA-256.
  Testato in simulazione; non è stato eseguito il ripristino di fabbrica dell’unità fisica.
- Pannello di strumenti propri con accessi interni, senza delegare operazioni
  a UV Studio: DFU principale v6/v7, manutenzione, app, slot e RF.
- DFU principale PY32: BIN v6 o pacchetto v7 FWAT/FWA1, con backup e due
  conferme. Non sincronizza Main esterno né certifica l’avvio.
- Risorse esterne v7: CRC e Build ID devono corrispondere al firmware
  attivo; intestazione in coda e convalida del firmware. Si installano separatamente
  dopo il DFU e la creazione di un nuovo backup. Supporto testato in simulazione.
- Filtri RF locali per nome/frequenza/evento ed esportazione CSV/JSON,
  senza inventare l’ora UTC degli eventi né misurazioni RF calibrate.
- I quattro slot Bricohams dell’unità di test sono stati registrati il
  26-10-2026, con CRC e conservazione di Main/configurazione/calibrazione.
  L’avvio e i test funzionali manuali per slot sono ancora da completare.
  Il visualizzatore ha ricevuto 24 frame LCD e uno RF tramite COM4 con DTR attivo;
  non è stata ricevuta la cronologia RF archiviata.

Catalogo e licenze in `precompiled/`; rigenerazione a cura del manutentore:
`npm run publish:firmware`. Richiede le cinque compilazioni locali fissate
e l’accesso alla pubblicazione ufficiale, non è un requisito per l’utente finale.
Istruzioni e limiti nella [guida Quansheng](docs/i18n/it/AYUDA-QUANSHENG.md).

## AnyTone Beta: preparazione web

La nuova [sezione AnyTone](anytone.html) prepara un **progetto portatile**, non un
RDT proprietario né un CSV certificato per una versione specifica di CPS.
Non implementa la programmazione USB né modifica la radio.

- Base iniziale: gli stessi 16 canali PMR446 delle altre famiglie, solo RX.
- Importa binari OpenGD77 standard da 128 KiB e configurazioni Quansheng
  F4HWN v6. Mantiene le frequenze RX/TX nominali; CC/TS e il TG di contatto di gruppo noto
  in OpenGD77. Esclude le modalità Quansheng non FM, senza confondere AM e DMR.
- Importa JSON autorizzati di RepeaterBook, riutilizza il normalizzatore esistente
  per FM/DMR e filtra la Spagna. Non è incluso un elenco nazionale verificato.
  TS/TG non pubblicati restano da definire: non vengono mai dedotti dalla frequenza.
- Supporta anche il registro RadioID `rptrs`: Spagna, stato ACTIVE,
  offset e CC validi. Usa TS/TG pubblicati; se sono pubblicati solo i TS,
  TG0 resta da definire. ACTIVE è uno stato del registro, non una prova RF.
- Supporta l’elenco JSON URE `items` dei ripetitori (non dei beacon): converte
  solo modalità FM e frequenze/offset con unità esplicite.
  Mantiene il subtono pubblicato come nota senza attivarlo. URE avverte che
  l’elenco può contenere dati non aggiornati; verificare con il titolare.
- Modifica ed elimina canali, organizza etichette di zona ed esporta JSON riapribili
  e CSV di interscambio. Tutti i canali restano bloccati per TX.
- I profili D868/D878/D578 sono raggruppamenti per preparare i dati, non una
  certificazione delle varianti o dei limiti. AM aeronautica è abilitata solo con il profilo
  Altro e conferma manuale del supporto AM della radio esatta.
- Aeroporti: JSON `{"results":[{"name":"SERVICIO","frequencyMHz":"123.45000",
  "source":"Referencia AIP vigente"}]}`. È un esempio di formato, non un’assegnazione aeroportuale. Usa frequenze RF, non designatori di canale 8.33,
  e confronta ogni servizio con [AIP ENAIRE](https://aip.enaire.es/).
- Esporta prima di uscire; non c’è salvataggio automatico. Non pubblicare i progetti
  della propria unità. Toni, contatti privati/liste RX, ID DMR, limiti per modello
e impostazioni proprietarie richiedono una verifica nel CPS corretto.

Per produrre un codeplug nazionale nativo servono il modello/firmware esatti e
fonti autorizzate e aggiornate di ripetitori e aeroporti. Non vengono inventate
frequenze né dichiarata completa una copertura di ripetitori vuota.
## Firmware proprietario: immagini ARDF, Satellite e Spectrum Beta

Il builder supporta `--module ardf` per includere un nucleo proprietario con cicli
e un adattatore tastiera/schermo in Fox Hunt residente su F4HWN v6.1.0
Multiboot. La nuova immagine ARDF registra osservazioni manuali con 8
(contatore, primo/ultimo istante relativo e attenuazione per beacon) e permette di
consultare/esportare JSON via USB/UART dal web, senza GPS né localizzazione
automatica. Mantiene in RAM l’ultima sessione all’uscita; viene cancellata al riavvio
o alla riconfigurazione. Una seconda immagine, `--module satellite`, applica Doppler manuale
solo a RX, con velocità radiale regolabile, visualizzazione della frequenza corretta
e uscita tramite il flusso di ripristino RF upstream. Non include TLE/SGP4 né
tracciamento orbitale autonomo. La nuova immagine Satellite include CAT RX
sperimentale proprietario, abilitato con 8 in SAT RX, con lease di 3 secondi
e pannello web per consultazione/sintonia temporanea. Non controlla TX né modifica
canali, toni o potenza. La radio non calcola orbite autonomamente.
Il browser consente già il tracciamento RX del passaggio selezionato con SGP4 e
rinnovo CAT, con arresto manuale/nascondendo la pagina e al termine del
passaggio. Richiede abilitazione fisica ed è stato testato con trasporto simulato,
non in RF. Non avvia automaticamente passaggi futuri né carica TLE nel MCU.
Il builder richiede immagini separate.
Non è Karina né equivale al 100 %. Le immagini attuali misurano
113960 byte (ARDF con statistiche) e 113868 byte (Satellite con CAT);
entrambe sono state registrate negli slot e verificate tramite CRC, con avvio manuale ancora da eseguire;
otto suite C native verificano nuclei e adattatori con RF simulata.
La terza immagine, `--module spectrum`, collega il nucleo proprietario al ricevitore
e allo schermo: 128 punti RSSI, peak hold, media, pausa e otto preset RAM.
I preset non persistono all’uscita/spegnimento e non scrivono EEPROM.
PTT acquisisce il punto misurato più forte in una vista VFO-PRO RX proprietaria,
con sintonia per passo, inserimento diretto RX, audio e regolazione del guadagno RX;
non trasmette né modifica la calibrazione. Permette di centrare nuove finestre e
scorrere in modo circolare i preset RAM, con fino a 16 esclusioni esatte
di sessione e ricerca CTCSS/DCS opzionale in cattura FM, senza salvare i toni.
L’immagine precompilata con bootlogo e trasferimento dei preset misura 118040 byte. Consente
di conservare i preset in file BHSP locali e ripristinarli in RAM con la scansione in pausa,
convalida atomica e rilettura; non scrive EEPROM.
Il rilevamento reale deve ancora essere convalidato. Le nuove build includono
messaggio di benvenuto Beta e logo monocromatico incorporato nella modalità LOGO, senza sovrascrivere il logo esterno
né modificare le preferenze di accensione.
Vedere [compilazione, controlli, licenze e limiti](docs/i18n/it/BRICOHAMS-FIRMWARE.md#nuovo-nucleo-ardf-originale).

**BETA - in convalida e test.** La **Modalità PRO**, attivata espressamente per questa sessione, evita conferme ripetute alla pressione delle operazioni, ma non elimina permessi USB, backup completo, controlli hardware/firmware, hash, CRC, rilettura né protezione di Main. Non abilita scritture con copie parziali.

**Test reale UV-K5 V3 (modello dichiarato), F4HWN v6.0.0:** identificazione, calibrazione, configurazione con 200 canali e consultazione di cinque slot corrette su COM4; calibrazione/configurazione coincidono in due letture indipendenti. Il comando Flash fisica non risponde in v6.0. Il backup automatico di questa versione è corretto per mantenere l’accesso in sola lettura e salvare una copia parziale, invece di invalidare la connessione tentando un comando non disponibile. Non sono stati scritti/cancellati dati fisici. Dettagli e procedura nella [guida Quansheng](docs/i18n/it/AYUDA-QUANSHENG.md).

## Documentazione

[Indice completo della documentazione e dei riferimenti per lingua](ayuda-referencias.it.html).

### Android Bricohams Beta

L’APK nativa 0.9.0-beta include contatti locali modificabili con ricerca e importazione ADIF con anteprima, esportazione
ADIF/JSON, sessioni ARDF con cronologia, statistiche, segmenti GPS filtrati e osservazioni GPS puntuali, e Morse da testo
e WAV PCM sperimentale. Integra CAT RX temporaneo tramite USB CDC ACM e
adattatori riconosciuti CH34x/CP210x/FTDI/Prolific. Calcola i passaggi SGP4 offline
con TLE importati e consente il tracciamento Doppler RX del passaggio selezionato.
Acquisisce l’audio del microfono in primo piano per un massimo di 60 s per decodificare poi Morse
o Robot36; non è decodifica continua. Include l’editor canali F4HWN v6 con backup completo verificato e rilettura,
ma non il caricamento LoTW. Decodifica SSTV Robot36 sperimentale da WAV ed esporta PNG.
Compila per Android 8.0+;
i test host non sostituiscono le prove sul telefono.
Consulta [funzioni, permessi, compilazione e limiti](docs/i18n/it/ANDROID.md).

VersionCode 12 conserva i libri 0.8.0 (Generale/POTA/SOTA), inserimento rapido, conferma duplicati, selezione satelliti, radar polare, mappa mondiale offline, registrazione WAV del passaggio e ricerca SSTV. Gli aggiornamenti CelesTrak/SatNOGS opzionali avvengono all'apertura, ogni 24 h. La mappa appare senza permesso GPS o osservatore; i passaggi richiedono la posizione salvata. I TLE validi conservati funzionano offline e la selezione resta salvata. Controlli e validazione sono tradotti. Test host, lint e APK 0.8.3 verificati in CI con JDK 17/SDK 35; installazione e permessi su telefono fisico restano da provare.

| Documento | Contenuto |
| --- | --- |
| [Stato della consegna](docs/i18n/it/ESTADO-ENTREGA.md) | Revisione di tutte le richieste, evidenze, attività ancora da fare e condizioni di pubblicazione ed esportazione |
| [Guida e supporto](ayuda.html) (nell’app: <http://127.0.0.1:8787/ayuda.html>) | Primi passi, driver USB (supporto non ufficiale), errori frequenti e domande frequenti |
| [Libreria firmware completa](ayuda-firmwares.it.html) / [indice Markdown](docs/i18n/it/AYUDA-FIRMWARES.md) | Guide per famiglia, modello, revisione e versione: F4HWN, ARDF, Karina, Bricohams e OpenGD77; menu, configurazione FM/DMR e tutte le opzioni del catalogo con matrice ON/OFF. Inclusa offline negli installer e nel server locale. Rigenerare con `npm run build:help`. |
| [Quansheng da 0 a 100 %](docs/i18n/it/AYUDA-QUANSHENG.md#avvio-da-0-al-100-) | Percorso completo per fasi: identificazione, backup, scelta e flash del firmware, impostazioni di base, canali, scansione, multiboot, verifica e ripristino |
| [Atlante tecnico UV-K5 V3 / UV-K1](docs/i18n/it/ATLAS-UV-K5-V3.md) (web: [ayuda-atlas-uv-k5-v3.html](ayuda-atlas-uv-k5-v3.it.html)) | Hardware interno: pinout PY32F071, flash interna ed esterna, mappa EEPROM, protocollo seriale, bootloader DFU, SWD, compilazione, modifiche, schemi, foto del teardown e repository verificati |
| [Baofeng DM-32UV](docs/i18n/it/DM32UV-FIRMWARE.md) (web: [ayuda-dm32uv.html](ayuda-dm32uv.it.html)) | Hardware HR_C7000/FD6818, stato e licenza di OpenGD77 sul DM-32, installazione e backup, compilazione del firmware aperto RadioFoundry e protocollo del bootloader |
| [Karina](docs/i18n/it/KARINA.md) / [repository della comunità](docs/i18n/it/ENLACES-COMUNIDAD.md) | Ricerca del codice sorgente Karina (chiuso), specifica funzionale per reimplementarlo e catalogo verificato dei repository Quansheng e DM-32UV |
| [Esempi](docs/i18n/it/EJEMPLOS.md) / [hash di terzi](docs/i18n/it/BINARIOS-TERCEROS.md) | `examples/`: firmware aperti (F4HWN v6.3.0, moto) con licenza, canali PMR446 e script di analisi; indice SHA-256 e origine dei binari di terzi, che non vengono ridistribuiti |
| [docs/ARCHITECTURE.md](docs/i18n/it/ARCHITECTURE.md) | Componenti, flusso dei dati, moduli e livelli di sicurezza |
| [docs/DECISIONS.md](docs/i18n/it/DECISIONS.md) | Decisioni architetturali e motivi della scelta di ogni tecnologia |
| [docs/DEPLOYMENT.md](docs/i18n/it/DEPLOYMENT.md) | Installazione, configurazione, aggiornamento e distribuzioni non supportate |
| [docs/BRANDING.md](docs/i18n/it/BRANDING.md) | Marchio Bricohams: logo, palette, tipografia e tono |
| [AUTHORS.md](AUTHORS.md) | Autori (originale spagnolo) |
| [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.md) | Riconoscimenti, fonti e licenze di terzi (originale spagnolo) |
| [SUPPORT.md](SUPPORT.md) / [SECURITY.md](SECURITY.md) | Supporto e segnalazione privata di vulnerabilità (originali spagnoli) |
## Avvio

### Provider nella versione installata

- **Ripetitori > Configura API RepeaterBook**: inserisci il token `rbuapp_`,
  User-Agent approvato con contatto e conferma l’approvazione. Si applica solo alla
  memoria del server fino al suo riavvio. Il token non viene restituito né
  salvato nel browser. Le variabili d’ambiente esistenti restano un’altra modalità
  di configurazione persistente. Non inserire mai token negli URL.
- **Contatti DMR > Download automatico DMR**: scarica e importa nel codeplug
  locale aperto un lotto RadioID da 1-10 pagine, limitato a 1024 contatti.
  Regola paese/regione per non superare la capacità; se una pagina fallisce non viene
  importata parzialmente. Non è una banca dati massiva di nominativi.
- **Sale/gruppi BrandMeister**: consulta l’elenco pubblico per prefisso TG
  (`214` per la Spagna). Vengono importati come chiamate di gruppo, non contatti
  privati, con nome `TG` seguito dal numero. Non attiva sottoscrizioni dell’hotspot
  né assegna gruppi ai canali. Non integra DMR+/TGIF né sale di altre reti.
- **Quansheng > SAT / passaggi**: aggiorna i TLE, consulta una frequenza FM,
  calcola il passaggio e prepara le memorie Doppler. Seleziona un modello FM
  della configurazione letta e premi **Carica SAT / Doppler preparati nella
  configurazione Quansheng**. Sono memorie RX a passi, non caricamento orbitale
  nativo né controllo del modulo Doppler del firmware. Salva il binario;
  la scrittura richiede comunque un backup completo.

Automatico significa eseguire il lotto quando si preme il pulsante, non download silenziosi all’avvio né
sincronizzazione periodica. RadioID e l’API autenticata RepeaterBook
richiedono il server installato. BrandMeister consente anche la consultazione diretta
su Pages; RepeaterBook permette di importare JSON autorizzati senza installare nulla.

Richiede Node.js 22+. L’unica dipendenza runtime è `satellite.js` 6.0.1 (MIT), per la propagazione orbitale SGP4; viene servita dal computer, non da un CDN. In una nuova copia del repository:

```powershell
npm ci --ignore-scripts
npm start
```

Apri <http://127.0.0.1:8787>. Usa sempre la stessa origine per conservare la cronologia IndexedDB. Si consigliano Chrome o Edge desktop. Aprire i file HTML permette di consultare le guide, ma l’archiviazione e le API possono variare a seconda del browser. Il download automatico del firmware richiede questo server Node locale; su hosting statico si usa la modalità web (vedi sotto). Il server rifiuta altri Host/origini: per pubblicarlo occorre adattare deliberatamente la distribuzione HTTPS e i relativi controlli di accesso.

## Modalità web (GitHub Pages) e modalità locale

La stessa applicazione può essere usata in due modi. All’avvio legge `runtime.json`: se manca o non è valido, funziona in **modalità web**; il server locale la serve con `{"mode":"local"}`. Il badge superiore mostra «Web · GitHub Pages» o «Local · installato».

| Funzione | Web (sito statico) | Locale (`npm start`) |
| --- | --- | --- |
| Connessione alla radio, backup parziali, modifica offline | Sì; OpenGD77 blocca i processi successivi senza una copia integrale del firmware | Uguale |
| Firmware F4HWN | Catalogo da `api.github.com`; scarica il file dalla fonte ufficiale e caricalo: vengono verificati dimensioni e SHA-256 pubblicato | Download verificato dal server |
| Firmware OpenGD77 | ZIP caricato manualmente (nome e formato ZIP controllati; l’editor non pubblica hash, SHA-256 solo locale) | Download tramite server |
| Contatti RadioID | Carica `user.csv` da radioid.net (max. 100 MiB, filtro per paese/zona, max. 5000 visualizzati) | Consultazione API tramite server |
| Profilo (nominativo + ID DMR) | Facoltativo, solo nel browser; indicato con «(tu)» | Non applicabile |
| RepeaterBook | Importazione di JSON autorizzati; nessuna consultazione autenticata | Sì, con il tuo token approvato |
| Gruppi BrandMeister | Consultazione diretta per prefisso e importazione nel file locale | Consultazione tramite server |
| Satelliti | `data/satellites.json` generato ogni giorno da SatNOGS | TLE in tempo reale |

I dati satellitari coprono NORAD 25544, 27607, 43017 e 43678 (SatNOGS DB / Libre Space Foundation, CC BY-SA 4.0); viene mostrato un avviso se hanno più di 7 giorni. Per pubblicare la propria copia su GitHub Pages, vedere [docs/DEPLOYMENT.md](docs/i18n/it/DEPLOYMENT.md).

**Verifica CPS OpenGD77:** la relativa pagina include una matrice visibile di capacità e limiti. Non si dichiara parità completa né backup automatico integrale del
firmware MCU. La connessione avvia automaticamente la calibrazione e il codeplug, salva
il backup e i relativi hash e apre il codeplug per lavorare offline. Finché manca
il firmware originale, le successive operazioni radio sono bloccate, incluse
nuova lettura e acquisizione, anche in PRO. Un’immagine ufficiale scaricata non è un
backup dell’unità né recupera il firmware commerciale già sostituito.
Vedere [ambito web e backup obbligatorio](docs/i18n/it/AYUDA-OPENGD77.md).

### Installer locali

Scarica l’[ultima Release](https://github.com/Brico-Hams/Radio-Web-install/releases/latest) e il relativo file `SHA256SUMS`. Scegli un installer dagli **Assets**, non gli ZIP/tar.gz automatici di «Source code». [Guida completa all’installazione locale](docs/i18n/it/DEPLOYMENT.md#installer-locali).
Dopo l’installazione, per preparare una Quansheng segui la [messa in servizio da 0 a 100 %](docs/i18n/it/AYUDA-QUANSHENG.md#avvio-da-0-al-100-)
e consulta l’[atlante tecnico UV-K5 V3](docs/i18n/it/ATLAS-UV-K5-V3.md).

- Windows 11 x64: estrai tutto `*-windows-x64.zip`, apri PowerShell in quella cartella ed esegui `powershell -NoProfile -ExecutionPolicy Bypass -File .\Install.ps1`. Node.js incluso, senza privilegi di amministratore; avvia l’app dal menu Start.
- Debian, Ubuntu e Raspberry Pi OS: esegui `dpkg --print-architecture`, scarica **solo** il `.deb` per la tua architettura (amd64, arm64 o armhf) ed esegui `sudo apt install ./nombre-del-paquete.deb`. Node.js incluso; armhf richiede CPU ARMv7 o successiva. Apri l’app dal menu oppure esegui `bricohams-radio`.
- Arch Linux: installa `base-devel` e `nodejs` con pacman, estrai `*-arch.tar.gz`, controlla `PKGBUILD` ed esegui `makepkg -si` come utente normale. Avvia con `bricohams-radio`.
- FreeBSD 14 amd64: estrai `*-freebsd-amd64.tar.gz`, entra nella cartella ed esegui `su -c './install.sh'` (installa Node 22 con `pkg` se manca). Avvia `bricohams-radio` come utente normale.

Tutti gli installer includono **Bricohams Quansheng Studio** (UV-K1 / UV-K5 V3 con F4HWN Fusion 6), dal repository [Brico-Hams/Bricohams-Studio](https://github.com/Brico-Hams/Bricohams-Studio). Si apre su <http://127.0.0.1:8787/studio.html> o dall’ambiente Quansheng. La copia viene scaricata durante il packaging, al commit e con SHA-256 fissati in `studio.lock.json`, e il server la ricontrolla prima di servirla. Viene servita con una CSP dedicata che ammette solo i suoi script tramite hash e le impedisce di connettersi alla rete. Dal codice sorgente, esegui una volta `npm run fetch:studio`. In modalità web, il collegamento porta alla [pagina pubblica di Studio](https://brico-hams.github.io/Bricohams-Studio/).

Verifica lo SHA-256 prima dell’installazione. I launcher aprono il browser predefinito e mantengono il server in background solo su `127.0.0.1:8787`. Se il browser predefinito non è compatibile, apri quell’indirizzo in Chrome, Edge o Brave. Chiudere la scheda non arresta il server; non c’è avvio automatico dopo il riavvio del computer. Usa sempre lo stesso browser, profilo e origine per conservare i backup. I driver USB si configurano separatamente: [Guida](ayuda.html#drivers). Su FreeBSD il supporto WebUSB/Web Serial di Chromium non è garantito.
## Stato effettivo del supporto

| Famiglia | Lettura effettiva | Modifiche | Limiti |
| --- | --- | --- | --- |
| OpenGD77 MK22 | Identificazione, calibrazione 4096 B, codeplug standard 128 KiB | Implementazione della scrittura CPS inclusa, **bloccata dalla politica di backup** | Qui non esiste un protocollo verificato per estrarre l’intero firmware MCU. La copia non viene simulata né sbloccata con un firmware scaricato. |
| OpenGD77 STM32 | Identificazione, calibrazione 512 B, codeplug standard 128 KiB | Uguale: scrittura bloccata | Modalità CDC OpenGD77 normale, non DFU. Le strutture sconosciute vengono rifiutate. |
| DM-32 / UV008 con OpenGD77 | Le stesse operazioni a 115200 baud con Web Serial | Uguale: scrittura bloccata | Nessuna boot ROM, microcodice né flash del firmware stock. |
| Quansheng UV-K1 / UV-K5 V3 PY32F071 con F4HWN v6+ | Identificazione, calibrazione 512 B, consultazione slot e CRC | Installazione/cancellazione slot 1-4 e ripristino banchi 1-4, **solo dopo backup completo verificato** | Il backup della Flash fisica richiede Labs v6.1+ con comandi 0x0738. Nelle altre edizioni si conserva la calibrazione e si bloccano le scritture se il backup non può essere completato. |

Non c’è piena parità con grid.radio né UV Studio. Visualizzatore, tastiera e riavvio Quansheng, ripristino di calibrazione/Flash, DFU stock, DFU principale e risorse esterne hanno implementazioni native indipendenti. DFU stock è vincolato a hash/modelli; quello principale convalida BIN v6 PY32 o pacchetto v7 FWAT/FWA1 e non sincronizza Main esterno. Le risorse v7 vengono installate separatamente con un nuovo backup e Build ID corrispondente; non c’è installazione automatica né supporto per risorse in slot inattivi. Apps Labs consente catalogazione, esportazione, installazione, spostamento in uno spazio vuoto e cancellazione singola/globale con verifica. Le app non vengono eseguite automaticamente, né sono implementate gestione account o modifica zone. La gestione dei file `.app` è descritta più avanti. Il cambio firmware in Multiboot o la selezione di SetCfg si eseguono dalla radio; non è stato inventato un comando remoto. Restano valide le licenze dei binari di terzi: codice indipendente non equivale a garanzia di assenza di rischi legali.

## Codeplug: contatti, ripetitori e satelliti

Entrambe le pagine includono un pannello **Codeplug: contatti, ripetitori e SAT**. All’apertura non viene consultato alcun provider. Le consultazioni sono azioni esplicite e passano dal server locale; i codeplug, la calibrazione e gli identificatori della radio non vengono inviati.

### Contatti RadioID / OpenGD77

1. Apri nell’editor un codeplug standard da 128 KiB o leggilo dalla radio.
2. Seleziona **Contatti DMR**, inserisci il paese nella lingua del provider (ad es. `Spain`) e, facoltativamente, lo stato/provincia (`Madrid`).
3. Cerca nell’[API RadioID](https://radioid.net/api/dmr/user/). Viene caricata una pagina per azione; i pulsanti precedente/successivo percorrono tutte le pagine disponibili. Il filtro testuale agisce solo sulla pagina visibile, non sull’intero database.
4. Seleziona i contatti delle pagine necessarie e aggiungili al file locale. La selezione viene mantenuta passando da una pagina all’altra; il contatore include tutte le pagine selezionate.
5. Salva il binario modificato con **Salva binario 128 KiB**. Facoltativamente, salva la selezione dei contatti in JSON.

Vengono aggiunti **contatti digitali privati** per nominativo/ID (capacità totale: 1024), non il database massivo di identificazione chiamate né i talkgroup. Gli ID privati già presenti vengono deduplicati, gli indici dei contatti esistenti vengono rispettati e non viene sovrascritto nulla. Errori o spazio insufficiente annullano il lotto senza modificare il file originale. I nomi sono limitati al formato ASCII del codeplug. Quansheng non supporta contatti DMR.

### Ripetitori RepeaterBook

Fonte: [API ufficiale e criteri di accesso](https://www.repeaterbook.com/wiki/doku.php?id=api). **Data courtesy of RepeaterBook.com.**

Da marzo 2026 non è un’API aperta: richiede l’approvazione di **questa applicazione** e un token individuale associato alle applicazioni distribuite. Un token di un’altra applicazione non autorizza questa. Non viene effettuato scraping, i record RepeaterBook non sono inclusi nel repository e il database non viene scaricato senza permesso. Questa integrazione è per programmazione personale/autorizzata, non per creare un elenco alternativo né ridistribuire dati.

Se RepeaterBook approva l’uso di questa applicazione, configura queste variabili nello stesso PowerShell in cui avvii il server:

```powershell
$env:RB_APPROVED = "yes"
$env:RB_USER_TOKEN = "<tu token individual rbuapp_ asociado a esta aplicacion>"
$env:RB_APPROVED_USER_AGENT = "<el User-Agent aprobado con nombre/version y correo real de contacto>"
npm start
```

Non incollare il token in chat, nel browser, in un URL, in un commit o in un file pubblico. Il programma non legge `.env`; se scegli di salvare le variabili autonomamente, proteggi quel file. Questa distribuzione non accetta token condivisi `app_`. Una variabile di approvazione esprime solo la tua configurazione: il provider convalida l’autorizzazione effettiva. In caso di HTTP 429 non vengono eseguiti tentativi automatici e viene applicato un periodo di attesa minimo di 15 minuti.

Nell’interfaccia puoi cercare per paese/zona e modalità (FM; anche DMR in OpenGD77), oppure aprire un JSON di esportazione RepeaterBook che sei autorizzato a usare (`results`, fino a 8 MiB). Stati Uniti, Canada e Messico richiedono l’ID RepeaterBook di stato/provincia. Il filtro di zona, testo e banda viene applicato ai risultati visibili; i record senza conferma della modalità, fuori intervallo, non operativi o corrotti vengono esclusi **con conteggio ed esempi dei motivi**.

- **OpenGD77:** scegli un modello esistente della stessa modalità del lotto e aggiungi i canali alle posizioni libere. Non vengono creati valori binari arbitrari né riordinati canali. Sono importati nome, RX/TX nominali e Color Code quando pertinente; le altre impostazioni provengono dal modello. **Tutti i nuovi canali sono solo RX e non ereditano toni RX/TX.** DMR mantiene TS/contatto/elenco RX del modello: non si inventano talkgroup né TS del ripetitore. Verifica quei parametri nel CPS prima di abilitare TX. Salva il binario locale.
- **Quansheng:** solo FM; legge/apre la configurazione logica F4HWN v6 da 41344 byte e consente di aggiungere canali usando un modello o cancellare memorie dal file locale. Include i canali analogici PMR446 1-16 solo RX; ripetitori/SAT si preparano dai provider. L’invio Beta richiede backup completo della Flash e rilettura; v6.0 non può abilitarlo. Esporta anche CSV CHIRP con `Duplex=off` (TX disattivata): è interscambio, non un codeplug pronto all’uso.
- Si preparano solo frequenze VHF 136-174 e UHF 400-470 MHz. Seleziona la banda effettiva della tua unità: le radio monobanda, le diverse revisioni e le restrizioni regionali possono supportare un intervallo minore. Non è promessa la compatibilità universale.

### SAT e prossimi passaggi

1. Seleziona **SAT / passaggi**, inserisci un NORAD e il provider orbitale: [SatNOGS DB](https://db.satnogs.org/) o [CelesTrak](https://celestrak.org/NORAD/elements/).
2. **Aggiorna elementi orbitali** scarica il TLE più recente disponibile. Vengono verificati checksum, NORAD, epoca e propagazione. Sono rifiutati gli elementi più vecchi di sette giorni, con più di 24 h nel futuro o la cui finestra di previsione superi sette giorni dall’epoca. Un errore non viene sostituito con un altro provider o con elementi meno recenti.
3. **Consulta frequenze SatNOGS** offre frequenze puntuali FM/FM stretta attive, confermate e nella banda VHF/UHF. Modalità dati, USB/LSB e transponder lineari non vengono convertiti in canali FM. I conteggi degli esclusi sono visibili. I dati sono comunitari e potrebbero non riflettere lo stato operativo corrente: verifica con l’operatore del satellite.
4. Autorizza l’uso locale della posizione e inserisci latitudine/longitudine/altitudine oppure premi **Usa la mia posizione**. Il permesso del browser viene richiesto solo allora. Le coordinate non vengono inviate ai provider né salvate automaticamente.
5. Calcola i passaggi delle successive 24/48 ore sopra l’elevazione minima scelta. Si usa SGP4 locale con posizione dell’osservatore, campioni di 5 s e attraversamenti raffinati a 0,5 s. Sono mostrati in **UTC** inizio, massimo, fine, elevazione e azimut. Sono indicati i passaggi già in corso o troncati dalla finestra. Non considera rilievi o rifrazione atmosferica e non garantisce precisione sul campo.
6. Puoi esportare un piano JSON (**include la tua posizione**, consenso obbligatorio) e il TLE insieme a un JSON di provenienza/licenza. Verifica che il browser abbia salvato entrambi i file TLE. Il piano viene invalidato modificando i parametri e va ricalcolato dopo 15 minuti. Un canale SAT FM preparato è solo RX nominale: non controlla il Doppler né abilita un collegamento uplink.
7. **Canali Doppler (Quansheng UV-K5 V3 / UV-K1 e OpenGD77):** scegli un passaggio calcolato e da 1 a 10 canali. Lo scostamento Doppler del passaggio (velocità radiale SGP4) viene diviso in intervalli di frequenza uguali. Ogni canale viene sintonizzato, a passi di 10 Hz, al centro del proprio intervallo e viene usato durante la finestra UTC in cui la frequenza ricevuta ricade in tale intervallo; le finestre sono più brevi vicino al massimo avvicinamento. Per ogni canale sono indicati la finestra e l’errore massimo agli estremi, considerando l’arrotondamento della frequenza a 10 Hz e arrotondando per eccesso l’errore. In un passaggio ISS su Madrid, con 5 canali, l’errore resta inferiore a 0,7 kHz a 145,8 MHz e a 2 kHz a 437,8 MHz. Solo RX: cambia memoria all’ora indicata. La radio non segue il Doppler autonomamente e non vengono generate trasmissioni uplink.

SatNOGS DB / Libre Space Foundation: attribuzione dei dati [CC BY-SA 4.0](https://wiki.satnogs.org/SatNOGS_DB); i TLE possono indicare fonti orbitali di terzi. I JSON/CSV derivati mantengono attribuzione e collegamento alla licenza. La dipendenza SGP4 include la licenza MIT nel pacchetto installato.

7. **OpenGD77: elenco SAT nativo nel codeplug locale.** Dopo aver aperto/letto un codeplug da 128 KiB, **Carica satellite nell’elenco SAT del codeplug locale** scrive il satellite nel blocco dati personalizzati **tipo 3** (offset `0x1EE60`, 25 record da 100 byte: nome di 8 caratteri, campi TLE impacchettati per nibble, frequenze LE), nello stesso formato del CPS ufficiale. I satelliti esistenti sono mantenuti (sostituiti per nome e ordinati), così come l’intestazione `OpenGD77` e gli altri blocchi (immagine di avvio, melodia, tema). Se la zona non ha intestazione e non è vuota (`0xFF`), oppure la catena dei blocchi non è coerente, l’operazione viene annullata senza modificare il file. Viene salvato solo il downlink (RX1); uplink, CTCSS e APRS restano a zero. **Visualizza satelliti del codeplug** decodifica l’elenco. Salva il binario e applicalo con il CPS ufficiale: la scrittura diretta sulla radio resta bloccata finché non è disponibile il backup completo del MCU.

**Limiti d’installazione:** qui F4HWN supporta memorie FM/SAT a passi nella configurazione v6, ma non una tabella orbitale SAT nativa. L’invio dei canali è Beta con backup completo; in v6.0 è stata testata fisicamente solo la lettura. L’elenco SAT OpenGD77 viene modificato nel binario locale, non nella radio. La scrittura OpenGD77 resta bloccata finché non viene verificata una copia completa del firmware MCU. La cancellazione locale OpenGD77 rimuove i riferimenti nelle 68 zone standard e 64 liste di scansione, incluse priorità e canale TX designato; non rinumera le altre memorie. Non supporta zone estese di Scanner. Conserva sempre il file originale. UV-K5 V3 non convalida hardware OpenGD77. Le consultazioni/importazioni non creano permessi di scrittura.

## Download ufficiali del firmware

In ogni pagina, premi **Consulta modelli ufficiali**, seleziona il modello e la revisione esatti e consulta il catalogo stabile. In Quansheng, **Consulta versioni stabili** mostra la cronologia riconosciuta dei due progetti, ordinata dalla più recente alla più vecchia all’interno di ciascun progetto. All’apertura della pagina non viene consultato Internet. La selezione della famiglia OpenGD77 da sola non identifica il modello di destinazione: verifica l’etichetta dell’apparato, la potenza e la revisione hardware.

- **F4HWN UV-K1 / UV-K5 V3:** [Release di Armel](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases), cronologia stabile riconosciuta v4.x/v5.x/v6.x. Include Fusion e, in v6, FieldOps, Labs e Transfer. I binari v4 vengono filtrati in base all’hardware K1/K5 V3. Le varianti SA818 sono identificate esplicitamente. Solo F4HWN v6.x senza SA818 può essere preparato per gli slot; le versioni precedenti e SA818 sono **solo download**.
- **ARDF UV-K1 / UV-K5 V3:** [Release del progetto reald](https://github.com/reald/uv-k1-k5v3-firmware-custom/releases), versioni stabili con etichetta `ARDF-K5v3_K1-v...` e binario combinato riconosciuto (incluse v0.5 e v0.5.1). Sono **solo download**: non viene dichiarata la compatibilità Multiboot né abilitato il connettore per ARDF.
- Entrambi i progetti Quansheng richiedono dimensioni e SHA-256 pubblicati da GitHub; server e browser verificano i byte. La cronologia è paginata (fino a 1000 release per progetto; superare il limite produce un errore esplicito). Un errore in una delle fonti annulla la consultazione, senza mostrare un catalogo parziale. Non sono offerte beta, build di sviluppo, firmware originale di provenienza non verificata, binari compilati localmente né modelli V1/V2. I file delle cartelle locali non vengono copiati nel sito. Verificare un hash non equivale a una firma digitale né a una certificazione di compatibilità.
- **OpenGD77:** solo [server ufficiale](https://www.opengd77.com/downloads/releases/), ultima cartella stabile `RYYYYMMDD` per famiglia e file riconosciuti per il modello. MD-9600 distingue V1/V2/V4/V5 e MD-UV380 distingue 10W PLUS. Lo ZIP originale viene mantenuto: **non si esegue il flash né lo si tratta come codeplug**. L’indice ufficiale non pubblica un hash: vengono verificati HTTPS, dimensioni e firma del formato ZIP, e viene calcolato SHA-256 localmente. Non si dichiara una verifica crittografica dell’editor né si decomprime/convalida ogni file dello ZIP.
- MD-380, DM-32 e UV008 non vengono offerti finché non è confermata una fonte degli asset. Non si inventano link né si ricorre a mirror.
Le letture OpenGD77 non inviano il comando per salvare le impostazioni/VFO né riavviano l’apparato: leggono i valori già persistenti, senza forzare il salvataggio di modifiche eventualmente ancora presenti in RAM.

## App F4HWN Labs e firmware personalizzato (Quansheng)

- **Bricohams V3 locale su richiesta:** `npm run build:bricohams -- --source "<Fusion61>" --output "<directorio nuevo>" --preset Fusion --option ENABLE_VOX=OFF` compila un’edizione indipendente sul commit fissato di F4HWN v6.1.0. Supporta Fusion/Labs/FieldOps/Transfer e opzioni booleane verificate; mantiene multiboot e genera firmware, mappa, ELF, metadati, licenze e SHA256SUMS compatibili con il verificatore web. Non è Karina né una versione V1; non è neppure il catalogo online v6.3.0. Sono state compilate Fusion e Labs e verificata la riproducibilità locale di Fusion, senza test fisici né flash. Istruzioni e risultati in [BRICOHAMS-FIRMWARE.md](docs/i18n/it/BRICOHAMS-FIRMWARE.md).
- **Libreria locale Multiboot:** in **Firmware Slots / Multiconfig**, seleziona la cartella Multiboot. I file `.bin` vengono letti nel browser senza essere caricati sul server. Ogni immagine indica se supera i controlli degli slot o perché viene bloccata. Si preparano solo immagini F4HWN v6.x con vettori PY32 validi; non Karina V1, stock, versioni precedenti né varianti packed/SA818/beta/sviluppo. Lo SHA-256 locale non dimostra l’autenticità. L’installazione richiede ancora backup completo e conferma; Main resta protetto. Consulta il [dossier Karina, hardware e fattibilità Bricohams](docs/i18n/it/KARINA.md).
- **App:** nell’ambiente Quansheng, **App di F4HWN Labs** elenca gli slot app della Flash esterna, installa un file `.app` e lo cancella. Funziona solo con l’edizione Labs avviata. Prima di intervenire sulla radio vengono verificati l’intestazione FAP1 e i CRC del codice e degli asset. L’app viene scritta in quest’ordine: codice, asset e, infine, intestazione. Ogni blocco viene riletto dalla Flash fisica e confrontato byte per byte; in caso di errore, l’operazione viene annullata senza confermare l’intestazione. Il controllo finale del firmware convalida solo l’intestazione e la compatibilità, non il CRC del codice; non sostituisce la rilettura. Come le altre scritture, richiede il backup completo. I file `.app` vengono scaricati da [archive/apps di F4HWN](https://github.com/armel/uv-k1-k5v3-firmware-custom/tree/main/archive/apps), usando la cartella della propria versione.
- **Firmware personalizzato:** scegli un’edizione (Labs, Fusion...) e abilita o disabilita le opzioni `ENABLE_*`. Il web genera la richiesta per il workflow *Firmware su misura* del repository di compilazione. Quando carichi l’artefatto scaricato (`SHA256SUMS`, `build-info.json`, `.bin`), verifica ogni SHA-256 e prepara esclusivamente il `.bin` indicato da `build-info.json` in **Installa nello slot**. Il manifesto deve includere anche `build-info.json`; i nomi duplicati vengono rifiutati. Questi hash rilevano la corruzione, non attestano autenticità o compatibilità. Il catalogo [f4hwn-options.js](f4hwn-options.js) viene rigenerato con `node scripts/f4hwn-options.cjs <bricohams-firmware>/options/<version>.json > f4hwn-options.js`.

## Backup automatici e protezione dell’apparato

1. Seleziona il modello e autorizza la lettura locale.
2. Connetti: la radio viene identificata e il backup si avvia automaticamente.
3. Salva la calibrazione in IndexedDB, calcola SHA-256 e rileggi per verificarne la persistenza.
4. Quansheng: leggi **i 2 MiB della Flash esterna** e confrontane il CRC-32 completo con quello calcolato dalla radio (`0x073E`, Labs con supporto CRC fisico). Se il firmware non offre questa verifica o il CRC non corrisponde, la scrittura viene bloccata. A 38400 baud può richiedere 10-20 minuti o più. La barra mostra l’avanzamento effettivo in byte.
5. Estrai l’immagine `Main` dallo slot 0 e verifica intestazione, dimensioni e CRC-32. Confronta la calibrazione logica con quella fisica.
6. Salva il risultato e verifica di nuovo tutti gli SHA-256. Solo allora viene concesso un permesso di scrittura legato alla connessione.
7. Richiedi il download automatico `.rwb.json` con manifesto, file Base64, dimensioni e hash. Il browser potrebbe bloccarlo: controlla i download e ripeti dalla cronologia.

**Cosa significa firmware di base:** `Main` è l’applicazione che il firmware salva dopo la normale installazione. Viene copiata tutta l’immagine descritta dalla sua intestazione (fino a 118 KiB). Non è necessariamente il firmware attualmente selezionato e **non include il bootloader interno di fabbrica** né altri byte del MCU. Questo protocollo non consente di affermare che sia stata copiata l’intera memoria del chip. Se Main manca o il suo CRC non coincide, la scrittura non viene abilitata.

OpenGD77 mantiene calibrazione e codeplug, ma contrassegna il backup come **parziale** perché manca l’estrazione completa del firmware interno. L’applicazione non confonde un codeplug con un firmware.

In caso di errori di trasporto, CRC, quota, lettura o archiviazione, non viene concesso alcun permesso di scrittura. Prima di ogni modifica il backup salvato viene riletto e confrontato con gli hash originali del permesso: eliminarlo o corromperlo revoca anch’esso l’autorizzazione alla scrittura. La rimozione del cavo, una riconnessione o un’altra radio invalidano il permesso. Ogni nuova connessione richiede un nuovo backup. Le scritture sono esclusive, Main non è selezionabile come destinazione, i byte dell’immagine vengono scritti prima dell’intestazione e il CRC viene verificato dopo l’installazione. Cancellare il firmware e ripristinare il banco sono azioni distinte, con conferma testuale.

Non scollegare né chiudere il browser durante un’operazione. Non collegare contemporaneamente uno strumento esterno alla stessa porta. Gli strumenti originali collegati **non ereditano queste protezioni**.
## Sicurezza dei dati

- Nessuna telemetria, account, CDN né invio dei file della radio a server. `satellite.js` viene installato localmente da npm con versione fissata e lockfile.
- I backup restano nel profilo del browser del computer; questa applicazione non li cifra. Possono contenere identificativi, canali, configurazioni e altri dati privati. Proteggi il profilo e i file con le misure del sistema operativo.
- IndexedDB non è un file esterno garantito per sempre. Esporta i backup; cancellare i dati del browser o usare un’altra origine fa perdere l’accesso alla cronologia. Quando il browser lo consente viene richiesto l’archiviazione persistente.
- Un backup parziale/fallito conserva nella cronologia i file già confermati. Non cancellare tali copie.
- Il server distribuisce solo un elenco fisso di file dell’applicazione, ascolta esclusivamente su `127.0.0.1` e invia CSP, Permissions-Policy, `nosniff` e `no-referrer`. Non serve la configurazione dell’editor, i test né percorsi arbitrari.
- I metadati della radio e i file vengono mostrati come testo, non come HTML. Non viene usato `eval`.
- SHA-256 rileva la corruzione accidentale, non dimostra l’autenticità del firmware. Usa immagini provenienti da una fonte attendibile. Nessun software può garantire sicurezza assoluta o recupero in caso di guasti elettrici.

## Test e convalida

```powershell
npm test
npm run check
```

I test di `tests/connectors.test.cjs` usano dispositivi simulati: frammentazione dei byte, frame, CRC, calibrazione, mappe per famiglia, backup completo, persistenza non riuscita, permessi, slot, reset, protezione di Main, verifica successiva e modifica binaria. Il codificatore di scrittura OpenGD77 viene testato con una VM isolata che sostituisce la barriera solo all’interno del test; il codice di produzione non viene sbloccato. Non si scrive sull’hardware.

`tests/firmware.test.cjs` verifica fonti e reindirizzamenti consentiti, cataloghi stabili per modello, limiti, hash, formati, cache, scadenza, concorrenza, verifica indipendente dal browser e percorsi/privacy del server. Usa risposte di rete simulate e un server locale effimero; non dipende da Internet né scarica firmware a ogni esecuzione.

`tests/planning.test.cjs` verifica l’importazione atomica di canali/contatti e i limiti, il blocco SAT OpenGD77 tipo 3 byte per byte rispetto al formato CPS (inizializzazione, conservazione dei blocchi, sostituzione, rifiuto di zone corrotte/non vuote, TLE non validi e più di 25 satelliti), conservazione dei byte, ID BCD, deduplicazione, filtri, CSV solo RX, rifiuto di modalità satellitari incompatibili, checksum/età TLE, propagazione SGP4 rispetto a un vettore indipendente di Vallado, finestre/attraversamenti di elevazione, paginazione RadioID, credenziali RepeaterBook solo server, attesa dopo HTTP 429 e isolamento delle API. Nessun test usa credenziali reali, scrive sulle radio o consulta RepeaterBook.

`tests/site.test.cjs` verifica il marchio, la favicon e l’assenza di script/stili inline in tutte le pagine; che il server serva la guida e il logo con tipo e intestazioni corretti; ancore e collegamenti locali della guida; che ogni messaggio della tabella degli errori esista letteralmente nel codice; i collegamenti relativi di tutta la documentazione; licenza, paternità e metadati del pacchetto; e l’assenza di email, segreti e caratteri corrotti.

Vengono inoltre controllati nel browser l’interfaccia desktop/mobile, gli stati disabilitati e l’archiviazione IndexedDB. È stata testata fisicamente la lettura USB di un’unità dichiarata UV-K5 V3 con F4HWN v6.0.0; non le scritture, la RF né le radio OpenGD77. Non si certificano la compatibilità sul campo né il funzionamento sul 100% degli apparati. Prima di usare le scritture su un apparato di valore, è necessario convalidare il processo con hardware di test e una procedura di ripristino nota.

## Riferimenti di interoperabilità

Implementazione indipendente basata sui formati dei protocolli esaminati; non vengono distribuiti il codice dei riferimenti né i loro firmware.

- [OpenGD77 CPS](https://grid.radio/opengd77/), protocollo `C` / `R` / `W` / `X`, modalità e mappa del codeplug.
- [UV Studio](https://armel.github.io/uvstudio/).
- [UART del firmware F4HWN](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/main/App/app/uart.c), contratti di messaggi e risposte.
- [Formato e mappa Multiboot](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/main/App/driver/mb_flash.h).
- [Multiboot e Multiconfig](https://github.com/armel/uv-k1-k5v3-firmware-custom/wiki/Multiboot-and-Multiconfig).

Consultazione effettuata il 18 ottobre 2026. Firmware e protocolli possono cambiare; in presenza di formati sconosciuti si interrompe esplicitamente.

## Licenza

Copyright (C) 2026 Anatol Emilio Lopez Maitchovcow (EA5KAO), Diego Roca (EA5JEF) y Pedro Roca.
Fondatori e membri del consiglio direttivo di [Bricohams](https://bricohams.org) ([bricohams.com](https://bricohams.com)).

Questo programma è software libero: puoi ridistribuirlo e/o modificarlo secondo i termini della [GNU General Public License](LICENSE) versione 3 o, a tua scelta, qualsiasi versione successiva (GPL-3.0-or-later). Viene distribuito **senza alcuna garanzia**. Dipendenze e sorgenti di terzi mantengono le proprie licenze: vedere [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.md).

Bricohams non è affiliata a OpenGD77, grid.radio, F4HWN, Quansheng, RadioID, RepeaterBook, SatNOGS né CelesTrak. I marchi appartengono ai rispettivi proprietari.