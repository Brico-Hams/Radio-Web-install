# Clientes Android, iPhone e iPad

La consola HTML5/JavaScript es compartida con proyectos Capacitor 8.6.2.
Android apunta a móviles y tablets (Android 7/API 24 o posterior); el proyecto
Apple es universal para iPhone/iPad y requiere iOS/iPadOS 15 o posterior.

Esto prepara **clientes del host**, no un agente Android USB OTG. No equivale
a audio, transmisión digital, fonía ni CW remoto terminados.

## Construcción Android

Con Node.js 22, JDK 21 y Android SDK Platform 36 (Gradle selecciona build-tools 35):

```powershell
Set-Location apps\web-console
npm ci
npm run build
npx cap sync android
Set-Location android
.\gradlew.bat --no-daemon assembleDebug lintDebug
```

En Linux/macOS utiliza `./gradlew` en lugar de `gradlew.bat`. Configura
`JAVA_HOME` y `ANDROID_HOME` en tu entorno. No guardes rutas del SDK, archivos
`local.properties`, claves ni keystores en Git.

El APK de desarrollo se genera en
`apps/web-console/android/app/build/outputs/apk/debug/app-debug.apk`.
Usa identificador `org.bricohams.remotestation.debug` y versión experimental,
distintos de una futura publicación de producción. **Una firma debug no es una
distribución final**: faltan clave de publicación custodiada, recursos definitivos,
pruebas Android/tablet y aceptación RF. No se suministran claves privadas.

Se ha compilado el APK experimental en Windows, ejecutado `lintDebug` y
verificado su firma debug y manifiesto empaquetado. No se ha instalado en un
dispositivo/emulador ni validado audio o radio. El APK admite los tamaños de
pantalla small/normal/large/xlarge; eso no sustituye pruebas de UX en tablet.

## iPhone e iPad

Los fuentes nativos están en `apps/web-console/ios/App`. En macOS con Xcode:

```sh
npm ci
npm run build
npx cap sync ios
npx cap open ios
```

Selecciona el equipo de firma, bundle ID definitivo y dispositivo/simulador en
Xcode. El proyecto configura ambas familias de dispositivo y orientaciones para
tablet. La resolución Swift Package Manager, compilación y firma deben ejecutarse
en macOS; preparar el proyecto desde Windows no demuestra una compilación iOS.
No se declara un IPA firmado ni publicación en App Store.

## Conexión segura

Introduce en la app la dirección HTTPS del **host/coordinador**, no la del agente,
y el token de tu rol. Ambos quedan en memoria; cerrar la app exige introducirlos
de nuevo. La API rechaza HTTP remoto, cookies y redirecciones automáticas.
Configura en el host los orígenes nativos de la
[guía HTTPS](despliegue-seguro.md). Usa certificados confiables para el dispositivo;
no hay excepciones de certificado ni botón para ignorar TLS.

Android desactiva tráfico HTTP claro, contenido mixto, backup y transferencia de
datos entre dispositivos mediante reglas explícitas. iOS conserva la política
de transporte segura por defecto. Android declara RECORD_AUDIO y
MODIFY_AUDIO_SETTINGS; Capacitor tramita el permiso runtime solo al preparar
el micrófono. iOS tiene NSMicrophoneUsageDescription. No se solicitan permisos
USB ni almacenamiento que aún no se utilicen.
La descarga ADIF y el ciclo de vida de WebView requieren aceptación nativa;
las pruebas web no certifican el guardado de archivos en Android/iOS.

## Funciones de operación y pendientes

El [panel de rotor](control-rotores.md) comparte backend y controles en todos los
clientes: posición, objetivo, renovación de sesión y parada al perder foco.
Las pruebas de componentes no certifican el ciclo de vida nativo de cada WebView
ni una parada física; las protecciones locales siguen siendo necesarias.
También se comparte el [panel de ajustes por modelo](control-potencia-acoplador.md):
IC-7300 RF PWR CAT/insertar/bypass y FTX-1 consigna PC field/SPA-1, con
unidades distintas y límites locales/de cabezal. Exige lectura antes de ajustar
y bloquea tras error hasta volver a consultar.
El panel de [frecuencia/modo FTX-1](control-frecuencia-modo.md) también es común:
MAIN/SUB explícito, lectura previa y opt-ins locales independientes. Compartir
el código no acredita validación nativa ni disponibilidad de todos los modos.
El panel [PTT FTX-1](ptt-ftx1.md) comparte pulsación mantenida táctil/teclado,
STOP y lease. Está desactivado localmente por defecto; admite
[micrófono TX experimental](audio-tx.md) con opt-in separado, no CW,
y requiere todavía aceptación nativa y RF.

- WSJT-X: se consulta la telemetría pasiva del agente; el motor se instala en la
  estación. No hay codificación, audio ni TX digital integrados en estos clientes.
- Audio RX: [captura host y reproducción AudioWorklet experimentales](audio-rx.md),
  iniciadas por gesto del usuario; sin validación USB ni reproducción nativa móvil.
  No requiere capturar el micrófono del cliente.
- SSB/fonía TX: captura/flujo PCM autenticado y permisos preparados, DAC explícito,
  silencio ligado a PTT y parada ante pérdida de audio; falta aceptación de
  rutas USB, niveles, ciclo de vida móvil e interlocks físicos.
- Llave virtual CW en web, Android, iPhone e iPad: debe controlar un backend
  seguro con pérdida de sesión/soltado de tecla y límites temporales; no se
  presenta un oscilador local ni un botón decorativo como CW remoto.
- Otros acopladores y amplificadores independientes: pendientes, condicionados
  a controladores documentados y límites mecánicos/RF configurados en el agente.
  No se presupone que cualquier acoplador tenga CAT ni una escala de potencia
  idéntica entre transceptor y amplificador.

Las pruebas físicas se reservan para la aceptación final; el desarrollo y las
pruebas de software pueden continuar sin declarar esas funciones operativas.
