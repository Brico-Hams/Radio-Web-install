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
6. **Pages**: copia `radicodex-update.json`, `precompiled/*.sig` y `precompiled/SHA256SUMS*` a la rama principal; `pages.yml` publica `ota.html`. Requiere Pages activado y la variable `PAGES_SHARED_ORIGIN_ACCEPTED=true` (o repo `<org>.github.io`) y `PAGES_ORIGIN`. La app usa como respaldo el asset fijo `releases/download/radicodex-ota/radicodex-update.json` (no depende de «Latest»; lo sube `android.yml`). Las releases `android-v*` y `fw-*` se crean con `--latest=false`; solo `v*` es Latest.
7. **F-Droid**: MR en fdroiddata segun `android/FDROID.md`.

## Refrescar el catalogo de firmware

Si cambian los parches o el toolchain, `bricohams-firmware.yml` falla en "Verify release firmware matches the web and installer catalog" (ardf, satellite, spectrum). El catalogo debe generarse con el mismo toolchain que CI: **Arm GNU 13.3.rel1** (`ARM_GCC` del workflow); una compilacion local con otra version (p. ej. 14.2.Rel1) produce binarios distintos.

1. Actions → *Bricohams firmware* → *Run workflow* en la rama con `refresh_catalog` activado (solo omite la verificacion; nunca en etiquetas `v*`).
2. Descarga los artefactos `bricohams-firmware-<variante>` y copialos a `firmware-builds/<lote>/<variante>/artifacts/`.
3. Actualiza el SHA-256 fijado y el lote de cada variante en `scripts/publish-firmware.cjs` y ejecuta `node scripts/publish-firmware.cjs`.
4. Revisa y haz commit de `precompiled/` (y firmas, paso 3 de arriba), y ejecuta `npm test`.
5. Crea la etiqueta `v*`: la verificacion debe pasar con el catalogo nuevo.
