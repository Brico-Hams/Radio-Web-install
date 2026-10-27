# Antenas para satélites: diseños Bricohams y piezas imprimibles

Autores: Anatol Emilio Lopez Maitchovcow EA5KAO, Diego Roca EA5JEF y Pedro
Roca, fundadores y miembros directivos de Bricohams.
Información: <https://bricohams.org> y <https://bricohams.com>.

Sección de antenas de la guía [Iniciación al satélite](INICIACION-SATELITE.md).
Los diseños y las piezas son **propios de Bricohams**: dimensiones calculadas
con un solucionador de método de momentos escrito para este proyecto y piezas
modeladas por código. No reproducen los proyectos de antena de PY4ZBZ ni de
PY5LO incluidos en la guía de PT2VM, cuyo permiso se concedió a ese autor.

> **Estado: diseño simulado, no construido ni medido.** Las cifras proceden de
> simulación en espacio libre. Ninguna antena se ha fabricado ni medido con
> analizador todavía. Corta las varillas 3-5 mm más largas y ajústalas con un
> analizador de antenas (NanoVNA o similar) antes de transmitir.

## Qué antena elegir

| Antena | Uso | Ganancia simulada | Dificultad |
| --- | --- | --- | --- |
| [Yagi bibanda de mano](#yagi-bibanda-de-mano) | Satélites FM con subida y bajada en bandas distintas (SO-50, repetidor ISS, PO-101) | 8,4 dBi VHF / 11,4 dBi UHF | Media |
| [Dipolo en V horizontal 2 m](#dipolo-en-v-horizontal-2-m) | Escucha fija sin seguimiento: SSTV y APRS de la ISS, bajadas VHF | 1,8 dBi en el cénit | Baja |
| Antena original de la radio | Primeras escuchas de la ISS en pases altos | Muy inferior a las anteriores | Ninguna |

Con la antena original se puede oír la ISS en pases altos, pero para trabajar
satélites FM de baja potencia lo habitual es una antena direccional orientada
a mano. Un látigo largo o un contrapeso ayudan algo, pero no sustituyen a la
direccional.

## Yagi bibanda de mano

![Plano acotado de la Yagi bibanda](atlas/sat-antena-yagi.svg)

Dos Yagis comparten un boom no conductor: 3 elementos para 2 m en el plano
horizontal y 5 elementos para 70 cm en el plano vertical, girados 90 grados.
En los planos ortogonales y centrados, la simulación no muestra acoplamiento
apreciable entre bandas: cada Yagi rinde igual con y sin la otra presente.
Una desalineación real de los elementos sí introduce algo de acoplamiento.

### Dimensiones

Cotas en mm, medidas desde el reflector VHF (x = 0). Las longitudes son de
punta a punta; en los excitados incluyen el hueco central de 16 mm del
bloque impreso, así que cada mitad mide (longitud − 16) / 2.

| Banda | Elemento | Longitud (mm) | Posición x (mm) | Cada mitad (mm) |
| --- | --- | ---: | ---: | ---: |
| VHF | Reflector | 1011 | 0 | — |
| VHF | Excitado | 969 | 532 | 476,5 |
| VHF | Director | 904 | 950 | — |
| UHF | Reflector | 337 | 75 | — |
| UHF | Excitado | 320 | 231 | 152 |
| UHF | Director 1 | 304 | 365 | — |
| UHF | Director 2 | 301 | 572 | — |
| UHF | Director 3 | 294 | 751 | — |

Boom de tubo de PVC de 20 mm, como el tubo eléctrico rígido, de unos 1030 mm.
Las piezas de VHF y UHF quedan separadas al menos 35 mm a lo largo del boom;
el script de diseño lo comprueba.

### Rendimiento simulado

| MHz | Z (Ω) | ROE 50 Ω | Ganancia (dBi) | Delante/detrás (dB) |
| --- | --- | ---: | ---: | ---: |
| 145,8 | 38,0 + j2,6 | 1,32 | 8,43 | 15,0 |
| 145,9 | 37,9 + j3,3 | 1,33 | 8,44 | 15,0 |
| 146,0 | 37,9 + j4,1 | 1,34 | 8,45 | 14,9 |
| 435,0 | 39,1 − j0,7 | 1,28 | 11,32 | 15,2 |
| 436,5 | 38,6 − j0,3 | 1,30 | 11,37 | 15,6 |
| 438,0 | 37,1 + j0,0 | 1,35 | 11,42 | 16,2 |

El diseño prioriza ganancia y relación delante/detrás con una ROE inferior a
1,4 en todo el segmento de satélites, alimentando el excitado directamente
con coaxial de 50 Ω y sin red de adaptación. Una ROE de 1,3-1,35 refleja
alrededor del 2 % de la potencia; es aceptable para una radio portátil.

### Materiales

- Tubo de PVC de 20 mm, 1030 mm.
- Varilla de aluminio de 4 mm, unos 5,5 m en total. También sirve varilla de
  latón; la cinta métrica requiere otro bloque.
- Piezas impresas: 6 pinzas de elemento, 2 bloques de excitado y
  1 empuñadura; ver [piezas STL](#piezas-imprimibles-stl).
- Tornillos M3 x 8 para fijar varillas y piezas y M3 x 10 con terminal de ojal
  para los excitados.
- Dos tramos de coaxial fino de 50 Ω, como RG-316 o RG-58, con choke
  de modo común en cada uno: unas perlas de ferrita junto al bloque o 4-5
  espiras de coaxial de unos 3 cm de diámetro. Comprueba el choke con el
  analizador.
- Un diplexor VHF/UHF para unir ambos excitados en una sola bajada si usas
  una sola radio, como la UV-K5. Con dos radios, cada coaxial va a la suya.

### Montaje

1. Corta las varillas 3-5 mm más largas que la tabla y lima las puntas. Pon
   protectores en las puntas: tubo termorretráctil o tapones. Al girar una
   antena de mano es fácil acercar una punta a la cara.
2. Marca las posiciones x en el boom con cinta. Las pinzas VHF quedan con la
   varilla horizontal y las UHF giradas 90 grados en el boom.
3. Coloca la varilla centrada en cada pinza y apriétala con el tornillo M3 superior.
   Fija la pinza al boom con el M3 inferior.
4. En los bloques de excitado, inserta cada mitad hasta el fondo del orificio.
   El tornillo superior la fija y hace de borne: malla a un lado y vivo al
   otro, con terminal de ojal. Sella las conexiones contra la humedad.
5. Lleva los coaxiales por el boom hacia el reflector con bridas por el
   pasador del bloque y el choke cerca de la alimentación.
6. Monta la empuñadura entre el excitado UHF (231) y el director 1 UHF (365),
   hacia x ≈ 300. Desplázala hasta que la antena quede equilibrada.

### Ajuste con analizador

- Mide la ROE de cada banda por separado, con el otro coaxial cargado con
  50 Ω o conectado al diplexor.
- Si el mínimo cae por debajo del segmento, acorta el excitado lo mismo por
  ambos lados, en pasos de 1-2 mm. Si cae por encima, el excitado está corto:
  sustitúyelo.
- No persigas una ROE 1,0: el excitado directo ronda los 38 Ω por diseño.
  Lo importante es que el mínimo quede centrado en 145,9 y 436,5 MHz.
- Aléjate de mesas metálicas y personas durante la medida. Apunta la antena al
  cielo.

## Dipolo en V horizontal 2 m

![Plano acotado del dipolo en V](atlas/sat-antena-dipolo-v.svg)

Antena fija y sin seguimiento para escuchar la ISS, como SSTV en 145,800 MHz y
APRS en 145,825 MHz, y bajadas VHF. Los brazos en V a 100 grados rellenan
parcialmente los nulos del dipolo recto y acercan la impedancia a 50 Ω.

| Parámetro | Valor |
| --- | --- |
| Ángulo entre brazos | 100 grados |
| Brazo desde el centro | 505 mm |
| Varilla de cada brazo | 497 mm: empieza a 8 mm del eje, dentro del cubo impreso |
| Z simulada 145,8 / 145,9 / 146,0 MHz | 48,7 + j2,0 / 48,9 + j2,6 / 49,0 + j3,3 Ω |
| ROE 50 Ω | 1,05-1,07 |
| Ganancia en el cénit | 1,82 dBi |
| Rizado en acimut a 30 grados de elevación | 5,5 dB |

Móntalo horizontal en un mástil de PVC de 20 mm, con el cubo impreso y
choke de modo común en el coaxial, a unos 0,5-1 m por encima del tejado o
del suelo. La altura sobre el suelo modifica el diagrama real: la simulación
es en espacio libre. Para transmitir en pases bajos es preferible la Yagi.

## Piezas imprimibles STL

![Vista de las piezas imprimibles](atlas/sat-piezas-stl.svg)

| Pieza | Archivo | Cantidad | Función |
| --- | --- | ---: | --- |
| Pinza de elemento | [pinza-elemento.stl](../hardware/antenas/stl/pinza-elemento.stl) | 6 | Sujeta un elemento pasivo de 4 mm sobre el boom de 20 mm |
| Bloque del excitado | [bloque-excitado.stl](../hardware/antenas/stl/bloque-excitado.stl) | 2 | Dos mitades aisladas con hueco de 16 mm, bornes M3 y canal del coaxial |
| Empuñadura | [empunadura.stl](../hardware/antenas/stl/empunadura.stl) | 1 | Asa de 32 mm, hueca y con estrías, sujeta al boom |
| Cubo del dipolo en V | [cubo-dipolo-v.stl](../hardware/antenas/stl/cubo-dipolo-v.stl) | 1 | Brazos a 100 grados, bornes M3 y zócalo para mástil de 20 mm |

Impresión recomendada:

- Material: PETG o ASA. El PLA se deforma al sol.
- Perímetros y relleno: 4 perímetros y 40 % de relleno.
- Altura de capa: 0,2 mm.
- Orientación: anillo del boom horizontal y apoyado sobre la cara plana del
  saliente. El cubo se imprime con el zócalo hacia abajo.

Taladros con holgura:

- Boom: 20,4 mm.
- Varilla: 4,3 mm.
- Rosca directa M3: 2,8 mm.

Si tu impresora cierra los agujeros, cambia las constantes `BOOM`, `ROD` y
`M3_TAP` de `generar_stl.py` y regenera las piezas.

El script comprueba que cada STL sea un sólido cerrado y de una sola pieza.
Los datos de volumen y medidas están en
[piezas.json](../hardware/antenas/piezas.json).

## Método de cálculo y verificación

Archivos en [hardware/antenas](../hardware/antenas/README.md):

| Script | Qué hace |
| --- | --- |
| `mom.py` | Solucionador propio de hilos finos por método de momentos (Harrington): corrientes en nodos, cargas por segmento, núcleo reducido y término estático integrado analíticamente |
| `disenar.py` | Optimiza las dimensiones con Nelder-Mead para máxima ganancia con ROE ≤ 1,3-1,35 y delante/detrás ≥ 15 dB, verifica la combinación bibanda y la separación de piezas, y escribe `resultados.json` |
| `generar_stl.py` | Modela las piezas con manifold3d y escribe los STL y `piezas.json` |
| `vistas.py` | Dibuja los planos acotados y las vistas de las piezas en `docs/atlas` |

Validación del solucionador contra el dipolo λ/2 de referencia:

- Con radio de 10⁻⁵ λ da Z ≈ 78 + j43 Ω, frente a la cifra clásica
  de 73 + j42,5 Ω. La diferencia procede de la alimentación delta-gap.
- Con radio de 10⁻³ λ, el dipolo de 0,475 λ resuena en 71 − j3,5 Ω.
- La directividad es de 2,15 dBi. La ganancia calculada desde la potencia de
  entrada coincide con la integral del diagrama, así que la potencia se conserva.

Error esperado en la frecuencia de resonancia: un pequeño porcentaje. Por eso
se cortan los elementos largos y se ajustan.

Límites del modelo:

- Espacio libre, sin suelo ni cuerpo del operador.
- Conductores perfectos.
- No modela el plástico de las pinzas, que baja ligeramente la resonancia, el
  boom, el coaxial ni el diplexor.
- No es una medida ni un certificado de rendimiento.

Para regenerar desde la carpeta `hardware/antenas`:

```text
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python disenar.py
.venv\Scripts\python generar_stl.py
.venv\Scripts\python vistas.py
```

## Seguridad y legalidad

- Transmitir exige autorización de radioaficionado. Escuchar no.
- Con 5 W y una Yagi de 11 dBi, no apuntes a personas cercanas y mantén
  los elementos alejados de la cara durante la transmisión.
- No uses estas antenas en bandas o satélites no autorizados, por ejemplo
  los satélites militares UHF.
