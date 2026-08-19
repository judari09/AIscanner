# Frontend web

`frontend/` es un proyecto Vite + React independiente del backend (desde
[002 · Migración a React](../features/002-react-frontend-migration.md)): consume el backend
únicamente a través de su API HTTP (`fetch`), nunca importa código Python. En producción,
`npm run build` genera `frontend/dist/`, que `src/web/app.py` sirve como estático desde el mismo
proceso (`uv run serve.py`, un solo comando).

!!! note "JSDoc como fuente de verdad"
    Esta página resume la estructura del frontend. El detalle completo (parámetros, casos borde,
    decisiones no obvias) vive en el JSDoc de cada archivo — esta referencia de API no lo extrae
    automáticamente (mkdocstrings solo soporta Python), así que para el detalle exacto conviene
    abrir el archivo fuente enlazado.

## Páginas (`frontend/src/pages/`)

| Página | Ruta | Responsabilidad |
|---|---|---|
| `UploadPage.tsx` | `/` | Seleccionar imágenes, elegir si generar `.docx`, enviarlas a procesar y seguir el estado del trabajo (con reintento y el aviso de finalización). |
| `ExplorerPage.tsx` | `/explorer` | Navegar carpetas, listar documentos, crear carpetas, mover/descargar, y visualizar el contenido de un documento — incluye abrir un documento directo si llega con `?open=&name=` en la URL. |
| `SettingsPage.tsx` | `/settings` | Ver los modelos de Ollama instalados localmente y cambiar cuál está activo para el digitalizador. |

## Componentes (`frontend/src/components/`)

| Componente | Rol |
|---|---|
| `Layout.tsx` | Cascarón compartido: sidebar + aviso de conexión + contenido; lee el estado de colapso de la barra lateral y lo reparte. |
| `Sidebar.tsx` | Navegación entre las tres pantallas, con iconos SVG propios, ayuda contextual por icono y colapso a modo solo-iconos persistido en `localStorage`. |
| `ScreenHelpTooltip.tsx` | Envuelve el icono de una pantalla con ayuda contextual accesible con mouse (hover/`title`) y sin él (botón "?" visible, foco/tap). |
| `ConnectionBanner.tsx` | Aviso de "sin conexión con el servidor"; aparece solo cuando `useBackendConnection` detecta un fallo de red. |
| `CompletionToast.tsx` | Aviso al terminar una digitalización exitosa: nombre de los archivos generados, enlace directo al documento en el Explorador, cierre manual o automático. |
| `DocumentViewer.tsx` | Modal de visualización de un documento (Radix UI `Dialog`: trampa de foco, cierre con `Escape`, anuncio a lectores de pantalla de fábrica). |
| `icons/*.tsx` | Iconos SVG inline propios (Cargar, Explorador, Configuración, chevron de colapso, ayuda) — sin dependencia externa de iconos. |

## Hooks (`frontend/src/hooks/`)

| Hook | Rol |
|---|---|
| `useJobPolling.ts` | Envía un trabajo y sondea su estado (`queued`/`processing`/`done`/`failed`) hasta que termina; expone `submit`/`retry`. |
| `useBackendConnection.ts` | Expone si el backend parece alcanzable en este momento, reintentando `GET /health` mientras esté caído. |
| `useSidebarCollapse.ts` | Persiste en `localStorage` si la barra lateral está colapsada o expandida, por dispositivo/navegador. |

## Capa de API (`frontend/src/api/`)

`client.ts` es el **único** módulo del frontend que llama `fetch` contra el backend (Principio
III, responsabilidad única) — ningún componente ni hook hace `fetch` directo. Distingue dos tipos
de fallo: `NetworkError` (el `fetch` en sí falló — backend caído, sin red) y `ApiError` (el
backend respondió, pero con un código de error de negocio); `types.ts` refleja 1:1 el contrato de
la API del backend, sin inventar ningún campo.

## Sistema de diseño

`frontend/src/styles/tokens.css` centraliza colores, tipografía, radios y espaciado (paleta
"tierra/parchment") — ningún componente escribe esos valores a mano, siempre a través de esas
variables. El mismo criterio de paleta se usó para el [banner](../index.md) de esta
documentación.

## Límite de responsabilidades

{% include-markdown "../../frontend/README.md" start="## Límite de responsabilidades" end="## Desarrollo" %}
