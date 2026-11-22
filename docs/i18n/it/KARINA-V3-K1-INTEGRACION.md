# Revisione di karina-v3-k1 e integrazione in BricoHams (UV-5K V3)

## Revisione upstream registrata

| Campo | Valore |
|---|---|
| Repository | https://github.com/autumn1rain/karina-v3-k1 |
| Revisione (HEAD) | `0f5dbcba599b3598e6d415352ef9fd234d2d2a79` (ultimo push 2026-11-04) |
| Licenza | Apache-2.0 |
| Release | `v2026.11.02` (karina-v3/k1 `.bin` e `.packed.bin`, `calibration.bin`; «fix button lock fn1 fn2 by keyboard lock F») e `v2026.10.30` |
| Base dichiarata | fagci uv-k5 mod v1.2.1 |
| Contenuto | Solo README (5 lingue), manuale PDF, LICENSE e sito di documentazione. **Non c'è codice sorgente del firmware.** |

## Metodo e licenze

Upstream non pubblica i sorgenti, quindi non si copia né si decompila alcun binario.
Le funzioni portate sono una reimplementazione indipendente (clean-room) a partire dal
comportamento descritto nel manuale pubblico, sulla base F4HWN già fissata in BricoHams.
Il nuovo codice è GPL-3.0-or-later (BricoHams); gli avvisi Apache-2.0 della base sono conservati.
Si accredita autumn1rain/karina-v3-k1 (Apache-2.0) come origine delle idee funzionali.
I firmware restano contrassegnati con `derivedFromKarina:false`.

## Inventario

| Funzione Karina | Stato in BricoHams | Motivo |
|---|---|---|
| Liste di scansione, scansione CTCSS/DCS | Esiste | F4HWN `SCAN_SUBAUDIBLE`, liste di scansione |
| Roger, scrambler, AFC, AM fix, LNA, rx_filt, STE | Esiste | Presenti nella base |
| Blocco tastiera e FN1/FN2 laterali (fix v2026.11.02) | Esiste | `set_lck` / `SET_LCK_ACTIONS` |
| Spettro con preset, blacklist, cattura RX | Esiste | Modulo spectrum |
| **Preset di banda integrati** | **Portato** (spectrum, tasto 2) | 11 finestre RX all'interno di 136–174 / 400–470 MHz |
| **Loot (elenco di catture)** | **Portato** (spectrum, tasti 1/7 in cattura) | 32 voci, senza età; solo RX |
| Auto-beacon F+1/2/3, tabella DCS→dBm, PTT-Holder, randomizer | Incompatibile | TX: contrasta con i limiti RF; ARDF/Satellite/Spectrum disattivano il beacon |
| Tx3k, DEV, 03t, c0db, registri SCR, F_Corr/PWR | Incompatibile | Scrivono la calibrazione o i registri RF |
| Preset di configurazione 0/1/2, Sql2, mappa FN1/FN2 | Incompatibile | Cambiano il layout della memoria/configurazione precedente |
| Preset CB, 10 m, 7 m, 6 m, Air, Sat 240, Riv 300, LoRa, GSM, 23 cm | Incompatibile | Fuori dalla guardia RX del modulo |
| Passi 25/100 kHz nello spettro | Incompatibile | Il modulo supporta 1,25/2,5/6,25/12,5 kHz e 128 bin |
| Turbo, ECO, Mult, squelch ibrido, volume dinamico, modem, tono AM | Non portato | Nessun margine di flash/RAM (spectrum: 1364 B liberi) o algoritmo non documentato |
| Build Karina K1/V1, bootloader proprio | Fuori ambito | Hardware/bootloader diverso |

Le finestre di banda usano 128 bin a 12,5 kHz (6,25 kHz in PMR), non gli 80–160 passi a
25 kHz di Karina.

## Test

Software (eseguiti): `bands_loot_test`, `spectrum_adapter_test` (ciclo di 11 bande, limiti RF,
loot con deduplicazione, scorrimento e blacklist), `presets_test`, `spectrum_test` con `-Wall -Wextra -Wconversion -Werror`;
`node --test tests/bricohams-build.test.cjs` (15/15); compilazione ARM GCC 13.3.1 della variante spectrum.

Build spectrum: immagine 119 468 B (slot 120 832 B, 1 364 B liberi), RAM 13 600 B (2 784 B liberi).
Calibrazione, limiti RF e vettori invariati; nessuna nuova scrittura persistente.

In sospeso sull'hardware (UV-5K V3): avvio, LCD/tasti, comportamento reale di bande e loot.
Le varianti fusion, labs, ardf e satellite non includono questi sorgenti e non sono state ricompilate.

## Compilazione riproducibile Spectrum (2026-11-04)

Due compilazioni indipendenti con `--preset FieldOps --module spectrum --option ENABLE_FEAT_F4HWN_BEACON=OFF` (ARM GCC 13.3.1, base F4HWN v6.1.0 `f556a96`, sorgenti Fusion61 locali non pubblicati) hanno prodotto un `bricohams.fieldops.spectrum.v6.1.0.bin` identico:
120 284 B (slot 120 832 B, 548 B liberi), SHA-256 `CF5E8C52B9599D4CF68D1F003991D758A92B2FFD6BB4E30DFC090333261A8145`. Coincidono anche il `.elf` e `build-info.json`.
11/11 test host del firmware superati. **Il binario non è nel catalogo firmato**: non c'è prova fisica su UV-5K V3 né firma CI. Pubblicato il 2026-11-05 solo come pre-release non firmata (`fw-spectrum-presets-v6.1.0`).

Passi in sospeso su radio reale (senza flashare alla cieca): 1) copia completa della radio con il flusso F4HWN di Web Install e verifica del suo CRC; 2) caricare l'immagine solo con un bootloader/Multiboot che supporti lo slot e con un cavo di recupero; 3) verificare avvio, LCD/tasti, tasto 2 (11 bande, solo RX) e tasti 1/7 in cattura (Loot); 4) ripristinare la copia e confermare l'identificazione F4HWN e il backup automatico con una trama UART disturbata.
