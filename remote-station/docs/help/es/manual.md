# Ayuda Bricohams Radio Workspace - Remote Station

Guía de usuario del software disponible. Experimental no significa validado con hardware. La radio se conecta físicamente al agente; el cliente se conecta al host.


<a id="installation"></a>

## Instalación y arquitectura

El host coordinador sirve la consola HTML5/JavaScript y controla el acceso. El agente headless se ejecuta junto a la radio en Windows, Linux, macOS o Raspberry Pi con Python compatible. El ZIPAPP no incluye una interfaz gráfica ni exige Node.js para ejecutarlo.

Instala Python 3.12 o posterior y el agente/host publicados. El audio necesita el extra sounddevice y PortAudio cuando corresponda. El APK disponible es debug; iOS requiere macOS/Xcode. No se declara aceptación física o multiplataforma.

1. Conecta la radio por USB o su interfaz serie documentada al equipo del agente.
2. Configura tokens distintos para los roles y un secreto distinto para el enlace host→agente remoto.
3. Inicia el agente con la configuración local explícita, después el host, y abre la consola.
4. Mantén el agente, sistema operativo y dependencias actualizados.

[Referencia técnica (ES)](../../instalacion.md)

<a id="connection"></a>

## Conexión y autenticación

En web, la consola utiliza su propio host. Android/iOS requieren la URL HTTPS del host, sin usuario, contraseña, ruta o parámetros. El token de acceso solo permanece en memoria; no se guarda en archivos, cookies ni almacenamiento local.

Admin y operador pueden acceder a controles autorizados; oyente recibe audio RX y datos permitidos, pero no PTT. Invitado tiene acceso restringido. Una sesión conectada no implica que una radio física esté conectada.

1. Introduce el host HTTPS cuando lo pida el cliente y pega tu token de rol.
2. Pulsa Conectar; revisa los avisos de permisos y disponibilidad del agente.
3. Configura CA/hostname y los orígenes de cliente autorizados en el host; nunca ignores un certificado.
4. Desconecta antes de cambiar de host o de credenciales.

[Referencia técnica (ES)](../../despliegue-seguro.md)

<a id="configuration"></a>

## Configuración del agente, host y USB/CAT

La pantalla Configuración prepara comandos locales; no los ejecuta, no instala drivers y no abre puertos. Modelo, puerto y baud deben elegirse explícitamente. El inventario no identifica automáticamente el puerto CAT.

Sin opt-in CAT, el agente solo enumera dispositivos. El asistente no activa PTT, ATU, VOX, RTS o DTR. Un driver USB puede producir pulsos al abrirse: valida la instalación física y conserva una parada local.

La sección del host requiere certificado/clave TLS, URL HTTPS del agente y CA de confianza. El certificado/clave cliente mTLS son una pareja opcional; los orígenes autorizados se añaden explícitamente. Define BRICOHAM_ADMIN_TOKEN y BRICOHAM_STATION_AGENT_TOKEN distintos en el entorno local, nunca en URL/comandos compartidos. La misma clave de enlace debe configurarse en el agente según la guía de despliegue.

1. Selecciona el sistema del agente y un modelo con perfil serie, no una primitiva de red de familia.
2. Identifica el puerto por fabricante/interfaz y documentación; no uses automáticamente el primer COM o ttyUSB.
3. Introduce baud y bits de parada iguales a los configurados en la radio.
4. Copia el comando generado en el equipo del agente. Para acceso remoto añade certificado/clave TLS y configura el host.
5. Instala el wheel del host; prepara y copia su comando en el equipo coordinador. Verifica certificados, hostname y secretos antes de conectar.
6. Para clientes móviles permite solo sus orígenes exactos, por ejemplo https://localhost y capacitor://localhost, separados por coma.
7. Los límites y opt-ins de potencia/PTT/audio requieren los ficheros administrativos locales documentados.

[Referencia técnica (ES)](../../despliegue-seguro.md)

<a id="cat"></a>

## Radios, funciones y compatibilidad

El catálogo diferencia candidato, perfil de consultas, sintaxis de familia y hardware verificado. Un perfil CAT no acredita todas las funciones de un modelo, firmware, interfaz USB o amplificador. No se prueban radios en este entorno.

FTX-1: lecturas y ajustes experimentales FA/FB MAIN/SUB, MD0/MD1 y consigna PC con opt-ins y readback. MAIN/SUB no selecciona automáticamente el transmisor. SPA-1 no tiene una interfaz independiente inventada. El espectro/waterfall nativo permanece unsupported; no se sustituye por un SDR ni por simulación oculta.

1. Consulta Protocolos y radios candidatas; comprueba el perfil exacto y sus consultas.
2. Lee primero el estado antes de modificar frecuencia, modo o potencia.
3. Si hay error, TX/ATU o respuesta no confirmada, solicita RX y vuelve a leer; no reintentes TX.
4. Consulta la matriz técnica y la documentación del fabricante para el modelo y firmware.

[Referencia técnica (ES)](../../compatibilidad.md)

<a id="audio"></a>

## Audio RX y micrófono remoto

RX utiliza una entrada explícita del agente y AudioWorklet en el cliente. TX utiliza micrófono real, PCM16LE mono 48 kHz y WebSocket autenticado host→agente. No es WebRTC ni audio digital WSJT-X.

Para TX configura el DAC por índice, nombre y canal, selecciona localmente la entrada USB correcta y apaga VOX. El DAC permanece silenciado hasta confirmar PTT. No hay fallback al micrófono local de la radio si se exige la sesión de audio.

1. Pulsa Escuchar RX para iniciar recepción y autoriza únicamente los permisos necesarios.
2. Para fonía, consulta PTT, confirma RX y pulsa Preparar micrófono remoto.
3. Espera el canal preparado, habilita la casilla de sesión y mantén el botón PTT.
4. Soltar solicita RX; Desconectar micrófono libera las pistas. Pérdida de foco/canal, audio atrasado o saturación detienen la sesión.
5. No se certifican niveles, rutas USB ni captura/reproducción móvil hasta la aceptación física.

[Referencia técnica (ES)](../../audio-tx.md)

<a id="safety"></a>

## PTT, límites y seguridad RF

PTT FTX-1 es experimental, desactivado por defecto y puede emitir RF real. Solo MAIN VFO simplex LSB/USB, sin split ni clarificador TX, con límites locales de frecuencia, consigna PC y tiempo. La potencia CAT es consigna, no potencia RF medida.

La sesión exclusiva CAT dura dos segundos, se renueva mientras se pulsa y tiene un techo absoluto. STOP incierto bloquea nuevos START y reintenta RX. La pérdida de USB, proceso, VOX o PTT local no queda resuelta por un watchdog de software. No existe garantía de invulnerabilidad.

1. Utiliza PARAR TX / confirmar RX antes del primer START.
2. Nunca operes sin autorización, límites de banda y protecciones RF locales.
3. Mantén una parada física independiente del USB y acceso al operador de estación.
4. No publiques puertos CAT, rotctld ni UDP WSJT-X; usa TLS, cortafuegos y secretos separados.
5. CW virtual y TX digital activo no están implementados; no son botones de demostración.

[Referencia técnica (ES)](../../ptt-ftx1.md)

<a id="accessories"></a>

## Rotores, acopladores y potencia

El rotor rotctld usa posición, objetivo, límites mecánicos, lease y STOP. Solo se conecta por loopback; no autentica procesos locales. Una parada sin confirmación bloquea movimientos.

IC-7300 permite RF PWR CAT e insertar/bypass ATU con permisos y límites locales. FTX-1 PC limita la consigna field/SPA-1. No se ofrece sintonía automática ni control genérico de cualquier amplificador/acoplador.

1. Configura el rotor en el agente con límites físicos y parada independiente.
2. Consulta posición antes de mover y conserva STOP disponible.
3. Lee potencia/estado del acoplador antes de ajustar; respeta las unidades por modelo.
4. No confundas insertar ATU con ejecutar TUNE ni consigna de potencia con un medidor.

[Referencia técnica (ES)](../../control-potencia-acoplador.md)

<a id="logs-digital"></a>

## Logbook y digitales WSJT-X

El logbook local usa SQLite, alta de QSO por rol y exportación ADIF. No hay sincronización ni importación automática. Revisa indicativo, hora, frecuencia y modo antes de guardar.

El agente recibe estado/decodes UDP pasivos de una instancia WSJT-X identificada. El UDP local no está autenticado ni es apto para autorizar control. WSJT-X se instala aparte; no se ha integrado su motor TX ni audio digital.

1. Configura el puerto UDP e ID exactos de WSJT-X en el agente.
2. No expongas UDP a Internet ni uses una decodificación como permiso para transmitir.
3. Guarda el QSO de forma explícita y exporta ADIF para tu registro externo.
4. La descarga de archivos en cada cliente móvil requiere aceptación nativa.

[Referencia técnica (ES)](../../logbook.md)

<a id="mobile"></a>

## Android, tablet, iPhone e iPad

Los clientes comparten la consola responsive y los controles implementados. Android declara permiso de micrófono y lo solicita al preparar audio, no al entrar. iOS incluye la descripción de uso del micrófono.

El APK debug está compilado; no es firma de producción ni prueba en tablet. Los proyectos iPhone/iPad están preparados, sin IPA verificada. El agente Android USB OTG independiente todavía no está implementado.

1. Usa un certificado confiable para el dispositivo y el origen nativo permitido en el host.
2. Mantén la app en primer plano durante PTT; ocultar o cerrar solicita RX y libera micrófono.
3. Si un diálogo de permiso cancela la preparación, repite el gesto después de concederlo; no se reintenta TX.
4. Verifica ciclo de vida, audio y descarga ADIF antes de aceptación final.

[Referencia técnica (ES)](../../clientes-moviles.md)

<a id="troubleshooting"></a>

## Diagnóstico y solución de problemas

401: token ausente/inválido; 403: rol u origen no permitido; 409: recurso ocupado o sesión no confirmada; 503/502: agente, configuración o enlace no disponible. Revisa el código específico mostrado y los logs sin compartir secretos.

CAT busy durante PTT es deliberado. Si RX no se confirma, usa la parada física. Un DAC renombrado, audio no fresco, samplerate no soportado o permiso denegado bloquean audio; no se selecciona otro dispositivo silenciosamente.

1. Consulta /healthz del host/agente y verifica certificados, hostname y reloj.
2. Comprueba cable USB, driver, puerto explícito, baud y ausencia de otro programa propietario del CAT.
3. Revisa tokens/roles/orígenes sin poner secretos en URL, capturas o tickets.
4. Para audio revisa PortAudio/sounddevice, nombre/canal del DAC, VOX apagado y permiso de micrófono.
5. Distingue demostración de telemetría real y conserva el error original; no declares éxito tras una parada incierta.

[Referencia técnica (ES)](../../diagnostico.md)
