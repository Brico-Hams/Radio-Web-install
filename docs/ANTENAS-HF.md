# Antenas de hilo HF/VHF: diseñador y analizador

Página **Antenas** de la aplicación. Complementa las [antenas para satélites](ANTENAS-SATELITE.md) y usa el mismo solucionador de método de momentos (`hardware/antenas/mom.py`), portado a JavaScript en `antenna-core.js`. Todo se calcula en el navegador y funciona sin conexión.

## Límites y seguridad

- Es **solo simulación**: conductores perfectos, hilo fino y sin pérdidas óhmicas.
- No hay suelo con pérdidas: la altura sobre el suelo se modela en espacio libre o con un plano de tierra perfecto (imagen) en z = 0.
- Comprueba siempre la antena con un analizador antes de transmitir.
- No transmitas nunca sin una antena o una carga adaptada.
- Los valores de trampas, balun y coaxial son datos que introduce el usuario; no hay base de datos de cables.

## Funciones

| Función | Qué hace | Origen de los números |
| --- | --- | --- |
| Geometría | Vista 2D/3D, tabla editable de hilos y cargas | Datos del usuario |
| Barrido y ajuste | SWR, R, X, carta de Smith y ajuste Nelder-Mead a SWR mínimo | Modelo de momentos |
| Radiación | Cortes en azimut y elevación, diagrama 3D, ganancia en dBi y corrientes | Modelo de momentos |
| Adaptación | Balun 1:1, 1:2, 1:4, 1:6, 1:9, red L y coaxial | Fórmulas de línea y circuito |

## Plantillas y trampas

Hay plantillas de dipolo de media onda, V invertida y dipolo multibanda con trampas (de 2 a 5 bandas y hasta 8 trampas LC en paralelo). Fija C para calcular L, o L para calcular C, con la resonancia `f = 1/(2π√(LC))`. Cada sección parte de c/(4f) sin factores de acortamiento inventados: usa el asesor y el ajuste automático.

## Formato CSV de medida

El archivo del analizador puede traer columnas de frecuencia y SWR, o frecuencia, R y X. Se detectan la cabecera, las unidades Hz, kHz o MHz, el separador (coma, punto y coma o tabulador) y la coma decimal. Ejemplo: `frecuencia;swr`.

## Bandas por radio

La lista de bandas se limita a las que la radio puede transmitir según los datos del repositorio: Icom IC-705 e IC-9700 (planes de bandas de `FREQUENCY_RANGES.md`), OpenGD77 (límites por defecto, no son un plan de bandas ni una autorización), Quansheng y AnyTone. Si una radio no tiene datos de TX en el repositorio se muestra «pendiente de fuente».
