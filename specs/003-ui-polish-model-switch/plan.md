# Implementation Plan: Mejora Visual de la Interfaz y Selección de Modelo LLM

**Branch**: `003-ui-polish-model-switch` | **Date**: 2026-08-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-ui-polish-model-switch/spec.md`

## Summary

Dos mejoras a la interfaz web que la feature 002 dejó explícitamente pendientes (research.md §6
de esa feature): reemplazar los iconos-emoji de la barra lateral por SVG propios con una barra
colapsable y ayuda contextual (US3/US4), y permitir elegir qué modelo de Ollama usa el LLM del
pipeline en vez del valor fijo en código (US1/US2). El backend gana un módulo delgado en la capa
`llm/` que lista los modelos instalados vía el SDK `ollama` ya presente en el proyecto, y una
configuración persistida en disco (fuera de `OUTPUT_DIR`, sin relación con historial de
documentos) que guarda el modelo activo. `Structuring` deja de hardcodear `"gemma3:4b"` como
único valor posible y lee ese modelo activo como su default — así CLI y web comparten el mismo
cambio sin reimplementar nada (Principio II). El frontend gana una pantalla de Configuración
nueva y una barra lateral con SVG, colapso persistente y ayuda contextual accesible también sin
mouse (Clarifications: control "?" táctil).

## Technical Context

**Language/Version**: Python 3.10–3.12 (backend, sin cambios) + TypeScript/React 19 (frontend,
sin cambios de versión respecto a 002-react-frontend-migration)

**Primary Dependencies**: Backend — el paquete `ollama` (SDK oficial), ya presente en
`pyproject.toml` pero sin uso directo todavía, se usa ahora para listar modelos instalados
(`Client.list()`) sin añadir ninguna dependencia nueva. Frontend — sin librería de iconos ni de
gestión de estado nuevas: los iconos SVG son componentes React propios (evita una dependencia de
red/build adicional, igual que la decisión de "sin CDN" de 002) y el estado de colapso/ayuda usa
hooks nativos de React + `localStorage`.

**Storage**: Un archivo de configuración local nuevo (JSON) para el modelo activo persistido,
separado de `OUTPUT_DIR` (que sigue siendo exclusivamente para documentos procesados, Principio
VI). Del lado del navegador, `localStorage` para el estado de colapso de la barra lateral —mismo
mecanismo ya aceptado en 002 (research.md §6) para preferencias de UI puramente visuales.

**Testing**: Sin framework de tests automatizado (igual que el resto del proyecto). Validación
funcional manual vía `quickstart.md`.

**Target Platform**: Navegador de escritorio y uso táctil (tablet/móvil) sobre la misma
instalación local, accedida directamente o vía Tailscale/WireGuard (Principio I) — el soporte
táctil ya es explícito en esta spec (US3, escenario 3).

**Project Type**: Aplicación web con frontend y backend en proyectos separados, misma estructura
adoptada por 002-react-frontend-migration (Option 2 del template).

**Performance Goals**: Confirmación visual de un cambio de modelo en menos de 2s desde que el
usuario confirma (SC-003); sin objetivo de rendimiento adicional — listar modelos es una llamada
local a Ollama, ya de por sí casi instantánea.

**Constraints**: 100% local (Principio I) — la única llamada de red nueva es del backend hacia
Ollama en `localhost`, nunca desde el navegador directamente (mismo patrón que ya usan
`jobs`/`files`); la aplicación no ofrece descarga/instalación de modelos (FR-015, fuera de
alcance explícito); la ayuda contextual y la navegación deben seguir siendo utilizables sin mouse
(heredado de los requisitos de accesibilidad de 002, no se relajan aquí).

**Scale/Scope**: Una pantalla nueva (Configuración de modelo), y cambios acotados a la barra
lateral y su set de iconos (3 pantallas: Cargar, Explorador, Configuración); un solo usuario por
instalación, sin cambios al modelo de despliegue (`uv run serve.py` sigue siendo el único
comando).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación |
|---|---|
| I. Privacidad y Ejecución 100% Local | PASS — listar/activar modelos es una llamada del backend a Ollama en `localhost`, igual que ya hace `OllamaClient`; el navegador nunca habla con Ollama directamente. Sin telemetría ni CDN nuevos. |
| II. Núcleo Desacoplado de la Interfaz | PASS — el listado y la persistencia del modelo activo viven en un módulo nuevo de la capa `llm`/`config` (no en el router), y `Structuring` los consume igual que consume hoy `OllamaClient`; la CLI se beneficia del mismo cambio sin tocar `cli.py` ni `pipeline.py`. |
| III. Principios SOLID en el Diseño de Clases | Se aplica a las clases nuevas (catálogo de modelos, almacén de configuración activa): cada una con una única razón para cambiar, sin acoplar el router a los detalles del SDK `ollama` (research.md §1). |
| IV. Documentación NumPyDoc/JSDoc Obligatoria | Aplica a todo el Python nuevo (numpydoc) y TypeScript/React nuevo (JSDoc: iconos, hook de colapso, componente de ayuda, página de Configuración). |
| V. Comentarios que Explican el Porqué | Aplica en decisiones no obvias: por qué el archivo de configuración vive fuera de `OUTPUT_DIR`, por qué se valida el modelo contra Ollama antes de persistir (FR-005), por qué el tooltip usa un control táctil dedicado en vez de un gesto oculto (Clarifications). |
| VI. Sin Estado Persistente entre Ejecuciones | PASS — el archivo de modelo activo y el `localStorage` del sidebar son configuración de aplicación, no historial de documentos ni caché de sesión (Assumptions de `spec.md`); mismo razonamiento y precedente que 002 usó para el estado visual del sidebar. |

**Resultado**: Sin violaciones. No se requiere la tabla de Complexity Tracking.

*Re-chequeo post-diseño (tras Fase 1)*: `data-model.md` confirma que las dos entidades nuevas son
una lectura en vivo de Ollama (sin persistencia propia) y un único valor en un archivo de
configuración fuera de `OUTPUT_DIR` — ningún estado nuevo de documentos ni historial.
`contracts/api-additions.md` mantiene la validación de FR-005 del lado del servidor (no del
frontend), preservando que el núcleo (`config.py`/`llm/model_catalog.py`) sea la única fuente de
verdad, consumida igual por CLI y web. Gate sigue en PASS.

## Project Structure

### Documentation (this feature)

```text
specs/003-ui-polish-model-switch/
├── plan.md               # Este archivo
├── research.md           # Fase 0 — decisiones técnicas
├── data-model.md          # Fase 1 — entidades: modelo disponible, configuración de modelo activo
├── quickstart.md          # Fase 1 — guía de validación manual
├── contracts/
│   └── api-additions.md    # Fase 1 — endpoints nuevos: GET /api/models, PUT /api/config/active-model
└── tasks.md                # Fase 2 (/speckit-tasks — no generado por este comando)
```

### Source Code (repository root)

```text
src/                                    # Backend — cambios acotados, mismo proyecto de 002
├── config.py                            # + ruta del archivo de configuración, get_active_model(), set_active_model()
├── llm/
│   ├── client.py                        # sin cambios de firma
│   ├── model_catalog.py                 # NUEVO — envuelve el SDK `ollama` para listar modelos instalados
│   └── structuring.py                   # su default deja de ser "gemma3:4b" fijo; lee config.get_active_model()
└── web/
    └── routers/
        └── models.py                     # NUEVO — GET /api/models, PUT /api/config/active-model (contracts/api-additions.md)

frontend/                               # Sin cambios de framework respecto a 002
├── package.json                         # sin dependencias nuevas
└── src/
    ├── api/
    │   └── client.ts                     # + getModels(), setActiveModel()
    ├── pages/
    │   └── SettingsPage.tsx              # NUEVO — US1/US2 (RF1/RF2)
    ├── components/
    │   ├── Sidebar.tsx                    # colapsable + iconos SVG + control de ayuda "?" (US3/US4)
    │   ├── icons/                         # NUEVO — UploadIcon.tsx, ExplorerIcon.tsx, SettingsIcon.tsx, ChevronIcon.tsx, HelpIcon.tsx
    │   └── ScreenHelpTooltip.tsx           # NUEVO — hover en escritorio + tap en "?" en táctil (FR-013/014)
    ├── hooks/
    │   └── useSidebarCollapse.ts           # NUEVO — persiste el colapso en localStorage (FR-012/SC-005)
    └── App.tsx                            # + ruta "/settings"
```

**Structure Decision**: Se mantiene la estructura "Option 2: Web application" ya adoptada en
002-react-frontend-migration (frontend y backend como proyectos separados). Esta feature no
agrega proyectos nuevos ni reestructura los existentes: solo añade módulos puntuales dentro de
`src/llm/`, `src/web/routers/` y `frontend/src/` siguiendo los mismos patrones ya usados por
`jobs.py`/`files.py` y por `Sidebar.tsx`/`api/client.ts` respectivamente.

## Complexity Tracking

*Sin violaciones que justificar — tabla omitida (ver Constitution Check).*
