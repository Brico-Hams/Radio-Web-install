# Fuentes locales de firmware

Estos paquetes conservan las fuentes, licencias y avisos de sus proyectos
originales. No son firmware stock ni copias de memoria de una radio.

| Archivo | Origen | Commit |
| --- | --- | --- |
| `f4hwn-fusion-v6.1.0-source.zip` | https://github.com/armel/uv-k1-k5v3-firmware-custom | `f556a96e73c3e423a00cf473aeb37f827cac05a5` |
| `ardf-v05-source.zip` | https://github.com/reald/uv-k1-k5v3-firmware-custom | `e2bb5b011f39b8c2777a21206086dd556b0e9e2d` |

Los ZIP son exportaciones de los commits indicados, sin metadatos Git ni
directorios de compilacion. Para reproducir el estado local de Fusion,
extraer su ZIP y aplicar `fusion-local-settings.patch` desde la raiz:

```sh
git apply fusion-local-settings.patch
```

El parche conserva los ajustes locales ARDF de navegacion, paso y modo AM;
no se aplica automaticamente al instalar ninguna imagen. Los modulos
Bricohams y las herramientas de construccion estan en `firmware/bricohams`
y `scripts` del repositorio principal. El catalogo de imagenes distribuibles
esta en `precompiled/catalog.json`, con hashes y procedencia por imagen.

`SHA256SUMS` permite comprobar los paquetes y el parche. Las licencias y
atribuciones originales siguen vigentes. Las carpetas locales de clones
quedan excluidas de Git para evitar referencias a repositorios anidados que
no se recuperarian al clonar este proyecto.
