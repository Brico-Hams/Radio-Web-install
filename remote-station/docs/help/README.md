# Ayuda multilingüe / Multilingual help

Manuales completos y diez guías por idioma, disponibles también sin conexión
desde la consola empaquetada:

| Idioma / Language | Índice | Manual completo |
|---|---|---|
| Español | [Guías](es/index.md) | [Manual](es/manual.md) |
| English | [Guides](en/index.md) | [Manual](en/manual.md) |
| Français | [Guides](fr/index.md) | [Manuel](fr/manual.md) |
| Português | [Guias](pt/index.md) | [Manual](pt/manual.md) |

La ayuda, la conexión y los asistentes de configuración del agente y del host
están traducidos. Los paneles avanzados y sus referencias técnicas conservan
su idioma original. El selector guarda solo el idioma; no guarda tokens.
Los asistentes preparan comandos locales: no los ejecutan ni activan TX.

Fuente canónica: `apps/web-console/src/help-content.json`. No editar los
documentos de idiomas ni los manuales offline a mano. Desde la raíz:

```powershell
py -3.12 scripts\build_help.py
py -3.12 scripts\build_help.py --check
```

El segundo comando detecta recursos ausentes u obsoletos. Las guías describen
funciones reales y sus límites; no acreditan aceptación USB, móvil ni RF.
