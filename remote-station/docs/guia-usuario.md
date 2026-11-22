# Guía de usuario

Consulta la [ayuda completa ES/EN/FR/PT](help/README.md): instalación,
conexión, configuración de agente/host, CAT, audio, seguridad, accesorios,
logbook/digitales, móviles y diagnóstico. También está integrada en la consola
y los clientes empaquetados, sin iniciar sesión.

Por defecto se consulta un simulador identificado y no se abre una radio.
Los transportes CAT/audio y accesorios requieren configuración local opt-in;
las pruebas físicas siguen pendientes. La pantalla Configuración prepara
comandos para Windows, Linux/macOS/Raspberry Pi, sin ejecutarlos ni activar TX.

## Iniciar

Consulta [el arranque local del README](../README.md#arranque-local-powershell).
El servidor escucha en loopback y exige un token para los datos de estación.
Después de compilar el frontend, abre `http://127.0.0.1:8790/`, introduce el token
en el formulario y pulsa **Conectar**. El token solo se mantiene en memoria de la
pestaña; **Actualizar datos** vuelve a consultar la API y **Desconectar** borra
el estado de sesión local.

## Consultar estado y capacidades

- `GET /healthz`: confirma que el proceso responde; no requiere token y no
  devuelve estado de estación.
- `GET /api/v1/status`: devuelve datos fijos del simulador con
  `data_is_simulated: true` y `hardware_connected: false`.
- `GET /api/v1/capabilities`: lista capacidades por modelo con estado y evidencia.
- `GET /api/v1/radios`: catálogo de 46 modelos candidatos; conexión, bandas y
  scope, etiquetas beta y pruebas atribuidas a la fuente pública indicada, no
  verificadas por BricoHams.
- `GET /api/v1/devices`: admin/operador; muestra interfaces serie enumeradas por
  el agente local, siempre como no clasificadas.
- `GET /api/v1/diagnostics`: admin/operador; confirma que no se ha detectado
  hardware y que CAT/TX no están habilitados.

Espectro y waterfall muestran estado `unsupported` y no contienen muestras.
La consola presenta frecuencia, VFO, modo y banda como datos de solo lectura.
Para ver inventario, inicia `py -3.12 -m bricoham_station_agent` con el mismo
token admin; la aplicación no abre interfaces ni identifica el puerto CAT. No hay
controles para cambiar frecuencia, PTT, audio o el agente.

La sección **Radios candidatas** agrupa referencias por fabricante. La etiqueta
«CANDIDATA · NO VALIDADA» es deliberada: “probado” en una ficha de terceros no
significa probado por BricoHams, y que una ficha enumere scope no demuestra que
sus muestras nativas sean exportables.

## Protocolos y contactos

En **Consultas CAT por modelo**, pulsa **Consultar protocolos** y selecciona
una radio. Se distingue perfil por modelo, sintaxis de familia y perfil no
implementado. La lista muestra consultas y disponibilidad de decoder; no envía
comandos al equipo.

Para activar **Logbook**, inicia el coordinador con
`--logbook-database ".\logbook.sqlite3"` y vuelve a conectar. Pulsa
**Consultar logbook**: admin y operador verán el formulario de alta manual;
el oyente solo puede leer y exportar ADIF. Introduce fecha con zona explícita y
frecuencia entera en Hz; no uses la demostración como contacto real.
Consulta [los límites y copias de seguridad](logbook.md).
