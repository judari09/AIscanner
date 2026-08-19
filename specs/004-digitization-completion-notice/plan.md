# Implementation Plan: Aviso de Digitalización Completada

**Branch**: `004-digitization-completion-notice` | **Date**: 2026-08-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-digitization-completion-notice/spec.md`

## Summary

Cuando una digitalización termina, la pantalla de Cargar hoy solo actualiza un chip de estado y
una línea de texto con la ruta absoluta cruda del Markdown generado (`job.resultDocumentPath`) —
fácil de perderse y poco amigable. Esta feature agrega un aviso emergente no bloqueante
(`CompletionToast`) que aparece quand el job pasa a `done`: dice, en términos no técnicos, que el
documento ya está disponible en el Explorador, y muestra el nombre del Markdown (y del `.docx` si
se pidió). Un botón en el aviso lleva directo al documento ya abierto en el Explorador
(Clarifications, sesión 2026-08-14), lo que exige una extensión pequeña y acotada: el backend
expone en la respuesta del job una ruta relativa a `OUTPUT_DIR` (en vez de solo la absoluta) y los
nombres de archivo generados, y `ExplorerPage` aprende a abrir un documento específico al llegar
con esos datos en la URL. El aviso se cierra solo (unos segundos) o manualmente, y nunca aparece
si el job falla.

## Technical Context

**Language/Version**: Python 3.10–3.12 (backend, sin cambios) + TypeScript/React 19 (frontend,
sin cambios de versión)

**Primary Dependencies**: Ninguna dependencia nueva. El mecanismo de "abrir documento directo"
(US2) reutiliza `useSearchParams` de `react-router-dom` (ya dependencia desde
002-react-frontend-migration); el aviso reutiliza el mismo patrón de región accesible (`<output>`)
que ya usa `ConnectionBanner.tsx`.

**Storage**: Sin cambios. El aviso y los datos que muestra viven solo en memoria del navegador
mientras la pantalla de Cargar está abierta (Assumptions de `spec.md`) — no hay persistencia
nueva ni del lado del servidor ni del cliente.

**Testing**: Sin framework de tests automatizado (igual que el resto del proyecto). Validación
manual vía `quickstart.md`.

**Target Platform**: Navegador, sin cambios respecto a las features anteriores.

**Project Type**: Aplicación web con frontend y backend en proyectos separados, misma estructura
de 002-react-frontend-migration y 003-ui-polish-model-switch.

**Performance Goals**: El aviso debe aparecer en menos de 2s desde que el job pasa a `done`
(SC-001) — se cumple de forma directa porque se deriva del mismo estado de `job` que ya actualiza
`useJobPolling` cada 1.5s, sin ninguna llamada de red adicional.

**Constraints**: 100% local, sin llamadas nuevas a terceros (Principio I); el aviso no debe
bloquear la interacción con la pantalla de Cargar (FR-005/SC-004); el texto debe evitar rutas de
archivo internas del sistema (Clarifications); el aviso y la acción de abrir el documento deben
seguir siendo operables por teclado y anunciables por lector de pantalla (mismo estándar de
accesibilidad exigido desde 002-react-frontend-migration, no se relaja aquí).

**Scale/Scope**: Un componente nuevo (`CompletionToast`) en la pantalla de Cargar; una extensión
pequeña del contrato ya existente de `/api/jobs/{id}` (campos nuevos, ninguno se quita); una
extensión pequeña de `ExplorerPage` para abrir un documento indicado por la URL. Un solo usuario
por instalación, sin cambios al modelo de despliegue.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación |
|---|---|
| I. Privacidad y Ejecución 100% Local | PASS — no se agrega ninguna llamada de red nueva hacia fuera de la propia aplicación; los datos del aviso ya viajan hoy por el mismo polling de `/api/jobs/{id}`. |
| II. Núcleo Desacoplado de la Interfaz | PASS — el pipeline (`pipeline.py`, `PipelineRunner`) no cambia; el job ya devolvía `docx_path` en su resultado y solo se deja de descartar al guardarlo en `ProcessingJob`. La traducción a "ruta relativa a `OUTPUT_DIR`" ocurre en el router web (`jobs.py`), la misma capa que ya conoce `OUTPUT_DIR` hoy — no se filtra ese conocimiento hacia el core. |
| III. Principios SOLID en el Diseño de Clases | Se aplica al componente nuevo `CompletionToast` (única responsabilidad: mostrar/descartar el aviso de un job) y a mantener `ProcessingJob` con una sola razón de cambio (agregar un campo, no una responsabilidad nueva). |
| IV. Documentación NumPyDoc/JSDoc Obligatoria | Aplica a todo el Python modificado (numpydoc) y TypeScript/React nuevo o modificado (JSDoc): `ProcessingJob`, `jobs.py`, `CompletionToast.tsx`, cambios en `UploadPage.tsx`/`ExplorerPage.tsx`. |
| V. Comentarios que Explican el Porqué | Aplica en decisiones no obvias: por qué se computa la ruta relativa en el router y no en `ProcessingJob`; por qué se deja de descartar `docx_path`; por qué el mecanismo de apertura directa usa query params de la URL en vez de estado compartido entre páginas. |
| VI. Sin Estado Persistente entre Ejecuciones | PASS — el aviso no crea historial ni archivo de configuración nuevo; es puramente derivado del `job` ya en memoria de esta sesión de navegador, consistente con las Assumptions de `spec.md`. |

**Resultado**: Sin violaciones. No se requiere la tabla de Complexity Tracking.

*Re-chequeo post-diseño (tras Fase 1)*: `data-model.md` confirma que no se introduce ninguna
entidad de dominio nueva -- solo campos adicionales en la respuesta ya existente de
`/api/jobs/{id}` (`contracts/api-additions.md`) y un parámetro de URL ya soportado nativamente por
el enrutador del lado del cliente. Gate sigue en PASS.

## Project Structure

### Documentation (this feature)

```text
specs/004-digitization-completion-notice/
├── plan.md               # Este archivo
├── research.md           # Fase 0 — decisiones técnicas
├── data-model.md          # Fase 1 — extensión de ProcessingJob, sin entidades nuevas
├── quickstart.md          # Fase 1 — guía de validación manual
├── contracts/
│   └── api-additions.md    # Fase 1 — campos nuevos en la respuesta de /api/jobs*
└── tasks.md                # Fase 2 (/speckit-tasks — no generado por este comando)
```

### Source Code (repository root)

```text
src/                                    # Backend — cambios acotados
└── web/
    ├── jobs/
    │   ├── models.py                    # ProcessingJob gana docx_path; mark_done acepta ambas rutas
    │   └── queue.py                      # pasa result.docx_path a mark_done (hoy se descartaba)
    └── routers/
        └── jobs.py                       # _job_to_dict agrega document_relative_path/markdown_filename/docx_filename

frontend/                               # Sin cambios de framework
└── src/
    ├── api/
    │   ├── types.ts                      # ProcessingJob gana los 3 campos nuevos (camelCase)
    │   └── client.ts                      # toProcessingJob traduce los campos nuevos
    ├── components/
    │   └── CompletionToast.tsx            # NUEVO — el aviso emergente (US1/US2/US3)
    └── pages/
        ├── UploadPage.tsx                 # reemplaza el texto con ruta absoluta cruda por CompletionToast
        └── ExplorerPage.tsx               # lee ?open=&name= al montar para abrir el documento directo (FR-008)
```

**Structure Decision**: Se mantiene la estructura "Option 2: Web application" ya adoptada desde
002-react-frontend-migration. No se agregan proyectos ni módulos nuevos de infraestructura — todo
el trabajo son extensiones puntuales a archivos que ya existen, más un único componente de
presentación nuevo (`CompletionToast.tsx`), siguiendo el mismo patrón que `ConnectionBanner.tsx`.

## Complexity Tracking

*Sin violaciones que justificar — tabla omitida (ver Constitution Check).*
