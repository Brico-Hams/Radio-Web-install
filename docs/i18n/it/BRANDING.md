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
- Barra laterale: immagine intera larga 178 px (limitata allo spazio disponibile); su mobile, 144 px con sottotitolo accanto. Non nascondere il marchio sugli schermi piccoli.
- README: larghezza di 240 px con altezza proporzionale. Favicon e collegamento desktop Linux usano lo stesso PNG; non esiste una variante quadrata approvata.
- Lasciare almeno 10 px tra immagine e sottotitolo su desktop e 14 px su mobile. Queste misure sono decisioni di impaginazione del progetto, non ulteriori linee guida ufficiali del marchio.
- Non combinarlo con loghi OpenGD77, Quansheng, F4HWN o grid.radio in modo da suggerire affiliazione.

Eccezione specifica per il firmware richiesta il 25-10-2026: il display LCD
monocromatico richiede un adattamento proporzionale dell'originale a 128 × 48,
senza colore, su sfondo vuoto, con `Bricohams BETA` sotto. Viene generato
dal PNG originale, senza disegnare un nuovo marchio. Non sostituisce il PNG
a colori su web o Android. Costruzione e limiti nella
[guida al firmware](BRICOHAMS-FIRMWARE.md#branding-de-arranque-implementado).

## Palette

**Modifica richiesta il 25-10-2026:** il colore aziendale indicato
dall'utente è **l'arancione**. La palette verde-blu qui sotto descrive
l'implementazione web attuale, non l'identità obiettivo. Android usa già
`#FF9800` come accento del tema; ciò non dimostra contrasto o usabilità
su tutti i controlli e dispositivi. La migrazione finale del web
all'arancione avverrà dopo completamento e test delle funzioni, nella
sequenza richiesta. Tonalità esatta e contrasti dovranno essere validati
prima di sostituire i token; non ricolorare il logo originale né usare
il solo colore per comunicare gli stati.

Interfaccia ispirata a Bricohams Studio: sfondo scuro, schede e accento verde-blu. La seguente palette è di Radio Workspace, non una dichiarazione di corrispondenza esatta con i colori di Studio né una ricolorazione del logo.

| Token | Colore | Uso | Contrasto (AA) |
| --- | --- | --- | --- |
| `--bg` | `#0b1418` | Sfondo | — |
| `--panel` | `#111d22` | Schede e pannelli | — |
| `--line` | `#1f3238` | Bordi | decorativo |
| `--text` | `#e6f1f2` | Testo principale | 16,2:1 sullo sfondo; 14,9:1 sul pannello |
| `--muted` | `#8fa7ab` | Testo secondario | 7,4:1 sullo sfondo; 6,8:1 sul pannello |
| `--accent` (`--mint`) | `#2bb3a3` | Accento, focus e stati corretti | 7,2:1 sullo sfondo; 6,6:1 sul pannello |
| `--blue` | `#89b9ff` | Link e accento secondario | 8,5:1 sul pannello |

Testo dei pulsanti primari: `#042420` sull'accento (6,3:1).

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
