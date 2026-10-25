# ARDF Quansheng: ayuda de recepcion y configuracion

Revision: 25-10-2026. Evidencia principal: `ARDFv05/ARDF.md` y repositorio
reald V3/UV-K1. Es un resumen original de configuracion, no copia del manual.
Los nombres y rangos siguientes corresponden al documento inspeccionado;
no se atribuyen sin revision a v0.2/v0.4 o a ramas V1/V2.

## Hardware, versiones y limites

| Familia | Fuente correspondiente | Relacion con esta web |
| --- | --- | --- |
| V1 DP32 | reald/uv-k5-firmware-custom | No se instala con el conector PY32 |
| V2 | Proyecto DL9CAT V2 enlazado por reald | Fuera del catalogo/conector |
| V3 / UV-K1 PY32 | reald/uv-k1-k5v3-firmware-custom | Publicaciones estables reconocidas para descarga |

El catalogo reconoce tags `ARDF-K5v3_K1-vX.Y[.Z]` de la fuente V3, no
archivos arbitrarios por contener «ARDF» en el nombre. En esta web siguen
siendo **solo descarga**, incluso con vectores PY32: no hay validacion de slots
ARDF habilitada. La carpeta ARDFv05 contiene fuentes y archivos heredados;
no convierte cada binario de su archive en una compilacion ARDF actual.

El upstream documenta TX desactivado en sus publicaciones ARDF oficiales.
No lo presupongas para una compilacion ajena: comprueba `ENABLE_PREVENT_TX`
y version. El firmware de direccion no convierte la radio en receptor de
80 metros; el documento indica limite inferior del chip de aproximadamente
18 MHz, por lo que no sirve para ARDF de 3.5 MHz.

## Modos y ajustes

| Ajuste | Que controla | Eleccion y comprobacion |
| --- | --- | --- |
| ARDF=OFF | Operacion fuera de la pantalla/modo ARDF | No demuestra que TX este compilado ni permitido |
| ARDF=DF Simple | Radiogoniometria simple con ganancia manual | Para buscar sin ciclos; no requiere corregir reloj de ciclos |
| ARDF=ARDF | Ciclos y presentacion de zorros | Configurar sincronizacion con el evento real |
| Mode=AM | Demodulacion de señales AM de la actividad | Coincidir con la señal real; no habilita TX AM |
| Step | Paso de sintonia | El manual propone 1 kHz; evita que redondee la frecuencia deseada |
| Sql | Squelch | El manual propone 0 para escuchar continuamente; ajustar volumen con cuidado |
| RxMode | Escucha de VFO | MAIN ONLY evita alternancia y parpadeo de historial de ganancia |
| Ganancia manual | Sensibilidad/atenuacion por indice | Menor indice reduce sensibilidad; bajar al acercarse a señal intensa |
| NumFox | Numero de emisores en ciclo | Documento: 1-10; 0 desactiva temporizacion; default 5 |
| FoxDur | Duracion de cada turno | Documento: default 60 s, rango 1.00-999.99 s; verificar unidades de entrada del build |
| EndSig | Aviso previo al fin de turno | 0 desactiva; documento 1-30 s. Bajar volumen antes de auriculares |
| GainRe | Recordar ganancia por zorro/VFO | OFF, VFO A, VFO B o BOTH segun documento |
| RSS100 | Referencia para estimar distancia | Cero desactiva; no es calibracion RF de toda la radio |
| ClkCor | Correccion del temporizador interno | Solo tras medir deriva, no copiar el valor de otra unidad |
| SetNav | Orientacion de teclas K1/K5 | Corregir si UP/DOWN parecen invertidos |
| ChSave | Persistir configuracion de memoria | Necesario si se trabaja en MR; VFO y MR no son lo mismo |

Los cambios por indice de ganancia se describen como aproximadamente 5 dB;
no son un atenuador certificado. Una señal muy cercana puede saturar pese a
reducir ganancia. Antena, polarizacion, orientacion y entorno importan.

## Puesta en marcha solo recepcion

1. Identificar hardware y firmware ARDF exactos; guardar configuracion original.
2. Conectar antena y situar volumen bajo; subir gradualmente, especialmente
   con auriculares.
3. Elegir DF Simple para comprobar recepcion sin reloj.
4. Seleccionar modulacion, paso y frecuencia de la señal autorizada del evento.
5. Usar MAIN ONLY; comprobar que estas en VFO si introduces una frecuencia.
6. Ajustar ganancia y orientacion sin confundir maximo de ruido con señal util.
7. Para competicion temporizada, configurar NumFox/FoxDur y sincronizar al ciclo
   real siguiendo la pantalla/guia de la version instalada.
8. Guardar si procede; comprobar al volver a cargar VFO/memoria.

No se recomiendan secuencias universales de sincronizacion: las teclas y modos
pueden cambiar entre versiones. No emitir una señal de prueba fuera de permiso.

## Recordatorio de ganancia

GainRe mantiene valores por zorro al comienzo de su turno. Una configuracion
util es VFO A para frecuencia de los zorros con memoria de ganancia, VFO B
para baliza continua sin ella. Si NumFox=0 o GainRe no incluye el VFO activo,
no esperar una tabla de historial por zorro. El documento advierte que la
tabla visible puede tener limites distintos del maximo NumFox: no inferir
10 historiales por mostrar 10 turnos.

## Distancia: una estimacion, no navegacion

La prediccion se basa en un modelo aproximado de propagacion y una referencia
RSS100 del conjunto emisor-antena-receptor. Terreno, potencia, altura y
obstaculos cambian el resultado; no confiar en el numero como distancia real.
El manual describe tomar referencia a 100 m del emisor del evento, con señal
estable y orientacion conocida. Cero desactiva la funcion. No sustituye
cartografia, seguridad personal ni instrucciones del organizador.

## Correccion de reloj

El manual describe deriva del resonador interno. Para el caso concreto de medir
cuantos segundos reales transcurren cuando el equipo indica una hora:

```text
correccion = 6000 - (segundos_reales * 100 / 60)
```

El documento da rango -500 a 500 para ClkCor. Esta formula solo aplica al
procedimiento de esa version, no a cualquier menu de reloj de otra radio.
No es una correccion del oscilador RF ni requiere modificar calibracion RF.
Tras cambiarla, repetir una medida y revisar sincronizacion.

## Diferencias historicas verificables

- El documento indica que antes de v0.4 SetNav se encontraba en menu oculto;
  no asumir la misma ubicacion en todas las versiones.
- Para saber que cambia entre v0.2, v0.4, v0.5 y v0.5.1, consultar cada release;
  una etiqueta mas reciente no demuestra por si sola compatibilidad de datos.
- Usa el modulo CHIRP que acompaña la release. El driver UV-K5 estandar no
  representa necesariamente sus ajustes ARDF.
- No extrapolar V1/V2 al flasheo V3. El manual advierte que k5prog/k5prog_win
  V1 no son las herramientas adecuadas para V3.

## Diagnostico

| Problema | Comprobacion no destructiva |
| --- | --- |
| Solo entran tres digitos | Puede estar en memoria, no VFO |
| Cambia la frecuencia introducida | Revisar Step/raster y limites de banda |
| Historial de ganancia parpadea | Desactivar doble escucha |
| No aparece tabla de zorros | Revisar NumFox y GainRe para el VFO activo |
| CHIRP muestra otros ajustes | Guardar memoria y verificar modulo/version |
| Flechas invertidas | SetNav, no cambiar de firmware por parecido exterior |
| Error Header short read | Cerrar programas, cable/puerto de datos, modo y firmware; no borrar memoria |
| Distancia incoherente | Referencia RSS100, antena, potencia y terreno; no recalibrar RF a ciegas |

## Fuentes

- [Proyecto ARDF V3 y UV-K1](https://github.com/reald/uv-k1-k5v3-firmware-custom).
- [Manual ARDF del proyecto](https://github.com/reald/uv-k1-k5v3-firmware-custom/blob/main/ARDF.md).
- [Publicaciones ARDF V3](https://github.com/reald/uv-k1-k5v3-firmware-custom/releases).
- [Proyecto ARDF V1](https://github.com/reald/uv-k5-firmware-custom).
- [Configuracion comun](AYUDA-CONFIGURACION.md).

La rama remota puede evolucionar. Para repetir la configuracion registra la
version exacta del manual, firmware y driver junto con tu copia.
