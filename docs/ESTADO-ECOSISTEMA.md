# Estado del ecosistema BricoHams (inventario verificado 2026-11-05)

Distingue **aprobado** (validado por el autor o con evidencia), **publicado**
(release o página en GitHub) y **pendiente**. Solo se listan repositorios propios
(no forks) vinculados a este proyecto; verificado con `gh repo list Brico-Hams`.

| Repo | Visibilidad | Relación | Último release publicado | Estado |
|------|-------------|----------|--------------------------|--------|
| [Radio-Web-install](https://github.com/Brico-Hams/Radio-Web-install) | público | Web, RadiCodex (Android), ayudas | RadiCodex 1.0.2 (`android-v1.0.2`), web v0.5.7 | Publicado; versiones previas 1.0.0/1.0.1 conservadas |
| [bricohams-sdr](https://github.com/Brico-Hams/bricohams-sdr) | público | SDR | v5.4.3 (2026-10-27); firmware `fw-v5.4.1` | Publicado; validación SDR en vídeo pendiente |
| [Bricohams-Studio](https://github.com/Brico-Hams/Bricohams-Studio) | público | Herramientas | sin release | Sin cambios documentales en esta ronda |
| bricohams-firmware, uv-k5-ardf-f4hwn | privado | Firmware / ARDF | — | Fuentes reservadas: no se publican ni se tocan |

## Firmware Spectrum / Karina (UV-K5 V3)

- **Aprobado**: pruebas de hardware 1.0.2 de RadiCodex registradas por el autor
  (ver [ESTADO-ENTREGA](ESTADO-ENTREGA.md)).
- **Publicado**: ninguna imagen Spectrum/Karina firmada. La compilación local
  reproducible no está firmada por Armel ni equivale a Karina (ver [KARINA](KARINA.md)).
- **Pendiente**: firma de Spectrum Karina (otra sesión; no se duplica), validación RF/CSS
  y pasos de hardware.

## Vídeos

| Vídeo | Estado |
|-------|--------|
| [Demo Android](media/bricohams-android-demo.mp4) | Existente; sin subtítulos es/en/de/fr/it verificados |
| RadiCodex final, uno por firmware UV-K5 V3, SDR | **No existen activos terminados**; no se publican simulaciones |

## Ayudas multilingües

README y ayudas existen en es/en/de/fr/it (ver [README](../README.md),
[README.en](../README.en.md), [README.de](../README.de.md),
[README.fr](../README.fr.md), [README.it](../README.it.md)).
Guías: [FIRMWARES](AYUDA-FIRMWARES.md), [ANDROID](ANDROID.md), [DEPLOYMENT](DEPLOYMENT.md).
