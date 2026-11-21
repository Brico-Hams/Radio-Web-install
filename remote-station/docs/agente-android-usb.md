# Agente Android USB independiente / Independent USB agent

## ES — Configuración y alcance

`android/station-agent` genera un APK distinto de RadiCodex y del cliente remoto.
Marca y logo oficiales BricoHams del destino; no ejecuta un servidor en la tablet.
Android 8.0+, USB Host/OTG y permiso explícito son necesarios.

**Implementado:** enlace saliente WSS, identificación `ID0840`, inventario de la
interfaz elegida y dieciséis consultas CAT FTX-1 de solo lectura. El host decodifica
las respuestas con los parsers existentes, no confía en valores ya decodificados
por el cliente. Las consultas `TX`, `AC`, `PC` y `KS` no son órdenes de transmisión,
acoplamiento, potencia ni CW. `IF` desconocido, incluido P10=3, sigue rechazándose.

**No implementado en este agente:** ajustes, PTT, recepción/transmisión de audio,
CW, WSJT-X, rotores, acopladores ni espectro/waterfall. Tampoco se declara
aceptación USB OTG física por compilar un APK. Los agentes Python y los clientes
existentes mantienen sus funciones; el modo Android no cae silenciosamente
sobre un agente Python ni activa transmisión.

### Host

Instalar el wheel actualizado. Crear tokens aleatorios independientes de 32–256
caracteres ASCII imprimibles sin espacios. El token Android no es un token de
usuario ni de diagnóstico. No introducir secretos en URLs o argumentos:

```powershell
$env:BRICOHAM_ADMIN_TOKEN = "<token-usuario-distinto>"
$env:BRICOHAM_ANDROID_AGENT_TOKEN = "<token-exclusivo-agente>"
bricohams-station-host --host 0.0.0.0 --port 8787 --tls-cert host.crt --tls-key host.key --android-agent
```

Se exige HTTPS incluso en loopback y no se combina con `--station-agent-url`.
El certificado debe ser válido para el nombre/IP y confiable para Android; no
hay excepción de certificado ni `trust-all`, HTTP, redirección o TLS obsoleto.
La app usa el almacén de confianza predeterminado del sistema; no importa CA
privadas desde la pantalla. Usar un certificado público confiable o una
provisión de confianza del dispositivo apropiada, sin desactivar verificación.

### Android / tablet

1. Instalar el APK del **agente** y conectar la radio por OTG.
2. Introducir la URL base HTTPS del host y el token exclusivo Android.
3. Actualizar USB; elegir explícitamente el CP2105 VID `10C4`, PID `EA70`.
4. Elegir **Enhanced MI_00 / puerto 0** y **38400 / 8N1**; configurar la misma
   velocidad en la radio. No se abre el primer dispositivo ni se prueban baudios.
5. Pulsar conectar y conceder USB. El servicio foreground mantiene la conexión;
   su notificación se puede autorizar mediante el botón correspondiente.
6. Acceder desde el cliente remoto al mismo host usando un **token de usuario**.
   `/api/v1/cat` muestra catálogo; `?command=FA` solicita una lectura real.
7. Desconectar/cancelar libera recursos. Desconexión USB, error CAT/TLS o pérdida
   del host detienen el enlace. No se reabre automáticamente una radio distinta,
   no se reintenta una orden ni se restaura una sesión tras morir el proceso.

CP2105 en usb-serial-for-android 3.9.0 abre con DTR/RTS false y flujo NONE.
Se reafirma ese estado; no se reutilizan valores CDC que activan ambas líneas.
Esta revisión del código **no mide posibles pulsos eléctricos**. La aceptación
física de Android, USB, audio y RF sigue pendiente.

### Diagnóstico y privacidad

La pantalla está disponible en ES/EN/FR/PT. Registra únicamente el contrato
compartido minimizado: categoría, severidad y línea, sin URL, token, número de
serie, frecuencia, respuesta CAT o mensaje de excepción. Retención de siete
días; vista previa y borrado. El envío remoto está desactivado por defecto:
requiere consentimiento y token **diagnostic_reporter** diferente del token
Android, más `--diagnostic-report-database` en el host. Desactivar/borrar revoca
el envío. Tokens solo en memoria, fuera de backups, autofill y estado guardado.

### Protocolo y límites

- Endpoint WSS opt-in: `/api/v1/android-agent/connect`.
- Subprotocolo: `bricoham.android-agent.readonly.v1`; sin clientes de navegador
  (`Origin` rechazado), parámetros URL, compresión ni comandos arbitrarios.
- Primer mensaje `{"token":"..."}` cifrado; segundo `hello` con `identity`,
  `vid`, `pid`, `port` y `type`. Solo `ID0840;`, `0x10C4`, `0xEA70`, puerto 0.
- Un enlace por host y una consulta pendiente; ID aleatorio nuevo por consulta.
  Respuesta debe correlacionar ID y confirmar identidad. Nunca se usa una
  respuesta tardía como resultado de la consulta siguiente.
- Mensajes de 4096 bytes, 32 fragmentos y 16 controles; handshake Android de
  8192 bytes. Heartbeat y plazos acotados. Error/timeout cierra o rechaza
  explícitamente; no se devuelven datos simulados ni éxito sustitutivo.
- CAT/inventario usan permisos admin/operator existentes; el token Android
  solo autentica el enlace y no permite acceder a la API de usuario.
- En modo Android, otras rutas físicas devuelven
  `android_agent_operation_unsupported` (HTTP 501), sin proxy legado.

### Compilación y licencias

```powershell
cd android
.\gradlew.bat :station-agent:testDebugUnitTest :station-agent:lintDebug :station-agent:assembleDebug
```

Salida: `station-agent/build/outputs/apk/debug/station-agent-debug.apk`.
APK debug de integración, no una publicación firmada de producción.
CI ejecuta esos tres selectores. Se conserva la biblioteca `station-core`.

Dependencias sin código propietario incorporado:
[usb-serial-for-android 3.9.0](https://github.com/mik3y/usb-serial-for-android/tree/v3.9.0)
(Apache-2.0), [Java-WebSocket 1.6.0](https://github.com/TooTallNate/Java-WebSocket/tree/v1.6.0)
(MIT), SLF4J 2.0.6 (MIT, proveedor NOP para evitar logs de tramas). No se usa
OkHttp; el transporte elegido admite límites de payload antes del callback.

AGP 8.7 no reconoce en lint el prerrequisito dinámico USB de connectedDevice.
Se suprime únicamente `ForegroundServicePermission` en ese servicio, no se
añaden permisos de Wi-Fi/Bluetooth innecesarios. En runtime se comprueba el
permiso USB **antes** de arrancarlo; véase la
[documentación Android](https://developer.android.com/develop/background-work/services/fgs/service-types#connected-device).

## EN — Connect safely

Independent Android agent APK, **read-only FTX-1 CAT**, not the remote client.
Enable `--android-agent` on a certificate-validated HTTPS host with a separate
`BRICOHAM_ANDROID_AGENT_TOKEN`. Choose USB device, Enhanced port 0 and 38400/8N1
explicitly; grant USB, then connect. Open the remote client with a separate user
token. No automatic reconnection, RTS/DTR assertion, setters, audio, PTT, CW,
digital engine or accessories. OTG hardware acceptance remains pending.
Diagnostics are minimized, off remotely by default, and need separate consent
and reporter token. Preview/delete are available; secrets are memory-only.

## FR — Connexion sûre

APK agent indépendant, **CAT FTX-1 en lecture seule**, pas client distant.
Hôte HTTPS avec certificat vérifié, option `--android-agent` et jeton dédié
`BRICOHAM_ANDROID_AGENT_TOKEN`. Choisir USB, Enhanced port 0 et 38400/8N1,
autoriser USB puis connecter. Le client utilise un autre jeton utilisateur.
Aucune reconnexion automatique, activation RTS/DTR, émission, audio, CW,
numérique ou accessoires. Validation OTG physique en attente. Diagnostic
minimisé, consentement et jeton distincts ; aperçu/suppression disponibles.

## PT — Ligação segura

APK de agente independente, **CAT FTX-1 só de leitura**, não cliente remoto.
Host HTTPS com certificado verificado, `--android-agent` e token exclusivo
`BRICOHAM_ANDROID_AGENT_TOKEN`. Escolher USB, Enhanced porta 0 e 38400/8N1,
autorizar USB e ligar. O cliente utiliza um token de utilizador diferente.
Sem religação automática, ativação RTS/DTR, ajustes, áudio, PTT, CW, digitais
ou acessórios. Validação física OTG pendente. Diagnóstico minimizado,
consentimento e token separados, com pré-visualização e eliminação.
