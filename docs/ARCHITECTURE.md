# Arquitectura de Bricohams Radio Workspace

Bricohams Radio Workspace es una aplicación web **local**. Un pequeño servidor Node.js sirve una lista cerrada de archivos estáticos y unas pocas API de solo lectura. Toda la comunicación con la radio ocurre en el navegador mediante WebUSB o Web Serial.

## Modos de ejecución

Al arrancar, `runtime-mode.js` pide `runtime.json` (ruta relativa, sin caché). Solo `{"mode":"local"}` activa el modo local; si falta, da 404, no es JSON o la página se abre como `file://`, la aplicación arranca en **modo web** sin errores. `server.cjs` lo sirve como `{"mode":"local"}` y `scripts/build-pages.cjs` genera `{"mode":"web"}` en `dist/`. La insignia superior indica «Web · GitHub Pages» o «Local · instalado».

| Aspecto | Web (Pages) | Local |
| --- | --- | --- |
| Servidor | Ninguno, solo estáticos | `server.cjs` en `127.0.0.1:8787` |
| Firmware F4HWN / ARDF K1-K5 V3 | Historial estable desde `api.github.com` de Armel y reald; el usuario carga el archivo y se verifica tamaño y SHA-256 publicado | Descarga verificada por el servidor; ARDF, versiones anteriores a v6 y SA818 solo descarga |
| Firmware OpenGD77 | Carga manual del ZIP (nombre y firma ZIP; sin hash del editor) | Descarga por el servidor |
| RadioID | Carga de `user.csv` (100 MiB, filtrado, 5 000 filas mostradas) y perfil opcional en `localStorage` | API vía servidor |
| RepeaterBook | No disponible | Token aprobado, solo en el servidor |
| Satélites | `data/satellites.json` diario (`scripts/fetch-satellites.cjs`) | TLE en directo |

Las rutas del cliente son siempre relativas. La CSP de cada HTML se declara en `<meta>`, y como un `<meta>` no admite `frame-ancestors`, `app.js` se detiene si la página está enmarcada. El origen de la web es propio (ver ADR-013).

## Vista de componentes

```mermaid
flowchart LR
  subgraph Equipo["Equipo del usuario (127.0.0.1)"]
    subgraph Navegador["Chrome / Edge de escritorio"]
      UI["app.js / radio-ui.js / planning-ui.js<br/>Interfaz"]
      CON["gd77-connector.js<br/>quansheng-connector.js"]
      TR["transports.js<br/>WebUSB / Web Serial"]
      CORE["radio-core.js<br/>CRC, tramas, permisos"]
      CP["codeplug-editor.js<br/>planning-core.js"]
      BK["backup-store.js<br/>IndexedDB + SHA-256"]
    end
    SRV["server.cjs<br/>estáticos + API"]
    FW["firmware-service.cjs<br/>catálogo y descargas verificadas"]
    DS["data-service.cjs<br/>RadioID, RepeaterBook, SatNOGS, CelesTrak"]
  end
  Radio[("Radio<br/>OpenGD77 / UV-K1 / UV-K5 V3")]
  Ext[("Proveedores oficiales<br/>GitHub Releases, opengd77.com,<br/>RadioID, RepeaterBook, SatNOGS, CelesTrak")]
  UI --> CON --> TR --> Radio
  CON --> CORE
  CON --> BK
  UI --> CP
  UI -- "fetch /api/*" --> SRV
  SRV --> FW --> Ext
  SRV --> DS --> Ext
```

## Módulos

| Archivo | Lado | Responsabilidad |
| --- | --- | --- |
| `index.html`, `opengd77.html`, `quansheng.html`, `ayuda.html` | Navegador | Esqueletos de página con `body[data-page]`, sin scripts en línea. |
| `app.js` | Navegador | Interfaz común (marca, navegación, pie), guías y página de ayuda con buscador. |
| `radio-ui.js` | Navegador | Panel de conexión, copias automáticas, historial, exportación y acciones protegidas. |
| `transports.js` | Navegador | `USBTransport` (CDC sobre WebUSB, `1FC9:0094`) y `SerialTransport` (Web Serial), con lectura exacta y tiempo límite. |
| `radio-core.js` | Navegador / Node | CRC-16/CRC-32, utilidades binarias, permisos de escritura y SHA-256. |
| `gd77-connector.js` | Navegador | Protocolo OpenGD77 CPS (`C`/`R`/`W`/`X`) y mapas MK22, STM32 y SERIAL. |
| `quansheng-connector.js` | Navegador | Protocolo UART F4HWN (ofuscación XOR, CRC), lectura de calibración y Flash, slots Multiboot. |
| `backup-store.js` | Navegador | Persistencia en IndexedDB, relectura verificada y exportación `.rwb.json`. |
| `codeplug-editor.js` | Navegador / Node | Lectura y escritura binaria del codeplug OpenGD77: canales, contactos y bloque SAT tipo 3. |
| `planning-core.js` | Navegador / Node | Filtros, deduplicación, CSV, validación de TLE y pases SGP4 con `satellite.js`. |
| `planning-ui.js` | Navegador | Panel «Codeplug: contactos, repetidores y SAT». |
| `firmware-catalog.js` | Navegador / Node | Modelos y fuentes de firmware permitidas. |
| `server.cjs` | Node | Servidor HTTP en `127.0.0.1:8787`, lista de archivos permitidos, cabeceras de seguridad y enrutado de `/api/*`. |
| `firmware-service.cjs` | Node | Consulta a GitHub Releases y opengd77.com con redirecciones controladas, límites de tamaño y caché. |
| `runtime-mode.js` | Navegador | Detecta el modo (`runtime.json`; web si falta). |
| `radioid-csv.js` | Navegador / Node | Lectura filtrada de `user.csv` y perfil local opcional. |
| `scripts/build-pages.cjs`, `scripts/fetch-satellites.cjs` | Node | Generan `dist/` y `data/satellites.json` para Pages. |
| `data-service.cjs` | Node | Proxy de solo lectura hacia RadioID, RepeaterBook (credenciales solo en el servidor), SatNOGS y CelesTrak. |

## Flujo de conexión y copia automática

```mermaid
sequenceDiagram
  participant U as Usuario
  participant UI as radio-ui.js
  participant C as Conector
  participant R as Radio
  participant B as backup-store.js
  U->>UI: Selecciona el modelo y pulsa Conectar
  UI->>C: open() (gesto del usuario)
  C->>R: Identificación
  C->>R: Leer calibración
  C->>B: Guardar, calcular SHA-256 y releer
  C->>R: Leer Flash o codeplug completo (según la familia)
  C->>C: Verificar CRC, tamaños y cabeceras
  C->>B: Persistir y volver a verificar los hashes
  B-->>UI: Copia completa o parcial
  UI-->>U: Permiso de escritura solo si la copia es completa
  UI->>U: Descarga automática del .rwb.json
```

Antes de cualquier escritura se relee la copia y se compara con los hashes del permiso. Desconectar la radio, cambiarla por otra o borrar la copia revoca el permiso.

## Capas de seguridad

1. **Red:** el servidor solo escucha en `127.0.0.1`, exige `Host: 127.0.0.1:<puerto>` y sirve una lista fija de archivos.
2. **Navegador:** CSP `default-src 'self'; script-src 'self'; style-src 'self'`, `Permissions-Policy`, `nosniff`, `no-referrer` y `no-store`. No se usa `eval` ni se construye HTML con datos de la radio.
3. **Equipo:** las escrituras usan un permiso *fail-closed* ligado a una copia verificada. Main nunca es destino. Borrar o restablecer exige confirmación escrita.
4. **Fuentes externas:** solo proveedores oficiales, redirecciones a hosts permitidos, límites de tamaño y SHA-256 visible. Las credenciales de RepeaterBook nunca se envían al navegador.
5. **Datos:** sin telemetría ni subidas. Las copias quedan en el IndexedDB del perfil local y se exportan a archivos del usuario.

## Limitaciones conocidas

- **OpenGD77:** no existe aquí un protocolo verificado para extraer el firmware completo del MCU. La copia se marca como **parcial** y la escritura en la radio queda bloqueada.
- **Quansheng:** la copia física completa de la Flash requiere las capacidades de lectura y CRC de F4HWN Labs v6.1+. La web implementa escritura Beta de configuración/canales con respaldo y relectura, y las imágenes Bricohams SAT incorporan CAT RX experimental. Eso no demuestra escritura persistente ni funcionamiento CAT en una radio concreta; consulta la [matriz de validación](VALIDACION-INTEGRAL-V3-ANDROID.md).
- **RepeaterBook:** requiere un token aprobado por RepeaterBook y solo está en la versión local.
- **Web:** los datos de satélites pueden tener hasta un día de antigüedad (se avisa a partir de 7 días) y firmware/RadioID se cargan a mano.
- **Hardware:** existen lecturas previas de una unidad Quansheng, pero no certifican las escrituras, el residente independiente ni la combinación actual de APK, slot SAT y teléfono. Las pruebas físicas de esta revisión están pendientes.

## Security review (SonarQube 2026-11-13)

### Corregido

**xml:S6358 – Android application backup should be disabled or restricted** (MEDIUM) — `android/app/src/fdroid/AndroidManifest.xml:6`.
- *Por qué era un fallo:* con la copia de seguridad habilitada, los datos locales (preferencias, ficheros, bases de datos) pueden exportarse a Google Cloud o por `adb backup`, o restaurarse desde una copia manipulada (CWE-922, OWASP M9/A1). El overlay `<application>` del flavor F-Droid no declaraba el atributo, así que el análisis lo veía implícito (por defecto `true`).
- *Cambio:* se añade `android:allowBackup="false"` al overlay.
- *Sin pérdida de funcionalidad:* el manifiesto principal ya declara `allowBackup="false"`, `fullBackupContent="false"` y `dataExtractionRules`; el valor fusionado no cambia. Comprobación: `manifest merger report` del flavor fdroid (`processFdroidReleaseMainManifest`) muestra `allowBackup=false`.

**xml:S5332 – Clear-text protocols should not be used** (LOW) — mismo fichero, línea 6.
- *Por qué era un fallo:* en Android < 9 `usesCleartextTraffic` es `true` implícitamente, lo que permite http sin cifrar (interceptación y manipulación, CWE-319, CWE-200).
- *Cambio:* se añade `android:usesCleartextTraffic="false"` al overlay.
- *Sin pérdida de funcionalidad:* el manifiesto principal ya lo fija a `false` y define `networkSecurityConfig`; el resultado fusionado es idéntico. Comprobación: mismo informe de fusión; el comportamiento del rotor/radios no cambia.

**kotlin:S2245 – Pseudorandom number generators (PRNGs) should not be used in security contexts** (MEDIUM) — `android/app/src/main/java/org/bricohams/radio/Rt950Protocol.kt:156`.
- *Por qué era un fallo:* `Random()` no es un generador criptográficamente seguro; si un atacante conoce o adivina su estado interno puede predecir los siguientes valores (CWE-338, CWE-330, OWASP A2 Cryptographic Failures). El valor por defecto de `Rt950Session.random` usaba `Random()`.
- *Cambio:* el valor por defecto pasa a `SecureRandom()` (`java.security.SecureRandom`, subclase de `java.util.Random`). El tipo del parámetro sigue siendo `Random`, así que los tests pueden inyectar una instancia con semilla.
- *Sin pérdida de funcionalidad:* `buildKeyFrame` sigue usando los mismos rangos (`nextInt(2)+1`, `nextInt(5)`, `nextInt(KEYS.size)`), por lo que los bytes del protocolo RT-950 no cambian de formato. Comprobación: (`Rt950ProtocolTest`: `headersAndKeySelection`, `readAllSkipsUnknownRegions`).

**kotlin:S2245 (MEDIUM)** — `android/app/src/test/java/org/bricohams/radio/Rt950ProtocolTest.kt:93` (y líneas 67, 175, 309). No modificado.
- *Por qué lo marca Sonar:* mismo motivo que arriba (PRNG no criptográfico, CWE-338/CWE-330).
- *Decisión:* es un test unitario que usa `Random(it.toLong())` con semilla fija para generar tramas de clave reproducibles; no es un contexto de seguridad (no genera secretos) y `SecureRandom` haría el test no determinista. Se deja sin cambios.
- *Sin pérdida de funcionalidad:* no se toca nada. Comprobación: `Rt950ProtocolTest` sigue pasando; la clase de producción acepta cualquier `Random` inyectado.

### Not changed - requires decision

- **javascript:S4036 (LOW, CWE-426/427)** — `scripts/build-platform-app.cjs:16,20,27,30`, `scripts/build-platform-resident.cjs:55,73,82,85,87,89`, `scripts/export-project.cjs:48,94,177,178,181,230`. Los scripts invocan `arm-none-eabi-*`, `git` y `zip` por nombre. No hay una ruta absoluta fija válida para todos los equipos (la toolchain ARM y git se instalan en ubicaciones distintas); inventarla o exigir una variable de entorno nueva cambiaría el uso. Decisión: aceptar el riesgo (herramientas de desarrollo ejecutadas por el propio desarrollador) o definir una variable de entorno para la ruta de la toolchain. (La invocación de `tar.exe` en línea 228 ya usa ruta absoluta.)
- **kotlin:S1313 (LOW)** — `android/app/src/main/java/org/bricohams/radio/RotorProtocol.kt:14`. `AP_HOST = "192.168.4.1"` es la dirección de fábrica del punto de acceso del rotor ESP32; moverla a configuración rompería la conexión por defecto.
- **kotlin:S2245 (MEDIUM)** — `android/app/src/test/java/org/bricohams/radio/FtxEnhancedDecoderTest.kt:59`. Es un test unitario con `Random(7)` de semilla fija para reproducir el patrón de errores; no es un contexto de seguridad y `SecureRandom` haría el test no determinista.
- **kotlin:S7204 (HIGH)** — `android/app/build.gradle.kts:52`. Activar `isMinifyEnabled` requiere reglas ProGuard/R8 (no existe ningún `proguard-rules.pro`) y validar en dispositivo que la reflexión/JSON/BLE siguen funcionando; no se puede garantizar sin pruebas físicas. Decisión: crear las reglas keep y probar un APK release minificado.
