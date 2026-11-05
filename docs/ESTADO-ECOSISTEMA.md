# Estado del ecosistema BricoHams (inventario verificado 2026-11-05)

Distingue **aprobado** (validado por el autor o con evidencia), **publicado**
(release o página en GitHub) y **pendiente**. Solo se listan repositorios propios
(no forks) vinculados a este proyecto; verificado con `gh repo list Brico-Hams`.

| Repo | Visibilidad | Relación | Último release publicado | Estado |
|------|-------------|----------|--------------------------|--------|
| [Radio-Web-install](https://github.com/Brico-Hams/Radio-Web-install) | público | Web, RadiCodex (Android), ayudas | RadiCodex 1.0.2 (`android-v1.0.2`), web v0.5.7; pre-release [`fw-spectrum-presets-v6.1.0`](https://github.com/Brico-Hams/Radio-Web-install/releases/tag/fw-spectrum-presets-v6.1.0) | Publicado; versiones previas 1.0.0/1.0.1 y v0.5.x conservadas |
| [bricohams-sdr](https://github.com/Brico-Hams/bricohams-sdr) | público | SDR | v5.4.3 (2026-10-27); firmware `fw-v5.4.1` | Publicado; banner adaptable (`7b2d0f2`) integrado en `main` tras pruebas; sin release nuevo |
| [Bricohams-Studio](https://github.com/Brico-Hams/Bricohams-Studio) | público | Herramientas | sin release | Sin cambios documentales en esta ronda |
| bricohams-firmware, uv-k5-ardf-f4hwn | privado | Firmware / ARDF | — | Fuentes reservadas: no se publican ni se tocan |

## Firmware Spectrum / Karina (UV-K5 V3)

- **Aprobado**: pruebas de hardware 1.0.2 de RadiCodex registradas por el autor
  (ver [ESTADO-ENTREGA](ESTADO-ENTREGA.md)); publicación de Spectrum autorizada por el autor.
- **Reproducido**: `bricohams.fieldops.spectrum.v6.1.0.bin`, 120 284 B (slot 120 832 B,
  548 B libres), SHA-256 `CF5E8C52…A8145`; dos compilaciones independientes idénticas
  (ARM GCC 13.3.1, upstream `f556a96`, repo en `2205872`) y 11/11 pruebas de host.
- **Publicado**: pre-release **sin firma** y **sin prueba en hardware** (no está en el
  catálogo firmado; el instalador web no lo acepta). La entrada anterior
  `bricohams-spectrum` (118 584 B) se conserva intacta. No equivale a Karina (ver [KARINA](KARINA.md)).
- **Pendiente**: firma Ed25519 (no hay clave de firmware configurada en CI; la clave privada
  no se lee ni se pide por chat), entrada en el catálogo, arranque/LCD/teclas/RF en radio real
  ([pasos](KARINA-V3-K1-INTEGRACION.md)).

## Vídeos

| Vídeo | Estado |
|-------|--------|
| [Demo Android](media/bricohams-android-demo.mp4) | Existente; sin subtítulos es/en/de/fr/it verificados |
| [RadiCodex 1.0.2 captura real](video/README.md) | **Publicado**: emulador AVD, APK firmada, subtítulos es/en/de/fr/it |
| [Uno por firmware Bricohams](video/firmware/README.md) | **Publicado**: 5 recreaciones etiquetadas (no son captura de hardware ni emulación), datos del catálogo, subtítulos es/en/de/fr/it |
| SDR | **Pendiente**: sin activo terminado; no se publican simulaciones |

## Ayudas multilingües

README y ayudas existen en es/en/de/fr/it (ver [README](../README.md),
[README.en](../README.en.md), [README.de](../README.de.md),
[README.fr](../README.fr.md), [README.it](../README.it.md)).
Guías: [FIRMWARES](AYUDA-FIRMWARES.md), [ANDROID](ANDROID.md), [DEPLOYMENT](DEPLOYMENT.md).

## Resumen / Summary / Zusammenfassung / Résumé / Riepilogo

- **en**: Spectrum image reproduced (SHA-256 `CF5E8C52…A8145`) and published as an unsigned, untested pre-release; signing and catalog entry pending a configured CI key.
- **de**: Spectrum-Image reproduziert (SHA-256 `CF5E8C52…A8145`), als unsigniertes, ungetestetes Pre-Release veröffentlicht; Signatur und Katalogeintrag stehen aus (kein CI-Schlüssel).
- **fr** : image Spectrum reproduite (SHA-256 `CF5E8C52…A8145`), publiée en pré-release non signée et non testée ; signature et entrée de catalogue en attente (clé CI absente).
- **it**: immagine Spectrum riprodotta (SHA-256 `CF5E8C52…A8145`), pubblicata come pre-release non firmata e non testata; firma e voce di catalogo in attesa (chiave CI assente).
