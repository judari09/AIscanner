from ollama import Client

from llm.client import DEFAULT_BASE_URL


def list_installed_models(base_url: str = DEFAULT_BASE_URL) -> list[str]:
    """
    Lista los nombres de los modelos de Ollama instalados localmente.

    Envuelve el SDK oficial `ollama` (ya declarado en `pyproject.toml`, sin
    uso directo hasta esta feature) en vez de reimplementar el parseo de
    `GET /api/tags` a mano -- ver research.md §1 de
    003-ui-polish-model-switch. El SDK ya traduce un fallo de conexión
    (Ollama no está corriendo) en un `ConnectionError` estándar de Python,
    así que no hace falta una excepción propia para distinguir ese caso.

    Parameters
    ----------
    base_url : str
        URL del daemon local de Ollama.

    Returns
    -------
    list[str]
        Nombres de los modelos instalados, en el orden que reporta Ollama.
        Lista vacía si Ollama está corriendo pero no tiene ningún modelo
        descargado (FR-009 -- caso válido, no un error).

    Raises
    ------
    ConnectionError
        Si no se pudo contactar al daemon de Ollama en `base_url` (FR-008).
    """
    response = Client(host=base_url).list()
    return [model.model for model in response.models if model.model]
