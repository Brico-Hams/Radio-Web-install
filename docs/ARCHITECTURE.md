# Arquitectura de Bricohams Radio Workspace

Bricohams Radio Workspace es una aplicación web **local**. Un pequeño servidor Node.js sirve una lista cerrada de archivos estáticos y unas pocas API de solo lectura. Toda la comunicación con la radio ocurre en el navegador mediante WebUSB o Web Serial.

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
- **Quansheng:** la copia física completa de la Flash requiere F4HWN Labs v6.1+. No hay instalación nativa de canales ni SAT en la radio.
- **RepeaterBook:** requiere un token aprobado por RepeaterBook.
- **Hardware:** no hay validación con radios físicas en el entorno de desarrollo.
