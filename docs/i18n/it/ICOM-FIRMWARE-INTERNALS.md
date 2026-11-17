# All'interno del firmware Icom modificato (IC-705 / IC-9700)

Base di conoscenza tecnica sul firmware modificato di Dawid SQ6EMM: cosa viene modificato, dove e come. Sintetizza due repository MIT inclusi senza modifiche: `third_party/icom-custom-firmware/` (commit `3d30e461d7bcbd39b782c1823764f305639ee9a8`) e `third_party/icom-byof/` (commit `a91231f64e8afbe34353994786e8276a3b54f1a9`). Ogni dato cita il file sorgente. Il dettaglio per indirizzo di ogni patch è in [ICOM-PATCH-ANALYSIS.md](ICOM-PATCH-ANALYSIS.md) e la guida d'uso in [ICOM-CUSTOM-FIRMWARE.md](ICOM-CUSTOM-FIRMWARE.md).

## 1. Ambito e fonti

| Fonte | Contenuto |
|---|---|
| `third_party/icom-byof/IC705_DAT_FORMAT.md` | Formato del contenitore `.dat` |
| `third_party/icom-byof/IC705_FLASH_LAYOUT.md` | Mappa della flash dell'IC-705 |
| `third_party/icom-byof/IC9700_FLASH_LAYOUT.md` | Mappa della flash e slot A/B dell'IC-9700 |
| `third_party/icom-byof/FREQUENCY_RANGES.md` | Piani di banda per regione |
| `third_party/icom-byof/UNDOCUMENTED_CIV.md` | Comandi CI-V non documentati |
| `third_party/icom-custom-firmware/releases.json` | Elenco di versioni e funzioni |
| `third_party/icom-custom-firmware/docs/patches/` | Patch JSON usate dal patcher |

Non viene distribuito alcun byte di Icom: le patch contengono solo byte propri del progetto e riferimenti per copiare byte dal firmware ufficiale fornito dall'utente.

## 2. Il contenitore `.dat`

### 2.1 Intestazione e parametri per radio

Secondo `third_party/icom-byof/IC705_DAT_FORMAT.md`, il file inizia con la firma `44 00 77 55`. Sull'IC-705 l'intestazione è di 0x64 byte (campi f38, f44, f4c, f54 e f5c), contiene quattro digest MD5 e termina con un piè di 2 byte (`40 75`). I parametri della trasformazione dipendono dal modello, secondo `third_party/icom-byof/README.md`:

| Radio | KEY | START |
|---|---|---|
| IC-705 | `0x19` | `0x64` |
| IC-9700 | `0x2b` | `0x38` |
| IC-905 | `0x7f` | `0x88` |

L'IC-905 è firmato con RSA-2048 e SHA-256, quindi non si può riconfezionare; è solo documentato.

### 2.2 Trasformazione autokey

Secondo `third_party/icom-byof/icom_rza1_decode.py`, la cifratura è un autokey byte per byte: `plain = stored ^ ((prev_plain + abs_offset - KEY) & 255)`. Il contatore parte da `0x4b` in ogni dominio e il riempimento in chiaro è `FF`. La chiave si recupera senza conoscerla:

- `deriveKey` cerca una sequenza monotona di 16 byte con passo -1 tra gli offset `0x20` e `0x8000` e ottiene `KEY = (run[0] + s) & 255`.
- `findStart` scorre s da `0x10` a `0xFFF` con finestre di `0x1000` o `0x10000`, inverte l'autokey all'indietro ancorandosi a `FF` e cerca i vettori ARM `18f09fe5 18f09fe5`.

La versione JavaScript è in `third_party/icom-custom-firmware/docs/js/codec.js`.

### 2.3 Compressione LZSS

Secondo `third_party/icom-byof/IC705_DAT_FORMAT.md` e `third_party/icom-byof/ic_rza1_repack.py` si usa LZSS di Okumura:

| Parametro | Valore |
|---|---|
| Finestra (anello) | 4096 byte |
| Cursore iniziale | `0xFEE` |
| Flag | LSB per primo, 1 = letterale, 0 = corrispondenza di 2 byte |
| Indice | `lo` più i 4 bit alti di `hi` spostati di 4 posizioni (`(hi & 0xF0) << 4`) |
| Lunghezza | `(hi & 15) + 3`, cioè da 3 a 18 |
| Fine del flusso | lunghezza di uscita esplicita, nessun marcatore finale |

La decompressione supporta la sovrapposizione (una copia può leggere byte appena scritti). Il compressore usa catene hash con chiave di 3 byte (la più recente per prima), `max_chain=256`, vince la prima corrispondenza più lunga e si applica il lazy matching di un passo. Queste regole rendono il port JS identico bit a bit a quello Python. L'uscita è circa il 2% più piccola di quella di Icom. Anche così lo slot dell'IC-9700 può crescere fino a circa 1,3 MiB per il codice aggiunto e il riallineamento del pacchetto grafico.

### 2.4 Sigillo MD5

`findMd5Region` calcola l'MD5 in modo incrementale a passi di `0x1000` finché il digest cumulato coincide con i 16 byte successivi. Secondo `third_party/icom-byof/README.md` la regione sigillata è di `0x9c0000` byte sull'IC-705 e `0x800000` sull'IC-9700. Dopo il riconfezionamento il sigillo va ricalcolato.

### 2.5 Bootstrap e immagine principale

Secondo `third_party/icom-byof/IC705_DAT_FORMAT.md`:

| Elemento | Dettaglio |
|---|---|
| Bootstrap | DAT da `0x64` a `0x10064`, mappato sulla flash `0x18000000`, 0x10000 byte |
| Loader | bootstrap `+0x4000`, lunghezza `0x9bc`, copiato in RAM `0x20004000`; ingresso `0x20004840`; routine LZSS a `0x200044dc` |
| Intestazione principale | DAT `0x10064`: `csz` e `osz` (due LE32 sull'IC-9700) |
| Flusso principale | inizia a `0x1006c`, si decomprime in RAM `0x20005000`, ingresso `0x20005060`, ARMv7-A |
| Aux1 | si decomprime in RAM `0x20000008` (Thumb) |
| Aux2 | si decomprime in flash `0x08000000` (Cortex-M) |

Sull'IC-9700 un pacchetto grafico è concatenato a slot + `csz` + 8 e si sposta con il flusso principale; `repack` lo riallinea a 4 byte e riempie con `FF`. Le patch usano due MD5 per radio: quello del file intero (`md5`) e quello dell'immagine principale decompressa (`main_md5`), più un MD5 proprio del bootstrap.

`repack(..., new_bootstrap)` (in `third_party/icom-byof/ic_rza1_repack.py`) richiede esattamente `0x10000` byte, il tag da `0x4f00` a `0x4f10` uguale all'originale e vettori ARM all'inizio. Altrimenti l'updater di Icom segue il suo percorso legacy e riscrive lo slot A.

### 2.6 Ciclo: decodificare, patchare, riconfezionare

1. Decodificare: annullare l'autokey, localizzare il flusso principale e decomprimerlo.
2. Patchare: applicare le operazioni del JSON all'immagine principale (e opzionalmente al bootstrap).
3. Riconfezionare: comprimere con l'LZSS descritto sopra, cifrare di nuovo e ricalcolare gli MD5.

Il risultato deve essere identico byte a byte a quello provato su una radio: il patcher offre il download solo se l'MD5 di uscita coincide con `output.md5`; altrimenti non scrive nulla (secondo `third_party/icom-custom-firmware/docs/js/patch.js`). Per questo il compressore deve riprodurre esattamente l'algoritmo, e per questo si accetta come ingresso solo firmware ufficiale non modificato.

## 3. Piattaforma e mappa di memoria

La CPU è un Renesas RZ/A1H (R7S721001, IC101) con la flash mappata in XIP a `0x18000000` (secondo `third_party/icom-byof/IC705_FLASH_LAYOUT.md`).

### 3.1 IC-705

Flash ISSI IS25LP128 da 16 MiB, RDID `9D 60 18`, settori da 4 KiB. I primi `0x600000` byte della flash coincidono con il corpo decodificato; DSP, WLAN e risorse stanno oltre. La dimensione dell'immagine principale originale è `0x376000` (`output_size`); le patch producono `0x386000`.

### 3.2 IC-9700

Flash S25FL127S da 16 MiB, RDID `01 20 18`, settori da 64 KiB, IC181 (secondo `third_party/icom-byof/IC9700_FLASH_LAYOUT.md`):

| Regione | Offset | Note |
|---|---|---|
| Bootstrap | `0x0` | 0x10000 byte |
| Slot A | `0x10000` | 0x7f0000 byte |
| Slot B | `0x800000` | 0x7f0000 byte |
| Marcatore | `0xff0000` | 16 byte `SX3913 V0.10-000` significa avviare lo slot B |

All'interno di ogni slot compaiono gli offset +`0x3e0000`, +`0x3e4000`, +`0x3f0000` fino a `0x793000` e +`0x7e0000` / +`0x7ec000`. Valori originali di E1.50: `csz` `0x2145F4`, `osz` `0x405334`, `csz2` `0x80C2C`, `osz2` `0x2675BC`. Il loader originale non ha fallback automatico: l'updater da SD scrive lo slot inattivo e poi imposta il marcatore.

### 3.3 Aree che non vanno mai sovrascritte

Le due EEPROM GT24C1024 (IC191 e IC192) contengono impostazioni e calibrazione. Non sono firmware e non vanno **mai** sovrascritte. Non va toccato nemmeno il tag del bootstrap da `0x4f00` a `0x4f10`. I comandi CI-V di servizio (sezione 6) possono cancellare o disallineare quei dati.

## 4. Meccanismo di patch

Secondo `third_party/icom-custom-firmware/docs/patches/`, ogni patch è un JSON con `name`, `description`, `load_address`, `image_size`, `input`, `output`, `ops` e opzionalmente `bootstrap`. Le operazioni `hex` scrivono byte propri del progetto e le operazioni `copy_from` copiano `len` byte dal firmware ufficiale in un'altra posizione (rilocazione). Gli indirizzi sono assoluti: l'immagine principale si carica a `0x20005000` e le operazioni del bootstrap sono offset dal suo inizio.

Schema osservato (cifre esatte in [ICOM-PATCH-ANALYSIS.md](ICOM-PATCH-ANALYSIS.md)): una patch di vettore o letterale vicino a `0x20005024`, molti piccoli salti BL o B di 3 o 4 byte che deviano routine esistenti, e codice proprio aggiunto in coda all'immagine (sull'IC-9700 l'immagine passa da `0x2040A334` a `0x2040FE10`). Nel bootstrap il loader patchato si estende oltre quello originale (che termina a `+0x49bc`) fino al tag preservato.

## 5. Funzioni del firmware personalizzato

Le funzioni sono elencate in `third_party/icom-custom-firmware/releases.json`. Le fonti non pubblicano il codice sorgente del firmware personalizzato, solo i byte della patch; dove il come non è indicato, non lo si inventa.

| Funzione | Cosa fa |
|---|---|
| Da TRV1 a TRV8 | Otto transverter con frequenze RF e IF, memorizzati allo spegnimento |
| Display RF | Mostra la frequenza reale fino a 122 GHz |
| CI-V esteso | Frequenza di 6 byte sopra 1,4 GHz sull'IC-9700 |
| IC-9700 MAIN, SUB, DUAL, SAT | Le impostazioni di trasmissione seguono il ricevitore che trasmette |
| Scala dello scope | dB/div 10, 6, 3 e 1 con rumore di fondo automatico |
| Limite di potenza | Massimo per transverter: 100, 50, 25, 10 o 5 %; non aumenta mai la potenza della radio |
| Ritardo TX | Fino a 300 ms per transverter |
| Inibizione PTT | Per transverter |
| Gamme TX dell'IC-705 | Estese secondo `third_party/icom-byof/FREQUENCY_RANGES.md` (sezione 7) |
| App su SD | Incluse nelle versioni che lo indicano in `releases.json` |
| Bootloader A/B | Selettore di slot (sezione 5.1) |

### 5.1 Bootloader A/B

Secondo `third_party/icom-custom-firmware/docs/index.html` e il suo `README.md`, il firmware mantiene due slot (A e B), come l'updater di Icom già alterna. Il bootloader personalizzato rileva uno slot danneggiato strutturalmente e ripiega automaticamente sull'altro. Combinazioni per cambiare slot:

| Radio | Combinazione |
|---|---|
| IC-9700 | Tenere premuto POWER mentre si collega l'alimentazione DC, circa 5 s |
| IC-705 | Tenere premuto POWER all'accensione finché il LED lampeggia, circa 3 s |

Il bootloader esiste in una sola copia e l'updater da SD lo scrive una volta, all'inizio dell'aggiornamento. **Se manca l'alimentazione in quel momento può servire un programmatore di flash per recuperare** (per esempio CH341A). Usa un'alimentazione affidabile.

## 6. Comandi CI-V non documentati

Secondo `third_party/icom-byof/UNDOCUMENTED_CIV.md`. Indirizzi predefiniti: IC-705 `0xA4`, IC-9700 `0xA2`, IC-905 `0xAC`; controller `0xE0`. Le letture sono sicure; scritture e azioni possono cancellare le impostazioni o disallineare la radio.

| Comando | Effetto | Protezione |
|---|---|---|
| `1A D0` | Reset di fabbrica, cancella tutte le impostazioni | Senza password |
| `1A E1` | Seconda variante di reset | Un byte di dati deve essere 0 |
| `1A E0` | Entra nella modalità di allineamento di fabbrica | Password del modello |
| `1A D2` | Autotest DV | Password del modello |
| `1A D7` | Regolazione di un sottosistema secondario | Password del modello |
| `1A D5` | Legge il codice di regione | Lettura |
| `1A D6` | Legge una misura di calibrazione | Lettura |
| `1A D8` | Legge un byte di stato, solo IC-705 | Lettura |
| `1A D9` e `1A DA` | Legge la calibrazione microonde, solo IC-905 | Lettura |
| `1A E4` | Legge un valore di servizio minore | Lettura |
| `1A D1` e `1A D3` | Flag di modo test e diagnostica, IC-705 | Permesso interno |
| `1A E2`, `1A E3`, `1A E5` | Sottomodo di servizio, destinazione e scrittura dati | Scrittura |
| `1A E7` | Opzione audio o DSP, IC-705 e IC-905 | Scrittura |

Password di allineamento (`E0`): `SX-4075 Adjust` (IC-705), `SX-3913 Adjust` (IC-9700), `SX-4209 Adjust` (IC-905). Sottocomandi presenti per radio: IC-705 da D0 a D3, da D5 a D8 e da E0 a E7; IC-9700 D0, D2, da D5 a D7 e da E0 a E7; IC-905 D0, D2, da D5 a D7, D9, DA, da E0 a E7 e E9.

Altri: IC-705 `0x24` e `0x28`; IC-9700 `0x28 00` (richiamo di banda), `0x1C 02`, `0x1C 03` e `0x0D`; l'IC-905 usa una frequenza BCD di 6 byte da 1,389 GHz.

## 7. Tabelle di frequenza

Secondo `third_party/icom-byof/FREQUENCY_RANGES.md`. La destinazione di fabbrica (matrice di diodi, copiata nella configurazione) sceglie un piano di banda che limita la trasmissione. Quali bande puoi usare dipende dalla tua licenza e dalle norme.

### 7.1 IC-705 (5 piani, RX da 0,030 a 470 MHz)

| Piano | 160 m | 80 m | 40 m | 6 m | 4 m | 2 m | 70 cm |
|---|---|---|---|---|---|---|---|
| 0 | 1,800-2,000 | 3,500-4,000 | 7,000-7,300 | 50,0-54,0 | no | 144-146 | 430-440 |
| 1 | 1,800-2,000 | 3,500-4,000 | 7,000-7,300 | 50,0-54,0 | no | 144-148 | 430-450 |
| 2 | 1,810-2,000 | 3,500-3,800 | 7,000-7,200 | 50,0-52,0 | 70,000-70,500 | 144-146 | 430-440 |
| 3 | 1,810-1,850 | 3,500-3,800 | 7,000-7,200 | 50,0-52,0 | 70,150-70,250 | 144-146 | 430-440 |
| 4 | 1,800-1,825 | 3,500-3,540 | 7,000-7,100 | 50,0-54,0 | no | 144-147 | 430-440 |

L'IC-705 contiene un set completo di calibrazione di fabbrica per 70 MHz: la banda dei 4 m è bloccata per regione, non assente dall'hardware (piani 2 e 3).

### 7.2 IC-9700 (9 piani, rigorosamente tribanda)

| Piano | 2 m | 70 cm | 23 cm |
|---|---|---|---|
| 0 | 144-146 | 430-440 | 1260-1300 |
| 1 e 7 | 144-148 | 430-450 | 1240-1300 |
| 2 e 4 | 144-146 | 430-440 | 1240-1300 |
| 3 | 144-146 | 430-434 e 435-438 | 1240-1245 e 1270-1298 |
| 5 | 144-146 | 430-432 | 1260-1265 |
| 6 | 144-146 | 430-440 | 1260-1300 |
| 8 | 144-147 | 430-440 | 1260-1270 |

Sull'IC-9700 non ci sono bande nascoste: le varianti cambiano solo i limiti di banda. Meccanismo: codice di regione, tabella mappa dei piani, indice di piano e tabella di limiti per piano che abilita la trasmissione.

## 8. Strumenti di reverse engineering

| Strumento | Funzione |
|---|---|
| `icom_rza1_decode.py` | Decodificatore della famiglia RZ/A1 |
| `ic_rza1_repack.py` | Riconfezionatore del contenitore |
| `ic705_decode.py` | Decodifica completa dell'IC-705 con uscita ELF |
| `ic705.py` | Scomporre, ricostruire e verificare (usa numpy) |
| `ic705_codec.py` | Diagnostica LZSS indipendente con molte opzioni |
| `extract_streams.py` | Parser del contenitore |
| `ghidra_scripts/ExportRecovered.java` | Esporta C decompilato dopo aver importato l'ELF in Ghidra |
| `test_ic705_codec.py`, `test_ic705_decode_real.py`, `test_repack.py` | Test |

Le righe di comando esatte sono in `third_party/icom-byof/README.md`. In `third_party/icom-custom-firmware/` il patcher `icom_patch.py` riproduce una versione offline: gli si danno il `.dat` ufficiale e il JSON di `docs/patches/` e verifica l'MD5 di uscita.

Per aggiungere una versione: inserire la voce in `releases.json`, generare la patch ed eseguire `tools/build_index.py`, che scrive `docs/patches/index.json` e copia le patch attive. Esiste anche una patch sperimentale in `third_party/icom-byof/patches/9700E150_trv16c.json`.

## 9. Come lo usa Bricohams

La pagina `icom.html` ospita il patcher web, servito dal web e dal server desktop (`server.cjs`). Il browser legge il tuo `.dat` ufficiale, applica la patch e offre il risultato solo se l'MD5 coincide. Regole di sicurezza: usa solo firmware ufficiale proprio, verifica ritardo TX e potenza su un carico fittizio prima di collegare un transverter, usa un'alimentazione affidabile durante l'aggiornamento e accetta che l'uso è a proprio rischio e può invalidare la garanzia. Vedi [ICOM-CUSTOM-FIRMWARE.md](ICOM-CUSTOM-FIRMWARE.md).

## 10. Licenza e attribuzione

Entrambi i repository sono MIT, di Dawid SQ6EMM. Repository: `https://github.com/sq6emm/icom-custom-firmware` e `https://github.com/sq6emm/ic705-ic9700-ic905-bring-your-own-firmware`; forum: `https://mikrofale.cafe/showthread.php?tid=1296`. Sono inclusi senza modifiche sotto `third_party/` e citati nei file ACKNOWLEDGEMENTS.

## 11. Proposte di miglioramento

Idee basate sulla documentazione; sono proposte e non sono implementate:

- Verificare `main_md5` nel browser prima di applicare la patch, per dare un errore più chiaro.
- Rilevare lo slot attivo dell'IC-9700 leggendo il marcatore `0xff0000` da un dump della flash.
- Aggiungere al rapporto delle patch un confronto automatico delle regioni con la mappa della flash quando il documento lo permette.
- Documentare l'intervallo di calibrazione dei 4 m dell'IC-705 come riferimento, senza abilitare la trasmissione.
