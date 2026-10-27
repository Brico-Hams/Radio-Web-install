# Política de seguridad

[Español](SECURITY.md) · [English (US)](SECURITY.en.md) · [Français](SECURITY.fr.md) · [Deutsch](SECURITY.de.md)

## Versiones con soporte

Solo la rama `main` más reciente.

## Cómo informar

Informa en privado mediante [GitHub Security Advisories](https://github.com/Brico-Hams/Radio-Web-install/security/advisories/new). **No abras una incidencia pública** para vulnerabilidades.

Incluye descripción, impacto, pasos de reproducción y versión/commit. Nunca envíes tokens, copias de radio ni datos personales reales; usa datos sintéticos.

## Alcance

- Exposición del servidor fuera de `127.0.0.1`, evasión de la validación de `Host` o de la lista de archivos.
- XSS o evasión de la CSP.
- Escrituras en la radio sin copia verificada o evasión del permiso de escritura.
- Descargas desde hosts no permitidos o fuga de credenciales `RB_*` al navegador.

Fuera de alcance: despliegues en red no soportados (ver [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)), fallos de firmware de terceros y daños por usar herramientas externas.

## Prácticas

- Sin telemetría ni subidas de datos de la radio.
- Dependencias mínimas, versión fijada y `npm ci --ignore-scripts`.
- Copias con SHA-256 y escrituras *fail-closed*.
