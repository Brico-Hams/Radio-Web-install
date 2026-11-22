# Mapas de módulos, flujo y navegación

“Mapa neural” no describe una función implementada: el proyecto no contiene una
red neuronal ni un asistente de IA. Estos diagramas son mapas propios de
componentes, flujo y navegación; las partes futuras están etiquetadas como
planificadas.

## Arquitectura actual y objetivo

```mermaid
flowchart LR
  subgraph Operador["Dispositivos del operador"]
    Web["Consola web local (implementada)"]
    Android["Cliente Android nativo"]
  end

  subgraph Local["Coordinador local (implementado)"]
    Static["Servidor estático del build"]
    LocalAPI["API REST v1"]
    Auth["Bearer y roles"]
    Registry["Registro de capacidades"]
    Candidates["Catálogo de 46 radios candidatas"]
    Simulator["Simulador determinista"]
  end

  subgraph Station["Agente local (inventario implementado)"]
    AgentAPI["API read-only 127.0.0.1:8791"]
    Ports["pyserial list_ports"]
  end

  subgraph Cloud["Coordinador remoto (planificado)"]
    RemoteAPI["API HTTPS / WebSocket"]
    DB[("SQLite local / PostgreSQL opcional")]
    Relay["Relay WebRTC TURN (opcional)"]
  end

  subgraph Shack["Red de estación"]
    Agent["Agente de estación"]
    LocalUI["UI web local de configuración"]
    Driver["Adaptador específico por modelo"]
    CAT["USB/serie CAT"]
    Audio["Dispositivo de audio"]
    Radio["Transceptor / accesorios"]
  end

  Web -->|"GET / y recursos, loopback"| Static
  Web -->|"API v1, bearer; POST solo logbook opt-in"| LocalAPI
  LocalAPI --> Auth
  LocalAPI --> Registry
  LocalAPI --> Candidates
  LocalAPI --> Simulator
  LocalAPI -->|"GET /api/v1/devices (loopback)"| AgentAPI
  AgentAPI -->|"enumera; no abre"| Ports
  Android -. "HTTPS/WSS (planificado)" .-> RemoteAPI
  RemoteAPI -.-> DB
  Agent -. "conexión saliente autenticada (planificada)" .-> RemoteAPI
  Agent -. "futuro" .-> LocalUI
  Agent -. "futuro" .-> Driver
  Driver -. "futuro" .-> CAT
  Driver -. "futuro" .-> Audio
  CAT -. "futuro" .-> Radio
  Audio -. "futuro" .-> Radio
  Web -. "DTLS-SRTP/ICE (futuro)" .-> Relay
  Agent -. "DTLS-SRTP/ICE (futuro)" .-> Relay
```

En la implementación actual funcionan la consola web, el coordinador de
loopback, el catálogo, el simulador y el inventario serie de solo lectura. El
agente no clasifica puertos ni accede a CAT. Hay codecs CAT puros para QMX+,
(tr)uSDX y FTX-1, pero no están conectados al agente ni tienen transporte.
Los codecs de otras familias y las primitivas de red se documentan en la
[investigación CAT](investigacion-cat-github.md); la CLI offline y
`GET /api/v1/protocols` los hacen inspeccionables sin transporte. El
[logbook](logbook.md) comparte SQLite entre CLI y consola web con permisos
por rol; su escritura no afecta al canal de control de radio.
Android, la nube, los transportes de radio, el relay y los medios siguen planificados.
El catálogo de 46 candidatos conserva las referencias y afirmaciones de terceros
separadas del estado de soporte BricoHams.

## Límites de confianza

```mermaid
flowchart LR
  Offline["CLI bricoham-cat: bytes locales"]
  Profiles["Registro offline por candidato"]
  Codecs["Codecs ASCII / CI-V / protocolos de red"]
  Api["GET /api/v1/protocols"]
  Logbook["CLI bricoham-logbook"]
  SQLite[("SQLite persistente local")]
  ADIF["Exportación ADIF"]
  Offline --> Profiles --> Codecs
  Api --> Profiles
  Logbook --> SQLite
  SQLite --> ADIF
```

Este flujo no llega a una radio ni a un socket de estación.

```mermaid
flowchart TB
  Browser["Navegador local"]
  Internet["Internet no confiable"]
  Coordinator["Coordinador local autenticado"]
  Agent["Agente local (inventario)"]
  Hardware["Radio USB y accesorios"]

  Browser -->|"HTTP loopback (actual)"| Coordinator
  Coordinator -->|"GET inventario loopback (actual)"| Agent
  Browser -. "Acceso remoto HTTPS, no implementado" .-> Internet
  Internet -. "Coordinador remoto futuro" .-> Coordinator
  Coordinator -. "Canal autenticado iniciado por agente (futuro)" .-> Agent
  Agent -. "Comandos específicos validados (futuro)" .-> Hardware
  Hardware -. "Telemetría (futuro)" .-> Agent
  Agent -. "Canal de agente (futuro)" .-> Coordinator
  Coordinator -. "El servidor no sustituye el watchdog local" .-> Agent
  Browser -. "Sin acceso CAT directo" .-> Hardware
```

Los canales remotos aún no existen. En la primera versión, el coordinador solo
enlaza a `127.0.0.1`; no representa el diagrama futuro como una garantía de
seguridad actual.

## Mapa de módulos

```mermaid
flowchart LR
  Contracts["protocol-contracts"]
  Capability["capability-registry"]
  Simulator["deterministic-simulator"]
  Coordinator["coordinator API"]
  Auth["authentication / roles"]
  Web["web-console React/TypeScript (implementada, solo lectura)"]
  Agent["station-agent (inventario serial implementado)"]
  Driver["radio driver (por modelo)"]
  Android["android client/agent (planificado)"]
  Safety["tx-safety (bloqueado)"]
  Media["audio/WebRTC (planificado)"]

  Coordinator --> Contracts
  Coordinator --> Auth
  Coordinator --> Capability
  Coordinator --> Simulator
  Web -->|"GET /api/v1/* con bearer"| Coordinator
  Coordinator -->|"GET /api/v1/devices con bearer"| Agent
  Web --> Contracts
  Android --> Contracts
  Agent --> Contracts
  Agent --> Driver
  Agent --> Media
  Agent -. "No habilitar hasta autorización" .-> Safety
```

## Navegación actual y futuras

```mermaid
flowchart TD
  Home["Inicio: conexión con token"]
  Radio["Estado de radio: frecuencia, VFO, modo, banda"]
  Scope["Scope nativo: mensaje no disponible"]
  Waterfall["Waterfall nativo: mensaje no disponible"]
  Capabilities["Perfiles y capacidades"]
  Diagnostics["Diagnóstico con rol autorizado"]
  Memories["Memorias / logbook (futuro)"]
  Interfaces["Interfaces serie (no clasificadas)"]
  Devices["Accesorios (futuro)"]
  Settings["Usuarios y configuración (futuro)"]

  Home --> Radio
  Home --> Scope
  Home --> Waterfall
  Home --> Capabilities
  Home --> Diagnostics
  Home --> Interfaces
  Home -. "No implementado" .-> Memories
  Home -. "No implementado" .-> Devices
  Home -. "No implementado" .-> Settings
```

La conexión, actualización, desconexión y expansión de perfiles son acciones de
interfaz implementadas. Los datos del simulador se etiquetan explícitamente. No
hay paneles operativos de audio, TX/PTT, memorias o accesorios.
