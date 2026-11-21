# Configuración del agente, host y USB/CAT

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
