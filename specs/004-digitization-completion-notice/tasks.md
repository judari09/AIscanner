---

description: "Task list for 004-digitization-completion-notice"
---

# Tasks: Aviso de Digitalización Completada

**Input**: Design documents from `/specs/004-digitization-completion-notice/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-additions.md, quickstart.md

**Tests**: No se generan tareas de test — el proyecto no tiene framework de tests configurado
(plan.md, Technical Context) y la spec no pide TDD; la validación es manual vía `quickstart.md`
(última tarea de Polish).

**Organización**: Las tareas se agrupan por historia de usuario, en el mismo orden de prioridad
de spec.md (P1 → P2 → P3) — a diferencia de la feature 003, aquí cada historia sí es
independiente de las siguientes: US1 no necesita el enlace directo de US2 para ser útil
(FR-002 solo exige un mensaje genérico apuntando al Explorador), y US2 no necesita el
cierre/auto-descarte de US3 para funcionar.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1–US3, ver spec.md)
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Aplicación web con backend y frontend separados (plan.md, Project Structure):
`src/` (backend Python) y `frontend/src/` (frontend TypeScript/React).

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Extender `ProcessingJob` y su contrato de API con los datos que las tres historias
necesitan (nombre de archivos generados y ruta relativa al Explorador), antes de tocar ninguna
pantalla.

**⚠️ CRITICAL**: Ninguna historia de usuario puede completarse sin esta fase — todas leen alguno
de estos campos nuevos.

- [X] T001 En `src/web/jobs/models.py`, agregar el campo `docx_path: Path | None = None` a `ProcessingJob` y cambiar `mark_done(self, result_document_path: Path, docx_path: Path | None = None)` para guardar también `docx_path`. Actualizar el docstring numpydoc de la clase y del método (research.md §2).
- [X] T002 En `src/web/jobs/queue.py`, actualizar `_process` para llamar `job.mark_done(result.markdown_path, result.docx_path)` en vez de solo `job.mark_done(result.markdown_path)` (depende de T001).
- [X] T003 En `src/web/routers/jobs.py`, actualizar `_job_to_dict` para incluir, solo cuando `job.status is JobStatus.DONE`: `document_relative_path` (`job.document_dir.relative_to(OUTPUT_DIR).as_posix()`), `markdown_filename` (`job.result_document_path.name`) y `docx_filename` (`job.docx_path.name` si existe, si no `None`); en cualquier otro estado, los tres campos son `None`. Actualizar el docstring (contracts/api-additions.md, research.md §1 — depende de T001, T002).
- [X] T004 [P] En `frontend/src/api/types.ts`, extender la interfaz `ProcessingJob` con `documentRelativePath: string | null`, `markdownFilename: string | null` y `docxFilename: string | null`.

**Checkpoint**: La respuesta de `/api/jobs*` ya trae los tres campos nuevos cuando un job está `done`; el frontend ya tiene el tipo que los describe. Lista la base para las tres historias.

---

## Phase 2: User Story 1 - Ver un aviso al terminar la digitalización (Priority: P1) 🎯 MVP

**Goal**: Al completarse una digitalización, aparece un aviso visible (no solo el chip de estado)
con el nombre del/los archivo(s) generado(s) y una referencia genérica a dónde consultarlos.

**Independent Test**: Subir una imagen, esperar a que termine, y ver el aviso con el nombre del
Markdown (y del `.docx` si se pidió); provocar un fallo y confirmar que el aviso de éxito no
aparece (quickstart.md Escenarios 1, 2 y 5).

### Implementation for User Story 1

- [X] T005 [US1] En `frontend/src/api/client.ts`, actualizar `toProcessingJob` para mapear `document_relative_path` → `documentRelativePath`, `markdown_filename` → `markdownFilename` y `docx_filename` → `docxFilename` (depende de T003, T004).
- [X] T006 [P] [US1] Crear `frontend/src/components/CompletionToast.tsx`: recibe el `job` actual como prop; no renderiza nada (`return null`) salvo cuando `job.status === 'done'`; muestra `job.markdownFilename` y, si `job.docxFilename` no es `null`, también ese nombre; muestra un mensaje genérico y no técnico ("disponible en el Explorador"), sin ninguna ruta de carpeta. Usa un elemento `<output>` para que se anuncie a lectores de pantalla, igual que `ConnectionBanner.tsx` (research.md §4). Aún sin botón de cerrar ni enlace directo (llegan en US2/US3). JSDoc completo.
- [X] T007 [P] [US1] Crear `frontend/src/components/CompletionToast.module.css` con los estilos del aviso (fondo, borde, tipografía) usando los tokens de `frontend/src/styles/tokens.css`, siguiendo el mismo patrón que `ConnectionBanner.module.css`.
- [X] T008 [US1] En `frontend/src/pages/UploadPage.tsx`, quitar el párrafo que muestra `job.resultDocumentPath` (ruta absoluta cruda) dentro del bloque `job.status === 'done'`, y renderizar `<CompletionToast job={job} />` en su lugar (research.md §5 — depende de T005, T006).

**Checkpoint**: US1 es funcional y verificable de forma independiente — el aviso aparece con los nombres de archivo correctos y nunca ante un fallo, aunque todavía no se pueda ni cerrar ni usar como atajo al documento.

---

## Phase 3: User Story 2 - Ir directo al documento recién generado (Priority: P2)

**Goal**: Desde el aviso, una acción lleva directo al documento ya abierto en el Explorador, sin
tener que buscarlo manualmente.

**Independent Test**: Con el aviso visible, activar su acción de ir al documento y llegar
directamente a verlo en el Explorador (quickstart.md Escenario 3).

### Implementation for User Story 2

- [X] T009 [US2] Extender `frontend/src/components/CompletionToast.tsx` (de T006): agregar un enlace/botón que navegue a `/explorer?open=<documentRelativePath>&name=<markdownFilename>` usando `Link`/`useNavigate` de `react-router-dom`, con las partes de la URL codificadas con `encodeURIComponent`. Actualizar el JSDoc (research.md §3 — depende de T006, T008).
- [X] T010 [P] [US2] En `frontend/src/pages/ExplorerPage.tsx`, leer `open` y `name` de `useSearchParams()` al montar; si `open` está presente, inicializar `viewerPath`/`viewerName` con esos valores para que `DocumentViewer` se abra de inmediato, sin esperar a que el usuario haga clic en la lista (research.md §3).

**Checkpoint**: US1 + US2 juntas permiten ver el aviso y llegar al documento en un solo clic (quickstart.md Escenario 3 completo).

---

## Phase 4: User Story 3 - Descartar el aviso cuando ya no lo necesito (Priority: P3)

**Goal**: El usuario puede cerrar el aviso manualmente, o dejar que se cierre solo tras unos
segundos, sin que le impida seguir usando la pantalla de Cargar.

**Independent Test**: Cerrar el aviso manualmente y confirmar que desaparece; por separado,
dejarlo sin tocar y confirmar que desaparece solo; iniciar una nueva digitalización con el aviso
visible y confirmar que no lo bloquea (quickstart.md Escenario 4).

### Implementation for User Story 3

- [X] T011 [US3] Extender `frontend/src/components/CompletionToast.tsx` (de T006/T009) con estado local `dismissed`: un botón de cerrar que lo pone en `true`; un `useEffect` con `setTimeout` (~8s) que también lo pone en `true` si el usuario no interactúa; y otro `useEffect` que reinicia `dismissed` a `false` cada vez que `job.jobId` cambia, para que el aviso vuelva a aparecer si se completa una digitalización nueva en vez de quedar oculto por el descarte de la anterior (FR-007/FR-010, research.md §6 — depende de T009).

**Checkpoint**: Las tres historias quedan completas y verificables juntas vía `quickstart.md`. `CompletionToast` es un elemento no modal (sin overlay ni captura de foco), así que FR-005/SC-004 (no bloquear la pantalla) se cumple por construcción, sin tarea de implementación aparte.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verificación final que atraviesa las tres historias.

- [X] T012 Ejecutar `cd frontend && npx tsc -b` y `npx oxlint --react-plugin`, y corregir cualquier error de tipos o hallazgo de accesibilidad introducido por `CompletionToast.tsx`, `UploadPage.tsx` o `ExplorerPage.tsx`.
- [X] T013 Ejecutar manualmente los 5 escenarios de `specs/004-digitization-completion-notice/quickstart.md` de punta a punta (con `uv run serve.py` y el frontend compilado), confirmando en particular que el aviso no bloquea el envío de una nueva digitalización (Escenario 4), y corregir cualquier discrepancia encontrada.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: Sin dependencias — puede empezar de inmediato. Bloquea a las tres historias.
- **US1 (Phase 2)**: Depende de Foundational (T001–T004). No depende de US2 ni US3.
- **US2 (Phase 3)**: Depende de US1 (T006, T008 — extiende el mismo componente `CompletionToast`). No depende de US3.
- **US3 (Phase 4)**: Depende de US2 (T009 — extiende el mismo componente otra vez). No hay nada en US3 de lo que dependan historias anteriores.
- **Polish (Phase 5)**: Depende de todas las historias que se vayan a entregar.

### Parallel Opportunities

- T004 (Foundational, frontend types) en paralelo con T001–T003 (Foundational, backend) — pilas distintas, sin dependencia de código entre sí.
- T006 y T007 (US1) en paralelo entre sí — archivos distintos; ambos solo dependen de T004 (tipos), no entre sí.
- T010 (US2, `ExplorerPage.tsx`) en paralelo con T009 (US2, `CompletionToast.tsx`) — archivos distintos; el formato de los query params (`open`/`name`) ya lo fija research.md §3, así que ninguna de las dos tareas necesita esperar a la otra.

---

## Parallel Example: Foundational

```bash
Task: "Extender ProcessingJob en src/web/jobs/models.py (T001)"
Task: "Extender ProcessingJob en frontend/src/api/types.ts (T004)"
```

## Parallel Example: User Story 1

```bash
Task: "Crear frontend/src/components/CompletionToast.tsx (T006)"
Task: "Crear frontend/src/components/CompletionToast.module.css (T007)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1 (Foundational).
2. Completar Phase 2 (US1) — aviso visible con nombres de archivo correctos.
3. **Validar**: quickstart.md Escenarios 1, 2 y 5.
4. Esto ya resuelve el problema central descrito por el usuario (saber qué se generó, sin tener
   que ir a mirar por su cuenta).

### Incremental Delivery

1. Foundational → base lista.
2. US1 → aviso informativo, demostrable.
3. US2 → acceso directo de un clic (mejora de valor sobre US1).
4. US3 → cerrar/auto-descartar sin bloquear (refinamiento de comodidad).
5. Polish → verificación de tipos/lint + validación manual completa.

---

## Notes

- [P] = archivos distintos sin dependencias pendientes entre sí.
- Cada tarea de código nuevo/modificado DEBE incluir su docstring numpydoc (Python) o JSDoc
  (TypeScript/React) como parte de la propia tarea, no como paso separado (Principio IV de la
  constitución).
- Comentarios que expliquen decisiones no obvias (por qué se guarda `docx_path` en vez de
  recalcularlo, por qué la ruta relativa se calcula en el router) van en el código de la tarea
  correspondiente (T001, T003), no en una tarea separada (Principio V).
- Confirmar tras cada tarea que no se rompió ninguna historia ya completada antes de continuar.
