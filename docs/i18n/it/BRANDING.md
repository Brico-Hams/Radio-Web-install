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

Manuale ufficiale dei colori BricoHams v1.1 (03-11-2026), PDF
`BricoHams_Guia_Colores_Web_Pantone_Claro_Oscuro_con_Prompt_IA.pdf`
(non incluso nel repository). Sostituisce tutte le palette precedenti
(`#f7941d`, `#F26B21`, `#a64b00`, `#0b1418`, `#0e1420`, `#111d22`, `#172131`,
`#89b9ff`, `#205da8`, `#0A2540` e `#FF6B00`), che non devono più essere usate.

Il selettore Aspetto offre Sistema, Chiaro e Scuro; viene salvato in
`localStorage` e applicato come `data-theme` su `<html>` prima del rendering.
Android segue la modalità del sistema (`res/values/colors.xml` e
`res/values-night/colors.xml`). Gli stati conservano sempre un testo esplicito.

Entrambi i temi: `--brand-ink` `#23272B` (grafite), `--brand-orange` `#F26B1D`
(CTA e dettagli) e `--on-accent` `#23272B` (testo sull'arancione).

| Token | Chiaro | Scuro | Uso |
| --- | --- | --- | --- |
| `--bg` | `#FFFFFF` | `#111518` | Sfondo |
| `--surface` | `#F6F7F8` | `#1C2329` | Schede e pannelli |
| `--border` | `#DCE1E5` | `#38434C` | Bordi |
| `--text` | `#23272B` | `#F6F8FA` | Testo principale |
| `--text-muted` | `#59636B` | `#BAC4CC` | Testo secondario |
| `--link` | `#AA410B` | `#FFA06A` | Link e testo d'accento |
| `--focus` | `#F26B1D` | `#FFC18F` | Contorno `:focus-visible` di 3 px |

Regole (WCAG 2.2 AA):

- Pulsante primario: sfondo arancione `#F26B1D` con testo grafite `#23272B` in entrambi i temi. Mai testo bianco sull'arancione (3,05:1).
- L'arancione `#F26B1D` non si usa come testo piccolo su bianco; nel tema chiaro si usa `#AA410B`.
- Logo: solo il PNG originale, senza filtri né inversione; nel tema scuro, su una discreta placca bianca con angoli arrotondati.
- Tipografia: Inter per l'interfaccia e Montserrat 700-800 per i titoli grandi, con i font di sistema come riserva e senza caricare font remoti.
- Stati (successo/avviso/errore): colori funzionali con contrasto AA in entrambi i temi; non sostituiscono mai l'arancione delle CTA.
- Solo stampa: Pantone 426 C (grafite) e 165 C (arancione; 158 C alternativa). Non sono colori da schermo.
- Firmware con LCD monocromatico: logo di avvio e stringa «Bricohams», senza colori.

| Coppia | Chiaro | Scuro |
| --- | --- | --- |
| Testo / sfondo | 14,6:1 | 17,0:1 |
| Testo secondario / sfondo | 5,9:1 | 10,4:1 |
| Link / sfondo | 6,5:1 | 8,5:1 |
| Grafite sull'arancione (pulsante) | 4,9:1 | 4,9:1 |
| Arancione / sfondo (non testuale) | 3,05:1 | 6,03:1 |
| Bianco sull'arancione (vietato) | 3,05:1 | 3,05:1 |

I valori sono approssimati (calcolati con la formula WCAG); i test automatici
di ogni piattaforma verificano il minimo di 4,5:1 per il testo.

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
