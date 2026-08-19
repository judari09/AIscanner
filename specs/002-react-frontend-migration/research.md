# Research: Interfaz Web Desacoplada del Backend

## 1. Framework de frontend

**Decision**: React + Vite, como ya se conversó antes de especificar esta feature.

**Rationale**: El alcance de la interfaz ya creció a 4 vistas planeadas (carga, explorador,
configuración, edición) y la Historia 2 de esta spec exige explícitamente poder extender la UI
sin tocar el backend — un framework de componentes con enrutado propio (React Router) resuelve
eso de forma mucho más mantenible que seguir a mano con Jinja2 + JS plano. Vite da un ciclo de
desarrollo rápido (HMR) y un build de producción simple (`vite build`) que FastAPI sirve como
archivos estáticos.

**Alternatives considered**: Vue y Svelte son alternativas razonables con el mismo nivel de
desacople; se descartan solo porque React fue la elección explícita ya conversada con el
usuario, no por una limitación técnica de las otras opciones. Seguir con vanilla JS (statu quo)
se descarta porque es exactamente lo que esta spec busca reemplazar (Historia 2).

## 2. Accesibilidad (FR-010/FR-011)

**Decision**: Primitivas accesibles de [Radix UI](https://www.radix-ui.com/primitives)
(sin estilos propios, con manejo de foco/teclado/ARIA correcto de fábrica) para los widgets
interactivos no triviales (el diálogo modal del visor de documentos); HTML semántico plano
(`<button>`, `<nav>`, `<ul>/<li>`, `<label>`, diálogos nativos `prompt()`/`alert()` para
confirmaciones simples) para todo lo demás. Se complementa con el plugin `jsx-a11y` nativo de
**oxlint** como regla de lint en tiempo de desarrollo, para detectar errores comunes de
accesibilidad (`<img>` sin `alt`, botones sin texto accesible) antes de que lleguen a producción.

**Nota de implementación**: solo se terminó usando `@radix-ui/react-dialog` (el modal del
visor). La idea original de usar `@radix-ui/react-dropdown-menu` para "mover" documentos se
descartó al implementar `ExplorerPage` — un botón "Mover…" que pide la ruta destino con
`prompt()` (consistente con los diálogos nativos que ya usaba la feature 001 para crear
carpeta/resolver conflictos) es más simple y ya es accesible de por sí; se desinstaló la
dependencia sin usar.

**Nota de implementación**: el plan original decía `eslint-plugin-jsx-a11y`, asumiendo un setup
de ESLint estándar. El scaffold de Vite (`npm create vite@latest -- --template react-ts`) trae
**oxlint** como linter por defecto, no ESLint — y oxlint ya reimplementa el mismo conjunto de
reglas de accesibilidad de forma nativa (`--jsx-a11y-plugin` / `"plugins": ["jsx-a11y"]` en
`.oxlintrc.json`). Se usa esa opción nativa en vez de instalar ESLint en paralelo, que sería
redundante (dos linters haciendo lo mismo) — el objetivo (lint de accesibilidad en desarrollo)
queda igual de cumplido.

**Rationale**: Los requisitos de accesibilidad de esta spec son estrictos (FR-010: todo flujo
completable por teclado; FR-011: toda etiqueta anunciable por lector de pantalla) — reimplementar
manejo de foco, trampas de foco en modales, y roles ARIA a mano para cada componente interactivo
es una fuente común de errores sutiles. Radix UI resuelve exactamente esos casos (ya probado por
una comunidad grande) sin imponer un sistema de diseño propio, dejando la apariencia visual
completamente controlada por `tokens.css` (heredado de la feature 001). El lint de
`jsx-a11y` no reemplaza la verificación manual (ver `quickstart.md`), pero atrapa errores obvios
en el momento de escribir el código, no al final.

**Alternatives considered**: Construir cada componente accesible desde cero — descartado por el
riesgo de errores sutiles dado que el requisito es estricto, no "mejor esfuerzo". Una librería de
componentes con estilos propios (ej. Material UI, Chakra) — descartada porque impondría su propio
sistema visual, en conflicto con seguir usando los tokens de `design-system.md` ya definidos.

## 3. Renderizado de Markdown

**Decision**: Reemplazar el parser de Markdown hecho a mano (`renderMarkdown` en el
`explorer.js` actual) por una librería madura (`marked` o `markdown-it`), instalada vía `npm` y
empaquetada por Vite — sin CDN, igual que el resto de dependencias.

**Rationale**: El parser propio se justificaba en la feature 001 porque no había ningún paso de
build (`research.md` de esa feature, decisión §1) — traer una librería solo para eso no
compensaba. Ahora que Vite ya empaqueta todo el frontend, esa razón desaparece: una librería
madura maneja correctamente casos que el parser propio no cubría bien (bloques de código
anidados, tablas, casos límite de Markdown), sin costo adicional de infraestructura.

**Alternatives considered**: Mantener el parser propio — descartado porque ya no hay ninguna
razón para evitar una dependencia de build, y la librería es estrictamente más correcta.

## 4. Servir el frontend compilado desde el backend

**Decision**: `vite build` genera archivos estáticos en `frontend/dist/`; `src/web/app.py` monta
esa carpeta con `StaticFiles` y agrega una ruta de captura general (*catch-all*) que devuelve
`index.html` para cualquier ruta que no sea de la API (`/api/...`) — así el enrutado del lado del
cliente (React Router) resuelve `/` y `/explorer` sin que el servidor necesite saber de esas
rutas. En desarrollo, el servidor de Vite corre en su propio puerto con un *proxy* configurado
hacia `/api` apuntando al backend FastAPI (mismo origen desde la perspectiva del navegador, sin
necesitar configurar CORS).

**Rationale**: Mantiene un solo proceso sirviendo todo en producción (`uv run serve.py` sigue
siendo el único comando, tal como pide FR con el objetivo de "reemplazo completo, no convivencia
permanente" de las Assumptions de la spec), y evita configurar CORS tanto en desarrollo como en
producción.

**Alternatives considered**: Servir el frontend desde un proceso Node separado incluso en
producción — descartado, complica el despliegue de un usuario que solo quiere `uv run serve.py`
sin tener que mantener un segundo proceso corriendo.

## 5. Detección de "backend sin conexión" (FR-012)

**Decision**: Se agrega un endpoint nuevo y mínimo, `GET /health`, que responde `200 OK` de
inmediato sin tocar el pipeline ni el explorador. El cliente (un hook `useBackendConnection`)
distingue dos tipos de fallo al llamar cualquier endpoint: un fallo de red (`fetch` rechaza la
promesa, ej. `TypeError: Failed to fetch`, típico de un backend caído) dispara el estado "sin
conexión"; una respuesta HTTP recibida con código de error (4xx/5xx) es un error de negocio
normal y no toca ese estado. Mientras el estado sea "sin conexión", el mismo hook reintenta
`GET /health` cada pocos segundos y limpia el estado en cuanto responde.

**Rationale**: `GET /health` es la señal más barata y menos ambigua para saber si el proceso del
backend está arriba, sin depender de si el usuario está mirando el explorador o la carga en ese
momento. Distinguir fallo de red vs. respuesta de error de negocio es necesario porque ambos
casos ya existen (ej. subir un `.txt` inválido es un `400` real del servidor, no una
desconexión) y mezclarlos confundiría al usuario con el mensaje equivocado.

**Alternatives considered**: Inferir la desconexión solo a partir de los fallos de los endpoints
de negocio ya existentes — descartado porque esos endpoints no se llaman constantemente (ej. si
el usuario está quieto mirando un documento ya cargado, no habría ninguna petición en curso para
detectar que el backend se cayó, hasta la próxima acción del usuario).

## 6. Sidebar: se migra el comportamiento responsive existente, sin agregar colapso manual

**Decision**: El sidebar se comporta igual que en la feature 001 — ancho fijo en escritorio,
oculto tras un botón de menú en pantallas angostas (`<1024px`). No se agrega un botón de colapso
manual persistente en esta feature.

**Rationale**: Un sidebar colapsable de forma persistente fue una idea que surgió en la
conversación previa a especificar esta migración, pero quedó explícitamente para la futura
feature de "configuración + sidebar colapsable + íconos" (ver Assumptions de `spec.md`: esas
mejoras concretas no son parte de esta migración). Agregarlo aquí sería alcance no pedido por
esta spec — si más adelante se especifica esa feature, ahí es donde correspondería decidir dónde
persistir esa preferencia (research.md de esa feature, no de esta).
