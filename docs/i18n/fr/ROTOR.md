# Rotor AZ/EL Bricohams depuis l'application Android

Intègre l'application Android au rotor du projet frère
[Brico-Hams/antenaSatCommrotor](https://github.com/Brico-Hams/antenaSatCommrotor)
(ESP32 + deux moteurs pas à pas + fins de course). Ensemble, ils forment la
station satellite Bricohams complète :

```
 Satélites (SGP4, TLE, pases) ──► Rotor AZ/EL (ESP32, SGP4 propio) ──► antena
          │                         ▲  Wi-Fi 192.168.4.1 o BLE seguro
          └──► CAT USB (Doppler) ───┼──► radio Quansheng con firmware Bricohams
                                    └── móvil: hora UTC, ubicación, norte (brújula), nivel
```

Le mobile joue le rôle de **GPS, d'horloge, de boussole et d'inclinomètre** du rotor, de sorte que la
station n'a pas besoin de ces modules. Le rotor suit le passage avec son propre SGP4 et
ses limiteurs de sécurité ; l'application le prépare, l'arme et le surveille pendant que CAT
corrige le Doppler de la radio en parallèle.

## Prérequis

- Rotor avec le firmware d'antenaSatCommrotor `0.3.0-prototype` ou ultérieur
  (API 2, intègre la modification de [hardware/rotor](../../../hardware/rotor/README.md))
  pour utiliser l'heure du mobile. Avec un firmware plus ancien (API 1), l'application fonctionne,
  mais l'heure UTC doit provenir du GNSS du rotor.
- Jeton de contrôle configuré par USB sur le rotor (24-128 caractères) et, pour
  le BLE, le code PIN à 6 chiffres du rotor.
- Position configurée dans Satellites › Réglages (ou celle du passage sélectionné).

## Déroulement d'utilisation

1. Dans **Satellites**, ouvre un passage et appuie sur **Rotor AZ/EL : préparer et suivre ce
   passage**. L'écran calcule la trajectoire (300 points) et la compare à la
   mécanique du rotor.
2. Choisis **Wi-Fi du rotor** (connecte-toi d'abord à son réseau ; l'application force le trafic
   par le Wi-Fi même sans internet) ou **Bluetooth sécurisé** (appaire avec le
   PIN la première fois). Saisis le jeton et appuie sur **Connecter**.
3. **Homing** : cherche les fins de course d'AZ et d'EL. Après le homing, l'antenne
   reste à EL 0° pointée vers la **coupure de câble** (AZ mécanique -180°).
4. Avant de calibrer, l'application indique **vers quel cap vrai placer la coupure de
   câble** pour que le passage ne la franchisse pas (moitié de l'arc de ciel que le passage ne
   visite pas). Tourne le trépied vers ce cap.
5. **Calibrer le nord et le niveau avec le mobile** : pose le mobile à plat sur le boom,
   le haut vers les éléments. L'application utilise le vecteur de rotation,
   corrige la déclinaison magnétique avec le modèle WMM d'Android et fait la moyenne des
   dernières mesures ; elle vérifie aussi que le mobile est de niveau (±1°). Tu peux
   saisir l'azimut à la main s'il n'y a pas de boussole ou s'il y a des métaux à proximité.
6. **Préparer le passage** : envoie l'heure UTC et la position, charge le TLE (uniquement ce
   satellite, id 0), le sélectionne et amène l'antenne au point d'AOS.
7. **Suivre automatiquement dès l'AOS** : l'application garde l'écran allumé et,
   à partir de 1 s avant l'AOS, demande `/api/track` toutes les 2 s. Si le rotor répond que
   l'antenne est à plus de 15° (acquisition), elle la repointe là où sera le satellite
   et réessaie. Elle se désarme au LOS ou si le rotor passe en défaut.
8. Ouvre **CAT** sur le même passage pour le Doppler de la radio : les deux fonctionnent
   en même temps.

**ARRÊT moteurs** est toujours en haut et désarme le suivi automatique.

## Avertissements du plan

- **Câble** : le firmware s'arrête si l'azimut mécanique franchissait ±180°. Avec le
  rotor calibré, l'application avertit et propose le nouveau cap de la coupure.
- **Vitesse** : si le passage exige plus de °/s que le profil du moteur, le rotor
  s'arrête près du maximum. Le profil `esp32_nema17` du firmware passe de 2,25 à
  ~5,9°/s.
- **Zénith** : au-dessus de 89°, le firmware arrête le suivi.
- Le pourcentage du passage qui peut être suivi sans arrêts est affiché.

## Sécurité

- Garde à portée de main le bouton d'arrêt d'urgence physique : l'application ne le remplace pas.
- Avec le BLE, si la liaison tombe alors que le rotor est en mouvement, le firmware passe en
  **défaut** volontairement ; il faut **Effacer le défaut**, répéter le homing et calibrer.
- L'heure envoyée par l'application est valable **10 minutes** ; tant que l'écran du rotor
  est ouvert, l'application la renvoie toutes les 60 s. Si le rotor a un GNSS valide, celui-ci
  est prioritaire.
- Il n'y a qu'un seul maître du mouvement : si un autre client (web, BLE) contrôle le rotor,
  l'application reçoit 409 et l'affiche.

## Détails techniques

| Élément | Fichier |
| --- | --- |
| Protocole (JSON HTTP/BLE, trames de 20 octets, TLE 3LE) | `android/.../RotorProtocol.kt` |
| Client typé et transport HTTP lié au Wi-Fi | `RotorClient.kt` |
| Transport BLE avec appairage chiffré (MITM) | `RotorBle.kt` |
| Plan de câble, vitesse, zénith et coupure suggérée | `RotorPlanner.kt` |
| Boussole + niveau avec déclinaison | `RotorCompass.kt` |
| Écran | `RotorActivity.kt` |

- HTTP en clair uniquement vers `192.168.4.1` (`network_security_config.xml`) ;
  le reste de l'application continue d'exiger HTTPS. Chaque requête porte `X-Control-Token`.
- Nouvelles permissions : `ACCESS_NETWORK_STATE`, `BLUETOOTH_SCAN` (sans localisation),
  `BLUETOOTH_CONNECT` et, jusqu'à Android 11, `BLUETOOTH`/`BLUETOOTH_ADMIN` et
  la localisation pour scanner.

## Validation

- Tests hôte (Robolectric) : `RotorTest` (trames, réassemblage et priorité du
  STOP, limites, TLE, états API 1/2, client, planificateur) et
  `RotorActivityTest` (connexion avec transport simulé, préparer le passage, arrêter,
  erreurs) et le bouton depuis `SatelliteActivityTest`.
- Firmware `0.3.0-prototype` : `esp32` et `esp32_nema17` compilent avec PlatformIO.
- **En attente** : test avec un rotor physique, un Wi-Fi et un BLE réels et une boussole de mobile
  réelle.

## Rotor distant

- La console distante (`remote.html`, aussi dans `RemoteShackActivity` et `RemoteStationActivity`) affiche le panneau du rotor : lire, aller à AZ/EL, parquer et arrêter, via `/api/rotor`.
- Un seul client contrôle le rotor à la fois (bail de 3 s renouvelé chaque 1 s) ; les autres reçoivent `rotor_busy`. L'arrêt est disponible pour tout client authentifié.
- Fermer la page, perdre la connexion ou l'expiration du bail arrête le rotor. Chaque mouvement est limité à 30 s.
- Le mouvement est désactivé par défaut (`motion` dans la configuration du rotor) ; sans lui le rotor est en lecture seule.
- Avertissement : ne jamais émettre sans charge ou antenne adaptée.
- Suivi de satellite : dans le planificateur, « Exporter le passage pour le rotor (.json) » produit `radicodex-pass-track` (échantillons `t`/`az`/`el`, indépendants du Doppler). La console l'importe et ne bouge qu'après l'appui sur le bouton de suivi.
- Vitesse et fins de course : pendiente de fuente (désactivés).
- Prise en charge : Hamlib `rotctld` avec les modèles du catalogue (`data/remote-station-catalog.json`) et le protocole BLE/AP Bricohams sur Android. GS-232A/B et SPID ROT2PROG : uniquement dans l'agent de station via `--rotor-serial` (trames Hamlib, sans validation matérielle) ; le rotor BLE/AP ne change pas.
