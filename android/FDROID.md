# RadiCodex en F-Droid

## Sabores de compilacion

| Sabor | Uso | OTA | `REQUEST_INSTALL_PACKAGES` |
|---|---|---|---|
| `fdroid` | Recipe de F-Droid | No (el actualizador no esta activo) | Eliminado (`AndroidManifest.fdroid.xml`, `tools:node="remove"`) |
| `github` | APK firmado de GitHub Releases | Si, manifiesto firmado | Presente |

- `./gradlew :app:assembleFdroidRelease` y `:app:assembleGithubRelease`.
- El unico trafico de red es el iniciado por el usuario (TLE/SatNOGS). El dialogo "Novedades" se mantiene en ambos sabores.

## Compilacion reproducible

- Sin marcas de tiempo en `BuildConfig`; `vcsInfo` y `dependenciesInfo` desactivados.
- Dependencias con version fija; Gradle 8.9 con `distributionSha256Sum` en `gradle-wrapper.properties`.
- Pendiente (propietario): `./gradlew --write-verification-metadata sha256 help` para generar `gradle/verification-metadata.xml`.

## Binarios precompilados en el arbol

| Ruta | Tratamiento |
|---|---|
| `android/gradle/wrapper/gradle-wrapper.jar` | Wrapper oficial; F-Droid acepta su checksum conocido |
| `android/Bricohams-Android/**/*.apk` | Se eliminan con `rm` en el recipe |
| `precompiled/**`, `examples/firmware/**` | Firmware de radio; se eliminan con `rm`, no los usa la app |
| `docs/media/*.mp4` | Documentacion; no entra en el APK |
| `satellite-6.0.1.js`, `orbital-engine.js` | Fuentes legibles (MIT, ver `NOTICE.txt`) |
| `ftx-ldpc174.json`, `world-land-110m.txt`, `bricohams_logo.png` | Datos / imagen |

## Metadatos fastlane

Ejecuta una vez `node scripts/prepare-fastlane-images.cjs` (crea `images/icon.png` y `phoneScreenshots/` con README en cada idioma). Las capturas se haran con el telefono real.

## Pasos de envio

1. Publica la etiqueta `android-v<version>` y resuelve el commit.
2. Haz fork de `https://gitlab.com/fdroid/fdroiddata`.
3. Copia `fdroid/metadata/org.bricohams.radicodex.yml` a `metadata/org.bricohams.radicodex.yml` del fork; usa `gradle: - fdroid` y el SHA completo del commit.
4. Valida con `fdroid lint org.bricohams.radicodex` y `fdroid build -v -l org.bricohams.radicodex`.
5. Abre el Merge Request y atiende la revision.
6. Opcional, builds reproducibles con tu firma: obten el SHA-256 del certificado (`scripts/sign-release.ps1` lo imprime), ponlo en `AllowedAPKSigningKeys` y publica el APK `github` firmado; F-Droid lo comparara con su compilacion y distribuira tu firma.

Pipeline completo: `docs/RELEASE.md`.
