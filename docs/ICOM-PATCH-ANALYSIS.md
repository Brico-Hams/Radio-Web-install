Documento generado por `scripts/icom-patch-report.cjs`; no se debe editar a mano.

# Analisis de los parches del firmware Icom

Este informe se calcula a partir de los parches JSON vendidos en `third_party/icom-custom-firmware/docs/patches/` y `third_party/icom-byof/patches/`. Indica direccion por direccion que bytes cambia cada parche. El contexto (formato, mecanismo y funciones) esta en [ICOM-FIRMWARE-INTERNALS.md](ICOM-FIRMWARE-INTERNALS.md) y el uso en [ICOM-CUSTOM-FIRMWARE.md](ICOM-CUSTOM-FIRMWARE.md).

## Como leer este informe

- Las operaciones `hex` escriben bytes propios del proyecto (codigo o datos nuevos). Las operaciones `copy_from` copian bytes de la imagen oficial a otra direccion (codigo oficial reubicado). No se distribuye ningun byte de Icom.
- Las direcciones de la imagen principal son absolutas en RAM (`load_address`, normalmente `0x20005000`). Las del bootstrap son desplazamientos dentro de los 64 KiB iniciales del contenedor.
- Una region agrupa operaciones separadas por menos de 32 bytes; su tamano es el intervalo completo, huecos incluidos.
- Tipo: propio = solo bytes `hex`; reubicado = solo bytes `copy_from`; mixto = ambos.
- Cada bloque del histograma ocupa 64 KiB (`0x10000`); la cobertura cuenta los bytes distintos tocados, sin repetir los solapados.

## Resumen por parche

| Parche | Radio | Release | Direccion de carga | Tamano de imagen | MD5 de entrada | MD5 de salida | Operaciones hex | Operaciones copy | Bytes hex | Bytes copiados | Regiones | Operaciones bootstrap | Bytes bootstrap | Regiones bootstrap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `705E140_20261113v1` | IC-705 E 1.40 | `20261113v1` | `0x20005000` | `3629056` | `2c9c1d7f3fc80ef173e01d841cd1248a` | `1a4577ca926089198bcdf63155ac7410` | 729 | 1138 | 15188 | 52097 | 109 | 20 | 1545 | 4 |
| `705J140_20261113v1` | IC-705 J 1.40 | `20261113v1` | `0x20005000` | `3629056` | `b605171288db4a74e0992a8f2afcb1c3` | `d7a7f87b9b16f262b188fe3735b3682b` | 796 | 1391 | 10368 | 56319 | 109 | 20 | 1545 | 4 |
| `9700E150_20261113v3` | IC-9700 E 1.50 | `20261113v3` | `0x20005000` | `4238864` | `6f04fd2248ba39254ed01b30b52ce36a` | `51e9d2da39790357f220f3bea3fe4879` | 620 | 762 | 16427 | 16093 | 77 | 23 | 1501 | 3 |
| `9700E150_trv16c` | IC-9700 E 1.50 | `trv16c` | `0x20005000` | `4233936` | `6f04fd2248ba39254ed01b30b52ce36a` | `1a9d78b5a6295b8217d7cbe26c02d728` | 478 | 615 | 7111 | 14752 | 70 | 23 | 1501 | 3 |

## 705E140_20261113v1

### Datos generales

| Campo | Valor |
| --- | --- |
| Fichero del parche | `third_party/icom-custom-firmware/docs/patches/705E140_20261113v1.json` |
| Descripcion | `IC-705 E1.40 custom 20261113v1` |
| Radio y version oficial | IC-705 E 1.40 |
| Archivo oficial | `705E140.dat` |
| Release | `20261113v1` |
| Direccion de carga | `0x20005000` |
| Tamano de imagen | `3629056` |
| Tamano de la imagen oficial (documentado) | `3629056` |
| Crecimiento respecto a la oficial | `0` |
| MD5 de entrada | `2c9c1d7f3fc80ef173e01d841cd1248a` |
| MD5 de la imagen principal de entrada | `62fbe39f29bcf0b3cc341b861912047d` |
| MD5 de salida | `1a4577ca926089198bcdf63155ac7410` |
| MD5 de la imagen principal de salida | `9b6e3ece0b92845de10f6a17dab9a41f` |
| Operaciones hex | 729 |
| Operaciones copy | 1138 |
| Bytes escritos por operaciones hex | 15188 |
| Bytes copiados de la imagen oficial | 52097 |
| Regiones distintas (hueco menor de 32 bytes) | 109 |
| Bytes distintos tocados | 67285 |
| Bytes de regiones por encima de la imagen oficial | 0 |

### Las 40 regiones mayores de la imagen principal

Se muestran como maximo 40 regiones, ordenadas de mayor a menor tamano.

| Inicio | Fin | Tamano | Tipo | Operaciones | Bytes hex | Bytes copiados |
| --- | --- | --- | --- | --- | --- | --- |
| `0x2036a000` | `0x203739a8` | 39336 | mixto | 735 | 1524 | 34998 |
| `0x20378200` | `0x2037a82b` | 9771 | mixto | 585 | 985 | 6306 |
| `0x20376000` | `0x203780b8` | 8376 | mixto | 31 | 70 | 8306 |
| `0x202f6004` | `0x202f7580` | 5500 | mixto | 195 | 3909 | 1218 |
| `0x20373a00` | `0x20374e2c` | 5164 | mixto | 30 | 5021 | 143 |
| `0x203756fa` | `0x20375e70` | 1910 | mixto | 69 | 1273 | 637 |
| `0x20375130` | `0x20375512` | 994 | mixto | 48 | 739 | 239 |
| `0x2037ac20` | `0x2037aed0` | 688 | mixto | 24 | 399 | 25 |
| `0x2037a900` | `0x2037aa74` | 372 | mixto | 18 | 263 | 68 |
| `0x2037ab00` | `0x2037abd4` | 212 | propio (codigo o datos nuevos) | 1 | 212 | 0 |
| `0x20369de0` | `0x20369e90` | 176 | mixto | 5 | 158 | 18 |
| `0x20375600` | `0x203756a4` | 164 | mixto | 5 | 115 | 49 |
| `0x2030274c` | `0x203027c1` | 117 | mixto | 19 | 36 | 81 |
| `0x20369f40` | `0x20369f88` | 72 | propio (codigo o datos nuevos) | 1 | 72 | 0 |
| `0x20149bd0` | `0x20149bf0` | 32 | propio (codigo o datos nuevos) | 2 | 16 | 0 |
| `0x200247d8` | `0x200247f3` | 27 | propio (codigo o datos nuevos) | 1 | 27 | 0 |
| `0x2002841c` | `0x20028437` | 27 | propio (codigo o datos nuevos) | 2 | 18 | 0 |
| `0x200eaa9c` | `0x200eaab0` | 20 | propio (codigo o datos nuevos) | 2 | 8 | 0 |
| `0x200265f4` | `0x20026607` | 19 | propio (codigo o datos nuevos) | 2 | 6 | 0 |
| `0x20005024` | `0x20005033` | 15 | propio (codigo o datos nuevos) | 1 | 15 | 0 |
| `0x20096804` | `0x20096813` | 15 | propio (codigo o datos nuevos) | 2 | 6 | 0 |
| `0x201559b0` | `0x201559bf` | 15 | propio (codigo o datos nuevos) | 2 | 6 | 0 |
| `0x20108348` | `0x20108353` | 11 | propio (codigo o datos nuevos) | 1 | 11 | 0 |
| `0x2031d180` | `0x2031d189` | 9 | reubicado (bytes oficiales) | 1 | 0 | 9 |
| `0x202dc9d2` | `0x202dc9da` | 8 | propio (codigo o datos nuevos) | 1 | 8 | 0 |
| `0x202e0524` | `0x202e052c` | 8 | propio (codigo o datos nuevos) | 1 | 8 | 0 |
| `0x2030bb84` | `0x2030bb8c` | 8 | propio (codigo o datos nuevos) | 1 | 8 | 0 |
| `0x20028474` | `0x2002847b` | 7 | propio (codigo o datos nuevos) | 1 | 7 | 0 |
| `0x2014bb14` | `0x2014bb1b` | 7 | propio (codigo o datos nuevos) | 1 | 7 | 0 |
| `0x20301e1c` | `0x20301e23` | 7 | propio (codigo o datos nuevos) | 1 | 7 | 0 |
| `0x203021e8` | `0x203021ef` | 7 | propio (codigo o datos nuevos) | 1 | 7 | 0 |
| `0x2002f288` | `0x2002f28c` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x20054ae0` | `0x20054ae4` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x2005f3ec` | `0x2005f3f0` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x2005ff18` | `0x2005ff1c` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x2007d628` | `0x2007d62c` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x20095114` | `0x20095118` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x20096424` | `0x20096428` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x200984d0` | `0x200984d4` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x200a3414` | `0x200a3418` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |

### Histograma por bloque de 64 KiB

| Bloque | Bytes tocados | Cobertura | Regiones |
| --- | --- | --- | --- |
| `0x20000000` | 15 | 0.02% | 1 |
| `0x20010000` | 3 | 0.00% | 1 |
| `0x20020000` | 71 | 0.11% | 8 |
| `0x20040000` | 9 | 0.01% | 3 |
| `0x20050000` | 18 | 0.03% | 5 |
| `0x20060000` | 6 | 0.01% | 2 |
| `0x20070000` | 19 | 0.03% | 6 |
| `0x20080000` | 3 | 0.00% | 1 |
| `0x20090000` | 25 | 0.04% | 7 |
| `0x200a0000` | 25 | 0.04% | 8 |
| `0x200b0000` | 3 | 0.00% | 1 |
| `0x200c0000` | 9 | 0.01% | 3 |
| `0x200d0000` | 3 | 0.00% | 1 |
| `0x200e0000` | 8 | 0.01% | 1 |
| `0x200f0000` | 10 | 0.02% | 4 |
| `0x20100000` | 27 | 0.04% | 5 |
| `0x20140000` | 30 | 0.05% | 4 |
| `0x20150000` | 21 | 0.03% | 6 |
| `0x20160000` | 18 | 0.03% | 5 |
| `0x20170000` | 18 | 0.03% | 6 |
| `0x20180000` | 9 | 0.01% | 3 |
| `0x20190000` | 21 | 0.03% | 7 |
| `0x202d0000` | 8 | 0.01% | 1 |
| `0x202e0000` | 8 | 0.01% | 1 |
| `0x202f0000` | 5127 | 7.82% | 1 |
| `0x20300000` | 139 | 0.21% | 4 |
| `0x20310000` | 9 | 0.01% | 1 |
| `0x20360000` | 23756 | 36.25% | 4 |
| `0x20370000` | 37867 | 57.78% | 10 |

### Cruce con el mapa de memoria documentado

| Zona | Inicio | Fin | Fuente | Regiones | Bytes dentro |
| --- | --- | --- | --- | --- | --- |
| Cabecera de la imagen (vectores y literales) hasta el punto de entrada | `0x20005000` | `0x20005060` | `third_party/icom-byof/IC705_DAT_FORMAT.md`, `third_party/icom-byof/IC705_FLASH_LAYOUT.md` | 1 | 15 |
| Cuerpo de la imagen oficial | `0x20005060` | `0x2037b000` | `third_party/icom-byof/IC705_DAT_FORMAT.md`, `third_party/icom-byof/IC705_FLASH_LAYOUT.md` | 108 | 73326 |

### Bootstrap y bootloader

Las direcciones son desplazamientos dentro de los 64 KiB del bootstrap (cargador en RAM `0x20004000`).

| Campo | Valor |
| --- | --- |
| MD5 del bootstrap de entrada | `9f97d0004c205a5d5bb247578098e153` |
| MD5 del bootstrap de salida | `6194af1bd0dd5d554b6526cf36b2088d` |
| Operaciones hex | 12 |
| Operaciones copy | 8 |
| Bytes escritos por operaciones hex | 1472 |
| Bytes copiados de la imagen oficial | 73 |
| Regiones distintas (hueco menor de 32 bytes) | 4 |
| Bytes distintos tocados | 1545 |

| Inicio | Fin | Tamano | Tipo | Operaciones | Bytes hex | Bytes copiados |
| --- | --- | --- | --- | --- | --- | --- |
| `0x49bc` | `0x4ed4` | 1304 | mixto | 17 | 1231 | 73 |
| `0x1000` | `0x10ec` | 236 | propio (codigo o datos nuevos) | 1 | 236 | 0 |
| `0x4944` | `0x4947` | 3 | propio (codigo o datos nuevos) | 1 | 3 | 0 |
| `0x88` | `0x8a` | 2 | propio (codigo o datos nuevos) | 1 | 2 | 0 |

| Zona | Inicio | Fin | Fuente | Regiones | Bytes dentro |
| --- | --- | --- | --- | --- | --- |
| Bootstrap antes del cargador (vectores de arranque) | `0x0` | `0x4000` | `third_party/icom-byof/IC705_DAT_FORMAT.md` | 2 | 238 |
| Cargador original (copiado a RAM) | `0x4000` | `0x49bc` | `third_party/icom-byof/IC705_DAT_FORMAT.md` | 1 | 3 |
| Por encima del cargador original, antes de la etiqueta | `0x49bc` | `0x4f00` | `third_party/icom-byof/IC705_DAT_FORMAT.md`, `third_party/icom-byof/ic_rza1_repack.py` | 1 | 1304 |
| Etiqueta del bootloader (se conserva) | `0x4f00` | `0x4f10` | `third_party/icom-byof/ic_rza1_repack.py` | 0 | 0 |
| Resto del bootstrap | `0x4f10` | `0x10000` | `third_party/icom-byof/ic_rza1_repack.py`, `third_party/icom-byof/IC705_DAT_FORMAT.md` | 0 | 0 |

## 705J140_20261113v1

### Datos generales

| Campo | Valor |
| --- | --- |
| Fichero del parche | `third_party/icom-custom-firmware/docs/patches/705J140_20261113v1.json` |
| Descripcion | `IC-705 J1.40 custom 20261113v1` |
| Radio y version oficial | IC-705 J 1.40 |
| Archivo oficial | `705J140.dat` |
| Release | `20261113v1` |
| Direccion de carga | `0x20005000` |
| Tamano de imagen | `3629056` |
| Tamano de la imagen oficial (documentado) | `3629056` |
| Crecimiento respecto a la oficial | `0` |
| MD5 de entrada | `b605171288db4a74e0992a8f2afcb1c3` |
| MD5 de la imagen principal de entrada | `c8202dfae07bca21b2d28f6015346863` |
| MD5 de salida | `d7a7f87b9b16f262b188fe3735b3682b` |
| MD5 de la imagen principal de salida | `4502cb1d7bd56a5bbbc428f2349b58d6` |
| Operaciones hex | 796 |
| Operaciones copy | 1391 |
| Bytes escritos por operaciones hex | 10368 |
| Bytes copiados de la imagen oficial | 56319 |
| Regiones distintas (hueco menor de 32 bytes) | 109 |
| Bytes distintos tocados | 66687 |
| Bytes de regiones por encima de la imagen oficial | 0 |

### Las 40 regiones mayores de la imagen principal

Se muestran como maximo 40 regiones, ordenadas de mayor a menor tamano.

| Inicio | Fin | Tamano | Tipo | Operaciones | Bytes hex | Bytes copiados |
| --- | --- | --- | --- | --- | --- | --- |
| `0x2036a000` | `0x20375512` | 46354 | mixto | 1118 | 2268 | 39556 |
| `0x20378200` | `0x2037a811` | 9745 | mixto | 584 | 973 | 6300 |
| `0x20376000` | `0x2037819c` | 8604 | mixto | 43 | 257 | 8347 |
| `0x202f5f24` | `0x202f74a0` | 5500 | mixto | 195 | 3910 | 1217 |
| `0x203756fa` | `0x20375e70` | 1910 | mixto | 69 | 1273 | 637 |
| `0x2037ac20` | `0x2037aed0` | 688 | mixto | 24 | 399 | 25 |
| `0x2037a900` | `0x2037aa74` | 372 | mixto | 18 | 263 | 68 |
| `0x2037ab00` | `0x2037abd4` | 212 | propio (codigo o datos nuevos) | 1 | 212 | 0 |
| `0x20369de0` | `0x20369e90` | 176 | mixto | 5 | 158 | 18 |
| `0x20375600` | `0x203756a4` | 164 | mixto | 5 | 115 | 49 |
| `0x2030242c` | `0x20302495` | 105 | mixto | 17 | 33 | 72 |
| `0x20369f40` | `0x20369f88` | 72 | propio (codigo o datos nuevos) | 1 | 72 | 0 |
| `0x202f5000` | `0x202f5030` | 48 | mixto | 5 | 27 | 21 |
| `0x20149aec` | `0x20149b0c` | 32 | propio (codigo o datos nuevos) | 2 | 16 | 0 |
| `0x200248cc` | `0x200248e7` | 27 | propio (codigo o datos nuevos) | 1 | 27 | 0 |
| `0x20028510` | `0x2002852b` | 27 | propio (codigo o datos nuevos) | 2 | 18 | 0 |
| `0x200ea9b8` | `0x200ea9cc` | 20 | propio (codigo o datos nuevos) | 2 | 8 | 0 |
| `0x200266e8` | `0x200266fb` | 19 | propio (codigo o datos nuevos) | 2 | 6 | 0 |
| `0x2009689c` | `0x200968ab` | 15 | propio (codigo o datos nuevos) | 2 | 6 | 0 |
| `0x201558cc` | `0x201558db` | 15 | propio (codigo o datos nuevos) | 2 | 6 | 0 |
| `0x20108264` | `0x2010826f` | 11 | propio (codigo o datos nuevos) | 1 | 11 | 0 |
| `0x2031ce60` | `0x2031ce69` | 9 | reubicado (bytes oficiales) | 1 | 0 | 9 |
| `0x20098d00` | `0x20098d08` | 8 | propio (codigo o datos nuevos) | 1 | 8 | 0 |
| `0x202dc8f2` | `0x202dc8fa` | 8 | propio (codigo o datos nuevos) | 1 | 8 | 0 |
| `0x202e0444` | `0x202e044c` | 8 | propio (codigo o datos nuevos) | 1 | 8 | 0 |
| `0x2030b864` | `0x2030b86c` | 8 | propio (codigo o datos nuevos) | 1 | 8 | 0 |
| `0x20028568` | `0x2002856f` | 7 | propio (codigo o datos nuevos) | 1 | 7 | 0 |
| `0x2014ba30` | `0x2014ba37` | 7 | propio (codigo o datos nuevos) | 1 | 7 | 0 |
| `0x20301afc` | `0x20301b03` | 7 | propio (codigo o datos nuevos) | 1 | 7 | 0 |
| `0x20301ec8` | `0x20301ecf` | 7 | propio (codigo o datos nuevos) | 1 | 7 | 0 |
| `0x2002f378` | `0x2002f37c` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x20054bd0` | `0x20054bd4` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x2005f4dc` | `0x2005f4e0` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x20060008` | `0x2006000c` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x2007d6c0` | `0x2007d6c4` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x200951ac` | `0x200951b0` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x20098620` | `0x20098624` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x2009867c` | `0x20098680` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x200a3330` | `0x200a3334` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x20104190` | `0x20104194` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |

### Histograma por bloque de 64 KiB

| Bloque | Bytes tocados | Cobertura | Regiones |
| --- | --- | --- | --- |
| `0x20010000` | 3 | 0.00% | 1 |
| `0x20020000` | 71 | 0.11% | 8 |
| `0x20040000` | 9 | 0.01% | 3 |
| `0x20050000` | 14 | 0.02% | 4 |
| `0x20060000` | 10 | 0.02% | 3 |
| `0x20070000` | 19 | 0.03% | 6 |
| `0x20080000` | 3 | 0.00% | 1 |
| `0x20090000` | 33 | 0.05% | 8 |
| `0x200a0000` | 25 | 0.04% | 8 |
| `0x200b0000` | 3 | 0.00% | 1 |
| `0x200c0000` | 9 | 0.01% | 3 |
| `0x200d0000` | 3 | 0.00% | 1 |
| `0x200e0000` | 8 | 0.01% | 1 |
| `0x200f0000` | 10 | 0.02% | 4 |
| `0x20100000` | 27 | 0.04% | 5 |
| `0x20140000` | 30 | 0.05% | 4 |
| `0x20150000` | 21 | 0.03% | 6 |
| `0x20160000` | 18 | 0.03% | 5 |
| `0x20170000` | 18 | 0.03% | 6 |
| `0x20180000` | 9 | 0.01% | 3 |
| `0x20190000` | 21 | 0.03% | 7 |
| `0x202d0000` | 8 | 0.01% | 1 |
| `0x202e0000` | 8 | 0.01% | 1 |
| `0x202f0000` | 5175 | 7.90% | 2 |
| `0x20300000` | 130 | 0.20% | 5 |
| `0x20310000` | 9 | 0.01% | 1 |
| `0x20360000` | 23756 | 36.25% | 4 |
| `0x20370000` | 37237 | 56.82% | 8 |

### Cruce con el mapa de memoria documentado

| Zona | Inicio | Fin | Fuente | Regiones | Bytes dentro |
| --- | --- | --- | --- | --- | --- |
| Cabecera de la imagen (vectores y literales) hasta el punto de entrada | `0x20005000` | `0x20005060` | `third_party/icom-byof/IC705_DAT_FORMAT.md`, `third_party/icom-byof/IC705_FLASH_LAYOUT.md` | 0 | 0 |
| Cuerpo de la imagen oficial | `0x20005060` | `0x2037b000` | `third_party/icom-byof/IC705_DAT_FORMAT.md`, `third_party/icom-byof/IC705_FLASH_LAYOUT.md` | 109 | 74435 |

### Bootstrap y bootloader

Las direcciones son desplazamientos dentro de los 64 KiB del bootstrap (cargador en RAM `0x20004000`).

| Campo | Valor |
| --- | --- |
| MD5 del bootstrap de entrada | `9f97d0004c205a5d5bb247578098e153` |
| MD5 del bootstrap de salida | `6194af1bd0dd5d554b6526cf36b2088d` |
| Operaciones hex | 12 |
| Operaciones copy | 8 |
| Bytes escritos por operaciones hex | 1472 |
| Bytes copiados de la imagen oficial | 73 |
| Regiones distintas (hueco menor de 32 bytes) | 4 |
| Bytes distintos tocados | 1545 |

| Inicio | Fin | Tamano | Tipo | Operaciones | Bytes hex | Bytes copiados |
| --- | --- | --- | --- | --- | --- | --- |
| `0x49bc` | `0x4ed4` | 1304 | mixto | 17 | 1231 | 73 |
| `0x1000` | `0x10ec` | 236 | propio (codigo o datos nuevos) | 1 | 236 | 0 |
| `0x4944` | `0x4947` | 3 | propio (codigo o datos nuevos) | 1 | 3 | 0 |
| `0x88` | `0x8a` | 2 | propio (codigo o datos nuevos) | 1 | 2 | 0 |

| Zona | Inicio | Fin | Fuente | Regiones | Bytes dentro |
| --- | --- | --- | --- | --- | --- |
| Bootstrap antes del cargador (vectores de arranque) | `0x0` | `0x4000` | `third_party/icom-byof/IC705_DAT_FORMAT.md` | 2 | 238 |
| Cargador original (copiado a RAM) | `0x4000` | `0x49bc` | `third_party/icom-byof/IC705_DAT_FORMAT.md` | 1 | 3 |
| Por encima del cargador original, antes de la etiqueta | `0x49bc` | `0x4f00` | `third_party/icom-byof/IC705_DAT_FORMAT.md`, `third_party/icom-byof/ic_rza1_repack.py` | 1 | 1304 |
| Etiqueta del bootloader (se conserva) | `0x4f00` | `0x4f10` | `third_party/icom-byof/ic_rza1_repack.py` | 0 | 0 |
| Resto del bootstrap | `0x4f10` | `0x10000` | `third_party/icom-byof/ic_rza1_repack.py`, `third_party/icom-byof/IC705_DAT_FORMAT.md` | 0 | 0 |

## 9700E150_20261113v3

### Datos generales

| Campo | Valor |
| --- | --- |
| Fichero del parche | `third_party/icom-custom-firmware/docs/patches/9700E150_20261113v3.json` |
| Descripcion | `IC-9700 E1.50 custom 20261113v3` |
| Radio y version oficial | IC-9700 E 1.50 |
| Archivo oficial | `9700E150.dat` |
| Release | `20261113v3` |
| Direccion de carga | `0x20005000` |
| Tamano de imagen | `4238864` |
| Tamano de la imagen oficial (documentado) | `4215604` |
| Crecimiento respecto a la oficial | `23260` |
| MD5 de entrada | `6f04fd2248ba39254ed01b30b52ce36a` |
| MD5 de la imagen principal de entrada | `eea365d28c007ce44aded0a37955913f` |
| MD5 de salida | `51e9d2da39790357f220f3bea3fe4879` |
| MD5 de la imagen principal de salida | `0888e4a1698b463b126eaf802ef32d3a` |
| Operaciones hex | 620 |
| Operaciones copy | 762 |
| Bytes escritos por operaciones hex | 16427 |
| Bytes copiados de la imagen oficial | 16093 |
| Regiones distintas (hueco menor de 32 bytes) | 77 |
| Bytes distintos tocados | 32520 |
| Bytes de regiones por encima de la imagen oficial | 21990 |

### Las 40 regiones mayores de la imagen principal

Se muestran como maximo 40 regiones, ordenadas de mayor a menor tamano.

| Inicio | Fin | Tamano | Tipo | Operaciones | Bytes hex | Bytes copiados |
| --- | --- | --- | --- | --- | --- | --- |
| `0x2040d120` | `0x2040f9b4` | 10388 | mixto | 576 | 7555 | 2733 |
| `0x2040ab74` | `0x2040cf94` | 9248 | mixto | 524 | 1176 | 5805 |
| `0x2030beb8` | `0x2030d9ff` | 6983 | mixto | 23 | 150 | 6833 |
| `0x202f6ab8` | `0x202f8350` | 6296 | mixto | 72 | 5951 | 345 |
| `0x2040a4a8` | `0x2040aafe` | 1622 | mixto | 75 | 778 | 203 |
| `0x2040fbb1` | `0x2040fe08` | 599 | mixto | 32 | 457 | 142 |
| `0x2040d025` | `0x2040d074` | 79 | mixto | 6 | 43 | 16 |
| `0x2040fa08` | `0x2040fa37` | 47 | mixto | 4 | 31 | 16 |
| `0x201271d4` | `0x201271f4` | 32 | propio (codigo o datos nuevos) | 2 | 16 | 0 |
| `0x20005024` | `0x20005033` | 15 | propio (codigo o datos nuevos) | 1 | 15 | 0 |
| `0x200eb06c` | `0x200eb078` | 12 | propio (codigo o datos nuevos) | 1 | 12 | 0 |
| `0x200d81a0` | `0x200d81a7` | 7 | propio (codigo o datos nuevos) | 1 | 7 | 0 |
| `0x200d9c60` | `0x200d9c67` | 7 | propio (codigo o datos nuevos) | 1 | 7 | 0 |
| `0x203098b4` | `0x203098bb` | 7 | propio (codigo o datos nuevos) | 1 | 7 | 0 |
| `0x20309bcc` | `0x20309bd3` | 7 | propio (codigo o datos nuevos) | 1 | 7 | 0 |
| `0x2040a340` | `0x2040a347` | 7 | propio (codigo o datos nuevos) | 1 | 7 | 0 |
| `0x2000fa58` | `0x2000fa5c` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x20025bd4` | `0x20025bd8` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x200261b8` | `0x200261bc` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x2004d10c` | `0x2004d110` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x200535a4` | `0x200535a8` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x20081464` | `0x20081468` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x20087d00` | `0x20087d04` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x200d2be0` | `0x200d2be4` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x200d2c18` | `0x200d2c1c` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x200d569c` | `0x200d56a0` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x200d89d8` | `0x200d89dc` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x200d9090` | `0x200d9094` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x200eb90c` | `0x200eb910` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x200f15f8` | `0x200f15fc` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x200f1b38` | `0x200f1b3c` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x2011f824` | `0x2011f828` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x20127160` | `0x20127164` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x2013ed28` | `0x2013ed2c` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x2013f974` | `0x2013f978` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x2013fa98` | `0x2013fa9c` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x2014b5b0` | `0x2014b5b4` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x2014bfe8` | `0x2014bfec` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x2014c10c` | `0x2014c110` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x2014c308` | `0x2014c30c` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |

### Histograma por bloque de 64 KiB

| Bloque | Bytes tocados | Cobertura | Regiones |
| --- | --- | --- | --- |
| `0x20000000` | 19 | 0.03% | 2 |
| `0x20010000` | 18 | 0.03% | 6 |
| `0x20020000` | 8 | 0.01% | 2 |
| `0x20040000` | 4 | 0.01% | 1 |
| `0x20050000` | 7 | 0.01% | 2 |
| `0x20060000` | 12 | 0.02% | 4 |
| `0x20080000` | 11 | 0.02% | 3 |
| `0x20090000` | 3 | 0.00% | 1 |
| `0x200a0000` | 3 | 0.00% | 1 |
| `0x200b0000` | 3 | 0.00% | 1 |
| `0x200d0000` | 34 | 0.05% | 7 |
| `0x200e0000` | 19 | 0.03% | 3 |
| `0x200f0000` | 8 | 0.01% | 2 |
| `0x20110000` | 4 | 0.01% | 1 |
| `0x20120000` | 23 | 0.04% | 3 |
| `0x20130000` | 18 | 0.03% | 5 |
| `0x20140000` | 20 | 0.03% | 5 |
| `0x20150000` | 9 | 0.01% | 3 |
| `0x20160000` | 21 | 0.03% | 7 |
| `0x20170000` | 21 | 0.03% | 7 |
| `0x202f0000` | 6296 | 9.61% | 1 |
| `0x20300000` | 6997 | 10.68% | 3 |
| `0x20400000` | 18962 | 28.93% | 7 |

### Cruce con el mapa de memoria documentado

| Zona | Inicio | Fin | Fuente | Regiones | Bytes dentro |
| --- | --- | --- | --- | --- | --- |
| Cabecera de la imagen (vectores y literales) hasta el punto de entrada | `0x20005000` | `0x20005060` | `third_party/icom-byof/IC705_DAT_FORMAT.md`, `third_party/icom-byof/IC705_FLASH_LAYOUT.md` | 1 | 15 |
| Cuerpo de la imagen oficial | `0x20005060` | `0x2040a334` | `third_party/icom-byof/IC705_DAT_FORMAT.md`, `third_party/icom-byof/IC9700_FLASH_LAYOUT.md` | 69 | 13559 |
| Anadido por encima de la imagen oficial (codigo propio) | `0x2040a334` | `0x2040fe10` | `third_party/icom-byof/IC705_DAT_FORMAT.md`, `third_party/icom-byof/IC9700_FLASH_LAYOUT.md` | 7 | 21990 |

### Bootstrap y bootloader

Las direcciones son desplazamientos dentro de los 64 KiB del bootstrap (cargador en RAM `0x20004000`).

| Campo | Valor |
| --- | --- |
| MD5 del bootstrap de entrada | `eec896d4b9a7d254dc8723df4ed4cf16` |
| MD5 del bootstrap de salida | `9fba6f0b672727ecdf5ee6131f8b8999` |
| Operaciones hex | 13 |
| Operaciones copy | 10 |
| Bytes escritos por operaciones hex | 1412 |
| Bytes copiados de la imagen oficial | 89 |
| Regiones distintas (hueco menor de 32 bytes) | 3 |
| Bytes distintos tocados | 1501 |

| Inicio | Fin | Tamano | Tipo | Operaciones | Bytes hex | Bytes copiados |
| --- | --- | --- | --- | --- | --- | --- |
| `0x4890` | `0x4e68` | 1496 | mixto | 21 | 1407 | 89 |
| `0x4840` | `0x4843` | 3 | propio (codigo o datos nuevos) | 1 | 3 | 0 |
| `0x88` | `0x8a` | 2 | propio (codigo o datos nuevos) | 1 | 2 | 0 |

| Zona | Inicio | Fin | Fuente | Regiones | Bytes dentro |
| --- | --- | --- | --- | --- | --- |
| Bootstrap antes del cargador (vectores de arranque) | `0x0` | `0x4000` | `third_party/icom-byof/IC9700_FLASH_LAYOUT.md` | 1 | 2 |
| Cargador (desde su inicio; longitud no documentada) hasta la etiqueta | `0x4000` | `0x4f00` | `third_party/icom-byof/IC9700_FLASH_LAYOUT.md`, `third_party/icom-byof/ic_rza1_repack.py` | 2 | 1499 |
| Etiqueta del bootloader (se conserva) | `0x4f00` | `0x4f10` | `third_party/icom-byof/ic_rza1_repack.py` | 0 | 0 |
| Resto del bootstrap | `0x4f10` | `0x10000` | `third_party/icom-byof/ic_rza1_repack.py`, `third_party/icom-byof/IC705_DAT_FORMAT.md` | 0 | 0 |

## 9700E150_trv16c

### Datos generales

| Campo | Valor |
| --- | --- |
| Fichero del parche | `third_party/icom-byof/patches/9700E150_trv16c.json` |
| Descripcion | `IC-9700 E1.50 + TRV 1.6c + A/B bootloader 1.5d (as tested)` |
| Radio y version oficial | IC-9700 E 1.50 |
| Archivo oficial | `9700E150.dat` |
| Release | `trv16c` |
| Direccion de carga | `0x20005000` |
| Tamano de imagen | `4233936` |
| Tamano de la imagen oficial (documentado) | `4215604` |
| Crecimiento respecto a la oficial | `18332` |
| MD5 de entrada | `6f04fd2248ba39254ed01b30b52ce36a` |
| MD5 de la imagen principal de entrada | `eea365d28c007ce44aded0a37955913f` |
| MD5 de salida | `1a9d78b5a6295b8217d7cbe26c02d728` |
| MD5 de la imagen principal de salida | `297b3c92c67ca326e75ec2982b4088cf` |
| Operaciones hex | 478 |
| Operaciones copy | 615 |
| Bytes escritos por operaciones hex | 7111 |
| Bytes copiados de la imagen oficial | 14752 |
| Regiones distintas (hueco menor de 32 bytes) | 70 |
| Bytes distintos tocados | 21863 |
| Bytes de regiones por encima de la imagen oficial | 17581 |

### Las 40 regiones mayores de la imagen principal

Se muestran como maximo 40 regiones, ordenadas de mayor a menor tamano.

| Inicio | Fin | Tamano | Tipo | Operaciones | Bytes hex | Bytes copiados |
| --- | --- | --- | --- | --- | --- | --- |
| `0x2040aafc` | `0x2040cef4` | 9208 | mixto | 522 | 1163 | 5799 |
| `0x2030beb8` | `0x2030d9e8` | 6960 | mixto | 21 | 136 | 6824 |
| `0x2040d080` | `0x2040eac8` | 6728 | mixto | 404 | 4818 | 1910 |
| `0x2040a4a8` | `0x2040aabf` | 1559 | mixto | 75 | 713 | 203 |
| `0x2040cf85` | `0x2040cfd4` | 79 | mixto | 6 | 43 | 16 |
| `0x200eb06c` | `0x200eb078` | 12 | propio (codigo o datos nuevos) | 1 | 12 | 0 |
| `0x200d81a0` | `0x200d81a7` | 7 | propio (codigo o datos nuevos) | 1 | 7 | 0 |
| `0x200d9c60` | `0x200d9c67` | 7 | propio (codigo o datos nuevos) | 1 | 7 | 0 |
| `0x203098b4` | `0x203098bb` | 7 | propio (codigo o datos nuevos) | 1 | 7 | 0 |
| `0x2040a340` | `0x2040a347` | 7 | propio (codigo o datos nuevos) | 1 | 7 | 0 |
| `0x2000fa58` | `0x2000fa5c` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x20025bd4` | `0x20025bd8` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x200261b8` | `0x200261bc` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x2004d10c` | `0x2004d110` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x200535a4` | `0x200535a8` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x20081464` | `0x20081468` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x20087d00` | `0x20087d04` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x200d569c` | `0x200d56a0` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x200d89d8` | `0x200d89dc` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x200d9090` | `0x200d9094` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x200f15f8` | `0x200f15fc` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x200f1b38` | `0x200f1b3c` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x2011f824` | `0x2011f828` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x2013ed28` | `0x2013ed2c` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x2013f974` | `0x2013f978` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x2013fa98` | `0x2013fa9c` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x2014b5b0` | `0x2014b5b4` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x2014bfe8` | `0x2014bfec` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x2014c10c` | `0x2014c110` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x2014c308` | `0x2014c30c` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x2014dabc` | `0x2014dac0` | 4 | propio (codigo o datos nuevos) | 1 | 4 | 0 |
| `0x200100b0` | `0x200100b3` | 3 | propio (codigo o datos nuevos) | 1 | 3 | 0 |
| `0x200100d8` | `0x200100db` | 3 | propio (codigo o datos nuevos) | 1 | 3 | 0 |
| `0x20010100` | `0x20010103` | 3 | propio (codigo o datos nuevos) | 1 | 3 | 0 |
| `0x20010128` | `0x2001012b` | 3 | propio (codigo o datos nuevos) | 1 | 3 | 0 |
| `0x2001a240` | `0x2001a243` | 3 | propio (codigo o datos nuevos) | 1 | 3 | 0 |
| `0x2001d67c` | `0x2001d67f` | 3 | propio (codigo o datos nuevos) | 1 | 3 | 0 |
| `0x200520a0` | `0x200520a3` | 3 | propio (codigo o datos nuevos) | 1 | 3 | 0 |
| `0x2006a0ac` | `0x2006a0af` | 3 | propio (codigo o datos nuevos) | 1 | 3 | 0 |
| `0x2006a198` | `0x2006a19b` | 3 | propio (codigo o datos nuevos) | 1 | 3 | 0 |

### Histograma por bloque de 64 KiB

| Bloque | Bytes tocados | Cobertura | Regiones |
| --- | --- | --- | --- |
| `0x20000000` | 4 | 0.01% | 1 |
| `0x20010000` | 18 | 0.03% | 6 |
| `0x20020000` | 8 | 0.01% | 2 |
| `0x20040000` | 4 | 0.01% | 1 |
| `0x20050000` | 7 | 0.01% | 2 |
| `0x20060000` | 12 | 0.02% | 4 |
| `0x20070000` | 2 | 0.00% | 1 |
| `0x20080000` | 11 | 0.02% | 3 |
| `0x20090000` | 5 | 0.01% | 2 |
| `0x200a0000` | 3 | 0.00% | 1 |
| `0x200b0000` | 3 | 0.00% | 1 |
| `0x200d0000` | 26 | 0.04% | 5 |
| `0x200e0000` | 15 | 0.02% | 2 |
| `0x200f0000` | 10 | 0.02% | 3 |
| `0x20110000` | 4 | 0.01% | 1 |
| `0x20120000` | 3 | 0.00% | 1 |
| `0x20130000` | 18 | 0.03% | 5 |
| `0x20140000` | 20 | 0.03% | 5 |
| `0x20150000` | 9 | 0.01% | 3 |
| `0x20160000` | 21 | 0.03% | 7 |
| `0x20170000` | 21 | 0.03% | 7 |
| `0x20300000` | 6967 | 10.63% | 2 |
| `0x20400000` | 14672 | 22.39% | 5 |

### Cruce con el mapa de memoria documentado

| Zona | Inicio | Fin | Fuente | Regiones | Bytes dentro |
| --- | --- | --- | --- | --- | --- |
| Cabecera de la imagen (vectores y literales) hasta el punto de entrada | `0x20005000` | `0x20005060` | `third_party/icom-byof/IC705_DAT_FORMAT.md`, `third_party/icom-byof/IC705_FLASH_LAYOUT.md` | 0 | 0 |
| Cuerpo de la imagen oficial | `0x20005060` | `0x2040a334` | `third_party/icom-byof/IC705_DAT_FORMAT.md`, `third_party/icom-byof/IC9700_FLASH_LAYOUT.md` | 65 | 7191 |
| Anadido por encima de la imagen oficial (codigo propio) | `0x2040a334` | `0x2040ead0` | `third_party/icom-byof/IC705_DAT_FORMAT.md`, `third_party/icom-byof/IC9700_FLASH_LAYOUT.md` | 5 | 17581 |

### Bootstrap y bootloader

Las direcciones son desplazamientos dentro de los 64 KiB del bootstrap (cargador en RAM `0x20004000`).

| Campo | Valor |
| --- | --- |
| MD5 del bootstrap de entrada | `eec896d4b9a7d254dc8723df4ed4cf16` |
| MD5 del bootstrap de salida | `9fba6f0b672727ecdf5ee6131f8b8999` |
| Operaciones hex | 13 |
| Operaciones copy | 10 |
| Bytes escritos por operaciones hex | 1412 |
| Bytes copiados de la imagen oficial | 89 |
| Regiones distintas (hueco menor de 32 bytes) | 3 |
| Bytes distintos tocados | 1501 |

| Inicio | Fin | Tamano | Tipo | Operaciones | Bytes hex | Bytes copiados |
| --- | --- | --- | --- | --- | --- | --- |
| `0x4890` | `0x4e68` | 1496 | mixto | 21 | 1407 | 89 |
| `0x4840` | `0x4843` | 3 | propio (codigo o datos nuevos) | 1 | 3 | 0 |
| `0x88` | `0x8a` | 2 | propio (codigo o datos nuevos) | 1 | 2 | 0 |

| Zona | Inicio | Fin | Fuente | Regiones | Bytes dentro |
| --- | --- | --- | --- | --- | --- |
| Bootstrap antes del cargador (vectores de arranque) | `0x0` | `0x4000` | `third_party/icom-byof/IC9700_FLASH_LAYOUT.md` | 1 | 2 |
| Cargador (desde su inicio; longitud no documentada) hasta la etiqueta | `0x4000` | `0x4f00` | `third_party/icom-byof/IC9700_FLASH_LAYOUT.md`, `third_party/icom-byof/ic_rza1_repack.py` | 2 | 1499 |
| Etiqueta del bootloader (se conserva) | `0x4f00` | `0x4f10` | `third_party/icom-byof/ic_rza1_repack.py` | 0 | 0 |
| Resto del bootstrap | `0x4f10` | `0x10000` | `third_party/icom-byof/ic_rza1_repack.py`, `third_party/icom-byof/IC705_DAT_FORMAT.md` | 0 | 0 |

## Comparacion entre las releases

| Metrica | `705E140_20261113v1` | `705J140_20261113v1` | `9700E150_20261113v3` |
| --- | --- | --- | --- |
| Radio | IC-705 E 1.40 | IC-705 J 1.40 | IC-9700 E 1.50 |
| Archivo oficial | `705E140.dat` | `705J140.dat` | `9700E150.dat` |
| MD5 de entrada | `2c9c1d7f3fc80ef173e01d841cd1248a` | `b605171288db4a74e0992a8f2afcb1c3` | `6f04fd2248ba39254ed01b30b52ce36a` |
| MD5 de salida | `1a4577ca926089198bcdf63155ac7410` | `d7a7f87b9b16f262b188fe3735b3682b` | `51e9d2da39790357f220f3bea3fe4879` |
| Tamano de imagen | `3629056` | `3629056` | `4238864` |
| Crecimiento respecto a la oficial | `0` | `0` | `23260` |
| Operaciones hex | 729 | 796 | 620 |
| Operaciones copy | 1138 | 1391 | 762 |
| Bytes hex | 15188 | 10368 | 16427 |
| Bytes copiados | 52097 | 56319 | 16093 |
| Regiones | 109 | 109 | 77 |
| Bytes por encima de la imagen oficial | 0 | 0 | 21990 |
| Operaciones bootstrap | 20 | 20 | 23 |
| Bytes hex bootstrap | 1472 | 1472 | 1412 |
| Bytes copiados bootstrap | 73 | 73 | 89 |
| Regiones bootstrap | 4 | 4 | 3 |

## Operaciones identicas entre parches de la misma radio

| Parche A | Parche B | Operaciones identicas | Operaciones de A | Operaciones de B | Identicas en bootstrap | Bootstrap de A | Bootstrap de B |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `705E140_20261113v1` | `705J140_20261113v1` | 207 | 1867 | 2187 | 20 | 20 | 20 |
| `9700E150_20261113v3` | `9700E150_trv16c` | 58 | 1382 | 1093 | 23 | 23 | 23 |

## Fuentes del mapa de memoria

| Dato | Valor | Fuente |
| --- | --- | --- |
| Cargador copiado a RAM (desplazamiento en el bootstrap) | `0x4000` - `0x49bc` | `third_party/icom-byof/IC705_DAT_FORMAT.md` |
| Direccion RAM del cargador | `0x20004000` | `third_party/icom-byof/IC705_DAT_FORMAT.md` |
| Tamano del bootstrap | `0x10000` | `third_party/icom-byof/IC705_DAT_FORMAT.md` |
| Etiqueta del bootloader | `0x4f00` - `0x4f10` | `third_party/icom-byof/ic_rza1_repack.py` |
| Direccion RAM de la imagen principal | `0x20005000` | `third_party/icom-byof/IC705_DAT_FORMAT.md` |
| Punto de entrada | `0x20005060` | `third_party/icom-byof/IC705_FLASH_LAYOUT.md` |
| Tamano de la imagen oficial IC-705 | `0x376000` | `third_party/icom-byof/IC705_FLASH_LAYOUT.md` |
| Tamano de la imagen oficial IC-9700 | `0x405334` | `third_party/icom-byof/IC9700_FLASH_LAYOUT.md` |
