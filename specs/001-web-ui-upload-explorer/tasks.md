---

description: "Task list for Interfaz Web de Carga y Explorador de Archivos"
---

# Tasks: Interfaz Web de Carga y Explorador de Archivos

**Input**: Design documents from `/specs/001-web-ui-upload-explorer/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/api.md, research.md,
design-system.md, quickstart.md (todos presentes)

**Tests**: No solicitadas explícitamente en spec.md — el proyecto no tiene framework de tests
configurado (ver `CLAUDE.md`). La validación es manual vía `quickstart.md` (tarea T034). Si se
decide introducir `pytest` más adelante, se documenta primero en `CLAUDE.md`.

**Regla transversal (Constitución v1.1.0, Principios III–V)**: toda clase nueva sigue SOLID, y
toda función/clase nueva lleva docstring numpydoc y comentarios explicando el porqué de
decisiones no obvias. Esto aplica a cada tarea de implementación abajo, no solo a la de Polish.

**Regla transversal de diseño**: ningún archivo de plantilla o estilo define un color, tamaño de
letra, radio o valor de espaciado por su cuenta — todo se referencia desde las variables CSS de
`src/web/static/tokens.css` (ver `design-system.md`).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: A qué historia de usuario pertenece (US1, US2)
- Las rutas de archivo son las de `plan.md` → Project Structure

## Phase 1: Setup

**Purpose**: Preparar el árbol de archivos de la segunda interfaz antes de implementar nada.

- [X] T001 Crear el paquete `src/web/` con subcarpetas vacías `jobs/`, `explorer/`, `routers/`,
  `templates/`, `static/`, `static/fonts/` (cada una con su `__init__.py` donde aplique), según
  la estructura de `plan.md`. *(sin `__init__.py`: el proyecto usa namespace packages implícitos,
  igual que `src/ocr/`, `src/llm/`, `src/output/` ya existentes — se siguió esa convención.)*
- [X] T002 [P] Crear `serve.py` en la raíz del repo: entry point delgado que arranca `uvicorn`
  sobre `src.web.app:create_app()`, imprimiendo la URL local (y, si está disponible, la IP de
  Tailscale del equipo) al iniciar — con docstring numpydoc explicando su rol de punto de
  entrada delgado (Principio II, research.md §6). *(Renombrado de `web.py` a `serve.py` durante
  la implementación por colisión de nombre con el paquete `src/web/` — ver research.md §6.)*

**Checkpoint**: Estructura de carpetas lista para la Fase 2.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura compartida por ambas historias, incluyendo el sistema de diseño
centralizado — nada de la Fase 3+ puede completarse sin esto.

**⚠️ CRITICAL**: Ninguna tarea de US1/US2 puede darse por terminada sin que esta fase esté lista.

- [X] T003 Crear `src/config.py` con `OUTPUT_DIR` (leído de la variable de entorno
  `AISCANNER_OUTPUT_DIR`, default `./output`), con docstring numpydoc y un comentario explicando
  por qué es la única fuente de verdad de almacenamiento (Principio VI — sin base de datos,
  research.md §4).
- [X] T004 Crear `src/web/fs_utils.py` con una función `resolve_safe_path(base, relative) -> Path`
  que rechace (lance excepción) cualquier `relative` que intente salir de `base` (path
  traversal), con docstring numpydoc y un comentario explicando por qué es necesario dado que la
  interfaz es alcanzable por red sin autenticación propia (FR-016/FR-017). *(Verificado
  manualmente: `GET /api/files?path=../../etc` devuelve 404, no escapa `OUTPUT_DIR`.)*
- [X] T005 Crear `src/web/app.py` con una factory `create_app() -> FastAPI` que configure
  `Jinja2Templates` sobre `src/web/templates/`, monte `StaticFiles` desde `src/web/static/`, y
  deje puntos de inclusión para los routers de las Fases 3 y 4 (se completan en T016 y T026),
  con docstring numpydoc.
- [X] T006 [P] Crear `src/web/static/tokens.css` con las variables CSS `:root` de
  `design-system.md` (colores, tipografía, radios, espaciado) — un comentario al inicio del
  archivo explicando la regla de reconciliación entre el bloque de tokens y la prosa del brief
  original (ver `design-system.md` → Nota de reconciliación), y otro comentario junto a
  `--color-warning`/`--color-on-warning` aclarando que son la única adición fuera del token set.
- [X] T007 [P] Auto-hospedar las fuentes Inter y Geist como `.woff2` en
  `src/web/static/fonts/` y declarar los `@font-face` correspondientes dentro de `tokens.css`
  (depende de T006 para el archivo destino) — comentario explicando por qué no se usa un CDN
  externo (evitar peticiones de red del navegador a terceros, alineado con el espíritu del
  Principio I). *(Los `@font-face` y el fallback a fuentes de sistema se implementaron durante
  la sesión de implementación; los binarios `.woff2` no pudieron descargarse en esa sesión por
  falta de acceso a internet, así que se dejó `src/web/static/fonts/README.md` con instrucciones
  exactas. El usuario agregó los 5 archivos `.woff2` manualmente después — verificado sirviendo
  `304 Not Modified` desde el navegador, confirmando que cargan correctamente.)*
- [X] T008 [P] Crear `src/web/templates/base.html`: layout de sidebar fijo (260px,
  `--layout-sidebar-width`) + contenido fluido, con los breakpoints de `design-system.md`
  (drawer en móvil, sidebar a solo-íconos en tablet), navegación entre "Cargar" y "Explorador"
  (depende de T006).
- [X] T009 [P] Crear `src/web/static/styles.css` con los estilos compartidos (estados de
  carga/vacío/error, tarjetas, botones primario/secundario/terciario, barra de
  búsqueda/navegación de ruta) usando exclusivamente las variables de `tokens.css` — ningún
  valor hardcodeado (depende de T006).

**Checkpoint**: Con la Fase 2 lista, US1 y US2 pueden implementarse en paralelo si hay más de un
desarrollador — cada una depende solo de T003–T009, no una de la otra.

---

## Phase 3: User Story 1 - Cargar y Procesar un Documento desde la Interfaz Web (Priority: P1) 🎯 MVP

**Goal**: El usuario sube imágenes desde el navegador, elige si quiere `.docx`, y obtiene el
Markdown procesado por el mismo núcleo que usa la CLI, con estado de progreso y reintento ante
fallos.

**Independent Test**: Con el servidor arriba y sin usar la CLI, subir 1-2 imágenes de prueba,
confirmar el envío, y verificar que aparece un Markdown equivalente al que generaría
`uv run main.py` con las mismas imágenes (ver Escenario 1 de `quickstart.md`).

### Implementation for User Story 1

- [X] T010 [P] [US1] Crear `ProcessingJob` (dataclass) y el enum de estados
  (`queued`/`processing`/`done`/`failed`) en `src/web/jobs/models.py`, con docstring numpydoc en
  cada campo no obvio (según `data-model.md` → ProcessingJob).
- [X] T011 [P] [US1] Crear el protocolo `PipelineRunner` y el adaptador `CorePipelineRunner` en
  `src/web/pipeline_runner.py`: `CorePipelineRunner` guarda las imágenes subidas en
  `OUTPUT_DIR/<nombre-documento>/originales/` (usando `resolve_safe_path` de T004) y luego
  delega en `pipeline.run_pipeline` — con un comentario explicando por qué la capa web depende
  de la abstracción `PipelineRunner` y no de `run_pipeline` directamente (Principio III, DIP).
  *(Ajuste durante la implementación: el guardado en disco de las imágenes subidas quedó en el
  router — `_stage_uploaded_images` en `routers/jobs.py` —, no en `CorePipelineRunner`, porque un
  `UploadFile` de FastAPI solo es legible durante el request; `PipelineRunner.run` recibe rutas
  ya en disco. Ver comentario en el propio archivo.)*
- [X] T012 [US1] Crear `JobQueue` en `src/web/jobs/queue.py`: `asyncio.Queue[ProcessingJob]` +
  una tarea worker en background que invoca `PipelineRunner.run(...)` de a un trabajo a la vez y
  actualiza `status`/`error_message`/`result_document_path` (depende de T010, T011); comentario
  explicando por qué la cola es en memoria y no persiste entre reinicios (Principio VI,
  research.md §2). *(`asyncio.to_thread` alrededor de `PipelineRunner.run`: PaddleOCR/Ollama son
  síncronos y bloquearían el event loop entero si corrieran directo dentro de él.)*
- [X] T013 [US1] Implementar `POST /api/jobs` en `src/web/routers/jobs.py`: recibe
  `multipart/form-data` (`images[]`, `export_docx`), rechaza archivos que no sean jpg/png antes
  de encolar (FR-006) devolviendo `400` con el detalle, y encola un `ProcessingJob` vía
  `JobQueue` devolviendo `202` (depende de T012). Ver `contracts/api.md`. *(Probado manualmente:
  `.txt` → 400 con `rejected_files`; `.jpeg` real → 202, procesado de punta a punta con
  PaddleOCR+Ollama corriendo de verdad, resultado correcto en disco.)*
- [X] T014 [US1] Implementar `GET /api/jobs/{job_id}` en `src/web/routers/jobs.py`: devuelve el
  estado actual del trabajo o `404` si no existe (depende de T012). Ver `contracts/api.md`.
- [X] T015 [US1] Implementar `POST /api/jobs/{job_id}/retry` en `src/web/routers/jobs.py`:
  reencola el mismo `ProcessingJob` (mismas imágenes/orden) si está en `failed`, `409` si no
  (depende de T014). Ver `contracts/api.md`.
- [X] T016 [US1] Registrar el router de T013–T015 en `create_app()` (`src/web/app.py`, depende
  de T005 y T013–T015).
- [X] T017 [P] [US1] Crear `src/web/templates/upload.html` (extiende `base.html` de T008):
  selector de imágenes con reordenamiento de páginas, checkbox de generar `.docx` (FR-013), y
  zona de estado del trabajo con botón de reintentar — usando los componentes de
  `design-system.md` (tarjeta de subida `--radius-lg`, botón primario
  `--color-primary-container`, chips de estado en forma píldora `--radius-full`, mensaje de
  error con `--color-error-container`).
- [X] T018 [US1] Crear `src/web/static/upload.js`: envía el `POST /api/jobs`, hace polling de
  `GET /api/jobs/{id}` cada 1-2s (research.md §3) actualizando la UI entre
  `en cola/procesando/completado/fallido`, y dispara `POST /api/jobs/{id}/retry` desde el botón
  de reintentar (depende de T016, T017).

**Checkpoint**: US1 es funcional y comprobable de forma independiente — Escenario 1 completo de
`quickstart.md` (incluyendo el caso de reintento y el de archivo inválido).

---

## Phase 4: User Story 2 - Explorar, Organizar y Descargar Documentos Procesados (Priority: P2)

**Goal**: El usuario ve lo que ya procesó (por la CLI o por US1), lo organiza en carpetas, lo
visualiza y lo descarga — incluso desde otro dispositivo por la red privada.

**Independent Test**: Con archivos ya existentes en `OUTPUT_DIR` (no requiere que US1 esté
implementada, solo que existan archivos de salida), abrir el explorador, listar, visualizar,
crear una carpeta, mover un documento, y descargarlo (ver Escenario 2 de `quickstart.md`).

### Implementation for User Story 2

- [X] T019 [US2] Crear `FileExplorerService` en `src/web/explorer/service.py` con métodos
  `list(path)`, `view(path)`, `create_folder(path)`, `move(source, destination)`,
  `package_document(path)` y `package_folder(path)` — todos usando `resolve_safe_path` (T004)
  y operando directo sobre `pathlib.Path` bajo `OUTPUT_DIR`; cada método con docstring numpydoc
  y, en `create_folder`/`move`, un comentario explicando la detección de conflictos de nombre
  (FR-014) y del caso "mover una carpeta dentro de sí misma" (edge case de spec.md). *(Ajuste:
  también soporta documentos "sueltos" — un `.md` sin carpeta propia, ej. copiado ahí a mano o
  generado por la CLI directo en `OUTPUT_DIR` — no solo los que sube la Historia 1; ver
  docstring de la clase. Requirió `from __future__ import annotations` porque el propio método
  `list()` sombreaba el builtin `list` usado en otras anotaciones de tipo del archivo.)*
- [X] T020 [US2] Implementar `GET /api/files` en `src/web/routers/files.py`: lista carpetas y
  documentos bajo `path` (raíz de `OUTPUT_DIR` si no se da), `404` si `path` no existe (depende
  de T019). Ver `contracts/api.md`.
- [X] T021 [US2] Implementar `GET /api/files/view` en `src/web/routers/files.py`: devuelve el
  Markdown de un documento con los enlaces de imagen reescritos hacia `GET /api/files/raw`
  (depende de T019) — endpoint agregado durante la implementación, ver nota en `contracts/api.md`.
- [X] T022 [US2] Implementar `POST /api/files/folder` en `src/web/routers/files.py`: crea una
  carpeta, `409` si el nombre ya existe (FR-014) (depende de T019).
- [X] T023 [US2] Implementar `POST /api/files/move` en `src/web/routers/files.py`: mueve un
  documento o carpeta, `409` en colisión de nombre o si el destino es subruta del origen, `404`
  si el origen no existe (depende de T019).
- [X] T024 [US2] Implementar `GET /api/files/download` en `src/web/routers/files.py`: descarga un
  documento individual completo (Markdown + recursos + `.docx` si existe), empaquetado en `.zip`
  solo si hay más de un archivo (FR-011) (depende de T019).
- [X] T025 [US2] Implementar `GET /api/files/download-folder` en `src/web/routers/files.py`:
  descarga una carpeta completa como `.zip` (FR-012) (depende de T019).
- [X] T026 [US2] Registrar el router de T020–T025 en `create_app()` (`src/web/app.py`, depende
  de T005 y T020–T025). *(Probado manualmente: move, download y download-folder de punta a
  punta contra un documento real generado por US1 — ver informe de implementación.)*
- [X] T027 [P] [US2] Crear `src/web/templates/explorer.html` (extiende `base.html` de T008):
  árbol de carpetas/documentos, visor de contenido renderizado, botón de crear carpeta, y estado
  vacío explicativo (Acceptance Scenario 5 de la Historia 2) — usando los componentes de
  `design-system.md`: tarjeta de documento (`--radius-lg`, ícono en cuadro 40×40 con
  `--color-primary-container`/`--color-secondary-container`, badge píldora "DOCX" si aplica),
  ícono de carpeta (`--color-tertiary-container`), barra de navegación de ruta tipo búsqueda, y
  el ítem activo del sidebar (`--color-secondary-container` + indicador de 3px
  `--color-primary-container`).
- [X] T028 [US2] Crear `src/web/static/explorer.js`: navega el árbol vía `GET /api/files`,
  abre un documento vía `GET /api/files/view`, crea carpetas y mueve documentos manejando el
  `409` de conflicto con un prompt de confirmación/renombre (FR-014) estilizado con
  `--color-warning`, y dispara las descargas de T024/T025 (depende de T026, T027). *(El visor de
  Markdown usa un renderer propio minimalista, no una librería de terceros — ver comentario en
  el archivo — porque no hay CDN disponible para auto-hospedar algo como `marked.js` sin
  fetchearlo desde internet.)*

**Checkpoint**: US2 es funcional y comprobable de forma independiente — Escenario 2 completo de
`quickstart.md` (incluyendo conflicto de nombres y estado vacío). Combinado con US1, queda listo
el Escenario 3 (acceso remoto vía Tailscale).

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verificación final y documentación, sin funcionalidad nueva.

- [X] T029 Recorrer todos los módulos nuevos bajo `src/web/` y confirmar que cada función/clase
  tiene docstring numpydoc completo y que las decisiones no obvias (por qué in-memory, por qué
  sin auth propia, por qué sin interfaz de storage en `FileExplorerService`, etc.) tienen su
  comentario correspondiente — corregir lo que falte (Principios IV–V). *(Auditoría automatizada
  con `ast`: 2 funciones privadas sin docstring encontradas y corregidas —
  `_resolve_image` en `explorer/service.py` y `_start_job_queue` en `app.py`.)*
- [X] T030 [P] Recorrer `base.html`, `upload.html`, `explorer.html` y `styles.css` y confirmar
  que ningún color, tamaño de letra, radio o espaciado está escrito a mano — todo debe venir de
  una variable de `tokens.css` (regla transversal de diseño) — corregir cualquier valor
  hardcodeado encontrado. *(Sin colores hex fuera de `tokens.css`. Se corrigió un `font-size:
  20px` a `var(--type-headline-sm-size)`. Quedan 4 excepciones literales justificadas y
  documentadas con comentario: `3px` del indicador de sidebar, `40px` del cuadro de ícono, y
  `1024px` del breakpoint — ninguna forma parte de la escala de tokens ni puede tokenizarse
  (los `@media` no aceptan custom properties en su condición); `220px`/`720px`/`90vw`/`85vh` son
  detalles de layout propios de esta implementación, no valores del sistema de diseño.)*
- [X] T031 [P] Actualizar la sección "Commands" de `CLAUDE.md` y el `README.md` agregando
  `uv run serve.py` como forma de arrancar la interfaz web, junto a la nota de que el acceso
  remoto requiere Tailscale/WireGuard configurado por el usuario (FR-016).
- [X] T032 Ejecutar manualmente los 3 escenarios de `quickstart.md` de punta a punta (carga +
  proceso + reintento, explorador + organización + descarga, acceso remoto vía Tailscale) y
  registrar cualquier desviación encontrada. Ver informe detallado en la respuesta de
  `/speckit-implement` — resumen: Escenario 1 y 2 validados de punta a punta contra un servidor
  real (incluyendo PaddleOCR + Ollama corriendo de verdad); Escenario 3 (Tailscale) no se pudo
  ejecutar en este entorno de desarrollo por no tener Tailscale instalado — queda pendiente de
  validar por el usuario en su propia red.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sin dependencias — arranca de inmediato.
- **Foundational (Fase 2)**: depende de la Fase 1 — BLOQUEA a US1 y US2. Dentro de la Fase 2,
  T006 (tokens.css) bloquea a T007, T008 y T009.
- **US1 (Fase 3)** y **US2 (Fase 4)**: ambas dependen solo de la Fase 2 completa — son
  independientes entre sí (US2 no necesita que US1 exista; basta con que haya archivos en
  `OUTPUT_DIR`, generados por la CLI o manualmente para probarla).
- **Polish (Fase 5)**: depende de que las historias que se vayan a entregar estén completas.

### Within Each User Story

- Modelos/protocolos (T010, T011 / —) antes de servicios (T012 / T019).
- Servicios antes de endpoints (T013–T015 / T020–T025).
- Endpoints registrados en la app (T016 / T026) antes de la plantilla+JS que los consume
  (T017–T018 / T027–T028).

### Parallel Opportunities

- T006, T007 (parcial), T008 y T009 (Fase 2) — T007/T008/T009 pueden iniciarse en paralelo entre
  sí una vez que T006 existe.
- T010 y T011 (US1) en paralelo entre sí (archivos distintos, sin dependencia mutua).
- Toda la Fase 3 (US1) en paralelo con toda la Fase 4 (US2) si hay más de un desarrollador,
  una vez completada la Fase 2.
- T017 (plantilla US1) y T027 (plantilla US2) en paralelo entre sí.

---

## Parallel Example: Fase 2 seguida de US1 y US2 en paralelo

```bash
# Fase 2 (T006 primero, luego el resto en paralelo):
Task: "Crear src/web/static/tokens.css con las variables de design-system.md"
# --- una vez creado tokens.css ---
Task: "Auto-hospedar fuentes Inter/Geist + @font-face en tokens.css"    # [P]
Task: "Crear src/web/templates/base.html con layout sidebar+contenido"  # [P]
Task: "Crear src/web/static/styles.css consumiendo tokens.css"          # [P]

# Una vez lista la Fase 2, US1 y US2 arrancan en paralelo:
Task: "US1 — ProcessingJob en src/web/jobs/models.py"        # [P]
Task: "US1 — PipelineRunner en src/web/pipeline_runner.py"    # [P]
Task: "US2 — FileExplorerService en src/web/explorer/service.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 solamente)

1. Completar Fase 1: Setup
2. Completar Fase 2: Foundational (incluye el sistema de diseño — bloquea todo lo demás)
3. Completar Fase 3: US1
4. **DETENER y VALIDAR**: correr el Escenario 1 de `quickstart.md` de forma independiente
5. Con esto ya hay una interfaz web funcional para cargar y procesar documentos sin la CLI

### Incremental Delivery

1. Setup + Foundational → base y sistema de diseño listos
2. Agregar US1 → validar con Escenario 1 → esto ya es el MVP entregable
3. Agregar US2 → validar con Escenario 2 (y Escenario 3 si ya hay Tailscale configurado)
4. Polish (T029–T032) al cierre

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes entre sí
- [US1]/[US2] mapean cada tarea a su historia de usuario para trazabilidad
- Cada historia debe quedar completable y comprobable de forma independiente
- Ningún cambio toca `src/pipeline.py`, `src/ocr/`, `src/llm/` ni `src/output/` — se reutilizan
  tal cual (Principio II)
- Ningún archivo de plantilla/estilo define valores visuales propios — todo pasa por
  `tokens.css` (ver `design-system.md`), verificado en T030
