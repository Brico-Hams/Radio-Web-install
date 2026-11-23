# CW remoto, tastiera/MIDI e log (`remote-cw.cjs`, `remote-log.cjs`, `remote-controls.js`)

Progetto proprio; l'elenco RemoteMyShack (`data/third-party/RMS-2026-11-22.md`) è solo riferimento.

## Invio CW remoto (keyer della radio)

| Radio | Comando | Fonte |
| --- | --- | --- |
| Yaesu FTX-1 | `KM{slot}{TEXT};` poi `KY0{slot};`, arresto `KY00;`, fino a 50 caratteri | `docs/FTX1-KNOWLEDGE.md` righe KM/KY |
| Icom IC-705 | CI-V `FE FE A4 E0 17 <ASCII> FD`, fino a 30 caratteri, arresto = dati `FF` | Guida CI-V IC-705 p.3, p.5, p.18 |
| Altre radio del catalogo capaci di trasmettere | Hamlib `rigctl b` / `\send_morse` | Solo nome Hamlib; supporto per modello non documentato (parziale) |
| Keyer nativo Kenwood KY, Elecraft KY, QMX, (tr)uSDX, Flex, Hermes Lite 2 | pendiente de fuente | nessuna fonte nel repository |

Il testo è in maiuscolo, limitato al set di caratteri documentato, e la durata è limitata (60 s predefiniti, 120 s massimo). L'invio è disattivato per impostazione predefinita, un solo messaggio alla volta, rifiutato mentre il trasmettitore è bloccato (intervento ROS, arresto di emergenza) e `stop()` è sempre consentito. Non trasmettere mai senza carico adattato o antenna. Le memorie F1-F8 espandono `{CALL}`, `{MYCALL}`, `{RST}` e `{NR}`.

## Log

- Import/export ADIF con le stesse regole dell'import Android: solo ASCII, 16 MB / 50000 record, nessun campo duplicato, campi obbligatori CALL, QSO_DATE, TIME_ON, FREQ, MODE, RST_SENT, RST_RCVD.
- Controllo duplicati per nominativo, banda e modo. Il progresso DXCC, WAS (solo DXCC 291), locatore e POTA è contato dai campi del log; nessuna tabella di prefissi per dedurre le entità.
- Gli spot DX sono marcati `new-call`, `new-slot` o `worked` rispetto al log.
- Grayline: posizione del sole e terminatore da disegnare su `data/world-land-110m.txt`.

## Tastiera e MIDI

I messaggi MIDI note e control-change (formato MIDI 1.0) sono associati ad azioni di sintonia, banda, memoria CW e arresto. PTT, portante di sintonia e amplificatore in funzione non possono mai essere associati. Esc arresta sempre. Layout FlexControl HID e CTR2-MIDI: pendiente de fuente (le associazioni le definisce l'operatore).

## Agente e console

L’agente accetta `{"cmd":"cw","text":"CQ TEST","wpm":20,"slot":5}` e `{"cmd":"cwstop"}` su `POST /api/cmd`. `cwEnabled` in `remote-agent.json` è `false` per impostazione predefinita, `cwMaxSeconds` limita il messaggio. Un messaggio si ferma con `cwstop`, a ogni rilascio del PTT o intervento del SWR, quando l’operatore perde il controllo, quando la radio si disconnette e quando l’agente si chiude. La console ha una scheda CW (testo, WPM, memorie F1-F8, Esc per fermare). I modelli Icom usano la base Hamlib perché nessun trasporto CI-V tramite rigctld è documentato.

## Matrice di supporto per radio

Unione di `data/remote-station-catalog.json`, dei driver Python e dei profili Android (`Profile.kt`). `ok` = comando con fonte e collegato; `partial` = con fonte solo come base Hamlib `b` / `send_morse` (supporto per modello non verificato; l'agente rifiuta se rigctld risponde con un errore); `pendiente de fuente` = nessuna fonte nel repository, disattivato. La decodifica/trasmissione digitale (decoder FT8/FT4/WSPR/CW/RTTY/PSK31/SSTV sull'audio remoto) non è ancora portata nel livello condiviso: `pendiente de fuente` per tutte le radio.

| Radio | Collegamento | Invio CW | Memorie del keyer | Decodifica/TX digitale |
| --- | --- | --- | --- | --- |
| Yaesu FTX-1 | CAT grezzo (`KM`/`KY`) | ok | ok | pendiente de fuente |
| Icom IC-705 | piano CI-V (guida p.3, p.5, p.18), inviato tramite Hamlib | partial | partial | pendiente de fuente |
| Icom IC-7100, IC-7200, IC-7300, IC-7300MK2, IC-7410 | Hamlib `b` | partial | partial | pendiente de fuente |
| Icom IC-7600, IC-7610, IC-7700, IC-7760, IC-7800 | Hamlib `b` | partial | partial | pendiente de fuente |
| Icom IC-7850 / IC-7851, IC-905, IC-9100, IC-9700 | Hamlib `b` | partial | partial | pendiente de fuente |
| Icom IC-R8600 | solo ricevitore | non applicabile | non applicabile | pendiente de fuente |
| FlexRadio FLEX-6400, 6400M, 6600, 6600M, 6700 | SmartSDR CAT tramite Hamlib `b`; keyer nativo pendiente de fuente | partial | partial | pendiente de fuente |
| FlexRadio FLEX-8400, 8400M, 8600, 8600M | SmartSDR CAT tramite Hamlib `b`; keyer nativo pendiente de fuente | partial | partial | pendiente de fuente |
| FlexRadio AURORA-510, 510M, 520, 520M | SmartSDR CAT tramite Hamlib `b`; keyer nativo pendiente de fuente | partial | partial | pendiente de fuente |
| Kenwood TS-590S, TS-590SG, TS-890S, TS-990S | Hamlib `b`; `KY` nativo pendiente de fuente | partial | partial | pendiente de fuente |
| Yaesu FT-710, FT-991A, FTDX10, FTDX101D, FTDX101MP, FTDX3000 | Hamlib `b`; `KY` nativo pendiente de fuente (solo l'FTX-1 ha una fonte) | partial | partial | pendiente de fuente |
| Elecraft K3S, K4 | Hamlib `b`; `KY` nativo pendiente de fuente | partial | partial | pendiente de fuente |
| QRP Labs QMX / QMX+, QCX / QDX | Hamlib `b`; keyer nativo pendiente de fuente | partial | partial | pendiente de fuente |
| DL2MAN (tr)uSDX | Hamlib `b`; keyer nativo pendiente de fuente | partial | partial | pendiente de fuente |
| Hermes Lite 2 | CAT piHPSDR tramite Hamlib `b` | partial | partial | pendiente de fuente |
| Yaesu FT-817, FT-818, FT-857, FT-897 (solo Android) | CAT a cinque byte, nessun comando keyer con fonte | pendiente de fuente | pendiente de fuente | pendiente de fuente |
| Kenwood TH-D75 (solo Android) | CAT in sola lettura | pendiente de fuente | pendiente de fuente | pendiente de fuente |
| Quansheng UV-K5, OpenGD77, Radtel RT-950 Pro / RT-S10, AnyTone D878, TNC KISS (solo Android) | nessun percorso shack remoto, nessun keyer CW | non applicabile | non applicabile | pendiente de fuente |

Xiegu non è nel catalogo, nei driver Python né nei profili Android, quindi non c'è una riga.

## Pendiente de fuente (disattivato)

Ricerca QRZ.com XML, riga di comando TQSL (LoTW), decoder FT8/FT4/WSPR/CW/RTTY/PSK31, SSTV nella console web, tabella prefissi DXCC, FlexControl HID.
