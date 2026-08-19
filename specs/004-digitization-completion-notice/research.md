# Research: Aviso de Digitalización Completada

## 1. Cómo exponer una ubicación "abrible" del documento (FR-002, FR-008)

**Decision**: `_job_to_dict` (en `src/web/routers/jobs.py`) calcula, cuando `status` es `done`, la
ruta de `job.document_dir` relativa a `OUTPUT_DIR` (mismo cálculo `relative_to(...).as_posix()`
que ya usa `FileExplorerService._relative()`) y la expone como `document_relative_path`. Esa es la
misma forma de ruta que ya consumen `GET /api/files/view` y el resto del explorador.

**Rationale**: El campo que ya existe hoy, `result_document_path`, es la ruta **absoluta** del
sistema de archivos del servidor (ej. `C:\Users\...\output\mi-doc\mi-doc.md`) — no sirve para
construir un enlace hacia el explorador (que espera rutas relativas a `OUTPUT_DIR`), y además
expone una ruta interna del sistema operativo al usuario, justo lo que la sesión de Clarifications
de esta feature decidió evitar en el texto del aviso. Se agrega el campo nuevo en vez de mutar el
existente para no romper nada que ya dependa de `result_document_path` (compatibilidad hacia
atrás con 001/002).

**Alternatives considered**: Reconstruir la ruta relativa en el frontend a partir de la ruta
absoluta (ej. recortando un prefijo conocido) -- se descarta: el frontend no tiene por qué conocer
dónde vive `OUTPUT_DIR` en el disco del servidor, y cualquier diferencia de formato de ruta entre
sistemas operativos (backslash en Windows) lo haría fràgil. Es el backend quien ya sabe traducir
correctamente esa ruta (`FileExplorerService` lo hace desde la feature 001).

## 2. Nombre del archivo Word generado (FR-004)

**Decision**: `PipelineRunner.run()` ya devuelve `PipelineResult(markdown_path, docx_path)`, pero
`JobQueue._process` descarta `docx_path` al llamar `job.mark_done(result.markdown_path)`. Se
extiende `ProcessingJob` con un campo `docx_path: Path | None` y `mark_done(markdown_path,
docx_path=None)` para guardar ambos; `_job_to_dict` expone `docx_filename` (el `.name` de
`docx_path`, o `null` si no se generó).

**Rationale**: El nombre del `.docx` sigue una convención determinista (`{carpeta}.docx`, ver
`output/docx_writer.py`), pero **derivarlo de nuevo por convención en el router** duplicaría esa
regla en dos lugares (`pipeline.py` y `jobs.py`) — si la convención cambiara algún día, un lugar
quedaría desactualizado. Como el valor real ya lo calcula el pipeline y solo se estaba tirando,
propagarlo es más simple y correcto que recalcularlo.

**Alternatives considered**: Derivar `docx_filename` en el router a partir de
`job.export_docx and f"{document_dir.name}.docx"` -- se descarta por la razón de duplicación de
regla anterior; además no confirma que el `.docx` realmente se haya escrito con éxito (un fallo
parcial de Pandoc dejaría `export_docx=True` pero sin archivo real).

## 3. Mecanismo de "ir directo al documento" (US2, FR-008, Clarifications)

**Decision**: `ExplorerPage` lee, una sola vez al montar, los parámetros de búsqueda de la URL
(`useSearchParams` de `react-router-dom`, ya dependencia desde 002-react-frontend-migration):
`open` (la `document_relative_path` del job) y `name` (el nombre a mostrar en el visor). Si están
presentes, inicializa `viewerPath`/`viewerName` directamente con esos valores -- el mismo estado
que ya abre `DocumentViewer` cuando el usuario hace clic en un documento de la lista. El aviso
(`CompletionToast`) arma ese enlace como `/explorer?open=<document_relative_path>&name=<markdown_filename>`.

**Rationale**: `DocumentViewer` (feature 001) ya solo necesita `path` + `name` para funcionar --
no depende de que la carpeta contenedora ya esté listada (`listFiles`) primero. Eso permite abrir
el documento de inmediato sin una llamada adicional de red ni tener que replicar la navegación de
carpetas. Usar la URL (en vez de, por ejemplo, un estado global o `sessionStorage` compartido
entre páginas) es el mecanismo más simple ya soportado nativamente por el enrutador que la app ya
trae, y es coherente con que la navegación entre "Cargar" y "Explorador" ya se hace con
`<a href>`/`NavLink` normales.

**Alternatives considered**: Guardar el documento a abrir en un estado compartido entre páginas
(ej. Context de React o `sessionStorage`) -- se descarta por ser más maquinaria de la necesaria
para pasar dos strings entre dos páginas que ya se navegan por URL; también sería menos robusto si
el usuario abre el enlace en una pestaña nueva. Añadir un endpoint que reciba un `job_id` y
resuelva el documento -- se descarta porque el router de jobs ya expone toda la información
necesaria en la respuesta que el frontend ya está consultando por el polling existente.

## 4. Diseño del aviso emergente no bloqueante (US1/US3, FR-001/FR-005/FR-006/FR-007)

**Decision**: Un componente nuevo, `CompletionToast.tsx`, con el mismo patrón de accesibilidad que
`ConnectionBanner.tsx` (un elemento `<output>`, que ya tiene el rol `status` implícito y se anuncia
a lectores de pantalla sin interrumpir como lo haría un `alert`). Se renderiza posicionado fuera
del flujo normal (ej. esquina de la pantalla), sin overlay ni bloqueo de interacción, con un botón
de cierre explícito y un `setTimeout` que lo descarta solo tras unos segundos si el usuario no
interactúa.

**Rationale**: `ConnectionBanner` ya resolvió el mismo problema de forma accesible y sin depender
de una librería de "toasts" externa (consistente con la política de este proyecto de no traer
dependencias de UI nuevas para necesidades puntuales, ver research.md de 002 y 003). Reutilizar el
patrón evita reinventar el manejo de anuncio a lectores de pantalla.

**Alternatives considered**: Una librería de notificaciones tipo toast (`react-hot-toast`,
`sonner`) -- se descarta por ser una dependencia nueva para una necesidad puntual y ya cubierta por
un patrón propio existente en el proyecto.

## 5. Reemplazo del texto inline existente en `UploadPage.tsx`

**Decision**: La línea actual `Documento generado: <strong>{job.resultDocumentPath}</strong>.
Puedes verlo en el explorador.` se reemplaza por `CompletionToast`, que muestra los nombres de
archivo amigables y el enlace directo, en vez de la ruta absoluta cruda.

**Rationale**: Mostrar una ruta absoluta del sistema de archivos del servidor (ej.
`C:\Users\majom\...\output\...`) es exactamente el problema de experiencia de usuario que motivó
esta feature -- no es amigable, y además es inconsistente con la decisión de Clarifications de
evitar rutas internas. Mantenerla junto al aviso nuevo sería redundante y contradictorio.

**Alternatives considered**: Dejar el texto existente además del nuevo aviso -- se descarta porque
duplicaría la misma información con dos niveles de calidad distintos (uno técnico, uno amigable)
en la misma pantalla, confundiendo en vez de aclarar.

## 6. Reemplazar en vez de acumular avisos (FR-010, edge case)

**Decision**: No se necesita ninguna estructura de cola: `CompletionToast` simplemente se deriva
del único `job` que ya rastrea `useJobPolling` (un job a la vez, feature 001). Cuando ese `job`
cambia a un nuevo `done` (ej. tras iniciar y completar una segunda digitalización), React
re-renderiza el aviso con los datos del nuevo job, reemplazando el contenido anterior de forma
natural.

**Rationale**: Es una consecuencia directa de que la pantalla de Cargar ya solo rastrea un job por
vez -- no hay ningún estado adicional que gestionar para este caso límite.

**Alternatives considered**: Mantener una lista de avisos históricos en la sesión -- se descarta
explícitamente por las Assumptions de `spec.md` (sin historial de avisos pasados).
