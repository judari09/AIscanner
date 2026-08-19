# Implementation Plan: Interfaz Web de Carga y Explorador de Archivos

**Branch**: `001-web-ui-upload-explorer` | **Date**: 2026-08-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-web-ui-upload-explorer/spec.md`

## Summary

Agregar una segunda interfaz (web, local) al escáner de manuscritos, sin tocar el núcleo del
pipeline OCR→LLM→output ya existente. La interfaz permite (US1) cargar imágenes y enviarlas a
procesar con la opción de generar `.docx`, con estado de progreso y reintento ante fallos; y
(US2) explorar, organizar en carpetas, visualizar y descargar lo ya procesado. Se sirve con
FastAPI (ya declarado en el proyecto) + plantillas del lado del servidor, sin base de datos —
el sistema de archivos bajo un `OUTPUT_DIR` configurable es la única fuente de verdad — y queda
alcanzable únicamente por red privada (Tailscale/WireGuard), sin autenticación propia. Todo
valor visual (colores, tipografía, radios, espaciado) se centraliza en `tokens.css`, generado a
partir de `design-system.md`; ningún otro archivo de la UI define valores propios.

## Technical Context

**Language/Version**: Python 3.10–3.12 (mismo rango que el resto del proyecto)

**Primary Dependencies**: FastAPI `[standard]` (ya en `pyproject.toml`, incluye Jinja2,
`python-multipart` y Uvicorn — sin dependencias nuevas); reutiliza `src/pipeline.py`,
`src/ocr/`, `src/llm/`, `src/output/` tal cual existen hoy.

**Storage**: Sistema de archivos únicamente, bajo un `OUTPUT_DIR` configurable (nuevo
`src/config.py`). Sin base de datos ni índice — ver Principio VI y `data-model.md`.

**Testing**: Sin framework automatizado configurado en el proyecto todavía (ver `CLAUDE.md`);
validación manual vía `quickstart.md`. Si se decide introducir `pytest` más adelante, se
documentará en `CLAUDE.md` como indica su propia guía.

**Target Platform**: Navegador de escritorio, contra un servidor FastAPI/Uvicorn corriendo en
la máquina del usuario (Windows en este entorno), alcanzable en `localhost` y, para acceso
remoto, sobre la IP de Tailscale del equipo.

**Project Type**: Aplicación web de un solo proceso (backend FastAPI que también sirve la UI
renderizada) — no es un split frontend/backend separado; ver Project Structure.

**Performance Goals**: No hay objetivos de throughput — el cuello de botella es el propio
OCR/LLM local, no la capa web. La UI debe responder de forma fluida (listar/navegar archivos)
independientemente de cuánto tarde un trabajo de procesamiento en curso.

**Constraints**: 100% local (Principio I); alcanzable solo desde la red privada del usuario, sin
exposición pública a internet (FR-016); sin autenticación propia (FR-017); procesamiento
estrictamente secuencial, un trabajo a la vez (Assumptions de la spec).

**Scale/Scope**: Un solo usuario, uso personal; sin objetivo de usuarios concurrentes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación |
|---|---|
| I. Privacidad y Ejecución 100% Local | PASS — todo corre en la máquina del usuario; el acceso remoto es vía Tailscale/WireGuard (túnel privado punto a punto), no un túnel público (FR-016/FR-017 y Principio I ya lo exigen explícitamente). |
| II. Núcleo Desacoplado de la Interfaz | PASS — la capa web depende de `PipelineRunner` (abstracción sobre `pipeline.run_pipeline`), no reimplementa OCR/LLM/output; ver `data-model.md`. |
| III. Principios SOLID en el Diseño de Clases | PASS con diseño explícito — `PipelineRunner` (DIP/LSP), `JobQueue` (SRP), `FileExplorerService` (SRP); ver `data-model.md` para la justificación de por qué `FileExplorerService` NO recibe una interfaz de storage intercambiable (evita violar YAGNI). |
| IV. Documentación NumPyDoc Obligatoria | Se aplica en fase de tareas/implementación — toda función/clase nueva de este feature debe llevar docstring numpydoc; no es algo que el plan "resuelva" sino una condición de aceptación de cada tarea (`/speckit-tasks`). |
| V. Comentarios que Explican el Porqué | Igual que IV — condición de cada tarea de implementación, no del plan. |
| VI. Sin Estado Persistente entre Ejecuciones | PASS — `ProcessingJob` vive solo en memoria mientras el proceso está arriba (research.md §2); lo persistente es únicamente lo que ya está en disco (Markdown, `.docx`, imágenes originales), sin índice/DB nuevo. |

**Resultado**: Sin violaciones. No se requiere la tabla de Complexity Tracking.

*Re-chequeo post-diseño (tras Fase 1)*: Los artefactos de diseño (`data-model.md`,
`contracts/api.md`) no introdujeron ninguna dependencia nueva ni ningún componente con estado
persistente fuera del sistema de archivos. Gate sigue en PASS.

## Project Structure

### Documentation (this feature)

```text
specs/001-web-ui-upload-explorer/
├── plan.md              # Este archivo
├── research.md          # Fase 0 — decisiones técnicas
├── data-model.md         # Fase 1 — entidades y componentes
├── design-system.md       # Fase 1 — tokens visuales (colores, tipografía, radios, espaciado)
├── quickstart.md         # Fase 1 — guía de validación manual
├── contracts/
│   └── api.md             # Fase 1 — contrato de los endpoints HTTP
└── tasks.md               # Fase 2 (/speckit-tasks — no generado por este comando)
```

### Source Code (repository root)

```text
serve.py                   # NUEVO — entry point delgado, arranca uvicorn sobre src/web/app.py
main.py                    # Existente — entry point de la CLI, sin cambios
src/
├── pipeline.py            # Existente, sin cambios — sigue siendo el único orquestador OCR→LLM→output
├── config.py               # NUEVO — OUTPUT_DIR y demás config compartida (ya prevista en CLAUDE.md, no creada hasta ahora)
├── cli.py                  # Existente, sin cambios
├── ocr/                     # Existente, sin cambios
├── llm/                     # Existente, sin cambios
├── output/                  # Existente, sin cambios
└── web/                      # NUEVO — segunda interfaz
    ├── app.py                 # Factory de la app FastAPI: monta routers, static, templates
    ├── pipeline_runner.py       # PipelineRunner (protocolo) + CorePipelineRunner (adaptador sobre pipeline.run_pipeline)
    ├── jobs/
    │   ├── models.py             # ProcessingJob (dataclass) y su estado
    │   └── queue.py               # JobQueue (asyncio.Queue + worker secuencial)
    ├── explorer/
    │   └── service.py             # FileExplorerService (listar/leer/crear carpeta/mover/empaquetar)
    ├── routers/
    │   ├── jobs.py                 # POST /api/jobs, GET /api/jobs/{id}, POST /api/jobs/{id}/retry
    │   └── files.py                 # endpoints de contracts/api.md bajo /api/files
    ├── templates/                  # Jinja2: base.html (sidebar+layout), upload.html, explorer.html
    └── static/                     # CSS + JS plano + assets de diseño
        ├── tokens.css                # NUEVO — variables CSS centralizadas (design-system.md); única fuente de valores visuales
        ├── fonts/                     # NUEVO — Inter y Geist auto-hospedadas (.woff2), sin CDN externo
        ├── styles.css                 # Consume exclusivamente tokens.css, sin valores hardcodeados
        ├── upload.js
        └── explorer.js
```

**Structure Decision**: Proyecto único (no hay split `backend/`/`frontend/` de Option 2 del
template) — FastAPI sirve tanto la API como la UI renderizada desde el mismo proceso, dentro del
mismo `src/` que ya existe, agregando el paquete `src/web/` como una interfaz más junto a
`src/cli.py`, igual que exige el Principio II. `serve.py` en la raíz espeja el patrón ya usado por
`main.py`.

## Complexity Tracking

*Sin violaciones que justificar — tabla omitida (ver Constitution Check).*
