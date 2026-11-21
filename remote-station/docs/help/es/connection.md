# Conexión y autenticación

En web, la consola utiliza su propio host. Android/iOS requieren la URL HTTPS del host, sin usuario, contraseña, ruta o parámetros. El token de acceso solo permanece en memoria; no se guarda en archivos, cookies ni almacenamiento local.

Admin y operador pueden acceder a controles autorizados; oyente recibe audio RX y datos permitidos, pero no PTT. Invitado tiene acceso restringido. Una sesión conectada no implica que una radio física esté conectada.

1. Introduce el host HTTPS cuando lo pida el cliente y pega tu token de rol.
2. Pulsa Conectar; revisa los avisos de permisos y disponibilidad del agente.
3. Configura CA/hostname y los orígenes de cliente autorizados en el host; nunca ignores un certificado.
4. Desconecta antes de cambiar de host o de credenciales.

[Referencia técnica (ES)](../../despliegue-seguro.md)
