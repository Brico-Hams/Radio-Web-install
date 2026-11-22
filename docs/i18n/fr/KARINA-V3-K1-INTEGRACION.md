# Revue de karina-v3-k1 et intégration dans BricoHams (UV-5K V3)

## Revue upstream enregistrée

| Champ | Valeur |
|---|---|
| Dépôt | https://github.com/autumn1rain/karina-v3-k1 |
| Révision (HEAD) | `0f5dbcba599b3598e6d415352ef9fd234d2d2a79` (dernier push 2026-11-04) |
| Licence | Apache-2.0 |
| Releases | `v2026.11.02` (karina-v3/k1 `.bin` et `.packed.bin`, `calibration.bin` ; « fix button lock fn1 fn2 by keyboard lock F ») et `v2026.10.30` |
| Base déclarée | fagci uv-k5 mod v1.2.1 |
| Contenu | Uniquement le README (5 langues), le manuel PDF, la LICENSE et le site de documentation. **Il n'y a pas de code source du firmware.** |

## Méthode et licences

Upstream ne publie pas de sources, donc aucun binaire n'est copié ni décompilé.
Les fonctions portées sont une réimplémentation indépendante (clean-room) à partir du
comportement décrit dans le manuel public, sur la base F4HWN déjà figée dans BricoHams.
Le nouveau code est GPL-3.0-or-later (BricoHams) ; les mentions Apache-2.0 de la base sont conservées.
autumn1rain/karina-v3-k1 (Apache-2.0) est crédité comme origine des idées fonctionnelles.
Les firmwares restent marqués `derivedFromKarina:false`.

## Inventaire

| Fonction Karina | État dans BricoHams | Motif |
|---|---|---|
| Listes de scan, scan CTCSS/DCS | Existe | F4HWN `SCAN_SUBAUDIBLE`, listes de scan |
| Roger, scrambler, AFC, AM fix, LNA, rx_filt, STE | Existe | Présents dans la base |
| Verrouillage du clavier et FN1/FN2 latérales (fix v2026.11.02) | Existe | `set_lck` / `SET_LCK_ACTIONS` |
| Spectre avec presets, blacklist, capture RX | Existe | Module spectrum |
| **Presets de bande intégrés** | **Porté** (spectrum, touche 2) | 11 fenêtres RX dans 136–174 / 400–470 MHz |
| **Loot (liste de captures)** | **Porté** (spectrum, touches 1/7 en capture) | 32 entrées, sans âge ; RX uniquement |
| Auto-beacons F+1/2/3, table DCS→dBm, PTT-Holder, randomizer | Incompatible | TX : entre en conflit avec les limites RF ; ARDF/Satellite/Spectrum désactivent le beacon |
| Tx3k, DEV, 03t, c0db, registres SCR, F_Corr/PWR | Incompatible | Ils écrivent la calibration ou des registres RF |
| Presets de configuration 0/1/2, Sql2, carte FN1/FN2 | Incompatible | Ils modifient la disposition de la mémoire/configuration précédente |
| Presets CB, 10 m, 7 m, 6 m, Air, Sat 240, Riv 300, LoRa, GSM, 23 cm | Incompatible | Hors de la garde RX du module |
| Pas de 25/100 kHz dans le spectre | Incompatible | Le module accepte 1,25/2,5/6,25/12,5 kHz et 128 bins |
| Turbo, ECO, Mult, squelch hybride, volume dynamique, modem, tonalité AM | Non porté | Pas de marge flash/RAM (spectrum : 1364 B libres) ou algorithme non documenté |
| Builds Karina K1/V1, bootloader propre | Hors périmètre | Matériel/bootloader différent |

Les fenêtres de bande utilisent 128 bins à 12,5 kHz (6,25 kHz en PMR), et non les 80–160 pas à
25 kHz de Karina.

## Tests

Logiciel (exécutés) : `bands_loot_test`, `spectrum_adapter_test` (cycle de 11 bandes, limites RF,
loot avec dédoublonnage, défilement et blacklist), `presets_test`, `spectrum_test` avec `-Wall -Wextra -Wconversion -Werror` ;
`node --test tests/bricohams-build.test.cjs` (15/15) ; compilation ARM GCC 13.3.1 de la variante spectrum.

Build spectrum : image 119 468 B (slot 120 832 B, 1 364 B libres), RAM 13 600 B (2 784 B libres).
Calibration, limites RF et vecteurs inchangés ; aucune nouvelle écriture persistante.

En attente sur le matériel (UV-5K V3) : démarrage, LCD/touches, comportement réel des bandes et du loot.
Les variantes fusion, labs, ardf et satellite n'incluent pas ces sources et n'ont pas été recompilées.

## Compilation reproductible Spectrum (2026-11-04)

Deux compilations indépendantes avec `--preset FieldOps --module spectrum --option ENABLE_FEAT_F4HWN_BEACON=OFF` (ARM GCC 13.3.1, base F4HWN v6.1.0 `f556a96`, sources Fusion61 locales non publiées) ont produit un `bricohams.fieldops.spectrum.v6.1.0.bin` identique :
120 284 B (slot 120 832 B, 548 B libres), SHA-256 `CF5E8C52B9599D4CF68D1F003991D758A92B2FFD6BB4E30DFC090333261A8145`. Le `.elf` et `build-info.json` coïncident également.
11/11 tests hôte du firmware réussis. **Le binaire n'est pas dans le catalogue signé** : il n'y a ni test physique sur UV-5K V3 ni signature CI. Publié le 2026-11-05 uniquement comme pré-release non signée (`fw-spectrum-presets-v6.1.0`).

Étapes en attente sur radio réelle (sans flasher à l'aveugle) : 1) copie complète de la radio avec le flux F4HWN de Web Install et vérification de son CRC ; 2) charger l'image uniquement avec un bootloader/Multiboot qui accepte le slot et avec un câble de récupération ; 3) vérifier le démarrage, LCD/touches, la touche 2 (11 bandes, RX uniquement) et les touches 1/7 en capture (Loot) ; 4) restaurer la copie et confirmer l'identification F4HWN et la sauvegarde automatique avec une trame UART bruitée.
