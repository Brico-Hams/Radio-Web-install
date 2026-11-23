# Diagnóstico: sintonía ATAS-120 del FTX-1 por CAT a 28,450 MHz (tune-28)

Estado: **causa NO demostrada**. Ninguna fuente del repo prueba una secuencia CAT
distinta de `AC123;` / `AC120;`, así que **no se cambia ningún comportamiento**
(ni catálogo, ni agente, ni menús del radio). Este documento solo analiza y
propone un banco de pruebas. Nada de lo descrito aquí se ha transmitido.

## 1. Hechos medidos (aportados por el mantenedor)

- 28,450 MHz USB: TUNE del panel llega a ROE baja; CAT `AC123;` no, en tres
  ejecuciones (agente+Hamlib con tope 30 s y 45 s; serie directa, 1 lectura/s).
- En las ejecuciones CAT: RM6 raw 255, bajadas breves (121, 148, 132, 144) y
  vuelta a 255: el mástil pasa por el mejor punto y no se detiene hasta el tope.
- 50,2161 MHz: el mismo `AC123;` terminó solo en ~10 s con ROE raw 3.
- En panel y CAT: TX2, MD07, PC2005, AC100 sin cambios; `RI0` = `RI01010100`
  mientras busca. Panel bueno a 50,003723: `RI01010100` → `RI00010100` → TX0,
  RM6 255, 189, 105, 7 en los últimos 2 s.
- Menús: EX030701=3 (ANT1 ATAS), EX030702=0, EX030704=0 (ANT1),
  EX030104=0 (TUNER SELECT = INT). AC previo: AC100.
- PC antes de CAT: PC2010; el panel partió de PC2100.

## 2. Qué dice cada fuente sobre arrancar una sintonía ATAS

| Fuente (ruta exacta) | Inicio | Parada | Prerrequisitos / notas |
|---|---|---|---|
| `third_party/ftx1/evertonma-FTX-1CAT_PR2EM/docs/manuals/FTX-1_CAT_OM_ENG_2507-B.md` l.366-383 | `AC P1 P2 P3;` con P2=2 (ATAS), P3=3 «Tuning Start» | P3=0 «Tuning Stop» | P3=1/2 = frecuencia arriba/abajo (50 ms). No declara `AC121` ni TUNER SELECT como prerrequisito. P2 impreso: 0 externo, 1 «-», 2 ATAS. l.917: `EX030104` TUNER SELECT 0 INT/1 INT(FAST)/2 EXT/3 ATAS; l.1008-1011: `EX030701/02` TUNER TYPE SEL, `EX030704` HF ANT SELECT. l.1993-1996: `RI` (P4 TX, P6 sintonizador sintonizando). |
| `.../FTX-1_OM_ENG_EH084M201_2506E-DS.md` l.3892, 3987-3988, 4187-4276 | Pulsar [TUNE] | Automática al hallar el óptimo (el icono ATAS deja de parpadear y vuelve a RX) | Con cabezal Field: menú GENERAL → TUNER SELECT = «ATAS»; con optima: OPTION → TUNER TYPE SEL ANT1/ANT2 = «ATAS». Primera vez o tras reset: ~1 min sin sintonizar hasta que reconoce el ATAS. Puede no lograrse ROE baja según la instalación. Sintonía manual: PTT + UP/DWN. |
| `third_party/ftx1/captobie-ftx1-remote/ftx1-cat-manual-errata.md` fila 13 (l.36) | — | — | TUNER SELECT (03-01-04) lista 4 valores en el CAT, pero el manual de operación solo `OPTION / ATAS`; puede ser otro ítem. Confianza media; sugiere comparar 03-01-04 y 03-07-01. |
| `.../captobie-ftx1-remote/Sources/FTX1Core/Commands/CommandQueue.swift` l.193-213 | `AC103` (sin respuesta) | — | Solo sintonizador interno; nunca usa `AC12x`. Sin evidencia ATAS. |
| `third_party/ftx1/git-jcw-FTX-1-WebUI/docs/FTX1-CAT-NOTES.md` l.101-135 y `js/cat/ftx1.js` l.44-71, 241 | ATAS: solo `AC123;` | `AC120;` | Lee `EX030704;`, `EX030701;`/`EX030702;` antes. Un ATAS rechaza `AC000;`. `AC;` P3≠0 no indica fin de forma fiable; FTX Deck termina con `AC;` P3=0, con portadora que aparece y desaparece en RM5 o sin portadora en 3 s (todo marcado «verify»). |
| `docs/FTX1-KNOWLEDGE.md` l.59, 131, 875-913, 1040 | `AC123;` | `AC120;` | «P1=0 no hace nada en Optima, P1=1 funciona» (verificado). Indexado de `RI` ambiguo entre PR2EM y manual CAT. El arranque del sintonizador está fuera de alcance del proyecto original (activa el TX). |

Resumen: todas las fuentes coinciden en `AC123;`/`AC120;`. Ninguna exige `AC121`,
`AC122`, una lectura previa, ni un valor concreto de TUNER SELECT para CAT.
`AC121/AC122` son pasos manuales de 50 ms, no un arranque.

### 2b. Fuentes de referencia (Hamlib, wfview, wfweb), leídas solo como hechos

Rutas bajo `data/third-party/refs/` (gitignorado, no se versiona ni se copia código).

| Fuente | Hallazgo |
|---|---|
| `Hamlib/rigs/yaesu/ftx1/ftx1_tx.c` l.184-197 | `AC P1 P2 P3`; «AC103/AC123 inician sintonía, AC000/AC120 paran, AC121/AC122 empujan el motor ATAS» (comentario «hardware-verified», FTX-1 + ATAS-120A). Un `AC000` se rechaza con `?` si el sintonizador es ATAS. |
| `.../ftx1_vfo.c` l.327-358 (`RIG_OP_TUNE`) | Con tipo efectivo ATAS envía **solo** `AC123;`; si no, `AC103;`. No escribe antes `AC121`, ni `PC`, ni menús, ni pone TX1. «El tipo debe estar ya seleccionado»; solo se inicia el ciclo. |
| `.../ftx1_tx.c` l.207-231 (`ftx1_set_tuner(0)`), l.295-316 (`ftx1_atas_ctrl`) | Parada ATAS = `AC120;` (no `AC000;`). Mismo par que nuestro catálogo. |
| `.../ftx1_tx.c` l.247-262 (`ftx1_get_tuner`) | Con ATAS **no consulta nada**: devuelve «activo» siempre. Hamlib no sondea el fin de la sintonía ATAS; no hay criterio de parada descrito. |
| `.../ftx1_ext.c` l.285-347 (`ftx1_get_effective_tuner_type`) | Tipo efectivo = EX030701/02 de la antena activa (EX030704), salvo cabezal Field sin SPA-1, que usa EX030104. `ftx1_readme.txt` l.18-24: `PC2xxx` = SPA-1/Optima, `PC1xxx` = Field. Con `PC2010` en este radio el camino de Hamlib es EX030701=3 → ATAS → `AC123;`, igual que el nuestro. |
| `.../ftx1_ext.c` l.15-19, 255-273; `ftx1_menu.c` l.190 | Hamlib da EX030104 = 0 Option / 1 ATAS («hardware-verified»), distinto del manual CAT (0 INT/1 INT FAST/2 EXT/3 ATAS; l.917). Discrepancia entre fuentes; solo afecta a Field sin SPA-1, que no es este caso. |
| `Hamlib/rigs/yaesu/newcat.c` l.6393-6404, 7563-7573 | Otros Yaesu (no FTX-1): `AC00x` / `RIG_OP_TUNE` = `AC002;` (`AC003;` FT-710). Sin ATAS; no aplicable al FTX-1 (no se mueven comandos entre modelos). |
| `wfview/src/radio/yaesucommander.cpp` l.814-830, 1275-1317, 1946-1964 | Solo lee/escribe `AC00x`/`AC01x`/`AC02x`; los valores 020/023 (ATAS) están marcados «unconfirmed» y no hay envío de arranque ATAS. |
| `wfweb/src/radio/yaesucommander.cpp` l.835-852 | Misma lectura `AC`; sin arranque ATAS ni parada. `wfweb/CLAUDE.md` l.984-998: TUNE = `setTuner 2` genérico. |

Diferencias frente a `remote-agent.cjs` (ninguna con fuente que pruebe que cambie el resultado):

1. Arranque: idéntico (`AC123;` único; parada `AC120;` + `TX0;` en `stopSequence`,
   `rigctld-client.cjs` l.473-495). No hay `AC121`, ni reenvío de `AC123`.
2. Tráfico durante la sintonía: nuestro agente consulta `TX`/`RI0` cada 300 ms y
   medidores `RM4-RM8` (`pollTxMeters`); Hamlib/wfview/wfweb no sondean. Débil como
   causa: la prueba con serie directa y 1 lectura/s también falló.
3. Puerta de potencia: el agente exige ≤ `TUNE_POWER_MAX_W` y lee `PC` antes de
   `AC123;`. Hamlib no lo hace. Es lo único que pudo dejar PC2010 vs PC2100
   (hipótesis 1); sigue sin fuente que ligue ATAS y potencia.
4. Ninguna fuente documenta un criterio de parada, memoria por banda ni tiempo de
   reconocimiento distinto a 28 MHz: el comportamiento depende del firmware.

Código actual: `data/remote-station-catalog.json` (`cat.tuner.atas` = `AC123`/`AC120`),
`remote-agent.cjs` `startCatTune` (puerta de potencia ≤ `TUNE_POWER_MAX_W`, tope 45 s
ATAS, el disparo por ROE alta se ignora mientras el motor busca, fin cuando
`RI0` muestra tuning=0 y TX=0), `drivers/ftx1_cat.py` `parse_tuner_reply`.

## 3. Hipótesis ordenadas

1. **Potencia: PC2010 (CAT) vs PC2100 (panel).** A favor: es la única diferencia
   de ajuste medida entre ambos arranques; el ATAS mide ROE con la potencia directa y
   10 W podrían dar lecturas inestables a 28 MHz (RM6 vuelve a 255). En contra: a
   50,2161 MHz el CAT con PC2010 sí terminó; ninguna fuente liga el ATAS a un nivel de
   potencia. Sin fuente → no se actúa.
2. **Posición inicial / memoria del mástil por banda.** A favor: a 50 MHz converge en
   ~10 s; a 28 MHz la búsqueda pasa por el mínimo y no se detiene (RM6 121-148) lo que
   apunta a criterio de parada del ATAS, no a sintaxis. En contra: ninguna fuente
   describe memoria o punto de partida; el panel parte del mismo estado.
3. **Criterio de parada del radio sensible a la ROE/ruido en 28 MHz (instalación).**
   A favor: el manual dice que puede no lograrse ROE baja según la instalación; el
   mínimo alcanzado (RM6≈121-148) queda por encima del que logra el panel (7).
   En contra: el panel sí sintoniza en la misma antena y frecuencia.
4. **El panel usa un camino interno distinto de `AC123;`.** A favor: mismo estado
   observable (`RI01010100`) pero distinto resultado. En contra: ninguna fuente
   documenta otro camino CAT; no se puede inventar uno.
5. **Combinación de menús (EX030104=0 «INT» vs EX030701=3 «ATAS»).** A favor: la
   fe de erratas (fila 13) sugiere que 03-01-04 podría ser otro ítem; el manual de
   operación dice que con Field se usa TUNER SELECT=ATAS. En contra: el panel funciona
   con esos mismos menús y `AC123;` sí sintoniza a 50 MHz. Nunca se cambia solo.
6. **Estado previo `AC100` (P1=1, P2=0) en vez de ATAS.** A favor: la Optima solo
   respondió a P1=1 en las pruebas; AC previo no es de ATAS. En contra: a 50 MHz el
   mismo inicio funciona; `AC023;`/`AC120;` previo no figuran en ninguna fuente
   (pendiente de fuente, deshabilitado).
7. **Falta de reconocimiento del ATAS (≈1 min tras reset/primer uso).** A favor:
   manual de operación. En contra: el ATAS ya sintonizó en 50 MHz y en el panel.
8. **Sintaxis/protocolo (`AC123;` mal formado).** En contra fuerte: coincide con
   todas las fuentes y funciona a 50 MHz.

Conclusión: ninguna hipótesis está probada; 1, 2 y 3 son las únicas comprobables sin
inventar comandos.

## 4. Plan de banco con el mínimo de transmisiones

Reglas: PTT off prevalece; topes de TX/tune, disparo ROE, amplificador en STANDBY y
bloqueo de operador siguen activos. Nadie transmite solo: cada paso TX lo inicia el
operador y se corta con `TX0;` + `AC120;`. Las lecturas de las fases 0 son sin TX.

**Fase 0 (0 transmisiones, lecturas CAT).** Comandos: `FA;` `MD0;` `PC;` `AC;`
`EX030701;` `EX030702;` `EX030704;` `EX030104;` `TX;` `RI0;`.
Esperado: 28,450 MHz, MD07, PC2010, AC100, EX…=3/0/0/0, TX0, `RI0` sin bit TX.
Parada: cualquier valor distinto → no seguir.

**Fase 1 (1 transmisión): panel con PC2010.** Poner `PC2010;` (el operador), pulsar
TUNE en el panel a 28,450 MHz. Leer cada 1 s `RM6;` `RI0;` `TX;`.
- Esperado si la potencia no importa: RM6 baja a <20 y `RI0`→`RI00010100`→TX0.
- Si falla (RM6 se queda en 255 o rebota) → la potencia es la causa (hipótesis 1).
- Parada: `TX0;`+`AC120;` a los 30 s o si RM6 sube de 200 sostenido 10 s.

**Fase 2 (1 transmisión, solo si la fase 1 tuvo éxito): CAT justo tras el panel.**
Con el mástil ya sintonizado y PC2010: `AC123;`, leer igual cada 1 s.
- Esperado si hay memoria de posición: termina rápido con RM6 bajo.
- Si vuelve a pasar de largo → hipótesis 2/3/4 (sin explicación en fuentes).
- Parada: igual que fase 1.

**Fase 3 (opcional, 1 transmisión).** Repetir la fase 1 a 50,2161 MHz con `AC123;`
para confirmar la referencia (~10 s, raw 3).

**Fase 4 (solo si 1 y 2 fallan, 1 transmisión): menú EX030104.** Hamlib lo trata como
0 Option / 1 ATAS (`ftx1_ext.c` l.16), el manual como 0 INT … 3 ATAS. Solo el operador,
desde el menú del radio, lo cambia a 1 y repite la fase 1; si tampoco mejora,
restaurar a 0. No se escribe por CAT ni lo hace el software. Con `PC2xxx` (SPA-1)
Hamlib no usa este menú para elegir el tipo, así que se espera sin efecto.

No se prueba ninguna variante `AC12x` adicional ni `AC023;`: «pendiente de fuente».
Total: 2 transmisiones necesarias (fases 1-2), 4 como máximo (fases 3-4 opcionales).

## 5. Decisión de implementación

Hamlib FTX-1, wfview y wfweb (sección 2b) confirman la misma secuencia
`AC123;`/`AC120;`; ninguno añade prerrequisito. Causa **no demostrada**.
Aceptación (2): ninguna fuente demuestra una secuencia requerida → **sin cambios de
código ni de catálogo**. Aceptación (3): no se añade ningún cambio automático de
menús ni de potencia. Si el banco demuestra que la potencia es la causa, la
corrección seguirá siendo un aviso al operador (como ya hace la puerta de potencia),
nunca un cambio automático de `PC`.
