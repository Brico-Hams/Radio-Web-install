# Actualizaciones OTA de RadiCodex

## Canal elegido

Principal: **GitHub Pages** (`ota.html` muestra la version, notas en 4 idiomas, SHA-256 y estado de firma):

`https://brico-hams.github.io/Radio-Web-install/radicodex-update.json`

Respaldo (la app lo usa si el principal falla por red): **asset de GitHub Release**:

`https://github.com/Brico-Hams/Radio-Web-install/releases/latest/download/radicodex-update.json`

Solo el sabor `github` incluye el actualizador; el sabor `fdroid` lo elimina junto con `REQUEST_INSTALL_PACKAGES`. Ver `docs/RELEASE.md`.

Requisito: la release de Android debe ser la marcada como **Latest** y llevar adjuntos el APK y `radicodex-update.json`. El manifiesto está firmado con Ed25519; la clave pública está embebida en la app (`OtaConfig.PUBLIC_KEY_HEX`, en `Ota.kt`). Mientras esté vacía, el canal queda desactivado y la app dice que no está configurado.

## Generar las claves (una sola vez)

```
node scripts/ota-manifest.cjs keygen --private D:\secretos\radicodex-ota.pem
```

- Escribe la clave privada (PEM) y muestra la clave pública en hexadecimal (64 caracteres). Se niega a escribir dentro del repositorio o a sobrescribir un fichero.
- Pega la clave pública en `OtaConfig.PUBLIC_KEY_HEX` y publica una versión con ella.
- Guarda la privada **fuera del repo**, con copia cifrada offline. Nunca la subas a git. Si se pierde, hay que publicar una versión nueva (instalada a mano) con otra clave pública. Si se filtra, rota la clave igual.
- Es independiente del keystore de firma del APK (que también debe custodiarse y ser siempre el mismo).

## Pasos de una release

1. Sube `versionCode` y `versionName` en `android/app/build.gradle.kts`, añade `changelogs/<versionCode>.txt` y los assets `android/app/src/main/assets/changelog-<versionCode>.{es,en,fr,de}.md` (notas dentro de la app y del manifiesto).
2. Compila y firma con el keystore de producción: `gradlew assembleRelease`.
3. Genera el manifiesto (clave por fichero o por variable de entorno con el PEM):
   ```
   node scripts/ota-manifest.cjs build --apk android\app\build\outputs\apk\github\release\app-github-release.apk --key-file D:\secretos\radicodex-ota.pem --out radicodex-update.json
   ```
   `versionCode`, `versionName` y `minSdk` se leen de `build.gradle.kts` (se pueden forzar con `--version-code`, `--version-name`, `--min-sdk`). `--url` fija la URL del APK; por defecto, `releases/download/android-v<versionName>/<nombre>.apk`. Las notas se toman de los assets `changelog-<código>.<idioma>.md` o de `--notes es=fichero.md`.
   Alternativa: `$env:RADICODEX_OTA_PRIVATE_KEY = Get-Content -Raw ...pem`.
4. Comprueba: `node scripts/ota-manifest.cjs verify --manifest radicodex-update.json --public-key <hex>`.
5. Crea la release `android-v<versionName>` en GitHub, adjunta el APK (con el mismo nombre que la URL) y `radicodex-update.json`, y márcala como Latest.

## Formato del manifiesto

```
{ "schema": 1, "package": "org.bricohams.radicodex", "versionCode": 18, "versionName": "1.1.0", "minSdk": 26,
  "apk": { "url": "https://...", "sha256": "<64 hex>", "size": 12345678 },
  "notes": { "es": "...", "en": "...", "fr": "...", "de": "..." },
  "signature": "<base64 Ed25519>" }
```

La firma cubre la forma canónica del manifiesto sin `signature`: claves ordenadas, sin espacios, solo enteros, todo carácter fuera de ASCII imprimible como `\uXXXX` en minúsculas. Si cambias la forma canónica, cámbiala en `OtaManifestParser.canonical` y en `scripts/ota-manifest.cjs` a la vez.

## Qué verifica la app antes de instalar

Descarga solo por HTTPS (también en redirecciones) y, por defecto, solo en red sin tarifa. Se rechaza todo lo que falle: firma del manifiesto, paquete, `versionCode` mayor que el instalado, `minSdk`, tamaño, SHA-256, que el APK tenga el mismo paquete y versión que el manifiesto, y que esté firmado con **el mismo certificado** que la app instalada. Después abre una sesión de `PackageInstaller`; Android pide confirmación al usuario (permiso «instalar apps desconocidas»). No hay instalaciones silenciosas.

## Privacidad

Solo se hace un GET del manifiesto (como mucho una vez al día, o al pulsar «Buscar actualizaciones»), y la descarga del APK si el usuario la pide. No se envía ningún identificador ni telemetría; el User-Agent es fijo y genérico.

## F-Droid / tiendas

Las políticas de F-Droid y Google Play desaconsejan o prohíben los autoactualizadores y `REQUEST_INSTALL_PACKAGES`. Para compilaciones de tienda, elimina el permiso y la pantalla (o deja `PUBLIC_KEY_HEX` vacío y oculta el botón) y distribuye el APK OTA solo desde GitHub.
