# Pruebas y resultados

Inventario de todas las pruebas automáticas y de las pruebas reales con
hardware del proyecto (Bricohams Radio Workspace / RadiCodex), con su
procedimiento y su resultado. Rama `product/2026-11-23`, merge `5488963c`,
resultados del 2026-11-24.

Reglas de este documento:

- Solo se citan cifras que salieron de una ejecución o de las sesiones del
  mantenedor. Lo que no se ha medido figura como "pendiente de verificar".
- Una prueba automática con transportes y relojes falsos **no demuestra**
  comportamiento en una radio real. Por eso el apartado 3 se separa del 1 y el 2.
- Una prueba con hardware describe una configuración concreta (una radio,
  una antena, un teléfono). No se extrapola a otras radios.
- Las suites no abren puertos serie/COM reales ni pulsan PTT: usan
  transportes falsos, sockets locales y relojes inyectados. Las pruebas con hardware se hicieron aparte, a mano.

## 1. Suites automáticas

| Suite | Directorio | Qué cubre | Resultado (merge `5488963c`, 2026-11-24) |
|---|---|---|---|
| Node `npm test` | `tests/*.test.cjs` | Interfaz web de programación, agente de la estación remota en Node (`remote-agent.cjs` y módulos `remote-*.cjs`), consola de la estación, firmware, plantillas, ayuda, instaladores | 979 pasan, 0 fallan |
| Node `npm run check` | raíz | `node --check` de los scripts de la app, de las plantillas y de los scripts de ayuda | 0 errores de sintaxis |
| Python estación remota | `remote-station/tests/*.py` | Agente de estación en Python (`bricoham_remote_station`, `bricoham_station_agent`): PTT, rotor, audio, CAT por modelo, TLS, invitados, libro de guardia, ajustes | 424 pruebas OK, 1 omitida |
| React consola web | `remote-station/apps/web-console/src/*.test.ts(x)` | Consola React/Vite: paneles, i18n, micrófono, VOX, espectro, botones | vitest: 26 ficheros, 180 pruebas pasan; `tsc -b` OK; oxlint 9 avisos de estilo (refs de react durante el render), ningún error |
| Android Gradle | `android/` | Pruebas unitarias de `app` (variante `githubDebug`), `station-core` y `station-agent`, más compilación y lint | Pasan pruebas unitarias, `assembleGithubDebug` y `lintGithubDebug` |
| Generador de ayuda | `remote-station/scripts/build_help.py` | Guías HTML generadas | 41 guías HTML en 5 idiomas (es, en, de, it, fr) |

Notas de reproducción en el worktree de esta tarea (mismo commit
`5488963c`): `npm test` dio 979 pasan / 0 fallan; `python -m unittest
discover -s tests -v` en `remote-station` dio 424 pruebas, `OK (skipped=1)`;
`npx vitest run` en la consola web dio 26 ficheros y 180 pruebas correctas.
Android, `tsc -b` y oxlint no se ejecutaron en esta tarea: las cifras son las
del mantenedor.

### 1.1 Comandos exactos

Los comandos salen de `package.json`, de `.github/workflows/remote-station.yml`
y de `.github/workflows/android.yml`.

Node (raíz del repositorio):

```powershell
npm test                      # node --test sobre la lista de tests/*.test.cjs de package.json
npm run check                 # node --check de los scripts
npm run test:diagnostics      # node --test tests/diagnostics.test.cjs (ya incluido en npm test)
npm run test:icom-upstream    # node --test third_party/icom-custom-firmware/tests/web_patcher.test.mjs
npm run check:android-store   # node scripts/check-android-store.cjs
npm run check:diagnostics     # node --check de los módulos de diagnóstico
npm run check:templates       # node --check de las plantillas y sus scripts
```

`test:icom-upstream` y los `check:*` auxiliares no se han ejecutado en esta
tarea: resultado pendiente de verificar.

Subconjunto remoto que ejecuta CI (`remote-station.yml`, trabajo `web`):

```powershell
node --test tests/diagnostics.test.cjs tests/remote-station.test.cjs tests/remote-agent.test.cjs ...
```

La lista completa está en `.github/workflows/remote-station.yml`.

Python (`remote-station`):

```powershell
cd remote-station
python -m pip install .
python scripts/build_help.py --check
python scripts/build_diagnostic_contract.py --check
python -m unittest discover -s tests
python scripts/build_agent.py --output dist/agent
```

CI repite además `test_serial_cat` y `test_wsjtx` contra el agente empaquetado
`bricoham-station-agent.pyz` en aislamiento (`python -I`).

Consola web React:

```powershell
cd remote-station\apps\web-console
npm ci
npm test            # vitest run
npm run lint        # oxlint
npm run build       # tsc -b && vite build
```

Android (comando de `android.yml`, desde la raíz; en Windows usar `android\gradlew.bat`):

```bash
bash android/gradlew -p android :station-core:testDebugUnitTest :station-core:lintDebug \
  :station-agent:testDebugUnitTest :station-agent:lintDebug :station-agent:assembleDebug \
  :app:testGithubDebugUnitTest :app:testFdroidDebugUnitTest :app:lintGithubDebug \
  :app:lintGithubRelease :app:lintFdroidRelease :app:assembleGithubDebug \
  :app:assembleGithubDebugAndroidTest :app:assembleGithubRelease :app:assembleFdroidRelease --no-daemon
```

Cliente Capacitor (`console-android` en CI): `npm run build`, `npx cap sync android`
y `./gradlew --no-daemon assembleDebug lintDebug` en
`remote-station/apps/web-console/android`.

### 1.2 Recuentos y su origen

| Suite | Ficheros | Pruebas | Cómo se contó |
|---|---|---|---|
| Node `npm test` | 69 de los 70 `tests/*.test.cjs` están en el script `test` de `package.json` (falta `rig-cat.test.cjs`) | 979 | Ejecución de `npm test` (suma de `node --test` por fichero: 989 con `rig-cat.test.cjs`, ver 4) |
| Python | 52 `test_*.py` | 424 (1 omitida) | `unittest discover -v`; coincide con contar `def test_` |
| React | 26 (25 `.ts(x)` y `workspaceDiagnostics.test.js`) | 180 | `vitest run --reporter=verbose` |
| Android | 80 ficheros `*Test.kt` (más el ayudante `RigTestSupport.kt`) en `app/src/test`, 1 en `station-core`, 1 en `station-agent`, 1 en `androidTest` | 644 anotaciones `@Test` unitarias (633 en `app`, 2 en `station-core`, 9 en `station-agent`) y 3 instrumentadas | Recuento de `@Test`, no de ejecución; el mantenedor no dio una cifra de ejecución: pendiente de verificar |

(`tests/ws-client.cjs` es un ayudante, no una suite.)

## 2. Ficheros de prueba por área

Notación: **N** = Node `tests/`, **P** = Python `remote-station/tests/`,
**W** = web-console `src/`, **A** = Android. El número es el de pruebas del fichero.

### 2.1 PTT y seguridad de TX

Reglas probadas: el software nunca teclea por sí mismo; PTT off tiene
prioridad; corte por pérdida de latido, por tope de tiempo de TX, por SWR y por
salida de banda; un único cliente con control.

| Fichero | N.º | Qué prueba |
|---|---|---|
| N `remote-txsafety.test.cjs` | 22 | OrphanWatch (TX huérfano, nunca quita un TX del panel frontal), `occupiedSpan`, inhibición de banda (LSB/USB en el borde, sin rangos = "not-configured", rangos mal formados lanzan error, modo desconocido falla cerrado), PTT off tiene prioridad, `close()` tras un corte de latido deja terminar la parada (sin "client stopped") y reintenta una vez con límite, TUNE de Hamlib cubierto por el latido |
| N `remote-agent.test.cjs` | 42 | Token privado, PTT cae a 1 s sin latido y al tope duro de TX, `T 0` al caer rigctld y al cerrar, segundo cliente no toma el PTT, control caduca a 30 s con reloj inyectado, capacidades Hamlib |
| N `remote-tx.test.cjs` | 39 | CAT crudo con lista permitida, secuencia de parada en una sola cola, PTT off no se retrasa por los medidores, protección SWR (>1 s corta, pico corto no), vigilancia de bloqueo de rigctld, SWR 255 acotado por el tope de tiempo |
| P `test_ptt.py` | 11 | Arrendamiento exclusivo de PTT sin secreto público, cada guarda rechaza antes de enviar TX on, arranque diferido cancelado o incierto no reintenta, parada fallida mantiene el canal hasta confirmar RX |
| P `test_ptt_api.py` | 3 | Proxy start/renew/stop sin filtrar el lease, roles autorizados en ambos saltos, peticiones inválidas no llegan a TX on |
| P `test_tx_inhibit.py` | 15 | Ancho ocupado, borde de banda LSB/USB, rangos validados, solo un cruce se registra, key-up fuera de banda rechazado sin enviar TX on |
| P `test_flex_controller.py` | 11 | FlexRadio: PTT apagado por defecto y limitado, tope de tiempo con reloj falso, interlock al tope |
| N `smartsdr-core.test.cjs` | 14 | Protocolo SmartSDR: TX apagado por defecto, limitado y con tope de tiempo |
| P `test_smartsdr_protocol.py` | 23 | Descubrimiento, paquetes VITA, medidores y generadores de órdenes permitidos |
| N `remote-native-cat.test.cjs` | 17 | CAT nativo (Quansheng, Yaesu 5 bytes, TH-D75): PTT solo con `allowTx`, liberar siempre permitido |
| P `test_capabilities.py` | 5 | La capacidad de TX sigue "experimental" sin validación en hardware; nada se anuncia como verificado sin prueba |
| P `test_simulator.py` | 4 | El simulador se identifica como simulado y mantiene la transmisión deshabilitada |
| P `test_api.py` | 9 | Salud pública sin datos, ruta de transmisión ausente, métodos mutadores rechazados |
| A `RigReliabilityTest.kt` | 23 | Fiabilidad de lectura/escritura CAT en Android |
| A `RigTrackerTest.kt` | 11 | Seguimiento de radio: identificación, estado, escritura de memoria |

### 2.2 Sintonía y ATAS

| Fichero | N.º | Qué prueba |
|---|---|---|
| N `remote-tx.test.cjs` | 39 | FTX-1: AC101/AC100/AC103/AC123, ATAS con RI0 ocupado, SWR crudo 255 acotado a 30 s, sintonía sin bit de ocupado = "unverified", tope por tipo de sintonizador (ATAS 45 s por defecto / 60 s máx., interno 20 s / 30 s), rechazo por encima de 10 W (PC2100 con SPA-1), potencia ilegible rechazada, resultado conserva SWR final y TX0 verificado |
| P `test_tune_check.py` | 6 | Éxito solo con SWR bajo y TX off leído; SWR alto falla; TX aún activo nunca es éxito; el primer corte gana |
| N `remote-meters.test.cjs` | 7 | Comprobación de sintonía solo tras lectura, SWR y TX off verificado; reporta SWR alto, tiempo agotado, no iniciado y TX atascado |
| N `remote-tune-ui.test.cjs` | 9 | Estado ATAS "N s / máx", SWR aproximado del dato crudo, tarjeta de resultado con id, textos es/en/fr/de |
| P `test_accessories_api.py` | 10 | TUNE pasa por las reglas de seguridad; sintonía fuera de banda rechazada antes de arrancar |
| W `MetersPanel.test.tsx` | 3 | Panel de medidores y sintonía; bloquea sintonía por encima de 10 W |
| W `meterModel.test.ts` | 3 | Rechaza sintonía por encima de 10 W o con potencia desconocida |

### 2.3 Audio, VOX y procesador de voz

| Fichero | N.º | Qué prueba |
|---|---|---|
| N `remote-audio.test.cjs` | 15 | WebSocket RFC 6455 (marcos, fragmentación, ping/pong, cierres), contenedor Ogg/Opus |
| N `remote-txaudio.test.cjs` | 13 | Procesador de voz apagado por defecto (muestras idénticas), limitador, compresor, VOX desarmado por defecto, no teclea bajo umbral, tiempo de mantenimiento |
| N `remote-ui-audio.test.cjs` | 8 | Marcos de audio, anchura de paso, nivel RMS, jitter buffer (80 ms, relleno, descarte a 300 ms) |
| P `test_audio_rx.py` | 7 | Captura RX: configuración, dispositivo explícito, fallos liberan la captura |
| P `test_audio_tx.py` | 10 | DAC explícito, sin PCM antes de PTT, un solo hablante, 200 ms de silencio tras soltar, buffer acotado |
| P `test_audio_transport.py` | 6 | Audio por TLS con autenticación, enlace dedicado, certificado erróneo nunca abre el ADC |
| P `test_websocket_transport.py` | 5 | PCM fragmentado exacto, mensaje grande rechazado, ping flood no desplaza PCM, token solo como primer JSON |
| W `AudioPanel.test.tsx` | 6 | Errores traducibles, aborta al desmontar, AudioWorklet no soportado |
| W `PttPanel.test.tsx` | 11 | Micrófono preparado conservado al cambiar de idioma, PTT bloqueado sin sesión de audio, START tardío cancelado |
| W `PttPanelVox.test.tsx` | 5 | VOX desarmado al cargar, no teclea bajo umbral, el botón PTT lo pre-empta, rechazo del agente lo deja desarmado, ocultar el cliente destecla |
| W `RemoteMicrophone.test.ts` | 5 | Autenticación fuera de la URL, PCM exacto, permiso tardío cancelado, procesador de voz |
| W `audioFraming.test.ts` | 2 | Fragmentación arbitraria y rechazo de formato/longitud inválidos |
| W `audioWorklet.test.ts` | 1 | Reproduce PCM, informa underflow y rechaza overflow |
| W `tx-audio-worklet.test.ts` | 2 | 960 muestras PCM16 exactas, cola de captura acotada a 8 marcos |
| A `LiveAudioTest.kt` / `LiveAudioActivityTest.kt` | 5 / 6 | Audio en vivo en Android (servicio y actividad) |
| A `MorseAudioTest.kt` | 3 | Audio Morse |

### 2.4 Rotor

| Fichero | N.º | Qué prueba |
|---|---|---|
| N `remote-rotor.test.cjs` | 9 | Solo líneas `get_pos` documentadas, límites y aparcado, un controlador a la vez, parada siempre permitida, movimiento deshabilitado por defecto |
| P `test_rotor.py` | 14 | Metadatos sin tocar el backend, arrendamiento exclusivo, sin latido detiene el movimiento, la renovación no extiende el plazo absoluto, ack perdido no se reintenta |
| P `test_rotor_api.py` | 4 | Cadena agente/broker mueve y detiene sin simulación, ambos servicios autorizan antes de cualquier E/S |
| N `remote-rotor-ui.test.cjs` | 6 | Parser de pases del planificador, interpolación por reloj, azimut inalcanzable |
| W `RotorPanel.test.tsx` | 11 | Objetivo con nonce, aparcar, seguir un pase, archivo inválido no mueve, parada al desmontar |
| W `passTrack.test.ts` | 3 | Formato de pase, interpolación cruzando el norte, mantener bajo el horizonte |
| A `RotorTest.kt` / `RotorActivityTest.kt` | 9 / 2 | Rotor en Android |

### 2.5 Amplificadores, sintonizadores y accesorios

| Fichero | N.º | Qué prueba |
|---|---|---|
| N `remote-accessories.test.cjs` | 11 | Catálogo "pendiente de fuente", amplificador en STANDBY sin driver, OPERATE solo con configuración explícita y sin TX/tune/disparo SWR, eventos de seguridad devuelven a STANDBY |
| N `remote-amplifier-drivers.test.cjs` | 15 | Drivers KPA, Expert y ACOM con sus tramas documentadas; STANDBY confirmado |
| P `test_accessories.py` | 17 | Catálogo, mapeo de bandas, standby por defecto, rechazos de OPERATE |
| P `test_amplifier_drivers.py` | 14 | Lectura, seguimiento de banda en kHz, tramas y checksum, telemetría |
| P `test_accessories_api.py` | 10 | Instantánea en standby, OPERATE exige banda, OPERATE rechazado con PTT retenido, `test_server_close_forces_standby_and_bad_requests_are_rejected` |
| N `station-devices.test.cjs` | 20 | Conmutadores DLI y Modbus TCP, digest RFC 2617, conmutar solo sin TX y con confirmación en salidas críticas |
| P `test_station_devices.py` | 24 | Lo mismo en el agente Python |
| W `AccessoriesPanel.test.tsx` | 2 | Lista pendientes de fuente, OPERATE desactivado, STANDBY siempre disponible, modelos sin probar en hardware |
| W `FlexPanel.test.tsx` | 2 | TUNE y ATU desactivados con TX apagado; bloqueo por disparo de SWR |

### 2.6 Medidores

| Fichero | N.º | Qué prueba |
|---|---|---|
| N `remote-meters.test.cjs` | 7 | Escalas citadas de FTX-1 y IC-705, todo medidor cita fuente |
| P `test_ftx1_meters.py` | 4 | Tramas de banco, lista permitida, escalas del modelo compartido |
| P `test_ic705_meters.py` | 4 | Consultas según la guía CI-V, valores ancla |
| W `meterModel.test.ts` / `MetersPanel.test.tsx` | 3 / 3 | Modelo compartido y panel (PO pendiente de fuente con cabezal SPA-1) |
| A `MeterModelTest.kt` | 3 | Modelo de medidores en Android |

### 2.7 Espectro y cascada

| Fichero | N.º | Qué prueba |
|---|---|---|
| N `spectrum-core.test.cjs` | 8 | FFT, analizador de audio, clic para sintonizar con convención de banda lateral, reensamblado de tramas de scope |
| P `test_icom_scope.py` | 4 | Trama de scope en modo centro de tres secuencias, huecos de secuencia rechazados |
| P `test_scope_proxy.py` | 2 | El coordinador transmite tramas de scope y las apaga; exige radio con fuente y rol |
| W `spectrum.test.ts` | 6 | NDJSON del scope, píxeles a columnas, clic a frecuencia, FFT y analizador |

### 2.8 Decodificadores y modos digitales

| Fichero | N.º | Qué prueba |
|---|---|---|
| N `ftx-core.test.cjs` | 10 | CRC14, Pack77, LDPC, FFT, decodificación FT8 con deriva de frecuencia/tiempo |
| N `remote-ftx.test.cjs` | 12 | Decodificación FT8 en la estación: apagada por defecto, ranuras UTC, cola acotada, vigilancia del worker |
| N `remote-digital.test.cjs` | 12 | Varicode, ITA2, BPSK31 con ruido |
| P `test_wsjtx.py` | 10 | Órdenes opcionales y datos WSJT-X por UDP, estado antiguo marcado histórico |
| P `test_live_agent_api.py` | 10 | `test_digital_commands_require_local_opt_in_and_roles_at_both_services`, ajustes y lectura CAT por el agente |
| W `AgentLivePanel.test.tsx` | 15 | Replay y Halt Tx opcionales, datos WSJT-X desconectados históricos y sin TX, solo lectura CAT permitida |
| W `OperationPanels.test.tsx` | 5 | Códecs distinguidos sin ofrecer órdenes de hardware, libro de guardia |
| A `FtxCodecTest.kt` / `FtxEnhancedDecoderTest.kt` / `FtxActivityTest.kt` | 11 / 10 / 6 | FT8/FT4 en Android |
| A `AcarsCatTest.kt`, `AcarsCodecTest.kt`, `AcarsCrcTest.kt`, `AcarsFrameTest.kt` | 9 / 9 / 2 / 8 | ACARS |
| A `AprsTest.kt` / `AprsChatTest.kt` | 11 / 13 | APRS |
| A `SstvTest.kt`, `SstvTransmitTest.kt`, `SstvActivityTest.kt`, `Robot36Test.kt` | 10 / 12 / 2 / 4 | SSTV |
| A `DigitalModesTest.kt` | 6 | Modos digitales |
| N `remote-dxcluster.test.cjs` | 12 | Clúster DX: apagado por defecto, TCP plano, reconexión con espera creciente, buffers acotados |
| N `remote-cw-log.test.cjs` | 16 | CW por CAT (FTX-1 KM/KY, IC-705 comando 17 según la guía CI-V), tiempos PARIS acotados, memorias F1-F8 |

### 2.9 Libro de guardia y QSL

| Fichero | N.º | Qué prueba |
|---|---|---|
| N `remote-qsl.test.cjs` | 12 | QRZ y LoTW apagados salvo configuración completa, ADIF ida y vuelta, QRZ sin fugas de credenciales, renovación de sesión, límites |
| N `remote-ops.test.cjs` | 13 | Registro de TX (duración, banda, ubicación redondeada, CSV a prueba de fórmulas); invitados (ver 2.11) |
| P `test_logbook.py` / `test_logbook_api.py` | 6 / 7 | Libro persistente, ADIF, FT4 como MFSK, roles, límites de cuerpo y paginación |
| W `OperationPanels.test.tsx` | 5 | ADIF autenticado, escrituras ocultas a oyentes |
| A `AdifImportTest.kt`, `ModelsTest.kt` | 4 / 7 | Importación ADIF y modelo de contacto |

Las consultas QRZ/LoTW contra servicios reales no se han probado (apartado 4).

### 2.10 Ajustes de la radio

| Fichero | N.º | Qué prueba |
|---|---|---|
| N `radio-settings.test.cjs` | 18 | FTX-1 con rangos citados y exclusiones, copia, escritura y relectura, auditoría, rechazo sin permiso o en TX, restauración ante discrepancia |
| P `test_radio_settings.py` | 12 | Lectura y ajuste de seis modelos con selectores explícitos y sin TX, escritura no se reintenta |
| P `test_menu_settings.py` | 8 | 403 elementos de menú respetan exclusiones, respuestas reales de banco, restauración |
| P `test_ftx1_power.py` | 13 | Opciones locales deshabilitadas por defecto, frecuencia y modo con relectura, identidad errónea impide ajustes |
| W `RadioSettingsPanel.test.tsx` | 12 | Potencia (200 W solo en FTDX101MP), nivel CAT con nonce, bloqueo si CAT observa TX |
| W `RadioMenuSettings.test.tsx` | 1 | Elementos de solo lectura sin editor; escrituras con id de petición |
| W `RadioOperatingPanel.test.tsx` | 11 | Frecuencia/modo con nonce, setter incierto no se reintenta |
| A `RigSettingsTest.kt` | 6 | Lectura y escritura de ajustes en Android |

### 2.11 Invitados

| Fichero | N.º | Qué prueba |
|---|---|---|
| N `remote-ops.test.cjs` | 13 | Token por invitado con solo su hash guardado y revocable, invitado solo-escucha sin PTT/TUNE/RFPOWER, TX de invitado limitado a bandas y potencia |
| P `test_guests.py` | 14 | Invitación, caducidad, revocación, persistencia del hash, políticas de banda y TX |
| P `test_security.py` | 4 | Token de administrador exigido, tokens cortos o duplicados rechazados, esquema Bearer, roles distintos |

### 2.12 Transporte, TLS y relé

| Fichero | N.º | Qué prueba |
|---|---|---|
| N `remote-tls.test.cjs` | 2 | Certificado autofirmado de la estación válido, reutilizado o regenerado |
| N `remote-relay.test.cjs` | 12 | Relé: solo hash del secreto, 401/404/429/503, extremo a extremo con audio WebSocket, la autenticación queda en la estación |
| N `remote-station.test.cjs` | 16 | Entrada HTTPS sin exponer tokens, puertos y PnP |
| N `remote-api.test.cjs` | 8 | API remota con Origin igual al host, JSON y 4 KB máximo, validación estricta |
| N `diagnostics.test.cjs` | 5 | Esquema cerrado de diagnóstico, sin red por defecto, relé HTTPS verificado |
| P `test_secure_transport.py` | 22 | Enlace Android por TLS con token distinto y fuente exclusiva, `test_mtls_requires_a_trusted_client_before_http_and_keeps_bearer_roles`, halt digital, subida de diagnóstico |
| P `test_origin_and_connection_limits.py` | 3 | Orígenes, DNS rebinding, parada con el pool por IP agotado |
| P `test_station_agent.py` | 7 | SIGTERM apaga y destecla PTT, inventario sin identificadores únicos |
| P `test_diagnostic_reports.py` | 9 | Informes corruptos rechazados, sin mensajes ni rutas, subida desactivada sin red |
| P `test_android_agent_contract.py` | 1 | Toda consulta del host está en la lista permitida de Android o excluida |
| W `api.test.ts` | 6 | Solo HTTPS, sin cookies/redirecciones/referrer, consentimiento revocado al cambiar de host |
| W `agentSetup.test.ts` | 4 | Órdenes seguras, TLS/mTLS verificado, URLs inseguras rechazadas |
| W `App.test.tsx` | 8 | Conexión con token sin persistirlo, reconexión, agente opcional |
| A `RemoteShackTest.kt` / `RemoteStationActivityTest.kt` | 18 / 3 | Enlace de emparejamiento, URL inseguras rechazadas, sin reconexión automática |
| A `ReadonlyAgentTest.kt` (`station-agent`) | 9 | Agente Android de solo lectura sin escrituras de control |
| A `SharedDiagnosticsTest.kt` (`station-core`) | 2 | Diagnóstico compartido |
| A `AnonymousDiagnosticsTest.kt` | 4 | Diagnóstico anónimo |
| A `CatLinkTest.kt`, `CdcRadioTest.kt` | 8 / 8 | Enlace CAT y radio CDC USB |

### 2.13 i18n e interfaz

| Fichero | N.º | Qué prueba |
|---|---|---|
| N `ui-i18n.test.cjs` | 15 | Prioridad de idioma, catálogo es/en/fr/de completo y con claves únicas, límites técnicos de seguridad conservados |
| N `ui-desktop.test.cjs` | 15 | Contraste AA, objetivos de 48 px, uso de tokens |
| N `remote-ui-buttons.test.cjs` | 9 | Contraste, foco de 3 px, estado seleccionado con señal no cromática |
| N `remote-console-mobile.test.cjs` | 6 | Pestañas, anchuras, barra PTT fija y área segura |
| N `remote-console-polish.test.cjs` | 9 | Barra superior móvil, resumen fijo, PTT mínimo 64 px |
| N `remoto-ui.test.cjs` | 7 | Controles de inicio/parada, tarjeta de funciones remotas traducida |
| N `remote-parity.test.cjs` | 15 | Matriz `data/remote-feature-parity.json` cubre cada radio y perfil Android; función `ok` exige fuente |
| P `test_feature_parity.py` | 5 | Cada radio lista cada función con estado válido; receptores sin TX |
| P `test_multilingual_help.py` | 1 | La ayuda y la lista offline coinciden con las fuentes canónicas |
| P `test_radio_candidates.py` | 3 | Candidatos no se anuncian como soportados |
| N `site.test.cjs` | 17 | Apariencia, CSP sin scripts ni estilos en línea, marca, cabeceras |
| N `help-docs.test.cjs` | 27 | Guías generadas: enlaces, escapado, cinco idiomas |
| N `compare-airband-guide.test.cjs` | 1 | Informe de la guía aérea |
| W `buttonSystem.test.ts` | 51 | Tokens y contraste de botones en todos los temas y estados |
| W `HelpPanel.test.tsx` | 2 | Ayuda en cuatro idiomas, orden local sin E/S de red |
| W `FeatureParityPanel.test.tsx` | 2 | Controles atenuados con su motivo |
| W `workspaceDiagnostics.test.js` | 1 | Diagnóstico solo con datos técnicos fijos y tras aprobación |
| A `LocalizationTest.kt`, `AppLanguageTest.kt` | 12 / 2 | Traducciones y selección de idioma |
| A `BrandButtonSystemTest.kt`, `BrandUiTest.kt`, `UiOverhaulTest.kt` | 5 / 4 / 10 | Sistema de botones y marca |
| A `RigActivityTest.kt`, `ChannelActivityTest.kt`, `CatActivityTest.kt`, `AntennaActivityTest.kt` | 7 / 3 / 2 / 4 | Pantallas Android |

### 2.14 CAT por radio y catálogo

| Fichero | N.º | Qué prueba |
|---|---|---|
| N `remote-catalog.test.cjs` | 6 | Modelos Hamlib enteros, ids únicos, FTX-1 como probado con CAT en el CP2105 |
| N `rig-cat.test.cjs` | 10 | CAT en navegador (FTX-1, QMX, truSDX, HRI); no está en `npm test` (ver 4) |
| N `ftx1.test.cjs` / `ftx-core.test.cjs` | 21 / 10 | Memorias FTX-1 (respuestas reales de solo lectura), lectura/escritura verificada |
| P `test_ftx1_cat.py` | 9 | Solo consultas de lectura documentadas, nueve dígitos de frecuencia |
| P `test_yaesu_cat.py` | 9 | Rangos por modelo, sin PTT ni manipulador |
| P `test_icom_civ.py` | 9 | Tramas CI-V de IC-705 según la guía, direcciones por modelo |
| P `test_kenwood_cat.py`, `test_qmx_cat.py`, `test_trusdx_cat.py` | 6 / 4 / 4 | Solo consultas documentadas, respuestas validadas |
| P `test_elecraft_k3s_cat.py`, `test_elecraft_k4_cat.py` | 6 / 4 | Subconjunto conservador, solo lecturas |
| P `test_hermes_lite_protocol.py` | 4 | Descubrimiento Metis de solo lectura |
| P `test_serial_cat.py` | 11 | Apertura exclusiva, eco y fragmentos, scope siempre se desactiva (un caso se omite sin PTY en Windows) |
| P `test_cat_diagnostics.py` | 8 | CLI de diagnóstico sin conectar |
| P `test_opengd77_usb.py` | 3 | Información de radio, sin comandos CPS |
| A `CatProtocolTest.kt`, `YaesuFtx1Test.kt`, `YaesuFiveByteTest.kt`, `IcomCivTest.kt`, `KenwoodThd75Test.kt`, `TruSdxTest.kt`, `QrpLabsTest.kt` | 26 / 26 / 6 / 14 / 19 / 7 / 7 | Protocolos CAT de cada familia |
| A `ProfileTest.kt` | 12 | Perfiles de radio y coincidencia USB |

### 2.15 Programación, firmware y plantillas (aplicación de escritorio y web)

No son de la estación remota; se listan por completitud.

| Fichero | N.º | Qué prueba |
|---|---|---|
| N `connectors.test.cjs` | 110 | Conectores y CAT RX de las radios (el recuento de `npm test` incluye estas pruebas) |
| N `anytone.test.cjs` | 11 | Solo RX en AM/aeropuertos y FM comercial, importaciones atómicas |
| N `bricohams-build.test.cjs` | 18 | Parches de copia, retune rápido y memoria |
| N `custom-firmware.test.cjs` | 6 | Imágenes publicadas y SHA256SUMS |
| N `firmware.test.cjs`, `firmware-catalog-cache.test.cjs`, `firmware-signature.test.cjs` | 21 / 4 / 10 | Catálogo, caché ante HTTP 403/304, firmas Ed25519 |
| N `gd77-stm32-backup.test.cjs` | 6 | Copia STM32 |
| N `hw-channels-plan.test.cjs` | 11 | Plan de canales a memoria |
| N `icom.test.cjs`, `icom-patch-report.test.cjs` | 4 / 4 | Firmware Icom, informe de parches |
| N `multiboot-ui.test.cjs` | 4 | Panel de ranuras |
| N `quansheng-factory.test.cjs`, `quansheng-flash-retry.test.cjs`, `quansheng-flash-support.test.cjs`, `quansheng-live.test.cjs` | 12 / 3 / 3 / 16 | Quansheng: DFU, reintentos, soporte, teclado/LCD en vivo |
| N `tk11.test.cjs` | 14 | TK-11: marcos, copia y escrituras acotadas |
| N `channel-templates.test.cjs`, `repeater-templates.test.cjs` | 27 / 5 | Plantillas de canales y repetidores (solo RX) |
| N `planning.test.cjs`, `satellite-ui.test.cjs`, `radio-tools.test.cjs`, `antenna.test.cjs` | 60 / 4 / 5 / 20 | Planificación, satélites, herramientas de radio, antenas |
| N `web-mode.test.cjs`, `installers.test.cjs`, `export-project.test.cjs`, `android-store.test.cjs`, `third-party-ledger.test.cjs` | 24 / 13 / 5 / 4 / 4 | Modo web local, instaladores, exportación, tienda Android, libro de terceros |
| A satélites: `SatelliteActivityTest`, `SatelliteCatalogTest`, `SatelliteMapTest`, `SatellitePassesTest`, `SatelliteTrackingTest`, `SatellitesTest`, `PassCalendarTest`, `PassGeometryTest`, `PassPointingTest`, `PassRadarViewTest`, `PassRecorderTest`, `PassSkyTest`, `MutualPassesTest`, `NextPassSummaryTest` | 11 / 8 / 4 / 3 / 4 / 6 / 3 / 9 / 8 / 1 / 2 / 9 / 4 / 5 | Satélites y pases |
| A radios: `OpenGd77Test` 7, `Rt950ProtocolTest` 20, `RtS10ProbeTest` 3, `QuanshengAuditTest` 9, `QuanshengChannelsTest` 5, `QuanshengMemoryTest` 13 | | Programación OpenGD77, RT-950, RT-S10, Quansheng |
| A OTA y almacén: `OtaTest` 13, `OtaCrossSignTest` 2, `OtaFlavorTest` 4, `Ed25519Test` 2, `VersioningTest` 7, `RadioStoreHostTest` 12, `RadioStoreTest` 3 (instrumentada) | | Actualización firmada, firma Ed25519, versionado, base de datos |
| A varios: `ChannelTemplatesTest` 15, `RadioToolsTest` 7, `MaidenheadTest` 4, `TriangulationTest` 12, `ArdfStatisticsTest` 6, `NetControlTest` 8, `FixCollectorTest` 8 | | Plantillas, herramientas, Maidenhead, triangulación, ARDF, control de red, posición GPS |
| A `RigTestSupport.kt` | 0 | Ayudante de pruebas |
| W Capacitor `ExampleUnitTest.java` | pendiente de verificar | Plantilla del proyecto Capacitor; no se ha comprobado si la ejecuta CI |

Los recuentos de Node por fichero salen de ejecutar cada fichero con
`node --test`; los de Python de `unittest -v`; los de React de `vitest`;
los de Android son anotaciones `@Test`.

## 3. Pruebas reales con hardware

Equipo: Yaesu FTX-1, CAT en COM7 a 38400, Hamlib 4.7.2 `rigctld` modelo 1051,
ATAS-120, teléfono Samsung S20 FE por ADB inalámbrico. Solo esta combinación
está probada en remoto.

### 3.1 Límites de seguridad aplicados en todas las pruebas

- El software nunca teclea por sí mismo: cada PTT lo inicia el operador.
- PTT off prevalece sobre todo; latido con corte (`heartbeat unkey`), topes de
  tiempo de TX y de sintonía, disparo por SWR, STANDBY del amplificador, bloqueo
  de operador.
- Potencia de prueba 10 W. Antena ATAS sintonizada en 28.450 MHz para las
  pruebas con TX en esa frecuencia.
- Rango de TX permitido configurable (`txInhibit`): `not-configured`,
  `outside` o `inside` según el rango de prueba.
- Las pruebas multibanda se hicieron sin audio (solo PTT).

### 3.2 Resultados

| Fecha | Prueba | Procedimiento | Resultado |
|---|---|---|---|
| 2026-11-23 | Teléfono, estación TLS, FTX-1, lectura | Lectura de estado desde el teléfono a través de la estación TLS | OK |
| 2026-11-23 | PTT | Teclear y soltar desde el teléfono | OK |
| 2026-11-23 | Corte por latido | Dejar de enviar latido con PTT activo | Destecleo a 1.12 s |
| 2026-11-23 | Sintonía remota ATAS | Sintonía en 50.2161 MHz | Éxito en unos 10 s, SWR crudo 3 |
| 2026-11-23 | Recepción FT8 | Decodificación en la estación | 9 decodificaciones reales en 8 ranuras (antes de la sincronización de reloj y la corrección del SNR) |
| 2026-11-23 | Consola remota | Revisión visual | Revisada |
| 2026-11-24 | Solo lectura | El agente lee frecuencia y modo | 28.450 MHz USB, S-meter, `txInhibit` "not-configured"/"outside"/"inside" según el rango configurado |
| 2026-11-24 | Rango que excluye | PTT con un rango que excluye la frecuencia, 10 W, ATAS sintonizada en 28.450 | Rechazo 409 `tx-out-of-band`; el equipo siguió en TX0 |
| 2026-11-24 | Pérdida de latido | Corte del latido con TX a 10 W | El agente cortó a 0.96-0.98 s |
| 2026-11-24 | Cierre tras corte | Cerrar el agente justo después de un corte de latido | **Fallo encontrado**: la secuencia de parada en curso se abortaba ("client stopped"). Corregido por `fix-close-stop` (el cierre espera, con límite, y reintenta una vez); lo cubren dos pruebas de `tests/remote-txsafety.test.cjs` |
| 2026-11-24 | Multibanda, 7 bandas × fonía/CW/DATA-U, PTT sin audio, 10 W por banda | Rechazo en bordes | 21/21 OK (incluye el borde inferior de LSB en 40 m) |
| 2026-11-24 | Multibanda, sintonía ATAS por CAT | Una sintonía por banda | 40 m: tope de tiempo (crudo 132). 20 m: terminó con SWR alto (crudo 199, 22 s). 15 m y 10 m: tope de tiempo (crudo 255). 6 m: éxito (crudo 62, 33 s). 2 m y 70 cm: "éxito" en 1 s con crudo 0, clasificado después como falso positivo -> "unverified" |
| 2026-11-24 | Multibanda, 6 m, 2 m, 70 cm | PTT, corte de latido y cierre inmediato; lectura directa TX0 del equipo | 9/9 OK, corte a 0.99-1.08 s |
| 2026-11-24 | HF, PTT | No se ejecutó porque el ATAS no sintonizó | No probado |
| 2026-11-24 | Sintonía desde el panel frontal, 28.450 MHz, inicio a 10 W | Sintonía ATAS manual | Falla igual que por CAT: mejor punto RM6 111-117 y sigue buscando; el equipo sintoniza en PC2005 sea cual sea la potencia inicial. Un inicio a 100 W no se probó |

### 3.3 Fallos intermitentes y correcciones relacionadas con las pruebas

- `test_mtls_requires_a_trusted_client_before_http_and_keeps_bearer_roles`
  (`remote-station/tests/test_secure_transport.py`) fallaba 1 de 25 veces
  antes de `fix-mtls` (503 en vez de 502, por un reinicio TLS 1.3 posterior al
  handshake); tras la corrección, 0 de 25.

## 4. Incidencias abiertas y lo no probado

Fallos intermitentes sin causa encontrada (solo bajo carga alta de la máquina):

- `test_server_close_forces_standby_and_bad_requests_are_rejected`
  (`test_accessories_api.py`): 1 aparición.
- `test_digital_commands_require_local_opt_in_and_roles_at_both_services`
  (`test_live_agent_api.py`): 1 aparición, `WinError 10053` (conexión local
  abortada).
- La suite Python se repitió 5 veces tras varios merges con 0 fallos.

Incidencias conocidas:

- ATAS: la sintonía falla por CAT en 40, 20, 15 y 10 m y por panel frontal en
  28.450 MHz con inicio a 10 W. Con inicio a 100 W: no probado.
- 2 m y 70 cm: la sintonía "con éxito" en 1 s con crudo 0 era un falso positivo;
  se clasifica como "unverified" (`tests/remote-tx.test.cjs`, prueba "ATAS tune
  that ends by itself without the tuner busy bit ever seen is unverified").
- PTT en HF no se ha ejecutado porque el ATAS no sintonizó.
- `tests/rig-cat.test.cjs` existe, pasa (10 pruebas al ejecutarlo solo) pero no
  figura en el script `test` de `package.json`, por lo que `npm test` (979)
  no lo cuenta. Registrarlo queda fuera de esta tarea de solo documentación.
- oxlint: 9 avisos de estilo (refs de react durante el render), sin errores.
- Firmware semidúplex de satélite: retenido, no publicado hasta probarlo en una
  radio real.
- Paridad remota (`data/remote-feature-parity.json`, 62 radios × 12 funciones):
  incompleta para Xiegu (salvo X6200), TH-D75, FT-8x7, Quansheng y radios solo
  Android. Solo el FTX-1 está probado en hardware en remoto.

No probado en hardware:

- VOX y procesador de voz con micrófono real.
- Radios distintas del FTX-1 en remoto.
- FlexRadio.
- QRZ y LoTW en vivo.

Pendiente de verificar: ejecución de `npm run test:icom-upstream`, de los
`check:*` auxiliares y de las pruebas de Android en esta tarea; cifra de
ejecución de las pruebas Android (solo hay recuento de anotaciones).

## 5. Código de terceros

Revisión con Copilot del diagrama de la colección `20_terceros` (5 ramas):
92 citas verificadas por ruta, línea y símbolo; 26 portables por licencia.
Portado hasta ahora: bloque de seguridad de TX (ThetisLink `OrphanWatch`,
GPL-2.0-or-later; RemoteRig `occupiedSpan`/`checkClientAlive`, MIT) y bloque
de audio remoto (`remoteAudio` doorman/VOX, MIT; procesador de voz de
RemoteRig, MIT). Registro: [THIRD-PARTY-REUSE.md](THIRD-PARTY-REUSE.md). Las
pruebas correspondientes son `tests/remote-txsafety.test.cjs`,
`tests/remote-txaudio.test.cjs` y `tests/third-party-ledger.test.cjs`.

