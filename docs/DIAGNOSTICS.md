# Diagnostico remoto / Remote diagnostics / Diagnostic distant / Ferndiagnose

## ES - Privacidad y funcionamiento

El sistema registra **datos tecnicos minimizados**, no telemetria oculta. El envio
remoto esta desactivado por defecto y requiere consentimiento y un receptor HTTPS
configurado por el administrador. No se presupone un servicio central de BricoHams.

El contrato acepta exclusivamente version de software, componente, plataforma
generica y hasta 16 eventos con codigo, area, severidad, categoria del error y
numero de linea. No admite mensajes, valores de excepciones, rutas, nombres de
usuario, tokens, indicativos, QSO, frecuencias, audio, ubicacion, puertos ni
identificadores del dispositivo o instalacion. Los campos adicionales se rechazan:
no se intenta limpiar texto arbitrario para despues enviarlo.

**No se promete anonimato absoluto.** El receptor, su proveedor o un proxy pueden
conocer IP, credencial de autorizacion, hora y metadatos de conexion. El operador
del receptor debe configurar sus propios registros y politica de retencion.

### Clientes

- Consola de estacion web, Android/tablet e iPhone/iPad: Configuracion permite
  revisar, descargar, importar, enviar una vez, activar envio automatico en primer
  plano y borrar registros locales. El consentimiento automatico no se guarda;
  desconectar o reiniciar lo desactiva. Se usa el host HTTPS de esa sesion.
- RadiCodex: la tarjeta de diagnostico permite revisar y autorizar el envio con
  URL HTTPS y token exclusivo en memoria. Solo envia en primer plano; desactivar
  o reiniciar impide nuevos envios. Una peticion ya iniciada puede haber llegado.
- Workspace HTML5: cada pagina de herramienta ofrece vista JSON, descarga,
  borrado local y envio manual mediante el servidor local autorizado. GitHub
  Pages no recibe informes: descargar e importar en el cliente HTTPS.
- Los antiguos informes USB detallados son privados y no se envian por estos
  mecanismos. Revisarlos por separado antes de compartirlos manualmente.

El registro nativo y la validacion de origen HTTPS residen en la biblioteca Android
`station-core`, reutilizable sin dependencias de la interfaz RadiCodex. Cada
aplicacion inicializa el registro con su componente del contrato cerrado y su
version publica; esa identidad no puede cambiar durante la misma aplicacion.
RadiCodex conserva `radicodex` y su version compilada. El agente independiente
utilizara `station-agent`, sin identificadores USB en los informes. El contrato
JSON se genera desde la misma definicion Python y se empaqueta con la biblioteca.
Esta extraccion no implementa por si sola el agente OTG ni cambia consentimiento,
limites, retencion, validacion TLS o confirmacion HTTPS de recepcion.

Los clientes JS conservan hasta 128 eventos y RadiCodex hasta 500 entradas.
La caducidad logica es de siete dias, comprobada al leer/escribir; un dispositivo
apagado no ejecuta una purga. Borrar aqui elimina solo registros locales: no
retira informes ya recibidos ni garantiza borrado fisico de copias de seguridad.
Los errores de almacenamiento y de entrega se muestran; permitir envio no
equivale a entrega confirmada.

### Receptor y agentes Python

El coordinador habilita la recepcion con:

```text
bricohams-station-host --diagnostic-report-database <ruta-privada>/reports.sqlite3
```

Agregar los argumentos TLS y de estacion habituales; el ejemplo no sustituye
la configuracion HTTPS. Cuando conviva con Workspace local (puerto 8787), usar
un puerto diferente para el coordinador, por ejemplo `--port 8443`.

Configurar `BRICOHAM_DIAGNOSTIC_REPORTER_TOKEN` con una credencial aleatoria
exclusiva de al menos 32 caracteres. El rol `diagnostic_reporter` puede entregar
informes, pero no controla RF ni consulta informes. Administrador/operador tambien
pueden entregar; solo administrador consulta `GET /api/v1/diagnostic-reports`.
La recepcion esta deshabilitada si no se configura la base de datos.

Host y agente generan registros locales en `~/.bricohams/diagnostics`, configurable
con `--diagnostic-directory`. Para autorizar envio a un receptor:

```text
--diagnostics-opt-in --diagnostics-url https://diagnostic.example.org
```

El secreto se proporciona mediante `BRICOHAM_DIAGNOSTICS_TOKEN`, nunca en URL,
argumentos del informe ni codigo fuente. No reutilizar credenciales de control
de estacion; el arranque rechaza esa reutilizacion en los agentes Python.
`--diagnostics-ca <archivo>` permite confiar en una CA propia sin omitir TLS.
Las colas en memoria son acotadas a 128 eventos; ante saturacion se notifica el
descarte de los mas antiguos. El worker no hace I/O en la ruta de logging RF.
Los registros locales sobreviven al reinicio; la cola remota no es un outbox
duradero y se reconstruye con eventos nuevos, no con todo el historico.

El almacen receptor limita 500 informes, entrega los ultimos 50 al administrador
y aplica siete dias de retencion logica y limite de paginas SQLite. No guarda IP
en el informe. La API limita 4096 bytes por informe y 60 entregas por minuto.
Ante fallo HTTPS/confirmacion se reintenta con espera entre 60 y 600 segundos.
Solo HTTP 202 con exactamente `{"accepted":true}` confirma recepcion.

### Workspace Node local

`npm start` genera historial minimizado local, separado de las salidas originales
de consola, que pueden contener diagnostico detallado y permanecen privadas.
El historial JSONL mantiene como maximo 128 informes y caducidad logica de siete
dias. No se expone por una API de lectura publica.

Configurar en el entorno del proceso:

```text
BRICOHAM_DIAGNOSTICS_OPT_IN=1
BRICOHAM_DIAGNOSTICS_URL=https://diagnostic.example.org
BRICOHAM_DIAGNOSTICS_TOKEN=<secreto-exclusivo>
BRICOHAM_DIAGNOSTICS_CA=<archivo-CA-opcional>
```

La autorizacion habilita los logs tecnicos del host y el relevo de un informe
del navegador cuando se pulsa Enviar. Sin ella no hay red de diagnostico.
El POST local exige origen exacto, JSON cerrado y limite de tamano. El servidor
continua en loopback; no es un proxy de CAT, PTT ni firmware remoto.

## EN - User guide

Remote sending is off by default. Review the JSON before consenting. Only public
software metadata and fixed error categories are allowed; messages, secrets,
callsigns, QSOs, frequencies, audio, location and device/installation IDs are
excluded. HTTPS does not hide your IP or connection metadata from the receiver.

Use Settings in the shared station client, Diagnostics in RadiCodex, or the
technical panel in Workspace. Pages users download and import the JSON into the
HTTPS station client. Automatic client consent is session-only and foreground-only.
Clearing local logs does not recall delivered reports or erase backups physically.
Bounded logs expire logically after seven days, when the application is active.
Legacy detailed USB exports are private and never automatically uploaded.

Deployment uses the exact flags/environment variables above. Configure your own
HTTPS receiver, dedicated diagnostic credential, CA if needed, retention and proxy
logging. The reporter role cannot control radio hardware. No public BricoHams
collector, absolute anonymity, confirmed delivery without acknowledgement or
physical hardware validation is assumed.

## FR - Guide utilisateur

L'envoi distant est desactive par defaut. Examinez le JSON avant de consentir.
Seules les metadonnees publiques du logiciel et categories d'erreur fixes sont
autorisees : ni messages, secrets, indicatifs, QSO, frequences, audio, localisation
ou identifiants d'appareil/installation. HTTPS ne masque pas votre IP ou les
metadonnees de connexion au recepteur.

Utilisez Configuration du client de station, Diagnostic de RadiCodex ou le panneau
technique Workspace. Sur Pages, telechargez puis importez le JSON dans le client
HTTPS. Le consentement automatique des clients ne vaut que pour la session et le
premier plan. L'effacement local ne retire pas les rapports recus et n'efface pas
physiquement les sauvegardes. La retention logique de sept jours est appliquee
lorsque l'application est active. Les anciens exports USB detailles restent prives.

Le deploiement utilise exactement les options et variables ci-dessus. Configurez
votre propre recepteur HTTPS, secret de diagnostic exclusif, CA si necessaire,
retention et journaux du proxy. Le role reporter ne controle pas la radio. Aucun
collecteur public BricoHams, anonymat absolu ou validation materielle n'est presume.

## DE - Benutzerhilfe

Der Fernversand ist standardmaessig aus. JSON vor der Zustimmung pruefen. Erlaubt
sind nur oeffentliche Softwaremetadaten und feste Fehlerkategorien: keine Meldungen,
Geheimnisse, Rufzeichen, QSOs, Frequenzen, Audiodaten, Standorte oder Geraete- und
Installationskennungen. HTTPS verbirgt IP und Verbindungsmetadaten nicht vor dem
Empfaenger.

Stationsclient-Einstellungen, RadiCodex-Diagnose oder das technische Workspace-Panel
verwenden. Auf Pages JSON herunterladen und im HTTPS-Client importieren. Automatische
Client-Zustimmung gilt nur fuer die Sitzung im Vordergrund. Lokales Loeschen ruft
gesendete Berichte nicht zurueck und loescht Sicherungen nicht physisch. Begrenzte
Protokolle verfallen logisch nach sieben Tagen bei aktiver Anwendung. Alte
detaillierte USB-Exporte bleiben privat und werden nie automatisch gesendet.

Deployment verwendet die oben angegebenen Optionen und Umgebungsvariablen. Eigenen
HTTPS-Empfaenger, exklusives Diagnosegeheimnis, gegebenenfalls CA, Aufbewahrung und
Proxy-Protokolle konfigurieren. Reporter darf keine Funkhardware steuern. Es werden
kein oeffentlicher BricoHams-Empfaenger, absolute Anonymitaet oder Hardwarevalidierung
vorausgesetzt.

## PT - Guia do utilizador

O envio remoto esta desativado por defeito. Reveja o JSON antes de autorizar.
So sao permitidos metadados publicos do software e categorias fixas de erros:
sem mensagens, segredos, indicativos, QSO, frequencias, audio, localizacao ou
identificadores do dispositivo/instalacao. HTTPS nao oculta o IP ou metadados
de ligacao ao recetor.

Use Configuracao do cliente de estacao, Diagnostico do RadiCodex ou o painel
tecnico Workspace. Em Pages descarregue e importe o JSON no cliente HTTPS.
O consentimento automatico do cliente vale apenas durante a sessao em primeiro
plano. Apagar registos locais nao retira relatorios enviados nem apaga fisicamente
copias de seguranca. Os registos limitados expiram logicamente apos sete dias
quando a aplicacao esta ativa. Exportacoes USB detalhadas antigas continuam privadas.

Use as opcoes e variaveis acima para configurar recetor HTTPS proprio, segredo
exclusivo, CA opcional, retencao e registos do proxy. O papel reporter nao controla
a radio. Nao se pressupoe recetor publico BricoHams, anonimato absoluto ou
validacao fisica do hardware.
