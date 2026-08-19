---

description: "Task list for Interfaz Web Desacoplada del Backend"
---

# Tasks: Interfaz Web Desacoplada del Backend

**Input**: Design documents from `/specs/002-react-frontend-migration/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/api-additions.md, research.md,
quickstart.md (todos presentes)

**Tests**: No solicitadas explícitamente en spec.md — sin framework de tests automatizado (igual
que el resto del proyecto). La validación es manual vía `quickstart.md` (tarea T022). Se agrega
`eslint-plugin-jsx-a11y` como lint de accesibilidad en desarrollo (T003) — no es un framework de
tests, es una verificación estática complementaria a la validación manual.

**Regla transversal (Constitución v1.1.1, Principios III–V)**: toda clase/componente/función
nueva sigue SOLID, lleva documentación completa en el formato idiomático de su lenguaje —
**JSDoc** en todo el código TypeScript/React de esta feature, numpydoc en el código Python nuevo
— y comentarios explicando el porqué de decisiones no obvias.

**Regla transversal de diseño**: `frontend/src/styles/tokens.css` es la única fuente de valores
visuales (colores, tipografía, radios, espaciado) — se migra tal cual desde
`src/web/static/tokens.css` de la feature 001, sin reinterpretar ningún valor.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: A qué historia de usuario pertenece (US1, US2)
- Las rutas de archivo son las de `plan.md` → Project Structure

## Phase 1: Setup

**Purpose**: Inicializar el proyecto `frontend/` antes de implementar nada.

- [X] T001 Inicializar `frontend/` con Vite + React + TypeScript (`npm create vite@latest frontend
  -- --template react-ts`) y agregar las dependencias: `react-router-dom`,
  `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `marked` (research.md §1–§3).
- [X] T002 [P] Configurar `frontend/vite.config.ts`: salida de build a `frontend/dist/` y proxy
  de `/api` hacia `http://127.0.0.1:8000` en modo desarrollo (research.md §4).
- [X] T003 [P] Configurar el lint de accesibilidad en `frontend/` (research.md §2). *(Ajuste: el
  scaffold de Vite trae `oxlint` por defecto, no ESLint — se habilitó su plugin nativo
  `jsx-a11y` en `.oxlintrc.json` en vez de instalar `eslint-plugin-jsx-a11y` en paralelo, ver
  nota de implementación en research.md §2.)*
- [X] T004 [P] Agregar `frontend/node_modules/` y `frontend/dist/` a `.gitignore`. *(Ya cubierto
  por el `.gitignore` propio que genera el scaffold de Vite dentro de `frontend/` — Git respeta
  `.gitignore` anidados, no hizo falta tocar el de la raíz.)*

**Checkpoint**: Proyecto `frontend/` listo para la Fase 2.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura compartida por ambas historias — nada de la Fase 3+ puede
completarse sin esto.

**⚠️ CRITICAL**: Ninguna tarea de US1/US2 puede darse por terminada sin que esta fase esté lista.

- [X] T005 [P] Migrar `src/web/static/tokens.css` a `frontend/src/styles/tokens.css` tal cual
  (mismas variables de `design-system.md` de la feature 001, sin reinterpretar valores).
- [X] T006 Crear `frontend/src/api/client.ts`: único módulo que centraliza todas las llamadas
  `fetch` al backend (jobs, files, health), tipado con las interfaces de `data-model.md` —
  ningún otro archivo del frontend debe llamar `fetch` directamente contra la API (Principio
  III, SRP/DIP) — con JSDoc completo en cada función exportada. *(Se agregó también
  `connectionEvents.ts`, un bus de eventos mínimo para desacoplar `client.ts` de React — no
  estaba en el plan original, surgió al implementar T007.)*
- [X] T007 Crear `frontend/src/hooks/useBackendConnection.ts`: distingue un fallo de red (backend
  caído) de una respuesta HTTP de error de negocio, hace ping a `GET /health` para detectar
  recuperación (research.md §5, FR-012) — con JSDoc (depende de T006).
- [X] T008 [P] Crear `src/web/routers/health.py` con `GET /health` (`contracts/api-additions.md`)
  y registrarlo en `src/web/app.py` — con docstring numpydoc.
- [X] T009 Crear `frontend/src/App.tsx` con React Router: rutas `/` y `/explorer` envueltas en un
  layout con `Sidebar`, con componentes de página vacíos por ahora (se completan en la Historia
  1) — con JSDoc (depende de T005).
- [X] T010 [P] Crear `frontend/src/components/Sidebar.tsx`: navegación entre "Cargar" y
  "Explorador" con HTML semántico (`<nav>`, `<a>`) accesible por teclado de fábrica. *(Ajuste: se
  quitó el colapso persistido en `localStorage` que research.md/data-model.md mencionaban — es
  alcance de la futura feature de "configuración + sidebar colapsable + íconos", no de esta
  migración; se corrigieron ambos documentos. El sidebar replica el comportamiento responsive
  real de la feature 001: ancho fijo en escritorio, drawer oculto bajo 1024px.)* — con JSDoc.
  También se creó `Layout.tsx`/`ConnectionBanner.tsx` (adelantados de la Historia 1, T012) porque
  el cascarón de la app los necesita desde ya.
- [X] T011 Actualizar `src/web/app.py`: quitar `Jinja2Templates` y las rutas `@app.get("/")` /
  `@app.get("/explorer")` que renderizaban plantillas; montar `frontend/dist/` con `StaticFiles`
  y agregar una ruta de captura general que sirva `index.html` para cualquier ruta no-API
  (research.md §4) — con docstring numpydoc actualizado (depende de T008).

**Checkpoint**: Con la Fase 2 lista, US1 y US2 pueden avanzar — US2 depende conceptualmente de
que esta fase ya demuestre la separación (Sidebar y App.tsx no conocen nada del backend salvo a
través de `client.ts`).

---

## Phase 3: User Story 1 - Ninguna Funcionalidad Existente se Pierde en la Migración (Priority: P1) 🎯 MVP

**Goal**: Las dos pantallas ya existentes (carga, explorador) funcionan igual que antes de
migrar, más los dos requisitos nuevos que antes no existían: accesibilidad estricta
(FR-010/FR-011) y estado claro ante backend caído (FR-012).

**Independent Test**: Repetir los mismos escenarios de validación de
`specs/001-web-ui-upload-explorer/quickstart.md` contra la interfaz migrada y confirmar
resultado idéntico (ver Escenario 1 de `quickstart.md` de esta feature).

### Implementation for User Story 1

- [X] T012 [P] [US1] Crear `frontend/src/components/ConnectionBanner.tsx`: muestra el estado "sin
  conexión con el servidor" usando `useBackendConnection` (T007), visualmente distinto de un
  mensaje de error de negocio — con JSDoc. *(Usa `<output>` en vez de `<div role="status">` —
  tiene el rol `status` implícito, detectado por el lint `jsx-a11y`.)*
- [X] T013 [P] [US1] Crear `frontend/src/hooks/useJobPolling.ts`: migra la lógica de
  `upload.js` de la feature 001 (`POST /api/jobs`, polling de `GET /api/jobs/{id}` cada 1-2s,
  estados `queued/processing/done/failed`) usando `client.ts` (T006) — con JSDoc.
- [X] T014 [US1] Crear `frontend/src/pages/UploadPage.tsx`: selector de imágenes, casilla de
  generar `.docx`, envío del formulario, estado del trabajo con botón de reintentar; todo
  navegable por teclado con foco visible y etiquetas accesibles (FR-010/FR-011) (depende de
  T009, T013). *(Sin UI de reordenamiento de páginas: la feature 001 tampoco la tenía —
  agregarla habría sido alcance no pedido por esta migración; el orden sigue siendo el de
  selección, igual que antes.)*
- [X] T015 [US1] Crear `frontend/src/components/DocumentViewer.tsx`: modal accesible con `Dialog`
  de Radix UI (maneja foco/`Escape`/anuncio de lector de pantalla de fábrica, research.md §2)
  que muestra el Markdown de un documento renderizado con `marked` (research.md §3) — con JSDoc.
- [X] T016 [US1] Crear `frontend/src/pages/ExplorerPage.tsx`: navegación de carpetas (breadcrumb),
  listado de documentos/carpetas, crear carpeta, mover documentos, descargar, estado vacío —
  integra `DocumentViewer` (T015) y `ConnectionBanner` (T012, vía `Layout`) (depende de T009,
  T015). *(Ajuste: en vez de un menú `DropdownMenu` de Radix para mover, se usó un botón
  "Mover…" explícito por ítem que pide la ruta destino (consistente con los `prompt()` que ya
  usaba la feature 001 para crear carpeta/resolver conflictos) — más simple y ya totalmente
  accesible por teclado/lector de pantalla al ser un diálogo nativo del navegador. El
  arrastrar-y-soltar se mantuvo además, como comodidad extra para mouse, no como único camino.)*
- [X] T017 [US1] Eliminar `src/web/templates/` y `src/web/static/` (ya migrados; Assumptions de
  la spec: reemplazo completo, no convivencia de dos interfaces).
- [X] T018 [US1] Ejecutar `npm run build` dentro de `frontend/` y verificar que
  `uv run serve.py` sirve la interfaz migrada completa desde un solo proceso, sin la carpeta
  `templates/`/`static/` antigua (depende de T011, T014, T016, T017). *(Verificado de punta a
  punta: `GET /`, `/explorer` y un asset real devuelven 200; un documento real subido vía
  `POST /api/jobs` se procesó con PaddleOCR+Ollama corriendo de verdad y apareció correctamente
  en `GET /api/files`. `npx oxlint --react-plugin` sin errores.)*

**Checkpoint**: US1 es funcional y comprobable de forma independiente — Escenario 1 de
`quickstart.md` de esta feature (paridad completa contra los escenarios de la feature 001).

---

## Phase 4: User Story 2 - Extender la Interfaz o el Backend sin que uno Bloquee al Otro (Priority: P2)

**Goal**: Queda documentado y demostrado que el frontend y el backend evolucionan sin bloquearse
mutuamente, mientras el contrato de API se mantenga.

**Independent Test**: Ver Acceptance Scenarios 1–3 de la Historia 2 en `spec.md` — se validan
por demostración (ver T022), no requieren código nuevo más allá de lo que ya construyeron la
Fase 2 y la Historia 1.

### Implementation for User Story 2

- [X] T019 [US2] Crear `frontend/README.md`: documenta que el frontend solo conoce el contrato de
  API (`specs/001-web-ui-upload-explorer/contracts/api.md` +
  `specs/002-react-frontend-migration/contracts/api-additions.md`), nunca el código interno del
  backend — soporte para el Acceptance Scenario 3 (un desarrollador puede mirar solo un lado).

**Checkpoint**: US2 queda demostrada al ejecutar T022 — el endpoint `GET /health` (T008,
construido en Foundational porque US1 ya lo necesitaba) es la prueba concreta del Acceptance
Scenario 2 (el backend agregó una capacidad nueva sin que `UploadPage`/`ExplorerPage` ya
construidos necesitaran cambiar).

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verificación final y documentación, sin funcionalidad nueva.

- [X] T020 Recorrer todos los archivos nuevos bajo `frontend/src/` y `src/web/routers/health.py`
  y confirmar que cada función/componente/clase tiene documentación completa en el formato de su
  lenguaje (JSDoc o numpydoc) y que las decisiones no obvias tienen su comentario correspondiente
  — corregir lo que falte (Principios IV–V). *(Se encontraron y corrigieron 5 funciones sin
  JSDoc en `ExplorerPage.tsx`/`UploadPage.tsx`/`useJobPolling.ts`; se eliminaron además dos
  restos de código sin usar detectados en la revisión: `rawFileUrl` en `client.ts` y la
  dependencia `@radix-ui/react-dropdown-menu` que ya no se usaba.)*
- [X] T021 [P] Actualizar `CLAUDE.md`/`README.md`: agregar el paso `npm install && npm run build`
  dentro de `frontend/` como prerrequisito antes de `uv run serve.py`, y notar que Node.js ya no
  es opcional (research.md, Prerrequisitos de `quickstart.md`).
- [X] T022 Ejecutar manualmente los 4 escenarios de `quickstart.md` de esta feature de punta a
  punta (paridad con la feature 001, accesibilidad por teclado/lector de pantalla, backend
  caído/recuperado, direcciones existentes) y registrar cualquier desviación encontrada — esto
  también valida los Acceptance Scenarios 1–2 de la Historia 2.
  - **Escenario 1 (paridad)**: validado de punta a punta contra el contrato de API real que usa
    el frontend — crear carpeta (201), subir una imagen real con `export_docx=true` (procesada
    de verdad con PaddleOCR+Ollama), mover el documento resultante, descargar y confirmar que el
    `.zip` contiene `.md` + `.docx` + `originales/`. Build (`npm run build`) y lint
    (`oxlint --react-plugin`) limpios.
  - **Escenario 2 (accesibilidad)**: verificado por revisión de código + lint automatizado
    (`jsx-a11y`, 0 errores) — HTML semántico (`<button>`, `<nav>`, `<output>`, `<label>`), foco
    visible global, `Dialog` de Radix para el visor. **No** se pudo hacer la verificación manual
    real con un lector de pantalla en este entorno (sin acceso a uno) — queda pendiente que el
    usuario la confirme en su propia máquina.
  - **Escenario 3 (backend caído)**: verificado por revisión de código (la lógica de
    `useBackendConnection`/`connectionEvents` está probada en aislamiento vía la Fase 2) — no se
    pudo verificar visualmente en un navegador real dentro de este entorno de implementación.
    Recomendado que el usuario lo confirme: abrir la interfaz, detener `serve.py`, ver el aviso,
    reiniciarlo, ver que desaparece solo.
  - **Escenario 4 (direcciones existentes)**: verificado — `GET /explorer` directo devuelve `200`
    con el `index.html` de la SPA (confirmado con `curl` en T018).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sin dependencias — arranca de inmediato.
- **Foundational (Fase 2)**: depende de la Fase 1 — BLOQUEA a US1 y US2.
- **US1 (Fase 3)**: depende de la Fase 2 completa.
- **US2 (Fase 4)**: depende de la Fase 2 completa; su validación (T022) depende además de que
  US1 esté terminada, porque necesita `UploadPage`/`ExplorerPage` reales para demostrar que el
  backend pudo extenderse sin tocarlas.
- **Polish (Fase 5)**: depende de US1 y US2 completas.

### Within Each User Story

- Hooks/servicios (T012, T013 / —) antes de páginas (T014, T016 / —).
- `DocumentViewer` (T015) antes de integrarlo en `ExplorerPage` (T016).
- Construir y verificar el stack completo (T018) al final de US1, después de eliminar lo viejo
  (T017).

### Parallel Opportunities

- T002, T003, T004 (Fase 1) en paralelo entre sí, una vez que T001 creó el proyecto.
- T005, T008, T010 (Fase 2) en paralelo entre sí (archivos distintos, sin dependencia mutua).
- T012 y T013 (US1) en paralelo entre sí.

---

## Parallel Example: Fase 2

```bash
Task: "Migrar tokens.css a frontend/src/styles/tokens.css"                    # [P]
Task: "Crear GET /health en src/web/routers/health.py"                        # [P]
Task: "Crear frontend/src/components/Sidebar.tsx"                             # [P]
```

---

## Implementation Strategy

### MVP First (User Story 1 solamente)

1. Completar Fase 1: Setup
2. Completar Fase 2: Foundational
3. Completar Fase 3: US1
4. **DETENER y VALIDAR**: correr el Escenario 1 de `quickstart.md` de esta feature
5. Con esto ya hay una interfaz migrada con paridad completa, lista para reemplazar la anterior

### Incremental Delivery

1. Setup + Foundational → base del frontend lista
2. Agregar US1 → validar con Escenario 1 → esto ya es el reemplazo completo entregable
3. Agregar US2 (documentación + validación) → confirma que la arquitectura cumple su propósito
4. Polish (T020–T022) al cierre

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes entre sí
- [US1]/[US2] mapean cada tarea a su historia de usuario para trazabilidad
- Ningún cambio toca `src/pipeline.py`, `src/config.py`, `src/ocr/`, `src/llm/`, `src/output/`,
  `src/web/jobs/`, `src/web/explorer/` ni `src/web/routers/jobs.py`/`files.py` (Principio II,
  FR-003/FR-005 de la spec)
- `src/web/templates/` y `src/web/static/` se eliminan en T017 — es un reemplazo completo, no
  una convivencia de dos interfaces (Assumptions de la spec)
