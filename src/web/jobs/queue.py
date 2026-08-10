import asyncio
import logging

from web.jobs.models import ProcessingJob
from web.pipeline_runner import PipelineRunner

logger = logging.getLogger(__name__)


class JobQueue:
    """
    Secuencia y despacha `ProcessingJob` de a uno a la vez.

    Es en memoria (un `asyncio.Queue` + una sola tarea worker dentro del
    mismo proceso), a proposito: el pipeline OCR/LLM local no esta pensado
    para correr varias instancias en paralelo en el mismo hardware
    (Assumptions de spec.md), y una cola en memoria evita traer un broker
    externo (Celery/Redis) solo para garantizar ese orden secuencial
    (research.md, decision #2). Responsabilidad unica (Principio III, SRP):
    esta clase solo sabe encolar/despachar, no como correr el pipeline --
    eso se lo delega a un `PipelineRunner` inyectado (Dependency Inversion).
    """

    def __init__(self, runner: PipelineRunner):
        """
        Parameters
        ----------
        runner : PipelineRunner
            Implementacion que sabe correr el pipeline sobre un documento
            (en produccion, `CorePipelineRunner`).
        """
        self._runner = runner
        self._queue: asyncio.Queue[ProcessingJob] = asyncio.Queue()
        self._jobs: dict[str, ProcessingJob] = {}
        self._worker_task: asyncio.Task | None = None

    def start(self) -> None:
        """
        Arranca la tarea worker en background.

        Se llama una sola vez, al iniciar la aplicacion (ver
        `web/app.py`) -- no en `__init__`, porque `asyncio.create_task`
        necesita un event loop ya corriendo, y en el momento en que se
        construye `JobQueue` (import time) todavia no lo hay.
        """
        self._worker_task = asyncio.create_task(self._worker_loop())

    async def enqueue(self, job: ProcessingJob) -> None:
        """Registra un `ProcessingJob` nuevo y lo agrega al final de la cola."""
        self._jobs[job.job_id] = job
        await self._queue.put(job)

    def get(self, job_id: str) -> ProcessingJob | None:
        """Busca un trabajo por id; `None` si no existe (se perdio en un reinicio o nunca existio)."""
        return self._jobs.get(job_id)

    async def retry(self, job_id: str) -> ProcessingJob:
        """
        Reencola un trabajo que fallo, con las mismas imagenes/orden (FR-005).

        Parameters
        ----------
        job_id : str
            Identidad del trabajo a reintentar.

        Returns
        -------
        ProcessingJob
            El mismo trabajo, ya de vuelta en estado `QUEUED`.

        Raises
        ------
        KeyError
            Si `job_id` no existe.
        ValueError
            Si el trabajo no estaba en `FAILED` (ver `ProcessingJob.retry`).
        """
        job = self._jobs[job_id]
        job.retry()
        await self._queue.put(job)
        return job

    async def _worker_loop(self) -> None:
        """
        Bucle infinito: toma un trabajo, lo procesa, repite. Nunca corren dos
        a la vez porque este es el unico consumidor de la cola.
        """
        while True:
            job = await self._queue.get()
            try:
                await self._process(job)
            finally:
                self._queue.task_done()

    async def _process(self, job: ProcessingJob) -> None:
        """
        Corre el pipeline sobre un trabajo y actualiza su estado con el
        resultado. Los errores se capturan aqui (no se propagan) porque este
        metodo corre dentro del worker loop -- una excepcion sin capturar
        mataria la tarea de background para todos los trabajos futuros, no
        solo para este.
        """
        job.mark_processing()
        try:
            # PaddleOCR/Ollama son librerias sincronas y usan CPU/GPU de forma
            # intensiva; correrlas directo en el event loop bloquearia el
            # servidor entero (no podria ni siquiera responder GET /api/jobs
            # mientras un trabajo procesa). to_thread las manda a un hilo
            # aparte sin tener que volver asincrono todo pipeline.run_pipeline.
            result = await asyncio.to_thread(
                self._runner.run, job.image_paths, job.document_dir, job.export_docx
            )
            job.mark_done(result.markdown_path)
        except Exception as exc:  # noqa: BLE001 -- cualquier fallo del pipeline debe quedar visible al usuario, no tumbar el worker
            logger.exception("Fallo procesando el trabajo %s", job.job_id)
            job.mark_failed(str(exc))
