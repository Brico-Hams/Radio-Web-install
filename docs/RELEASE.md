# Pipeline de publicacion

Todos los secretos se leen de variables de entorno, prompts o rutas fuera del repositorio. Nunca se escriben en el repo.

1. **Compilar y probar**: `npm test`; `android\gradlew.bat -p android :app:testGithubDebugUnitTest :app:testFdroidDebugUnitTest`.
2. **Firmar el APK** (sabor `github`): `powershell -File scripts\sign-release.ps1`. Pide keystore, alias y contrasenas, verifica con `apksigner` e imprime los SHA-256 del APK y del certificado. Salida: `android/app/build/outputs/apk/github/release/app-github-release.apk`.
3. **Firmar los firmwares**:
   - Una vez: `node scripts/sign-firmware.cjs keygen --private <ruta fuera del repo>`; pega la clave publica en `PUBLIC_KEY_HEX` de `firmware-signature.js`.
   - Cada release: `node scripts/sign-firmware.cjs sign --dir precompiled --key-file <ruta>` (o `BRICOHAMS_FW_SIGNING_KEY`). Genera `<archivo>.sig`, `SHA256SUMS` y `SHA256SUMS.sig`. Comprueba con `verify`.
   - El instalador web rechaza firmware con firma invalida y muestra "Firma verificada".
4. **Manifiesto OTA firmado**: `node scripts/ota-manifest.cjs` (ver `android/OTA.md`; clave OTA distinta de la de firmware). Produce `radicodex-update.json`.
5. **GitHub Release**: etiqueta `android-v<version>`; sube APK firmado, `radicodex-update.json`, `SHA256SUMS*` y las firmas.
6. **Pages**: copia `radicodex-update.json`, `precompiled/*.sig` y `precompiled/SHA256SUMS*` a la rama principal; `pages.yml` publica `ota.html`. Requiere Pages activado y la variable `PAGES_SHARED_ORIGIN_ACCEPTED=true` (o repo `<org>.github.io`) y `PAGES_ORIGIN`. La app usa el asset del Release como respaldo.
7. **F-Droid**: MR en fdroiddata segun `android/FDROID.md`.
