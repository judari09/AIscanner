import json
import os
from pathlib import Path

# Directorio donde vive todo lo que la interfaz web lee/escribe: documentos
# procesados, sus recursos embebidos y las imagenes originales subidas por el
# usuario. Es la unica fuente de verdad de la Historia 2 (explorador) -- no
# hay base de datos ni indice separado (Principio VI de la constitucion), asi
# que cualquier cosa que el explorador deba mostrar tiene que vivir aqui.
OUTPUT_DIR = Path(os.environ.get("AISCANNER_OUTPUT_DIR", "./output")).resolve()

# Carpeta de configuracion de la propia aplicacion (no de documentos) --
# separada a proposito de OUTPUT_DIR, que el explorador asume que solo
# contiene salidas navegables (003-ui-polish-model-switch, research.md §2).
CONFIG_DIR = Path(os.environ.get("AISCANNER_CONFIG_DIR", "./config")).resolve()
ACTIVE_MODEL_FILE = CONFIG_DIR / "settings.json"

# Modelo usado si el usuario nunca eligio uno explicitamente: debe ser
# multimodal (recibe imagenes ademas de texto), porque `Structuring.to_markdown`
# siempre adjunta las paginas originales al LLM.
DEFAULT_MODEL = "gemma3:4b"


def ensure_output_dir() -> Path:
    """
    Crea `OUTPUT_DIR` si no existe todavia y devuelve su ruta resuelta.

    Se llama al arrancar el servidor web (ver `web.py`) para que el
    explorador de archivos y la cola de trabajos nunca se encuentren con una
    carpeta faltante a mitad de una peticion.

    Returns
    -------
    pathlib.Path
        Ruta absoluta y ya existente de `OUTPUT_DIR`.
    """
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    return OUTPUT_DIR


def get_active_model() -> str:
    """
    Devuelve el nombre del modelo de Ollama actualmente activo.

    Lee `ACTIVE_MODEL_FILE` si ya existe; si no (primera ejecucion, o el
    usuario nunca cambio el modelo de fabrica), devuelve `DEFAULT_MODEL` sin
    crear el archivo -- no hay nada que persistir hasta que el usuario elija
    explicitamente un modelo distinto (003-ui-polish-model-switch).

    Returns
    -------
    str
        Nombre del modelo activo, ej. ``"qwen2.5:7b-instruct"``.
    """
    if not ACTIVE_MODEL_FILE.is_file():
        return DEFAULT_MODEL
    data = json.loads(ACTIVE_MODEL_FILE.read_text(encoding="utf-8"))
    return data.get("model_name", DEFAULT_MODEL)


def set_active_model(name: str) -> None:
    """
    Persiste `name` como el modelo activo para todas las digitalizaciones
    futuras, tanto desde la CLI como desde la cola de trabajos de la web
    (Principio II: ambas comparten el mismo `Structuring`), sobreviviendo a
    reinicios del proceso (FR-006).

    Parameters
    ----------
    name : str
        Nombre del modelo de Ollama a activar. Se asume ya validado contra
        los modelos instalados por quien llama (ver
        `web.routers.models`) -- esta funcion no vuelve a consultar Ollama.
    """
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    ACTIVE_MODEL_FILE.write_text(json.dumps({"model_name": name}), encoding="utf-8")
