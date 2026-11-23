# Antenne filari HF/VHF: progettazione e analisi

Pagina **Antenne** dell’applicazione. Integra le [antenne per satelliti](ANTENAS-SATELITE.md) e usa lo stesso risolutore a metodo dei momenti (`hardware/antenas/mom.py`), portato in JavaScript in `antenna-core.js`. Tutto viene calcolato nel browser e funziona senza connessione.

## Limiti e sicurezza

- È **solo simulazione**: conduttori perfetti, filo sottile e nessuna perdita ohmica.
- Non c’è un suolo con perdite: l’altezza dal suolo è modellata nello spazio libero o con un piano di terra perfetto (immagine) a z = 0.
- Verifica sempre l’antenna con un analizzatore prima di trasmettere.
- Non trasmettere mai senza un’antenna o un carico adattato.
- I valori di trappole, balun e cavo coassiale li inserisce l’utente; non esiste un database dei cavi.

## Funzioni

| Funzione | Cosa fa | Origine dei numeri |
| --- | --- | --- |
| Geometria | Vista 2D/3D, tabelle modificabili di fili e carichi | Dati dell’utente |
| Scansione e regolazione | SWR, R, X, carta di Smith e regolazione Nelder-Mead per SWR minimo | Modello dei momenti |
| Radiazione | Sezioni in azimut ed elevazione, diagramma 3D, guadagno in dBi e correnti | Modello dei momenti |
| Adattamento | Balun 1:1, 1:2, 1:4, 1:6, 1:9, rete a L e coassiale | Formule di linea e di circuito |

## Modelli e trappole

Sono disponibili modelli per un dipolo a mezz’onda, una V invertita e un dipolo multibanda con trappole (da 2 a 5 bande e fino a 8 trappole LC in parallelo). Fissa C per calcolare L, oppure L per calcolare C, con la risonanza `f = 1/(2π√(LC))`. Ogni sezione parte da c/(4f) senza fattori di accorciamento inventati: usa il consulente e la regolazione automatica.

## Formato CSV della misura

Il file dell’analizzatore può contenere colonne di frequenza e SWR, oppure frequenza, R e X. Vengono rilevati l’intestazione, le unità Hz, kHz o MHz, il separatore (virgola, punto e virgola o tabulazione) e la virgola decimale. Esempio: `frecuencia;swr`.

## Bande per radio

L’elenco delle bande è limitato a quelle su cui la radio può trasmettere secondo i dati del repository: Icom IC-705 e IC-9700 (piani di banda di `FREQUENCY_RANGES.md`), Yaesu FTX-1 (14 bande da `third_party/ftx1/rigplane-rigplane-core/rigs/ftx1.toml`), TH-D75 (intervalli della banda A), OpenGD77 (limiti predefiniti, né piano di banda né autorizzazione), Quansheng e AnyTone. truSDX e QMX hanno solo l’intervallo di sintonia CAT (non limiti TX). Se una radio non ha dati TX nel repository (es. TK11) viene mostrato «pendiente de fuente».

## Misurare il SWR dalla radio

L’app non mette mai la radio in trasmissione: trasmetti tu e lo strumento viene letto solo mentre la radio indica TX. I punti (frequenza, SWR) sono sovrapposti alla curva del modello come un CSV importato. Su desktop si usa la stazione remota (`GET /api/remote/swr`) o, per l’FTX-1, Web Serial diretto (sola lettura di `TX;`, `FA;` e `RM6;`); su Android la schermata antenne (WebView senza rete, CSP rigorosa) legge la radio del profilo via CAT. Non trasmettere mai senza un carico adattato o un’antenna.

| Radio | Strumento SWR via CAT | Fonte |
| --- | --- | --- |
| Icom IC-705 | ok | CI-V `15 12` (guida di riferimento CI-V dell’IC-705 p. 5) e TX `1C 00` (p. 15); `rigs/ic705.toml` |
| Icom IC-7300 | parziale (scala fino a SWR 3,0) | CI-V `15 12` / `1C 00` (`rigs/ic7300.toml`) |
| Icom IC-7300MK2 | parziale (scala fino a SWR 3,0) | CI-V `15 12` / `1C 00` (`rigs/ic7300mk2.toml`) |
| Icom IC-7610 | parziale (scala fino a SWR 3,0) | CI-V `15 12` / `1C 00` (`rigs/ic7610.toml`) |
| Icom IC-9700 | parziale (scala fino a SWR 3,0) | CI-V `15 12` / `1C 00` (`rigs/ic9700.toml`) |
| Icom IC-905 | parziale (scala fino a SWR 3,0) | CI-V `15 12` / `1C 00` (`rigs/ic905.toml`) |
| Icom IC-7100 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Icom IC-7200 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Icom IC-7410 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Icom IC-7600 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Icom IC-7700 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Icom IC-7760 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Icom IC-7800 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Icom IC-7850 / IC-7851 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Icom IC-9100 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Icom IC-R8600 | pendiente de fuente | solo ricevitore, non trasmette |
| Yaesu FTX-1 | parziale (scala approssimata) | `RM6;` in `docs/FTX1-KNOWLEDGE.md` |
| Yaesu FT-710 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Yaesu FT-991A | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Yaesu FTDX10 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Yaesu FTDX101D | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Yaesu FTDX101MP | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Yaesu FTDX3000 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Yaesu FT-817 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Yaesu FT-818 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Yaesu FT-857 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Yaesu FT-897 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Kenwood TS-590S | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Kenwood TS-590SG | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Kenwood TS-890S | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Kenwood TS-990S | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Kenwood TH-D75 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Elecraft K3S | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Elecraft K4 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| FlexRadio FLEX-6400 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| FlexRadio FLEX-6400M | pendiente de fuente | nessun comando di lettura SWR nel repository |
| FlexRadio FLEX-6600 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| FlexRadio FLEX-6600M | pendiente de fuente | nessun comando di lettura SWR nel repository |
| FlexRadio FLEX-6700 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| FlexRadio FLEX-8400 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| FlexRadio FLEX-8400M | pendiente de fuente | nessun comando di lettura SWR nel repository |
| FlexRadio FLEX-8600 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| FlexRadio FLEX-8600M | pendiente de fuente | nessun comando di lettura SWR nel repository |
| FlexRadio AURORA-510 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| FlexRadio AURORA-510M | pendiente de fuente | nessun comando di lettura SWR nel repository |
| FlexRadio AURORA-520 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| FlexRadio AURORA-520M | pendiente de fuente | nessun comando di lettura SWR nel repository |
| QRP Labs QMX / QMX+ | pendiente de fuente | `SW;` senza scala documentata |
| QRP Labs QCX | pendiente de fuente | nessun comando di lettura SWR nel repository |
| QRP Labs QDX | pendiente de fuente | nessun comando di lettura SWR nel repository |
| (tr)uSDX | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Hermes Lite 2 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Quansheng UV-K5 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| OpenGD77 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Radtel RT-950 Pro | pendiente de fuente | nessun comando di lettura SWR nel repository |
| Radtel RT-S10 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| AnyTone D878 | pendiente de fuente | nessun comando di lettura SWR nel repository |
| TK11 | pendiente de fuente | nessun comando di lettura SWR nel repository |

Gli Icom indicati come parziali hanno solo i punti documentati SWR 1,0–3,0 (raw 0–120); un valore raw superiore viene scartato. Il livello `SWR` di Hamlib letto dalla stazione remota è mostrato per una radio solo se Hamlib lo restituisce; il repository non documenta quali backend lo fanno, quindi le radio sopra restano «pendiente de fuente».
