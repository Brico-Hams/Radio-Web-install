# Potencia y acoplador: perfiles experimentales

## IC-7300 original

El agente implementa ajustes CAT experimentales del **IC-7300 original**, por
su mismo transporte serie exclusivo. No se extrapolan al IC-7300MK2, otros Icom,
FTX-1, SPA-1 ni a amplificadores externos. FTX-1 tiene el perfil propio descrito
al final de esta guía. No hay hardware validado.

## Evidencia y unidades

Fuente primaria: [Full Manual oficial IC-7300](https://www.icomjapan.com/support/manual/2271/),
documento IC-7300_ENG_FM_12b, apartados 19-2, 19-3 y 19-7
(paginas PDF 160, 161 y 165). Se implementan hechos del protocolo, sin distribuir
el manual ni copiar codigo de terceros:

| Funcion | CI-V | Interpretacion |
|---|---|---|
| Leer/ajustar RF PWR | `14 0A` | Dos bytes BCD, posicion de mando 0000..0255 |
| Consultar RX/TX | `1C 00` sin datos | 00 RX, 01 TX; nunca se envia un setter de PTT |
| Leer/insertar/bypass ATU | `1C 01` | 00 bypass, 01 insertado, 02 sintonizando (solo lectura) |
| Consultar PTT Start | `1A 05 00 35` sin datos | 00 desactivado, 01 activado |
| ACK/NAK | `FB` / `FA` | Se valida origen/destino y trama completa |

El nivel CAT **no son vatios**, porcentaje calibrado, potencia radiada ni una
medida del medidor. No se aplica una conversion lineal a 100 W. Cero tampoco
significa necesariamente ausencia de RF.

## Activacion local explicita

Ademas del modelo, puerto, baud y activacion CAT, crea un JSON local con
exactamente estos campos, desactivados por defecto en el ejemplo:

```json
{
  "power_adjustment_enabled": false,
  "power_level_max": 120,
  "tuner_switching_enabled": false
}
```

120 es un ejemplo de posicion maxima, no una recomendacion de potencia segura.
Selecciona el limite de tu instalacion antes de activar ajustes. Para el
acoplador, este perfil se destina al interno; no declares validados accesorios
externos ni los conectes para ensayar este control sin revisar su protocolo.
La aceptacion fisica debe empezar con TX inhibido y carga/instalacion adecuadas.

```powershell
py -3.12 -m bricoham_station_agent --enable-experimental-cat `
  --serial-model IC-7300 --serial-port COM7 --serial-baud 19200 `
  --radio-settings-config .\radio-settings.json
```

El puerto y baud son ejemplos: usa los seleccionados expresamente en tu radio.
No se busca el primer COM ni se cambian ajustes automaticamente al iniciar.
El ZIPAPP admite las mismas opciones. El panel web/Android/iPhone/iPad utiliza
el host configurado en [despliegue seguro](despliegue-seguro.md).

## API y comprobaciones

`/api/v1/radio-settings` esta disponible en agente y coordinador, solo para
admin/operador:

- GET devuelve configuracion sin abrir puerto ni enviar tramas.
- POST `{"operation":"read"}` consulta estado, nivel y acoplador.
- POST `set_power` requiere `request_id` unico y `power_level` entero dentro del
  limite local.
- POST `set_tuner` requiere `request_id` unico y `enabled` booleano.

Los setters comparten el lock de las lecturas CAT. Antes de escribir se consultan
RX/TX y el acoplador: se rechaza TX o sintonizacion activa. Insertar el acoplador
exige tambien PTT Start desactivado; no se cambia esa preferencia automaticamente.
Se valida ACK y despues se releen nivel, ATU y RX/TX; una discrepancia se informa
como error, no como ajuste aplicado. La transaccion tiene un presupuesto global
de tres segundos, ademas del timeout por intercambio serie.

No se reintenta ni revierte automaticamente una escritura perdida. Ante cualquier
error, la consola bloquea nuevos ajustes hasta una nueva lectura explicita.
Si se pierde un ACK, el equipo **puede haber aplicado el ajuste**: no interpretes
timeout como que nada cambio. Los ultimos 256 identificadores se deduplican
en memoria; no hay proteccion persistente tras reinicio.

## Limites que no deben confundirse con seguridad RF

La comprobacion RX es una observacion, **no un interlock fisico atomico**. Otro
operador, programa, VOX o PTT local puede cambiar el estado entre comandos.
El limite restringe estas peticiones, no vigila ni recorta el nivel que otro
controlador configure. No hay ownership distribuido de la radio.

No se implementan inicio de sintonia (`1C 01 02`), PTT, TX, calibracion en vatios
ni control de amplificador. El modo 02 solo puede observarse. El hardware puede
tener automatismos independientes: conserva protecciones locales y valida su
configuracion. La activacion del acoplador no es prueba de una antena sintonizada.
Las pruebas usan respuestas serie sinteticas y HTTPS real; no prueban RF.

## FTX-1 y potencia del SPA-1 asociado

Fuente primaria: [manual oficial Yaesu CAT 2508-C](https://www.yaesu.com/Files/4CB893D7-1018-01AF-FA97E9E9AD48B50C/FTX-1_CAT_OM_ENG_2508-C.pdf),
página PDF 22, comando PC. El agente consulta `PC;` para observar el cabezal;
jamás lo identifica probando un cambio de potencia. Solo una petición explícita
de `set_power` puede escribir `PC1nnn;` (field, 5..10 W) o `PC2nnn;` (SPA-1,
5..100 W). Son W enteros de **consigna**, no potencia RF medida ni calibrada.
Otros rangos/firmwares y niveles fraccionarios no se extrapolan. No permite cero
como supuesto inhibidor de RF.

Configuración local, por ejemplo, antes de habilitar los ajustes:

```json
{
  "power_adjustment_enabled": false,
  "power_level_max": 30,
  "tuner_switching_enabled": false
}
```

30 W es un ejemplo de límite, no una recomendación para tu instalación.
Para FTX-1 el límite configurado debe estar entre 5 y 100; además se aplica
siempre el máximo de 10 W cuando PC observa field. La conmutación de acoplador
debe permanecer desactivada: este perfil no escribe AC ni controla ATAS.
Usa `--enable-experimental-cat --serial-model FTX-1` y los parámetros serie
explícitos, junto con `--radio-settings-config`.

La misma API/panel devuelve `power_unit: watts_setpoint`, `power_head`,
`power_level`, `tx_active` y `tuner_busy`. No confunde esta escala con
`cat_position_0_255` del IC-7300. La lectura no ajusta un nivel existente, aunque
supere el límite local. Este límite solo restringe nuevas peticiones de BricoHams.

Antes de escribir consulta TX/AC/PC y rechaza TX, sintonía ATU o petición de
movimiento/sintonía ATAS. Después exige una respuesta TX de prefijo distinto
como barrera contra eco tardío del setter y relee PC: cabezal o nivel distintos
son error, no éxito. No inventa un ACK que el protocolo no documenta.
También relee TX/AC, comparte el lock CAT, deduplica 256 IDs recientes, aplica
el presupuesto agregado de tres segundos y no reintenta ni revierte escrituras.
La comprobación RX sigue sin ser un interlock físico atómico.

Esto regula el ajuste de potencia del SPA-1 **a través del FTX-1**, no un
amplificador independiente. Este opt-in no habilita PTT, sintonía ni escrituras
de frecuencia/modo: estas últimas tienen
[flags independientes MAIN/SUB](control-frecuencia-modo.md).
Pruebas serie sintéticas, API y dos saltos HTTPS
verifican software, no una radio ni RF.
