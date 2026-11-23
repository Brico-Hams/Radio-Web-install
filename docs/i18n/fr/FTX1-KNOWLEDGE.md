# Connaissances Yaesu FTX-1 : référence de recherche

## Introduction et légende de sécurité

Ce document rassemble ce qui a été appris de 22 dépôts publics sur le Yaesu
FTX-1 (commandes CAT, USB, mémoires, firmware, matériel, satellites et
architectures distantes) et le compare à ce que fait déjà Bricohams. C'est un
document de référence : il ne remplace ni le manuel officiel Yaesu « CAT
Operation Reference Manual » ni l'aide utilisateur `docs/AYUDA-FTX1.md`.

Où se trouvent les sources : chaque dépôt est cloné sans modification dans
`third_party/ftx1/<carpeta>`. Le tableau avec l'URL, le commit et la licence de
chacun se trouve dans `third_party/ftx1/SOURCES.md`. Les citations s'écrivent
`[carpeta:ruta]`, avec le dossier sous `third_party/ftx1/`. Les citations
`[SOURCES.md]` pointent vers `third_party/ftx1/SOURCES.md`.

Légende de sécurité. Ces étiquettes marquent les lignes et les paragraphes :

- **ESCRIBE EN LA RADIO** : enregistre des données qui persistent dans la radio
  (mémoire, menu, horloge, état) ou modifie l'état de la radio.
- **REGION/LIMITES TX** : modifie ou affecte les bandes ou la puissance sur
  lesquelles la radio peut émettre.
- **CALIBRACION** : touche aux données de calibration d'usine.
- **FIRMWARE** : lit, prépare ou charge un firmware.

Ce projet n'automatise jamais rien de ce qui est marqué **REGION/LIMITES TX**,
**CALIBRACION** ou **FIRMWARE**. Il n'automatise pas non plus l'émission (PTT,
CW, coupleur). Tout ce qui est marqué **ESCRIBE EN LA RADIO** et que l'outil
propose (mémoires, menu) exige de lire d'abord, de faire une sauvegarde, de
simuler et de vérifier par relecture.

Notation : les commandes sont de l'ASCII terminé par `;`. `P1` est le côté : 0 =
MAIN, 1 = SUB, sauf indication contraire. `?;` est le refus de la radio. « Réglage
seul » signifie qu'il n'y a ni lecture ni réponse. Le CAT exige un firmware MAIN
1.08 ou ultérieur
[gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]
[ew1abz-yaesu-ftx-1-memory-manipulator:doc/cat-version-diff.md]. Trois révisions
du manuel CAT ont été vues : 2306, 2507(-B) et 2508-C
[captobie-ftx1-remote:ftx1-cat-manual-errata.md]
[ew1abz-yaesu-ftx-1-memory-manipulator:doc/cat-version-diff.md]. Le manuel
2508-C compte 89 familles de commandes dans l'index (90 avec `EO`, qui n'apparaît
que dans le tableau de détail) et 580 lignes de détail, dont 427 pour `EX`
[rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md].

Aucun dépôt étudié ne contient de code qui grave un firmware, change la région
ou les limites de TX (sauf l'outil de région de la section 5 et les menus de
puissance `PC`/`EX`), ni n'écrive la calibration. Du firmware, seule la version
est lue avec `VE`.

## Référence des commandes CAT

Les désaccords entre sources et les erreurs du manuel sont conservés dans la
colonne Notes. Les lignes marquées **ESCRIBE EN LA RADIO** modifient des données
qui persistent. Celles d'émission (`TX`, `MX`, `KY`) et de démarrage du coupleur
(`AC`) activent l'émetteur : ce projet ne les utilise pas.

| Commande | Réglage | Lecture | Réponse | Paramètres | Notes | Sources |
|---|---|---|---|---|---|---|
| AB | `AB;` | - | - | Copie MAIN vers SUB | Réglage seul. Rigplane l'appelle « M=S equalize » ; ce n'est pas une opération VFO A/B | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] [rigplane-rigplane-core:rigs/ftx1.toml] |
| AC | `AC P1 P2 P3;` | `AC;` | `AC P1 P2 P3;` | P1 0 interne/1 externe ; P2 0 ATU, 2 ATAS ; P3 0 OFF, 1 ON, 3 START (2 réservé) | P3=3 démarre le coupleur et **émet**. Vérifié sur radio : P1=0 ne fait rien sur une Optima, P1=1 fonctionne. Formes : interne `AC003;`/`AC000;`, externe `AC103;`/`AC100;`, ATAS `AC123;`/`AC120;` ; ATAS refuse tout ce qui n'est pas `AC12x` ; `AC;` peut rester différent de zéro à la fin (on surveille PO) ; **mesuré sur radio pendant un réglage ATAS : `AC100` pendant tout le réglage** (la radio le signale sans que l'opérateur le change ; console : pas un changement de l'opérateur) ; antenne `EX030704;`, type de coupleur `EX030701;`/`EX030702;`. **ESCRIBE EN LA RADIO** (état) | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| AG | `AG P1 nnn;` | `AG P1;` | `AG P1 nnn;` | Gain AF, 3 chiffres, 000-255 | Utilisé par gnfrazier, rigplane, WebUI, iTracMan et SEM | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Vfo.cs] |
| AI | `AI0;`/`AI1;` | `AI;` | `AI s;` | Information automatique OFF/ON | Aucune source ne décrit le format des messages non sollicités ; les applications interrogent au lieu de dépendre de AI. Voir section 3 | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] |
| AM | `AM;` | - | - | Enregistre l'état du VFO-A MAIN dans le canal mémoire sélectionné (sans argument de canal) | Réglage seul. Enregistre tonalité/CTCSS, mode et décalage (MW non). **ESCRIBE EN LA RADIO** | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| AO | lecture/réglage | oui | - | Niveau de sortie AMC 001-100 (ITM : `AOnnn`) | Non implémenté dans rigplane | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| BA | `BA;` | - | - | Copie SUB vers MAIN | Réglage seul | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] |
| BC | `BC P1 s;` | `BC P1;` | `BC P1 s;` | Notch automatique (DNF) OFF/ON par côté | Forme SUB testée sur banc | [rigplane-rigplane-core:rigs/ftx1.toml] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] |
| BD | `BD P1;` | - | - | Bande vers le bas | Sans réponse. Rigplane envoie `BD0;` ; WebUI et POK `BDv;` | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| BI | `BI s;` | `BI;` | `BI s;` | Break-in OFF/ON | EUG lit l'état à l'offset 2 | [rigplane-rigplane-core:rigs/ftx1.toml] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java] |
| BM | `BM;` | - | - | Enregistre l'état du VFO-B SUB dans la mémoire sélectionnée | Réglage seul. Enregistre le VFO SUB réel (peut corrompre le canal, p. ex. bloqué sur 144 MHz). **ESCRIBE EN LA RADIO** | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] |
| BP | `BP P1 P2 nnn;` | `BP P1 P2;` | `BP P1 P2 nnn;` | Notch manuel. P2=0 : état 000/001 ; P2=1 : fréquence 001-320 (x10 Hz = 10-3200 Hz) | Le manuel n'a pas de commande de largeur du notch. La réponse peut ne pas être numérique (`BP01F35;`) dans les modes sans notch (FM). Forme SUB `BP10`/`BP11` | [bg7nzl-ftx1ctl:ftx1cat.py] [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| BS | `BS P1 nn;` | la lecture donne `?;` | - | Sélection de bande, nn 00-14 (gnfrazier : 5=14 MHz, 6=18, 7=21, 8=24.5, 9=28, 10=50 MHz) | Écriture seule. **Désaccord** : PR2EM, ITM, POK et RZO l'utilisent ; les notes de WebUI disent que la radio (et son mock) le refusent. PR2EM : la bande des 11 m n'a pas de code et envoie `FA027555000;` + `MD02;`. RZO utilise `BS113` | [rigplane-rigplane-core:rigs/ftx1.toml] [gnfrazier-ftxcat:ftxcontrol.py] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] [rzochowski-cat-ftx1:cat-presets.json] |
| BU | `BU P1;` | - | - | Bande vers le haut | Sans réponse | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] |
| CF | `CF P1 0 0 rx tx 000;` (clarifier on/off) ; `CF P1 0 1 +/-nnnn;` (décalage) | `CF P1 00;` / `CF P1 01;` (rigplane `CF000;`/`CF001;`) | `CF P1 0 P3 ...;` (11 caractères) | P3 0 = réglage CLAR, 1 = fréquence CLAR ; décalage +/-0000-9999 Hz (la doc de gnfrazier dit +/-9995 ; ew1abz-memory +/-9990 dans les mémoires) | ew1abz-control utilise les deux mêmes formes | [gnfrazier-ftxcat:ftxcontrol.py] [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs] [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Vfo.cs] |
| CH | réglage | - | - | Canal mémoire haut/bas | Non implémenté dans rigplane ; POK l'utilise | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [pokibon3-FTX1Controller:js/ftx1.js] |
| CN | `CN P1 P2 ppp;` | `CN P1 P2;` | `CN P1 P2 ppp;` | P2 0 = CTCSS (ppp 000-049, indice d'une table de 50 tonalités), 1 = DCS (000-103, 104 codes) | Indice : 00=67.0 ... 12=100.0 ... 49=254.1 Hz (table complète chez fritzsche). MW ignore CN ; régler CN avant AM. Rigplane n'implémente que CTCSS | [fritzsche-yaesu-ftx1:cat_format.md] [rigplane-rigplane-core:rigs/ftx1.toml] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] |
| CO | `CO P1 P2 nnnn;` | `CO P1 P2;` | `CO P1 P2 nnnn;` | P2 0 = contour on/off, 1 = fréquence contour, 2 = APF on/off, 3 = fréquence APF | Rigplane utilise `CO00/CO02/CO03`. EUG utilise `CO02;`/`CO020000;`/`CO020001;` comme interrupteur d'APF | [rigplane-rigplane-core:rigs/ftx1.toml] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java] |
| CS | `CS s;` | `CS;` | `CS s;` | Spot CW | | [rigplane-rigplane-core:rigs/ftx1.toml] |
| CT | `CT P1 P2;` | `CT P1;` | `CT P1 P2;` (la radio réelle répond avec un P2 d'un chiffre) | P2 0 OFF, 1 TONE (ENC on/DEC off), 2 TSQL (ENC+DEC), 3 DCS, 4 PR FREQ, 5 REV TONE | **Diffère des codes 1 et 2 de P8 dans MW/MR (inversés)**, voir section 4 | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] [rigplane-rigplane-core:rigs/ftx1.toml] |
| DA | lecture/réglage | `DA;` | - | Contraste 00-20 et luminosité TFT/LED 00-20. Le réglage est combiné (`DA00` + trois valeurs de 2 chiffres), il faut lire et fusionner avant | Volontairement non publié dans rigplane. captobie le liste parmi les commandes utilisées | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [captobie-ftx1-remote:CLAUDE.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| DN | réglage | - | - | MIC DOWN | Les titres de l'index et du détail diffèrent | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [captobie-ftx1-remote:ftx1-cat-manual-errata.md] |
| DT | `DT0 yyyymmdd;` / `DT1 hhmmss;` | lecture | - | Date et heure | Non implémenté dans rigplane. **ESCRIBE EN LA RADIO** (horloge) | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [Semyonic-ftx1-programmer:src/cat/commands.ts] |
| EO | réglage | - | - | Encoder offset, 6 sélecteurs (MAIN/SUB/les deux x cadran principal/FUNC, +/-, Hz/kHz/MHz) | A une page de détail mais pas d'entrée dans l'index | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [captobie-ftx1-remote:ftx1-cat-manual-errata.md] |
| EX | `EX P1P2P3 P4;` (adresse de menu + valeur) | `EX P1P2P3;` | `EX P1P2P3 P4;` | 427 adresses de menu ; la largeur de P4 varie selon l'élément. Connus : `EX010413` MOD SOURCE DATA, `EX010113` SSB, `EX010514/15` repère/shift RTTY, `EX010417` tonalité PSK de DATA, `EX0202 05+n` type de mémoire CW, `EX020203` CW weight, `EX060103` APRS AF MUTE, `EX030204` SCAN RESUME, `EX050201` MY POSITION latitude, `EX030604/05/06` CH-STEP par mode | **ESCRIBE EN LA RADIO** (menu). Erreurs vérifiées sur radio : `EX020203` P4 est l'écart par rapport à 2.5 par pas de 0.1 (00=2.5, 20=4.5) ; `EX040107` AUTO POWER OFF 2 chiffres, 00=OFF, 01-24 = 0.5-12 h ; `EX010322` DCS CODE demande 3 chiffres 000-103 ; `EX030503` HF MAX POWER maximum 100 W entiers (**REGION/LIMITES TX**) ; `EX030504` 50M MAX POWER 005-100 (supposé) ; le bloc `EX05xx` place MY POSITION en P2=02 et SD CARD, SOFT VERSION, **CALIBRACION** et RESET en P2=03-06 ; `EX050109` répond `?;`. Seulement supposées : incohérences entre les plages P1/P3 du manuel et le Tableau 3 (OS, RPT SHIFT, SPEED UNIT, WIND UNIT, ANT2, RF-SQL VR, TUN-LIN, MOD SOURCE, liste MIC, FM DIAL STEP, nombre DTMF). Écrire EX directement peut changer la vitesse CAT, le bit d'arrêt, le timeout ou le port TUN/LIN (la restauration de PR2EM les omet). SEM associe la réponse à l'adresse de 8 caractères. Les éléments d'action du catalogue (CALIBRACION, RESET) ne sont jamais envoyés | [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [captobie-ftx1-remote:ftx1-cat-manual-errata.md] [captobie-ftx1-remote:CLAUDE.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/menu.py] [Semyonic-ftx1-programmer:src/cat/transport.ts] [pokibon3-FTX1Controller:js/exmenu.js] |
| EX01 (audio) | `EX01` + catégorie 01-05 + paramètre 01-03 + valeur de 2 chiffres avec signe | lecture | - | Égaliseur AF par mode : aigus/médiums/graves de -20 à +10 | C'est un usage concret de `EX`. **ESCRIBE EN LA RADIO** | [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| FA | `FA fffffffff;` | `FA;` | `FA fffffffff;` | Fréquence MAIN, 9 chiffres en Hz. ITM borne le réglage à 30 kHz-470 MHz ; RX d'usine 30 kHz-174 MHz et 400-470 MHz | Utilisé par gnfrazier, bg7nzl, ew1abz-*, PR2EM et WebUI. FB/f Sub n'est pas fiable avec MAIN sur un canal de 6 m (captobie). PR2EM relit `FA;` après le réglage | [fritzsche-yaesu-ftx1:cat_format.md] [gnfrazier-ftxcat:ftxcontrol.py] [bg7nzl-ftx1ctl:ftx1cat.py] [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs] [captobie-ftx1-remote:CLAUDE.md] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.cs] |
| FB | `FB fffffffff;` | `FB;` | `FB fffffffff;` | Fréquence SUB, 9 chiffres | Avec le split `ST1`, FB devient le VFO d'émission, dans le mode de MAIN. Dans Look4Sat : FA = descente (RX), FB = montée (TX) | [gnfrazier-ftxcat:ftxcontrol.py] [captobie-ftx1-remote:CLAUDE.md] [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt] |
| FD | non documenté | - | non sollicité | Le premier paramètre est le côté du scope | Message non sollicité qui déclenche des requêtes `SS` (selon un commentaire de RZO) | [rzochowski-cat-ftx1:serial-server.mjs] |
| FN | lecture/réglage | oui | `FN;`/`FN d;` | Fine tuning OFF/ON/Fast | Non implémenté dans rigplane. POK l'utilise comme affectation FUNC | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Vfo.cs] [pokibon3-FTX1Controller:js/ftx1.js] |
| FR | `FR nn;` | `FR;` | `FR nn;` | 00 = réception double, 01 = réception simple (POK : `FR0v;`) | État de la fonction de récepteur | [captobie-ftx1-remote:CLAUDE.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| FS | (FT-991A) | - | - | Uniquement dans le profil FT-991A de POK | Ne concerne pas le FTX-1 | [pokibon3-FTX1Controller:js/ft991a.js] |
| FT | `FT v;` | `FT;` | `FT v;` | Sélectionne l'émetteur MAIN/SUB (0/1) | Ne donne pas la permission d'émettre. `SC<lado>1` déplace VS/FT. Dans Look4Sat, choisir SUB n'active pas le PTT | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] [captobie-ftx1-remote:CLAUDE.md] [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt] |
| GP | lecture/réglage | oui | - | Quatre sorties CMOS de 5 V LOW/HIGH | Non publié dans rigplane. **ESCRIBE EN LA RADIO** (sorties physiques) | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| GT | `GT P1 P2;` | `GT P1;` | `GT P1 P3;` | Réglage P2 : 0 OFF, 1 FAST, 2 MID, 3 SLOW, 4 AUTO. Réponse P3 : 0 OFF, 1 FAST, 2 MID, 3 SLOW, 4 AUTO-FAST, 5 AUTO-MID, 6 AUTO-SLOW | Le réglage et la réponse utilisent des codages différents (manuel) ; les réponses 4/5/6 signifient AUTO. `GT0` sans réponse en C4FM | [bg7nzl-ftx1ctl:ftx1cat.py] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| ID | - | `ID;` | `ID0840;` | ID fixe du modèle 0840 | Validé par ew1abz-*, rigplane et RZO. POK cite `0800` comme ancien ID dans un commentaire ; son profil FT-991A utilise `0570`/`0670` | [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs] [rigplane-rigplane-core:rigs/ftx1.toml] [gnfrazier-ftxcat:ftxcontrol.py] [rzochowski-cat-ftx1:serial-server.mjs] [pokibon3-FTX1Controller:js/ftx1.js] |
| IF | - | `IF;` | `IF` + canal(5) + fréquence(9) + signe clar(1) + clar(4) + RX clar(1) + TX clar(1) + mode(1) + VFO/mém(1) + tonalité(1) + `00` + shift(1) + `;` (30 caractères) | État composite de MAIN ; même format que MR | La radio de banc a répondu un shift `3` (la section IF du manuel ne le documente pas ; OS documente 3 = ARS). Il n'y a pas de champ PTT ni de split | [rigplane-rigplane-core:rigs/ftx1.toml] [gnfrazier-ftxcat:ftxcontrol.py] [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] |
| IS | `IS P1 0 +/-nnnn;` | `IS P1;` | `IS P1 0 +/-nnnn;` | IF shift +/-0000-1200 Hz par pas de 20 | Particularité : P2 doit être `0` ; le `1` de Hamlib a été refusé par la radio | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| KM | `KM n texto;` | `KM n;` | - | Mémoire de manipulateur 1-5, jusqu'à 50 caractères | La radio ajoute `}` elle-même ; plus de 50 donne `?;` ; `KM<n>;` est une lecture (on ne peut pas vider un emplacement). Caractères A-Z 0-9 `/ ? , . = + - ( ) @ :` ; prosignes `=` BT, `+` AR, `(` KN. SEM : le texte ne peut contenir ni `}` ni `;`. **ESCRIBE EN LA RADIO**. Index et détail avec des titres différents | [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [rigplane-rigplane-core:rigs/ftx1.toml] [Semyonic-ftx1-programmer:src/cat/commands.ts] |
| KP | `KP nn;` | `KP;` | `KP nn;` | Indice de la tonalité CW, 2 chiffres 00-75 = 300 + 10n Hz | | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| KR | lecture/réglage | oui | - | Manipulateur CW OFF/ON (`KR0/1`) | gnfrazier a `set_cw_keyer` (chaîne non localisée) | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| KS | `KS nnn;` | `KS;` | `KS nnn;` | Vitesse CW en WPM, 3 chiffres, 4-60 | | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| KY | `KY P1 P2;` | - | - | P1 0 = mémoire CW TEXT, 1 = mémoire CW MESSAGE ; P2 1-5 lit, 0 arrête (`KY00` arrête) | **Émet** si BK-IN est actif ; un second KY redémarre le message. Il n'existe pas de forme de KY avec texte libre : le CW saisi passe par KM dans l'emplacement 5 puis KY. EUG utilise `KY ` + texte en majuscules + `;` | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/EcranComenzi.java] |
| LK | `LK s;` | `LK;` | `LK s;` | Verrouillage du panneau/cadran OFF/ON | | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [rzochowski-cat-ftx1:serial-server.mjs] |
| LM | lecture/réglage | oui | - | Enregistrement/chargement de messages vocaux, canal/état. `LM0;` sélectionne l'emplacement (arme l'enregistrement) ; `LM1` enregistre sur la SD | Particularité : `LM1` enregistre l'audio RX sur la SD de la radio, ce n'est pas une lecture. **ESCRIBE EN LA RADIO** | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| MA | `MA;` | - | - | Mémoire (choisie avec MC) vers VFO MAIN | Réglage seul. Ne charge que la fréquence (fritzsche : pas les tonalités) | [fritzsche-yaesu-ftx1:cat_format.md] [gnfrazier-ftxcat:ftxcontrol.py] |
| MB | `MB;` | - | - | Mémoire vers VFO SUB | Charge un tampon d'affichage, pas le VFO-B SUB réel (ew1abz) | [gnfrazier-ftxcat:ftxcontrol.py] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] |
| MC | `MC P1 ccccc;` | 2508-C : `MC P1;` (2507-B : `MC;`) | `MC P1 ccccc;` | P1 côté ; canal 00001-00999 (aussi P-nnL/U, 5 MHz, EMGCH) | Fritzsche appelle MC « à 6 chiffres » (côté + 5). Le manuel indique 00001-00099 pour MC et 00001-00999 pour MR/MW/MZ ; vérifié sur radio 1-999. On ne peut pas choisir un emplacement vide (il conserve le précédent sans avertissement). `MC0` avant `VM011`. Selon fritzsche c'est du réglage seul (sans réponse) | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/cat-version-diff.md] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [gnfrazier-ftxcat:ftxcontrol.py] |
| MD | `MD P1 m;` | `MD P1;` | `MD P1 m;` | Modes : 0 = WFM (ew1abz) / « LSB ou FM » (fritzsche), 1 LSB, 2 USB, 3 CW-U, 4 FM, 5 AM, 6 RTTY-L, 7 CW-L, 8 DATA-L, 9 RTTY-U, A DATA-FM, B FM-N, C DATA-U, D AM-N, E PSK, F DATA-FM-N, H C4FM-DN, I C4FM-VW | **Désaccord sur `0`** : ew1abz dit WFM et fritzsche « LSB (ou FM sur certains modèles) ». La liste de fritzsche omet E et I ; bg7nzl et ew1abz les incluent. En C4FM `MD` répond `H` ; le manuel liste aussi `I`. ITM lit le code `0` comme sentinelle AMS, pas comme une erreur (pas de commande CAT pour choisir AMS). La radio le refuse pendant l'émission (banc de rigplane) | [gnfrazier-ftxcat:ftxcontrol.py] [bg7nzl-ftx1ctl:ftx1cat.py] [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:tests/FTX1WinController.Tests/CatCommandsTests.cs] [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt] |
| MG | `MG nnn;` | `MG;` | `MG nnn;` | Gain du microphone, 3 chiffres (ITM 0-100) | | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:CLAUDE.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| ML | `ML P1 ...;` | `ML P1;` | - | Monitor : état (P1=0) / niveau 000-100 (P1=1 ; WebUI `ML0nnn`) | **Conflit** : le manuel le documente ; la radio vivante de rigplane répond `?;` et indique qu'il se contrôle par le menu EX | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] |
| MR | - | `MR ccccc;` | `MR` + ccccc + fréq(9) + signe clar(1) + clar(4) + RX clar + TX clar + mode + type + tonalité + `00` + shift + `;` (27 octets de paramètres, 30 caractères) | Lit un canal sans le sélectionner | Voir section 4. Un canal vide donne `?;`. `MR00000` en mode Mémoire renvoie le canal actif, pas le VFO | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs] [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] |
| MS | lecture/réglage | oui | - | Sélecteur de mesure MAIN/SUB 0-5 (`MS<main><sub>;`) | Sélection de la mesure du panneau ; rigplane a vu `MS35;` sélectionner VDD. Non publié | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.cs] |
| MT | `MT ccccc tag12;` | `MT ccccc;` | `MT ccccc tag12;` (17 caractères de paramètres) | Nom de 12 caractères complété par des espaces ; ASCII 0x20-0x7D sans `;` | **ESCRIBE EN LA RADIO**. Un canal vide donne `?;` | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs] [Semyonic-ftx1-programmer:src/cat/commands.ts] |
| MW | `MW` + enregistrement de 27 caractères (voir MR) + `;` | aucune (réglage seul) | - | Crée ou écrase un canal | **ESCRIBE EN LA RADIO**. P9 (`00`) doit être `00` sinon `?;`. N'enregistre PAS la tonalité (retour au code 12 / 100.0 Hz). La position 17 doit être `+`/`-` (`S` ne convient pas ; fritzsche). Le tableau de détail du manuel omet lecture/réponse | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] |
| MX | `MX P1;` | `MX;` | `MX0;`/`MX1;` | MOX OFF/ON | Action d'émission ; bg7nzl l'utilise. Rigplane la protège par une autorité de TX gérée | [bg7nzl-ftx1ctl:ftx1cat.py] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] |
| MZ | `MZ ccccc s fffffffff;` | `MZ ccccc;` | `MZ ccccc s fffffffff;` (15 caractères) | s 0 = split off, 1 = on ; fréquence de TX en 9 chiffres Hz | **ESCRIBE EN LA RADIO**. Enregistrement de mémoire split ; s'écrit après AM | [ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md] [Semyonic-ftx1-programmer:src/cat/commands.ts] |
| NA | `NA P1 s;` | `NA P1;` | `NA P1 s;` | Narrow OFF/ON (captobie : P1 0 = MAIN, 1 = SUB) | `SH` ne change pas avec NAR en SSB/CW/RTTY/DATA (la largeur réelle est le préréglage du menu NAR WIDTH) | [gnfrazier-ftxcat:ftxcontrol.py] [captobie-ftx1-remote:CLAUDE.md] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] |
| NL | `NL P1 nnn;` | `NL P1;` | `NL P1 nnn;` | Niveau du noise blanker OFF/001-010 (écrit sur 3 chiffres ; PR2EM et WebUI `NL0nnn;`) | | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] |
| OI | - | `OI;` | même format que IF | État composite de SUB (bande opposée) | Utilisé par ew1abz-control pour la fréquence SUB | [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| OS | `OS P1 d;` | `OS P1;` | `OS P1 d;` | d 0 Simplex, 1 Plus, 2 Minus, 3 ARS | **Mode FM uniquement** (ignoré sans avertissement dans les autres). Erreur : l'ordre de la page OS et celui du Tableau 3 diffèrent (Tableau 3 : 0 -, 1 simplex, 2 +, 3 ARS) ; l'application suit la page OS. Seulement la direction ; le décalage est une valeur du menu EX | [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:ftx1-cat-manual-errata.md] |
| PA | `PA P1 P2;` | `PA P1;` | `PA P1 P2;` | P1 0 = HF/50 MHz, 1 = VHF, 2 = UHF. HF/50 : 0 IPO, 1 AMP1, 2 AMP2. VHF/UHF : 0 OFF, 1 ON | Par groupe de bandes, pas par canal | [bg7nzl-ftx1ctl:ftx1cat.py] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] |
| PB | lecture/réglage | oui | - | Lecture/arrêt de message vocal (`PB0<ranura>;`, `PB00;` arrête ; ITM emplacements 0-5) | **Émet** si la lecture se fait avec TX actif | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/EcranComenzi.java] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| PC | `PC P1 nnn;` | `PC;` | `PC P1 nnn;` | P1 1 = tête portable (manuel 005-010 W), 2 = SPA-1 (005-100 W) | **REGION/LIMITES TX**. **Désaccord** : bg7nzl (banc) : la tête accepte 001-010 W ; rigplane : `PC2000;` donne `?;`, minimum 5 W avec SPA-1. gnfrazier : 5-10 W en portable, 5-100 W avec SPA-1, avec un TODO sur les dixièmes de watt ; WebUI accepte les fractionnaires (`PC10.5;`) et teste si >6 W est refusé pour en déduire la batterie. ITM découvre la tête active par la réponse. Erreur : la limite HF MAX POWER relève de `EX`, 100 W entiers | [bg7nzl-ftx1ctl:ftx1cat.py] [rigplane-rigplane-core:rigs/ftx1.toml] [gnfrazier-ftxcat:README.md] [gnfrazier-ftxcat:ftxcontrol.py] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| PL | `PL nnn;` | `PL;` | `PL nnn;` | Niveau du processeur de parole 0-100 (trace réelle `PL003;`) | | [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| PR | `PR P1 s;` | `PR P1;` | `PR P1 s;` | P1 0 = processeur de parole, 1 = égaliseur paramétrique du micro ; s OFF/ON | **Erreur (vérifiée sur radio)** : le manuel dit 1 = OFF, 2 = ON ; la radio utilise 0 = OFF, 1 = ON (ITM : la lecture accepte `0` ou `2` comme off) | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [iTracMan-FTX1WinController:tests/FTX1WinController.Tests/CatCommandsTests.cs] |
| PS | `PS s;` | `PS;` | `PS s;` | Marche/arrêt | `PS0;` éteint la radio. EUG l'envoie à la fermeture de l'application ; SEM l'exige « armé ». **ESCRIBE EN LA RADIO** (état) | [rigplane-rigplane-core:rigs/ftx1.toml] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/MainActivity.java] [Semyonic-ftx1-programmer:src/cat/commands.ts] |
| QI | `QI;` | - | - | Enregistre QMB | Réglage seul. **ESCRIBE EN LA RADIO** | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Vfo.cs] |
| QR | `QR;` | - | - | Rappelle QMB | Réglage seul. ITM a une protection contre les courses critiques lors du rappel | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/RadioController.Vfo.cs] |
| QS | `QS;` | - | - | Split rapide | Seulement POK | [pokibon3-FTX1Controller:js/ftx1.js] |
| RA | `RA P1 s;` | `RA P1;` | `RA P1 s;` | Atténuateur RF (12 dB selon WebUI) | Refusé (`?;`) avec MAIN sur 461.550 MHz lors d'un essai sur banc | [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] |
| RC | `RC;` | - | - | `reset_clarifier` de rigplane | **Non documenté dans 2508-C** (provenance du profil seulement) | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] |
| RG | `RG P1 nnn;` | `RG P1;` | `RG P1 nnn;` | Gain RF 000-255 | | [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| RI | - | `RI P1;` | état de radio à 8 champs | `RI0` (P7 état du scan, P8 squelch) ; `RI1` répond `?;`. PR2EM : 7 caractères (HI-SWR[0], rec[1], TX[2], tuning[4], scan[5], busy[6]) | Le tuner-sweep l'utilise pour détecter le coupleur (chiffre 6). **Mesuré sur radio pendant un réglage ATAS : `RI0` avec HI-SWR + TX + tuning actifs en même temps** (le drapeau HI-SWR n'indique pas une panne pendant que le moteur cherche ; l'agent l'ignore en ATAS et coupe par temps) | [captobie-ftx1-remote:CLAUDE.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |
| RL | `RL P1 nn;` | `RL P1;` | `RL P1 nn;` | Niveau de DNR OFF/01-10 (EUG : forme `RL000;`) | | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java] |
| RM | - | `RM P1;` | `RM P1 nnn 000;` (rigplane : `RM{tipo}{main:03d}{sub:03d}`) | Mesures P1 1..8 : 1 S-MAIN, 2 S-SUB, 3 COMP, 4 ALC, 5 PO, 6 SWR, 7 IDD, 8 VDD ; valeur 000-255 | Brut, non calibré. bg7nzl (uniquement dans le logiciel du PC ; rien n'est écrit dans la radio, **CALIBRACION** côté hôte) : VDD ~ brut*13.8/203, IDD brut*3/255, COMP brut*30/255 dB, ALC brut*200/252 %, SWR 1+0.333(e^(0.0151 brut)-1), PO linéaire par tronçons jusqu'à 15 W. Rigplane : brut 210 ~ 13.8 V (banc). L'index dit RM Set=X mais le détail montre une ligne `P1=0`. RZO note des dispositions à une ou deux valeurs. EUG lit `RM8;` toutes les 5 s pour en déduire une tête de 6 W ou de 10 W | [bg7nzl-ftx1ctl:ftx1cat.py] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java] |
| SC | `SC P1 m;` | `SC;` renvoie la dernière commande (p. ex. `SC11;`) | - | Scan : m 0 OFF, 1 UP, 2 DOWN | `SC0;`/`SC1;` comme lecture donne `?;`. Tout arrêt interrompt les deux scans. `SC<lado>1` déplace VS/FT vers ce côté | [gnfrazier-ftxcat:ftxcontrol.py] [captobie-ftx1-remote:CLAUDE.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| SD | `SD nnnn;` | `SD;` | `SD nnnn;` | Délai de break-in (ms) ; indice de 2 chiffres : 0-5 = 30/50/100/150/200/250 ms puis pas de 100 ms (6-33 jusqu'à 3000 ms) | `VD` utilise la même table 00-33 | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| SF | lecture/réglage | oui | - | Affectation du bouton FUNC (`SF0<perilla>;`) | Uniquement en face avant ; RZO et POK l'utilisent | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [rzochowski-cat-ftx1:serial-server.mjs] [pokibon3-FTX1Controller:js/ftx1.js] |
| SH | `SH P1 0 nn;` (gnfrazier) / `SH P1 nnn;` (rigplane) | `SH P1;` | `SH P1 nnn;` | Code de largeur de filtre | **Désaccord** sur la chaîne de réglage : gnfrazier `SH{lado}0{codigo:02d}` ; rigplane `SH{rx}{codigo:03d}` (mêmes chiffres). WebUI `SH00nn;` lit 2 caractères aux offsets 2-3 | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] |
| SM | - | `SM P1;` | `SM P1 nnn;` | S-mètre (0-255) | La requête SUB renvoie toujours le côté 0 (`SM1;` sans réponse utile ; RZO utilise le chiffre VFO de la commande en file) | [rigplane-rigplane-core:rigs/ftx1.toml] [gnfrazier-ftxcat:ftxcontrol.py] [rzochowski-cat-ftx1:serial-server.mjs] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| SQ | `SQ P1 nnn;` | `SQ P1;` | `SQ P1 nnn;` | Squelch | **Désaccord** : WebUI dit 000-100 ; ITM et SEM 0-255 | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| SS | lecture/réglage | oui | - | Réglages du scope, 7 sélecteurs (vitesse/crête/marqueur/couleur/niveau/span/mode). `SS04+/-dd.d;` D-LEVEL ; `SS01` D-PEAK (chiffre +1) ; `SS02` marqueur ; `SS03` couleur (chiffre hexa +1, couleurs 1-11 = `0-9,A`) | RZO interroge au démarrage `SS04 SS05 SS00 SS03 SS06`. PR2EM-A : curseur -60..60 par demi-pas. Non implémenté dans rigplane | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] [rzochowski-cat-ftx1:serial-server.mjs] |
| ST | `ST s;` | `ST;` | `ST s;` | Split OFF/ON | `ST1` éteint le double affichage (`FR01`). WebUI note que `ST` figure dans sa liste de refus du mock et ne l'utilise pas ; Look4Sat envoie `ST1;`/`ST0;` sans analyser la réponse | [gnfrazier-ftxcat:ftxcontrol.py] [captobie-ftx1-remote:CLAUDE.md] [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt] [git-jcw-FTX-1-WebUI:js/cat/mock-radio.js] |
| SV | `SV;` | - | - | Échange MAIN/SUB | Réglage seul. Inutilisable en mode VFO/Mémoire. Chez captobie, ne déplace que la carte audio en réception double | [fritzsche-yaesu-ftx1:cat_format.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] |
| TS | lecture/réglage | oui | - | TXW (surveillance de TX) OFF/ON | Retenu : n'est effectif qu'avec Split actif, mais la radio fait écho avec Split éteint. Protégé par le TX géré dans rigplane | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| TX | `TX0;`/`TX1;` | `TX;` | `TX0` RX, `TX1` TX par CAT, `TX2` TX par la radio (panneau/micro/VOX) | PTT | gnfrazier lit `TX2` comme « en émission ». Le réglage n'accepte que 0/1 (captobie). Hamlib `t` donne 3 pour TX2 | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:CLAUDE.md] |
| UP | réglage | - | - | MIC UP | | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| VD | lecture/réglage | oui | - | Délai du VOX, table 00-33, pas de 100 ms (par MIC/USB/BLUETOOTH) | Non publié dans rigplane | [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| VE | - | `VE P1;` | version en BCD | P1 0 MAIN, 1 DISPLAY, 2 SDR, 3 DSP, 4 SPA-1, 5 FC-80 | **FIRMWARE** : lecture seule ; rien n'est gravé. Les CPU indisponibles sont omis ou répondent vide | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/transport.py] |
| VG | lecture/réglage | oui | - | Gain du VOX 000-100 | Non publié dans rigplane | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| VM | `VM P1 pp;` | `VM P1;` | `VM P1 pp;` | pp 00 VFO, 10 MT, 11 Memory, 20 PMS, 21 P-01L..P-50U, 51 bande de 5 MHz, 91 EMG. fritzsche : `VM000;` VFO ; `VM;` mémoire | **Désaccord** : fritzsche documente `VM;` comme « passer en mémoire » ; ew1abz utilise `VM011;`. `VM011` échoue silencieusement sauf si l'on envoie `MC0` juste avant. Le manuel liste `VM` deux fois (la première entrée de détail copie AM) | [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] [fritzsche-yaesu-ftx1:cat_format.md] [captobie-ftx1-remote:ftx1-cat-manual-errata.md] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] |
| VS | `VS v;` | `VS;` | `VS v;` | Sélectionne la paire TX/RX MAIN/SUB | Look4Sat l'utilise avec `FT1;` pour choisir SUB comme TX | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:CLAUDE.md] [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt] |
| VX | `VX s;` | `VX;` | `VX s;` | VOX OFF/ON | | [rigplane-rigplane-core:rigs/ftx1.toml] |
| ZI | réglage | - | - | Zero-in automatique du CW par côté (`ZI0;`) | Non implémenté dans rigplane | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/EcranComenzi.java] |

Autres faits sur le CAT :

- Il n'existe pas de commande CAT pour D-COLOR, DG-ID TX/RX, HRI MODE, rappeler
  ou lire les canaux HOME, MAG ni les réglages de WIRES-X
  [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md].
- Il n'y a pas de commande documentée pour effacer un canal mémoire
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md]. La
  puissance par canal n'est pas programmable par CAT
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md].
- Il n'y a pas de commande de suivi MAIN/SUB dans 2508-C
  [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md].
- **Désaccord** non réconcilié : le profil de rigplane utilise l'id de modèle
  Hamlib 2028 [rigplane-rigplane-core:rigs/ftx1.toml] ; captobie utilise le 1051,
  d'abord dans Hamlib 4.7 [captobie-ftx1-remote:CLAUDE.md].
- Erreurs seulement supposées (non vérifiées) : fautes typographiques « mesc »,
  « SYNBOL », « Bycycle » et « LONGTUDE » ; l'emplacement du connecteur USB est
  incohérent ; le manuel CAT ne mentionne pas l'audio USB
  [captobie-ftx1-remote:ftx1-cat-manual-errata.md]
  [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md].
- Les commandes cachées ou spéciales non documentées (SPR/SPW et autres) sont
  hors de ce tableau à dessein ; voir la section 5.

## Interfaces USB, série et audio

**Ports (UART double CP210x)**

- Le connecteur USB-C expose un hub interne : UART double Silicon Labs CP2105
  (VID 10C4 PID EA70 ; la seconde fonction série figure comme 26AA:0030) et un
  codec audio USB (VID 0D8C PID 0016)
  [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:CLAUDE.md].
- Enhanced COM Port = CAT-1 (commandes CAT). Standard COM Port = CAT-2 (PTT, CW,
  DATA ou CAT secondaire)
  [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]
  [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md].
- Pilote : Silicon Labs Dual CP210x USB to UART Bridge ; Windows affiche
  « Enhanced COM Port (COMx) » et « Standard COM Port (COMy) ». Linux
  `/dev/ttyUSB0`/`ttyUSB1` ; macOS `/dev/tty.SLAB_USBtoUART` ; sur Pi, par id,
  `...CP2105...-if00-port0` est le CAT et l'interface 1 est le port de
  manipulation
  [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]
  [captobie-ftx1-remote:Pi/README.md].
- bg7nzl choisit uniquement le « Enhanced COM Port » pour le CAT et le
  « Standard COM Port » pour le PTT (ports par défaut dans le code COM11/COM12)
  [bg7nzl-ftx1ctl:docs/user_manual_en.md] [bg7nzl-ftx1ctl:ftx1cat.py].
- CAT-3 est l'UART arrière TUNER/LINEAR ; elle n'est pas nécessaire pour l'USB
  et il vaut mieux laisser `TUN/LIN PORT SELECT` par défaut
  [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/cat-version-diff.md].
- WSL2 : `usbipd bind/attach` du CP2105 (10c4:ea70) le rend inutilisable sous
  Windows [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]. Sous Linux,
  il faut ajouter l'utilisateur au groupe `dialout` [gnfrazier-ftxcat:faq.md].
- Un Pi en sous-tension fait tomber le hub USB de la radio. `cp210x ttyUSB...: failed set request` arrête la manipulation du CW
  [captobie-ftx1-remote:CLAUDE.md] [captobie-ftx1-remote:Pi/README.md].
- Les services audio échouent avec « Device or resource busy » si un autre
  client occupe la carte son [captobie-ftx1-remote:Pi/README.md].

**Vitesse et format de trame**

- Options de CAT-1 RATE : 4800, 9600, 19200, 38400, 115200 ; 38400 par défaut ;
  chaque PRESET (5) a son propre CAT-1 RATE
  [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md].
- Par défaut 38400 8N1 chez gnfrazier, bg7nzl, ew1abz-control,
  ew1abz-memory-manipulator, rigplane, PR2EM, ITM, WebUI, SEM, Look4Sat et la
  plupart des applications Android ; EUG utilise 4800 8N1 sur le port DATA
  [gnfrazier-ftxcat:ftxcontrol.py] [bg7nzl-ftx1ctl:ftx1cat.py]
  [ew1abz-yaesu-ftx-1-control:ftx1-ctl/src/config.rs]
  [ew1abz-yaesu-ftx-1-memory-manipulator:src/main.rs]
  [rigplane-rigplane-core:rigs/ftx1.toml] [Eugen68-Yaesu-FTX1-CAT-Control:README.md].
- **Désaccord** : la configuration Pi de captobie met CAT-1 à **115200**
  (`rigctld -s 115200`) [captobie-ftx1-remote:Pi/README.md] ; RZO recommande
  aussi 115200 [rzochowski-cat-ftx1:README.md] ; les autres, 38400. POK sonde
  38400, 4800, 9600, 19200 et 115200 [pokibon3-FTX1Controller:js/serial.js].
- Éléments de menu (OPERATION SETTING, GENERAL) : `CAT-1 RATE`, `CAT-1 TIME OUT TIMER` (p. ex. 100 ms), `CAT-1 CAT-3 STOP BIT` = 1 bit, `CAT-2 RATE`, `CAT-2 TIME OUT TIMER`
  [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]. Les modifier à la
  main est **ESCRIBE EN LA RADIO** ; aucun outil ne les écrit.
- Protection du PTT par RTS/DTR sur CAT-2 (mettre sur OFF si CAT-2 sert de CAT
  avec contrôle de flux) : `RADIO SETTING, MODE SSB/AM/FM/DATA/RTTY RPTT SELECT`,
  `CW SETTING, MODE CW RPTT SELECT`, `CW SETTING, PC KEYING`,
  `PRESET, PRESET1-5 RPTT SELECT`
  [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]. Ouvrir le port de
  manipulation relève brièvement DTR/RTS
  [captobie-ftx1-remote:Pi/README.md].
- DTR/RTS selon chaque application (**les applications ne concordent pas**) :
  PR2EM les désactive avant d'ouvrir (ils pourraient activer le PTT avec RPTT) ;
  WebUI les abaisse (les lignes de Standard COM peuvent émettre) ; Look4Sat les
  force à faux ; BYF les active ; POK sur FT-991A met RTS on et DTR off
  [evertonma-FTX-1CAT_PR2EM:ftx1cat/ui/app.py]
  [git-jcw-FTX-1-WebUI:js/cat/transport.js]
  [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1Controller.kt]
  [byf3332-Yaesu-FTX1-Cat-Tunnel:app/src/main/java/com/byf3332/cattunnel/CatTcpBridge.kt]
  [pokibon3-FTX1Controller:js/ft991a.js].

**Méthodes de PTT (informatif ; ce projet n'émet pas)**

- CAT `TX1;`/`TX0;` [gnfrazier-ftxcat:ftxcontrol.py] ; MOX `MX1;`/`MX0;`
  [bg7nzl-ftx1ctl:ftx1cat.py] ; RTS sur CAT-2 [bg7nzl-ftx1ctl:ftx1cat.py]
  [bg7nzl-ftx1ctl:docs/user_manual_en.md] ; RTS/DTR sur CAT-2 pour le CW
  [captobie-ftx1-remote:docs/cw-protocol.md].
- Relais CW de captobie : TCP 8534 avec JSON, ligne RTS par défaut,
  `playoutDelayMs` 300 (20-1000), `heartbeatTimeoutMs` 1000, `maxKeyDownMs`
  5000 ; n'utilise que CAT-2, jamais le port CAT de rigctld
  [captobie-ftx1-remote:docs/cw-protocol.md] [captobie-ftx1-remote:CLAUDE.md].

**Audio USB**

- Codec 0D8C:0016 sous le hub interne [rigplane-rigplane-core:rigs/ftx1.toml].
- **Désaccord** sur les canaux : le profil de rigplane dit que l'audio RX est
  uniquement sur le canal GAUCHE (le droit est du bruit de fond ;
  `rx_audio_channel = "left"`) [rigplane-rigplane-core:rigs/ftx1.toml] ; captobie dit stéréo avec
  Main à gauche et Sub à droite en réception double, lié au récepteur physique
  même s'il est échangé sur le panneau, et que `SV` ne les déplace qu'en
  réception double [captobie-ftx1-remote:CLAUDE.md]
  [captobie-ftx1-remote:Pi/README.md].
- Fréquence d'échantillonnage : ALSA dsnoop/dmix de captobie à 2 canaux, 48000 Hz,
  S16_LE (« estimation initiale », non confirmée)
  [captobie-ftx1-remote:Pi/asound-ftx1.conf] ; CLAUDE.md cite aussi une capture
  stéréo à 44.1 kHz et 48 kHz dans les données Windows
  [captobie-ftx1-remote:CLAUDE.md]. `YaesuCatBackendConfig` de rigplane accepte
  `audio_sample_rate`, `rx_device` et `tx_device`
  [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md].
- Pour envoyer de l'audio de TX depuis le PC, il faut MOD SOURCE = USB (`RADIO SETTING, MODE SSB/AM/FM/DATA, MOD SOURCE` : MIC, USB, Bluetooth, AUTO ; dans
  PRESET : MIC, USB, REAR, AUTO). **Désaccord/erreur** : la valeur 2 est REAR
  dans le preset et Bluetooth par mode. De plus `USB MOD GAIN` (surveiller l'ALC)
  [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md]
  [captobie-ftx1-remote:ftx1-cat-manual-errata.md]
  [captobie-ftx1-remote:Pi/README.md].
- Rigplane n'utilise pas de scope matériel pour le FTX-1 ; le panadapter vient
  de l'audio RX [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md].

**Temps et latence**

- `post_write_delay` de Hamlib = 50 ms ; captobie utilise 10 (27 mille réponses
  propres sur Mac, 17 mille sur Pi ; 0 ou 5 ont parfois donné des réponses
  décalées). La radio répond en ~5 ms ; une lecture ~14 ms avec un délai de 10.
  `rigctld -m 1051 -r <puerto> -s 115200 -t 4532 -o -C post_write_delay=10` (`-o` est nécessaire
  pour les arguments VFO) [captobie-ftx1-remote:CLAUDE.md]
  [captobie-ftx1-remote:Pi/README.md].
- fritzsche : minimum 50 ms entre les commandes ; MW ne répond pas, attendre
  ensuite [fritzsche-yaesu-ftx1:cat_format.md]. gnfrazier : 0.1 s après
  l'ouverture, 0.05 s après l'écriture, lecture avec 1.0 s de timeout
  [gnfrazier-ftxcat:ftxcontrol.py]. bg7nzl : 2 ms après l'écriture,
  `read_until(;)`, timeout 1.0 s, mesures à ~1 Hz
  [bg7nzl-ftx1ctl:ftx1cat.py] [bg7nzl-ftx1ctl:docs/user_manual_en.md].
  ew1abz : timeout de lecture 200 ms et interrogation de la TUI toutes les 500 ms
  [ew1abz-yaesu-ftx-1-memory-manipulator:src/main.rs]
  [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs]
  [ew1abz-yaesu-ftx-1-control:ftx1-ctl/src/app.rs].
- Rigplane : niveaux d'interrogation vive (fréquence/mode) 1.0 s et niveau lent
  avec TTL de 120 s ; un client CAT externe met l'interrogation en pause
  [rigplane-rigplane-core:rigs/ftx1.toml].
- Autres applications : PR2EM 0.8 s de timeout de réponse et 20 ms entre les
  écritures ; ITM FIFO half-duplex avec 1.2 s de timeout et 40 ms de cadence ;
  WebUI une seule commande en vol, lecture 350 ms, les réglages attendent 12 ms
  par `?;` (150 ms sur le coupleur) ; RZO 1.5 s (2 s pour ID) et 40 ms entre les
  requêtes initiales ; POK interrogation rapide 200 ms, lente 1500 ms, niveaux
  6000 ms ; SEM 1 s de timeout
  [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/transport.py]
  [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatConnection.cs]
  [git-jcw-FTX-1-WebUI:js/cat/cat-link.js]
  [rzochowski-cat-ftx1:serial-server.mjs] [pokibon3-FTX1Controller:js/ftx1.js]
  [Semyonic-ftx1-programmer:src/cat/transport.ts].
- Un balayage de mémoires va à ~9-10 canaux/s
  [captobie-ftx1-remote:CLAUDE.md]. Pendant le TX, le mode et le split sont
  refusés avec `?;` et la fréquence est acceptée
  [rigplane-rigplane-core:rigs/ftx1.toml].

**Information automatique (AI)**

- `AI0;`/`AI1;` existe [gnfrazier-ftxcat:ftxcontrol.py]
  [rigplane-rigplane-core:rigs/ftx1.toml]. Aucun dépôt ne décrit le format non
  sollicité. SEM, WebUI et ce projet éteignent AI à la connexion et
  interrogent ; RZO essaie `AI1;` et recommence à interroger s'il n'y a pas
  d'accusé [Semyonic-ftx1-programmer:src/cat/commands.ts]
  [git-jcw-FTX-1-WebUI:js/radio.js] [rzochowski-cat-ftx1:serial-server.mjs].

**Autres faits**

- Rigplane : `has_lan=false`, 2 récepteurs, puissance maximale 100 W et minimale
  5 W, schéma VFO unique `ab_shared`
  [rigplane-rigplane-core:rigs/ftx1.toml]
  [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md].
- Conseil de sauvegarde : enregistrer la mémoire et la configuration sur la
  carte SD avant d'utiliser des scripts ; la radio est « capricieuse » et un
  reset complet peut être nécessaire [gnfrazier-ftxcat:README.md].
- La mise à l'échelle des mesures d'Optima/SPA-1 chez bg7nzl est inexacte
  [bg7nzl-ftx1ctl:docs/user_manual_en.md].
- Android : PR2EM-A et Look4Sat énumèrent tous les ports et demandent la
  permission à l'exécution ; BYF filtre par 10C4:EA70 dans `usb_device_filter.xml` ;
  EUG utilise le premier pilote et port pour le CAT et laisse le lecteur du port
  DATA éteint parce que des gestionnaires concurrents dégradaient la fiabilité
  du CAT
  [evertonma-FTX-1CAT_PR2EM_Android:app/src/main/java/com/pr2em/ftx1cat/CatRadio.kt]
  [byf3332-Yaesu-FTX1-Cat-Tunnel:app/src/main/res/xml/usb_device_filter.xml]
  [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java]
  [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1Controller.kt].
- Web Serial : WebUI et SEM filtrent par VID 0x10C4 ; POK demande le port sans
  filtre
  [git-jcw-FTX-1-WebUI:js/cat/transport.js]
  [Semyonic-ftx1-programmer:src/cat/transport.ts]
  [pokibon3-FTX1Controller:js/serial.js].

## Format des mémoires et comment elles se lisent et s'écrivent

**Identifiants et plages de canaux**
[ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs]

- 00001-00999 canaux mémoire ; `P-01L`...`P-50U` PMS ; 50001-50020 bande des 5
  MHz ; `EMGCH` urgence. Les identifiants font 5 caractères dans
  MR/MW/MT/MZ.
- Type de canal (position 25 de MR/MW) : 0 VFO, 1 Memory Channel, 2 Memory Tune,
  3 QMB, 4 réservé, 5 PMS. Le tableau de MW de fritzsche concorde ; son texte de
  MR ne liste que 0/1/2 [fritzsche-yaesu-ftx1:cat_format.md].
- Codes `VM` : 00 VFO, 10 MT, 11 Memory, 20 PMS, 21 P-01L..P-50U, 51 bande des 5
  MHz, 91 EMG
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md].
- Conflit de plage : MC 00001-00099 contre MR/MW/MZ 00001-00999
  [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] ; le profil de rigplane ne
  liste que les canaux 1-99 [rigplane-rigplane-core:rigs/ftx1.toml] ; le CSV des
  lacunes parle de jusqu'à 09999 pour MC
  [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] ;
  gnfrazier commente « MC P2 = 00001-00099 »
  [gnfrazier-ftxcat:ftxcontrol.py]. captobie a vu 277-278 canaux sur sa radio
  [captobie-ftx1-remote:CLAUDE.md]. Les canaux HOME ne peuvent être ni lus ni
  rappelés par CAT.

**Enregistrement MR/MW (27 caractères de paramètres après `MR`/`MW` ; 30 avec `;`)**
[fritzsche-yaesu-ftx1:cat_format.md]
[ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md]

| Position (depuis 1) | Champ |
|---|---|
| 1-2 | `MR`/`MW` |
| 3-7 | canal (5) |
| 8-16 | fréquence en Hz (9) |
| 17 | signe du clarifier `+`/`-` (MR peut afficher `S` ; dans MW il doit être `+`/`-`) |
| 18-21 | décalage du clarifier en Hz (4) ; ew1abz : -9990..+9990 |
| 22 | clarifier RX 0/1 |
| 23 | clarifier TX 0/1 |
| 24 | mode (codes de MD) |
| 25 | type de canal (ci-dessus) |
| 26 | type de SQL : 0 OFF, 1 CTCSS ENC/DEC, 2 CTCSS ENC, 3 DCS, 4 PR FREQ, 5 REV TONE |
| 27-28 | fixe `00` (ew1abz : « non cartographié », pourrait coder ARS/split/M-GRP) |
| 29 | shift 0 simplex, 1 plus, 2 moins (MW aussi `3` ARS selon ew1abz `to_mw_char`) |
| 30 | `;` |

- Exemple `MR00008145675000+000000412002;`
  [fritzsche-yaesu-ftx1:cat_format.md]. Réponse de test de ew1abz-control
  `IF00000014074000-050010200000;`
  [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs].
- **Désaccord/erreur** : la note de MR dans la section MA de fritzsche dit « mode
  de tonalité en position 18 » (erreur ; le tableau de MR dit 26)
  [fritzsche-yaesu-ftx1:cat_format.md].
- Inversion des codes SQL par rapport à CT : dans MW/MR 1 = ENC/DEC et 2 = ENC ;
  dans CT 1 = ENC (TONE) et 2 = ENC/DEC (TSQL) ; `CmdCt::set` les échange
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md]
  [fritzsche-yaesu-ftx1:cat_format.md].
- ARS : s'enregistre avec `OS` P2=3 ; MR ne porte pas la marque ARS, donc les
  lectures renvoient la direction résolue (plus/moins)
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md].

**Champs pris en charge et non pris en charge**
[ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md]

- Pris en charge : numéro de canal, fréquence RX, direction du décalage, mode
  (17), clarifier, type de SQL, tonalité CTCSS (CN, 50 tonalités), DCS (104 codes),
  nom (12 ASCII), ARS et fréquence de TX en split (MZ).
- Non pris en charge : fréquence de décalage (menu EX par bande : 28 MHz 0-1000
  kHz par pas de 10 kHz, 50 MHz 0-4000 kHz par pas de 10 kHz, 144 et 430 MHz
  0-100 MHz par pas de 50 kHz), M-GRP, IPO/préampli, DNF, DNR, narrow, atténuateur,
  niveau NB, AGC (tous globaux par côté ou par bande, pas par canal) ; le
  compresseur et l'EQ de voix ne sont pas non plus par canal
  [ew1abz-yaesu-ftx-1-memory-manipulator:README.md].

**Outil ew1abz-yaesu-ftx-1-memory-manipulator (`ftx1-mm`)**

- Colonnes CSV : Channel Number, Frequency (Hz), Memory Tag, Mode, Channel Type,
  Squelch Type, Shift (Hz), Clarifier Offset (Hz), Rx Clarifier Enabled, Tx
  Clarifier Enabled, CTCSS Tone, DCS Tone ; optionnel `Split TX (Hz)`
  [ew1abz-yaesu-ftx-1-memory-manipulator:src/main.rs]
  [ew1abz-yaesu-ftx-1-memory-manipulator:chirp_ft897_to_ftx1.py]
  [ew1abz-yaesu-ftx-1-memory-manipulator:README.md].
- Noms de SQL dans le CSV : `CtcssOff`, `CtcssEnc` (TONE de la radio),
  `CtcssEncDec` (TSQ), `Dcs` ; décalages `Simplex`, `PlusShift`,
  `MinusShift`, `Ars` ; type de canal `MemoryChannel`, etc. ; marques de
  clarifier `RxClarifierOff/On`.
- Lecture : boucle `MR` + `MT` (+ `CN`, `MZ`) par canal vers CSV. Écriture : CSV
  vers `MW`/`MT` par canal (**ESCRIBE EN LA RADIO**)
  [ew1abz-yaesu-ftx-1-memory-manipulator:CLAUDE.md].
- Séquence d'écriture par canal (13 étapes) : `MW` (crée l'emplacement), `VM`
  P2=11, `MC`, `VM` P2=00, `MD` FM, `OS` shift, `MD` mode réel, `FA`, `CT`, `CN`
  CTCSS, `CN` DCS, `AM` (confirme), `MT` nom (`MZ` après `AM` s'il y a du split)
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md].
- Elle est additive : ne touche que les canaux du CSV et n'efface rien. Validée
  par un aller-retour de 16 canaux lecture, écriture et lecture identiques
  octet par octet
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md].
- Options : `--read-radio`, `--write-radio`, `--check-data`, `--print`,
  `--port` (par défaut `/dev/ttyUSB0`), `--speed` (38400), `--file`,
  `--allow-any-frequency`
  [ew1abz-yaesu-ftx-1-memory-manipulator:README.md].
- **REGION/LIMITES TX** (souple) : validation de 30 kHz-174 MHz et 400-470 MHz ;
  `--allow-any-frequency` la contourne (radios modifiées MARS-CAP, SATCOM,
  trou 174-400 MHz)
  [ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs].
- Les canaux non contigus sont permis ; les lignes `#` sont des commentaires ; le
  tableur supprime les zéros à gauche et `.0` (l'outil complète à 5 et
  associe la tonalité par valeur)
  [ew1abz-yaesu-ftx-1-memory-manipulator:README.md].
- Conversion CHIRP (`chirp_ft897_to_ftx1.py`) : FM vers FM, NFM vers FM-N, AM, LSB,
  USB, CW vers CW-U, DIG vers DATA-U, PKT vers DATA-FM ; duplex ""/+/- vers
  Simplex/PlusShift/MinusShift ; Tone ""/Tone/TSQL/DTCS vers
  CtcssOff/CtcssEnc/CtcssEncDec/Dcs ; nom tronqué à 12. Sont omis avec le motif
  sur stderr : DV (D-STAR), WFM, tonalité croisée, TSQL-R/DTCS-R, duplex split,
  fréquence ou emplacement invalide
  [ew1abz-yaesu-ftx-1-memory-manipulator:chirp_ft897_to_ftx1.py]. Renuméroter :
  `renumber_channels.py`
  [ew1abz-yaesu-ftx-1-memory-manipulator:renumber_channels.py].

**Outil fritzsche-yaesu-ftx1 (programmateur de mémoires)**

- Stratégies de téléversement (**ESCRIBE EN LA RADIO**) : (1) analogique sans
  tonalité : `VM000;`, `FA...;`, `MW...;` ; (2) analogique avec tonalité/DCS :
  `MW`, `CT0x`, `CN...`, `MC0nnnnn`, `AM;` (ordre de la doc) contre l'ordre de
  CLAUDE.md `MW`, `MC0nnnnn`, `VM000`, `MA`, `CT`, `CN`, `AM` (**l'ordre diffère entre**
  [fritzsche-yaesu-ftx1:cat_format.md] et [fritzsche-yaesu-ftx1:CLAUDE.md]) ; (3)
  numérique C4FM/DN : `MD0H;` puis `MW` directement.
- Étiquette « Indicatif-Ville » de 12 caractères au plus ; les trémas passent en
  ASCII avec `CharConverter.js` [fritzsche-yaesu-ftx1:CLAUDE.md]. MC de 6 chiffres
  (`MC000011`), MR de 5 [fritzsche-yaesu-ftx1:CLAUDE.md].
- **REGION/LIMITES TX** (souple) : la validation saute les fréquences hors HF
  0.1-174, VHF 174-350, aviation 350-400 et UHF 400-524 MHz
  [fritzsche-yaesu-ftx1:CLAUDE.md]. **Désaccord** avec la couverture d'usine de
  ew1abz (30 kHz-174 et 400-470 MHz).
- Formats CSV : CHIRP (`--chirp-csv`) avec `Location,Name,Frequency,Duplex,Offset, Tone,rToneFreq,cToneFreq,DtcsCode,DtcsPolarity,Mode,TStep,Skip,Comment` ; et
  celui de relais.dl3el.de (`--csv`) séparé par `;` avec virgule décimale
  allemande, sans champ Location (`--start-mem` numérote) ; DMR, D-Star et Tetra
  sont exclus. Il y a une incohérence dans la doc entre `--start-mem` et
  `--mem-start`
  [fritzsche-yaesu-ftx1:csv_formats.md].
- Téléchargement/vérification : `node js/download.js [--verify]` exporte vers
  CHIRP ; vérifier compare MR à la relecture `MC` + `FA`
  [fritzsche-yaesu-ftx1:CLAUDE.md]. `MA` ne charge que la fréquence ; `AM`/`BM`
  enregistrent l'état réel du VFO. Le téléversement n'admet pas l'effacement
  [fritzsche-yaesu-ftx1:csv_formats.md].

**Autres outils**

- captobie : liste avec `MR` et `MT`, un canal vide répond `?;` et on s'arrête
  après 100 vides consécutifs ; `VM011` échoue sauf `MC0` juste avant. Écrit la
  mémoire du manipulateur (`KM`), le menu de type de mémoire CW et des réglages
  profonds par `EX` (**ESCRIBE EN LA RADIO**) ; les éléments d'action du
  catalogue (y compris CALIBRACION/RESET) ne sont jamais envoyés
  [captobie-ftx1-remote:CLAUDE.md].
- gnfrazier : VFO/mémoire avec `VM P1;`, `MC`, `MA`, `MB` ; sans CSV ni masse
  [gnfrazier-ftxcat:ftxcontrol.py].
- ew1abz-control : mémoires de fréquence locales en TOML (`[[freq_memory]]`),
  pas celles de la radio [ew1abz-yaesu-ftx-1-control:README.md].
- rigplane : liste de mémoires en lecture seule (`MR` + `MT`, canaux 1-99) ; les
  familles d'écriture sont planifiées
  [rigplane-rigplane-core:rigs/ftx1.toml]
  [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv].
- PR2EM et SEM : éditeurs de mémoire avec CSV (SEM importe aussi ADMS-14 et FT5D
  `.dat`) ; PR2EM relit pour confirmer après `MW` ; SEM limite les canaux gérés
  à 1-99 et la lecture à 1-999 (**ESCRIBE EN LA RADIO**)
  [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py]
  [Semyonic-ftx1-programmer:src/cat/codec.ts]
  [Semyonic-ftx1-programmer:src/io/adms14-csv.ts]
  [Semyonic-ftx1-programmer:src/io/ft5d-dat.ts].

## Outil de région et plages de TX

Résumé seulement. **ESCRIBE EN LA RADIO** **REGION/LIMITES TX** **CALIBRACION**.
Ce projet ne l'utilise pas, ne l'automatise pas et ne la reproduit pas. Pour les
détails, il faut aller au dépôt d'origine
(`https://github.com/Evgeny161rus/ftx1-region-tool`, copie dans
`third_party/ftx1/Evgeny161rus-ftx1-region-tool`).

**Ce que c'est.** Un outil en ligne de commande en Python qui utilise des
commandes de service non documentées, présentes dans le firmware MAIN mais
absentes du manuel CAT, pour lire et écrire des octets isolés de l'EEPROM de la
radio. Les octets qu'il modifie sont proches de la table de calibration d'usine
[Evgeny161rus-ftx1-region-tool:README.md]
[Evgeny161rus-ftx1-region-tool:ftx1_region.py]. Il ne touche l'EEPROM que par
ces commandes de service (`SPR` lecture, `SPW` écriture) ; il n'utilise ni menus
ni commandes normales.

**Ce qui change, en concept.** Le code de destination ou de région de la radio.
De ce code dépend la table des bandes sur lesquelles le firmware autorise
l'émission. Le changer élargit ou réduit les plages de TX ; l'outil documente des
tables différentes selon la région (étroite pour les bandes amateur, plus large,
ou presque continue). L'outil lui-même avertit qu'une région très large peut
proposer des plages où le trajet RF n'est pas prévu pour fonctionner
[Evgeny161rus-ftx1-region-tool:README.md]. Il est fait pour une version précise
du firmware MAIN (V01.13) ; dans d'autres versions, il faut d'abord faire un
vidage car les adresses et les codes peuvent différer.

**Garde-fous de l'outil.** Vidage préalable de l'EEPROM avec sommes de contrôle ;
sauvegarde automatique avant d'écrire (il s'interrompt s'il ne peut pas lire) ;
refus d'un code actuel inconnu sauf si on le force ; mode de simulation ;
confirmation explicite ; relecture avec nouvelles tentatives après l'écriture ;
il faut ensuite éteindre et rallumer complètement la radio
[Evgeny161rus-ftx1-region-tool:README.md]. Une commande générique d'écriture
permet d'atteindre n'importe quel octet, y compris la calibration
[Evgeny161rus-ftx1-region-tool:README.md]. Les anciennes versions avaient un
défaut de lecture qui produisait des vidages et des sauvegardes corrompus.

**Risques.**

- Perte de calibration : on écrit l'EEPROM de service à côté d'elle ; le vidage
  complet préalable est le seul filet de sécurité.
- Légal et homologation : émettre en dehors de ce que permet la licence ou
  l'homologation de type relève de la responsabilité de l'utilisateur ; changer
  la région peut les enfreindre [Evgeny161rus-ftx1-region-tool:README.md].
- Garantie : le changement peut annuler la garantie
  [Evgeny161rus-ftx1-region-tool:README.md].
- L'auteur l'offre « en l'état » et décline toute responsabilité pour les
  dommages, la perte de données ou le dysfonctionnement
  [Evgeny161rus-ftx1-region-tool:README.md].
- Si le firmware restaure le code au démarrage, le dépôt indique qu'il faudrait
  un programmateur externe et modifier un vidage
  [Evgeny161rus-ftx1-region-tool:README.md].

**Comment revenir en arrière, en concept.** Remettre le code de région d'origine
(sauvegardé dans le vidage préalable) avec le même outil, et redémarrer la radio.
S'il y a eu des dommages à la calibration, restaurer depuis le vidage complet ou
s'adresser à un service technique Yaesu.

**Dans ce projet.** `SPR`/`SPW`, les changements de région ou de limites de TX et
toute écriture de calibration sont exclus à dessein.

### Fiche de l'outil

Liens : [dépôt d'origine](https://github.com/Evgeny161rus/ftx1-region-tool/)
et [copie incluse dans ce projet](https://github.com/Brico-Hams/Radio-Web-install/tree/main/third_party/ftx1/Evgeny161rus-ftx1-region-tool).
Cette fiche ne fait que décrire ; elle ne contient ni adresses d'EEPROM, ni
valeurs de code de région, ni syntaxe de la trame d'écriture, ni procédure pas à
pas.

**Langage et prérequis.**

- Un seul script Python (`ftx1_region.py`), signé « R6AAF », qui nécessite
  Python 3.8 ou supérieur et la bibliothèque `pyserial`. Il l'installe tout seul
  la première fois avec `pip` (avec `--user` si nécessaire, ou `ensurepip`), sauf
  si `FTX1_NO_AUTOINSTALL=1` est défini
  [Evgeny161rus-ftx1-region-tool:README.md]
  [Evgeny161rus-ftx1-region-tool:requirements.txt].
- Fonctionne sous Windows, Linux et macOS par le câble USB normal du CAT : il
  faut utiliser le port « Enhanced » du CP2105 (38400 bauds par défaut, `--baud`
  le change, `--port` force le port). Il n'est pas nécessaire d'ouvrir la radio.
- Sans argument, il ouvre un menu interactif. L'interface est en russe, en
  anglais ou les deux ; le choix est enregistré dans `~/.ftx1_region_lang` et
  `--lang` le change pour une seule fois
  [Evgeny161rus-ftx1-region-tool:ftx1_region.py].
- Le dépôt inclut aussi un guide pas à pas en russe, qui n'est pas résumé ici.

**Firmware pris en charge.**

- Conçu pour le FTX-1 avec MAIN V01.13 : c'est de cette image que viennent la
  table des régions et les tables de plages de TX qu'il utilise. Sur d'autres
  versions, il faut d'abord faire un vidage et vérifier avec `info`, car les
  adresses et les codes peuvent différer
  [Evgeny161rus-ftx1-region-tool:README.md].
- La lecture de la version utilise `VE` ; l'identification utilise `ID` (le
  FTX-1 répond `ID0840`).
- Il n'atteint que les 64 premiers Kio de l'EEPROM (adresse sur 16 bits), sur
  les 128 Kio de la puce ; la région, la calibration et les réglages sont au
  début.

**Profil FT-710.** Avec `--radio ft710` (ou en le choisissant dans le menu), le
même outil utilise un autre profil : EEPROM SPI de 32 Kio, autre position du code
et d'un indicateur « 4K », identification `ID0710` et copie toujours complète
avant d'écrire. Il sert à vidanger, sonder, changer la région et analyser des
fichiers du FT-710 [Evgeny161rus-ftx1-region-tool:ftx1_region.py]. Sur le
FT-710, le changement de région utilise en plus une commande `JP` ; sur le FTX-1,
cette commande est un squelette qui répond `?;`, c'est pourquoi on utilise ici
les ordres de service de l'EEPROM.

**Sous-commandes qui ne font que lire** (elles ne modifient pas la radio) :

- `ports` : liste les ports série et marque celui du CAT.
- `info` : lit `ID`, la version et le code de région actuel ; affiche son nom et
  les plages de TX que le firmware autorise pour ce code.
- `list` : tableau des codes de région connus (nom, s'il est « large » et une
  description) ; il est local et ne communique pas avec la radio.
- `dump` : vidange l'EEPROM dans un `.bin` et un `.txt` (voir ci-dessous).
- `read` : lit un seul octet de l'EEPROM.
- `probe` (prévu pour le FT-710) : requêtes en lecture seule de `ID`, `VE`, `JP`
  et lectures de l'EEPROM ; enregistre un journal dans le dossier des vidages et
  indique si le vidage complet par CAT est possible.
- `analyze` : analyse hors ligne un `.bin` déjà enregistré (taille, région,
  blocs non vides) et, avec `--diff`, le compare à un autre.
- `hardware` : n'imprime que des instructions pour un vidage avec programmateur
  externe (puce SPI du FT-710, CH341A et pince SOP8, deux vidages et comparer
  l'empreinte, ne pas appliquer 5 V à une puce de 3,3 V).
- `patch` : hors ligne, change le code de région dans une copie d'un vidage et
  enregistre un nouveau fichier ; il ne touche pas à la radio, mais le résultat
  est prévu pour être gravé avec un programmateur externe
  (**REGION/LIMITES TX**).

**Sous-commandes qui écrivent :**

- `set` : change le code de région (**ESCRIBE EN LA RADIO** **REGION/LIMITES TX**).
  Accepte le code ou le nom, ou le demande en affichant le tableau.
- `write` : écrit un seul octet à n'importe quelle position de l'EEPROM, y
  compris la calibration (**ESCRIBE EN LA RADIO** **REGION/LIMITES TX** **CALIBRACION**) ;
  c'est une option pour experts et elle ne doit pas être utilisée à l'aveugle.
- L'option de menu « set » (sans arguments) fait la même chose que `set`.

**Vidage et copies.**

- Le vidage se lit octet par octet, à environ 12 ms par octet : le vidage normal
  (les 4 premiers Kio : en-tête, calibration et région) prend environ 50 s et le
  complet de 64 Kio (`--full`) environ 13 minutes. `--double` lit deux fois et
  compare.
- À côté du `.bin`, il enregistre un `.txt` avec la date, le port,
  l'identification, le firmware, la région, la somme SHA-256 et le nombre
  d'octets en échec.
- Sans `--out`, les vidages vont dans le dossier `dumps` à côté du script, et les
  copies automatiques préalables à l'écriture dans le dossier `backups` ; les
  deux se créent tout seuls et le chemin complet est imprimé à la fin.
- La copie automatique préalable à `set` couvre les 512 premiers octets de
  l'EEPROM (en-tête, calibration et région) ; sur le FT-710, c'est toujours
  l'EEPROM complète.

**Garde-fous.**

- `set --dry-run` : affiche le code actuel et le nouveau avec leurs plages et
  s'arrête sans rien écrire.
- Si le code actuel est inconnu, il refuse d'écrire sauf avec `--force`.
- Copie automatique préalable et sa vérification : si un octet ne se lit pas ou
  si la région de la copie ne coïncide pas avec l'actuelle, il annule
  (`--no-backup` l'omet).
- Confirmation explicite (il faut taper `yes` ; `--yes` l'omet).
- Relecture après l'écriture, avec réessais et pauses, car le firmware change de
  tables juste après ; si la lecture est impossible, il avertit avec
  `write sent, but the readback failed` (ce n'est pas une erreur d'écriture).
- Il faut éteindre et rallumer complètement la radio et regarder de nouveau avec
  `info`. Si le code revient en arrière, le firmware le restaure au démarrage et
  il faudrait un programmateur externe.
- Les erreurs CAT ne ferment pas le menu ; elles sont seulement imprimées.

**Défauts connus et corrigés.** Le 2026-11-09, la lecture de `SPR` a été
corrigée : la réponse était lue jusqu'au premier `;`, mais cet octet peut aussi
être une donnée ou la somme de contrôle, de sorte que le flux se décalait et que
les réponses suivantes correspondaient à des adresses précédentes avec la bonne
somme. Résultat : vidages et copies corrompus, et `set` qui écrivait puis
échouait à la vérification. Désormais, on lit une réponse de longueur fixe, on
vide le tampon et on réessaie, on vérifie la copie préalable et aussi `ID`. Les
vidages antérieurs ont été marqués `_CORRUPT` et ne servent pas à restaurer
[Evgeny161rus-ftx1-region-tool:README.md].

**Commandes CAT cachées qu'il documente.** Après la table ordonnée des commandes
du firmware MAIN, l'outil décrit un bloc de commandes cachées : `DP`, `SP`, `EO`,
`FD`, `KT`, `PE`, `ZZ`, `VE`, `JP`, `A0`, `A1`, `A2`, `RL`, `EX` et `SW`. Seuls
les noms sont cités ; ceux utilisés par l'outil sont `SPR` et `SPW` (lecture et
écriture d'un octet de l'EEPROM), et `SPIR` répond sur la vraie radio
[Evgeny161rus-ftx1-region-tool:README.md].

**Avertissements légaux et d'usage.** N'émettre que là où la licence le permet ;
changer la région peut enfreindre l'homologation de type et la garantie ; on
écrit de l'EEPROM de service à côté de la calibration, donc il faut faire un
vidage avant la première écriture ; il est offert « en l'état », sans garantie,
et l'auteur décline toute responsabilité pour les dommages, la perte de données,
le matériel endommagé ou le non-respect des lois locales
[Evgeny161rus-ftx1-region-tool:README.md].

## Firmware (Reid-n0rc)

Résumé seulement. **FIRMWARE**. Ce projet ne charge, ne patche et ne prépare
aucun firmware.

Faits du dépôt `Reid-n0rc-FTX-1_Firmware`
[Reid-n0rc-FTX-1_Firmware:README.md] [Reid-n0rc-FTX-1_Firmware:AGENTS.md] :

- État : « tout juste commencé, rien de décodé ». `decomp/` ne contient que
  `.gitkeep` ; les tâches T01-T11 sont en `todo` et leurs rubriques de
  constatations sont vides [Reid-n0rc-FTX-1_Firmware:decomp/.gitkeep]
  [Reid-n0rc-FTX-1_Firmware:docs/tasks/T04-container-decode.md].
- Le microcontrôleur n'est pas identifié (l'étude matérielle T03 est en
  attente). Les puces du FT-710 n'apparaissent que comme hypothèses de
  comparaison
  [Reid-n0rc-FTX-1_Firmware:docs/tasks/T03-hardware-survey.md].
- Images (non vérifié, blog d'un revendeur de mars 2026) : DISPLAY
  V01-09, MAIN V01-12, DSP V01-07, SDR V01-06 ; image séparée possible pour la
  tête portable et le corps amplificateur (Optima)
  [Reid-n0rc-FTX-1_Firmware:docs/tasks/T02-sources.md]
  [Reid-n0rc-FTX-1_Firmware:AGENTS.md]. D'autres sources citent MAIN 01-13 et
  DISPLAY 01-10 comme les dernières
  [sq9pd-Yaesu-FTX-1-mod:README.md].
- Conteneur : inconnu dans ce dépôt ; hypothèse de type FT-710 (`.SFL`
  avec en-tête ASCII, étiquette de taille et CRC, et charge utile encodée). Un autre
  dépôt (sq9pd) confirme en pratique un format de ce style
  [Reid-n0rc-FTX-1_Firmware:docs/tasks/T04-container-decode.md]
  [sq9pd-Yaesu-FTX-1-mod:patch.py].
- Procédure de mise à jour : non documentée dans ce dépôt (T06
  en attente) ; sur le FT-710 le CPU DISPLAY lit la carte SD, sans vérification
  sur le FTX-1 [Reid-n0rc-FTX-1_Firmware:docs/tasks/T06-update-path.md]. En
  résumé, la mise à jour officielle de Yaesu est la seule voie prise en charge ;
  les fichiers de firmware officiels et ceux de tiers se chargent en suivant le
  processus de Yaesu
  [sq9pd-Yaesu-FTX-1-mod:README.md].
- Outils : Ghidra 12.1.4 sans interface graphique et scripts de nommage et
  d'exportation [Reid-n0rc-FTX-1_Firmware:tools/README.md]. Il n'y a pas de
  constatations sur le CAT dans ce dépôt ; T07 prévoit de comparer la table CAT
  documentée à celle du firmware [Reid-n0rc-FTX-1_Firmware:docs/tasks/T07-cat-commands.md].
- Les manuels, images décodées et projets Ghidra ne sont pas versionnés ; le
  firmware reste la propriété de Yaesu [Reid-n0rc-FTX-1_Firmware:AGENTS.md] [SOURCES.md].
- Règle du dépôt : aucune écriture dans la radio sans l'approbation du
  propriétaire à chaque fois (chargement de firmware, EEPROM, commandes CAT non
  testées)
  [Reid-n0rc-FTX-1_Firmware:AGENTS.md].

**Risques.** Une mise à jour interrompue ou échouée peut faire perdre des
réglages ou rendre la radio inutilisable ; il convient de sauvegarder mémoires et
réglages avant et de conserver le firmware d'origine. Un firmware de tiers n'est
pas approuvé par Yaesu. La version du firmware peut se lire sans risque avec `VE`
[sq9pd-Yaesu-FTX-1-mod:README.md] [gnfrazier-ftxcat:ftxcontrol.py].

## Modifications matérielles et façade de protection

Résumé. On ne reproduit ni patchs ni données de patch.

**Façade protectrice (radiohyperactivity).** Fichiers de support pour une façade
artisanale pour le FTX-1 Field : gabarits en mousse PE (A4 et US Letter, SVG et
PDF), sources FreeCAD et STL imprimables (gabarits de mousse de 1 à 5 mm et
boîtier de 20 à 40 mm de profondeur par pas de 2 mm). Il n'y a ni modification
électrique ni écriture dans la radio [radiohyperactivity-ftx1-front-cover:README.md].

**Modification sq9pd (firmware de tiers).** **FIRMWARE**
**ESCRIBE EN LA RADIO** (l'utilisateur devrait charger le résultat avec le
processus de mise à jour de Yaesu ; l'outil ne fait que préparer des fichiers).
Elle n'est ni officielle ni approuvée par Yaesu. Résumé de ce qu'elle offre
[sq9pd-Yaesu-FTX-1-mod:README.md] :

- Part des firmware officiels MAIN 01-13 et DISPLAY 01-10 et n'accepte que ces
  fichiers d'entrée exacts (vérifications de taille et d'empreinte ; refuse les
  fichiers déjà modifiés) [sq9pd-Yaesu-FTX-1-mod:manifest.json]
  [sq9pd-Yaesu-FTX-1-mod:patch.py].
- Quatre pages de cinq boutons configurables sur la rangée inférieure, 70
  fonctions affectables, horloge dans la barre supérieure, bouton de scan natif et
  raccourcis (APRS, FIL/NOTCH/NB/AMC), et deux corrections mineures (BEEP LEVEL = 0
  sans bips muets et une faute « DELY »).
- **SWR SCAN** : **émet de la RF** pendant le balayage (101 points). Exige le
  mode VFO, coupleur éteint et sans SPLIT/RIT/XIT ; force l'AM et une faible
  puissance ; ne limite pas le balayage aux limites de bande, donc toute la plage
  doit être légale pour émettre (**REGION/LIMITES TX**, responsabilité de
  l'utilisateur) ; n'ajoute pas de coupure sur SWR élevé ; le TOT d'usine de 60 s
  reste actif ; pendant le balayage le CAT bloque les changements et le démarrage
  du TX.
- Fonctionne hors ligne (Python 3.9+ ou page de navigateur) ; sans envoi ni
  analytique ; les fichiers originaux ne sont pas distribués. Les tests de
  l'outil indiquent que le patch interactif dans le navigateur « n'est pas encore
  testé » [sq9pd-Yaesu-FTX-1-mod:TEST_RESULTS.json].
- Risques : une mise à jour échouée peut faire perdre des réglages ou rendre la
  radio inutilisable ; les garde-fous « ne peuvent pas garantir une protection
  contre toute défaillance » ; si le TX persiste, éteindre la radio. Revenir en
  arrière : réinstaller les MAIN et DISPLAY d'origine et faire un reset d'usine
  (efface les réglages utilisateur).

Autres mentions de matériel : coupleur externe mAT-30 par le connecteur
TUNER/LINEAR avec câble mAT-CY
[hatandspecs-ftx1-tuner-sweep:docs/usage.md] ; un programmateur externe CH341A
comme ressource de l'outil de région
[Evgeny161rus-ftx1-region-tool:README.md].

### Outil web de sq9pd (ftx-1-mod.sq9pd.pl)

**FIRMWARE**. Liens : [site web](https://ftx-1-mod.sq9pd.pl/) et
[dépôt](https://github.com/sq9pd/Yaesu-FTX-1-mod). Le site n'a pas pu être
téléchargé automatiquement (HTTP 403, 2026-11-17). Cette description provient du
dossier `site/` du dépôt : une application web statique (`index.html`,
`app.js`, `content.js`, `patch-core.js`, `patch-data.js`, plus feuille de style
et images) qui semble être ce que sert le site (non vérifié)
[sq9pd-Yaesu-FTX-1-mod:site/index.html] [sq9pd-Yaesu-FTX-1-mod:site/app.js]
[sq9pd-Yaesu-FTX-1-mod:site/content.js] [sq9pd-Yaesu-FTX-1-mod:site/patch-core.js]
[sq9pd-Yaesu-FTX-1-mod:site/patch-data.js]. Ce projet ne l'utilise pas et ne
reproduit pas de patchs.

- **Ce que l'utilisateur obtient.** Une page en polonais (par défaut) ou en
  anglais qui explique la modification avec trois captures (écran principal,
  configuration des boutons et graphique du SWR SCAN), les instructions et
  limites du SWR SCAN, comment revenir au firmware d'origine et deux sélecteurs
  de fichier (MAIN et DISPLAY) qui génèrent les fichiers `.SFL` modifiés à
  télécharger. La page ne programme pas la radio : le chargement est fait par
  l'utilisateur avec le processus de mise à jour de Yaesu
  [sq9pd-Yaesu-FTX-1-mod:README.md] [sq9pd-Yaesu-FTX-1-mod:READMEPL.md].
- **Où elle s'exécute.** Tout dans le navigateur, sur l'ordinateur de
  l'utilisateur : la page dit que les fichiers ne sont jamais envoyés à un
  serveur, que la vérification SHA-256 et le patch sont locaux, sans analytique
  ni bibliothèques externes. En cohérence, la politique de sécurité de contenu
  de la page interdit toute connexion réseau (`connect-src 'none'`) et le code ne
  fait aucune requête. Elle exige Web Crypto (HTTPS ou localhost) et une case de
  consentement avant de patcher. Les fichiers originaux et ceux déjà patchés ne
  sont pas inclus dans le dépôt.
- **Quelle version elle accepte.** La livraison « FTX-1 MAIN V40 + DISPLAY V35 »,
  basée sur les firmware Yaesu MAIN 01-13 et DISPLAY 01-10 : uniquement les
  fichiers officiels exacts `FTX-1_MAIN_V0113.SFL` et `FTX-1_DISPLAY_V0110.SFL`.
  Les autres versions ne sont pas prises en charge. V40 et V35 sont des versions
  de la modification (les noms de fichier conservent les numéros d'usine) et elle
  n'inclut pas la correction audio du CW de MAIN V41
  [sq9pd-Yaesu-FTX-1-mod:manifest.json].
- **Modifications, au niveau des fonctions.**
  - Quatre pages de cinq boutons configurables sur la rangée inférieure (ils
    s'affectent dans les réglages d'écran), avec 70 fonctions affectables et une
    disposition par défaut.
  - Horloge dans la barre supérieure ; fonctions sans rapport avec le spectre
    disponibles avec le spectre masqué.
  - Raccourcis : APRS (modem, listes de stations et de messages, balise), 3DSS,
    coupleur et antenne, largeur et décalage de filtre, notch, contour, NB, AMC,
    et réglages qui activent la commande FUNC.
  - Scan natif du récepteur sélectionné ; listes de bande et de mode avec appui
    court et action alternative avec appui long.
  - **SWR SCAN** : balayage d'adaptation d'antenne de 101 points autour de la
    fréquence du VFO, avec quatre largeurs de balayage ; **émet de la RF** et
    n'est pas un instrument de mesure calibré indépendamment
    (**REGION/LIMITES TX** : tout le balayage doit être autorisé). Il a ses
    propres codes d'erreur.
  - Deux corrections du firmware d'origine (bips muets avec BEEP LEVEL = 0 et
    une coquille de menu).
- **Vérifications de sécurité.** On vérifie le SHA-256 du fichier à sa
  sélection, sa taille, l'en-tête, l'étiquette de taille et le CRC du format SFL,
  le hash de la charge utile décodée et que les octets d'origine coïncident
  avant d'appliquer les différences ; ensuite on vérifie le CRC et le SHA-256 du
  résultat par rapport à l'attendu. Un fichier d'une autre version, déjà modifié
  ou corrompu est rejeté ; le téléchargement ne s'active qu'avec un résultat
  vérifié et les hashes attendu et réel sont affichés. La version Python répète
  les mêmes vérifications et n'enregistre pas le résultat si elles échouent
  [sq9pd-Yaesu-FTX-1-mod:patch.py] [sq9pd-Yaesu-FTX-1-mod:SHA256SUMS.txt].
- **État des tests.** Le fichier de résultats donne « PASS » à la vérification
  hors ligne : les résultats de Python et de JavaScript sont identiques octet
  par octet pour MAIN et DISPLAY, les cas négatifs passent et l'interface
  (polonais et anglais, mise en page étroite) s'affiche bien. Le patch
  interactif dans le navigateur figure comme « not yet tested in browser; Python
  and JS engine verified » [sq9pd-Yaesu-FTX-1-mod:TEST_RESULTS.json]. Rien de
  tout cela n'a été testé ici.
- **Comment revenir au firmware d'usine.** Sauvegarder d'abord les réglages et
  mémoires, réinstaller les MAIN et DISPLAY d'origine avec le processus de Yaesu
  et faire un reset d'usine (efface les réglages utilisateur) ; réinstaller le
  firmware d'origine ne remplace pas le reset
  [sq9pd-Yaesu-FTX-1-mod:README.md].
- **Avertissements.** Modification non officielle et non approuvée par Yaesu, sous
  la responsabilité de l'utilisateur et sans garantie ; une erreur ou une mise à
  jour interrompue peut faire perdre des réglages ou rendre la radio
  inutilisable ; les garde-fous logiciels ne garantissent pas une protection
  contre toute défaillance et, si la radio continue d'émettre, il faut
  l'éteindre. L'outil n'est ni un compilateur ni un éditeur général de firmware.

## Balayage du coupleur (tuner sweep)

**ATTENTION : chaque pas ÉMET.** **ESCRIBE EN LA RADIO** (change le VFO en
direct et active le TX ; n'écrit ni mémoire, ni menu, ni EEPROM)
[hatandspecs-ftx1-tuner-sweep:README.md]. Ce projet n'implémente pas le balayage
ni ne démarre le coupleur.

`hatandspecs-ftx1-tuner-sweep` est une application locale en Flask
(`http://127.0.0.1:5000`) qui parcourt le VFO du FTX-1 sur les bandes choisies
et déclenche un coupleur automatique externe pour qu'il enregistre une mémoire
par fréquence (testé avec un mAT-30, FTX-1 Optima, 15 m et 12 m)
[hatandspecs-ftx1-tuner-sweep:README.md] [hatandspecs-ftx1-tuner-sweep:docs/usage.md].

| Commande | Signification | Source |
|---|---|---|
| `FA<9 digitos Hz>;` | règle ou lit la fréquence MAIN | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |
| `AC103;` | lance l'accord du coupleur externe (équivaut à maintenir [TUNER] 2 s) ; **émet** | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] [hatandspecs-ftx1-tuner-sweep:AGENTS.md] |
| `AC101;` | arrête l'accord et laisse le coupleur dans le circuit | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |
| `RI;` | activité du coupleur (8 chiffres, le sixième est tuning) | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |
| `PC;` | lit la puissance configurée | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |
| `MD0;` | lit le mode MAIN | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |

- Menu nécessaire sur la radio : TUN/LIN PORT SELECT = EXT-TUNER et TUNER SELECT =
  EXT [hatandspecs-ftx1-tuner-sweep:docs/usage.md]. Série 38400 8N1 par CAT-1.
- Algorithme : par plage, fréquences ordonnées (première = bord inférieur + 1 kHz,
  dernière = bord supérieur - 1 kHz, intermédiaires sur une grille de 10 kHz) ; par
  fréquence : `FA`, attente de 300 ms, `AC103;`, attente fixe de 5 s en interrogeant
  `RI;` toutes les 300 ms, et toujours `AC101;`. `RI` n'est pas fiable avec les
  coupleurs externes (ligne de déclenchement unidirectionnelle), donc on ne se
  fie pas à la fin de l'accord [hatandspecs-ftx1-tuner-sweep:app.py]
  [hatandspecs-ftx1-tuner-sweep:AGENTS.md].
- Les privilèges de bande viennent d'un `bandplans.tsv` modifiable (États-Unis
  exact par classe ; autres pays approximatifs) ou de plages propres en Hz
  [hatandspecs-ftx1-tuner-sweep:docs/band-privileges.md].
- Sécurité : puissance recommandée de 5 W ou moins et l'application ne fait que la
  lire ; chaque pas émet environ 5 s ; exige une liste de contrôle préalable ;
  Stop termine le pas en cours ; ne détecte pas si la fréquence est occupée ; sans
  tests automatiques [hatandspecs-ftx1-tuner-sweep:docs/usage.md]
  [hatandspecs-ftx1-tuner-sweep:app.py] [hatandspecs-ftx1-tuner-sweep:AGENTS.md].

### Réglage ATAS mesuré sur radio (FTX-1)

Mesuré sur radio pendant un réglage ATAS (`AC123;`) [medido en radio: ajuste ATAS, FTX-1] :

- Pendant tout le réglage la radio signale `TX2`, `MD07` (CW-L), `PC2005` et `AC100` ;
  `RI0` garde HI-SWR + TX + tuning en même temps.
- À la fin, la radio restaure d'elle-même le mode et la puissance précédents ;
  le logiciel ne les réécrit pas.
- Console Node (`remote.html`) : tant que `state.tune` existe, elle affiche
  « Réglage ATAS... N s / max », étiquette le mode comme temporaire de réglage
  (non noté comme changement de l'opérateur ni mémorisé par bande) et, quand
  `state.tuneResult` change, garde une carte persistante avec résultat, motif,
  ROS final (« approximative » si elle vient de la courbe RM6 non calibrée) et
  la vérification de TX coupé.

## Satellites et Look4Sat

`juanmmmmmmm-Look4Sat-FTX1` est un fork expérimental de Look4Sat avec « Yaesu
FTX-1 » comme modèle de radio, par USB OTG direct (sans PC ni rigctld). **ESCRIBE
EN LA RADIO** (VFO, mode, split et CTCSS) ; on n'a trouvé ni **REGION/LIMITES TX**,
ni **CALIBRACION**, ni **FIRMWARE**
[juanmmmmmmm-Look4Sat-FTX1:README.md].

- Modèle : MAIN = RX/descente, SUB = TX/montée
  [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/RadioTrackingService.kt].
- Démarrage : mode MAIN selon le mode de descente, mode SUB selon celui de
  montée ; fréquence SUB initiale = base de TX ou milieu de la bande de montée ;
  ensuite `FT1;` + `VS1;` (SUB comme côté de TX).
- Commandes utilisées : `FA%09d;`, `FB%09d;`, `MD0<codigo>;`/`MD1<codigo>;`,
  `FT0/1;`, `VS0/1;`, `ST1/ST0;`, `CN10%03d;` (tonalité CTCSS sur SUB, indice 000-049,
  uniquement tonalités standard avec tolérance de 0.05 Hz) et `CT11;`/`CT10;` ; une
  vérification inoffensive `FA;` après 150 ms à la connexion
  [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt]
  [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1Controller.kt].
- Doppler : à chaque cycle de 1 s il calcule la position et la vitesse radiale,
  met en correspondance la base de montée avec la descente via le pas de bande du
  transpondeur linéaire et applique `getUplinkFreq`/`getDownlinkFreq` ; le
  décalage de descente de l'utilisateur est appliqué avant la mise en
  correspondance pour la montée et après pour la descente ; uniquement
  transpondeurs linéaires
  [juanmmmmmmm-Look4Sat-FTX1:core/domain/src/main/java/com/rtbishop/look4sat/core/domain/utility/DopplerFrequencyCalculator.kt].
- Accord manuel : lit FB/FA, compare avec le dernier envoi (seuil de 20 Hz) et
  après deux lectures stables recalcule la base de TX et reprend les corrections.
- FM : CTCSS uniquement dans l'encodeur de montée de SUB, configurable ; le
  suivi n'applique pas seul une tonalité choisie.
- PTT : le logiciel ne l'envoie jamais (`pttOn()` journalise et renvoie faux) ;
  DTR/RTS forcés à faux ; uniquement le PTT physique du microphone.
- `stopTracking()` annule seulement la tâche : il **ne restaure pas** la
  fréquence, le mode, le split, le VFO ni le CTCSS précédents.

## Architectures distantes, tunnel et WebUI

| App | Conception | Transport et ports | Sécurité et authentification | Latence |
|---|---|---|---|---|
| evertonma-FTX-1CAT_PR2EM | Bureau local ; constructeurs et analyseurs CAT séparés de l'interface Tk ; fil de travail avec file (regroupe par clé) | pyserial, local uniquement | Sans réseau ni authentification | Transport avec RLock ; trames non sollicitées vers un callback [evertonma-FTX-1CAT_PR2EM:ftx1cat/ui/worker.py] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/transport.py] |
| evertonma-FTX-1CAT_PR2EM_Android | Android local ; un seul exécuteur sérialise le CAT | USB hôte série | Seulement la permission USB à l'exécution | Requêtes bloquantes avec timeout ; curseurs avec 90 ms de debounce [evertonma-FTX-1CAT_PR2EM_Android:app/src/main/java/com/pr2em/ftx1cat/CatRadio.kt] |
| Eugen68-Yaesu-FTX1-CAT-Control | Android local ; CAT et DATA partagent une connexion USB | Port CAT + port DATA (RTS/DTR) + audio USB | Aucune | Lectures par événements ; lecteur DATA éteint pour protéger le CAT [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java] |
| iTracMan-FTX1WinController | WPF : commandes, façade asynchrone, connexion sérialisée et transport série | Deux COM virtuels (CAT-1 et CAT-2 pour le PTT) | Local | FIFO, 1.2 s, 40 ms [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatConnection.cs] |
| pokibon3-FTX1Controller | PWA de navigateur avec Web Serial ; DSP dans AudioWorklet/Worker | Web Serial vers l'Enhanced COM ; Standard COM pour la touche/PTT | Contexte sécurisé ; sans authentification (local) | Voir section 3 [pokibon3-FTX1Controller:js/serial.js] |
| git-jcw-FTX-1-WebUI | Interface statique avec Web Serial et enveloppe Electron ; file dans `cat-link.js` | Web Serial | Electron : permissions uniquement pour les pages `file:`, isolation de contexte, sandbox, une seule instance, liens externes vers le navigateur ; **sans pont IPC, sans authentification et sans CSP explicite dans `main.cjs`** | Une commande en vol ; les réglages sont priorisés et regroupés [git-jcw-FTX-1-WebUI:electron/main.cjs] [git-jcw-FTX-1-WebUI:js/cat/cat-link.js] |
| rzochowski-cat-ftx1 | Client Nuxt/Vue, routes API de Nuxt et un serveur Node `serial-server.mjs` sur `127.0.0.1:3001` avec `serialport` ; état par **SSE** (`/events`, sans WebSocket) | HTTP et SSE en loopback ; 8N1 avec bauds configurables | Loopback uniquement mais CORS `*` ; **sans authentification** | File avec timeouts ; requêtes initiales toutes les 40 ms ; rafraîchissement de 150 ms après réglage [rzochowski-cat-ftx1:nuxt.config.ts] [rzochowski-cat-ftx1:serial-server.mjs] [rzochowski-cat-ftx1:server/api/command.post.ts] |
| Semyonic-ftx1-programmer | App TS de navigateur (codec, commandes, transport, stores, UI) | Web Serial | Mode simulation (dry-run) par défaut et écritures bloquées jusqu'à « armer » ; `PS0`, `TX1` et `MX1` exigent l'armement ; sans confirmation par opération ni sauvegarde automatique [Semyonic-ftx1-programmer:src/store/connection.ts] [Semyonic-ftx1-programmer:src/cat/transport.ts] | Écritures et requêtes sérialisées |
| byf3332-Yaesu-FTX1-Cat-Tunnel | **Tunnel** : pont USB série vers TCP brut ; service au premier plan | Serveur TCP sur le port **4532**, écoute sur `0.0.0.0`, **un client à la fois (un nouveau remplace le précédent)** ; sans UDP, WebSocket, COM virtuel ni rigctl | **Aucune** (sans authentification ni chiffrement) | TCP_NODELAY et keepalive ; lecture USB 200 ms, écriture série 2 s, lecture TCP 1 s ; passage transparent des octets [byf3332-Yaesu-FTX1-Cat-Tunnel:app/src/main/java/com/byf3332/cattunnel/CatTcpBridge.kt] [byf3332-Yaesu-FTX1-Cat-Tunnel:app/src/main/java/com/byf3332/cattunnel/CatBridgeService.kt] |
| juanmmmmmmm-Look4Sat-FTX1 | Android ; contrôleur FTX-1 dans `core:data`, un contrôleur USB partagé | USB série | Permission USB à l'exécution | Mutex d'E/S sérialise les transactions ; boucle de 1 s [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/injection/MainContainer.kt] |
| captobie-ftx1-remote | Suite distante avec `rigctld` de Hamlib (Mac/iOS/iPad, Windows, Pi comme relais), flux audio du Pi et relais CW | `rigctld` TCP 4532 ; CW TCP 8534 ; audio Main g./Sub d. | Non évaluée dans les notes | `post_write_delay` de 10 ms [captobie-ftx1-remote:CLAUDE.md] [captobie-ftx1-remote:Pi/README.md] |
| rigplane-rigplane-core | Bibliothèque asynchrone multiradio avec interface web ; backend `yaesu-cat` | USB CAT-1 (sans LAN) | Non évaluée dans les notes | Interrogation par niveaux [rigplane-rigplane-core:rigs/ftx1.toml] |

Notes pour ce projet : le tunnel TCP de BYF et le serveur local de RZO n'ont pas
d'authentification ; toute solution distante propre devrait exiger une
authentification et limiter l'accès au réseau local ou à un tunnel chiffré.

## Résumé par dépôt

| Dossier | Objet | Langage | Licence | Fonctions |
|---|---|---|---|---|
| captobie-ftx1-remote | Suite de contrôle à distance via Hamlib `rigctld` (Mac/iOS/iPad, Windows, Pi) avec errata du manuel CAT | Swift, C#/WinUI3, Python, Arduino | MIT ; les binaires de Hamlib dans `Vendor/` sont LGPL/GPL | Client Hamlib 1051, audio du Pi, relais CW (TCP 8534), liste et balayage de mémoires, catalogue EX, errata vérifiés |
| fritzsche-yaesu-ftx1 | Programmateur de mémoires : envoyer et récupérer des listes de relais | JavaScript (Web Serial et CLI Node) | Sans licence upstream (« en l'état ») ; permission MIT selon le propriétaire, par l'utilisateur | CSV CHIRP et relais.dl3el.de, stratégies MW/AM/CT/CN, téléchargement et vérification, validation de fréquence |
| ew1abz-yaesu-ftx-1-control | TUI et bibliothèque d'accord et de clarifier | Rust (`ftx1` et `ftx1-ctl`) | Sans licence upstream ; permission MIT selon l'utilisateur | `ID`/`FA`/`IF`/`OI`/`CF`, radio simulée, 38400, mémoires TOML |
| ew1abz-yaesu-ftx-1-memory-manipulator | Sauvegarde et restauration de mémoires par CSV (`ftx1-mm`) | Rust et Python | MIT (uniquement dans `Cargo.toml`) | Lecture MR/MT/CN/MZ, écriture MW+AM, convertisseur CHIRP, renumérotation, différences CAT 2507-B et 2508-C |
| gnfrazier-ftxcat | Module Python de contrôle CAT (expérimental) | Python (pyserial) | MIT | Environ 45 fonctions (fréquence, mode, PTT, puissance, AGC, mesures, VFO/mémoire, clarifier, CW, NB/DNR/DNF), guide d'installation USB/CAT, notes WSL2 |
| bg7nzl-ftx1ctl | Console graphique avec mesures, cascade audio, notch manuel et serveur NET rigctl | Python | Sans licence upstream ; permission MIT selon l'utilisateur | CAT + PTT par RTS, conversion des mesures RM, notch BP, préampli PA, puissance PC, rigctl TCP 4532 pour WSJT-X/JTDX |
| rigplane-rigplane-core | Bibliothèque multiradio asynchrone avec interface web ; FTX-1 par `yaesu-cat` | Python et Svelte/TS | MIT | Profil `rigs/ftx1.toml`, audit CAT face au manuel (89 familles), guide USB, sémantique MAIN/SUB |
| evertonma-FTX-1CAT_PR2EM | Outil de bureau de contrôle, mémoires et menu | Python (Tkinter, pyserial) | PolyForm Noncommercial 1.0.0 (non compatible avec la GPL ; référence uniquement) | Contrôles rapides, éditeur de mémoires avec CSV, éditeur de menu EX avec sauvegarde JSON, simulateur et tests |
| evertonma-FTX-1CAT_PR2EM_Android | Version Android : contrôle CAT de base | Kotlin | PolyForm Noncommercial 1.0.0 | Fréquence, mode, bande, 4 curseurs, éditeur EX, sélecteur de port USB |
| Eugen68-Yaesu-FTX1-CAT-Control | Suite Android de CAT, CW, RTTY et journal | Java, ONNX et bibliothèque native | MIT | Décodeur CW par IA, RTTY, journal ADIF, cluster, PSK Reporter, audio USB, mémoires de CW et de voix |
| iTracMan-FTX1WinController | Contrôleur pour Windows | C# / WPF | MIT | Panneau de fonctions complet, mesures, messages, presets, audio local, double COM, tests xUnit |
| pokibon3-FTX1Controller | PWA de navigateur avec Web Serial | JavaScript (WASM pour CW et FT8) | Sans licence upstream ; permission MIT selon l'utilisateur ; `js/cwdec/` est GPL | Audio USB, cascade, décodeur et manipulation de CW, FT8/FT4, menus FUNC/EX, mémoires, PWA hors ligne, profil FT-991A |
| git-jcw-FTX-1-WebUI | Interface Web Serial et application Electron | JavaScript | MIT | Cascade dérivée de l'audio, 4 mesures, logique du coupleur, mémoire de bandes, puissance bornée, radio simulée |
| rzochowski-cat-ftx1 | Panneau web local | Nuxt/Vue (TypeScript) et Node serialport | Sans licence upstream ; permission MIT selon l'utilisateur | État par SSE, contrôles du scope, presets, commande CAT manuelle, serveur en loopback (CORS `*`, sans authentification) |
| Semyonic-ftx1-programmer | Programmateur de mémoires et de menu dans le navigateur | TypeScript (prototypes JSX) | GPL-3.0 | Édition de mémoires et EX, import CSV/ADMS-14/FT5D, simulation et armement, console de débogage |
| byf3332-Yaesu-FTX1-Cat-Tunnel | Pont Android USB série vers TCP | Kotlin | WTFPL 2 | Tunnel TCP brut 4532 sans authentification, filtre 10C4:EA70 |
| juanmmmmmmm-Look4Sat-FTX1 | Suivi de satellites avec contrôle Doppler du FTX-1 | Kotlin (Android) | GPL-3.0 | Doppler MAIN/SUB à 1 s, CTCSS, détection d'accord manuel, sans PTT par logiciel |
| Evgeny161rus-ftx1-region-tool | Lit et écrit l'EEPROM et change le code de région par CAT | Python | Sans licence upstream ; permission MIT selon l'utilisateur | Commandes de service non documentées, vidage d'EEPROM, sauvegarde automatique, interface RU/EN. **ESCRIBE EN LA RADIO** **REGION/LIMITES TX** |
| Reid-n0rc-FTX-1_Firmware | Projet d'analyse de firmware | Markdown, Java (Ghidra), Python, shell | Sans licence upstream ; permission MIT selon l'utilisateur ; le firmware reste la propriété de Yaesu | Tableau de tâches T01-T11 sans constatations, scripts Ghidra. **FIRMWARE** |
| sq9pd-Yaesu-FTX-1-mod | Patcheur hors ligne de firmware MAIN 01-13 / DISPLAY 01-10 | Python et JavaScript | Sans licence upstream ; permission MIT selon l'utilisateur | Pages de boutons, SWR SCAN, patch avec vérification d'empreinte. **FIRMWARE** |
| radiohyperactivity-ftx1-front-cover | Façade protectrice artisanale pour FTX-1 Field | CAO (FreeCAD, STL, SVG) | GPL-3.0 | Gabarits de mousse PE, boîtiers imprimables de 20 à 40 mm |
| hatandspecs-ftx1-tuner-sweep | Balayage de VFO qui déclenche un coupleur externe | Python (Flask) et HTML | MIT | FA/AC/RI/PC/MD, bandes selon la licence, marge de 1 kHz, attente fixe. **ÉMET** |

Les licences de la colonne Licence proviennent de `third_party/ftx1/SOURCES.md`.
La permission MIT « selon l'utilisateur » n'est pas écrite dans ce dépôt
[SOURCES.md]. Le code PolyForm Noncommercial (evertonma) n'est conservé que comme
référence et n'est pas copié dans ce projet GPL-3.0 [SOURCES.md].

## Comparatif avec Bricohams

Ce qui existe vient des notes de ce projet : l'outil web/bureau
(`ftx1.html`, `ftx1-core.js`, `ftx1-menu.js`, `ftx1-ui.js`) par Web Serial et
RadiCodex sur Android (`RigActivity`, `YaesuFtx1` et `Ftx1Rig` dans
`RigProtocols.kt`). Toute écriture est contrôlée en plage avant l'envoi et
vérifiée par relecture. Règles de ce travail : uniquement réception et VFO ; rien
n'active l'émetteur.

Valeurs de « État dans cette branche » : « Existait déjà », « Ajouté » (fonctions
planifiées) ou « Hors périmètre (motif) ».

| Fonction | Dépôts qui l'ont | Web/bureau | Android | État dans cette branche |
|---|---|---|---|---|
| Se connecter et s'identifier (`ID;` = `ID0840;`, `AI0;`) | Presque tous | Oui | Oui | Existait déjà |
| Lire la fréquence VFO A/B | Presque tous | Oui (`FA;`/`FB;`) | Oui | Existait déjà |
| Régler la fréquence VFO A/B avec vérification | Presque tous | API seulement, sans contrôle dans l'interface | Oui | Ajouté (panneau VFO sur le web) ; sur Android existait déjà |
| Mode MAIN (`MD0 m;`) | Presque tous | Non | Oui | Ajouté (web, avec relecture) ; sur Android existait déjà |
| Split `ST0`/`ST1` | ITM, Look4Sat, SEM, rigplane | Non | Oui (suivi par satellite) | Ajouté (web) ; sur Android existait déjà |
| Lire et écrire les mémoires 1-999 | fritzsche, ew1abz-memory, PR2EM, SEM, POK | Oui | Oui (une à une) | Existait déjà |
| Sauvegarde/restauration JSON et CSV de mémoires | ew1abz-memory, fritzsche, PR2EM, SEM | Oui | Non | Existait déjà (web). Android : hors périmètre (non planifié dans cette branche) |
| Menu EX : lire, écrire, sauvegarde et différences | PR2EM, SEM, POK, captobie, RZO | Oui (éléments en lecture seule refusés) | Non | Existait déjà (web). Android : hors périmètre (non planifié dans cette branche) |
| AF, RF, SQL, largeur, IF shift, AGC, préampli, atténuateur et puissance (web) | gnfrazier, rigplane, WebUI, ITM, bg7nzl | Oui, avec relecture | - | Existait déjà |
| AF, RF, SQL, largeur, IF shift, AGC, préampli, atténuateur et puissance (Android) | Les mêmes | - | Existent dans `Ftx1Rig` mais sans écran | Ajouté (connexion dans `RigActivity`) |
| Mesures `RM1`-`RM8` (web) | WebUI, bg7nzl, PR2EM, ITM, rigplane | Oui, chaque seconde | - | Existait déjà |
| Mesures `RM1`-`RM8` (Android) | Les mêmes | - | Seulement S-mètre MAIN | Ajouté (dans `RigActivity` ; `supportsMeter` et `supportsRfPower` pour `Ftx1Rig`) |
| Noise blanker `NL` (OFF/001-010) | gnfrazier, PR2EM, WebUI | Non | Non | Ajouté (web et Android) |
| DNR `RL` (OFF/01-10) | gnfrazier, PR2EM, EUG, ITM | Non | Non | Ajouté (web et Android) |
| Notch automatique `BC` OFF/ON | WebUI, ITM, rigplane | Non | Non | Ajouté (web et Android) |
| Notch manuel `BP` (état P2=0 ; fréquence 001-320 x10 Hz avec P2=1 ; en FM la réponse non numérique est null) | bg7nzl, WebUI, ITM, rigplane | Non | Non | Ajouté (web et Android) |
| Narrow `NA` OFF/ON | gnfrazier, WebUI, SEM | Non | Non | Ajouté (web et Android) |
| Clarifier `CF` (on/off et décalage -9999..+9999 Hz) | gnfrazier, ew1abz-control, ITM | Non | Non | Ajouté (web et Android) |
| Vitesse de CW `KS` (4-60 WPM) | gnfrazier, WebUI, ITM, EUG | Non | Non | Ajouté (web et Android) |
| Verrouillage du panneau `LK` OFF/ON | gnfrazier, SEM, RZO, POK | Non | Non | Ajouté (web et Android) |
| Mémoires split `MZ` | ew1abz-memory, SEM | Non | Oui | Existait déjà (Android). Web : hors périmètre (non planifié dans cette branche) |
| PMS, bande des 5 MHz, EMGCH | ew1abz-memory, SEM | Non | Non | Hors périmètre (non planifié dans cette branche) |
| Effacer un canal mémoire | aucun (sans commande documentée) | Non | Non | Hors périmètre (aucune commande documentée) |
| PTT (`TX`/`MX`), manipulation de CW (`KY`, `PB`, relais CW) | bg7nzl, gnfrazier, EUG, captobie, ITM | Non | Test de PTT de 3 s existant | Hors périmètre (active l'émetteur) |
| Démarrage du coupleur (`AC` P3=3) et balayage du coupleur | WebUI, ITM, hatandspecs | Non | Non | Hors périmètre (active l'émetteur) |
| Changement de bande `BS`/`BU`/`BD` et échange `AB`/`BA`/`SV` | PR2EM, ITM, WebUI, SEM, POK | Non | Non | Hors périmètre (réglage seul, non vérifiable) |
| `SPR`/`SPW` (EEPROM de service) | Evgeny161rus-ftx1-region-tool | Non | Non | Hors périmètre (écrit l'EEPROM de service) |
| Changement de région et de limites de TX | Evgeny161rus-ftx1-region-tool | Non | Non | Hors périmètre (change les bandes de TX, légal et garantie) |
| Calibration | aucun (seulement reset/calibration dans le menu EX) | Non | Non | Hors périmètre (risque de perte de calibration) |
| Chargement de firmware ou de patchs | sq9pd, Reid-n0rc | Non | Non | Hors périmètre (peut rendre la radio inutilisable) |
| Doppler de satellites | Look4Sat-FTX1 | Non | Suivi par `RigTracker` (FA, FB, ST) | Existait déjà (Android). Web : hors périmètre (non planifié dans cette branche) |
| Scope, cascade et audio USB | WebUI, POK, ITM, RZO | Non | Non | Hors périmètre (non planifié dans cette branche) |
| Décodeurs (CW, RTTY, FT8) et journal | EUG, POK | Non | Module numérique FT8/FT4 à part | Hors périmètre (non planifié dans cette branche) |
| Tunnel TCP/rigctl et accès à distance | BYF, bg7nzl, captobie, RZO | Non | Non | Hors périmètre (non planifié dans cette branche ; sans authentification dans les références) |
| Horloge `DT`, affichage `DA`, mémoires de voix `LM`/`PB` et de manipulateur `KM` | SEM, ITM, EUG | Non | Non | Hors périmètre (**ESCRIBE EN LA RADIO** sans nécessité pour la réception/VFO) |

Résumé des fonctions planifiées : elles ne concernent que la réception et le VFO,
chaque écriture est contrôlée en plage avant l'envoi et vérifiée par relecture, et
rien n'active l'émetteur. Sur le web : `NL`, `RL`, `BC`, `BP`, `NA`, `CF`, `KS`, `LK`
(P1 : 0 = MAIN, 1 = SUB), le panneau VFO (fréquence A/B avec l'API existante, mode
MAIN avec `MD0 m;` et relecture) et le split `ST0`/`ST1`. Sur Android : connecter à
`RigActivity` les réglages de `Ftx1Rig` (AF, RF, SQL, largeur, IF shift, AGC,
préampli, atténuateur et puissance) et les mesures `RM1`-`RM8`, et renseigner
`supportsMeter` et `supportsRfPower` pour `Ftx1Rig`. Exclu à dessein :
PTT/KY/manipulation de CW, démarrage du coupleur, `BU`/`BD`/`SV`/`AB`/`BA`,
`SPR`/`SPW`, changements de région ou de limites de TX, calibration et chargement
de firmware.
