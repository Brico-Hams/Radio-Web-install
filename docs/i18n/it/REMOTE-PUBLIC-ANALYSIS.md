# Analisi delle funzioni pubbliche di RemoteMyShack

Traduzione di `remote-station/docs/analisis-publico.md` (fonte di riferimento in spagnolo).

## Ambito e limiti

Rivista il 20 novembre 2026 sulla base delle pagine pubbliche collegate più
sotto e delle immagini fornite nel contesto. Questa analisi raccoglie
affermazioni commerciali e categorie funzionali; non ispeziona il codice del
servizio, non aggira controlli e non convalida in modo indipendente il suo
funzionamento. Non verranno copiati codice, marchi, testi, risorse grafiche né
protocolli privati. L'interfaccia di BricoHams ha identità e design propri.

L'elenco del produttore non è una specifica di compatibilità per BricoHams. La
beta Yaesu indicata nella pagina dell'FTX-1 vi è dichiarata come basata sulla
documentazione, senza test del produttore di quel prodotto.

## Categorie annunciate pubblicamente

| Categoria | Descrizione annunciata | Stato BricoHams |
|---|---|---|
| Console web responsive/PWA | Navigazione da telefono, tablet e computer; installazione nella schermata iniziale | Implementata: `remote.webmanifest`, `remoto.webmanifest`, `remote-sw.js` (solo file statici, mai `/api` né token) e `remote-station/apps/web-console/public/sw.js` |
| Controllo CAT | Frequenza, VFO/split, bande, modi, filtri, RIT/XIT e DSP/guadagni secondo la radio | Implementato tramite `rigctld` in `remote-agent.cjs`; estensioni per radio solo con fonte (`remote-catalog.cjs`) |
| Scope e waterfall | Scope della radio, regolazione e selezione del segnale per la sintonia | Parziale: waterfall locale nella console; nessun waterfall nell'«ascolto pubblico» (pendiente de fuente) |
| Audio | Ricezione a bassa latenza e audio TX da microfono/cuffie | Implementato (RX e TX con lease in `remote-agent.cjs`); il TX dell'ospite richiede un permesso esplicito |
| Periferiche di sintonia | FlexControl, CTR2-MIDI e tastiera/paddle, secondo la pagina pubblica | In sospeso |
| Accessori di stazione | Amplificatori, tuner, commutatori, relè, PDU e rotori | Parziale: rotore (`rotor.py`, Android `Rotor*`); il resto in sospeso |
| Multi-radio | Selezione di più apparati per stazione | Parziale: registro delle radio, lease/PTT per radio e `GET /api/radios` in `remote-ops.cjs`; un agente pilota ancora un solo `rigctld` |
| Ruoli/ospiti | Ospiti con permessi per radio, solo ascolto o trasmissione, e limiti | Implementato nell'agente Node: token proprio per ospite, bande e potenza max. applicate nell'agente, revoca (`remote-ops.cjs`, `/api/guests`); nessuna UI di invito né Python/Android |
| Registro e operatività | Logbook ADIF, mappe, diplomi, DX cluster, avvisi, storico TX | Parziale: storico TX con CSV (`/api/txlog.csv`); il resto in sospeso |
| Modi digitali | CW, RTTY, PSK, SSTV, FT8/FT4/WSPR e RADE, secondo piano/prodotto | Parziale: WSJT-X limitato (vedi `REMOTE_STATION.md`); il resto in sospeso |
| Sicurezza TX | Rilascio alla perdita del collegamento, timeout ed esclusione dell'operatore | Implementata: heartbeat 1 s, limite di tempo, SWR, un solo operatore, rilascio a schermo nascosto/perdita di focus/background (web e Android) |
| Accensione/spegnimento remoto | Accendere/spegnere la radio | Parziale: spegnimento FTX-1 `PS0` (`docs/FTX1-KNOWLEDGE.md`) con conferma nell'agente Node; IC-705 `18 00`/`18 01` solo come builder testato in Python (`icom_civ.py`), non collegato; il resto pendiente de fuente |
| Ascolto pubblico | Audio in sola ascolto | Implementato, disattivato per impostazione predefinita, senza controllo e con limite di frequenza (`listenLive`) |
| Aggiornamento dell'agente | Avviso di nuove versioni | Implementato, opt-in: solo release di GitHub, firma Ed25519 + SHA-256, mai installazione senza consenso |
| Rete | Agente con connessione in uscita, collegamento cifrato diretto o relay | Implementata (`remote-relay.cjs`, TLS) |
| Applicazioni | Web mobile e app Apple TV di solo ascolto | Web/Android implementati; Apple TV fuori ambito |

Confronto delle radio: i 44 modelli dell'elenco del terzo (rivisto il
22 novembre 2026: 17 Icom, 13 FlexRadio, 4 Kenwood, 7 Yaesu, 2 Elecraft e
Hermes Lite 2) sono presenti in `data/remote-station-catalog.json` (IC-7850 e
IC-7851 condividono una voce). BricoHams aggiunge inoltre (tr)uSDX, QMX/QMX+ e
QCX/QDX. L'accensione/spegnimento remoto ha una fonte solo per lo spegnimento
dell'FTX-1 (`PS0`) e per l'IC-705 (CI-V `18 00`/`18 01`, guida CI-V dell'IC-705
p. 5 e p. 18; builder in
`remote-station/bricoham_remote_station/drivers/icom_civ.py`); il resto resta
«pendiente de fuente».

Le capacità, i livelli di piano, il prezzo e la compatibilità descritti
appartengono al prodotto analizzato. Non vengono replicati come specifica né
presentati come funzioni di BricoHams.

L'elenco del terzo comprende 44 modelli Icom, FlexRadio, Kenwood, Yaesu,
Elecraft e Hermes Lite. Il proprietario ha aggiunto TRuSDX e QMX+ come candidati
di BricoHams; il supporto di questi due non è attribuito al terzo. I 46
candidati figurano nella [matrice delle connessioni](../../../remote-station/docs/radio-conexiones-candidatas.md).

## Criteri per un'alternativa propria

1. Dare priorità a osservabilità, controllo RX e documentazione riproducibile.
2. Separare controllo CAT, flussi audio, stazione e console tramite contratti
   versionati.
3. Implementare ogni famiglia/modello solo con riferimenti pubblici e test.
4. Mantenere PTT/TX inattivo fino ad autorizzazione esplicita e test di
   sicurezza con hardware.
5. Dare priorità a un web responsive/PWA per l'operatore; ospitare nell'agente
   una UI locale di configurazione, senza permettere al browser di aggirare i
   limiti dell'agente.
6. Usare un client Android nativo separato se USB Host/OTG diventa una via per
   l'agente; questa via non è presupposta per tutti i telefoni.

## Fonti primarie

- [RemoteMyShack: funzioni, sicurezza e radio](https://www.remotemyshack.com/#pricing)
- [RemoteMyShack: scheda pubblica Yaesu FTX-1](https://www.remotemyshack.com/radios/yaesu-ftx-1)
- [Hamlib: backend FTX-1](https://github.com/Hamlib/Hamlib/tree/master/rigs/yaesu/ftx1)
- [Hamlib: note di rilascio 4.7](https://github.com/Hamlib/Hamlib/blob/master/ReleaseNotes_4.7.md)
- [Hamlib: documentazione di `rigctld`](https://github.com/Hamlib/Hamlib/blob/master/doc/man1/rigctld.1)
- [DL2MAN: (tr)uSDX, CAT e streaming](https://dl2man.de/5-trusdx-details/)
- [QRP Labs: QMX+ e manuale CAT](https://qrp-labs.com/qmxp.html)

La scheda tecnica FTX-1/SPA-1 registra quali evidenze provengono da Hamlib e
quale verifica primaria/hardware è ancora in sospeso.
