# Checklist de pruebas RadiCodex 1.1.0

Plantilla de pruebas en el dispositivo real (Samsung S20 FE, versionCode 18) con las cuatro radios por OTG. Rellena **Resultado** (OK / FALLO / N/A) y **Evidencia** (captura, clip, ruta del informe o línea de log).

## Reglas de seguridad

- **Nunca transmitir sin antena o carga artificial.** Todo paso con TX está marcado "requiere carga artificial confirmada".
- **QMX+: nunca TX** (no tiene antena). Solo lectura de frecuencia y modo.
- El diagnóstico (Probar todo) solo recibe: no transmite ni escribe memorias.
- Antes de cada bloque, `adb logcat -c`.

## Comandos de verificación

- Logs de la app: `adb logcat -d | Select-String "radicodex|RadiCodex"`.
- Dispositivos USB vistos por Android: `adb shell dumpsys usb | Select-String "vendor|product"`.
- Paquete instalado: `adb shell dumpsys package org.bricohams.radicodex | Select-String "versionName|versionCode"`.
- Serie: terminal serie (115200 o 38400 según radio) solo en el PC cuando la radio se conecta al ordenador; en el teléfono se usa el informe de Diagnóstico.

## Matriz de pruebas

| ID | Módulo | Radio | Pasos | Resultado esperado | Verificación adb/logcat/serial | Riesgo | Resultado | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T01 | Instalación y versión | ninguna | Instalar el APK de GitHub 1.1.0 y abrir la app. | versionName 1.1.0, versionCode 18. | `dumpsys package` muestra 1.1.0 y 18. | Bajo |  |  |
| T02 | Novedades | ninguna | Primer arranque tras actualizar. | Diálogo Novedades 1.1.0 en el idioma del teléfono (es/en/de/fr). | Captura; no hay errores en logcat. | Bajo |  |  |
| T03 | Aspecto BricoHams v1.1 | ninguna | Recorrer Inicio y varios módulos. | Grafito `#23272B` y naranja `#F26B1D`; contraste legible. | Captura. | Bajo |  |  |
| T04 | DeX | ninguna | Conectar a monitor con Samsung DeX y abrir la app. | La interfaz se adapta y es utilizable con ratón y teclado. | Captura de DeX. | Bajo |  |  |
| T05 | Idiomas | ninguna | Cambiar el teléfono a es, en, de y fr. | Textos y ayuda traducidos, sin claves sin traducir. | Captura por idioma. | Bajo |  |  |
| T06 | Libro de guardia | ninguna | Crear libro, añadir contactos, buscar, importar y exportar ADIF. | Contactos guardados; ADIF exportado e importado igual. | Fichero ADIF; logcat sin excepciones. | Bajo |  |  |
| T07 | ARDF | ninguna | Iniciar sesión con GPS, anotar observaciones. | Sesión, estadísticas e historial correctos. | Captura; logcat. | Bajo |  |  |
| T08 | Morse | ninguna | Texto a Morse; importar un WAV de prueba. | Texto correcto en ambos sentidos. | Captura. | Bajo |  |  |
| T09 | SSTV Robot36 desde WAV | ninguna | Importar un WAV Robot36 de prueba y guardar el PNG. | Imagen reconocible guardada. | PNG en almacenamiento de la app. | Bajo |  |  |
| T10 | Receptor en vivo | ninguna | Conceder micrófono; capturar Morse o Robot36 hasta 60 s. | Captura y decodificación sin cuelgues. | logcat. | Bajo |  |  |
| T11 | Modos digitales FT8/FT4/FT2 | ninguna | Decodificar un WAV de prueba en cada modo. | Decodificaciones correctas; FT2 con OSD y decodificación a priori. | Captura; logcat. | Bajo |  |  |
| T12 | Ubicación GPS | ninguna | Satélites, Obtener posición del teléfono, permiso preciso. | Posición en hasta 180 s con satélites vistos y usados. | Captura; logcat. | Bajo |  |  |
| T13 | Ubicación GPS aproximada | ninguna | Repetir concediendo solo ubicación aproximada. | Posición aproximada válida para pases. | Captura. | Bajo |  |  |
| T14 | Ubicación GPS sin señal | ninguna | En interior o con ubicación apagada. | Mensaje claro; opción de posición guardada o manual. | Captura. | Bajo |  |  |
| T15 | TLE con respaldo | ninguna | Actualizar TLE con red; repetir con CelesTrak bloqueado. | Se usa CelesTrak y, si falla, SatNOGS y después AMSAT. | logcat con la fuente usada. | Bajo |  |  |
| T16 | Pases SGP4 y mapa | ninguna | Elegir pase y abrir seguimiento. | Pase, azimut y elevación coherentes. | Captura. | Bajo |  |  |
| T17 | Actualizaciones OTA | ninguna | Compilación GitHub: Actualizaciones, buscar. | Se verifica firma, SHA-256, tamaño, paquete y certificado; Android pide confirmación. | logcat; `dumpsys package` tras actualizar. | Medio |  |  |
| T18 | OTA en F-Droid | ninguna | Instalar la variante fdroid. | No hay botón de Actualizaciones. | Captura. | Bajo |  |  |
| T19 | Aviso de cambio de app o firmware | Quansheng | Actualizar la app y luego cambiar el firmware de la radio. | La app avisa del cambio de app y de firmware. | Captura; logcat. | Bajo |  |  |
| T20 | Diagnóstico: Buscar | Quansheng | Conectar por OTG y pulsar Buscar dispositivos USB. | Aparece la UV-K5 (`0x36B7`) y el permiso USB. | `dumpsys usb`. | Bajo |  |  |
| T21 | Diagnóstico: Probar todo | Quansheng | SAT RX con CAT activo; pulsar Probar todo. | Todas las pruebas en verde y sin transmitir. | Informe compartido; logcat. | Bajo |  |  |
| T22 | Diagnóstico: informe | Quansheng | Compartir y guardar el informe. | Informe con radio, firmware y resultados. | Fichero del informe. | Bajo |  |  |
| T23 | Puente TCP | ninguna | Activar el puente; conectar desde el PC en la red local; apagarlo. | Solo funciona con la pantalla abierta; se corta al apagar. | `adb shell netstat`; cliente TCP del PC. | Medio |  |  |
| T24 | CAT Quansheng remoto | Quansheng | SAT RX y F+8; en la app sintonizar y pulsar STOP. | Actúa sobre el VFO y vuelve a la frecuencia del usuario (firmware BH Satellite v0.5.7). | Pantalla de la radio; logcat. | Medio |  |  |
| T25 | CAT Quansheng firmware antiguo | Quansheng | Firmware anterior: SAT RX y tecla 8. | El CAT se activa con la tecla 8. | Pantalla de la radio. | Bajo |  |  |
| T26 | Editor de canales Quansheng | Quansheng | Respaldo completo, editar un canal, escribir y releer. | El canal se escribe y la relectura coincide. | Fichero de respaldo; informe. | Alto (escribe en la radio; hacer respaldo antes) |  |  |
| T27 | CAT multirradio | FTX-1 | Puerto Enhanced COM (CAT-1) a 38400; leer y cambiar frecuencia y modo. | Lectura y cambio correctos. | Pantalla de la radio; terminal serie `38400` en el PC. | Medio |  |  |
| T28 | Diagnóstico | FTX-1 | Buscar y Probar. | Identificada (`0x10C4:0xEA70`); frecuencia restaurada. | Informe; `dumpsys usb`. | Bajo |  |  |
| T29 | PTT / SSTV TX | FTX-1 | requiere carga artificial confirmada: PTT breve con potencia mínima. | La radio pasa a TX y vuelve a RX. | Pantalla de la radio; vatímetro. | Alto |  |  |
| T30 | CAT multirradio | truSDX | CAT a 115200 con firmware 2.00t o posterior; leer y cambiar banda. | Lectura y cambio correctos. | Pantalla de la radio; terminal serie `115200`. | Medio |  |  |
| T31 | CAT multirradio firmware anterior | truSDX | Firmware antiguo a 38400. | La app prueba la otra velocidad y conecta. | logcat. | Bajo |  |  |
| T32 | Diagnóstico | truSDX | Buscar y Probar. | Identificada (`0x1A86:0x7523`). | Informe. | Bajo |  |  |
| T33 | Modos digitales por audio USB | truSDX | FT8 o FT2 con audio USB. | Decodificaciones con señal real o simulada. | Captura; logcat. | Bajo |  |  |
| T34 | PTT / SSTV TX | truSDX | requiere carga artificial confirmada: PTT breve a potencia mínima. | TX y vuelta a RX. | Pantalla de la radio; vatímetro. | Alto |  |  |
| T35 | CAT multirradio | QMX+ | CDC virtual COM a 38400; leer frecuencia y modo. | Lectura correcta; la app no envía retorno de carro. | Pantalla de la radio; logcat. | Medio |  |  |
| T36 | Diagnóstico | QMX+ | Buscar y Probar. | Identificada (`0x0483:0xA34C`); solo recepción. | Informe. | Bajo |  |  |
| T37 | Sin TX | QMX+ | Comprobar que no se ofrece ni se ejecuta PTT. | **NUNCA TX con la QMX+ (sin antena).** No se transmite. | Pantalla de la radio. | Alto si se transmite |  |  |
| T38 | OpenGD77 | ninguna | Conectar la radio OpenGD77; Pantalla, Reloj y Ping. | Pantalla y reloj UTC correctos. | Captura; logcat. | Bajo |  |  |
| T39 | Ayuda | ninguna | Abrir la guía y comprobar la tabla de radios. | Radios, identificadores, baudios y activación del CAT documentados. | Captura. | Bajo |  |  |
| T40 | Radios sin respuesta | cualquiera | Desconectar la radio con la app abierta. | Error claro sin cuelgue ni TX. | logcat. | Bajo |  |  |

## Criterio de salida

- Ninguna fila en FALLO sin incidencia abierta.
- T29, T34 y T37 revisadas por una segunda persona antes de dar la versión por buena.
- Evidencia archivada fuera del repo.
