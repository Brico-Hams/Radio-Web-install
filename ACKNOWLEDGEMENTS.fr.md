# Remerciements et sources

[Español](ACKNOWLEDGEMENTS.md) · [English (US)](ACKNOWLEDGEMENTS.en.md) · [Français](ACKNOWLEDGEMENTS.fr.md) · [Deutsch](ACKNOWLEDGEMENTS.de.md)

Bricohams Radio Workspace est une **implémentation indépendante à des fins d'interopérabilité**. Les formats et protocoles documentés ou publiés ont été étudiés. Le catalogue précompilé distribue des images F4HWN v6.1.0 et dérivées Bricohams : il conserve la licence Apache-2.0 et le NOTICE amont, avec GPL-3.0-or-later pour les contributions Bricohams. Les empreintes, la provenance et les options figurent dans `precompiled/catalog.json` ; les avis et les deux licences accompagnent les binaires. Il n'existe ni affiliation ni approbation des projets cités. Les marques appartiennent à leurs propriétaires.

## Références de protocole et de format

Les outils natifs de visualisation/clavier, redémarrage, maintenance, DFU, gestion des applications et filtrage/export RF sont des implémentations indépendantes pour l'interopérabilité. Ils ne chargent pas les scripts d'UV Studio et ne copient pas son interface. Cela ne transfère pas à Bricohams la paternité de firmwares, applications, logos ou ressources tiers et ne constitue pas une garantie juridique. Les licences et avis originaux restent obligatoires.

| Projet | Utilisation comme référence | Licence |
| --- | --- | --- |
| [CPS web OpenGD77 (grid.radio)](https://grid.radio/opengd77/) | Protocole CPS `C`/`R`/`W`/`X`, modes, cartographies mémoire, guide des pilotes | Site tiers |
| [OpenGD77](https://www.opengd77.com/) · [open-ham/OpenGD77](https://github.com/open-ham/OpenGD77) | Format du codeplug et bloc de données personnalisées (satellites de type 3) | GPL-2.0 |
| [F4HWN · armel/uv-k1-k5v3-firmware-custom](https://github.com/armel/uv-k1-k5v3-firmware-custom) et son [wiki](https://github.com/armel/uv-k1-k5v3-firmware-custom/wiki) | UART, Multiboot, Multiconfig, slots, CRC | Apache-2.0 |
| [UV Studio](https://armel.github.io/uvstudio/) | Flux des slots/sauvegardes et référence d'interopérabilité LCD/RF Log ; révision fixée `e7aa946f6de002559e1aaf3f91765db7fc2ed567`. Le visualiseur web est une implémentation indépendante, pas une copie du code du site | Site tiers |
| [egzumer/uv-k5-firmware-custom](https://github.com/egzumer/uv-k5-firmware-custom) | Prédécesseur du firmware F4HWN et de son protocole | Apache-2.0 |
| [DualTachyon/uv-k5-firmware](https://github.com/DualTachyon/uv-k5-firmware) | Protocole de base Quansheng | Apache-2.0 |

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
