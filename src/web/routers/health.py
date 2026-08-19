from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    """
    Responde de inmediato, sin tocar el pipeline ni el explorador.

    Es la señal que usa el frontend (`useBackendConnection`) para distinguir
    "el backend está caído" de un error de negocio normal, y para detectar
    cuándo el backend vuelve a estar disponible (FR-012 de
    002-react-frontend-migration). Ver `contracts/api-additions.md`.

    Returns
    -------
    dict
        `{"status": "ok"}`.
    """
    return {"status": "ok"}
