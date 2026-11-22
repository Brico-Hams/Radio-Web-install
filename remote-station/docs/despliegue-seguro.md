# Agente independiente y host HTTPS

El agente no necesita consola, navegador, Node.js ni coordinador instalado.
El host sirve el cliente HTML5/JavaScript y conecta con el agente. Mantenerlos
separados no implica abrir los puertos de la radio a Internet.

## Distribución headless

Construye desde el repositorio con Python 3.12 y las dependencias del proyecto:

```powershell
py -3.12 scripts\build_agent.py --output .\dist
py -3.12 .\dist\bricoham-station-agent.pyz --help
```

El ZIPAPP incluye `pyserial` y los módulos CAT compartidos, no el coordinador,
React, el logbook ni herramientas de desarrollo. Requiere Python 3.12 o posterior
en destino; **no es un ejecutable que incluya Python**. Copia únicamente el `.pyz`
al ordenador de estación. En Raspberry Pi/Linux/macOS usa `python3` en lugar de
`py -3.12`. La portabilidad del archivo no certifica esos sistemas, adaptadores
USB ni hardware ARM: su aceptación específica sigue pendiente.

Por defecto escucha solo en `127.0.0.1:8791`, con CAT y WSJT-X desactivados.
Las opciones de [CAT y WSJT-X](agente-cat-wsjtx.md) siguen siendo opt-in.
También lo son [rotor](control-rotores.md), [ajustes por modelo](control-potencia-acoplador.md)
y [audio RX](audio-rx.md). Este último requiere el extra de audio en el entorno
Python externo: las dependencias nativas no se incorporan al ZIPAPP.

## Dos máquinas con HTTPS

Necesitas certificados válidos para los nombres DNS reales, su cadena intermedia
y claves privadas protegidas. No se generan certificados ni se deshabilita su
validación automáticamente. Los nombres `.example.org` son ilustrativos.
La clave debe poder cargarse sin contraseña interactiva; protege su archivo con
permisos del sistema. Una clave cifrada no provoca un diálogo en el servicio:
su carga falla explícitamente.

En el agente configura un token admin local fuerte y un token operador dedicado
al enlace. No reutilices el token admin ni los tokens de usuarios del host.
Los tokens se suministran por entorno o por el gestor de secretos del sistema:

```powershell
# BRICOHAM_ADMIN_TOKEN: secreto administrativo propio del agente.
# BRICOHAM_OPERATOR_TOKEN: secreto dedicado al enlace host-agente.
py -3.12 .\bricoham-station-agent.pyz --host 192.168.10.20 --port 8791 `
  --tls-cert C:\BricoHams\certs\agent-chain.pem --tls-key C:\BricoHams\certs\agent-key.pem
```

En el host:

```powershell
# BRICOHAM_ADMIN_TOKEN y otros roles: secretos de los usuarios del host.
# BRICOHAM_STATION_AGENT_TOKEN: mismo valor que el operador dedicado del agente.
bricoham-coordinator --host 192.168.10.10 --port 8790 `
  --tls-cert C:\BricoHams\certs\host-chain.pem --tls-key C:\BricoHams\certs\host-key.pem `
  --station-agent-url https://station.example.org:8791 `
  --station-agent-ca C:\BricoHams\certs\station-ca.pem
```

Omite `--station-agent-ca` para utilizar las autoridades de confianza del sistema.
El host valida la cadena **y el nombre** del agente; un fallo devuelve
`station_agent_tls_failed`, sin reintentar por HTTP. El token del usuario no se
reenvía a un agente remoto; se usa el secreto de enlace. El arranque rechaza que
ese secreto coincida con un token de usuario del host. El agente ve el rol de
enlace, no la identidad individual del usuario: la autorización del usuario
permanece en el coordinador; no equivale a identidad individual distribuida.
El mTLS opcional autentica además el equipo de enlace, como se explica abajo.

Abre el cliente web en `https://host.example.org:8790/`. Las APIs exigen bearer
y la consola mantiene los tokens solo en memoria. HTTP sin TLS solo se admite
en IPv4 loopback; escuchar en otra IPv4 requiere certificado/clave explícitos.
La salud del servicio sigue siendo pública, sin datos de estación.

Para clientes Capacitor habilita únicamente los orígenes nativos necesarios:

```powershell
# Añadir al comando del host; Android e iOS respectivamente.
--client-origin https://localhost --client-origin capacitor://localhost
```

La allowlist CORS no autentica aplicaciones. No usa comodines ni cookies;
autoriza cabeceras Authorization/Content-Type y GET o los POST expresamente
permitidos para logbook, rotor y ajustes IC-7300/FTX-1. No habilita comandos CAT
arbitrarios, PTT ni TX. La configuración de otro origen
requiere también que el host escuche con TLS.

## Identidad de equipo mediante mTLS

Para exigir certificado al coordinador antes de aceptar cualquier HTTP en el
agente, añade al comando HTTPS del agente:

```powershell
--tls-client-ca C:\BricoHams\certs\coordinator-clients-ca.pem
```

Y al comando del coordinador, además de `--station-agent-url` y de la CA usada
para verificar el nombre/cadena del servidor agente:

```powershell
--station-agent-client-cert C:\BricoHams\certs\coordinator-client-chain.pem `
--station-agent-client-key C:\BricoHams\certs\coordinator-client-key.pem
```

Usa una CA de clientes controlada por la organización y un certificado de cliente
válido, emitido para autenticación de cliente TLS (`clientAuth`). La cadena PEM
incluye sus intermedias; la clave debe corresponder al certificado y estar
protegida para la cuenta del servicio. No reutilices automáticamente la clave o
el certificado del servidor web: pueden tener otro propósito y ciclo de vida.
Los certificados no se emiten ni instalan automáticamente.

El agente rechaza clientes sin certificado o firmados por otra CA durante TLS,
antes de inventario, CAT, audio o cualquier otra ruta, incluso `/healthz`.
El bearer dedicado y sus permisos **siguen siendo obligatorios** para las APIs:
el certificado no convierte a un cliente en administrador. El coordinador sigue
validando CA y hostname del agente; mTLS no desactiva ninguna de esas comprobaciones.
Pares incompletos, claves incompatibles o ficheros ilegibles fallan al arrancar;
confianza, propósito y vigencia se comprueban durante TLS.
Configura ambos extremos: aportar certificado al host no obliga por sí solo al
agente a exigirlo. Con `--tls-client-ca` el agente no permite fallback a TLS sin
certificado ni a HTTP.

Esto identifica una credencial de equipo autorizada por su CA, no al usuario
individual detrás del host, ni sustituye MFA. No implementa revocación CRL/OCSP
ni recarga en caliente: usa certificados de vigencia limitada, protege la CA y
reinicia los servicios al rotar claves/CA para cerrar conexiones y recargar
contextos. Supervisión y herramientas que accedan directamente al agente mTLS
también deben presentar su certificado. El navegador/cliente móvil sigue
conectando al host HTTPS con su bearer; no recibe la clave privada de enlace.

## Servicio Raspberry Pi/Linux

La [unidad systemd](../deploy/bricoham-agent.service) es una plantilla, no un
instalador ejecutado ni validado en Raspberry Pi. Necesita:

1. Python 3.12 o posterior en `/usr/bin/python3`; comprueba su versión.
2. Usuario/grupo de sistema `bricoham`, sin privilegios de root.
3. Archivo `/opt/bricoham/bricoham-station-agent.pyz`, administrado por root,
   legible por el usuario del servicio y no modificable por él.
4. `/etc/bricoham/agent.env`, propiedad de root y modo `0600`, con
   `BRICOHAM_ADMIN_TOKEN` generado localmente. Nunca guardes ese archivo en Git.
5. Copiar la unidad a `/etc/systemd/system/`, ejecutar
   `sudo systemctl daemon-reload` y `sudo systemctl enable --now bricoham-agent`.
6. Comprobar `systemctl status bricoham-agent` y
   `curl http://127.0.0.1:8791/healthz`. Inspeccionar fallos con
   `journalctl -u bricoham-agent`.

La plantilla no activa CAT, WSJT-X ni red remota. Configura esos argumentos con
un override de `ExecStart` tras revisar la guía. Para CAT concede solo el grupo
serie necesario (`dialout` suele ser el de Debian/Raspberry Pi OS); no cambies
dispositivos a `chmod 777`, no ejecutes el agente como root y no habilites señales
USB SEND/CW/PTT. Las claves TLS deben ser legibles exclusivamente por su cuenta.

## Límites operativos

Prefiere una VPN administrada y un cortafuegos que limite el agente a la IP del
host. No publiques CAT, UDP WSJT-X ni puertos serie en la red. Mantén sistema,
Python y dependencias actualizados; rota secretos tras una sospecha de exposición.
El servidor limita conexiones concurrentes a 32 y lecturas/handshake a cinco
segundos; esto no sustituye protección contra DDoS ni rate limiting perimetral.

No hay garantía de invulnerabilidad, MFA, revocación por sesión/certificado ni
auditoría externa. mTLS es opt-in y no sustituye esas capas. No es una
autorización para un despliegue público sin supervisión.
El UDP WSJT-X permanece local y **no autenticado**: usa aislamiento del equipo
y no bases órdenes, permisos ni registros automáticos en sus datos.
