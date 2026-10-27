# Premiers pas avec les satellites

Auteurs : Anatol Emilio Lopez Maitchovcow EA5KAO, Diego Roca EA5JEF et Pedro
Roca, fondateurs et membres du conseil d’administration de Bricohams.
Informations : <https://bricohams.org> et <https://bricohams.com>.

Guide d’initiation en espagnol associé à l’image de firmware
**BH Satélite** (Bricohams Satélites) pour Quansheng UV-K5 V3/K1. La section
sur les antennes a sa propre page : [Antennes pour satellites](ANTENAS-SATELITE.md).

## Origine et crédits

Ce guide s’inspire de la lecture de *Radioamadores no Espaço — Guia básico para
operar satélites*, de Carlos Vicente PT2VM, version 1.1 du 04/09/2025, en
portugais. Son auteur autorise la distribution gratuite à but non lucratif,
mais n’autorise pas expressément les traductions ni les œuvres dérivées. Il
comprend également des conceptions d’antennes de PY4ZBZ et PY5LO, dont
l’autorisation a été accordée à PT2VM.

C’est pourquoi ce document **n’est pas une traduction littérale et ne reproduit
pas ses images**. Il suit un parcours thématique similaire, avec un texte, des
schémas et des antennes propres à Bricohams, adaptés à l’Espagne et à l’UV-K5
avec BH Satélite. Nous recommandons la lecture de l’original de PT2VM.

Si son auteur autorise la traduction, nous la publierons séparément avec son attribution.

## Sommaire

1. [Qu’est-ce qu’un satellite radioamateur](#que-es-un-satelite-de-radioaficionado)
2. [Qui peut écouter et qui peut émettre](#quien-puede-escuchar-y-quien-puede-transmitir)
3. [Notions sur le passage](#conceptos-del-pase)
4. [Heure UTC, locator et coordonnées](#hora-utc-localizador-y-coordenadas)
5. [Prévoir les passages et savoir si le satellite est actif](#predecir-pases-y-saber-si-el-satelite-esta-activo)
6. [Effet Doppler](#efecto-doppler)
7. [Satellites FM pour débuter](#satelites-fm-para-empezar)
8. [Équipement de la station](#equipo-de-la-estacion)
9. [Utiliser BH Satélite sur l’UV-K5](#operar-con-bh-satelite-en-la-uv-k5)
10. [Comment établir un QSO par satellite](#como-hacer-un-qso-por-satelite)
11. [Enregistrer et confirmer les contacts](#registrar-y-confirmar-contactos)
12. [SSTV et APRS depuis l’ISS](#sstv-y-aprs-desde-la-iss)
13. [Liste de contrôle du passage](#lista-de-comprobacion-del-pase)
14. [Glossaire](#glosario)
15. [Références](#referencias)

## Qu’est-ce qu’un satellite radioamateur

Un satellite radioamateur est une station radio en orbite qui reçoit sur une
fréquence, la **montée** ou *uplink*, et retransmet sur une autre, la
**descente** ou *downlink*. Beaucoup sont désignés OSCAR, sigle de
*Orbiting Satellite Carrying Amateur Radio*, suivi d’un numéro de série, comme
SO-50 ou AO-7.

Selon leur fonctionnement, on distingue trois grands types :

- **Répéteurs FM.** Ils fonctionnent comme un relais de montagne, mais à des
centaines de kilomètres d’altitude. Un seul QSO peut avoir lieu à la fois et
c’est le meilleur point de départ avec un portable.
- **Transpondeurs linéaires.** Ils retransmettent une portion complète de bande,
de dizaines de kHz, et acceptent plusieurs QSO simultanés en SSB ou CW. Ils
nécessitent généralement des équipements full duplex et la SSB en émission.
- **Numériques et balises.** Ils comprennent APRS, la télémétrie et la SSTV.
Beaucoup peuvent être reçus avec un équipement simple.

Presque tous les satellites que nous utiliserons sont en **orbite basse (LEO)**,
entre 400 et 1000 km. Ils font le tour de la Terre en environ 90-100 minutes et
chaque passage au-dessus de notre station dure entre 5 et 15 minutes. La
Station spatiale internationale (ISS), à environ 400 km, est le satellite habité
le plus connu des radioamateurs.

## Qui peut écouter et qui peut émettre

- **Écouter** les satellites radioamateurs est à la portée de tous ceux qui
possèdent un récepteur adapté.
- **Émettre** exige une autorisation radioamateur en vigueur. Opérez dans les
bandes, modes et puissances autorisés par le règlement applicable publié au BOE.
- Les segments satellites de la Région 1 de l’IARU sont
**145,800-146,000 MHz** et **435,000-438,000 MHz**. N’y transmettez pas de
conversations terrestres.
- Les **satellites militaires UHF**, comme FleetSatCom ou UHF Follow-On, ne sont
pas des satellites radioamateurs. Leur utilisation est illégale et poursuivie.
L’UV-K5 ne doit pas être utilisé à cette fin.

## Notions sur le passage

![Géométrie d’un passage satellite](../../atlas/sat-pase-orbital.svg)

| Terme | Signification |
| --- | --- |
| AOS | *Acquisition of Signal* : le satellite apparaît à l’horizon |
| TCA | *Time of Closest Approach* : élévation maximale et distance minimale |
| LOS | *Loss of Signal* : le satellite disparaît à l’horizon |
| Azimut | Direction horizontale en degrés : 0 nord, 90 est, 180 sud, 270 ouest |
| Élévation | Angle au-dessus de l’horizon, de 0 à 90 degrés |
| Empreinte | Zone de la Terre visible par le satellite à un moment donné |
| TLE / Keps | Paramètres orbitaux utilisés par les programmes pour calculer les passages |

Deux stations peuvent communiquer si elles se trouvent toutes deux dans
l’empreinte au même moment. Avec un satellite LEO, la portée typique atteint
environ 4000-5000 km. Depuis l’Espagne, il est possible de contacter une grande
partie de l’Europe et le nord de l’Afrique.

Les passages dont l’élévation maximale est inférieure à 15-20 degrés sont courts
et faibles ; les bâtiments ou les montagnes les masquent. Pour débuter, choisissez
des passages dépassant 30 degrés.

## Heure UTC, locator et coordonnées

- **UTC.** Les prévisions, annonces d’activité et journaux utilisent l’heure UTC.
En Espagne péninsulaire, l’heure UTC correspond à l’heure locale moins 1 h en
hiver et moins 2 h en été.
- **Locator Maidenhead.** Code de quatre caractères, comme IM97 dans la région
de Murcie, qui identifie votre carré. Lors des QSO par satellite, on échange
l’indicatif et le carré ; de nombreux diplômes comptabilisent les carrés.
- **Coordonnées.** Configurez précisément latitude, longitude et altitude dans
le prédicteur. Une erreur de quelques kilomètres peut décaler le passage de
dizaines de secondes.

## Prévoir les passages et savoir si le satellite est actif

Les programmes de prévision utilisent les TLE, publiés et mis à jour en
permanence. Utilisez toujours les TLE des derniers jours.

| Outil | Plateforme | Notes |
| --- | --- | --- |
| App Android Bricohams | Android | SGP4 natif et CAT RX vers BH Satélite ; voir [Android](ANDROID.md) |
| Gpredict | Windows, Linux et macOS | Libre, avec contrôle du rotor et de la radio |
| Orbitron | Windows | Gratuit et classique, avec prévision et Doppler |
| ISS Detector | Android | Simple ; les satellites radioamateurs nécessitent une extension |
| Heavens-Above / N2YO | Web | Passages visibles et ISS |
| AMSAT Pass Predictions | Web | Passages de satellites radioamateurs |

Le fait qu’un satellite soit en orbite ne signifie pas que son transpondeur
fonctionne. Avant le passage :

- Consultez la page d’état d’AMSAT, où les opérateurs indiquent ce qu’ils entendent.
- Vérifiez les annonces du satellite : certains ne sont activés qu’à certaines
heures ou au-dessus de certaines régions.
- Consultez les enregistrements récents des stations automatiques sur SatNOGS.

## Effet Doppler

![Décalage Doppler au cours d’un passage](../../atlas/sat-doppler.svg)

Un satellite LEO se déplace à environ 7,5 km/s. Lorsqu’il s’approche, nous
entendons son signal au-dessus de la fréquence nominale ; lorsqu’il s’éloigne,
en dessous. Le décalage vaut approximativement :

```text
desplazamiento = frecuencia x velocidad radial / velocidad de la luz
```

| Bande | Fréquence | Doppler maximal approximatif à 7 km/s |
| --- | --- | --- |
| 2 m | 145,8 MHz | ± 3,4 kHz |
| 70 cm | 436,8 MHz | ± 10,2 kHz |

Conséquences pratiques :

- En FM, la descente 70 cm sort du filtre si elle n’est pas corrigée. Celle de
2 m est généralement tolérée sans correction.
- Corrigez surtout la fréquence la plus élevée. Pour les satellites FM, on
règle généralement la descente UHF par pas de 5 kHz.
- La variation est plus rapide près du TCA, surtout lors des passages hauts.
- Avec des mémoires échelonnées, on passe de la fréquence la plus haute à la
plus basse au fil du passage. BH Satélite permet aussi de corriger manuellement
ou par CAT en réception ; voir ci-dessous.

## Satellites FM pour débuter

> Les fréquences et l’état des satellites changent. Consultez AMSAT avant de
> programmer et n’émettez pas vers un satellite inactif ou en mode de test.

| Satellite | Montée (TX) | Descente (RX) | Tonalité | Notes |
| --- | --- | --- | --- | --- |
| SO-50 | 145,850 MHz | 436,795 MHz | 67,0 Hz | 74,4 Hz arme son temporisateur ; très fréquenté |
| ISS, répéteur croisé | 145,990 MHz | 437,800 MHz | 67,0 Hz | Actif par intermittence |
| ISS, voix ARISS en Région 1 | 145,200 MHz | 145,800 MHz | — | Contacts avec les écoles : écoute uniquement |
| ISS, APRS | 145,825 MHz | 145,825 MHz | — | Digipeater packet à 1200 bps |
| PO-101 | 437,500 MHz | 145,900 MHz | 141,3 Hz | Activations programmées |

![Plan de mémoires échelonnées, exemple SO-50](../../atlas/sat-memorias-fm.svg)

## Équipement de la station

![Station portable avec BH Satélite](../../atlas/sat-estacion-bh.svg)

- **Radio.** L’UV-K5 est semi-duplex : elle ne reçoit pas pendant l’émission,
vous ne pouvez donc pas entendre votre propre écho dans le satellite. Avec deux
radios, une pour émettre et une pour recevoir, vous entendrez votre signal en
temps réel. C’est la meilleure façon de savoir si vous passez.
- **Antenne.** C’est la partie la plus importante. Consultez
[Antennes pour satellites](ANTENAS-SATELITE.md) : une Yagi bibande à main avec
plan coté et pièces STL imprimables, ainsi qu’un dipôle en V fixe pour écouter l’ISS.
- **Polarisation.** Le signal du satellite tourne au cours du passage. S’il
s’évanouit, faites pivoter la Yagi à main sur son axe pour le rétablir.
- **Écouteurs et enregistrement.** Le bruit ambiant masque les signaux faibles.
L’enregistrement du passage permet de vérifier ensuite les indicatifs.
- **Puissance.** Avec une Yagi, 2-5 W suffisent pour les satellites FM. Une
puissance supérieure ne compense pas une antenne mal orientée et gêne les autres utilisateurs.

## Utiliser BH Satélite sur l’UV-K5

BH Satélite est l’image Beta du firmware Bricohams avec le profil
Satélites. Détails techniques, limites et protocole :
[Firmware Bricohams](BRICOHAMS-FIRMWARE.md).

> **Expérimental.** Les fonctions Doppler, CAT RX et CAT TX ont fait l’objet de
> tests logiciels avec des primitives RF simulées. **Elles n’ont pas encore été
> validées sur la radio ni par mesure RF.** Commencez par tester en réception.

1. **Slot correct.** Sur les radios à démarrage multiple, chaque slot possède sa
propre banque de canaux. Programmez les mémoires satellites **uniquement dans le
slot BH Satélite**. Au préalable, faites une copie complète avec
[Quansheng](AYUDA-QUANSHENG.md).
2. **Mémoires.** Créez une mémoire avec RX égal à la descente nominale et TX égal
à la montée, avec sa tonalité. Vous pouvez aussi utiliser le plan à 5 mémoires
échelonnées.
3. **SAT RX.** Sélectionnez la mémoire et passez en mode Fox Hunt/SAT. L’écran
affiche `SAT RX` et prend RX et TX du canal comme valeurs nominales.
4. **Doppler manuel.** Les touches 4 et 6 retranchent ou ajoutent 500 m/s de
vitesse radiale, et la touche 5 revient à zéro. Au début du passage, le satellite
s’approche : utilisez des vitesses négatives pour recevoir plus haut.
5. **CAT RX depuis Android.** Appuyez sur 8 sur la radio pour afficher
`CAT READY RX`. L’application Bricohams calcule le passage avec SGP4 et envoie
la fréquence RX corrigée. Chaque commande expire au bout de 3 s si elle n’est pas
renouvelée. Les touches 4, 5 et 6 rendent la commande au mode manuel.
6. **Émission.** La montée utilise le TX nominal du canal : BH Satélite **ne
corrige pas le Doppler en émission**. La PTT CAT pour la SSTV exige un armement
local avec la touche 9, un lease de 1500 ms et une limite de 120 s.
7. **Quitter.** EXIT restaure la configuration RF du VFO.

L’UV-K5 peut également **écouter** des transpondeurs linéaires en SSB avec les
firmwares F4HWN. Pour émettre sur ceux-ci, il faut la SSB en TX et le full duplex,
que l’UV-K5 ne propose pas. OpenGD77 inclut son propre mode satellite sur les
radios compatibles : [OpenGD77](AYUDA-OPENGD77.md).

## Comment établir un QSO par satellite

1. **Écoutez d’abord.** Écoutez un ou deux passages complets avant d’émettre,
afin de connaître le rythme et les indicatifs habituels.
2. **Bref et clair.** Un QSO typique échange les indicatifs et les carrés,
par exemple : « EA5XXX, IM97 ». Confirmez à l’autre station par « QSL, 73 ».
3. **Une seule émission à la fois.** Sur un répéteur FM, si deux stations
émettent simultanément, aucune n’est audible. Attendez un créneau et n’appelez
pas sans arrêt.
4. **Ne monopolisez pas le passage.** Un passage dure quelques minutes et de
nombreuses stations se le partagent. Un contact par passage est une bonne règle
sur les satellites fréquentés.
5. **Vérifiez que vous passez.** Avec deux radios, écoutez votre propre descente.
Si vous ne vous entendez pas, vérifiez l’orientation, la mémoire Doppler et la
tonalité avant de rappeler.

Codes et expressions courants :

| Expression | Signification |
| --- | --- |
| QRZ | Qui m’appelle ? |
| QSL | Reçu ou confirmé |
| QTH / grid | Emplacement ou carré |
| 73 | Salutations |
| QRT | Je cesse d’émettre |
| Rover | Station qui se déplace pour activer des carrés rares |

## Enregistrer et confirmer les contacts

- Notez la date et l’heure **UTC**, l’indicatif, le carré du correspondant,
le satellite et le mode.
- En ADIF, utilisez `PROP_MODE` = `SAT` et `SAT_NAME`, par exemple `SO-50`.
Le journal de bord de l’application Android exporte de l’ADIF.
- Importez vos contacts dans LoTW ou eQSL pour les confirmer. Le diplôme VUCC
satellite de l’ARRL exige 100 carrés confirmés.

## SSTV et APRS depuis l’ISS

- **SSTV.** Lors des événements annoncés par ARISS, l’ISS transmet des images
FM sur 145,800 MHz, généralement en PD120 ou Robot36. Un dipôle en V ou une Yagi
et un décodeur suffisent. L’application Bricohams décode Robot36 depuis un WAV.
- **APRS.** Le digipeater de l’ISS sur 145,825 MHz retransmet des trames packet.
L’envoi de trames exige une licence et un TNC ou une application compatible.
- **Écoute vocale.** Pendant les contacts ARISS avec les écoles, écoutez
uniquement la descente sur 145,800 MHz. N’émettez pas sur la montée.

## Liste de contrôle du passage

1. Mettez les TLE à jour et vérifiez l’heure UTC du passage, son élévation
maximale ainsi que les directions AOS et LOS.
2. Confirmez sur AMSAT que le satellite est actif.
3. Vérifiez que la radio démarre dans le slot BH Satélite et que la mémoire
contient les RX, TX et tonalités corrects.
4. Vérifiez l’antenne, le coaxial, le duplexeur, les écouteurs et l’enregistreur.
5. Avant l’AOS, pointez vers l’horizon où le satellite apparaîtra.
6. Pendant le passage, suivez le satellite, faites pivoter l’antenne pour la
polarisation et corrigez le Doppler.
7. Après le passage, consignez les contacts en UTC et écoutez l’enregistrement.

## Glossaire

| Terme | Définition |
| --- | --- |
| Uplink / montée | Fréquence sur laquelle nous émettons vers le satellite |
| Downlink / descente | Fréquence sur laquelle le satellite retransmet |
| Transpondeur | Équipement du satellite qui convertit la montée en descente |
| Semi-duplex | Réception impossible pendant l’émission |
| Full duplex | Réception et émission simultanées ; permet d’entendre son propre écho |
| CTCSS | Tonalité subaudible qui ouvre le répéteur du satellite |
| SGP4 | Modèle de propagation orbitale utilisé avec les TLE |
| CAT | Contrôle de la radio depuis un ordinateur ou un téléphone |

## Références

- Carlos Vicente PT2VM, *Radioamadores no Espaço — Guia básico para operar
satélites*, v1.1, 04/09/2025. A inspiré le parcours thématique ; n’est pas reproduit.
- AMSAT : <https://www.amsat.org>. État des satellites, fréquences et prévisions.
- ARISS : <https://www.ariss.org>. Radioamateurs à bord de l’ISS.
- CelesTrak : <https://celestrak.org>. Paramètres orbitaux TLE.
- SatNOGS : <https://satnogs.org>. Réseau ouvert de stations terrestres.
- Bricohams : [Antennes pour satellites](ANTENAS-SATELITE.md),
[Firmware Bricohams](BRICOHAMS-FIRMWARE.md), [Android](ANDROID.md) et
[Quansheng](AYUDA-QUANSHENG.md).