# Microfono remoto y fonia TX experimental

El cliente web y el codigo compartido Android/tablet/iPhone/iPad capturan audio
real mediante `getUserMedia` y AudioWorklet. El host lo reenvia al DAC explicito
del agente. No es WebRTC ni un codec de digitales: PCM16 little-endian, mono,
48000 Hz, bloques de 960 muestras/1920 bytes cada 20 ms, aproximadamente
768 kbit/s mas transporte. No hay audio simulado ni sustitucion por microfono
local cuando se configura esta ruta.

## Configuracion local

Instala el agente con el extra `audio` y PortAudio donde el sistema lo requiera.
Selecciona el DAC USB real por indice **y nombre exacto**, nunca el dispositivo
predeterminado. Ejemplo de fichero para `--tx-audio-config`:

```json
{
  "device": 4,
  "device_name": "NOMBRE EXACTO DEL DAC USB DE LA RADIO",
  "channels": 2,
  "channel": 1
}
```

`channels` admite 1/2 y `channel` es cero-based. En estereo solo se rellena el
canal elegido; el otro queda a cero. Si cambia el nombre, no se abre otra salida.
El fichero requiere el CAT FTX-1 explicito y el [PTT local separado](ptt-ftx1.md)
mediante `--ptt-config`. No activa PTT por si mismo. Configura localmente la entrada
SSB USB adecuada en la radio y **desactiva VOX**. Se consulta `VX;` antes de abrir
el DAC y en las guardas PTT; no se cambia VOX automaticamente.

Fuente de `VX0;`/`VX1;`: manual CAT oficial FTX-1 2508-C, pagina impresa 26.
Esto documenta el estado VOX, no acredita rutas de audio, niveles ni firmware.
La salida USB y los ajustes de entrada de la radio necesitan aceptacion fisica.

## Uso y parada

1. Consultar PTT, confirmar RX y preparar el microfono por gesto explicito.
2. Autorizar el permiso de audio del navegador/sistema.
3. Esperar sesion preparada y activar la casilla de PTT.
4. Mantener el boton/tecla. Soltar solicita RX, sin detener la preparacion del
   microfono; desconectar microfono, perder foco, ocultar o cerrar el cliente
   libera la captura. Si un dialogo nativo cancela la preparacion, repetir el
   gesto despues de conceder el permiso; no se reintenta TX.

El DAC arranca **silenciado**. Con dos bloques recientes se publica una capacidad
aleatoria de 256 bits; START debe presentarla cuando `tx_audio_required=true`.
La capacidad no aparece en GET PTT. Solo se reproduce tras confirmar CAT TX.
STOP silencia/limpia el buffer antes de pedir RX, sin llamadas PortAudio bajo el
mutex PTT. El cierre nativo puede bloquear sin impedir el watchdog CAT.

Sin transmitir solo se conservan los dos bloques mas recientes. Durante TX la
cola tiene un maximo de ocho bloques. Underflow, overflow, error nativo, cierre o
300 ms sin PCM fresco invalidan el audio y el watchdog solicita RX. El cliente
rechaza bloques capturados hace mas de 150 ms y congestion de WebSocket.
Son umbrales de software, no garantias de latencia ni corte fisico de RF.

## Contrato de transporte

WebSocket `GET /api/v1/audio/tx`, subprotocolo `bricoham.pcm-tx.v1`.
Sin query, cuerpo HTTP, cookies ni credenciales en URL/subprotocolo. TLS es
obligatorio fuera del loopback de desarrollo. El host verifica Origin mismo
origen/allowlist y exige un primer mensaje de texto `{"token":"..."}` en dos
segundos. Solo admin/operador; no hay I/O CAT/DAC antes de autenticar. El agente
rechaza Origin de navegador: los clientes pasan por el host.

El host usa el secreto dedicado del enlace al agente y verifica CA, hostname y
mTLS cuando esta configurado. No reenvia el token de usuario a un agente remoto.
En desarrollo loopback sin enlace dedicado conserva la autenticacion existente.
`wsproto` 1.3.2 y `h11` 0.16.0 (MIT) implementan el protocolo; no hay parser
WebSocket propio ni compresion negociada.

Respuestas de texto:

- `{"event":"prepared","audio_session_id":"..."}`: DAC silenciado abierto.
- `{"event":"ready","audio_session_id":"..."}`: prebuffer inicial recibido.
- `{"event":"alive"}`: enlace activo, no confirmacion de RF ni de PTT.
- `{"event":"error","code":"audio_tx_..."}`: fallo; se cierra el canal.

Despues de prepared el cliente envia solo mensajes binarios PCM de 1920 bytes.
Mensajes <=4096 bytes, <=32 fragmentos y <=16 controles por lectura; ping/pong
no extienden el plazo de audio. Un unico bucle retransmite ambas direcciones sin
acceso SSL simultaneo desde hilos distintos. No hay reconexion/reinicio automatico
de TX. Cerrar el canal invalida su capacidad. No se graba audio en disco.

## Estado y limites

Pruebas automatizadas con puertos CAT y DAC controlados, conexiones TLS reales,
mTLS y rechazo de roles/origen/CA/cliente sin certificado. No equivalen a RF real,
tablet, reproduccion/captura nativa, aceptacion USB o prueba iOS. Android declara
RECORD_AUDIO/MODIFY_AUDIO_SETTINGS y Capacitor solicita permiso runtime; iOS tiene
NSMicrophoneUsageDescription, pero requiere macOS/Xcode para verificarlo.

SSB/fonia sigue siendo **experimental**, no compatibilidad fisica verificada.
CW directo, WSJT-X activo y agente Android USB OTG independiente siguen pendientes.
La seguridad de software no evita todos los ataques ni sustituye el control de
acceso, actualizaciones, cortafuegos, protecciones RF e interlocks locales.
