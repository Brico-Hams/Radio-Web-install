# Pruebas

## Pruebas automatizadas

Ejecuta:

```powershell
py -3.12 -m unittest discover -s tests -v
```

Las pruebas usan datos de puerto simulados y servidores HTTP locales efímeros;
no requieren una radio ni abren puertos serie. Comprueban contratos,
autenticación, permisos, inventario, rechazo de órdenes no implementadas, bloqueo TX y la
identificación explícita de datos simulados. También verifican las 49 entradas
del catálogo candidato, procedencia de datos y su endpoint de solo lectura.

Instala primero la dependencia runtime del agente con `py -3.12 -m pip install .`.

## Consola web

Desde `apps/web-console`, ejecuta `npm ci`, `npm run test`, `npm run lint` y
`npm run build`. Las pruebas de UI comprueban el token enmascarado, el estado
simulado, el TX bloqueado por defecto y la vista de capacidades para un rol
invitado, además de inventario visible y agente desconectado. Las pruebas Python
comprueban el servicio estático, el proxy con roles, el fallback SPA y el rechazo
del recorrido de rutas. La consola agrupa los modelos candidatos por fabricante
y presenta sus afirmaciones como referencias no validadas.

La ayuda se comprueba con `py -3.12 scripts\build_help.py --check` y
`tests.test_multilingual_help`. Las pruebas web verifican los cuatro idiomas,
conexión preservada sin persistir tokens, desconexión durante refresh pendiente,
asistentes sin I/O y entrecomillado/rechazo de parámetros inseguros.
Los perfiles K3/KX3/KX2 usan respuestas sintéticas y un puerto serie simulado;
se comprueba el rechazo de FM en KX2 y ausencia de consultas K3S heredadas.

## Incremento de ayuda ES/EN/FR/PT

- Suite final: 202 pruebas Python y 58 web correctas; Ruff/formato, lint y
  build de producción correctos. Un aborto HTTP WinError 10053 en una ejecución
  anterior no se reprodujo en tres repeticiones aisladas; la suite completa
  posterior pasó.
- Generador: 53 recursos coherentes con sus fuentes, incluidos cuatro manuales
  offline. Los asistentes se prueban sin ejecución de comandos ni I/O de red.
- ZIPAPP: 40 pruebas; wheel instalado fuera del checkout: 49 pruebas.
  Se verificó el origen real de todos los imports BricoHams y la igualdad
  de los módulos empaquetados con las fuentes.
- Nueve recursos web idénticos en dist, Android, iOS, APK y wheel, incluidos
  los manuales. Android assembleDebug/lintDebug y firma APK v2 correctos;
  permisos RECORD_AUDIO y MODIFY_AUDIO_SETTINGS presentes.
- La herramienta de navegador falló al conectar por CDP. El intento alternativo
  Edge headless no produjo captura; sus procesos se cerraron. No se declara
  validación visual responsive ni prueba en dispositivos móviles.
- iOS sincronizado, no compilado ni firmado en Windows. Sin hardware USB,
  RF ni aceptación multiplataforma.

SHA-256 de esta entrega:

| Paquete | SHA-256 |
|---|---|
| Agente ZIPAPP | `916daab1148681e22cf47b940c9d469077c7d709ad21a5e0c8b6b51247bf17c7` |
| Host wheel | `91dfd34b12d0d0f998b8035985d5b72e1fc7dd79df44007a216121e1641d67e0` |
| APK debug | `84e65f780a32c9f53b5b8562fd06d25e25c12d0ecbe892a5d7a6ad7fd451b4e9` |

## Validación de hardware pendiente

No se ha conectado una radio física. La enumeración USB/serie por modelo,
comandos CAT, audio, desconexión física y RF siguen sin pruebas; los codecs
de todas las familias solo usan bytes sintéticos. La escala Hz FTX-1 se contrasta
con el manual CAT 2508-C, no con hardware. La CI no sustituye pruebas de hardware.

Las pruebas del diagnóstico comprueban que la CLI usa parsers reales, rechaza
setters/modelos no implementados y no confunde codecs con soporte físico. El
endpoint de protocolos requiere autenticación y no admite métodos mutantes.
El logbook se prueba con bases SQLite temporales reales, persistencia, fechas
UTC y campos ADIF; no se registran contactos ni se transmiten señales reales.

## Comprobación del paquete instalado

Además de la suite del repositorio, se construyó el wheel y se instaló en un
entorno virtual separado, ejecutando desde fuera del árbol de fuentes:

- Ayuda de los cuatro entry points instalados.
- Catálogo de 46 candidatos: 31 perfiles de modelo, 14 primitivas de familia e
  IC-7800 sin implementar.
- Decodificación CLI de frecuencia Icom y modo Yaesu.
- Alta, lectura persistente y exportación ADIF sobre SQLite temporal.
- Coordinador y agente HTTP reales en puertos loopback efímeros: autenticación,
  catálogo de protocolos y proxy de inventario vacío.

El constructor integrado incorpora también el build de la consola al wheel.
Su instalación se comprueba desde fuera del repositorio: `/`, sus assets,
alta/lectura de QSO y exportación ADIF autenticadas. El wheel directo de
`pip wheel .` sigue siendo solo Python.

Las pruebas de logbook HTTP cubren roles, persistencia, paginación, límites de
cuerpo, campos incorrectos, origen, errores de almacenamiento y exportación.
Las de UI comprueban alta manual, consulta CAT, lectura de oyente, descarga
autenticada y fallos sin reintento automático.

Se verificó en el navegador un contacto ficticio en SQLite temporal, su lectura
tras recarga y el contenido de la respuesta ADIF. En viewport de 390 px se
comprobó que la página no desborda horizontalmente y que la tabla tiene scroll
local. El evento de descarga del navegador integrado no se pudo observar;
la creación del enlace y blob se prueba en UI y el contenido HTTP por separado.
Ninguna de estas comprobaciones conecta una radio.

## Transporte serie y digitales

Las pruebas nuevas no requieren hardware: inyectan una interfaz serie con
respuestas fragmentadas, eco, timeouts, errores y reapertura bajo demanda.
Comprueban que RTS/DTR se configuran inactivos antes de `open`, que comandos
fuera de allowlist no escriben, y que dos lecturas no comparten la transacción.
Esto no demuestra ausencia de pulsos físicos del driver USB.

Los tests WSJT-X envían datagramas sintéticos por sockets UDP loopback reales;
verifican esquemas 2/3, campos, límites, identidad, historial, envejecimiento y
ausencia de respuestas salientes. Pruebas HTTP completas enlazan receptor,
agente y coordinador con autorización, sin insertar decodes como contactos.
No se declara haber ejecutado WSJT-X ni hecho QSOs reales. La aceptación con
equipos se hará posteriormente sin bloquear el desarrollo de estas funciones.

## HTTPS, distribuciones y móviles

La suite incluye conexiones TLS reales con certificados efímeros generados por
OpenSSL (necesario para estos tests; se omiten explícitamente si falta). Se
comprueban cadena de confianza, hostname, rechazo sin fallback, token de enlace
distinto del usuario, HTTP remoto prohibido, CORS acotado y exportación ADIF desde
un origen permitido. Un handshake incompleto no bloquea la aceptación de otros
clientes; las conexiones están limitadas y tienen timeout.

Los logs se prueban para no contener Authorization ni secretos en query strings.
La telemetría UDP se verifica como no autenticada/no apta para control; no se
afirma haber añadido autenticación al protocolo nativo WSJT-X.

El ZIPAPP se ejecutó con Python aislado fuera del repositorio: ayuda con salida
0, falta de token con salida 2, salud HTTP, autorización y snapshot WSJT-X real
sin datos simulados. Se comprobó que no incluye coordinador ni UI. El wheel
actualizado se instaló en un entorno temporal y sirvió su consola empaquetada
desde fuera del árbol de fuentes, sin Node.js en ejecución.

Las pruebas compartidas de UI incluyen el cliente nativo: HTTP se rechaza antes
de enviar el token y las peticiones HTTPS usan el host elegido sin cookies ni
redirecciones. Se ha construido y firmado **solo en modo debug** un APK
Android/API 24–36 y ejecutado `lintDebug`; el manifiesto y la firma se inspeccionan
sobre el binario, no solo el fuente. Hay advertencias de plantilla/dependencias
en lint, no errores de compilación. No hay prueba en emulador/tablet ni RF.

El proyecto universal iOS se preparó y su plist se validó sintácticamente.
La compilación/firma iPhone/iPad exige macOS/Xcode y sigue sin ejecutarse aquí.

## Consolidación de controles FTX-1 MAIN/SUB

- Suite completa: **174 pruebas Python y 38 web** correctas; Ruff, formato,
  lint web, TypeScript y build de producción correctos.
- FA/FB y MD0/MD1 según receptor explícito; flags locales independientes,
  desactivados por defecto y compatibles con la configuración anterior.
  Casos de rango/tipo inválido, RX/ATU, eco tardío, readback discrepante y
  deduplicación, sin reintentos de escrituras.
- Proxy autenticado HTTP y dos saltos HTTPS reales con frecuencia/modo.
  mTLS conserva pruebas positivas y negativas de certificado, hostname y rol.
- ZIPAPP y wheel reconstruidos, comparados byte a byte con módulos fuente y
  ejecutados desde fuera del checkout. Potencia, frecuencia MAIN y modo SUB
  comprobados con puerto serie de banco; sin radio conectada.
- APK reconstruido con `assembleDebug`/`lintDebug`, firma v2 verificada.
  Sus cuatro recursos web coinciden con `dist` y los proyectos Android/iOS,
  incluido el AudioWorklet. La firma debug no equivale a distribución final.
- La comprobación visual adicional de este panel no pudo ejecutarse por timeout
  del transporte CDP del navegador integrado. Las 38 pruebas web sí se ejecutaron;
  no se declara una nueva prueba visual ni nativa.

La guía de [frecuencia/modo](control-frecuencia-modo.md) detalla contratos,
configuración y límites. No valida PTT, TX, CW, RF ni reproducción móvil.

## Consolidación PTT FTX-1

- **186 pruebas Python y 43 web** correctas; Ruff/formato, lint y
  TypeScript/build correctos. No quedan avisos de lint introducidos por PTT.
- Watchdog con tiempo real (lease 2 s), techo absoluto pese a renovaciones,
  secreto ajeno, reserva exclusiva CAT y ausencia de secreto en GET.
- START tardío cancelado, confirmación perdida sin reintentar TX, eco tardío,
  cambios locales y STOP incierto con retención del puerto hasta confirmar RX.
- Guardas MAIN/VFO/simplex, split/clarificador, SSB, AC y PC según manual,
  límites locales y JSON estricto. HTTP agente/host con roles y origen;
  START/STOP también cruzan dos saltos HTTPS validados.
- Panel compartido: ratón/táctil y teclado, renovación mantenida, soltar,
  pérdida de foco, desmontaje y respuesta START tardía.
- ZIPAPP y wheel reconstruidos y cotejados con el fuente. Desde fuera del
  checkout: 16 pruebas sobre ZIPAPP y 22 sobre wheel instalado, incluyendo
  watchdog/PTT/proxy y certificados mTLS positivos/negativos.
- APK `assembleDebug`/`lintDebug` correctos, firma v2 verificada y cuatro
  recursos web idénticos entre APK, web, Android e iOS.
- Revisión de seguridad limitada al nuevo canal PTT: no se identificaron
  vulnerabilidades explotables. No equivale a garantía de invulnerabilidad
  ni a revisión completa del producto.

No se abrió hardware ni se emitió RF. El PTT sigue desactivado por defecto;
[sus limitaciones](ptt-ftx1.md) incluyen fallo USB/proceso, ausencia de interlock
físico, CW y aceptación nativa/RF pendientes. El audio TX es un opt-in separado.

## Consolidación del micrófono remoto

- **199 pruebas Python y 50 web** correctas; Ruff/formato (71 archivos), lint,
  TypeScript y build correctos.
- DAC explícito por índice/nombre/canal, silencio antes de autorizar PTT y
  después de STOP; PCM16LE estéreo solo en el canal seleccionado.
- Dos bloques recientes de prebuffer, máximo ocho en TX; underflow, overflow,
  frames inválidos, estado nativo y falta de frescura invalidan la sesión.
- Carreras apertura/cierre nativo y doble cierre sin liberar la reserva antes
  de terminar. Un fallo de limpieza no oculta el error original de apertura.
- Captura cliente con cancelación de permiso tardío, cierre de pistas/contexto,
  rechazo de audio atrasado/red saturada, y PTT bloqueado sin capacidad de audio.
- Worklet ejecutado en VM: exactamente 960 muestras/1920 bytes, PCM16LE,
  clipping y bloques no alineados; máximo ocho mensajes sin ACK.
- Conexiones WebSocket reales por dos enlaces TLS y mTLS: rechazo de origen,
  rol oyente, token incorrecto, CA incorrecta y cliente sin certificado antes
  de abrir DAC. PCM real de prueba hasta el callback DAC controlado y RX al
  perder el canal. Diez repeticiones consecutivas correctas del circuito.
- ZIPAPP y wheel cotejados con todos sus módulos fuente. **28 pruebas aisladas
  desde ZIPAPP y 35 desde wheel instalado fuera del checkout**, con comprobación
  del origen de imports y licencias incluidas de wsproto/h11.
- Cinco recursos idénticos entre web, Android, iOS, APK y wheel, incluido el
  worklet TX; declaración de permiso de micrófono iOS comprobada.
- APK reconstruido con assembleDebug/lintDebug correctos, firma v2 verificada
  y permisos RECORD_AUDIO/MODIFY_AUDIO_SETTINGS presentes en el APK compilado.
- Revisión de seguridad acotada al incremento de voz y al relay final:
  no se identificaron vulnerabilidades explotables. No es una auditoría
  completa ni garantía de invulnerabilidad.

No se abrió hardware ni se emitió RF. Fonía sigue siendo experimental;
no se certifican USB, niveles, captura/reproducción móvil, CW ni IPA iOS.
Véase [configuración y límites de audio TX](audio-tx.md).
