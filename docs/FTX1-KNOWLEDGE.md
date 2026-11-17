# Conocimiento Yaesu FTX-1: referencia de investigacion

## Introduccion y leyenda de seguridad

Este documento reune lo aprendido de 22 repositorios publicos sobre el Yaesu
FTX-1 (comandos CAT, USB, memorias, firmware, hardware, satelites y
arquitecturas remotas) y lo compara con lo que ya hace Bricohams. Es material de
referencia: no sustituye al manual oficial de Yaesu "CAT Operation Reference
Manual" ni a la ayuda de usuario `docs/AYUDA-FTX1.md`.

Donde estan las fuentes: cada repositorio esta clonado sin cambios en
`third_party/ftx1/<carpeta>`. La tabla con la URL, el commit y la licencia de
cada uno esta en `third_party/ftx1/SOURCES.md`. Las citas se escriben
`[carpeta:ruta]`, con la carpeta bajo `third_party/ftx1/`. Las citas
`[SOURCES.md]` apuntan a `third_party/ftx1/SOURCES.md`.

Leyenda de seguridad. Estas etiquetas marcan filas y parrafos:

- **ESCRIBE EN LA RADIO**: guarda datos que persisten en la radio (memoria,
  menu, reloj, estado) o cambia el estado de la radio.
- **REGION/LIMITES TX**: cambia o afecta las bandas o la potencia en que la
  radio puede transmitir.
- **CALIBRACION**: toca datos de calibracion de fabrica.
- **FIRMWARE**: lee, prepara o carga firmware.

Este proyecto no automatiza nunca nada marcado como **REGION/LIMITES TX**,
**CALIBRACION** o **FIRMWARE**. Tampoco automatiza la transmision (PTT, CW,
sintonizador). Todo lo marcado **ESCRIBE EN LA RADIO** que si ofrece la
herramienta (memorias, menu) exige leer antes, hacer copia, simular y verificar
releyendo.

Notacion: los comandos son ASCII terminados en `;`. `P1` es el lado: 0 = MAIN,
1 = SUB, salvo que se indique. `?;` es el rechazo de la radio. "Solo ajuste"
significa que no tiene lectura ni respuesta. El CAT exige firmware MAIN 1.08 o
posterior [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]
[ew1abz-yaesu-ftx-1-memory-manipulator:doc/cat-version-diff.md]. Se han visto
tres revisiones del manual CAT: 2306, 2507(-B) y 2508-C
[captobie-ftx1-remote:ftx1-cat-manual-errata.md]
[ew1abz-yaesu-ftx-1-memory-manipulator:doc/cat-version-diff.md]. El manual
2508-C tiene 89 familias de comandos en el indice (90 con `EO`, que solo esta en
la tabla de detalle) y 580 filas de detalle, 427 de ellas de `EX`
[rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md].

Ningun repositorio estudiado contiene codigo que grabe firmware, cambie region o
limites de TX (salvo la herramienta de region de la seccion 5 y los menus de
potencia `PC`/`EX`), ni escriba calibracion. De firmware solo se lee la version
con `VE`.

## Referencia de comandos CAT

Los desacuerdos entre fuentes y las erratas del manual se conservan en la
columna Notas. Las filas con **ESCRIBE EN LA RADIO** cambian datos que
persisten. Las de TX (`TX`, `MX`, `KY`) y de arranque del sintonizador (`AC`)
activan el transmisor: este proyecto no las usa.

| Comando | Ajuste | Lectura | Respuesta | Parametros | Notas | Fuentes |
|---|---|---|---|---|---|---|
| AB | `AB;` | - | - | Copia MAIN a SUB | Solo ajuste. Rigplane lo llama "M=S equalize"; no es una operacion VFO A/B | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] [rigplane-rigplane-core:rigs/ftx1.toml] |
| AC | `AC P1 P2 P3;` | `AC;` | `AC P1 P2 P3;` | P1 0 interno/1 externo; P2 0 ATU, 2 ATAS; P3 0 OFF, 1 ON, 3 START (2 reservado) | P3=3 arranca el sintonizador y **transmite**. Verificado en radio: P1=0 no hace nada en una Optima, P1=1 funciona. Formas: interno `AC003;`/`AC000;`, externo `AC103;`/`AC100;`, ATAS `AC123;`/`AC120;`; ATAS rechaza lo que no sea `AC12x`; `AC;` puede seguir distinto de cero al terminar (se vigila PO); antena `EX030704;`, tipo de sintonizador `EX030701;`/`EX030702;`. **ESCRIBE EN LA RADIO** (estado) | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| AG | `AG P1 nnn;` | `AG P1;` | `AG P1 nnn;` | Ganancia de AF, 3 digitos, 000-255 | Usado por gnfrazier, rigplane, WebUI, iTracMan y SEM | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Vfo.cs] |
| AI | `AI0;`/`AI1;` | `AI;` | `AI s;` | Informacion automatica OFF/ON | Ninguna fuente describe el formato de los mensajes no solicitados; las apps sondean en vez de depender de AI. Ver seccion 3 | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] |
| AM | `AM;` | - | - | Guarda el estado del VFO-A MAIN en el canal de memoria seleccionado (sin argumento de canal) | Solo ajuste. Guarda tono/CTCSS, modo y desplazamiento (MW no). **ESCRIBE EN LA RADIO** | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| AO | lectura/ajuste | si | - | Nivel de salida AMC 001-100 (ITM: `AOnnn`) | No implementado en rigplane | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| BA | `BA;` | - | - | Copia SUB a MAIN | Solo ajuste | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] |
| BC | `BC P1 s;` | `BC P1;` | `BC P1 s;` | Auto notch (DNF) OFF/ON por lado | Forma SUB probada en banco | [rigplane-rigplane-core:rigs/ftx1.toml] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] |
| BD | `BD P1;` | - | - | Banda abajo | Sin respuesta. Rigplane envia `BD0;`; WebUI y POK `BDv;` | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| BI | `BI s;` | `BI;` | `BI s;` | Break-in OFF/ON | EUG lee el estado en el offset 2 | [rigplane-rigplane-core:rigs/ftx1.toml] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java] |
| BM | `BM;` | - | - | Guarda el estado del VFO-B SUB en la memoria seleccionada | Solo ajuste. Guarda el VFO SUB real (puede corromper el canal, p. ej. atascado en 144 MHz). **ESCRIBE EN LA RADIO** | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] |
| BP | `BP P1 P2 nnn;` | `BP P1 P2;` | `BP P1 P2 nnn;` | Notch manual. P2=0: estado 000/001; P2=1: frecuencia 001-320 (x10 Hz = 10-3200 Hz) | El manual no tiene comando de ancho del notch. La respuesta puede no ser numerica (`BP01F35;`) en modos sin notch (FM). Forma SUB `BP10`/`BP11` | [bg7nzl-ftx1ctl:ftx1cat.py] [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| BS | `BS P1 nn;` | la lectura da `?;` | - | Seleccion de banda, nn 00-14 (gnfrazier: 5=14 MHz, 6=18, 7=21, 8=24.5, 9=28, 10=50 MHz) | Solo escritura. **Desacuerdo**: PR2EM, ITM, POK y RZO lo usan; las notas de WebUI dicen que la radio (y su mock) lo rechazan. PR2EM: la banda de 11 m no tiene codigo y envia `FA027555000;` + `MD02;`. RZO usa `BS113` | [rigplane-rigplane-core:rigs/ftx1.toml] [gnfrazier-ftxcat:ftxcontrol.py] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] [rzochowski-cat-ftx1:cat-presets.json] |
| BU | `BU P1;` | - | - | Banda arriba | Sin respuesta | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] |
| CF | `CF P1 0 0 rx tx 000;` (clarificador on/off); `CF P1 0 1 +/-nnnn;` (desplazamiento) | `CF P1 00;` / `CF P1 01;` (rigplane `CF000;`/`CF001;`) | `CF P1 0 P3 ...;` (11 caracteres) | P3 0 = ajuste CLAR, 1 = frecuencia CLAR; desplazamiento +/-0000-9999 Hz (la doc de gnfrazier dice +/-9995; ew1abz-memory +/-9990 en memorias) | ew1abz-control usa las mismas dos formas | [gnfrazier-ftxcat:ftxcontrol.py] [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs] [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Vfo.cs] |
| CH | ajuste | - | - | Canal de memoria arriba/abajo | No implementado en rigplane; POK lo usa | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [pokibon3-FTX1Controller:js/ftx1.js] |
| CN | `CN P1 P2 ppp;` | `CN P1 P2;` | `CN P1 P2 ppp;` | P2 0 = CTCSS (ppp 000-049, indice de una tabla de 50 tonos), 1 = DCS (000-103, 104 codigos) | Indice: 00=67.0 ... 12=100.0 ... 49=254.1 Hz (tabla completa en fritzsche). MW ignora CN; ajustar CN antes de AM. Rigplane solo implementa CTCSS | [fritzsche-yaesu-ftx1:cat_format.md] [rigplane-rigplane-core:rigs/ftx1.toml] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] |
| CO | `CO P1 P2 nnnn;` | `CO P1 P2;` | `CO P1 P2 nnnn;` | P2 0 = contour on/off, 1 = frecuencia contour, 2 = APF on/off, 3 = frecuencia APF | Rigplane usa `CO00/CO02/CO03`. EUG usa `CO02;`/`CO020000;`/`CO020001;` como interruptor de APF | [rigplane-rigplane-core:rigs/ftx1.toml] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java] |
| CS | `CS s;` | `CS;` | `CS s;` | Spot de CW | | [rigplane-rigplane-core:rigs/ftx1.toml] |
| CT | `CT P1 P2;` | `CT P1;` | `CT P1 P2;` (la radio real responde P2 de un digito) | P2 0 OFF, 1 TONE (ENC on/DEC off), 2 TSQL (ENC+DEC), 3 DCS, 4 PR FREQ, 5 REV TONE | **Difiere de los codigos 1 y 2 de P8 en MW/MR (intercambiados)**, ver seccion 4 | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] [rigplane-rigplane-core:rigs/ftx1.toml] |
| DA | lectura/ajuste | `DA;` | - | Contraste 00-20 y brillo TFT/LED 00-20. El ajuste es combinado (`DA00` + tres valores de 2 digitos), hay que leer y mezclar antes | Intencionadamente no publico en rigplane. captobie lo lista entre los comandos usados | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [captobie-ftx1-remote:CLAUDE.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| DN | ajuste | - | - | MIC DOWN | Los titulos del indice y del detalle difieren | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [captobie-ftx1-remote:ftx1-cat-manual-errata.md] |
| DT | `DT0 yyyymmdd;` / `DT1 hhmmss;` | lectura | - | Fecha y hora | No implementado en rigplane. **ESCRIBE EN LA RADIO** (reloj) | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [Semyonic-ftx1-programmer:src/cat/commands.ts] |
| EO | ajuste | - | - | Encoder offset, 6 selectores (MAIN/SUB/ambos x dial principal/FUNC, +/-, Hz/kHz/MHz) | Tiene pagina de detalle pero no entrada en el indice | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [captobie-ftx1-remote:ftx1-cat-manual-errata.md] |
| EX | `EX P1P2P3 P4;` (direccion de menu + valor) | `EX P1P2P3;` | `EX P1P2P3 P4;` | 427 direcciones de menu; el ancho de P4 varia segun el elemento. Conocidos: `EX010413` MOD SOURCE DATA, `EX010113` SSB, `EX010514/15` marca/shift RTTY, `EX010417` tono PSK de DATA, `EX0202 05+n` tipo de memoria CW, `EX020203` CW weight, `EX060103` APRS AF MUTE, `EX030204` SCAN RESUME, `EX050201` MY POSITION latitud, `EX030604/05/06` CH-STEP por modo | **ESCRIBE EN LA RADIO** (menu). Erratas verificadas en radio: `EX020203` P4 es el desfase respecto a 2.5 en pasos de 0.1 (00=2.5, 20=4.5); `EX040107` AUTO POWER OFF 2 digitos, 00=OFF, 01-24 = 0.5-12 h; `EX010322` DCS CODE necesita 3 digitos 000-103; `EX030503` HF MAX POWER maximo 100 W enteros (**REGION/LIMITES TX**); `EX030504` 50M MAX POWER 005-100 (sospechado); el bloque `EX05xx` situa MY POSITION en P2=02 y SD CARD, SOFT VERSION, **CALIBRACION** y RESET en P2=03-06; `EX050109` responde `?;`. Solo sospechadas: incoherencias entre rangos P1/P3 del manual y la Tabla 3 (OS, RPT SHIFT, SPEED UNIT, WIND UNIT, ANT2, RF-SQL VR, TUN-LIN, MOD SOURCE, lista MIC, FM DIAL STEP, cuenta DTMF). Escribir EX directo puede cambiar velocidad CAT, bit de parada, timeout o puerto TUN/LIN (el restaurado de PR2EM los omite). SEM empareja la respuesta con la direccion de 8 caracteres. Los elementos de accion del catalogo (CALIBRACION, RESET) no se envian nunca | [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [captobie-ftx1-remote:ftx1-cat-manual-errata.md] [captobie-ftx1-remote:CLAUDE.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/menu.py] [Semyonic-ftx1-programmer:src/cat/transport.ts] [pokibon3-FTX1Controller:js/exmenu.js] |
| EX01 (audio) | `EX01` + categoria 01-05 + parametro 01-03 + valor de 2 digitos con signo | lectura | - | Ecualizador de AF por modo: agudos/medios/graves de -20 a +10 | Es un uso concreto de `EX`. **ESCRIBE EN LA RADIO** | [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| FA | `FA fffffffff;` | `FA;` | `FA fffffffff;` | Frecuencia MAIN, 9 digitos en Hz. ITM acota el ajuste a 30 kHz-470 MHz; RX de fabrica 30 kHz-174 MHz y 400-470 MHz | Lo usan gnfrazier, bg7nzl, ew1abz-*, PR2EM y WebUI. FB/f Sub no es fiable con MAIN en un canal de 6 m (captobie). PR2EM relee `FA;` tras ajustar | [fritzsche-yaesu-ftx1:cat_format.md] [gnfrazier-ftxcat:ftxcontrol.py] [bg7nzl-ftx1ctl:ftx1cat.py] [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs] [captobie-ftx1-remote:CLAUDE.md] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.cs] |
| FB | `FB fffffffff;` | `FB;` | `FB fffffffff;` | Frecuencia SUB, 9 digitos | Con split `ST1`, FB pasa a ser el VFO de TX, en el modo de MAIN. En Look4Sat: FA = bajada (RX), FB = subida (TX) | [gnfrazier-ftxcat:ftxcontrol.py] [captobie-ftx1-remote:CLAUDE.md] [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt] |
| FD | no documentado | - | no solicitado | El primer parametro es el lado del scope | Mensaje no solicitado que dispara consultas `SS` (segun un comentario de RZO) | [rzochowski-cat-ftx1:serial-server.mjs] |
| FN | lectura/ajuste | si | `FN;`/`FN d;` | Fine tuning OFF/ON/Fast | No implementado en rigplane. POK lo usa como asignacion FUNC | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Vfo.cs] [pokibon3-FTX1Controller:js/ftx1.js] |
| FR | `FR nn;` | `FR;` | `FR nn;` | 00 = recepcion dual, 01 = recepcion simple (POK: `FR0v;`) | Estado de la funcion de receptor | [captobie-ftx1-remote:CLAUDE.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| FS | (FT-991A) | - | - | Solo en el perfil FT-991A de POK | No es del FTX-1 | [pokibon3-FTX1Controller:js/ft991a.js] |
| FT | `FT v;` | `FT;` | `FT v;` | Selecciona el transmisor MAIN/SUB (0/1) | No da permiso para transmitir. `SC<lado>1` mueve VS/FT. En Look4Sat, elegir SUB no activa el PTT | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] [captobie-ftx1-remote:CLAUDE.md] [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt] |
| GP | lectura/ajuste | si | - | Cuatro salidas CMOS de 5 V LOW/HIGH | No publico en rigplane. **ESCRIBE EN LA RADIO** (salidas fisicas) | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| GT | `GT P1 P2;` | `GT P1;` | `GT P1 P3;` | Ajuste P2: 0 OFF, 1 FAST, 2 MID, 3 SLOW, 4 AUTO. Respuesta P3: 0 OFF, 1 FAST, 2 MID, 3 SLOW, 4 AUTO-FAST, 5 AUTO-MID, 6 AUTO-SLOW | El ajuste y la respuesta usan codificaciones distintas (manual); las respuestas 4/5/6 significan AUTO. `GT0` sin respuesta en C4FM | [bg7nzl-ftx1ctl:ftx1cat.py] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| ID | - | `ID;` | `ID0840;` | ID fijo del modelo 0840 | Validado por ew1abz-*, rigplane y RZO. POK cita `0800` como ID antiguo en un comentario; su perfil FT-991A usa `0570`/`0670` | [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs] [rigplane-rigplane-core:rigs/ftx1.toml] [gnfrazier-ftxcat:ftxcontrol.py] [rzochowski-cat-ftx1:serial-server.mjs] [pokibon3-FTX1Controller:js/ftx1.js] |
| IF | - | `IF;` | `IF` + canal(5) + frecuencia(9) + signo clar(1) + clar(4) + RX clar(1) + TX clar(1) + modo(1) + VFO/mem(1) + tono(1) + `00` + shift(1) + `;` (30 caracteres) | Estado compuesto de MAIN; mismo formato que MR | La radio de banco respondio shift `3` (la seccion IF del manual no lo documenta; OS documenta 3 = ARS). No hay campo de PTT ni de split | [rigplane-rigplane-core:rigs/ftx1.toml] [gnfrazier-ftxcat:ftxcontrol.py] [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] |
| IS | `IS P1 0 +/-nnnn;` | `IS P1;` | `IS P1 0 +/-nnnn;` | IF shift +/-0000-1200 Hz en pasos de 20 | Rareza: P2 debe ser `0`; el `1` de Hamlib fue rechazado por la radio | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| KM | `KM n texto;` | `KM n;` | - | Memoria de manipulador 1-5, hasta 50 caracteres | La radio anade `}` ella misma; mas de 50 da `?;`; `KM<n>;` es una lectura (no se puede vaciar una ranura). Caracteres A-Z 0-9 `/ ? , . = + - ( ) @ :`; prosignos `=` BT, `+` AR, `(` KN. SEM: el texto no puede contener `}` ni `;`. **ESCRIBE EN LA RADIO**. Indice y detalle con titulos distintos | [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [rigplane-rigplane-core:rigs/ftx1.toml] [Semyonic-ftx1-programmer:src/cat/commands.ts] |
| KP | `KP nn;` | `KP;` | `KP nn;` | Indice del tono de CW, 2 digitos 00-75 = 300 + 10n Hz | | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| KR | lectura/ajuste | si | - | Manipulador de CW OFF/ON (`KR0/1`) | gnfrazier tiene `set_cw_keyer` (cadena no localizada) | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| KS | `KS nnn;` | `KS;` | `KS nnn;` | Velocidad de CW en WPM, 3 digitos, 4-60 | | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| KY | `KY P1 P2;` | - | - | P1 0 = memoria CW TEXT, 1 = memoria CW MESSAGE; P2 1-5 reproduce, 0 para (`KY00` para) | **Transmite** si BK-IN esta activo; un segundo KY reinicia el mensaje. No hay forma de KY con texto libre: el CW tecleado es KM en la ranura 5 y luego KY. EUG usa `KY ` + texto en mayusculas + `;` | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/EcranComenzi.java] |
| LK | `LK s;` | `LK;` | `LK s;` | Bloqueo del panel/dial OFF/ON | | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [rzochowski-cat-ftx1:serial-server.mjs] |
| LM | lectura/ajuste | si | - | Grabacion/carga de mensajes de voz, canal/estado. `LM0;` selecciona la ranura (arma la grabacion); `LM1` graba a la SD | Rareza: `LM1` graba el audio RX en la SD de la radio, no es reproduccion. **ESCRIBE EN LA RADIO** | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| MA | `MA;` | - | - | Memoria (elegida con MC) a VFO MAIN | Solo ajuste. Carga solo la frecuencia (fritzsche: no los tonos) | [fritzsche-yaesu-ftx1:cat_format.md] [gnfrazier-ftxcat:ftxcontrol.py] |
| MB | `MB;` | - | - | Memoria a VFO SUB | Carga un buffer de pantalla, no el VFO-B SUB real (ew1abz) | [gnfrazier-ftxcat:ftxcontrol.py] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] |
| MC | `MC P1 ccccc;` | 2508-C: `MC P1;` (2507-B: `MC;`) | `MC P1 ccccc;` | P1 lado; canal 00001-00999 (tambien P-nnL/U, 5 MHz, EMGCH) | Fritzsche llama a MC "de 6 digitos" (lado + 5). El manual dice 00001-00099 en MC y 00001-00999 en MR/MW/MZ; verificado en radio 1-999. No se puede elegir una ranura vacia (conserva la anterior sin aviso). `MC0` antes de `VM011`. Segun fritzsche es solo ajuste (sin respuesta) | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/cat-version-diff.md] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [gnfrazier-ftxcat:ftxcontrol.py] |
| MD | `MD P1 m;` | `MD P1;` | `MD P1 m;` | Modos: 0 = WFM (ew1abz) / "LSB o FM" (fritzsche), 1 LSB, 2 USB, 3 CW-U, 4 FM, 5 AM, 6 RTTY-L, 7 CW-L, 8 DATA-L, 9 RTTY-U, A DATA-FM, B FM-N, C DATA-U, D AM-N, E PSK, F DATA-FM-N, H C4FM-DN, I C4FM-VW | **Desacuerdo en `0`**: ew1abz dice WFM y fritzsche "LSB (o FM en algunos modelos)". La lista de fritzsche omite E e I; bg7nzl y ew1abz los incluyen. En C4FM `MD` responde `H`; el manual tambien lista `I`. ITM lee el codigo `0` como centinela AMS, no como fallo (sin comando CAT para elegir AMS). La radio lo rechaza durante TX (banco de rigplane) | [gnfrazier-ftxcat:ftxcontrol.py] [bg7nzl-ftx1ctl:ftx1cat.py] [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:tests/FTX1WinController.Tests/CatCommandsTests.cs] [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt] |
| MG | `MG nnn;` | `MG;` | `MG nnn;` | Ganancia de microfono, 3 digitos (ITM 0-100) | | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:CLAUDE.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| ML | `ML P1 ...;` | `ML P1;` | - | Monitor: estado (P1=0) / nivel 000-100 (P1=1; WebUI `ML0nnn`) | **Conflicto**: el manual lo documenta; la radio viva de rigplane responde `?;` y dice que se controla por el menu EX | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] |
| MR | - | `MR ccccc;` | `MR` + ccccc + frec(9) + signo clar(1) + clar(4) + RX clar + TX clar + modo + tipo + tono + `00` + shift + `;` (27 bytes de parametros, 30 caracteres) | Lee un canal sin seleccionarlo | Ver seccion 4. Canal vacio da `?;`. `MR00000` en modo Memoria devuelve el canal activo, no el VFO | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs] [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] |
| MS | lectura/ajuste | si | - | Selector del medidor MAIN/SUB 0-5 (`MS<main><sub>;`) | Seleccion del medidor del panel; rigplane vio `MS35;` seleccionando VDD. No publico | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.cs] |
| MT | `MT ccccc tag12;` | `MT ccccc;` | `MT ccccc tag12;` (17 caracteres de parametros) | Nombre de 12 caracteres rellenado con espacios; ASCII 0x20-0x7D sin `;` | **ESCRIBE EN LA RADIO**. Canal vacio da `?;` | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs] [Semyonic-ftx1-programmer:src/cat/commands.ts] |
| MW | `MW` + registro de 27 caracteres (ver MR) + `;` | ninguna (solo ajuste) | - | Crea o sobrescribe un canal | **ESCRIBE EN LA RADIO**. P9 (`00`) debe ser `00` o da `?;`. NO guarda el tono (vuelve al codigo 12 / 100.0 Hz). La posicion 17 debe ser `+`/`-` (`S` no vale; fritzsche). La tabla de detalle del manual omite lectura/respuesta | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] |
| MX | `MX P1;` | `MX;` | `MX0;`/`MX1;` | MOX OFF/ON | Accion de TX; la usa bg7nzl. Rigplane la protege con autoridad de TX gestionada | [bg7nzl-ftx1ctl:ftx1cat.py] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] |
| MZ | `MZ ccccc s fffffffff;` | `MZ ccccc;` | `MZ ccccc s fffffffff;` (15 caracteres) | s 0 = split off, 1 = on; frecuencia de TX en 9 digitos Hz | **ESCRIBE EN LA RADIO**. Registro de memoria split; se escribe despues de AM | [ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md] [Semyonic-ftx1-programmer:src/cat/commands.ts] |
| NA | `NA P1 s;` | `NA P1;` | `NA P1 s;` | Narrow OFF/ON (captobie: P1 0 = MAIN, 1 = SUB) | `SH` no cambia con NAR en SSB/CW/RTTY/DATA (el ancho real es el preajuste del menu NAR WIDTH) | [gnfrazier-ftxcat:ftxcontrol.py] [captobie-ftx1-remote:CLAUDE.md] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] |
| NL | `NL P1 nnn;` | `NL P1;` | `NL P1 nnn;` | Nivel del noise blanker OFF/001-010 (escrito con 3 digitos; PR2EM y WebUI `NL0nnn;`) | | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] |
| OI | - | `OI;` | mismo formato que IF | Estado compuesto de SUB (banda opuesta) | Lo usa ew1abz-control para la frecuencia SUB | [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| OS | `OS P1 d;` | `OS P1;` | `OS P1 d;` | d 0 Simplex, 1 Plus, 2 Minus, 3 ARS | **Solo modo FM** (se ignora sin aviso en otros). Errata: el orden de la pagina OS y el de la Tabla 3 difieren (Tabla 3: 0 -, 1 simplex, 2 +, 3 ARS); la app sigue la pagina OS. Solo direccion; el desplazamiento es un valor del menu EX | [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:ftx1-cat-manual-errata.md] |
| PA | `PA P1 P2;` | `PA P1;` | `PA P1 P2;` | P1 0 = HF/50 MHz, 1 = VHF, 2 = UHF. HF/50: 0 IPO, 1 AMP1, 2 AMP2. VHF/UHF: 0 OFF, 1 ON | Por grupo de banda, no por canal | [bg7nzl-ftx1ctl:ftx1cat.py] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] |
| PB | lectura/ajuste | si | - | Reproduccion/parada de mensaje de voz (`PB0<ranura>;`, `PB00;` para; ITM ranuras 0-5) | **Transmite** si se reproduce con TX activo | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/EcranComenzi.java] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| PC | `PC P1 nnn;` | `PC;` | `PC P1 nnn;` | P1 1 = cabeza de campo (manual 005-010 W), 2 = SPA-1 (005-100 W) | **REGION/LIMITES TX**. **Desacuerdo**: bg7nzl (banco): la cabeza acepta 001-010 W; rigplane: `PC2000;` da `?;`, minimo 5 W con SPA-1. gnfrazier: 5-10 W en campo, 5-100 W con SPA-1, con un TODO sobre decimas de vatio; WebUI acepta fraccionarios (`PC10.5;`) y sondea si >6 W se rechaza para inferir bateria. ITM descubre la cabeza activa por la respuesta. Errata: el limite HF MAX POWER es de `EX`, 100 W enteros | [bg7nzl-ftx1ctl:ftx1cat.py] [rigplane-rigplane-core:rigs/ftx1.toml] [gnfrazier-ftxcat:README.md] [gnfrazier-ftxcat:ftxcontrol.py] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| PL | `PL nnn;` | `PL;` | `PL nnn;` | Nivel del procesador de voz 0-100 (traza real `PL003;`) | | [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| PR | `PR P1 s;` | `PR P1;` | `PR P1 s;` | P1 0 = procesador de voz, 1 = ecualizador parametrico de mic; s OFF/ON | **Errata (verificada en radio)**: el manual dice 1 = OFF, 2 = ON; la radio usa 0 = OFF, 1 = ON (ITM: la lectura acepta `0` o `2` como off) | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [iTracMan-FTX1WinController:tests/FTX1WinController.Tests/CatCommandsTests.cs] |
| PS | `PS s;` | `PS;` | `PS s;` | Encendido/apagado | `PS0;` apaga la radio. EUG lo envia al salir de la app; SEM lo exige "armado". **ESCRIBE EN LA RADIO** (estado) | [rigplane-rigplane-core:rigs/ftx1.toml] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/MainActivity.java] [Semyonic-ftx1-programmer:src/cat/commands.ts] |
| QI | `QI;` | - | - | Guarda QMB | Solo ajuste. **ESCRIBE EN LA RADIO** | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Vfo.cs] |
| QR | `QR;` | - | - | Recupera QMB | Solo ajuste. ITM tiene una guarda contra carreras en la recuperacion | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/RadioController.Vfo.cs] |
| QS | `QS;` | - | - | Split rapido | Solo POK | [pokibon3-FTX1Controller:js/ftx1.js] |
| RA | `RA P1 s;` | `RA P1;` | `RA P1 s;` | Atenuador de RF (12 dB segun WebUI) | Rechazado (`?;`) con MAIN en 461.550 MHz en una prueba de banco | [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] |
| RC | `RC;` | - | - | `reset_clarifier` de rigplane | **No documentado en 2508-C** (solo procedencia del perfil) | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] |
| RG | `RG P1 nnn;` | `RG P1;` | `RG P1 nnn;` | Ganancia de RF 000-255 | | [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| RI | - | `RI P1;` | estado de radio de 8 campos | `RI0` (P7 estado del scan, P8 squelch); `RI1` responde `?;`. PR2EM: 7 caracteres (HI-SWR[0], rec[1], TX[2], tuning[4], scan[5], busy[6]) | El tuner-sweep lo usa para detectar el sintonizador (digito 6) | [captobie-ftx1-remote:CLAUDE.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |
| RL | `RL P1 nn;` | `RL P1;` | `RL P1 nn;` | Nivel de DNR OFF/01-10 (EUG: forma `RL000;`) | | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java] |
| RM | - | `RM P1;` | `RM P1 nnn 000;` (rigplane: `RM{tipo}{main:03d}{sub:03d}`) | Medidores P1 1..8: 1 S-MAIN, 2 S-SUB, 3 COMP, 4 ALC, 5 PO, 6 SWR, 7 IDD, 8 VDD; valor 000-255 | Crudo, sin calibrar. bg7nzl (solo en el software de la PC; nada se escribe en la radio, **CALIBRACION** del lado anfitrion): VDD ~ crudo*13.8/203, IDD crudo*3/255, COMP crudo*30/255 dB, ALC crudo*200/252 %, SWR 1+0.333(e^(0.0151 crudo)-1), PO lineal por tramos hasta 15 W. Rigplane: crudo 210 ~ 13.8 V (banco). El indice dice RM Set=X pero el detalle muestra una fila `P1=0`. RZO nota disposiciones de uno o dos valores. EUG lee `RM8;` cada 5 s para inferir cabeza de 6 W o 10 W | [bg7nzl-ftx1ctl:ftx1cat.py] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java] |
| SC | `SC P1 m;` | `SC;` devuelve el ultimo comando (p. ej. `SC11;`) | - | Scan: m 0 OFF, 1 UP, 2 DOWN | `SC0;`/`SC1;` como lectura da `?;`. Cualquier parada detiene ambos scans. `SC<lado>1` mueve VS/FT a ese lado | [gnfrazier-ftxcat:ftxcontrol.py] [captobie-ftx1-remote:CLAUDE.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| SD | `SD nnnn;` | `SD;` | `SD nnnn;` | Retardo de break-in (ms); indice de 2 digitos: 0-5 = 30/50/100/150/200/250 ms y luego pasos de 100 ms (6-33 hasta 3000 ms) | `VD` usa la misma tabla 00-33 | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| SF | lectura/ajuste | si | - | Asignacion de la perilla FUNC (`SF0<perilla>;`) | Solo del panel frontal; RZO y POK la usan | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [rzochowski-cat-ftx1:serial-server.mjs] [pokibon3-FTX1Controller:js/ftx1.js] |
| SH | `SH P1 0 nn;` (gnfrazier) / `SH P1 nnn;` (rigplane) | `SH P1;` | `SH P1 nnn;` | Codigo de ancho de filtro | **Desacuerdo** en la cadena de ajuste: gnfrazier `SH{lado}0{codigo:02d}`; rigplane `SH{rx}{codigo:03d}` (mismos digitos). WebUI `SH00nn;` lee 2 caracteres en los offsets 2-3 | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] |
| SM | - | `SM P1;` | `SM P1 nnn;` | Medidor S (0-255) | La consulta SUB devuelve siempre el lado 0 (`SM1;` sin respuesta util; RZO usa el digito VFO del comando en cola) | [rigplane-rigplane-core:rigs/ftx1.toml] [gnfrazier-ftxcat:ftxcontrol.py] [rzochowski-cat-ftx1:serial-server.mjs] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| SQ | `SQ P1 nnn;` | `SQ P1;` | `SQ P1 nnn;` | Squelch | **Desacuerdo**: WebUI dice 000-100; ITM y SEM 0-255 | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| SS | lectura/ajuste | si | - | Ajustes del scope, 7 selectores (velocidad/pico/marcador/color/nivel/span/modo). `SS04+/-dd.d;` D-LEVEL; `SS01` D-PEAK (digito +1); `SS02` marcador; `SS03` color (digito hex +1, colores 1-11 = `0-9,A`) | RZO consulta al inicio `SS04 SS05 SS00 SS03 SS06`. PR2EM-A: deslizador -60..60 en medios pasos. No implementado en rigplane | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] [rzochowski-cat-ftx1:serial-server.mjs] |
| ST | `ST s;` | `ST;` | `ST s;` | Split OFF/ON | `ST1` apaga la doble pantalla (`FR01`). WebUI anota que `ST` esta en su lista de rechazos del mock y no lo usa; Look4Sat envia `ST1;`/`ST0;` sin analizar respuesta | [gnfrazier-ftxcat:ftxcontrol.py] [captobie-ftx1-remote:CLAUDE.md] [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt] [git-jcw-FTX-1-WebUI:js/cat/mock-radio.js] |
| SV | `SV;` | - | - | Intercambia MAIN/SUB | Solo ajuste. No sirve en modo VFO/Memoria. En captobie solo mueve el mapa de audio en recepcion dual | [fritzsche-yaesu-ftx1:cat_format.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] |
| TS | lectura/ajuste | si | - | TXW (vigilancia de TX) OFF/ON | Retenido: solo efectivo con Split activo, pero la radio hace eco con Split apagado. Protegido por TX gestionado en rigplane | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| TX | `TX0;`/`TX1;` | `TX;` | `TX0` RX, `TX1` TX por CAT, `TX2` TX por la radio (panel/mic/VOX) | PTT | gnfrazier lee `TX2` como "transmitiendo". El ajuste solo acepta 0/1 (captobie). Hamlib `t` da 3 para TX2 | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:CLAUDE.md] |
| UP | ajuste | - | - | MIC UP | | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| VD | lectura/ajuste | si | - | Retardo de VOX, tabla 00-33, pasos de 100 ms (por MIC/USB/BLUETOOTH) | No publico en rigplane | [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| VE | - | `VE P1;` | version en BCD | P1 0 MAIN, 1 DISPLAY, 2 SDR, 3 DSP, 4 SPA-1, 5 FC-80 | **FIRMWARE**: solo lectura; nada graba. Las CPU no disponibles se omiten o responden vacio | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/transport.py] |
| VG | lectura/ajuste | si | - | Ganancia de VOX 000-100 | No publico en rigplane | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| VM | `VM P1 pp;` | `VM P1;` | `VM P1 pp;` | pp 00 VFO, 10 MT, 11 Memory, 20 PMS, 21 P-01L..P-50U, 51 banda de 5 MHz, 91 EMG. fritzsche: `VM000;` VFO; `VM;` memoria | **Desacuerdo**: fritzsche documenta `VM;` como "cambiar a memoria"; ew1abz usa `VM011;`. `VM011` falla en silencio salvo que se escriba `MC0` justo antes. El manual lista `VM` dos veces (la primera entrada de detalle copia AM) | [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] [fritzsche-yaesu-ftx1:cat_format.md] [captobie-ftx1-remote:ftx1-cat-manual-errata.md] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] |
| VS | `VS v;` | `VS;` | `VS v;` | Selecciona la pareja TX/RX MAIN/SUB | Look4Sat lo usa con `FT1;` para elegir SUB como TX | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:CLAUDE.md] [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt] |
| VX | `VX s;` | `VX;` | `VX s;` | VOX OFF/ON | | [rigplane-rigplane-core:rigs/ftx1.toml] |
| ZI | ajuste | - | - | Zero-in automatico de CW por lado (`ZI0;`) | No implementado en rigplane | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/EcranComenzi.java] |

Otros hechos de CAT:

- No existe comando CAT para D-COLOR, DG-ID TX/RX, HRI MODE, recuperar o leer
  canales HOME, MAG ni los ajustes de WIRES-X
  [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md].
- No hay comando documentado para borrar un canal de memoria
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md]. La
  potencia por canal no es programable por CAT
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md].
- No hay comando de seguimiento MAIN/SUB en 2508-C
  [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md].
- **Desacuerdo** no reconciliado: el perfil de rigplane usa el id de modelo
  Hamlib 2028 [rigplane-rigplane-core:rigs/ftx1.toml]; captobie usa el 1051,
  primero en Hamlib 4.7 [captobie-ftx1-remote:CLAUDE.md].
- Erratas solo sospechadas (no verificadas): erratas tipograficas "mesc",
  "SYNBOL", "Bycycle" y "LONGTUDE"; la ubicacion del conector USB es
  incoherente; el manual CAT no menciona el audio USB
  [captobie-ftx1-remote:ftx1-cat-manual-errata.md]
  [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md].
- Comandos ocultos o especiales no documentados (SPR/SPW y otros) estan fuera de
  esta tabla a proposito; ver la seccion 5.

## Interfaces USB, serie y audio

**Puertos (UART dual CP210x)**

- El conector USB-C expone un hub interno: UART dual Silicon Labs CP2105 (VID
  10C4 PID EA70; la segunda funcion serie figura como 26AA:0030) y un codec de
  audio USB (VID 0D8C PID 0016)
  [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:CLAUDE.md].
- Enhanced COM Port = CAT-1 (comandos CAT). Standard COM Port = CAT-2 (PTT, CW,
  DATA o CAT secundario)
  [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]
  [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md].
- Controlador: Silicon Labs Dual CP210x USB to UART Bridge; Windows muestra
  "Enhanced COM Port (COMx)" y "Standard COM Port (COMy)". Linux
  `/dev/ttyUSB0`/`ttyUSB1`; macOS `/dev/tty.SLAB_USBtoUART`; en Pi, por id,
  `...CP2105...-if00-port0` es CAT y la interfaz 1 es el puerto de manipulacion
  [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]
  [captobie-ftx1-remote:Pi/README.md].
- bg7nzl elige solo el "Enhanced COM Port" para CAT y el "Standard COM Port" para
  PTT (puertos por defecto en codigo COM11/COM12)
  [bg7nzl-ftx1ctl:docs/user_manual_en.md] [bg7nzl-ftx1ctl:ftx1cat.py].
- CAT-3 es la UART trasera TUNER/LINEAR; no hace falta para USB y conviene dejar
  `TUN/LIN PORT SELECT` por defecto
  [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/cat-version-diff.md].
- WSL2: `usbipd bind/attach` del CP2105 (10c4:ea70) lo deja inutilizable en
  Windows [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]. En Linux
  hay que anadir al usuario al grupo `dialout` [gnfrazier-ftxcat:faq.md].
- Una Pi con subtension tira el hub USB de la radio. `cp210x ttyUSB...: failed set request` detiene la manipulacion de CW
  [captobie-ftx1-remote:CLAUDE.md] [captobie-ftx1-remote:Pi/README.md].
- Los servicios de audio fallan con "Device or resource busy" si otro cliente
  tiene la tarjeta de sonido [captobie-ftx1-remote:Pi/README.md].

**Velocidad y formato de trama**

- Opciones de CAT-1 RATE: 4800, 9600, 19200, 38400, 115200; de fabrica 38400;
  cada PRESET (5) tiene su propio CAT-1 RATE
  [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md].
- Por defecto 38400 8N1 en gnfrazier, bg7nzl, ew1abz-control,
  ew1abz-memory-manipulator, rigplane, PR2EM, ITM, WebUI, SEM, Look4Sat y la
  mayoria de apps Android; EUG usa 4800 8N1 en el puerto DATA
  [gnfrazier-ftxcat:ftxcontrol.py] [bg7nzl-ftx1ctl:ftx1cat.py]
  [ew1abz-yaesu-ftx-1-control:ftx1-ctl/src/config.rs]
  [ew1abz-yaesu-ftx-1-memory-manipulator:src/main.rs]
  [rigplane-rigplane-core:rigs/ftx1.toml] [Eugen68-Yaesu-FTX1-CAT-Control:README.md].
- **Desacuerdo**: la configuracion de Pi de captobie pone CAT-1 a **115200**
  (`rigctld -s 115200`) [captobie-ftx1-remote:Pi/README.md]; RZO tambien
  recomienda 115200 [rzochowski-cat-ftx1:README.md]; el resto, 38400. POK sondea
  38400, 4800, 9600, 19200 y 115200 [pokibon3-FTX1Controller:js/serial.js].
- Elementos de menu (OPERATION SETTING, GENERAL): `CAT-1 RATE`, `CAT-1 TIME OUT TIMER` (p. ej. 100 ms), `CAT-1 CAT-3 STOP BIT` = 1 bit, `CAT-2 RATE`, `CAT-2 TIME OUT TIMER`
  [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]. Cambiarlos a mano es
  **ESCRIBE EN LA RADIO**; ninguna herramienta los escribe.
- Proteccion del PTT por RTS/DTR en CAT-2 (poner a OFF si se usa CAT-2 como CAT
  con control de flujo): `RADIO SETTING, MODE SSB/AM/FM/DATA/RTTY RPTT SELECT`,
  `CW SETTING, MODE CW RPTT SELECT`, `CW SETTING, PC KEYING`,
  `PRESET, PRESET1-5 RPTT SELECT`
  [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]. Abrir el puerto de
  manipulacion sube brevemente DTR/RTS
  [captobie-ftx1-remote:Pi/README.md].
- DTR/RTS segun cada app (**las apps no coinciden**): PR2EM los desactiva antes
  de abrir (podrian activar el PTT con RPTT); WebUI los baja (las lineas de
  Standard COM pueden transmitir); Look4Sat los fuerza a falso; BYF los activa;
  POK en FT-991A pone RTS on y DTR off
  [evertonma-FTX-1CAT_PR2EM:ftx1cat/ui/app.py]
  [git-jcw-FTX-1-WebUI:js/cat/transport.js]
  [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1Controller.kt]
  [byf3332-Yaesu-FTX1-Cat-Tunnel:app/src/main/java/com/byf3332/cattunnel/CatTcpBridge.kt]
  [pokibon3-FTX1Controller:js/ft991a.js].

**Metodos de PTT (informativo; este proyecto no transmite)**

- CAT `TX1;`/`TX0;` [gnfrazier-ftxcat:ftxcontrol.py]; MOX `MX1;`/`MX0;`
  [bg7nzl-ftx1ctl:ftx1cat.py]; RTS en CAT-2 [bg7nzl-ftx1ctl:ftx1cat.py]
  [bg7nzl-ftx1ctl:docs/user_manual_en.md]; RTS/DTR en CAT-2 para CW
  [captobie-ftx1-remote:docs/cw-protocol.md].
- Rele de CW de captobie: TCP 8534 con JSON, por defecto linea RTS,
  `playoutDelayMs` 300 (20-1000), `heartbeatTimeoutMs` 1000, `maxKeyDownMs`
  5000; usa solo CAT-2, nunca el puerto CAT de rigctld
  [captobie-ftx1-remote:docs/cw-protocol.md] [captobie-ftx1-remote:CLAUDE.md].

**Audio USB**

- Codec 0D8C:0016 bajo el hub interno [rigplane-rigplane-core:rigs/ftx1.toml].
- **Desacuerdo** de canales: el perfil de rigplane dice que el audio RX esta solo
  en el canal IZQUIERDO (el derecho es ruido de fondo; `rx_audio_channel = "left"`) [rigplane-rigplane-core:rigs/ftx1.toml]; captobie dice estereo con
  Main a la izquierda y Sub a la derecha en recepcion dual, ligado al receptor
  fisico aunque se intercambie en el panel, y que `SV` los mueve solo en
  recepcion dual [captobie-ftx1-remote:CLAUDE.md]
  [captobie-ftx1-remote:Pi/README.md].
- Frecuencia de muestreo: ALSA dsnoop/dmix de captobie a 2 canales, 48000 Hz,
  S16_LE ("estimacion inicial", sin confirmar)
  [captobie-ftx1-remote:Pi/asound-ftx1.conf]; CLAUDE.md cita tambien captura
  estereo a 44.1 kHz y 48 kHz en los datos de Windows
  [captobie-ftx1-remote:CLAUDE.md]. `YaesuCatBackendConfig` de rigplane admite
  `audio_sample_rate`, `rx_device` y `tx_device`
  [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md].
- Para enviar audio de TX desde el PC hace falta MOD SOURCE = USB (`RADIO SETTING, MODE SSB/AM/FM/DATA, MOD SOURCE`: MIC, USB, Bluetooth, AUTO; en
  PRESET: MIC, USB, REAR, AUTO). **Desacuerdo/errata**: el valor 2 es REAR en el
  preset y Bluetooth por modo. Ademas `USB MOD GAIN` (vigilar el ALC)
  [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md]
  [captobie-ftx1-remote:ftx1-cat-manual-errata.md]
  [captobie-ftx1-remote:Pi/README.md].
- Rigplane no usa scope por hardware para el FTX-1; el panadapter sale del audio
  RX [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md].

**Tiempos y latencia**

- `post_write_delay` de Hamlib = 50 ms; captobie usa 10 (27 mil respuestas
  limpias en Mac, 17 mil en Pi; 0 o 5 dieron respuestas desfasadas a veces). La
  radio responde en ~5 ms; una lectura ~14 ms con retardo 10. `rigctld -m 1051 -r <puerto> -s 115200 -t 4532 -o -C post_write_delay=10` (`-o` hace falta para
  argumentos VFO) [captobie-ftx1-remote:CLAUDE.md]
  [captobie-ftx1-remote:Pi/README.md].
- fritzsche: minimo 50 ms entre comandos; MW no responde, esperar despues
  [fritzsche-yaesu-ftx1:cat_format.md]. gnfrazier: 0.1 s tras abrir, 0.05 s tras
  escribir, lectura con 1.0 s de timeout [gnfrazier-ftxcat:ftxcontrol.py].
  bg7nzl: 2 ms tras escribir, `read_until(;)`, timeout 1.0 s, medidores a ~1 Hz
  [bg7nzl-ftx1ctl:ftx1cat.py] [bg7nzl-ftx1ctl:docs/user_manual_en.md].
  ew1abz: timeout de lectura 200 ms y sondeo de la TUI cada 500 ms
  [ew1abz-yaesu-ftx-1-memory-manipulator:src/main.rs]
  [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs]
  [ew1abz-yaesu-ftx-1-control:ftx1-ctl/src/app.rs].
- Rigplane: niveles de sondeo vivo (frecuencia/modo) 1.0 s y nivel lento con TTL
  de 120 s; un cliente CAT externo pausa el sondeo
  [rigplane-rigplane-core:rigs/ftx1.toml].
- Otras apps: PR2EM 0.8 s de timeout de respuesta y 20 ms entre escrituras;
  ITM FIFO half-duplex con 1.2 s de timeout y 40 ms de ritmo; WebUI un solo
  comando en vuelo, lectura 350 ms, ajustes esperan 12 ms por `?;` (150 ms en
  sintonizador); RZO 1.5 s (2 s para ID) y 40 ms entre consultas iniciales; POK
  sondeo rapido 200 ms, lento 1500 ms, niveles 6000 ms; SEM 1 s de timeout
  [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/transport.py]
  [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatConnection.cs]
  [git-jcw-FTX-1-WebUI:js/cat/cat-link.js]
  [rzochowski-cat-ftx1:serial-server.mjs] [pokibon3-FTX1Controller:js/ftx1.js]
  [Semyonic-ftx1-programmer:src/cat/transport.ts].
- Un escaneo de memorias va a ~9-10 canales/s
  [captobie-ftx1-remote:CLAUDE.md]. Durante TX, modo y split se rechazan con
  `?;` y la frecuencia se acepta [rigplane-rigplane-core:rigs/ftx1.toml].

**Informacion automatica (AI)**

- `AI0;`/`AI1;` existe [gnfrazier-ftxcat:ftxcontrol.py]
  [rigplane-rigplane-core:rigs/ftx1.toml]. Ningun repositorio describe el
  formato no solicitado. SEM, WebUI y este proyecto apagan AI al conectar y
  sondean; RZO prueba `AI1;` y vuelve a sondear si no hay ack
  [Semyonic-ftx1-programmer:src/cat/commands.ts]
  [git-jcw-FTX-1-WebUI:js/radio.js] [rzochowski-cat-ftx1:serial-server.mjs].

**Otros hechos**

- Rigplane: `has_lan=false`, 2 receptores, potencia maxima 100 W y minima 5 W,
  esquema VFO unico `ab_shared`
  [rigplane-rigplane-core:rigs/ftx1.toml]
  [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md].
- Consejo de copia: guardar memoria y configuracion en la tarjeta SD antes de
  usar scripts; la radio es "temperamental" y puede hacer falta un reset
  completo [gnfrazier-ftxcat:README.md].
- El escalado de medidores de Optima/SPA-1 en bg7nzl es inexacto
  [bg7nzl-ftx1ctl:docs/user_manual_en.md].
- Android: PR2EM-A y Look4Sat enumeran todos los puertos y piden permiso en
  ejecucion; BYF filtra por 10C4:EA70 en `usb_device_filter.xml`; EUG usa el
  primer driver y puerto para CAT y deja el lector del puerto DATA apagado
  porque gestores concurrentes rompian la fiabilidad del CAT
  [evertonma-FTX-1CAT_PR2EM_Android:app/src/main/java/com/pr2em/ftx1cat/CatRadio.kt]
  [byf3332-Yaesu-FTX1-Cat-Tunnel:app/src/main/res/xml/usb_device_filter.xml]
  [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java]
  [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1Controller.kt].
- Web Serial: WebUI y SEM filtran por VID 0x10C4; POK pide el puerto sin filtro
  [git-jcw-FTX-1-WebUI:js/cat/transport.js]
  [Semyonic-ftx1-programmer:src/cat/transport.ts]
  [pokibon3-FTX1Controller:js/serial.js].

## Formato de memorias y como se leen y escriben

**Identificadores y rangos de canal**
[ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs]

- 00001-00999 canales de memoria; `P-01L`...`P-50U` PMS; 50001-50020 banda de 5
  MHz; `EMGCH` emergencia. Los identificadores son de 5 caracteres en
  MR/MW/MT/MZ.
- Tipo de canal (posicion 25 de MR/MW): 0 VFO, 1 Memory Channel, 2 Memory Tune,
  3 QMB, 4 reservado, 5 PMS. La tabla de MW de fritzsche coincide; su texto de
  MR solo lista 0/1/2 [fritzsche-yaesu-ftx1:cat_format.md].
- Codigos `VM`: 00 VFO, 10 MT, 11 Memory, 20 PMS, 21 P-01L..P-50U, 51 banda de 5
  MHz, 91 EMG
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md].
- Conflicto de rango: MC 00001-00099 frente a MR/MW/MZ 00001-00999
  [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md]; el perfil de rigplane solo
  lista canales 1-99 [rigplane-rigplane-core:rigs/ftx1.toml]; el CSV de huecos
  habla de hasta 09999 de MC
  [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv];
  gnfrazier comenta "MC P2 = 00001-00099"
  [gnfrazier-ftxcat:ftxcontrol.py]. captobie vio 277-278 canales en su radio
  [captobie-ftx1-remote:CLAUDE.md]. Los canales HOME no se pueden leer ni
  recuperar por CAT.

**Registro MR/MW (27 caracteres de parametros tras `MR`/`MW`; 30 con `;`)**
[fritzsche-yaesu-ftx1:cat_format.md]
[ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md]

| Posicion (desde 1) | Campo |
|---|---|
| 1-2 | `MR`/`MW` |
| 3-7 | canal (5) |
| 8-16 | frecuencia en Hz (9) |
| 17 | signo del clarificador `+`/`-` (MR puede mostrar `S`; en MW debe ser `+`/`-`) |
| 18-21 | desplazamiento del clarificador en Hz (4); ew1abz: -9990..+9990 |
| 22 | clarificador RX 0/1 |
| 23 | clarificador TX 0/1 |
| 24 | modo (codigos de MD) |
| 25 | tipo de canal (arriba) |
| 26 | tipo de SQL: 0 OFF, 1 CTCSS ENC/DEC, 2 CTCSS ENC, 3 DCS, 4 PR FREQ, 5 REV TONE |
| 27-28 | fijo `00` (ew1abz: "sin cartografiar", podria codificar ARS/split/M-GRP) |
| 29 | shift 0 simplex, 1 mas, 2 menos (MW tambien `3` ARS segun ew1abz `to_mw_char`) |
| 30 | `;` |

- Ejemplo `MR00008145675000+000000412002;`
  [fritzsche-yaesu-ftx1:cat_format.md]. Respuesta de prueba de ew1abz-control
  `IF00000014074000-050010200000;`
  [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs].
- **Desacuerdo/errata**: la nota de MR en la seccion MA de fritzsche dice "modo
  de tono en la posicion 18" (errata; la tabla de MR dice 26)
  [fritzsche-yaesu-ftx1:cat_format.md].
- Intercambio de codigos SQL frente a CT: en MW/MR 1 = ENC/DEC y 2 = ENC; en CT
  1 = ENC (TONE) y 2 = ENC/DEC (TSQL); `CmdCt::set` los intercambia
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md]
  [fritzsche-yaesu-ftx1:cat_format.md].
- ARS: se guarda con `OS` P2=3; MR no lleva la marca ARS, asi que las lecturas
  devuelven la direccion resuelta (mas/menos)
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md].

**Campos admitidos y no admitidos**
[ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md]

- Admitidos: numero de canal, frecuencia RX, direccion del desplazamiento, modo
  (17), clarificador, tipo de SQL, tono CTCSS (CN, 50 tonos), DCS (104 codigos),
  nombre (12 ASCII), ARS y frecuencia de TX en split (MZ).
- No admitidos: frecuencia de desplazamiento (menu EX por banda: 28 MHz 0-1000
  kHz en pasos de 10 kHz, 50 MHz 0-4000 kHz en pasos de 10 kHz, 144 y 430 MHz
  0-100 MHz en pasos de 50 kHz), M-GRP, IPO/preamp, DNF, DNR, narrow, atenuador,
  nivel NB, AGC (todos globales por lado o banda, no por canal); compresor y EQ
  de voz tampoco son por canal
  [ew1abz-yaesu-ftx-1-memory-manipulator:README.md].

**Herramienta ew1abz-yaesu-ftx-1-memory-manipulator (`ftx1-mm`)**

- Columnas CSV: Channel Number, Frequency (Hz), Memory Tag, Mode, Channel Type,
  Squelch Type, Shift (Hz), Clarifier Offset (Hz), Rx Clarifier Enabled, Tx
  Clarifier Enabled, CTCSS Tone, DCS Tone; opcional `Split TX (Hz)`
  [ew1abz-yaesu-ftx-1-memory-manipulator:src/main.rs]
  [ew1abz-yaesu-ftx-1-memory-manipulator:chirp_ft897_to_ftx1.py]
  [ew1abz-yaesu-ftx-1-memory-manipulator:README.md].
- Nombres de SQL en el CSV: `CtcssOff`, `CtcssEnc` (TONE de la radio),
  `CtcssEncDec` (TSQ), `Dcs`; desplazamientos `Simplex`, `PlusShift`,
  `MinusShift`, `Ars`; tipo de canal `MemoryChannel`, etc.; marcas de
  clarificador `RxClarifierOff/On`.
- Lectura: bucle `MR` + `MT` (+ `CN`, `MZ`) por canal a CSV. Escritura: CSV a
  `MW`/`MT` por canal (**ESCRIBE EN LA RADIO**)
  [ew1abz-yaesu-ftx-1-memory-manipulator:CLAUDE.md].
- Secuencia de escritura por canal (13 pasos): `MW` (crea la ranura), `VM` P2=11,
  `MC`, `VM` P2=00, `MD` FM, `OS` shift, `MD` modo real, `FA`, `CT`, `CN` CTCSS,
  `CN` DCS, `AM` (confirma), `MT` nombre (`MZ` despues de `AM` si hay split)
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md].
- Es aditiva: solo toca los canales del CSV y no borra. Validada con un viaje de
  16 canales lectura, escritura y lectura byte a byte identico
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md].
- Opciones: `--read-radio`, `--write-radio`, `--check-data`, `--print`,
  `--port` (por defecto `/dev/ttyUSB0`), `--speed` (38400), `--file`,
  `--allow-any-frequency`
  [ew1abz-yaesu-ftx-1-memory-manipulator:README.md].
- **REGION/LIMITES TX** (blando): validacion de 30 kHz-174 MHz y 400-470 MHz;
  `--allow-any-frequency` la salta (radios modificadas MARS-CAP, SATCOM,
  hueco 174-400 MHz)
  [ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs].
- Se permiten canales no contiguos; las lineas `#` son comentarios; la hoja de
  calculo quita ceros a la izquierda y `.0` (la herramienta rellena a 5 y
  empareja el tono por valor)
  [ew1abz-yaesu-ftx-1-memory-manipulator:README.md].
- Conversion CHIRP (`chirp_ft897_to_ftx1.py`): FM a FM, NFM a FM-N, AM, LSB, USB,
  CW a CW-U, DIG a DATA-U, PKT a DATA-FM; duplex ""/+/- a
  Simplex/PlusShift/MinusShift; Tone ""/Tone/TSQL/DTCS a
  CtcssOff/CtcssEnc/CtcssEncDec/Dcs; nombre truncado a 12. Se omiten con motivo
  en stderr: DV (D-STAR), WFM, tono cruzado, TSQL-R/DTCS-R, duplex split,
  frecuencia o ubicacion invalida
  [ew1abz-yaesu-ftx-1-memory-manipulator:chirp_ft897_to_ftx1.py]. Renumerar:
  `renumber_channels.py`
  [ew1abz-yaesu-ftx-1-memory-manipulator:renumber_channels.py].

**Herramienta fritzsche-yaesu-ftx1 (programador de memorias)**

- Estrategias de subida (**ESCRIBE EN LA RADIO**): (1) analogico sin tono:
  `VM000;`, `FA...;`, `MW...;`; (2) analogico con tono/DCS: `MW`, `CT0x`, `CN...`,
  `MC0nnnnn`, `AM;` (orden de la doc) frente al orden de CLAUDE.md `MW`,
  `MC0nnnnn`, `VM000`, `MA`, `CT`, `CN`, `AM` (**el orden difiere entre**
  [fritzsche-yaesu-ftx1:cat_format.md] y [fritzsche-yaesu-ftx1:CLAUDE.md]); (3)
  digital C4FM/DN: `MD0H;` y luego `MW` directo.
- Etiqueta "Indicativo-Ciudad" de hasta 12 caracteres; las dieresis pasan a ASCII
  con `CharConverter.js` [fritzsche-yaesu-ftx1:CLAUDE.md]. MC de 6 digitos
  (`MC000011`), MR de 5 [fritzsche-yaesu-ftx1:CLAUDE.md].
- **REGION/LIMITES TX** (blando): la validacion salta frecuencias fuera de HF
  0.1-174, VHF 174-350, aire 350-400 y UHF 400-524 MHz
  [fritzsche-yaesu-ftx1:CLAUDE.md]. **Desacuerdo** con la cobertura de fabrica de
  ew1abz (30 kHz-174 y 400-470 MHz).
- Formatos CSV: CHIRP (`--chirp-csv`) con `Location,Name,Frequency,Duplex,Offset, Tone,rToneFreq,cToneFreq,DtcsCode,DtcsPolarity,Mode,TStep,Skip,Comment`; y el
  de relais.dl3el.de (`--csv`) separado por `;` con coma decimal alemana, sin
  campo Location (`--start-mem` numera); DMR, D-Star y Tetra se excluyen. Hay una
  incoherencia en la doc entre `--start-mem` y `--mem-start`
  [fritzsche-yaesu-ftx1:csv_formats.md].
- Descarga/verificacion: `node js/download.js [--verify]` exporta a CHIRP;
  verificar compara MR con la relectura `MC` + `FA`
  [fritzsche-yaesu-ftx1:CLAUDE.md]. `MA` carga solo la frecuencia; `AM`/`BM`
  guardan el estado real del VFO. La subida no admite borrado
  [fritzsche-yaesu-ftx1:csv_formats.md].

**Otras herramientas**

- captobie: lista con `MR` y `MT`, un canal vacio responde `?;` y se detiene
  tras 100 vacios seguidos; `VM011` falla salvo `MC0` justo antes. Escribe
  memoria del manipulador (`KM`), el menu de tipo de memoria CW y ajustes
  profundos por `EX` (**ESCRIBE EN LA RADIO**); los elementos de accion del
  catalogo (incluidos CALIBRACION/RESET) nunca se envian
  [captobie-ftx1-remote:CLAUDE.md].
- gnfrazier: VFO/memoria con `VM P1;`, `MC`, `MA`, `MB`; sin CSV ni masivo
  [gnfrazier-ftxcat:ftxcontrol.py].
- ew1abz-control: memorias de frecuencia locales en TOML (`[[freq_memory]]`),
  no de la radio [ew1abz-yaesu-ftx-1-control:README.md].
- rigplane: lista de memorias de solo lectura (`MR` + `MT`, canales 1-99); las
  familias de escritura estan planificadas
  [rigplane-rigplane-core:rigs/ftx1.toml]
  [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv].
- PR2EM y SEM: editores de memoria con CSV (SEM tambien importa ADMS-14 y FT5D
  `.dat`); PR2EM relee para confirmar tras `MW`; SEM limita los canales
  gestionados a 1-99 y la lectura a 1-999 (**ESCRIBE EN LA RADIO**)
  [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py]
  [Semyonic-ftx1-programmer:src/cat/codec.ts]
  [Semyonic-ftx1-programmer:src/io/adms14-csv.ts]
  [Semyonic-ftx1-programmer:src/io/ft5d-dat.ts].

## Herramienta de region y rangos de TX

Solo resumen. **ESCRIBE EN LA RADIO** **REGION/LIMITES TX** **CALIBRACION**.
Este proyecto no la usa, no la automatiza y no la reproduce. Para detalles hay
que ir al repositorio original
(`https://github.com/Evgeny161rus/ftx1-region-tool`, copia en
`third_party/ftx1/Evgeny161rus-ftx1-region-tool`).

**Que es.** Una herramienta de linea de comandos en Python que usa comandos de
servicio no documentados, presentes en el firmware MAIN pero ausentes del manual
CAT, para leer y escribir bytes sueltos de la EEPROM de la radio. Los bytes que
modifica estan junto a la tabla de calibracion de fabrica
[Evgeny161rus-ftx1-region-tool:README.md]
[Evgeny161rus-ftx1-region-tool:ftx1_region.py]. Solo toca la EEPROM por esos
comandos de servicio (`SPR` lectura, `SPW` escritura); no usa menus ni comandos
normales.

**Que cambia, en concepto.** El codigo de destino o region de la radio. De ese
codigo depende la tabla de bandas en las que el firmware permite transmitir.
Cambiarlo amplia o recorta los rangos de TX; la herramienta documenta tablas
distintas por region (estrecha por bandas de aficionado, mas ancha, o casi
continua). La propia herramienta advierte de que una region muy ancha puede
ofrecer rangos donde el trayecto de RF no esta pensado para funcionar
[Evgeny161rus-ftx1-region-tool:README.md]. Esta hecha para una version concreta
del firmware MAIN (V01.13); en otras versiones hay que volcar primero porque las
direcciones y los codigos pueden diferir.

**Salvaguardas de la herramienta.** Volcado previo de la EEPROM con sumas de
verificacion; copia automatica antes de escribir (aborta si no se puede leer);
rechazo de un codigo actual desconocido salvo que se fuerce; modo de simulacion;
confirmacion explicita; relectura con reintentos tras escribir; hace falta apagar
y encender del todo la radio despues
[Evgeny161rus-ftx1-region-tool:README.md]. Una orden generica de escritura
permite alcanzar cualquier byte, incluida la calibracion
[Evgeny161rus-ftx1-region-tool:README.md]. Versiones antiguas tenian un fallo de
lectura que producia volcados y copias corruptos.

**Riesgos.**

- Perdida de calibracion: se escribe EEPROM de servicio junto a ella; el volcado
  completo previo es la unica red de seguridad.
- Legal y homologacion: transmitir fuera de lo que permite la licencia o la
  homologacion de tipo es responsabilidad del usuario; cambiar la region puede
  incumplirlas [Evgeny161rus-ftx1-region-tool:README.md].
- Garantia: el cambio puede anular la garantia
  [Evgeny161rus-ftx1-region-tool:README.md].
- El autor lo ofrece "tal cual" y rechaza responsabilidad por danos, perdida de
  datos o mal funcionamiento [Evgeny161rus-ftx1-region-tool:README.md].
- Si el firmware restaura el codigo al arrancar, el repositorio indica que haria
  falta un programador externo y editar un volcado
  [Evgeny161rus-ftx1-region-tool:README.md].

**Como revertir, en concepto.** Volver a poner el codigo de region original
(guardado en el volcado previo) con la misma herramienta, y reiniciar la radio.
Si hubo danos en la calibracion, restaurar desde el volcado completo o recurrir a
un servicio tecnico de Yaesu.

**En este proyecto.** `SPR`/`SPW`, cambios de region o limites de TX y toda
escritura de calibracion estan excluidos a proposito.

## Firmware (Reid-n0rc)

Solo resumen. **FIRMWARE**. Este proyecto no carga, no parchea y no prepara
firmware.

Hechos del repositorio `Reid-n0rc-FTX-1_Firmware`
[Reid-n0rc-FTX-1_Firmware:README.md] [Reid-n0rc-FTX-1_Firmware:AGENTS.md]:

- Estado: "recien empezado, nada decodificado". `decomp/` solo contiene
  `.gitkeep`; las tareas T01-T11 estan en `todo` y sus apartados de hallazgos
  estan vacios [Reid-n0rc-FTX-1_Firmware:decomp/.gitkeep]
  [Reid-n0rc-FTX-1_Firmware:docs/tasks/T04-container-decode.md].
- El microcontrolador no esta identificado (la encuesta de hardware T03 esta
  pendiente). Los chips del FT-710 solo aparecen como hipotesis de comparacion
  [Reid-n0rc-FTX-1_Firmware:docs/tasks/T03-hardware-survey.md].
- Imagenes (no verificado, blog de un minorista de marzo de 2026): DISPLAY
  V01-09, MAIN V01-12, DSP V01-07, SDR V01-06; posible imagen separada para la
  cabeza de campo y el cuerpo amplificador (Optima)
  [Reid-n0rc-FTX-1_Firmware:docs/tasks/T02-sources.md]
  [Reid-n0rc-FTX-1_Firmware:AGENTS.md]. Otras fuentes citan MAIN 01-13 y
  DISPLAY 01-10 como las ultimas
  [sq9pd-Yaesu-FTX-1-mod:README.md].
- Contenedor: desconocido en este repositorio; hipotesis tipo FT-710 (`.SFL`
  con cabecera ASCII, etiqueta de tamano y CRC, y carga util codificada). Otro
  repositorio (sq9pd) confirma en la practica un formato de ese estilo
  [Reid-n0rc-FTX-1_Firmware:docs/tasks/T04-container-decode.md]
  [sq9pd-Yaesu-FTX-1-mod:patch.py].
- Procedimiento de actualizacion: no esta documentado en este repositorio (T06
  pendiente); en el FT-710 la CPU de DISPLAY lee la tarjeta SD, sin comprobar en
  el FTX-1 [Reid-n0rc-FTX-1_Firmware:docs/tasks/T06-update-path.md]. En resumen,
  la actualizacion oficial de Yaesu es la unica via soportada; los archivos de
  firmware oficiales y los de terceros se cargan siguiendo el proceso de Yaesu
  [sq9pd-Yaesu-FTX-1-mod:README.md].
- Herramientas: Ghidra 12.1.4 sin interfaz grafica y scripts de nombres y
  exportacion [Reid-n0rc-FTX-1_Firmware:tools/README.md]. No hay hallazgos
  sobre CAT en este repositorio; T07 planea comparar la tabla CAT documentada con
  la del firmware [Reid-n0rc-FTX-1_Firmware:docs/tasks/T07-cat-commands.md].
- Los manuales, imagenes decodificadas y proyectos de Ghidra no se versionan; el
  firmware sigue siendo de Yaesu [Reid-n0rc-FTX-1_Firmware:AGENTS.md] [SOURCES.md].
- Regla del repositorio: ninguna escritura en la radio sin aprobacion del
  propietario cada vez (carga de firmware, EEPROM, comandos CAT sin probar)
  [Reid-n0rc-FTX-1_Firmware:AGENTS.md].

**Riesgos.** Una actualizacion interrumpida o fallida puede perder ajustes o
dejar la radio inservible; conviene guardar memorias y ajustes antes y conservar
el firmware original. Un firmware de terceros no esta aprobado por Yaesu. La
version de firmware se puede leer sin riesgo con `VE`
[sq9pd-Yaesu-FTX-1-mod:README.md] [gnfrazier-ftxcat:ftxcontrol.py].

## Modificaciones de hardware y tapa frontal

Resumen. No se reproducen parches ni datos de parcheo.

**Tapa frontal protectora (radiohyperactivity).** Archivos de apoyo para una
tapa casera para la FTX-1 Field: plantillas de espuma PE (A4 y US Letter, SVG y
PDF), fuentes FreeCAD y STL imprimibles (plantillas de espuma de 1 a 5 mm y
carcasa de 20 a 40 mm de fondo en pasos de 2 mm). No hay modificacion electrica
ni escritura en la radio [radiohyperactivity-ftx1-front-cover:README.md].

**Modificacion sq9pd (firmware de terceros).** **FIRMWARE**
**ESCRIBE EN LA RADIO** (el usuario tendria que cargar el resultado con el
proceso de actualizacion de Yaesu; la herramienta solo prepara archivos). No es
oficial ni esta aprobada por Yaesu. Resumen de lo que ofrece
[sq9pd-Yaesu-FTX-1-mod:README.md]:

- Parte de los firmware oficiales MAIN 01-13 y DISPLAY 01-10 y acepta solo esos
  archivos de entrada exactos (comprobaciones de tamano y huella; rechaza
  archivos ya modificados) [sq9pd-Yaesu-FTX-1-mod:manifest.json]
  [sq9pd-Yaesu-FTX-1-mod:patch.py].
- Cuatro paginas de cinco botones configurables en la fila inferior, 70
  funciones asignables, reloj en la barra superior, boton de scan nativo y
  atajos (APRS, FIL/NOTCH/NB/AMC), y dos correcciones menores (BEEP LEVEL = 0 sin
  pitidos mudos y una errata "DELY").
- **SWR SCAN**: **transmite RF** mientras barre (101 puntos). Exige modo VFO,
  sintonizador apagado y sin SPLIT/RIT/XIT; fuerza AM y potencia baja; no recorta
  el barrido a los limites de banda, asi que todo el rango debe ser legal para
  transmitir (**REGION/LIMITES TX**, responsabilidad del usuario); no anade corte
  por SWR alto; el TOT de fabrica de 60 s sigue activo; durante el barrido el
  CAT bloquea cambios y el arranque de TX.
- Corre sin conexion (Python 3.9+ o pagina del navegador); sin subidas ni
  analitica; los archivos originales no se distribuyen. Las pruebas de la
  herramienta indican que el parcheo interactivo en navegador "no esta probado
  aun" [sq9pd-Yaesu-FTX-1-mod:TEST_RESULTS.json].
- Riesgos: una actualizacion fallida puede perder ajustes o dejar la radio
  inservible; las salvaguardas "no pueden garantizar proteccion ante todo fallo";
  si el TX persiste, apagar la radio. Revertir: reinstalar MAIN y DISPLAY
  originales y hacer reset de fabrica (borra los ajustes de usuario).

Otras menciones de hardware: sintonizador externo mAT-30 por el conector
TUNER/LINEAR con cable mAT-CY
[hatandspecs-ftx1-tuner-sweep:docs/usage.md]; un programador externo CH341A como
recurso de la herramienta de region
[Evgeny161rus-ftx1-region-tool:README.md].

## Barrido del acoplador (tuner sweep)

**ATENCION: cada paso TRANSMITE.** **ESCRIBE EN LA RADIO** (cambia el VFO en
directo y activa el TX; no escribe memoria, menu ni EEPROM)
[hatandspecs-ftx1-tuner-sweep:README.md]. Este proyecto no implementa el barrido
ni arranca el sintonizador.

`hatandspecs-ftx1-tuner-sweep` es una aplicacion local en Flask
(`http://127.0.0.1:5000`) que recorre el VFO de la FTX-1 por las bandas elegidas
y dispara un sintonizador automatico externo para que guarde una memoria por
frecuencia (probado con un mAT-30, FTX-1 Optima, 15 m y 12 m)
[hatandspecs-ftx1-tuner-sweep:README.md] [hatandspecs-ftx1-tuner-sweep:docs/usage.md].

| Comando | Significado | Fuente |
|---|---|---|
| `FA<9 digitos Hz>;` | ajusta o lee la frecuencia MAIN | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |
| `AC103;` | inicia la sintonia del sintonizador externo (equivale a mantener [TUNER] 2 s); **transmite** | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] [hatandspecs-ftx1-tuner-sweep:AGENTS.md] |
| `AC101;` | detiene la sintonia y deja el sintonizador en el circuito | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |
| `RI;` | actividad del sintonizador (8 digitos, el sexto es tuning) | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |
| `PC;` | lee la potencia configurada | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |
| `MD0;` | lee el modo MAIN | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |

- Menu necesario en la radio: TUN/LIN PORT SELECT = EXT-TUNER y TUNER SELECT =
  EXT [hatandspecs-ftx1-tuner-sweep:docs/usage.md]. Serie 38400 8N1 por CAT-1.
- Algoritmo: por rango, frecuencias ordenadas (primera = borde inferior + 1 kHz,
  ultima = borde superior - 1 kHz, intermedias en una rejilla de 10 kHz); por
  frecuencia: `FA`, espera de 300 ms, `AC103;`, espera fija de 5 s sondeando
  `RI;` cada 300 ms, y siempre `AC101;`. `RI` no es fiable con sintonizadores
  externos (linea de disparo unidireccional), asi que no se confia en el fin de
  sintonia [hatandspecs-ftx1-tuner-sweep:app.py]
  [hatandspecs-ftx1-tuner-sweep:AGENTS.md].
- Los privilegios de banda salen de `bandplans.tsv` editable (EE. UU. exacto por
  clase; otros paises aproximados) o de rangos propios en Hz
  [hatandspecs-ftx1-tuner-sweep:docs/band-privileges.md].
- Seguridad: potencia recomendada de 5 W o menos y la app solo la lee; cada paso
  transmite unos 5 s; exige una lista de comprobacion previa; Parar termina el
  paso en curso; no detecta si la frecuencia esta ocupada; sin pruebas
  automaticas [hatandspecs-ftx1-tuner-sweep:docs/usage.md]
  [hatandspecs-ftx1-tuner-sweep:app.py] [hatandspecs-ftx1-tuner-sweep:AGENTS.md].

## Satelites y Look4Sat

`juanmmmmmmm-Look4Sat-FTX1` es un fork experimental de Look4Sat con "Yaesu
FTX-1" como modelo de radio, por USB OTG directo (sin PC ni rigctld). **ESCRIBE
EN LA RADIO** (VFO, modo, split y CTCSS); no se encontro **REGION/LIMITES TX**,
**CALIBRACION** ni **FIRMWARE**
[juanmmmmmmm-Look4Sat-FTX1:README.md].

- Modelo: MAIN = RX/bajada, SUB = TX/subida
  [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/RadioTrackingService.kt].
- Arranque: modo MAIN segun el modo de bajada, modo SUB segun el de subida;
  frecuencia SUB inicial = base de TX o mitad de la banda de subida; despues
  `FT1;` + `VS1;` (SUB como lado de TX).
- Comandos usados: `FA%09d;`, `FB%09d;`, `MD0<codigo>;`/`MD1<codigo>;`,
  `FT0/1;`, `VS0/1;`, `ST1/ST0;`, `CN10%03d;` (tono CTCSS en SUB, indice 000-049,
  solo tonos estandar con tolerancia de 0.05 Hz) y `CT11;`/`CT10;`; una
  comprobacion inocua `FA;` tras 150 ms al conectar
  [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt]
  [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1Controller.kt].
- Doppler: cada ciclo de 1 s calcula la posicion y la velocidad radial, mapea la
  base de subida a la bajada con el paso de banda del transpondedor lineal y
  aplica `getUplinkFreq`/`getDownlinkFreq`; el desfase de bajada del usuario se
  aplica antes del mapeo para la subida y despues para la bajada; solo
  transpondedores lineales
  [juanmmmmmmm-Look4Sat-FTX1:core/domain/src/main/java/com/rtbishop/look4sat/core/domain/utility/DopplerFrequencyCalculator.kt].
- Sintonia manual: lee FB/FA, compara con lo ultimo enviado (umbral de 20 Hz) y
  tras dos lecturas estables recalcula la base de TX y reanuda las correcciones.
- FM: CTCSS solo en el codificador de subida de SUB, configurable; el
  seguimiento no aplica solo un tono elegido.
- PTT: el software no lo envia nunca (`pttOn()` registra y devuelve falso);
  DTR/RTS forzados a falso; solo PTT fisico del microfono.
- `stopTracking()` solo cancela la tarea: **no restaura** frecuencia, modo,
  split, VFO ni CTCSS anteriores.

## Arquitecturas remotas, tunel y WebUI

| App | Diseno | Transporte y puertos | Seguridad y autenticacion | Latencia |
|---|---|---|---|---|
| evertonma-FTX-1CAT_PR2EM | Escritorio local; constructores y analizadores CAT separados de la interfaz Tk; hilo de trabajo con cola (agrupa por clave) | pyserial, solo local | Sin red ni autenticacion | Transporte con RLock; tramas no solicitadas a un callback [evertonma-FTX-1CAT_PR2EM:ftx1cat/ui/worker.py] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/transport.py] |
| evertonma-FTX-1CAT_PR2EM_Android | Android local; un solo ejecutor serializa el CAT | USB host serie | Solo permiso USB en ejecucion | Consultas bloqueantes con timeout; deslizadores con 90 ms de debounce [evertonma-FTX-1CAT_PR2EM_Android:app/src/main/java/com/pr2em/ftx1cat/CatRadio.kt] |
| Eugen68-Yaesu-FTX1-CAT-Control | Android local; CAT y DATA comparten una conexion USB | Puerto CAT + puerto DATA (RTS/DTR) + audio USB | Ninguna | Lecturas por eventos; lector DATA apagado para proteger el CAT [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java] |
| iTracMan-FTX1WinController | WPF: comandos, fachada asincrona, conexion serializada y transporte serie | Dos COM virtuales (CAT-1 y CAT-2 para PTT) | Local | FIFO, 1.2 s, 40 ms [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatConnection.cs] |
| pokibon3-FTX1Controller | PWA de navegador con Web Serial; DSP en AudioWorklet/Worker | Web Serial al Enhanced COM; Standard COM para tecla/PTT | Contexto seguro; sin autenticacion (local) | Ver seccion 3 [pokibon3-FTX1Controller:js/serial.js] |
| git-jcw-FTX-1-WebUI | Interfaz estatica con Web Serial y envoltorio Electron; cola en `cat-link.js` | Web Serial | Electron: permisos solo para paginas `file:`, aislamiento de contexto, sandbox, un solo ejemplar, enlaces externos al navegador; **sin puente IPC, sin autenticacion y sin CSP explicita en `main.cjs`** | Un comando en vuelo; los ajustes se priorizan y agrupan [git-jcw-FTX-1-WebUI:electron/main.cjs] [git-jcw-FTX-1-WebUI:js/cat/cat-link.js] |
| rzochowski-cat-ftx1 | Cliente Nuxt/Vue, rutas API de Nuxt y un servidor Node `serial-server.mjs` en `127.0.0.1:3001` con `serialport`; estado por **SSE** (`/events`, sin WebSocket) | HTTP y SSE en loopback; 8N1 con baudios configurables | Solo loopback pero CORS `*`; **sin autenticacion** | Cola con timeouts; consultas iniciales cada 40 ms; refresco de 150 ms tras ajustar [rzochowski-cat-ftx1:nuxt.config.ts] [rzochowski-cat-ftx1:serial-server.mjs] [rzochowski-cat-ftx1:server/api/command.post.ts] |
| Semyonic-ftx1-programmer | App TS de navegador (codec, comandos, transporte, stores, UI) | Web Serial | Modo simulacion (dry-run) por defecto y escrituras bloqueadas hasta "armar"; `PS0`, `TX1` y `MX1` exigen armado; sin confirmacion por operacion ni copia automatica [Semyonic-ftx1-programmer:src/store/connection.ts] [Semyonic-ftx1-programmer:src/cat/transport.ts] | Escrituras y consultas serializadas |
| byf3332-Yaesu-FTX1-Cat-Tunnel | **Tunel**: puente USB serie a TCP en crudo; servicio en primer plano | Servidor TCP en el puerto **4532**, escucha en `0.0.0.0`, **un cliente a la vez (uno nuevo sustituye al anterior)**; sin UDP, WebSocket, COM virtual ni rigctl | **Ninguna** (sin autenticacion ni cifrado) | TCP_NODELAY y keepalive; lectura USB 200 ms, escritura serie 2 s, lectura TCP 1 s; paso transparente de bytes [byf3332-Yaesu-FTX1-Cat-Tunnel:app/src/main/java/com/byf3332/cattunnel/CatTcpBridge.kt] [byf3332-Yaesu-FTX1-Cat-Tunnel:app/src/main/java/com/byf3332/cattunnel/CatBridgeService.kt] |
| juanmmmmmmm-Look4Sat-FTX1 | Android; controlador FTX-1 en `core:data`, un controlador USB compartido | USB serie | Permiso USB en ejecucion | Mutex de E/S serializa transacciones; bucle de 1 s [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/injection/MainContainer.kt] |
| captobie-ftx1-remote | Suite remota con `rigctld` de Hamlib (Mac/iOS/iPad, Windows, Pi como rele), flujo de audio de la Pi y rele de CW | `rigctld` TCP 4532; CW TCP 8534; audio Main izq./Sub der. | No evaluada en las notas | `post_write_delay` de 10 ms [captobie-ftx1-remote:CLAUDE.md] [captobie-ftx1-remote:Pi/README.md] |
| rigplane-rigplane-core | Biblioteca asincrona multirradio con interfaz web; backend `yaesu-cat` | USB CAT-1 (sin LAN) | No evaluada en las notas | Sondeo por niveles [rigplane-rigplane-core:rigs/ftx1.toml] |

Notas para este proyecto: el tunel TCP de BYF y el servidor local de RZO no
tienen autenticacion; cualquier solucion remota propia deberia exigir
autenticacion y limitar el acceso a la red local o a un tunel cifrado.

## Resumen por repositorio

| Carpeta | Proposito | Lenguaje | Licencia | Funciones |
|---|---|---|---|---|
| captobie-ftx1-remote | Suite de control remoto via Hamlib `rigctld` (Mac/iOS/iPad, Windows, Pi) con erratas del manual CAT | Swift, C#/WinUI3, Python, Arduino | MIT; los binarios de Hamlib en `Vendor/` son LGPL/GPL | Cliente Hamlib 1051, audio de la Pi, rele de CW (TCP 8534), lista y escaneo de memorias, catalogo EX, erratas verificadas |
| fritzsche-yaesu-ftx1 | Programador de memorias: subir y bajar listas de repetidores | JavaScript (Web Serial y CLI Node) | Sin licencia upstream ("tal cual"); permiso MIT segun el propietario, por el usuario | CSV CHIRP y relais.dl3el.de, estrategias MW/AM/CT/CN, descarga y verificacion, validacion de frecuencia |
| ew1abz-yaesu-ftx-1-control | TUI y biblioteca de sintonia y clarificador | Rust (`ftx1` y `ftx1-ctl`) | Sin licencia upstream; permiso MIT segun el usuario | `ID`/`FA`/`IF`/`OI`/`CF`, radio simulada, 38400, memorias TOML |
| ew1abz-yaesu-ftx-1-memory-manipulator | Copia y restauracion de memorias por CSV (`ftx1-mm`) | Rust y Python | MIT (solo en `Cargo.toml`) | Lectura MR/MT/CN/MZ, escritura MW+AM, conversor CHIRP, renumerar, diferencias CAT 2507-B y 2508-C |
| gnfrazier-ftxcat | Modulo Python de control CAT (experimental) | Python (pyserial) | MIT | Unas 45 funciones (frecuencia, modo, PTT, potencia, AGC, medidores, VFO/memoria, clarificador, CW, NB/DNR/DNF), guia de instalacion USB/CAT, notas WSL2 |
| bg7nzl-ftx1ctl | Consola grafica con medidores, cascada de audio, notch manual y servidor NET rigctl | Python | Sin licencia upstream; permiso MIT segun el usuario | CAT + PTT por RTS, conversion de medidores RM, notch BP, preamp PA, potencia PC, rigctl TCP 4532 para WSJT-X/JTDX |
| rigplane-rigplane-core | Biblioteca multirradio asincrona con interfaz web; FTX-1 por `yaesu-cat` | Python y Svelte/TS | MIT | Perfil `rigs/ftx1.toml`, auditoria CAT frente al manual (89 familias), guia USB, semantica MAIN/SUB |
| evertonma-FTX-1CAT_PR2EM | Herramienta de escritorio de control, memorias y menu | Python (Tkinter, pyserial) | PolyForm Noncommercial 1.0.0 (no compatible con GPL; solo referencia) | Controles rapidos, editor de memorias con CSV, editor de menu EX con copia JSON, simulador y pruebas |
| evertonma-FTX-1CAT_PR2EM_Android | Version Android: control CAT basico | Kotlin | PolyForm Noncommercial 1.0.0 | Frecuencia, modo, banda, 4 deslizadores, editor EX, selector de puerto USB |
| Eugen68-Yaesu-FTX1-CAT-Control | Suite Android de CAT, CW, RTTY y diario | Java, ONNX y biblioteca nativa | MIT | Decodificador CW con IA, RTTY, diario ADIF, cluster, PSK Reporter, audio USB, memorias de CW y voz |
| iTracMan-FTX1WinController | Controlador para Windows | C# / WPF | MIT | Panel de funciones completo, medidores, mensajes, presets, audio local, doble COM, pruebas xUnit |
| pokibon3-FTX1Controller | PWA de navegador con Web Serial | JavaScript (WASM para CW y FT8) | Sin licencia upstream; permiso MIT segun el usuario; `js/cwdec/` es GPL | Audio USB, cascada, decodificador y manipulacion de CW, FT8/FT4, menus FUNC/EX, memorias, PWA sin conexion, perfil FT-991A |
| git-jcw-FTX-1-WebUI | Interfaz Web Serial y aplicacion Electron | JavaScript | MIT | Cascada derivada del audio, 4 medidores, logica del sintonizador, memoria de bandas, potencia acotada, radio simulada |
| rzochowski-cat-ftx1 | Panel web local | Nuxt/Vue (TypeScript) y Node serialport | Sin licencia upstream; permiso MIT segun el usuario | Estado por SSE, controles de scope, presets, comando CAT manual, servidor en loopback (CORS `*`, sin autenticacion) |
| Semyonic-ftx1-programmer | Programador de memorias y menu en el navegador | TypeScript (prototipos JSX) | GPL-3.0 | Edicion de memorias y EX, importacion CSV/ADMS-14/FT5D, simulacion y armado, consola de depuracion |
| byf3332-Yaesu-FTX1-Cat-Tunnel | Puente Android USB serie a TCP | Kotlin | WTFPL 2 | Tunel TCP crudo 4532 sin autenticacion, filtro 10C4:EA70 |
| juanmmmmmmm-Look4Sat-FTX1 | Seguimiento de satelites con control Doppler de la FTX-1 | Kotlin (Android) | GPL-3.0 | Doppler MAIN/SUB a 1 s, CTCSS, deteccion de sintonia manual, sin PTT por software |
| Evgeny161rus-ftx1-region-tool | Lee y escribe EEPROM y cambia el codigo de region por CAT | Python | Sin licencia upstream; permiso MIT segun el usuario | Comandos de servicio no documentados, volcado de EEPROM, copia automatica, interfaz RU/EN. **ESCRIBE EN LA RADIO** **REGION/LIMITES TX** |
| Reid-n0rc-FTX-1_Firmware | Proyecto de analisis de firmware | Markdown, Java (Ghidra), Python, shell | Sin licencia upstream; permiso MIT segun el usuario; el firmware sigue siendo de Yaesu | Tablero de tareas T01-T11 sin hallazgos, scripts de Ghidra. **FIRMWARE** |
| sq9pd-Yaesu-FTX-1-mod | Parcheador offline de firmware MAIN 01-13 / DISPLAY 01-10 | Python y JavaScript | Sin licencia upstream; permiso MIT segun el usuario | Paginas de botones, SWR SCAN, parcheo con comprobacion de huella. **FIRMWARE** |
| radiohyperactivity-ftx1-front-cover | Tapa frontal protectora casera para FTX-1 Field | CAD (FreeCAD, STL, SVG) | GPL-3.0 | Plantillas de espuma PE, carcasas imprimibles de 20 a 40 mm |
| hatandspecs-ftx1-tuner-sweep | Barrido de VFO que dispara un sintonizador externo | Python (Flask) y HTML | MIT | FA/AC/RI/PC/MD, bandas segun licencia, margen de 1 kHz, espera fija. **TRANSMITE** |

Las licencias de la columna Licencia salen de `third_party/ftx1/SOURCES.md`.
El permiso MIT "segun el usuario" no esta por escrito en este repositorio
[SOURCES.md]. El codigo PolyForm Noncommercial (evertonma) solo se conserva como
referencia y no se copia a este proyecto GPL-3.0 [SOURCES.md].

## Comparativa con Bricohams

Lo que existe viene de las notas de este proyecto: la herramienta web/escritorio
(`ftx1.html`, `ftx1-core.js`, `ftx1-menu.js`, `ftx1-ui.js`) por Web Serial y
RadiCodex en Android (`RigActivity`, `YaesuFtx1` y `Ftx1Rig` en
`RigProtocols.kt`). Toda escritura se comprueba de rango antes de enviar y se
verifica releyendo. Reglas de este trabajo: solo recepcion y VFO; nada activa el
transmisor.

Valores de "Estado en esta rama": "Ya existia", "Anadido" (funciones
planificadas) o "Fuera de alcance (motivo)".

| Funcion | Repos que la tienen | Web/escritorio | Android | Estado en esta rama |
|---|---|---|---|---|
| Conectar e identificar (`ID;` = `ID0840;`, `AI0;`) | Casi todos | Si | Si | Ya existia |
| Leer frecuencia VFO A/B | Casi todos | Si (`FA;`/`FB;`) | Si | Ya existia |
| Ajustar frecuencia VFO A/B con verificacion | Casi todos | Solo API, sin control en la interfaz | Si | Anadido (panel VFO en web); en Android ya existia |
| Modo MAIN (`MD0 m;`) | Casi todos | No | Si | Anadido (web, con relectura); en Android ya existia |
| Split `ST0`/`ST1` | ITM, Look4Sat, SEM, rigplane | No | Si (seguimiento por satelite) | Anadido (web); en Android ya existia |
| Leer y escribir memorias 1-999 | fritzsche, ew1abz-memory, PR2EM, SEM, POK | Si | Si (una a una) | Ya existia |
| Copia/restauracion JSON y CSV de memorias | ew1abz-memory, fritzsche, PR2EM, SEM | Si | No | Ya existia (web). Android: fuera de alcance (no planificado en esta rama) |
| Menu EX: leer, escribir, copia y diferencias | PR2EM, SEM, POK, captobie, RZO | Si (elementos de solo lectura rechazados) | No | Ya existia (web). Android: fuera de alcance (no planificado en esta rama) |
| AF, RF, SQL, ancho, IF shift, AGC, preamp, atenuador y potencia (web) | gnfrazier, rigplane, WebUI, ITM, bg7nzl | Si, con relectura | - | Ya existia |
| AF, RF, SQL, ancho, IF shift, AGC, preamp, atenuador y potencia (Android) | Los mismos | - | Existen en `Ftx1Rig` pero sin pantalla | Anadido (conexion en `RigActivity`) |
| Medidores `RM1`-`RM8` (web) | WebUI, bg7nzl, PR2EM, ITM, rigplane | Si, cada 1 s | - | Ya existia |
| Medidores `RM1`-`RM8` (Android) | Los mismos | - | Solo S-meter MAIN | Anadido (en `RigActivity`; `supportsMeter` y `supportsRfPower` para `Ftx1Rig`) |
| Noise blanker `NL` (OFF/001-010) | gnfrazier, PR2EM, WebUI | No | No | Anadido (web y Android) |
| DNR `RL` (OFF/01-10) | gnfrazier, PR2EM, EUG, ITM | No | No | Anadido (web y Android) |
| Auto notch `BC` OFF/ON | WebUI, ITM, rigplane | No | No | Anadido (web y Android) |
| Notch manual `BP` (estado P2=0; frecuencia 001-320 x10 Hz con P2=1; en FM la respuesta no numerica es null) | bg7nzl, WebUI, ITM, rigplane | No | No | Anadido (web y Android) |
| Narrow `NA` OFF/ON | gnfrazier, WebUI, SEM | No | No | Anadido (web y Android) |
| Clarificador `CF` (on/off y desplazamiento -9999..+9999 Hz) | gnfrazier, ew1abz-control, ITM | No | No | Anadido (web y Android) |
| Velocidad de CW `KS` (4-60 WPM) | gnfrazier, WebUI, ITM, EUG | No | No | Anadido (web y Android) |
| Bloqueo de panel `LK` OFF/ON | gnfrazier, SEM, RZO, POK | No | No | Anadido (web y Android) |
| Memorias split `MZ` | ew1abz-memory, SEM | No | Si | Ya existia (Android). Web: fuera de alcance (no planificado en esta rama) |
| PMS, banda de 5 MHz, EMGCH | ew1abz-memory, SEM | No | No | Fuera de alcance (no planificado en esta rama) |
| Borrar un canal de memoria | ninguno (sin comando documentado) | No | No | Fuera de alcance (no hay comando documentado) |
| PTT (`TX`/`MX`), pulsacion de CW (`KY`, `PB`, rele de CW) | bg7nzl, gnfrazier, EUG, captobie, ITM | No | Prueba de PTT de 3 s existente | Fuera de alcance (activa el transmisor) |
| Arranque del sintonizador (`AC` P3=3) y barrido del acoplador | WebUI, ITM, hatandspecs | No | No | Fuera de alcance (activa el transmisor) |
| Cambio de banda `BS`/`BU`/`BD` e intercambio `AB`/`BA`/`SV` | PR2EM, ITM, WebUI, SEM, POK | No | No | Fuera de alcance (solo ajuste, no se puede verificar) |
| `SPR`/`SPW` (EEPROM de servicio) | Evgeny161rus-ftx1-region-tool | No | No | Fuera de alcance (escribe EEPROM de servicio) |
| Cambio de region y limites de TX | Evgeny161rus-ftx1-region-tool | No | No | Fuera de alcance (cambia las bandas de TX, legal y garantia) |
| Calibracion | ninguno (solo reset/calibracion en el menu EX) | No | No | Fuera de alcance (riesgo de perdida de calibracion) |
| Carga de firmware o parches | sq9pd, Reid-n0rc | No | No | Fuera de alcance (puede dejar la radio inservible) |
| Doppler de satelites | Look4Sat-FTX1 | No | Seguimiento por `RigTracker` (FA, FB, ST) | Ya existia (Android). Web: fuera de alcance (no planificado en esta rama) |
| Scope, cascada y audio USB | WebUI, POK, ITM, RZO | No | No | Fuera de alcance (no planificado en esta rama) |
| Decodificadores (CW, RTTY, FT8) y diario | EUG, POK | No | Modulo digital FT8/FT4 aparte | Fuera de alcance (no planificado en esta rama) |
| Tunel TCP/rigctl y acceso remoto | BYF, bg7nzl, captobie, RZO | No | No | Fuera de alcance (no planificado en esta rama; sin autenticacion en las referencias) |
| Reloj `DT`, pantalla `DA`, memorias de voz `LM`/`PB` y de manipulador `KM` | SEM, ITM, EUG | No | No | Fuera de alcance (**ESCRIBE EN LA RADIO** sin necesidad para recepcion/VFO) |

Resumen de las funciones planificadas: son solo de recepcion y VFO, cada
escritura se comprueba de rango antes de enviar y se verifica releyendo, y nada
activa el transmisor. En web: `NL`, `RL`, `BC`, `BP`, `NA`, `CF`, `KS`, `LK`
(P1: 0 = MAIN, 1 = SUB), el panel VFO (frecuencia A/B con la API existente, modo
MAIN con `MD0 m;` y relectura) y split `ST0`/`ST1`. En Android: conectar a
`RigActivity` los ajustes de `Ftx1Rig` (AF, RF, SQL, ancho, IF shift, AGC,
preamp, atenuador y potencia) y los medidores `RM1`-`RM8`, e informar
`supportsMeter` y `supportsRfPower` para `Ftx1Rig`. Excluido a proposito:
PTT/KY/manipulacion de CW, arranque del sintonizador, `BU`/`BD`/`SV`/`AB`/`BA`,
`SPR`/`SPW`, cambios de region o limites de TX, calibracion y carga de firmware.
