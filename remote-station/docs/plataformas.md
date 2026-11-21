# Objetivos de plataforma y cobertura real

La compatibilidad de servidor, agente y cliente se evalúa por separado. Una UI
web que carga en un navegador no prueba que el agente pueda enumerar USB, acceder
a audio ni controlar una radio.

| Plataforma | Coordinador | Agente de hardware | Cliente web | Cliente nativo móvil |
|---|---|---|---|---|
| Windows | HTTP/HTTPS y wheel probados con sockets reales | ZIPAPP independiente probado; CAT con interfaz inyectada, no radio física | Build y navegador probados localmente | Entorno utilizado para compilar APK, no cliente Windows nativo |
| Linux x86_64 | Código portable; ejecución pendiente | ZIPAPP preparado; puertos físicos no probados | Build pendiente de CI; navegador no validado | No aplica |
| Raspberry Pi / Linux ARM | Pendiente de prueba ARM | ZIPAPP y plantilla systemd preparados, sin prueba ARM | No probado en dispositivo ARM | No aplica |
| macOS | Ejecución pendiente | ZIPAPP preparado; puertos físicos no probados | Build pendiente de CI; navegador no validado | Xcode necesario para compilar el proyecto iOS |
| FreeBSD | No probado ni incluido en CI | Sin validación | No probado | No aplica |
| Android | No objetivo para el coordinador | USB Host/OTG no implementado | Navegador móvil no validado | APK debug móvil/tablet compilado y firma verificada; sin prueba nativa |
| iOS/iPadOS | No objetivo para el coordinador | No implementado | Safari no validado | Proyecto universal iPhone/iPad preparado; sin compilación/firma Xcode |

El workflow configura pruebas Python y build/test de la consola en Windows,
Ubuntu y macOS, pero no se ha ejecutado una CI remota. FreeBSD y ARM/Raspberry Pi
requieren runners o pruebas de hardware propios antes de declarar cobertura.
También se configura un job Android; su resultado remoto todavía no se ha ejecutado.

## Objetivo de producto

- **Agente headless:** servicio independiente de hardware sin UI ni coordinador;
  la consola del host consulta sus APIs. El navegador no abre CAT ni arbitra
  permisos del dispositivo. Una futura UI de configuración no es requisito runtime.
- **Cliente web remoto:** consola responsive/PWA conectada al coordinador por API
  autenticada. El soporte de navegadores se declara después de pruebas por motor.
- **Clientes nativos:** Capacitor comparte la consola HTML5/JavaScript entre
  Android móvil/tablet e iPhone/iPad. Un agente Android USB Host/OTG es otro
  componente y requiere implementación nativa y validación de adaptadores.
- **Núcleo de estación:** debe probarse con USB serie y audio en Windows, Linux
  x86/ARM, macOS y FreeBSD; las APIs y funciones pueden variar por plataforma.

No se declara compatibilidad de inventario físico o cliente en ninguna plataforma
donde no se haya ejecutado una prueba repetible. La consola web existe y se
validó en Windows; el agente añade CAT de lectura experimental y WSJT-X pasivo.
Sus puertos físicos, adaptadores CAT y clientes ejecutados en dispositivos siguen
sin aceptación. Consulta [distribución headless](despliegue-seguro.md) y
[clientes móviles](clientes-moviles.md) para distinguir fuentes preparados,
binarios generados y funciones operativas pendientes.
