# Data Model: Interfaz Web de Carga y Explorador de Archivos

No hay base de datos (Principio VI / FR-015 de la spec) — las entidades de dominio son
representaciones en memoria (para un trabajo en curso) o directamente el sistema de archivos
(para lo ya procesado). No se define ningún esquema de persistencia.

## ProcessingJob (en memoria, vive mientras el proceso del servidor está arriba)

Representa un envío de imágenes al pipeline (Historia 1, FR-002 a FR-005, FR-013).

| Campo | Tipo | Notas |
|---|---|---|
| `job_id` | `str` (UUID) | Identidad del trabajo; no persiste entre reinicios del servidor. |
| `image_paths` | `list[Path]` | Rutas de las imágenes ya guardadas en `OUTPUT_DIR/<doc>/originales/`, en el orden de páginas elegido por el usuario. |
| `export_docx` | `bool` | Elegido por el usuario al confirmar el envío (FR-013). |
| `status` | `Literal["queued", "processing", "done", "failed"]` | Transiciones: `queued → processing → done` o `queued → processing → failed`. `failed → queued` al reintentar (FR-005). |
| `error_message` | `str \| None` | Solo presente cuando `status == "failed"`. |
| `result_document_path` | `Path \| None` | Ruta del Markdown resultante; solo presente cuando `status == "done"`. |
| `created_at` | `datetime` | Para ordenar la cola y mostrarla si hay más de un trabajo pendiente. |

**Reglas de validación** (derivadas de FR-001, FR-002, FR-006):
- `image_paths` no puede estar vacío.
- Cada ruta en `image_paths` DEBE tener extensión `.jpg`, `.jpeg` o `.png` — se valida antes de
  crear el `ProcessingJob`, no dentro de él (ver `contracts/api.md`, `POST /api/jobs`).

**Ciclo de vida**: un `ProcessingJob` reintentado (FR-005) reutiliza el mismo `job_id` y
`image_paths`/`export_docx` — vuelve a `queued` y limpia `error_message`; no crea un trabajo
nuevo, para que la Historia de "reintentar sin volver a seleccionar" sea literal.

## ProcessedDocument (no es una clase — es una carpeta real bajo `OUTPUT_DIR`)

Representa el resultado de un `ProcessingJob` completado (Historia 2, FR-007, FR-008, FR-011).

| Atributo (derivado del filesystem) | Origen |
|---|---|
| Nombre | Nombre de la carpeta `OUTPUT_DIR/<nombre-documento>/`, derivado automáticamente del origen (Clarifications, sesión 2026-08-05). |
| Markdown | `OUTPUT_DIR/<nombre-documento>/<nombre-documento>.md` |
| Recursos embebidos | Archivos `<nombre-documento>_diagrama_N.png` sueltos junto al `.md` (así los escribe `output/mermaid_renderer.py` hoy — no hay subcarpeta `assets/`, corregido durante la implementación) |
| `.docx` (opcional) | `OUTPUT_DIR/<nombre-documento>/<nombre-documento>.docx`, presente solo si el `ProcessingJob` tenía `export_docx=True` |
| Imágenes originales | `OUTPUT_DIR/<nombre-documento>/originales/` |
| Fecha de creación/modificación | `stat().st_mtime` de la carpeta — no se guarda por separado (Principio VI: sin índice propio). |

No tiene identidad más allá de su ruta: si el usuario mueve la carpeta a una `Carpeta de
Organización` (ver abajo), esa nueva ruta *es* su nueva identidad — no hay un ID estable que
sobreviva al move, porque no hay tabla que lo rastree.

## OrganizationFolder (no es una clase — es una carpeta real bajo `OUTPUT_DIR`)

Cualquier subcarpeta creada por el usuario dentro de `OUTPUT_DIR` (FR-009, FR-010) para agrupar
`ProcessedDocument`. Puede anidar otras `OrganizationFolder`. Se valida (FR-013) que no exista ya
una carpeta o archivo con el mismo nombre en el destino antes de crear o mover.

## Componentes de la capa de aplicación (sí son clases — sujetas a SOLID, Principio III)

Estas no son "datos" sino los objetos que el diseño de Fase 1 necesita para mantener el
Principio II (núcleo desacoplado) y el Principio III (SOLID):

- **`PipelineRunner`** (protocolo/interfaz, Dependency Inversion): declara
  `run(image_paths, output_dir, export_docx) -> PipelineResult`. La capa web depende de esta
  abstracción, no directamente de `pipeline.run_pipeline`; el adaptador concreto
  (`CorePipelineRunner`) es un envoltorio delgado sobre la función ya existente en
  `src/pipeline.py`. Esto es lo que permite, más adelante, sustituir o mockear el pipeline en
  pruebas de la capa web sin tocar el núcleo (Interface Segregation + Liskov: cualquier
  `PipelineRunner` es intercambiable).
- **`JobQueue`** (Single Responsibility: solo secuencia y despacha trabajos): mantiene un
  `asyncio.Queue[ProcessingJob]` y una tarea worker que llama a `PipelineRunner.run(...)` de a
  un trabajo a la vez, actualizando `status`/`error_message`/`result_document_path` sobre el
  mismo `ProcessingJob`.
- **`FileExplorerService`** (Single Responsibility: listar/leer/organizar/empaquetar bajo
  `OUTPUT_DIR`): opera directamente sobre `pathlib.Path` — **no** se le da una interfaz de
  almacenamiento intercambiable, a propósito: el Principio VI ya fija "sistema de archivos, sin
  base de datos" como decisión de arquitectura permanente, así que abstraer el storage aquí
  sería una capa sin propósito (violaría YAGNI/Simplicidad en vez de servir a Open/Closed).
