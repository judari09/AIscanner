# Data Model: Aviso de Digitalización Completada

Sin entidades de dominio nuevas ni persistencia (Principio VI) — esta feature extiende un tipo ya
existente (`ProcessingJob`, feature 001) con los campos que le faltaban para poder describir su
resultado de forma amigable, y define un tipo de UI puramente derivado en el frontend.

## `ProcessingJob` (extensión)

Ya definido en `specs/001-web-ui-upload-explorer/data-model.md` y reflejado en
`frontend/src/api/types.ts`. Se agregan tres campos, presentes únicamente cuando
`status === "done"` (`null`/ausentes en cualquier otro estado):

| Campo (backend, snake_case) | Campo (frontend, camelCase) | Tipo | Descripción |
|---|---|---|---|
| `document_relative_path` | `documentRelativePath` | `string \| null` | Ruta del documento relativa a `OUTPUT_DIR`, en el mismo formato que ya usa `GET /api/files*` (ej. `"mi-documento"`). Lo que la Historia 2 necesita para abrir el documento directo. |
| `markdown_filename` | `markdownFilename` | `string \| null` | Nombre del archivo Markdown generado (ej. `"mi-documento.md"`). |
| `docx_filename` | `docxFilename` | `string \| null` | Nombre del archivo Word generado, o `null` si no se pidió `export_docx` (o si el `.docx` no llegó a generarse pese a haberse pedido). |

**Reglas de validación**: Los tres campos solo tienen valor cuando `status` es `"done"` y el
pipeline realmente produjo ese archivo -- no se infieren por convención, se toman de la ruta real
devuelta por `PipelineResult` (research.md §1-2). El campo ya existente `result_document_path`
(ruta absoluta) no se modifica ni se elimina -- sigue existiendo por compatibilidad con las
features 001/002, simplemente el frontend deja de usarlo para mostrar texto al usuario.

**Ciclo de vida**: Sin cambios respecto a 001 -- se calculan una vez, al transicionar el job a
`DONE` (`ProcessingJob.mark_done`), y se sirven tal cual en cada `GET /api/jobs/{id}` mientras el
proceso del servidor siga arriba (sin persistencia entre reinicios, igual que el resto del job).

## `CompletionToast` (estado de UI, sin persistencia)

Puramente derivado del `job` que ya mantiene `useJobPolling` -- no es una entidad con ciclo de
vida propio ni se serializa hacia ningún backend.

| Campo | Tipo | Descripción |
|---|---|---|
| `markdownFilename` | `string` | Tomado de `job.markdownFilename`. |
| `docxFilename` | `string \| null` | Tomado de `job.docxFilename`. |
| `documentRelativePath` | `string` | Tomado de `job.documentRelativePath`; usado para construir el enlace `/explorer?open=...&name=...`. |
| `dismissed` | `boolean` | Estado local del componente: `true` tras el cierre manual o el auto-descarte (FR-006/FR-007). |

**Reglas de validación**: Solo se construye/muestra cuando `job.status === "done"` (FR-001,
FR-009 -- nunca en `failed`). Al llegar un `job` distinto ya en `"done"` (una digitalización
nueva), el aviso se reconstruye con los datos del job más reciente, reemplazando cualquier
contenido anterior (FR-010, research.md §6) -- no se acumulan instancias.

**Ciclo de vida**: Nace cuando `job.status` pasa a `"done"`; muere cuando el usuario lo cierra
manualmente, cuando expira el temporizador de auto-descarte, o cuando el usuario navega fuera de
la pantalla de Cargar (se desmonta con el componente, sin dejar rastro -- Assumptions de
`spec.md`: sin historial de avisos).
