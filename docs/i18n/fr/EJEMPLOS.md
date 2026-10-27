# Exemples : firmwares ouverts, canaux et scripts

Révision : 26-10-2026. Fichiers d’exemple du dossier `examples/` du dépôt. Seuls sont
inclus les binaires dont la licence autorise la redistribution, avec leur licence à côté. Les firmwares
tiers sans cette licence (Karina, Baofeng, OpenGD77 DM32) figurent uniquement dans l’[index des hashs](BINARIOS-TERCEROS.md).

## Firmwares ouverts

| Dossier | Contenu | Licence | Pour |
| --- | --- | --- | --- |
| [examples/firmware/f4hwn-v6.3.0](../../../examples/firmware/f4hwn-v6.3.0/SHA256SUMS) | `f4hwn.fusion`, `fieldops`, `labs` et `transfer` v6.3.0, ainsi que le pilote CHIRP de la même version | Apache-2.0 (firmware, avec `LICENSE` et `NOTICE`) ; GPL-2.0 ou ultérieure (pilote CHIRP, dans son en-tête) | Quansheng UV-K5 V3 et UV-K1 (PY32F071) |
| [examples/firmware/moto-v1.3.2](../../../examples/firmware/moto-v1.3.2/SHA256SUMS) | Bootloader moto 1.3.2 en `.bin` et `.uf2` | Apache-2.0 | UV-K5 V3 / UV-K1. Changer le bootloader est risqué : voir l’[atlas](ATLAS-UV-K5-V3.md#bootloader-y-flasheo) |

Origine : versions officielles de [armel/uv-k1-k5v3-firmware-custom](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases/tag/v6.3.0)
et [muzkr/moto](https://github.com/muzkr/moto/releases/tag/v1.3.2). Les SHA-256 correspondent à ceux
publiés par GitHub pour chaque fichier. Vérifiez avant utilisation :

```text
cd examples/firmware/f4hwn-v6.3.0
sha256sum -c SHA256SUMS
```

Flasher le firmware principal : [mise en service de 0 à 100 %](AYUDA-QUANSHENG.md#puesta-en-marcha-de-0-a-100).
La version la plus récente se trouve toujours dans la release d’armel ; ces copies constituent une référence fixe.

## Canaux

| Fichier | Contenu |
| --- | --- |
| [examples/channels/pmr446-solo-rx.chirp.csv](../../../examples/channels/pmr446-solo-rx.chirp.csv) | Les 16 canaux PMR446 au format CSV de CHIRP, FM étroite et TX désactivée (`Duplex = off`). Modèle à importer dans CHIRP ou sur ce site |

Les radios d’amateur ne sont pas homologuées pour PMR446 : le fichier sert uniquement à l’écoute.

## Scripts

Code propre à Bricohams, sous la licence du dépôt (GPL-3.0-or-later). À exécuter avec `python -I`.

| Script | Fonction |
| --- | --- |
| [tg_kb.py](../../../examples/scripts/tg_kb.py) | Convertit les exportations JSON de Telegram Desktop de groupes techniques en une base de connaissances locale par sujets (firmware, flashage, étalonnage, modifications), avec un catalogue des fichiers (SHA-256, MCU cible selon la table des vecteurs) et des liens. Supprime les auteurs, pseudonymes, téléphones et courriels. Le résultat est du contenu tiers : conservez-le localement |
| [test_tg_kb.py](../../../examples/scripts/test_tg_kb.py) | Test de `tg_kb.py` avec une exportation synthétique : `python -I test_tg_kb.py` |
| [check_repos.py](../../../examples/scripts/check_repos.py) | Lit une liste `owner/repo` et produit un tableau avec l’état, le dernier push, la licence, les étoiles et le MCU (V3/K1 si du code PY32 est présent). Nécessite `gh` avec une session |
| [recover.py](../../../examples/scripts/recover.py) | Pour les dépôts supprimés : recherche une copie dans Software Heritage, une capture dans Wayback Machine et des forks du même nom |

Utilisation typique :

```text
python -I tg_kb.py salida ChatExport_grupo1 ChatExport_grupo2
python -I check_repos.py repos.txt > repos.md
python -I recover.py caidos.txt
```