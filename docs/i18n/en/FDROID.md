# Independent Android distribution and F-Droid operations

[Español](../../FDROID.md) · [English (US)](FDROID.md) · [Français](../fr/FDROID.md) · [Deutsch](../de/FDROID.md)

Maintainer and user guide, reviewed October 28, 2026. **Local preparation does
not mean the app has been published or accepted by F-Droid.**

## Technology decision

| Option | Assessment for Bricohams |
| --- | --- |
| Xamarin / Xamarin.Forms | Rejected: Microsoft ended support on May 1, 2024. The final Xamarin Android SDK targets API 34. |
| .NET for Android / .NET MAUI | A supported direction for new C# or shared cross-platform development. Migrating this application would require porting and retesting USB, audio, GPS, storage, and UI. It does not automatically simplify F-Droid inclusion. |
| Flutter / React Native | Shared UI is possible, but migration and native radio/audio bridges would be required. No demonstrated advantage over the existing code here. |
| Native Kotlin, current implementation | Recommended: direct USB Host, audio, and GPS access, a small application, standard tools, and existing tests. No Google Play Services, account, ads, or telemetry are required. |

Android remains an independent native app, not a WebView wrapper. Radio
protocols are not rewritten. Web and desktop keep their current implementation;
shared branding and translations do not require a shared UI framework.

## Prepared material and current status

- [Candidate recipe](../../../fdroid/metadata/org.bricohams.radio.yml) to submit to
  **fdroiddata**, not a debug APK to upload to the official catalog.
- [Store listing](../../../fastlane/metadata/android) in Spanish, US English, French,
  and German, with Bricohams branding, limitations, privacy, and per-code notes.
- [Local checker](../../../scripts/check-android-store.cjs) and
  [tests](../../../tests/android-store.test.cjs) for versions, tags, languages, and limits.
- [Android CI](../../../.github/workflows/android.yml) validates metadata, builds and
  lints release, and keeps an **unsigned release APK** separate from debug APKs.
  F-Droid builds the sources; it does not use this CI artifact.

The candidate is `0.8.3-beta`, `versionCode 12`. The proposed tag
`android-v0.8.3-beta` still needs publishing with this preparation. No inclusion
request or approval exists from this work, and no private F-Droid repository
has been set up. `fdroid build --server` has not been run on this Windows host.
Gradle compilation is not equivalent to F-Droid infrastructure validation.

## Local build and checks

From the repository root in PowerShell, with JDK 17 and SDK 35 installed:

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

The variables must point to existing installations. If unset, configure JDK 17,
Android SDK Platform 35, Platform Tools, and Build Tools 34.0.0/35.0.0 first;
accept the SDK licenses. Restart terminals after persistent variable changes.
Do not install or select Xamarin. Java 8 elsewhere in `PATH` is unsuitable for
this Gradle build; the explicit command checks the JDK selected by `JAVA_HOME`.
If Node dependencies are missing, use `npm ci` with the project lockfile.

Output: [app-release-unsigned.apk](../../../android/app/build/outputs/apk/release/app-release-unsigned.apk).
It is unsigned, cannot be installed as-is, and is not an official F-Droid APK.
No distribution keys or passwords are included in the build configuration.

Local validation passed 130 Android tests and four metadata tests, release
compilation, and lint with zero errors (199 warnings). Infrastructure review,
device testing, and editorial approval remain separate steps.

## Publishing source and tag: maintainer procedure

The following commands **publish changes**; this guide has not executed them.
Repository permissions and review of every staged file are required. First:

```powershell
git status --short
git diff --check
git diff
git fetch origin
git log --oneline HEAD..origin/main
```

Integrate remote changes and rerun checks before proceeding. Never force-push.
Stage only reviewed files with `git add`, inspect `git diff --cached`, then:

```powershell
git commit -m "Prepare independent Android distribution for F-Droid" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
node scripts\check-android-store.cjs --tag android-v0.8.3-beta
git tag --list android-v0.8.3-beta
```

If that tag exists, **stop**: do not delete or move it. For another version,
update the version, code, recipe, and notes before replacing the example with
`android-v` followed by the exact `versionName`.

```powershell
git push origin main
git tag -a android-v0.8.3-beta -m "Bricohams Android 0.8.3-beta"
git push origin android-v0.8.3-beta
git rev-parse "android-v0.8.3-beta^{commit}"
git ls-remote --tags origin "android-v0.8.3-beta*"
```

Run on reviewed `main`, not another local branch. Record the resolved SHA for
fdroiddata and check the **Android Beta** GitHub Actions workflow. CI failure
blocks delivery. Android tags retain CI artifacts; the current workflow does
not create a GitHub Release for them or submit anything to F-Droid.

## First inclusion in the official catalog

1. Publish reviewed source and metadata. The Android tag must include this
   preparation, not an earlier build without metadata. Never reuse tags.
2. Run the checker with `--tag android-v0.8.3-beta`, or the actual version
   after updating all version fields and notes.
3. Open a **Requests For Packaging** issue or a **fdroiddata** proposal using
   the official process below. Copy the candidate into fdroiddata's `metadata`.
4. Resolve the first build's `commit` to the published tag's **full SHA**.
   The tag in the local candidate is a preparation reference; F-Droid recommends
   a full commit SHA for the initial build. Do not use `main`.
5. On Linux with fdroidserver and its build environment, run
   `fdroid lint org.bricohams.radio`,
   `fdroid checkupdates org.bricohams.radio`, and
   `fdroid build --server org.bricohams.radio:12`. Fix actual scanner/build
   issues without blanket exclusions.
6. Provide the licenses and source provenance in
   [NOTICE.txt](../../../android/app/src/main/assets/NOTICE.txt). Confirm logo redistribution
   rights. Review external data service classification and the project's
   age/user requirements. Review, build queues, and publication belong to F-Droid.

The recipe removes only historical APKs and unrelated firmware directories
from the isolated build checkout. It does not delete developer files or user
backups. It adds no blanket `scanignore` or proprietary in-app SDK downloads.

## Updates independent of the website

Web tags use `v...`; Android uses `android-v...`:

```yaml
AutoUpdateMode: Version
UpdateCheckMode: Tags ^android-v[0-9]+[.][0-9]+[.][0-9]+(-beta[0-9]*)?$
```

`UpdateCheckData` reads `versionCode` and `versionName` from the tagged Gradle
file. A web release does not trigger an Android update.

For each Android release:

1. **Always increase `versionCode`**, for example from 12 to 13. Changing only
   `versionName` does not enable updating.
2. Update the four listings/changelogs and local candidate recipe. App version
   fields remain in [build.gradle.kts](../../../android/app/build.gradle.kts).
3. Run tests, lint, and the checker. Test actual hardware for USB/audio/TX changes.
4. Publish an immutable `android-v` tag followed by the exact `versionName`.
   CI rejects mismatched tags.
5. **After initial inclusion**, F-Droid jobs detect tags and can generate a
   build entry, compile, sign, and index updates. This is neither instantaneous
   nor guaranteed acceptance. SDK/dependency/recipe changes may need maintenance.

No background APK downloader or self-updater is added to Bricohams. The
F-Droid client checks and notifies. Unattended installation depends on the
user's Android version, settings, and installer integration/permissions; an
ordinary app cannot guarantee silent updates.

## Signing and data

For initial inclusion, F-Droid is proposed to build and sign its channel.
No Bricohams private key must be shared. A same-signature upstream channel
would require separately verified reproducible builds; bit-for-bit
reproducibility is not claimed here.

Current debug APKs and a future F-Droid-signed APK have different signing
identities. **Android cannot update directly between those channels.**
Export contacts and any other data the app supports exporting; write down
settings that cannot be exported. Uninstalling deletes local app data.
Keep required recordings/export files and verify restoration before retiring
an important installation. Later F-Droid updates must retain the channel's key.

The package remains `org.bricohams.radio`; no duplicate app, simultaneous
channel installation, or database change is introduced.

## User installation and final checks

Only after publication, refresh the F-Droid client's repositories and search
for **Bricohams**, package `org.bricohams.radio`. Check its source link and
version. This guide does not announce an already available listing. Do not
add unknown repositories or install an unsigned APK. On a signature mismatch,
follow the export procedure first; never uninstall as the first troubleshooting step.

After installation/update, check language, theme, logbooks, and a test backup
restoration. Check the offline map and, optionally, satellite data refresh
online. Start USB testing with reads on compatible hardware. Do not transmit
or write radio channels just to verify a store installation.

## Troubleshooting and completion checklist

| Issue | Action |
| --- | --- |
| Gradle selects Java 8 or cannot find the SDK | Check `JAVA_HOME`, `ANDROID_HOME`, installation/licenses, and retry in a fresh terminal. |
| Checker rejects a version, language, or tag | Update Gradle, recipe, and notes in all four languages; do not bypass the check. |
| Tag exists but no F-Droid update appears | Check initial inclusion, tag filter, increased `versionCode`, CI, and F-Droid build/index status. Do not move the tag or promise a deadline. |
| F-Droid scanner blocks a dependency or asset | Provide source/license or fix the actual problem; do not hide it with blanket exclusions. |
| Android rejects the signing identity | Export and verify data before switching channels; `versionCode` cannot replace a signature. |

Maintainer completion: source/tag published, initial recipe pinned to SHA,
CI passed, F-Droid validation/review accepted, listing indexed, signing key
retained, and upgrade from an earlier version checked. Record unfinished
steps separately; generating a local APK does not complete this checklist.

## Official references

- [Xamarin end of support, Microsoft](https://dotnet.microsoft.com/en-us/platform/support/policy/xamarin)
- [.NET MAUI, Microsoft](https://learn.microsoft.com/dotnet/maui/what-is-maui)
- [F-Droid inclusion policy](https://f-droid.org/docs/Inclusion_Policy/)
- [Metadata and updates](https://f-droid.org/docs/Build_Metadata_Reference/)
- [Localized descriptions and graphics](https://f-droid.org/docs/All_About_Descriptions_Graphics_and_Screenshots/)
- [Requests For Packaging](https://gitlab.com/fdroid/rfp/-/issues)
- [Official fdroiddata recipes](https://gitlab.com/fdroid/fdroiddata)
