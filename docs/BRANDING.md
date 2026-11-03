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
- Barra lateral: imagen completa a 166 px de ancho (limitada al espacio disponible); en móvil, 128 px y subtítulo al lado. No ocultar la marca en pantallas pequeñas.
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

Manual oficial de colores BricoHams v1.1 (03-11-2026), PDF
`BricoHams_Guia_Colores_Web_Pantone_Claro_Oscuro_con_Prompt_IA.pdf`
(no se incluye en el repositorio). Sustituye a todas las paletas anteriores
(`#f7941d`, `#F26B21`, `#a64b00`, `#0b1418`, `#0e1420`, `#111d22`, `#172131`,
`#89b9ff`, `#205da8`, `#0A2540` y `#FF6B00`), que no deben volver a usarse.

El selector Apariencia permite Sistema, Claro y Oscuro; se guarda en
`localStorage` y se aplica como `data-theme` en `<html>` antes de pintar.
Android sigue el modo del sistema (`res/values/colors.xml` y
`res/values-night/colors.xml`). Los estados siempre conservan texto explícito.

Ambos temas: `--brand-ink` `#23272B` (grafito), `--brand-orange` `#F26B1D`
(CTA y detalles) y `--on-accent` `#23272B` (texto sobre naranja).

| Token | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| `--bg` | `#FFFFFF` | `#111518` | Fondo |
| `--surface` | `#F6F7F8` | `#1C2329` | Tarjetas y paneles |
| `--border` | `#DCE1E5` | `#38434C` | Bordes |
| `--text` | `#23272B` | `#F6F8FA` | Texto principal |
| `--text-muted` | `#59636B` | `#BAC4CC` | Texto secundario |
| `--link` | `#AA410B` | `#FFA06A` | Enlaces y texto de acento |
| `--focus` | `#F26B1D` | `#FFC18F` | Contorno `:focus-visible` de 3 px |

Reglas (WCAG 2.2 AA):

- Botón primario: fondo naranja `#F26B1D` con texto grafito `#23272B` en ambos temas. Nunca texto blanco sobre naranja (3,05:1).
- El naranja `#F26B1D` no se usa como texto pequeño sobre blanco; en claro se usa `#AA410B`.
- Logotipo: solo el PNG original, sin filtros ni inversión; en oscuro, sobre una placa blanca discreta con esquinas redondeadas.
- Tipografía: Inter para la interfaz y Montserrat 700-800 para titulares grandes, con la pila de fuentes del sistema como respaldo y sin cargar fuentes remotas.
- Estados (éxito/aviso/error): colores funcionales con contraste AA en ambos temas; nunca sustituyen al naranja de los CTA.
- Solo impresión: Pantone 426 C (grafito) y 165 C (naranja; 158 C alternativa). No son colores de pantalla.
- Firmware LCD monocromo: logotipo de arranque y cadena «Bricohams», sin colores.

| Par | Claro | Oscuro |
| --- | --- | --- |
| Texto / fondo | 14,6:1 | 17,0:1 |
| Texto secundario / fondo | 5,9:1 | 10,4:1 |
| Enlace / fondo | 6,5:1 | 8,5:1 |
| Grafito sobre naranja (botón) | 4,9:1 | 4,9:1 |
| Naranja / fondo (no textual) | 3,05:1 | 6,03:1 |
| Blanco sobre naranja (prohibido) | 3,05:1 | 3,05:1 |

Las cifras son aproximadas (calculadas con la fórmula WCAG); las pruebas
automáticas de cada plataforma comprueban el mínimo de 4,5:1 para texto.


## Estructura

- Barra superior fija: estado de la conexión (copia de `#radio-status`), distintivo de modo (`#mode-badge`) y botón «⌁ Conectar», que acciona el de la sección y se deshabilita con él.
- Barra lateral: logotipo, navegación y, en las páginas de radio, pasos numerados (0 Copias y conexión … 4 Firmware) que llevan a cada sección.
- Etiqueta sobre el título: `RADIOAFICIÓN · HAZLO TÚ MISMO`.

## Tipografía

Inter para la interfaz y Montserrat 700-800 para titulares grandes, siempre con la pila de fuentes del sistema (`system-ui`, Segoe UI, Roboto…) como respaldo. No se cargan fuentes web externas, para respetar la CSP y el uso sin conexión; solo se usan si están instaladas o empaquetadas localmente.

## Voz

- Español claro, técnico y honesto: los límites se explican antes que las promesas.
- Avisos de seguridad directos: qué puede fallar y qué hacer.
- No se afirma ninguna compatibilidad ni operación que no esté verificada.
- La atribución de las fuentes de datos es siempre visible.
