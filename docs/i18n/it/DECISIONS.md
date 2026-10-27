# Registro delle decisioni (ADR)

Ogni decisione indica contesto, scelta, alternative scartate e conseguenze.

## ADR-001 · JavaScript senza framework né fase di compilazione

- **Contesto:** lo strumento gestisce protocolli binari e deve essere verificabile da qualsiasi radioamatore.
- **Decisione:** moduli JavaScript nativi, HTML e CSS, senza React, Vue, bundler o transpiler.
- **Alternative:** React/Vite (più dipendenze e rischi nella catena di fornitura) o TypeScript (richiede compilazione).
- **Conseguenze:** si legge esattamente ciò che viene eseguito e il browser non carica `node_modules`. In cambio, lo stato dell'interfaccia viene gestito manualmente.

## ADR-002 · WebUSB e Web Serial per comunicare con la radio

- **Contesto:** OpenGD77 MK22/STM32 espone CDC via USB; DM-32/UV008 e Quansheng usano una porta seriale.
- **Decisione:** WebUSB per `1FC9:0094` e Web Serial per i cavi seriali, come nel CPS web di riferimento.
- **Alternative:** applicazione nativa (installazione e firma per sistema operativo) o Electron (ampia superficie di attacco).
- **Conseguenze:** funziona solo in Chrome, Edge e Brave desktop. Su Windows, OpenGD77 USB necessita di WinUSB (vedi [l'aiuto](../../../ayuda.html#drivers)).

## ADR-003 · Server Node locale con una sola dipendenza

- **Contesto:** download firmware e dati dei fornitori devono aggirare CORS, applicare elenchi di host consentiti e nascondere le credenziali.
- **Decisione:** `server.cjs` con moduli standard di Node 22 (`http`, `fetch`, `crypto`) e `satellite.js` 6.0.1, fissato, come unica dipendenza.
- **Alternative:** Express/Fastify (più dipendenze) o proxy pubblico (espone dati e credenziali).
- **Conseguenze:** installazione con `npm ci --ignore-scripts` e minore rischio nella catena di fornitura.

## ADR-004 · Solo loopback, CSP rigorosa ed elenco di file consentiti

- **Decisione:** ascoltare su `127.0.0.1:8787`, validare `Host`, servire solo i file elencati e inviare una CSP senza `unsafe-inline`.
- **Motivo:** mitigare DNS rebinding, lettura di file arbitrari e XSS.
- **Conseguenza:** `localhost` non viene servito: le navigazioni GET/HEAD sono reindirizzate (307) a `127.0.0.1` per mantenere un'unica origine IndexedDB; con intestazione `Origin` vengono rifiutate. Pubblicare l'applicazione in rete richiederebbe una riprogettazione (HTTPS e autenticazione) e non è supportato.

## ADR-005 · Backup automatico obbligatorio prima della scrittura

- **Decisione:** alla connessione vengono copiati calibrazione e firmware o codeplug di base, salvati in IndexedDB, sottoposti a SHA-256 e riletti; solo allora viene emesso un permesso di scrittura legato alla connessione. Qualsiasi errore mantiene la scrittura bloccata (*fail-closed*).
- **Alternativa scartata:** backup facoltativo, con rischio di perdere irreversibilmente la calibrazione.
- **Conseguenze:** la connessione richiede più tempo (i 2 MiB di un Quansheng a 38.400 baud richiedono 10–20 minuti), ma non si scrive mai senza un backup verificato.

## ADR-006 · IndexedDB ed esportazione `.rwb.json`

- **Decisione:** IndexedDB del browser per la cronologia ed esportazione JSON con manifesto, contenuto Base64 e hash.
- **Alternative:** salvare i backup sul server (violerebbe la promessa «nessun caricamento») o File System Access API (non presente in tutti i browser).
- **Conseguenze:** l'applicazione non cifra i backup. L'utente deve esportarli e proteggere il proprio profilo del browser.

## ADR-007 · Solo fonti firmware ufficiali, senza mirror

- **Decisione:** catalogo limitato ai GitHub Releases del repository ufficiale F4HWN (`armel/uv-k1-k5v3-firmware-custom`), al progetto ARDF per K1/K5 V3 (`reald/uv-k1-k5v3-firmware-custom`) e a opengd77.com, con reindirizzamenti limitati e limiti di dimensione. Quansheng include la cronologia stabile riconosciuta con SHA-256 pubblicato. ARDF, F4HWN precedente alla v6 e SA818 sono offerti solo per il download; non estendono il supporto di scrittura.
- **Conseguenze:** se un fornitore cambia struttura, il download fallisce esplicitamente invece di ricorrere a fonti non verificate. SHA-256 rileva corruzione, ma non prova autenticità.

## ADR-008 · Credenziali RepeaterBook solo sul server

- **Decisione:** `data-service.cjs` legge `RB_USER_TOKEN`, `RB_APPROVED_USER_AGENT` e `RB_APPROVED` dalle variabili d'ambiente e il browser non le riceve mai. Dopo HTTP 429 viene applicata una pausa ed è mostrata l'attribuzione «Data courtesy of RepeaterBook.com».
- **Conseguenze:** senza un token approvato, la funzione appare disabilitata.

## ADR-009 · Calcolo SGP4 locale

- **Decisione:** i TLE sono ottenuti da SatNOGS/CelesTrak e la propagazione avviene nel browser con `satellite.js`. La posizione dell'utente non lascia il computer.
- **Validazione:** i test usano un vettore di prova indipendente di Vallado.

## ADR-010 · Test con `node:test` e dispositivi simulati

- **Decisione:** usare il runner nativo di Node, senza Jest o Mocha. Radio, rete e server sono simulati; i test non scrivono mai su hardware né usano credenziali reali.

## ADR-011 · Licenza GPL-3.0-or-later

- **Contesto:** i riferimenti di interoperabilità usano Apache-2.0 (F4HWN, egzumer, DualTachyon), MIT (satellite.js) e GPL-2.0 (OpenGD77).
- **Decisione:** GPL-3.0-or-later, un copyleft che mantiene liberi i miglioramenti ed è compatibile con le dipendenze Apache-2.0 e MIT.
- **Nota:** non viene distribuito codice di OpenGD77 né degli altri riferimenti; l'implementazione è indipendente. Il titolare può cambiare licenza prima di ricevere contributi di terzi.

## ADR-012 · Marchio Bricohams con risorse proprie

- **Decisione:** nome «Bricohams Radio Workspace» e PNG originale di Bricohams Studio, senza ridisegno o ricolorazione e mantenendone le proporzioni. L'interfaccia conserva la propria palette scura. Il 2026-10-21 è stata sostituita l'icona SVG di una «B», che non corrispondeva all'identità del marchio. Provenienza e hash in [BRANDING.md](BRANDING.md).
- **Conseguenza:** non vengono usati loghi OpenGD77, Quansheng o F4HWN e viene dichiarata la non affiliazione.

## ADR-013 · Web statico su origine dedicata

- **Contesto:** si desidera l'uso senza installazione, ma IndexedDB e `localStorage` sono isolati per origine e i backup radio sono dati sensibili.
- **Decisione:** pubblicare un sito statico su GitHub Pages nella radice di un account o un'organizzazione dedicati (`https://<org>.github.io/`), non in un sottopercorso di `bricohams.github.io` (dove risiede Bricohams Studio). L'applicazione rileva la modalità con `runtime.json` (web se manca), usa solo percorsi relativi e dichiara la CSP in `<meta>`. I satelliti vengono generati ogni giorno da un workflow; le funzioni che richiedono server o credenziali (RepeaterBook, download firmware, API RadioID) sono sostituite dal caricamento manuale di file o restano solo locali.
- **Alternative scartate:** sottopercorso di `bricohams.github.io` (condivide origine e archiviazione con altri progetti); proxy pubblico (farebbe transitare dati e credenziali da terzi); replica di RadioID (volume e licenza).
- **Conseguenze:** il web ha meno funzioni della versione locale e l'autore deve creare account od organizzazione e configurare Pages. I pacchetti installabili arriveranno prossimamente.

## ADR-014 · Pubblicazione accettata su origine condivisa

- **Contesto:** l'autore ha deciso di pubblicare su `https://anatolbricoham.github.io/Radio-Web-install/`, senza creare un account dedicato.
- **Decisione:** consentire il deployment fuori da `<org>/<org>.github.io` solo se esiste la variabile di repository `PAGES_SHARED_ORIGIN_ACCEPTED=true`. Supera parzialmente ADR-013.
- **Rischio accettato:** `anatolbricoham.github.io` condivide l'origine con le altre pagine di progetto dell'account (ad esempio `Ham-Clock`, `antenaSatCommrotor`, `Fox_Hunt_Beacon`). Ognuna, se modificata, potrebbe leggere backup radio e profilo memorizzati dal web. Raccomandazione: esportare i backup `.rwb.json` e non dipendere dall'archiviazione del browser.
- **Uscita:** creare un account o un'organizzazione dedicati e spostare il web nella sua radice, eliminando la variabile.

### Aggiornamento della provenienza, 26-10-2026

Il repository attuale è `Brico-Hams/Radio-Web-install` e l'URL Pages
documentato è `https://brico-hams.github.io/Radio-Web-install/`. I precedenti
indirizzi `anatolbricoham` sono contesto storico di ADR-014, non l'URL
attuale per deployment o recupero dati. L'eccezione resta a origine
condivisa: tutti i progetti di `brico-hams.github.io` condividono l'origine,
non solo questo sottopercorso. L'IndexedDB degli utenti non è stato
migrato automaticamente.
