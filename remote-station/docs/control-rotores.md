# Control remoto de rotores

El agente implementa el protocolo publico **Hamlib rotctld**, con panel comun
para web, Android/tablet y los proyectos iPhone/iPad. Es software experimental:
las pruebas TCP/HTTP/TLS no certifican un rotor, cableado ni limites fisicos.
No se declara compatibilidad con un modelo concreto sin su aceptacion.

El panel compartido usa ES/EN/FR/PT. Cambiar idioma conserva angulos editados,
sesion y renovaciones: no envia movimiento ni parada y no reinicia el temporizador.
Perder foco, desmontar o pulsar parada conserva el comportamiento documentado.

## Configuracion explicita

Instala Hamlib por separado. Selecciona en su documentacion el modelo, puerto
fisico, velocidad y parametros correctos del controlador; no se autodetectan.
Configura rotctld con `-T 127.0.0.1` y un puerto TCP local explicito, por
ejemplo `-t 4533`. No conectes el rotor hasta verificar su configuracion.
**rotctld no autentica clientes**: no publiques ese puerto en LAN/Internet.
Loopback tampoco protege frente a procesos locales maliciosos.

Crea un JSON local, por ejemplo `rotor.json`, con exactamente estos campos:

```json
{
  "port": 4533,
  "label": "Rotor de la estacion",
  "azimuth_min": 0,
  "azimuth_max": 360,
  "elevation_min": 0,
  "elevation_max": 0,
  "motion_enabled": false
}
```

Los limites son ejemplos, no valores universales. Usa los limites mecanicos
verificados de tu instalacion. Elevacion 0/0 corresponde a un rotor solo de
azimut. No se normalizan angulos ni se infiere el camino de giro o el cableado.
Activa `motion_enabled` solo tras comprobar finales de carrera y parada local.

```powershell
py -3.12 -m bricoham_station_agent --rotor-config .\rotor.json
```

El ZIPAPP headless acepta la misma opcion. La configuracion no arranca rotctld,
no selecciona puertos serie y no envia ordenes de rotor al iniciar el agente.
Sin archivo, la API responde `503 rotor_not_configured`.
El host usa su enlace al agente ya configurado; para acceso remoto sigue
[despliegue seguro](despliegue-seguro.md). El token nunca se envia a rotctld.

## Operaciones

Ambos servicios exponen `/api/v1/rotor` solo para admin/operador:

- `GET`: metadatos, limites y estado de sesion; no consulta posicion.
- `GET ?command=position`: consulta ERP `+p` y valida ambos angulos.
- `POST move`: requiere `request_id` unico, `azimuth_deg` y `elevation_deg`;
  valida limites y posicion actual antes de enviar ERP `+P`.
- `POST renew`: requiere `lease_id` de la sesion aceptada.
- `POST stop`: envia ERP `+S`, sin exigir propiedad de la sesion ni movimiento
  habilitado. Puede incluir `cancel_request_id` para cancelar un MOVE pendiente.

Ejemplo de cuerpo de movimiento, no ejecutado automaticamente:

```json
{
  "operation": "move",
  "request_id": "un-identificador-unico-0001",
  "azimuth_deg": 90,
  "elevation_deg": 0
}
```

El identificador admite 16-64 caracteres ASCII alfanumericos, guion y guion
bajo. La cache en memoria conserva los ultimos 256 identificadores usados o
cancelados; evita duplicados recientes y MOVE retrasados despues de STOP.
No es proteccion persistente contra replay tras reinicio o desalojo de cache.
No se reintenta un movimiento si se pierde su confirmacion.

La respuesta confirma **aceptacion del objetivo**, no posicion alcanzada.
La posicion solo se muestra cuando se consulta al controlador. No hay
movimiento continuo, park, reset ni envio de comandos arbitrarios.

## Sesion y parada: limites de seguridad

- Solo una sesion de movimiento simultanea. Su secreto no se publica en GET.
- El cliente renueva cada segundo. El watchdog del agente solicita parada
  a los 3 segundos sin renovar y nunca permite superar 30 segundos por orden.
  La latencia completa, incluidas resolución y apertura TLS, debe permitir
  renovar antes de caducar; no se amplía el plazo para ocultar una red lenta.
  Para enlaces locales usa IPv4 explícita con su SAN de certificado correcto
  si el intento IPv6 previo de `localhost` introduce retrasos.
- Perder foco, ocultar/cerrar la pagina o desmontar el panel solicita STOP.
  La cancelacion tambien cubre una confirmacion MOVE tardia.
  Las ordenes pendientes conservan el host y token de su sesion original;
  seleccionar otro host no redirige esa parada ni sus credenciales.
- STOP tiene prioridad de espera sobre nuevas operaciones, pero no es
  un canal fisico independiente; puede esperar una transaccion en curso.
- Una parada sin confirmacion deja `stop_failed: true` y bloquea movimientos.
  No se oculta el error ni se reintenta indefinidamente: verifica localmente
  la instalacion y solicita STOP para recuperar una confirmacion.

Estos plazos son objetivos del software, **no garantias de detencion mecanica**.
La caida del proceso, equipo, alimentacion, red local o controlador puede
impedir STOP; un reinicio pierde la sesion y no reconstruye el estado fisico.
Son obligatorios finales de carrera, limites y parada local independientes.
El puerto rotctld debe ser exclusivo de esta instalacion: otros programas
pueden mover el rotor fuera de la sesion BricoHams.

Referencia publica: [manual oficial rotctld](https://hamlib.sourceforge.net/html/rotctld.1.html).
Las pruebas usan un broker TCP de ensayo identificado, no un rotor real.
