# Guía de marca · Bricohams

## Nombre

- Producto: **Bricohams Radio Workspace**.
- Forma corta: **Bricohams** (barra superior y pie).
- Barra lateral: `BRICOHAMS` con el subtítulo `RADIO WORKSPACE`.

## Logotipo

`bricohams-logo.svg` es un vectorial de 64×64: un cuadrado redondeado oscuro con contorno degradado menta→azul, una «B» y dos arcos de onda de radio. Se usa como favicon y, a 40 px, en la barra lateral.

Reglas de uso:

- No deformarlo, recolorearlo ni añadirle sombras.
- Margen libre mínimo: 25 % del ancho.
- Tamaño mínimo: 16 px como favicon y 32 px en la interfaz.
- No combinarlo con logotipos de OpenGD77, Quansheng, F4HWN ni grid.radio de forma que sugiera afiliación.

## Paleta

Estilo compartido con Bricohams Studio: fondo oscuro, tarjetas, acento verde azulado.

| Token | Color | Uso | Contraste (AA) |
| --- | --- | --- | --- |
| `--bg` | `#0b1418` | Fondo | — |
| `--panel` | `#111d22` | Tarjetas y paneles | — |
| `--line` | `#1f3238` | Bordes | decorativo |
| `--text` | `#e6f1f2` | Texto principal | 16,2:1 sobre fondo; 14,9:1 sobre panel |
| `--muted` | `#8fa7ab` | Texto secundario | 7,4:1 sobre fondo; 6,8:1 sobre panel |
| `--accent` (`--mint`) | `#2bb3a3` | Acento, foco y estados correctos | 7,2:1 sobre fondo; 6,6:1 sobre panel |
| `--blue` | `#89b9ff` | Enlaces y acento secundario | 8,5:1 sobre panel |

Texto de los botones primarios: `#042420` sobre el acento (6,3:1).

## Estructura

- Barra superior fija: estado de la conexión (copia de `#radio-status`), distintivo de modo (`#mode-badge`) y botón «⌁ Conectar», que acciona el de la sección y se deshabilita con él.
- Barra lateral: logotipo, navegación y, en las páginas de radio, pasos numerados (0 Copias y conexión … 4 Firmware) que llevan a cada sección.
- Etiqueta sobre el título: `RADIOAFICIÓN · HAZLO TÚ MISMO`.

## Tipografía

Fuente del sistema (`system-ui`, Segoe UI, Roboto…), sin fuentes web externas, para respetar la CSP y no cargar recursos de terceros.

## Voz

- Español claro, técnico y honesto: los límites se explican antes que las promesas.
- Avisos de seguridad directos: qué puede fallar y qué hacer.
- No se afirma ninguna compatibilidad ni operación que no esté verificada.
- La atribución de las fuentes de datos es siempre visible.
