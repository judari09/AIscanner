# Design System: NoteScan Productivity System

Fuente de verdad para todo valor visual usado en la interfaz web (`001-web-ui-upload-explorer`).
Todas las variables de este documento se centralizan en un único archivo CSS
(`src/web/static/tokens.css`, tarea T006) — ningún otro archivo de plantilla o estilo debe usar
un color, tamaño de letra, radio o espaciado escrito a mano; siempre a través de estas variables.

## Nota de reconciliación (importante)

El brief original traía dos fuentes que no coincidían entre sí: un bloque de tokens estructurado
(estilo Material Design 3: `surface`, `primary`, `on-primary`, `*-container`, etc.) y una
sección de prosa que describía una paleta más simple (slate/blue tipo Tailwind) con algunos hex
distintos a los del bloque de tokens (ej. la prosa decía "NoteScan Blue `#2563EB`" pero ese valor
era en realidad el token `primary-container`, no `primary`; la prosa también mencionaba un color
de advertencia "Amber 500" que no existía en ningún token).

**Regla de resolución aplicada aquí**: el bloque de tokens estructurado es la fuente de verdad
para cualquier valor de color/tipografía/radio/espaciado. La prosa se usa solo para intención
cualitativa (jerarquía tonal, forma "soft-modern", layout de sidebar, ideas de componentes), y
donde da un hex que choca con un token, se reinterpreta usando el rol de token más cercano en
vez del hex literal. La única adición fuera del bloque de tokens es un color de advertencia
(`--color-warning`), porque la prosa pide uno para estados de "warning" y el token set no trae
ninguno — se documenta explícitamente como la única excepción.

**Actualización de paleta (refresco "NoteScan Earth")**: un DESIGN.md de Stitch posterior para
la misma app trajo un bloque de tokens con la misma estructura y los mismos nombres de variable,
pero con una paleta tierra/parchment (`primary` `#6f5c31`, fondo base `#fff8f3`, etc.) en vez de
la azul original. Tipografía, radios y espaciado de esa fuente coinciden exactamente con los de
abajo, así que no cambiaron. Los valores de color de la tabla siguiente ya reflejan ese refresco;
`--color-error`/`--color-on-error`/`--color-error-container`/`--color-on-error-container` y el
par `--color-warning`/`--color-on-warning` se mantuvieron sin cambio porque la nueva fuente no
da valores propios para ellos.

## Colores

Todas las variables abajo van en `:root` de `tokens.css`, con el prefijo `--color-`.

| Variable CSS | Valor | Rol (Material Design 3) |
|---|---|---|
| `--color-surface` | `#fff8f3` | Fondo base de la app (Nivel 0 de elevación) |
| `--color-surface-dim` | `#e0d9d3` | Variante atenuada de superficie |
| `--color-surface-bright` | `#fff8f3` | Variante brillante de superficie |
| `--color-surface-container-lowest` | `#ffffff` | Contenedor de menor elevación (tarjetas, Nivel 1) |
| `--color-surface-container-low` | `#faf2ec` | Contenedor de elevación baja |
| `--color-surface-container` | `#f4ede6` | Contenedor estándar |
| `--color-surface-container-high` | `#eee7e1` | Contenedor de elevación alta (menús, Nivel 2) |
| `--color-surface-container-highest` | `#e8e1db` | Contenedor de mayor elevación (modales) |
| `--color-on-surface` | `#1e1b18` | Texto principal sobre superficie |
| `--color-on-surface-variant` | `#4c463b` | Texto secundario/metadatos |
| `--color-inverse-surface` | `#33302c` | Superficie invertida (tooltips oscuros) |
| `--color-inverse-on-surface` | `#f7efe9` | Texto sobre superficie invertida |
| `--color-outline` | `#7e7669` | Bordes con énfasis (inputs activos) |
| `--color-outline-variant` | `#cfc5b6` | Bordes sutiles (cards, separadores) |
| `--color-surface-tint` | `#6f5c31` | Tinte de elevación |
| `--color-primary` | `#6f5c31` | Acción principal de alto énfasis (ej. texto/ícono activo) — "NoteScan Earth" |
| `--color-on-primary` | `#ffffff` | Texto/ícono sobre `--color-primary` |
| `--color-primary-container` | `#fee4ad` | Botón primario (Cargar), focus ring |
| `--color-on-primary-container` | `#786538` | Texto sobre `--color-primary-container` |
| `--color-inverse-primary` | `#dcc48f` | Primario sobre superficie invertida |
| `--color-secondary` | `#675d49` | Acción secundaria |
| `--color-on-secondary` | `#ffffff` | Texto sobre `--color-secondary` |
| `--color-secondary-container` | `#efe1c6` | Fondo de énfasis secundario (ítem de sidebar activo) |
| `--color-on-secondary-container` | `#6e634e` | Texto sobre `--color-secondary-container` |
| `--color-tertiary` | `#3d646f` | Acento neutro (ej. ícono de carpeta) |
| `--color-on-tertiary` | `#ffffff` | Texto sobre `--color-tertiary` |
| `--color-tertiary-container` | `#c5eefb` | Fondo de acento neutro |
| `--color-on-tertiary-container` | `#466d78` | Texto sobre `--color-tertiary-container` |
| `--color-error` | `#ba1a1a` | Errores (mensajes de fallo de procesamiento) |
| `--color-on-error` | `#ffffff` | Texto sobre `--color-error` |
| `--color-error-container` | `#ffdad6` | Fondo tenue de error |
| `--color-on-error-container` | `#93000a` | Texto sobre `--color-error-container` |
| `--color-warning` *(añadido, no está en el token set)* | `#f59e0b` | Estados de advertencia (Amber 500 estándar) |
| `--color-on-warning` *(añadido)* | `#1c1500` | Texto sobre `--color-warning` |
| `--color-primary-fixed` | `#fae0a9` | Primario fijo (no cambia con el tema) |
| `--color-primary-fixed-dim` | `#dcc48f` | Variante atenuada |
| `--color-on-primary-fixed` | `#251a00` | Texto sobre fijo |
| `--color-on-primary-fixed-variant` | `#55451b` | Texto secundario sobre fijo |
| `--color-secondary-fixed` | `#efe1c6` | Secundario fijo |
| `--color-secondary-fixed-dim` | `#d3c5ac` | Variante atenuada |
| `--color-on-secondary-fixed` | `#221b0a` | Texto sobre fijo |
| `--color-on-secondary-fixed-variant` | `#4f4632` | Texto secundario sobre fijo |
| `--color-tertiary-fixed` | `#c0e9f6` | Terciario fijo |
| `--color-tertiary-fixed-dim` | `#a5cdda` | Variante atenuada |
| `--color-on-tertiary-fixed` | `#001f26` | Texto sobre fijo |
| `--color-on-tertiary-fixed-variant` | `#244c57` | Texto secundario sobre fijo |
| `--color-background` | `#fff8f3` | Fondo general de la página |
| `--color-on-background` | `#1e1b18` | Texto sobre el fondo general |
| `--color-surface-variant` | `#e8e1db` | Variante de superficie |

## Tipografía

Enfoque de dos fuentes: **Inter** para comunicación principal (títulos, cuerpo), **Geist** para
etiquetas/metadatos técnicos (fechas, tamaños de archivo, chips de estado).

**Decisión de hosting**: ambas fuentes se auto-hospedan como `.woff2` en
`src/web/static/fonts/` (tarea T007) en vez de cargarse desde Google Fonts u otro CDN — cargar
una fuente desde un CDN externo implica que el navegador hace una petición de red a un tercero
cada vez que se abre la interfaz, lo cual va en contra del espíritu 100% local del Principio I,
aunque técnicamente el principio hable de documentos y no de assets de UI. Se declaran con
`@font-face` dentro del propio `tokens.css`.

| Variable CSS | fontFamily | Tamaño | Peso | Interlineado | Tracking |
|---|---|---|---|---|---|
| `--type-display-lg-*` | Inter | 32px | 700 | 40px | -0.02em |
| `--type-headline-md-*` | Inter | 24px | 600 | 32px | -0.01em |
| `--type-headline-sm-*` | Inter | 20px | 600 | 28px | — |
| `--type-body-lg-*` | Inter | 16px | 400 | 24px | — |
| `--type-body-md-*` | Inter | 14px | 400 | 20px | — |
| `--type-label-md-*` | Geist | 12px | 500 | 16px | 0.02em |
| `--type-label-sm-*` | Geist | 11px | 600 | 14px | — |
| `--type-headline-lg-mobile-*` | Inter | 24px | 700 | 32px | — |

(`*` = se expande a `-size`, `-weight`, `-line-height`, `-letter-spacing` según aplique, ej.
`--type-body-md-size: 14px`.)

**Uso sugerido en este feature**:
- `display-lg` / `headline-md`: título de la página (Cargar / Explorador).
- `headline-sm`: encabezados de sección (ej. "Documentos recientes").
- `body-lg`/`body-md`: texto de contenido, mensajes de estado.
- `label-md`/`label-sm`: metadatos de archivo (fecha, si tiene `.docx`, estado del trabajo).
- `headline-lg-mobile`: título de página en breakpoint móvil (<768px).

## Bordes (radios)

| Variable CSS | Valor | Uso |
|---|---|---|
| `--radius-sm` | `0.25rem` | Chips/etiquetas pequeñas |
| `--radius` | `0.5rem` | Botones, inputs, thumbnails (radio estándar "Soft-Modern") |
| `--radius-md` | `0.75rem` | — |
| `--radius-lg` | `1rem` | Tarjetas/contenedores (distinción clara contenedor vs. contenido) |
| `--radius-xl` | `1.5rem` | Modales grandes |
| `--radius-full` | `9999px` | Forma de píldora (chips de estado del trabajo) |

## Espaciado y layout

| Variable CSS | Valor | Uso |
|---|---|---|
| `--layout-sidebar-width` | `260px` | Ancho del sidebar fijo en escritorio |
| `--layout-container-max` | `1280px` | Ancho máximo del contenido |
| `--layout-gutter` | `24px` | Separación de columnas en escritorio |
| `--layout-margin-mobile` | `16px` | Margen lateral en móvil |
| `--spacing-xs` | `4px` | — |
| `--spacing-sm` | `8px` | Agrupación de elementos relacionados |
| `--spacing-md` | `16px` | Padding estándar dentro de tarjetas |
| `--spacing-lg` | `24px` | — |
| `--spacing-xl` | `48px` | — |

**Breakpoints** (aplican al layout sidebar-fijo/contenido-fluido de `base.html`):
- Móvil (`<768px`): sidebar se convierte en drawer/bottom sheet oculto por defecto; márgenes a
  `--layout-margin-mobile`.
- Tablet (`768px`–`1024px`): sidebar colapsa a solo iconos.
- Escritorio (`>1024px`): sidebar completo (`--layout-sidebar-width`), gutters a
  `--layout-gutter`.

## Elevación

Mapeada a los tonos de `surface-container-*` (tonal layering) más una sombra sutil — no se usan
los hex literales de la prosa original porque no correspondían a ningún token:

| Nivel | Fondo | Borde | Sombra | Uso en este feature |
|---|---|---|---|---|
| 0 (Base) | `--color-surface` | ninguno | ninguna | Fondo de la página |
| 1 (Card) | `--color-surface-container-lowest` | `1px solid var(--color-outline-variant)` | `0px 1px 3px rgba(0,0,0,0.05)` | Tarjetas de documento, ítems de sidebar |
| 2 (Flotante) | `--color-surface-container-high` | ninguno | `0px 10px 15px -3px rgba(0,0,0,0.08)` | Menús desplegables, modal de conflicto de nombre, hover del botón "Cargar" |

## Componentes (adaptados a las entidades de este feature)

Este feature no maneja PDFs ni un tipo de archivo genérico "Image" en el explorador — sus
entidades son `Documento Procesado` (Markdown + opcionalmente `.docx`) y `Carpeta de
Organización`. Se adapta la idea de "ícono de tipo de archivo en cuadro 40×40 con esquinas
redondeadas" de la prosa a esas dos entidades:

- **Ícono de Documento Procesado**: fondo `--color-primary-container` al 12% de opacidad
  (o `--color-secondary-container` si se quiere distinguir visualmente de los botones primarios),
  ícono `--color-on-primary-container`. Si tiene `.docx` generado, se agrega un badge pequeño
  (`label-sm`, forma píldora) con el texto "DOCX".
- **Ícono de Carpeta**: fondo `--color-tertiary-container`, ícono `--color-on-tertiary-container`
  (no hay amber en el token set — se usa terciario en vez de inventar un tercer color).
- **Botón primario ("Cargar" / "Enviar a procesar")**: fondo `--color-primary-container`, texto
  `--color-on-primary-container`, `--radius`, icono líder.
- **Botón secundario ("Nueva carpeta")**: estilo *ghost*, borde y texto `--color-primary`, fondo
  transparente.
- **Botón terciario (navegación)**: fondo transparente, texto `--color-on-surface-variant`;
  hover con fondo `--color-surface-container-low`.
- **Barra de búsqueda/navegación de ruta**: borde `1px solid var(--color-outline-variant)`,
  fondo `--color-surface-container-lowest`; estado activo con borde `--color-primary-container`
  y anillo de foco de 2px del mismo color.
- **Tarjeta de documento**: fondo `--color-surface-container-lowest`, borde
  `1px solid var(--color-outline-variant)`, `--radius-lg`; sección superior con ícono/preview,
  sección inferior con nombre (`body-md`, semibold) y metadatos (`label-sm`) ej. "Modificado
  hace 2h", `.docx` sí/no.
- **Navegación del sidebar**: lista vertical; ítem activo con fondo
  `--color-secondary-container`, texto/ícono `--color-on-secondary-container`, e indicador
  vertical de 3px en el borde izquierdo con `--color-primary-container`.
- **Mensajes de error/advertencia** (fallo de procesamiento, conflicto de nombre): fondo
  `--color-error-container`/`--color-warning` según corresponda, texto
  `--color-on-error-container`/`--color-on-warning`.

## Forma general

Radio estándar `--radius` (0.5rem) en botones/inputs/thumbnails; `--radius-lg` (1rem) en
tarjetas/contenedores para distinguir claramente contenedor vs. contenido interno; forma píldora
(`--radius-full`) en chips de estado (ej. "procesando", "completado", badge "DOCX").
