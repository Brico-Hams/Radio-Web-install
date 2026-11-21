# Estación remota integrada

El desarrollo original BricoHam Remote Station se incorpora como
`remote-station/` a **Bricohams Radio Workspace / RadiCodex**.
Se conserva íntegro el código propio, sus tests, documentos y proyectos móviles,
sin caches, SDK locales, secretos ni binarios de compilación.
La licencia raíz GPL-3.0-or-later y los avisos MIT del componente se conservan;
no se cambian las licencias de dependencias ni de recursos de terceros.

## Integración y límites

- La navegación web incluye **Estación remota**. Prepara una URL HTTPS validada
  y abre el cliente servido por el host; no recoge ni envía tokens.
- RadiCodex Android incluye una pantalla HTTPS interna: sin puentes JavaScript
  nativos, acceso a ficheros ni contenido mixto. Fija el origen seleccionado,
  rechaza certificados inválidos y solicita permiso únicamente para micrófono.
  Al pasar a segundo plano destruye la página/sesión, sin reconexión automática.
- El cliente Android dedicado y el proyecto iPhone/iPad permanecen en
  `remote-station/apps/web-console/`, con marca, colores, tipografía y recursos
  oficiales BricoHams. iOS requiere Mac/Xcode para compilar y firmar.
- El host coordinador y los agentes headless se ejecutan por separado.
  El servidor Node local de firmware **no se publica en Internet** ni se
  convierte en proxy remoto. No se exponen copias/codeplugs ni proveedores.
- No se cambian los conectores USB, memoria, firmware ni funciones nativas
  existentes. Los perfiles CAT de estación son independientes y opt-in.
- Se mantienen identificadores de protocolo, variables `BRICOHAM_*`, paquetes
  Python y application IDs para evitar romper configuración/clientes existentes.
  Se añaden aliases `bricohams-station-host` y `bricohams-station-agent`.

## Compilar y ejecutar

En la raíz, Node 22 y Python 3.12 o superior:

```powershell
npm ci
npm --prefix remote-station/apps/web-console ci
npm run build:station-branding
py -3.12 -m venv remote-station\.venv
remote-station\.venv\Scripts\python.exe -m pip install .\remote-station
npm run build:station
```

Los paquetes de host y agente se generan en `remote-station/dist/`.
En POSIX, utiliza `python3` y `remote-station/.venv/bin/python`.
La [guía de despliegue seguro](../remote-station/docs/despliegue-seguro.md)
describe TLS/CA/hostname, mTLS opcional y secretos separados por rol/enlace.
La [ayuda multilingüe](../remote-station/docs/help/README.md) está integrada
en el cliente HTTPS y los clientes dedicados.

La URL de conexión no contiene tokens, rutas ni parámetros. Debe apuntar al
host HTTPS que sirve la consola compilada, no al puerto del agente.
Para RadiCodex WebView se exige una cadena de certificados confiable para
Android; nunca se omite un error TLS. El cliente dedicado Capacitor requiere
los orígenes exactos documentados en el host.

## Validación y seguridad RF

CAT, audio, PTT, rotores, potencia y ATU conservan sus interlocks y estados
documentados. PTT requiere opt-in y límites independientes; perder el cliente
activa el watchdog, no garantiza una parada física. Comprueba RX en la radio.
No se declara aceptación USB/RF/móvil ni compatibilidad completa por disponer
de un perfil. CW remoto activo, WSJT-X activo, scope nativo FTX-1 y agente
Android headless OTG siguen pendientes; no se simulan como funciones reales.
## Diagnostico

Todos los componentes disponen de registro tecnico minimizado y opciones de envio
con consentimiento. Consulta [diagnostico y privacidad](DIAGNOSTICS.md) para el
contrato cerrado, receptor HTTPS, roles, retencion y diferencias entre clientes.

## Verificacion de esta integracion

- Destino Node: **483 pruebas correctas**, incluidos instaladores, traducciones,
  contratos de diagnostico, origen local y entrega HTTPS real.
- Host/agente Python: **212 pruebas correctas** y Ruff sin errores.
- Cliente compartido: **61 pruebas correctas**, lint y build TypeScript/Vite.
- RadiCodex: seis pruebas enfocadas de conexion/diagnostico, build APK y lint.
- Cliente Android dedicado: APK compilado y lint; proyectos Android/iOS
  sincronizados con el mismo cliente compilado.
- Ambos APK son **debug**, con firma APK v2 verificada: no firma de produccion.
- Wheel instalado fuera del arbol fuente: modulo de diagnostico, CLI y consola
  empaquetada verificados. ZIPAPP headless ejecutado con `--help`.
- Revision de seguridad limitada al diagnostico: sin vulnerabilidades
  confirmadas. No es una certificacion del resto del producto.
- Validacion visual con navegador integrado bloqueada por timeout CDP.
  El comportamiento del panel Workspace se comprueba mediante pruebas DOM,
  sin atribuirles una comprobacion visual.

Los paquetes se encuentran en `remote-station/dist/`: subdirectorios `agent/`
y `host/`, mas los dos APK debug. `SHA256SUMS` permite comprobar integridad.
La aceptacion fisica USB/RF, pruebas en dispositivos moviles, compilacion/firma
iOS y funciones expresamente pendientes no quedan cubiertas por estos resultados.
