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

## Repositorio F-Droid propio (CI)

`.github/workflows/fdroid.yml` publica un repositorio F-Droid con las APK firmadas de GitHub Releases (sabor `github`, las mismas de `android-v*`, con actualizador OTA):

- Tras cada compilacion correcta de una etiqueta `android-v*` (o a mano en `main`), `scripts/build-fdroid-repo.sh` descarga las APK de las 3 ultimas versiones estables, comprueba su SHA-256, genera el indice con fdroidserver y lo firma con la clave del repositorio.
- El resultado se sube como `fdroid-repo.tar.gz` a la release fija `fdroid-repo`; `pages.yml` (sin secretos) lo sirve en `https://brico-hams.github.io/Radio-Web-install/fdroid/repo`. La pagina `/fdroid/` muestra la direccion y la huella.
- En cada push que toque F-Droid, el job `dry-run` construye el repositorio con una clave desechable y `lint` pasa `fdroid lint` a la receta.

Clave del repositorio (una sola vez, fuera del repo; no se puede cambiar sin que los usuarios vuelvan a anadir el repositorio):

```
keytool -genkeypair -keystore radicodex-fdroid.p12 -storetype PKCS12 -alias radicodex-fdroid -keyalg RSA -keysize 4096 -validity 10000 -dname "CN=RadiCodex F-Droid repo, O=BricoHams, C=ES"
gh secret set FDROID_KEY_ALIAS -R Brico-Hams/Radio-Web-install --body radicodex-fdroid
gh secret set FDROID_KEYSTORE_PASS -R Brico-Hams/Radio-Web-install
gh secret set FDROID_KEY_PASS -R Brico-Hams/Radio-Web-install
base64 -w0 radicodex-fdroid.p12 | gh secret set FDROID_KEYSTORE_BASE64 -R Brico-Hams/Radio-Web-install
```

En PKCS12 la contrasena de la clave es la del almacen: usa la misma en los dos secretos. Guarda el `.p12` en tu copia de seguridad. Despues, Actions -> F-Droid -> Run workflow (rama `main`).

Firma: el F-Droid oficial firma con su clave sus propias compilaciones del sabor `fdroid`; esas APK y las de este repositorio no se actualizan entre si (firma distinta). `AllowedAPKSigningKeys` solo sirve si se publica una APK firmada del sabor `fdroid` identica a la que compila F-Droid; las releases actuales son del sabor `github`, por eso no se usa.

## Pasos de envio

1. Publica la etiqueta `android-v<version>` y resuelve el commit.
2. Haz fork de `https://gitlab.com/fdroid/fdroiddata`.
3. Copia `fdroid/metadata/org.bricohams.radicodex.yml` a `metadata/org.bricohams.radicodex.yml` del fork; usa `gradle: - fdroid` y el SHA completo del commit.
4. Valida con `fdroid lint org.bricohams.radicodex` y `fdroid build -v -l org.bricohams.radicodex`.
5. Abre el Merge Request y atiende la revision.
6. Opcional, builds reproducibles con tu firma: obten el SHA-256 del certificado (`scripts/sign-release.ps1` lo imprime), ponlo en `AllowedAPKSigningKeys` y publica el APK `github` firmado; F-Droid lo comparara con su compilacion y distribuira tu firma.

Pipeline completo: `docs/RELEASE.md`.
