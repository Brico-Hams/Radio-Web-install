# Stazione remota integrata

Lo sviluppo originale BricoHam Remote Station viene incorporato come
`remote-station/` in **Bricohams Radio Workspace / RadiCodex**.
Si conservano integralmente il codice proprio, i suoi test, i documenti e i progetti mobili,
senza cache, SDK locali, segreti né binari di compilazione.
Si conservano la licenza radice GPL-3.0-or-later e gli avvisi MIT del componente;
non si modificano le licenze delle dipendenze né delle risorse di terzi.

## Quando usare ciascuna implementazione remota

Il progetto contiene due stazioni remote indipendenti:

| Nome nell'interfaccia | Codice | Usare quando |
| --- | --- | --- |
| **Stazione remota (host/agente Python)** | `remote-station/`, `station.html` | Ti serve un host HTTPS coordinatore, agenti headless Python e client web/Android/iOS. Il client Android si limita a connettersi. |
| **Remote shack (rigctld, desktop)** | `remote-agent.cjs`, `remote-station.cjs`, `remote-relay.cjs`, `remoto.html` (README: «Remote shack») | Vuoi controllare una radio tramite Hamlib `rigctld` dall'app desktop/Raspberry Pi, con relay proprio, audio Opus e sintonizzatore FTX-1. |

Non condividono porte né configurazione (la seconda usa `~/.radicodex/`). I
cataloghi delle radio e l'analisi CAT FTX-1 sono duplicati di proposito: non sono
stati unificati perché i formati differiscono. Le protezioni TX (TX
disattivato per impostazione predefinita, protezione da ROS alto, limiti di tempo di
ATAS/sintonia, arresto di emergenza e sorveglianti PTT) si mantengono in entrambe.

## Integrazione e limiti

- La navigazione web collega **Stazione remota (host/agente Python)** una sola volta.
  Prepara un URL HTTPS validato
  e apre il client servito dall'host; non raccoglie né invia token. La voce
  **Remote shack (rigctld, desktop)** compare solo sul desktop.
- RadiCodex Android include una schermata HTTPS interna: senza ponti JavaScript
  nativi, accesso ai file né contenuto misto. Fissa l'origine selezionata,
  rifiuta i certificati non validi e richiede il permesso unicamente per il microfono.
  Quando passa in secondo piano distrugge la pagina/sessione, senza riconnessione automatica.
- Il client Android dedicato e il progetto iPhone/iPad restano in
  `remote-station/apps/web-console/`, con marchio, colori, tipografia e risorse
  ufficiali BricoHams. iOS richiede Mac/Xcode per compilare e firmare.
- L'host coordinatore e gli agenti headless vengono eseguiti separatamente.
  L'[agente Android USB indipendente](../../../remote-station/docs/agente-android-usb.md)
  ha un APK proprio, collegamento WSS in uscita e CAT FTX-1 di sola lettura, con
  selezione esplicita e diagnostica ES/EN/FR/PT. La sua accettazione OTG fisica,
  audio, PTT, CW, modi digitali e accessori restano in sospeso; non va confuso
  con il client né queste funzioni vengono presentate come implementate.
  Il server Node locale del firmware **non viene pubblicato su Internet** né
  trasformato in proxy remoto. Non vengono esposte copie/codeplug né provider.
- Non si modificano i connettori USB, la memoria, il firmware né le funzioni native
  esistenti. I profili CAT della stazione sono indipendenti e opt-in.
- Si mantengono gli identificatori di protocollo, le variabili `BRICOHAM_*`, i pacchetti
  Python e gli application ID per evitare di rompere configurazioni/client esistenti.
  Si aggiungono gli alias `bricohams-station-host` e `bricohams-station-agent`.

## Compilare ed eseguire

Nella radice, Node 22 e Python 3.12 o superiore:

```powershell
npm ci
npm --prefix remote-station/apps/web-console ci
npm run build:station-branding
py -3.12 -m venv remote-station\.venv
remote-station\.venv\Scripts\python.exe -m pip install .\remote-station
npm run build:station
```

I pacchetti di host e agente vengono generati in `remote-station/dist/` (cartella locale, ignorata da git: gli artefatti non sono versionati).
Su POSIX, usa `python3` e `remote-station/.venv/bin/python`.
La [guida al deployment sicuro](../../../remote-station/docs/despliegue-seguro.md)
descrive TLS/CA/hostname, mTLS opzionale e segreti separati per ruolo/collegamento.
La [guida multilingue](../../../remote-station/docs/help/README.md) è integrata
nel client HTTPS e nei client dedicati.

L'URL di connessione non contiene token, percorsi né parametri. Deve puntare
all'host HTTPS che serve la console compilata, non alla porta dell'agente.
Per RadiCodex WebView si esige una catena di certificati affidabile per
Android; un errore TLS non viene mai ignorato. Il client dedicato Capacitor richiede
le origini esatte documentate nell'host.

## Validazione e sicurezza RF

CAT, audio, PTT, rotori, potenza e ATU conservano i loro interlock e stati
documentati. Il PTT richiede opt-in e limiti indipendenti; perdere il client
attiva il watchdog, non garantisce un arresto fisico. Verifica l'RX sulla radio.
Non si dichiara accettazione USB/RF/mobile né compatibilità completa per il solo fatto di avere
un profilo. CW remoto attivo, WSJT-X attivo, scope nativo FTX-1 e agente
Android headless OTG restano in sospeso; non vengono simulati come funzioni reali.
## Accessori di stazione

Il livello di [accessori di stazione](../../../remote-station/docs/accesorios-estacion.md) supervisiona
accordatori e amplificatori esterni nel laboratorio Node e nell’agente Python
(`GET/POST /api/v1/accessories`). L’amplificatore parte in STANDBY e vi torna in caso di
disconnessione, ROS alto, guasto, lease perso, cambio di banda o arresto di emergenza.
La sintonia parte solo su richiesta esplicita, a 10 W o meno e con tempo limitato.
I dispositivi senza fonte di protocollo (ad esempio PGXL) risultano `pendiente de fuente`.

## Diagnostica

Tutti i componenti dispongono di un registro tecnico minimizzato e di opzioni di invio
con consenso. Consulta [diagnostica e privacy](DIAGNOSTICS.md) per il
contratto chiuso, il ricevitore HTTPS, i ruoli, la conservazione e le differenze tra i client.

### Libreria nativa condivisa Android

`android/station-core` contiene il registro minimizzato e il validatore HTTPS prima
accoppiati a RadiCodex. Conserva il pacchetto Kotlin pubblico per non alterare chiamate
né schermate esistenti; riceve componente/versione esplicitamente, convalida entrambi
rispetto al contratto e rifiuta i cambi di identità durante una stessa applicazione.
I rapporti memorizzati di un altro componente o versione non vengono reincapsulati come propri.
Il contratto generato viene incorporato come asset della libreria in ciascun APK consumatore.
L'invio resta disattivato per impostazione predefinita e le credenziali restano solo in memoria.
Non è ancora un agente Android OTG eseguibile: USB, servizio e collegamento all'host
restano in sospeso. L'APK RadiCodex conserva la sua identità e il suo client HTTPS esistente.
I test della libreria e di connessione/diagnostica RadiCodex passano, insieme a entrambi i
lint e alla build dell'APK. Si verificano le 53 risorse generate, la firma debug v2 e il contratto
JSON all'interno dell'APK aggiornato. La revisione di sicurezza limitata a questa estrazione
non trova vulnerabilità confermate; non certifica il prodotto completo.

## Fonti upstream e prima verifica USB FTX-1

Sono state esaminate fonti pubbliche GitLab e collegamenti a Hamlib mantenuto, senza accedere
a Patreon privato/a pagamento né eseguire codice scaricato. Patreon non ha fornito
contenuto verificabile; la ricerca su GitLab è circoscritta, non un inventario completo.
I [bug Yaesu](../../../remote-station/docs/hardware/yaesu-cat.md),
i [rischi Xiegu](../../../remote-station/docs/hardware/xiegu-candidates.md) e
le [restrizioni OpenGD77](../../../remote-station/docs/hardware/opengd77-usb.md)
documentano evidenze, licenze, candidati e limiti senza copiare codice/tabelle.
L'FTX-1 esige ora ID0840 prima e dopo le regolazioni di frequenza/modo/potenza;
un modello errato o un'identità persa impediscono di confermare la regolazione, senza nuovo tentativo.
Passano **230 test Python**, Ruff e la verifica delle 53 risorse generate.

La [verifica USB reale](../../../remote-station/docs/hardware/ftx1-spa1.md) ha risolto
il driver mancante con un pacchetto ufficiale firmato e ha verificato 15 interrogazioni tramite
l'interfaccia Enhanced a 38400/8N1, senza setter né TX. IF restituisce P10=3 non documentato
in 2508-C: viene rifiutato e il PTT resta bloccato quando non può verificare uno stato
sicuro. Non si dichiara accettazione RF, audio, riconnessione, firmware né prodotto completo.
Wheel e ZIPAPP aggiornati sono stati verificati fuori dall'albero dei sorgenti: rifiutano un
ID di un altro modello senza setter e leggono ID0840 sull'unità USB reale. Il bundle
condiviso resta identico in wheel e APK dedicato; i quattro SHA256 coincidono.
La revisione di sicurezza circoscritta alla guardia di identità FTX-1 non ha trovato
vulnerabilità confermate; non è una certificazione globale.

## Desktop operativo

Il client condiviso web/Android/iPhone/iPad presenta i controlli dell'agente
prima dei cataloghi e dei riferimenti dei protocolli. I collegamenti CAT/PTT/rotore/potenza/
logbook scorrono la pagina; non emettono comandi né modificano permessi o sessioni.
La scheda del coordinatore non autorizza il TX e la dimostrazione resta identificata.
I componenti conservano le loro key, i loro handler e i meccanismi di chiusura.

Lo [studio comparativo di UX](../../RADIO_UX_RESEARCH.md) documenta fonti pubbliche,
decisioni originali e limiti. Non è una copia di prodotti commerciali,
una classifica degli utenti né un'accettazione visiva/hardware. I controlli principali
hanno un minimo di 44 px; restano in sospeso verifiche tattili e visive.
Questo passaggio non conclude il ridisegno di tutte le schermate native del Workspace.
Il portale organizza radio/agente, host e operazione in tre passaggi, senza rete né
memorizzazione di credenziali. In RadiCodex, la configurazione si ripiega durante
la connessione senza ricreare la WebView; disconnessione e stato restano visibili.
Alla disconnessione o al passaggio in secondo piano ritorna la configurazione, senza riconnettere.

## Verifica di questa integrazione

- Destinazione Node: **483 test riusciti**, inclusi installer, traduzioni,
  contratti di diagnostica, origine locale e consegna HTTPS reale.
- Host/agente Python: **212 test riusciti** e Ruff senza errori.
- Client condiviso: **61 test riusciti**, lint e build TypeScript/Vite.
- RadiCodex: sei test mirati di connessione/diagnostica, build APK e lint.
- Client Android dedicato: APK compilato e lint; progetti Android/iOS
  sincronizzati con lo stesso client compilato.
- Entrambi gli APK sono **debug**, con firma APK v2 verificata: non firma di produzione.
- Wheel installato fuori dall'albero dei sorgenti: modulo di diagnostica, CLI e console
  incorporata verificati. ZIPAPP headless eseguito con `--help`.
- Revisione di sicurezza limitata alla diagnostica: nessuna vulnerabilità
  confermata. Non è una certificazione del resto del prodotto.
- Validazione visiva con il browser integrato bloccata da timeout CDP.
  Il comportamento del pannello Workspace si verifica tramite test DOM,
  senza attribuire loro una verifica visiva.

Incremento CAT successivo: FTX-1 incorpora le letture KS/KP/KR/BI confrontate con
il manuale primario, senza keying né scrittura di memorie. Passano 23 test Python
mirati e dieci del client su connessione, navigazione e profili rigenerati;
Ruff, lint/build e verifica delle 53 risorse generate corretti.
Wheel e ZIPAPP eseguono i decoder incorporati; bundle condiviso identico
in wheel, APK e asset Android/iOS, verificato tramite SHA256.

I pacchetti si trovano in `remote-station/dist/`: sottodirectory `agent/`
e `host/`, più i due APK debug. `SHA256SUMS` permette di verificare l'integrità.
L'accettazione fisica USB/RF, le prove su dispositivi mobili, la compilazione/firma
iOS e le funzioni espressamente in sospeso non sono coperte da questi risultati.

## Ampliamento Yaesu, OpenGD77 e nuovi candidati

- I sette Yaesu del catalogo hanno interrogazioni CW documentate di sola lettura.
  FT-710, FT-991A, FTDX10, FTDX101D/MP e FTDX3000 incorporano regolazioni opt-in di
  frequenza, modo e valore di potenza per modello. ID corretto, RX, accordatore
  non occupato, limite locale, deduplicazione e readback si verificano senza abilitare il TX.
  FTDX101MP ammette fino a 200 W di valore impostato; gli altri sei non ereditano quel limite.
  FT-991A e FTDX3000 non inventano MD1: modo secondario null e controllo disabilitato.
  [Manuali, pagine e restrizioni](../../../remote-station/docs/hardware/yaesu-cat.md).
- Si integrano 13 profili sperimentali di
  [identificazione OpenGD77 USB CPS](../../../remote-station/docs/hardware/opengd77-usb.md)
  nell'agente headless e nella console condivisa. Solo INFO, senza entrare/uscire da
  CPS, scrivere memoria, trasmettere né dedurre CAT RF. Si rifiutano firmware/modelli
  sconosciuti; le build vecchie senza R9 non vengono presentate come compatibili.
  La programmazione/schermata locale originale del Workspace si conserva.
- [Xiegu e Lab599 esaminati](../../../remote-station/docs/hardware/xiegu-candidates.md)
  si aggiungono come candidati senza trasporto: gli indirizzi, il framing e i dettagli
  di risposta in sospeso non si indovinano da Icom, Kenwood o Hamlib.
  Il catalogo contiene 68 candidati, non 68 radio certificate.
- [FlexRadio SmartSDR](../../../remote-station/docs/FLEX-SMARTSDR-API.md): client
  `smartsdr_protocol.py` / `smartsdr-core.cjs` (discovery, sessione TCP 4992,
  misuratori VITA-49, TX protetto e disattivato di default). Panadapter e
  waterfall VITA-49: fonte in sospeso.
- Verifica finale: **223 test Python**, **66 del client** e **44 Node
  mirati** riusciti; Ruff, lint e build corretti. Un'interruzione transitoria
  WinError 10053 di un test del rotore è stata ripetuta in isolamento e la suite completa
  successiva è passata, senza modificare il controller né i limiti HTTP.
- ZIPAPP e wheel aggiornati sono stati eseguiti fuori dall'albero dei sorgenti; i due APK
  debug verificano la firma v2. SHA256SUMS coincide con i quattro pacchetti. Il bundle
  attuale coincide byte per byte tra wheel, APK dedicato e asset Android/iOS.
  RadiCodex conserva il suo APK: carica l'interfaccia attuale dall'host HTTPS,
  non incorpora un nuovo motore CAT nella WebView.
- La pubblicazione resta bloccata: HTTPS non dispone di credenziali e SSH rifiuta
  l'autenticazione publickey. Si è verificata la chiave ufficiale di github.com in un file
  isolato, senza modificare i profili SSH né disattivare il controllo dell'host.

Questi incrementi non concludono CW attivo, WSJT-X attivo/broker CAT, agente Android
USB OTG indipendente, firma iOS/produzione né accettazione fisica multipiattaforma.

## Lingue dei controlli operativi

Frequenza/modo e potenza/accordatore usano il selettore ES/EN/FR/PT del client
condiviso, inclusi errori e avvisi di sicurezza. Cambiare lingua conserva
letture, valori modificati, limiti e permessi; non rimonta i controlli né emette
richieste CAT. I riferimenti tecnici collegati mantengono la loro lingua originale.

Verifica: **72 test del client**, lint e TypeScript/Vite corretti;
sei nuovi casi verificano i cambi di lingua con SUB senza modo e il limite
di 200 W dell'FTDX101MP, senza alterare le restrizioni. Wheel reinstallato fuori dall'albero
dei sorgenti e APK dedicato ricompilato con lint e firma debug v2 verificati.
Il bundle coincide per SHA256 in wheel, APK e asset Android/iOS; SHA256SUMS
viene aggiornato per i due pacchetti interessati. ZIPAPP e APK RadiCodex non cambiano.
Non si attribuisce compilazione iOS, accettazione fisica né firma di produzione.

## Comandi WSJT-X limitati

L'agente e l'host incorporano un POST autenticato per Replay e Halt Tx,
esclusivamente con `--enable-wsjtx-safe-commands` locale. La console condivisa
web/Android/iPhone/iPad offre entrambe le azioni in ES/EN/FR/PT. Non ci sono avvio TX,
Reply, Free Text né Configure; il broker CAT e l'operazione digitale completa
restano in sospeso. Consulta [attivazione e limiti UDP](../../../remote-station/docs/agente-cat-wsjtx.md).

I [dispositivi di stazione](../../../remote-station/docs/dispositivos-estacion.md)
(relè Digital Loggers e Waveshare Modbus, rotori DCU-1/Rotor-EZ/RT-21)
si comandano con conferma, non commutano radio/amplificatore in trasmissione
e l'arresto è sempre consentito. Percorsi di segnale e apparati senza protocollo pubblico: "pendiente de fuente".

La prima origine loopback Heartbeat/Status resta fissata fino al riavvio
dell'agente. Si rifiutano origine diversa, istanza scaduta/chiusa, campi non
ammessi e ID ripetuti; Replay ha un limite di una richiesta al secondo.
Questo non autentica il processo WSJT-X. La consegna dichiara sempre
`sent_unconfirmed` e non conferma l'arresto RF; la UI richiede una nuova interrogazione
dopo un errore, senza ritentativi. Mantenere le protezioni fisiche e verificare l'RX.

Verifica: **228 test Python** e **74 del client** corretti,
incluso POST tramite due collegamenti TLS validati, CORS e rifiuto di una risposta
che pretenda di confermare l'arresto RF. Ruff, lint, TypeScript/Vite e 53 risorse
generate corretti. Un timeout della diagnostica Workspace nell'esecuzione
concorrente è stato ripetuto in isolamento e poi nella suite completa con due
worker; entrambe sono passate senza modificare quel test né i suoi limiti.

Wheel e ZIPAPP eseguiti fuori dall'albero dei sorgenti; APK dedicato con build,
lint e firma debug v2 corretti. Bundle identico in wheel/APK/asset Android/iOS
e SHA256SUMS aggiornato. Revisione di sicurezza limitata a questo incremento
e ai suoi helper di autenticazione/TLS: nessuna vulnerabilità confermata.
Non certifica tutto il prodotto, WSJT-X in esecuzione reale né l'hardware.

## Impostazioni di menu da remoto

Il modello condiviso (`radio-settings.cjs`, `data/radio-settings-catalog.json`) elenca, per radio,
ogni impostazione con id, tipo, intervallo, comando di lettura/scrittura e fonte. L'agente Node espone
`GET /api/settings`, `GET /api/settings/value?id=` e `POST /api/settings`; solo l'FTX-1 ha
una mappa di menu EX con fonte (`ftx1-menu.js`). Ogni scrittura richiede il ruolo operatore, legge il valore
attuale come copia, convalida l'intervallo, scrive, rilegge e confronta, e ripristina la copia in caso di differenza.
È rifiutata durante la TX, una sola scrittura alla volta, con limite di frequenza e registro di audit.
Calibrazione, reset, regione/limiti TX, velocità/stop bit/timeout CAT e porte USB non vengono mai scritti.
Ciò che non ha fonte compare come «pendiente de fuente» in sola lettura; le radio solo codeplug
rimandano all'editor desktop. Non trasmettere mai senza carico o antenna adattata.

L'agente Python (`remote-station/bricoham_station_agent/menu_settings.py`) espone lo stesso modello per il
FTX-1 tramite `POST /api/v1/radio-settings` (`menu_list`, `menu_read`, `menu_write`); la scrittura richiede
`menu_write_enabled: true` in `--radio-settings-config` (disattivato di default) e il pannello React lo mostra.
Le voci «MAX POWER», REGION/LIMITI TX, CALIBRAZIONE, reset, CAT, USB/TUN-LIN, AUTO POWER OFF e
TX timer sono in sola lettura; una risposta `?;` significa «non disponibile», non un valore. Le
risposte reali del banco (`EX0104133;`, `EX030503100;`, `EX050109;` -> `?;`) sono fixture di test.
IC-705: l'app Android (schermata Radio, CI-V USB, pulsante «Impostazioni della radio (CI-V)») legge e modifica le
impostazioni `1A 05 <sub>` della guida CI-V dell'IC-705 rev. 6 (pp. stampate 2 e 5-8; la guida è locale e mai
versionata) con la stessa scrittura sicura (`RigSettings.kt`, tabella verificata con `data/radio-settings-catalog.json`).
Timeout TX, blocco PTT, avvio PTT del tuner, uscite SEND/manipolazione, potenza TX massima, beep di fine banda,
spegnimento automatico, voci del collegamento CI-V/USB e REF adjust sono di sola lettura; le voci composite 0001 e
0046 sono pendiente de fuente. Gli agenti Node e Python elencano il modello dell'IC-705 in sola lettura perché
manca un percorso CI-V grezzo con fonte. Le console web di Android riusano la scheda Impostazioni dell'agente Node.

## Lingue senza interrompere i controlli attivi

PTT, rotore, audio RX e il pannello CAT/WSJT-X condividono ES/EN/FR/PT, inclusi
avvisi di sicurezza ed errori locali di trama. I callback di arresto e
rinnovo mantengono la loro identità al cambio di lingua; non si riavvia la lease,
non si invia START/MOVE/STOP né si ricrea il grafico audio per quel cambio.
Le risposte tecniche dell'agente e gli errori esterni conservano il loro formato/lingua.

**89 test del client**, lint e TypeScript/Vite corretti. I nuovi casi
verificano PTT/rotore attivi con rinnovo e arresto successivo, assenza di
nuovi comandi al cambio di lingua, conservazione di AudioContext/nodo/richiesta,
errori di trama traducibili senza riaprire l'audio e selezione CAT conservata.
Anche il microfono TX preparato conserva istanza e sessione al cambio di
lingua; perdere il focus continua a chiuderlo e a richiedere RX.
La verifica iniziale ha rilevato una traduzione visiva differita nell'helper; si
sono separati traduzione e render e callback stabile prima di validare la suite completa.
Wheel reinstallato fuori dall'albero dei sorgenti e APK dedicato ricompilato con lint
e firma debug v2 verificati. Lo stesso bundle compare in wheel/APK/Android/iOS
e SHA256SUMS coincide con i quattro pacchetti. ZIPAPP e APK RadiCodex non cambiano.
Non si attribuisce accettazione fisica/mobile né compilazione/firma iOS.

<!-- remote-parity:start -->
## Parità delle funzioni remote per radio

La matrice `data/remote-feature-parity.json` elenca ogni radio del catalogo remoto e ogni profilo Android rispetto alle funzioni di base. Una funzione contrassegnata ✔ o ◐ cita file sorgente esistenti; ✖ significa «pendiente de fuente» (senza fonte) e le console la mostrano disattivata con il motivo. Il software non trasmette mai senza un'azione esplicita dell'operatore, con limite di tempo, arresto di emergenza e interruzione per ROS alto; non trasmettere mai senza carico adattato o antenna.

✔ disponibile · ◐ parziale · ✖ pendiente de fuente (senza fonte) · – non applicabile

| Radio | Collegamento | Freq./modo | VFO/split | PTT | S-meter | Misure TX | Tune | Audio RX | Audio TX | Waterfall | Rotore | Accord./ampl. | Impostazioni |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| Icom IC-705 | usb/lan/wifi | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Icom IC-7100 | usb | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Icom IC-7200 | usb | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Icom IC-7300 | usb | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Icom IC-7300MK2 | usb | ◐ | ◐ | ◐ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Icom IC-7410 | usb | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Icom IC-7600 | usb | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Icom IC-7610 | usb/lan | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Icom IC-7700 | usb | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Icom IC-7760 | usb/lan | ◐ | ◐ | ◐ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Icom IC-7800 | usb | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Icom IC-7850 / IC-7851 | usb/lan | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Icom IC-905 | usb/lan/wifi | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Icom IC-9100 | usb | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Icom IC-9700 | usb/lan | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Icom IC-R8600 | usb/lan | ✔ | ◐ | – | ✔ | – | – | ✔ | – | ✔ | ✔ | – | ◐ |
| FlexRadio FLEX-6400 | lan/wifi | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| FlexRadio FLEX-6400M | lan/wifi | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| FlexRadio FLEX-6600 | lan/wifi | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| FlexRadio FLEX-6600M | lan/wifi | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| FlexRadio FLEX-6700 | lan/wifi | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| FlexRadio FLEX-8400 | lan/wifi | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| FlexRadio FLEX-8400M | lan/wifi | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| FlexRadio FLEX-8600 | lan/wifi | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| FlexRadio FLEX-8600M | lan/wifi | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| FlexRadio AURORA-510 | lan/wifi | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| FlexRadio AURORA-510M | lan/wifi | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| FlexRadio AURORA-520 | lan/wifi | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| FlexRadio AURORA-520M | lan/wifi | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Kenwood TS-590S | usb | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Kenwood TS-590SG | usb | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Kenwood TS-890S | usb | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Kenwood TS-990S | usb | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Kenwood TH-D75 | usb | ◐ | ✖ | ◐ | ✖ | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✖ | ✖ |
| Yaesu FT-710 | usb | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Yaesu FT-991A | usb | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Yaesu FTDX10 | usb | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Yaesu FTDX101D | usb | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Yaesu FTDX101MP | usb | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Yaesu FTDX3000 | usb | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Yaesu FTX-1 | usb | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Yaesu FT-817 / FT-817ND | usb | ◐ | ◐ | ◐ | ✖ | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✖ | ✖ |
| Yaesu FT-818ND | usb | ◐ | ◐ | ◐ | ✖ | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✖ | ✖ |
| Yaesu FT-857 / FT-857D | usb | ◐ | ◐ | ◐ | ✖ | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✖ | ✖ |
| Yaesu FT-897 / FT-897D | usb | ◐ | ◐ | ◐ | ✖ | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✖ | ✖ |
| Elecraft K3S | usb | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Elecraft K4 | usb/lan/wifi | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| QRP Labs QMX / QMX+ | usb | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| QRP Labs QCX / QDX | usb | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| DL2MAN (tr)uSDX | usb | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Hermes Lite 2 Hermes Lite 2 | lan | ◐ | ◐ | ◐ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Xiegu G90 / G90S | usb | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✖ | ✖ |
| Xiegu X6100 | usb | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✖ | ✖ |
| Xiegu X6200 | usb | ◐ | ◐ | ◐ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Xiegu X5105 | usb | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✖ | ✖ |
| Xiegu G106 / G106C | usb | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✖ | ✖ |
| Quansheng UV-K5 / UV-K1 (BricoHams Satellite, F4HWN) | usb | ◐ | ✖ | ◐ | ✖ | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✖ | ✖ |
| `android-opengd77` | Android | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✔ | ✖ | ✖ |
| `android-rt950` | Android | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✔ | ✖ | ✖ |
| `android-rts10` | Android | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✔ | ✖ | ✖ |
| `android-d878` | Android | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✔ | ✖ | ✖ |
| `android-kiss-tnc` | Android | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✔ | ✖ | ✖ |
<!-- remote-parity:end -->

## Misure normalizzate e verifica dell'accordo

`remote-meters.cjs` + `data/remote-meter-model.json` sono il modello unico delle misure
(S, PO, SWR, ALC, COMP, ID, VDD) per lo shack Node, la console React (`meterModel.ts`),
Android (`MeterModel.kt`) e Python (`ftx1_cat.py`). Le scale FTX-1 sono citate dal manuale CAT 2508-C
(RM/SM) e da bg7nzl-ftx1ctl; sono stime non calibrate. PO è scalata solo con la testa da campo
(`PC1`); con l'SPA-1 (`PC2`) resta «pendiente de fuente». La temperatura non ha fonte.

L'accordo (AC interno 20 s, ATAS 45 s) usa una macchina a stati: richiesta dell'operatore, conferma per rilettura,
attesa con limite, SWR finale e TX0 verificato per rilettura. Il risultato (successo/errore/timeout) è mostrato
nella console. Viene rifiutato se la potenza configurata supera 10 W (`TUNE_POWER_MAX_W`): l'operatore
deve abbassarla; non viene mai abbassata automaticamente. Anche il G TUNE di Hamlib ha un limite.
Non trasmettere mai senza carico adattato o antenna collegata.
I test di questa estensione non sono stati eseguiti in questo ambiente.

## Cascata remota del segnale ricevuto

`spectrum-core.js` (interfaccia del Node remote shack, quindi la WebView Android) e `spectrum.ts` (console web React, quindi il client di stazione remota Android) calcolano una FFT dell'audio RX che arriva già dal canale autenticato `/api/audio` o `/api/v1/audio`; non si apre un secondo ascoltatore audio e non c'è nuovo traffico di rete. Disegnano al massimo 25 righe/s su un canvas fisso da 640 px, con scala dB, tavolozza, pausa e intervallo regolabile. Lo scope nativo della radio si usa solo dove esiste una fonte: `drivers/icom_scope.py` e `SpectrumCore.createScopeAssembler` implementano il frame `27 00` secondo `third_party/ftx1/rigplane-rigplane-core/docs/api/scope.md` (MIT, che cita le guide CI-V di IC-705/7300/7610/9700), e `SerialCat.scope_stream` (agente Python) lo legge live solo su IC-705, IC-7300, IC-7300MK2, IC-7610, IC-905 e IC-9700 (i sei con `27 00`/`27 10`/`27 11` nei profili rigplane; guida CI-V IC-705 pp. 27-28; solo ricevitore principale): attiva lo scope con `27 10 01` e l'uscita con `27 11 01`, riassembla `27 00` a 10 frame/s e 30 s al massimo e la disattiva sempre con `27 11 00` (comandi da `commands/scope.py`, `scope_data_output`; solo ricezione, mai PTT) e la serve su `GET /api/v1/cat/scope?seconds=&fps=` (NDJSON, autenticato). L'agente Node parla con rigctld, che non consegna frame non richiesti: resta «fonte in sospeso» e usa la cascata audio. Un clic sulla cascata sintonizza solo in USB/LSB/PKTUSB/PKTLSB tramite il percorso di frequenza esistente (RF = dial ± tono); non esiste alcun nuovo percorso TX. Non trasmettere senza antenna o carico adattato.

| Radio | Collegamento · fonte | Scope nativo via CAT | Cascata audio | Clic per sintonizzare |
| --- | --- | --- | --- | --- |
| Icom IC-705 | usb/lan/wifi · catalog + `icom_civ.py` + `Profile.kt` | ok (agente Python); Node fonte in sospeso | ok (con audio) | SSB |
| Icom IC-7100 | usb · catalog + `icom_civ.py` | fonte in sospeso | ok (con audio) | SSB |
| Icom IC-7200 | usb · catalog + `icom_civ.py` | fonte in sospeso | ok (con audio) | SSB |
| Icom IC-7300 | usb · catalog + `icom_civ.py` | ok (agente Python); Node fonte in sospeso | ok (con audio) | SSB |
| Icom IC-7300MK2 | usb · catalog + `icom_civ.py` | ok (agente Python); Node fonte in sospeso | ok (con audio) | SSB |
| Icom IC-7410 | usb · catalog + `icom_civ.py` | fonte in sospeso | ok (con audio) | SSB |
| Icom IC-7600 | usb · catalog + `icom_civ.py` | fonte in sospeso | ok (con audio) | SSB |
| Icom IC-7610 | usb/lan · catalog + `icom_civ.py` | ok (agente Python); Node fonte in sospeso | ok (con audio) | SSB |
| Icom IC-7700 | usb · catalog + `icom_civ.py` | fonte in sospeso | ok (con audio) | SSB |
| Icom IC-7760 | usb/lan · catalog + `icom_civ.py` | fonte in sospeso | ok (con audio) | SSB |
| Icom IC-7800 | usb · catalog | fonte in sospeso | ok (con audio) | SSB |
| Icom IC-7850 | usb/lan · catalog + `icom_civ.py` | fonte in sospeso | ok (con audio) | SSB |
| Icom IC-7851 | usb/lan · catalog + `icom_civ.py` | fonte in sospeso | ok (con audio) | SSB |
| Icom IC-905 | usb/lan/wifi · catalog + `icom_civ.py` | ok (agente Python); Node fonte in sospeso | ok (con audio) | SSB |
| Icom IC-9100 | usb · catalog + `icom_civ.py` | fonte in sospeso | ok (con audio) | SSB |
| Icom IC-9700 | usb/lan · catalog + `icom_civ.py` | ok (agente Python); Node fonte in sospeso | ok (con audio) | SSB |
| Icom IC-R8600 | usb/lan · catalog + `icom_civ.py` | fonte in sospeso | ok (con audio) | SSB |
| FlexRadio FLEX-6400 | lan/wifi · catalog | fonte in sospeso | ok (con audio) | SSB |
| FlexRadio FLEX-6400M | lan/wifi · catalog | fonte in sospeso | ok (con audio) | SSB |
| FlexRadio FLEX-6600 | lan/wifi · catalog | fonte in sospeso | ok (con audio) | SSB |
| FlexRadio FLEX-6600M | lan/wifi · catalog | fonte in sospeso | ok (con audio) | SSB |
| FlexRadio FLEX-6700 | lan/wifi · catalog | fonte in sospeso | ok (con audio) | SSB |
| FlexRadio FLEX-8400 | lan/wifi · catalog | fonte in sospeso | ok (con audio) | SSB |
| FlexRadio FLEX-8400M | lan/wifi · catalog | fonte in sospeso | ok (con audio) | SSB |
| FlexRadio FLEX-8600 | lan/wifi · catalog | fonte in sospeso | ok (con audio) | SSB |
| FlexRadio FLEX-8600M | lan/wifi · catalog | fonte in sospeso | ok (con audio) | SSB |
| FlexRadio AURORA-510 | lan/wifi · catalog | fonte in sospeso | ok (con audio) | SSB |
| FlexRadio AURORA-510M | lan/wifi · catalog | fonte in sospeso | ok (con audio) | SSB |
| FlexRadio AURORA-520 | lan/wifi · catalog | fonte in sospeso | ok (con audio) | SSB |
| FlexRadio AURORA-520M | lan/wifi · catalog | fonte in sospeso | ok (con audio) | SSB |
| Kenwood TS-590S | usb · catalog + `kenwood_cat.py` | fonte in sospeso | ok (con audio) | SSB |
| Kenwood TS-590SG | usb · catalog + `kenwood_cat.py` | fonte in sospeso | ok (con audio) | SSB |
| Kenwood TS-890S | usb · catalog + `kenwood_cat.py` | fonte in sospeso | ok (con audio) | SSB |
| Kenwood TS-990S | usb · catalog + `kenwood_cat.py` | fonte in sospeso | ok (con audio) | SSB |
| Yaesu FT-710 | usb · catalog + `yaesu_cat.py` | fonte in sospeso | ok (con audio) | SSB |
| Yaesu FT-991A | usb · catalog + `yaesu_cat.py` | fonte in sospeso | ok (con audio) | SSB |
| Yaesu FTDX10 | usb · catalog + `yaesu_cat.py` | fonte in sospeso | ok (con audio) | SSB |
| Yaesu FTDX101D | usb · catalog + `yaesu_cat.py` | fonte in sospeso | ok (con audio) | SSB |
| Yaesu FTDX101MP | usb · catalog + `yaesu_cat.py` | fonte in sospeso | ok (con audio) | SSB |
| Yaesu FTDX3000 | usb · catalog + `yaesu_cat.py` | fonte in sospeso | ok (con audio) | SSB |
| Yaesu FTX-1 | usb · catalog + `ftx1_cat.py` + `Profile.kt` | fonte in sospeso (`SS` sono impostazioni, non campioni) | ok (con audio) | SSB |
| Elecraft K3 | driver `elecraft_k3s_cat.py` | fonte in sospeso | ok (con audio) | SSB |
| Elecraft KX3 | driver `elecraft_k3s_cat.py` | fonte in sospeso | ok (con audio) | SSB |
| Elecraft KX2 | driver `elecraft_k3s_cat.py` | fonte in sospeso | ok (con audio) | SSB |
| Elecraft K3S | usb · catalog + `elecraft_k3s_cat.py` | fonte in sospeso | ok (con audio) | SSB |
| Elecraft K4 | usb/lan/wifi · catalog + `elecraft_k4_cat.py` | fonte in sospeso (dB/bin via Ethernet, protocollo non pubblicato) | ok (con audio) | SSB |
| QRP Labs QMX | usb · catalog + `qmx_cat.py` + `Profile.kt` | fonte in sospeso | ok (con audio) | SSB |
| QRP Labs QMX+ | usb · catalog + `qmx_cat.py` | fonte in sospeso | ok (con audio) | SSB |
| QRP Labs QCX | usb · catalog | fonte in sospeso | ok (con audio) | SSB |
| QRP Labs QDX | usb · catalog + `Profile.kt` | fonte in sospeso | ok (con audio) | SSB |
| (tr)uSDX | usb · catalog + `trusdx_cat.py` + `Profile.kt` | fonte in sospeso | ok (con audio) | SSB |
| Hermes Lite 2 | lan · catalog + `hermes_lite_protocol.py` | fonte in sospeso (IQ, non audio) | ok (con audio) | SSB |
| OpenGD77 GD-77 | usb · `opengd77_usb.py` + `Profile.kt` | fonte in sospeso | nessun percorso audio | no |
| OpenGD77 GD-77S | usb · `opengd77_usb.py` | fonte in sospeso | nessun percorso audio | no |
| OpenGD77 DM-1801 | usb · `opengd77_usb.py` | fonte in sospeso | nessun percorso audio | no |
| OpenGD77 RD-5R | usb · `opengd77_usb.py` | fonte in sospeso | nessun percorso audio | no |
| OpenGD77 DM-1801A | usb · `opengd77_usb.py` | fonte in sospeso | nessun percorso audio | no |
| OpenGD77 MD-9600 | usb · `opengd77_usb.py` | fonte in sospeso | nessun percorso audio | no |
| OpenGD77 MD-UV380 | usb · `opengd77_usb.py` | fonte in sospeso | nessun percorso audio | no |
| OpenGD77 MD-380 | usb · `opengd77_usb.py` | fonte in sospeso | nessun percorso audio | no |
| OpenGD77 DM-1701 | usb · `opengd77_usb.py` | fonte in sospeso | nessun percorso audio | no |
| OpenGD77 MD-2017 | usb · `opengd77_usb.py` | fonte in sospeso | nessun percorso audio | no |
| OpenGD77 DM-32 | usb · `opengd77_usb.py` | fonte in sospeso | nessun percorso audio | no |
| OpenGD77 UV008 | usb · `opengd77_usb.py` | fonte in sospeso | nessun percorso audio | no |
| Yaesu FT-817 | usb · `Profile.kt` | fonte in sospeso | nessun percorso audio | no |
| Yaesu FT-818 | usb · `Profile.kt` | fonte in sospeso | nessun percorso audio | no |
| Yaesu FT-857 | usb · `Profile.kt` | fonte in sospeso | nessun percorso audio | no |
| Yaesu FT-897 | usb · `Profile.kt` | fonte in sospeso | nessun percorso audio | no |
| Kenwood TH-D75 | usb · `Profile.kt` | fonte in sospeso | nessun percorso audio | no |
| Quansheng UV-K5 (BricoHams Satellite) | usb · `Profile.kt` | fonte in sospeso (`firmware/bricohams/spectrum.c` non esporta campioni via UART) | nessun percorso audio | no |
| Radtel RT-950 Pro | ble · `Profile.kt` | fonte in sospeso | nessun percorso audio | no |
| Radtel RT-S10 | ble · `Profile.kt` | fonte in sospeso | nessun percorso audio | no |
| AnyTone D878 | nessuna connessione · `Profile.kt` | fonte in sospeso | nessun percorso audio | no |
| KISS TNC | rete · `Profile.kt` | fonte in sospeso | nessun percorso audio | no |