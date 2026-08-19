import re
import unicodedata
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse

from config import OUTPUT_DIR
from web.jobs.models import ProcessingJob
from web.jobs.queue import JobQueue

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}


def get_job_queue(request: Request) -> JobQueue:
    """Dependencia de FastAPI: recupera la `JobQueue` compartida guardada en `app.state`."""
    return request.app.state.job_queue


def _slugify(name: str) -> str:
    """
    Normaliza un nombre a un slug seguro para carpeta (sin acentos, espacios
    ni caracteres especiales).

    El nombre del documento en el explorador se deriva de aqui
    (Clarifications, sesion 2026-08-05: nombre automatico a partir del
    origen, igual que hace la CLI con `derive_output_path`).
    """
    normalized = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9_-]+", "-", normalized).strip("-")
    return slug or "documento"


def _unique_document_dir(output_dir: Path, base_name: str) -> Path:
    """
    Elige una carpeta de documento libre bajo `output_dir`, agregando un
    sufijo numerico si `base_name` ya existe.

    Evita que dos envios con imagenes de nombre parecido se sobrescriban
    entre si -- la misma idea de "avisar en vez de sobrescribir" de FR-014,
    aplicada aqui de forma automatica porque no hay a quien preguntarle
    (el nombre se deriva solo, sin paso de titulado manual).
    """
    candidate = output_dir / base_name
    suffix = 1
    while candidate.exists():
        candidate = output_dir / f"{base_name}-{suffix}"
        suffix += 1
    return candidate


async def _stage_uploaded_images(images: list[UploadFile], output_dir: Path) -> list[Path]:
    """
    Guarda las imagenes subidas en `<carpeta-documento>/originales/` y
    devuelve sus rutas ya en disco, en orden.

    Esto pasa aqui, en el router, y no dentro de `PipelineRunner`: un
    `UploadFile` de FastAPI solo se puede leer mientras dura el request que
    lo trajo, asi que hay que volcarlo a disco de forma sincrona con la
    peticion. El trabajo en si se procesa despues, de forma asincrona, en la
    `JobQueue` -- y FR-005 (reintentar sin volver a subir nada) depende
    justamente de que las imagenes ya vivan en disco antes de encolar.

    Parameters
    ----------
    images : list[fastapi.UploadFile]
        Archivos subidos, en el orden de paginas elegido por el usuario.
    output_dir : pathlib.Path
        `config.OUTPUT_DIR` -- la raiz donde vive todo lo procesado.

    Returns
    -------
    list[pathlib.Path]
        Rutas de las imagenes ya guardadas, en el mismo orden.
    """
    base_name = _slugify(Path(images[0].filename or "documento").stem)
    document_dir = _unique_document_dir(output_dir, base_name)
    originales_dir = document_dir / "originales"
    originales_dir.mkdir(parents=True, exist_ok=True)

    saved_paths = []
    for index, image in enumerate(images, start=1):
        extension = Path(image.filename or "").suffix.lower() or ".jpg"
        staged_path = originales_dir / f"{index:02d}{extension}"
        staged_path.write_bytes(await image.read())
        saved_paths.append(staged_path)
    return saved_paths


def _validate_image_extensions(images: list[UploadFile]) -> list[str]:
    """Devuelve los nombres de archivo que no son jpg/png (FR-006); vacio si todos son validos."""
    return [
        image.filename or "<sin nombre>"
        for image in images
        if Path(image.filename or "").suffix.lower() not in ALLOWED_EXTENSIONS
    ]


def _job_to_dict(job: ProcessingJob) -> dict:
    """
    Serializa un `ProcessingJob` al formato de respuesta de `contracts/api.md`,
    extendido por `contracts/api-additions.md` de 004-digitization-completion-notice
    con `document_relative_path`/`markdown_filename`/`docx_filename`.

    Esos tres campos nuevos solo tienen valor cuando el job ya terminó
    (`result_document_path` no es `None`) -- se usa esa condición en vez de
    comparar `job.status` para no tener que importar `JobStatus` aquí solo
    para esto, igual que ya hacia el campo `result_document_path` existente.
    `document_relative_path` se calcula aqui (en el router web, que ya conoce
    `OUTPUT_DIR`) y no en `ProcessingJob`, para no filtrar ese conocimiento
    hacia el modelo del job (Principio II).
    """
    done = job.result_document_path is not None
    return {
        "job_id": job.job_id,
        "status": job.status.value,
        "error_message": job.error_message,
        "result_document_path": (
            str(job.result_document_path) if job.result_document_path else None
        ),
        "document_relative_path": (
            job.document_dir.relative_to(OUTPUT_DIR).as_posix() if done else None
        ),
        "markdown_filename": job.result_document_path.name if done else None,
        "docx_filename": job.docx_path.name if job.docx_path else None,
    }


@router.post("", status_code=202)
async def create_job(
    images: list[UploadFile] = File(...),
    export_docx: bool = Form(False),
    job_queue: JobQueue = Depends(get_job_queue),
):
    """`POST /api/jobs` -- sube imagenes y las encola para procesar. Ver `contracts/api.md`."""
    rejected = _validate_image_extensions(images)
    if rejected:
        raise HTTPException(
            status_code=400,
            detail={"error": "Solo se aceptan imagenes jpg/png.", "rejected_files": rejected},
        )

    image_paths = await _stage_uploaded_images(images, OUTPUT_DIR)
    job = ProcessingJob(image_paths=image_paths, export_docx=export_docx)
    await job_queue.enqueue(job)
    return JSONResponse(status_code=202, content=_job_to_dict(job))


@router.get("/{job_id}")
def get_job(job_id: str, job_queue: JobQueue = Depends(get_job_queue)):
    """`GET /api/jobs/{job_id}` -- consulta el estado de un trabajo. Ver `contracts/api.md`."""
    job = job_queue.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Trabajo no encontrado.")
    return _job_to_dict(job)


@router.post("/{job_id}/retry", status_code=202)
async def retry_job(job_id: str, job_queue: JobQueue = Depends(get_job_queue)):
    """`POST /api/jobs/{job_id}/retry` -- reintenta un trabajo fallido. Ver `contracts/api.md`."""
    if job_queue.get(job_id) is None:
        raise HTTPException(status_code=404, detail="Trabajo no encontrado.")
    try:
        job = await job_queue.retry(job_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return _job_to_dict(job)
