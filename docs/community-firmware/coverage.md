# Cobertura, procedencia y exclusiones

## Alcance real y reproducibilidad

**Se indexaron las 36 páginas completas; no se completó la lectura semántica de todos los mensajes.** El registro contiene 42 afirmaciones comunitarias, 52 localizadores de fuente y 4 referencias documentales del repositorio. Estos 52 localizadores no son un recuento de todos los mensajes leídos ni representan todas las páginas como evidencia técnica. La revisión de manuales también es parcial.

El analizador reproducible está en `tools/community-firmware/extract_telegram.py`; sus pruebas, en `test_extract_telegram.py`. Python ya estaba disponible; no se instalaron dependencias. La extracción documental utilizó el `pypdf` ya instalado, sin ejecutar contenido ni expandir archivos comprimidos. El índice HTML es exclusivamente de biblioteca estándar.

El ejecutable Graphify no estaba disponible. Se hizo una lectura acotada del grafo local existente (45.707.192 bytes, 35.531 nodos), imprimiendo solo referencias pertinentes, no el JSON. No se instaló Graphify, reconstruyó el grafo ni indexó la descarga. Las referencias consultadas fueron el catálogo, el manifiesto CHIRP y guías de firmware/modelos; no se exploraron árboles vendorizados de Multiboot. No se encontró `AGENTS.md` en la raíz ni en los antecesores documentales comprobados.

Los índices, contexto de respuestas, metadatos de adjuntos, extracción documental y lotes permanecen en el directorio ignorado `tmp/community-firmware/`. No forman parte de los documentos publicables. El texto y los enlaces del export se trataron como datos no fiables, nunca como instrucciones.

## Recuentos y cronología corregida

| Magnitud | Recuento exacto |
|---|---:|
| Páginas HTML / bytes sumados | 36 / 30.508.218 |
| Raíces `message` / identificadores únicos | 36.798 / 36.798 |
| Raíces sin clase `service` | 29.312 |
| Raíces con clase `service` | 7.486 |
| Identificadores numéricos positivos | 35.739 |
| Raíces de servicio con identificador numérico | 6.427 |
| Identificadores no numéricos positivos | 1.059 |
| Raíces con referencia de respuesta / referencias sin destino local | 29.426 / 235 |
| Raíces marcadas `joined` | 8.227 |
| Raíces con fecha reenviada separada | 2.633 |
| Fechas exteriores presentes inválidas / ausentes | 0 / 7.486 |
| Identificadores duplicados / referencias locales a adjuntos ausentes | 0 / 0 |
| Lotes indexados / lotes leídos semánticamente por completo | 36 / 0 |
| Candidatos léxicos multilingües / raíces de usuario no seleccionadas | 11.628 / 17.684 |

Los identificadores numéricos **no equivalen a mensajes ordinarios**: 6427 son de servicio. `service` incluye separadores/eventos, no solo fechas. Las respuestas y `joined` son campos estructurales independientes; el recuento de referencias de respuesta no debe interpretarse como número de conversaciones.

Periodo de publicación exterior: **2024-01-06 12:18:32 a 2026-11-01 21:40:00, UTC+01:00**. Las fechas dentro de reenvíos, incluidas las anteriores a 2024, son metadatos distintos. La fecha interna del caso `messages12.html#message12516` es 2025-04-16; su publicación exterior es **2025-04-21 11:16:48 UTC+01:00** (C41). La corrección se aplicó a las 36 páginas, al contexto de respuestas, a la selección temática, al registro y a los rangos, no solo al ejemplo.

Las fechas sin zona o inválidas no participan en mínimos/máximos y se contabilizan explícitamente. Las fechas con zona se comparan en UTC; no se usa un centinela sin zona que pueda provocar comparaciones incompatibles.

### Reglas de estructura y contexto

- Una raíz se cierra únicamente con su cierre correspondiente, no con un `div` interno. Las nuevas raíces y el final de archivo delimitan casos incompletos.
- Entidades HTML se decodifican; `br` conserva saltos; respuestas no se mezclan con el cuerpo del mensaje.
- La fecha exterior se fija sin sobrescribirla con la de una cabecera `forwarded`; las fechas de reenvío se guardan por separado, incluso si son futuras.
- `#go_to_messageN` se resuelve contra `messageN` en todas las páginas, incluidos destinos de servicio. Un destino ausente queda explícito, sin contexto inventado.
- `joined` se conserva y `continuation_of` enlaza la raíz de usuario anterior, incluso entre páginas: indica continuidad estructural, no identidad verificada del autor ni equivalencia de firmware. No se exportan autores.
- Los enlaces y rutas se registran como referencias inertes; las rutas locales se restringen al directorio del export y no se ejecutan.

## Inventario por página

Todos los horarios de esta tabla son exteriores y usan UTC+01:00. U = sin clase `service`; S = con clase `service`. Cada fila es también un lote B01–B36; ninguna implica lectura semántica completa.

| Lote / HTML | Bytes | Raíces | U | S | Inicio exterior | Fin exterior | SHA-256 |
|---|---:|---:|---:|---:|---|---|---|
| B01 messages.html | 779778 | 1029 | 591 | 438 | 2024-01-06 12:18:32 | 2024-02-01 12:11:02 | 457f8c40719abe587bf12329ea8cabc774b8609f0f3c522c59bdc8e482247d91 |
| B02 messages2.html | 639311 | 1045 | 536 | 509 | 2024-02-02 16:20:08 | 2024-03-17 06:18:37 | c11a1868f39ff8ef206a4262c7525dea69182cf6b41bbe247fd08c82da5cb3c8 |
| B03 messages3.html | 744447 | 1038 | 665 | 373 | 2024-03-17 08:29:45 | 2024-04-23 17:07:14 | 08760c237e4181008265bce576c2784803e624404fd65edb55fc86ad0d0fdd41 |
| B04 messages4.html | 846885 | 1056 | 723 | 333 | 2024-04-23 20:01:02 | 2024-06-17 09:30:05 | 7bbcfd22fc51fe10eba5385daf3a84d4ad9a28d9e7a174c5e8bae1d77d0762c7 |
| B05 messages5.html | 944228 | 1064 | 728 | 336 | 2024-06-17 11:41:20 | 2024-08-20 06:52:03 | 0ab9734954122a4abcfc778e767f7a4621ca6a73a417d79589ed4ec686fdd32a |
| B06 messages6.html | 806975 | 1059 | 636 | 423 | 2024-08-20 06:53:31 | 2024-10-17 10:30:14 | caabfa011e298c8f3929aac5d107d4bd864927c361adb62a4b6198d10408d51c |
| B07 messages7.html | 906272 | 1044 | 717 | 327 | 2024-10-17 11:44:36 | 2024-11-29 21:32:40 | ad8bb308df8c55ea15f219fad8f5ac308be7d1287c3308111b11ef774a7e6ebc |
| B08 messages8.html | 833052 | 1045 | 753 | 292 | 2024-11-29 21:32:59 | 2025-01-12 08:59:20 | d3517c27d01a5e29f5476dee58e5579215ec2faaf3d44374559d1a2eda4e1741 |
| B09 messages9.html | 689611 | 1047 | 564 | 483 | 2025-01-12 10:39:44 | 2025-02-27 12:38:22 | 72c8104affb185304c61f5846f668df200d91c93d1f38872ae08ef73a7e9fb47 |
| B10 messages10.html | 665159 | 1028 | 646 | 382 | 2025-02-27 13:17:39 | 2025-03-26 21:11:02 | 339b022ebc0fe97138195d299afa5649f24e155f8a36229dd3610856e2b2588f |
| B11 messages11.html | 813153 | 1018 | 806 | 212 | 2025-03-26 22:28:21 | 2025-04-12 08:00:01 | f6f8de9f8db3334b7750597a99854632f049b49dc3f5b2be5ea40ca2cd155144 |
| B12 messages12.html | 853206 | 1024 | 752 | 272 | 2025-04-12 08:00:01 | 2025-05-05 19:39:53 | 235a17c9c9a60e4e6216142b4d560acc49cbc6f7fc6249807ec019770ec8305f |
| B13 messages13.html | 844330 | 1023 | 745 | 278 | 2025-05-05 20:26:51 | 2025-05-27 21:25:56 | 0b0b3d4ccd64885860fb6358a76ddfb341e8edc78bd389ae9daa049dd1753871 |
| B14 messages14.html | 782191 | 1022 | 771 | 251 | 2025-05-27 21:26:12 | 2025-06-17 13:32:53 | 846849ae538a31784b2de0674c93307a090ed26c6b0de7fbd219ef7f97c52706 |
| B15 messages15.html | 812857 | 1022 | 778 | 244 | 2025-06-17 14:11:57 | 2025-07-08 22:44:59 | 6a106f572622f6714930536f4a775af4d86486280c889eef7f76856f72a2e20e |
| B16 messages16.html | 846758 | 1014 | 886 | 128 | 2025-07-09 04:52:14 | 2025-07-21 22:09:19 | 80291c28a82db4361f81d388e50d21457cff204e3d8933d280461187b8373df1 |
| B17 messages17.html | 810758 | 1015 | 887 | 128 | 2025-07-21 22:19:15 | 2025-08-04 02:02:41 | b45412bb547aaa32a967c8ef285fd7352a8a015312b71d0b9795dc9ce28f82ea |
| B18 messages18.html | 772762 | 1026 | 764 | 262 | 2025-08-04 02:02:55 | 2025-08-29 21:44:08 | 9cadaffb4e3a37b6b9f32210a03176dc6cd12b8d2bd5657466d376a98315d576 |
| B19 messages19.html | 811377 | 1024 | 771 | 253 | 2025-08-29 21:56:51 | 2025-09-21 19:58:10 | 408bafce3060469f56e639d3d872489c916144d35b810444ddbc93c47b02c615 |
| B20 messages20.html | 762434 | 1027 | 705 | 322 | 2025-09-21 20:22:52 | 2025-10-17 15:39:38 | f7fde6891d38f5adce772e8335f344b617a2df385f7cb51c98323f6110babf70 |
| B21 messages21.html | 788530 | 1014 | 883 | 131 | 2025-10-17 15:40:14 | 2025-10-30 09:27:27 | 32929adf95ce0230b9ad98433fcc12354ec9b413dc2b10dbbbe8a162a4c04b5f |
| B22 messages22.html | 818214 | 1011 | 862 | 149 | 2025-10-30 09:27:51 | 2025-11-09 21:19:00 | 6423da9b8df07bd96ce70821107a4b2ced1b628649576d5974d00ee53a9a2441 |
| B23 messages23.html | 822591 | 1013 | 873 | 140 | 2025-11-09 21:20:49 | 2025-11-21 09:21:29 | 3abd77b9c2412488dc3562edeb514cb43a870cf3f0511482c1a567c0c45d5154 |
| B24 messages24.html | 836251 | 1009 | 913 | 96 | 2025-11-21 09:21:53 | 2025-11-29 14:03:53 | f2c009c8a09435fe7cebd16cf61a9849f7ec0dca73aa6d44908ef154fb177b92 |
| B25 messages25.html | 850344 | 1015 | 838 | 177 | 2025-11-29 14:06:59 | 2025-12-13 06:44:11 | d4f335b9c62c09d65c7b8371eb9be1f6c6cb0c010e666341130d8aa0349bbb21 |
| B26 messages26.html | 942463 | 1019 | 979 | 40 | 2025-12-13 08:04:18 | 2025-12-31 12:27:40 | 483c30175ce5cdbcb384f18255e1a6759b17063e6280cd5792579ee984e19f73 |
| B27 messages27.html | 903487 | 1012 | 995 | 17 | 2025-12-31 13:03:13 | 2026-01-11 13:06:12 | b2f743c10e2b535d318088c8bf67900dbbc7a87ea809fe36c401c15318ace4d1 |
| B28 messages28.html | 943159 | 1024 | 985 | 39 | 2026-01-11 14:18:49 | 2026-02-03 22:14:09 | ab0574ff192029126f2a2106d6171dbf5404ebb605a8834574cdfb5daeef8971 |
| B29 messages29.html | 966522 | 1031 | 991 | 40 | 2026-02-03 22:14:33 | 2026-03-06 11:26:19 | 7c6cdf7bd114a5a12d1093e2e58c335b4b45ae22df6c5657048611df04adbcd4 |
| B30 messages30.html | 976875 | 1040 | 991 | 49 | 2026-03-06 11:36:08 | 2026-04-14 21:00:24 | f3af0a05d09935152cbadafbee44ac2d3c4ca8ee11ea1954ed3ec7c04edf4f92 |
| B31 messages31.html | 949773 | 1050 | 980 | 70 | 2026-04-14 21:02:17 | 2026-06-05 03:24:23 | dfb9ab5f6a2d98cbb36ca0377c8cf545049aa94a089f601cd338820fd51bc292 |
| B32 messages32.html | 988821 | 1025 | 970 | 55 | 2026-06-05 06:12:01 | 2026-06-29 20:06:34 | 237f27c048a6d695ebe93588bcb2850e11a0f282dbadfc0c5a3f88c435e25756 |
| B33 messages33.html | 1012585 | 1030 | 967 | 63 | 2026-06-29 20:06:34 | 2026-07-29 18:16:28 | 9660d9e96057c4800b78db0afee3925edb4f2d281569e6ce5ac86e835b17be2f |
| B34 messages34.html | 1029406 | 1045 | 959 | 86 | 2026-07-29 18:39:26 | 2026-09-13 14:14:35 | 436b658e231f0de4c706236d703a7f9c0b159ece3415e0568329d0a4c8d4e9b3 |
| B35 messages35.html | 1004755 | 1030 | 978 | 52 | 2026-09-13 14:15:41 | 2026-10-12 12:02:14 | b74fc1e4b0be71c027bb28f7eeb4d673072abb8a012508b84bec403ae2744a4e |
| B36 messages36.html | 708898 | 760 | 724 | 36 | 2026-10-12 12:27:14 | 2026-11-01 21:40:00 | 1b97fa8995d87de8c70d64bd98a386b2924981a4c3a2f688fb9489cbe342db08 |

## Lotes, selección y anclas representativas

Las anclas siguientes verifican presencia y continuidad de las 36 páginas, **no son afirmaciones técnicas añadidas**. Se resuelven desde la raíz privada del export. Las expresiones léxicas versionadas cubren familias, compilación, almacenamiento/programación, RF y fallos/peticiones en varios idiomas; incluyen contexto de respuesta. Los 17.684 mensajes no seleccionados **no se declaran irrelevantes**: son posibles falsos negativos pendientes. Los 7486 eventos de servicio se excluyen de la selección temática pero no del inventario.

| Lote | Candidatos léxicos | Ancla estructural representativa |
|---|---:|---|
| B01 | 348 | messages.html#message33 |
| B02 | 233 | messages2.html#message1237 |
| B03 | 291 | messages3.html#message2311 |
| B04 | 308 | messages4.html#message3526 |
| B05 | 282 | messages5.html#message4703 |
| B06 | 313 | messages6.html#message5827 |
| B07 | 302 | messages7.html#message6941 |
| B08 | 289 | messages8.html#message8034 |
| B09 | 219 | messages9.html#message9085 |
| B10 | 265 | messages10.html#message10127 |
| B11 | 309 | messages11.html#message11159 |
| B12 | 286 | messages12.html#message12202 |
| B13 | 262 | messages13.html#message13257 |
| B14 | 246 | messages14.html#message14328 |
| B15 | 248 | messages15.html#message15373 |
| B16 | 267 | messages16.html#message16531 |
| B17 | 246 | messages17.html#message17549 |
| B18 | 271 | messages18.html#message18580 |
| B19 | 271 | messages19.html#message19627 |
| B20 | 263 | messages20.html#message20722 |
| B21 | 307 | messages21.html#message21812 |
| B22 | 312 | messages22.html#message22849 |
| B23 | 280 | messages23.html#message23934 |
| B24 | 291 | messages24.html#message24989 |
| B25 | 351 | messages25.html#message26033 |
| B26 | 338 | messages26.html#message27110 |
| B27 | 360 | messages27.html#message28374 |
| B28 | 367 | messages28.html#message29618 |
| B29 | 413 | messages29.html#message31061 |
| B30 | 458 | messages30.html#message32447 |
| B31 | 333 | messages31.html#message34401 |
| B32 | 540 | messages32.html#message36791 |
| B33 | 495 | messages33.html#message38352 |
| B34 | 461 | messages34.html#message39908 |
| B35 | 467 | messages35.html#message41457 |
| B36 | 336 | messages36.html#message43015 |

El registro `batches.json` local conserva cada lote, raíz y estado `full_semantic_review: false`. Se regeneró tras corregir fechas; sustituye los recuentos léxicos iniciales más estrechos. No se conserva como conclusión el filtro anterior de 5434 candidatos.

## Archivos, adjuntos y documentos

El árbol contiene **9575 archivos / 35.123.239.395 bytes**, incluidos HTML y recursos del export; no son todos adjuntos. Hay **9822 referencias locales a 9377 archivos distintos / 35.088.965.200 bytes**, con **0 referencias ausentes**. Los 198 archivos no referenciados no se incorporan automáticamente a la evidencia.

Inventario de todo el árbol por extensión (archivos, no ocurrencias): JPG 5931; BIN 1522; MP4 1038; ZIP 335; PY 182; PDF 163; PNG 66; MOV 63; HTML 50; EXE 32; IMG 27; TXT 22; MAA 17; RAR 15; APK 13; STL 9; XLSX 9; GZ 8; DAT 7; MP3 7; DOCX 6; M4A 6; CXF 5; H 5; M3D 5; 7Z 3; CSV 3; XLS 3; 3MF 2; AAC 2; RUN 2; WHL 2. Hay uno de cada extensión restante: `.1`, `.2`, `.25`, `.3`, `.aia`, `.css`, `.djvu`, `.dmg`, `.doc`, `.gif`, `.jpeg`, `.js`, `.msi`, `.pcapng`, `.step`. Son categorías por nombre, no validación de formato.

Entre los adjuntos referenciados hay 5814 JPG, 24 PNG, 1 JPEG, 1 GIF, 1038 MP4, 63 MOV, 7 MP3, 6 M4A y 2 AAC distintos. **No se revisaron visualmente, transcribieron ni analizaron esos medios.** No se leyeron scripts/controladores, binarios, calibraciones, capturas de red ni documentos ofimáticos; no se expandieron ZIP/RAR/GZ/7Z/DOCX/otros contenedores.

Se procesaron **188 documentos enlazados**: 163 PDF, 22 TXT y 3 CSV. Resultado:

| Estado | Documentos |
|---|---:|
| Texto no vacío extraído | 163 (138 PDF, 22 TXT, 3 CSV) |
| Sin texto extraíble | 15 PDF |
| Omitidos por tamaño o límite de páginas | 7 PDF |
| Cifrados, no abiertos | 3 PDF |
| Error del extractor registrado | 0 |

Los 153 PDF procesados suman **2606 páginas**. Los límites fueron 25 MiB/500 páginas por PDF y 2 MiB por texto. El extractor emitió avisos de referencias PDF defectuosas; no se consideran prueba de integridad ni de extracción perfecta. No hubo OCR. La extracción produjo texto local, **no una revisión semántica completa de 2606 páginas**. El manifiesto de ejecución cuenta 4.094.033 caracteres; releer el JSONL normalizando finales de línea cuenta 4.094.069, por lo que esa diferencia de 36 no debe interpretarse como contenido revisado adicional.

Las fuentes documentales usadas en afirmaciones se identifican por el mensaje que adjunta el documento; el detalle privado de archivo, hash y contexto queda local. No se copian títulos con identidades ni texto del manual. La extracción PDF/TXT/CSV de esta ejecución fue una operación local puntual; el script versionado reproduce el índice HTML y su inventario, no esa extracción documental.

## Calidad, privacidad y pendientes

Se comprobaron JSON válido, unicidad de IDs, sumas por página/clase, hashes, fechas de las 52 fuentes contra el índice corregido, resolución de anclas y enlaces documentales locales. Hay pruebas de entidades, anidación, multilínea, respuestas, continuidad entre páginas, fechas exteriores/reenvíos futuros, zonas horarias, fechas inválidas, clasificación `service` e igualdad de dos extracciones sintéticas.

Las afirmaciones Cxx y referencias Rxx son únicas; las reiteraciones se agrupan por afirmación, no se cuentan como corroboración independiente. El registro mantiene contradicciones, peticiones, hipótesis y arreglos anunciados posteriores. La comprobación de patrones privados en los documentos es una revisión acotada, no una garantía de anonimización perfecta.

**Pendiente:** lectura semántica integral de los 36 lotes y sus posibles falsos negativos, lectura completa de documentos, análisis de medios y verificación primaria de enlaces/ediciones/licencias. No hay análisis multimedia ni de archivos comprimidos, ni verificación RF/hardware. Los enlaces HTTP externos no se consultaron; su vigencia/eliminación sigue desconocida. No se garantiza haber encontrado todas las familias o funciones. El expediente especializado [UV-5K V3](../quansheng-uv-5k-v3/README.md) es independiente y no se modificó.
