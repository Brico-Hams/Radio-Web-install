# Remerciements et sources

[Español](ACKNOWLEDGEMENTS.md) · [English (US)](ACKNOWLEDGEMENTS.en.md) · [Français](ACKNOWLEDGEMENTS.fr.md) · [Deutsch](ACKNOWLEDGEMENTS.de.md)

Bricohams Radio Workspace est une **implémentation indépendante à des fins d'interopérabilité**. Les formats et protocoles documentés ou publiés ont été étudiés. Le catalogue précompilé distribue des images F4HWN v6.1.0 et dérivées Bricohams : il conserve la licence Apache-2.0 et le NOTICE amont, avec GPL-3.0-or-later pour les contributions Bricohams. Les empreintes, la provenance et les options figurent dans `precompiled/catalog.json` ; les avis et les deux licences accompagnent les binaires. Il n'existe ni affiliation ni approbation des projets cités. Les marques appartiennent à leurs propriétaires.

## Références de protocole et de format

Les outils natifs de visualisation/clavier, redémarrage, maintenance, DFU, gestion des applications et filtrage/export RF sont des implémentations indépendantes pour l'interopérabilité. Ils ne chargent pas les scripts d'UV Studio et ne copient pas son interface. Cela ne transfère pas à Bricohams la paternité de firmwares, applications, logos ou ressources tiers et ne constitue pas une garantie juridique. Les licences et avis originaux restent obligatoires.

| Projet | Utilisation comme référence | Licence |
| --- | --- | --- |
| [CPS web OpenGD77 (grid.radio)](https://grid.radio/opengd77/) | Protocole CPS `C`/`R`/`W`/`X`, modes, cartographies mémoire, guide des pilotes | Site tiers |
| [OpenGD77](https://www.opengd77.com/) · [open-ham/OpenGD77](https://github.com/open-ham/OpenGD77) | Format du codeplug et bloc de données personnalisées (satellites de type 3) | GPL-2.0 |
| [CHIRP-to-TK11-csv](https://github.com/nikantgr/CHIRP-to-TK11-csv) `convert_chirp_to_tk11.py` (© 2025 Nikos K. Kantarakias, SY1EBE) | Format CSV d’import du TK-11 (colonnes, valeurs, tonalités) et conversion CHIRP vers TK-11 ; la logique de `chirpToTk11Rows` et `tk11RowsToCsv` dans `tk11-connector.js` est un portage JavaScript modifié (puissance reprise de CHIRP, sans variante régionale) | GPL-3.0 |
| [F4HWN · armel/uv-k1-k5v3-firmware-custom](https://github.com/armel/uv-k1-k5v3-firmware-custom) et son [wiki](https://github.com/armel/uv-k1-k5v3-firmware-custom/wiki) | UART, Multiboot, Multiconfig, slots, CRC | Apache-2.0 |
| [UV Studio](https://armel.github.io/uvstudio/) | Flux des slots/sauvegardes et référence d'interopérabilité LCD/RF Log ; révision fixée `e7aa946f6de002559e1aaf3f91765db7fc2ed567`. Le visualiseur web est une implémentation indépendante, pas une copie du code du site | Site tiers |
| [egzumer/uv-k5-firmware-custom](https://github.com/egzumer/uv-k5-firmware-custom) | Prédécesseur du firmware F4HWN et de son protocole | Apache-2.0 |
| [DualTachyon/uv-k5-firmware](https://github.com/DualTachyon/uv-k5-firmware) | Protocole de base Quansheng | Apache-2.0 |
| [(tr)uSDX · DL2MAN](https://dl2man.de/) et [uSDX · PE1NNZ](https://github.com/threeme3/usdx) | **Co-auteurs de la prise en charge du (tr)uSDX** dans l’APK : Guido (PE1NNZ, concept, circuit et code de l’uSDX) et Manuel (DL2MAN, (tr)uSDX, PCB sandwich et LPF classe E). Commandes CAT et flux audio selon [« (tr)uSDX Details »](https://dl2man.de/5-trusdx-details/). Aucun de leurs codes n’est réutilisé | Projet et firmware de leurs auteurs |
| Manuels Yaesu (FT-817ND/818ND/857D/897D, FTX-1 CAT 2508-C) et Icom (IC-705 CI-V rév. 6) | CAT multiradio de l’APK, écrit à partir de ces documents | Documentation du fabricant |
| Manuels CAT de QRP Labs (QMX firmware 1.04_003, QDX rév. 1.06) | CAT QMX/QMX+ et QDX/QDX-M de l’APK, écrit à partir de ces documents | Documentation du fabricant |
| [icom-custom-firmware · sq6emm](https://github.com/sq6emm/icom-custom-firmware) (Dawid SQ6EMM), [page web](https://sq6emm.github.io/icom-custom-firmware/) et [fil du forum](https://mikrofale.cafe/showthread.php?tid=1296) | Firmware personnalisé Icom IC-705/IC-9700 pour transverters, distribué uniquement sous forme de correctifs. Inclus sans modification dans `third_party/icom-custom-firmware/` (commit `3d30e461d7bcbd39b782c1823764f305639ee9a8`, licence dans [LICENSE](third_party/icom-custom-firmware/LICENSE)) ; la page `icom.html` utilise son patcheur de navigateur. Bricohams ne l’a testé sur aucune radio | MIT |
| [ic705-ic9700-ic905-bring-your-own-firmware · sq6emm](https://github.com/sq6emm/ic705-ic9700-ic905-bring-your-own-firmware) (Dawid SQ6EMM) | Documentation de rétro-ingénierie du firmware Icom IC-705/IC-9700/IC-905 (format du conteneur, carte de la flash, plages de fréquences, CI-V non documenté) et outils Python. Incluse sans modification dans `third_party/icom-byof/` (commit `a91231f64e8afbe34353994786e8276a3b54f1a9`, licence dans [LICENSE](third_party/icom-byof/LICENSE)) ; résumée dans `docs/ICOM-FIRMWARE-INTERNALS.md`. Aucun firmware Icom n’est inclus | MIT |
| [FT8CN](https://github.com/N0BOY/FT8CN) (BG7YOZ) | Étudié uniquement pour comprendre sa gestion du CAT, de l’USB série et de l’audio sous Android ; aucun code ni ressource copié | MIT |
| [OscarWatch · magicbug/OscarWatch-Tracker](https://github.com/magicbug/OscarWatch-Tracker) (© 2026 Peter Goodhall, MM9SQL) | Idées de fonctions uniquement : export des passages vers un calendrier `.ics`, passages communs avec une station DX par locator et terminateur jour/nuit sur la carte. Réimplémentées à partir de zéro en Kotlin et JavaScript d’après la RFC 5545 et des formules astronomiques standard ; aucun code C#, texte ni ressource n’est copié ou traduit | AGPL-3.0-or-later |

### Yaesu FTX-1 (`third_party/ftx1/`)

Copies non modifiées, figées au commit indiqué, utilisées comme référence pour `docs/FTX1-KNOWLEDGE.md` et pour réimplémenter des commandes CAT du FTX-1. Aucun code n'est copié. Détails et statut de licence dans [`third_party/ftx1/SOURCES.md`](third_party/ftx1/SOURCES.md).

| Projet | Commit | Licence |
| --- | --- | --- |
| [evertonma/FTX-1CAT_PR2EM_Android](https://github.com/evertonma/FTX-1CAT_PR2EM_Android) | `80aa3a2` | PolyForm Noncommercial 1.0.0 |
| [Evgeny161rus/ftx1-region-tool](https://github.com/Evgeny161rus/ftx1-region-tool) | `ba3692e` | Pas de licence déclarée ; permission MIT selon l'utilisateur (EA5KGV), 2026-11-17 |
| [Semyonic/ftx1-programmer](https://github.com/Semyonic/ftx1-programmer) | `304d486` | GPL-3.0 |
| [evertonma/FTX-1CAT_PR2EM](https://github.com/evertonma/FTX-1CAT_PR2EM) | `9f15f99` | PolyForm Noncommercial 1.0.0 |
| [hatandspecs/ftx1-tuner-sweep](https://github.com/hatandspecs/ftx1-tuner-sweep) | `473e05a` | MIT |
| [juanmmmmmmm/Look4Sat-FTX1](https://github.com/juanmmmmmmm/Look4Sat-FTX1) | `b4f93d0` | GPL-3.0 |
| [gnfrazier/ftxcat](https://github.com/gnfrazier/ftxcat) | `08dbd7d` | MIT |
| [git-jcw/FTX-1-WebUI](https://github.com/git-jcw/FTX-1-WebUI) | `0b89d46` | MIT |
| [iTracMan/FTX1WinController](https://github.com/iTracMan/FTX1WinController) | `9f5d8f7` | MIT |
| [pokibon3/FTX1Controller](https://github.com/pokibon3/FTX1Controller) | `adf730a` | Pas de licence déclarée ; permission MIT selon l'utilisateur (EA5KGV), 2026-11-17 |
| [radiohyperactivity/ftx1-front-cover](https://github.com/radiohyperactivity/ftx1-front-cover) | `df6813b` | GPL-3.0 |
| [Reid-n0rc/FTX-1_Firmware](https://github.com/Reid-n0rc/FTX-1_Firmware) | `38f3ed9` | Pas de licence déclarée ; permission MIT selon l'utilisateur (EA5KGV), 2026-11-17 |
| [ew1abz/yaesu-ftx-1-control](https://github.com/ew1abz/yaesu-ftx-1-control) | `273d6c3` | Pas de licence déclarée ; permission MIT selon l'utilisateur (EA5KGV), 2026-11-17 |
| [Eugen68/Yaesu-FTX1-CAT-Control](https://github.com/Eugen68/Yaesu-FTX1-CAT-Control) | `ea922b9` | MIT |
| [fritzsche/yaesu-ftx1](https://github.com/fritzsche/yaesu-ftx1) | `a53baa3` | Pas de licence déclarée ; permission MIT selon l'utilisateur (EA5KGV), 2026-11-17 |
| [byf3332/Yaesu-FTX1-Cat-Tunnel](https://github.com/byf3332/Yaesu-FTX1-Cat-Tunnel) | `7df422a` | WTFPL 2 |
| [ew1abz/yaesu-ftx-1-memory-manipulator](https://github.com/ew1abz/yaesu-ftx-1-memory-manipulator) | `bad68d5` | MIT |
| [sq9pd/Yaesu-FTX-1-mod](https://github.com/sq9pd/Yaesu-FTX-1-mod) | `ee71225` | Pas de licence déclarée ; permission MIT selon l'utilisateur (EA5KGV), 2026-11-17 |
| [captobie/ftx1-remote](https://github.com/captobie/ftx1-remote) | `0fb8dd5` | MIT |
| [bg7nzl/ftx1ctl](https://github.com/bg7nzl/ftx1ctl) | `36ceffc` | Pas de licence déclarée ; permission MIT selon l'utilisateur (EA5KGV), 2026-11-17 |
| [rigplane/rigplane-core](https://github.com/rigplane/rigplane-core) | `71a5bff` | MIT |
| [rzochowski/cat-ftx1](https://github.com/rzochowski/cat-ftx1) | `e77b599` | Pas de licence déclarée ; permission MIT selon l'utilisateur (EA5KGV), 2026-11-17 |

## Dépendances

| Paquet | Utilisation | Licence |
| --- | --- | --- |
| [satellite.js](https://github.com/shashwatak/satellite-js) 6.0.1 | Propagation SGP4/SDP4 | MIT |

## Sources de données

| Fournisseur | Données | Conditions |
| --- | --- | --- |
| [RadioID.net](https://radioid.net/) | Contacts DMR | Conditions de RadioID |
| [RepeaterBook](https://www.repeaterbook.com/) | Répéteurs | Jeton approuvé requis. “Data courtesy of RepeaterBook.com” |
| [SatNOGS DB](https://db.satnogs.org/) | Émetteurs et TLE | CC BY-SA 4.0 |
| [CelesTrak](https://celestrak.org/) | TLE | Conditions de CelesTrak |
| [opengd77.com](https://www.opengd77.com/downloads/) et [GitHub Releases de F4HWN](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases) | Firmware officiel | Licences de chaque projet |
| [armel/k1-teardown](https://github.com/armel/k1-teardown) (F4HWN) | Sept photos du démontage UV-K1 dans `docs/atlas/`, réduites à 1600 px | Apache-2.0 |

## Documentation et outils

- Identité Bricohams : [logo original de Bricohams Studio](https://github.com/Brico-Hams/Bricohams-Studio/blob/767edd66028d10f859346190d0c8044bd8e5a2b2/assets/logo-bricohams.png), conservé sans le redessiner ni le recolorer. Provenance et vérification dans le [guide de marque](docs/i18n/fr/BRANDING.md).
- [MDN : Web Serial API](https://developer.mozilla.org/docs/Web/API/Web_Serial_API) et [WebUSB API](https://developer.mozilla.org/docs/Web/API/WebUSB_API).
- Vallado, Crawford, Hujsak et Kelso, *Revisiting Spacetrack Report #3* (2006) : vecteur de test SGP4 utilisé dans les tests.
- [Zadig](https://zadig.akeo.ie/) (WinUSB sous Windows), [WCH CH341SER](https://www.wch-ic.com/downloads/CH341SER_EXE.html), [Silicon Labs CP210x](https://www.silabs.com/developer-tools/usb-to-uart-bridge-vcp-drivers) et [Prolific PL2303](https://www.prolific.com.tw/) — liens uniquement, sans redistribution.

Merci à la communauté radioamateur et aux auteurs de ces projets pour la publication de leurs travaux.

# Applications Labs précompilées

Le catalogue de test redistribue SystemInfo, BroadcastFM, Cube3D, Tetris, Breakout et Minesweeper d'Armel F4HWN, archive v6.1.0, sous Apache-2.0. Les noms, en-têtes, licence et NOTICE originaux sont conservés. Les manifestes identifient la provenance et le SHA-256 ; la paternité n'est pas attribuée à Bricohams et aucune validation fonctionnelle sur matériel n'est revendiquée.
