# Esempi: firmware aperti, canali e script

Revisione: 26-10-2026. File di esempio della cartella `examples/` del repository. Sono
inclusi solo i binari la cui licenza ne consente la ridistribuzione, con la relativa licenza. I firmware
di terze parti privi di tale licenza (Karina, Baofeng, OpenGD77 DM32) compaiono solo nell'[indice degli hash](BINARIOS-TERCEROS.md).

## Firmware aperti

| Cartella | Contenuto | Licenza | Destinazione |
| --- | --- | --- | --- |
| [examples/firmware/f4hwn-v6.3.0](../../../examples/firmware/f4hwn-v6.3.0/SHA256SUMS) | `f4hwn.fusion`, `fieldops`, `labs` e `transfer` v6.3.0, più il driver CHIRP della stessa release | Apache-2.0 (firmware, con `LICENSE` e `NOTICE`); GPL-2.0 o successiva (driver CHIRP, nella relativa intestazione) | Quansheng UV-K5 V3 e UV-K1 (PY32F071) |
| [examples/firmware/moto-v1.3.2](../../../examples/firmware/moto-v1.3.2/SHA256SUMS) | Bootloader moto 1.3.2 in `.bin` e `.uf2` | Apache-2.0 | UV-K5 V3 / UV-K1. Cambiare il bootloader è rischioso: consulta l'[atlante](ATLAS-UV-K5-V3.md#bootloader-y-flasheo) |

Origine: release ufficiali di [armel/uv-k1-k5v3-firmware-custom](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases/tag/v6.3.0)
e [muzkr/moto](https://github.com/muzkr/moto/releases/tag/v1.3.2). Gli SHA-256 corrispondono a quelli
pubblicati da GitHub per ogni file. Verifica prima dell'uso:

```text
cd examples/firmware/f4hwn-v6.3.0
sha256sum -c SHA256SUMS
```

Per flashare il firmware principale: [guida dall'inizio al 100 %](AYUDA-QUANSHENG.md#puesta-en-marcha-de-0-a-100).
La versione più recente è sempre nella release di armel; queste copie sono un riferimento stabile.

## Canali

| File | Contenuto |
| --- | --- |
| [examples/channels/pmr446-solo-rx.chirp.csv](../../../examples/channels/pmr446-solo-rx.chirp.csv) | I 16 canali PMR446 in formato CSV di CHIRP, FM stretta e TX disattivata (`Duplex = off`). Modello per importare in CHIRP o in questo sito web |

Le radioamatoriali non sono omologate per PMR446: il file è solo per l'ascolto.

## Script

Codice proprietario di Bricohams, con la licenza del repository (GPL-3.0-or-later). Eseguire con `python -I`.

| Script | Funzione |
| --- | --- |
| [tg_kb.py](../../../examples/scripts/tg_kb.py) | Converte esportazioni JSON di Telegram Desktop di gruppi tecnici in una base di conoscenza locale per argomento (firmware, flash, calibrazione, mod), con catalogo di file (SHA-256, MCU di destinazione secondo la tabella dei vettori) e link. Rimuove autori, alias, telefoni ed e-mail. Il risultato è materiale di terzi: conservarlo localmente |
| [test_tg_kb.py](../../../examples/scripts/test_tg_kb.py) | Test di `tg_kb.py` con un'esportazione sintetica: `python -I test_tg_kb.py` |
| [check_repos.py](../../../examples/scripts/check_repos.py) | Legge un elenco `owner/repo` e produce una tabella con stato, ultimo push, licenza, stelle e MCU (V3/K1 se è presente codice PY32). Richiede `gh` con una sessione attiva |
| [recover.py](../../../examples/scripts/recover.py) | Per i repository eliminati: cerca una copia in Software Heritage, una cattura in Wayback Machine e fork con lo stesso nome |

Uso tipico:

```text
python -I tg_kb.py salida ChatExport_grupo1 ChatExport_grupo2
python -I check_repos.py repos.txt > repos.md
python -I recover.py caidos.txt
```