# Plan de vídeo RadiCodex 1.1.0

Vídeo explicativo de 6-8 minutos grabado en el Samsung S20 FE real con `adb screenrecord` (máximo 180 s por clip) y las radios reales por OTG. Marca BricoHams v1.1: grafito `#23272B`, naranja `#F26B1D`.

## Reglas de rodaje

- Nunca transmitir sin antena o carga artificial. La QMX+ no tiene antena: **no se transmite con ella en ninguna escena**.
- Las escenas con PTT (V10 y V11) solo se ruedan con carga artificial confirmada.
- Un clip por escena; si una escena supera 180 s se divide en `Vxx-a` y `Vxx-b` (no ocurre en este plan).
- Los clips van fuera del repo (`%USERPROFILE%\RadiCodex-video\clips`); no se versionan.
- Orientación vertical, brillo alto, modo No molestar, sin notificaciones personales ni indicativos de terceros.

## Preparación

1. `adb devices` debe listar el S20 FE; activa Opciones de desarrollador y depuración USB.
2. Radios cargadas: Quansheng UV-K5 con BH Satellite v0.5.7, Yaesu FTX-1, (tr)uSDX con firmware 2.00t o posterior y QRP Labs QMX+.
3. Cables OTG listos para cambiar de radio sin tocar el teléfono más de lo necesario.
4. Instala el APK de GitHub 1.1.0 (versionCode 17) para poder grabar también la escena de actualización.

## Plan de escenas

La tabla es la fuente de `scripts/video-assemble.ps1`: no cambies el orden de las columnas ni el formato `Vnn`. Las duraciones objetivo suman 495 s (8 min 15 s) sin la tarjeta de título.

| ID | Pantalla / módulo | Radio (OTG) | Acciones | Subtítulo ES | Subtitle EN | Duración (s) |
| --- | --- | --- | --- | --- | --- | --- |
| V01 | Inicio y novedades | ninguna | Abrir la app; se muestra el diálogo Novedades 1.1.0; desplazarlo y cerrarlo. | RadiCodex 1.1.0: radio, satélites y modos digitales en tu móvil. | RadiCodex 1.1.0: radio, satellites and digital modes on your phone. | 30 |
| V02 | Inicio, nuevo aspecto BricoHams y DeX | ninguna | Recorrer la pantalla de inicio; conectar el teléfono a un monitor con Samsung DeX y abrir la app. | Nuevo aspecto BricoHams v1.1, también cómodo en DeX. | New BricoHams look (brand manual v1.1), DeX friendly. | 25 |
| V03 | Libro de guardia | ninguna | Crear libro, añadir dos contactos, buscar, exportar ADIF. | Libro de guardia: registra y exporta en ADIF. | Logbook: log contacts and export ADIF. | 30 |
| V04 | Diagnóstico y Puente: Buscar | Quansheng | Conectar la Quansheng por OTG, aceptar el permiso USB, abrir Puente / Diagnóstico y pulsar Buscar dispositivos USB. | Conecta tu radio por OTG y la app la reconoce. | Plug your radio in by OTG and the app finds it. | 25 |
| V05 | Diagnóstico y Puente: Probar todo | Quansheng | En SAT RX con CAT activo pulsar Probar todo; mostrar el informe y compartirlo. | Probar todo: diagnóstico completo sin transmitir. | Test all: full diagnostics without transmitting. | 40 |
| V06 | CAT Quansheng remoto | Quansheng | En la radio: SAT RX y F+8 (CAT remoto). En la app: abrir CAT Quansheng, sintonizar una frecuencia de recepción y pulsar STOP; mostrar que vuelve a tu frecuencia. | Quansheng CAT remoto: F+8 en SAT RX (firmware BH Satellite v0.5.7). | Quansheng remote CAT: F+8 in SAT RX (BH Satellite firmware v0.5.7). | 40 |
| V07 | CAT multirradio | FTX-1 | Conectar por el puerto Enhanced COM, elegir FTX-1 a 38400, leer y cambiar frecuencia y modo. | FTX-1: CAT por el puerto Enhanced a 38400 baudios. | FTX-1: CAT over the Enhanced port at 38400 baud. | 35 |
| V08 | CAT multirradio | truSDX | Conectar, elegir truSDX a 115200, leer frecuencia y cambiar de banda. | truSDX: CAT a 115200 baudios. | truSDX: CAT at 115200 baud. | 30 |
| V09 | CAT multirradio | QMX+ | Conectar, elegir QMX+ a 38400, leer frecuencia y modo; mostrar el aviso de que no se transmite sin antena. | QMX+: CAT a 38400 baudios. Sin antena, no se transmite. | QMX+: CAT at 38400 baud. No antenna, no transmitting. | 30 |
| V10 | SSTV Robot36 | FTX-1 | Recibir una imagen de un WAV de prueba y guardar el PNG; mostrar el PTT solo con carga artificial confirmada. | SSTV Robot36: recibe e importa imágenes. TX solo con carga artificial. | SSTV Robot36: receive and import images. TX only with a dummy load. | 35 |
| V11 | Modos digitales FT8 / FT4 / FT2 | truSDX | Elegir FT2, escuchar audio USB o un WAV, mostrar las decodificaciones (OSD y decodificación a priori). | Decodificador FT2 mejorado: OSD y decodificación a priori. | Improved FT2 decoder: OSD and a-priori decoding. | 40 |
| V12 | Satélites: ubicación GPS | ninguna | Abrir Satélites, pulsar Obtener posición del teléfono, conceder precisa o aproximada; mostrar satélites vistos y usados (hasta 180 s). | Ubicación GPS del teléfono: precisa o aproximada. | Phone GPS location: precise or approximate. | 35 |
| V13 | Satélites: TLE y pases | ninguna | Actualizar TLE; mostrar el orden CelesTrak, SatNOGS, AMSAT; abrir un pase y su Doppler. | TLE con respaldo: CelesTrak, SatNOGS y AMSAT. | TLE fallback: CelesTrak, SatNOGS and AMSAT. | 30 |
| V14 | Satélites: gráfico del pase y Apuntar | ninguna | Tocar un pase; mostrar el gráfico polar con la trayectoria AOS-LOS y el satélite moviéndose, la cuenta atrás y los transmisores con Doppler; pulsar Apuntar, sostener el móvil en vertical y girar hasta ver «En el blanco»; mostrar el aviso de calibrar la brújula. | Gráfico del pase y modo Apuntar: sigue la flecha hasta el satélite. | Pass chart and Aim mode: follow the arrow to the satellite. | 40 |
| V15 | Actualizaciones (OTA) y aviso de cambios | ninguna | Abrir Actualizaciones (compilación GitHub), buscar versión y mostrar la verificación de firma; enseñar el aviso de cambio de app o firmware. | Actualizaciones OTA firmadas y aviso al cambiar app o firmware. | Signed OTA updates and a notice when the app or firmware changes. | 30 |

## Tarjeta de título y cierre

- Tarjeta inicial de 4 s: fondo grafito `#23272B`, logotipo BricoHams (`bricohams-logo.png` en la raíz del repo) y el texto "RadiCodex 1.1.0" en naranja `#F26B1D`.
- Las escenas se encadenan en el orden de la tabla; el montaje no añade música.

## Grabación y montaje

```powershell
# Una escena
.\scripts\video-record.ps1 -Scene V05
# Todas, con pausa entre escenas para cambiar de radio
.\scripts\video-record.ps1 -All
# Montaje final
.\scripts\video-assemble.ps1 -Resolution 1080x2400
```

Salida: `RadiCodex-1.1.0-demo.mp4` en la carpeta de clips. Requiere solo `adb` y `ffmpeg` en el PATH.

## Subtítulos

`scripts/video-assemble.ps1` genera un `.srt` por escena a partir de la tabla (un único subtítulo que cubre toda la escena); el español es el predeterminado y `-Lang en` usa la columna inglesa.
