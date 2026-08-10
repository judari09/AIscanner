import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path


class JobStatus(str, Enum):
    """Estados posibles de un `ProcessingJob`, en su orden natural de transicion."""

    QUEUED = "queued"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"


@dataclass
class ProcessingJob:
    """
    Un envio de imagenes al pipeline OCR/LLM, desde la interfaz web.

    Vive solo en memoria mientras el proceso del servidor esta arriba -- no
    se persiste a disco ni a una base de datos (Principio VI de la
    constitucion: sin estado persistente entre ejecuciones). Si el servidor
    se reinicia con un trabajo en curso, ese trabajo se pierde, pero las
    imagenes originales ya guardadas en `OUTPUT_DIR/.../originales/` no se
    ven afectadas -- el usuario puede volver a subirlas.

    Parameters
    ----------
    image_paths : list[pathlib.Path]
        Rutas (ya en disco, bajo `OUTPUT_DIR`) de las imagenes que forman
        este documento, en el orden de paginas elegido por el usuario.
    export_docx : bool
        Si el usuario pidio ademas generar un `.docx` (FR-013).
    job_id : str
        Identidad del trabajo dentro de este proceso; no sobrevive a un
        reinicio del servidor.
    status : JobStatus
        Estado actual; ver transiciones en `JobStatus`.
    error_message : str | None
        Detalle del fallo, solo presente cuando `status is JobStatus.FAILED`.
    result_document_path : pathlib.Path | None
        Ruta del Markdown resultante, solo presente cuando
        `status is JobStatus.DONE`.
    created_at : datetime.datetime
        Usado para ordenar la cola si hay mas de un trabajo pendiente.
    """

    image_paths: list[Path]
    export_docx: bool
    job_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    status: JobStatus = JobStatus.QUEUED
    error_message: str | None = None
    result_document_path: Path | None = None
    created_at: datetime = field(default_factory=datetime.now)

    @property
    def document_dir(self) -> Path:
        """
        Carpeta del documento (ej. `OUTPUT_DIR/<nombre-documento>/`).

        Se deriva de `image_paths[0]` en vez de guardarse por separado: por
        convencion, las imagenes de un job siempre se guardan en
        `<document_dir>/originales/<archivo>` (ver `routers/jobs.py`), asi
        que el abuelo de la primera imagen es la propia carpeta del
        documento -- evita duplicar ese dato en dos lugares.
        """
        return self.image_paths[0].parent.parent

    def mark_processing(self) -> None:
        """Transiciona el trabajo a `PROCESSING`, limpiando el error previo si lo hubiera."""
        self.status = JobStatus.PROCESSING
        self.error_message = None

    def mark_done(self, result_document_path: Path) -> None:
        """Transiciona el trabajo a `DONE` con la ruta del Markdown resultante."""
        self.status = JobStatus.DONE
        self.result_document_path = result_document_path

    def mark_failed(self, error_message: str) -> None:
        """Transiciona el trabajo a `FAILED` guardando el motivo para mostrarlo al usuario."""
        self.status = JobStatus.FAILED
        self.error_message = error_message

    def retry(self) -> None:
        """
        Reencola el trabajo para un nuevo intento, reutilizando las mismas
        `image_paths`/`export_docx` (FR-005: reintentar sin volver a
        seleccionar las imagenes).

        Raises
        ------
        ValueError
            Si el trabajo no esta en `FAILED` -- solo tiene sentido
            reintentar algo que fallo.
        """
        if self.status is not JobStatus.FAILED:
            raise ValueError(f"No se puede reintentar un trabajo en estado {self.status}.")
        self.status = JobStatus.QUEUED
        self.error_message = None
