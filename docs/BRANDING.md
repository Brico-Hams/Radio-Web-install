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

Rediseño del 28-10-2026: naranja Bricohams, superficies neutras y tarjetas
con jerarquía clara. La web y los instaladores comparten el mismo diseño.
El selector Apariencia permite Sistema, Claro y Oscuro; se guarda localmente,
sin cuenta, y sigue los cambios del sistema cuando está en Sistema. La ayuda
usa la misma preferencia. Android adapta sus controles nativos al sistema.
El logotipo original no cambia. Los estados siempre conservan texto explícito.

| Token | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| `--bg` | `#FFFFFF` | `#111518` | Fondo |
| `--surface` | `#F6F7F8` | `#1C2329` | Tarjetas y paneles |
| `--text` | `#23272B` | `#F6F8FA` | Texto principal |
| `--text-muted` | `#59636B` | `#BAC4CC` | Texto secundario |
| `--border` | `#DCE1E5` | `#38434C` | Bordes |
| `--link` | `#AA410B` | `#FFA06A` | Enlaces |
| `--focus` | `#F26B1D` | `#FFC18F` | Anillo de foco |
| `--brand-orange` | `#F26B1D` | `#F26B1D` | Naranja Bricohams |
| `--on-accent` | `#23272B` | `#23272B` | Texto sobre naranja |

Fuente de verdad: el manual oficial de colores `BricoHams_Guia_Colores_Web_Pantone_Claro_Oscuro_con_Prompt_IA.pdf`, que no se incluye en el repositorio. El grafito de marca es `--brand-ink`. El tema se aplica con `data-theme` en el elemento raíz y `localStorage`.

Botones primarios: texto `--on-accent` sobre `--brand-orange: #F26B1D` en ambos temas, nunca blanco sobre naranja. El naranja no se usa como texto pequeño sobre fondo claro. Foco visible con `outline: 3px solid var(--focus)`. Controles principales de 44 px, tablas con desplazamiento interno, navegación móvil horizontal y animación solo sin reducción de movimiento.

Contraste WCAG 2.1 calculado (mínimo 4,5:1 para texto y 3:1 para el anillo de foco):

| Par | Claro | Oscuro |
| --- | --- | --- |
| `--text` / `--bg` | 15,0 | 17,2 |
| `--text` / `--surface` | 14,0 | 14,9 |
| `--text-muted` / `--bg` | 6,1 | 10,3 |
| `--text-muted` / `--surface` | 5,7 | 9,0 |
| `--link` / `--bg` | 6,0 | 9,2 |
| `--link` / `--surface` | 5,6 | 7,9 |
| `--on-accent` / `--brand-orange` | 4,9 | 4,9 |
| `--focus` / `--bg` | 3,05 | 11,6 |

Logotipo: solo el PNG original, sin filtros ni inversión; en modo oscuro se coloca sobre una placa blanca discreta (`--plate`). Los estados de error y aviso conservan texto explícito y cumplen AA en ambos temas.

## Estructura

- Barra superior fija: estado de la conexión (copia de `#radio-status`), distintivo de modo (`#mode-badge`) y botón «⌁ Conectar», que acciona el de la sección y se deshabilita con él.
- Barra lateral: logotipo, navegación y, en las páginas de radio, pasos numerados (0 Copias y conexión … 4 Firmware) que llevan a cada sección.
- Etiqueta sobre el título: `RADIOAFICIÓN · HAZLO TÚ MISMO`.

## Tipografía

`Inter` para la interfaz y `Montserrat` 700–800 para los titulares grandes, con respaldo en fuentes del sistema (`system-ui`, Segoe UI, Roboto…). No se cargan fuentes web externas, para respetar la CSP y funcionar sin conexión.

## Voz

- Español claro, técnico y honesto: los límites se explican antes que las promesas.
- Avisos de seguridad directos: qué puede fallar y qué hacer.
- No se afirma ninguna compatibilidad ni operación que no esté verificada.
- La atribución de las fuentes de datos es siempre visible.
