# Guida al marchio · Bricohams

## Nome

- Prodotto: **Bricohams Radio Workspace**.
- Forma breve: **Bricohams** (barra superiore e piè di pagina).
- Barra laterale: logo originale Bricohams con sottotitolo `RADIO WORKSPACE`, senza duplicare il nome già incluso nell'immagine.

## Logo

[bricohams-logo.png](../../../bricohams-logo.png) è il **PNG originale da 1200 × 446** usato da [Bricohams Studio](https://brico-hams.github.io/Bricohams-Studio/). È stato ottenuto da [assets/logo-bricohams.png, commit 767edd6](https://github.com/Brico-Hams/Bricohams-Studio/blob/767edd66028d10f859346190d0c8044bd8e5a2b2/assets/logo-bricohams.png). Il suo SHA-256 è `0e1bec16953129cfc9c946d24e56347ddfb38878137ba43c7e84729acf811c87`, identico al PNG incorporato nella pagina Studio, verificato il 2026-10-21.

Sostituisce la precedente icona SVG di una «B» con onde, che non era il logo Bricohams. Non ridisegnarlo né inventare una variante del marchio.

Regole d'uso:

- Non deformarlo, ritagliarlo, ricolorarlo o aggiungere ombre. Mantenere sfondo originale e proporzione 1200:446, con `height: auto`.
- Barra laterale: immagine intera larga 166 px (limitata allo spazio disponibile); su mobile, 128 px con sottotitolo accanto. Non nascondere il marchio sugli schermi piccoli.
- README: larghezza di 240 px con altezza proporzionale. Favicon e collegamento desktop Linux usano lo stesso PNG; non esiste una variante quadrata approvata.
- Lasciare almeno 10 px tra immagine e sottotitolo su desktop e 14 px su mobile. Queste misure sono decisioni di impaginazione del progetto, non ulteriori linee guida ufficiali del marchio.
- Non combinarlo con loghi OpenGD77, Quansheng, F4HWN o grid.radio in modo da suggerire affiliazione.

Eccezione specifica per il firmware richiesta il 25-10-2026: il display LCD
monocromatico richiede un adattamento proporzionale dell'originale a 128 × 48,
senza colore, su sfondo vuoto, con `Bricohams BETA` sotto. Viene generato
dal PNG originale, senza disegnare un nuovo marchio. Non sostituisce il PNG
a colori su web o Android. Costruzione e limiti nella
[guida al firmware](BRICOHAMS-FIRMWARE.md#branding-di-avvio-implementato).

## Palette

Restyling del 28-10-2026: arancione Bricohams, superfici neutre e schede
con una gerarchia chiara. Sito e programmi di installazione condividono il design.
Aspetto offre Sistema, Chiaro e Scuro; la scelta viene salvata localmente,
senza account, e segue le modifiche del sistema in modalità Sistema. La guida
usa la stessa scelta. Android adatta i controlli nativi al sistema.
Il logo originale non cambia. Gli stati conservano sempre un testo esplicito.

| Token | Chiaro | Scuro | Uso |
| --- | --- | --- | --- |
| `--bg` | `#f3f5f9` | `#0e1420` | Sfondo |
| `--panel` | `#ffffff` | `#172131` | Schede e pannelli |
| `--line` | `#dce2eb` | `#334157` | Bordi decorativi |
| `--text` | `#19263b` | `#edf2fb` | Testo principale |
| `--muted` | `#526179` | `#afbdd1` | Testo secondario |
| `--mint` | `#a64b00` | `#ffb456` | Testo d'accento |
| `--blue` | `#205da8` | `#9dc5ff` | Link e focus |

Pulsanti primari: testo `#241407` su `--accent: #f7941d`. I test verificano
un contrasto minimo del testo di 4,5:1 nelle due palette. Controlli principali
di 44 px, focus visibile, tabelle con scorrimento interno, navigazione mobile
orizzontale e animazioni solo senza richiesta di riduzione del movimento.

## Struttura

- Barra superiore fissa: stato della connessione (copia di `#radio-status`), badge della modalità (`#mode-badge`) e pulsante «⌁ Connetti», che aziona quello della sezione e viene disabilitato insieme a esso.
- Barra laterale: logo, navigazione e, nelle pagine radio, passaggi numerati (0 Backup e connessione … 4 Firmware) che portano a ogni sezione.
- Etichetta sopra il titolo: `RADIOAFICIÓN · HAZLO TÚ MISMO`.

## Tipografia

Font di sistema (`system-ui`, Segoe UI, Roboto…), senza font web esterni, per rispettare la CSP e non caricare risorse di terzi.

## Tono

- Spagnolo chiaro, tecnico e onesto: i limiti vengono spiegati prima delle promesse.
- Avvisi di sicurezza diretti: cosa può andare storto e come intervenire.
- Nessuna dichiarazione di compatibilità o operazione non verificata.
- L'attribuzione delle fonti dati è sempre visibile.
