# Estudio de UX para Bricohams Radio Workspace

## Alcance y evidencia

Comparacion cualitativa de documentacion publica, no copia de pantallas, codigo,
iconos o marcas. No se han operado transceptores fisicos ni probado cuentas
comerciales. Las observaciones describen funciones documentadas por cada proyecto;
no acreditan que BricoHams las implemente.

No existe evidencia suficiente para ordenar estos productos por usuarios activos.
Estrellas GitHub, antiguedad, descargas y afirmaciones comerciales no equivalen
a usuarios ni a calidad de UX. La popularidad de BricoHams es un objetivo, no
una promesa verificable mediante un cambio de interfaz.

## Comparativa documentada

| Referencia | Modelo de interaccion documentado | Aprendizaje aplicable | Limite para BricoHams |
|---|---|---|---|
| [wfview: ventana principal](https://wfview.org/wfview-user-manual/main-window/) | Frecuencia, modo, medidores y scope vinculados a datos de radio; controles adicionales desplegables; entrada numerica y teclado | Priorizar operacion sobre catalogos; distinguir estado observado y accion; revelar opciones avanzadas a demanda | No copiar el widget ni convertir scroll de pagina en cambios CAT; FTX-1 no exporta scope verificado |
| [wfview: manual](https://wfview.org/wfview-user-manual/) | Primer arranque, ajustes, atajos, audio, memorias, servidor headless y ayuda por tarea | Organizar ayuda alrededor de conectar, operar y resolver fallos | Un backend ajeno compatible no acredita una radio BricoHams |
| [OpenWebRX](https://www.openwebrx.de/) | Receptor SDR multiusuario desde navegador, orientado tambien a principiantes | Reducir barreras de entrada y ofrecer recorrido RX reconocible | Es receptor SDR; no demuestra PTT seguro ni el scope nativo FTX-1 |
| [CHIRP](https://chirpmyradio.com/projects/chirp/wiki/Home) | Programacion de memorias/modelos, fuentes de datos y guia de soporte | Edicion tabular y modelo explicito en herramientas locales; respaldo separado de operacion en vivo | Programar memorias no equivale a control remoto de estacion |
| [WSJT-X: guia](https://wsjtx.github.io/wsjtx/guide.html) | Instalacion, configuracion de transceptor, tutorial de primer QSO, mensajes, controles y logbook | Separar configuracion de operacion; explicar el estado de digitales y el paso siguiente | BricoHams tiene integracion UDP pasiva, no motor digital TX integrado |
| [WSJT-X: soporte](https://wsjtx.github.io/wsjtx/support.html) | Informes de bugs con version, sistema y pasos reproducibles | Combinar informe tecnico minimizado con descripcion voluntaria reproducible | No enviar QSO, audio, tokens o rutas para mejorar el diagnostico |
| [SmartSDR](https://www.flexradio.com/ssdr/) | Clientes por plataforma, panadapter con marcas de banda y funciones/licencias diferenciadas | Jerarquia coherente y disponibilidad explicita de funciones | Es ecosistema FlexRadio; no adoptar su API privada ni atribuir funciones a FTX-1 |
| [SmartSDR iOS: guia independiente](https://documents.roskosch.de/smartsdr-ios/) | Herramientas/modos separados, tactil con menos controles por fila en iPhone, demo identificada y ayuda contextual | Mismo vocabulario en telefono/tablet; adaptacion tactil sin perder estado; demo inequívoca | Su conexion de radio por Ethernet no sustituye la cadena USB de BricoHams |
| [Ham Radio Deluxe](https://www.hamradiodeluxe.com/features/) | Modulos integrados de radio, logbook, digitales, rotor y satelite; interoperacion WSJT-X | Un flujo de trabajo integrado con especializacion por tarea | No copiar modulos/recursos comerciales ni confundir interoperacion con motor integrado |
| [QLog](https://github.com/foldynl/QLog) | Layout personalizable, SQLite local, rig/rotor/CW por backend y ausencia declarada de tracking | Transparencia de backend y privacidad; logbook ligado a operacion, no a telemetria del usuario | La recomendacion desktop 1920x1080 no es un diseno movil aceptable |

GridTracker no se usa como evidencia de esta comparativa: las direcciones
consultadas no pudieron verificarse. La URL antigua de WSJT-X redirige al nuevo
sitio; se utiliza la documentacion que enlaza el sitio oficial actual.

## Diagnostico de la interfaz existente

1. Los catalogos de investigacion y protocolos aparecian antes de controles reales:
   un operador tenia que recorrer documentacion para encontrar frecuencia/PTT.
2. Estado del coordinador, demostracion y estado del agente son conceptos distintos.
   Un aviso heredado afirmaba que no habia PTT en la consola, aunque existe un
   panel protegido del agente; debe aclararse sin autorizar TX.
3. Los paneles de scope no disponible ocupaban area visual importante. No deben
   aparentar muestras, ocupar el centro operativo ni sustituirse por un SDR.
4. Controles de 42 px y metadatos de 10 px ofrecen margen de mejora para tactil.
5. Cambiar el aspecto no puede desmontar una sesion PTT/audio, generar comandos,
   relajar permisos ni introducir telemetria de comportamiento.

## Criterios del rediseño original

- **Radio primero:** estado y controles, despues capacidad/catalogos/diagnostico.
- **Acceso directo por tareas:** enlaces a CAT, PTT, rotor, potencia y logbook,
  sin nuevos atajos que puedan transmitir o alterar frecuencia accidentalmente.
- **Seguridad visible:** demo, hardware, consentimiento, RX no confirmado y
  funcion no disponible se indican con palabras, no solo colores.
- **Mismos componentes y lifecycle:** reordenar presentacion conserva keys,
  handlers, leases, permisos y cierre de audio existentes.
- **BricoHams oficial:** grafito/naranja, texto grafito sobre naranja, tipografia
  del manual de marca y logotipos suministrados sin modificar.
- **Tactil y legible:** objetivo de 44 px en controles principales; contenido
  sin desbordamiento horizontal a 320 px y con zoom de texto.
- **Ayuda accesible:** instalacion, operacion y solucion de problemas separadas;
  nuevos textos disponibles ES/EN/FR/PT.
- **Privacidad por defecto:** medir errores tecnicos, no personas ni sesiones
  identificables; cualquier estudio de uso posterior requiere consentimiento propio.

## Comprobacion y limites

La reordenacion exige pruebas de DOM para que los controles operativos precedan
al catalogo y los enlaces resuelvan. Las pruebas existentes de PTT/audio son
regresion obligatoria. Build/type-check y lint deben seguir correctos.

Objetivos visuales de 320/768/1280 px, zoom 200 %, tema claro/oscuro y tactil real
requieren comprobacion visual/dispositivo. El navegador integrado fallo por
timeout CDP: no se presenta una prueba DOM como una aceptacion visual.

La primera implementacion del escritorio operativo compartido no termina el
rediseño de todas las pantallas RadiCodex/Workspace, ni implementa CW/digitales
activos o funciones de hardware pendientes.

El portal incorpora el recorrido radio/agente, host HTTPS y operacion protegida.
RadiCodex pliega la configuracion de conexion para ceder espacio a la consola
sin reemplazar WebView; mantiene desconexion/estado visibles y restaura la
configuracion al cerrar o abandonar la sesion. Los limites TLS, origen y permisos
de microfono no cambian.
