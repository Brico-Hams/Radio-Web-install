# Guide AnyTone et canaux locaux

Cette page décrit le préparateur web AnyTone Beta. Il ne remplace pas le CPS
officiel et ne programme pas la radio par USB. Les projets JSON et CSV sont des formats
d’échange propres à l’application : ce ne sont pas des fichiers RDT et ils ne doivent pas être chargés directement
dans le CPS en supposant qu’il s’agit de codeplugs natifs. Effectuez une copie originale avec le
CPS du fabricant avant toute écriture.

## Capacités et modes

Sélectionnez un profil de modèle et confirmez séparément les capacités que vous
aurez vérifiées dans le manuel de la variante exacte. Les profils de famille
ne certifient pas les caractéristiques de toutes les révisions. AM aéronautique et FM
commerciale 87.5-108 MHz ne sont activées que pour le profil « Otro » avec confirmation
manuelle. Vérifiez que le récepteur couvre la bande et le mode ; une fréquence
acceptée ne prouve pas que le matériel puisse la recevoir.

Tous les canaux sont en réception uniquement. L’AM nécessite les fréquences RF en MHz, et non le
désignateur de canal aéronautique 8.33 kHz ; le préparateur valide la grille
représentable. Aucune émission n’est créée et la compatibilité de l’antenne, du filtre,
du firmware ou du CPS n’est pas certifiée.

## Aéroports et bande aéronautique

L’utilisateur fournit un JSON local avec `results` (1-4000 lignes). Chaque enregistrement
comprend `name`, `frequencyMHz` et `source` avec une référence AIP en vigueur. Pour
filtrer par proximité, il peut inclure `latitude` et `longitude` ; lors de la sélection
d’un emplacement, le navigateur demande l’autorisation et l’utilise localement en mémoire, sans
transmettre les coordonnées à un service. Les enregistrements sans coordonnées ou hors du
rayon choisi sont ignorés. Sans emplacement, la liste complète est traitée.

Consultez les fréquences RF et les services en vigueur dans l’[AIP ENAIRE](https://aip.enaire.es/). Aucune base nationale de
fréquences n’est incluse, aucune donnée n’est téléchargée automatiquement et les
indicateurs 8.33 kHz ne sont pas convertis. L’application propose le canal 121.500 MHz en option manuelle,
en réception uniquement ; vérifiez la procédure et la validité dans les sources officielles. N’utilisez pas
la fréquence de garde pour les communications courantes.

## Stations FM commerciales locales

Pour importer des stations, vérifiez d’abord dans le manuel exact que l’appareil
reçoit la FM commerciale 87.5-108 MHz. Préparez un fichier local avec `results` et les
champs `name`, `frequencyMHz` (ou `frequency`), `latitude`, `longitude` et
`source`. Le filtre utilise la distance en km par rapport à l’emplacement autorisé et
au rayon sélectionné (1-500 km). Aucun catalogue national n’est préchargé et il n’y a pas de
scraping ; utilisez une source autorisée, à jour et adaptée à votre région. L’application ne certifie pas la licence ni l’exactitude des données fournies.

Les canaux obtenus sont marqués `FM_Broadcast_RX` dans le CSV
d’échange, avec RX et TX nominaux identiques et TX verrouillée dans l’éditeur. Cette marque
n’autorise pas l’émission et ne transforme pas le CSV en format AnyTone. Les canaux
commerciaux nécessitent de confirmer la capacité dans le projet JSON et ne peuvent pas être
ouverts avec un profil radio qui n’a pas cette confirmation.

## Relais et REMER

Il est possible d’importer des données locales autorisées de relais RadioID, URE et
RepeaterBook selon le format attendu par l’éditeur. Les tonalités analogiques sont
conservées comme note à vérifier ; elles ne sont ni déduites ni programmées à partir de la fréquence. Vérifiez la validité, le décalage, le CC, le TS, le TG, les contacts,
les listes de réception et les limites du modèle dans le CPS.

L’onglet REMER est disponible dans les planificateurs compatibles Quansheng
et OpenGD77. Son tableau VHF est une transcription de la référence fournie par
l’utilisateur, sans date vérifiable ; recoupez chaque donnée avec REMER. Les CTCSS sont
affichés sous forme de note et ne sont pas importés comme réglages. Les fréquences HF/SSB
sont exclues de l’importation des mémoires FM. Le fait qu’un analyseur relise un canal
valide uniquement la structure du fichier : cela ne démontre ni sa validité, ni la réception RF, ni
sa visibilité dans le firmware après une écriture.

## Enregistrer et vérifier

L’éditeur permet d’ajouter, de modifier et de supprimer des canaux du projet local.
Exportez le JSON pour préserver le travail et le CSV uniquement comme référence ou
échange manuel. Lors de l’importation de binaires OpenGD77 ou Quansheng, seuls
les champs reconnus sont transférés ; les paramètres propriétaires, tonalités, zones et
contacts peuvent nécessiter une reconstruction dans le CPS de destination. La vérification
finale, la conversion au format natif et l’écriture s’effectuent avec le CPS officiel,
après vérification du résultat et sauvegarde d’une copie intacte.