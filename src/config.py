import os
from pathlib import Path

# Directorio donde vive todo lo que la interfaz web lee/escribe: documentos
# procesados, sus recursos embebidos y las imagenes originales subidas por el
# usuario. Es la unica fuente de verdad de la Historia 2 (explorador) -- no
# hay base de datos ni indice separado (Principio VI de la constitucion), asi
# que cualquier cosa que el explorador deba mostrar tiene que vivir aqui.
OUTPUT_DIR = Path(os.environ.get("AISCANNER_OUTPUT_DIR", "./output")).resolve()


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
