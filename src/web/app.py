from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse

from config import ensure_output_dir
from web.explorer.service import FileExplorerService
from web.jobs.queue import JobQueue
from web.pipeline_runner import CorePipelineRunner
from web.routers import files as files_router
from web.routers import health as health_router
from web.routers import jobs as jobs_router

_WEB_DIR = Path(__file__).parent
# El frontend es un proyecto Vite independiente (002-react-frontend-migration,
# research.md §4) -- su build de producción cae en frontend/dist/, dos
# niveles arriba de src/web/.
_FRONTEND_DIST = _WEB_DIR.parent.parent / "frontend" / "dist"


def create_app() -> FastAPI:
    """
    Construye la aplicación FastAPI de la interfaz web.

    Es una *factory* (en vez de un `app = FastAPI()` a nivel de módulo) para
    que `serve.py` controle explícitamente cuándo se construye -- útil si más
    adelante se quiere una segunda instancia para pruebas, sin arrastrar
    estado global compartido entre ambas.

    Returns
    -------
    fastapi.FastAPI
        La aplicación, con `JobQueue` y `FileExplorerService` ya
        inicializados en `app.state`, sus routers de API montados, y una
        ruta de captura general que sirve el frontend ya compilado.
    """
    app = FastAPI(title="aiscanner")

    output_dir = ensure_output_dir()
    app.state.job_queue = JobQueue(runner=CorePipelineRunner())
    app.state.explorer_service = FileExplorerService(root=output_dir)

    app.include_router(jobs_router.router)
    app.include_router(files_router.router)
    app.include_router(health_router.router)

    @app.on_event("startup")
    async def _start_job_queue() -> None:
        """Arranca el worker de `JobQueue` una vez que uvicorn ya tiene un event loop corriendo."""
        # No en __init__ de JobQueue: asyncio.create_task necesita un event
        # loop ya corriendo, y __init__ se ejecuta antes de que uvicorn haya
        # arrancado uno.
        app.state.job_queue.start()

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str) -> FileResponse:
        """
        Sirve el frontend ya compilado (`frontend/dist/`).

        Se registra al final, después de los routers de API (`/api/*`,
        `/health`) -- FastAPI hace *matching* de rutas en el orden en que se
        registran, así que esos endpoints siguen resolviéndose antes de
        llegar aquí. Si `full_path` corresponde a un archivo real del build
        (ej. `assets/index-abc123.js`, `favicon.svg`), se sirve tal cual;
        cualquier otra ruta (ej. `explorer`, que no existe como archivo) cae
        en `index.html` para que React Router la resuelva del lado del
        cliente (research.md §4).
        """
        candidate = _FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_FRONTEND_DIST / "index.html")

    return app
