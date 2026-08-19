from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import get_active_model, set_active_model
from llm.model_catalog import list_installed_models

router = APIRouter(prefix="/api", tags=["models"])

_OLLAMA_UNAVAILABLE_DETAIL = {"error": "No se pudo conectar con Ollama en el equipo local."}


class SetActiveModelRequest(BaseModel):
    """Cuerpo de `PUT /api/config/active-model`."""

    model_name: str


@router.get("/models")
def get_models():
    """`GET /api/models` -- lista modelos instalados y el activo. Ver `contracts/api-additions.md`."""
    try:
        installed = list_installed_models()
    except ConnectionError as exc:
        raise HTTPException(status_code=503, detail=_OLLAMA_UNAVAILABLE_DETAIL) from exc
    return {
        "models": [{"name": name} for name in installed],
        "active_model": get_active_model(),
    }


@router.put("/config/active-model")
def update_active_model(body: SetActiveModelRequest):
    """
    `PUT /api/config/active-model` -- cambia el modelo activo. Ver `contracts/api-additions.md`.

    Valida `body.model_name` contra los modelos instalados en este momento
    antes de persistir nada (FR-005): si Ollama no responde o el modelo ya
    no está instalado, el modelo activo anterior no se toca.
    """
    try:
        installed = list_installed_models()
    except ConnectionError as exc:
        raise HTTPException(status_code=503, detail=_OLLAMA_UNAVAILABLE_DETAIL) from exc

    if body.model_name not in installed:
        raise HTTPException(
            status_code=409,
            detail={
                "error": f"El modelo '{body.model_name}' ya no está disponible en Ollama.",
                "active_model": get_active_model(),
            },
        )

    set_active_model(body.model_name)
    return {"active_model": body.model_name}
