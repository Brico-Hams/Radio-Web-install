# Tutoriales de RadiCodex by BricoHams

Guía paso a paso de la APK única de RadiCodex by BricoHams (`org.bricohams.radicodex`, aplicación nativa Kotlin). Cada tutorial indica el objetivo, qué necesitas, los pasos con los textos exactos de la pantalla, el resultado esperado y los errores habituales. El alcance técnico y las limitaciones completas están en [RadiCodex by BricoHams](ANDROID.md). Las funciones marcadas como experimentales no tienen validación con radio real: pruébalas primero con una carga ficticia o en recepción.

## Antes de empezar

### Instalación y requisitos

**Objetivo:** tener la APK instalada y funcionando.

**Necesitas:** un móvil con Android 8.0 (API 26) o superior. La app no necesita servidor ni cuenta.

1. Descarga la APK y comprueba su SHA-256 publicado (ver [RadiCodex by BricoHams](ANDROID.md)).
2. Abre el archivo desde el gestor de archivos o el navegador. Android pedirá autorizar la instalación desde esa aplicación: acéptalo solo para este paso.
3. La APK no se distribuye por Google Play. Las APK de depuración usan la clave debug; la APK de publicación `RadiCodex-1.0.0.apk` solo está firmada con la clave de publicación si la release la incluye (comprueba su SHA-256).
4. Abre RadiCodex. Verás el aviso "Datos locales. Exporta tus datos antes de desinstalar."

**Resultado esperado:** pantalla principal con las secciones "Tu estación de radio", "Radio y recepción", "Tus datos y copias" y "Alcance y privacidad".

**Errores comunes:**

- Android bloquea la instalación: falta autorizar la instalación desde la aplicación que abre el APK.
- Desinstalar la app borra los datos locales (SQLite privada): usa antes "Exportar todos los datos JSON".

### Permisos y para qué se piden

RadiCodex no recopila ni envía datos. Estos son los permisos del manifiesto y su motivo:

| Permiso | Para qué se usa |
| --- | --- |
| Ubicación (precisa y aproximada) | Una posición GPS puntual en ARDF y "Usar ultima posicion GPS" en Satélites. No hay seguimiento en segundo plano |
| Micrófono | Solo al pulsar "Iniciar captura de audio" o recibir SSTV en CAT multiradio. Concederlo no inicia la grabación |
| Internet y estado de red | Descarga HTTPS de TLE (CelesTrak) y frecuencias (SatNOGS) y conexión Wi-Fi con el rotor (192.168.4.1) |
| Bluetooth (buscar y conectar) | Rotor AZ/EL por BLE |
| USB host | Radios por cable OTG. Android pide permiso por cada dispositivo y nunca conecta solo al enchufar |

El micrófono, el GPS, el USB host, el BLE y la brújula no son obligatorios para instalar la app: sin ellos solo se desactivan las funciones correspondientes.

### Elegir el idioma

1. En la pantalla principal abre "Idioma de RadiCodex".
2. Elige "Idioma del sistema", Español, English (US), Français o Deutsch.

**Resultado esperado:** el idioma se guarda en el móvil y se aplica a todas las pantallas. No se traducen indicativos, nombres de canal ni archivos del usuario.

## Tutoriales

### 1. Libro de guardia (logbook)

**Objetivo:** registrar contactos, buscarlos y mover datos de forma segura.

**Necesitas:** solo el móvil. Funciona sin conexión.

**Añadir un contacto**

1. Abre la pestaña "Guardia". Si quieres un libro POTA o SOTA, crea uno en "Libros de guardia": rellena "Nombre del libro", "Referencia de parque o cumbre (vacio en General)" (ejemplos EA-0123 y EA4/MD-001), "Mi indicativo de estacion" y pulsa "Crear libro".
2. Escribe "Indicativo" (3 a 20 caracteres: letras, números y /).
3. Deja "UTC ISO (vacio = hora actual al guardar)" vacío o escribe la fecha.
4. Rellena "Frecuencia MHz", el modo, "Informe enviado", "Informe recibido" y "Notas".
5. Pulsa "Guardar nuevo contacto".

**Resultado esperado:** el contacto queda guardado en el móvil; se limpian indicativo y notas y se conservan frecuencia y modo. Si ya existe el mismo indicativo, banda y modo, aparece un aviso con "No guardar" o "Guardar igualmente". Para editar, pulsa el contacto, usa "Guardar cambios del contacto", "Cancelar edicion" o "Eliminar este contacto" (pide confirmación).

**Buscar**

1. Escribe en "Buscar en este libro: indicativo, notas, modo o frecuencia".
2. Pulsa "Buscar contactos"; para volver a ver todo, "Mostrar todos los contactos".

Se muestran los 50 resultados más recientes; las exportaciones incluyen todo el libro.

**Importar ADIF con vista previa**

1. Pulsa "Importar ADIF a este libro (vista previa)" y elige el archivo.
2. Revisa la vista previa: muestra los "Campos NO conservados" y omite los contactos idénticos. No se guarda nada hasta aceptar.
3. Acepta para importar en una sola transacción.

Solo se admite ADIF ASCII de hasta 16 MiB y 50000 contactos. Haz antes una copia JSON.

**Copia JSON y restauración**

1. Para guardar: "Exportar todos los datos JSON" (pantalla principal) o "Exportar JSON completo (con acentos)" (libro).
2. Para restaurar: "Importar copia JSON Bricohams", diálogo "Importar copia local", "Elegir JSON". Nunca sobrescribe: si un identificador entra en conflicto, se cancela toda la importación.

**Exportar para LoTW**

1. Pulsa "Exportar ADIF de este libro (ASCII)".
2. Firma y sube el archivo con TQSL en un ordenador: esta APK no sube a LoTW.

**Errores comunes:**

- Indicativo rechazado: debe tener letras, números y /.
- Referencia POTA o SOTA con formato incorrecto (EA-0123, EA4/MD-001).
- ADIF con UTF-8 o caracteres de control: no se admite; conserva el original.

### 2. ARDF y GPS

**Objetivo:** anotar observaciones de balizas con la posición del móvil.

**Necesitas:** permiso de ubicación y cielo abierto para el GPS (opcional: puedes guardar sin coordenadas).

1. En la pestaña "ARDF", escribe "Nombre de nueva sesion" y pulsa "Crear sesion ARDF" (o "Seleccionar sesion").
2. Indica "Baliza (1-10)" y "Notas de observacion".
3. Pulsa "Obtener posicion GPS una vez (30 s)" y acepta el diálogo "Posicion para ARDF". Espera la posición.
4. Pulsa "Guardar observacion manual".
5. Pulsa "Estadisticas y observaciones de la sesion" para revisar y "Exportar sesiones y contactos JSON" para guardar.

**Resultado esperado:** la observación se guarda con la posición del móvil (no la de la baliza) si hay posición reciente; si no, se guarda sin coordenadas. Cada posición sirve para una sola observación y las simuladas se descartan. Las estadísticas suman segmentos GPS con precisión de 50 m o mejor, edad de 30 s o menos y separación de 120 s o menos; no son un recorrido completo.

**Errores comunes:**

- "Sin posicion reciente tras 30 s": busca cielo abierto o activa el GPS.
- GPS desactivado o sin permiso: la observación se guarda sin coordenadas.

### 3. USB CAT RX (F4HWN, experimental)

**Objetivo:** sintonizar la recepción de una Quansheng con la imagen Bricohams SAT RX v1 (base F4HWN v6+).

**Necesitas:** cable USB OTG de datos (CDC ACM o adaptador de un puerto CH34x, CP210x, FTDI o Prolific). El CAT es solo por USB, no por Bluetooth.

1. En la radio activa SAT RX y pulsa la tecla 8 (`CAT READY RX`).
2. En la app abre "Abrir CAT RX USB experimental" (pantalla "Radio USB / CAT") y pulsa "Elegir dispositivo USB".
3. Acepta el permiso USB de Android.
4. Pulsa "Consultar CAT RX" para confirmar el estado.
5. Escribe "Frecuencia RX MHz (hasta 5 decimales)" (pasos de 10 Hz, VHF 136-174 o UHF 400-470) y pulsa "Sintonizar RX (se renueva hasta STOP)".
6. Para terminar, "STOP: volver a RX nominal" y "Desconectar USB".

**Resultado esperado:** la app renueva la sintonía cada 1,2 s; si deja de renovarla, la radio vuelve a RX nominal a los 3 s. Las teclas 4, 5 y 6 de la radio vuelven al modo manual.

**Doppler de un pase:** desde Satélites elige un pase, conecta el CAT y pulsa "Iniciar Doppler del pase seleccionado" (solo dentro de la ventana del pase); "Detener seguimiento y desconectar USB" lo termina.

**Errores comunes:**

- Sin dispositivo: revisa el OTG, el cable y el firmware; no se usa un dispositivo arbitrario.
- Permiso USB rechazado o caducado: vuelve a elegir el dispositivo.
- Se desconecta el USB: elige el dispositivo de nuevo antes de usar CAT.

### 4. Editor de canales Quansheng (Beta)

**Objetivo:** cambiar nombre, frecuencias, subtonos y potencia de canales FM existentes en F4HWN v6.

**Necesitas:** cable USB OTG, firmware Labs v6.1 o superior (F4HWN v6.0 es solo lectura) y 10 a 20 minutos para la copia.

1. Abre "Editar canales Quansheng por USB (Beta)" ("Canales Quansheng") y pulsa "1. Elegir dispositivo USB y conectar".
2. Pulsa "2. Respaldo completo (Flash 2 MiB, 10-20 min)". La copia se guarda y verifica en el almacenamiento privado de la app con SHA256SUMS; cópiala fuera del móvil.
3. Pulsa "3. Leer canales de la radio".
4. Pulsa "4. Elegir canal" y edita Nombre (1-10 ASCII), RX (MHz), TX (MHz), Tono RX y Tono TX (OFF, CTCSS en Hz como 88.5, o DCS como D023N / D023I), Potencia (USER, LOW1-LOW5, MID, HIGH), Banda estrecha (12,5 kHz) y "Bloquear TX en este canal".
5. Pulsa "5. Aplicar cambios a la copia local".
6. Pulsa "6. Escribir en la radio y releer" y confirma el diálogo "Escribir canales en la radio".
7. Reinicia la radio cuando termine.

**Resultado esperado:** "Escritura verificada por relectura". La escritura no es segura ante cortes de energía: no desconectes ni apagues la radio.

**Errores comunes:**

- "Escritura bloqueada": falta la copia completa verificada de esta sesión.
- Cualquier error, desconexión o salir de la pantalla invalida la sesión: reconecta y repite la copia.
- RX y TX deben estar en la misma banda (136-174 o 400-470 MHz).
- Revisa que frecuencias, tonos y potencia sean legales para ti.

### 5. OpenGD77 por USB

**Objetivo:** ver la pantalla de una radio OpenGD77 y poner su reloj en UTC.

**Necesitas:** radio OpenGD77 y cable OTG de datos.

1. Abre "OpenGD77 por USB: pantalla y reloj" y pulsa "Elegir dispositivo USB"; acepta el permiso.
2. La app muestra el modelo, el firmware y "Funciones por USB" con "Soportado" o "No soportado".
3. Pulsa "Capturar pantalla" para ver la pantalla de la radio.
4. Pulsa "Sincronizar reloj UTC" y vuelve a abrir el menú Satélite de la radio para recalcular los pases.
5. Usa "Comprobar enlace" para probar la conexión y "Desconectar USB" al terminar.

**Resultado esperado:** "Pantalla capturada.", "Reloj enviado" o "Enlace correcto.". OpenGD77 no tiene CAT de sintonía por USB: no hay frecuencia, modo, canal, PTT ni Doppler desde el móvil, y nunca se escribe la Flash.

**Errores comunes:**

- "No hay ninguna radio USB CDC conectada": usa un cable OTG de datos.
- Identificación desconocida: la app no asume ningún modelo.

### 6. CAT multiradio

**Objetivo:** controlar frecuencia, modo, memorias, satélites y modos digitales de una radio por USB.

**Necesitas:** cable USB OTG o interfaz de la radio. Modelos de la lista "Modelo de radio": Yaesu FT-817/FT-817ND, FT-818ND, FT-857/FT-857D, FT-897/FT-897D (4800 baudios), Icom IC-705 (115200, dirección CI-V A4 por defecto), Yaesu FTX-1 (38400, firmware MAIN 1.08 o superior, puerto Enhanced COM CAT-1) y (tr)uSDX (115200 con firmware 2.00t o superior; 38400 como alternativa). Las pruebas físicas están pendientes: no son equipos certificados.

**Conectar y sintonizar**

1. Abre "CAT multiradio (FT-817, FT-857, IC-705, FTX-1, (tr)uSDX)" ("Bricohams CAT multiradio").
2. En "Radio" elige "Modelo de radio", revisa "Velocidad (baudios)" (en IC-705 también "Dirección CI-V (hex)"), pulsa "Elegir dispositivo USB" y "Conectar".
3. En "Frecuencia y modo" escribe "Frecuencia (MHz)" y pulsa "Fijar VFO A" o "Fijar VFO B".
4. Elige "Modo" (LSB, USB, CW, CW_R, AM, FM, FM_N, WFM, RTTY, RTTY_R, DATA_L, DATA_U, DATA_FM, DV) y pulsa "Fijar modo"; "Leer" actualiza la lectura.
5. "Prueba PTT 3 s" abre el diálogo "Prueba de PTT": exige indicativo, transmite 3 s y necesita antena adecuada o carga ficticia.

**Memorias**

1. En "Memorias" indica "Desde canal" y "Hasta canal" (máximo 100 por lectura; límites IC-705 0..99, FTX-1 1..999, resto 1..99) y pulsa "Leer memorias".
2. Solo IC-705 y FTX-1 permiten leer memorias. Las FT-817/857/897 y la (tr)uSDX no.
3. Al pulsar una fila puedes elegir "Sintonizar" (aplica al VFO A) y, solo en FTX-1, "Editar".
4. Escritura de memorias (solo FTX-1): "Nuevo canal" o "Editar" abre "Canal de memoria" con Canal, Frecuencia RX (MHz), Modo, "Nombre (máx. 12 caracteres)" y "Frecuencia TX para split (MHz, vacío = símplex)". Pulsa "Guardar"; si el canal tiene datos, pide confirmar el reemplazo.

**Resultado esperado:** "Canal N guardado y verificado." con relectura.

**Satélite y guardar en memoria**

1. Desde un pase de Satélites pulsa "Abrir en CAT multiradio", o escribe "Bajada (MHz)", "Subida (MHz, opcional)" y "Paso Doppler (Hz)" (1 a 5000, por defecto 100).
2. Pulsa "Iniciar seguimiento"; "Detener seguimiento" lo termina. Con subida se usa split; la familia FT-817 reprograma la subida en el VFO B como mucho cada 5 s.
3. Solo FTX-1: "Guardar transpondedor en memoria" abre el editor con bajada, subida y el nombre del satélite (máximo 12 caracteres) en el primer canal libre.

**Tarjeta "Modos digitales"**

1. Elige "Modo digital", "Banda y frecuencia" y "Periodo".
2. Pulsa "Sintonizar": pone el VFO A en la frecuencia de dial y el modo de datos (DATA_U en FT-817/818/857/897 y FTX-1; USB en IC-705 y (tr)uSDX; en el IC-705 activa DATA ON en la radio).
3. La línea de reloj UTC muestra el próximo turno par o impar. Si aparece "La hora automática está desactivada: FT8 necesita el reloj a ±1 s.", activa la hora automática de Android.
4. Para usar un módem externo (FT8CN, JS8Call u otra app) pulsa "Liberar el puerto para una app digital" y en esa app elige la misma radio.

Frecuencias de dial estándar que ofrece la app (MHz; solo se muestran las que entran en el rango de la radio; son frecuencias de uso comunitario: verifícalas localmente):

| Modo | Periodos (s) | Frecuencias de dial |
| --- | --- | --- |
| FT8 | 15 | 1.840, 3.573, 5.357, 7.074, 10.136, 14.074, 18.100, 21.074, 24.915, 28.074, 50.313, 144.174 |
| FT4 | 7.5 | 3.575, 7.0475, 10.140, 14.080, 18.104, 21.140, 24.919, 28.180, 50.318, 144.170 |
| JS8 | 15, 30, 10, 6 | 1.842, 3.578, 7.078, 10.130, 14.078, 18.104, 21.078, 24.922, 28.078, 50.318, 144.178 |
| WSPR | 120 | 0.136, 0.4742, 1.8366, 3.5686, 5.2872, 7.0386, 10.1387, 14.0956, 18.1046, 21.0946, 24.9246, 28.1246, 50.293, 144.489 |
| Q65 | 15, 30, 60, 120, 300 | 50.275, 144.116 |
| JT65 | 60 | 1.838, 3.570, 7.076, 10.138, 14.076, 18.102, 21.076, 24.917, 28.076, 50.310 |
| JT9 | 60 | 1.839, 3.572, 7.078, 10.140, 14.078, 18.104, 21.078, 24.919, 28.078 |
| FST4 | 60, 120, 300, 900, 1800 | 0.136, 0.4742 |
| FST4W | 120, 300, 900, 1800 | 0.136, 0.4742 |

Los modos digitales y las memorias figuran como pendientes de validar en un móvil real.

**Errores comunes:**

- "Este equipo no permite leer memorias": esa radio no admite lectura.
- Frecuencia fuera del rango del equipo: el mensaje indica el rango admitido.
- Se cierra la conexión al salir de la pantalla o al desenchufar el USB: vuelve a conectar.
- IC-705: expone dos puertos serie; elige el correcto ("puerto N").

### 7. Satélites

**Objetivo:** calcular pases offline (SGP4), seguirlos en mapa y radar y recibir con Doppler.

**Necesitas:** posición del observador y, para actualizar el catálogo, conexión a Internet. Después funciona offline mientras los TLE no superen 7 días.

1. Abre "Abrir satelites SGP4 y pases" ("Bricohams Satelites"). Si el catálogo falta o tiene 24 h o más, se actualiza solo (HTTPS con CelesTrak y SatNOGS; no se envía tu ubicación). Para hacerlo a mano usa "Actualizar TLE y frecuencias" o "Importar archivo TLE" en la pestaña "Ajustes", donde también se desactiva la actualización automática.
2. En "Ajustes" indica latitud, longitud, altura (km, elipsoide WGS84) y elevación mínima (0-60), o pulsa "Usar ultima posicion GPS", y "Guardar y calcular pases".
3. En "Satelites" elige con "Buscar por nombre o NORAD", "Todos", "Con RX" o "Ninguno".
4. En "Pases" verás las próximas 24 h con la cuenta atrás de AOS y LOS. Abre un pase para ver el radar polar (verde AOS, rojo LOS, naranja posición actual) y la lista de bajadas ("Bajada para CAT RX", "Otra frecuencia (MHz)").
5. En "Mapa" aparecen satélites, huella y traza de ±45 min, actualizados cada 5 s; toca un satélite para seleccionarlo.
6. Para recibir: "Conectar CAT: Doppler, SSTV y grabacion" (Quansheng, ver tutorial 3) o "Abrir en CAT multiradio" (tutorial 6).
7. Para grabar un pase: en el CAT conectado pulsa "Grabar pase completo (WAV hasta LOS)" y "Detener grabacion del pase"; el WAV es de 16 kHz mono y se detiene en LOS, a las 2 h o al salir de la pantalla.
8. Para buscar SSTV: en "Ajustes" abre "Grabaciones de pases" y pulsa "SSTV" (explora ventanas de 60 s cada 23 s en busca de imágenes Robot36); también hay "Exportar" y "Borrar" con confirmación.

**Resultado esperado:** pases con AOS, máximo y LOS. El Doppler por CAT solo corrige la recepción (Quansheng); no hay corrección de subida en la Quansheng.

**Errores comunes:**

- Sin pases: falta guardar el observador en "Ajustes".
- TLE caducados (más de 7 días): actualiza el catálogo.
- Tras un fallo de descarga, la actualización automática espera 15 minutos.

Para las bandas y la iniciación a la recepción consulta [Iniciación a la recepción de satélites](INICIACION-SATELITE.md).

### 8. Rotor AZ/EL

**Objetivo:** apuntar un rotor al pase seleccionado.

**Necesitas:** el rotor Bricohams con Wi-Fi (192.168.4.1) o "Bluetooth seguro" (PIN de 6 dígitos, BLE), el token de 24 a 128 caracteres ASCII configurado por USB en el rotor y el paro de emergencia físico a mano. No hay prueba con rotor físico.

1. En el detalle de un pase pulsa "Rotor AZ/EL: preparar y seguir este pase".
2. Elige Wi-Fi o Bluetooth, introduce el token o el PIN y pulsa "Conectar".
3. Pulsa "Homing (buscar finales de carrera)".
4. Pulsa "Calibrar norte y nivel con el móvil": con el móvil plano sobre el brazo y la parte superior hacia los elementos, usa "Usar rumbo de la brújula" o escribe "Azimut verdadero de la antena (0-359,9°)", marca "Confirmo que el mástil está nivelado" y pulsa "Calibrar".
5. Pulsa "Enviar hora y ubicación del móvil" (el firmware 0.3.0-prototype lo admite; el firmware API 1 usa la hora GNSS).
6. Pulsa "Preparar pase: cargar TLE y apuntar a AOS" y revisa el aviso de corte de cable.
7. Pulsa "Seguir automáticamente desde AOS"; "Cancelar seguimiento automático" lo detiene.

**Resultado esperado:** el rotor apunta a AOS y sigue el pase con la pantalla encendida.

**Errores comunes:**

- 409: otro cliente controla el rotor.
- Pérdida del enlace BLE en movimiento: el rotor entra en fallo; usa "Borrar fallo (exige nuevo homing)".
- El rotor se detiene en el tope de cable, por encima de 89° o si el satélite va más rápido que el motor.
- "PARAR motores" detiene el movimiento en cualquier momento. Los detalles están en la guía del rotor del repositorio (docs/ROTOR.md, solo en español).

### 9. Recepción de audio en vivo

**Objetivo:** capturar audio con el micrófono y decodificarlo después como Morse o SSTV.

**Necesitas:** permiso de micrófono y el audio de la radio sonando cerca del micrófono.

1. Abre "Recibir Morse / Robot36 con microfono" ("Recepción de audio").
2. Elige Morse o SSTV. Para Morse ajusta "Tono Morse (300 a 1200 Hz)" y "Velocidad Morse (5 a 45 ppm)".
3. Pulsa "Iniciar captura de audio". Si Android pide permiso, concédelo y pulsa de nuevo: el permiso no inicia la grabación.
4. Pulsa "Detener y decodificar" (o "Cancelar y descartar audio").

**Resultado esperado:** el audio (PCM mono 48 kHz, hasta 60 s en Morse o 200 s en SSTV) queda solo en memoria, no se guarda ni se transmite. Salir de la pantalla cancela la captura. La decodificación es experimental.

**Errores comunes:**

- SSTV necesita la cabecera VIS completa: empieza antes de la transmisión.
- Sin permiso de micrófono: puedes seguir usando los importadores WAV.

### 10. Morse

**Objetivo:** convertir texto Morse o un WAV en texto.

1. En la pestaña "Morse" escribe puntos y rayas (espacio entre letras, `/` entre palabras, `?` para código desconocido) y pulsa "Interpretar texto Morse".
2. Para un archivo (experimental): ajusta "Tono (300-1200 Hz)" y "Velocidad (5-45 palabras/minuto)" con números enteros y pulsa "Importar y decodificar WAV Morse".

**Resultado esperado:** el texto decodificado. El WAV debe ser PCM mono de 16 bits, 8 a 48 kHz, de 0,1 a 60 s y hasta 8 MiB. No es un decodificador adaptativo: verifica el resultado.

**Errores comunes:**

- Tono o velocidad fuera de rango o no enteros.
- WAV estéreo o de otro formato.

### 11. SSTV Robot36 (WAV, micrófono y transmisión)

**Objetivo:** decodificar imágenes SSTV y, opcionalmente, transmitir una por PTT CAT (experimental).

**Decodificar un WAV**

1. Pulsa "Abrir SSTV Robot36 desde WAV" ("SSTV desde audio") y "Decodificar WAV SSTV".
2. Elige un WAV PCM mono de 16 bits, 8000-48000 Hz, hasta 200 s y 24 MiB, con cabecera VIS completa (modos Robot36/72, Martin M1/M2, Scottie S1/S2, PD90/120/180).
3. Pulsa "Guardar imagen PNG" antes de salir o girar la pantalla: la imagen solo vive en memoria.

**Recibir con micrófono:** usa el tutorial 9 con SSTV, o en el CAT RX "Grabar SSTV (CAT sigue sintonizando)" y "Detener grabacion y decodificar".

**Transmitir por CAT TX con PTT (experimental, sin validación RF)**

1. Necesitas licencia, una frecuencia autorizada para SSTV y un cable de audio del móvil a la entrada de micrófono de la radio.
2. En la radio, con SAT RX, arma el PTT con la tecla 9 (`CAT TX ARMED`).
3. En la pantalla CAT escribe "Indicativo (obligatorio)": se imprime en la imagen.
4. Elige el modo en "Modo SSTV (solo los que caben en el limite de 110 s de transmision)" (TX: Robot36/72, Martin M2, Scottie S2, PD90).
5. Pulsa "Enviar SSTV por PTT CAT" y confirma "Transmitir" en el diálogo "Transmitir SSTV".
6. Para parar, "Cancelar / Parar TX (suelta PTT)" o cualquier tecla de la radio.

**Resultado esperado:** imagen enviada con PTT liberado y confirmado por la radio; la app no mide RF. En CAT multiradio también existen "Enviar imagen", "Detener TX", "Recibir SSTV" y "Detener recepción".

**Errores comunes:**

- Rechazo por TX lock, banda, batería o modulación de la radio.
- Sin armado con la tecla 9 o sin indicativo no se transmite.
- No se transmite durante el seguimiento de un pase.

### 12. Modos digitales propios

**Objetivo:** recibir y generar `FT8`, `FT4` y `FT2` con el decodificador propio de RadiCodex, sin otras aplicaciones.

1. Pulsa "Modos digitales FT8 / FT4 / FT2" en la pantalla principal, o "Decodificador y TX propios" en la tarjeta de modos digitales de CAT.
2. Elige el modo: `FT8` (turno de 15 s), `FT4` (7,5 s) o `FT2` (3,75 s, candidato). Verás el reloj UTC y el turno.
3. Para recibir pulsa "Escuchar" (entrada de micrófono o audio USB de Android) o "Decodificar WAV". La recepción de `FT4` y `FT2` aún no está disponible.
4. Para transmitir escribe tu indicativo y un mensaje que lo contenga, y pulsa "Guardar WAV" o "Transmitir en el próximo turno". La app no activa el PTT: usa el PTT del operador o VOX. "Detener TX" para al instante.

**Resultado esperado:** la lista muestra UTC, SNR, DT, Hz y mensaje; la transmisión suena una vez, 0,5 s después del inicio del turno.

**Errores comunes:**

- Mensaje no válido, sin indicativo o con el tono fuera de 100-5000 Hz.
- Sin permiso de micrófono no se puede escuchar.
- `FT2` es un candidato heredado, validado solo con un receptor externo.

## Problemas frecuentes

- No aparece ningún dispositivo USB: usa un cable OTG de datos (no solo de carga) y revisa que la radio esté en el modo CAT correcto.
- Android no concede el permiso USB: vuelve a elegir el dispositivo; el permiso caduca o es por dispositivo.
- La app vuelve a RX nominal: la sintonía no se renovó a tiempo (3 s sin renovación).
- Los pases no salen: guarda el observador y actualiza TLE.
- Perdí los datos al reinstalar: desinstalar borra la base local; exporta el JSON antes.
- El idioma italiano no aparece en la app: la app solo ofrece Español, English (US), Français y Deutsch; la guía sí está en italiano.
- Ayuda de configuración general: [Ayuda de configuración](AYUDA-CONFIGURACION.md). OpenGD77: [Ayuda OpenGD77](AYUDA-OPENGD77.md).

## Seguridad al transmitir

- Transmite solo con licencia, en una frecuencia que tengas autorizada y con una carga ficticia o antena adecuada en las pruebas, con la potencia mínima.
- El indicativo es obligatorio en el SSTV por CAT y en la prueba PTT; debe contener letras, números y /.
- Límites de PTT: la radio corta a los 120 s y la app limita el audio a 110 s; la "Prueba PTT 3 s" dura 3 s; la app renueva el PTT cada 400 ms y la radio lo suelta a 1,5 s si la app falla.
- Cualquier tecla de la radio aborta la transmisión; no se transmite durante un seguimiento de pase.
- No transmitas hacia satélites inactivos ni en segmentos que no te correspondan; la normativa es tu responsabilidad.
- Las funciones de transmisión son experimentales y no tienen validación RF.

## Video de demostracion

Vídeo con las pantallas principales (los tutoriales tienen más detalle): [bricohams-android-demo.mp4](media/bricohams-android-demo.mp4).

Capítulos, en el orden de los tutoriales:

1. Inicio e idioma.
2. Libro de guardia.
3. ARDF y GPS.
4. Morse.
5. Satélites.
6. CAT multiradio.
7. Radios por USB: CAT RX F4HWN, OpenGD77 y editor de canales Quansheng.
8. Audio y SSTV Robot36.
9. Modos digitales FT8, FT4 y FT2.
