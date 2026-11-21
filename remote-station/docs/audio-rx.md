# Audio RX experimental

Entrada PCM real del equipo de estación, solo recepción, sin PTT, micrófono del
cliente ni sidetono. No se ha validado con hardware ni con dispositivos móviles.
El agente no elige la entrada predeterminada: sin configuración el audio está
desactivado y los metadatos nunca abren el ADC.

## Preparación

Instale opcionalmente `sounddevice==0.5.3` en el mismo Python 3.12 que ejecuta
el agente: `py -3.12 -m pip install ".[audio]"` (Windows), o
`python3.12 -m pip install ".[audio]"` (Linux). La instalación base y el ZIPAPP
base no incluyen dependencias de audio ni DLL nativas; para el ZIPAPP instale
el extra en su entorno Python externo. En Linux hace falta una biblioteca
PortAudio compartida proporcionada por el sistema (p. ej. paquete
`libportaudio2` en Debian/Ubuntu); pídala al administrador si falta. No se
modifica la configuración global automáticamente.

Con el receptor conectado, consulte las entradas con
`python -c "import sounddevice as sd; print(sd.query_devices())"`. Seleccione
explícitamente índice y nombre exacto de entrada. Cree un JSON, por ejemplo:

```json
{"device": 3, "device_name": "USB Audio CODEC", "sample_rate": 48000, "block_ms": 20}
```

Inicie el agente con `--audio-config` apuntando a ese archivo además de sus
opciones existentes de autenticación/TLS/CAT. `device_name` es opcional, pero
recomendado para detectar cambios de índice. Frecuencia entera 8000–48000 Hz,
bloque entero 10–100 ms y un número entero de muestras por bloque. El
dispositivo debe admitir mono PCM16 a la frecuencia seleccionada. No se inicia
captura hasta solicitar el flujo; si falta el dispositivo, cambia el nombre, no
está disponible PortAudio o el formato falla, se informa un error. El índice
por sí solo no garantiza identidad si se omite el nombre.

El coordinador usa el enlace autenticado al agente existente (token dedicado
para HTTPS entre hosts); HTTP únicamente en loopback. La consola requiere una
interacción explícita en «Escuchar RX». Detener o desconectar libera audio y
conexión. AudioWorklet requiere un contexto seguro y soporte del navegador o
WebView; no implica aceptación en Android/iOS. Solo un consumidor simultáneo;
sobrecarga de captura o reproducción interrumpe con error, no descarta bloques
silenciosamente. El estado de búfer insuficiente es explícito. No sustituye a
la supervisión local ni garantiza latencia constante.

El panel y sus estados de búfer/errores de trama usan ES/EN/FR/PT. Cambiar
idioma mantiene el flujo, AudioContext y nodo de reproducción; no reconecta
ni abre otro dispositivo. Detener o desmontar sigue cerrando el contexto y
abortando la petición. Los mensajes técnicos externos conservan su texto de origen.

## Protocolo experimental BHR1

`GET /api/v1/audio` devuelve metadatos sin abrir el dispositivo; `GET
/api/v1/audio/stream` requiere admin, operador o listener en ambos saltos.
Bearer en cabecera, sin cookies, redirecciones ni token en URL. El stream es
HTTP chunked `application/vnd.bricoham.pcm`, sin longitud total. Los límites
HTTP chunk no delimitan registros.

Cabecera de 12 bytes: ASCII `BHR1`, frecuencia uint32 little-endian, canales
uint16 LE (=1), bits uint16 LE (=16). Después, registros: longitud uint32 LE
seguida de esa cantidad de bytes PCM16 con signo, little-endian. Longitud cero
es heartbeat; máximo `sample_rate * 0.2` bytes (100 ms mono). No hay fin normal:
error, desconexión o parada interrumpe el cuerpo HTTP sin chunk terminal. El
cliente debe considerar truncamiento como error y detener reproducción. No es
un protocolo de audio nativo de radio.
