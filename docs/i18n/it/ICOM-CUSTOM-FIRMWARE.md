# Firmware personalizzato Icom IC-705 e IC-9700 (transverter)

La pagina Icom di questa applicazione prepara il firmware personalizzato di Dawid SQ6EMM per l'Icom IC-705 (E/J, v1.40) e l'IC-9700 (E, v1.50). È pensato per transverter per microonde. Non è un prodotto Icom e non è affiliato a Icom: è un progetto della comunità radioamatoriale con licenza MIT. Bricohams NON lo ha provato su nessuna radio.

Il firmware è distribuito solo come patch. Tu fornisci il file `.dat` ufficiale di Icom, il browser applica la patch sul tuo computer e ottieni un `.dat` da installare con la normale procedura di aggiornamento da scheda SD. Nulla viene caricato su alcun server e la radio NON viene programmata via USB né Web Serial.

## Cosa fa il firmware

- Transverter: 8 posizioni (`TRV1` a `TRV8`), con la frequenza RF reale sul display e via CI-V fino a 122 GHz.
- Per transverter: potenza massima in TX, ritardo TX (fino a 300 ms, tutti i modi) e, sull'IC-9700, inibizione del PTT.
- IC-9700: transverter attivo indipendente per MAIN e SUB, lo scambio MAIN/SUB lo mantiene e in modo SAT le impostazioni TX seguono il transverter SUB.
- Scala dello spettro e della cascata di 10, 6, 3 o 1 dB per divisione, con il livello di rumore ancorato automaticamente.
- IC-705: gamme TX estese e TX sui 4 m (70 MHz) nella base E; la variante J estende 1.6-54, 68-74.8, 118-174 e 400-470 MHz. Trasmetti solo dove la tua licenza lo consente.
- App da scheda SD: MENU, SET, Apps.
- Bootloader A/B proprio con ripiego sull'altro blocco di firmware.
- La schermata di avvio indica che il firmware è di Dawid SQ6EMM; il testo di versione della radio resta quello ufficiale.

## File supportati

Il browser calcola l'MD5 del file scelto e lo confronta con questo elenco (`docs/patches/index.json` del progetto). Sono accettati solo file ufficiali non modificati.

| Radio | File ufficiale | MD5 di ingresso | Release | MD5 di uscita |
| --- | --- | --- | --- | --- |
| IC-9700 E 1.50 | `9700E150.dat` | `6f04fd2248ba39254ed01b30b52ce36a` | `20261113v3` | `51e9d2da39790357f220f3bea3fe4879` |
| IC-705 E 1.40 | `705E140.dat` | `2c9c1d7f3fc80ef173e01d841cd1248a` | `20261113v1` | `1a4577ca926089198bcdf63155ac7410` |
| IC-705 J 1.40 | `705J140.dat` | `b605171288db4a74e0992a8f2afcb1c3` | `20261113v1` | `d7a7f87b9b16f262b188fe3735b3682b` |

Il file di uscita mantiene il nome della release, per esempio `9700E150_20261113v3.dat`. La pagina offre il download solo se l'MD5 del risultato coincide esattamente con quello della build provata dall'autore.

## Come funziona il contenitore

Il file `.dat` di Icom è un contenitore a più livelli. La patch li disfa, modifica l'immagine e li richiude:

1. Trasformazione autokey: il contenuto è offuscato con una chiave che dipende dai dati stessi e si decodifica byte per byte.
2. Compressione LZSS: l'immagine del firmware è compressa; si decomprime per applicare la patch e si ricomprime alla fine.
3. Sigillo MD5: il contenitore termina con l'MD5 del contenuto, che si ricalcola dopo la patch.
4. Bootstrap iniziale all'indirizzo `0x10000`, dove si installa il bootloader A/B proprio.

La patch è un file JSON con operazioni del tipo copia N byte dall'indirizzo X dell'immagine ufficiale, più il nuovo codice del progetto. Poiché contiene solo istruzioni e codice proprio, non include nessun byte del firmware Icom: per questo serve il tuo file ufficiale. Prima di offrire il risultato, la pagina verifica che l'MD5 di ingresso e quello di uscita siano quelli attesi.

## Bootloader A/B

Il firmware conserva due blocchi (A e B). Se il nuovo non si avvia o vuoi tornare al precedente, il bootloader permette di scegliere l'altro blocco:

- IC-9700: tieni premuto POWER mentre colleghi l'alimentazione DC, circa 5 s.
- IC-705: tieni premuto POWER all'accensione finché il LED lampeggia, circa 3 s.

Conserva sempre il file ufficiale: reinstallarlo riporta la radio al firmware di fabbrica.

## Installazione da scheda SD

1. Scarica da Icom il `.dat` ufficiale per la tua radio e versione (vedi la tabella) e non modificarlo.
2. Nella pagina Icom scegli o trascina quel file, attendi il riconoscimento e premi il pulsante per preparare il firmware.
3. Scarica il `.dat` risultante quando la pagina conferma che l'MD5 coincide.
4. Copia il file sulla scheda SD seguendo la procedura di aggiornamento firmware del manuale Icom della tua radio.
5. Aggiorna la radio con quella procedura e attendi che termini senza togliere l'alimentazione.
6. Controlla la schermata di avvio e verifica il menu dei transverter.

## Alternativa senza browser

Il progetto include uno strumento da riga di comando che fa lo stesso senza browser: `third_party/icom-custom-firmware/icom_patch.py`. Si esegue con Python 3, per esempio `python3 icom_patch.py patches/9700E150_20261113v3.json 9700E150.dat 9700E150_20261113v3.dat`, dalla cartella del progetto. Il risultato deve avere lo stesso MD5 di uscita della tabella. Il test del browser del progetto si avvia con `npm run test:icom-upstream`.

## Aggiungere una nuova release

Le release sono dichiarate in `releases.json` del progetto originale. Per pubblicarne una nuova si genera la patch JSON in `patches/` e si rigenera l'indice con `tools/build_index.py`, che scrive `docs/patches/index.json`. Poi copia la patch e l'indice in `third_party/icom-custom-firmware/docs/patches/` e aggiungi la nuova patch all'elenco dei file consentiti di `server.cjs`. Questa copia integrata non si modifica a mano: si aggiorna portando un nuovo commit del progetto originale.

## Sicurezza

- È firmware non ufficiale: può rendere la radio inutilizzabile e può far decadere la garanzia Icom.
- Trasmetti solo su frequenze e con potenze che la tua licenza consente. L'IC-705 estende le gamme TX e usarle correttamente è tua responsabilità.
- Verifica il ritardo TX e la potenza di ogni posizione di transverter con un carico fittizio prima di collegare un transverter o un'antenna.
- Sono accettati solo file ufficiali non modificati e l'uscita deve coincidere con l'MD5 provato.
- Conserva il file ufficiale e la scheda SD per tornare indietro e non togliere l'alimentazione durante l'aggiornamento.

## Licenza e attribuzione

Basato su icom-custom-firmware di Dawid SQ6EMM (licenza MIT). Repository: [icom-custom-firmware](https://github.com/sq6emm/icom-custom-firmware). Pagina web del patcher: [web patcher](https://sq6emm.github.io/icom-custom-firmware/). Discussione sul forum: [mikrofale.cafe](https://mikrofale.cafe/showthread.php?tid=1296). Il testo della licenza MIT è in `third_party/icom-custom-firmware/LICENSE` e viene pubblicato insieme all'applicazione.

## Dove si trova in questo repository

- `icom.html` e `icom-ui.js`: la pagina e la sua logica.
- `third_party/icom-custom-firmware/`: copia non modificata del progetto originale al commit `3d30e461d7bcbd39b782c1823764f305639ee9a8`.
- `third_party/icom-byof/`: copia non modificata della documentazione di reverse engineering al commit `a91231f64e8afbe34353994786e8276a3b54f1a9`. Maggiori dettagli in [ICOM-FIRMWARE-INTERNALS.md](ICOM-FIRMWARE-INTERNALS.md) e [ICOM-PATCH-ANALYSIS.md](ICOM-PATCH-ANALYSIS.md).
- `tests/icom.test.cjs`: test della pagina e dei file serviti.

Bricohams NON ha provato questo firmware su una radio reale. I test automatici verificano solo la pagina e i file pubblicati; la validazione della patch è quella dell'autore originale.
