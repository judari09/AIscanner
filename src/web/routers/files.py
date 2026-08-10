import mimetypes

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel

from web.explorer.service import FileExplorerService, InvalidMoveError, NameConflictError
from web.fs_utils import UnsafePathError

router = APIRouter(prefix="/api/files", tags=["files"])


class CreateFolderRequest(BaseModel):
    """Cuerpo de `POST /api/files/folder`."""

    path: str


class MoveRequest(BaseModel):
    """Cuerpo de `POST /api/files/move`."""

    source: str
    destination: str


def get_explorer_service(request: Request) -> FileExplorerService:
    """Dependencia de FastAPI: recupera el `FileExplorerService` compartido guardado en `app.state`."""
    return request.app.state.explorer_service


@router.get("")
def list_files(path: str = "", service: FileExplorerService = Depends(get_explorer_service)):
    """`GET /api/files` -- ver `contracts/api.md`."""
    try:
        return service.list(path)
    except (FileNotFoundError, UnsafePathError) as exc:
        raise HTTPException(status_code=404, detail=f"No existe la ruta '{path}'.") from exc


@router.get("/view")
def view_file(path: str, service: FileExplorerService = Depends(get_explorer_service)):
    """`GET /api/files/view` -- ver `contracts/api.md`."""
    try:
        return service.view(path)
    except (FileNotFoundError, UnsafePathError) as exc:
        raise HTTPException(status_code=404, detail=f"No existe un documento en '{path}'.") from exc


@router.get("/raw")
def raw_file(path: str, service: FileExplorerService = Depends(get_explorer_service)):
    """
    Sirve un archivo individual tal cual (usado por las imágenes embebidas
    que `view()` reescribe hacia esta ruta -- no está en el contrato
    original de `contracts/api.md`, se agregó durante la implementación
    porque el visor necesitaba una forma de cargar los diagramas PNG).
    """
    try:
        file_path = service.raw_file_path(path)
    except (FileNotFoundError, UnsafePathError) as exc:
        raise HTTPException(status_code=404, detail=f"No existe el archivo '{path}'.") from exc
    media_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    return FileResponse(file_path, media_type=media_type)


@router.post("/folder", status_code=201)
def create_folder(body: CreateFolderRequest, service: FileExplorerService = Depends(get_explorer_service)):
    """`POST /api/files/folder` -- ver `contracts/api.md`."""
    try:
        created_path = service.create_folder(body.path)
    except NameConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except UnsafePathError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"path": created_path}


@router.post("/move")
def move_file(body: MoveRequest, service: FileExplorerService = Depends(get_explorer_service)):
    """`POST /api/files/move` -- ver `contracts/api.md`."""
    try:
        new_path = service.move(body.source, body.destination)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=f"No existe '{body.source}'.") from exc
    except (NameConflictError, InvalidMoveError) as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except UnsafePathError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"path": new_path}


@router.get("/download")
def download_document(path: str, service: FileExplorerService = Depends(get_explorer_service)):
    """`GET /api/files/download` -- ver `contracts/api.md`."""
    try:
        package_path = service.package_document(path)
    except (FileNotFoundError, UnsafePathError) as exc:
        raise HTTPException(status_code=404, detail=f"No existe un documento en '{path}'.") from exc
    return FileResponse(package_path, filename=package_path.name)


@router.get("/download-folder")
def download_folder(path: str, service: FileExplorerService = Depends(get_explorer_service)):
    """`GET /api/files/download-folder` -- ver `contracts/api.md`."""
    try:
        package_path = service.package_folder(path)
    except (FileNotFoundError, UnsafePathError) as exc:
        raise HTTPException(status_code=404, detail=f"No existe la carpeta '{path}'.") from exc
    return FileResponse(package_path, filename=package_path.name)
