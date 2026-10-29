# Déploiement

Deux déploiements sont pris en charge : **local** (serveur Node sur l'ordinateur auquel la radio est connectée) et **web public sur GitHub Pages** (site statique, voir [Web public sur GitHub Pages](#web-public-sur-github-pages)).

## Prérequis

Le point d'entrée public officiel est <https://brico-hams.github.io/Radio-Web-install/>. Partagez cette URL, pas les anciennes copies ni les aperçus locaux. `index.html` déclare cette URL canonique ; les pages d'outils et d'aide sont des sections du même site, pas des versions alternatives.

- Node.js 22 ou ultérieur **uniquement pour l'exécution depuis les sources, Arch et FreeBSD**. Les paquets `.deb` et le ZIP Windows incluent Node.
- Git uniquement pour cloner et mettre à jour une installation depuis les sources.
- Chrome, Edge ou Brave de bureau, pour WebUSB/Web Serial. Firefox et Safari ne sont pas compatibles.
- Les pilotes USB requis par la radio : voir [Aide › Pilotes](../../../ayuda.html#drivers).

## Installation depuis les sources

```powershell
git clone https://github.com/Brico-Hams/Radio-Web-install.git
cd Radio-Web-install
npm ci --ignore-scripts
npm start
```

Ouvrir <http://127.0.0.1:8787>. Avec `localhost`, le serveur redirige vers `127.0.0.1` : il valide l'en-tête `Host` et ne sert que cette origine. Toujours utiliser la même origine pour conserver l'historique IndexedDB.

Pour inclure Bricohams Quansheng Studio dans la copie locale, exécuter `npm run fetch:studio`. Cette commande télécharge `studio.html` depuis `Brico-Hams/Bricohams-Studio`, au commit figé dans `studio.lock.json`, puis vérifie sa taille et son SHA-256. Le fichier n'est pas versionné car il contient du firmware intégré.

**Mettre à jour Studio (auteur) :** une fois le nouveau commit sur GitHub, exécuter `node scripts/fetch-studio.cjs --update <commit-completo>`. La commande réécrit `studio.lock.json` avec la taille, le SHA-256 et les empreintes CSP de ses scripts. Examiner le diff et committer le fichier de verrouillage.

`--ignore-scripts` empêche l'exécution des scripts d'installation tiers. La version de `satellite.js` est figée dans `package-lock.json`.

## Vérification

```powershell
npm test
npm run check
```

Les deux commandes doivent se terminer sans échec. Ouvrir ensuite la page d'aide et vérifier que le logo Bricohams apparaît.

## Installateurs locaux

Télécharger le fichier de votre système et `SHA256SUMS` dans les **Assets** de la [dernière Release](https://github.com/Brico-Hams/Radio-Web-install/releases/latest). Des paquets sont publiés depuis `v0.3.0`. Les liens automatiques « Source code (zip) » et « Source code (tar.gz) » ne sont pas des installateurs.

| Système | Fichier | Installation |
| --- | --- | --- |
| Debian 12/13, Ubuntu 22.04/24.04, Raspberry Pi OS arm64/armhf | `.deb` pour amd64, arm64 ou armhf | `sudo apt install ./nombre-del-paquete.deb` (choisir uniquement son architecture) |
| Arch Linux | `*-arch.tar.gz` | Extraire puis exécuter `makepkg -si` (nécessite `base-devel` et `nodejs`). |
| FreeBSD 14 amd64 | `*-freebsd-amd64.tar.gz` | Extraire puis exécuter `su -c './install.sh'` (installe `node22` via `pkg` si nécessaire). |
| Windows 11 x64 | `*-windows-x64.zip` | Extraire le ZIP puis exécuter `powershell -ExecutionPolicy Bypass -File .\Install.ps1` ; ajoute un raccourci au menu Démarrer. |

Les `.deb` et le ZIP Windows incluent Node.js 22. Arch utilise le paquet `nodejs` de sa distribution. FreeBSD nécessite `pkg` et le paquet `node22`. Raspberry Pi OS 32 bits exige un processeur ARMv7 ou ultérieur. L'installateur ne configure pas de démarrage automatique et n'élève pas les privilèges pour lancer l'application.

Après installation, lancer **Bricohams Radio Workspace** depuis le menu des applications/Démarrer ou exécuter `bricohams-radio` sur Arch et FreeBSD. Le serveur reste lié à `127.0.0.1:8787` ; ne pas l'exposer au réseau. Sur FreeBSD, Chromium peut ne pas proposer WebUSB/Web Serial : l'accès aux radios est donc fourni au mieux, sans garantie.

### Vérifier le téléchargement

Vérifier l'empreinte avant d'exécuter l'installateur. Dans PowerShell :

```powershell
Get-FileHash .\bricohams-radio-workspace-v0.3.0-windows-x64.zip -Algorithm SHA256
Get-Content .\SHA256SUMS
```

Comparer l'empreinte complète à la ligne du même nom dans `SHA256SUMS` (la casse n'importe pas). Sous Linux :

```sh
sha256sum bricohams-radio-workspace-v0.3.0-amd64.deb
cat SHA256SUMS
```

Sous FreeBSD, utiliser `sha256 nombre-del-archivo`. Remplacer le nom/la version par le fichier réellement téléchargé. Ne pas installer si l'empreinte diffère. Les sommes vérifient l'intégrité, pas une signature de l'éditeur : les paquets ne sont pas signés.

### Windows 11 x64

1. Télécharger `*-windows-x64.zip` et **extraire tout son contenu** ; ne pas exécuter le script dans le ZIP.
2. Ouvrir PowerShell dans le dossier contenant `Install.ps1`, `Start.ps1`, `app` et `runtime`.
3. Exécuter en tant qu'utilisateur normal :

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\Install.ps1
   ```

4. L'installation se fait dans `%LOCALAPPDATA%\Programs\Bricohams Radio Workspace` et crée **Bricohams Radio Workspace** dans le menu Démarrer. Ni UAC ni installation séparée de Node ne sont nécessaires.
5. Ouvrir ce raccourci. Si le navigateur par défaut n'est ni Chrome, ni Edge, ni Brave, ouvrir manuellement <http://127.0.0.1:8787> dans l'un d'eux.

`ExecutionPolicy Bypass` n'affecte que le processus exécutant la commande ; ne pas modifier définitivement la stratégie PowerShell. Une stratégie d'entreprise peut bloquer les scripts même avec cette option : consulter l'administrateur. L'installateur actuel est un ZIP avec scripts, pas un `.exe`/MSI signé, et n'installe pas de pilotes WinUSB.

### Debian, Ubuntu et Raspberry Pi OS

Vérifier l'architecture du **système d'exploitation** (pas seulement celle du processeur) :

```sh
dpkg --print-architecture
```

Télécharger uniquement le `.deb` dont le suffixe correspond : `amd64`, `arm64` ou `armhf`. Raspberry Pi OS 64 bits utilise `arm64` ; la version 32 bits utilise `armhf` et exige ARMv7 ou ultérieur. Les Raspberry Pi 1 et Zero/Zero W d'origine avec ARMv6 ne sont pas pris en charge.

Depuis le dossier des téléchargements, pour un ordinateur amd64 et la version initiale :

```sh
sudo apt install ./bricohams-radio-workspace-v0.3.0-amd64.deb
bricohams-radio
```

Remplacer le nom par celui de votre fichier. Node est inclus dans `/opt/bricohams-radio-workspace` ; le lanceur apparaît aussi dans le menu des applications. Ne pas exécuter `bricohams-radio` avec `sudo` : les sauvegardes et autorisations du navigateur doivent appartenir à votre utilisateur.

### Arch Linux

```sh
sudo pacman -S --needed base-devel nodejs
mkdir bricohams-installer
tar -xzf bricohams-radio-workspace-v0.3.0-arch.tar.gz -C bricohams-installer
cd bricohams-installer
less PKGBUILD
makepkg -si
bricohams-radio
```

Exécuter `makepkg` en tant qu'utilisateur normal. L'archive `*-arch.tar.gz` contient la recette ; `*-arch-source.tar.gz` contient l'application que cette recette télécharge depuis la même Release et vérifie par SHA-256. Ce n'est ni un paquet binaire prêt pour `pacman -U`, ni un paquet publié dans AUR. La construction nécessite Internet et Node.js 22 ou ultérieur.

### FreeBSD 14 amd64

```sh
mkdir bricohams-installer
tar -xzf bricohams-radio-workspace-v0.3.0-freebsd-amd64.tar.gz -C bricohams-installer
cd bricohams-installer
su -c './install.sh'
bricohams-radio
```

L'installation nécessite root et des dépôts `pkg` disponibles pour installer `node22` s'il manque. Le programme s'installe dans `/usr/local/libexec/bricohams-radio-workspace`, avec lanceur `/usr/local/bin/bricohams-radio`. Revenir à votre utilisateur normal pour le démarrer. Ce n'est ni un paquet natif `.pkg` ni un port officiel. Le serveur local et l'édition de fichiers ne garantissent pas la connexion radio : elle dépend des API et autorisations USB/série offertes par Chromium.

### Premier démarrage, autorisations et arrêt

- Toujours ouvrir <http://127.0.0.1:8787> dans le même navigateur et profil : les sauvegardes appartiennent à cette origine, pas au dossier d'installation. Le badge doit afficher **Local · installé**.
- Les lanceurs démarrent le serveur en arrière-plan ; fermer l'onglet ne l'arrête pas. Aucun démarrage automatique à l'ouverture de session n'est configuré. Depuis les sources, `npm start` reste dans le terminal et s'arrête avec `Ctrl+C`.
- L'installateur ne configure ni pilotes ni autorisations USB. Voir [Aide › Pilotes](../../../ayuda.html#drivers) : WinUSB si nécessaire sous Windows, règles udev et groupe `dialout`/`uucp` selon la distribution Linux. Rouvrir la session après changement de groupe et ne pas exécuter le navigateur en root.
- Si le port est occupé, identifier le processus avant de l'arrêter. Sous Windows : `Get-NetTCPConnection -LocalPort 8787 -State Listen | Select-Object OwningProcess`, puis `Get-Process -Id <PID>` et, uniquement s'il s'agit du serveur Bricohams, `Stop-Process -Id <PID>`. Sous Linux, utiliser `ss -lptn 'sport = :8787'` ; sous FreeBSD, `sockstat -4 -l`. Confirmer la commande et l'utilisateur du PID, et n'arrêter que ce processus avec `kill <PID>`.
- Les journaux Linux/FreeBSD se trouvent dans `${XDG_STATE_HOME:-$HOME/.local/state}/bricohams-radio/server.log`. Sous Windows, en cas d'échec du démarrage, exécuter depuis PowerShell `& "$env:LOCALAPPDATA\Programs\Bricohams Radio Workspace\runtime\node.exe" "$env:LOCALAPPDATA\Programs\Bricohams Radio Workspace\app\server.cjs"` pour afficher l'erreur.
- Internet n'est pas nécessaire pour servir l'interface et modifier des fichiers locaux. Les requêtes aux fournisseurs et téléchargements de firmware l'exigent.

## Configuration

| Variable | Usage |
| --- | --- |
| `RB_USER_TOKEN` | Jeton d'application approuvé par RepeaterBook (`rbuapp_…`). |
| `RB_APPROVED_USER_AGENT` | User-Agent enregistré lors de l'approbation. |
| `RB_APPROVED` | Doit valoir `yes` pour activer la fonction. |

Seul le serveur lit ces variables. Ne pas les enregistrer dans le dépôt. Le port `8787` et l'interface `127.0.0.1` sont figés dans `server.cjs` pour des raisons de sécurité.

Exemple PowerShell pour les sources, valable uniquement dans la session actuelle :

```powershell
$env:RB_USER_TOKEN = "<token aprobado>"
$env:RB_APPROVED_USER_AGENT = "<user-agent aprobado>"
$env:RB_APPROVED = "yes"
npm start
```

Avec le ZIP installé, définir ces variables dans PowerShell puis exécuter `& "$env:LOCALAPPDATA\Programs\Bricohams Radio Workspace\Start.ps1"` depuis la même session. Arrêter d'abord tout serveur déjà lancé : un processus existant conserve son ancien environnement. Aucun écran de réglages ne sauvegarde encore ces clés ; ne pas les coller dans le navigateur ou des fichiers publics.

## Mise à jour

**Installateurs :** exporter d'abord les sauvegardes `.rwb.json`, arrêter le serveur et télécharger/vérifier la nouvelle Release. Sous Windows, relancer l'installateur extrait ; sous Debian/Ubuntu/Raspberry Pi, utiliser `sudo apt install ./nuevo-paquete.deb` ; sous Arch, reconstruire la nouvelle recette avec `makepkg -si` ; sous FreeBSD, exécuter le nouveau `install.sh`. Rouvrir le lanceur et recharger le navigateur. Les releases publiées ne changent pas lors d'une mise à jour de `main` ; les corrections nécessitent une nouvelle version.

**Sources :**

```powershell
git pull
npm ci --ignore-scripts
npm test
npm start
```

Exporter vos sauvegardes avant de mettre à jour le navigateur ou d'effacer les données du site.

## Documentation multilingue

L'aide est publiée en espagnol (original), anglais américain, allemand, italien et français. Les sources traduites se trouvent dans `docs/i18n/<idioma>/` (même nom que l'original) et `README.<idioma>.md` ; `npm run build:help` génère `ayuda-*.html` et `ayuda-*.<idioma>.html` avec sélecteur de langue. `docs/i18n/<idioma>/F4HWN-PRESETS.md` est généré automatiquement.

Lors de la modification d'un document espagnol, mettre à jour les quatre traductions et vérifier la conservation des titres, blocs de code, code en ligne, lignes de tableau, images et liens :

```powershell
node scripts/i18n.cjs --fix --strict
npm run build:help
```

`--fix` ajuste les chemins relatifs des liens et images au dossier de chaque traduction et les dirige vers la traduction correspondante. Il corrige aussi les ancres des titres Markdown traduits ; l'aide HTML conserve des ancres stables dans toutes les langues. La vérification inclut architecture, marque, décisions et déploiement. L'index des références est généré à partir des titres traduits de tous les guides et relie chaque version linguistique, dont l'anglais des États-Unis. Le centre complet d'aide et de questions fréquentes est disponible en espagnol, anglais américain, français et allemand ; ses traductions sont générées depuis le HTML espagnol et les ressources de traduction versionnées. La vérification stricte contrôle aussi l'exhaustivité et l'actualisation du HTML généré. Les guides et l'index italiens restent disponibles ; leur lien vers le centre d'aide utilise l'original espagnol. Les commandes et les messages de diagnostic exacts sont conservés pour faciliter le dépannage. Les sources externes conservent la langue publiée par leurs auteurs. En cas de divergence entre traduction et original, l'espagnol prévaut.

## Démarrage automatique (facultatif, depuis les sources)

Les installateurs lancent déjà le serveur en arrière-plan à l'ouverture du lanceur, mais pas à l'ouverture de session. Ces exemples concernent une copie du dépôt avec Node installé ; adapter les chemins et ne pas les combiner avec un autre serveur sur le même port.

Sous Windows, comme tâche planifiée à l'ouverture de session :

```powershell
$action = New-ScheduledTaskAction -Execute "node.exe" -Argument "server.cjs" -WorkingDirectory "C:\ruta\Radio-Web-install"
$trigger = New-ScheduledTaskTrigger -AtLogOn
Register-ScheduledTask -TaskName "Bricohams Radio Workspace" -Action $action -Trigger $trigger
```

Sous Linux, comme service utilisateur systemd (`~/.config/systemd/user/bricohams-radio.service`) :

```ini
[Unit]
Description=Bricohams Radio Workspace

[Service]
WorkingDirectory=%h/Radio-Web-install
ExecStart=/usr/bin/node server.cjs
Restart=on-failure

[Install]
WantedBy=default.target
```

L'activer avec `systemctl --user enable --now bricohams-radio`.

<a id="web-pública-en-github-pages"></a>
## Web public sur GitHub Pages

Le site statique est généré par `npm run build:pages` (dossier `dist/`) et publié par `.github/workflows/pages.yml`. Il n'inclut pas `server.cjs` : `runtime.json` vaut `{"mode":"web"}` et l'application fonctionne en mode web (voir [Architecture](ARCHITECTURE.md#modes-dexécution)).

### Pourquoi une origine dédiée

IndexedDB (sauvegardes radio) et `localStorage` (profil) sont isolés par
origine, pas par chemin. La recommandation initiale était un compte dédié
sur `https://<org>.github.io/`. Le site actuel
`https://brico-hams.github.io/Radio-Web-install/` utilise l'exception
d'origine partagée : il partage le stockage avec d'autres projets de
`brico-hams.github.io`, dont Bricohams Studio. Ne pas présenter le
sous-chemin comme une isolation. Exporter les sauvegardes hors du
navigateur ; changer d'origine ne migre pas automatiquement les données
du profil. Tous les chemins du client restent relatifs.

### Étapes (réalisées par l'auteur)

1. Créer le compte ou l'organisation `<org>`.
2. Créer le dépôt `<org>.github.io` et y envoyer ce code (le push nécessite la confirmation explicite de l'auteur).
3. Dans *Settings › Pages*, choisir « GitHub Actions » comme source et activer « Enforce HTTPS ».
4. Créer la variable Actions `PAGES_ORIGIN` avec `https://<org>.github.io` (sans barre finale). Le workflow l'utilise pour récupérer le précédent `data/satellites.json`.
   Le workflow ne s'exécute que dans le dépôt `<org>/<org>.github.io` (condition `if: github.repository == ...`) : ailleurs, il est ignoré pour ne pas publier sur une origine partagée qui exposerait sauvegardes et profil (IndexedDB) aux autres pages.
   Exception délibérée : si l'auteur accepte le partage d'origine, créer la variable de dépôt `PAGES_SHARED_ORIGIN_ACCEPTED` avec la valeur `true`. Les variables ne sont pas copiées dans les forks, qui restent donc protégés. Le site officiel actuel utilise cette exception sur `https://brico-hams.github.io/Radio-Web-install/` (voir ADR-014).
   Le premier push peut s'exécuter avant la définition de `PAGES_ORIGIN` : c'est sans danger, la récupération des anciennes données est ignorée avec un avertissement.
5. Exécuter le workflow manuellement la première fois (*Actions › Pages › Run workflow*).

### Rôle du workflow

- S'exécute à chaque push vers `main`, quotidiennement à 05:17 UTC et manuellement.
- Installe avec `npm ci --ignore-scripts`, exécute `npm test`, construit `dist/` et génère `dist/data/satellites.json` avec `scripts/fetch-satellites.cjs`.
- Permissions minimales (`contents: read`, `pages: write`, `id-token: write`), sans secrets, et chaque action figée par SHA de commit.

### Satellites

`scripts/fetch-satellites.cjs` interroge SatNOGS pour les identifiants NORAD de `data/satellites.config.json` (25544, 27607, 43017 et 43678). Si un satellite échoue ou si son TLE est invalide, ses dernières données valides du fichier précédent sont conservées ; le web avertit lorsque `fetchedAt` dépasse 7 jours. Attribution : SatNOGS DB / Libre Space Foundation, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

### Sécurité du site statique

Chaque HTML contient une CSP dans `<meta>` (sans scripts ni styles en ligne ; `connect-src` limité à `'self'` et `https://api.github.com`) et l'application refuse de s'exécuter dans un cadre, car GitHub Pages ne permet pas d'en-têtes personnalisés. Aucun compte, envoi ni télémétrie. RadioID n'est pas répliqué et RepeaterBook n'est pas disponible sur le web.

Les installateurs disponibles sont publiés dans [GitHub Releases](https://github.com/Brico-Hams/Radio-Web-install/releases). Pour générer une nouvelle publication, créer et pousser un tag `v*` ; GitHub Actions valide le projet, télécharge les environnements Node.js 22 en vérifiant leurs sommes de contrôle et joint les installateurs avec `SHA256SUMS`. Les releases incluent `.deb` amd64/arm64/armhf, `PKGBUILD` pour Arch, installateur tarball FreeBSD et ZIP Windows 11 x64. La première release doit être publiée en poussant un tag ; ce dépôt ne crée ni ne pousse automatiquement de tags.

## Exporter le projet

La [revue des exigences](ESTADO-ENTREGA.md) énumère les éléments implémentés
et ceux en attente. Tant qu'elle reste incomplète, l'export exige `--beta` :
il génère un instantané de développement, pas une livraison finale
certifiée. Il ne construit pas d'installateurs, ne publie rien et ne
programme aucune radio.

Avec Node.js 22+, Git et les outils d'archivage du système :

```powershell
npm run export:project -- --beta `
  --firmware 'C:\ruta\Multiboot\Bricohams' `
  --installers 'C:\ruta\instalables-verificados' `
  --android 'C:\ruta\Android-0.9.0-beta' `
  --output 'C:\ruta\entregas\Bricohams-desarrollo.zip'
```

La destination doit être un nouveau ZIP. Windows utilise `tar.exe`
(bsdtar) ; Linux/FreeBSD nécessitent `zip`. L'outil utilise son propre
répertoire temporaire et le nettoie à la fin, même en cas d'erreur.

En l'absence d'installateurs de bureau reconstruits, remplacer `--installers`
par `--without-installers`. Cette omission explicite est réservée aux
instantanés Beta : le manifeste indique `desktopInstallersIncluded: false`
et aucun dossier `installers` n'est présent. Ne pas réutiliser d'anciens
paquets comme s'ils étaient nouveaux. L'APK indiquée par `--android`
est bien incluse et vérifiée indépendamment.

Contenu :

- `android`, si `--android` est indiqué : APK Beta debug, APK de tests,
  guide, licences, manifeste de compilation et SHA256SUMS d'une livraison
  créée par `scripts/build-android.ps1`. Vérifie toutes les empreintes,
  les tests hôtes sans échec, lint sans erreur et la correspondance exacte
  de chaque source Android avec `project`, sans fichier omis ni dupliqué.
  Compare aussi version et guide. Si l'APK correspond à des sources
  antérieures, abandon : reconstruire avant d'exporter. Conserve les
  indicateurs de tests instrumentés et matériels sans les transformer
  en tests exécutés. La vérification cryptographique de signature APK
  revient au constructeur ; l'exportateur vérifie intégrité/provenance
  déclarée, sans exécuter l'APK. Sans `--android`, le manifeste indique
  `android: null` et aucune APK n'est incluse ; l'export n'est pas présenté
  comme une livraison dotée d'un installateur Android.

- `project` : sources actuelles, y compris les nouveaux fichiers non
  ignorés par Git, documentation et outils. N'inclut pas les dépendances
  installées : exécuter `npm ci --ignore-scripts` après extraction.
  Studio est récupéré par `npm run fetch:studio` avec le verrouillage ;
  les installateurs, eux, l'incluent.
- `history.bundle` : historique de HEAD, récupérable avec
  `git clone history.bundle historial`. Les modifications non committées
  sont dans `project`, pas dans le bundle. Le manifeste indique révision
  et état dirty.
- `firmware` : tous les sous-dossiers de la racine indiquée contenant
  `artifacts/build-info.json`, leurs artefacts vérifiés et les sources de
  leur clone isolé. Vérifie SHA256SUMS, révision upstream et empreintes
  déclarées des sources. Une source modifiée ou un manifeste invalide
  provoque l'abandon. Les cibles sans artefacts sont listées comme
  exclues, pas comme compilations. Si un dossier historique ne contient
  que les artefacts directement (par exemple Fusion/Labs), abandon
  plutôt qu'omission du firmware : retrouver sa construction originale
  avec `source` et `artifacts` dans `firmware-builds`. Regrouper les
  constructions complètes dans une racine de livraison avant l'export.
- `installers` : paquets énumérés dans SHA256SUMS du dossier indiqué.
  Doit contenir Windows x64, Debian amd64/arm64/armhf, recette et sources
  Arch et FreeBSD amd64. Vérifie l'intégrité, pas l'exécution ni la
  provenance de révision : les construire et les tester d'abord. Ne pas
  mélanger d'anciennes versions pour faire croire à une nouvelle livraison.
- `export-info.json` et `SHA256SUMS` : inventaire, tailles, empreintes,
  révisions, constructions incluses/exclues et avertissement d'état incomplet.

Ne copie pas `.git`, `.env`, clés/certificats, caches, `node_modules`,
`dist`, sauvegardes radio ou données téléchargées depuis l'arbre du projet.
De `data`, seul `satellites.config.json` est inclus. Ne copie ni la
bibliothèque Multiboot externe, ni les calibrations radio, ni la configuration
du navigateur. Les dossiers firmware et installateurs doivent être des
sorties de construction, pas des dossiers personnels. Examiner aussi
l'historique Git avant partage : exclure un secret actuel ne le retire
pas des anciens commits. Les exclusions ne remplacent pas cette revue
et n'autorisent pas la redistribution de composants sans leurs licences.

Extraire dans un nouveau dossier et vérifier dans `Bricohams` :

```sh
sha256sum --check SHA256SUMS
```

Dans PowerShell, comparer chaque ligne avec `Get-FileHash -Algorithm SHA256`,
ou utiliser `export-info.json` pour parcourir les chemins et comparer
taille et SHA-256. Vérifier aussi l'empreinte ZIP affichée par l'exportateur.
Aucune de ces empreintes n'est une signature numérique. L'essai
d'extraction/démarrage et la couverture fonctionnelle restent des
conditions de livraison indépendantes.

## Déploiements non pris en charge

- **Autre hébergement statique que GitHub Pages :** non testé. Pour Pages, voir ci-dessus.
- **Réseau local ou Internet :** nécessiterait HTTPS, authentification, modification de la validation de `Host` et revue CSRF. Non pris en charge : identifiants et données radio seraient exposés.
- **Conteneurs :** WebUSB/Web Serial s'exécutent dans le navigateur de l'hôte. Un conteneur ne fournirait que le serveur et compliquerait l'accès à `127.0.0.1`.

## Désinstallation

Exporter d'abord les sauvegardes et arrêter uniquement le processus serveur identifié comme expliqué plus haut.

- **Windows :** supprimer le dossier `%LOCALAPPDATA%\Programs\Bricohams Radio Workspace` et son raccourci du menu Démarrer (`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Bricohams Radio Workspace.lnk`). L'installateur ZIP n'enregistre pas de désinstallateur dans « Applications installées ».
- **Debian/Ubuntu/Raspberry Pi OS :** `sudo apt remove bricohams-radio-workspace`.
- **Arch :** `sudo pacman -R bricohams-radio-workspace`.
- **FreeBSD :** l'installateur n'enregistre pas de paquet d'application dans `pkg`. Supprimer uniquement `/usr/local/libexec/bricohams-radio-workspace` et `/usr/local/bin/bricohams-radio` en root. Ne pas désinstaller Node si d'autres applications l'utilisent.
- **Sources :** supprimer votre copie du dépôt et, si configuré, sa tâche planifiée ou son service utilisateur.

La désinstallation ne supprime pas les sauvegardes du navigateur. Pour les effacer aussi, **exporter d'abord les fichiers**, puis supprimer les données du site `http://127.0.0.1:8787` dans le navigateur. Les journaux utilisateur Linux/FreeBSD peuvent être supprimés séparément après examen.
