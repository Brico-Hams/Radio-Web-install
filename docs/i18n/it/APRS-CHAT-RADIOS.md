# Chat APRS sulle radio supportate da RadiCodex

Stato della chat APRS (schermata **Chat APRS** del menu principale). La chat parla solo **KISS**: usa `Aprs.kt` (`Kiss`, `KissDecoder`, `Ax25Frame`, `AprsText`, `AprsMessenger`) su un `KissLink` (`KissLink.kt`). Una radio senza APRS/KISS raggiungibile dall'app **non viene simulata** e non compare come origine della chat. La stessa tabella è mostrata nell'app (`AprsChatRadios.kt`).

Collegamenti disponibili:

- **RT-950 Pro (KISS via BLE)**: `Rt950BleKissLink`, su `BleRt950Transport` (`ffe1`). Comportamento dei frame uguale a prima dell'estrazione della chat da `Rt950Activity`.
- **KISS TCP (TNC esterno)**: `TcpKissLink`, socket TCP non cifrato verso un host e una porta scritti dall'utente (Direwolf, un ponte TNC). È la via generica per le radio senza KISS nativo; la radio è gestita da quel TNC, non da RadiCodex. Tempo di connessione 5 s, lettura con timeout di 500 ms, socket chiuso all'uscita dalla schermata.

## Stato per radio

| radio | via APRS/KISS | stato | fonte |
| --- | --- | --- | --- |
| Radtel RT-950 Pro, ricezione | KISS via BLE (`ffe1`), con le opzioni «KISS TNC over BLE (RX)/(TX)» attivate nella radio | in attesa di prova su radio | il testo `strings_rt950.xml:57` la dà per verificata, ma non c'è alcuna prova registrata di questa versione su una radio; `Rt950Ble.kt:23-27`; `ACKNOWLEDGEMENTS.md:34` |
| Radtel RT-950 Pro, trasmissione RF | KISS via BLE | **disattivata per impostazione predefinita (blocco del firmware)**; solo con l'interruttore «TX sperimentale» (Avanzate) | `strings_rt950.xml:57` (TX «INFERENZA non verificata»); lalmonte/radiochat-aprs@9c7b092; erkanz/radtel-RT950PRO@51c84d4; SP3ARK/Radtel-950-Pro-Bluetooth-Programmator@a8bb41a `README.md:235-238`; incidente del 2026-11-12 |
| Qualsiasi radio + TNC KISS esterno | KISS via TCP | in attesa di prova su radio | `KissLink.kt` (`TcpKissLink`); test unitario con `ServerSocket` in `AprsChatTest.kt` (non è una prova su radio) |
| Quansheng UV-K5 / BricoHams Satellite | nessuna in RadiCodex (clonazione/CAT) | non supportato | `Diagnostics.kt:12` |
| Quansheng UV-K10 Pro | nessuna; APRS solo come piano di firmware, senza firmware | non supportato | `docs/UV-K10-PRO-VIABILIDAD.md:7,55` |
| Quansheng TK-11 | nessuna (clonazione sul web) | non supportato | `docs/TK11-INGENIERIA.md` (senza APRS/KISS) |
| OpenGD77 (GD-77, GD-77S, DM-1801, RD-5R, MD-9600, MD-UV380, MD-380, DM-1701, MD-2017, DM-32, UV008) | solo baliza APRS FM in TX nel firmware; senza ricezione AX.25 né TNC | non supportato | `OpenGd77.kt:25-38`; `docs/AYUDA-OPENGD77.md:384-386` |
| AnyTone D878 | nessuna; solo modello di canali | non supportato | `ChannelTemplates.kt:39,265`; `docs/AYUDA-ANYTONE.md` |
| Yaesu FT-817/818/857/897 | solo CAT | non supportato | `RigCat.kt:15-18` |
| Yaesu FTX-1 | solo CAT in RadiCodex | non supportato | `RigCat.kt:21`; `Diagnostics.kt:13` |
| Icom IC-705 (CI-V) | solo CAT in RadiCodex | non supportato | `RigCat.kt:19` |
| (tr)uSDX, QRP Labs QMX/QMX+ e QDX/QDX-M | solo CAT (HF) | non supportato | `RigCat.kt:23-26` |

«Non supportato» significa che RadiCodex oggi non ha una via APRS/KISS per quella radio, non che l'hardware sia privo di APRS. Se l'hardware offre un proprio TNC KISS (ad esempio via Bluetooth o USB), RadiCodex non lo raggiunge: **fonte in sospeso**. Con un TNC esterno in rete si usa la via TCP.

## RT-950 Pro: trasmissione

- Che la scrittura BLE venga confermata **non prova** che la radio trasmetta in RF. La trasmissione deve essere confermata con un **secondo ricevitore**.
- Secondo il README di [lalmonte/radiochat-aprs@9c7b092](https://github.com/lalmonte/radiochat-aprs/tree/9c7b092), alcuni firmware accettano la scrittura KISS senza attivare il PTT.
- [erkanz/radtel-RT950PRO@51c84d4](https://github.com/erkanz/radtel-RT950PRO/tree/51c84d4) segnala TX funzionante con una v0.29 modificata con patch.
- Entrambi i README sono citati così come li ha indicati l'incarico; RadiCodex non ha verificato né il loro contenuto né le loro licenze (**fonte in sospeso**; non si riutilizza codice).
- La chat non scrive nella memoria della radio. I canali 961–990 (`0x7800–0x7BFF`) restano protetti come indica `docs/RADTEL-RT950-PRO.md`.

## Sicurezza della trasmissione

- Prima di ogni invio l'app mostra un avviso che il messaggio **verrà trasmesso in RF**, con origine, destinatario, testo e la nota del collegamento, ed esige la conferma.
- Il nominativo proprio è obbligatorio e viene convalidato con `Ax25Address.isValid` (1–6 caratteri A–Z/0–9, SSID 0–15). Anche la conferma automatica (ack) è disattivata senza un nominativo valido.
- Senza ack, `AprsMessenger` rinvia fino a 3 volte ogni 30 s (`Aprs.kt`).
- Limiti già presenti nel repository: testo da 1 a 67 caratteri ASCII senza `{ | ~` (`AprsText`), percorso fino a 8 ripetitori (`Ax25Frame.encode`).
- Limiti del collegamento RT-950 Pro, secondo il README di erkanz/radtel-RT950PRO@51c84d4 (non sono nel repository): massimo 182 byte AX.25, 6 ripetitori e 127 byte di informazione. Vengono applicati in `Rt950BleKissLink` (`Ax25Limits.RT950`). Per un TNC TCP generico vale solo il limite di 8 ripetitori; altri limiti: **fonte in sospeso**.
- Trasmettere richiede una licenza di radioamatore.
- **RT-950 Pro, solo ricezione per impostazione predefinita:** `Rt950BleKissLink.send()` si rifiuta di scrivere a meno che sia attivo l'interruttore «TX sperimentale (rischio di blocco del firmware)» (Avanzate, disattivato, con avviso). Senza di esso non ci sono nemmeno ack automatico né rinvii. I rinvii vengono annullati subito se il collegamento BLE si chiude o una scrittura fallisce. Il TNC KISS TCP non è interessato.
- Dopo qualsiasi sessione di clonazione/copia/scrittura (`Rt950Activity`) si chiede di spegnere e riaccendere la radio prima di usare KISS; l'avviso compare anche nella chat finché l'utente non conferma «Ho riavviato la radio».

## Fonte in sospeso

- Contenuto e licenza dei README di lalmonte/radiochat-aprs@9c7b092 e erkanz/radtel-RT950PRO@51c84d4 (citati, non verificati).
- Trasmissione RF dell'RT-950 Pro con l'opzione «KISS TNC over BLE (TX)» su ogni firmware.
- Via KISS/APRS propria di FTX-1, IC-705, UV-K10 Pro, AnyTone D878 e TK-11.
- Limiti AX.25 di un TNC esterno specifico.

## Prove su radio

| Data | Radio | Prova | Risultato |
|---|---|---|---|
| 2026-11-12 07:30 | Radtel RT-950 Pro (firmware non identificato), S20 FE, collegamento KISS via BLE | Messaggio APRS da EA5KAO a EA5KAO, «RadiCodex prueba APRS 1», con 3 tentativi a intervalli di 30 s. Secondo ricevitore: SDR BricoHams, ricevitore 3, 144,800 MHz, packet. | **Non conclusiva.** L'app ha scritto il frame via BLE, ma l'SDR di controllo era su 436,795 MHz NFM (profilo satelliti 70 cm) e non su 144,800 MHz packet, quindi non poteva riceverlo. |
| 2026-11-12 07:50 | Radtel RT-950 Pro (firmware non identificato), con l'APRS della radio sul canale A a 144,800 MHz | Lo stesso messaggio, «RadiCodex prueba APRS 2», con 3 tentativi. | **Non conclusiva.** Il frame è stato scritto via BLE, ma l'SDR di controllo era ancora su 436,795 MHz NFM e non su 144,800 MHz packet; ripetere con il ricevitore su 144,800 packet. |
| 2026-11-12 09:44 | Radtel RT-950 Pro, APRS sul canale A a 144,800 MHz | «RadiCodex prueba APRS 3», 4 tentativi tra le 09:44:10 e le 09:45:40. Secondo ricevitore: SDR BricoHams, V3, profilo «144,800 MHz · APRS 2 m», NFM con decodifica packet secondaria; pannello dei pacchetti sorvegliato dal browser. | **Non ricevuto.** Il pannello non ha mostrato alcun frame in circa 5 minuti, né di EA5KAO né di altre stazioni. Quindi non è verificata nemmeno la catena di decodifica dell'SDR (antenna del V3 in 2 m e direwolf). Resta in sospeso un controllo indipendente: ascoltare l'audio dell'SDR durante la trasmissione o guardare il LED di TX della radio. |
| 2026-11-12 10:13 | Radtel RT-950 Pro, nuova modalità KISS (commit 9064001): senza sblocco `ff31`, scrittura su **FF31** | «RadiCodex prueba APRS 4», 4 tentativi. GATT reale: MTU 23 (rifiuta 247), `ff31` solo scrittura con risposta, `ffe1` lettura, scrittura con e senza risposta, e notifica. | **Non ricevuto** sull'SDR (V3, 144,800, packet). |
| 2026-11-12 10:21 | Come sopra, scrittura su **FFE1** | «RadiCodex prueba APRS 5», 4 tentativi. | **Non ricevuto.** L'SDR non ha decodificato alcun frame APRS di nessuno dalle 09:41: la catena di ricezione dell'SDR in 2 m resta non verificata. |
| 2026-11-12 10:24 | Radtel RT-950 Pro, senza RadiCodex: baliza lanciata dal menu APRS della radio stessa, con il canale A a 144,800 MHz | Controllo di riferimento. | **La radio non trasmette:** il LED di TX non si accende e l'SDR non riceve nulla. Con questa configurazione o firmware, la TX APRS dell'unità non funziona nemmeno dal suo stesso menu. Per questo le prove 1–5 non permettono di valutare RadiCodex. |
| 2026-11-12 (pomeriggio) | Radtel RT-950 Pro, invio da RadiCodex via KISS BLE | Invio di un messaggio APRS dalla chat. | **Incidente: il firmware della radio si è bloccato** (segnalazione dell'utente). Da allora il collegamento RT-950 è solo ricezione per impostazione predefinita. |

**Conclusione (2026-11-12):** la TX APRS dell'RT-950 Pro di questa unità resta **non supportata nel suo stato attuale**. Il guasto è nella radio (configurazione o firmware non identificato), non in RadiCodex. Prima di riprovare la chat bisogna ottenere che la baliza propria della radio accenda il LED di TX e compaia su un secondo ricevitore, ad esempio identificando il firmware o provando la patch di erkanz per la v0.29. Da RadiCodex bisogna usare la modalità KISS senza sblocco (commit 9064001).

## Diagnosi finale RT-950 Pro (2026-11-14)

Eseguita secondo il manuale ufficiale del produttore ([radtel-950PRO_2.pdf](https://cdn.shopify.com/s/files/1/0564/8855/8800/files/radtel-950PRO_2.pdf?v=1756451146), tabella dei menu: APRS Set → 1. APRS ON/OFF; 5. Advanced → 5. TNC Type OFF/KISS; User Key → PF2 → Beacon TX):

| Verifica | Risultato |
|---|---|
| APRS ON, TNC Type = KISS, Beacon Setup con nominativo e posizione fissa, PF2 = Beacon TX | Configurato nella radio |
| PTT A su 145,500 MHz (voce) | **Trasmette** (LED rosso) |
| PF2 (Beacon TX) con il canale A su 144,800 MHz | **Non trasmette** (nessun LED rosso); l'SDR (V3, 144,800 MHz, packet) non riceve nulla |

**Conclusione:** la radio trasmette sul canale A, ma non emette APRS, nemmeno la propria baliza. È un guasto di questa unità o del suo firmware (versione non identificata), non di RadiCodex. In RadiCodex, la TX verso l'RT-950 resta disattivata per impostazione predefinita, con il collegamento KISS solo in ricezione. Per riprovare bisogna identificare il firmware e consultare Radtel o provare un firmware che documenti la TX APRS, come la patch di erkanz per la v0.29.
