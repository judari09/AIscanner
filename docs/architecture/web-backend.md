# Backend web

[`web.app.create_app`](../reference/web/app.md) construye la aplicación FastAPI: monta los
routers de la API, inicializa la cola de trabajos y el servicio del explorador en `app.state`, y
sirve el frontend ya compilado (`frontend/dist/`) con una ruta de captura general para que React
Router resuelva las rutas del lado del cliente.

## Cola de trabajos (`web/jobs/`)

Digitalizar un documento puede tardar — no es una respuesta HTTP inmediata. La interfaz web sube
las imágenes, encola un [`ProcessingJob`](../reference/web/jobs.md) y el cliente sondea su estado
(`GET /api/jobs/{id}`) hasta que termina.

[`JobQueue`](../reference/web/jobs.md) es una cola **en memoria** (`asyncio.Queue` + una sola
tarea worker), a propósito: el pipeline OCR/LLM local no está pensado para correr varias
instancias en paralelo en el mismo hardware, y una cola en memoria evita traer un broker externo
(Celery/Redis) solo para garantizar ese orden secuencial. Como es en memoria, un trabajo en curso
se pierde si el servidor se reinicia — pero las imágenes originales ya guardadas en disco no se
ven afectadas, y el usuario puede volver a subirlas.

`JobQueue` no sabe *cómo* correr el pipeline: delega eso a un
[`PipelineRunner`](../reference/web/pipeline_runner.md) inyectado (Dependency Inversion,
Principio III). La única implementación real, `CorePipelineRunner`, es un adaptador delgado sobre
[`pipeline.run_pipeline`](../reference/pipeline.md) — el mismo núcleo que usa la CLI.

## Explorador de archivos (`web/explorer/`)

[`FileExplorerService`](../reference/web/explorer.md) lista, visualiza y organiza lo que ya vive
bajo `OUTPUT_DIR`, **sin índice propio**: cada llamada refleja el estado real del sistema de
archivos en ese instante (Principio VI — sin base de datos, sin historial). Trata de forma
transparente dos formas en las que puede existir un documento en disco:

- **Con carpeta propia** (lo que produce la interfaz web): `<carpeta>/<carpeta>.md`, más
  `originales/`, diagramas y `.docx` sueltos dentro de esa misma carpeta.
- **Suelto** (lo que puede haber generado la CLI directo en `OUTPUT_DIR`): un `.md` sin carpeta
  propia, con sus archivos relacionados como hermanos en el mismo directorio.

Toda ruta que llega desde un request HTTP se resuelve con
[`resolve_safe_path`](../reference/web/fs_utils.md), que rechaza cualquier intento de escapar de
`OUTPUT_DIR` (*path traversal*) — necesario porque la interfaz web es alcanzable por red sin
autenticación propia (el único control de acceso es de red, vía Tailscale/WireGuard).

## Endpoints (`web/routers/`)

| Router | Endpoints | Responsabilidad |
|---|---|---|
| [`jobs`](../reference/web/routers.md) | `POST /api/jobs`, `GET /api/jobs/{id}`, `POST /api/jobs/{id}/retry` | Subir imágenes, consultar/reintentar un trabajo |
| [`files`](../reference/web/routers.md) | `GET /api/files`, `/view`, `/raw`, `/download*`, `POST /folder`, `/move` | El explorador de documentos |
| [`models`](../reference/web/routers.md) | `GET /api/models`, `PUT /api/config/active-model` | Listar modelos de Ollama y cambiar el activo |
| [`health`](../reference/web/routers.md) | `GET /health` | Señal de "el backend está vivo", usada por el frontend para detectar desconexión |

Cada router es delgado: valida el request, llama al servicio/cola correspondiente, y traduce
excepciones de dominio (`FileNotFoundError`, `NameConflictError`, `ConnectionError`, …) a códigos
HTTP. La lógica de negocio vive en `JobQueue`/`FileExplorerService`/`llm.model_catalog`, no en los
routers.
