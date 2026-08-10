from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from config import ensure_output_dir
from web.explorer.service import FileExplorerService
from web.jobs.queue import JobQueue
from web.pipeline_runner import CorePipelineRunner
from web.routers import files as files_router
from web.routers import jobs as jobs_router

_WEB_DIR = Path(__file__).parent
TEMPLATES = Jinja2Templates(directory=str(_WEB_DIR / "templates"))


def create_app() -> FastAPI:
    """
    Construye la aplicación FastAPI de la interfaz web.

    Es una *factory* (en vez de un `app = FastAPI()` a nivel de módulo) para
    que `web.py` controle explícitamente cuándo se construye -- útil si más
    adelante se quiere una segunda instancia para pruebas, sin arrastrar
    estado global compartido entre ambas.

    Returns
    -------
    fastapi.FastAPI
        La aplicación, con `JobQueue` y `FileExplorerService` ya
        inicializados en `app.state`, y sus routers montados.
    """
    app = FastAPI(title="aiscanner")

    output_dir = ensure_output_dir()
    app.state.job_queue = JobQueue(runner=CorePipelineRunner())
    app.state.explorer_service = FileExplorerService(root=output_dir)

    app.mount("/static", StaticFiles(directory=str(_WEB_DIR / "static")), name="static")
    app.include_router(jobs_router.router)
    app.include_router(files_router.router)

    @app.on_event("startup")
    async def _start_job_queue() -> None:
        """Arranca el worker de `JobQueue` una vez que uvicorn ya tiene un event loop corriendo."""
        # No en __init__ de JobQueue: asyncio.create_task necesita un event
        # loop ya corriendo, y __init__ se ejecuta antes de que uvicorn haya
        # arrancado uno.
        app.state.job_queue.start()

    @app.get("/")
    def upload_page(request: Request):
        """Página de carga (Historia 1) -- pantalla de inicio de la interfaz."""
        return TEMPLATES.TemplateResponse(request, "upload.html", {})

    @app.get("/explorer")
    def explorer_page(request: Request):
        """Página del explorador de archivos (Historia 2)."""
        return TEMPLATES.TemplateResponse(request, "explorer.html", {})

    return app
