# Android independiente y preparación para F-Droid

[Español](FDROID.md) · [English (US)](i18n/en/FDROID.md) · [Français](i18n/fr/FDROID.md) · [Deutsch](i18n/de/FDROID.md)

Guía del mantenedor y del usuario, revisada el 28-10-2026. **Preparado
localmente no significa publicado ni aceptado por F-Droid.**

## Decisión tecnológica

| Opción | Evaluación para Bricohams |
| --- | --- |
| Xamarin / Xamarin.Forms | Descartado: Microsoft terminó el soporte el 1 de mayo de 2024. Su último SDK Android se limita a API 34. |
| .NET for Android / .NET MAUI | Alternativa vigente para nuevos desarrollos C# o interfaces compartidas entre plataformas. Migrar esta aplicación exigiría portar y volver a probar USB, audio, GPS, almacenamiento e interfaz. No simplifica por sí solo la inclusión en F-Droid. |
| Flutter / React Native | Permiten compartir interfaz, pero aquí requerirían migración y puentes nativos para radio y audio. No aportan una ventaja demostrada frente al código existente. |
| Kotlin nativo, implementación actual | Recomendado: acceso directo a USB Host, audio y GPS, aplicación pequeña, herramientas estándar y pruebas existentes. No necesita Google Play Services, una cuenta, publicidad ni telemetría. |

Se mantiene la aplicación Android independiente. No se convierte en un WebView
de la web ni se reescriben los protocolos de radio. Web y escritorio continúan
con su implementación actual; compartir marca y traducciones no obliga a
compartir todos los componentes de interfaz.

## Material preparado

- [Receta candidata](../fdroid/metadata/org.bricohams.radio.yml), para trasladar
  al proyecto **fdroiddata**, no para subir una APK debug al catálogo oficial.
- [Ficha de tienda](../fastlane/metadata/android) en español, inglés de
  Estados Unidos, francés y alemán, con marca Bricohams, límites reales,
  privacidad y notas por `versionCode`.
- [Comprobador local](../scripts/check-android-store.cjs) y
  [pruebas](../tests/android-store.test.cjs) de versiones, etiquetas,
  traducciones y límites de longitud.
- [CI Android](../.github/workflows/android.yml): valida metadatos,
  compila/lintea release y conserva una APK **release sin firmar** separada
  de las APK debug. La receta oficial compila el código fuente, no utiliza
  ese artefacto de CI.

La receta inicial sigue `0.8.3-beta` / `versionCode 12`. La etiqueta propuesta
`android-v0.8.3-beta` todavía debe publicarse con estos cambios. No se ha
solicitado ni obtenido la inclusión en F-Droid y no se ha creado un repositorio
F-Droid propio. No se ha ejecutado `fdroid build --server` en este Windows;
compilar con Gradle y comprobar metadatos no equivale a pasar esa validación.

## Compilación y comprobaciones locales

Desde la raíz del proyecto en PowerShell, con JDK 17 y SDK 35 configurados:

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

Las tres variables deben apuntar a instalaciones existentes. Si no están
definidas, configura primero JDK 17 y Android SDK Platform 35, Platform Tools
y Build Tools 34.0.0/35.0.0, y acepta las licencias del SDK. Reinicia las
terminales tras cambiar variables persistentes. No instales ni selecciones
Xamarin. Un Java 8 anterior en `PATH` no es adecuado para Gradle; el comando
explícito anterior permite comprobar el JDK seleccionado por `JAVA_HOME`.
Si faltan dependencias Node, usa `npm ci` con el lockfile del proyecto.

La salida release es
[app-release-unsigned.apk](../android/app/build/outputs/apk/release/app-release-unsigned.apk).
No está firmada, no es instalable tal cual y no debe presentarse como una
APK oficial de F-Droid. La configuración de compilación no incluye claves
ni contraseñas de distribución.

La preparación se ha comprobado localmente con 130 pruebas Android y cuatro
pruebas de metadatos, release compilada y lint sin errores (199 advertencias).
La revisión de la infraestructura F-Droid, las pruebas
en dispositivos y la aprobación editorial siguen siendo pasos separados.

## Publicar código y etiqueta: operación del mantenedor

Estos comandos **publican**, no son pasos ejecutados por esta guía. Requieren
permisos sobre el repositorio y una revisión previa de todos los archivos
que se van a confirmar. Desde la raíz, comprobar primero:

```powershell
git status --short
git diff --check
git diff
git fetch origin
git log --oneline HEAD..origin/main
```

Si hay cambios remotos, intégralos y repite las pruebas antes de continuar.
No usar push forzado. Preparar con `git add` únicamente los archivos
revisados, inspeccionar `git diff --cached` y crear el commit:

```powershell
git commit -m "Prepare independent Android distribution for F-Droid" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
node scripts\check-android-store.cjs --tag android-v0.8.3-beta
git tag --list android-v0.8.3-beta
```

Si la etiqueta ya existe, **detenerse**: no borrarla ni moverla. Para una
versión diferente, sustituir el ejemplo por `android-v` + `versionName`
después de actualizar versión, código y metadatos.

```powershell
git push origin main
git tag -a android-v0.8.3-beta -m "Bricohams Android 0.8.3-beta"
git push origin android-v0.8.3-beta
git rev-parse "android-v0.8.3-beta^{commit}"
git ls-remote --tags origin "android-v0.8.3-beta*"
```

Ejecutar sobre `main` revisada; no confundirla con otra rama local. Conservar
el SHA resuelto para la receta de fdroiddata y verificar el workflow
**Android Beta** en GitHub Actions. Un fallo de CI bloquea la entrega.
Las etiquetas Android conservan artefactos de CI, pero el flujo actual no
crea una GitHub Release para ellas ni envía una solicitud a F-Droid.

## Primera inclusión en el catálogo oficial

1. Revisar y publicar el código y los metadatos de esta preparación. La
   etiqueta Android debe apuntar a ese código publicado, no a una compilación
   antigua sin los metadatos. No reutilizar ni mover etiquetas ya publicadas.
2. Ejecutar el comprobador con `--tag android-v0.8.3-beta`. Si se decide
   publicar otra versión, actualizar primero versión, código, receta y notas.
3. Abrir una solicitud en **Requests For Packaging** o una propuesta en
   **fdroiddata**, siguiendo el procedimiento vigente enlazado al final.
   Copiar la receta candidata a la carpeta `metadata` de fdroiddata.
4. Resolver `commit` de la primera entrada al **SHA completo** de la etiqueta
   publicada. La etiqueta de la receta es una referencia de preparación;
   F-Droid recomienda fijar el primer build a un SHA. No usar `main`.
5. En Linux con fdroidserver y su entorno de construcción, ejecutar
   `fdroid lint org.bricohams.radio`,
   `fdroid checkupdates org.bricohams.radio` y
   `fdroid build --server org.bricohams.radio:12`. Corregir cualquier hallazgo
   real del escáner o del entorno, sin exclusiones generales del análisis.
6. Facilitar a los revisores las licencias y procedencia enumeradas en
   [NOTICE.txt](../android/app/src/main/assets/NOTICE.txt). Confirmar el derecho a
   redistribuir el logotipo. Revisar la clasificación de los servicios de
   datos externos y los requisitos de antigüedad/usuarios del proyecto.
   La revisión, cola de compilación y publicación dependen de F-Droid.

La receta elimina del checkout aislado de construcción únicamente los APK
históricos y los directorios de firmware ajenos a la aplicación. No borra
archivos del repositorio del desarrollador ni elimina respaldos del usuario.
No se añaden `scanignore` generales ni se descargan SDK propietarios dentro
de la aplicación.

## Actualizaciones independientes de la web

La web usa etiquetas `v...`; Android usará `android-v...`. La receta combina:

```yaml
AutoUpdateMode: Version
UpdateCheckMode: Tags ^android-v[0-9]+[.][0-9]+[.][0-9]+(-beta[0-9]*)?$
```

`UpdateCheckData` lee `versionCode` y `versionName` del archivo Gradle del
commit etiquetado. Una publicación web no genera una actualización Android.

Para cada nueva publicación Android:

1. Aumentar **siempre** `versionCode`; modificar solamente `versionName` no
   permite actualizar. Por ejemplo, después de 12 usar 13 para una nueva APK.
2. Actualizar las cuatro fichas/notas y la receta candidata local. El código
   de la aplicación permanece en
   [build.gradle.kts](../android/app/build.gradle.kts).
3. Ejecutar pruebas, lint y comprobador. Revisar hardware real cuando cambien
   funciones USB, audio o transmisión.
4. Publicar una etiqueta inmutable `android-v` seguida exactamente de
   `versionName`. CI rechaza etiquetas que no coincidan.
5. **Tras la inclusión inicial**, las tareas de F-Droid detectan la etiqueta
   y pueden generar la siguiente entrada de build, compilar, firmar e
   indexar. No son un despliegue inmediato ni garantizan aceptar cada build.
   Los cambios de SDK, dependencias o receta pueden necesitar intervención.

No se añade un servicio periódico ni un descargador de APK dentro de
Bricohams. El cliente F-Droid gestiona las comprobaciones y notificaciones.
La instalación automática sin intervención depende del Android del usuario,
de su configuración y de los permisos/integración del instalador; una app
normal no puede garantizar actualizaciones silenciosas.

## Firmas y datos

Para la primera inclusión se propone que F-Droid compile y firme su canal.
No necesita recibir una clave privada de Bricohams. Un canal propio con la
misma firma requeriría estudiar y verificar primero builds reproducibles;
no se afirma reproducibilidad bit a bit en esta preparación.

Las APK debug actuales y una futura APK firmada por F-Droid tienen
identidades de firma distintas. **Android no permite actualizar entre ellas
como si fueran el mismo canal.** Exportar primero contactos y los demás
datos que permita exportar la aplicación; anotar los ajustes que no tengan
exportación. Desinstalar elimina los datos locales. Conservar los
archivos de audio/exportación que se quieran mantener y comprobar la
restauración antes de retirar una instalación importante. Una vez en el
canal F-Droid, sus versiones posteriores deben mantener su firma.

El identificador sigue siendo `org.bricohams.radio`: no se duplica la app,
no se promete instalación simultánea de canales y no se modifica una base
de datos para esta preparación.

## Instalación por el usuario y comprobación final

Solo después de la publicación, actualizar los repositorios del cliente
F-Droid y buscar **Bricohams**, identificador `org.bricohams.radio`.
Contrastar el enlace al código fuente y la versión; esta guía no anuncia una
ficha ya disponible. No añadir repositorios desconocidos ni instalar una
APK sin firmar. Si Android rechaza la firma, seguir la copia/exportación
anterior: nunca desinstalar como primer intento.

Tras instalar o actualizar, comprobar idioma, tema, apertura de libros y
restauración de una copia de prueba. Verificar el mapa sin conexión y,
si se desea, la actualización de datos satelitales con red. Probar USB
inicialmente en lectura con hardware compatible; no transmitir ni escribir
canales para comprobar una instalación de tienda.

## Incidencias y lista de cierre

| Incidencia | Acción |
| --- | --- |
| Gradle arranca con Java 8 o no encuentra el SDK | Comprobar `JAVA_HOME`, `ANDROID_HOME`, instalación/licencias y repetir en una terminal nueva. |
| El comprobador rechaza versión, traducción o etiqueta | Actualizar Gradle, receta y notas en los cuatro idiomas; no omitir la comprobación. |
| La etiqueta existe pero F-Droid no muestra una actualización | Confirmar inclusión inicial, filtro de etiqueta, `versionCode` mayor, CI y estado de compilación/indexación en F-Droid. No mover la etiqueta ni prometer plazos. |
| El escáner de F-Droid bloquea una dependencia o recurso | Aportar fuente/licencia o corregir el problema real; no ocultarlo con exclusiones generales. |
| Android rechaza la firma | Exportar y comprobar datos antes de cambiar de canal; no se puede sustituir una firma con `versionCode`. |

Cierre del mantenedor: código y etiqueta publicados, SHA fijado en la primera
receta, CI correcta, validación F-Droid y revisión aceptadas, ficha indexada,
firma persistente y actualización desde una versión anterior comprobada.
Registrar por separado lo pendiente: no presentar esta lista como completada
solo por haber generado una APK local.

## Referencias oficiales

- [Fin de soporte de Xamarin, Microsoft](https://dotnet.microsoft.com/en-us/platform/support/policy/xamarin)
- [.NET MAUI, Microsoft](https://learn.microsoft.com/dotnet/maui/what-is-maui)
- [Política de inclusión de F-Droid](https://f-droid.org/docs/Inclusion_Policy/)
- [Metadatos y actualizaciones](https://f-droid.org/docs/Build_Metadata_Reference/)
- [Descripciones y recursos localizados](https://f-droid.org/docs/All_About_Descriptions_Graphics_and_Screenshots/)
- [Solicitud de empaquetado](https://gitlab.com/fdroid/rfp/-/issues)
- [Recetas oficiales fdroiddata](https://gitlab.com/fdroid/fdroiddata)
