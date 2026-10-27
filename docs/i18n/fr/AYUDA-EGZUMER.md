# Egzumer : sources, configuration et différences avec V3

Révision : 25-10-2026. Source inspectée :
`egzumer/uv-k5-firmware-custom`, commit
`7607f0a4bd6203d1f06b70556fc1ce0d7399d6b3`.

## Apports de ce dépôt

Il publie du code C, des en-têtes, un Makefile et la documentation d’une réimplémentation
du firmware Quansheng UV-K5/K6/5R de la famille d’origine. Le README explique
la provenance de DualTachyon, des modifications OneOfEleven et de l’analyseur fagci.
Cette base n’est pas le portage PY32 pour UV-K5 V3/UV-K1.

Son fichier LICENSE contient **Apache License 2.0**, et non MIT. Conservez ses
avis, attributions et ceux des composants lors d’une dérivation de code. La licence
d’Egzumer ne prouve pas qu’une autre image appelée Karina utilise la même licence
ni que les sources exactes de ce binaire sont disponibles.

## Matériel et utilisation sur ce site

| Aspect | Egzumer d’origine | F4HWN PY32 de ce site |
| --- | --- | --- |
| Famille | Plateforme d’origine UV-K5 V1 / DP32 | UV-K5 V3 / UV-K1 PY32 |
| Système de build | Makefile et indicateurs 0/1 | CMake et options par preset |
| Analyseur | Base fagci avec modifications Egzumer | Portage et modifications par version |
| Mémoire/données | Cartographie de son firmware | Équivalence non présumée |
| Multiboot Armel v6 | Non documenté comme fonction de cette base | Extension spécifique du projet PY32 |
| Préparation dans les slots web | Non prise en charge | Uniquement les images reconnues et vérifiées |

N’utilisez pas un flasheur V1 ni une image Egzumer d’origine sur une V3. Les mots
K5/K6 sur une page de garde ne prouvent pas la révision du MCU. Consultez la carte et le projet.
Aucun compilateur Egzumer n’est intégré à la commande Bricohams V3.

## Fonctions et réglages utilisateur

Le README documente la correction AM, la démodulation SSB, le spectre, le balayage rapide,
la modification du nom, les modes d’affichage, les touches attribuables, la batterie,
le rétroéclairage, le microphone et la recherche CTCSS/DCS. SSB désigne ici
la démodulation en réception ; cela ne signifie pas un émetteur SSB.

Pour les notions RX/TX, step, largeur, SQL, tonalités, VOX, TOT et verrouillage de canal,
consultez la [configuration commune](AYUDA-CONFIGURACION.md). Utilisez le nom du menu,
et non des numéros transposés depuis F4HWN v6 ou Karina. L’ordre et les noms ont
été modifiés par rapport au firmware stock.

Le wiki officiel est la référence pour les séquences de touches du build installé :

- [Wiki et manuel](https://github.com/egzumer/uv-k5-firmware-custom/wiki).
- [Releases](https://github.com/egzumer/uv-k5-firmware-custom/releases).

Tous ses raccourcis n’ont pas été vérifiés sur le matériel et ils ne sont pas transférés automatiquement
aux firmwares dérivés. Le README avertit des limites de plage dynamique, de la surcharge
et des filtres d’entrée ; l’AM fix ne peut pas éliminer les limites physiques.
Une antenne avec un signal plus fort peut dégrader la réception dans un environnement RF intense.

## Options de compilation du commit inspecté

Valeurs `?=` du Makefile : un argument make peut les remplacer. 0/1 ne sont pas les ON/OFF de CMake ni des menus de la radio.
Les explications des fonctions partagées figurent dans la
[référence F4HWN et options historiques](AYUDA-OPCIONES-F4HWN.md) ; partager
un nom ne garantit pas que l’implémentation ou le stockage soit identique.

| Option | Défaut | Fonction |
| --- | --- | --- |
| ENABLE_UART | 1 | Communication de configuration avec le PC |
| ENABLE_AIRCOPY | 0 | Transfert AirCopy compatible |
| ENABLE_FMRADIO | 1 | Récepteur de radiodiffusion FM |
| ENABLE_NOAA | 0 | Fonctions météorologiques NOAA |
| ENABLE_VOICE | 0 | Annonces vocales |
| ENABLE_VOX | 1 | Déclenchement TX par audio, à configurer/désactiver pour éviter les accidents |
| ENABLE_ALARM | 0 | Fonction d’alarme avec émissions possibles ; ne pas l’utiliser comme test |
| ENABLE_TX1750 | 0 | Tonalité d’accès à un relais |
| ENABLE_PWRON_PASSWORD | 0 | Mot de passe à la mise sous tension ; ne chiffre pas toute la mémoire |
| ENABLE_DTMF_CALLING | 1 | Logique d’appels DTMF |
| ENABLE_FLASHLIGHT | 1 | LED/lampe torche du matériel |
| ENABLE_BIG_FREQ | 1 | Fréquence en gros caractères |
| ENABLE_SMALL_BOLD | 1 | Texte de petite taille en gras |
| ENABLE_CUSTOM_MENU_LAYOUT | 1 | Disposition alternative des menus |
| ENABLE_KEEP_MEM_NAME | 1 | Conservation du nom lors de la modification d’une mémoire |
| ENABLE_WIDE_RX | 1 | Réception de plages étendues ; ne constitue pas une autorisation TX |
| ENABLE_TX_WHEN_AM | 0 | Autoriser la voie TX en mode RX AM ; ne prouve pas la modulation AM |
| ENABLE_F_CAL_MENU | 0 | Étalonnage de fréquence avec des instruments |
| ENABLE_CTCSS_TAIL_PHASE_SHIFT | 0 | Traitement de la queue CTCSS par déphasage |
| ENABLE_BOOT_BEEPS | 0 | Sons au démarrage |
| ENABLE_SHOW_CHARGE_LEVEL | 0 | Affichage du niveau de charge |
| ENABLE_REVERSE_BAT_SYMBOL | 0 | Variante visuelle de la batterie |
| ENABLE_NO_CODE_SCAN_TIMEOUT | 1 | Comportement de timeout de recherche de codes |
| ENABLE_AM_FIX | 1 | Correction de réception/gain AM |
| ENABLE_SQUELCH_MORE_SENSITIVE | 1 | Critère de squelch plus sensible |
| ENABLE_FASTER_CHANNEL_SCAN | 1 | Amélioration de la vitesse de balayage |
| ENABLE_RSSI_BAR | 1 | Indicateur d’intensité |
| ENABLE_AUDIO_BAR | 1 | Indicateur audio |
| ENABLE_COPY_CHAN_TO_VFO | 1 | Copie de la mémoire vers le VFO |
| ENABLE_SPECTRUM | 1 | Analyseur de spectre |
| ENABLE_REDUCE_LOW_MID_TX_POWER | 0 | Variante des cibles de puissance faible/moyenne |
| ENABLE_BYP_RAW_DEMODULATORS | 0 | Voies RAW avancées de démodulation |
| ENABLE_BLMIN_TMP_OFF | 0 | Traitement temporaire de la lumière minimale |
| ENABLE_SCAN_RANGES | 1 | Plages de balayage |
| ENABLE_AM_FIX_SHOW_DATA | 0 | Données de diagnostic AM fix |
| ENABLE_AGC_SHOW_DATA | 0 | Données de diagnostic AGC |
| ENABLE_UART_RW_BK_REGS | 0 | Accès aux registres RF ; ne pas activer en routine |
| ENABLE_CLANG | 0 | Compilation avec Clang dans la configuration du projet |
| ENABLE_SWD | 0 | Prise en charge du débogage SWD |
| ENABLE_OVERLAY | 0 | Overlay mémoire de cette base, pas les slots firmware |
| ENABLE_LTO | 1 | Optimisation de l’édition de liens |

Dans ce Makefile, Clang force LTO=0 ; avec LTO=1, OVERLAY=0 est imposé.
Ces règles sont propres à cette base et ne doivent pas être copiées dans le CMake PY32 sans analyse.
L’activation d’options peut dépasser la mémoire ou casser des combinaisons ; l’existence
d’une clé n’implique pas que toutes les combinaisons soient prises en charge.

Pour compiler, utilisez la toolchain et la procédure de son README dans un checkout fixé,
conservez la carte mémoire, la licence et les hashs, et validez le matériel V1. Egzumer n’a pas été
compilé, flashé ni testé lors de cet ajout documentaire.

## Relation avec Karina et Bricohams

Une généalogie de fonctions similaires ne permet pas de reconstituer les sources exactes
de Karina. Les pilotes et noms qui mentionnent Egzumer ne constituent pas non plus une preuve.
Bricohams V3 dérive actuellement de F4HWN PY32, et non de ce dépôt d’origine.
Un projet Bricohams V1 serait une autre compilation et une autre validation matérielle.

## Sources fixées

- [README du commit](https://github.com/egzumer/uv-k5-firmware-custom/blob/7607f0a4bd6203d1f06b70556fc1ce0d7399d6b3/README.md).
- [Makefile du commit](https://github.com/egzumer/uv-k5-firmware-custom/blob/7607f0a4bd6203d1f06b70556fc1ce0d7399d6b3/Makefile).
- [Licence Apache-2.0](https://github.com/egzumer/uv-k5-firmware-custom/blob/7607f0a4bd6203d1f06b70556fc1ce0d7399d6b3/LICENSE).
- [Pack V3 et nouvelles preuves Karina](AYUDA-PACK-DIM0S.md).