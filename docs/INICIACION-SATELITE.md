# Iniciación al satélite

Autores: Anatol Emilio Lopez Maitchovcow EA5KAO, Diego Roca EA5JEF y Pedro
Roca, fundadores y miembros directivos de Bricohams.
Información: <https://bricohams.org> y <https://bricohams.com>.

Guía de iniciación en español asociada a la imagen de firmware
**BH Satélite** (Bricohams Satélites) para Quansheng UV-K5 V3/K1. La sección
de antenas tiene su propia página: [Antenas para satélites](ANTENAS-SATELITE.md).

## Origen y créditos

Esta guía nace de la lectura de *Radioamadores no Espaço — Guia básico para
operar satélites*, de Carlos Vicente PT2VM, versión 1.1 del 04/09/2025, en
portugués. Su autor permite la distribución gratuita sin fines de lucro, pero
no autoriza expresamente traducciones ni obras derivadas. Además, incluye
diseños de antena de PY4ZBZ y PY5LO cuyo permiso se concedió a PT2VM.

Por eso este documento **no es una traducción literal ni reproduce sus
imágenes**. Sigue un recorrido temático similar, con texto, esquemas y
antenas propios de Bricohams, adaptados a España y a la UV-K5 con BH Satélite.
Recomendamos leer el original de PT2VM.

Si su autor autoriza la traducción, la publicaremos aparte con su atribución.

## Contenido

1. [Qué es un satélite de radioaficionado](#qué-es-un-satélite-de-radioaficionado)
2. [Quién puede escuchar y quién puede transmitir](#quién-puede-escuchar-y-quién-puede-transmitir)
3. [Conceptos del pase](#conceptos-del-pase)
4. [Hora UTC, localizador y coordenadas](#hora-utc-localizador-y-coordenadas)
5. [Predecir pases y saber si el satélite está activo](#predecir-pases-y-saber-si-el-satélite-está-activo)
6. [Efecto Doppler](#efecto-doppler)
7. [Satélites FM para empezar](#satélites-fm-para-empezar)
8. [Equipo de la estación](#equipo-de-la-estación)
9. [Operar con BH Satélite en la UV-K5](#operar-con-bh-satélite-en-la-uv-k5)
10. [Cómo hacer un QSO por satélite](#cómo-hacer-un-qso-por-satélite)
11. [Registrar y confirmar contactos](#registrar-y-confirmar-contactos)
12. [SSTV y APRS desde la ISS](#sstv-y-aprs-desde-la-iss)
13. [Lista de comprobación del pase](#lista-de-comprobación-del-pase)
14. [Glosario](#glosario)
15. [Referencias](#referencias)

## Qué es un satélite de radioaficionado

Un satélite de radioaficionado es una estación de radio en órbita que
recibe en una frecuencia, la **subida** o *uplink*, y retransmite en otra,
la **bajada** o *downlink*. Muchos se identifican como OSCAR, siglas de
*Orbiting Satellite Carrying Amateur Radio*, con un número de serie, como
SO-50 o AO-7.

Por lo que hacen, se distinguen tres tipos principales:

- **Repetidores FM.** Funcionan como un repetidor de montaña, pero a cientos
  de kilómetros de altura. Solo cabe un QSO a la vez y son el mejor punto de
  partida con un portátil.
- **Transpondedores lineales.** Retransmiten un tramo de banda completo, de
  decenas de kHz, y admiten muchos QSO simultáneos en SSB o CW. Suelen
  requerir equipos full dúplex y SSB en transmisión.
- **Digitales y balizas.** Incluyen APRS, telemetría y SSTV. Muchos se
  pueden recibir con equipo sencillo.

Casi todos los satélites que usaremos están en **órbita baja (LEO)**, entre
400 y 1000 km. Dan una vuelta a la Tierra en unos 90-100 minutos y cada pase
sobre nuestra estación dura entre 5 y 15 minutos. La Estación Espacial
Internacional (ISS), a unos 400 km, es el satélite tripulado más conocido
para los radioaficionados.

## Quién puede escuchar y quién puede transmitir

- **Escuchar** satélites de radioaficionado está al alcance de cualquiera con
  un receptor adecuado.
- **Transmitir** exige una autorización de radioaficionado en vigor.
  Opera dentro de las bandas, modos y potencias que permite el reglamento
  vigente publicado en el BOE.
- Los segmentos para satélites en la Región 1 de la IARU son
  **145,800-146,000 MHz** y **435,000-438,000 MHz**. No transmitas ahí
  conversaciones terrestres.
- Los **satélites militares UHF**, como FleetSatCom o UHF Follow-On, no son
  de radioaficionado. Usarlos es ilegal y está perseguido. La UV-K5 no debe
  emplearse para ello.

## Conceptos del pase

![Geometría de un pase de satélite](atlas/sat-pase-orbital.svg)

| Término | Significado |
| --- | --- |
| AOS | *Acquisition of Signal*: el satélite aparece por el horizonte |
| TCA | *Time of Closest Approach*: máxima elevación y mínima distancia |
| LOS | *Loss of Signal*: el satélite desaparece por el horizonte |
| Acimut | Dirección horizontal en grados: 0 norte, 90 este, 180 sur, 270 oeste |
| Elevación | Ángulo sobre el horizonte, de 0 a 90 grados |
| Huella | Zona de la Tierra que ve el satélite en un momento dado |
| TLE / Keps | Parámetros orbitales que usan los programas para calcular pases |

Dos estaciones pueden comunicar si ambas están dentro de la huella al mismo
tiempo. Con un satélite LEO, el alcance típico llega a unos 4000-5000 km.
Desde España se puede contactar con buena parte de Europa y el norte de África.

Los pases con elevación máxima inferior a 15-20 grados son cortos y
débiles, y los edificios o montes los tapan. Para empezar, elige pases de
más de 30 grados.

## Hora UTC, localizador y coordenadas

- **UTC.** Las predicciones, los anuncios de actividad y los registros usan
  hora UTC. En España peninsular, UTC es la hora local menos 1 h en invierno
  y menos 2 h en verano.
- **Localizador Maidenhead.** Es un código de cuatro caracteres, como IM97 en
  la zona de Murcia, que identifica tu cuadrícula. En los QSO por satélite se
  intercambia el indicativo y la cuadrícula; muchos diplomas cuentan
  cuadrículas.
- **Coordenadas.** Configura latitud, longitud y altitud con precisión en el
  predictor. Unos kilómetros de error pueden desplazar el pase decenas de
  segundos.

## Predecir pases y saber si el satélite está activo

Los programas de predicción usan los TLE, que se publican y actualizan
continuamente. Usa siempre TLE de los últimos días.

| Herramienta | Plataforma | Notas |
| --- | --- | --- |
| App Android Bricohams | Android | SGP4 propio y CAT RX hacia BH Satélite; ver [Android](ANDROID.md) |
| Gpredict | Windows, Linux y macOS | Libre, con control de rotor y de radio |
| Orbitron | Windows | Gratuito y clásico, con predicción y Doppler |
| ISS Detector | Android | Sencillo; los satélites de radioaficionado requieren extensión |
| Heavens-Above / N2YO | Web | Pases visibles e ISS |
| AMSAT Pass Predictions | Web | Pases de satélites de radioaficionado |

Que un satélite esté en órbita no significa que su transpondedor funcione.
Antes del pase:

- Consulta la página de estado de AMSAT, donde los operadores informan de lo
  que oyen.
- Revisa los anuncios del satélite: algunos se activan solo por horario o
  sobre ciertas regiones.
- Comprueba en SatNOGS las grabaciones recientes de estaciones automáticas.

## Efecto Doppler

![Desplazamiento Doppler durante un pase](atlas/sat-doppler.svg)

Un satélite LEO se mueve a unos 7,5 km/s. Mientras se acerca, oímos su señal
por encima de la frecuencia nominal; mientras se aleja, por debajo. El
desplazamiento vale aproximadamente:

```text
desplazamiento = frecuencia x velocidad radial / velocidad de la luz
```

| Banda | Frecuencia | Doppler máximo aproximado con 7 km/s |
| --- | --- | --- |
| 2 m | 145,8 MHz | ± 3,4 kHz |
| 70 cm | 436,8 MHz | ± 10,2 kHz |

Consecuencias prácticas:

- En FM, la bajada de 70 cm se sale del filtro si no se corrige. La de 2 m se
  suele tolerar sin corrección.
- Corrige sobre todo la frecuencia más alta. En los satélites FM, se suele
  ajustar la bajada UHF en pasos de 5 kHz.
- El cambio es más rápido alrededor del TCA, sobre todo en pases altos.
- Con memorias escalonadas, se pasa de la más alta a la más baja según
  avanza el pase. Con BH Satélite también puedes corregir en recepción de forma
  manual o por CAT; ver más abajo.

## Satélites FM para empezar

> Las frecuencias y el estado de los satélites cambian. Consulta AMSAT antes
> de programar y no transmitas a un satélite inactivo o en modo de prueba.

| Satélite | Subida (TX) | Bajada (RX) | Tono | Notas |
| --- | --- | --- | --- | --- |
| SO-50 | 145,850 MHz | 436,795 MHz | 67,0 Hz | 74,4 Hz arma su temporizador; muy concurrido |
| ISS, repetidor cruzado | 145,990 MHz | 437,800 MHz | 67,0 Hz | Activo de forma intermitente |
| ISS, voz ARISS en Región 1 | 145,200 MHz | 145,800 MHz | — | Contactos con escuelas: solo escuchar |
| ISS, APRS | 145,825 MHz | 145,825 MHz | — | Digirrepetidor packet a 1200 bps |
| PO-101 | 437,500 MHz | 145,900 MHz | 141,3 Hz | Activaciones programadas |

![Plan de memorias escalonadas, ejemplo SO-50](atlas/sat-memorias-fm.svg)

## Equipo de la estación

![Estación portátil con BH Satélite](atlas/sat-estacion-bh.svg)

- **Radio.** La UV-K5 es semidúplex: no recibe mientras transmite, así que
  no puedes oír tu propio eco en el satélite. Con dos radios, una para
  transmitir y otra para recibir, oirás tu propia señal en tiempo real. Es la
  mejor forma de saber si llegas.
- **Antena.** Es la parte más importante. Consulta
  [Antenas para satélites](ANTENAS-SATELITE.md): una Yagi bibanda de mano
  con plano acotado y piezas STL imprimibles, más un dipolo en V fijo para
  escuchar la ISS.
- **Polarización.** La señal del satélite gira durante el pase. Si se
  desvanece, gira la Yagi de mano sobre su eje para recuperarla.
- **Auriculares y grabación.** El ruido ambiente tapa las señales débiles.
  Grabar el pase permite revisar indicativos después.
- **Potencia.** Con una Yagi, 2-5 W bastan para los satélites FM. Más
  potencia no compensa una antena mal apuntada y perjudica a otros usuarios.

## Operar con BH Satélite en la UV-K5

BH Satélite es la imagen Beta del firmware Bricohams con el perfil
Satélites. Detalles técnicos, límites y protocolo:
[Firmware Bricohams](BRICOHAMS-FIRMWARE.md).

> **Experimental.** Las funciones Doppler, CAT RX y CAT TX tienen pruebas de
> software con primitivas RF simuladas. **No se han validado todavía en la
> radio ni con medida RF.** Prueba primero en recepción.

1. **Slot correcto.** En las radios multiarranque, cada slot tiene su propio
   banco de canales. Programa las memorias de satélite **solo en el slot de
   BH Satélite**. Antes, haz una copia completa con
   [Quansheng](AYUDA-QUANSHENG.md).
2. **Memorias.** Crea una memoria con RX igual a la bajada nominal y TX igual
   a la subida, con su tono. También puedes usar el plan de 5 memorias
   escalonadas.
3. **SAT RX.** Selecciona la memoria y entra en el modo Fox Hunt/SAT. La
   pantalla muestra `SAT RX` y toma como nominales la RX y la TX del canal.
4. **Doppler manual.** Las teclas 4 y 6 restan o suman 500 m/s de velocidad
   radial, y la tecla 5 vuelve a cero. Al principio del pase, el satélite se
   acerca, así que usa velocidades negativas para recibir más arriba.
5. **CAT RX desde Android.** Pulsa 8 en la radio para mostrar `CAT READY RX`.
   La app Bricohams calcula el pase con SGP4 y envía la frecuencia RX
   corregida. Cada orden caduca a los 3 s si no se renueva. Las teclas 4, 5 y
   6 devuelven el control al modo manual.
6. **Transmitir.** La subida usa la TX nominal del canal: BH Satélite **no
   corrige el Doppler en transmisión**. La PTT CAT para SSTV exige armado
   local con la tecla 9, un lease de 1500 ms y un límite de 120 s.
7. **Salir.** EXIT restaura la configuración RF del VFO.

La UV-K5 también puede **escuchar** transpondedores lineales en SSB con los
firmwares F4HWN. Para transmitir por ellos hacen falta SSB en TX y full
dúplex, que la UV-K5 no ofrece. OpenGD77, en las radios compatibles,
incluye su propio modo satélite: [OpenGD77](AYUDA-OPENGD77.md).

## Cómo hacer un QSO por satélite

1. **Escucha primero.** Escucha uno o dos pases completos antes de transmitir
   para conocer el ritmo y los indicativos habituales.
2. **Breve y claro.** Un QSO típico es el intercambio de indicativos y
   cuadrículas, por ejemplo: «EA5XXX, IM97». Confirma el otro con un
   «QSL, 73».
3. **Una sola transmisión a la vez.** En un repetidor FM, si dos estaciones
   transmiten a la vez, no se oye ninguna. Espera un hueco y no llames
   continuamente.
4. **No acapares.** Un pase dura unos minutos y lo comparten muchas
   estaciones. Un contacto por pase es una buena norma en satélites
   concurridos.
5. **Comprueba si llegas.** Con dos radios, escucha tu propia bajada. Si no
   te oyes, revisa el apuntamiento, la memoria Doppler y el tono antes de
   volver a llamar.

Códigos y expresiones habituales:

| Expresión | Significado |
| --- | --- |
| QRZ | ¿Quién me llama? |
| QSL | Recibido o confirmado |
| QTH / grid | Ubicación o cuadrícula |
| 73 | Saludos |
| QRT | Dejo de transmitir |
| Rover | Estación que viaja para activar cuadrículas raras |

## Registrar y confirmar contactos

- Anota la fecha y hora **UTC**, el indicativo, la cuadrícula del corresponsal,
  el satélite y el modo.
- En ADIF usa `PROP_MODE` = `SAT` y `SAT_NAME`, por ejemplo `SO-50`.
  El libro de guardia de la app Android exporta ADIF.
- Sube tus contactos a LoTW o eQSL para confirmarlos. El diploma VUCC por
  satélite de la ARRL requiere 100 cuadrículas confirmadas.

## SSTV y APRS desde la ISS

- **SSTV.** En eventos anunciados por ARISS, la ISS transmite imágenes en FM
  en 145,800 MHz, normalmente en PD120 o Robot36. Basta con el dipolo en V o
  una Yagi y un decodificador. La app Bricohams decodifica Robot36 desde WAV.
- **APRS.** El digirrepetidor de la ISS en 145,825 MHz retransmite tramas
  packet. Enviar tramas requiere licencia y un TNC o una app compatible.
- **Escucha de voz.** Durante los contactos ARISS con escuelas, solo se
  escucha la bajada en 145,800 MHz. No transmitas en la subida.

## Lista de comprobación del pase

1. Actualiza los TLE y comprueba la hora UTC del pase, su elevación máxima y
   las direcciones de AOS y LOS.
2. Confirma en AMSAT que el satélite está activo.
3. Comprueba que la radio arranca en el slot BH Satélite y que la memoria
   tiene la RX, TX y tono correctos.
4. Revisa la antena, el coaxial, el diplexor, los auriculares y la grabadora.
5. Antes del AOS, apunta al horizonte por donde aparecerá el satélite.
6. Durante el pase, sigue al satélite, gira la antena para la polarización y
   corrige el Doppler.
7. Después del pase, registra los contactos en UTC y revisa la grabación.

## Glosario

| Término | Definición |
| --- | --- |
| Uplink / subida | Frecuencia a la que transmitimos hacia el satélite |
| Downlink / bajada | Frecuencia en la que el satélite retransmite |
| Transpondedor | Equipo del satélite que convierte la subida en bajada |
| Semidúplex | No se recibe mientras se transmite |
| Full dúplex | Se recibe y transmite a la vez; permite oír el propio eco |
| CTCSS | Tono subaudible que abre el repetidor del satélite |
| SGP4 | Modelo de propagación orbital que se usa con los TLE |
| CAT | Control de la radio desde un ordenador o un móvil |

## Referencias

- Carlos Vicente PT2VM, *Radioamadores no Espaço — Guia básico para operar
  satélites*, v1.1, 04/09/2025. Inspiró el recorrido temático; no se reproduce.
- AMSAT: <https://www.amsat.org>. Estado de satélites, frecuencias y
  predicciones.
- ARISS: <https://www.ariss.org>. Radioaficionados a bordo de la ISS.
- CelesTrak: <https://celestrak.org>. Parámetros orbitales TLE.
- SatNOGS: <https://satnogs.org>. Red abierta de estaciones terrenas.
- Bricohams: [Antenas para satélites](ANTENAS-SATELITE.md),
  [Firmware Bricohams](BRICOHAMS-FIRMWARE.md), [Android](ANDROID.md) y
  [Quansheng](AYUDA-QUANSHENG.md).
