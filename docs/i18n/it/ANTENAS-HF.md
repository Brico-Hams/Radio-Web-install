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

L’elenco delle bande è limitato a quelle su cui la radio può trasmettere secondo i dati del repository: Icom IC-705 e IC-9700 (piani di banda di `FREQUENCY_RANGES.md`), OpenGD77 (limiti predefiniti, né piano di banda né autorizzazione), Quansheng e AnyTone. Se una radio non ha dati TX nel repository viene mostrato «pendiente de fuente».
