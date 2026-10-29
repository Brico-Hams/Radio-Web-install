# Distribution Android indépendante et procédure F-Droid

[Español](../../FDROID.md) · [English (US)](../en/FDROID.md) · [Français](FDROID.md) · [Deutsch](../de/FDROID.md)

Guide du mainteneur et de l'utilisateur, révisé le 28 octobre 2026.
**Une préparation locale ne signifie pas une publication ni une acceptation
par F-Droid.**

## Choix technologique

| Option | Évaluation pour Bricohams |
| --- | --- |
| Xamarin / Xamarin.Forms | Écarté : Microsoft a arrêté le support le 1er mai 2024. Le dernier SDK Android Xamarin cible l'API 34. |
| .NET for Android / .NET MAUI | Solution actuelle pour de nouveaux projets C# ou une interface multiplateforme. Migrer cette application impose de porter et retester USB, audio, GPS, stockage et interface. Cela ne simplifie pas automatiquement l'inclusion dans F-Droid. |
| Flutter / React Native | Une interface partagée est possible, mais exige une migration et des passerelles natives radio/audio. Aucun avantage démontré ici face au code existant. |
| Kotlin natif, solution actuelle | Recommandé : accès direct à USB Host, audio et GPS, application légère, outils standards et tests existants. Aucun Google Play Services, compte, publicité ou télémétrie nécessaire. |

Android reste une application native indépendante, pas un conteneur WebView.
Les protocoles radio ne sont pas réécrits. Le Web et les applications locales
conservent leur implémentation ; partager la marque et les traductions
n'impose pas de partager le framework d'interface.

## Éléments préparés et état actuel

- [Recette candidate](../../../fdroid/metadata/org.bricohams.radio.yml) à
  soumettre à **fdroiddata**, et non un APK debug à déposer dans le catalogue.
- [Fiche de boutique](../../../fastlane/metadata/android) en espagnol, anglais
  américain, français et allemand, avec marque, limites, confidentialité et notes.
- [Vérificateur](../../../scripts/check-android-store.cjs) et
  [tests](../../../tests/android-store.test.cjs) des versions, tags, langues et tailles.
- [CI Android](../../../.github/workflows/android.yml) : validation des
  métadonnées, compilation/lint release et conservation d'un **APK release
  non signé** séparé des APK debug. F-Droid compile les sources, pas cet artefact.

La recette suit `0.9.0-beta`, `versionCode 13`. Le tag proposé
`android-v0.9.0-beta` doit encore être publié avec cette préparation. Ce travail
n'a pas soumis de demande ni obtenu d'approbation et n'a pas créé de dépôt
F-Droid privé. `fdroid build --server` n'a pas été exécuté sur ce Windows.
Compiler avec Gradle ne remplace pas la validation de l'infrastructure F-Droid.

## Compilation et vérifications locales

Depuis la racine du dépôt dans PowerShell, avec JDK 17 et SDK 35 installés :

```powershell
$env:JAVA_HOME=[Environment]::GetEnvironmentVariable('JAVA_HOME','User')
$env:ANDROID_HOME=[Environment]::GetEnvironmentVariable('ANDROID_HOME','User')
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:Path="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
& "$env:JAVA_HOME\bin\java.exe" -version
npm run check:android-store
node --test tests\android-store.test.cjs
.\android\gradlew.bat -p android :app:testDebugUnitTest :app:lintRelease :app:assembleRelease
```

Les variables doivent désigner des installations existantes. Sinon, configurer
d'abord JDK 17, Android SDK Platform 35, Platform Tools et Build Tools
34.0.0/35.0.0 ; accepter les licences SDK. Relancer les terminaux après toute
modification persistante des variables. Ne pas installer ni sélectionner
Xamarin. Java 8 dans `PATH` ne convient pas à cette compilation ; la commande
explicite vérifie le JDK choisi par `JAVA_HOME`. Si des dépendances Node
manquent, utiliser `npm ci` avec le fichier de verrouillage du projet.

Sortie : [app-release-unsigned.apk](../../../android/app/build/outputs/apk/release/app-release-unsigned.apk).
Cet APK non signé n'est pas installable tel quel et n'est pas un APK officiel
F-Droid. La configuration ne contient aucune clé ni aucun mot de passe de diffusion.

Validation locale : 130 tests Android et quatre tests de métadonnées réussis,
release compilée, lint sans erreur (199 avertissements). La validation
d'infrastructure, les essais sur appareils et l'approbation restent distincts.

## Publication du code et du tag : mainteneur

Ces commandes **publient des modifications** ; ce guide ne les a pas exécutées.
Des droits sur le dépôt et une revue de chaque fichier préparé sont nécessaires.

```powershell
git status --short
git diff --check
git diff
git fetch origin
git log --oneline HEAD..origin/main
```

Intégrer les changements distants et relancer les contrôles avant de continuer.
Ne jamais forcer le push. Ajouter seulement les fichiers revus avec `git add`,
examiner `git diff --cached`, puis :

```powershell
git commit -m "Prepare independent Android distribution for F-Droid" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
node scripts\check-android-store.cjs --tag android-v0.9.0-beta
git tag --list android-v0.9.0-beta
```

Si ce tag existe, **s'arrêter** : ne pas le supprimer ni le déplacer. Pour une
autre version, actualiser version, code, recette et notes avant de remplacer
l'exemple par `android-v` suivi exactement de `versionName`.

```powershell
git push origin main
git tag -a android-v0.9.0-beta -m "Bricohams Android 0.9.0-beta"
git push origin android-v0.9.0-beta
git rev-parse "android-v0.9.0-beta^{commit}"
git ls-remote --tags origin "android-v0.9.0-beta*"
```

Exécuter sur `main` revue, pas une autre branche locale. Conserver le SHA pour
fdroiddata et vérifier le workflow **Android Beta** dans GitHub Actions.
Un échec de CI bloque la livraison. Les tags Android conservent les artefacts
CI ; le workflow actuel ne crée pas de GitHub Release pour eux et ne soumet
aucune demande à F-Droid.

## Première inclusion dans le catalogue officiel

1. Publier le code et les métadonnées revus. Le tag doit inclure cette
   préparation, pas un ancien build sans métadonnées. Ne jamais réutiliser un tag.
2. Exécuter le vérificateur avec `--tag android-v0.9.0-beta`, ou la version
   réelle après mise à jour des champs et notes.
3. Ouvrir une demande **Requests For Packaging** ou une proposition
   **fdroiddata** selon la procédure officielle ci-dessous. Copier la recette
   dans le répertoire `metadata` de fdroiddata.
4. Fixer le `commit` du premier build au **SHA complet** du tag publié.
   Le tag de la recette locale est une référence de préparation. F-Droid
   recommande un SHA complet pour le build initial ; ne pas utiliser `main`.
5. Sous Linux, avec fdroidserver et son environnement de construction, lancer
   `fdroid lint org.bricohams.radio`,
   `fdroid checkupdates org.bricohams.radio` et
   `fdroid build --server org.bricohams.radio:12`. Corriger les vrais problèmes
   du scanner/de compilation sans exclusions générales.
6. Fournir licences et provenance figurant dans
   [NOTICE.txt](../../../android/app/src/main/assets/NOTICE.txt). Confirmer
   les droits de redistribution du logo. Vérifier la classification des
   services externes et les critères d'ancienneté/utilisateurs du projet.
   F-Droid gère la revue, la file de compilation et la publication.

La recette retire uniquement les anciens APK et les dossiers de firmware
sans rapport avec l'application du checkout isolé de compilation. Elle ne
supprime aucun fichier du développeur ni aucune sauvegarde utilisateur.
Pas de `scanignore` général ni de téléchargement de SDK propriétaire dans l'app.

## Mises à jour indépendantes du site Web

Le Web utilise `v...` ; Android utilise `android-v...` :

```yaml
AutoUpdateMode: Version
UpdateCheckMode: Tags ^android-v[0-9]+[.][0-9]+[.][0-9]+(-beta[0-9]*)?$
```

`UpdateCheckData` lit `versionCode` et `versionName` dans le fichier Gradle
du tag. Une publication Web ne déclenche pas de mise à jour Android.

Pour chaque publication Android :

1. **Toujours augmenter `versionCode`**, par exemple de 12 à 13. Modifier
   seulement `versionName` ne permet pas la mise à jour.
2. Actualiser les quatre fiches/notes et la recette locale. Les versions
   restent dans [build.gradle.kts](../../../android/app/build.gradle.kts).
3. Exécuter tests, lint et vérificateur. Tester le matériel réel si USB,
   audio ou émission changent.
4. Publier un tag immuable `android-v` suivi exactement de `versionName`.
   La CI rejette les tags incohérents.
5. **Après l'inclusion initiale**, F-Droid détecte les tags et peut ajouter
   un build, compiler, signer et indexer. Ce n'est ni immédiat ni une garantie
   d'acceptation. Les changements de SDK/dépendances/recette peuvent exiger une intervention.

Aucun téléchargeur d'APK ni auto-updater n'est ajouté à Bricohams. Le client
F-Droid vérifie et notifie. L'installation sans intervention dépend d'Android,
des réglages et de l'intégration/des autorisations de l'installateur ; une
application ordinaire ne peut pas garantir les mises à jour silencieuses.

## Signatures et données

Pour la première inclusion, il est proposé que F-Droid compile et signe son
canal. Aucune clé privée Bricohams ne doit être partagée. Un canal amont avec
la même signature exigerait une validation séparée de builds reproductibles ;
la reproductibilité bit à bit n'est pas affirmée ici.

Les APK debug actuels et un futur APK F-Droid ont des signatures différentes.
**Android ne peut pas les mettre à jour directement d'un canal à l'autre.**
Exporter les contacts et les autres données exportables ; noter les réglages
sans export. Désinstaller efface les données locales. Conserver les
enregistrements/fichiers utiles et vérifier la restauration avant de retirer
une installation importante. Les versions F-Droid suivantes doivent garder sa clé.

L'identifiant reste `org.bricohams.radio` : aucune duplication, installation
simultanée de canaux ou modification de base de données n'est introduite.

## Installation utilisateur et vérifications finales

Uniquement après publication, actualiser les dépôts du client F-Droid et
chercher **Bricohams**, identifiant `org.bricohams.radio`. Vérifier le lien
vers les sources et la version. Ce guide n'annonce pas une fiche déjà publiée.
Ne pas ajouter de dépôts inconnus ni installer un APK non signé. En cas de
signature incompatible, exporter d'abord ; ne jamais désinstaller en premier recours.

Après installation/mise à jour, vérifier langue, thème, carnets et restauration
d'une copie de test. Vérifier la carte hors ligne et, facultativement,
l'actualisation des données satellites en ligne. Tester USB en lecture avec
du matériel compatible. Ne pas émettre ni écrire des canaux pour vérifier
une installation depuis la boutique.

## Incidents et liste de clôture

| Incident | Action |
| --- | --- |
| Gradle sélectionne Java 8 ou ne trouve pas le SDK | Vérifier `JAVA_HOME`, `ANDROID_HOME`, installation/licences et réessayer dans un nouveau terminal. |
| Le vérificateur rejette version, langue ou tag | Actualiser Gradle, recette et notes dans les quatre langues ; ne pas ignorer le contrôle. |
| Tag présent mais aucune mise à jour F-Droid | Vérifier inclusion initiale, filtre, `versionCode` supérieur, CI et état de compilation/indexation F-Droid. Ne pas déplacer le tag ni promettre de délai. |
| Le scanner bloque une dépendance ou ressource | Fournir source/licence ou corriger le problème réel, sans exclusions générales. |
| Android rejette la signature | Exporter et vérifier les données avant de changer de canal ; `versionCode` ne remplace pas une signature. |

Clôture : code/tag publiés, première recette fixée au SHA, CI correcte,
validation/revue F-Droid acceptées, fiche indexée, signature conservée et
mise à jour depuis une version antérieure vérifiée. Consigner séparément les
étapes restantes : produire un APK local ne suffit pas à clore cette liste.

## Références officielles

- [Fin de support Xamarin, Microsoft](https://dotnet.microsoft.com/en-us/platform/support/policy/xamarin)
- [.NET MAUI, Microsoft](https://learn.microsoft.com/dotnet/maui/what-is-maui)
- [Politique d'inclusion F-Droid](https://f-droid.org/docs/Inclusion_Policy/)
- [Métadonnées et mises à jour](https://f-droid.org/docs/Build_Metadata_Reference/)
- [Descriptions et ressources localisées](https://f-droid.org/docs/All_About_Descriptions_Graphics_and_Screenshots/)
- [Requests For Packaging](https://gitlab.com/fdroid/rfp/-/issues)
- [Recettes officielles fdroiddata](https://gitlab.com/fdroid/fdroiddata)
