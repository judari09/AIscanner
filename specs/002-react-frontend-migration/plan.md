# Implementation Plan: Interfaz Web Desacoplada del Backend

**Branch**: `002-react-frontend-migration` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-react-frontend-migration/spec.md`

## Summary

Reemplazar la interfaz actual (Jinja2 + JS plano, servida desde el mismo proceso FastAPI) por una
SPA en React + Vite que consume el backend únicamente a través de su API HTTP ya existente
(`specs/001-web-ui-upload-explorer/contracts/api.md`, sin cambios). El backend no pierde ninguna
capacidad ni gana ninguna dependencia hacia la interfaz — solo agrega un endpoint `GET /health`
para que el frontend pueda detectar cuándo el servidor no responde (FR-012). La migración es un
reemplazo completo (no una convivencia de dos interfaces) y preserva cero regresiones (US1),
mientras habilita agregar pantallas nuevas sin tocar el backend (US2) — la base para las
features de configuración y edición ya conversadas pero no incluidas aquí. Se agrega además un
requisito nuevo no presente en la interfaz anterior: accesibilidad estricta por teclado y lector
de pantalla (FR-010/FR-011).

## Technical Context

**Language/Version**: TypeScript (frontend, React 18+) + Python 3.10–3.12 (backend, sin cambios)

**Primary Dependencies**: React, React Router (enrutado del lado del cliente), Vite (build),
Radix UI (primitivas accesibles para widgets interactivos), `marked` o `markdown-it` (renderizado
de Markdown, reemplaza el parser propio de la feature 001), `eslint-plugin-jsx-a11y` (lint de
accesibilidad en desarrollo). Todo instalado vía `npm` y empaquetado por Vite — sin CDN en
tiempo de ejecución (Principio I).

**Storage**: Sin cambios — sistema de archivos bajo `OUTPUT_DIR`, servido por el backend ya
existente. Esta feature no toca `src/pipeline.py`, `src/web/jobs/`, `src/web/explorer/` ni
`src/web/routers/` salvo el endpoint nuevo `GET /health`.

**Testing**: Sin framework de tests automatizado (igual que el resto del proyecto). Se agrega
`eslint-plugin-jsx-a11y` como verificación de accesibilidad en tiempo de desarrollo (lint, no
tests); la validación funcional sigue siendo manual vía `quickstart.md`.

**Target Platform**: Navegador de escritorio. En producción, Vite compila a `frontend/dist/` y
FastAPI lo sirve como estático desde el mismo proceso (`uv run serve.py`, un solo comando). En
desarrollo, el servidor de Vite corre aparte con proxy hacia la API del backend.

**Project Type**: Aplicación web con frontend y backend en proyectos separados (a diferencia de
la feature 001, que era un solo proyecto) — ver Project Structure.

**Performance Goals**: Ninguno prescrito (Clarifications: la mejora de UX queda como objetivo
cualitativo, sin métrica de rendimiento en esta spec).

**Constraints**: 100% local sin llamadas de red del navegador a terceros (Principio I); flujos
principales completables por teclado y anunciables por lector de pantalla (FR-010/FR-011);
estado claro de "sin conexión" ante backend caído, con recuperación automática (FR-012); la CLI
sigue funcionando de forma completamente independiente (FR-008); las direcciones `/` y
`/explorer` se mantienen (Assumptions).

**Scale/Scope**: Un solo usuario; migra las 2 pantallas ya existentes (carga, explorador) con
paridad funcional completa; deja la base para 2 pantallas futuras (configuración, edición) que
se especifican por separado.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación |
|---|---|
| I. Privacidad y Ejecución 100% Local | PASS — todas las dependencias del frontend se instalan vía `npm` y se empaquetan en el build; cero peticiones de red del navegador a un tercero en tiempo de ejecución. |
| II. Núcleo Desacoplado de la Interfaz | PASS — es literalmente el objetivo de esta feature: la interfaz consume solo la API HTTP ya definida, sin depender de detalles internos del servidor (FR-003). |
| III. Principios SOLID en el Diseño de Clases | Se aplica a nivel de componentes/módulos React (responsabilidad única por componente, un módulo `apiClient` centraliza el acceso HTTP en vez de esparcir `fetch` por toda la UI) — condición de cada tarea de implementación, no algo que el plan resuelva por sí solo. |
| IV. Documentación NumPyDoc/JSDoc Obligatoria | Aplica como JSDoc en todo el código nuevo TypeScript/React (enmendado en la constitución v1.1.1 específicamente para esta feature, ver Sync Impact Report de `.specify/memory/constitution.md`). |
| V. Comentarios que Explican el Porqué | Igual que en la feature 001 — condición de cada tarea, no del plan. |
| VI. Sin Estado Persistente entre Ejecuciones | PASS — sin backend nuevo con estado; la única persistencia del lado del cliente (`localStorage` para preferencias de UI puramente visuales) no es estado del pipeline ni de documentos (ver research.md §6). |

**Resultado**: Sin violaciones. No se requiere la tabla de Complexity Tracking.

*Re-chequeo post-diseño (tras Fase 1)*: `data-model.md` y `contracts/api-additions.md` no
introducen ningún estado nuevo del lado del servidor ni ninguna dependencia externa en tiempo de
ejecución — el único endpoint nuevo (`GET /health`) es intencionalmente trivial y sin estado.
Gate sigue en PASS.

## Project Structure

### Documentation (this feature)

```text
specs/002-react-frontend-migration/
├── plan.md               # Este archivo
├── research.md           # Fase 0 — decisiones técnicas
├── data-model.md          # Fase 1 — tipos TS que reflejan el contrato existente + ConnectionStatus
├── quickstart.md          # Fase 1 — guía de validación manual
├── contracts/
│   └── api-additions.md    # Fase 1 — único endpoint nuevo (GET /health); el resto del contrato no cambia
└── tasks.md                # Fase 2 (/speckit-tasks — no generado por este comando)
```

### Source Code (repository root)

```text
frontend/                          # NUEVO — proyecto Vite + React, independiente del backend
├── package.json
├── vite.config.ts                   # incluye el proxy de /api hacia el backend en desarrollo
├── tsconfig.json
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx                       # React Router: rutas "/" y "/explorer"
    ├── api/
    │   └── client.ts                  # único módulo que llama fetch() contra el backend (SRP)
    ├── hooks/
    │   ├── useBackendConnection.ts     # FR-012, ver research.md §5
    │   └── useJobPolling.ts            # migra la lógica de polling de upload.js
    ├── pages/
    │   ├── UploadPage.tsx
    │   └── ExplorerPage.tsx
    ├── components/
    │   ├── Sidebar.tsx
    │   ├── ConnectionBanner.tsx         # estado "sin conexión" (FR-012)
    │   ├── DocumentViewer.tsx           # reemplaza el visor modal de explorer.js
    │   └── ...
    └── styles/
        └── tokens.css                  # migrado tal cual desde src/web/static/tokens.css

src/                                # Backend, existente — cambios mínimos
├── web/
│   ├── app.py                        # quita Jinja2Templates + rutas de página; monta frontend/dist/ + catch-all SPA
│   ├── routers/
│   │   ├── jobs.py                    # sin cambios
│   │   ├── files.py                   # sin cambios
│   │   └── health.py                  # NUEVO — GET /health (contracts/api-additions.md)
│   ├── templates/                     # ELIMINADO (Jinja2 ya no se usa)
│   └── static/                        # ELIMINADO (JS/CSS plano migrado a frontend/)
└── ...                               # pipeline.py, config.py, ocr/, llm/, output/ sin cambios
```

**Structure Decision**: Se adopta el patrón "Option 2: Web application" del template (frontend y
backend en proyectos separados), a diferencia de la feature 001 que usó un solo proyecto — es
exactamente el cambio estructural que pide esta migración (Principio II reforzado). El backend
pierde `templates/` y `static/`; todo lo demás bajo `src/` queda intacto.

## Complexity Tracking

*Sin violaciones que justificar — tabla omitida (ver Constitution Check).*
