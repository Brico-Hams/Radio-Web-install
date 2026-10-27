# Guía de marca · Bricohams

## Nombre

- Producto: **Bricohams Radio Workspace**.
- Forma corta: **Bricohams** (barra superior y pie).
- Barra lateral: logotipo original de Bricohams con el subtítulo `RADIO WORKSPACE`, sin duplicar el nombre que ya incluye la imagen.

## Logotipo

[bricohams-logo.png](../bricohams-logo.png) es el **PNG original de 1200 × 446** usado por [Bricohams Studio](https://brico-hams.github.io/Bricohams-Studio/). Se obtuvo de [assets/logo-bricohams.png, commit 767edd6](https://github.com/Brico-Hams/Bricohams-Studio/blob/767edd66028d10f859346190d0c8044bd8e5a2b2/assets/logo-bricohams.png). Su SHA-256 es `0e1bec16953129cfc9c946d24e56347ddfb38878137ba43c7e84729acf811c87`, idéntico al PNG incrustado en la página de Studio, comprobado el 2026-10-21.

Sustituye al anterior icono SVG de una «B» con ondas, que no era el logotipo de Bricohams. No se redibuja ni se inventa una variante de la marca.

Reglas de uso:

- No deformarlo, recortarlo, recolorearlo ni añadirle sombras. Mantener su fondo original y la proporción 1200:446, con `height: auto`.
- Barra lateral: imagen completa a 178 px de ancho (limitada al espacio disponible); en móvil, 144 px y subtítulo al lado. No ocultar la marca en pantallas pequeñas.
- README: 240 px de ancho con altura proporcional. Favicons y acceso del escritorio Linux usan el mismo PNG; no hay una variante cuadrada aprobada.
- Dejar al menos 10 px entre la imagen y el subtítulo en escritorio, y 14 px en móvil. Estas medidas son decisiones de maquetación del proyecto, no una guía oficial adicional de marca.
- No combinarlo con logotipos de OpenGD77, Quansheng, F4HWN ni grid.radio de forma que sugiera afiliación.

Excepción específica del firmware solicitada el 25-10-2026: el LCD monocromo
requiere una adaptación proporcional del original a 128 × 48, sin color,
sobre fondo vacío, con la identificación `Bricohams BETA` debajo. Se genera
desde el PNG original, no se dibuja una marca nueva. No sustituye el PNG
a color en web o Android. Construcción y límites en la
[guía de firmware](BRICOHAMS-FIRMWARE.md#branding-de-arranque-implementado).

## Paleta

**Cambio solicitado el 25-10-2026:** el color corporativo indicado por el
usuario es el **naranja**. La paleta verde azulada de abajo describe la
implementación web actual, no la identidad objetivo. Android ya usa
`#FF9800` como acento en su tema; esto no acredita contraste ni usabilidad
en todos los controles y dispositivos. La migración final de la web a
naranja se realizará después de completar y probar las funciones, según
la secuencia solicitada. El tono exacto y los contrastes
deberán validarse antes de sustituir los tokens; no recolorear el logotipo
original ni usar únicamente el color para comunicar estados.

Interfaz inspirada en Bricohams Studio: fondo oscuro, tarjetas y acento verde azulado. La siguiente paleta es la de Radio Workspace, no una afirmación de coincidencia exacta con los colores de Studio ni una recoloración del logotipo.

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
